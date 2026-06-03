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

## Family Voice Studio

Voice cloning is optional and requires an ElevenLabs API key on the server:

```env
ELEVENLABS_API_KEY="your_key_here"
```

The app never puts this key in browser code. Users must confirm they are recording their own voice, or have explicit permission, before creating a family voice.
