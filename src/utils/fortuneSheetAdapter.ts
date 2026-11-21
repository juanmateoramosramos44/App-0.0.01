import type { Cell, CellWithRowAndCol, Sheet } from '@fortune-sheet/core';
import type {
  CellStyleInfo,
  ExcelMergeRange,
  UploadedDocument,
  UploadedDocumentSheet
} from '../types';
import { getExcelColLetter } from './excelEngine';

// Mapeo exacto entre CSS de borde (ExcelJS -> App) y códigos numéricos de borde de FortuneSheet
// 1: thin, 3: dotted, 4: dashed, 7: double, 8: medium, 13: thick
function cssBorderToFortuneSide(css?: string): { style: number; color: string } | undefined {
  if (!css) return undefined;
  const trimmed = css.trim();
  if (!trimmed) return undefined;
  const colorMatch = /#[0-9A-Fa-f]{3,8}/.exec(trimmed);
  const color = colorMatch ? colorMatch[0].toUpperCase() : '#94A3B8';
  let style = 1; // thin
  if (trimmed.includes('double')) style = 7;
  else if (trimmed.includes('3px') || trimmed.includes('thick')) style = 13;
  else if (trimmed.includes('2px') || trimmed.includes('medium')) style = 8;
  else if (trimmed.includes('dashed')) style = 4;
  else if (trimmed.includes('dotted')) style = 3;
  return { style, color };
}

function fortuneSideToCssBorder(side: any): string | undefined {
  if (!side || typeof side !== 'object') return undefined;
  const color = typeof side.color === 'string' && side.color ? side.color : '#94A3B8';
  const styleNum = Number(side.style || 1);
  if (styleNum === 7) return `3px double ${color}`;
  if (styleNum === 13) return `3px solid ${color}`;
  if (styleNum === 8) return `2px solid ${color}`;
  if (styleNum === 4 || styleNum === 9) return `1px dashed ${color}`;
  if (styleNum === 3) return `1px dotted ${color}`;
  return `1px solid ${color}`;
}

function alignToFortuneHt(align?: CellStyleInfo['align']): number | undefined {
  if (align === 'center') return 0;
  if (align === 'left') return 1;
  if (align === 'right') return 2;
  return undefined;
}

function fortuneHtToAlign(ht?: number): CellStyleInfo['align'] | undefined {
  if (ht === 0) return 'center';
  if (ht === 1) return 'left';
  if (ht === 2) return 'right';
  return undefined;
}

function valignToFortuneVt(valign?: CellStyleInfo['valign']): number | undefined {
  if (valign === 'middle') return 0;
  if (valign === 'top') return 1;
  if (valign === 'bottom') return 2;
  return undefined;
}

function fortuneVtToValign(vt?: number): CellStyleInfo['valign'] | undefined {
  if (vt === 0) return 'middle';
  if (vt === 1) return 'top';
  if (vt === 2) return 'bottom';
  return undefined;
}

/**
 * Convierte el UploadedDocument almacenado en PostgreSQL a formato Sheet[] de FortuneSheet
 * conservando colores, bordes, anchos de columna, alturas de fila, merges, fuentes, alineación,
 * paneles congelados y fórmulas al 100%.
 */
