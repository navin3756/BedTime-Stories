# Offline TTS Plan

Sweetdreams should treat offline neural TTS as a native Android voice provider, not as a web API replacement.

## Current Build

- `NativeTtsPlugin` exposes `listVoices`, `selectVoice`, `speak`, and `stop`.
- `android-system` automatically chooses the best installed bedtime voice.
- Every installed offline English Android TTS voice is exposed as a separate selectable option.
- Android system TTS remains private and on-device.
- Offline neural voice packs are intentionally rejected until a runtime and licensed model are bundled.

## Speechma Decision

Speechma is not embedded in the app. Its public converter requires CAPTCHA and its own FAQ says the developer API is still in development. Automating the website would be unreliable, unsupported, and would send story text to a third-party service. The current Android voice picker provides the no-API alternative by exposing voices already installed on the device.

## Recommended Runtime

Use `sherpa-onnx` for Android offline TTS once a voice model is selected.

Relevant constraints from sherpa-onnx documentation:

- Android TTS support uses native shared libraries and model assets.
- Prebuilt Android shared libraries can be downloaded from sherpa-onnx releases.
- The docs recommend selecting a single ABI where possible; `arm64-v8a` is the practical phone target.
- Runtime libraries are materially smaller than model files, but model assets dominate final APK/AAB size.

## Shipping Approach

1. Keep `android-system` as the default fallback.
2. Add a `sherpa-onnx` voice provider only after the runtime and model are present.
3. Bundle at most one calming English voice initially.
4. Prefer Play Asset Delivery or an optional first-run model pack if the model materially increases the AAB.
5. Do not ship parent voice cloning until consent, deletion, storage, and model-license requirements are resolved.

## Voice Cloning Policy

Parent voice cloning is a separate feature from offline TTS.

Minimum requirements before shipping:

- Explicit adult consent before recording.
- Clear statement that voice samples stay local, if that is technically true.
- Delete voice samples and generated voice packs on request.
- Block child-recorded cloning flows.
- Do not use models with non-commercial or unclear voice-cloning licenses in the Play Store app.
