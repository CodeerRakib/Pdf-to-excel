import React, { useState, useEffect, useCallback, useRef } from 'react';

export const TtsModule: React.FC = () => {
  const [text, setText] = useState('');
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceName, setSelectedVoiceName] = useState('');
  const [selectedLang, setSelectedLang] = useState('en-US');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [progress, setProgress] = useState(0);
  const [storytellingMode, setStorytellingMode] = useState(false);
  const synth = useRef<SpeechSynthesis | null>(null);

  // Load voices - SpeechSynthesis is notoriously finicky across browsers
  const loadVoices = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    
    // Some browsers need a short delay or multiple calls to getVoices()
    const availableVoices = window.speechSynthesis.getVoices();
    
    if (availableVoices.length > 0) {
      setVoices(availableVoices);
      
      // Auto-select a voice if none is selected or if language changed
      if (!selectedVoiceName) {
        const langCode = selectedLang.split('-')[0];
        const defaultVoice = availableVoices.find(v => v.lang.startsWith(langCode)) || availableVoices[0];
        if (defaultVoice) setSelectedVoiceName(defaultVoice.name);
      }
    }
  }, [selectedLang, selectedVoiceName]);

  useEffect(() => {
    synth.current = window.speechSynthesis;
    
    // Initial load
    loadVoices();

    // Chrome and others might load voices asynchronously
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (synth.current) synth.current.cancel();
    };
  }, [loadVoices]);

  // Filter voices based on selected language
  const filteredVoices = voices.filter(voice => 
    voice.lang.startsWith(selectedLang.split('-')[0])
  );

  const handleSpeak = () => {
    if (!synth.current || !text.trim()) return;
    
    // Reset state
    synth.current.cancel();
    setProgress(0);

    const utterance = new SpeechSynthesisUtterance(text);
    const voice = voices.find(v => v.name === selectedVoiceName);
    
    if (voice) {
      utterance.voice = voice;
    } else if (filteredVoices.length > 0) {
      utterance.voice = filteredVoices[0];
    }
    
    utterance.lang = selectedLang;

    // Apply Storytelling mode settings (Optimized for Bangla)
    if (storytellingMode && selectedLang.startsWith('bn')) {
      utterance.rate = 0.8;
      utterance.pitch = 1.1;
      utterance.volume = 1.0; 
    } else {
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
    }

    utterance.onstart = () => {
      setIsSpeaking(true);
      setProgress(0);
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setProgress(100);
      // Small timeout to clear progress bar after completion
      setTimeout(() => setProgress(0), 1500);
    };

    utterance.onerror = (event) => {
      console.error('SpeechSynthesis Error:', event);
      setIsSpeaking(false);
      setProgress(0);
    };

    // Track progress by character index
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const charIndex = event.charIndex;
        const totalChars = text.length;
        const percent = Math.round((charIndex / totalChars) * 100);
        setProgress(percent);
      }
    };

    synth.current.speak(utterance);
    
    // Resuming if it got stuck in a paused state (common browser bug)
    if (synth.current.paused) {
      synth.current.resume();
    }
  };

  const handleStop = () => {
    if (synth.current) {
      synth.current.cancel();
      setIsSpeaking(false);
      setProgress(0);
    }
  };

  const handleClear = () => {
    setText('');
    handleStop();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Text-to-Speech Studio</h2>
            <p className="text-sm text-slate-500 font-medium">Native browser synthesis. 100% Free & Unlimited.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Language</span>
              <select 
                value={selectedLang}
                onChange={(e) => {
                  setSelectedLang(e.target.value);
                  setSelectedVoiceName(''); 
                }}
                className="bg-slate-800 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="en-US">English (US)</option>
                <option value="bn-BD">Bengali (Bangla)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Voice Talent</span>
              <select 
                value={selectedVoiceName}
                onChange={(e) => setSelectedVoiceName(e.target.value)}
                className="bg-slate-800 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/50 max-w-[150px] md:max-w-[200px]"
              >
                {filteredVoices.length > 0 ? (
                  filteredVoices.map(v => <option key={v.name} value={v.name}>{v.name}</option>)
                ) : (
                  <option disabled>No voices found</option>
                )}
              </select>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="relative group">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={selectedLang.startsWith('bn') ? "এখানে আপনার বাংলা টেক্সট লিখুন..." : "Enter your text here..."}
              className="w-full h-64 bg-slate-950 border border-slate-800 rounded-2xl p-6 text-slate-200 font-medium placeholder:text-slate-700 focus:ring-2 focus:ring-emerald-500/30 outline-none resize-none transition-all"
            />
            {isSpeaking && (
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 rounded-full border border-emerald-500/30">
                <div className="flex gap-0.5 items-end h-3">
                  <div className="w-1 h-2 bg-emerald-500 animate-pulse"></div>
                  <div className="w-1 h-3 bg-emerald-500 animate-pulse delay-75"></div>
                  <div className="w-1 h-1 bg-emerald-500 animate-pulse delay-150"></div>
                </div>
                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Active</span>
              </div>
            )}
          </div>

          {/* Progress Bar Section */}
          <div className={`transition-all duration-500 overflow-hidden ${progress > 0 || isSpeaking ? 'max-h-20 opacity-100 mb-4' : 'max-h-0 opacity-0'}`}>
            <div className="p-4 bg-slate-800/20 rounded-2xl border border-slate-800/50 space-y-2">
              <div className="flex justify-between items-center px-1">
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Speech Progress</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{progress}%</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div 
                  className="h-full bg-emerald-500 transition-all duration-300 ease-out shadow-[0_0_10px_rgba(16,185,129,0.5)]" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-4 bg-slate-800/20 rounded-2xl border border-slate-800/50">
            <div className="flex items-center gap-3">
              <label 
                className={`relative inline-flex items-center cursor-pointer ${!selectedLang.startsWith('bn') ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
              >
                <input 
                  type="checkbox" 
                  checked={storytellingMode} 
                  onChange={(e) => setStorytellingMode(e.target.checked)}
                  disabled={!selectedLang.startsWith('bn')}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                <span className="ml-3 text-sm font-bold text-slate-300">
                  {selectedLang.startsWith('bn') ? "Storytelling Mode (গল্প মোড)" : "Storytelling (Bangla Only)"}
                </span>
              </label>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <button 
                onClick={handleClear}
                className="flex-1 md:flex-none px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl transition-all"
              >
                Clear
              </button>
              <button 
                onClick={handleStop}
                className="flex-1 md:flex-none px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl border border-red-500/20 transition-all"
              >
                Stop
              </button>
              <button 
                onClick={handleSpeak}
                disabled={!text.trim() || (isSpeaking && progress < 100)}
                className="flex-1 md:flex-none px-10 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl hover:bg-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5.14v14l11-7-11-7z"/></svg>
                {isSpeaking ? 'Restart Speech' : 'Speak Text'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
          <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h4 className="font-bold text-white mb-2">Browser Native</h4>
          <p className="text-xs text-slate-500 leading-relaxed">Uses your system's built-in voices. Availability of premium voices (like Google or Apple) depends on your browser.</p>
        </div>
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
          <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
          </div>
          <h4 className="font-bold text-white mb-2">Privacy First</h4>
          <p className="text-xs text-slate-500 leading-relaxed">No data leaves your device. All text processing and voice generation is done locally in your browser.</p>
        </div>
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-3xl">
          <div className="w-10 h-10 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-500 mb-4">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
          </div>
          <h4 className="font-bold text-white mb-2">Golpo Mode</h4>
          <p className="text-xs text-slate-500 leading-relaxed">Storytelling presets for Bangla make automated reading sound more natural and engaging for narration.</p>
        </div>
      </div>
    </div>
  );
};