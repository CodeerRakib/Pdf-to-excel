
import { PDFTextItem } from './pdf';
import { ExtractedData } from '../types';

export function parseTableFromTextItems(pages: PDFTextItem[][]): ExtractedData {
  const allRows: string[][] = [];
  const Y_THRESHOLD = 8; // Slightly larger for OCR jitter

  pages.forEach(pageItems => {
    if (pageItems.length === 0) return;

    // 1. Group by Y coordinate (rows)
    const rowsMap = new Map<number, PDFTextItem[]>();
    pageItems.forEach(item => {
      if (!item.text.trim()) return;
      
      let foundY = Array.from(rowsMap.keys()).find(y => Math.abs(y - item.y) < Y_THRESHOLD);
      if (foundY !== undefined) {
        rowsMap.get(foundY)!.push(item);
      } else {
        rowsMap.set(item.y, [item]);
      }
    });

    // 2. Sort rows by Y
    // PDF text is usually bottom-up (Y increases upwards)
    // OCR text is usually top-down (Y increases downwards)
    const isOcr = pageItems[0]?.isOcr;
    const sortedY = Array.from(rowsMap.keys()).sort((a, b) => isOcr ? a - b : b - a);
    
    sortedY.forEach(y => {
      const rowItems = rowsMap.get(y)!;
      // 3. Sort items within row by X (left to right)
      rowItems.sort((a, b) => a.x - b.x);
      
      // Merge items that are extremely close horizontally (part of same word/cell)
      const mergedRow: string[] = [];
      if (rowItems.length > 0) {
        let currentCell = rowItems[0].text;
        for (let i = 1; i < rowItems.length; i++) {
          const prev = rowItems[i-1];
          const curr = rowItems[i];
          const gap = curr.x - (prev.x + prev.width);
          
          if (gap < 15) { // Threshold for "same cell"
            currentCell += " " + curr.text;
          } else {
            mergedRow.push(currentCell);
            currentCell = curr.text;
          }
        }
        mergedRow.push(currentCell);
      }
      
      if (mergedRow.length > 0) {
        allRows.push(mergedRow);
      }
    });
  });

  if (allRows.length === 0) {
    return { headers: [], rows: [] };
  }

  // 4. Identify headers (longest row in the first few rows is likely the header)
  let headerIndex = 0;
  let maxCols = 0;
  for (let i = 0; i < Math.min(allRows.length, 5); i++) {
    if (allRows[i].length > maxCols) {
      maxCols = allRows[i].length;
      headerIndex = i;
    }
  }

  const headerRow = allRows[headerIndex];
  const headers = headerRow.map((val, idx) => val || `Column ${idx + 1}`);

  const rows = allRows.slice(headerIndex + 1).map(row => {
    const rowObj: Record<string, any> = {};
    headers.forEach((header, idx) => {
      rowObj[header] = row[idx] || '';
    });
    return rowObj;
  });

  return { headers, rows };
}
