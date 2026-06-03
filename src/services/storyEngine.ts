export interface StoryOption {
  id: string;
  title: string;
  summary: string;
}

export interface StoryPreferences {
  childName: string;
  ageRange: string;
  mood: string;
  length: string;
  comfortFocus: string;
  companion: string;
}

interface OllamaModel {
  name: string;
}

interface OllamaTagsResponse {
  models?: OllamaModel[];
}

interface OllamaGenerateResponse {
  response?: string;
  done?: boolean;
}

const ollamaBaseUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const preferredModel = process.env.OLLAMA_MODEL || "";
let cachedModel: string | null | undefined;

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function canUseOllamaFromBrowser(): boolean {
  if (typeof window === "undefined") return true;

  try {
    const appIsLocal = isLoopbackHost(window.location.hostname);
    const ollamaIsLocal = isLoopbackHost(new URL(ollamaBaseUrl).hostname);
    return appIsLocal || !ollamaIsLocal;
  } catch {
    return false;
  }
}

export function isCloudStoryProviderConfigured(): boolean {
  return false;
}

export function getLocalLlmLabel(): string {
  return preferredModel || "an installed Ollama model";
}

async function getOllamaModel(): Promise<string | null> {
  if (cachedModel !== undefined) return cachedModel;

  if (!canUseOllamaFromBrowser()) {
    cachedModel = null;
    return cachedModel;
  }

  try {
    const response = await fetch(`${ollamaBaseUrl}/api/tags`);
    if (!response.ok) {
      cachedModel = null;
      return cachedModel;
    }

    const data = await response.json() as OllamaTagsResponse;
    const models = data.models ?? [];
    cachedModel = models.find(model => model.name === preferredModel)?.name
      ?? models.find(model => model.name.includes("llama"))?.name
      ?? models.find(model => model.name.includes("qwen"))?.name
      ?? models[0]?.name
      ?? null;
    return cachedModel;
  } catch {
    cachedModel = null;
    return cachedModel;
  }
}

function preferenceContext(preferences: StoryPreferences): string {
  const childName = preferences.childName.trim();
  const companion = preferences.companion.trim();
  return [
    childName ? `The child's name is ${childName}.` : "",
    `Target age range: ${preferences.ageRange}.`,
    `Story mood: ${preferences.mood}.`,
    `Desired length: ${preferences.length}.`,
    `Bedtime focus: ${preferences.comfortFocus}.`,
    companion ? `Include this favorite companion as a gentle helper: ${companion}.` : "",
  ].filter(Boolean).join(" ");
}

function firstPromptIdea(prompt: string): string {
  return prompt.trim().replace(/[.!?]+$/, "") || "a little dream";
}

function childReference(preferences: StoryPreferences): string {
  return preferences.childName.trim() || "the little dreamer";
}

function titleChildReference(preferences: StoryPreferences): string {
  return preferences.childName.trim() || "Little Dreamer";
}

function sentenceStartChildReference(preferences: StoryPreferences): string {
  return preferences.childName.trim() || "The little dreamer";
}

function localStoryOptions(prompt: string, preferences: StoryPreferences): StoryOption[] {
  const idea = firstPromptIdea(prompt);
  const sentenceChild = sentenceStartChildReference(preferences);
  const titleChild = titleChildReference(preferences);
  const gentleMood = preferences.mood.split(" and ")[0] || "gentle";
  const companion = preferences.companion.trim() || "a tiny lantern friend";
  const focus = preferences.comfortFocus || "falling asleep peacefully";

  return [
    {
      id: "local-moon-path",
      title: `The Moonlit Path of ${titleChild}`,
      summary: `${sentenceChild} follows a silver trail through a ${gentleMood} world inspired by ${idea}, with ${companion} helping them practice ${focus}.`,
    },
    {
      id: "local-pocket-star",
      title: "The Pocket-Sized Star",
      summary: `A tiny star asks for help with ${idea}, leading to a quiet adventure with ${companion}, warm lights, and a sleepy goodnight about ${focus}.`,
    },
    {
      id: "local-cloud-library",
      title: "The Cloud Library",
      summary: `${sentenceChild} visits a floating library where every cloud whispers a peaceful chapter about ${idea}, ${focus}, and feeling safe.`,
    },
  ];
}

