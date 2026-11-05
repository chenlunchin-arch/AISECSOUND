// 睡前故事屋 App 設定（執行最外層的 setup.sh 會自動填好）
window.SITE_CONFIG = {
  app: "stories",
  firebase: {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_PROJECT_ID.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_WEB_APP_ID"
  },
  ownerEmails: ["OWNER_EMAIL@example.com"],
  aiEndpoint: "https://asia-east1-YOUR_PROJECT_ID.cloudfunctions.net/ai"
};
