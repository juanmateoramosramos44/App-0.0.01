import ExcelJS from 'exceljs';
import type {
  CellStyleInfo,
  ExcelMergeRange,
  UploadedDocument,
  UploadedDocumentSheet
} from '../types';

// Standard Office 2013-2024 default theme palette (indices 0..9)
const OFFICE_THEME_COLORS: string[] = [
  '#FFFFFF', // 0: lt1 (Background 1 - White)
  '#000000', // 1: dk1 (Text 1 - Black)
  '#E7E6E6', // 2: lt2 (Background 2)
  '#44546A', // 3: dk2 (Text 2)
  '#4472C4', // 4: accent1
  '#ED7D31', // 5: accent2
  '#A5A5A5', // 6: accent3
  '#FFC000', // 7: accent4
  '#5B9BD5', // 8: accent5
  '#70AD47'  // 9: accent6
];

// Standard Excel legacy indexed palette (indices 0..64)
const INDEXED_COLORS: Record<number, string> = {
  0: '#000000', 1: '#FFFFFF', 2: '#FF0000', 3: '#00FF00', 4: '#0000FF', 5: '#FFFF00', 6: '#FF00FF', 7: '#00FFFF',
  8: '#000000', 9: '#FFFFFF', 10: '#FF0000', 11: '#00FF00', 12: '#0000FF', 13: '#FFFF00', 14: '#FF00FF', 15: '#00FFFF',
  16: '#800000', 17: '#008000', 18: '#000080', 19: '#808000', 20: '#800080', 21: '#008080', 22: '#C0C0C0', 23: '#808080',
  24: '#9999FF', 25: '#993366', 26: '#FFFFCC', 27: '#CCFFFF', 28: '#660066', 29: '#FF8080', 30: '#0066CC', 31: '#CCCCFF',
  32: '#000080', 33: '#FF00FF', 34: '#FFFF00', 35: '#00FFFF', 36: '#800080', 37: '#800000', 38: '#008080', 39: '#0000FF',
  40: '#00CCFF', 41: '#CCFFFF', 42: '#CCFFCC', 43: '#FFFF99', 44: '#99CCFF', 45: '#FF99CC', 46: '#CC99FF', 47: '#FFCC99',
  48: '#3366FF', 49: '#33CCCC', 50: '#99CC00', 51: '#FFCC00', 52: '#FF9900', 53: '#FF6600', 54: '#666699', 55: '#969696',
  56: '#003366', 57: '#339966', 58: '#003300', 59: '#333300', 60: '#993300', 61: '#993366', 62: '#333399', 63: '#333333',
  64: '#000000'
};

function applyTintToHex(hex: string, tint?: number): string {
  if (!tint || Math.abs(tint) < 0.001) return hex;
  const clean = hex.replace('#', '');
  if (clean.length !== 6) return hex;
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const applyChannel = (c: number) => {
    const val = tint < 0 ? c * (1 + tint) : c + (255 - c) * tint;
    return Math.max(0, Math.min(255, Math.round(val)));
  };
  const nr = applyChannel(r).toString(16).padStart(2, '0');
  const ng = applyChannel(g).toString(16).padStart(2, '0');
  const nb = applyChannel(b).toString(16).padStart(2, '0');
  return `#${nr}${ng}${nb}`.toUpperCase();
}

function resolveExcelColor(colorObj: any): string | undefined {
  if (!colorObj || typeof colorObj !== 'object') return undefined;
  if (typeof colorObj.argb === 'string' && colorObj.argb.length >= 6) {
    const clean = colorObj.argb.replace(/^0x/i, '');
    if (clean.length === 8) {
      // Skip completely transparent (alpha === '00') unless non-zero
      if (clean.slice(0, 2) === '00' && clean !== '00000000') {
        return `#${clean.slice(2).toUpperCase()}`;
      }
      if (clean === '00000000') return undefined;
      return `#${clean.slice(2).toUpperCase()}`;
    }
    if (clean.length === 6) return `#${clean.toUpperCase()}`;
  }
  if (typeof colorObj.theme === 'number') {
    const baseHex = OFFICE_THEME_COLORS[colorObj.theme];
    if (baseHex) {
      return applyTintToHex(baseHex, typeof colorObj.tint === 'number' ? colorObj.tint : undefined);
    }
  }
  if (typeof colorObj.indexed === 'number') {
    return INDEXED_COLORS[colorObj.indexed];
  }
  return undefined;
}

function resolveBorderCss(borderSide: any): string | undefined {
  if (!borderSide || !borderSide.style) return undefined;
  const style = String(borderSide.style);
  const color = resolveExcelColor(borderSide.color) || '#CBD5E1';
  if (style === 'medium') return `2px solid ${color}`;
  if (style === 'thick') return `3px solid ${color}`;
  if (style === 'double') return `3px double ${color}`;
  if (style === 'dashed' || style === 'mediumDashed') return `1px dashed ${color}`;
  if (style === 'dotted') return `1px dotted ${color}`;
  return `1px solid ${color}`;
}

function hexToArgb(hex: string): string {
  const clean = hex.replace('#', '').trim();
  if (clean.length === 6) return `FF${clean.toUpperCase()}`;
  if (clean.length === 8) return clean.toUpperCase();
  return 'FF000000';
}

export function getExcelColLetter(index: number): string {
  let letter = '';
  let temp = index;
  while (temp >= 0) {
    letter = String.fromCharCode((temp % 26) + 65) + letter;
    temp = Math.floor(temp / 26) - 1;
  }
  return letter;
}

