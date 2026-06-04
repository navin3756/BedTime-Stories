# Sweetdreams Bedtime Stories

A private, offline-first bedtime story app for creating gentle stories, saving recent favorites, and reading them aloud on the device.

## Bedtime Features

- One-tap pre-populated stories and one-step custom story generation.
- On-device story composition with no API key, account, or prompt upload.
- Child-safety screening that politely declines age-inappropriate ideas.
- Personalized story profile with child name, age range, comfort focus, and favorite companion.
- Wind-down routine presets for sleepy reset, big feelings, and brave-in-the-dark nights.
- Manual voice, narration pace, background music, and sleep timer controls.
- Sweetdreams Calm, a softer default narration profile tuned for kids falling asleep.

## Run Locally

```powershell
npm install
npm run dev
```

The app runs at `http://localhost:3000`.

## Verify The MVP

```powershell
npm run lint
npm run test:mvp
npm run build
```

The MVP acceptance criteria live in `docs/mvp-acceptance-criteria.md`.

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

## Google Play Release Build

Google Play uploads should use a signed Android App Bundle (`.aab`).

```powershell
npm run android:bundle
```

The Play Console upload artifact is written to:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

Play Store listing and policy drafts live in `play-store/`.
