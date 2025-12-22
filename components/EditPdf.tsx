import React, { useState } from 'react';
import { Uploader } from './Uploader';

export const EditPdf: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMerge = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);
    try {
      // @ts-ignore
      const { PDFDocument } = window.PDFLib;
      const mergedPdf = await PDFDocument.create();
      
      for (const file of files) {
        const bytes = await file.arrayBuffer();
        const pdf = await PDFDocument.load(bytes);
        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
        copiedPages.forEach((page: any) => mergedPdf.addPage(page));
      }
      
      const mergedBytes = await mergedPdf.save();
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `merged_${Date.now()}.pdf`;
      a.click();
    } catch (e) {
      console.error(e);
      alert('Error merging PDFs. Ensure files are valid.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6">Merge PDF Files</h2>
        <Uploader onFilesSelected={(list) => setFiles(prev => [...prev, ...Array.from(list)])} disabled={isProcessing} />
      </div>

      {files.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-white">Files to Merge ({files.length})</h3>
            <button 
              onClick={handleMerge}
              disabled={files.length < 2 || isProcessing}
              className="px-6 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl hover:bg-emerald-400 transition-all disabled:opacity-50"
            >
              {isProcessing ? 'Merging...' : 'Merge & Download'}
            </button>
          </div>
          <div className="space-y-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-700">
                <span className="font-medium text-slate-200">{f.name}</span>
                <button onClick={() => setFiles(prev => prev.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-300">Remove</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};