param(
  [string]$Serial = "",
  [switch]$SkipBuild,
  [switch]$NoLaunch,
  [switch]$CaptureArtifacts
)

$ErrorActionPreference = "Stop"
trap {
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$apkPath = Join-Path $repoRoot "android\app\build\outputs\apk\debug\app-debug.apk"
$packageName = "com.sweetdreams.bedtimestories"

function Resolve-AndroidTool {
  param([string]$RelativePath)

  $sdkRoot = $env:ANDROID_HOME
  if (-not $sdkRoot) {
    $sdkRoot = $env:ANDROID_SDK_ROOT
  }
  if (-not $sdkRoot) {
    $sdkRoot = Join-Path $env:LOCALAPPDATA "Android\Sdk"
  }

  $toolPath = Join-Path $sdkRoot $RelativePath
  if (-not (Test-Path $toolPath)) {
    throw "Could not find Android SDK tool: $toolPath. Set ANDROID_HOME or install Android platform-tools."
  }

  return $toolPath
}

function Get-DeviceSerial {
  param([string]$AdbPath, [string]$RequestedSerial)

  $deviceRows = & $AdbPath devices | Select-String -Pattern "^\S+\s+device$"
  $devices = @($deviceRows | ForEach-Object { ($_.ToString() -split "\s+")[0] })

  if ($RequestedSerial) {
    if ($devices -notcontains $RequestedSerial) {
      throw "Requested Android target '$RequestedSerial' is not connected. Connected targets: $($devices -join ', ')"
    }
    return $RequestedSerial
  }

  if ($devices.Count -eq 0) {
    throw "No connected Android device or fully booted emulator found. Plug in a phone with USB debugging enabled, or start a booted emulator, then rerun this script."
  }

  if ($devices.Count -gt 1) {
    throw "Multiple Android targets are connected: $($devices -join ', '). Rerun with -Serial <target>."
  }

  return $devices[0]
}

$adb = Resolve-AndroidTool "platform-tools\adb.exe"

if (-not $SkipBuild) {
  Push-Location $repoRoot
  try {
    npm run android:sync

    if (-not $env:JAVA_HOME) {
      $androidStudioJbr = "C:\Program Files\Android\Android Studio\jbr"
      if (Test-Path $androidStudioJbr) {
        $env:JAVA_HOME = $androidStudioJbr
      }
    }

    if (-not $env:ANDROID_HOME) {
      $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk"
    }
    if (-not $env:ANDROID_SDK_ROOT) {
      $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
    }

    & (Join-Path $repoRoot "android\gradlew.bat") -p (Join-Path $repoRoot "android") assembleDebug --no-daemon
  }
  finally {
    Pop-Location
  }
}

if (-not (Test-Path $apkPath)) {
  throw "Debug APK not found at $apkPath. Run npm run android:sync and android\gradlew.bat -p android assembleDebug first."
}

$targetSerial = Get-DeviceSerial -AdbPath $adb -RequestedSerial $Serial
Write-Host "Installing $apkPath on $targetSerial ..."
& $adb -s $targetSerial install -r $apkPath

if (-not $NoLaunch) {
  $activity = (& $adb -s $targetSerial shell cmd package resolve-activity --brief $packageName | Select-Object -Last 1).Trim()
  if (-not $activity -or $activity -eq "No activity found") {
    $activity = "$packageName/.MainActivity"
  }

  Write-Host "Launching $activity ..."
  & $adb -s $targetSerial shell am start -n $activity
}

if ($CaptureArtifacts) {
  $artifactDir = Join-Path $repoRoot "android-test-artifacts"
  New-Item -ItemType Directory -Force -Path $artifactDir | Out-Null

  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  $screenshot = Join-Path $artifactDir "sweetdreams-$timestamp.png"
  $uiDumpDevice = "/sdcard/window-$timestamp.xml"
  $uiDumpLocal = Join-Path $artifactDir "window-$timestamp.xml"
  $logcat = Join-Path $artifactDir "logcat-$timestamp.txt"

  Start-Sleep -Seconds 3
  & $adb -s $targetSerial exec-out screencap -p > $screenshot
  & $adb -s $targetSerial shell uiautomator dump $uiDumpDevice | Out-Null
  & $adb -s $targetSerial pull $uiDumpDevice $uiDumpLocal | Out-Null
  & $adb -s $targetSerial logcat -d -t 400 > $logcat

  Write-Host "Captured screenshot: $screenshot"
  Write-Host "Captured UI dump: $uiDumpLocal"
  Write-Host "Captured logcat: $logcat"
}

Write-Host "Done."
