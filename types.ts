
export interface ExtractedData {
  headers: string[];
  rows: Record<string, any>[];
}

export interface OcrOptions {
  tessedit_char_whitelist?: string;
  tessedit_char_blacklist?: string;
  tessedit_pageseg_mode?: string;
}

export interface ProcessingFile {
  id: string;
  name: string;
  size: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  result?: ExtractedData;
  error?: string;
  rawFile?: File; // Store reference for retries
}

export enum ExportFormat {
  CSV = 'csv',
  EXCEL = 'xlsx'
}
