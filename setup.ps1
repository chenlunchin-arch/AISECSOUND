# 聲音秘書 Android App：一次填好所有設定
# 用法（在這個資料夾按右鍵「在終端機中開啟」）：
#   powershell -ExecutionPolicy Bypass -File setup.ps1 -Email 你的Email -ProjectId 專案ID -ApiKey apiKey -SenderId messagingSenderId -AppId appId -Package com.你的名字
param(
  [Parameter(Mandatory=$true)][string]$Email,
  [Parameter(Mandatory=$true)][string]$ProjectId,
  [Parameter(Mandatory=$true)][string]$ApiKey,
  [Parameter(Mandatory=$true)][string]$SenderId,
  [Parameter(Mandatory=$true)][string]$AppId,
  [Parameter(Mandatory=$true)][string]$Package
)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot
$Package = $Package.ToLower()
if ($Package -notmatch '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$' -or $Package -like "com.example*") {
  throw "-Package 格式不對：要像 com.chen 這樣（英文小寫開頭、用句點分隔，不能用 com.example）"
}
$cfg = [IO.File]::ReadAllText((Join-Path $PSScriptRoot "apps\secretary\www\config.js"), [Text.Encoding]::UTF8)
if ($cfg -notmatch "YOUR_PROJECT_ID") {
  throw "這個資料夾已經設定過了。要重新設定，請從原始壓縮檔重新解壓縮一份再執行。"
}
$utf8 = New-Object System.Text.UTF8Encoding($false)
$map = [ordered]@{
  "OWNER_EMAIL@example.com" = $Email.ToLower();
  "YOUR_PROJECT_ID" = $ProjectId;
  "YOUR_API_KEY" = $ApiKey;
  "YOUR_SENDER_ID" = $SenderId;
  "YOUR_WEB_APP_ID" = $AppId
}
$files = @("firebase\firestore.rules","firebase\functions\.env","firebase\public\config.js","firebase\.firebaserc","firebase\public\delete-account.html",
           "apps\secretary\www\config.js","apps\stories\www\config.js","apps\audiobook\www\config.js","apps\all\www\config.js")
foreach ($f in $files) {
  $t = [IO.File]::ReadAllText((Join-Path $PSScriptRoot $f), [Text.Encoding]::UTF8)
  foreach ($k in $map.Keys) { $t = $t.Replace($k, $map[$k]) }
  [IO.File]::WriteAllText((Join-Path $PSScriptRoot $f), $t, $utf8)
}
foreach ($a in "secretary","stories","audiobook","all") {
  $f = Join-Path $PSScriptRoot "apps\$a\capacitor.config.json"
  $t = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8).Replace('"com.example.', '"' + $Package + '.')
  [IO.File]::WriteAllText($f, $t, $utf8)
}
Write-Host "設定完成。下一步：部署後端（README 第 3 步），再執行 build-all.ps1。" -ForegroundColor Green
