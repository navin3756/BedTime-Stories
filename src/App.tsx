import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Moon, Play, Pause, RotateCcw, ArrowLeft, Loader2, Volume2, Music, CloudRain, Trees, Stars, BookOpen, Trash2, Timer, Heart, CheckCircle2, Circle, Wind } from 'lucide-react';
import { generateStoryOptions, generateFullStoryStream, getLocalLlmLabel, isCloudStoryProviderConfigured, StoryOption, StoryPreferences } from './services/storyEngine';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BG_MUSIC_TRACKS = [
  { id: 'lullaby', name: 'Lullaby', frequencies: [220, 330, 440], noise: false, icon: Moon },
  { id: 'rain', name: 'Soft Rain', frequencies: [174, 261], noise: true, icon: CloudRain },
  { id: 'forest', name: 'Forest', frequencies: [196, 392], noise: true, icon: Trees },
  { id: 'space', name: 'Deep Space', frequencies: [110, 220, 330], noise: false, icon: Stars },
];

type MusicTrack = typeof BG_MUSIC_TRACKS[number];

interface AmbientPlayer {
  context: AudioContext;
  gain: GainNode;
  oscillators: OscillatorNode[];
  noise?: AudioBufferSourceNode;
  stop: () => void;
}

interface NarrationPreset {
  id: string;
  name: string;
  rate: number;
  pitch: number;
  volume: number;
  pauseMs: number;
}

const STORY_LIBRARY_KEY = 'sweetdreams.savedStories';
const STORY_PROFILE_KEY = 'sweetdreams.storyProfile';
const MAX_BROWSER_NARRATION_CHARS = 180;
const ANDROID_SPEECH_MIN_RATE = 0.72;
const ANDROID_SPEECH_MIN_PITCH = 0.84;
const SPEECH_KEEP_ALIVE_MS = 7000;

const DEFAULT_PREFERENCES: StoryPreferences = {
  childName: '',
  ageRange: '4-6',
  mood: 'gentle and magical',
  length: 'short - about 3 minutes',
  comfortFocus: 'falling asleep peacefully',
  companion: '',
};

const AGE_RANGES = ['2-3', '4-6', '7-9'];
const STORY_MOODS = ['gentle and magical', 'funny and cozy', 'brave and reassuring'];
const STORY_LENGTHS = ['tiny - about 1 minute', 'short - about 3 minutes', 'longer - about 5 minutes'];
const COMFORT_FOCUSES = ['falling asleep peacefully', 'feeling brave in the dark', 'letting go of big feelings', 'kindness and gratitude', 'curiosity with calm'];
const SLEEP_TIMER_OPTIONS = [
  { minutes: 0, label: 'Timer off' },
  { minutes: 5, label: '5 min' },
  { minutes: 10, label: '10 min' },
  { minutes: 20, label: '20 min' },
  { minutes: 30, label: '30 min' },
];
const NARRATION_PRESETS: NarrationPreset[] = [
  { id: 'calm', name: 'Sweetdreams Calm', rate: 0.56, pitch: 0.76, volume: 0.78, pauseMs: 980 },
  { id: 'bedtime', name: 'Bedtime soft', rate: 0.72, pitch: 0.86, volume: 0.88, pauseMs: 620 },
  { id: 'gentle', name: 'Gentle storyteller', rate: 0.82, pitch: 0.94, volume: 0.92, pauseMs: 420 },
  { id: 'whisper', name: 'Very slow calm', rate: 0.62, pitch: 0.78, volume: 0.82, pauseMs: 780 },
];

const ROUTINE_PRESETS = [
  {
    id: 'sleepy-reset',
    name: 'Sleepy reset',
    description: 'A short breath, a gentle story, then quiet sound.',
    prompt: 'a safe moon garden with a glowing path home',
    mood: 'gentle and magical',
    comfortFocus: 'falling asleep peacefully',
    length: 'short - about 3 minutes',
  },
  {
    id: 'big-feelings',
    name: 'Big feelings',
    description: 'For nights when the day felt loud or emotional.',
    prompt: 'a cloud library where worries become soft stars',
    mood: 'brave and reassuring',
    comfortFocus: 'letting go of big feelings',
    length: 'short - about 3 minutes',
  },
  {
    id: 'brave-dark',
    name: 'Brave in the dark',
    description: 'A cozy confidence story for lights-out nerves.',
    prompt: 'a tiny lantern helping a child explore a friendly night sky',
    mood: 'brave and reassuring',
    comfortFocus: 'feeling brave in the dark',
    length: 'tiny - about 1 minute',
  },
];

interface QuickStoryIdea extends StoryOption {
  prompt: string;
  preferences: Partial<StoryPreferences>;
  readLabel: string;
}

