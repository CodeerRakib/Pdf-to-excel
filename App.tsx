import React, { useState, useCallback } from 'react';
import { Uploader } from './components/Uploader';
import { DataTable } from './components/DataTable';
import { ProcessingFile, OcrOptions } from './types';
import { extractPdfTextItems, renderPageToImage, getPdfPageCount, PDFTextItem } from './services/pdf';
import { parseTableFromTextItems } from './services/tableParser';
import { performOcrOnImage, detectLanguageFromImage } from './services/ocr';

const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'eng', name: 'English' },
  { code: 'ben', name: 'Bangla (Bengali)' },
  { code: 'spa', name: 'Spanish' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'ita', name: 'Italian' },
  { code: 'por', name: 'Portuguese' },
  { code: 'hin', name: 'Hindi' },
  { code: 'ara', name: 'Arabic' },
  { code: 'chi_sim', name: 'Chinese (Simplified)' },
  { code: 'chi_tra', name: 'Chinese (Traditional)' },
  { code: 'jpn', name: 'Japanese' },
  { code: 'kor', name: 'Korean' },
  { code: 'rus', name: 'Russian' },
];

const PSM_MODES = [
  { value: '3', label: 'Default (Fully Automatic)' },
  { value: '4', label: 'Single Column (Good for tables)' },
  { value: '6', label: 'Uniform Block (Good for simple pages)' },
  { value: '11', label: 'Sparse Text (Find everything)' },
];