function parseExcelCellAddress(ref: string): { row: number; col: number } | null {
  const match = /^([A-Z]+)(\d+)$/i.exec(ref.trim());
  if (!match) return null;
  const letters = match[1].toUpperCase();
  const rowNum = parseInt(match[2], 10) - 1;
  let colNum = 0;
  for (let i = 0; i < letters.length; i++) {
    colNum = colNum * 26 + (letters.charCodeAt(i) - 64);
  }
  return { row: rowNum, col: colNum - 1 };
}

function parseMergeString(rangeStr: string): ExcelMergeRange | null {
  const parts = String(rangeStr || '').split(':');
  if (parts.length !== 2) return null;
  const start = parseExcelCellAddress(parts[0]);
  const end = parseExcelCellAddress(parts[1]);
  if (!start || !end) return null;
  return {
    startRow: Math.min(start.row, end.row),
    startCol: Math.min(start.col, end.col),
    endRow: Math.max(start.row, end.row),
    endCol: Math.max(start.col, end.col)
  };
}

export function formatUtcDateValue(val: Date): string {
  const y = val.getUTCFullYear();
  const m = String(val.getUTCMonth() + 1).padStart(2, '0');
  const d = String(val.getUTCDate()).padStart(2, '0');
  const hh = val.getUTCHours();
  const mm = val.getUTCMinutes();
  const ss = val.getUTCSeconds();
  const datePart = `${y}-${m}-${d}`;
  if (hh === 0 && mm === 0 && ss === 0) return datePart;
  const timePart = ss > 0
    ? `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`
    : `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  if (y <= 1900 && (datePart === '1899-12-30' || datePart === '1899-12-31')) {
    return timePart;
  }
  return `${datePart} ${timePart}`;
}

export function isExcelDateNumFmt(numFmt?: string): boolean {
  if (!numFmt || typeof numFmt !== 'string') return false;
  const cleaned = numFmt
    .replace(/\[[^\]]*\]/g, '')
    .replace(/"[^"]*"/g, '')
    .replace(/\\./g, '');
  return /[yd]/i.test(cleaned) && !/[#0]/.test(cleaned);
}

function formatUtcDateWithNumFmt(val: Date, numFmt?: string): string {
  const y = val.getUTCFullYear();
  const yy = String(y).slice(-2);
  const m = String(val.getUTCMonth() + 1).padStart(2, '0');
  const d = String(val.getUTCDate()).padStart(2, '0');
  if (!numFmt || numFmt === 'General') return `${d}/${m}/${y}`;
  const lower = numFmt.toLowerCase();
  if (lower.includes('yyyy-mm-dd')) return `${y}-${m}-${d}`;
  if (lower.includes('dd/mm/yyyy')) return `${d}/${m}/${y}`;
  if (lower.includes('dd-mm-yyyy')) return `${d}-${m}-${y}`;
  if (lower.includes('mm/dd/yyyy')) return `${m}/${d}/${y}`;
  if (lower.includes('d/m/yy') || lower.includes('dd/mm/yy')) return `${d}/${m}/${yy}`;
  if (lower.includes('d-m-yy') || lower.includes('dd-mm-yy')) return `${d}-${m}-${yy}`;
  return formatUtcDateValue(val);
}

function parseIsoDateToUtcDate(rawVal: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(rawVal.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const hh = m[4] ? Number(m[4]) : 0;
  const mm = m[5] ? Number(m[5]) : 0;
  const ss = m[6] ? Number(m[6]) : 0;
  const dt = new Date(Date.UTC(y, mo, d, hh, mm, ss));
  return isNaN(dt.getTime()) ? null : dt;
}

function extractCellDisplayValue(cell: ExcelJS.Cell): {
  value: string | number | boolean | null;
  displayText?: string;
  formula?: string;
} {
  const val: any = cell.value;
  if (val === null || val === undefined) return { value: '' };

  if (typeof val === 'number') {
    const rawText = typeof cell.text === 'string' ? cell.text.trim() : '';
    const displayText =
      rawText && rawText !== String(val) && !/\[object/i.test(rawText) ? rawText : undefined;
    return { value: val, displayText };
  }

  if (typeof val === 'string' || typeof val === 'boolean') {
    return { value: val };
  }

  if (val instanceof Date) {
    const utcValue = formatUtcDateValue(val);
    const numFmtStr = typeof cell.numFmt === 'string' ? cell.numFmt : '';
    const displayText =
      numFmtStr && numFmtStr !== 'General' ? formatUtcDateWithNumFmt(val, numFmtStr) : undefined;
    return { value: utcValue, displayText };
  }

  if (typeof val === 'object') {
    if (Array.isArray(val.richText)) {
      return { value: val.richText.map((rt: any) => rt?.text || '').join('') };
    }
    if (typeof val.formula === 'string' || typeof val.sharedFormula === 'string') {
      const res = val.result;
      let display: string | number | boolean | null = '';
      let displayText: string | undefined;
      if (res instanceof Date) {
        display = formatUtcDateValue(res);
        const numFmtStr = typeof cell.numFmt === 'string' ? cell.numFmt : '';
        if (numFmtStr && numFmtStr !== 'General') {
          displayText = formatUtcDateWithNumFmt(res, numFmtStr);
        }
      } else if (res && typeof res === 'object' && res.error) {
        display = String(res.error);
      } else if (res !== undefined && res !== null) {
        display = res;
        if (typeof res === 'number') {
          const rawText = typeof cell.text === 'string' ? cell.text.trim() : '';
          if (rawText && rawText !== String(res) && !/\[object/i.test(rawText)) {
            displayText = rawText;
          }
        }
      } else if (cell.text) {
        display = cell.text;
      }
      return {
        value: display,
        displayText,
        formula: val.formula ? `=${val.formula}` : undefined
      };
    }
    if (typeof val.hyperlink === 'string') {
      return { value: val.text || val.hyperlink };
    }
    if (typeof val.text === 'string') {
      return { value: val.text };
    }
    if (val.error) {
      return { value: String(val.error) };
    }
  }

  return { value: cell.text || '' };
}

export function arrayBufferToBase64DataUrl(buffer: ArrayBuffer | Uint8Array, mime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...Array.from(chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

export function base64ToUint8Array(rawBase64: string): Uint8Array {
  const clean = rawBase64.includes(',') ? rawBase64.split(',')[1] : rawBase64;
  const binaryStr = atob(clean);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

export async function parseExcelFileToUploadedDocument(
  file: File,
  uploadedBy: string,
  folderId?: string
): Promise<Omit<UploadedDocument, 'id'>> {
  const buffer = await file.arrayBuffer();
  const ext = (file.name.split('.').pop() || '').toLowerCase();

  let workingBuffer: ArrayBuffer = buffer;
  let rawBase64 = '';

  // For legacy .xls or .csv files, upgrade cleanly to .xlsx binary via SheetJS -> ExcelJS preserving types & numFmt
  if (ext === 'xls' || ext === 'csv') {
    const XLSX = await import('xlsx');
    const wbLegacy = XLSX.read(buffer, { type: 'array', cellDates: false, cellNF: true, cellStyles: true, raw: true });
    const convertedWb = new ExcelJS.Workbook();
    const excelEpochMs = Date.UTC(1899, 11, 30);
    for (const sName of wbLegacy.SheetNames) {
      const wsLegacy = wbLegacy.Sheets[sName];
      const wsNew = convertedWb.addWorksheet((sName || 'Hoja').substring(0, 31));
      const refStr = wsLegacy?.['!ref'];
      if (refStr) {
        const range = XLSX.utils.decode_range(refStr);
        for (let r = range.s.r; r <= range.e.r; r++) {
          const excelRow = wsNew.getRow(r + 1);
          for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            const wsCell = wsLegacy[addr];
            if (!wsCell) continue;
            const targetCell = excelRow.getCell(c + 1);
            const zFmt = typeof wsCell.z === 'string' && wsCell.z !== 'General' ? wsCell.z : undefined;
            if (wsCell.t === 'n' && typeof wsCell.v === 'number' && zFmt && isExcelDateNumFmt(zFmt)) {
              targetCell.value = new Date(excelEpochMs + Math.round(wsCell.v * 86400000));
            } else if (wsCell.f) {
              targetCell.value = { formula: String(wsCell.f), result: wsCell.v ?? undefined };
            } else {
              targetCell.value = wsCell.v ?? wsCell.w ?? '';
            }
            if (zFmt) targetCell.numFmt = zFmt;
          }
        }
        if (Array.isArray(wsLegacy['!merges'])) {
          for (const m of wsLegacy['!merges']) {
            try {
              wsNew.mergeCells(m.s.r + 1, m.s.c + 1, m.e.r + 1, m.e.c + 1);
            } catch {}
          }
        }
      }
    }
    const xlsxOut = await convertedWb.xlsx.writeBuffer();
    workingBuffer = xlsxOut as ArrayBuffer;
    rawBase64 = arrayBufferToBase64DataUrl(workingBuffer);
  } else {
    rawBase64 = arrayBufferToBase64DataUrl(workingBuffer);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(workingBuffer);

  if (!workbook.worksheets || workbook.worksheets.length === 0) {
    throw new Error('El archivo Excel no contiene hojas de cálculo.');
  }

  const extractedSheets: UploadedDocumentSheet[] = [];
  let maxColsGlobal = 0;
  let totalRowsGlobal = 0;

  for (const ws of workbook.worksheets) {
    const actualRows = Math.max(ws.rowCount || 0, 1);
    let maxColCount = Math.max(ws.columnCount || 0, 1);

    // Check merges to make sure grid dimensions include all merged spans
    const rawMerges: string[] = Array.isArray((ws as any).model?.merges) ? (ws as any).model.merges : [];
    const parsedMerges: ExcelMergeRange[] = [];
    for (const mStr of rawMerges) {
      const parsed = parseMergeString(mStr);
      if (parsed) {
        parsedMerges.push(parsed);
        if (parsed.endCol + 1 > maxColCount) maxColCount = parsed.endCol + 1;
      }
    }

    // Clamp overly large trailing empty dimensions (e.g. formatted 1000 blank rows) while keeping all styled/non-empty rows
    let lastNonEmptyRow = 0;
    let lastNonEmptyCol = 0;
    for (let r = 1; r <= actualRows; r++) {
      const row = ws.getRow(r);
      let rowHasAnyContentOrStyle = false;
      for (let c = 1; c <= maxColCount; c++) {
        const cell = row.getCell(c);
        const hasVal = cell.value !== null && cell.value !== undefined && cell.value !== '';
        const hasFill = Boolean(cell.fill && (cell.fill as any).type === 'pattern' && (cell.fill as any).fgColor);
        const hasBorder = Boolean(
          cell.border && (cell.border.top?.style || cell.border.bottom?.style || cell.border.left?.style || cell.border.right?.style)
        );
        if (hasVal || hasFill || hasBorder) {
          rowHasAnyContentOrStyle = true;
          if (c > lastNonEmptyCol) lastNonEmptyCol = c;
        }
      }
      if (rowHasAnyContentOrStyle) lastNonEmptyRow = r;
    }

    for (const m of parsedMerges) {
      if (m.endRow + 1 > lastNonEmptyRow) lastNonEmptyRow = m.endRow + 1;
      if (m.endCol + 1 > lastNonEmptyCol) lastNonEmptyCol = m.endCol + 1;
    }

    const finalRowCount = Math.max(lastNonEmptyRow, Math.min(actualRows, 10), 1);
    const finalColCount = Math.max(lastNonEmptyCol, Math.min(maxColCount, 6), 1);
    if (finalColCount > maxColsGlobal) maxColsGlobal = finalColCount;
    totalRowsGlobal += finalRowCount;

    const headers: string[] = [];
    const colWidths: number[] = [];
    for (let c = 1; c <= finalColCount; c++) {
      headers.push(getExcelColLetter(c - 1));
      const colObj = ws.getColumn(c);
      const charWidth = typeof colObj?.width === 'number' && colObj.width > 0 ? colObj.width : 14;
      colWidths.push(Math.max(56, Math.min(520, Math.round(charWidth * 7.8 + 10))));
    }

    const rows: (string | number | boolean | null)[][] = [];
    const rowHeights: Record<number, number> = {};
    const cellStyles: Record<string, CellStyleInfo> = {};
    const cellFormulas: Record<string, string> = {};
    const cellDisplayValues: Record<string, string> = {};

    for (let r = 1; r <= finalRowCount; r++) {
      const excelRow = ws.getRow(r);
      const rIdx = r - 1;
      if (typeof excelRow.height === 'number' && excelRow.height > 0) {
        rowHeights[rIdx] = Math.max(22, Math.round(excelRow.height * 1.333));
      }

      const rowArr: (string | number | boolean | null)[] = [];
      for (let c = 1; c <= finalColCount; c++) {
        const cIdx = c - 1;
        const cell = excelRow.getCell(c);
        // Resolve merged slave cells safely: only keep value on top-left or standalone
        const extracted = extractCellDisplayValue(cell);
        rowArr.push(extracted.value);
        if (extracted.formula) {
          cellFormulas[`${rIdx}-${cIdx}`] = extracted.formula;
        }
        if (extracted.displayText) {
          cellDisplayValues[`${rIdx}-${cIdx}`] = extracted.displayText;
        }

        const styleInfo: CellStyleInfo = {};
        let hasStyle = false;

        // Fill
        const fill: any = cell.fill;
        if (fill && fill.type === 'pattern' && fill.pattern !== 'none') {
          const bg = resolveExcelColor(fill.fgColor);
          if (bg) {
            styleInfo.bgColor = bg;
            hasStyle = true;
          }
        }

        // Font
        const font: any = cell.font;
        if (font) {
          const textColor = resolveExcelColor(font.color);
          if (textColor) {
            styleInfo.textColor = textColor;
            hasStyle = true;
          }
          if (font.bold) { styleInfo.bold = true; hasStyle = true; }
          if (font.italic) { styleInfo.italic = true; hasStyle = true; }
          if (font.underline) { styleInfo.underline = true; hasStyle = true; }
          if (font.strike) { styleInfo.strike = true; hasStyle = true; }
          if (typeof font.size === 'number') { styleInfo.fontSize = font.size; hasStyle = true; }
          if (typeof font.name === 'string') { styleInfo.fontFamily = font.name; hasStyle = true; }
        }

        // Alignment
        const align: any = cell.alignment;
        if (align) {
          if (align.horizontal && ['left', 'center', 'right', 'justify'].includes(align.horizontal)) {
            styleInfo.align = align.horizontal;
            hasStyle = true;
          }
          if (align.vertical && ['top', 'middle', 'bottom'].includes(align.vertical)) {
            styleInfo.valign = align.vertical;
            hasStyle = true;
          }
          if (align.wrapText) {
            styleInfo.wrapText = true;
            hasStyle = true;
          }
        }

        // Borders
        const border: any = cell.border;
        if (border) {
          const bt = resolveBorderCss(border.top);
          const br = resolveBorderCss(border.right);
          const bb = resolveBorderCss(border.bottom);
          const bl = resolveBorderCss(border.left);
          if (bt) { styleInfo.borderTop = bt; hasStyle = true; }
          if (br) { styleInfo.borderRight = br; hasStyle = true; }
          if (bb) { styleInfo.borderBottom = bb; hasStyle = true; }
          if (bl) { styleInfo.borderLeft = bl; hasStyle = true; }
        }

        if (cell.numFmt && cell.numFmt !== 'General') {
          styleInfo.numFmt = String(cell.numFmt);
          hasStyle = true;
        }

        if (hasStyle) {
          cellStyles[`${rIdx}-${cIdx}`] = styleInfo;
        }
      }
      rows.push(rowArr);
    }

    const firstView: any = Array.isArray(ws.views) && ws.views[0] ? ws.views[0] : {};

    extractedSheets.push({
      name: ws.name || `Hoja ${extractedSheets.length + 1}`,
      headers,
      rows,
      totalRows: rows.length,
      totalColumns: headers.length,
      colWidths,
      rowHeights,
      merges: parsedMerges,
      cellStyles,
      cellFormulas,
      cellDisplayValues: Object.keys(cellDisplayValues).length > 0 ? cellDisplayValues : undefined,
      isRawGrid: true,
      showGridLines: firstView.showGridLines !== false,
      frozenRows: typeof firstView.ySplit === 'number' ? firstView.ySplit : 0,
      frozenCols: typeof firstView.xSplit === 'number' ? firstView.xSplit : 0
    });
  }

  return {
    name: file.name,
    uploadDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    uploadedBy,
    sizeBytes: file.size || workingBuffer.byteLength,
    type: ext === 'csv' ? 'csv' : 'excel',
    mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    originalExtension: ext || 'xlsx',
    sheets: extractedSheets,
    totalRows: totalRowsGlobal,
    totalColumns: maxColsGlobal,
    rawBase64,
    folderId: folderId || undefined
  };
}

const EXTENSION_MIME_MAP: Record<string, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  csv: 'text/csv;charset=utf-8',
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  bmp: 'image/bmp',
  txt: 'text/plain;charset=utf-8',
  json: 'application/json;charset=utf-8',
  zip: 'application/zip'
};

export function inferMimeFromFile(fileName: string, providedMime?: string): string {
  const ext = (fileName.split('.').pop() || '').toLowerCase();
  if (ext && EXTENSION_MIME_MAP[ext]) return EXTENSION_MIME_MAP[ext];
  if (providedMime && !/html|svg|javascript/i.test(providedMime)) return providedMime;
  return 'application/octet-stream';
}

export async function parseUniversalFileToUploadedDocument(
  file: File,
  uploadedBy: string,
  folderId?: string
): Promise<Omit<UploadedDocument, 'id'>> {
  const ext = (file.name.split('.').pop() || '').toLowerCase();
  if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
    return parseExcelFileToUploadedDocument(file, uploadedBy, folderId);
  }

  const buffer = await file.arrayBuffer();
  const safeMime = inferMimeFromFile(file.name, file.type);
  const rawBase64 = arrayBufferToBase64DataUrl(buffer, safeMime);
  const nowIso = new Date().toISOString();

  let docType: UploadedDocument['type'] = 'otro';
  if (ext === 'pdf' || safeMime === 'application/pdf') {
    docType = 'pdf';
  } else if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext) || /^image\/(png|jpeg|jpg|webp|gif|bmp)$/i.test(safeMime)) {
    docType = 'image';
  }

  return {
    name: file.name,
    uploadDate: nowIso,
    updatedAt: nowIso,
    uploadedBy,
    sizeBytes: file.size || buffer.byteLength,
    type: docType,
    mimeType: safeMime,
    originalExtension: ext || undefined,
    sheets: [],
    totalRows: 0,
    totalColumns: 0,
    rawBase64,
    folderId: folderId || undefined
  };
}

export async function rebuildWorkbookBase64FromDoc(doc: UploadedDocument): Promise<string> {
  const wb = new ExcelJS.Workbook();
  let loadedFromRaw = false;

  if (doc.rawBase64) {
    try {
      const bytes = base64ToUint8Array(doc.rawBase64);
      await wb.xlsx.load(bytes.buffer as ArrayBuffer);
      loadedFromRaw = wb.worksheets.length > 0;
    } catch (e) {
      console.warn('Could not load rawBase64 into ExcelJS, rebuilding cleanly from sheets:', e);
    }
  }

  if (!loadedFromRaw) {
    wb.creator = doc.uploadedBy || 'Departamento de Ingeniería';
    wb.created = new Date(doc.uploadDate || Date.now());
  }
  wb.modified = new Date();

  const existingNames = new Set(wb.worksheets.map(w => w.name));

  (doc.sheets || []).forEach((sheet, sIdx) => {
    const targetName = (sheet.name || `Hoja ${sIdx + 1}`).substring(0, 31);
    let ws = wb.getWorksheet(targetName) || wb.worksheets[sIdx];
    if (!ws) {
      let uniqueName = targetName;
      let suffix = 1;
      while (existingNames.has(uniqueName)) {
        uniqueName = `${targetName.substring(0, 27)}_${suffix++}`;
      }
      ws = wb.addWorksheet(uniqueName);
      existingNames.add(uniqueName);
    }

    const rowOffset = sheet.isRawGrid ? 1 : 2;

    // If legacy non-rawGrid sheet, write header row at row 1
    if (!sheet.isRawGrid && Array.isArray(sheet.headers)) {
      const headerRow = ws.getRow(1);
      sheet.headers.forEach((h, cIdx) => {
        const cell = headerRow.getCell(cIdx + 1);
        cell.value = h ?? '';
        cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      });
    }

    // Column widths
    if (Array.isArray(sheet.colWidths)) {
      sheet.colWidths.forEach((px, cIdx) => {
        const col = ws.getColumn(cIdx + 1);
        col.width = Math.max(8, Math.round((px - 10) / 7.8));
      });
    }

    // Data rows + styles
    (sheet.rows || []).forEach((rowArr, rIdx) => {
      const excelRowNum = rIdx + rowOffset;
      const excelRow = ws.getRow(excelRowNum);
      if (sheet.rowHeights && sheet.rowHeights[rIdx]) {
        excelRow.height = Math.max(16, Math.round(sheet.rowHeights[rIdx] / 1.333));
      }

      const numCols = Math.max(rowArr.length, sheet.headers?.length || 0);
      for (let cIdx = 0; cIdx < numCols; cIdx++) {
        const coord = `${rIdx}-${cIdx}`;
        const cell = excelRow.getCell(cIdx + 1);
        const formula = sheet.cellFormulas?.[coord];
        const rawVal = rowArr[cIdx];
        const st = sheet.cellStyles?.[coord];
        const targetNumFmt = st?.numFmt || '';

        const existingExtracted = loadedFromRaw ? extractCellDisplayValue(cell) : null;
        const existingFormula = existingExtracted?.formula || '';
        const targetFormula = formula || '';
        const existingValStr =
          existingExtracted && existingExtracted.value !== null && existingExtracted.value !== undefined
            ? String(existingExtracted.value)
            : '';
        const targetValStr = rawVal === null || rawVal === undefined ? '' : String(rawVal);
        const existingNumFmt = cell.numFmt && cell.numFmt !== 'General' ? String(cell.numFmt) : '';
        const isCellValueUnchanged =
          loadedFromRaw &&
          existingValStr === targetValStr &&
          existingFormula === targetFormula &&
          existingNumFmt === targetNumFmt;

        if (!isCellValueUnchanged) {
          if (formula && formula.startsWith('=')) {
            cell.value = { formula: formula.slice(1), result: rawVal ?? undefined };
          } else if (typeof rawVal === 'number') {
            cell.value = rawVal;
          } else if (typeof rawVal === 'string') {
            const trimmed = rawVal.trim();
            const parsedUtcDate =
              (isExcelDateNumFmt(targetNumFmt) || cell.value instanceof Date)
                ? parseIsoDateToUtcDate(trimmed)
                : null;
            if (parsedUtcDate) {
              cell.value = parsedUtcDate;
            } else if (
              trimmed !== '' &&
              !/^0\d+/.test(trimmed) &&
              /^-?(0|[1-9]\d*)(\.\d+)?$/.test(trimmed) &&
              // Avoid turning Spanish thousands like "1.250" into 1.25 when numFmt is missing or uses '.' grouping
              !(/^\d{1,3}(\.\d{3})+$/.test(trimmed) && targetNumFmt.includes(',')) &&
              isFinite(Number(trimmed))
            ) {
              cell.value = Number(trimmed);
            } else {
              cell.value = rawVal;
            }
          } else {
            cell.value = rawVal ?? '';
          }
        }

        if (st) {
          if (st.numFmt && cell.numFmt !== st.numFmt) {
            cell.numFmt = st.numFmt;
          }
          if (st.bgColor) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: hexToArgb(st.bgColor) }
            };
          } else if (loadedFromRaw && cell.fill) {
            cell.fill = { type: 'pattern', pattern: 'none' };
          }
          if (st.textColor || st.bold !== undefined || st.italic !== undefined || st.underline !== undefined || st.strike !== undefined || st.fontSize || st.fontFamily || (loadedFromRaw && cell.font)) {
            cell.font = {
              ...(cell.font || {}),
              ...(st.fontFamily ? { name: st.fontFamily } : {}),
              ...(st.fontSize ? { size: st.fontSize } : {}),
              bold: Boolean(st.bold),
              italic: Boolean(st.italic),
              underline: Boolean(st.underline),
              strike: Boolean(st.strike),
              ...(st.textColor ? { color: { argb: hexToArgb(st.textColor) } } : {})
            };
          }
          if (st.align || st.valign || st.wrapText !== undefined || (loadedFromRaw && cell.alignment)) {
            cell.alignment = {
              ...(cell.alignment || {}),
              horizontal: st.align,
              vertical: st.valign,
              wrapText: Boolean(st.wrapText)
            };
          }
          const parseSide = (css?: string) => {
            if (!css) return undefined;
            const hexMatch = /#[0-9A-Fa-f]{6}/.exec(css);
            const style = css.includes('2px') ? 'medium' : css.includes('3px') ? 'thick' : css.includes('dashed') ? 'dashed' : 'thin';
            return {
              style: style as ExcelJS.BorderStyle,
              color: { argb: hexMatch ? hexToArgb(hexMatch[0]) : 'FF94A3B8' }
            };
          };
          if (st.borderTop || st.borderRight || st.borderBottom || st.borderLeft) {
            cell.border = {
              ...(cell.border || {}),
              ...(st.borderTop ? { top: parseSide(st.borderTop) } : {}),
              ...(st.borderRight ? { right: parseSide(st.borderRight) } : {}),
              ...(st.borderBottom ? { bottom: parseSide(st.borderBottom) } : {}),
              ...(st.borderLeft ? { left: parseSide(st.borderLeft) } : {})
            };
          }
        }
      }
    });

    // Ensure merges exist if built from scratch
    if (!loadedFromRaw && Array.isArray(sheet.merges)) {
      for (const m of sheet.merges) {
        try {
          ws.mergeCells(m.startRow + rowOffset, m.startCol + 1, m.endRow + rowOffset, m.endCol + 1);
        } catch {}
      }
    }
  });

  const outBuf = await wb.xlsx.writeBuffer();
  return arrayBufferToBase64DataUrl(outBuf as ArrayBuffer);
}

export type ExcelTemplateType = 'hoja_vida_equipo' | 'control_mantenimiento' | 'en_blanco';

export async function createExcelDocumentFromTemplate(
  templateType: ExcelTemplateType,
  fileName: string,
  uploadedBy: string,
  folderId?: string
): Promise<Omit<UploadedDocument, 'id'>> {
  const safeFileName = fileName.trim().endsWith('.xlsx') ? fileName.trim() : `${fileName.trim()}.xlsx`;
  const nowStr = new Date().toISOString().split('T')[0];

  let sheets: UploadedDocumentSheet[] = [];

  if (templateType === 'hoja_vida_equipo') {
    const headers = ['A', 'B', 'C', 'D', 'E', 'F'];
    const rows: (string | number)[][] = [
      ['HOJA DE VIDA DE EQUIPO — INGENIERÍA Y MANTENIMIENTO', '', '', '', '', ''],
      ['Código / TAG:', 'EQ-001', 'Fecha Registro:', nowStr, 'Estado:', 'OPERATIVO'],
      ['Nombre del Equipo:', 'Bomba / Equipo Principal', 'Área / Ubicación:', 'Cuarto de Máquinas', 'Criticidad:', 'ALTA'],
      ['Marca:', '', 'Modelo:', '', 'No. Serie:', ''],
      ['Voltaje / Fases:', '220V / 3F / 60Hz', 'Potencia (HP / kW):', '', 'Amperaje Nominal:', ''],
      ['', '', '', '', '', ''],
      ['HISTORIAL DE INTERVENCIONES Y MANTENIMIENTOS', '', '', '', '', ''],
      ['Fecha', 'Tipo de Trabajo', 'Descripción Técnica Realizada', 'Repuestos / Materiales', 'Responsable', 'Observaciones'],
      [nowStr, 'Preventivo', 'Inspección inicial y registro de parámetros nominales', 'N/A', uploadedBy, 'Equipo en óptimas condiciones'],
      ['', '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['', '', '', '', '', '']
    ];
    const thinBorder = '1px solid #CBD5E1';
    const cellStyles: Record<string, CellStyleInfo> = {};
    // Banner Row 0
    for (let c = 0; c < 6; c++) {
      cellStyles[`0-${c}`] = { bgColor: '#0F172A', textColor: '#FFFFFF', bold: true, fontSize: 13, align: 'center', valign: 'middle', borderTop: thinBorder, borderBottom: thinBorder, borderLeft: thinBorder, borderRight: thinBorder };
    }
    // Metadata rows 1..4
    for (let r = 1; r <= 4; r++) {
      for (let c = 0; c < 6; c++) {
        const isLabel = c % 2 === 0;
        cellStyles[`${r}-${c}`] = {
          bgColor: isLabel ? '#F1F5F9' : '#FFFFFF',
          textColor: '#0F172A',
          bold: isLabel,
          fontSize: 11,
          align: 'left',
          valign: 'middle',
          borderTop: thinBorder, borderBottom: thinBorder, borderLeft: thinBorder, borderRight: thinBorder
        };
      }
    }
    // Sub-banner Row 6
    for (let c = 0; c < 6; c++) {
      cellStyles[`6-${c}`] = { bgColor: '#065F46', textColor: '#FFFFFF', bold: true, fontSize: 11, align: 'center', valign: 'middle', borderTop: thinBorder, borderBottom: thinBorder, borderLeft: thinBorder, borderRight: thinBorder };
    }
    // Table Header Row 7
    for (let c = 0; c < 6; c++) {
      cellStyles[`7-${c}`] = { bgColor: '#D1FAE5', textColor: '#064E3B', bold: true, fontSize: 11, align: 'center', valign: 'middle', borderTop: thinBorder, borderBottom: '2px solid #059669', borderLeft: thinBorder, borderRight: thinBorder };
    }
    // Table rows 8..11
    for (let r = 8; r <= 11; r++) {
      for (let c = 0; c < 6; c++) {
        cellStyles[`${r}-${c}`] = { bgColor: '#FFFFFF', textColor: '#1E293B', fontSize: 11, valign: 'middle', borderTop: thinBorder, borderBottom: thinBorder, borderLeft: thinBorder, borderRight: thinBorder };
      }
    }
    sheets = [{
      name: 'Hoja de Vida',
      headers,
      rows,
      totalRows: rows.length,
      totalColumns: headers.length,
      colWidths: [140, 170, 260, 190, 150, 200],
      rowHeights: { 0: 36, 6: 30, 7: 28 },
      merges: [
        { startRow: 0, startCol: 0, endRow: 0, endCol: 5 },
        { startRow: 6, startCol: 0, endRow: 6, endCol: 5 }
      ],
      cellStyles,
      isRawGrid: true,
      showGridLines: true
    }];
  } else if (templateType === 'control_mantenimiento') {
    const headers = ['A', 'B', 'C', 'D', 'E', 'F'];
    const rows: (string | number)[][] = [
      ['CONTROL DE MANTENIMIENTO E INSPECCIONES DE EQUIPOS', '', '', '', '', ''],
      ['TAG Equipo', 'Nombre del Equipo', 'Ubicación / Área', 'Frecuencia', 'Última Revisión', 'Estado'],
      ['BOM-01', 'Bomba Hidroneumática #1', 'Cuarto de Bombas', 'Mensual', nowStr, 'Óptimo'],
      ['CAL-01', 'Caldera Principal', 'Sala de Calderas', 'Quincenal', nowStr, 'Óptimo'],
      ['', '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['', '', '', '', '', ''],
      ['', '', '', '', '', '']
    ];
    const thinBorder = '1px solid #CBD5E1';
    const cellStyles: Record<string, CellStyleInfo> = {};
    for (let c = 0; c < 6; c++) {
      cellStyles[`0-${c}`] = { bgColor: '#1E3A8A', textColor: '#FFFFFF', bold: true, fontSize: 12, align: 'center', valign: 'middle', borderTop: thinBorder, borderBottom: thinBorder, borderLeft: thinBorder, borderRight: thinBorder };
      cellStyles[`1-${c}`] = { bgColor: '#DBEAFE', textColor: '#1E3A8A', bold: true, fontSize: 11, align: 'center', valign: 'middle', borderTop: thinBorder, borderBottom: '2px solid #2563EB', borderLeft: thinBorder, borderRight: thinBorder };
    }
    for (let r = 2; r < rows.length; r++) {
      for (let c = 0; c < 6; c++) {
        cellStyles[`${r}-${c}`] = { bgColor: '#FFFFFF', textColor: '#0F172A', fontSize: 11, valign: 'middle', borderTop: thinBorder, borderBottom: thinBorder, borderLeft: thinBorder, borderRight: thinBorder };
      }
    }
    sheets = [{
      name: 'Control Equipos',
      headers,
      rows,
      totalRows: rows.length,
      totalColumns: headers.length,
      colWidths: [130, 220, 190, 130, 140, 130],
      rowHeights: { 0: 34, 1: 28 },
      merges: [{ startRow: 0, startCol: 0, endRow: 0, endCol: 5 }],
      cellStyles,
      isRawGrid: true,
      showGridLines: true
    }];
  } else {
    const cols = 8;
    const rowsCount = 15;
    const headers = Array.from({ length: cols }, (_, i) => getExcelColLetter(i));
    const rows = Array.from({ length: rowsCount }, () => Array.from({ length: cols }, () => ''));
    sheets = [{
      name: 'Hoja1',
      headers,
      rows,
      totalRows: rowsCount,
      totalColumns: cols,
      colWidths: Array.from({ length: cols }, () => 135),
      rowHeights: {},
      merges: [],
      cellStyles: {},
      isRawGrid: true,
      showGridLines: true
    }];
  }

  const draftDoc: UploadedDocument = {
    id: `temp-${Date.now()}`,
    name: safeFileName,
    uploadDate: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    uploadedBy,
    sizeBytes: 0,
    type: 'excel',
    sheets,
    totalRows: sheets[0].rows.length,
    totalColumns: sheets[0].headers.length,
    folderId: folderId || undefined
  };

  const rawBase64 = await rebuildWorkbookBase64FromDoc(draftDoc);
  const approxBytes = Math.round((rawBase64.length * 3) / 4);

  return {
    name: safeFileName,
    uploadDate: draftDoc.uploadDate,
    updatedAt: draftDoc.updatedAt,
    uploadedBy,
    sizeBytes: approxBytes,
    type: 'excel',
    sheets,
    totalRows: draftDoc.totalRows,
    totalColumns: draftDoc.totalColumns,
    rawBase64,
    folderId: folderId || undefined
  };
}

// Shared Web Worker instance for off-thread .xlsx serialization
let sharedExcelWorker: Worker | null = null;
let workerReqSeq = 0;

export async function rebuildWorkbookBase64FromDocOffThread(doc: UploadedDocument): Promise<string> {
  if (typeof Worker === 'undefined') {
    return rebuildWorkbookBase64FromDoc(doc);
  }
  try {
    if (!sharedExcelWorker) {
      sharedExcelWorker = new Worker(
        new URL('../workers/excelRebuildWorker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    const worker = sharedExcelWorker;
    const reqId = ++workerReqSeq;
    return await new Promise<string>((resolve) => {
      let settled = false;
      const timeoutId = setTimeout(() => {
        if (!settled) {
          settled = true;
          worker.removeEventListener('message', onMsg);
          rebuildWorkbookBase64FromDoc(doc).then(resolve);
        }
      }, 15000);

      const onMsg = (e: MessageEvent<any>) => {
        if (!e.data || e.data.requestId !== reqId) return;
        if (!settled) {
          settled = true;
          clearTimeout(timeoutId);
          worker.removeEventListener('message', onMsg);
          if (e.data.ok && typeof e.data.rawBase64 === 'string') {
            resolve(e.data.rawBase64);
          } else {
            rebuildWorkbookBase64FromDoc(doc).then(resolve);
          }
        }
      };

      worker.addEventListener('message', onMsg);
      worker.postMessage({ requestId: reqId, doc });
    });
  } catch {
    return rebuildWorkbookBase64FromDoc(doc);
  }
}

export function createSafeDocumentBlobUrl(doc: UploadedDocument): { url: string; mime: string } | null {
  if (!doc.rawBase64) return null;
  const rawMime = doc.mimeType || inferMimeFromFile(doc.name);
  const safePreviewAllowed =
    rawMime === 'application/pdf' ||
    /^image\/(png|jpeg|jpg|webp|gif|bmp)$/i.test(rawMime) ||
    rawMime.startsWith('text/plain');
  if (!safePreviewAllowed) return null;
  const bytes = base64ToUint8Array(doc.rawBase64);
  const blob = new Blob([bytes], { type: rawMime });
  return { url: URL.createObjectURL(blob), mime: rawMime };
}

export async function openDocumentInComputerExcel(doc: UploadedDocument): Promise<void> {
  const isSpreadsheet = doc.type === 'excel' || doc.type === 'csv';
  const hasAnyExt = /\.[a-z0-9]{1,8}$/i.test(doc.name);
  const fallbackExt = doc.originalExtension
    ? `.${doc.originalExtension.replace(/^\./, '')}`
    : isSpreadsheet
      ? '.xlsx'
      : doc.type === 'pdf'
        ? '.pdf'
        : '';
  const safeName = hasAnyExt ? doc.name : `${doc.name}${fallbackExt}`;

  // Ensure exact binary is used (either original preserved rawBase64 or rebuilt with full styles when edited in-app)
  let base64ToUse = doc.rawBase64;
  if (isSpreadsheet && doc.sheetsModifiedAfterRaw) {
    base64ToUse = await rebuildWorkbookBase64FromDocOffThread(doc);
  }
  if (!base64ToUse && doc.id && !doc.sheetsModifiedAfterRaw) {
    try {
      const res = await fetch(`/api/uploaded-documents/${encodeURIComponent(doc.id)}/download?_t=${Date.now()}`, { cache: 'no-store' });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = safeName;
        a.rel = 'noopener';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 4000);
        return;
      }
    } catch {}
  }

  if (!base64ToUse && isSpreadsheet) {
    base64ToUse = await rebuildWorkbookBase64FromDocOffThread(doc);
  }
  if (!base64ToUse) {
    throw new Error('No se encontró el binario original del archivo.');
  }

  const bytes = base64ToUint8Array(base64ToUse);
  const mime = doc.mimeType || inferMimeFromFile(safeName);
  const blob = new Blob([bytes], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = safeName;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
