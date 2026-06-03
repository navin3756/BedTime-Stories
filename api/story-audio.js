const MAX_NARRATION_CHARS = 9500;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Cloned voice narration is not configured yet." });
    return;
  }

  try {
    const { text, voiceId } = req.body || {};
    if (!voiceId || typeof voiceId !== "string") {
      res.status(400).json({ error: "Missing cloned voice id." });
      return;
    }

    if (!/^[A-Za-z0-9_-]{8,128}$/.test(voiceId)) {
      res.status(400).json({ error: "Invalid cloned voice id." });
      return;
    }

    const narrationText = String(text || "").replace(/\s+/g, " ").trim().slice(0, MAX_NARRATION_CHARS);
    if (!narrationText) {
      res.status(400).json({ error: "Missing story text." });
      return;
    }

    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: narrationText,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.72,
            similarity_boost: 0.85,
            style: 0.08,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      res.status(response.status).json({
        error: data.detail?.message || data.detail || data.error || "Unable to create cloned narration.",
      });
      return;
    }

    const audio = Buffer.from(await response.arrayBuffer());
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Content-Type", "audio/mpeg");
    res.status(200).send(audio);
  } catch (error) {
    console.error("Cloned narration failed:", error);
    res.status(500).json({ error: "Cloned narration failed. Please try again." });
  }
}
