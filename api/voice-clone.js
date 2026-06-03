export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_VOICE_SAMPLE_BYTES = 12 * 1024 * 1024;

async function readRequestBody(req, maxBytes) {
  const chunks = [];
  let totalBytes = 0;

  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    totalBytes += buffer.length;
    if (totalBytes > maxBytes) {
      throw new Error("VOICE_SAMPLE_TOO_LARGE");
    }
    chunks.push(buffer);
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

  if (req.headers["x-voice-consent"] !== "confirmed") {
    res.status(403).json({ error: "Voice consent confirmation is required." });
    return;
  }

  try {
    const contentType = req.headers["content-type"];
    if (!contentType?.includes("multipart/form-data")) {
      res.status(400).json({ error: "Expected a multipart voice sample upload." });
      return;
    }

    const contentLength = Number(req.headers["content-length"] || 0);
    if (contentLength > MAX_VOICE_SAMPLE_BYTES) {
      res.status(413).json({ error: "Voice sample is too large." });
      return;
    }

    const body = await readRequestBody(req, MAX_VOICE_SAMPLE_BYTES);
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
    if (error instanceof Error && error.message === "VOICE_SAMPLE_TOO_LARGE") {
      res.status(413).json({ error: "Voice sample is too large." });
      return;
    }

    console.error("Voice clone failed:", error);
    res.status(500).json({ error: "Voice cloning failed. Please try again." });
  }
}
