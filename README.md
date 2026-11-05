# 三個 Android App：聲音秘書、睡前故事屋、說書人有聲書

這個資料夾裡有三個可以上架 Google Play 的 Android App，和它們共用的後端：

| App | 資料夾 | 內容 |
|---|---|---|
| 聲音秘書 | `apps/secretary` | AI 判斷重點、匯入檔案、三位美女秘書聲音 |
| 睡前故事屋 | `apps/stories` | 1002 篇睡前故事、10 種講故事聲音、AI 講故事 |
| 說書人有聲書 | `apps/audiobook` | 匯入整本書、分段朗讀、定時停止、3 位說書人 |

- **會員分開管理**：三個 App 共用同一個 Firebase 專案，但會員名單、等級、管理員和功能開放設定都各自獨立，每個 App 都有自己的「後台管理」。
- **帳號共用**：同一個 Email 可以登入三個 App，在每個 App 裡的等級是分開的。

---

## 需要準備（Windows 為例）

1. [Node.js 22 或更新版本](https://nodejs.org/)（Capacitor 8 需要）
2. [Android Studio](https://developer.android.com/studio)，安裝時一併裝好 Android SDK
3. Google 帳號：建立 Firebase 專案、上架 Google Play 用（Play 開發者帳號要一次性付費註冊）
4. [Anthropic API 金鑰](https://console.anthropic.com/)：AI 功能用，費用由你支付

## 步驟 1：建立 Firebase 專案
1. 到 [Firebase 主控台](https://console.firebase.google.com/) 新增專案，記下**專案 ID**。
2. 升級成 **Blaze（用量計費）** 方案，因為 AI 功能需要 Cloud Functions。
3. **Authentication** → 開始使用 → 啟用 **電子郵件/密碼**。網頁版有「Google 登入」按鈕，所以也啟用 **Google**，並在 **Authentication → 設定 → 已授權的網域** 加入你自己的網域。
4. **Firestore Database** → 建立資料庫 → 位置選 **asia-east1（台灣）**。
5. **專案設定 → 一般 → 新增網頁應用程式（`</>`）**，記下 `apiKey`、`messagingSenderId`、`appId` 這三個值。
   - App 用的是網頁版 Firebase，**不需要** `google-services.json`。

## 步驟 2：一次填好所有設定
在這個資料夾按右鍵 →「在終端機中開啟」，執行：

```powershell
powershell -ExecutionPolicy Bypass -File setup.ps1 -Email 你的Email -ProjectId 專案ID -ApiKey 你的apiKey -SenderId 你的messagingSenderId -AppId 你的appId -Package com.你的英文名字
```

- `-Package` 一定要填，是 App 在 Google Play 上的唯一識別碼開頭，例如 `com.chen`。三個 App 會分別變成 `com.chen.voicesecretary`、`com.chen.bedtimestories`、`com.chen.storytelleraudiobook`。**上架後不能再改**。
- Mac 或 Linux 改用：`./setup.sh 你的Email 專案ID apiKey senderId appId com.你的名字`
- 這個指令只能執行一次。打錯了，請從原始壓縮檔重新解壓縮一份再執行。

## 步驟 3：部署後端（只要做一次）
```powershell
npm install -g firebase-tools
firebase login
cd firebase
cd functions; npm install; cd ..
firebase functions:secrets:set ANTHROPIC_API_KEY
firebase deploy
```
- 執行 `functions:secrets:set` 時，貼上你的 Anthropic API 金鑰。
- `firebase deploy` 會部署兩個函式：`ai`（AI 代理）和 `cleanupUser`（刪除帳號時清掉三個 App 的資料），也會一起部署網頁版。要用自己的網域，請到 Firebase Hosting 綁定。

## 步驟 4：產生三個 Android 專案
回到最外層資料夾，執行：
```powershell
powershell -ExecutionPolicy Bypass -File build-all.ps1
```
Mac 或 Linux 改用 `./build-all.sh`。
這會替三個 App 依序完成這些事：
- 安裝套件
- 加入 Android 平台
- 用 `assets` 資料夾的圖產生圖示和啟動畫面
- 同步網頁內容

## 步驟 5：在 Android Studio 測試與打包
1. Android Studio →「Open」→ 選 `apps\secretary\android`（另外兩個 App 一樣做）。
2. 手機開啟「開發人員選項 → USB 偵錯」，接上電腦，按綠色 ▶ 安裝到手機測試。
3. 要上架：**Build → Generate Signed App Bundle / APK** → 選 **Android App Bundle (.aab)** → 建立金鑰檔（**金鑰和密碼一定要備份**，遺失就無法更新 App）。
4. 只想直接安裝、不上架：在同一個選單選 **APK**。

## 步驟 6：第一次登入成為擁有者
1. 打開任一個 App → 右上角「登入」→「還沒有帳號？註冊」，用你在步驟 2 填的 Email 註冊。
2. 到信箱點**驗證連結**，回到 App 登出再登入，就會看到「後台管理」。
3. 三個 App 的後台都可以：
   - 調整會員等級
   - 指定管理員
   - 設定各等級能用哪些功能
   - 查看會員人數與使用狀況

---

## 上架 Google Play 要注意
- **隱私權政策網址**：App 有帳號和使用紀錄，Play 會要求提供。可以寫一頁放在 Firebase Hosting。
- **AI 次數**：每人每天合計（網站和三個 App 一起算）：免費 20、一般 60、VIP 200、管理員 500，要先完成 Email 驗證才能用 AI。數字在 `firebase/functions/index.js` 的 `DAILY_LIMIT`、`ADMIN_DAILY_LIMIT` 可以改。
- **資料安全表單**：要申報收集的資料，包括 Email、名稱（帳號用）和 App 內使用次數（分析用）。上傳的檔案和書只存在手機上，不會上傳伺服器；用 AI 判斷時，內容會傳給 Anthropic 處理。
- **刪除帳號**：Google 規定要能在 App 內刪除帳號。右上角已經有「刪除帳號」按鈕。三個 App 共用帳號，刪除後，伺服器上的 `cleanupUser` 函式會把三個 App 的會員資料、等級和使用次數一起刪掉。
- **App 外的刪除帳號網址**：Play Console 的「資料安全」表單還要一個不用安裝 App 也能申請刪除的網址。部署後可以填 `https://你的網域/delete-account.html`（這一頁已經包含在網站裡）。
- **隱私權政策**要寫到：用 AI 判斷或 AI 講故事時，內容會傳給 Anthropic 處理。

## 已知限制
- **只能用 Email 登入**：Google 帳號登入在 App 裡需要另外整合原生登入，目前先不提供。
- **聲音數量看手機**：朗讀使用手機內建的語音引擎（設定 → 文字轉語音），中文聲音數量依手機而定。各角色會盡量分配不同的聲音，再用音調和語速區分。聲音不夠時，可以到 Play 商店更新「Google 語音服務」，安裝更多中文語音。
- **朗讀時要開著畫面**：有聲書播放時會讓螢幕保持開啟。切到別的 App 或鎖定螢幕，朗讀可能會停止。
- **讀檔要連網**：讀取 PDF、Word、EPUB 的工具第一次使用時，要從網路下載。

## 之後要更新 App
- **改了網頁內容**：在對應的 App 資料夾執行 `npx cap sync android`，再用 Android Studio 打包新版本。
- **上架新版本**：記得先在 `android/app/build.gradle` 把 `versionCode` 加 1。
