
import { PDFTextItem } from './pdf';
import { ExtractedData } from '../types';

/**
 * Advanced Table Parser
 * Uses a coordinate-based grid mapping system to ensure columns stay aligned
 * even when some rows have missing data.
 */
export function parseTableFromTextItems(pages: PDFTextItem[][]): ExtractedData {
  const Y_THRESHOLD = 5; 
  const X_CLUSTER_THRESHOLD = 20; // Distance to consider items in the same column lane

  // 1. Pre-process: Collect all items and detect column "lanes"
  const allItems = pages.flat();
  if (allItems.length === 0) return { headers: [], rows: [] };

  // Identify unique X-coordinates to determine column boundaries
  // We sort by X and then group coordinates that are very close to each other
  const sortedX = allItems.map(i => i.x).sort((a, b) => a - b);
  const columnLanes: number[] = [];
  
  if (sortedX.length > 0) {
    let currentLaneStart = sortedX[0];
    columnLanes.push(currentLaneStart);
    
    for (let i = 1; i < sortedX.length; i++) {
      if (sortedX[i] - currentLaneStart > X_CLUSTER_THRESHOLD) {
        currentLaneStart = sortedX[i];
        columnLanes.push(currentLaneStart);
      }
    }
  }

  const numColumns = columnLanes.length;

  // 2. Process page by page, row by row
  const structuredRows: (string[])[] = [];

  pages.forEach(pageItems => {
    if (pageItems.length === 0) return;

    // Group items into rows by Y coordinate
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

    // Sort rows by Y (Handling OCR top-down vs PDF bottom-up)
    const isOcr = pageItems.some(i => i.isOcr);
    const sortedY = Array.from(rowsMap.keys()).sort((a, b) => isOcr ? a - b : b - a);

    sortedY.forEach(y => {
      const rawRowItems = rowsMap.get(y)!;
      
      // Initialize a fixed-width grid row
      const gridRow = new Array(numColumns).fill("");

      // Map each text item in this row to the closest column lane
      rawRowItems.forEach(item => {
        // Find the index of the closest lane
        let closestLaneIdx = 0;
        let minDiff = Infinity;
        
        columnLanes.forEach((laneX, idx) => {
          const diff = Math.abs(item.x - laneX);
          if (diff < minDiff) {
            minDiff = diff;
            closestLaneIdx = idx;
          }
        });

        // Append text if multiple items fall into the same lane (e.g., wrapped text)
        gridRow[closestLaneIdx] = (gridRow[closestLaneIdx] + " " + item.text).trim();
      });

      // Only add rows that aren't completely empty
      if (gridRow.some(cell => cell !== "")) {
        structuredRows.push(gridRow);
      }
    });
  });

  if (structuredRows.length === 0) {
    return { headers: [], rows: [] };
  }

  // 3. Clean up the grid: Remove columns that are completely empty across ALL rows
  const activeColumnIndices = columnLanes
    .map((_, idx) => idx)
    .filter(idx => structuredRows.some(row => row[idx] !== ""));

  const finalRows = structuredRows.map(row => 
    activeColumnIndices.map(idx => row[idx])
  );

  // 4. Determine Headers
  // Often the first row with the most content is the header
  let headerIndex = 0;
  let maxFullCells = 0;
  for (let i = 0; i < Math.min(finalRows.length, 5); i++) {
    const fullCells = finalRows[i].filter(c => c !== "").length;
    if (fullCells > maxFullCells) {
      maxFullCells = fullCells;
      headerIndex = i;
    }
  }

  const headerRow = finalRows[headerIndex];
  const headers = headerRow.map((val, idx) => {
    const clean = val.replace(/[\r\n]+/g, " ").trim();
    return clean || `Column ${idx + 1}`;
  });

  const dataRows = finalRows.slice(headerIndex + 1).map(row => {
    const rowObj: Record<string, any> = {};
    headers.forEach((header, idx) => {
      rowObj[header] = row[idx] || '';
    });
    return rowObj;
  });

  return { headers, rows: dataRows };
}
