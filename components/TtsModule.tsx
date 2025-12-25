import React, { useState, useEffect, useCallback, useRef } from 'react';

interface VoiceMeta {
  voice: SpeechSynthesisVoice;
  gender: 'Male' | 'Female' | 'Neutral';
  isNeural: boolean;
}

export const TtsModule: React.FC = () => {
  const [text, setText] = useState('');
  const [voices, setVoices] = useState<VoiceMeta[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');
  const [selectedLang, setSelectedLang] = useState('en-US');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [storytellingMode, setStorytellingMode] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const chunkQueue = useRef<string[]>([]);
  const currentChunkIndex = useRef(0);
  const isCancelled = useRef(false);

  // Helper to guess gender and type from voice names
  const parseVoiceMeta = (voice: SpeechSynthesisVoice): VoiceMeta => {
    const name = voice.name.toLowerCase();
    let gender: 'Male' | 'Female' | 'Neutral' = 'Neutral';
    
    // Improved detection logic for system voices
    const maleNames = ['male', 'david', 'mark', 'george', 'joe', 'guy', 'puck', 'fenrir', 'charon', 'zephyr'];
    const femaleNames = ['female', 'zira', 'samantha', 'linda', 'jane', 'sue', 'victoria', 'kore', 'hazel'];
    
    if (femaleNames.some(n => name.includes(n))) {
      gender = 'Female';
    } else if (maleNames.some(n => name.includes(n))) {
      gender = 'Male';
    }

    const isNeural = name.includes('neural') || name.includes('natural') || name.includes('google') || name.includes('online');

    return { voice, gender, isNeural };
  };

  const loadVoices = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      setErrorMessage("Speech Synthesis is not supported in this environment.");
      return;
    }
    
    const availableVoices = window.speechSynthesis.getVoices();
    if (availableVoices.length > 0) {
      const metaVoices = availableVoices.map(parseVoiceMeta);
      setVoices(metaVoices);
      
      // Auto-select logic
      if (!selectedVoiceName) {
        const langCode = selectedLang.split('-')[0];
        const match = metaVoices.find(v => v.voice.lang.startsWith(langCode) && !v.voice.name.includes('Google')) || 
                      metaVoices.find(v => v.voice.lang.startsWith(langCode));
        if (match) setSelectedVoiceName(match.voice.name);
      }
    }
  }, [selectedLang, selectedVoiceName]);

  useEffect(() => {
    loadVoices();
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    return () => {
      window.speechSynthesis?.cancel();
    };
  }, [loadVoices]);

  const filteredVoices = voices.filter(v => 
    v.voice.lang.startsWith(selectedLang.split('-')[0])
  );

  const chunkText = (input: string) => {
    // Split by common sentence delimiters to keep chunks small and responsive
    const rawChunks = input.split(/([.!?।\n\r]+)/g);
    const combined: string[] = [];
    
    for (let i = 0; i < rawChunks.length; i += 2) {
      const content = rawChunks[i];
      const delim = rawChunks[i + 1] || "";
      const text = (content + delim).trim();
      if (text) combined.push(text);
    }
    return combined;
  };

  const speakQueue = () => {
    const synth = window.speechSynthesis;
    if (isCancelled.current || !synth || currentChunkIndex.current >= chunkQueue.current.length) {
      if (!isCancelled.current) {
        setIsSpeaking(false);
        setProgress(100);
        setTimeout(() => setProgress(0), 1000);
      }
      return;
    }

    const textChunk = chunkQueue.current[currentChunkIndex.current];
    const utterance = new SpeechSynthesisUtterance(textChunk);
    
    // Find the actual voice object
    const voiceMeta = voices.find(v => v.voice.name === selectedVoiceName);
    if (voiceMeta) {
      utterance.voice = voiceMeta.voice;
    }
    
    utterance.lang = selectedLang;

    // Apply adjustments for different modes
    if (storytellingMode && selectedLang.startsWith('bn')) {
      utterance.rate = 0.85;
      utterance.pitch = 1.05;
    } else {
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      const percent = Math.round((currentChunkIndex.current / chunkQueue.current.length) * 100);
      setProgress(percent);
    };

    utterance.onend = () => {
      if (!isCancelled.current) {
        currentChunkIndex.current++;
        speakQueue();
      }
    };

    utterance.onerror = (e: any) => {
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      console.error('TTS Error:', e);
      setErrorMessage(`Engine error: ${e.error}. Try a different voice.`);
      setIsSpeaking(false);
    };

    synth.speak(utterance);

    // Diagnostic keep-alive for Chrome and long-form speech
    if (synth.paused) synth.resume();
  };

  const handleSpeak = () => {
    const synth = window.speechSynthesis;
    if (!synth) {
      setErrorMessage("Speech synthesis not available.");
      return;
    }

    if (!text.trim()) {
      setErrorMessage("Please enter some text first.");
      return;
    }

    // RESET STATE
    setErrorMessage(null);
    isCancelled.current = true;
    synth.cancel();

    // Start New Session
    isCancelled.current = false;
    const chunks = chunkText(text);
    if (chunks.length === 0) return;

    chunkQueue.current = chunks;
    currentChunkIndex.current = 0;

    // Essential: trigger immediately within the event handler for user-activation
    speakQueue();

    // Auto-resume timer to handle browser speech stalls
    const monitor = setInterval(() => {
      if (!isCancelled.current && synth.speaking && !synth.paused) {
        // Just a nudge for the engine
        synth.pause();
        synth.resume();
      } else if (isCancelled.current || !synth.speaking) {
        clearInterval(monitor);
      }
    }, 12000);
  };

  const handleStop = () => {
    isCancelled.current = true;
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
    setProgress(0);
    currentChunkIndex.current = 0;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="flex flex-col lg:flex-row justify-between gap-6 mb-8">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Text-to-Speech</h2>
            <p className="text-sm text-slate-500 font-medium tracking-tight">Generate high-quality voiceovers instantly.</p>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Language</span>
              <div className="relative">
                <select 
                  value={selectedLang}
                  onChange={(e) => {
                    setSelectedLang(e.target.value);
                    setSelectedVoiceName(''); 
                  }}
                  className="w-full bg-slate-800 text-slate-200 text-xs font-bold px-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer"
                >
                  <option value="en-US">English (US/UK)</option>
                  <option value="bn-BD">Bengali (Local)</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Voice Talent</span>
              <div className="relative">
                <select 
                  value={selectedVoiceName}
                  onChange={(e) => setSelectedVoiceName(e.target.value)}
                  className="w-full bg-slate-800 text-slate-200 text-xs font-bold px-4 py-3 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer min-w-[200px]"
                >
                  {filteredVoices.length > 0 ? (
                    filteredVoices.map(v => (
                      <option key={v.voice.name} value={v.voice.name}>
                        {v.gender === 'Female' ? '♀' : v.gender === 'Male' ? '♂' : '👤'} {v.voice.name.replace('Microsoft ', '').replace('Google ', '')} {v.isNeural ? '★' : ''}
                      </option>
                    ))
                  ) : (
                    <option disabled>Finding system voices...</option>
                  )}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M19 9l-7 7-7-7"/></svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-start gap-3 text-red-400 text-xs font-bold animate-in slide-in-from-top-2">
            <svg className="shrink-0 mt-0.5" width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div className="leading-relaxed">{errorMessage}</div>
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={selectedLang.startsWith('bn') ? "এখানে টেক্সট লিখুন..." : "Enter your script here. The engine will convert it to audio instantly."}
              className="w-full h-64 bg-slate-950 border border-slate-800 rounded-2xl p-6 text-slate-200 font-medium placeholder:text-slate-700 focus:ring-2 focus:ring-emerald-500/30 outline-none resize-none transition-all scrollbar-thin scrollbar-thumb-slate-800"
            />
            {isSpeaking && (
              <div className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                <div className="flex gap-0.5 items-end h-3">
                  <div className="w-1 h-2 bg-emerald-500 animate-pulse"></div>
                  <div className="w-1 h-3 bg-emerald-500 animate-pulse delay-75"></div>
                  <div className="w-1 h-1 bg-emerald-500 animate-pulse delay-150"></div>
                </div>
                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Synthesis Active</span>
              </div>
            )}
          </div>

          <div className={`transition-all duration-500 overflow-hidden ${progress > 0 || isSpeaking ? 'max-h-20 opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
            <div className="p-4 bg-slate-800/20 rounded-2xl border border-slate-800/50 space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Progress</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{progress}%</span>
              </div>
              <div className="h-1 w-full bg-slate-900 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(16,185,129,0.3)]" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-5 bg-slate-800/20 rounded-2xl border border-slate-800/50">
            <div className="flex items-center gap-3">
              <label className={`relative inline-flex items-center cursor-pointer ${!selectedLang.startsWith('bn') ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}>
                <input 
                  type="checkbox" 
                  checked={storytellingMode} 
                  onChange={(e) => setStorytellingMode(e.target.checked)}
                  disabled={!selectedLang.startsWith('bn')}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-slate-700 rounded-full peer peer-checked:bg-emerald-500 transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-full"></div>
                <span className="ml-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Storytelling Mode
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={() => { setText(''); handleStop(); }}
                className="flex-1 md:flex-none px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-xl transition-all text-xs uppercase"
              >
                Clear
              </button>
              <button 
                onClick={handleStop}
                className="flex-1 md:flex-none px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl border border-red-500/20 transition-all text-xs uppercase"
              >
                Stop
              </button>
              <button 
                onClick={handleSpeak}
                disabled={!text.trim() || isSpeaking}
                className="flex-1 md:flex-none px-10 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)] transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-widest"
              >
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                Generate
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
          <h4 className="text-xs font-black text-emerald-500 uppercase tracking-widest mb-3">Professional Grade</h4>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">Categorized Male and Female options using system-native neural engines for lifelike clarity.</p>
        </div>
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
          <h4 className="text-xs font-black text-blue-500 uppercase tracking-widest mb-3">100% Private</h4>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">All speech processing stays on your device. No audio or scripts ever leave your browser session.</p>
        </div>
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
          <h4 className="text-xs font-black text-purple-500 uppercase tracking-widest mb-3">Offline Capable</h4>
          <p className="text-xs text-slate-400 font-medium leading-relaxed">Once voices are cached by your OS, the converter works without any internet connection required.</p>
        </div>
      </div>
    </div>
  );
};