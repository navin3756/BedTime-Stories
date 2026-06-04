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

interface StoryWorld {
  id: string;
  keywords: string[];
  place: string;
  sights: string[];
  sounds: string[];
  tasks: string[];
  treasures: string[];
}

const GENERAL_HARM_REFUSAL = "I can't use that idea for a child's bedtime story. Let's make it gentle and safe, with no one getting hurt. Try friendship, animals, nature, or a magical helper.";
const IDENTITY_OR_ADULT_REFUSAL = "I can't make a children's story with adult content or unkindness toward people because of who they are. Let's choose friendship, respect, or a magical adventure instead.";
const SUPPORTIVE_REFUSAL = "I can't turn that into a bedtime story. If this is about you or someone you know, please tell a trusted grown-up now. We can make a gentle story about getting help and feeling safe.";

const SELF_HARM_OR_ABUSE_PATTERNS: RegExp[] = [
  /\b(suicid(?:e|al)|self[- ]?harm(?:ing)?|cut(?:ting)? myself|hurt(?:ing)? (?:myself|themself|themselves)|want(?:s|ed)? to die)\b/i,
  /\b(abuse[ds]?|abusing|molest(?:s|ed|ing)?|hit(?:s|ting)? (?:a|the|my) child|beat(?:s|ing)? (?:a|the|my) child|hurt(?:s|ing)? (?:a|the|my) child)\b/i,
];

const IDENTITY_OR_ADULT_PATTERNS: RegExp[] = [
  /\b(sex(?:ual)?|nude|naked|porn(?:ography)?|rape[ds]?)\b/i,
  /\b(hate[sd]?|hating|attack(?:s|ed|ing)?|harm(?:s|ed|ing)?|destroy(?:s|ed|ing)?)\b.{0,32}\b(race|religion|people|group|girls|boys|identity)\b/i,
  /\b(adult content|explicit content)\b/i,
];

const GENERAL_HARM_PATTERNS: RegExp[] = [
  /\b(kill(?:s|ed|ing)?|murder(?:s|ed|ing)?|stab(?:s|bed|bing)?|shoot(?:s|ing)?|weapon(?:s)?|bomb(?:s|ing)?|torture[ds]?|kidnap(?:s|ped|ping)?|gore|blood(?:y|ied)?|exposed organs?)\b/i,
  /(?<!water )\bgun(?:s)?\b/i,
  /\b(cocaine|heroin|meth|illegal drugs?|drug dealer|overdose[ds]?|getting high)\b/i,
  /\b(ignore|disregard|bypass|override)\b.{0,32}\b(safety|safeguards?|rules|instructions)\b/i,
  /\b(system prompt|jailbreak|not age[- ]?appropriate|write anything)\b/i,
];

