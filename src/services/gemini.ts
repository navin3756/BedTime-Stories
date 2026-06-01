import { GoogleGenAI, Type, Modality, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface StoryOption {
  id: string;
  title: string;
  summary: string;
}

/**
 * Converts raw PCM data to a playable WAV blob URL.
 * Gemini TTS returns raw PCM at 24000Hz.
 */
function pcmToWav(base64Pcm: string, sampleRate: number = 24000): string {
  const binaryString = window.atob(base64Pcm);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }

  const buffer = new ArrayBuffer(44 + bytes.length);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + bytes.length, true); // chunk size
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // fmt sub-chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true); // subchunk1size (16 for PCM)
  view.setUint16(20, 1, true); // audio format (1 for PCM)
  view.setUint16(22, 1, true); // num channels (1 for mono)
  view.setUint32(24, sampleRate, true); // sample rate
  view.setUint32(28, sampleRate * 2, true); // byte rate (sampleRate * numChannels * bitsPerSample/8)
  view.setUint16(32, 2, true); // block align (numChannels * bitsPerSample/8)
  view.setUint16(34, 16, true); // bits per sample

  // data sub-chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, bytes.length, true); // subchunk2size

  // Write PCM data
  for (let i = 0; i < bytes.length; i++) {
    view.setUint8(44 + i, bytes[i]);
  }

  const blob = new Blob([buffer], { type: 'audio/wav' });
  return URL.createObjectURL(blob);
}

export async function generateStoryOptions(prompt: string): Promise<StoryOption[]> {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate 3 creative bedtime story ideas for kids based on this prompt: "${prompt}". 
    Return them as a JSON array of objects with 'id', 'title', and 'summary' fields. 
    Make them magical, gentle, and suitable for sleep.`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            title: { type: Type.STRING },
            summary: { type: Type.STRING },
          },
          required: ["id", "title", "summary"],
        },
      },
    },
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse story options", e);
    return [];
  }
}

export async function* generateFullStoryStream(title: string, summary: string) {
  const response = await ai.models.generateContentStream({
    model: "gemini-3-flash-preview",
    contents: `Write a short, soothing bedtime story titled "${title}" based on this summary: "${summary}". 
    The story should be about 300-400 words long, perfect for reading aloud to a child. 
    Use gentle language and a calm pace.`,
    config: {
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
    }
  });

  for await (const chunk of response) {
    yield chunk.text || "";
  }
}

export async function generateStoryAudio(text: string): Promise<string | null> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this bedtime story in a very calm, soothing, and gentle voice: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) return null;

    // Convert raw PCM to WAV for browser compatibility
    return pcmToWav(base64Audio, 24000);
  } catch (error) {
    console.error("Audio generation failed:", error);
    return null;
  }
}
