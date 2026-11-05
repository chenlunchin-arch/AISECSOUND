# 建立三個 Android 專案：安裝套件、加入 Android 平台、產生圖示、同步網頁內容
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$apps = [ordered]@{ "secretary" = "#1F5F52"; "stories" = "#24305E"; "audiobook" = "#7A4A1E"; "all" = "#3A2E5C" }
foreach ($a in $apps.Keys) {
  Write-Host "=== $a ===" -ForegroundColor Cyan
  Push-Location "apps\$a"
  function Check($step) { if ($LASTEXITCODE -ne 0) { Pop-Location; throw "$a 的「$step」失敗：請看上面的錯誤訊息（常見原因：Node.js 版本低於 22）" } }
  npm install; Check "安裝套件"
  if (!(Test-Path "android")) { npx cap add android; Check "加入 Android 平台" }
  npx capacitor-assets generate --android --iconBackgroundColor $apps[$a] --splashBackgroundColor $apps[$a] --splashBackgroundColorDark $apps[$a]; Check "產生圖示"
  npx cap sync android; Check "同步網頁內容"
  Pop-Location
}
Write-Host "完成。用 Android Studio 打開 apps\<App 名稱>\android 資料夾即可建置。" -ForegroundColor Green