const WORLDS: StoryWorld[] = [
  {
    id: "sky",
    keywords: ["moon", "star", "space", "planet", "rocket", "sky", "cloud"],
    place: "a wide velvet sky",
    sights: ["a ribbon of silver starlight", "sleepy constellations", "clouds shaped like pillows"],
    sounds: ["the soft hum of distant stars", "a moonbeam chiming like a tiny bell", "a cloud sighing happily"],
    tasks: ["help a shy star find its constellation", "carry a warm moonbeam to a sleepy cloud", "arrange three stars into a goodnight picture"],
    treasures: ["a pocket-sized star", "a feather-light moon map", "a jar of quiet starlight"],
  },
  {
    id: "sea",
    keywords: ["ocean", "sea", "boat", "submarine", "underwater", "mermaid", "fish", "whale", "island", "beach"],
    place: "a calm sea that sparkled under the moon",
    sights: ["pearly waves", "a lantern-lit coral garden", "an island made of soft sand"],
    sounds: ["waves whispering against the shore", "a whale humming a low lullaby", "shells clicking gently in the tide"],
    tasks: ["guide a tiny boat toward its glowing harbor", "return a sleepy shell to the coral garden", "help a young whale remember its bedtime song"],
    treasures: ["a pearly shell", "a smooth sea-glass star", "a little lantern buoy"],
  },
  {
    id: "forest",
    keywords: ["forest", "tree", "woods", "fox", "owl", "bear", "rabbit", "kitten", "cat", "dog", "puppy", "animal"],
    place: "a friendly forest where the leaves glowed softly",
    sights: ["fern beds tucked beneath old trees", "fireflies making tiny lantern paths", "mushrooms with dew-drop hats"],
    sounds: ["leaves rustling like blankets", "an owl counting slow breaths", "a brook murmuring a quiet song"],
    tasks: ["help a little friend find the coziest sleeping nook", "deliver a goodnight wish to the oldest tree", "follow the fireflies to a moonlit meadow"],
    treasures: ["a firefly lantern", "a smooth acorn charm", "a leaf shaped like a tiny heart"],
  },
  {
    id: "kingdom",
    keywords: ["dragon", "castle", "princess", "prince", "knight", "fairy", "unicorn", "magic"],
    place: "a peaceful kingdom beyond the pillow hills",
    sights: ["a castle with glowing windows", "a garden of bell-shaped flowers", "a gentle dragon folding its wings"],
    sounds: ["banners fluttering in the evening breeze", "a fountain singing softly", "tiny bells from the fairy garden"],
    tasks: ["help a gentle dragon prepare the castle for bedtime", "find the missing star for the royal night-light", "carry a kindness note across the moonlit garden"],
    treasures: ["a soft golden crown", "a friendly dragon scale", "a wand that only makes cozy light"],
  },
  {
    id: "journey",
    keywords: ["train", "car", "bus", "plane", "travel", "journey", "road"],
    place: "a quiet road that curved through the sleeping countryside",
    sights: ["lanterns glowing beside the path", "hills wearing blankets of mist", "a station clock blinking sleepily"],
    sounds: ["wheels making a gentle click-clack", "the breeze humming through open fields", "a faraway whistle saying goodnight"],
    tasks: ["bring a bundle of dreams to the last little station", "help a sleepy traveler find the way home", "collect goodnight wishes from each quiet stop"],
    treasures: ["a silver ticket", "a tiny compass that points toward home", "a warm lantern for the journey"],
  },
  {
    id: "dinosaur",
    keywords: ["dinosaur", "dino", "t-rex", "triceratops"],
    place: "a fern-covered valley beneath a lavender sunset",
    sights: ["giant leaves beaded with dew", "a warm nest beside the hill", "long-necked dinosaurs moving like clouds"],
    sounds: ["ferns swishing in the breeze", "a baby dinosaur making a tiny yawn", "the valley echoing a slow goodnight"],
    tasks: ["help a baby dinosaur find the softest leaves for its nest", "carry a bedtime song across the valley", "follow gentle footprints to a warm family cuddle"],
    treasures: ["a smooth speckled pebble", "a fern-shaped bookmark", "a tiny fossil star"],
  },
  {
    id: "library",
    keywords: ["book", "library", "story", "letter", "school"],
    place: "a floating library where every book felt warm",
    sights: ["shelves curving like rainbows", "pages glowing with quiet pictures", "a reading nook made of clouds"],
    sounds: ["pages turning by themselves", "a pencil scribbling a kind note", "books whispering their last line"],
    tasks: ["help a lost story find its happy ending", "return a sleepy book to its favorite shelf", "choose a gentle chapter for the moon"],
    treasures: ["a bookmark made of starlight", "a tiny book of brave thoughts", "a silver library card"],
  },
  {
    id: "garden",
    keywords: [],
    place: "a moonlit garden hidden just beyond bedtime",
    sights: ["flowers glowing like little lamps", "a path of soft silver stones", "butterflies resting beneath leaves"],
    sounds: ["petals brushing in the breeze", "a fountain making a sleepy rhythm", "crickets playing a quiet lullaby"],
    tasks: ["help the garden gather its last goodnight wishes", "find a glowing flower for the bedside table", "follow a silver path toward a cozy surprise"],
    treasures: ["a glowing flower", "a ribbon of moonlight", "a seed filled with tomorrow's hope"],
  },
];

