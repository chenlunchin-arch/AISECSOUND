#!/usr/bin/env bash
# 聲音秘書 Android App：一次填好所有設定（Mac / Linux）
# 用法：./setup.sh 你的Email 專案ID apiKey messagingSenderId appId com.你的名字
set -e
cd "$(dirname "$0")"
if [ "$#" -lt 6 ]; then echo "用法：./setup.sh 你的Email 專案ID apiKey messagingSenderId appId com.你的名字"; exit 1; fi
EMAIL=$(echo "$1" | tr '[:upper:]' '[:lower:]'); PROJECT="$2"; KEY="$3"; SENDER="$4"; APPID="$5"; PKG="$(echo "${6:-}" | tr '[:upper:]' '[:lower:]')"
if ! echo "$PKG" | grep -Eq '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$' || echo "$PKG" | grep -q '^com\.example'; then echo "第 6 個參數（套件名）格式不對：要像 com.chen 這樣，不能用 com.example"; exit 1; fi
if ! grep -q YOUR_PROJECT_ID apps/secretary/www/config.js; then echo "這個資料夾已經設定過了。要重新設定，請從原始壓縮檔重新解壓縮一份。"; exit 1; fi
for f in firebase/firestore.rules firebase/functions/.env firebase/public/config.js firebase/.firebaserc firebase/public/delete-account.html apps/*/www/config.js; do
  sed -i.bak -e "s|OWNER_EMAIL@example.com|$EMAIL|g" -e "s|YOUR_PROJECT_ID|$PROJECT|g" -e "s|YOUR_API_KEY|$KEY|g" -e "s|YOUR_SENDER_ID|$SENDER|g" -e "s|YOUR_WEB_APP_ID|$APPID|g" "$f" && rm -f "$f.bak"
done
for a in secretary stories audiobook all; do
  sed -i.bak "s|\"com.example.|\"$PKG.|" "apps/$a/capacitor.config.json" && rm -f "apps/$a/capacitor.config.json.bak"
done
echo "設定完成。下一步：部署後端（README 第 3 步），再執行 ./build-all.sh。"
