# Sweetdreams MVP Acceptance Criteria

## 1. Core Story Flow

- A child or parent can start any pre-populated story with one tap.
- A custom idea can start a story with one submit action.
- “Show 3 choices” returns three distinct, relevant choices.
- Different custom ideas produce meaningfully different settings, tasks, and story text.
- Loading, empty, and error states never leave the user stuck.
- Back, new story, recent story, delete, voice, narration pace, music, timer, and breathing controls work.

## 2. Child Safety And Language

- Explicit violence, sexual content, drugs, self-harm, abuse, hate, gore, and safeguard-bypass prompts are declined before a story is created.
- The refusal is calm, polite, and redirects toward a safe idea.
- Self-harm or abuse prompts encourage telling a trusted grown-up.
- Benign fantasy ideas such as friendly dragons, brave kittens, and dinosaurs are allowed.
- Stories avoid scary conflict and include reassuring, age-appropriate language.
- Story text ends in calm sleep rather than suspense or a cliffhanger.

## 3. Privacy And Security

- Story generation requires no API key, account, microphone, or cloud model.
- Story prompts are not sent over the network.
- Android requests no internet or microphone permission.
- Story text is rendered as text, never injected as HTML.
- Saved stories and optional profile details remain in local device storage.
- No secrets or provider keys are bundled in source, web assets, APK, or AAB.

## 4. Narration And Stability

- Read aloud can be started and stopped repeatedly without overlapping narration.
- Voice changes stop the current narration before applying the new voice.
- Background music is selected and started manually.
- Audio contexts, oscillators, timers, speech listeners, and native TTS resources are released when stopped or unmounted.
- A narration failure leaves the full story readable on screen and shows a useful recovery message.

## 5. Visual Hook

- The Sweetdreams moon-and-storybook logo is visible on the first screen.
- The logo remains legible at app-icon size and matches the Play Store icon.
- The first screen makes one-tap stories and custom story creation immediately discoverable.

## Automated Check

Run:

```powershell
npm run test:mvp
```