export function uploadedDocToFortuneSheets(doc: UploadedDocument): Sheet[] {
  const sourceSheets = doc.sheets && doc.sheets.length > 0 ? doc.sheets : [];

  return sourceSheets.map((sheet, sIdx) => {
    const isRawGrid = sheet.isRawGrid !== false;
    const rowOffset = isRawGrid ? 0 : 1;

    const rawRows = Array.isArray(sheet.rows) ? sheet.rows : [];
    const headerLen = Array.isArray(sheet.headers) ? sheet.headers.length : 0;
    const maxRowWidth = rawRows.reduce((max, r) => Math.max(max, Array.isArray(r) ? r.length : 0), headerLen);

    const dataRowCount = rawRows.length + rowOffset;
    const minVisibleRows = Math.max(dataRowCount + 12, 35);
    const minVisibleCols = Math.max(maxRowWidth + 4, 16);

    const columnlen: Record<string, number> = {};
    if (Array.isArray(sheet.colWidths)) {
      sheet.colWidths.forEach((px, cIdx) => {
        if (typeof px === 'number' && px > 0) {
          columnlen[String(cIdx)] = Math.round(px);
        }
      });
    } else if (!isRawGrid && Array.isArray(sheet.headers)) {
      sheet.headers.forEach((_, cIdx) => {
        columnlen[String(cIdx)] = 140;
      });
    }

    const rowlen: Record<string, number> = {};
    if (sheet.rowHeights) {
      Object.entries(sheet.rowHeights).forEach(([rKey, px]) => {
        const rNum = Number(rKey);
        if (!isNaN(rNum) && typeof px === 'number' && px > 0) {
          rowlen[String(rNum + rowOffset)] = Math.round(px);
        }
      });
    }

    const mergeMap: Record<string, { r: number; c: number; rs: number; cs: number }> = {};
    const mergeMasterByCoord = new Map<string, { r: number; c: number; rs: number; cs: number }>();
    const mergeSlaveByCoord = new Map<string, { r: number; c: number }>();

    if (Array.isArray(sheet.merges)) {
      for (const m of sheet.merges) {
        const sr = m.startRow + rowOffset;
        const sc = m.startCol;
        const rs = Math.max(1, m.endRow - m.startRow + 1);
        const cs = Math.max(1, m.endCol - m.startCol + 1);
        if (rs === 1 && cs === 1) continue;
        const mcMaster = { r: sr, c: sc, rs, cs };
        mergeMap[`${sr}_${sc}`] = mcMaster;
        mergeMasterByCoord.set(`${sr}-${sc}`, mcMaster);
        for (let r = sr; r < sr + rs; r++) {
          for (let c = sc; c < sc + cs; c++) {
            if (r === sr && c === sc) continue;
            mergeSlaveByCoord.set(`${r}-${c}`, { r: sr, c: sc });
          }
        }
      }
    }

    const borderInfo: any[] = [];
    const celldata: CellWithRowAndCol[] = [];
    const seenCoords = new Set<string>();

    // Si es hoja legacy (!isRawGrid), escribir encabezados en fila 0 con estilo corporativo
    if (!isRawGrid && Array.isArray(sheet.headers)) {
      sheet.headers.forEach((hdr, cIdx) => {
        seenCoords.add(`0-${cIdx}`);
        celldata.push({
          r: 0,
          c: cIdx,
          v: {
            v: hdr ?? '',
            m: String(hdr ?? ''),
            bg: sheet.headerBgColor || '#0F766E',
            fc: sheet.headerTextColor || '#FFFFFF',
            bl: 1,
            fs: 11,
            ht: 0,
            vt: 0
          }
        });
      });
    }

    // Recorrer filas de datos + estilos
    for (let rIdx = 0; rIdx < rawRows.length; rIdx++) {
      const fRow = rIdx + rowOffset;
      const rowArr = Array.isArray(rawRows[rIdx]) ? rawRows[rIdx] : [];
      const rowCols = Math.max(rowArr.length, maxRowWidth);

      for (let cIdx = 0; cIdx < rowCols; cIdx++) {
        const rawVal = rowArr[cIdx];
        const st = sheet.cellStyles?.[`${rIdx}-${cIdx}`];
        const formula = sheet.cellFormulas?.[`${rIdx}-${cIdx}`];
        const mcMaster = mergeMasterByCoord.get(`${fRow}-${cIdx}`);
        const mcSlave = mergeSlaveByCoord.get(`${fRow}-${cIdx}`);

        const hasVal = rawVal !== null && rawVal !== undefined && rawVal !== '';
        const hasFormula = Boolean(formula);
        const hasStyle = Boolean(st && Object.keys(st).length > 0);

        if (st && (st.borderTop || st.borderRight || st.borderBottom || st.borderLeft)) {
          borderInfo.push({
            rangeType: 'cell',
            value: {
              row_index: fRow,
              col_index: cIdx,
              t: cssBorderToFortuneSide(st.borderTop) || null,
              r: cssBorderToFortuneSide(st.borderRight) || null,
              b: cssBorderToFortuneSide(st.borderBottom) || null,
              l: cssBorderToFortuneSide(st.borderLeft) || null
            }
          });
        }

        if (!hasVal && !hasFormula && !hasStyle && !mcMaster && !mcSlave) {
          continue;
        }

        const cellObj: Cell = {};
        if (hasVal) {
          cellObj.v = rawVal as string | number | boolean;
          cellObj.m = String(rawVal);
        }
        if (hasFormula && formula) {
          cellObj.f = formula.startsWith('=') ? formula : `=${formula}`;
        }
        if (mcMaster) {
          cellObj.mc = mcMaster;
        } else if (mcSlave) {
          cellObj.mc = mcSlave;
        }

        if (st) {
          if (st.bgColor) cellObj.bg = st.bgColor;
          if (st.textColor) cellObj.fc = st.textColor;
          if (st.bold) cellObj.bl = 1;
          if (st.italic) cellObj.it = 1;
          if (st.underline) cellObj.un = 1;
          if (st.strike) cellObj.cl = 1;
          if (typeof st.fontSize === 'number') cellObj.fs = st.fontSize;
          if (typeof st.fontFamily === 'string' && st.fontFamily) cellObj.ff = st.fontFamily;
          const ht = alignToFortuneHt(st.align);
          if (ht !== undefined) cellObj.ht = ht;
          const vt = valignToFortuneVt(st.valign);
          if (vt !== undefined) cellObj.vt = vt;
          if (st.wrapText) cellObj.tb = '2';
          if (st.numFmt) {
            cellObj.ct = { fa: st.numFmt, t: typeof rawVal === 'number' ? 'n' : 'g' };
          }
        }

        seenCoords.add(`${fRow}-${cIdx}`);
        celldata.push({ r: fRow, c: cIdx, v: cellObj });
      }
    }

    // Celdas estilizadas fuera del rango de filas actual (si existieran)
    if (sheet.cellStyles) {
      Object.entries(sheet.cellStyles).forEach(([coord, st]) => {
        const [rStr, cStr] = coord.split('-');
        const rIdx = Number(rStr);
        const cIdx = Number(cStr);
        if (isNaN(rIdx) || isNaN(cIdx)) return;
        const fRow = rIdx + rowOffset;
        if (seenCoords.has(`${fRow}-${cIdx}`)) return;
        const cellObj: Cell = {};
        if (st.bgColor) cellObj.bg = st.bgColor;
        if (st.textColor) cellObj.fc = st.textColor;
        if (st.bold) cellObj.bl = 1;
        if (st.italic) cellObj.it = 1;
        if (st.underline) cellObj.un = 1;
        if (st.strike) cellObj.cl = 1;
        if (typeof st.fontSize === 'number') cellObj.fs = st.fontSize;
        if (typeof st.fontFamily === 'string' && st.fontFamily) cellObj.ff = st.fontFamily;
        const ht = alignToFortuneHt(st.align);
        if (ht !== undefined) cellObj.ht = ht;
        const vt = valignToFortuneVt(st.valign);
        if (vt !== undefined) cellObj.vt = vt;
        if (st.wrapText) cellObj.tb = '2';

        if (st.borderTop || st.borderRight || st.borderBottom || st.borderLeft) {
          borderInfo.push({
            rangeType: 'cell',
            value: {
              row_index: fRow,
              col_index: cIdx,
              t: cssBorderToFortuneSide(st.borderTop) || null,
              r: cssBorderToFortuneSide(st.borderRight) || null,
              b: cssBorderToFortuneSide(st.borderBottom) || null,
              l: cssBorderToFortuneSide(st.borderLeft) || null
            }
          });
        }
        celldata.push({ r: fRow, c: cIdx, v: cellObj });
      });
    }

    let frozen: Sheet['frozen'] = undefined;
    const fRows = (sheet.frozenRows || 0) + rowOffset;
    const fCols = sheet.frozenCols || 0;
    if (fRows > 0 && fCols > 0) {
      frozen = { type: 'rangeBoth', range: { row_focus: fRows - 1, column_focus: fCols - 1 } };
    } else if (fRows > 0) {
      frozen = { type: 'rangeRow', range: { row_focus: fRows - 1, column_focus: 0 } };
    } else if (fCols > 0) {
      frozen = { type: 'rangeColumn', range: { row_focus: 0, column_focus: fCols - 1 } };
    }

    return {
      id: `${doc.id}_sheet_${sIdx}`,
      name: sheet.name || `Hoja ${sIdx + 1}`,
      order: sIdx,
      status: sIdx === 0 ? 1 : 0,
      row: minVisibleRows,
      column: minVisibleCols,
      showGridLines: sheet.showGridLines === false ? 0 : 1,
      defaultColWidth: 110,
      defaultRowHeight: 24,
      celldata,
      config: {
        columnlen,
        rowlen,
        merge: mergeMap,
        borderInfo
      },
      frozen
    };
  });
}

