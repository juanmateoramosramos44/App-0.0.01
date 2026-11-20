import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import {
  FileSpreadsheet,
  Search,
  Trash2,
  Maximize2,
  Minimize2,
  Upload,
  Table,
  User,
  Folder,
  FolderPlus,
  ArrowLeft,
  FolderOpen,
  ChevronRight,
  ExternalLink,
  Edit3,
  Plus,
  FolderInput,
  Save,
  Bold,
  Italic,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Check,
  FilePlus2,
  Loader2,
  Database,
  X
} from 'lucide-react';
import {
  UploadedDocument,
  DocumentFolder,
  CellStyleInfo,
  UploadedDocumentSheet
} from '../../types';
import {
  getExcelColLetter,
  openDocumentInComputerExcel,
  rebuildWorkbookBase64FromDoc
} from '../../utils/excelEngine';

interface OriginalDocumentViewerProps {
  documents: UploadedDocument[];
  activeDocId?: string;
  onSelectDocument: (docId: string) => void;
  onUpdateDocument?: (doc: UploadedDocument) => Promise<void> | void;
  onMoveDocument?: (docId: string, folderId: string | null) => Promise<void> | void;
  onDeleteDocument: (docId: string) => Promise<void>;
  onClearAllDocuments?: () => Promise<void>;
  onTriggerUpload: () => void;
  onTriggerCreateExcel?: () => void;
  onQuickUploadFiles?: (files: File[]) => Promise<void>;
  isAdmin: boolean;
  onRequireAdminPin: (actionName: string, onSuccess: () => void) => void;
  onCleanImportedEquipments?: () => void;
  importedEquipmentsCount?: number;
  folders: DocumentFolder[];
  onCreateFolder: (name: string, color?: string, description?: string, parentFolderId?: string | null) => Promise<DocumentFolder | void> | void;
  onUpdateFolder?: (folderId: string, updates: Partial<DocumentFolder>) => Promise<void> | void;
  onDeleteFolder: (folderId: string) => void;
  activeFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  canDeleteRecords?: boolean;
}

