
import { PDFTextItem } from './pdf';
import { OcrOptions } from '../types';

// @ts-ignore
const Tesseract = window.Tesseract;

/**
 * Maps Tesseract script detection results to the most likely language code.
 */
const SCRIPT_TO_LANG_MAP: Record<string, string> = {
  'Latin': 'eng',
  'Bengali': 'ben',
  'Han': 'chi_sim',
  'Arabic': 'ara',
  'Devanagari': 'hin',
  'Japanese': 'jpn',
  'Korean': 'kor',
  'Cyrillic': 'rus',
  'Greek': 'ell',
  'Thai': 'tha'
};

/**
 * Attempts to detect the primary script/language of an image.
 */
export async function detectLanguageFromImage(imageSrc: string): Promise<string> {
  // Use 'osd' (Orientation and Script Detection) data
  const worker = await Tesseract.createWorker('osd');
  try {
    const { data } = await worker.detect(imageSrc);
    console.log('Detected script:', data.script);
    return SCRIPT_TO_LANG_MAP[data.script] || 'eng';
  } catch (err) {
    console.error('Language detection failed:', err);
    return 'eng';
  } finally {
    await worker.terminate();
  }
}

/**
 * Performs OCR on an image using the specified language and advanced options.
 * Tesseract.js will automatically fetch the language data if not cached.
 */
export async function performOcrOnImage(
  imageSrc: string, 
  lang: string = 'eng',
  options?: OcrOptions
): Promise<PDFTextItem[]> {
  // Initialize the worker with the selected language(s)
  const worker = await Tesseract.createWorker(lang);
  
  try {
    // Apply advanced parameters if provided
    if (options) {
      const params: Record<string, any> = {};
      if (options.tessedit_char_whitelist) {
        params.tessedit_char_whitelist = options.tessedit_char_whitelist;
      }
      if (options.tessedit_char_blacklist) {
        params.tessedit_char_blacklist = options.tessedit_char_blacklist;
      }
      if (options.tessedit_pageseg_mode) {
        params.tessedit_pageseg_mode = options.tessedit_pageseg_mode;
      }
      
      if (Object.keys(params).length > 0) {
        await worker.setParameters(params);
      }
    }

    const result = await worker.recognize(imageSrc);
    
    // Convert Tesseract words to our PDFTextItem format
    const items: PDFTextItem[] = result.data.words.map((word: any) => ({
      text: word.text,
      x: word.bbox.x0,
      y: word.bbox.y0,
      width: word.bbox.x1 - word.bbox.x0,
      isOcr: true
    }));

    return items;
  } finally {
    await worker.terminate();
  }
}