const QUICK_STORY_IDEAS: QuickStoryIdea[] = [
  {
    id: 'quick-moon-garden',
    title: 'The Moon Garden Path',
    summary: 'A sleepy walk through a moonlit garden where every glowing flower teaches one calm breath before bed.',
    prompt: 'a moonlit garden where glowing flowers teach calm breathing',
    readLabel: 'Calm breathing',
    preferences: {
      mood: 'gentle and magical',
      comfortFocus: 'falling asleep peacefully',
      length: 'tiny - about 1 minute',
    },
  },
  {
    id: 'quick-cloud-library',
    title: 'The Cloud Library',
    summary: 'A soft cloud library opens a bedtime book that turns worries into quiet silver stars.',
    prompt: 'a cloud library where worries become quiet silver stars',
    readLabel: 'Let worries go',
    preferences: {
      mood: 'brave and reassuring',
      comfortFocus: 'letting go of big feelings',
      length: 'short - about 3 minutes',
    },
  },
  {
    id: 'quick-blanket-boat',
    title: 'The Blanket Boat',
    summary: 'A cozy blanket boat floats across a warm night sky, carrying a little dreamer toward peaceful sleep.',
    prompt: 'a cozy blanket boat floating across a warm night sky',
    readLabel: 'Sleepy journey',
    preferences: {
      mood: 'gentle and magical',
      comfortFocus: 'falling asleep peacefully',
      length: 'short - about 3 minutes',
    },
  },
];

interface NativeTtsPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  speak(options: { text: string; rate: number; pitch: number; volume: number }): Promise<void>;
  stop(): Promise<void>;
  addListener(eventName: 'started' | 'finished' | 'error', listenerFunc: (payload?: { error?: string; code?: number }) => void): Promise<PluginListenerHandle>;
}

const NativeTts = registerPlugin<NativeTtsPlugin>('NativeTts');

function voiceScore(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  let score = voice.default ? 4 : 0;

  if (voice.lang.toLowerCase().startsWith('en')) score += 8;
  if (name.includes('zira') || name.includes('samantha') || name.includes('aria') || name.includes('jenny')) score += 12;
  if (name.includes('susan') || name.includes('sonia') || name.includes('serena') || name.includes('ava')) score += 10;
  if (name.includes('female') || name.includes('natural') || name.includes('neural')) score += 8;
  if (name.includes('calm') || name.includes('soft') || name.includes('whisper')) score += 8;
  if (name.includes('google uk english female')) score += 12;
  if (name.includes('david') || name.includes('mark') || name.includes('male')) score -= 5;

  return score;
}

function sortVoicesForBedtime(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return [...voices].sort((a, b) => voiceScore(b) - voiceScore(a) || a.name.localeCompare(b.name));
}

function isAndroidSpeechRuntime(): boolean {
  return /Android/i.test(window.navigator.userAgent);
}

function getBrowserNarrationSettings(preset: NarrationPreset): NarrationPreset {
  if (!isAndroidSpeechRuntime()) return preset;

  return {
    ...preset,
    rate: Math.max(preset.rate, ANDROID_SPEECH_MIN_RATE),
    pitch: Math.max(preset.pitch, ANDROID_SPEECH_MIN_PITCH),
    pauseMs: Math.max(preset.pauseMs, 850),
  };
}

function canUseNativeTts(): boolean {
  return Capacitor.isNativePlatform();
}

