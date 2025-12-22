import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { PdfToExcel } from './components/PdfToExcel';
import { EditPdf } from './components/EditPdf';
import { ExcelToPdf } from './components/ExcelToPdf';
import { ImageToPdf } from './components/ImageToPdf';
import { ImageToExcel } from './components/ImageToExcel';

export type AppTab = 'pdf-to-excel' | 'edit-pdf' | 'excel-to-pdf' | 'image-to-pdf' | 'image-to-excel';

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
    }
  };

  const handleHomeClick = () => {
    setActiveTab('pdf-to-excel');
  };

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
      
      <main className="flex-1 flex flex-col transition-all duration-300">
        {/* Top Header Bar */}
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 px-4 md:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 md:gap-6">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-emerald-500"
              aria-label="Open Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            
            {/* Home / Logo Button */}
            <button 
              onClick={handleHomeClick}
              className="flex items-center gap-2 md:gap-3 group"
            >
              <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.3)] group-hover:scale-105 transition-transform">
                <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-lg md:text-2xl font-black text-white tracking-tight hidden sm:block">Converter</span>
            </button>

            <div className="h-6 w-px bg-slate-800 hidden md:block"></div>
            
            <h2 className="text-sm md:text-lg font-bold text-slate-400 truncate max-w-[120px] md:max-w-none">
              {getTabTitle()}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Real-time Clock */}
            <div className="bg-slate-900 border border-slate-800 px-3 md:px-4 py-1.5 rounded-xl shadow-inner flex items-center gap-2 md:gap-3">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
              <span className="text-xs md:text-sm font-mono font-bold text-slate-300 tracking-tighter">
                {formatTime(currentTime)}
              </span>
            </div>
            
            <div className="hidden lg:flex flex-col items-end">
              <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">System Status</span>
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Active • Encrypted</span>
            </div>
          </div>
        </header>

        {/* Dynamic Content */}
        <div className="flex-1 p-4 md:p-8">
          <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {renderContent()}
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-900/50 py-6 px-4 text-center">
          <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">
            The Converter Professional • 100% Client-Side Encryption • Unlimited Access
          </p>
        </footer>
      </main>
    </div>
  );
};

export default App;