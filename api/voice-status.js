export default function handler(_req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.status(200).json({
    configured: Boolean(process.env.ELEVENLABS_API_KEY),
  });
}
