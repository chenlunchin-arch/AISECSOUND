// 聲音秘書・獨立網站設定
// 1. firebase：到 Firebase 主控台 → 專案設定 → 一般 → 你的應用程式 → 「SDK 設定和配置」，把整段 firebaseConfig 貼過來
// 2. ownerEmails：擁有者的 Google 帳號 Email（要和 firestore.rules、functions/.env 一致）
window.SITE_CONFIG = {
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_WEB_APP_ID"
  },
  ownerEmails: ["OWNER_EMAIL@example.com"],
  aiEndpoint: "/api/ai"
};
