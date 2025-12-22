import React, { useState } from 'react';
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
      case 'edit-pdf': return 'Edit PDF (Merge)';
      case 'excel-to-pdf': return 'Excel to PDF';
      case 'image-to-pdf': return 'Image to PDF';
      case 'image-to-excel': return 'Image to Excel';
    }
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
        <header className="sticky top-0 z-30 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/50 px-4 md:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-400 hover:text-emerald-500"
              aria-label="Open Menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">{getTabTitle()}</h1>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Live Processing</span>
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