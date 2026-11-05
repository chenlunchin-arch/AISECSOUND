#!/usr/bin/env bash
# 建立三個 Android 專案：安裝套件、加入 Android 平台、產生圖示、同步網頁內容
set -e
cd "$(dirname "$0")"
color(){ case "$1" in secretary) echo "#1F5F52";; stories) echo "#24305E";; audiobook) echo "#7A4A1E";; all) echo "#3A2E5C";; esac; }  # Mac 內建 bash 3.2 也能用
for a in secretary stories audiobook all; do
  C="$(color $a)"
  echo "=== $a ==="
  ( cd "apps/$a" && npm install && { [ -d android ] || npx cap add android; } \
    && npx capacitor-assets generate --android --iconBackgroundColor "$C" --splashBackgroundColor "$C" --splashBackgroundColorDark "$C" \
    && npx cap sync android )
done
echo "完成。用 Android Studio 打開 apps/<App 名稱>/android 資料夾即可建置。"
