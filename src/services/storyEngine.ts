export interface StoryOption {
  id: string;
  title: string;
  summary: string;
  prompt?: string;
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

interface StoryArc {
  id: string;
  keywords: string[];
  challenge: string;
  repairSkill: string;
  resolution: string;
}

interface TopicShape {
  mainCharacter: string;
  mission: string;
  object: string;
}

interface StoryPlan {
  topic: string;
  topicWords: string[];
  titleIdea: string;
  world: StoryWorld;
  arc: StoryArc;
  seed: number;
  shape: TopicShape;
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
    keywords: ["garden", "flower", "flowers", "butterfly", "butterflies", "cricket", "crickets"],
    place: "a moonlit garden hidden just beyond bedtime",
    sights: ["flowers glowing like little lamps", "a path of soft silver stones", "butterflies resting beneath leaves"],
    sounds: ["petals brushing in the breeze", "a fountain making a sleepy rhythm", "crickets playing a quiet lullaby"],
    tasks: ["help the garden gather its last goodnight wishes", "find a glowing flower for the bedside table", "follow a silver path toward a cozy surprise"],
    treasures: ["a glowing flower", "a ribbon of moonlight", "a seed filled with tomorrow's hope"],
  },
];

const OPTION_STYLES = [
  { id: "path", title: (idea: string) => `The Gentle Night of ${idea}`, opening: "A calm bedtime story" },
  { id: "star", title: (idea: string) => `${idea} and the Little Listening Star`, opening: "A kind new adventure" },
  { id: "wish", title: (idea: string) => `The Goodnight Promise of ${idea}`, opening: "A cozy bedtime promise" },
];

