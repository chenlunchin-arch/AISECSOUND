// 聲音秘書：AI 代理（金鑰只存在伺服器，會員看不到）
// 會檢查：是否登入、會員等級是否開放這個功能、今天的使用次數
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
admin.initializeApp();

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");
const MODEL = process.env.AI_MODEL || "claude-sonnet-5-5";
const OWNERS = (process.env.OWNER_EMAILS || "").split(",").map(s => s.trim().toLowerCase()).filter(Boolean);
const TIERS = ["guest", "free", "standard", "vip"];
const FEATURES = ["ai_analyze", "file_import", "story_full", "ai_story", "audiobook", "premium_voices"];
const DEFAULT_MATRIX = {
  guest: { file_import: true },
  free: { ai_analyze: true, file_import: true, story_full: true },
  standard: { ai_analyze: true, file_import: true, story_full: true, ai_story: true, audiobook: true },
  vip: { ai_analyze: true, file_import: true, story_full: true, ai_story: true, audiobook: true, premium_voices: true }
};
// 每人每天可以呼叫 AI 的次數（網站與三個 App 合計）；管理員也有上限，避免帳號被盜時費用失控
const DAILY_LIMIT = { guest: 0, free: 20, standard: 60, vip: 200 };
const ADMIN_DAILY_LIMIT = 500;
// 前端一次最多送 60000 字，留一點空間給提示
const MAX_PROMPT_CHARS = 65000;

function mergeMatrix(m) {
  const out = JSON.parse(JSON.stringify(DEFAULT_MATRIX));
  if (m && typeof m === "object") for (const t of TIERS) for (const f of FEATURES) if (m[t] && f in m[t]) out[t][f] = !!m[t][f];
  return out;
}

exports.ai = onRequest(
  { secrets: [ANTHROPIC_API_KEY], region: "asia-east1", timeoutSeconds: 120, memory: "512MiB", cors: true },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ code: "invalid_request" });
    const m = (req.get("Authorization") || "").match(/^Bearer (.+)$/);
    if (!m) return res.status(401).json({ code: "not_granted", message: "請先登入" });
    let user;
    try { user = await admin.auth().verifyIdToken(m[1]); }
    catch (e) { return res.status(401).json({ code: "session_expired", message: "請重新登入" }); }

    const { prompt, images = [], kind = "ai_analyze", app = "" } = req.body || {};
    if (!["", "secretary", "stories", "audiobook", "all"].includes(app)) return res.status(400).json({ code: "invalid_request" });
    const NS = app ? `apps/${app}/` : "";
    if (!["ai_analyze", "ai_story"].includes(kind) || typeof prompt !== "string" || !prompt.trim() || prompt.length > MAX_PROMPT_CHARS)
      return res.status(400).json({ code: "invalid_request" });
    if (!Array.isArray(images) || images.length > 4) return res.status(400).json({ code: "image_rejected" });

    const db = admin.firestore();
    const [tierDoc, cfgDoc, admDoc] = await Promise.all([
      db.doc(`${NS}tiers/${user.uid}`).get(), db.doc(`${NS}config/features`).get(), db.doc(`${NS}admins/${user.uid}`).get()
    ]);
    const isAdmin = admDoc.exists || (user.email_verified && OWNERS.includes((user.email || "").toLowerCase()));
    // 防止大量註冊消耗費用：Email／密碼帳號要先完成驗證（Google 帳號本來就是已驗證）
    if (!user.email_verified) return res.status(403).json({ code: "email_unverified", message: "請先完成 Email 驗證" });
    const tier = tierDoc.exists && TIERS.includes(tierDoc.data().tier) ? tierDoc.data().tier : "free";
    const matrix = mergeMatrix(cfgDoc.exists ? cfgDoc.data().matrix : null);
    if (!isAdmin && !matrix[tier][kind]) return res.status(403).json({ code: "not_granted", message: "你的會員等級還不能使用這個功能" });

    const day = new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 10); // 台灣日期
    const qref = db.doc(`quota/${user.uid}`); // 每人合計，不分網站或哪個 App
    const allowed = await db.runTransaction(async t => {
      const q = await t.get(qref);
      const used = q.exists && q.data().day === day ? q.data().count : 0;
      const limit = isAdmin ? ADMIN_DAILY_LIMIT : (DAILY_LIMIT[tier] ?? 20);
      if (used >= limit) return false;
      t.set(qref, { day, count: used + 1 });
      return true;
    });
    if (!allowed) return res.status(429).json({ code: "rate_limited", message: "今天的 AI 次數用完了，明天再試" });

    // AI 呼叫失敗時退回這次扣的次數
    const refund = () => qref.update({ count: admin.firestore.FieldValue.increment(-1) }).catch(() => {});

    const content = images
      .filter(i => i && typeof i.data === "string" && /^image\/(jpeg|png|webp|gif)$/.test(i.media_type))
      .map(i => ({ type: "image", source: { type: "base64", media_type: i.media_type, data: i.data } }));
    content.push({ type: "text", text: prompt });

    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": ANTHROPIC_API_KEY.value(), "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: MODEL, max_tokens: 4000,
          system: "你是「聲音秘書」網站的助理，使用繁體中文。你的回覆會被程式解析，請嚴格依照使用者要求的 JSON 格式回覆，不要加任何其他文字。",
          messages: [{ role: "user", content }]
        })
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) {
        await refund();
        const code = r.status === 429 || r.status === 529 ? "rate_limited" : r.status === 400 ? "invalid_request" : "upstream_error";
        console.error("Anthropic error", r.status, j.error && j.error.message);
        return res.status(502).json({ code, message: "AI 服務暫時無法使用" });
      }
      const text = (j.content || []).filter(c => c.type === "text").map(c => c.text).join("");
      return res.json({ text });
    } catch (e) {
      await refund();
      console.error(e);
      return res.status(502).json({ code: "upstream_error", message: "AI 服務暫時無法使用" });
    }
  }
);

// 帳號刪除時（App 內「刪除帳號」或在 Firebase 主控台刪除），清掉這個人在網站與三個 App 的所有資料。
// Google Play 要求刪除帳號時一併刪除相關資料。
const functionsV1 = require("firebase-functions/v1");
exports.cleanupUser = functionsV1.region("asia-east1").auth.user().onDelete(async (user) => {
  const db = admin.firestore();
  const uid = user.uid;
  const refs = [];
  for (const ns of ["", "apps/secretary/", "apps/stories/", "apps/audiobook/", "apps/all/"]) {
    for (const c of ["users", "tiers", "admins"]) refs.push(db.doc(`${ns}${c}/${uid}`));
  }
  refs.push(db.doc(`quota/${uid}`));
  const batch = db.batch();
  refs.forEach(r => batch.delete(r));
  await batch.commit();
  console.log("cleaned up user", uid);
});
