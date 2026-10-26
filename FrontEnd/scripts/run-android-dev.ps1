param(
  [switch]$Reinstall
)

$ErrorActionPreference = 'Stop'
$env:NODE_ENV = 'development'
$env:EXPO_OFFLINE = '1'
$env:EXPO_PUBLIC_API_BASE_URL = 'http://127.0.0.1:8080/api/v1'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding

$adbPath = Join-Path $env:LOCALAPPDATA 'Android\Sdk\platform-tools\adb.exe'
$frontEndPath = Split-Path -Parent $PSScriptRoot
$androidPath = Join-Path $frontEndPath 'android'
$apkPath = Join-Path $androidPath 'app\build\outputs\apk\debug\app-debug.apk'
$deviceApkPath = '/data/local/tmp/memoa-debug.apk'
$developmentUrl = 'memoa://expo-development-client/?url=http%3A%2F%2F127.0.0.1%3A8081'

if (!(Test-Path -LiteralPath $adbPath)) {
  throw "ADB was not found: $adbPath"
}

$deviceLines = & $adbPath devices -l
$readyDevice = $deviceLines | Where-Object { $_ -match '\sdevice(?:\s|$)' }
if (!$readyDevice) {
  throw 'No ready Android device. Unlock the phone, allow USB debugging, and confirm that adb devices -l shows device.'
}

$installedPackage = & $adbPath shell pm path com.frontend
$shouldInstall = $Reinstall -or $LASTEXITCODE -ne 0 -or !$installedPackage

if ($shouldInstall) {
  Write-Host '[1/5] Building the Android development APK...'
  Push-Location -LiteralPath $androidPath
  try {
    & .\gradlew.bat assembleDebug
    if ($LASTEXITCODE -ne 0) {
      throw 'Android development APK build failed.'
    }
  } finally {
    Pop-Location
  }

  Write-Host '[2/5] Copying the APK to the phone...'
  & $adbPath push $apkPath $deviceApkPath
  if ($LASTEXITCODE -ne 0) {
    throw 'Could not copy the APK to the phone.'
  }

  Write-Host '[3/5] Waiting for phone verification and installation...'
  try {
    $installOutput = & $adbPath shell pm install -r -d --user 0 $deviceApkPath
    $installExitCode = $LASTEXITCODE
    $installOutput | Write-Host
    if ($installExitCode -ne 0 -or $installOutput -notcontains 'Success') {
      throw 'MemoA development app installation did not complete.'
    }
  } finally {
    & $adbPath shell rm -f $deviceApkPath | Out-Null
  }
} else {
  Write-Host '[1/5] Existing MemoA development app found. Skipping APK rebuild.'
  Write-Host '[2/5] APK copy skipped.'
  Write-Host '[3/5] APK installation skipped.'
}

Write-Host '[4/5] Connecting backend and Metro ports over USB...'
& $adbPath reverse tcp:8080 tcp:8080
if ($LASTEXITCODE -ne 0) {
  throw 'Could not reverse backend port 8080.'
}
& $adbPath reverse tcp:8081 tcp:8081
if ($LASTEXITCODE -ne 0) {
  throw 'Could not reverse Metro port 8081.'
}

Set-Location -LiteralPath $frontEndPath

try {
  $metroResponse = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8081/status' -TimeoutSec 2
  $metroRunning = $metroResponse.StatusCode -eq 200
} catch {
  $metroRunning = $false
}

if ($metroRunning) {
  Write-Host '[5/5] Opening MemoA through the existing Metro server...'
  & $adbPath shell am force-stop com.frontend
  & $adbPath shell am start -a android.intent.action.VIEW -d $developmentUrl com.frontend
  exit $LASTEXITCODE
}

Write-Host '[5/5] Starting Metro. MemoA will open automatically when Metro is ready...'
$openAppJob = Start-Job -ScriptBlock {
  param($adbExecutable, $url)

  for ($attempt = 0; $attempt -lt 120; $attempt++) {
    try {
      $response = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8081/status' -TimeoutSec 1
      if ($response.StatusCode -eq 200) {
        & $adbExecutable shell am force-stop com.frontend
        & $adbExecutable shell am start -a android.intent.action.VIEW -d $url com.frontend
        return
      }
    } catch {
      # Keep waiting while Metro starts.
    }
    Start-Sleep -Milliseconds 500
  }

  throw 'Metro did not start within 60 seconds.'
} -ArgumentList $adbPath, $developmentUrl

try {
  & npx.cmd expo start --dev-client --lan --port 8081
  exit $LASTEXITCODE
} finally {
  if ($openAppJob.State -eq 'Running') {
    Stop-Job -Job $openAppJob
  }
  Receive-Job -Job $openAppJob -ErrorAction SilentlyContinue
  Remove-Job -Job $openAppJob -Force
}
