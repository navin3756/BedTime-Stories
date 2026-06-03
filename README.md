# Sweetdreams Bedtime Stories

A local-first bedtime story app for creating gentle story ideas, generating full stories with Ollama, saving recent stories, and reading them aloud in the browser.

## Bedtime Features

- Personalized story profile with child name, age range, comfort focus, and favorite companion.
- Wind-down routine presets for sleepy reset, big feelings, and brave-in-the-dark nights.
- Manual voice, narration pace, background music, and sleep timer controls.
- Sweetdreams Calm, a softer default browser narration profile tuned for kids falling asleep.
- Optional Family Voice Studio for consent-based voice recording, cloning, and personalized story narration.

## Run Locally

**Prerequisites:** Node.js and Ollama.

1. Install dependencies:
   `npm install`
2. Install a local model:
   `ollama pull llama3.2:1b`
3. Start the app:
   `npm run dev`

By default the app calls Ollama at `http://127.0.0.1:11434` and uses the first installed model. You can override that with `.env.local`:

```env
OLLAMA_URL="http://127.0.0.1:11434"
OLLAMA_MODEL="llama3.2:1b"
```

If Ollama is not running or no model is installed, the app still works with its built-in story generator.

## Android App

The app is wrapped with Capacitor under `android/`.

```powershell
npm run android:sync
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
$env:ANDROID_SDK_ROOT=$env:ANDROID_HOME
android\gradlew.bat -p android assembleDebug
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

To install the debug APK on a connected phone or fully booted emulator:

```powershell
npm run android:install
```

For a faster reinstall after the APK is already built, with screenshot, UI dump, and logcat artifacts:

```powershell
npm run android:test:install
```

If more than one Android target is connected, run the script directly with a serial:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/android-install-debug.ps1 -SkipBuild -Serial emulator-5554 -CaptureArtifacts
```

## Google Play Release Build

Google Play uploads should use a signed Android App Bundle (`.aab`).

Create an upload key once and keep it private:

```powershell
$env:JAVA_HOME="C:\Program Files\Android\Android Studio\jbr"
& "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -v -keystore android\upload-keystore.jks -alias sweetdreams-upload -keyalg RSA -keysize 2048 -validity 10000
Copy-Item android\keystore.properties.example android\keystore.properties
```

Edit `android\keystore.properties` with the keystore and key passwords. Then build the release bundle:

```powershell
npm run android:bundle
```

The Play Console upload artifact is written to:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

Play Store listing and policy drafts live in `play-store/`.

## Family Voice Studio

Voice cloning is optional and requires an ElevenLabs API key on the server:

```env
ELEVENLABS_API_KEY="your_key_here"
```

The app never puts this key in browser code. Users must confirm they are recording their own voice, or have explicit permission, before creating a family voice.
