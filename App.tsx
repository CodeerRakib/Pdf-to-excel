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
    <div className="flex h-screen bg-slate-950 overflow-hidden">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
      
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <header className="shrink-0 bg-slate-950/80 backdrop-blur-xl border-b border-slate-900 px-4 py-3 z-30">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-2 hover:bg-slate-900 rounded-xl transition-colors text-slate-400 hover:text-emerald-500 active:scale-90"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-lg font-black text-white tracking-tight hidden sm:block uppercase">Studio</span>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
               <div className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl shadow-inner flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span className="text-[10px] sm:text-xs font-mono font-black text-slate-400 whitespace-nowrap uppercase">
                  {formatTime(currentTime)}
                </span>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8">
          <div className="max-w-5xl mx-auto w-full pb-20">
            <div className="mb-8 flex items-end justify-between border-b border-slate-900 pb-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{getTabTitle()}</h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em] mt-1">Professional Data Environment</p>
              </div>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Client-Side Engine Active</span>
                <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">End-to-End Encryption</span>
              </div>
            </div>
            
            <div className="transition-opacity duration-300">
              {renderContent()}
            </div>
          </div>
        </main>

        <footer className="shrink-0 border-t border-slate-900/50 py-3 px-4 bg-slate-950 text-center">
          <p className="text-[8px] sm:text-[9px] text-slate-600 font-bold uppercase tracking-[0.3em] flex items-center justify-center gap-2">
             <svg className="w-3 h-3 text-slate-800" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L3 7v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z"/></svg>
             Secure Data Studio • Powered by Client-Side JS
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;