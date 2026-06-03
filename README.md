# Sweetdreams Bedtime Stories

A local-first bedtime story app for creating gentle story ideas, generating full stories with Ollama, saving recent stories, and reading them aloud in the browser.

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
