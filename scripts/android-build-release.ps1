param(
  [switch]$SkipSync
)

$ErrorActionPreference = "Stop"
trap {
  Write-Host $_.Exception.Message -ForegroundColor Red
  exit 1
}

$repoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$bundlePath = Join-Path $repoRoot "android\app\build\outputs\bundle\release\app-release.aab"
$keystoreProperties = Join-Path $repoRoot "android\keystore.properties"

if (-not (Test-Path $keystoreProperties)) {
  throw "Missing android\keystore.properties. Copy android\keystore.properties.example, fill in the upload key passwords, then rerun."
}

Push-Location $repoRoot
try {
  if (-not $SkipSync) {
    npm run android:sync
  }

  $androidStudioJbr = "C:\Program Files\Android\Android Studio\jbr"
  if (Test-Path $androidStudioJbr) {
    $env:JAVA_HOME = $androidStudioJbr
  }

  if (-not $env:ANDROID_HOME) {
    $env:ANDROID_HOME = Join-Path $env:LOCALAPPDATA "Android\Sdk"
  }
  if (-not $env:ANDROID_SDK_ROOT) {
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
  }

  $env:GRADLE_OPTS = "-Dorg.gradle.workers.max=1 -Dorg.gradle.parallel=false -Dorg.gradle.daemon=false"
  & (Join-Path $repoRoot "android\gradlew.bat") -p (Join-Path $repoRoot "android") bundleRelease --no-daemon --max-workers=1 "-Dorg.gradle.jvmargs=-Xmx512m -Xss512k -XX:CICompilerCount=2 -Dfile.encoding=UTF-8"
  if ($LASTEXITCODE -ne 0) {
    throw "Gradle bundleRelease failed with exit code $LASTEXITCODE"
  }

  if (-not (Test-Path $bundlePath)) {
    throw "Release bundle was not created at $bundlePath"
  }

  Write-Host "Release App Bundle: $bundlePath"
}
finally {
  Pop-Location
}
