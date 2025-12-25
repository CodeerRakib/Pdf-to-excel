import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, Modality } from "@google/genai";

declare var process: {
  env: {
    API_KEY: string;
  };
};

interface VoiceOption {
  id: string;
  name: string;
  persona: string;
  gender: 'Male' | 'Female';
  description: string;
}

const AI_VOICES: VoiceOption[] = [
  { id: 'Charon', name: 'Charon', persona: 'Deep Narrative', gender: 'Male', description: 'Deep, resonant, and authoritative. Ideal for long-form content.' },
  { id: 'Kore', name: 'Kore', persona: 'Executive Pro', gender: 'Female', description: 'Clear, articulate, and neutral. Perfect for business results.' },
  { id: 'Puck', name: 'Puck', persona: 'Creative Actor', gender: 'Male', description: 'Energetic and rhythmic. Great for expressive scripts.' },
  { id: 'Zephyr', name: 'Zephyr', persona: 'Helpful Assistant', gender: 'Female', description: 'Warm and companionable. Best for tutorials.' },
  { id: 'Fenrir', name: 'Fenrir', persona: 'Steady Anchor', gender: 'Male', description: 'Stable and bold. Good for announcements.' },
];

const STORAGE_KEYS = {
  VOICE: 'studio_tts_voice',
  PITCH: 'studio_tts_pitch',
  SPEED: 'studio_tts_speed',
  STORYTELLING: 'studio_tts_storytelling',
};