function splitNarrationText(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap(paragraph => paragraph.match(/[^.!?]+[.!?"]*/g) || [paragraph])
    .map(segment => segment.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .flatMap(segment => splitLongNarrationSegment(segment));
}

function splitLongNarrationSegment(segment: string): string[] {
  if (segment.length <= MAX_BROWSER_NARRATION_CHARS) return [segment];

  const chunks: string[] = [];
  let current = '';
  const words = segment.split(' ');

  words.forEach(word => {
    const next = current ? `${current} ${word}` : word;
    if (next.length > MAX_BROWSER_NARRATION_CHARS && current) {
      chunks.push(current);
      current = word;
      return;
    }
    current = next;
  });

  if (current) chunks.push(current);
  return chunks;
}

function formatTimer(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remainingSeconds = Math.floor(safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
}

interface SavedStory {
  id: string;
  title: string;
  text: string;
  prompt: string;
  createdAt: string;
}

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [preferences, setPreferences] = useState<StoryPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [options, setOptions] = useState<StoryOption[]>([]);
  const [selectedStory, setSelectedStory] = useState<{ title: string; text: string } | null>(null);
  const [savedStories, setSavedStories] = useState<SavedStory[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bgMusicEnabled, setBgMusicEnabled] = useState(false);
  const [selectedMusicId, setSelectedMusicId] = useState('lullaby');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState('');
  const [selectedNarrationPresetId, setSelectedNarrationPresetId] = useState('calm');
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0);
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState(0);
  const [selectedRoutineId, setSelectedRoutineId] = useState('sleepy-reset');
  const [routineSteps, setRoutineSteps] = useState<string[]>([]);
  const [breathingActive, setBreathingActive] = useState(false);
  const [breathingRemaining, setBreathingRemaining] = useState(60);
  const ambientRef = useRef<AmbientPlayer | null>(null);
  const narrationRef = useRef<SpeechSynthesisUtterance | null>(null);
  const narrationTimeoutRef = useRef<number | null>(null);
  const narrationKeepAliveRef = useRef<number | null>(null);
  const narrationSessionRef = useRef(0);
  const narrationStopRequestedRef = useRef(false);
  const sleepTimerIntervalRef = useRef<number | null>(null);
  const sleepTimerEndRef = useRef<number | null>(null);
  const breathingIntervalRef = useRef<number | null>(null);

  const currentMusic = BG_MUSIC_TRACKS.find(t => t.id === selectedMusicId) || BG_MUSIC_TRACKS[0];
  const selectedVoice = availableVoices.find(voice => voice.voiceURI === selectedVoiceURI) || null;
  const selectedNarrationPreset = NARRATION_PRESETS.find(preset => preset.id === selectedNarrationPresetId) || NARRATION_PRESETS[0];
  const selectedRoutine = ROUTINE_PRESETS.find(routine => routine.id === selectedRoutineId) || ROUTINE_PRESETS[0];
  const hasCloudProvider = isCloudStoryProviderConfigured();
  const localLlmLabel = getLocalLlmLabel();

  useEffect(() => {
    try {
      const rawStories = window.localStorage.getItem(STORY_LIBRARY_KEY);
      if (rawStories) {
        setSavedStories(JSON.parse(rawStories));
      }

      const rawProfile = window.localStorage.getItem(STORY_PROFILE_KEY);
      if (rawProfile) {
        const profile = JSON.parse(rawProfile) as Partial<StoryPreferences> & { routineId?: string };
        setPreferences(prev => ({ ...prev, ...profile }));
        if (profile.routineId) setSelectedRoutineId(profile.routineId);
      }
    } catch (error) {
      console.error("Unable to load saved bedtime settings:", error);
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORY_PROFILE_KEY, JSON.stringify({ ...preferences, routineId: selectedRoutineId }));
    } catch (error) {
      console.error("Unable to save bedtime settings:", error);
    }
  }, [preferences, selectedRoutineId]);

  useEffect(() => {
    if (!('speechSynthesis' in window)) return;

    const loadVoices = () => {
      const voices = sortVoicesForBedtime(window.speechSynthesis.getVoices());
      setAvailableVoices(voices);
      setSelectedVoiceURI(prev => prev || voices[0]?.voiceURI || '');
    };

    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  const updatePreferences = (key: keyof StoryPreferences, value: string) => {
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  const persistSavedStories = (stories: SavedStory[]) => {
    setSavedStories(stories);
    window.localStorage.setItem(STORY_LIBRARY_KEY, JSON.stringify(stories));
  };

  const clearNarrationKeepAlive = () => {
    if (narrationKeepAliveRef.current) {
      window.clearInterval(narrationKeepAliveRef.current);
      narrationKeepAliveRef.current = null;
    }
  };

  const stopNarration = (advanceSession = true) => {
    narrationStopRequestedRef.current = true;
    if (advanceSession) narrationSessionRef.current += 1;
    clearNarrationKeepAlive();
    if (narrationTimeoutRef.current) {
      window.clearTimeout(narrationTimeoutRef.current);
      narrationTimeoutRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (canUseNativeTts()) {
      void NativeTts.stop().catch(error => console.warn("Native TTS stop failed:", error));
    }
    narrationRef.current = null;
    setIsPlaying(false);
  };

  const clearSleepTimer = () => {
    if (sleepTimerIntervalRef.current) {
      window.clearInterval(sleepTimerIntervalRef.current);
      sleepTimerIntervalRef.current = null;
    }
    sleepTimerEndRef.current = null;
    setSleepTimerRemaining(0);
  };

  const startSleepTimerIfNeeded = () => {
    if (!sleepTimerMinutes) return;

    if (sleepTimerIntervalRef.current) {
      window.clearInterval(sleepTimerIntervalRef.current);
    }

    const endAt = Date.now() + sleepTimerMinutes * 60 * 1000;
    sleepTimerEndRef.current = endAt;
    setSleepTimerRemaining(Math.ceil((endAt - Date.now()) / 1000));

    sleepTimerIntervalRef.current = window.setInterval(() => {
      const remaining = sleepTimerEndRef.current ? Math.ceil((sleepTimerEndRef.current - Date.now()) / 1000) : 0;
      setSleepTimerRemaining(Math.max(0, remaining));

      if (remaining <= 0) {
        clearSleepTimer();
        stopNarration();
        stopAmbient();
        setBgMusicEnabled(false);
      }
    }, 1000);
  };

  const completeRoutineStep = (step: string) => {
    setRoutineSteps(prev => prev.includes(step) ? prev : [...prev, step]);
  };

  const applyRoutine = (routineId: string) => {
    const routine = ROUTINE_PRESETS.find(item => item.id === routineId) || ROUTINE_PRESETS[0];
    setSelectedRoutineId(routine.id);
    setPrompt(routine.prompt);
    setRoutineSteps([]);
    setPreferences(prev => ({
      ...prev,
      mood: routine.mood,
      comfortFocus: routine.comfortFocus,
      length: routine.length,
    }));
  };

  const stopBreathing = () => {
    if (breathingIntervalRef.current) {
      window.clearInterval(breathingIntervalRef.current);
      breathingIntervalRef.current = null;
    }
    setBreathingActive(false);
  };

  const startBreathing = () => {
    stopBreathing();
    setBreathingRemaining(60);
    setBreathingActive(true);
    breathingIntervalRef.current = window.setInterval(() => {
      setBreathingRemaining(prev => {
        if (prev <= 1) {
          stopBreathing();
          completeRoutineStep('breathe');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const saveStory = (title: string, text: string, storyPrompt = prompt) => {
    if (!text.trim()) return;

    const story: SavedStory = {
      id: `${Date.now()}`,
      title,
      text,
      prompt: storyPrompt,
      createdAt: new Date().toISOString(),
    };

    persistSavedStories([story, ...savedStories.filter(saved => saved.text !== text)].slice(0, 8));
  };

  const openSavedStory = (story: SavedStory) => {
    stopNarration();
    setError('');
    setOptions([]);
    setPrompt(story.prompt);
    setSelectedStory({ title: story.title, text: story.text });
    setIsPlaying(false);
  };

  const deleteSavedStory = (storyId: string) => {
    persistSavedStories(savedStories.filter(story => story.id !== storyId));
  };

  const stopAmbient = () => {
    ambientRef.current?.stop();
    ambientRef.current = null;
  };

  const startAmbient = (track: MusicTrack) => {
    stopAmbient();

    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    const context = new AudioCtor();
    const gain = context.createGain();
    gain.gain.value = 0.0001;
    gain.connect(context.destination);
    gain.gain.exponentialRampToValueAtTime(0.08, context.currentTime + 1.2);

    const oscillators = track.frequencies.map((frequency, index) => {
      const oscillator = context.createOscillator();
      const oscillatorGain = context.createGain();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      oscillatorGain.gain.value = 0.16 / track.frequencies.length;
      oscillator.connect(oscillatorGain).connect(gain);
      oscillator.start();
      return oscillator;
    });

    let noise: AudioBufferSourceNode | undefined;
    if (track.noise) {
      const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) {
        data[index] = (Math.random() * 2 - 1) * 0.18;
      }
      const filter = context.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = track.id === 'rain' ? 900 : 1400;
      noise = context.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      noise.connect(filter).connect(gain);
      noise.start();
    }

    ambientRef.current = {
      context,
      gain,
      oscillators,
      noise,
      stop: () => {
        gain.gain.setTargetAtTime(0.0001, context.currentTime, 0.2);
        window.setTimeout(() => {
          oscillators.forEach(oscillator => oscillator.stop());
          noise?.stop();
          context.close();
        }, 400);
      },
    };
  };

  const toggleBackgroundMusic = () => {
    if (bgMusicEnabled) {
      stopAmbient();
      setBgMusicEnabled(false);
      return;
    }

    startAmbient(currentMusic);
    setBgMusicEnabled(true);
    completeRoutineStep('drift');
    startSleepTimerIfNeeded();
  };

  const selectMusicTrack = (track: MusicTrack) => {
    setSelectedMusicId(track.id);
    if (bgMusicEnabled) {
      startAmbient(track);
    }
  };

  const handleVoiceChange = (voiceURI: string) => {
    stopNarration();
    setSelectedVoiceURI(voiceURI);
  };

  const handleNarrationPresetChange = (presetId: string) => {
    stopNarration();
    setSelectedNarrationPresetId(presetId);
  };

  useEffect(() => () => {
    stopAmbient();
    clearSleepTimer();
    stopBreathing();
  }, []);

  useEffect(() => {
    if (!sleepTimerMinutes) clearSleepTimer();
  }, [sleepTimerMinutes]);

  useEffect(() => {
    if (!canUseNativeTts()) return;

    let mounted = true;
    const handles: PluginListenerHandle[] = [];

    NativeTts.addListener('finished', () => {
      if (mounted) setIsPlaying(false);
    }).then(handle => handles.push(handle)).catch(error => {
      console.warn("Native TTS finished listener failed:", error);
    });

    NativeTts.addListener('error', (payload) => {
      if (!mounted) return;
      setIsPlaying(false);
      setError(payload?.error || "Read aloud stopped unexpectedly. Try another voice, or read the story on screen.");
    }).then(handle => handles.push(handle)).catch(error => {
      console.warn("Native TTS error listener failed:", error);
    });

    return () => {
      mounted = false;
      handles.forEach(handle => {
        void handle.remove();
      });
    };
  }, []);

  const showStoryChoices = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    setError('');
    setOptions([]);
    try {
      const storyOptions = await generateStoryOptions(prompt, preferences);
      setOptions(storyOptions);
      if (storyOptions.length === 0) {
        setError("No story ideas came back. Try a little more detail in the prompt.");
      }
    } catch (error) {
      console.error("Error generating options:", error);
      setError(error instanceof Error ? error.message : "We couldn't create story ideas. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateOptions = async (e: React.FormEvent) => {
    e.preventDefault();
    await showStoryChoices();
  };

  const handleTellOwnStory = async (e: React.FormEvent) => {
    e.preventDefault();
    const customPrompt = prompt.trim();
    if (!customPrompt) return;

    setLoading(true);
    setError('');
    setOptions([]);
    try {
      const storyOptions = await generateStoryOptions(customPrompt, preferences);
      const firstOption = storyOptions[0];
      if (!firstOption) {
        setError("No story idea came back. Try a little more detail in the prompt.");
        return;
      }
      await handleSelectStory(firstOption, { autoRead: true, promptText: customPrompt });
    } catch (error) {
      console.error("Error starting story:", error);
      setError(error instanceof Error ? error.message : "We couldn't start that story. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStory = async (
    option: StoryOption,
    settings: { autoRead?: boolean; promptText?: string; preferencesOverride?: StoryPreferences } = {},
  ) => {
    stopNarration();
    setLoading(true);
    setSelectedStory({ title: option.title, text: '' });

    const storyPreferences = settings.preferencesOverride || preferences;
    const storyPrompt = settings.promptText || prompt;
    
    let fullText = '';
    try {
      setError('');
      const stream = generateFullStoryStream(option.title, option.summary, storyPreferences);
      setLoading(false); // Stop main loading as we start streaming text

      for await (const chunk of stream) {
        fullText += chunk;
        setSelectedStory(prev => prev ? { ...prev, text: fullText } : null);
      }

      saveStory(option.title, fullText, storyPrompt);
      completeRoutineStep('story');

      if (settings.autoRead) {
        const handledByNative = await startNativeNarration(fullText);
        if (!handledByNative) {
          startBrowserNarration(fullText);
        }
      }
    } catch (error) {
      console.error("Error generating story:", error);
      setError(error instanceof Error ? error.message : "The story could not be completed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStory = async (idea: QuickStoryIdea) => {
    const quickPreferences = { ...preferences, ...idea.preferences };
    setPrompt(idea.prompt);
    setPreferences(quickPreferences);
    setOptions([]);
    await handleSelectStory(idea, {
      autoRead: true,
      promptText: idea.prompt,
      preferencesOverride: quickPreferences,
    });
  };

  const startNativeNarration = async (storyText: string): Promise<boolean> => {
    if (!canUseNativeTts() || !storyText.trim()) return false;

    try {
      const narrationSettings = selectedNarrationPreset;
      stopNarration();
      setError('');
      setIsPlaying(true);
      completeRoutineStep('story');
      startSleepTimerIfNeeded();
      await NativeTts.speak({
        text: storyText,
        rate: narrationSettings.rate,
        pitch: narrationSettings.pitch,
        volume: narrationSettings.volume,
      });
      return true;
    } catch (error) {
      console.warn("Native read-aloud failed:", error);
      setIsPlaying(false);
      setError(error instanceof Error ? error.message : "Read aloud stopped unexpectedly. Try another voice, or read the story on screen.");
      return true;
    }
  };

  const startBrowserNarration = (storyText: string) => {
    if (!('speechSynthesis' in window)) {
      setError("Read aloud is not supported in this browser, but the story is ready to read.");
      return;
    }

    if (!storyText.trim()) return;

    stopNarration();
    narrationStopRequestedRef.current = false;
    const narrationSessionId = narrationSessionRef.current;
    setIsPlaying(true);
    completeRoutineStep('story');
    startSleepTimerIfNeeded();

    const segments = splitNarrationText(storyText);
    let index = 0;
    const narrationSettings = getBrowserNarrationSettings(selectedNarrationPreset);
    const shouldUseAndroidFallback = isAndroidSpeechRuntime();

    clearNarrationKeepAlive();
    narrationKeepAliveRef.current = window.setInterval(() => {
      if (
        narrationStopRequestedRef.current ||
        narrationSessionId !== narrationSessionRef.current ||
        !('speechSynthesis' in window)
      ) {
        clearNarrationKeepAlive();
        return;
      }

      if (window.speechSynthesis.speaking && window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    }, SPEECH_KEEP_ALIVE_MS);

    const finishNarration = () => {
      clearNarrationKeepAlive();
      narrationRef.current = null;
      narrationTimeoutRef.current = null;
      setIsPlaying(false);
    };

    const failNarration = (message: string) => {
      clearNarrationKeepAlive();
      narrationRef.current = null;
      narrationTimeoutRef.current = null;
      setIsPlaying(false);
      setError(message);
    };

    const speakNext = (useDefaultVoice = false, retryCount = 0) => {
      if (narrationStopRequestedRef.current || narrationSessionId !== narrationSessionRef.current) {
        return;
      }

      const segment = segments[index];
      if (!segment) {
        finishNarration();
        return;
      }

      const narration = new SpeechSynthesisUtterance(segment);
      if (selectedVoice && !useDefaultVoice) {
        narration.voice = selectedVoice;
        narration.lang = selectedVoice.lang;
      } else {
        narration.lang = 'en-US';
      }
      narration.rate = narrationSettings.rate;
      narration.pitch = narrationSettings.pitch;
      narration.volume = narrationSettings.volume;
      narration.onend = () => {
        if (narrationStopRequestedRef.current || narrationSessionId !== narrationSessionRef.current) {
          return;
        }
        index += 1;
        narrationTimeoutRef.current = window.setTimeout(() => speakNext(false, 0), narrationSettings.pauseMs);
      };
      narration.onerror = (event) => {
        if (
          narrationStopRequestedRef.current ||
          narrationSessionId !== narrationSessionRef.current ||
          event.error === 'canceled' ||
          event.error === 'interrupted'
        ) {
          return;
        }

        console.warn("Browser read-aloud error:", event.error);

        if (shouldUseAndroidFallback && retryCount < 1) {
          narrationRef.current = null;
          if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
          narrationTimeoutRef.current = window.setTimeout(() => speakNext(true, retryCount + 1), 250);
          return;
        }

        failNarration("Read aloud stopped unexpectedly. Try another voice, or read the story on screen.");
      };

      narrationRef.current = narration;
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
      window.speechSynthesis.speak(narration);
    };

    speakNext();
  };

  const togglePlay = () => {
    if (!selectedStory) return;

    if (isPlaying) {
      stopNarration();
      return;
    }

    void startNativeNarration(selectedStory.text).then(handledByNative => {
      if (!handledByNative) {
        startBrowserNarration(selectedStory.text);
      }
    });
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis?.cancel();
    }
  }, []);

  const reset = () => {
    stopNarration();
    clearSleepTimer();
    stopBreathing();
    setPrompt('');
    setPreferences(DEFAULT_PREFERENCES);
    setOptions([]);
    setSelectedStory(null);
    setIsPlaying(false);
    setError('');
    setRoutineSteps([]);
  };

  return (
    <div className="min-h-screen bg-[#0a051a] text-[#e0d8f0] font-sans selection:bg-purple-500/30 overflow-x-hidden">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-900/10 blur-[100px] rounded-full" />
      </div>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-20 min-h-screen flex flex-col">
        <AnimatePresence mode="wait">
          {!options.length && !selectedStory && (
            <motion.div
              key="landing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-8"
            >
              <div className="space-y-4">
                <motion.div 
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                  className="inline-block p-4 bg-purple-500/10 rounded-full border border-purple-500/20 mb-4"
                >
                  <Moon className="w-12 h-12 text-purple-400" />
                </motion.div>
                <h1 className="text-5xl md:text-7xl font-serif font-light tracking-tight text-white">
                  Sweetdreams
                </h1>
                <p className="text-xl text-purple-200/60 font-light max-w-md mx-auto">
                  Describe a magical world, and we'll weave a story for your dreams.
                </p>
              </div>

              <section className="w-full max-w-3xl text-left space-y-4">
                <div className="flex items-center gap-2 text-purple-200/70">
                  <Sparkles className="w-4 h-4" />
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">Tap a Story to Hear</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {QUICK_STORY_IDEAS.map(idea => (
                    <button
                      key={idea.id}
                      type="button"
                      onClick={() => void handleQuickStory(idea)}
                      disabled={loading}
                      className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-all hover:border-purple-400/40 hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-purple-100/70">
                          {idea.readLabel}
                        </span>
                        <span className="rounded-full bg-purple-600 p-2 text-white shadow-lg shadow-purple-950/30 transition-transform group-hover:scale-105">
                          <Play className="h-3.5 w-3.5 fill-current" />
                        </span>
                      </div>
                      <p className="font-serif text-lg text-white">{idea.title}</p>
                      <p className="mt-1 text-sm leading-relaxed text-purple-200/50">{idea.summary}</p>
                    </button>
                  ))}
                </div>
              </section>

              <form onSubmit={handleTellOwnStory} className="w-full max-w-2xl relative group space-y-4">
                <div className="flex items-center justify-between gap-4 text-left">
                  <div>
                    <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-purple-200/70">Or Make Your Own</h2>
                    <p className="mt-1 text-sm text-purple-200/45">Type an idea, then start the story in one step.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void showStoryChoices()}
                    disabled={loading || !prompt.trim()}
                    className="shrink-0 rounded-xl border border-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-purple-100/60 transition-colors hover:bg-white/10 hover:text-purple-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Show 3 choices
                  </button>
                </div>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A brave kitten exploring the moon..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl pl-6 pr-32 py-5 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder:text-white/20"
                  />
                  <div className="absolute right-2 flex items-center gap-2">
                    <button
                      disabled={loading || !prompt.trim()}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-purple-900/20"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      <span>Tell story</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 text-left">
                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-purple-200/40">Child</span>
                    <input
                      type="text"
                      value={preferences.childName}
                      onChange={(e) => updatePreferences('childName', e.target.value)}
                      placeholder="Optional name"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 placeholder:text-white/20"
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-purple-200/40">Age</span>
                    <select
                      value={preferences.ageRange}
                      onChange={(e) => updatePreferences('ageRange', e.target.value)}
                      className="w-full bg-[#171126] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                      {AGE_RANGES.map(age => <option key={age}>{age}</option>)}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-purple-200/40">Mood</span>
                    <select
                      value={preferences.mood}
                      onChange={(e) => updatePreferences('mood', e.target.value)}
                      className="w-full bg-[#171126] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                      {STORY_MOODS.map(mood => <option key={mood}>{mood}</option>)}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-purple-200/40">Length</span>
                    <select
                      value={preferences.length}
                      onChange={(e) => updatePreferences('length', e.target.value)}
                      className="w-full bg-[#171126] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                      {STORY_LENGTHS.map(length => <option key={length}>{length}</option>)}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-purple-200/40">Focus</span>
                    <select
                      value={preferences.comfortFocus}
                      onChange={(e) => updatePreferences('comfortFocus', e.target.value)}
                      className="w-full bg-[#171126] border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                    >
                      {COMFORT_FOCUSES.map(focus => <option key={focus}>{focus}</option>)}
                    </select>
                  </label>

                  <label className="space-y-2">
                    <span className="text-xs uppercase tracking-[0.18em] text-purple-200/40">Companion</span>
                    <input
                      type="text"
                      value={preferences.companion}
                      onChange={(e) => updatePreferences('companion', e.target.value)}
                      placeholder="Stuffie, pet..."
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40 placeholder:text-white/20"
                    />
                  </label>
                </div>
              </form>

              <section className="w-full max-w-3xl text-left space-y-4">
                <div className="flex items-center gap-2 text-purple-200/70">
                  <Heart className="w-4 h-4" />
                  <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">Tonight's Wind-Down</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {ROUTINE_PRESETS.map(routine => (
                    <button
                      key={routine.id}
                      type="button"
                      onClick={() => applyRoutine(routine.id)}
                      className={cn(
                        "rounded-2xl border p-4 text-left transition-all",
                        selectedRoutineId === routine.id
                          ? "border-purple-400/50 bg-purple-500/15 shadow-lg shadow-purple-950/20"
                          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"
                      )}
                    >
                      <p className="font-serif text-lg text-white">{routine.name}</p>
                      <p className="mt-1 text-sm leading-relaxed text-purple-200/50">{routine.description}</p>
                    </button>
                  ))}
                </div>
              </section>

              {error && (
                <div className="w-full max-w-2xl rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
                  {error}
                </div>
              )}

              {!hasCloudProvider && (
                <p className="max-w-2xl text-sm text-purple-200/45">
                  Local mode is on: the app uses {localLlmLabel} through Ollama when a model is installed, then falls back to built-in story generation. Browser read-aloud works without any API key.
                </p>
              )}

              {savedStories.length > 0 && (
                <section className="w-full max-w-3xl text-left space-y-4 pt-4">
                  <div className="flex items-center gap-2 text-purple-200/70">
                    <BookOpen className="w-4 h-4" />
                    <h2 className="text-sm font-semibold uppercase tracking-[0.2em]">Recent Stories</h2>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {savedStories.slice(0, 4).map(story => (
                      <div key={story.id} className="group flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                        <button
                          type="button"
                          onClick={() => openSavedStory(story)}
                          className="flex-1 text-left"
                        >
                          <p className="font-serif text-lg text-white">{story.title}</p>
                          <p className="mt-1 line-clamp-2 text-sm text-purple-200/50">{story.text}</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteSavedStory(story.id)}
                          title="Remove story"
                          className="rounded-full p-2 text-purple-200/30 opacity-100 transition-colors hover:bg-white/10 hover:text-red-200 md:opacity-0 md:group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </motion.div>
          )}

          {options.length > 0 && !selectedStory && (
            <motion.div
              key="options"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-12"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setOptions([])}
                  className="flex items-center gap-2 text-purple-300/60 hover:text-purple-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </button>
                <h2 className="text-2xl font-serif italic text-white/80">Choose your adventure</h2>
                <div className="w-16" /> {/* Spacer */}
              </div>

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {options.map((option, index) => (
                  <motion.button
                    key={option.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    onClick={() => handleSelectStory(option)}
                    disabled={loading}
                    className="group relative text-left p-8 bg-white/5 border border-white/10 rounded-3xl hover:bg-white/10 hover:border-purple-500/30 transition-all flex flex-col h-full"
                  >
                    <div className="mb-4 p-3 bg-purple-500/10 rounded-2xl w-fit group-hover:bg-purple-500/20 transition-colors">
                      <Sparkles className="w-6 h-6 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-serif font-medium text-white mb-3">{option.title}</h3>
                    <p className="text-sm text-purple-200/60 leading-relaxed flex-1">
                      {option.summary}
                    </p>
                    <div className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-purple-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Begin Story</span>
                      <Play className="w-3 h-3 fill-current" />
                    </div>
                  </motion.button>
                ))}
              </div>
              
              {loading && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center space-y-4">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 text-purple-500 animate-spin" />
                    <Moon className="absolute inset-0 m-auto w-4 h-4 text-purple-300" />
                  </div>
                  <p className="text-purple-200 font-serif italic animate-pulse">Weaving your magical story...</p>
                </div>
              )}
            </motion.div>
          )}

          {selectedStory && (
            <motion.div
              key="player"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="flex-1 flex flex-col space-y-8"
            >
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => {
                    stopNarration();
                    setSelectedStory(null);
                  }}
                  className="flex items-center gap-2 text-purple-300/60 hover:text-purple-300 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to options</span>
                </button>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={reset}
                    className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors"
                    title="New Story"
                  >
                    <RotateCcw className="w-5 h-5 text-purple-300" />
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-5 py-4 text-sm text-red-100">
                  {error}
                </div>
              )}

              <div className="flex-1 bg-white/5 border border-white/10 rounded-[40px] p-8 md:p-12 flex flex-col relative overflow-hidden">
                {/* Glass Morphism Player Chrome */}
                <div className="absolute inset-0 pointer-events-none">
                   <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-[#0a051a] to-transparent opacity-40" />
                   <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-[#0a051a] to-transparent opacity-40" />
                </div>

                <div className="relative z-10 flex-1 flex flex-col">
                  <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-5xl font-serif text-white mb-4">{selectedStory.title}</h2>
                    <div className="flex items-center justify-center gap-2 text-purple-400/60">
                      <BookOpen className="w-4 h-4" />
                      <span className="text-xs uppercase tracking-[0.2em]">On-Device Read Aloud Ready</span>
                    </div>
                  </div>

                  <div className="min-h-[220px] max-h-[36vh] overflow-y-auto pr-4 custom-scrollbar mask-fade-edges md:max-h-[44vh]">
                    <div className="max-w-2xl mx-auto py-8">
                      <p className="text-xl md:text-2xl font-serif leading-relaxed text-purple-100/80 italic text-center whitespace-pre-wrap">
                        {selectedStory.text}
                        {loading && <span className="inline-block w-1 h-6 bg-purple-500 ml-1 animate-pulse" />}
                      </p>
                    </div>
                  </div>

                  <div className="mt-12 flex flex-col items-center space-y-8">
                    <div className="grid w-full max-w-4xl grid-cols-1 gap-4 md:grid-cols-3">
                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left">
                        <div className="mb-3 flex items-center gap-2 text-purple-200/70">
                          <Wind className="h-4 w-4" />
                          <h3 className="text-xs font-semibold uppercase tracking-[0.18em]">Bedtime Routine</h3>
                        </div>
                        <p className="mb-3 text-xs text-purple-200/45">{selectedRoutine.name}: {selectedRoutine.description}</p>

                        <div className="space-y-2">
                          {[
                            ['breathe', 'Breathe'],
                            ['story', 'Story'],
                            ['drift', 'Drift sound'],
                          ].map(([step, label]) => {
                            const done = routineSteps.includes(step);
                            return (
                              <div key={step} className="flex items-center gap-2 text-sm text-purple-100/70">
                                {done ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : <Circle className="h-4 w-4 text-purple-200/30" />}
                                <span>{label}</span>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          onClick={breathingActive ? stopBreathing : startBreathing}
                          className={cn(
                            "mt-4 w-full rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                            breathingActive
                              ? "bg-purple-500/20 text-purple-100 hover:bg-purple-500/30"
                              : "bg-white/10 text-purple-100 hover:bg-white/15"
                          )}
                        >
                          {breathingActive ? `Breathing ${formatTimer(breathingRemaining)}` : "Start 1-min breathing"}
                        </button>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left">
                        <div className="mb-3 flex items-center gap-2 text-purple-200/70">
                          <Volume2 className="h-4 w-4" />
                          <h3 className="text-xs font-semibold uppercase tracking-[0.18em]">Story Voice</h3>
                        </div>
                        <div className="space-y-3">
                          <select
                            value={selectedVoiceURI}
                            onChange={(e) => handleVoiceChange(e.target.value)}
                            disabled={!availableVoices.length || isPlaying}
                            className="w-full rounded-xl border border-white/10 bg-[#171126] px-4 py-3 text-sm text-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {availableVoices.length ? (
                              availableVoices.map((voice, index) => (
                                <option key={voice.voiceURI} value={voice.voiceURI}>
                                  {index === 0 ? 'Recommended: ' : ''}{voice.name} {voice.lang ? `(${voice.lang})` : ''}
                                </option>
                              ))
                            ) : (
                              <option>Default browser voice</option>
                            )}
                          </select>

                          <select
                            value={selectedNarrationPresetId}
                            onChange={(e) => handleNarrationPresetChange(e.target.value)}
                            disabled={isPlaying}
                            className="w-full rounded-xl border border-white/10 bg-[#171126] px-4 py-3 text-sm text-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500/40 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {NARRATION_PRESETS.map(preset => (
                              <option key={preset.id} value={preset.id}>{preset.name}</option>
                            ))}
                          </select>
                        </div>
                        <p className="mt-2 text-xs text-purple-200/40">
                          Sweetdreams Calm uses a slower, softer on-device voice profile with longer pauses for sleep.
                        </p>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left">
                        <div className="mb-3 flex items-center gap-2 text-purple-200/70">
                          <Music className="h-4 w-4" />
                          <h3 className="text-xs font-semibold uppercase tracking-[0.18em]">Background Music</h3>
                        </div>
                        <div className="flex gap-2">
                          <select
                            value={selectedMusicId}
                            onChange={(e) => {
                              const track = BG_MUSIC_TRACKS.find(item => item.id === e.target.value);
                              if (track) selectMusicTrack(track);
                            }}
                            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#171126] px-4 py-3 text-sm text-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                          >
                            {BG_MUSIC_TRACKS.map(track => (
                              <option key={track.id} value={track.id}>{track.name}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={toggleBackgroundMusic}
                            className={cn(
                              "rounded-xl px-4 py-3 text-sm font-semibold transition-colors",
                              bgMusicEnabled
                                ? "bg-purple-500/20 text-purple-100 hover:bg-purple-500/30"
                                : "bg-purple-600 text-white hover:bg-purple-500"
                            )}
                          >
                            {bgMusicEnabled ? "Stop" : "Play"}
                          </button>
                        </div>
                        <p className="mt-2 text-xs text-purple-200/40">
                          Select a track, then play it manually.
                        </p>

                        <label className="mt-4 block space-y-2">
                          <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-purple-200/50">
                            <Timer className="h-3.5 w-3.5" />
                            Sleep Timer
                          </span>
                          <select
                            value={sleepTimerMinutes}
                            onChange={(e) => setSleepTimerMinutes(Number(e.target.value))}
                            className="w-full rounded-xl border border-white/10 bg-[#171126] px-4 py-3 text-sm text-purple-50 focus:outline-none focus:ring-2 focus:ring-purple-500/40"
                          >
                            {SLEEP_TIMER_OPTIONS.map(option => (
                              <option key={option.minutes} value={option.minutes}>{option.label}</option>
                            ))}
                          </select>
                        </label>

                        {sleepTimerRemaining > 0 && (
                          <p className="mt-2 text-xs text-purple-200/50">
                            Stops all sound in {formatTimer(sleepTimerRemaining)}.
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-8">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={togglePlay}
                        disabled={!selectedStory.text.trim()}
                        aria-label={isPlaying ? "Pause story narration" : "Play story narration"}
                        title={isPlaying ? "Pause story narration" : "Play story narration"}
                        className={cn(
                          "w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all",
                          selectedStory.text.trim()
                            ? "bg-purple-600 hover:bg-purple-500 shadow-purple-900/40" 
                            : "bg-purple-900/30 cursor-not-allowed opacity-50"
                        )}
                      >
                        {isPlaying ? (
                          <Pause className="w-8 h-8 text-white fill-current" />
                        ) : (
                          <Play className="w-8 h-8 text-white fill-current ml-1" />
                        )}
                      </motion.button>
                    </div>

                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(168, 85, 247, 0.2);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(168, 85, 247, 0.4);
        }
        .mask-fade-edges {
          mask-image: linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%);
        }
      `}} />
    </div>
  );
}
