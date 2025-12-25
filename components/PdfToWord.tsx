import React, { useState, useCallback } from 'react';
import { Uploader } from './Uploader';
import { extractPdfTextItems, renderPageToImage, getPdfPageCount, PDFTextItem } from '../services/pdf';
import { performOcrOnImage, detectLanguageFromImage } from '../services/ocr';

const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'eng', name: 'English' },
  { code: 'ben', name: 'Bangla' },
];

export const PdfToWord: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [ocrLanguage, setOcrLanguage] = useState('auto');
  const [completedFile, setCompletedFile] = useState<{ name: string; url: string } | null>(null);

  const processFile = async (rawFile: File) => {
    setIsProcessing(true);
    setProgress(5);
    setCompletedFile(null);

    try {
      // @ts-ignore
      const docxLib = (window as any).docx;
      if (!docxLib) {
        throw new Error("The DOCX conversion engine could not be loaded. Please ensure you have a stable internet connection and refresh the page.");
      }

      const { Document, Packer, Paragraph, TextRun } = docxLib;

      // 1. Extract raw text items
      let pagesItems = await extractPdfTextItems(rawFile);
      const totalText = pagesItems.flat().reduce((acc, curr) => acc + curr.text.length, 0);
      setProgress(20);

      // 2. Fallback to OCR if sparse text detected
      if (totalText < 50) {
        const count = await getPdfPageCount(rawFile);
        let lang = ocrLanguage;
        if (lang === 'auto') lang = await detectLanguageFromImage(await renderPageToImage(rawFile, 1));
        
        const ocrPages: PDFTextItem[][] = [];
        for (let i = 1; i <= count; i++) {
          setProgress(Math.floor(20 + (i / count) * 60));
          ocrPages.push(await performOcrOnImage(await renderPageToImage(rawFile, i), lang));
        }
        pagesItems = ocrPages;
      }

      // 3. Build Word Document using docx library
      const sections = pagesItems.map(page => {
        // Simple heuristic: group text items by Y coordinate to form paragraphs
        const rows = new Map<number, PDFTextItem[]>();
        page.forEach(item => {
          const y = Math.round(item.y / 10) * 10;
          if (!rows.has(y)) rows.set(y, []);
          rows.get(y)!.push(item);
        });

        // Sort rows
        const sortedY = Array.from(rows.keys()).sort((a, b) => b - a);
        
        const paragraphs = sortedY.map(y => {
          const items = rows.get(y)!.sort((a, b) => a.x - b.x);
          const lineText = items.map(i => i.text).join(' ').trim();
          if (!lineText) return null;

          return new Paragraph({
            children: [new TextRun(lineText)],
            spacing: { after: 200 },
          });
        }).filter(p => p !== null);

        return {
          properties: {},
          children: paragraphs,
        };
      });

      const doc = new Document({
        sections: sections,
      });

      // 4. Export and Provide Download
      setProgress(90);
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      setCompletedFile({ name: `${rawFile.name.replace(/\.pdf$/i, '')}.docx`, url });
      setProgress(100);
    } catch (err: any) {
      console.error("Conversion error:", err);
      alert(err.message || "Failed to convert PDF to Word. Ensure the file is not corrupted.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-slate-900/60 backdrop-blur-xl p-6 md:p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-blue-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="flex flex-col lg:flex-row justify-between gap-8 mb-10 relative z-10">
          <div className="flex-1">
            <h2 className="text-2xl md:text-3xl font-black text-white mb-2 flex items-center gap-3">
              PDF to Word Pro
              <span className="text-[10px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">DOCX Engine</span>
            </h2>
            <p className="text-sm text-slate-500 font-medium">Extract editable text and structure into Microsoft Word format.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">OCR Lang:</span>
            <select 
              value={ocrLanguage}
              onChange={(e) => setOcrLanguage(e.target.value)}
              className="bg-slate-950 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl border border-slate-800 outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <Uploader onFilesSelected={(list) => processFile(list[0])} disabled={isProcessing} />

        {isProcessing && (
          <div className="mt-8 p-6 bg-slate-950/40 rounded-3xl border border-slate-800/60 flex flex-col items-center gap-4">
             <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
             </div>
             <div className="flex justify-between w-full text-[10px] font-black text-slate-500 uppercase tracking-widest">
               <span>Extracting Semantics</span>
               <span className="text-blue-500">{progress}%</span>
             </div>
          </div>
        )}

        {completedFile && (
          <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-3xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-in zoom-in-95 duration-500">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                 <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
               </div>
               <div>
                 <p className="text-sm font-black text-white">{completedFile.name}</p>
                 <p className="text-[10px] text-blue-400 font-bold uppercase tracking-widest">Conversion Successful</p>
               </div>
            </div>
            <a 
              href={completedFile.url} 
              download={completedFile.name}
              className="px-8 py-3 bg-blue-500 text-white font-black rounded-xl hover:bg-blue-400 shadow-xl transition-all flex items-center gap-2 text-xs uppercase tracking-widest active:scale-95"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              Download Word
            </a>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-8 bg-slate-900/40 border border-slate-800/50 rounded-[2rem]">
          <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-3">Rich Formatting</h4>
          <p className="text-xs text-slate-500 font-bold leading-relaxed">Maintains paragraph spacing and basic alignment for easier editing in Microsoft Word.</p>
        </div>
        <div className="p-8 bg-slate-900/40 border border-slate-800/50 rounded-[2rem]">
          <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-3">OCR Fallback</h4>
          <p className="text-xs text-slate-500 font-bold leading-relaxed">Scanned PDFs are automatically processed using high-accuracy OCR to generate text.</p>
        </div>
        <div className="p-8 bg-slate-900/40 border border-slate-800/50 rounded-[2rem]">
          <h4 className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-3">Infinite Privacy</h4>
          <p className="text-xs text-slate-500 font-bold leading-relaxed">Processing happens 100% on your device. Your documents never touch our servers.</p>
        </div>
      </div>
    </div>
  );
};