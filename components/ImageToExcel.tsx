import React, { useState } from 'react';
import { performOcrOnImage } from '../services/ocr';
import { parseTableFromTextItems } from '../services/tableParser';
import { DataTable } from './DataTable';
import { ExtractedData } from '../types';

export const ImageToExcel: React.FC = () => {
  const [result, setResult] = useState<ExtractedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setProgress(10);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const base64 = evt.target?.result as string;
        setProgress(30);
        const textItems = await performOcrOnImage(base64, 'eng');
        setProgress(90);
        const data = parseTableFromTextItems([textItems]);
        setResult(data);
      } catch (e) {
        console.error(e);
        alert('OCR failed. Try a clearer image.');
      } finally {
        setIsProcessing(false);
        setProgress(0);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-8">
      <div className="bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl">
        <h2 className="text-xl font-bold text-white mb-6">Image to Excel (OCR)</h2>
        <div className="flex flex-col items-center gap-6 p-10 border-2 border-dashed border-slate-800 rounded-3xl">
          <input type="file" accept="image/*" onChange={handleImage} className="hidden" id="ocr-img-input" />
          <label htmlFor="ocr-img-input" className="px-8 py-3 bg-emerald-500 text-slate-950 font-black rounded-xl cursor-pointer hover:bg-emerald-400 transition-all">
            Upload Screenshot or Scan
          </label>
          {isProcessing && (
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between text-xs font-black text-emerald-500 uppercase tracking-widest">
                <span>OCR Processing</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {result && (
        <div className="animate-in fade-in duration-700">
          <DataTable data={result} fileName="scanned_table" />
        </div>
      )}
    </div>
  );
};