const STORY_ARCS: StoryArc[] = [
  {
    id: "repair",
    keywords: ["fight", "argument", "arguing", "disagreement", "quarrel", "mad", "upset", "bonding", "sister", "brother", "sibling", "friend"],
    challenge: "a small disagreement made the moment feel prickly and hard",
    repairSkill: "pause, listen, apologize, and choose a kinder way forward",
    resolution: "the hard feeling softened into closeness again",
  },
  {
    id: "sharing",
    keywords: ["share", "sharing", "kindness", "cookie", "cookies", "turns", "together", "team"],
    challenge: "there was one lovely thing and more than one heart hoping for it",
    repairSkill: "notice what everyone needed and find a fair, gentle plan",
    resolution: "sharing made the cozy moment feel bigger, not smaller",
  },
  {
    id: "making",
    keywords: ["build", "make", "bake", "cook", "paint", "garden", "open", "opening", "music", "sing", "singing", "dance", "dancing"],
    challenge: "the first try did not come together right away",
    repairSkill: "slow down, try again, and celebrate each small step",
    resolution: "the finished creation became a quiet goodnight gift",
  },
  {
    id: "learning",
    keywords: ["learn", "learning", "teach", "teaching", "practice", "school", "try", "brave"],
    challenge: "the new skill felt a little wobbly at first",
    repairSkill: "take one calm breath and try the next small step",
    resolution: "trying slowly helped the new skill feel friendly",
  },
  {
    id: "finding",
    keywords: ["find", "finding", "lost", "missing", "search", "look", "discover", "treasure"],
    challenge: "something important seemed missing for a little while",
    repairSkill: "look carefully, ask for help, and trust the quiet clues",
    resolution: "the missing piece found its way home",
  },
  {
    id: "exploring",
    keywords: ["explore", "exploring", "visit", "visiting", "travel", "journey", "adventure", "rain", "mars", "moon", "sea", "forest"],
    challenge: "the new place felt wide and unfamiliar at first",
    repairSkill: "move slowly, stay together, and notice one friendly detail at a time",
    resolution: "the unfamiliar place became soft, known, and safe",
  },
  {
    id: "wonder",
    keywords: [],
    challenge: "the idea needed a gentle shape before it could become a bedtime story",
    repairSkill: "name each special detail and place it carefully into the adventure",
    resolution: "the whole idea settled into a calm and happy dream",
  },
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

// Match a keyword only as a whole word so "cat" does not fire on "education",
// "star" on "start", or "sea" on "season".
function matchesKeyword(haystack: string, keyword: string): boolean {
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`, "i").test(haystack);
}

function cleanInput(value: string, maxLength = 120): string {
  return value.trim().replace(/\s+/g, " ").replace(/[<>]/g, "").slice(0, maxLength);
}

function titleCase(value: string): string {
  return value
    .split(" ")
    .slice(0, 8)
    .map(word => word ? word[0].toUpperCase() + word.slice(1).toLowerCase() : "")
    .join(" ");
}

function ideaLabel(prompt: string): string {
  const cleaned = cleanInput(prompt).replace(/[.!?]+$/, "");
  // Reject input with no actual letters (e.g. "12345", "@#$%") so it never
  // becomes a character name or title like "a 12345".
  if (!cleaned || !/[a-z]/i.test(cleaned)) return "A Little Dream";
  return cleaned;
}

function chooseWorld(prompt: string): StoryWorld {
  const lower = prompt.toLowerCase();
  let bestWorld = WORLDS[WORLDS.length - 1];
  let bestScore = 0;

  for (const world of WORLDS) {
    const score = world.keywords.filter(keyword => matchesKeyword(lower, keyword)).length;
    const isNamedWorld = matchesKeyword(lower, world.id);
    const bestIsNamedWorld = matchesKeyword(lower, bestWorld.id);
    if (score > bestScore || (score === bestScore && score > 0 && isNamedWorld && !bestIsNamedWorld)) {
      bestWorld = world;
      bestScore = score;
    }
  }

  return bestWorld;
}

const STOP_WORDS = new Set([
  "about", "after", "again", "along", "also", "and", "around", "because", "before", "being", "between",
  "from", "into", "little", "over", "that", "their", "there", "they", "through", "with", "while",
  "where",
  "a", "an", "the", "to", "in", "on", "of", "for", "is", "are", "was", "were",
]);

let optionRunCounter = 0;

function meaningfulWords(value: string): string[] {
  const words = value.toLowerCase().match(/[a-z]+/g) ?? [];
  return Array.from(new Set(words.filter(word => word.length > 2 && !STOP_WORDS.has(word)))).slice(0, 8);
}

function joinWords(words: string[]): string {
  if (words.length === 0) return "the bedtime idea";
  if (words.length === 1) return words[0];
  if (words.length === 2) return `${words[0]} and ${words[1]}`;
  return `${words.slice(0, -1).join(", ")}, and ${words[words.length - 1]}`;
}

function extractTopicFromSummary(summary: string): string {
  const topicMatch = summary.match(/\babout ([^.]+?)(?:, where|, as|, with|\.|$)/i);
  return ideaLabel(topicMatch?.[1] || summary);
}

function chooseArc(topic: string): StoryArc {
  const lower = topic.toLowerCase();
  return STORY_ARCS.find(arc => arc.keywords.some(keyword => matchesKeyword(lower, keyword))) || STORY_ARCS[STORY_ARCS.length - 1];
}

function makeVariationKey(value?: string): string {
  if (value) return value;
  optionRunCounter += 1;

  const cryptoObject = globalThis.crypto;
  if (cryptoObject?.getRandomValues) {
    const values = new Uint32Array(1);
    cryptoObject.getRandomValues(values);
    return `${Date.now()}-${optionRunCounter}-${values[0]}`;
  }

  return `${Date.now()}-${optionRunCounter}-${Math.random()}`;
}

function withArticle(value: string): string {
  const cleaned = cleanInput(value, 80).replace(/[.!?]+$/, "");
  if (!cleaned) return "a little dream";
  if (/^(a|an|the|two|three|many|one)\b/i.test(cleaned)) return cleaned;
  return `${/^[aeiou]/i.test(cleaned) ? "an" : "a"} ${cleaned}`;
}

function describeTopic(topic: string): TopicShape {
  const cleaned = ideaLabel(topic);
  const lower = cleaned.toLowerCase();

  if (/\bsisters?\b/i.test(cleaned) && /\b(fight|argument|disagreement|quarrel)\b/i.test(cleaned)) {
    return {
      mainCharacter: "two sisters",
      mission: "bonding after a fight",
      object: "a repaired sister hug",
    };
  }

  const whereMatch = cleaned.match(/^(.*?)\s+where\s+(.+)$/i);
  if (whereMatch) {
    const place = withArticle(whereMatch[1]);
    const event = cleanInput(whereMatch[2], 90).replace(/[.!?]+$/, "");

    return {
      mainCharacter: place,
      mission: event ? `helping ${event}` : "making the bedtime place feel calm",
      object: event || place,
    };
  }

  const actionMatch = cleaned.match(
    /^(.*?)\b(learning to|teaching|opening|singing|exploring|finding|preparing|sharing|visiting|building|making|baking|dancing|gardening|helping|looking for|floating|becoming|turning|carrying)\b\s*(.*)$/i,
  );

  if (actionMatch) {
    const actor = withArticle(actionMatch[1]);
    const action = actionMatch[2].toLowerCase();
    const rest = cleanInput(actionMatch[3], 90).replace(/[.!?]+$/, "");
    const mission = rest ? `${action} ${rest}` : action;

    return {
      mainCharacter: actor,
      mission,
      object: rest || mission,
    };
  }

  return {
    mainCharacter: withArticle(cleaned),
    mission: "finding a cozy bedtime adventure",
    object: cleaned,
  };
}

function createStoryPlan(topicSource: string, preferences: StoryPreferences, variationKey: string): StoryPlan {
  const topic = ideaLabel(topicSource);
  const seed = hashText(`${topic}|${preferences.ageRange}|${preferences.mood}|${preferences.comfortFocus}|${variationKey}`);
  return {
    topic,
    topicWords: meaningfulWords(topic),
    titleIdea: titleCase(topic),
    world: chooseWorld(topic),
    arc: chooseArc(topic),
    seed,
    shape: describeTopic(topic),
  };
}

function topicDetailSentence(plan: StoryPlan): string {
  return `The adventure made room for ${joinWords(plan.topicWords)}, so the story felt like the idea ${plan.shape.mainCharacter} had brought with them.`;
}

function storyPlace(plan: StoryPlan): string {
  if (plan.world.id !== "garden") return plan.world.place;
  return `a cozy bedtime corner where ${plan.shape.mainCharacter} could practice ${plan.shape.mission}`;
}

function topicTask(plan: StoryPlan, offset: number): string {
  const details = joinWords(plan.topicWords);
  const frames = [
    `help ${plan.shape.mainCharacter} with ${plan.shape.mission}`,
    `make a gentle plan around ${details}`,
    `turn ${plan.shape.object} into a calm bedtime promise`,
  ];

  if (plan.arc.id === "repair") {
    return pick([
      `help ${plan.shape.mainCharacter} listen and become close again`,
      `turn ${plan.shape.object} into a listening-and-apology story`,
      `find a gentle way through ${details}`,
    ], plan.seed, offset);
  }

  if (plan.arc.id === "sharing") {
    return pick([
      `help ${plan.shape.mainCharacter} share ${plan.shape.object}`,
      `make ${details} feel fair and kind`,
      `turn ${plan.shape.mission} into a cozy sharing plan`,
    ], plan.seed, offset);
  }

  return pick(frames, plan.seed, offset);
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

// Common leetspeak / homoglyph substitutions used to dodge a word filter.
const LEET_MAP: Record<string, string> = {
  "0": "o", "1": "l", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "|": "l",
};

// Long, distinctive terms that almost never appear inside an innocent word, so
// we can safely match them as substrings after stripping all spacing. This
// catches space/punctuation injection like "co ca ine" or "s u i c i d e".
const DENSE_BLOCKLIST = [
  "cocaine", "heroin", "suicide", "selfharm", "molest", "pornography", "overdose", "kidnap", "rape", "murder",
];

function normalizeForSafety(value: string): { punctStripped: string; dense: string } {
  const leet = value.toLowerCase().replace(/[0134578@$|]/g, ch => LEET_MAP[ch] ?? ch);
  // Drop in-word separators (hyphens, dots, underscores) but keep spaces as word
  // breaks, so "k-i-l-l" -> "kill" while real words stay separated.
  const punctStripped = leet.replace(/[^a-z\s]+/g, "");
  // Remove all spacing too, to catch separated letters in long unique terms.
  const dense = leet.replace(/[^a-z]+/g, "");
  return { punctStripped, dense };
}

function violatesPatterns(patterns: RegExp[], value: string): boolean {
  const { punctStripped } = normalizeForSafety(value);
  return patterns.some(pattern => pattern.test(value) || pattern.test(punctStripped));
}

export function validateStoryIdea(prompt: string, preferences?: Partial<StoryPreferences>): void {
  const values = [prompt, preferences?.childName || "", preferences?.companion || ""];
  if (values.some(value => violatesPatterns(SELF_HARM_OR_ABUSE_PATTERNS, value))) throw new Error(SUPPORTIVE_REFUSAL);
  if (values.some(value => violatesPatterns(IDENTITY_OR_ADULT_PATTERNS, value))) throw new Error(IDENTITY_OR_ADULT_REFUSAL);
  if (values.some(value => violatesPatterns(GENERAL_HARM_PATTERNS, value))) throw new Error(GENERAL_HARM_REFUSAL);
  if (values.some(value => DENSE_BLOCKLIST.some(term => normalizeForSafety(value).dense.includes(term)))) {
    throw new Error(GENERAL_HARM_REFUSAL);
  }
}

export function isStorySafetyRefusal(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return [GENERAL_HARM_REFUSAL, IDENTITY_OR_ADULT_REFUSAL, SUPPORTIVE_REFUSAL].includes(error.message);
}

export function generateLocalStoryText(title: string, summary: string, preferences: StoryPreferences, prompt?: string): string {
  const topicSource = prompt || extractTopicFromSummary(summary);
  validateStoryIdea(`${title} ${summary} ${topicSource}`, preferences);

  const child = childReference(preferences);
  const sentenceChild = sentenceChildReference(preferences);
  const companion = companionReference(preferences);
  const sentenceCompanion = sentenceStart(companion);
  const plan = createStoryPlan(topicSource, preferences, `${title}|${summary}`);
  const world = plan.world;
  const details = joinWords(plan.topicWords);
  const mainCharacter = plan.shape.mainCharacter;
  const mission = plan.shape.mission;
  const place = storyPlace(plan);
  const seed = plan.seed;
  const sight = pick(world.sights, seed, 1);
  const secondSight = pick(world.sights, seed, 2);
  const sound = pick(world.sounds, seed, 3);
  const task = topicTask(plan, 4);
  const treasure = pick(world.treasures, seed, 5);
  const focus = preferences.comfortFocus || "falling asleep peacefully";
  const extraCount = lengthParagraphs(preferences);
  const isToddler = preferences.ageRange === "2-3";
  const safeWords = isToddler
    ? `"Safe and loved," the night seemed to say.`
    : `every gentle sound seemed to say, "You are safe. You are loved. You have plenty of time."`;

  const extraParagraphs = [
    isToddler
      ? `${sentenceChild} and ${companion} went slowly. They saw ${secondSight}. ${sentenceStart(mainCharacter)} kept practicing ${mission}.`
      : `${sentenceChild} and ${companion} took their time. They noticed ${secondSight}, listened to ${sound}, and let ${details} guide what happened next.`,
    `At a quiet resting place, ${companion} invited ${child} to breathe in slowly, as if smelling a favorite flower, and breathe out gently, as if cooling a warm cup of cocoa. They did this three times, and each breath made the night feel softer.`,
    `Before leaving, they shared one kind thought about the day and tucked one hopeful thought away for tomorrow. The path seemed to glow a little brighter, pleased to be trusted with both.`,
  ].slice(0, extraCount);

  if (isToddler) {
    return `${title}

Once, when the room was quiet, ${child} thought about ${plan.topic}.

In the bedtime world, ${mainCharacter} had a gentle mission: ${mission}. ${topicDetailSentence(plan)}

${sentenceChild} and ${companion} found ${place}. They saw ${sight}. A small sleepy problem appeared: ${plan.arc.challenge}.

They remembered to ${plan.arc.repairSkill}. Then ${plan.arc.resolution}.

${sentenceStart(safeWords)} ${sentenceChild} took one slow breath and drifted into peaceful sleep.`;
  }

  return `${title}

Once, when the room was quiet and the stars were beginning to blink, ${child} thought about ${plan.topic}. The idea felt special enough to become a bedtime adventure.

On the other side of a soft moonlit doorway was ${place}. There, ${mainCharacter} had a gentle mission: ${mission}. ${topicDetailSentence(plan)}

${sentenceCompanion} waved hello beside ${sight}. "Tonight," ${companion} said, "we will ${task}, and we will keep the adventure gentle enough for sleep."

Nothing in this place was rushed or scary. ${sentenceChild} could hear ${sound}. ${sentenceStart(safeWords)}

Soon, ${plan.arc.challenge}. ${sentenceChild} and ${companion} did not hurry past it. They used the bedtime plan: ${plan.arc.repairSkill}.

${extraParagraphs.join("\n\n")}

Together they helped ${mainCharacter} finish ${mission}. As a thank-you, the bedtime world gave ${child} ${treasure}. It was not a treasure to keep in a pocket, but a reminder that ${focus} could begin with one slow breath and one kind thought.

By the end, ${plan.arc.resolution}. The special details, ${details}, felt calm and safely tucked into the story.

At last, a moonbeam showed the way home. ${sentenceChild} climbed back beneath the blankets, while ${companion} promised to stay close in every cozy dream.

The moonlight door became a tiny sparkle on the wall. ${sentenceChild} took one deep breath, let the day grow still, and drifted into a calm and happy sleep.`;
}

function localStoryOptions(prompt: string, preferences: StoryPreferences, variationKey?: string): StoryOption[] {
  validateStoryIdea(prompt, preferences);

  const plan = createStoryPlan(prompt, preferences, makeVariationKey(variationKey));
  const sentenceChild = sentenceChildReference(preferences);
  const companion = companionReference(preferences);

  return OPTION_STYLES.map((style, index) => {
    const task = topicTask(plan, index);
    const sight = pick(plan.world.sights, plan.seed, index + 2);
    const title = style.title(plan.titleIdea);
    const details = joinWords(plan.topicWords);

    return {
      id: `offline-${plan.world.id}-${plan.arc.id}-${style.id}-${plan.seed}`,
      title,
      prompt: plan.topic,
      summary: `${style.opening} about ${plan.shape.mainCharacter} and ${plan.shape.mission}, with ${details} woven into the adventure. ${sentenceChild} and ${companion} visit ${storyPlace(plan)}, notice ${sight}, ${task}, and use ${plan.arc.repairSkill} so ${plan.arc.resolution}.`,
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

export async function generateStoryOptions(prompt: string, preferences: StoryPreferences, variationKey?: string): Promise<StoryOption[]> {
  return localStoryOptions(prompt, preferences, variationKey);
}

export async function* generateFullStoryStream(title: string, summary: string, preferences: StoryPreferences, signal?: AbortSignal, prompt?: string) {
  yield* streamLocalStory(generateLocalStoryText(title, summary, preferences, prompt), signal);
}
