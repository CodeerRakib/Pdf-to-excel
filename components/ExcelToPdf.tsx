import React, { useState } from 'react';

export const ExcelToPdf: React.FC = () => {
  const [data, setData] = useState<any[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      // @ts-ignore
      const XLSX = window.XLSX;
      const bstr = evt.target?.result;
      const workbook = XLSX.read(bstr, { type: 'binary' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet);
      setData(json);
    };
    reader.readAsBinaryString(file);
  };

  const exportToPdf = async () => {
    if (!data) return;
    setIsProcessing(true);
    try {
      // @ts-ignore
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text(fileName, 14, 22);
      doc.setFontSize(11);
      doc.setTextColor(100);
      
      let y = 35;
      data.slice(0, 100).forEach((row, i) => { // Limited to 100 rows for demo
        const text = Object.values(row).join(' | ');
        doc.text(text, 14, y);
        y += 7;
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
      });
      
      doc.save(`${fileName}.pdf`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="bg-slate-900/50 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-2xl">
      <h2 className="text-xl font-bold text-white mb-6">Excel to PDF</h2>
      <div className="flex flex-col items-center gap-6 p-10 border-2 border-dashed border-slate-800 rounded-3xl">
        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFile} className="hidden" id="excel-input" />
        <label htmlFor="excel-input" className="px-8 py-3 bg-slate-800 hover:bg-slate-750 text-white font-bold rounded-xl cursor-pointer transition-all">
          Select Spreadsheet
        </label>
        {data && (
          <div className="w-full text-center space-y-4">
            <p className="text-emerald-500 font-bold">Loaded: {fileName} ({data.length} rows)</p>
            <button onClick={exportToPdf} disabled={isProcessing} className="px-8 py-4 bg-emerald-500 text-slate-950 font-black rounded-xl hover:bg-emerald-400 transition-all">
              {isProcessing ? 'Generating PDF...' : 'Convert to PDF'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};