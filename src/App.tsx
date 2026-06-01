import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Moon, Sun, Play, Pause, RotateCcw, ArrowLeft, Loader2, Volume2, Music, CloudRain, Trees, Stars, ChevronDown, Mic, MicOff } from 'lucide-react';
import { generateStoryOptions, generateFullStoryStream, generateStoryAudio, StoryOption } from './services/gemini';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BG_MUSIC_TRACKS = [
  { id: 'lullaby', name: 'Lullaby', url: 'https://cdn.pixabay.com/audio/2022/01/21/audio_31743c5888.mp3', icon: Moon },
  { id: 'rain', name: 'Soft Rain', url: 'https://cdn.pixabay.com/audio/2021/09/06/audio_830364f9a8.mp3', icon: CloudRain },
  { id: 'forest', name: 'Forest', url: 'https://cdn.pixabay.com/audio/2022/03/10/audio_c361667631.mp3', icon: Trees },
  { id: 'space', name: 'Deep Space', url: 'https://cdn.pixabay.com/audio/2021/11/25/audio_91b32e02f9.mp3', icon: Stars },
];

export default function App() {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [options, setOptions] = useState<StoryOption[]>([]);
  const [selectedStory, setSelectedStory] = useState<{ title: string; text: string; audioUrl: string | null } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bgMusicEnabled, setBgMusicEnabled] = useState(true);
  const [selectedMusicId, setSelectedMusicId] = useState('lullaby');
  const [showMusicMenu, setShowMusicMenu] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bgMusicRef = useRef<HTMLAudioElement | null>(null);

  const currentMusic = BG_MUSIC_TRACKS.find(t => t.id === selectedMusicId) || BG_MUSIC_TRACKS[0];

  // Background music control
  useEffect(() => {
    if (bgMusicRef.current) {
      bgMusicRef.current.volume = 0.2;
      if (bgMusicEnabled && !selectedStory) {
        bgMusicRef.current.play().catch(() => {
          console.log("Background music auto-play blocked");
        });
      } else {
        bgMusicRef.current.pause();
      }
    }
  }, [bgMusicEnabled, selectedStory, selectedMusicId]);

  const handleGenerateOptions = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const storyOptions = await generateStoryOptions(prompt);
      setOptions(storyOptions);
    } catch (error) {
      console.error("Error generating options:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStory = async (option: StoryOption) => {
    setLoading(true);
    setSelectedStory({ title: option.title, text: '', audioUrl: null });
    
    let fullText = '';
    try {
      const stream = generateFullStoryStream(option.title, option.summary);
      setLoading(false); // Stop main loading as we start streaming text

      for await (const chunk of stream) {
        fullText += chunk;
        setSelectedStory(prev => prev ? { ...prev, text: fullText } : null);
      }

      // Once text is complete, start audio generation in background
      setAudioLoading(true);
      const audio = await generateStoryAudio(fullText);
      setSelectedStory(prev => prev ? { ...prev, audioUrl: audio } : null);
      setIsPlaying(true);
    } catch (error) {
      console.error("Error generating story:", error);
    } finally {
      setAudioLoading(false);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play().catch(e => {
          console.error("Playback failed:", e);
          setIsPlaying(false);
        });
        setIsPlaying(true);
      }
    }
  };

  // Sync state if audio is paused/played via external means or autoPlay
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [selectedStory?.audioUrl]);

  const reset = () => {
    setPrompt('');
    setOptions([]);
    setSelectedStory(null);
    setIsPlaying(false);
  };

  const toggleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setPrompt(prev => prev ? `${prev} ${transcript}` : transcript);
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  return (
    <div className="min-h-screen bg-[#0a051a] text-[#e0d8f0] font-sans selection:bg-purple-500/30 overflow-x-hidden">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-900/20 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-blue-900/10 blur-[100px] rounded-full" />
      </div>

      {/* Background Music */}
      <audio
        ref={bgMusicRef}
        src={currentMusic.url}
        loop
      />

      {/* Music Control Center */}
      <div className="fixed top-6 right-6 z-50 flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <AnimatePresence>
            {showMusicMenu && (
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.95 }}
                className="bg-[#1a152e] border border-white/10 rounded-2xl p-2 flex gap-1 shadow-2xl"
              >
                {BG_MUSIC_TRACKS.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => {
                      setSelectedMusicId(track.id);
                      setBgMusicEnabled(true);
                    }}
                    className={cn(
                      "p-2 rounded-xl transition-all flex flex-col items-center gap-1 min-w-[60px]",
                      selectedMusicId === track.id 
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" 
                        : "text-white/40 hover:text-white hover:bg-white/5 border border-transparent"
                    )}
                  >
                    <track.icon className="w-4 h-4" />
                    <span className="text-[10px] font-medium uppercase tracking-wider">{track.name}</span>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex bg-[#1a152e] border border-white/10 rounded-full p-1 shadow-xl">
            <button
              onClick={() => setShowMusicMenu(!showMusicMenu)}
              className={cn(
                "p-2 rounded-full transition-all flex items-center gap-2 px-3",
                showMusicMenu ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
              )}
            >
              <currentMusic.icon className="w-4 h-4" />
              <span className="text-xs font-medium">{currentMusic.name}</span>
              <ChevronDown className={cn("w-3 h-3 transition-transform", showMusicMenu && "rotate-180")} />
            </button>
            
            <div className="w-[1px] bg-white/10 my-1 mx-1" />

            <button
              onClick={() => setBgMusicEnabled(!bgMusicEnabled)}
              className="p-2 bg-transparent rounded-full hover:bg-white/10 transition-all group"
              title={bgMusicEnabled ? "Mute Background Music" : "Unmute Background Music"}
            >
              {bgMusicEnabled ? (
                <Music className="w-4 h-4 text-purple-400" />
              ) : (
                <div className="relative">
                  <Music className="w-4 h-4 text-purple-400/30" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-[1.5px] bg-red-400/50 rotate-45" />
                  </div>
                </div>
              )}
            </button>
          </div>
        </div>
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

              <form onSubmit={handleGenerateOptions} className="w-full max-w-xl relative group">
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
                      type="button"
                      onClick={toggleVoiceInput}
                      className={cn(
                        "p-3 rounded-xl transition-all",
                        isListening 
                          ? "bg-red-500/20 text-red-400 animate-pulse" 
                          : "text-purple-400 hover:bg-white/5"
                      )}
                      title={isListening ? "Stop Listening" : "Speak your story"}
                    >
                      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <button
                      disabled={loading || !prompt.trim()}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-purple-900/50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg shadow-purple-900/20"
                    >
                      {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                      <span>Weave</span>
                    </button>
                  </div>
                </div>
              </form>
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
                  onClick={() => setSelectedStory(null)}
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
                      {audioLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-xs uppercase tracking-[0.2em]">Preparing Magical Audio...</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-4 h-4" />
                          <span className="text-xs uppercase tracking-[0.2em]">Magical Audio Ready</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar mask-fade-edges">
                    <div className="max-w-2xl mx-auto py-8">
                      <p className="text-xl md:text-2xl font-serif leading-relaxed text-purple-100/80 italic text-center whitespace-pre-wrap">
                        {selectedStory.text}
                        {loading && <span className="inline-block w-1 h-6 bg-purple-500 ml-1 animate-pulse" />}
                      </p>
                    </div>
                  </div>

                  <div className="mt-12 flex flex-col items-center space-y-8">
                    <div className="flex items-center gap-8">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={togglePlay}
                        disabled={!selectedStory.audioUrl}
                        className={cn(
                          "w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-all",
                          selectedStory.audioUrl 
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

                    {selectedStory.audioUrl && (
                      <audio
                        ref={audioRef}
                        src={selectedStory.audioUrl}
                        onEnded={() => setIsPlaying(false)}
                        autoPlay
                      />
                    )}
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
