import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { PdfToExcel } from './components/PdfToExcel';
import { EditPdf } from './components/EditPdf';
import { ExcelToPdf } from './components/ExcelToPdf';
import { ImageToPdf } from './components/ImageToPdf';
import { ImageToExcel } from './components/ImageToExcel';
import { TtsModule } from './components/TtsModule';

export type AppTab = 'pdf-to-excel' | 'edit-pdf' | 'excel-to-pdf' | 'image-to-pdf' | 'image-to-excel' | 'tts';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('pdf-to-excel');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Clock effect
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'pdf-to-excel': return <PdfToExcel />;
      case 'edit-pdf': return <EditPdf />;
      case 'excel-to-pdf': return <ExcelToPdf />;
      case 'image-to-pdf': return <ImageToPdf />;
      case 'image-to-excel': return <ImageToExcel />;
      case 'tts': return <TtsModule />;
      default: return <PdfToExcel />;
    }
  };

  const getTabTitle = () => {
    switch (activeTab) {
      case 'pdf-to-excel': return 'PDF to Excel';
      case 'edit-pdf': return 'PDF Editor';
      case 'excel-to-pdf': return 'Excel to PDF';
      case 'image-to-pdf': return 'Image to PDF';
      case 'image-to-excel': return 'Image to Excel';
      case 'tts': return 'TTS Generator';
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-950 overflow-x-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
      
      <div className="flex-1 flex flex-col w-full min-w-0">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/50 px-4 py-3">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 shrink-0">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-emerald-500"
                aria-label="Open Menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <button 
                onClick={() => setActiveTab('pdf-to-excel')}
                className="flex items-center gap-2 group"
              >
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-lg font-black text-white tracking-tight hidden sm:block">Converter</span>
              </button>
            </div>

            <div className="flex-1 px-4 hidden md:block">
              <div className="h-6 w-px bg-slate-800 mx-auto opacity-50"></div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
               {/* Clock with improved mobile layout */}
               <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl shadow-inner flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[11px] md:text-sm font-mono font-bold text-slate-300 whitespace-nowrap">
                  {formatTime(currentTime)}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto w-full">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-xl md:text-2xl font-black text-white">{getTabTitle()}</h1>
              <div className="flex flex-col items-end">
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">System Active</span>
                <span className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">Encrypted Session</span>
              </div>
            </div>
            
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              {renderContent()}
            </div>
          </div>
        </main>

        <footer className="border-t border-slate-900/50 py-4 px-4 text-center">
          <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.2em]">
            Professional Data Conversion Suite • Secure Client-Side Engine
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;