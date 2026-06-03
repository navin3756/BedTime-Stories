export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "Voice cloning is not configured yet." });
    return;
  }

  try {
    const contentType = req.headers["content-type"];
    if (!contentType?.includes("multipart/form-data")) {
      res.status(400).json({ error: "Expected a multipart voice sample upload." });
      return;
    }

    const body = await readRequestBody(req);
    const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": contentType,
      },
      body,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      res.status(response.status).json({
        error: data.detail?.message || data.detail || data.error || "Unable to create the voice clone.",
      });
      return;
    }

    res.setHeader("Cache-Control", "no-store");
    res.status(200).json({
      voiceId: data.voice_id,
      requiresVerification: Boolean(data.requires_verification),
    });
  } catch (error) {
    console.error("Voice clone failed:", error);
    res.status(500).json({ error: "Voice cloning failed. Please try again." });
  }
}
