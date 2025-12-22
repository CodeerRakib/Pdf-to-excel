
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
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col max-h-[600px]">
      <div className="px-6 py-4 bg-slate-50 border-b flex items-center justify-between sticky top-0 z-10">
        <div>
          <h4 className="font-semibold text-slate-800">Data Preview</h4>
          <p className="text-xs text-slate-500">{data.rows.length} rows detected</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => exportData(ExportFormat.CSV)}
            className="px-3 py-1.5 bg-white border border-slate-300 rounded text-sm font-medium hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            CSV
          </button>
          <button 
            onClick={() => exportData(ExportFormat.EXCEL)}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded text-sm font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Excel
          </button>
        </div>
      </div>
      <div className="overflow-auto">
        <table className="w-full text-left text-sm border-collapse">
          <thead className="bg-slate-50 sticky top-0">
            <tr>
              {data.headers.map((header) => (
                <th key={header} className="px-6 py-3 font-semibold text-slate-600 border-b border-slate-200 bg-slate-50 whitespace-nowrap">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.rows.map((row, idx) => (
              <tr key={idx} className="hover:bg-emerald-50/30 transition-colors">
                {data.headers.map((header) => (
                  <td key={header} className="px-6 py-3 text-slate-700 whitespace-nowrap">
                    {row[header]?.toString() || '-'}
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
