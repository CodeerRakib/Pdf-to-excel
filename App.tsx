
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
  
  // OCR Advanced Settings
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
    <div className="max-w-6xl mx-auto px-4 py-12">
      <header className="mb-12 text-center">
        <div className="inline-flex items-center gap-2 mb-4">
          <div className="p-2 bg-emerald-600 rounded-lg shadow-emerald-200 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">PDF2Table <span className="text-emerald-600">Local OCR</span></h1>
        </div>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Private multi-language OCR and table extraction. 100% client-side, unlimited and free.
        </p>
      </header>

      <div className="grid gap-8">
        <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm transition-all">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-800">OCR Settings</h2>
              <p className="text-sm text-slate-500">Tune recognition settings for best accuracy.</p>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label htmlFor="lang-select" className="text-sm font-medium text-slate-700 whitespace-nowrap">Language:</label>
                <select 
                  id="lang-select"
                  value={ocrLanguage}
                  onChange={(e) => setOcrLanguage(e.target.value)}
                  disabled={isProcessingGlobal}
                  className="bg-slate-50 border border-slate-300 text-slate-900 text-sm rounded-lg focus:ring-emerald-500 focus:border-emerald-500 block p-2 transition-colors disabled:opacity-50"
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>{lang.name}</option>
                  ))}
                </select>
              </div>
              <button 
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <svg className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
                {showAdvanced ? 'Hide' : 'Show'} Advanced
              </button>
            </div>
          </div>

          {showAdvanced && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 p-4 bg-slate-50 rounded-lg border border-slate-200 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Whitelist Characters</label>
                <input 
                  type="text"
                  placeholder="e.g. 0123456789.$"
                  className="w-full text-sm border-slate-300 rounded focus:ring-emerald-500 focus:border-emerald-500 p-2"
                  value={ocrOptions.tessedit_char_whitelist}
                  onChange={(e) => updateOcrOption('tessedit_char_whitelist', e.target.value)}
                  disabled={isProcessingGlobal}
                />
                <p className="text-[10px] text-slate-400">Restrict OCR to only these characters.</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Blacklist Characters</label>
                <input 
                  type="text"
                  placeholder="e.g. ~|@"
                  className="w-full text-sm border-slate-300 rounded focus:ring-emerald-500 focus:border-emerald-500 p-2"
                  value={ocrOptions.tessedit_char_blacklist}
                  onChange={(e) => updateOcrOption('tessedit_char_blacklist', e.target.value)}
                  disabled={isProcessingGlobal}
                />
                <p className="text-[10px] text-slate-400">Characters to ignore during OCR.</p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-600 uppercase">Segmentation Mode (PSM)</label>
                <select 
                  className="w-full text-sm border-slate-300 rounded focus:ring-emerald-500 focus:border-emerald-500 p-2"
                  value={ocrOptions.tessedit_pageseg_mode}
                  onChange={(e) => updateOcrOption('tessedit_pageseg_mode', e.target.value)}
                  disabled={isProcessingGlobal}
                >
                  {PSM_MODES.map(mode => (
                    <option key={mode.value} value={mode.value}>{mode.label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">How Tesseract interprets the layout.</p>
              </div>
            </div>
          )}
          
          <Uploader onFilesSelected={handleFilesSelected} disabled={isProcessingGlobal} />
        </section>

        {files.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <h2 className="text-xl font-bold text-slate-800">Your Documents</h2>
              <button 
                onClick={() => setFiles([])}
                className="text-sm font-medium text-slate-500 hover:text-red-600 transition-colors"
              >
                Clear all
              </button>
            </div>
            
            <div className="grid gap-6">
              {files.map(file => (
                <div key={file.id} className="space-y-4">
                  <div className={`p-4 rounded-xl border transition-all ${
                    file.status === 'error' ? 'bg-red-50 border-red-200 shadow-sm' : 
                    file.status === 'processing' ? 'bg-emerald-50/50 border-emerald-100 shadow-inner' : 
                    'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1">
                        <div className={`p-3 rounded-lg flex-shrink-0 ${
                          file.status === 'error' ? 'bg-red-100 text-red-600' : 
                          file.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 
                          'bg-slate-100 text-slate-600'
                        }`}>
                          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            {file.status === 'completed' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : file.status === 'error' ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            )}
                          </svg>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 truncate text-base">{file.name}</p>
                          <div className="flex items-center gap-3 mt-0.5">
                            <p className="text-xs font-medium text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                            {file.error && (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                file.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {file.error}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        {file.status === 'processing' && (
                          <div className="flex flex-col items-end gap-1 min-w-[120px]">
                            <div className="flex items-center gap-2 text-emerald-600 text-xs font-bold uppercase tracking-wider">
                              <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              {file.progress}%
                            </div>
                            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${file.progress}%` }}></div>
                            </div>
                          </div>
                        )}
                        
                        {file.status === 'error' && (
                          <button 
                            onClick={() => handleRetry(file)}
                            className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2 text-sm font-bold"
                            title="Retry processing"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Retry
                          </button>
                        )}

                        <button 
                          onClick={() => handleRemoveFile(file.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Remove from list"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>

                  {file.result && file.result.rows.length > 0 && (
                    <div className="pl-4 border-l-4 border-emerald-500/20">
                      <DataTable data={file.result} fileName={file.name} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <footer className="mt-24 pt-10 border-t border-slate-200 text-center">
        <div className="flex justify-center gap-6 mb-4">
            <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-slate-800">Unlimited</span>
                <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Data</span>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-slate-800">100% Free</span>
                <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">No Subs</span>
            </div>
            <div className="w-px h-10 bg-slate-200"></div>
            <div className="flex flex-col items-center">
                <span className="text-xl font-bold text-slate-800">Private</span>
                <span className="text-xs text-slate-500 uppercase tracking-widest font-bold">Local Only</span>
            </div>
        </div>
        <p className="text-xs text-slate-400 max-w-lg mx-auto">
          Built with Tesseract.js, PDF.js, and SheetJS. Your files are processed strictly in RAM and are never uploaded to any server.
        </p>
      </footer>
    </div>
  );
};

export default App;
