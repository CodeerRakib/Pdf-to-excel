import React from 'react';

interface UploaderProps {
  onFilesSelected: (files: FileList) => void;
  disabled?: boolean;
}

export const Uploader: React.FC<UploaderProps> = ({ onFilesSelected, disabled }) => {
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

  return (
    <div 
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      className={`relative border-2 border-dashed rounded-3xl p-10 md:p-16 transition-all duration-500 text-center
        ${disabled ? 'bg-slate-900/50 border-slate-800 cursor-not-allowed grayscale' : 'bg-slate-900/30 border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] cursor-pointer group'}
      `}
    >
      <input 
        type="file" 
        accept=".pdf" 
        multiple 
        onChange={handleFileChange}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
      <div className="space-y-6">
        <div className="mx-auto w-20 h-20 bg-emerald-500/10 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all duration-500 shadow-inner">
          <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-slate-100">Upload PDF Documents</h3>
          <p className="text-slate-400 font-medium">Select multiple files or drag them into this workspace.</p>
        </div>
        <div className="flex justify-center gap-3 flex-wrap pt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-700">
            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
            OCR Engine Ready
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-700">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            Private Processing
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-lg border border-slate-700">
            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
            No File Limits
          </div>
        </div>
      </div>
    </div>
  );
};