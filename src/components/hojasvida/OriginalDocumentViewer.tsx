import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Workbook, type WorkbookInstance } from '@fortune-sheet/react';
import type { Op, Sheet as FortuneSheet } from '@fortune-sheet/core';
import '@fortune-sheet/react/dist/index.css';
import { useMaintenance } from '../../context/MaintenanceContext';
import {
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  File as FileIcon,
  Trash2,
  Maximize2,
  Minimize2,
  Upload,
  User,
  Folder,
  FolderPlus,
  ArrowLeft,
  FolderOpen,
  ChevronRight,
  ExternalLink,
  Edit3,
  FolderInput,
  Check,
  FilePlus2,
  Loader2,
  Database,
  AlertCircle,
  X,
  AlignCenter,
  LayoutGrid,
  List
} from 'lucide-react';
import { UploadedDocument, DocumentFolder, UploadedDocumentSheet } from '../../types';
import {
  openDocumentInComputerExcel,
  rebuildWorkbookBase64FromDocOffThread,
  createSafeDocumentBlobUrl
} from '../../utils/excelEngine';
import {
  uploadedDocToFortuneSheets,
  fortuneSheetsToUploadedSheets
} from '../../utils/fortuneSheetAdapter';

interface OriginalDocumentViewerProps {
  documents: UploadedDocument[];
  activeDocId?: string;
  onSelectDocument: (docId: string) => void;
  onUpdateDocument?: (doc: UploadedDocument, options?: { silent?: boolean; omitRawBase64?: boolean; skipGlobalSyncBadge?: boolean }) => Promise<boolean | void> | void;
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

const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes <= 0) return 'Tamaño original';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const getDocVisualType = (doc: UploadedDocument): 'spreadsheet' | 'pdf' | 'image' | 'other' => {
  const mime = (doc.mimeType || '').toLowerCase();
  const ext = (doc.originalExtension || doc.name.split('.').pop() || '').toLowerCase();
  if (doc.type === 'excel' || doc.type === 'csv' || ['xlsx', 'xls', 'csv', 'xlsm', 'xlsb', 'ods'].includes(ext)) {
    return 'spreadsheet';
  }
  if (doc.type === 'pdf' || mime === 'application/pdf' || ext === 'pdf') {
    return 'pdf';
  }
  if (doc.type === 'image' || (mime.startsWith('image/') && !mime.includes('svg')) || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp'].includes(ext)) {
    return 'image';
  }
  return 'other';
};

const NON_MUTATING_OP_ROOTS = new Set([
  'luckysheet_select_save',
  'luckysheet_selection_range',
  'scrollLeft',
  'scrollTop',
  'zoomRatio',
  'status',
  'order',
  'calcChain',
  'filter_select'
]);

const isRealSheetMutationOp = (op: Op): boolean => {
  if (!op || typeof op !== 'object') return false;
  if (
    op.op === 'insertRowCol' ||
    op.op === 'deleteRowCol' ||
    op.op === 'addSheet' ||
    op.op === 'deleteSheet'
  ) {
    return true;
  }
  const rootKey = op.path && op.path.length > 0 ? String(op.path[0]) : '';
  if (NON_MUTATING_OP_ROOTS.has(rootKey)) return false;
  return (
    rootKey === 'data' ||
    rootKey === 'celldata' ||
    rootKey === 'config' ||
    rootKey === 'name' ||
    rootKey === 'frozen' ||
    rootKey === 'showGridLines' ||
    rootKey === 'hyperlink'
  );
};

const computeSheetsContentSignature = (sheets?: UploadedDocumentSheet[]): string => {
  if (!Array.isArray(sheets) || sheets.length === 0) return '[]';
  try {
    return JSON.stringify(
      sheets.map((s) => ({
        n: s.name,
        r: s.rows,
        f: s.cellFormulas || null,
        st: s.cellStyles || null,
        dv: s.cellDisplayValues || null,
        m: s.merges || null,
        cw: s.colWidths || null,
        rh: s.rowHeights || null,
        gl: s.showGridLines ?? true,
        fr: s.frozenRows || 0,
        fc: s.frozenCols || 0
      }))
    );
  } catch {
    return String(Date.now());
  }
};

