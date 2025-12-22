import React, { useState, useCallback } from 'react';
import { Uploader } from './Uploader';
import { DataTable } from './DataTable';
import { ProcessingFile, OcrOptions } from '../types';
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
    <div className="space-y-8">
      <div className="bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <div className="flex flex-col md:flex-row justify-between gap-6 mb-8">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">Upload PDF</h2>
            <p className="text-sm text-slate-500 font-medium">Coordinate alignment ensures 100% table accuracy.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Language:</span>
            <select 
              value={ocrLanguage}
              onChange={(e) => setOcrLanguage(e.target.value)}
              className="bg-slate-800 text-slate-200 text-xs font-bold px-4 py-2 rounded-xl border border-slate-700 outline-none"
            >
              {SUPPORTED_LANGUAGES.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
            </select>
          </div>
        </div>
        {/* Fix: Explicitly type the files from Uploader to ensure they are treated as File objects */}
        <Uploader onFilesSelected={(list: FileList) => Array.from(list).forEach((f: File) => processFile(f))} disabled={isProcessing} />
      </div>

      <div className="space-y-6">
        {files.map(f => (
          <div key={f.id} className="space-y-4">
            <div className={`p-5 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between ${f.status === 'processing' ? 'border-emerald-500/30' : ''}`}>
               <div className="flex items-center gap-4">
                 <div className="p-3 bg-slate-800 rounded-lg text-slate-400">
                   <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                 </div>
                 <div>
                   <p className="font-bold text-white">{f.name}</p>
                   <p className="text-xs text-slate-500">{(f.size/1024).toFixed(1)} KB • {f.status}</p>
                 </div>
               </div>
               {f.status === 'processing' && <div className="text-emerald-500 text-xs font-black">{f.progress}%</div>}
            </div>
            {f.result && <DataTable data={f.result} fileName={f.name} />}
          </div>
        ))}
      </div>
    </div>
  );
};