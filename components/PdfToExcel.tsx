import React, { useState, useCallback } from 'react';
import { Uploader } from './Uploader';
import { DataTable } from './DataTable';
import { ProcessingFile, ExportFormat } from '../types';
import { extractPdfTextItems, renderPageToImage, getPdfPageCount, PDFTextItem } from '../services/pdf';
import { parseTableFromTextItems } from '../services/tableParser';
import { performOcrOnImage, detectLanguageFromImage } from '../services/ocr';

const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'eng', name: 'English' },
  { code: 'ben', name: 'Bangla (Bengali)' },
  { code: 'hin', name: 'Hindi' },
  { code: 'spa', name: 'Spanish' },
];

export const PdfToExcel: React.FC = () => {
  const [files, setFiles] = useState<ProcessingFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrLanguage, setOcrLanguage] = useState('auto');

  const updateFile = useCallback((id: string, updates: Partial<ProcessingFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const handleDownload = (file: ProcessingFile, format: ExportFormat) => {
    if (!file.result) return;
    // @ts-ignore
    const XLSX = window.XLSX;
    const worksheet = XLSX.utils.json_to_sheet(file.result.rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted Data");
    
    const extension = format === ExportFormat.CSV ? 'csv' : 'xlsx';
    XLSX.writeFile(workbook, `${file.name.replace(/\.[^/.]+$/, "")}_converted.${extension}`);
  };

  const processFile = async (rawFile: File, id?: string) => {
    const fileId = id || Math.random().toString(36).substring(7);
    if (!id) {
      setFiles(prev => [{ id: fileId, name: rawFile.name, size: rawFile.size, status: 'processing', progress: 0, rawFile }, ...prev]);
    }
    setIsProcessing(true);

    try {
      updateFile(fileId, { progress: 10 });
      let pagesItems = await extractPdfTextItems(rawFile);
      const totalText = pagesItems.flat().reduce((acc, curr) => acc + curr.text.length, 0);

      if (totalText < 50) {
        updateFile(fileId, { progress: 20, error: 'OCR Required...' });
        const count = await getPdfPageCount(rawFile);
        let lang = ocrLanguage;
        if (lang === 'auto') lang = await detectLanguageFromImage(await renderPageToImage(rawFile, 1));
        
        const ocrPages: PDFTextItem[][] = [];
        for (let i = 1; i <= count; i++) {
          updateFile(fileId, { progress: Math.floor(20 + (i/count)*70) });
          ocrPages.push(await performOcrOnImage(await renderPageToImage(rawFile, i), lang));
        }
        pagesItems = ocrPages;
      }

      const result = parseTableFromTextItems(pagesItems);
      updateFile(fileId, { status: 'completed', progress: 100, result });
    } catch (e: any) {
      updateFile(fileId, { status: 'error', error: e.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="bg-slate-900/60 backdrop-blur-xl p-6 md:p-10 rounded-[2.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none"></div>
        
        <div className="flex flex-col md:flex-row justify-between gap-6 mb-8 relative z-10">
          <div>
            <h2 className="text-2xl font-black text-white mb-1">PDF to Spreadsheet</h2>
            <p className="text-sm text-slate-500 font-medium">Coordinate alignment ensures 100% table accuracy.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Language:</span>
            <select 
              value={ocrLanguage}
              onChange={(e) => setOcrLanguage(e.target.value)}
              className="bg-slate-950 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl border border-slate-800 outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
        </div>

        <Uploader onFilesSelected={(list: FileList) => Array.from(list).forEach((f: File) => processFile(f))} disabled={isProcessing} />
      </div>

      <div className="space-y-6">
        {files.map(f => (
          <div key={f.id} className="space-y-4 animate-in slide-in-from-bottom-4 duration-500">
            <div className={`p-6 rounded-[2rem] bg-slate-900 border border-slate-800 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 ${f.status === 'processing' ? 'ring-1 ring-emerald-500/30' : ''}`}>
               <div className="flex items-center gap-5 flex-1 min-w-0">
                 <div className={`p-4 rounded-2xl shrink-0 ${f.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 </div>
                 <div className="flex-1 min-w-0">
                   <p className="font-bold text-lg text-white truncate">{f.name}</p>
                   <p className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                     {(f.size/1024).toFixed(1)} KB • {f.status} {f.error ? `(${f.error})` : ''}
                   </p>
                   {f.status === 'processing' && (
                     <div className="mt-3 w-full max-w-md">
                       <div className="flex justify-between items-center mb-1">
                         <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Converting...</span>
                         <span className="text-[10px] font-black text-emerald-500">{f.progress}%</span>
                       </div>
                       <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                         <div 
                           className="h-full bg-emerald-500 transition-all duration-300" 
                           style={{ width: `${f.progress}%` }} 
                         />
                       </div>
                     </div>
                   )}
                 </div>
               </div>

               {f.status === 'completed' && (
                 <div className="flex items-center gap-3 shrink-0">
                   <button 
                     onClick={() => handleDownload(f, ExportFormat.CSV)}
                     className="px-6 py-3 bg-slate-800 border border-slate-700 text-slate-300 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-slate-700 transition-all active:scale-95"
                   >
                     CSV
                   </button>
                   <button 
                     onClick={() => handleDownload(f, ExportFormat.EXCEL)}
                     className="px-8 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl text-[10px] uppercase tracking-widest hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2"
                   >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                     Excel
                   </button>
                 </div>
               )}

               {f.status === 'error' && (
                 <div className="text-red-400 text-xs font-black uppercase tracking-widest bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">
                   Failed
                 </div>
               )}
            </div>
            {f.result && (
              <div className="opacity-0 translate-y-4 animate-[fadeIn_0.5s_ease-out_forwards]">
                <DataTable data={f.result} fileName={f.name} />
              </div>
            )}
          </div>
        ))}
      </div>
      
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};