const OPTION_STYLES = [
  { id: "path", titlePrefix: "The Moonlit Path to", opening: "A gentle journey" },
  { id: "star", titlePrefix: "The Little Star and", opening: "A kind new friend" },
  { id: "wish", titlePrefix: "The Goodnight Wish of", opening: "A cozy mystery" },
];

const RELATIONSHIP_CONFLICT_STYLES = [
  { id: "listening", titleSuffix: "Who Found Their Way Back", repair: "pause, listen to each other's feelings, and make up" },
  { id: "promise", titlePrefix: "The Goodnight Promise Between", repair: "share an apology, find a fair solution, and feel close again" },
  { id: "star", titleSuffix: "and the Shared Star", repair: "turn an argument into a kind conversation and a shared bedtime promise" },
];

function hashText(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function pick<T>(items: T[], seed: number, offset = 0): T {
  return items[(seed + offset) % items.length];
}

function cleanInput(value: string, maxLength = 120): string {
  return value.trim().replace(/\s+/g, " ").replace(/[<>]/g, "").slice(0, maxLength);
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .slice(0, 7)
    .map(word => word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : "")
    .join(" ");
}

function ideaLabel(prompt: string): string {
  const cleaned = cleanInput(prompt).replace(/[.!?]+$/, "");
  return cleaned || "A Little Dream";
}

function summaryIdea(summary: string): string {
  const match = summary.match(/inspired by (.*?):/i);
  return ideaLabel(match?.[1] || summary);
}

function isRelationshipConflictIdea(value: string): boolean {
  const hasRelationship = /\b(sisters?|siblings?|brothers?|friends?|cousins?)\b/i.test(value);
  const hasConflict = /\b(fight(?:ing)?|argument|arguing|disagreement|quarrel|not getting along|mad at|upset with)\b/i.test(value);
  return hasRelationship && hasConflict;
}

function relationshipNoun(value: string): string {
  if (/\bsisters?\b/i.test(value)) return "sisters";
  if (/\bbrothers?\b/i.test(value)) return "brothers";
  if (/\bsiblings?\b/i.test(value)) return "siblings";
  if (/\bcousins?\b/i.test(value)) return "cousins";
  return "friends";
}

function relationshipSubject(value: string, preferences: StoryPreferences): string {
  const childName = cleanInput(preferences.childName, 40);
  const relationship = relationshipNoun(value);
  if (!childName) return `two ${relationship}`;
  if (relationship === "friends") return `${childName} and a good friend`;
  if (relationship === "siblings") return `${childName} and a sibling`;
  return `${childName} and their ${relationship.slice(0, -1)}`;
}

function chooseWorld(prompt: string): StoryWorld {
  const lower = prompt.toLowerCase();
  return WORLDS.find(world => world.keywords.some(keyword => lower.includes(keyword))) || WORLDS[WORLDS.length - 1];
}

function childReference(preferences: StoryPreferences): string {
  return cleanInput(preferences.childName, 40) || "the little dreamer";
}

function sentenceChildReference(preferences: StoryPreferences): string {
  const child = childReference(preferences);
  return child === "the little dreamer" ? "The little dreamer" : child;
}

function companionReference(preferences: StoryPreferences): string {
  return cleanInput(preferences.companion, 50) || "a tiny lantern friend";
}

function sentenceStart(value: string): string {
  return value ? value[0].toUpperCase() + value.slice(1) : value;
}

function lengthParagraphs(preferences: StoryPreferences): number {
  if (preferences.ageRange === "2-3") return 1;
  if (preferences.length.startsWith("tiny")) return 1;
  if (preferences.length.startsWith("longer")) return 3;
  return 2;
}

export function validateStoryIdea(prompt: string, preferences?: Partial<StoryPreferences>): void {
  const values = [prompt, preferences?.childName || "", preferences?.companion || ""];
  if (values.some(value => SELF_HARM_OR_ABUSE_PATTERNS.some(pattern => pattern.test(value)))) throw new Error(SUPPORTIVE_REFUSAL);
  if (values.some(value => IDENTITY_OR_ADULT_PATTERNS.some(pattern => pattern.test(value)))) throw new Error(IDENTITY_OR_ADULT_REFUSAL);
  if (values.some(value => GENERAL_HARM_PATTERNS.some(pattern => pattern.test(value)))) throw new Error(GENERAL_HARM_REFUSAL);
}

export function isStorySafetyRefusal(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return [GENERAL_HARM_REFUSAL, IDENTITY_OR_ADULT_REFUSAL, SUPPORTIVE_REFUSAL].includes(error.message);
}

export function generateLocalStoryText(title: string, summary: string, preferences: StoryPreferences): string {
  validateStoryIdea(`${title} ${summary}`, preferences);

  if (isRelationshipConflictIdea(`${title} ${summary}`)) {
    const relationship = relationshipNoun(`${title} ${summary}`);
    const subject = relationshipSubject(`${title} ${summary}`, preferences);
    const sentenceSubject = sentenceStart(subject);
    const isToddler = preferences.ageRange === "2-3";

    if (isToddler) {
      return `${title}

One cozy evening, ${subject} were building a blanket fort together.

They both wanted the same soft pillow. A small disagreement made them feel upset, so they stopped and took three slow breaths.

${sentenceSubject} listened to each other. One said, "I'm sorry." The other said, "I love you." Then they found another pillow and finished the fort together.

The ${relationship} felt close again. They cuddled beneath their blankets, said goodnight, and drifted into peaceful sleep.`;
    }

    return `${title}

One cozy evening, ${subject} were building a blanket fort together. They had laughed as they tucked sheets over chairs and made a little window for the moon.

Then they both reached for the same soft blue pillow. A small disagreement became an argument, and their voices grew louder than they meant them to. The fort no longer felt cozy, because neither of them wanted to feel far away from the other.

The ${relationship} took a little space and each breathed in slowly, then breathed out gently. When their bodies felt calmer, they remembered that being close did not mean they had to agree about everything.

${sentenceSubject} sat beside the unfinished fort. One explained how it felt to have an idea ignored. The other explained how it felt to never get a turn. They listened without interrupting, and each discovered something important in the other's words.

"I'm sorry I shouted," one said. "I'm sorry I did not listen," the other replied. Their apology did not erase the disagreement, but it made room for kindness again.

Together they found a fair solution: the blue pillow could become a shared moon seat, with enough room for both of them. They finished the fort side by side and added two small stars above its doorway.

The ${relationship} felt close again, not because they never had arguments, but because they knew how to pause, listen, apologize, and make up.

At bedtime, they carried their goodnight promise with them: even after a difficult moment, love could help them find their way back to each other. Then the room grew quiet, the moon watched over them, and they drifted into peaceful sleep.`;
  }

  const child = childReference(preferences);
  const sentenceChild = sentenceChildReference(preferences);
  const companion = companionReference(preferences);
  const sentenceCompanion = sentenceStart(companion);
  const world = chooseWorld(summary);
  const seed = hashText(`${title}|${summary}|${preferences.ageRange}|${preferences.mood}|${preferences.comfortFocus}`);
  const sight = pick(world.sights, seed, 1);
  const secondSight = pick(world.sights, seed, 2);
  const sound = pick(world.sounds, seed, 3);
  const task = pick(world.tasks, seed, 4);
  const treasure = pick(world.treasures, seed, 5);
  const focus = preferences.comfortFocus || "falling asleep peacefully";
  const extraCount = lengthParagraphs(preferences);
  const isToddler = preferences.ageRange === "2-3";
  const safeWords = isToddler
    ? `"Safe and loved," the night seemed to say.`
    : `every gentle sound seemed to say, "You are safe. You are loved. You have plenty of time."`;

  const extraParagraphs = [
    isToddler
      ? `${sentenceChild} and ${companion} went slowly. They saw ${secondSight}. They listened to ${sound}.`
      : `${sentenceChild} and ${companion} took their time. They noticed ${secondSight}, listened to ${sound}, and discovered that the whole world became easier to understand when nobody hurried.`,
    `At a quiet resting place, ${companion} invited ${child} to breathe in slowly, as if smelling a favorite flower, and breathe out gently, as if cooling a warm cup of cocoa. They did this three times, and each breath made the night feel softer.`,
    `Before leaving, they shared one kind thought about the day and tucked one hopeful thought away for tomorrow. The path seemed to glow a little brighter, pleased to be trusted with both.`,
  ].slice(0, extraCount);

  return `${title}

Once, when the room was quiet and the stars were beginning to blink, ${child} discovered a small door made of moonlight.

On the other side was ${world.place}. It was inspired by ${summaryIdea(summary).toLowerCase()}, and there was ${sight} waiting nearby. ${sentenceCompanion} waved hello and explained that tonight they would ${task}.

Nothing in this place was rushed or scary. ${sentenceChild} could hear ${sound}. ${sentenceStart(safeWords)}

${extraParagraphs.join("\n\n")}

Together they completed their quiet task. As a thank-you, the bedtime world gave ${child} ${treasure}. It was not a treasure to keep in a pocket, but a reminder that ${focus} could begin with one slow breath and one kind thought.

At last, a moonbeam showed the way home. ${sentenceChild} climbed back beneath the blankets, while ${companion} promised to stay close in every cozy dream.

The moonlight door became a tiny sparkle on the wall. ${sentenceChild} took one deep breath, let the day grow still, and drifted into a calm and happy sleep.`;
}

function localStoryOptions(prompt: string, preferences: StoryPreferences): StoryOption[] {
  validateStoryIdea(prompt, preferences);

  const idea = ideaLabel(prompt);
  const titleIdea = titleCase(idea);
  const sentenceChild = sentenceChildReference(preferences);
  const companion = companionReference(preferences);
  const world = chooseWorld(prompt);
  const seed = hashText(`${prompt}|${preferences.mood}|${preferences.comfortFocus}|${preferences.companion}`);

  if (isRelationshipConflictIdea(prompt)) {
    const relationship = relationshipNoun(prompt);
    const relationshipTitle = titleCase(relationship);
    const subject = sentenceStart(relationshipSubject(prompt, preferences));

    return RELATIONSHIP_CONFLICT_STYLES.map(style => ({
      id: `offline-relationship-${style.id}-${seed}`,
      title: style.titlePrefix
        ? `${style.titlePrefix} ${relationshipTitle}`
        : `The ${relationshipTitle} ${style.titleSuffix}`,
      summary: `${subject} work through a gentle disagreement as they ${style.repair}.`,
    }));
  }

  return OPTION_STYLES.map((style, index) => {
    const task = pick(world.tasks, seed, index);
    const sight = pick(world.sights, seed, index + 2);
    const title = index === 1
      ? `${style.titlePrefix} ${titleIdea}`
      : `${style.titlePrefix} ${titleIdea}`;

    return {
      id: `offline-${world.id}-${style.id}-${seed}`,
      title,
      summary: `${style.opening} inspired by ${idea}: ${sentenceChild} and ${companion} visit ${world.place}, notice ${sight}, and ${task} while practicing ${preferences.comfortFocus}.`,
    };
  });
}

function waitForNextChunk(signal?: AbortSignal): Promise<void> {
  if (signal?.aborted) return Promise.reject(new DOMException("Story generation was canceled.", "AbortError"));

  return new Promise((resolve, reject) => {
    const handleAbort = () => {
      clearTimeout(timeoutId);
      reject(new DOMException("Story generation was canceled.", "AbortError"));
    };
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", handleAbort);
      resolve();
    }, 20);
    signal?.addEventListener("abort", handleAbort, { once: true });
  });
}

async function* streamLocalStory(text: string, signal?: AbortSignal) {
  const words = text.split(" ");
  for (let index = 0; index < words.length; index += 10) {
    if (signal?.aborted) throw new DOMException("Story generation was canceled.", "AbortError");
    yield `${words.slice(index, index + 10).join(" ")} `;
    await waitForNextChunk(signal);
  }
}

export async function generateStoryOptions(prompt: string, preferences: StoryPreferences): Promise<StoryOption[]> {
  return localStoryOptions(prompt, preferences);
}

export async function* generateFullStoryStream(title: string, summary: string, preferences: StoryPreferences, signal?: AbortSignal) {
  yield* streamLocalStory(generateLocalStoryText(title, summary, preferences), signal);
}
