
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
      className={`relative border-2 border-dashed rounded-xl p-12 transition-all duration-200 text-center
        ${disabled ? 'bg-gray-100 border-gray-300 cursor-not-allowed' : 'bg-white border-emerald-200 hover:border-emerald-400 cursor-pointer group'}
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
      <div className="space-y-4">
        <div className="mx-auto w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
          <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Drop PDF Files Here</h3>
          <p className="text-slate-500 mt-1">Supports Scanned Documents, Image PDFs & Digital Files.</p>
        </div>
        <div className="flex justify-center gap-2 flex-wrap">
          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border">Local OCR Support</span>
          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border">No Upload Limits</span>
          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded border">Works Offline</span>
        </div>
      </div>
    </div>
  );
};
