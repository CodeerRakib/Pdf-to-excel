import React from 'react';
import { ExtractedData, ExportFormat } from '../types';

interface DataTableProps {
  data: ExtractedData;
  fileName: string;
}

export const DataTable: React.FC<DataTableProps> = ({ data, fileName }) => {
  const exportData = (format: ExportFormat) => {
    // @ts-ignore
    const XLSX = window.XLSX;
    const worksheet = XLSX.utils.json_to_sheet(data.rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Extracted Data");
    
    const extension = format === ExportFormat.CSV ? 'csv' : 'xlsx';
    XLSX.writeFile(workbook, `${fileName}_converted.${extension}`);
  };

  return (
    <div className="bg-slate-900 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[700px] animate-in fade-in duration-700">
      <div className="px-6 py-5 bg-slate-800/40 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-10 backdrop-blur-md">
        <div>
          <h4 className="font-bold text-slate-100 flex items-center gap-2 text-lg">
            Result Preview
            <span className="text-[10px] px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full font-black uppercase tracking-tighter">Verified Alignment</span>
          </h4>
          <p className="text-xs font-semibold text-slate-500 mt-0.5">{data.rows.length} records successfully mapped</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => exportData(ExportFormat.CSV)}
            className="px-5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-slate-300 hover:bg-slate-750 hover:text-white transition-all flex items-center gap-2 shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV
          </button>
          <button 
            onClick={() => exportData(ExportFormat.EXCEL)}
            className="px-5 py-2.5 bg-emerald-500 text-slate-950 rounded-xl text-sm font-black hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel
          </button>
        </div>
      </div>
      <div className="overflow-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
        <table className="w-full text-left text-sm border-collapse font-mono">
          <thead>
            <tr>
              {data.headers.map((header) => (
                <th key={header} className="px-6 py-4 font-black text-slate-400 border-b border-slate-800 bg-slate-900/90 whitespace-nowrap text-[11px] uppercase tracking-widest">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {data.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-emerald-500/[0.03] transition-colors group">
                {data.headers.map((header) => (
                  <td key={header} className="px-6 py-4 text-slate-300 whitespace-nowrap group-hover:text-white transition-colors">
                    {row[header]?.toString() || <span className="text-slate-700 italic opacity-50">null</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};