import React, { useState } from 'react';

export const ImageToPdf: React.FC = () => {
  const [images, setImages] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Fix: Explicitly cast the result of Array.from to File[] to resolve type inference issues
    const files = Array.from(e.target.files || []) as File[];
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        setImages(prev => [...prev, evt.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const generatePdf = async () => {
    if (images.length === 0) return;
    setIsProcessing(true);
    try {
      // @ts-ignore
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      images.forEach((img, i) => {
        if (i > 0) doc.addPage();
        doc.addImage(img, 'JPEG', 10, 10, 190, 0); // Preserve aspect ratio
      });
      
      doc.save('images_converted.pdf');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-6">Images to PDF</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-10 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center">
          <input type="file" accept="image/*" multiple onChange={handleFiles} className="hidden" id="img-input" />
          <label htmlFor="img-input" className="px-8 py-3 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl cursor-pointer transition-all">
            Upload Images
          </label>
        </div>
        
        {images.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-bold text-white">Preview ({images.length} images)</h3>
            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-auto p-2 bg-slate-950 rounded-xl">
              {images.map((img, i) => (
                <img key={i} src={img} className="w-full h-16 object-cover rounded-lg border border-slate-800" />
              ))}
            </div>
            <button onClick={generatePdf} disabled={isProcessing} className="w-full py-4 bg-emerald-500 text-slate-950 font-black rounded-xl hover:bg-emerald-400 transition-all">
              {isProcessing ? 'Building PDF...' : 'Download PDF'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};