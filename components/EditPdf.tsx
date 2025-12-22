import React, { useState, useCallback } from 'react';
import { Uploader } from './Uploader';
import { renderPageToImage } from '../services/pdf';

interface PageItem {
  id: string;
  blob: Uint8Array;
  thumbnail: string;
  rotation: number;
  originalFileName: string;
  pageIndex: number;
}

export const EditPdf: React.FC = () => {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [overlayText, setOverlayText] = useState('');
  const [fontSize, setFontSize] = useState(24);
  const [showOverlayOptions, setShowOverlayOptions] = useState(false);

  const loadFiles = async (fileList: FileList) => {
    setIsProcessing(true);
    const newPages: PageItem[] = [];
    
    // @ts-ignore
    const { PDFDocument } = window.PDFLib;

    for (const file of Array.from(fileList)) {
      try {
        const bytes = new Uint8Array(await file.arrayBuffer());
        const pdf = await PDFDocument.load(bytes);
        const pageCount = pdf.getPageCount();

        for (let i = 0; i < pageCount; i++) {
          // Render thumbnail for UI
          const thumb = await renderPageToImage(file, i + 1);
          newPages.push({
            id: Math.random().toString(36).substring(7),
            blob: bytes,
            thumbnail: thumb,
            rotation: 0,
            originalFileName: file.name,
            pageIndex: i
          });
        }
      } catch (e) {
        console.error("Error loading file:", file.name, e);
      }
    }

    setPages(prev => [...prev, ...newPages]);
    setIsProcessing(false);
  };

  const removePage = (id: string) => {
    setPages(prev => prev.filter(p => p.id !== id));
  };

  const rotatePage = (id: string) => {
    setPages(prev => prev.map(p => 
      p.id === id ? { ...p, rotation: (p.rotation + 90) % 360 } : p
    ));
  };

  const movePage = (index: number, direction: 'up' | 'down') => {
    const newPages = [...pages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newPages.length) return;
    
    [newPages[index], newPages[targetIndex]] = [newPages[targetIndex], newPages[index]];
    setPages(newPages);
  };

  const handleExport = async () => {
    if (pages.length === 0) return;
    setIsProcessing(true);

    try {
      // @ts-ignore
      const { PDFDocument, rgb, StandardFonts } = window.PDFLib;
      const finalPdf = await PDFDocument.create();
      const helveticaFont = await finalPdf.embedFont(StandardFonts.HelveticaBold);

      for (const p of pages) {
        const srcDoc = await PDFDocument.load(p.blob);
        const [copiedPage] = await finalPdf.copyPages(srcDoc, [p.pageIndex]);
        
        // Apply rotation
        const currentRotation = copiedPage.getRotation().angle;
        copiedPage.setRotation({ angle: (currentRotation + p.rotation) % 360 });

        // Apply Text Overlay if exists
        if (overlayText.trim()) {
          const { width, height } = copiedPage.getSize();
          copiedPage.drawText(overlayText, {
            x: 50,
            y: height - 50,
            size: fontSize,
            font: helveticaFont,
            color: rgb(0.06, 0.72, 0.5), // Emerald color
            opacity: 0.7,
          });
        }

        finalPdf.addPage(copiedPage);
      }

      const bytes = await finalPdf.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `edited_document_${Date.now()}.pdf`;
      a.click();
    } catch (e) {
      console.error(e);
      alert('Failed to generate PDF. Check console for details.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 pb-24">
      <section className="bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-black text-white">Advanced PDF Editor</h2>
            <p className="text-sm text-slate-500 font-medium">Reorder, rotate, delete pages, and add overlays.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={() => setShowOverlayOptions(!showOverlayOptions)}
              className={`px-4 py-2 rounded-xl border text-sm font-bold transition-all ${showOverlayOptions ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'}`}
            >
              Overlay Tool
            </button>
          </div>
        </div>

        {showOverlayOptions && (
          <div className="mb-8 p-6 bg-slate-800/40 rounded-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-300">
            <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Add Text Overlay (All Pages)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input 
                type="text" 
                placeholder="Enter text (e.g. DRAFT, CONFIDENTIAL)"
                value={overlayText}
                onChange={(e) => setOverlayText(e.target.value)}
                className="bg-slate-900 border-slate-700 text-slate-200 rounded-xl p-3 focus:ring-2 focus:ring-emerald-500 outline-none"
              />
              <div className="flex items-center gap-4">
                <span className="text-xs font-bold text-slate-500 whitespace-nowrap">Font Size:</span>
                <input 
                  type="range" min="12" max="120" 
                  value={fontSize}
                  onChange={(e) => setFontSize(parseInt(e.target.value))}
                  className="flex-1 accent-emerald-500"
                />
                <span className="text-sm font-mono font-bold text-emerald-500">{fontSize}px</span>
              </div>
            </div>
          </div>
        )}

        <Uploader onFilesSelected={loadFiles} disabled={isProcessing} />
      </section>

      {pages.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4 px-2">
            <h3 className="text-xl font-bold text-slate-100 flex items-center gap-3">
              Document Workspace
              <span className="text-xs bg-slate-800 text-slate-400 px-3 py-1 rounded-full">{pages.length} Pages</span>
            </h3>
            <button 
              onClick={() => setPages([])}
              className="text-xs font-bold text-red-400 hover:text-red-300 transition-colors"
            >
              Reset Workspace
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
            {pages.map((page, index) => (
              <div 
                key={page.id} 
                className="group relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-emerald-500/50 transition-all duration-300 animate-in zoom-in-95"
              >
                {/* Thumbnail */}
                <div className="aspect-[3/4] bg-slate-950 flex items-center justify-center p-4 relative">
                  <img 
                    src={page.thumbnail} 
                    alt={`Page ${index + 1}`}
                    style={{ transform: `rotate(${page.rotation}deg)` }}
                    className="max-w-full max-h-full shadow-2xl transition-transform duration-500"
                  />
                  <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur px-2 py-1 rounded-md text-[10px] font-black text-slate-400 border border-slate-800/50 uppercase tracking-tighter">
                    P.{index + 1}
                  </div>
                </div>

                {/* Controls Overlay */}
                <div className="p-3 bg-slate-900 border-t border-slate-800 grid grid-cols-4 gap-1">
                  <button 
                    onClick={() => movePage(index, 'up')}
                    disabled={index === 0}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-emerald-500 rounded-lg transition-colors disabled:opacity-20"
                    title="Move Backward"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
                  </button>
                  <button 
                    onClick={() => rotatePage(page.id)}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-emerald-500 rounded-lg transition-colors"
                    title="Rotate 90°"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                  </button>
                  <button 
                    onClick={() => removePage(page.id)}
                    className="p-2 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-lg transition-colors"
                    title="Delete Page"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <button 
                    onClick={() => movePage(index, 'down')}
                    disabled={index === pages.length - 1}
                    className="p-2 hover:bg-slate-800 text-slate-400 hover:text-emerald-500 rounded-lg transition-colors disabled:opacity-20"
                    title="Move Forward"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sticky Action Bar */}
      {pages.length > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-emerald-500/30 p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4">
            <div className="hidden sm:block">
              <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Ready to Export</p>
              <p className="text-xs text-slate-400">{pages.length} pages in queue</p>
            </div>
            <button 
              onClick={handleExport}
              disabled={isProcessing}
              className="flex-1 sm:flex-none px-10 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl hover:bg-emerald-400 transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              )}
              Export PDF
            </button>
          </div>
        </div>
      )}
    </div>
  );
};