const FOLDER_COLOR_STYLES: Record<string, { bg: string; text: string; border: string; badge: string }> = {
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', badge: 'bg-amber-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', badge: 'bg-emerald-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', badge: 'bg-blue-600' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', badge: 'bg-indigo-600' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', badge: 'bg-rose-600' },
  slate: { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', badge: 'bg-slate-600' },
};

const BG_COLOR_SWATCHES = [
  { label: 'Sin relleno', value: '' },
  { label: 'Encabezado Pizarra', value: '#0F172A' },
  { label: 'Encabezado Esmeralda', value: '#065F46' },
  { label: 'Encabezado Azul', value: '#1E3A8A' },
  { label: 'Verde Suave', value: '#D1FAE5' },
  { label: 'Azul Suave', value: '#DBEAFE' },
  { label: 'Ámbar Suave', value: '#FEF3C7' },
  { label: 'Rosa Suave', value: '#FFE4E6' },
  { label: 'Gris Claro', value: '#F1F5F9' },
];

const TEXT_COLOR_SWATCHES = [
  { label: 'Negro / Oscuro', value: '#0F172A' },
  { label: 'Blanco', value: '#FFFFFF' },
  { label: 'Esmeralda', value: '#047857' },
  { label: 'Azul', value: '#1D4ED8' },
  { label: 'Rojo', value: '#BE123C' },
  { label: 'Ámbar', value: '#B45309' },
];

export const OriginalDocumentViewer: React.FC<OriginalDocumentViewerProps> = ({
  documents,
  activeDocId,
  onSelectDocument,
  onUpdateDocument,
  onMoveDocument,
  onDeleteDocument,
  onClearAllDocuments,
  onTriggerUpload,
  onTriggerCreateExcel,
  onQuickUploadFiles,
  onCleanImportedEquipments,
  importedEquipmentsCount = 0,
  folders = [],
  onCreateFolder,
  onUpdateFolder,
  onDeleteFolder,
  activeFolderId,
  onSelectFolder,
  canDeleteRecords = true
}) => {
  const { notify } = useMaintenance();
  const [selectedSheetIdx, setSelectedSheetIdx] = useState<number>(0);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const rowsPerPage = 80;

  // Folder modals
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('amber');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);

  // Rename folder inline
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderInput, setRenameFolderInput] = useState('');

  // Drag & Drop state on viewer
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);

  // Live Excel Editor state
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [draftDoc, setDraftDoc] = useState<UploadedDocument | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [isSavingWorkbook, setIsSavingWorkbook] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [formulaInput, setFormulaInput] = useState<string>('');

  // Fast folder lookup & recursive tree helpers (infinite nesting depth)
  const folderMap = useMemo(() => {
    const map = new Map<string, DocumentFolder>();
    for (const f of folders) {
      if (f && f.id) map.set(f.id, f);
    }
    return map;
  }, [folders]);

  const getEffectiveParentId = useCallback((f: DocumentFolder): string | null => {
    if (!f.parentFolderId || f.parentFolderId === f.id) return null;
    return folderMap.has(f.parentFolderId) ? f.parentFolderId : null;
  }, [folderMap]);

  // Active folder object
  const activeFolder = useMemo(() => {
    if (!activeFolderId) return null;
    return folderMap.get(activeFolderId) || null;
  }, [folderMap, activeFolderId]);

  const breadcrumbTrail = useMemo(() => {
    const trail: DocumentFolder[] = [];
    const visited = new Set<string>();
    let currId: string | null = activeFolderId;
    while (currId && !visited.has(currId)) {
      const f = folderMap.get(currId);
      if (!f) break;
      visited.add(currId);
      trail.unshift(f);
      currId = getEffectiveParentId(f);
    }
    return trail;
  }, [activeFolderId, folderMap, getEffectiveParentId]);

  const getDescendantFolderIds = useCallback((rootId: string): Set<string> => {
    const result = new Set<string>([rootId]);
    const queue: string[] = [rootId];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      for (const f of folders) {
        if (getEffectiveParentId(f) === curr && !result.has(f.id)) {
          result.add(f.id);
          queue.push(f.id);
        }
      }
    }
    return result;
  }, [folders, getEffectiveParentId]);

  const childFolders = useMemo(() => {
    const targetParent = activeFolderId || null;
    return folders.filter(f => getEffectiveParentId(f) === targetParent);
  }, [folders, activeFolderId, getEffectiveParentId]);

  const flattenedFolderOptions = useMemo(() => {
    const list: { folder: DocumentFolder; depth: number; label: string }[] = [];
    const visited = new Set<string>();
    const walk = (parentId: string | null, depth: number) => {
      const children = folders.filter(f => getEffectiveParentId(f) === parentId);
      for (const child of children) {
        if (visited.has(child.id)) continue;
        visited.add(child.id);
        const prefix = depth > 0 ? `${'— '.repeat(depth)}📁 ` : '📁 ';
        list.push({ folder: child, depth, label: `${prefix}${child.name}` });
        walk(child.id, depth + 1);
      }
    };
    walk(null, 0);
    // Safety net for any disconnected cycle
    for (const f of folders) {
      if (!visited.has(f.id)) {
        list.push({ folder: f, depth: 0, label: `📁 ${f.name}` });
      }
    }
    return list;
  }, [folders, getEffectiveParentId]);

  const openNewFolderModal = useCallback((parentId: string | null) => {
    setNewFolderParentId(parentId);
    setNewFolderNameInput('');
    setNewFolderDesc('');
    setNewFolderColor('amber');
    setIsNewFolderModalOpen(true);
  }, []);

  // Documents in current view (Root vs Folder)
  const currentFolderDocuments = useMemo(() => {
    if (activeFolderId) {
      return documents.filter(d => d.folderId === activeFolderId);
    }
    return documents.filter(d => !d.folderId);
  }, [documents, activeFolderId]);

  // Selected document from store
  const storeDoc = useMemo(() => {
    if (!currentFolderDocuments || currentFolderDocuments.length === 0) return null;
    if (activeDocId) {
      const found = currentFolderDocuments.find(d => d.id === activeDocId);
      if (found) return found;
    }
    return currentFolderDocuments[0];
  }, [currentFolderDocuments, activeDocId]);

  // Sync draftDoc when storeDoc changes (unless actively editing same doc with unsaved changes)
  useEffect(() => {
    if (!storeDoc) {
      setDraftDoc(null);
      setHasUnsavedChanges(false);
      setSelectedCell(null);
      setEditingCell(null);
      return;
    }
    if (!draftDoc || draftDoc.id !== storeDoc.id || !hasUnsavedChanges) {
      setDraftDoc(storeDoc);
      if (draftDoc?.id !== storeDoc.id) {
        setSelectedSheetIdx(0);
        setCurrentPage(1);
        setSelectedCell(null);
        setEditingCell(null);
        setHasUnsavedChanges(false);
      }
    }
  }, [storeDoc]);

  const currentDoc = draftDoc || storeDoc;

  // Active sheet
  const currentSheet: UploadedDocumentSheet | null = useMemo(() => {
    if (!currentDoc || !currentDoc.sheets || currentDoc.sheets.length === 0) return null;
    return currentDoc.sheets[selectedSheetIdx] || currentDoc.sheets[0];
  }, [currentDoc, selectedSheetIdx]);

  const isRawGrid = Boolean(currentSheet?.isRawGrid);

  // Sync formula bar when selectedCell changes
  useEffect(() => {
    if (!selectedCell || !currentSheet) {
      setFormulaInput('');
      return;
    }
    const { row, col } = selectedCell;
    const key = `${row}-${col}`;
    const formula = currentSheet.cellFormulas?.[key];
    if (formula) {
      setFormulaInput(`=${formula}`);
    } else {
      const val = currentSheet.rows[row]?.[col];
      setFormulaInput(val !== null && val !== undefined ? String(val) : '');
    }
  }, [selectedCell, currentSheet]);

  // Build fast lookup for merged cells on raw grid
  const mergeLookup = useMemo(() => {
    const masters = new Map<string, { rowSpan: number; colSpan: number }>();
    const covered = new Set<string>();
    if (!currentSheet?.merges || !isRawGrid) {
      return { masters, covered };
    }
    for (const m of currentSheet.merges) {
      const rowSpan = Math.max(1, m.endRow - m.startRow + 1);
      const colSpan = Math.max(1, m.endCol - m.startCol + 1);
      if (rowSpan === 1 && colSpan === 1) continue;
      masters.set(`${m.startRow}-${m.startCol}`, { rowSpan, colSpan });
      for (let r = m.startRow; r <= m.endRow; r++) {
        for (let c = m.startCol; c <= m.endCol; c++) {
          if (r === m.startRow && c === m.startCol) continue;
          covered.add(`${r}-${c}`);
        }
      }
    }
    return { masters, covered };
  }, [currentSheet?.merges, isRawGrid]);

  // Filter rows preserving original row index for exact styling & edits
  const indexedFilteredRows = useMemo(() => {
    if (!currentSheet || !currentSheet.rows) return [];
    const q = searchFilter.trim().toLowerCase();
    const mapped = currentSheet.rows.map((row, idx) => ({ row, origIdx: idx }));
    if (!q) return mapped;
    return mapped.filter(({ row }) =>
      row.some(cell => cell !== null && cell !== undefined && String(cell).toLowerCase().includes(q))
    );
  }, [currentSheet, searchFilter]);

  const totalPages = Math.ceil(indexedFilteredRows.length / rowsPerPage) || 1;

  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return indexedFilteredRows.slice(start, start + rowsPerPage);
  }, [indexedFilteredRows, currentPage]);

  // Apply mutation to draftDoc
  const updateDraftSheet = useCallback((updater: (sheet: UploadedDocumentSheet) => UploadedDocumentSheet) => {
    setDraftDoc(prev => {
      if (!prev) return prev;
      const updatedSheets = prev.sheets.map((s, idx) => idx === selectedSheetIdx ? updater(s) : s);
      return {
        ...prev,
        sheets: updatedSheets,
        totalRows: updatedSheets.reduce((acc, s) => acc + s.rows.length, 0),
        totalColumns: Math.max(...updatedSheets.map(s => s.headers.length), 1),
        updatedAt: new Date().toISOString()
      };
    });
    setHasUnsavedChanges(true);
  }, [selectedSheetIdx]);

  const handleCellValueChange = (origRowIdx: number, colIdx: number, rawInput: string) => {
    updateDraftSheet(sheet => {
      const nextRows = sheet.rows.map((r, rIdx) => {
        if (rIdx !== origRowIdx) return r;
        const copy = [...r];
        while (copy.length <= colIdx) copy.push('');
        if (rawInput.startsWith('=')) {
          copy[colIdx] = rawInput;
        } else if (rawInput.trim() !== '' && !isNaN(Number(rawInput)) && !rawInput.startsWith('0')) {
          copy[colIdx] = Number(rawInput);
        } else {
          copy[colIdx] = rawInput;
        }
        return copy;
      });
      const nextFormulas = { ...(sheet.cellFormulas || {}) };
      const key = `${origRowIdx}-${colIdx}`;
      if (rawInput.startsWith('=')) {
        nextFormulas[key] = rawInput.slice(1);
      } else {
        delete nextFormulas[key];
      }
      return {
        ...sheet,
        rows: nextRows,
        cellFormulas: nextFormulas
      };
    });
  };

  const handleToggleCellStyle = (styleUpdates: Partial<CellStyleInfo>) => {
    if (!selectedCell || !currentSheet) return;
    const key = `${selectedCell.row}-${selectedCell.col}`;
    updateDraftSheet(sheet => {
      const currentStyles = { ...(sheet.cellStyles || {}) };
      const existing = currentStyles[key] || {};
      const nextStyle: CellStyleInfo = { ...existing, ...styleUpdates };
      if (styleUpdates.bgColor === '') delete nextStyle.bgColor;
      currentStyles[key] = nextStyle;
      return {
        ...sheet,
        cellStyles: currentStyles
      };
    });
  };

  const handleAddRow = () => {
    if (!currentSheet) return;
    updateDraftSheet(sheet => {
      const emptyRow = new Array(Math.max(sheet.headers.length, 1)).fill('');
      return {
        ...sheet,
        rows: [...sheet.rows, emptyRow],
        totalRows: sheet.rows.length + 1
      };
    });
  };

  const handleDeleteRow = (origRowIdx: number) => {
    if (!currentSheet || currentSheet.rows.length <= 1) return;
    updateDraftSheet(sheet => {
      const nextRows = sheet.rows.filter((_, idx) => idx !== origRowIdx);
      const shiftedStyles: Record<string, CellStyleInfo> = {};
      Object.entries(sheet.cellStyles || {}).forEach(([k, val]) => {
        const [rStr, cStr] = k.split('-');
        const r = Number(rStr);
        if (r < origRowIdx) shiftedStyles[k] = val;
        else if (r > origRowIdx) shiftedStyles[`${r - 1}-${cStr}`] = val;
      });
      return {
        ...sheet,
        rows: nextRows,
        cellStyles: shiftedStyles,
        totalRows: nextRows.length
      };
    });
  };

  const handleAddColumn = () => {
    if (!currentSheet) return;
    updateDraftSheet(sheet => {
      const nextIdx = sheet.headers.length;
      const newHeader = isRawGrid ? getExcelColLetter(nextIdx) : `Columna ${nextIdx + 1}`;
      return {
        ...sheet,
        headers: [...sheet.headers, newHeader],
        rows: sheet.rows.map(r => [...r, '']),
        colWidths: sheet.colWidths ? [...sheet.colWidths, 130] : undefined,
        totalColumns: nextIdx + 1
      };
    });
  };

  const handleAddSheet = () => {
    if (!currentDoc) return;
    const cols = 8;
    const newSheet: UploadedDocumentSheet = {
      name: `Hoja ${currentDoc.sheets.length + 1}`,
      headers: Array.from({ length: cols }, (_, i) => getExcelColLetter(i)),
      rows: Array.from({ length: 12 }, () => Array.from({ length: cols }, () => '')),
      totalRows: 12,
      totalColumns: cols,
      colWidths: Array.from({ length: cols }, () => 130),
      rowHeights: {},
      merges: [],
      cellStyles: {},
      isRawGrid: true,
      showGridLines: true
    };
    const nextIdx = currentDoc.sheets.length;
    setDraftDoc(prev => prev ? {
      ...prev,
      sheets: [...prev.sheets, newSheet],
      totalRows: prev.totalRows + 12,
      updatedAt: new Date().toISOString()
    } : prev);
    setSelectedSheetIdx(nextIdx);
    setCurrentPage(1);
    setHasUnsavedChanges(true);
  };

  const handleSaveWorkbookToDb = async () => {
    if (!currentDoc || !onUpdateDocument) return;
    setIsSavingWorkbook(true);
    try {
      const rebuiltBase64 = await rebuildWorkbookBase64FromDoc(currentDoc);
      const approxBytes = Math.round((rebuiltBase64.length * 3) / 4);
      const docToSave: UploadedDocument = {
        ...currentDoc,
        rawBase64: rebuiltBase64,
        sizeBytes: approxBytes || currentDoc.sizeBytes,
        updatedAt: new Date().toISOString()
      };
      await onUpdateDocument(docToSave);
      setDraftDoc(docToSave);
      setHasUnsavedChanges(false);
      notify(`Libro "${docToSave.name}" guardado permanentemente en PostgreSQL.`);
    } catch (err) {
      console.error('Error guardando libro Excel:', err);
      notify('No se pudo guardar el libro Excel. Revisa tu conexión.');
    } finally {
      setIsSavingWorkbook(false);
    }
  };

  const handleOpenInComputerExcel = async (doc: UploadedDocument) => {
    try {
      // If editing this document and has unsaved edits, rebuild from draft so PC sees latest edits
      if (draftDoc && draftDoc.id === doc.id && hasUnsavedChanges) {
        const rebuiltBase64 = await rebuildWorkbookBase64FromDoc(draftDoc);
        await openDocumentInComputerExcel({ ...draftDoc, rawBase64: rebuiltBase64 });
        return;
      }
      await openDocumentInComputerExcel(doc);
    } catch (err) {
      console.error('Error abriendo archivo en Excel de PC:', err);
      notify('No se pudo abrir el archivo Excel.');
    }
  };

  const handleDeleteClick = (docId: string, docName: string) => {
    if (window.confirm(`¿Estás seguro de eliminar permanentemente "${docName}" de la base de datos?`)) {
      onDeleteDocument(docId);
    }
  };

  const handleDropFiles = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFiles(false);
    const files = Array.from(e.dataTransfer.files || []).filter(f =>
      /\.(xlsx|xls|csv)$/i.test(f.name)
    );
    if (files.length === 0) {
      notify('Arrastra archivos Excel válidos (.xlsx, .xls o .csv).');
      return;
    }
    if (onQuickUploadFiles) {
      await onQuickUploadFiles(files);
    } else {
      onTriggerUpload();
    }
  };

  const selectedCellStyle: CellStyleInfo = useMemo(() => {
    if (!selectedCell || !currentSheet?.cellStyles) return {};
    return currentSheet.cellStyles[`${selectedCell.row}-${selectedCell.col}`] || {};
  }, [selectedCell, currentSheet]);

  const buildBorderCss = (border?: { style?: string; color?: string }) => {
    if (!border) return undefined;
    const width = border.style === 'thick' ? '2px' : border.style === 'medium' ? '1.5px' : '1px';
    const lineStyle = border.style === 'dashed' ? 'dashed' : border.style === 'dotted' ? 'dotted' : 'solid';
    return `${width} ${lineStyle} ${border.color || '#94A3B8'}`;
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDraggingFiles(true); }}
      onDragLeave={() => setIsDraggingFiles(false)}
      onDrop={handleDropFiles}
      className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-100 p-4 sm:p-6 overflow-auto' : ''} ${
        isDraggingFiles ? 'ring-2 ring-emerald-500 rounded-2xl' : ''
      }`}
    >
      {/* Top Action Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900">
                Archivero de Carpetas y Estudio Excel
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 tabular-nums">
                {documents.length} {documents.length === 1 ? 'archivo' : 'archivos'} • PostgreSQL
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Organiza carpetas, abre tus Excel idénticos en el computador o edítalos aquí con colores y formato exacto
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canDeleteRecords && importedEquipmentsCount > 0 && onCleanImportedEquipments && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`¿Deseas eliminar los ${importedEquipmentsCount} equipos importados de Excel y restaurar el Parque de Bombas?`)) {
                  onCleanImportedEquipments();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-amber-600" />
              <span>Limpiar {importedEquipmentsCount} equipos</span>
            </button>
          )}

          {canDeleteRecords && documents.length > 0 && onClearAllDocuments && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`¿Estás seguro de eliminar permanentemente los ${documents.length} documentos Excel guardados?`)) {
                  onClearAllDocuments();
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
              <span>Vaciar ({documents.length})</span>
            </button>
          )}

          {onTriggerCreateExcel && (
            <button
              type="button"
              onClick={onTriggerCreateExcel}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FilePlus2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nuevo Excel</span>
            </button>
          )}

          <button
            type="button"
            onClick={onTriggerUpload}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Subir Excel {activeFolder ? `a "${activeFolder.name}"` : ''}</span>
          </button>
        </div>
      </div>

      {/* Folder Breadcrumb (when inside a folder/subfolder) */}
      {activeFolderId && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => onSelectFolder(activeFolder ? getEffectiveParentId(activeFolder) : null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold transition-colors cursor-pointer"
              title="Subir un nivel"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{activeFolder && getEffectiveParentId(activeFolder) ? 'Subir Nivel' : 'Raíz'}</span>
            </button>

            <nav className="flex items-center gap-1 text-xs font-semibold text-slate-600 flex-wrap" aria-label="Ruta de carpetas">
              <button
                type="button"
                onClick={() => onSelectFolder(null)}
                className="px-2 py-1 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-emerald-700 font-bold transition-colors cursor-pointer"
              >
                Archivero
              </button>
              {breadcrumbTrail.map((crumb, idx) => {
                const isLast = idx === breadcrumbTrail.length - 1;
                return (
                  <React.Fragment key={crumb.id}>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {isLast ? (
                      <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-200 font-bold">
                        <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
                        <span>{crumb.name}</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onSelectFolder(crumb.id)}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 font-bold transition-colors cursor-pointer"
                      >
                        <Folder className="w-3.5 h-3.5 text-amber-500" />
                        <span>{crumb.name}</span>
                      </button>
                    )}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-500 font-medium tabular-nums">
              {childFolders.length} {childFolders.length === 1 ? 'subcarpeta' : 'subcarpetas'} • {currentFolderDocuments.length} {currentFolderDocuments.length === 1 ? 'archivo' : 'archivos'}
            </span>
            <button
              type="button"
              onClick={() => openNewFolderModal(activeFolderId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Nueva Subcarpeta</span>
            </button>
          </div>
        </div>
      )}

      {/* Folders / Subfolders Grid (Root shows root folders; inside a folder shows its subfolders) */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-amber-500" />
            <h4 className="text-sm font-bold text-slate-900">
              {activeFolder
                ? `Subcarpetas en "${activeFolder.name}" (${childFolders.length})`
                : `Carpetas Guardadas (${childFolders.length})`}
            </h4>
          </div>
          <button
            type="button"
            onClick={() => openNewFolderModal(activeFolderId || null)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FolderPlus className="w-4 h-4" />
            <span>{activeFolder ? 'Nueva Subcarpeta' : 'Nueva Carpeta'}</span>
          </button>
        </div>

        {childFolders.length === 0 ? (
          <div className="text-center py-5 text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
            {activeFolder
              ? `No hay subcarpetas dentro de "${activeFolder.name}". Pulsa "Nueva Subcarpeta" para organizar aún más este directorio.`
              : 'No hay carpetas creadas todavía. Crea una carpeta para organizar tus archivos Excel por equipos, zonas o años.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {childFolders.map(folder => {
              const descendantSet = getDescendantFolderIds(folder.id);
              const directSubfoldersCount = folders.filter(f => getEffectiveParentId(f) === folder.id).length;
              const directDocsCount = documents.filter(d => d.folderId === folder.id).length;
              const totalNestedDocsCount = documents.filter(d => d.folderId && descendantSet.has(d.folderId)).length;
              const colorKey = folder.color && FOLDER_COLOR_STYLES[folder.color] ? folder.color : 'amber';
              const cStyle = FOLDER_COLOR_STYLES[colorKey];
              const isRenaming = renamingFolderId === folder.id;

              return (
                <div
                  key={folder.id}
                  onClick={() => { if (!isRenaming) onSelectFolder(folder.id); }}
                  className="group bg-slate-50/70 hover:bg-white border border-slate-200 hover:border-emerald-300 rounded-xl p-3.5 cursor-pointer transition-all flex flex-col justify-between gap-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-10 h-10 rounded-xl ${cStyle.bg} ${cStyle.text} border ${cStyle.border} flex items-center justify-center shrink-0`}>
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {isRenaming ? (
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={renameFolderInput}
                              onChange={(e) => setRenameFolderInput(e.target.value)}
                              className="w-full px-2 py-1 text-xs font-bold border border-emerald-400 rounded-lg bg-white text-slate-900 focus:outline-none"
                              autoFocus
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter' && renameFolderInput.trim() && onUpdateFolder) {
                                  await onUpdateFolder(folder.id, { name: renameFolderInput.trim() });
                                  setRenamingFolderId(null);
                                } else if (e.key === 'Escape') {
                                  setRenamingFolderId(null);
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                if (renameFolderInput.trim() && onUpdateFolder) {
                                  await onUpdateFolder(folder.id, { name: renameFolderInput.trim() });
                                }
                                setRenamingFolderId(null);
                              }}
                              className="p-1 bg-emerald-600 text-white rounded-md cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <>
                            <h5 className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-800">
                              {folder.name}
                            </h5>
                            <p className="text-[11px] text-slate-500 tabular-nums truncate">
                              {directSubfoldersCount > 0
                                ? `${directSubfoldersCount} ${directSubfoldersCount === 1 ? 'subcarpeta' : 'subcarpetas'} • ${totalNestedDocsCount} ${totalNestedDocsCount === 1 ? 'archivo' : 'archivos'}`
                                : `${directDocsCount} ${directDocsCount === 1 ? 'archivo' : 'archivos'}`}
                              {folder.description ? ` • ${folder.description}` : ''}
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {onUpdateFolder && !isRenaming && (
                        <button
                          type="button"
                          onClick={() => {
                            setRenamingFolderId(folder.id);
                            setRenameFolderInput(folder.name);
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer"
                          title="Renombrar carpeta"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {canDeleteRecords && (
                        <button
                          type="button"
                          onClick={() => {
                            const targetDest = getEffectiveParentId(folder) ? 'la carpeta superior' : 'la raíz';
                            if (window.confirm(`¿Eliminar la carpeta "${folder.name}"? Sus subcarpetas y archivos pasarán a ${targetDest} sin borrarse.`)) {
                              onDeleteFolder(folder.id);
                            }
                          }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title={`Eliminar carpeta "${folder.name}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 pointer-events-none" />
                    </div>
                  </div>

                  {onUpdateFolder && folders.length > 1 && (
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[10px] font-semibold text-slate-400 inline-flex items-center gap-1">
                        <FolderInput className="w-3 h-3" />
                        <span>Mover a:</span>
                      </span>
                      <select
                        value={getEffectiveParentId(folder) || ''}
                        onChange={(e) => {
                          const nextParent = e.target.value || null;
                          onUpdateFolder(folder.id, { parentFolderId: nextParent });
                        }}
                        className="text-[11px] font-semibold bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-700 max-w-[160px] truncate focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                        title="Mover carpeta dentro de otra carpeta"
                      >
                        <option value="">Raíz (Sin carpeta padre)</option>
                        {flattenedFolderOptions
                          .filter(opt => !descendantSet.has(opt.folder.id))
                          .map(opt => (
                            <option key={opt.folder.id} value={opt.folder.id}>{opt.label}</option>
                          ))}
                      </select>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Files Grid in Current Directory */}
      {currentFolderDocuments.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Archivos Excel {activeFolder ? `en "${activeFolder.name}"` : 'en Raíz'} ({currentFolderDocuments.length})
              </h4>
            </div>
            <span className="text-[11px] text-slate-500">
              Haz clic en un archivo para verlo/editarlo aquí o pulsa «Abrir en Excel» para lanzarlo en tu computador
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {currentFolderDocuments.map((doc) => {
              const isSelected = currentDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    if (hasUnsavedChanges && draftDoc && draftDoc.id !== doc.id) {
                      if (!window.confirm('Tienes cambios sin guardar en el libro actual. ¿Cambiar de archivo y descartar cambios no guardados?')) {
                        return;
                      }
                      setHasUnsavedChanges(false);
                    }
                    onSelectDocument(doc.id);
                    setSelectedSheetIdx(0);
                    setCurrentPage(1);
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                    isSelected
                      ? 'bg-emerald-50/60 border-emerald-500 ring-1 ring-emerald-500/30'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-700'
                      }`}>
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate" title={doc.name}>
                          {doc.name}
                        </p>
                        <p className="text-[11px] text-slate-500 tabular-nums">
                          {doc.sheets.length} {doc.sheets.length === 1 ? 'hoja' : 'hojas'} • {doc.totalRows} filas • {new Date(doc.uploadDate).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>

                    {canDeleteRecords && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(doc.id, doc.name);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0 cursor-pointer"
                        title={`Eliminar "${doc.name}"`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/70" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleOpenInComputerExcel(doc)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      title="Abrir inmediatamente en la aplicación Excel de tu computador (formato 100% original)"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Abrir en Excel</span>
                    </button>

                    {onMoveDocument && folders.length > 0 && (
                      <div className="flex items-center gap-1 min-w-0">
                        <FolderInput className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <select
                          value={doc.folderId || ''}
                          onChange={(e) => onMoveDocument(doc.id, e.target.value || null)}
                          className="text-[11px] font-semibold bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 max-w-[160px] truncate focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          title="Mover archivo a carpeta o subcarpeta"
                        >
                          <option value="">Raíz (Sin carpeta)</option>
                          {flattenedFolderOptions.map(opt => (
                            <option key={opt.folder.id} value={opt.folder.id}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New Folder / Subfolder Modal (Auto-closes immediately on submit & keeps activeFolderId) */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const cleanName = newFolderNameInput.trim();
              if (!cleanName) return;
              const targetParent = newFolderParentId ?? activeFolderId ?? null;
              const chosenColor = newFolderColor;
              const chosenDesc = newFolderDesc.trim() || undefined;
              // Close immediately without blocking UX & preserve current working folder
              setNewFolderNameInput('');
              setNewFolderDesc('');
              setNewFolderColor('amber');
              setIsNewFolderModalOpen(false);
              Promise.resolve(onCreateFolder(cleanName, chosenColor, chosenDesc, targetParent)).catch((err) => {
                console.error('Error creating folder:', err);
              });
            }}
            className="bg-white rounded-2xl max-w-md w-full p-5 space-y-4 shadow-xl border border-slate-200"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  {newFolderParentId ? 'Crear Nueva Subcarpeta' : 'Crear Nueva Carpeta'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ubicación / Carpeta Padre
                </label>
                <select
                  value={newFolderParentId || ''}
                  onChange={(e) => setNewFolderParentId(e.target.value || null)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Raíz del Archivero (Carpeta Principal)</option>
                  {flattenedFolderOptions.map(opt => (
                    <option key={opt.folder.id} value={opt.folder.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de la {newFolderParentId ? 'Subcarpeta' : 'Carpeta'} *
                </label>
                <input
                  type="text"
                  required
                  value={newFolderNameInput}
                  onChange={(e) => setNewFolderNameInput(e.target.value)}
                  placeholder="Ej. Cuarto de Bombas, Chillers 2026, Manuales..."
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-slate-900"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción breve (opcional)
                </label>
                <input
                  type="text"
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="Ej. Hojas de vida y fichas técnicas"
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-slate-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Color identificador
                </label>
                <div className="flex items-center gap-2">
                  {Object.entries(FOLDER_COLOR_STYLES).map(([key, style]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setNewFolderColor(key)}
                      className={`w-7 h-7 rounded-full ${style.badge} transition-transform cursor-pointer flex items-center justify-center ${
                        newFolderColor === key ? 'ring-2 ring-offset-2 ring-slate-900 scale-110' : 'opacity-75 hover:opacity-100'
                      }`}
                    >
                      {newFolderColor === key && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!newFolderNameInput.trim()}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                {newFolderParentId ? 'Crear Subcarpeta' : 'Crear Carpeta'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Excel Viewer & Live Studio */}
      {currentDoc ? (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col">
          {/* Document Header Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900 truncate">{currentDoc.name}</h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Database className="w-3 h-3" />
                  <span>PostgreSQL</span>
                </span>
                {hasUnsavedChanges && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                    Cambios sin guardar
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5 text-[11px] text-slate-500 mt-1 flex-wrap tabular-nums">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>Por <strong>{currentDoc.uploadedBy}</strong></span>
                </span>
                <span>•</span>
                <span>{currentDoc.sheets.length} {currentDoc.sheets.length === 1 ? 'Hoja' : 'Hojas'}</span>
                <span>•</span>
                <span>{currentSheet?.rows.length || 0} Filas</span>
                <span>•</span>
                <span>{currentSheet?.headers.length || 0} Columnas</span>
              </div>
            </div>

            {/* Document Toolbar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => {
                    setSearchFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar en la hoja..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 w-40 sm:w-48"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsEditMode(prev => !prev);
                  setEditingCell(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  isEditMode
                    ? 'bg-amber-500 hover:bg-amber-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditMode ? 'Salir de Edición' : 'Editar en App'}</span>
              </button>

              {hasUnsavedChanges && onUpdateDocument && (
                <button
                  type="button"
                  disabled={isSavingWorkbook}
                  onClick={handleSaveWorkbookToDb}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  {isSavingWorkbook ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  <span>Guardar Cambios</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleOpenInComputerExcel(currentDoc)}
                title="Abrir directamente en Excel del computador con colores y formato original"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir en Excel (PC)</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
                className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-200/80 border border-slate-200 bg-white cursor-pointer"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Excel Studio Formula + Style Ribbon */}
          {(isEditMode || selectedCell) && currentSheet && (
            <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 space-y-2">
              {/* Formula Bar */}
              <div className="flex items-center gap-2">
                <div className="px-2.5 py-1 rounded-md bg-white border border-slate-300 text-xs font-mono font-bold text-slate-700 min-w-[54px] text-center tabular-nums">
                  {selectedCell ? `${getExcelColLetter(selectedCell.col)}${selectedCell.row + (isRawGrid ? 1 : 2)}` : '--'}
                </div>
                <span className="text-xs font-serif italic font-bold text-slate-400">fx</span>
                <input
                  type="text"
                  disabled={!isEditMode || !selectedCell}
                  value={formulaInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFormulaInput(val);
                    if (isEditMode && selectedCell) {
                      handleCellValueChange(selectedCell.row, selectedCell.col, val);
                    }
                  }}
                  placeholder={selectedCell ? (isEditMode ? 'Escribe valor o fórmula (ej: =SUMA(B2:B6))...' : 'Activa "Editar en App" para modificar esta celda') : 'Haz clic en una celda para inspeccionar su contenido'}
                  className="flex-1 px-3 py-1 rounded-md border border-slate-300 bg-white text-xs font-mono text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:bg-slate-100 disabled:text-slate-600"
                />
              </div>

              {/* Formatting & Structure Ribbon (Edit Mode Only) */}
              {isEditMode && (
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-200/70">
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                    <button
                      type="button"
                      disabled={!selectedCell}
                      onClick={() => handleToggleCellStyle({ bold: !selectedCellStyle.bold })}
                      className={`p-1.5 rounded text-xs cursor-pointer disabled:opacity-40 ${selectedCellStyle.bold ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                      title="Negrita"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!selectedCell}
                      onClick={() => handleToggleCellStyle({ italic: !selectedCellStyle.italic })}
                      className={`p-1.5 rounded text-xs cursor-pointer disabled:opacity-40 ${selectedCellStyle.italic ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                      title="Cursiva"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!selectedCell}
                      onClick={() => handleToggleCellStyle({ underline: !selectedCellStyle.underline })}
                      className={`p-1.5 rounded text-xs cursor-pointer disabled:opacity-40 ${selectedCellStyle.underline ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                      title="Subrayado"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-0.5">
                    <button
                      type="button"
                      disabled={!selectedCell}
                      onClick={() => handleToggleCellStyle({ align: 'left' })}
                      className={`p-1.5 rounded cursor-pointer disabled:opacity-40 ${selectedCellStyle.align === 'left' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                      title="Alinear a la izquierda"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!selectedCell}
                      onClick={() => handleToggleCellStyle({ align: 'center' })}
                      className={`p-1.5 rounded cursor-pointer disabled:opacity-40 ${selectedCellStyle.align === 'center' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                      title="Centrar"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={!selectedCell}
                      onClick={() => handleToggleCellStyle({ align: 'right' })}
                      className={`p-1.5 rounded cursor-pointer disabled:opacity-40 ${selectedCellStyle.align === 'right' ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'}`}
                      title="Alinear a la derecha"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Background Fill Swatches */}
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                    <span className="text-[10px] font-bold text-slate-500 mr-1">Fondo:</span>
                    {BG_COLOR_SWATCHES.map(sw => (
                      <button
                        key={sw.label}
                        type="button"
                        disabled={!selectedCell}
                        onClick={() => handleToggleCellStyle({ bgColor: sw.value })}
                        title={sw.label}
                        style={{ backgroundColor: sw.value || '#FFFFFF' }}
                        className={`w-4 h-4 rounded border border-slate-300 cursor-pointer disabled:opacity-40 ${
                          sw.value === '' ? 'relative overflow-hidden' : ''
                        } ${selectedCellStyle.bgColor === sw.value ? 'ring-2 ring-emerald-500' : ''}`}
                      />
                    ))}
                  </div>

                  {/* Text Color Swatches */}
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1">
                    <span className="text-[10px] font-bold text-slate-500 mr-1">Texto:</span>
                    {TEXT_COLOR_SWATCHES.map(sw => (
                      <button
                        key={sw.label}
                        type="button"
                        disabled={!selectedCell}
                        onClick={() => handleToggleCellStyle({ textColor: sw.value })}
                        title={sw.label}
                        style={{ backgroundColor: sw.value }}
                        className={`w-4 h-4 rounded-full border border-slate-300 cursor-pointer disabled:opacity-40 ${
                          selectedCellStyle.textColor === sw.value ? 'ring-2 ring-emerald-500' : ''
                        }`}
                      />
                    ))}
                  </div>

                  {/* Add Row / Col / Sheet */}
                  <div className="flex items-center gap-1.5 ml-auto">
                    <button
                      type="button"
                      onClick={handleAddRow}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Fila</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddColumn}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Columna</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSheet}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-[11px] font-bold cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Hoja</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sheet Tabs (Excel Style) */}
          {(currentDoc.sheets.length > 1 || isEditMode) && (
            <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1 shrink-0">
                Hojas:
              </span>
              {currentDoc.sheets.map((sheet, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedSheetIdx(idx);
                    setCurrentPage(1);
                    setSelectedCell(null);
                    setEditingCell(null);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 cursor-pointer ${
                    selectedSheetIdx === idx
                      ? 'bg-white text-emerald-800 shadow-xs border border-slate-300'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Table className="w-3 h-3 text-emerald-600" />
                  <span>{sheet.name || `Hoja ${idx + 1}`}</span>
                  <span className="text-[10px] text-slate-400 tabular-nums">({sheet.rows.length})</span>
                </button>
              ))}
            </div>
          )}

          {/* Spreadsheet Canvas */}
          <div className="overflow-auto max-h-[640px] bg-white relative select-text">
            {currentSheet && currentSheet.headers.length > 0 ? (
              <table className="border-collapse text-left font-sans text-xs w-max min-w-full">
                <thead>
                  {/* Excel Column Coordinates (A, B, C...) */}
                  <tr className="bg-slate-100 text-slate-600 border-b border-slate-300 text-[10px] font-mono select-none sticky top-0 z-20">
                    <th className="w-12 min-w-[48px] px-2 py-1.5 border-r border-slate-300 text-center bg-slate-200 font-bold sticky left-0 z-30">
                      #
                    </th>
                    {currentSheet.headers.map((_, colIdx) => {
                      const colW = currentSheet.colWidths?.[colIdx];
                      return (
                        <th
                          key={colIdx}
                          style={colW ? { width: `${colW}px`, minWidth: `${colW}px` } : { minWidth: '115px' }}
                          className="px-2 py-1.5 border-r border-slate-300 text-center font-bold bg-slate-100"
                        >
                          {getExcelColLetter(colIdx)}
                        </th>
                      );
                    })}
                  </tr>

                  {/* Legacy non-rawGrid Header Row */}
                  {!isRawGrid && (
                    <tr className="bg-emerald-50 text-emerald-950 border-b-2 border-emerald-300 font-bold text-xs sticky top-[25px] z-10">
                      <th className="px-2 py-2 border-r border-emerald-200 text-center bg-emerald-100 sticky left-0 z-20 font-mono text-[10px]">
                        1
                      </th>
                      {currentSheet.headers.map((header, colIdx) => (
                        <th key={colIdx} className="px-3 py-2 border-r border-emerald-200/80 whitespace-nowrap">
                          {header || `Columna ${colIdx + 1}`}
                        </th>
                      ))}
                    </tr>
                  )}
                </thead>

                <tbody className="bg-white">
                  {paginatedRows.map(({ row, origIdx }) => {
                    const displayRowNum = isRawGrid ? origIdx + 1 : origIdx + 2;
                    const rowHeightPx = currentSheet.rowHeights?.[origIdx];

                    return (
                      <tr
                        key={origIdx}
                        style={rowHeightPx ? { height: `${rowHeightPx}px` } : undefined}
                        className="group"
                      >
                        {/* Row Number */}
                        <td className="px-2 py-1.5 border-r border-b border-slate-200 text-center font-mono text-[10px] text-slate-500 bg-slate-50 font-semibold sticky left-0 z-10 select-none">
                          <div className="flex items-center justify-center gap-1">
                            <span className="tabular-nums">{displayRowNum}</span>
                            {isEditMode && currentSheet.rows.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(origIdx)}
                                title="Eliminar fila"
                                className="text-rose-500 hover:text-rose-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </td>

                        {/* Cells */}
                        {currentSheet.headers.map((_, colIdx) => {
                          if (isRawGrid && mergeLookup.covered.has(`${origIdx}-${colIdx}`)) {
                            return null;
                          }

                          const mergeSpan = isRawGrid ? mergeLookup.masters.get(`${origIdx}-${colIdx}`) : undefined;
                          const cellVal = row[colIdx];
                          const displayVal = cellVal !== null && cellVal !== undefined ? String(cellVal) : '';
                          const styleInfo = currentSheet.cellStyles?.[`${origIdx}-${colIdx}`];
                          const isNumeric = typeof cellVal === 'number' || (displayVal !== '' && !isNaN(Number(displayVal)));
                          const isSelected = selectedCell?.row === origIdx && selectedCell?.col === colIdx;
                          const isEditingThis = isEditMode && editingCell?.row === origIdx && editingCell?.col === colIdx;
                          const colW = currentSheet.colWidths?.[colIdx];

                          return (
                            <td
                              key={colIdx}
                              colSpan={mergeSpan?.colSpan}
                              rowSpan={mergeSpan?.rowSpan}
                              onClick={() => {
                                setSelectedCell({ row: origIdx, col: colIdx });
                                if (isEditMode) {
                                  setEditingCell({ row: origIdx, col: colIdx });
                                }
                              }}
                              onDoubleClick={() => {
                                setSelectedCell({ row: origIdx, col: colIdx });
                                if (isEditMode) {
                                  setEditingCell({ row: origIdx, col: colIdx });
                                }
                              }}
                              style={{
                                width: !mergeSpan && colW ? `${colW}px` : undefined,
                                minWidth: !mergeSpan && colW ? `${colW}px` : undefined,
                                backgroundColor: styleInfo?.bgColor || undefined,
                                color: styleInfo?.textColor || undefined,
                                fontWeight: styleInfo?.bold ? 700 : undefined,
                                fontStyle: styleInfo?.italic ? 'italic' : undefined,
                                textDecoration: styleInfo?.underline
                                  ? 'underline'
                                  : styleInfo?.strike
                                  ? 'line-through'
                                  : undefined,
                                fontSize: styleInfo?.fontSize ? `${Math.max(10, Math.min(24, styleInfo.fontSize))}px` : undefined,
                                textAlign: styleInfo?.align || (isNumeric ? 'right' : 'left'),
                                verticalAlign: styleInfo?.valign || 'middle',
                                borderTop: styleInfo?.borderTop || undefined,
                                borderRight: styleInfo?.borderRight || undefined,
                                borderBottom: styleInfo?.borderBottom || undefined,
                                borderLeft: styleInfo?.borderLeft || undefined,
                              }}
                              className={`px-2.5 py-1.5 border-r border-b border-slate-200/80 ${
                                styleInfo?.wrapText ? 'whitespace-pre-wrap break-words' : 'whitespace-nowrap'
                              } ${!styleInfo?.textColor ? 'text-slate-800' : ''} ${
                                isNumeric && !styleInfo?.align ? 'tabular-nums' : ''
                              } ${isSelected ? 'ring-2 ring-inset ring-emerald-600' : ''} ${
                                isEditMode ? 'cursor-cell' : 'cursor-default'
                              }`}
                            >
                              {isEditingThis ? (
                                <input
                                  type="text"
                                  autoFocus
                                  value={formulaInput}
                                  onChange={(e) => {
                                    setFormulaInput(e.target.value);
                                    handleCellValueChange(origIdx, colIdx, e.target.value);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === 'Escape') {
                                      setEditingCell(null);
                                    }
                                  }}
                                  className="w-full bg-white text-slate-900 border border-emerald-500 px-1.5 py-0.5 rounded text-xs focus:outline-none"
                                />
                              ) : (
                                <span title={displayVal}>{displayVal}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {indexedFilteredRows.length === 0 && (
                    <tr>
                      <td colSpan={currentSheet.headers.length + 1} className="p-8 text-center text-slate-400 text-xs">
                        {searchFilter ? 'No hay filas que coincidan con el término buscado.' : 'Esta hoja no contiene filas todavía.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                No se detectaron columnas o celdas en esta hoja.
              </div>
            )}
          </div>

          {/* Pagination & Footer */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center gap-2 tabular-nums">
              <span>
                Mostrando {indexedFilteredRows.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} a {Math.min(currentPage * rowsPerPage, indexedFilteredRows.length)} de {indexedFilteredRows.length} filas
              </span>
              {searchFilter && (
                <span className="text-emerald-700 font-semibold">
                  (filtrado de {currentSheet?.rows.length || 0} filas)
                </span>
              )}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 tabular-nums">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Anterior
                </button>
                <span className="px-2 font-mono font-semibold text-slate-700">
                  {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                  className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900">
              {activeFolder ? `Carpeta "${activeFolder.name}" vacía` : 'Sube o crea archivos Excel aquí'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Arrastra tus archivos .xlsx / .xls / .csv o súbelos desde tu computador. Quedarán guardados permanentemente en PostgreSQL con sus colores, bordes y columnas originales.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={onTriggerUpload}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Subir Excel desde Computador</span>
            </button>
            {onTriggerCreateExcel && (
              <button
                type="button"
                onClick={onTriggerCreateExcel}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <FilePlus2 className="w-4 h-4 text-emerald-400" />
                <span>Crear Nuevo Excel</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
