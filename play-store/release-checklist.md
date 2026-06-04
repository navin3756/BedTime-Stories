# Sweetdreams Google Play Release Checklist

## Build package

- Package name: `com.sweetdreams.bedtimestories`
- App name: `Sweetdreams Bedtime Stories`
- Target SDK: API 36
- Upload format: Android App Bundle (`.aab`)
- Release bundle path after build: `android/app/build/outputs/bundle/release/app-release.aab`

## Before upload

- Confirm the launcher icon and splash screen are final.
- Build and upload a signed release `.aab`.
- Keep `android/upload-keystore.jks` and `android/keystore.properties` private.
- Save the upload key passwords in a password manager.
- Use Google Play App Signing when creating the first release.

## Play Console app content

- Privacy policy URL is required.
- Complete Data Safety form.
- Complete Target audience and content questionnaire.
- Complete IARC content rating questionnaire.
- Confirm Data Safety states that prompts and stories stay on the device.
- Confirm the app declares no microphone permission and Android backup is disabled.
- If you position the app for children, review Families policy carefully before production.

## Recommended rollout

1. Internal testing upload.
2. Closed testing with invited testers.
3. Production access request, if required by the account.
4. Small production rollout after approval.

For new personal developer accounts, Google Play may require at least 12 opted-in closed testers for 14 continuous days before production access.