export const TtsModule: React.FC = () => {
  // States
  const [text, setText] = useState('');
  const [selectedVoiceId, setSelectedVoiceId] = useState(AI_VOICES[1].id);
  const [pitch, setPitch] = useState(1.0);
  const [speed, setSpeed] = useState(1.0);
  const [storytellingMode, setStorytellingMode] = useState(false);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isVoicesLoading, setIsVoicesLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  const selectedVoice = AI_VOICES.find(v => v.id === selectedVoiceId) || AI_VOICES[0];

  // Load persistence
  useEffect(() => {
    const savedVoice = localStorage.getItem(STORAGE_KEYS.VOICE);
    const savedPitch = localStorage.getItem(STORAGE_KEYS.PITCH);
    const savedSpeed = localStorage.getItem(STORAGE_KEYS.SPEED);
    const savedStory = localStorage.getItem(STORAGE_KEYS.STORYTELLING);

    if (savedVoice) setSelectedVoiceId(savedVoice);
    if (savedPitch) setPitch(parseFloat(savedPitch));
    if (savedSpeed) setSpeed(parseFloat(savedSpeed));
    if (savedStory) setStorytellingMode(savedStory === 'true');

    // Simulate async loading of talent pool for UI polish
    const timer = setTimeout(() => setIsVoicesLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Save persistence
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.VOICE, selectedVoiceId);
    localStorage.setItem(STORAGE_KEYS.PITCH, pitch.toString());
    localStorage.setItem(STORAGE_KEYS.SPEED, speed.toString());
    localStorage.setItem(STORAGE_KEYS.STORYTELLING, storytellingMode.toString());
  }, [selectedVoiceId, pitch, speed, storytellingMode]);

  const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const createWavFile = (pcmData: Int16Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + pcmData.length * 2);
    const view = new DataView(buffer);
    view.setUint32(0, 0x52494646, false); 
    view.setUint32(4, 36 + pcmData.length * 2, true);
    view.setUint32(8, 0x57415645, false);
    view.setUint32(12, 0x666d7420, false);
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    view.setUint32(36, 0x64617461, false);
    view.setUint32(40, pcmData.length * 2, true);
    for (let i = 0; i < pcmData.length; i++) {
      view.setInt16(44 + i * 2, pcmData[i], true);
    }
    return new Blob([buffer], { type: 'audio/wav' });
  };

  const handleGenerate = async () => {
    if (!text.trim()) {
      setErrorMessage("Please enter a script.");
      return;
    }

    setIsProcessing(true);
    setProgress(5);
    setErrorMessage(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);

    // Dynamic prompt construction for pitch and speed control
    let instructionText = text;
    if (storytellingMode) {
      instructionText = `Speak with a warm, storytelling tone at a rate of 0.8 and pitch of 1.1: ${text}`;
    } else if (pitch !== 1.0 || speed !== 1.0) {
      instructionText = `Speak with a pitch of ${pitch} and a rate of ${speed}: ${text}`;
    }

    // Progress simulation
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        if (prev >= 92) return prev;
        const inc = (100 - prev) / 15;
        return Math.min(92, prev + inc);
      });
    }, 200);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: instructionText }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: selectedVoice.id },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!base64Audio) throw new Error("Audio synthesis failed.");

      const audioBytes = decodeBase64(base64Audio);
      const pcmData = new Int16Array(audioBytes.buffer);
      const sampleRate = 24000;

      const wavBlob = createWavFile(pcmData, sampleRate);
      const url = URL.createObjectURL(wavBlob);
      setAudioUrl(url);

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate });
      }
      
      const ctx = audioContextRef.current;
      const buffer = ctx.createBuffer(1, pcmData.length, sampleRate);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < pcmData.length; i++) {
        channelData[i] = pcmData[i] / 32768.0;
      }

      if (sourceRef.current) sourceRef.current.stop();
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
      sourceRef.current = source;
      
      setProgress(100);
      setTimeout(() => {
        if (!isProcessing) setProgress(0);
      }, 1000);

    } catch (err: any) {
      setErrorMessage(err.message || "Studio connection lost.");
      setProgress(0);
    } finally {
      clearInterval(progressTimer);
      setIsProcessing(false);
    }
  };

  const handleStop = () => {
    if (sourceRef.current) {
      sourceRef.current.stop();
      sourceRef.current = null;
    }
  };

  return (
    <div className="space-y-6 opacity-0 translate-y-2 animate-[fadeIn_0.5s_ease-out_forwards]">
      <div className="bg-slate-900/60 backdrop-blur-xl p-4 sm:p-8 rounded-[2rem] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none"></div>
        
        <div className="flex flex-col lg:flex-row justify-between gap-6 mb-8 relative z-10">
          <div className="flex-1">
            <h2 className="text-xl sm:text-2xl font-black text-white mb-2 flex items-center gap-3">
              Voice Talent Selector
              <span className="text-[9px] bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full font-black uppercase tracking-widest">Studio</span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">Configure your professional voice profile.</p>
          </div>
          
          <div className="w-full lg:w-80 flex flex-col gap-2">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex justify-between">
              AI Voice Actor
              {isVoicesLoading && <span className="text-emerald-500 animate-pulse lowercase tracking-normal">Initializing talent pool...</span>}
            </label>
            <div className="relative">
              <select 
                value={selectedVoiceId}
                disabled={isVoicesLoading}
                onChange={(e) => setSelectedVoiceId(e.target.value)}
                className="w-full bg-slate-950 text-slate-200 text-sm font-bold px-4 py-3.5 rounded-xl border border-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer hover:bg-slate-900 transition-colors disabled:opacity-50"
              >
                {AI_VOICES.map((v) => (
                  <option key={v.id} value={v.id} className="bg-slate-950 text-slate-200">
                    {v.gender === 'Female' ? '♀' : '♂'} {v.persona} ({v.name})
                  </option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M19 9l-7 7-7-7"/></svg>
              </div>
            </div>
            <p className="text-[10px] text-slate-600 font-medium italic px-1 mt-1">{selectedVoice.description}</p>
          </div>
        </div>

        {/* Controls Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 relative z-10 p-6 bg-slate-950/40 rounded-2xl border border-slate-800/60 shadow-inner">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pitch</label>
              <span className="text-xs font-mono font-black text-emerald-500">{pitch.toFixed(1)}x</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="1.5" 
              step="0.1" 
              value={pitch}
              disabled={storytellingMode}
              onChange={(e) => setPitch(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
            />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Speed</label>
              <span className="text-xs font-mono font-black text-blue-500">{speed.toFixed(1)}x</span>
            </div>
            <input 
              type="range" 
              min="0.5" 
              max="2.0" 
              step="0.1" 
              value={speed}
              disabled={storytellingMode}
              onChange={(e) => setSpeed(parseFloat(e.target.value))}
              className="w-full accent-blue-500 bg-slate-800 h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-30"
            />
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-4 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={storytellingMode}
                onChange={(e) => setStorytellingMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 rounded-full peer-checked:bg-emerald-500 transition-colors relative after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-4 after:w-4 peer-checked:after:translate-x-5 after:transition-all shadow-inner"></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-white">Bangla Storytelling</span>
                <span className="text-[8px] text-slate-600 font-bold uppercase">Rate: 0.8 • Pitch: 1.1</span>
              </div>
            </label>
          </div>
        </div>

        {errorMessage && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold flex items-center gap-3">
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><path d="M12 8v4m0 4h.01"/></svg>
            {errorMessage}
          </div>
        )}

        <div className="space-y-4">
          <div className="relative group overflow-hidden rounded-[1.5rem] border border-slate-800 focus-within:border-emerald-500/50 transition-colors shadow-inner">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter your script here for studio-grade synthesis..."
              className="w-full h-64 bg-slate-950/40 p-6 text-slate-200 font-medium placeholder:text-slate-800 outline-none resize-none leading-relaxed text-base sm:text-lg transition-all"
            />
            {isProcessing && (
              <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-[1px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3 w-full max-w-xs px-8">
                  <div className="flex gap-1 h-6 items-end justify-center mb-2">
                    <div className="w-1.5 h-4 bg-emerald-500 animate-pulse"></div>
                    <div className="w-1.5 h-6 bg-emerald-500 animate-pulse delay-75"></div>
                    <div className="w-1.5 h-3 bg-emerald-500 animate-pulse delay-150"></div>
                  </div>
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-emerald-500 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">
                    {progress === 100 ? 'Master Ready' : `Synthesizing ${Math.floor(progress)}%`}
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-slate-950/40 rounded-2xl border border-slate-800/60 shadow-inner">
            <div className="flex-1 flex items-center gap-3 overflow-hidden">
               <div className={`w-2 h-2 rounded-full shrink-0 ${isProcessing ? 'bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-700'}`}></div>
               <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] truncate">
                 {isProcessing ? 'Mastering Audio' : 'Engine Standby'}
               </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {audioUrl && (
                <a 
                  href={audioUrl} 
                  download={`Master_${selectedVoice.id}_${Date.now()}.wav`}
                  className="flex-1 px-5 py-3 bg-blue-500/10 text-blue-400 font-black rounded-xl border border-blue-500/20 hover:bg-blue-500/20 transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Export
                </a>
              )}
              
              <button 
                onClick={handleStop}
                className="flex-1 sm:flex-none px-5 py-3 bg-slate-900 text-slate-500 font-black rounded-xl hover:bg-slate-800 transition-all text-[10px] uppercase tracking-widest border border-slate-800"
              >
                Stop
              </button>

              <button 
                onClick={handleGenerate}
                disabled={!text.trim() || isProcessing}
                className="flex-1 sm:flex-none px-8 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl hover:bg-emerald-400 shadow-lg transition-all disabled:opacity-30 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest"
              >
                {isProcessing ? (
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
                ) : (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                )}
                {isProcessing ? 'Encoding' : 'Convert & Preview'}
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: currentColor;
          cursor: pointer;
          border: 2px solid #0f172a;
        }
      `}</style>
    </div>
  );
};