const App: React.FC = () => {
  const [files, setFiles] = useState<ProcessingFile[]>([]);
  const [isProcessingGlobal, setIsProcessingGlobal] = useState(false);
  const [ocrLanguage, setOcrLanguage] = useState('auto');
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const [ocrOptions, setOcrOptions] = useState<OcrOptions>({
    tessedit_char_whitelist: '',
    tessedit_char_blacklist: '',
    tessedit_pageseg_mode: '3'
  });

  const updateFileInState = useCallback((id: string, updates: Partial<ProcessingFile>) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  const processFile = async (rawFile: File, existingId?: string) => {
    const fileId = existingId || Math.random().toString(36).substring(7);
    
    if (!existingId) {
      const newFile: ProcessingFile = {
        id: fileId,
        name: rawFile.name,
        size: rawFile.size,
        status: 'processing',
        progress: 0,
        rawFile
      };
      setFiles(prev => [newFile, ...prev]);
    } else {
      updateFileInState(fileId, { status: 'processing', progress: 0, error: undefined, result: undefined });
    }

    setIsProcessingGlobal(true);

    try {
      updateFileInState(fileId, { progress: 10 });
      let pagesItems = await extractPdfTextItems(rawFile);
      
      const totalText = pagesItems.flat().reduce((acc, curr) => acc + curr.text.length, 0);
      const isScanned = totalText < 50; 

      if (isScanned) {
        let activeLang = ocrLanguage;
        updateFileInState(fileId, { progress: 20, error: 'Empty text layer detected. Preparing OCR...' });
        
        const pageCount = await getPdfPageCount(rawFile);
        const firstPageImage = await renderPageToImage(rawFile, 1);

        if (ocrLanguage === 'auto') {
          updateFileInState(fileId, { error: 'Detecting document language...' });
          activeLang = await detectLanguageFromImage(firstPageImage);
        }

        const langName = SUPPORTED_LANGUAGES.find(l => l.code === activeLang)?.name || activeLang;
        updateFileInState(fileId, { 
          progress: 25, 
          error: `Processing with ${langName} OCR...` 
        });
        
        const ocrPages: PDFTextItem[][] = [];
        for (let i = 1; i <= pageCount; i++) {
          const progressStep = Math.floor(25 + (i / pageCount) * 65);
          updateFileInState(fileId, { progress: progressStep });
          
          const pageImage = (i === 1) ? firstPageImage : await renderPageToImage(rawFile, i);
          const pageOcrItems = await performOcrOnImage(pageImage, activeLang, ocrOptions);
          ocrPages.push(pageOcrItems);
        }
        pagesItems = ocrPages;
      }

      updateFileInState(fileId, { progress: 95, error: undefined });
      const extractedData = parseTableFromTextItems(pagesItems);
      
      if (extractedData.rows.length === 0) {
        throw new Error("No structured data could be found. The layout might be too complex for the current parser.");
      }
      
      updateFileInState(fileId, { 
        status: 'completed', 
        progress: 100, 
        result: extractedData 
      });
    } catch (error) {
      console.error("Processing error:", error);
      let errorMessage = "An unexpected error occurred.";
      if (error instanceof Error) {
        errorMessage = error.message;
        if (errorMessage.includes("Worker")) errorMessage = "OCR Engine failed to initialize. Check internet connection.";
        if (errorMessage.includes("corrupt")) errorMessage = "The PDF file appears to be corrupted.";
      }
      updateFileInState(fileId, { status: 'error', error: errorMessage });
    } finally {
      setFiles(currentFiles => {
        const stillProcessing = currentFiles.some(f => f.status === 'processing' && f.id !== fileId);
        if (!stillProcessing) setIsProcessingGlobal(false);
        return currentFiles;
      });
    }
  };

  const handleFilesSelected = (fileList: FileList) => {
    Array.from(fileList).forEach(file => {
      if (file.type === 'application/pdf') {
        processFile(file);
      }
    });
  };

  const handleRemoveFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleRetry = (file: ProcessingFile) => {
    if (file.rawFile) {
      processFile(file.rawFile, file.id);
    }
  };

  const updateOcrOption = (key: keyof OcrOptions, value: string) => {
    setOcrOptions(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <header className="mb-12 text-center relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-emerald-500/10 blur-[100px] pointer-events-none -z-10 rounded-full"></div>
        <div className="inline-flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-500 rounded-2xl shadow-[0_0_30px_rgba(16,185,129,0.3)]">
            <svg className="w-8 h-8 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">The Converter</h1>
        </div>
        <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto font-medium">
          Professional PDF to Excel conversion. Local, Private, and Secure.
        </p>
      </header>

      <div className="space-y-8">
        <section className="bg-slate-900/50 backdrop-blur-sm p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                OCR Engine Configuration
              </h2>
              <p className="text-sm text-slate-500">Optimized for 100% data alignment accuracy.</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-3">
                <label htmlFor="lang-select" className="text-sm font-semibold text-slate-400 whitespace-nowrap">Source Language:</label>
                <select 
                  id="lang-select"
                  value={ocrLanguage}
                  onChange={(e) => setOcrLanguage(e.target.value)}
                  disabled={isProcessingGlobal}
                  className="bg-slate-800 border border-slate-700 text-slate-200 text-sm font-medium rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent block px-4 py-2 transition-all disabled:opacity-50 appearance-none cursor-pointer hover:bg-slate-750"
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm font-bold text-emerald-500 hover:text-emerald-400 flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 transition-colors"
              >
                <svg className={`w-4 h-4 transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
                {showAdvanced ? 'Hide' : 'Advanced'} Parameters
              </button>
            </div>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10 p-6 bg-slate-800/40 rounded-2xl border border-slate-700 animate-in fade-in slide-in-from-top-4 duration-500">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Character Whitelist</label>
                <input 
                  type="text"
                  placeholder="e.g. 0-9, A-Z, $"
                  className="w-full text-sm bg-slate-900 border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-200 p-3 placeholder:text-slate-600 outline-none transition-all"
                  value={ocrOptions.tessedit_char_whitelist}
                  onChange={(e) => updateOcrOption('tessedit_char_whitelist', e.target.value)}
                  disabled={isProcessingGlobal}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Character Blacklist</label>
                <input 
                  type="text"
                  placeholder="e.g. ~|@"
                  className="w-full text-sm bg-slate-900 border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-200 p-3 placeholder:text-slate-600 outline-none transition-all"
                  value={ocrOptions.tessedit_char_blacklist}
                  onChange={(e) => updateOcrOption('tessedit_char_blacklist', e.target.value)}
                  disabled={isProcessingGlobal}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Segmentation Mode (PSM)</label>
                <select 
                  className="w-full text-sm bg-slate-900 border-slate-700 rounded-xl focus:ring-2 focus:ring-emerald-500 text-slate-200 p-3 outline-none transition-all cursor-pointer"
                  value={ocrOptions.tessedit_pageseg_mode}
                  onChange={(e) => updateOcrOption('tessedit_pageseg_mode', e.target.value)}
                  disabled={isProcessingGlobal}
                >
                  {PSM_MODES.map(mode => (
                    <option key={mode.value} value={mode.value}>{mode.label}</option>
                  ))}
                </select>
              </div>
            </div>
          )}
          
          <Uploader onFilesSelected={handleFilesSelected} disabled={isProcessingGlobal} />
        </section>

        {files.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="text-2xl font-bold text-slate-100">Work Queue</h2>
              <button 
                onClick={() => setFiles([])}
                className="text-sm font-semibold text-slate-500 hover:text-red-400 transition-colors bg-slate-900 px-4 py-2 rounded-xl"
              >
                Clear All
              </button>
            </div>
            
            <div className="grid gap-6">
              {files.map(file => (
                <div key={file.id} className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className={`p-6 rounded-2xl border transition-all duration-300 ${
                    file.status === 'error' ? 'bg-red-500/5 border-red-500/20' : 
                    file.status === 'processing' ? 'bg-emerald-500/5 border-emerald-500/20' : 
                    'bg-slate-900 border-slate-800 shadow-xl'
                  }`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="flex items-start md:items-center gap-5 flex-1 min-w-0">
                        <div className={`p-4 rounded-xl flex-shrink-0 shadow-lg ${
                          file.status === 'error' ? 'bg-red-500/20 text-red-400' : 
                          file.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 
                          'bg-slate-800 text-slate-400'
                        }`}>
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {file.status === 'completed' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : file.status === 'error' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            )}
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-100 truncate text-lg">{file.name}</p>
                          <div className="flex flex-wrap items-center gap-3 mt-1">
                            <p className="text-sm font-semibold text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                            {file.error && (
                              <span className={`text-xs px-2.5 py-1 rounded-lg font-bold uppercase tracking-tight ${
                                file.status === 'error' ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {file.error}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 flex-shrink-0">
                        {file.status === 'processing' && (
                          <div className="flex flex-col items-end gap-2 min-w-[160px]">
                            <div className="flex items-center gap-2 text-emerald-500 text-xs font-black uppercase tracking-widest">
                              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing {file.progress}%
                            </div>
                            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5">
                              <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-300" style={{ width: `${file.progress}%` }}></div>
                            </div>
                          </div>
                        )}
                        
                        {file.status === 'error' && (
                          <button 
                            onClick={() => handleRetry(file)}
                            className="px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-xl transition-all flex items-center gap-2 text-sm font-bold border border-red-500/20"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Retry
                          </button>
                        )}

                        <button 
                          onClick={() => handleRemoveFile(file.id)}
                          className="p-3 text-slate-500 hover:text-white hover:bg-red-500 rounded-xl transition-all"
                          title="Remove"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {file.result && file.result.rows.length > 0 && (
                    <div className="pl-4 md:pl-8 border-l-4 border-emerald-500/20">
                      <DataTable data={file.result} fileName={file.name} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="mt-32 pt-12 border-t border-slate-900 text-center relative overflow-hidden">
        <div className="flex flex-col md:flex-row justify-center items-center gap-8 mb-10">
            <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-100">Unlimited</span>
                <span className="text-[10px] text-emerald-500 uppercase tracking-[0.3em] font-black">Data Handling</span>
            </div>
            <div className="hidden md:block w-px h-12 bg-slate-800"></div>
            <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-100">100% Free</span>
                <span className="text-[10px] text-emerald-500 uppercase tracking-[0.3em] font-black">Open Platform</span>
            </div>
            <div className="hidden md:block w-px h-12 bg-slate-800"></div>
            <div className="flex flex-col items-center">
                <span className="text-2xl font-black text-slate-100">Privacy First</span>
                <span className="text-[10px] text-emerald-500 uppercase tracking-[0.3em] font-black">Client-Side Only</span>
            </div>
        </div>
        <div className="max-w-2xl mx-auto space-y-4">
          <p className="text-xs text-slate-500 font-medium">
            Proprietary alignment algorithm ensures columns are mapped by physical coordinates.
          </p>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
            Powered by Tesseract.js • PDF.js • SheetJS
          </p>
        </div>
      </footer>
    </div>
  );
};

export default App;