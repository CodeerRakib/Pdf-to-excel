import React, { useRef } from 'react';

interface UploaderProps {
  onFilesSelected: (files: FileList) => void;
  disabled?: boolean;
}

export const Uploader: React.FC<UploaderProps> = ({ onFilesSelected, disabled }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesSelected(e.target.files);
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const triggerFileInput = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div 
      onDragOver={onDragOver}
      onDrop={onDrop}
      className={`relative border-2 border-dashed rounded-3xl p-8 md:p-16 transition-all duration-500 text-center
        ${disabled ? 'bg-slate-900/50 border-slate-800 cursor-not-allowed grayscale' : 'bg-slate-900/30 border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] group'}
      `}
    >
      <input 
        ref={fileInputRef}
        type="file" 
        accept=".pdf" 
        multiple 
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />
      
      <div className="space-y-6">
        <div 
          onClick={triggerFileInput}
          className="mx-auto w-16 h-16 md:w-20 md:h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-500 shadow-inner cursor-pointer"
        >
          <svg className="w-8 h-8 md:w-10 md:h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl md:text-2xl font-bold text-slate-100 px-4">Convert PDF to Spreadsheet</h3>
          <p className="text-sm md:text-base text-slate-400 font-medium px-4">Drag and drop files here, or use the button below</p>
        </div>

        <div className="pt-2">
          <button
            onClick={triggerFileInput}
            disabled={disabled}
            className="px-8 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] active:scale-95 disabled:opacity-50 disabled:shadow-none inline-flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            Choose PDF Files
          </button>
        </div>

        <div className="flex justify-center gap-2 md:gap-3 flex-wrap pt-4 px-4">
          <div className="flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 bg-slate-800/80 text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-700">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            OCR Enabled
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 bg-slate-800/80 text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-700">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            100% Private
          </div>
          <div className="flex items-center gap-1.5 md:gap-2 px-2.5 py-1.5 bg-slate-800/80 text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-700">
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
            No Limits
          </div>
        </div>
      </div>
    </div>
  );
};