/**
 * Extrae el estado completo de FortuneSheet (Sheet[]) de vuelta a UploadedDocumentSheet[]
 * preservando cada celda, fórmula, color, borde, merge, ancho y alto para PostgreSQL y ExcelJS.
 */
export function fortuneSheetsToUploadedSheets(
  fortuneSheets: Sheet[],
  prevSheets?: UploadedDocumentSheet[]
): UploadedDocumentSheet[] {
  return (fortuneSheets || []).map((fs, sIdx) => {
    const prevSheet = prevSheets?.[sIdx];

    // Recolectar celdas desde `data` (matriz 2D activa en FortuneSheet) o `celldata`
    const cellMap = new Map<string, Cell>();
    let maxUsedRow = 0;
    let maxUsedCol = 0;

    if (Array.isArray(fs.data) && fs.data.length > 0) {
      for (let r = 0; r < fs.data.length; r++) {
        const rowArr = fs.data[r];
        if (!Array.isArray(rowArr)) continue;
        for (let c = 0; c < rowArr.length; c++) {
          const cell = rowArr[c];
          if (cell && typeof cell === 'object') {
            const hasContent =
              (cell.v !== undefined && cell.v !== null && cell.v !== '') ||
              Boolean(cell.f) ||
              Boolean(cell.bg) ||
              Boolean(cell.fc) ||
              Boolean(cell.bl) ||
              Boolean(cell.it) ||
              Boolean(cell.un) ||
              Boolean(cell.cl) ||
              Boolean(cell.mc);
            if (hasContent) {
              cellMap.set(`${r}-${c}`, cell);
              if (r > maxUsedRow) maxUsedRow = r;
              if (c > maxUsedCol) maxUsedCol = c;
            }
          }
        }
      }
    } else if (Array.isArray(fs.celldata)) {
      for (const item of fs.celldata) {
        if (!item || !item.v) continue;
        cellMap.set(`${item.r}-${item.c}`, item.v);
        if (item.r > maxUsedRow) maxUsedRow = item.r;
        if (item.c > maxUsedCol) maxUsedCol = item.c;
      }
    }

    // Reconstruir bordes desde config.borderInfo (soporta tanto rangeType='cell' como rangeType='range')
    const bordersByCoord = new Map<
      string,
      { top?: string; right?: string; bottom?: string; left?: string }
    >();

    const setBorderSide = (
      r: number,
      c: number,
      side: 'top' | 'right' | 'bottom' | 'left',
      css?: string
    ) => {
      if (!css || r < 0 || c < 0) return;
      const key = `${r}-${c}`;
      const cur = bordersByCoord.get(key) || {};
      cur[side] = css;
      bordersByCoord.set(key, cur);
      if (r > maxUsedRow) maxUsedRow = r;
      if (c > maxUsedCol) maxUsedCol = c;
    };

    if (Array.isArray(fs.config?.borderInfo)) {
      for (const bItem of fs.config.borderInfo) {
        if (!bItem) continue;
        if (bItem.rangeType === 'cell' && bItem.value) {
          const r = Number(bItem.value.row_index);
          const c = Number(bItem.value.col_index);
          if (!isNaN(r) && !isNaN(c)) {
            if (bItem.value.t) setBorderSide(r, c, 'top', fortuneSideToCssBorder(bItem.value.t));
            if (bItem.value.r) setBorderSide(r, c, 'right', fortuneSideToCssBorder(bItem.value.r));
            if (bItem.value.b) setBorderSide(r, c, 'bottom', fortuneSideToCssBorder(bItem.value.b));
            if (bItem.value.l) setBorderSide(r, c, 'left', fortuneSideToCssBorder(bItem.value.l));
          }
        } else if (bItem.rangeType === 'range' && Array.isArray(bItem.range)) {
          const css = fortuneSideToCssBorder({ style: bItem.style || 1, color: bItem.color || '#0F172A' });
          const bType = String(bItem.borderType || 'border-all');
          for (const rng of bItem.range) {
            const r0 = rng.row?.[0] ?? 0;
            const r1 = rng.row?.[1] ?? r0;
            const c0 = rng.column?.[0] ?? 0;
            const c1 = rng.column?.[1] ?? c0;
            for (let r = r0; r <= r1; r++) {
              for (let c = c0; c <= c1; c++) {
                if (bType === 'border-all' || bType === 'border-inside') {
                  setBorderSide(r, c, 'top', css);
                  setBorderSide(r, c, 'right', css);
                  setBorderSide(r, c, 'bottom', css);
                  setBorderSide(r, c, 'left', css);
                } else {
                  if (bType === 'border-top' || (bType === 'border-outside' && r === r0)) setBorderSide(r, c, 'top', css);
                  if (bType === 'border-bottom' || (bType === 'border-outside' && r === r1)) setBorderSide(r, c, 'bottom', css);
                  if (bType === 'border-left' || (bType === 'border-outside' && c === c0)) setBorderSide(r, c, 'left', css);
                  if (bType === 'border-right' || (bType === 'border-outside' && c === c1)) setBorderSide(r, c, 'right', css);
                }
              }
            }
          }
        }
      }
    }

    // Reconstruir merges
    const merges: ExcelMergeRange[] = [];
    if (fs.config?.merge && typeof fs.config.merge === 'object') {
      Object.values(fs.config.merge).forEach((m: any) => {
        if (!m || typeof m.r !== 'number' || typeof m.c !== 'number') return;
        const rs = Number(m.rs || 1);
        const cs = Number(m.cs || 1);
        const endRow = m.r + rs - 1;
        const endCol = m.c + cs - 1;
        merges.push({ startRow: m.r, startCol: m.c, endRow, endCol });
        if (endRow > maxUsedRow) maxUsedRow = endRow;
        if (endCol > maxUsedCol) maxUsedCol = endCol;
      });
    }

    const prevRowLen = prevSheet?.rows?.length || 0;
    const prevColLen = prevSheet?.headers?.length || 0;
    const finalRowsCount = Math.max(maxUsedRow + 1, Math.min(prevRowLen, 20), 8);
    const finalColsCount = Math.max(maxUsedCol + 1, Math.min(prevColLen, 10), 6);

    const headers = Array.from({ length: finalColsCount }, (_, i) => getExcelColLetter(i));
    const colWidths: number[] = [];
    for (let c = 0; c < finalColsCount; c++) {
      const cfgW = fs.config?.columnlen?.[String(c)];
      const prevW = prevSheet?.colWidths?.[c];
      colWidths.push(typeof cfgW === 'number' && cfgW > 0 ? Math.round(cfgW) : (prevW || 115));
    }

    const rowHeights: Record<number, number> = {};
    if (fs.config?.rowlen) {
      Object.entries(fs.config.rowlen).forEach(([rKey, px]) => {
        const rNum = Number(rKey);
        if (!isNaN(rNum) && typeof px === 'number' && px > 0 && rNum < finalRowsCount) {
          rowHeights[rNum] = Math.round(px);
        }
      });
    }

    const rows: (string | number | boolean | null)[][] = [];
    const cellStyles: Record<string, CellStyleInfo> = {};
    const cellFormulas: Record<string, string> = {};

    for (let r = 0; r < finalRowsCount; r++) {
      const rowArr: (string | number | boolean | null)[] = [];
      for (let c = 0; c < finalColsCount; c++) {
        const coord = `${r}-${c}`;
        const cell = cellMap.get(coord);
        const borderSides = bordersByCoord.get(coord);

        if (cell) {
          const val = cell.v !== undefined && cell.v !== null ? cell.v : (cell.m !== undefined ? cell.m : '');
          rowArr.push(val);
          if (typeof cell.f === 'string' && cell.f.trim()) {
            cellFormulas[coord] = cell.f.startsWith('=') ? cell.f : `=${cell.f}`;
          }

          const st: CellStyleInfo = {};
          let hasStyle = false;
          if (cell.bg) { st.bgColor = String(cell.bg); hasStyle = true; }
          if (cell.fc) { st.textColor = String(cell.fc); hasStyle = true; }
          if (cell.bl) { st.bold = true; hasStyle = true; }
          if (cell.it) { st.italic = true; hasStyle = true; }
          if (cell.un) { st.underline = true; hasStyle = true; }
          if (cell.cl) { st.strike = true; hasStyle = true; }
          if (typeof cell.fs === 'number') { st.fontSize = cell.fs; hasStyle = true; }
          if (typeof cell.ff === 'string' && cell.ff) { st.fontFamily = cell.ff; hasStyle = true; }
          const align = fortuneHtToAlign(cell.ht);
          if (align) { st.align = align; hasStyle = true; }
          const valign = fortuneVtToValign(cell.vt);
          if (valign) { st.valign = valign; hasStyle = true; }
          if (cell.tb === '2') { st.wrapText = true; hasStyle = true; }
          if (cell.ct?.fa && cell.ct.fa !== 'General') { st.numFmt = String(cell.ct.fa); hasStyle = true; }

          if (borderSides) {
            if (borderSides.top) { st.borderTop = borderSides.top; hasStyle = true; }
            if (borderSides.right) { st.borderRight = borderSides.right; hasStyle = true; }
            if (borderSides.bottom) { st.borderBottom = borderSides.bottom; hasStyle = true; }
            if (borderSides.left) { st.borderLeft = borderSides.left; hasStyle = true; }
          }
          if (hasStyle) {
            cellStyles[coord] = st;
          }
        } else {
          rowArr.push('');
          if (borderSides) {
            cellStyles[coord] = {
              borderTop: borderSides.top,
              borderRight: borderSides.right,
              borderBottom: borderSides.bottom,
              borderLeft: borderSides.left
            };
          }
        }
      }
      rows.push(rowArr);
    }

    let frozenRows = 0;
    let frozenCols = 0;
    if (fs.frozen?.range) {
      if (fs.frozen.type === 'rangeRow' || fs.frozen.type === 'rangeBoth' || fs.frozen.type === 'row' || fs.frozen.type === 'both') {
        frozenRows = (fs.frozen.range.row_focus ?? 0) + 1;
      }
      if (fs.frozen.type === 'rangeColumn' || fs.frozen.type === 'rangeBoth' || fs.frozen.type === 'column' || fs.frozen.type === 'both') {
        frozenCols = (fs.frozen.range.column_focus ?? 0) + 1;
      }
    }

    return {
      name: fs.name || prevSheet?.name || `Hoja ${sIdx + 1}`,
      headers,
      rows,
      totalRows: rows.length,
      totalColumns: headers.length,
      colWidths,
      rowHeights,
      merges,
      cellStyles,
      cellFormulas,
      isRawGrid: true,
      showGridLines: fs.showGridLines !== 0 && fs.showGridLines !== false,
      frozenRows,
      frozenCols
    };
  });
}