function localStoryText(title: string, summary: string, preferences: StoryPreferences): string {
  const child = childReference(preferences);
  const companion = preferences.companion.trim() || "a small glowing friend";
  const focus = preferences.comfortFocus || "falling asleep peacefully";
  const lengthHint = preferences.length.startsWith("tiny") ? "tiny" : preferences.length.startsWith("longer") ? "longer" : "short";
  const extraMoment = lengthHint === "longer"
    ? `\n\nThey paused beside a little lantern pond, where each ripple showed a happy memory from the day. ${companion} helped ${child} choose the calmest one and tuck it carefully into an imaginary pocket for tomorrow.`
    : "";

  return `${title}

Once, when the room was quiet and the stars were just beginning to blink, ${child} discovered that bedtime had a secret door.

The door was made of soft moonlight and opened with a whisper. On the other side was a gentle place where ${summary.charAt(0).toLowerCase()}${summary.slice(1)}

Every step felt safe. Every sound was kind. A sleepy breeze carried the smell of warm blankets, and the path glowed just enough to show the way. When ${child} felt unsure, ${companion} floated close and hummed, "You are exactly where you need to be."

Together, they wandered past pillow hills, silver leaves, and windows full of cozy dreams. The world did not rush them. It waited patiently, as all good bedtime worlds do. Each quiet step made ${focus} feel a little easier.${extraMoment}

At last, the moon lowered a ladder of light back home. ${child} climbed down slowly, carrying a peaceful feeling in both hands.

Back under the blankets, the secret door became a tiny sparkle on the wall. It promised to stay nearby all night, watching softly until morning.

And with one deep breath, one small smile, and one last twinkle, ${child} drifted into a calm and happy sleep.`;
}

function storyTokenLimit(preferences: StoryPreferences): number {
  if (preferences.length.startsWith("tiny")) return 360;
  if (preferences.length.startsWith("longer")) return 900;
  return 640;
}

async function* streamLocalStory(text: string) {
  const words = text.split(" ");
  for (let index = 0; index < words.length; index += 8) {
    yield `${words.slice(index, index + 8).join(" ")} `;
    await new Promise(resolve => window.setTimeout(resolve, 45));
  }
}

export async function generateStoryOptions(prompt: string, preferences: StoryPreferences): Promise<StoryOption[]> {
  return localStoryOptions(prompt, preferences);
}

export async function* generateFullStoryStream(title: string, summary: string, preferences: StoryPreferences) {
  const model = await getOllamaModel();
  if (!model) {
    yield* streamLocalStory(localStoryText(title, summary, preferences));
    return;
  }

  try {
    const response = await fetch(`${ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: true,
        prompt: `Write a soothing bedtime story for a child.

Title: ${title}
Story idea: ${summary}
${preferenceContext(preferences)}

Keep it gentle, imaginative, reassuring, and easy to read aloud. Do not include scary conflict. Build in one small calming moment, such as slow breathing, body relaxation, or a safety affirmation. End with calm sleep.`,
        options: {
          temperature: 0.75,
          top_p: 0.9,
          num_predict: storyTokenLimit(preferences),
        },
      }),
    });

    if (!response.ok || !response.body) {
      throw new Error(`Ollama stream failed with ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffered = "";
    let generated = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffered += decoder.decode(value, { stream: true });
      const lines = buffered.split("\n");
      buffered = lines.pop() || "";

      for (const line of lines) {
        if (!line.trim()) continue;
        const chunk = JSON.parse(line) as OllamaGenerateResponse;
        if (chunk.response) {
          generated += chunk.response;
          yield chunk.response;
        }
      }
    }

    const trimmed = generated.trim();
    if (trimmed && !/[.!?]"?$/.test(trimmed)) {
      yield " safe, loved, and ready for a peaceful sleep.";
    }
  } catch (error) {
    console.error("Local LLM story generation failed:", error);
    yield* streamLocalStory(localStoryText(title, summary, preferences));
  }
}

export async function generateStoryAudio(text?: string, voiceId?: string): Promise<string | null> {
  if (!text?.trim() || !voiceId) return null;

  const response = await fetch("/api/story-audio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, voiceId }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "Cloned narration could not be created.");
  }

  return URL.createObjectURL(await response.blob());
}