const AUTOSAVE_DEBOUNCE_MS = 500;
const SAVED_DISPLAY_DURATION_MS = 2000;
const AUTO_CENTER_STORAGE_KEY = 'hdv_excel_auto_center';
const FOLDER_VIEW_MODE_STORAGE_KEY = 'hdv_folder_view_mode';

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
  const { notify, ensureUploadedDocumentLoaded } = useMaintenance();
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

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

  // Optimistic / debounced autosave state for FortuneSheet (explícito en 'idle' al abrir)
  const [draftDoc, setDraftDoc] = useState<UploadedDocument | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [isHydratingDoc, setIsHydratingDoc] = useState<boolean>(false);
  const [workbookSessionKey, setWorkbookSessionKey] = useState<string>('');
  const [workbookSeedSheets, setWorkbookSeedSheets] = useState<FortuneSheet[]>([]);

  // Vista de carpetas persistida (Cuadrícula o Lista)
  const [folderViewMode, setFolderViewMode] = useState<'grid' | 'list'>(() => {
    try {
      return localStorage.getItem(FOLDER_VIEW_MODE_STORAGE_KEY) === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });

  const handleSetFolderViewMode = useCallback((mode: 'grid' | 'list') => {
    setFolderViewMode(mode);
    try {
      localStorage.setItem(FOLDER_VIEW_MODE_STORAGE_KEY, mode);
    } catch {}
  }, []);

  // Auto-Centrar texto toggle (persistido por preferencia local)
  const [autoCenterEnabled, setAutoCenterEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUTO_CENTER_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const autoCenterRef = useRef<boolean>(autoCenterEnabled);
  autoCenterRef.current = autoCenterEnabled;

  const workbookRef = useRef<WorkbookInstance | null>(null);
  const latestDocRef = useRef<UploadedDocument | null>(null);
  const latestFortuneSheetsRef = useRef<FortuneSheet[] | null>(null);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedResetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bgBinarySyncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveSeqRef = useRef<number>(0);
  const editVersionRef = useRef<number>(0);
  const isDirtyRef = useRef<boolean>(false);
  const hasUserEditedDocRef = useRef<boolean>(false);
  const isMountedRef = useRef<boolean>(true);
  const lastSavedStampRef = useRef<string>('');
  const lastSyncedSignatureRef = useRef<string>('');

  const toggleAutoCenter = useCallback(() => {
    setAutoCenterEnabled(prev => {
      const next = !prev;
      autoCenterRef.current = next;
      try {
        localStorage.setItem(AUTO_CENTER_STORAGE_KEY, String(next));
      } catch {}
      return next;
    });
  }, []);

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

  const currentFolderDocuments = useMemo(() => {
    if (activeFolderId) {
      return documents.filter(d => d.folderId === activeFolderId);
    }
    return documents.filter(d => !d.folderId);
  }, [documents, activeFolderId]);

  const storeDoc = useMemo(() => {
    if (!currentFolderDocuments || currentFolderDocuments.length === 0) return null;
    if (activeDocId) {
      const found = currentFolderDocuments.find(d => d.id === activeDocId);
      if (found) return found;
    }
    return currentFolderDocuments[0];
  }, [currentFolderDocuments, activeDocId]);

  // Fast asynchronous PostgreSQL persistence (JSON sheets + styles first, silent background binary sync)
  const persistDocSnapshotToDb = useCallback(async (docSnapshot: UploadedDocument, options?: { syncBinaryNow?: boolean }) => {
    if (!onUpdateDocument || !isMountedRef.current) return;
    const seq = ++saveSeqRef.current;
    const capturedEditVersion = editVersionRef.current;
    if (savedResetTimerRef.current) {
      clearTimeout(savedResetTimerRef.current);
      savedResetTimerRef.current = null;
    }
    if (bgBinarySyncTimerRef.current) {
      clearTimeout(bgBinarySyncTimerRef.current);
      bgBinarySyncTimerRef.current = null;
    }
    setSaveStatus('saving');
    try {
      const isSpreadsheet = getDocVisualType(docSnapshot) === 'spreadsheet';
      const syncBinaryNow = Boolean(options?.syncBinaryNow && isSpreadsheet);
      let rebuiltBase64 = docSnapshot.rawBase64 || '';
      if (syncBinaryNow) {
        rebuiltBase64 = await rebuildWorkbookBase64FromDocOffThread(docSnapshot);
      }
      const approxBytes = rebuiltBase64 ? Math.round((rebuiltBase64.length * 3) / 4) : docSnapshot.sizeBytes;
      const updatedStamp = new Date().toISOString();
      const docToSave: UploadedDocument = {
        ...docSnapshot,
        rawBase64: rebuiltBase64 || docSnapshot.rawBase64,
        sheetsModifiedAfterRaw: isSpreadsheet ? !syncBinaryNow : docSnapshot.sheetsModifiedAfterRaw,
        sizeBytes: approxBytes || docSnapshot.sizeBytes,
        updatedAt: updatedStamp
      };
      lastSavedStampRef.current = `${docToSave.id}:${updatedStamp}`;

      const tryUpdateOnce = async () => {
        const updatePromise = Promise.resolve(
          onUpdateDocument(docToSave, {
            silent: true,
            omitRawBase64: isSpreadsheet && !syncBinaryNow,
            skipGlobalSyncBadge: true
          })
        );
        const timeoutPromise = new Promise<boolean>((resolve) => {
          setTimeout(() => resolve(false), 18000);
        });
        return (await Promise.race([updatePromise, timeoutPromise])) !== false;
      };

      let confirmedOk = await tryUpdateOnce();
      if (!confirmedOk && isMountedRef.current && saveSeqRef.current === seq) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        if (isMountedRef.current && saveSeqRef.current === seq) {
          confirmedOk = await tryUpdateOnce();
        }
      }

      if (!isMountedRef.current) return;
      // Si el usuario cambió a otro documento mientras guardaba el anterior, no alterar el estado visual del nuevo documento
      if (latestDocRef.current && latestDocRef.current.id !== docToSave.id) {
        return;
      }

      if (confirmedOk) {
        lastSyncedSignatureRef.current = computeSheetsContentSignature(docToSave.sheets);

        // Si hubo una nueva edición mientras este guardado viajaba a PostgreSQL, asegurar que el último cambio también se guarde
        const hasNewerUnflushedEdit = editVersionRef.current !== capturedEditVersion;
        if (hasNewerUnflushedEdit) {
          if (!autosaveTimerRef.current && latestDocRef.current && latestDocRef.current.id === docToSave.id) {
            void persistDocSnapshotToDb(latestDocRef.current);
          }
          return;
        }

        if (saveSeqRef.current === seq) {
          isDirtyRef.current = false;
          hasUserEditedDocRef.current = false;
          latestDocRef.current = docToSave;
          setDraftDoc(prev => (prev && prev.id === docToSave.id ? docToSave : prev));
          setSaveStatus('saved');
          savedResetTimerRef.current = setTimeout(() => {
            if (!isMountedRef.current) return;
            if (saveSeqRef.current === seq && !isDirtyRef.current) {
              setSaveStatus('idle');
            }
          }, SAVED_DISPLAY_DURATION_MS);

          // Silent off-thread .xlsx binary refresh when idle (never flashes "Guardando...")
          if (isSpreadsheet && !syncBinaryNow) {
            const targetId = docToSave.id;
            const targetSig = lastSyncedSignatureRef.current;
            bgBinarySyncTimerRef.current = setTimeout(() => {
              void (async () => {
                if (!isMountedRef.current || isDirtyRef.current || latestDocRef.current?.id !== targetId) return;
                try {
                  const fullBase64 = await rebuildWorkbookBase64FromDocOffThread(docToSave);
                  if (!fullBase64 || !isMountedRef.current || isDirtyRef.current || latestDocRef.current?.id !== targetId) return;
                  if (computeSheetsContentSignature(latestDocRef.current?.sheets) !== targetSig) return;
                  const withBinary: UploadedDocument = {
                    ...docToSave,
                    rawBase64: fullBase64,
                    sheetsModifiedAfterRaw: false,
                    sizeBytes: Math.round((fullBase64.length * 3) / 4) || docToSave.sizeBytes,
                    updatedAt: new Date().toISOString()
                  };
                  lastSavedStampRef.current = `${withBinary.id}:${withBinary.updatedAt}`;
                  await onUpdateDocument(withBinary, { silent: true, skipGlobalSyncBadge: true });
                } catch {}
              })();
            }, 2200);
          }
        }
      } else if (saveSeqRef.current === seq) {
        setSaveStatus('error');
      }
    } catch (err) {
      console.error('Error en autoguardado de hoja:', err);
      if (isMountedRef.current && saveSeqRef.current === seq && latestDocRef.current?.id === docSnapshot.id) {
        setSaveStatus('error');
      }
    }
  }, [onUpdateDocument]);

  const flushPendingAutosave = useCallback(async (syncBinaryNow = false): Promise<UploadedDocument | null> => {
    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
    const snap = latestDocRef.current;
    if (snap && (isDirtyRef.current || (syncBinaryNow && snap.sheetsModifiedAfterRaw)) && onUpdateDocument) {
      await persistDocSnapshotToDb(snap, { syncBinaryNow });
      return latestDocRef.current;
    }
    return snap;
  }, [onUpdateDocument, persistDocSnapshotToDb]);

  // Cleanup timers on unmount
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
      if (savedResetTimerRef.current) clearTimeout(savedResetTimerRef.current);
      if (bgBinarySyncTimerRef.current) clearTimeout(bgBinarySyncTimerRef.current);
    };
  }, []);

  // Synchronize storeDoc -> FortuneSheet seed ONLY when switching documents, hydrating deferred content, or receiving a true remote change
  useEffect(() => {
    if (!storeDoc) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      if (savedResetTimerRef.current) {
        clearTimeout(savedResetTimerRef.current);
        savedResetTimerRef.current = null;
      }
      if (bgBinarySyncTimerRef.current) {
        clearTimeout(bgBinarySyncTimerRef.current);
        bgBinarySyncTimerRef.current = null;
      }
      isDirtyRef.current = false;
      hasUserEditedDocRef.current = false;
      lastSyncedSignatureRef.current = '';
      latestDocRef.current = null;
      latestFortuneSheetsRef.current = null;
      setDraftDoc(null);
      setIsHydratingDoc(false);
      setWorkbookSessionKey('');
      setWorkbookSeedSheets([]);
      setSaveStatus('idle');
      return;
    }

    const docNeedsHydration = (d: UploadedDocument): boolean => {
      if (d.isDeferredPayload) return true;
      const vType = getDocVisualType(d);
      if (vType === 'spreadsheet') {
        return Array.isArray(d.sheets) && d.sheets.some(s => Boolean(s?.isDeferred));
      }
      return Boolean(d.hasRawBinary && !d.rawBase64);
    };

    const prevId = latestDocRef.current?.id;
    const isSwitchingDoc = prevId !== storeDoc.id;

    if (isSwitchingDoc) {
      // Flush any unsaved edits from previous doc before switching cleanly
      if (prevId && isDirtyRef.current && latestDocRef.current && onUpdateDocument) {
        if (autosaveTimerRef.current) {
          clearTimeout(autosaveTimerRef.current);
          autosaveTimerRef.current = null;
        }
        const prevDocToFlush = latestDocRef.current;
        void onUpdateDocument(
          { ...prevDocToFlush, updatedAt: new Date().toISOString() },
          { silent: true, omitRawBase64: getDocVisualType(prevDocToFlush) === 'spreadsheet', skipGlobalSyncBadge: true }
        );
      }
      if (savedResetTimerRef.current) {
        clearTimeout(savedResetTimerRef.current);
        savedResetTimerRef.current = null;
      }
      isDirtyRef.current = false;
      hasUserEditedDocRef.current = false;
      latestDocRef.current = storeDoc;
      setDraftDoc(storeDoc);
      setSaveStatus('idle');

      if (docNeedsHydration(storeDoc)) {
        lastSyncedSignatureRef.current = '';
        latestFortuneSheetsRef.current = null;
        setWorkbookSeedSheets([]);
        setWorkbookSessionKey('');
        setIsHydratingDoc(true);
        const targetDocId = storeDoc.id;
        void ensureUploadedDocumentLoaded(targetDocId).finally(() => {
          if (isMountedRef.current && latestDocRef.current?.id === targetDocId) {
            setIsHydratingDoc(false);
          }
        });
        return;
      }

      setIsHydratingDoc(false);
      lastSyncedSignatureRef.current = computeSheetsContentSignature(storeDoc.sheets);
      if (getDocVisualType(storeDoc) === 'spreadsheet') {
        const converted = uploadedDocToFortuneSheets(storeDoc);
        latestFortuneSheetsRef.current = converted;
        setWorkbookSeedSheets(converted);
        setWorkbookSessionKey(`${storeDoc.id}-${Date.now()}`);
      } else {
        latestFortuneSheetsRef.current = null;
        setWorkbookSeedSheets([]);
        setWorkbookSessionKey(storeDoc.id);
      }
      return;
    }

    // Hydration finished for currently active document
    if (docNeedsHydration(storeDoc)) {
      if (!isHydratingDoc) {
        setIsHydratingDoc(true);
        const targetDocId = storeDoc.id;
        void ensureUploadedDocumentLoaded(targetDocId).finally(() => {
          if (isMountedRef.current && latestDocRef.current?.id === targetDocId) {
            setIsHydratingDoc(false);
          }
        });
      }
      return;
    }

    const incomingSig = computeSheetsContentSignature(storeDoc.sheets);
    const awaitingInitialMount = getDocVisualType(storeDoc) === 'spreadsheet' && !workbookSessionKey;
    if (awaitingInitialMount) {
      setIsHydratingDoc(false);
      lastSyncedSignatureRef.current = incomingSig;
      latestDocRef.current = storeDoc;
      setDraftDoc(storeDoc);
      const converted = uploadedDocToFortuneSheets(storeDoc);
      latestFortuneSheetsRef.current = converted;
      setWorkbookSeedSheets(converted);
      setWorkbookSessionKey(`${storeDoc.id}-${Date.now()}`);
      return;
    }

    // Same document updated in store: NEVER remount Workbook if content signature matches our own synced state
    if (incomingSig === lastSyncedSignatureRef.current) {
      setIsHydratingDoc(false);
      if (!isDirtyRef.current && storeDoc !== latestDocRef.current) {
        latestDocRef.current = storeDoc;
        setDraftDoc(storeDoc);
      }
      return;
    }

    const incomingStamp = `${storeDoc.id}:${storeDoc.updatedAt || storeDoc.uploadDate}`;
    const isFromSelfSave = incomingStamp === lastSavedStampRef.current;
    if (!isFromSelfSave && !isDirtyRef.current && storeDoc !== latestDocRef.current) {
      const prevStamp = `${latestDocRef.current?.id}:${latestDocRef.current?.updatedAt || latestDocRef.current?.uploadDate}`;
      if (incomingStamp !== prevStamp) {
        hasUserEditedDocRef.current = false;
        setIsHydratingDoc(false);
        lastSyncedSignatureRef.current = incomingSig;
        latestDocRef.current = storeDoc;
        setDraftDoc(storeDoc);
        if (getDocVisualType(storeDoc) === 'spreadsheet') {
          const converted = uploadedDocToFortuneSheets(storeDoc);
          latestFortuneSheetsRef.current = converted;
          setWorkbookSeedSheets(converted);
          setWorkbookSessionKey(`${storeDoc.id}-remote-${Date.now()}`);
        }
      }
    }
  }, [storeDoc, onUpdateDocument, persistDocSnapshotToDb, ensureUploadedDocumentLoaded, isHydratingDoc, workbookSessionKey]);

  const currentDoc = draftDoc || storeDoc;
  const currentVisualType = useMemo(
    () => (currentDoc ? getDocVisualType(currentDoc) : 'spreadsheet'),
    [currentDoc]
  );

  // Safe Blob URL for inline PDF / Image preview (with proper cleanup)
  const previewBlobInfo = useMemo(() => {
    if (!currentDoc || (currentVisualType !== 'pdf' && currentVisualType !== 'image')) {
      return null;
    }
    return createSafeDocumentBlobUrl(currentDoc);
  }, [currentDoc, currentVisualType]);

  const previewBlobUrl = previewBlobInfo?.url || null;

  useEffect(() => {
    return () => {
      if (previewBlobUrl) {
        URL.revokeObjectURL(previewBlobUrl);
      }
    };
  }, [previewBlobUrl]);

  // Auto-centrado automático al escribir o pegar texto nuevo cuando el interruptor está activo
  const applyAutoCenterToCoords = useCallback((coords: Array<{ r: number; c: number }>) => {
    if (!autoCenterRef.current || !workbookRef.current || coords.length === 0) return;
    queueMicrotask(() => {
      const wb = workbookRef.current;
      if (!wb || !autoCenterRef.current) return;
      const seen = new Set<string>();
      for (const { r, c } of coords) {
        if (isNaN(r) || isNaN(c) || r < 0 || c < 0) continue;
        const key = `${r}-${c}`;
        if (seen.has(key)) continue;
        seen.add(key);
        try {
          const val = wb.getCellValue(r, c, { type: 'v' });
          const mVal = wb.getCellValue(r, c, { type: 'm' });
          const fVal = wb.getCellValue(r, c, { type: 'f' });
          const hasText =
            (val !== undefined && val !== null && val !== '') ||
            (mVal !== undefined && mVal !== null && mVal !== '') ||
            Boolean(fVal);
          if (!hasText) continue;
          const currentHt = wb.getCellValue(r, c, { type: 'ht' });
          if (currentHt !== 0 && String(currentHt) !== '0') {
            hasUserEditedDocRef.current = true;
            wb.setCellFormat(r, c, 'ht', '0');
          }
        } catch {}
      }
    });
  }, []);

  const handleAfterUpdateCell = useCallback((row: number, column: number, _oldValue: any, newValue: any) => {
    hasUserEditedDocRef.current = true;
    if (!autoCenterRef.current || !workbookRef.current) return;
    const hasText =
      newValue !== null &&
      newValue !== undefined &&
      ((typeof newValue === 'object' &&
        ((newValue.v !== undefined && newValue.v !== null && newValue.v !== '') ||
          (newValue.m !== undefined && newValue.m !== null && newValue.m !== '') ||
          Boolean(newValue.f))) ||
        (typeof newValue !== 'object' && String(newValue) !== ''));
    if (!hasText) return;
    const htVal = typeof newValue === 'object' ? newValue?.ht : undefined;
    if (htVal !== 0 && String(htVal) !== '0') {
      try {
        workbookRef.current.setCellFormat(row, column, 'ht', '0');
      } catch {}
    }
  }, []);

  const workbookHooks = useMemo(
    () => ({ afterUpdateCell: handleAfterUpdateCell }),
    [handleAfterUpdateCell]
  );

  // Filtrar operaciones reales de edición del usuario (ignora montaje inicial, resize, foco y selección)
  const handleFortuneSheetOp = useCallback((ops: Op[]) => {
    if (!Array.isArray(ops) || ops.length === 0) return;
    if (ops.some(isRealSheetMutationOp)) {
      hasUserEditedDocRef.current = true;
    }
    if (!autoCenterRef.current) return;

    const coordsToCenter: Array<{ r: number; c: number }> = [];
    for (const op of ops) {
      if (!op || !Array.isArray(op.path) || op.path[0] !== 'data' || op.path.length < 3) continue;
      // Solo disparar en escritura de celda o valor/texto (nunca sobre cambios manuales de ht/vt)
      const subKey = op.path.length > 3 ? String(op.path[3]) : '';
      if (op.path.length === 3 || subKey === 'v' || subKey === 'm' || subKey === 'ct') {
        const r = Number(op.path[1]);
        const c = Number(op.path[2]);
        if (!isNaN(r) && !isNaN(c)) {
          coordsToCenter.push({ r, c });
        }
      }
    }
    if (coordsToCenter.length > 0) {
      applyAutoCenterToCoords(coordsToCenter);
    }
  }, [applyAutoCenterToCoords]);

  // FortuneSheet live onChange: 0ms Optimistic UI + 1200ms debounce -> async background PostgreSQL save
  const handleFortuneSheetChange = useCallback((nextSheets: FortuneSheet[]) => {
    if (!latestDocRef.current || !Array.isArray(nextSheets) || nextSheets.length === 0) return;

    latestFortuneSheetsRef.current = nextSheets;

    // Si FortuneSheet disparó onChange sin una operación real de edición del usuario, ignorar completamente
    if (!hasUserEditedDocRef.current) {
      return;
    }

    const baseDoc = latestDocRef.current;
    const mappedSheets = fortuneSheetsToUploadedSheets(nextSheets, baseDoc.sheets);
    const nextSig = computeSheetsContentSignature(mappedSheets);
    if (nextSig === lastSyncedSignatureRef.current) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      isDirtyRef.current = false;
      hasUserEditedDocRef.current = false;
      setSaveStatus(curr => (curr === 'saving' ? 'idle' : curr));
      return;
    }

    const optimisticDoc: UploadedDocument = {
      ...baseDoc,
      sheets: mappedSheets,
      totalRows: mappedSheets.reduce((acc, s) => acc + (s.rows?.length || 0), 0),
      totalColumns: Math.max(...mappedSheets.map(s => s.headers?.length || 0), 1),
      sheetsModifiedAfterRaw: true,
      updatedAt: new Date().toISOString()
    };

    // 0ms instant optimistic update without resetting Workbook key
    latestDocRef.current = optimisticDoc;
    isDirtyRef.current = true;
    editVersionRef.current += 1;
    setDraftDoc(optimisticDoc);
    if (savedResetTimerRef.current) {
      clearTimeout(savedResetTimerRef.current);
      savedResetTimerRef.current = null;
    }
    if (bgBinarySyncTimerRef.current) {
      clearTimeout(bgBinarySyncTimerRef.current);
      bgBinarySyncTimerRef.current = null;
    }
    // Al escribir o editar, mostrar inmediatamente "Guardando..."
    setSaveStatus('saving');

    if (autosaveTimerRef.current) {
      clearTimeout(autosaveTimerRef.current);
    }
    autosaveTimerRef.current = setTimeout(() => {
      autosaveTimerRef.current = null;
      const snap = latestDocRef.current;
      if (snap && isDirtyRef.current) {
        void persistDocSnapshotToDb(snap);
      } else {
        setSaveStatus(curr => (curr === 'saving' ? 'idle' : curr));
      }
    }, AUTOSAVE_DEBOUNCE_MS);
  }, [persistDocSnapshotToDb]);

  const handleOpenInComputerExcel = async (doc: UploadedDocument) => {
    try {
      let targetDoc = doc;
      if (latestDocRef.current && latestDocRef.current.id === doc.id) {
        if (isDirtyRef.current || latestDocRef.current.sheetsModifiedAfterRaw) {
          const flushed = await flushPendingAutosave(true);
          if (flushed) targetDoc = flushed;
          else if (getDocVisualType(latestDocRef.current) === 'spreadsheet') {
            const rebuiltBase64 = await rebuildWorkbookBase64FromDocOffThread(latestDocRef.current);
            targetDoc = { ...latestDocRef.current, rawBase64: rebuiltBase64, sheetsModifiedAfterRaw: false };
          }
        } else if (latestDocRef.current.rawBase64) {
          // Si el usuario no modificó celdas, descargar el binario original intacto bit a bit
          targetDoc = latestDocRef.current;
        }
      }
      if (!targetDoc.rawBase64 && (targetDoc.isDeferredPayload || targetDoc.hasRawBinary)) {
        const hydrated = await ensureUploadedDocumentLoaded(targetDoc.id);
        if (hydrated) targetDoc = hydrated;
      }
      await openDocumentInComputerExcel(targetDoc);
    } catch (err) {
      console.error('Error abriendo archivo en computador:', err);
      notify('No se pudo abrir el archivo en tu computador.');
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
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    if (onQuickUploadFiles) {
      await onQuickUploadFiles(files);
    } else {
      onTriggerUpload();
    }
  };

  // Indicador de guardado desacoplado de sincronizaciones globales no relacionadas
  const effectiveSaveStatus = saveStatus;

  const renderDocIcon = (doc: UploadedDocument) => {
    const vType = getDocVisualType(doc);
    if (vType === 'spreadsheet') return <FileSpreadsheet className="w-4 h-4" />;
    if (vType === 'pdf') return <FileText className="w-4 h-4" />;
    if (vType === 'image') return <ImageIcon className="w-4 h-4" />;
    return <FileIcon className="w-4 h-4" />;
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDraggingFiles(true); }}
      onDragLeave={() => setIsDraggingFiles(false)}
      onDrop={handleDropFiles}
      className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-[2100] bg-slate-100 p-4 sm:p-6 overflow-auto flex flex-col' : ''} ${
        isDraggingFiles ? 'ring-2 ring-emerald-500 rounded-2xl' : ''
      }`}
    >
      {/* Top Action Header */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900">
                Archivero de Carpetas y Editor Excel In-App
              </h3>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 tabular-nums">
                {documents.length} {documents.length === 1 ? 'archivo' : 'archivos'} • PostgreSQL
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sube archivos Excel, PDF, Word, imágenes o cualquier documento. Edición Excel idéntica con autoguardado instantáneo.
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
                if (window.confirm(`¿Estás seguro de eliminar permanentemente los ${documents.length} archivos guardados?`)) {
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
            <span>Subir Archivo {activeFolder ? `a "${activeFolder.name}"` : ''}</span>
          </button>
        </div>
      </div>

      {/* Folder Breadcrumb (when inside a folder/subfolder) */}
      {activeFolderId && (
        <div className="bg-white border border-emerald-200 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
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

      {/* Folders / Subfolders Grid & List View */}
      {!isFullscreen && (
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
            <div className="flex items-center gap-2 flex-wrap">
              {/* Toggle Vista Cuadrícula / Lista */}
              <div
                className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200"
                role="group"
                aria-label="Modo de vista de carpetas"
              >
                <button
                  type="button"
                  onClick={() => handleSetFolderViewMode('grid')}
                  title="Vista en cuadrícula"
                  aria-pressed={folderViewMode === 'grid'}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    folderViewMode === 'grid'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Cuadrícula</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetFolderViewMode('list')}
                  title="Vista en lista"
                  aria-pressed={folderViewMode === 'list'}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    folderViewMode === 'list'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Lista</span>
                </button>
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
          </div>

          {childFolders.length === 0 ? (
            <div className="text-center py-5 text-slate-500 text-xs border border-dashed border-slate-200 rounded-xl bg-slate-50/50">
              {activeFolder
                ? `No hay subcarpetas dentro de "${activeFolder.name}". Pulsa "Nueva Subcarpeta" para organizar aún más este directorio.`
                : 'No hay carpetas creadas todavía. Crea una carpeta para organizar tus archivos por equipos, zonas o años.'}
            </div>
          ) : folderViewMode === 'list' ? (
            <div className="divide-y divide-slate-200/80 border border-slate-200 rounded-xl overflow-hidden bg-white">
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
                    className="group flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-lg ${cStyle.bg} ${cStyle.text} border ${cStyle.border} flex items-center justify-center shrink-0`}>
                        <FolderOpen className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        {isRenaming ? (
                          <div className="flex items-center gap-1 max-w-xs" onClick={(e) => e.stopPropagation()}>
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
                          <div className="flex items-center gap-2 min-w-0">
                            <h5 className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-800">
                              {folder.name}
                            </h5>
                            {folder.description && (
                              <span className="text-[11px] text-slate-400 truncate hidden md:inline">
                                • {folder.description}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <span className="text-[11px] text-slate-500 font-medium tabular-nums whitespace-nowrap">
                        {directSubfoldersCount > 0
                          ? `${directSubfoldersCount} subc. • ${totalNestedDocsCount} arch.`
                          : `${directDocsCount} ${directDocsCount === 1 ? 'archivo' : 'archivos'}`}
                      </span>

                      {onUpdateFolder && folders.length > 1 && (
                        <select
                          value={getEffectiveParentId(folder) || ''}
                          onChange={(e) => {
                            const nextParent = e.target.value || null;
                            onUpdateFolder(folder.id, { parentFolderId: nextParent });
                          }}
                          className="text-[11px] font-semibold bg-white border border-slate-200 rounded-lg px-2 py-0.5 text-slate-700 max-w-[140px] truncate focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          title="Mover carpeta dentro de otra carpeta"
                        >
                          <option value="">Raíz</option>
                          {flattenedFolderOptions
                            .filter(opt => !descendantSet.has(opt.folder.id))
                            .map(opt => (
                              <option key={opt.folder.id} value={opt.folder.id}>{opt.label}</option>
                            ))}
                        </select>
                      )}

                      <div className="flex items-center gap-1">
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
                        <ChevronRight
                          onClick={() => { if (!isRenaming) onSelectFolder(folder.id); }}
                          className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
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
      )}

      {/* Files Grid in Current Directory */}
      {!isFullscreen && currentFolderDocuments.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Archivos {activeFolder ? `en "${activeFolder.name}"` : 'en Raíz'} ({currentFolderDocuments.length})
              </h4>
            </div>
            <span className="text-[11px] text-slate-500">
              Haz clic en un archivo para editarlo o previsualizarlo al instante
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {currentFolderDocuments.map((doc) => {
              const isSelected = currentDoc?.id === doc.id;
              const vType = getDocVisualType(doc);
              return (
                <div
                  key={doc.id}
                  onClick={() => {
                    onSelectDocument(doc.id);
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
                        {renderDocIcon(doc)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate" title={doc.name}>
                          {doc.name}
                        </p>
                        <p className="text-[11px] text-slate-500 tabular-nums truncate">
                          {vType === 'spreadsheet'
                            ? `${doc.sheets?.length || 1} ${(doc.sheets?.length || 1) === 1 ? 'hoja' : 'hojas'} • ${doc.totalRows} filas`
                            : `${(doc.originalExtension || doc.type || 'Archivo').toUpperCase()} • ${formatFileSize(doc.sizeBytes)}`} • {new Date(doc.uploadDate).toLocaleDateString('es-ES')}
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
                      title="Abrir en la aplicación del computador con formato 100% original"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>{vType === 'spreadsheet' ? 'Abrir en Excel' : 'Abrir en PC'}</span>
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

      {/* New Folder / Subfolder Modal */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-[2200] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const cleanName = newFolderNameInput.trim();
              if (!cleanName) return;
              const targetParent = newFolderParentId ?? activeFolderId ?? null;
              const chosenColor = newFolderColor;
              const chosenDesc = newFolderDesc.trim() || undefined;
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
                  placeholder="Ej. Hojas de vida, fichas técnicas y manuales PDF"
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

      {/* Main High-Fidelity Document Studio / Viewer */}
      {currentDoc ? (
        <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden flex flex-col ${isFullscreen ? 'flex-1 min-h-0' : ''}`}>
          {/* Document Header Bar */}
          <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col xl:flex-row xl:items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-slate-900 truncate">{currentDoc.name}</h4>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Database className="w-3 h-3" />
                  <span>PostgreSQL</span>
                </span>

                {/* Discreet Autoguardado Status Indicator */}
                {effectiveSaveStatus !== 'idle' && (
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium transition-opacity ${
                      effectiveSaveStatus === 'saving'
                        ? 'text-sky-700 bg-sky-50 border border-sky-200'
                        : effectiveSaveStatus === 'saved'
                        ? 'text-emerald-700 bg-emerald-50 border border-emerald-200'
                        : 'text-rose-700 bg-rose-50 border border-rose-200'
                    }`}
                    aria-live="polite"
                  >
                    {effectiveSaveStatus === 'saving' ? (
                      <>
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Guardando...</span>
                      </>
                    ) : effectiveSaveStatus === 'saved' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.75]" />
                        <span>Guardado</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        <span>Error al guardar</span>
                      </>
                    )}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5 text-[11px] text-slate-500 mt-1 flex-wrap tabular-nums">
                <span className="flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>Por <strong>{currentDoc.uploadedBy}</strong></span>
                </span>
                <span>•</span>
                {currentVisualType === 'spreadsheet' ? (
                  <>
                    <span>{currentDoc.sheets?.length || 1} {(currentDoc.sheets?.length || 1) === 1 ? 'Hoja' : 'Hojas'}</span>
                    <span>•</span>
                    <span>{currentDoc.totalRows || 0} Filas</span>
                    <span>•</span>
                    <span>Autoguardado activo</span>
                  </>
                ) : (
                  <>
                    <span>{(currentDoc.originalExtension || currentDoc.type || 'Archivo').toUpperCase()}</span>
                    <span>•</span>
                    <span>{formatFileSize(currentDoc.sizeBytes)}</span>
                  </>
                )}
              </div>
            </div>

            {/* Document Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              {currentVisualType === 'spreadsheet' && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoCenterEnabled}
                  onClick={toggleAutoCenter}
                  title="Cuando está activo, todo texto nuevo que escribas o pegues se centrará automáticamente"
                  className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    autoCenterEnabled
                      ? 'bg-emerald-50 border-emerald-400 text-emerald-800'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <AlignCenter className={`w-3.5 h-3.5 ${autoCenterEnabled ? 'text-emerald-600' : 'text-slate-500'}`} />
                  <span>Auto-centrar texto</span>
                  <span
                    className={`relative inline-flex h-4 w-7 items-center rounded-full transition-colors ${
                      autoCenterEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        autoCenterEnabled ? 'translate-x-3.5' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleOpenInComputerExcel(currentDoc)}
                title="Abrir archivo original idéntico en el computador"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>{currentVisualType === 'spreadsheet' ? 'Abrir en Excel (PC)' : 'Abrir / Descargar Archivo'}</span>
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

          {/* Interactive Renderer by File Type */}
          {currentVisualType === 'spreadsheet' ? (
            <div
              className={`w-full relative z-0 isolate overflow-hidden bg-white excel-precision-scroll ${
                isFullscreen ? 'flex-1 min-h-[75vh]' : 'h-[660px]'
              }`}
            >
              {!isHydratingDoc && workbookSessionKey && workbookSeedSheets.length > 0 ? (
                <Workbook
                  ref={workbookRef}
                  key={workbookSessionKey}
                  data={workbookSeedSheets}
                  hooks={workbookHooks}
                  onOp={handleFortuneSheetOp}
                  onChange={handleFortuneSheetChange}
                  showToolbar
                  showFormulaBar
                  showSheetTabs
                  lang="es"
                />
              ) : (
                <div className="h-full flex flex-col items-center justify-center gap-2 text-xs text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                  <span>{isHydratingDoc ? 'Cargando hoja de cálculo desde PostgreSQL...' : 'Cargando hoja de cálculo...'}</span>
                </div>
              )}
            </div>
          ) : currentVisualType === 'pdf' && previewBlobUrl ? (
            <div className={`w-full bg-slate-100 excel-precision-scroll ${isFullscreen ? 'flex-1 min-h-[75vh]' : 'h-[660px]'}`}>
              <iframe
                src={previewBlobUrl}
                title={currentDoc.name}
                className="w-full h-full border-0"
              />
            </div>
          ) : currentVisualType === 'image' && previewBlobUrl ? (
            <div className={`w-full bg-slate-950/5 flex items-center justify-center p-4 overflow-auto excel-precision-scroll ${isFullscreen ? 'flex-1 min-h-[75vh]' : 'h-[560px]'}`}>
              <img
                src={previewBlobUrl}
                alt={currentDoc.name}
                className="max-w-full max-h-full object-contain rounded-xl shadow-sm border border-slate-200 bg-white"
              />
            </div>
          ) : (
            <div className="p-10 text-center space-y-4 bg-slate-50/40">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto">
                <FileText className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h4 className="text-sm font-bold text-slate-900">{currentDoc.name}</h4>
                <p className="text-xs text-slate-500">
                  Archivo almacenado bit a bit en PostgreSQL ({currentDoc.mimeType || 'Formato binario original'} • {formatFileSize(currentDoc.sizeBytes)}).
                </p>
                <p className="text-xs text-slate-500">
                  Pulsa el botón inferior para abrirlo directamente en la aplicación correspondiente de tu computador.
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenInComputerExcel(currentDoc)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir / Descargar Archivo Original</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900">
              {activeFolder ? `Carpeta "${activeFolder.name}" vacía` : 'Sube o crea archivos aquí'}
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Arrastra tus archivos Excel (.xlsx, .xls, .csv), PDF, Word, imágenes o manuales técnicos. Se guardan permanentemente en PostgreSQL con formato original y autoguardado al instante.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
            <button
              type="button"
              onClick={onTriggerUpload}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Subir Archivo desde Computador</span>
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
