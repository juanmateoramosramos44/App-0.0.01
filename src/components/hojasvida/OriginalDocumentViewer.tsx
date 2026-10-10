import React, { useState, useMemo } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { 
  FileSpreadsheet, 
  FileText, 
  Search, 
  Download, 
  Trash2, 
  Maximize2, 
  Minimize2, 
  Upload, 
  ShieldCheck, 
  Lock, 
  AlertCircle,
  Eye,
  RefreshCw,
  Layers,
  Table,
  CheckCircle2,
  Calendar,
  User,
  HardDrive,
  Folder,
  FolderPlus,
  ArrowLeft,
  FolderOpen,
  ChevronRight,
  ExternalLink,
  Edit3,
  Plus,
  Palette
} from 'lucide-react';
import { UploadedDocument, DocumentFolder } from '../../types';

interface OriginalDocumentViewerProps {
  documents: UploadedDocument[];
  activeDocId?: string;
  onSelectDocument: (docId: string) => void;
  onUpdateDocument?: (doc: UploadedDocument) => void;
  onDeleteDocument: (docId: string) => Promise<void>;
  onClearAllDocuments?: () => Promise<void>;
  onTriggerUpload: () => void;
  isAdmin: boolean;
  onRequireAdminPin: (actionName: string, onSuccess: () => void) => void;
  onCleanImportedEquipments?: () => void;
  importedEquipmentsCount?: number;
  folders: DocumentFolder[];
  onCreateFolder: (name: string) => void;
  onDeleteFolder: (folderId: string) => void;
  activeFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  canDeleteRecords?: boolean;
}

export const OriginalDocumentViewer: React.FC<OriginalDocumentViewerProps> = ({
  documents,
  activeDocId,
  onSelectDocument,
  onUpdateDocument,
  onDeleteDocument,
  onClearAllDocuments,
  onTriggerUpload,
  isAdmin,
  onRequireAdminPin,
  onCleanImportedEquipments,
  importedEquipmentsCount = 0,
  folders = [],
  onCreateFolder,
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
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderNameInput, setNewFolderNameInput] = useState('');
  const rowsPerPage = 50;

  // Edit Mode & Theme State for Excel Tables
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [headerTheme, setHeaderTheme] = useState<'emerald' | 'blue' | 'dark' | 'amber'>('emerald');

  const getThemeClasses = () => {
    switch (headerTheme) {
      case 'blue':
        return {
          headerTr: 'bg-blue-50/90 text-blue-950 border-blue-300',
          headerIndex: 'bg-blue-100 text-blue-900',
          badge: 'bg-blue-600 text-white'
        };
      case 'dark':
        return {
          headerTr: 'bg-slate-900 text-slate-100 border-slate-700',
          headerIndex: 'bg-slate-800 text-slate-200',
          badge: 'bg-slate-700 text-white'
        };
      case 'amber':
        return {
          headerTr: 'bg-amber-50/90 text-amber-950 border-amber-300',
          headerIndex: 'bg-amber-100 text-amber-900',
          badge: 'bg-amber-600 text-white'
        };
      case 'emerald':
      default:
        return {
          headerTr: 'bg-emerald-50/90 text-emerald-950 border-emerald-300',
          headerIndex: 'bg-emerald-100 text-emerald-900',
          badge: 'bg-emerald-600 text-white'
        };
    }
  };
  const theme = getThemeClasses();

  const handleCellEdit = (filteredRowIdx: number, colIdx: number, newValue: string) => {
    if (!currentDoc || !currentSheet || !onUpdateDocument) return;
    const absoluteRowIdx = (currentPage - 1) * rowsPerPage + filteredRowIdx;
    
    const updatedSheets = [...currentDoc.sheets];
    const sheetToUpdate = { ...updatedSheets[selectedSheetIdx] };
    const newRows = sheetToUpdate.rows.map((row, rIdx) => {
      if (rIdx === absoluteRowIdx) {
        const updatedRow = [...row];
        updatedRow[colIdx] = newValue;
        return updatedRow;
      }
      return row;
    });
    sheetToUpdate.rows = newRows;
    updatedSheets[selectedSheetIdx] = sheetToUpdate;

    const updatedDoc: UploadedDocument = {
      ...currentDoc,
      sheets: updatedSheets,
      totalRows: updatedSheets.reduce((acc, s) => acc + s.rows.length, 0)
    };
    onUpdateDocument(updatedDoc);
  };

  const handleHeaderEdit = (colIdx: number, newHeaderName: string) => {
    if (!currentDoc || !currentSheet || !onUpdateDocument) return;
    const updatedSheets = [...currentDoc.sheets];
    const sheetToUpdate = { ...updatedSheets[selectedSheetIdx] };
    const newHeaders = [...sheetToUpdate.headers];
    newHeaders[colIdx] = newHeaderName;
    sheetToUpdate.headers = newHeaders;
    updatedSheets[selectedSheetIdx] = sheetToUpdate;

    const updatedDoc: UploadedDocument = {
      ...currentDoc,
      sheets: updatedSheets
    };
    onUpdateDocument(updatedDoc);
  };

  const handleAddRow = () => {
    if (!currentDoc || !currentSheet || !onUpdateDocument) return;
    const updatedSheets = [...currentDoc.sheets];
    const sheetToUpdate = { ...updatedSheets[selectedSheetIdx] };
    const emptyRow = new Array(sheetToUpdate.headers.length).fill('');
    sheetToUpdate.rows = [emptyRow, ...sheetToUpdate.rows];
    updatedSheets[selectedSheetIdx] = sheetToUpdate;

    const updatedDoc: UploadedDocument = {
      ...currentDoc,
      sheets: updatedSheets,
      totalRows: updatedSheets.reduce((acc, s) => acc + s.rows.length, 0)
    };
    onUpdateDocument(updatedDoc);
  };

  const handleDeleteRow = (filteredRowIdx: number) => {
    if (!currentDoc || !currentSheet || !onUpdateDocument) return;
    const absoluteRowIdx = (currentPage - 1) * rowsPerPage + filteredRowIdx;
    const updatedSheets = [...currentDoc.sheets];
    const sheetToUpdate = { ...updatedSheets[selectedSheetIdx] };
    sheetToUpdate.rows = sheetToUpdate.rows.filter((_, rIdx) => rIdx !== absoluteRowIdx);
    updatedSheets[selectedSheetIdx] = sheetToUpdate;

    const updatedDoc: UploadedDocument = {
      ...currentDoc,
      sheets: updatedSheets,
      totalRows: updatedSheets.reduce((acc, s) => acc + s.rows.length, 0)
    };
    onUpdateDocument(updatedDoc);
  };

  const handleAddColumn = () => {
    if (!currentDoc || !currentSheet || !onUpdateDocument) return;
    const updatedSheets = [...currentDoc.sheets];
    const sheetToUpdate = { ...updatedSheets[selectedSheetIdx] };
    const newColName = `COLUMNA ${sheetToUpdate.headers.length + 1}`;
    sheetToUpdate.headers = [...sheetToUpdate.headers, newColName];
    sheetToUpdate.rows = sheetToUpdate.rows.map(row => [...row, '']);
    sheetToUpdate.totalColumns = sheetToUpdate.headers.length;
    updatedSheets[selectedSheetIdx] = sheetToUpdate;

    const updatedDoc: UploadedDocument = {
      ...currentDoc,
      sheets: updatedSheets
    };
    onUpdateDocument(updatedDoc);
  };

  const handleDeleteColumn = (colIdx: number) => {
    if (!currentDoc || !currentSheet || !onUpdateDocument) return;
    if (currentSheet.headers.length <= 1) {
      notify('⚠️ La tabla debe tener al menos una columna.');
      return;
    }
    const updatedSheets = [...currentDoc.sheets];
    const sheetToUpdate = { ...updatedSheets[selectedSheetIdx] };
    sheetToUpdate.headers = sheetToUpdate.headers.filter((_, idx) => idx !== colIdx);
    sheetToUpdate.rows = sheetToUpdate.rows.map(row => row.filter((_, idx) => idx !== colIdx));
    sheetToUpdate.totalColumns = sheetToUpdate.headers.length;
    updatedSheets[selectedSheetIdx] = sheetToUpdate;

    const updatedDoc: UploadedDocument = {
      ...currentDoc,
      sheets: updatedSheets
    };
    onUpdateDocument(updatedDoc);
  };

  // Active folder object
  const activeFolder = useMemo(() => {
    if (!activeFolderId) return null;
    return folders.find(f => f.id === activeFolderId) || null;
  }, [folders, activeFolderId]);

  // Documents in current view (Root vs Folder)
  const currentFolderDocuments = useMemo(() => {
    if (activeFolderId) {
      return documents.filter(d => d.folderId === activeFolderId);
    }
    return documents.filter(d => !d.folderId);
  }, [documents, activeFolderId]);

  // Active document
  const currentDoc = useMemo(() => {
    if (!currentFolderDocuments || currentFolderDocuments.length === 0) return null;
    if (activeDocId) {
      const found = currentFolderDocuments.find(d => d.id === activeDocId);
      if (found) return found;
    }
    return currentFolderDocuments[0];
  }, [currentFolderDocuments, activeDocId]);

  // Active sheet
  const currentSheet = useMemo(() => {
    if (!currentDoc || !currentDoc.sheets || currentDoc.sheets.length === 0) return null;
    return currentDoc.sheets[selectedSheetIdx] || currentDoc.sheets[0];
  }, [currentDoc, selectedSheetIdx]);

  // Filtered rows in current sheet
  const filteredRows = useMemo(() => {
    if (!currentSheet || !currentSheet.rows) return [];
    if (!searchFilter.trim()) return currentSheet.rows;

    const query = searchFilter.toLowerCase().trim();
    return currentSheet.rows.filter(row => 
      row.some(cell => {
        if (cell === null || cell === undefined) return false;
        return String(cell).toLowerCase().includes(query);
      })
    );
  }, [currentSheet, searchFilter]);

  // Pagination for large sheets
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredRows.slice(start, start + rowsPerPage);
  }, [filteredRows, currentPage]);

  const totalPages = Math.ceil(filteredRows.length / rowsPerPage) || 1;

  // Helper to get Excel column letter (0 -> A, 1 -> B, 26 -> AA)
  const getColLetter = (index: number): string => {
    let letter = '';
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  // Download document as Excel
  const handleDownloadOriginal = async (doc: UploadedDocument) => {
    try {
      const XLSX = await import('xlsx');
      const wb = XLSX.utils.book_new();
      doc.sheets.forEach(sheet => {
        const fullData = [sheet.headers, ...sheet.rows];
        const ws = XLSX.utils.aoa_to_sheet(fullData);
        XLSX.utils.book_append_sheet(wb, ws, sheet.name.substring(0, 31) || 'Hoja');
      });
      XLSX.writeFile(wb, doc.name.endsWith('.xlsx') ? doc.name : `${doc.name}.xlsx`);
    } catch (err) {
      console.error('Error exporting document:', err);
    }
  };

  // Open document in external app (Excel / PDF viewer)
  const handleOpenExternalApp = (doc: UploadedDocument) => {
    try {
      if (doc.rawBase64) {
        const base64Data = doc.rawBase64.includes(',') ? doc.rawBase64.split(',')[1] : doc.rawBase64;
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const mime = doc.type === 'pdf' ? 'application/pdf' : 
                     doc.type === 'excel' || doc.type === 'csv' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 
                     'application/octet-stream';
        const blob = new Blob([byteArray], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.name.endsWith('.xlsx') || doc.name.endsWith('.pdf') ? doc.name : `${doc.name}.xlsx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 2000);
      } else {
        handleDownloadOriginal(doc);
      }
    } catch (err) {
      console.error('Error opening file in external app:', err);
      handleDownloadOriginal(doc);
    }
  };

  const handleUploadClick = () => {
    onTriggerUpload();
  };

  const handleDeleteClick = (docId: string, docName: string) => {
    if (window.confirm(`¿Estás seguro de eliminar el documento "${docName}" del sistema?`)) {
      onDeleteDocument(docId);
    }
  };

  return (
    <div className={`space-y-4 ${isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 p-6 overflow-auto' : ''}`}>
      
      {/* Top Banner / Document Selector */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Document switcher and info */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Visor de Documentos Originales
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                  {documents.length} {documents.length === 1 ? 'documento' : 'documentos'}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Visualiza los archivos y tablas exactamente como aparecen en tu documento original
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Clean Imported Equipments Button */}
            {canDeleteRecords && importedEquipmentsCount > 0 && onCleanImportedEquipments && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Deseas eliminar los ${importedEquipmentsCount} equipos importados de Excel y restaurar el Parque de Bombas al catálogo oficial (12 unidades)?`)) {
                    onCleanImportedEquipments();
                  }
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-semibold transition-colors"
                title="Limpiar equipos importados de Excel del Parque de Bombas"
              >
                <Trash2 className="w-3.5 h-3.5 text-amber-600" />
                <span>Limpiar {importedEquipmentsCount} equipos importados de Excel</span>
              </button>
            )}

            {/* Clear All Documents Button */}
            {canDeleteRecords && documents.length > 0 && onClearAllDocuments && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`¿Estás seguro de eliminar todos los ${documents.length} documentos de Excel cargados? Esta acción no se puede deshacer.`)) {
                    onClearAllDocuments();
                  }
                }}
                className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold transition-colors"
                title="Eliminar todos los documentos cargados"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Eliminar {documents.length > 1 ? `todos (${documents.length})` : 'documento'}</span>
              </button>
            )}

            {/* Upload Button */}
            <button
              type="button"
              onClick={handleUploadClick}
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs active:scale-98 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Cargar Documento Excel</span>
            </button>
          </div>

        </div>

        {/* Document list selector pills */}
        {currentFolderDocuments.length > 0 && (
          <div className="flex items-center space-x-2 mt-4 pt-3 border-t border-slate-100 overflow-x-auto pb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
              Archivos {activeFolder ? `en "${activeFolder.name}"` : 'en Raíz'}:
            </span>
            {currentFolderDocuments.map((doc) => {
              const isSelected = currentDoc?.id === doc.id;
              return (
                <div key={doc.id} className={`inline-flex items-center rounded-lg transition-all ${
                  isSelected ? 'bg-emerald-600 text-white shadow-xs' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectDocument(doc.id);
                      setSelectedSheetIdx(0);
                      setCurrentPage(1);
                    }}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold whitespace-nowrap"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span className="max-w-[150px] truncate">{doc.name}</span>
                    <span className={`text-[10px] px-1 rounded ${isSelected ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-600'}`}>
                      {doc.totalRows} filas
                    </span>
                  </button>
                  {canDeleteRecords && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(doc.id, doc.name);
                      }}
                      className={`p-1.5 mr-1 rounded hover:bg-rose-500/20 transition-colors ${
                        isSelected ? 'text-emerald-100 hover:text-rose-200' : 'text-slate-400 hover:text-rose-600'
                      }`}
                      title={`Eliminar "${doc.name}"`}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Breadcrumb Navigation & Folders View (Root) */}
      {activeFolderId ? (
        <div className="bg-emerald-50/90 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={() => onSelectFolder(null)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold transition-colors shadow-xs"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a Carpetas</span>
            </button>
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-700">
              <span>📁 Archivero</span>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-emerald-700 flex items-center space-x-1 bg-white px-2.5 py-1 rounded-lg border border-emerald-200">
                <FolderOpen className="w-3.5 h-3.5 text-amber-500" />
                <span>{activeFolder?.name}</span>
              </span>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {currentFolderDocuments.length} {currentFolderDocuments.length === 1 ? 'archivo' : 'archivos'} en esta carpeta
          </span>
        </div>
      ) : (
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Folder className="w-5 h-5 text-amber-500" />
              <h4 className="text-sm font-bold text-slate-900">
                Carpetas del Archivero ({folders.length})
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setIsNewFolderModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <FolderPlus className="w-4 h-4" />
              <span>Nueva Carpeta</span>
            </button>
          </div>

          {folders.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">
              No hay carpetas creadas. Crea una carpeta para organizar tus documentos exclusivamente aquí.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {folders.map(folder => {
                const folderDocsCount = documents.filter(d => d.folderId === folder.id).length;
                return (
                  <div 
                    key={folder.id}
                    onClick={() => onSelectFolder(folder.id)}
                    className="group relative bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 hover:border-emerald-300 rounded-xl p-3.5 cursor-pointer transition-all flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <FolderOpen className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h5 className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-900">
                          {folder.name}
                        </h5>
                        <p className="text-[10px] text-slate-500">
                          {folderDocsCount} {folderDocsCount === 1 ? 'archivo' : 'archivos'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      {canDeleteRecords && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteFolder(folder.id);
                          }}
                          className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors shadow-xs"
                          title={`Eliminar carpeta "${folder.name}"`}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                          <span>Eliminar</span>
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Document Management Panel for Current View */}
      {currentFolderDocuments.length > 0 && (
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
            <div className="flex items-center space-x-2">
              <FolderOpen className="w-4 h-4 text-emerald-600 shrink-0" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Gestión de Archivos {activeFolder ? `en "${activeFolder.name}"` : 'en Raíz'} ({currentFolderDocuments.length})
              </h4>
            </div>
            <span className="text-[11px] text-slate-500">
              Aquí puedes visualizar o eliminar individualmente cualquier archivo de este apartado.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {currentFolderDocuments.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate" title={doc.name}>
                      {doc.name}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      {doc.totalRows} filas • {new Date(doc.uploadDate).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleDeleteClick(doc.id, doc.name)}
                  className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 transition-colors shrink-0 ml-2"
                  title={`Eliminar "${doc.name}"`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Eliminar</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Folder Modal */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <FolderPlus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Crear Nueva Carpeta</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Nombre de la Carpeta
              </label>
              <input
                type="text"
                value={newFolderNameInput}
                onChange={(e) => setNewFolderNameInput(e.target.value)}
                placeholder="Ej. Planos Hidráulicos, Manuales 2026..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs text-slate-900"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderNameInput.trim()) {
                    onCreateFolder(newFolderNameInput.trim());
                    setNewFolderNameInput('');
                    setIsNewFolderModalOpen(false);
                  }
                }}
              />
              <p className="text-[11px] text-slate-500">
                Esta carpeta se guardará exclusivamente en este apartado del archivero.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (newFolderNameInput.trim()) {
                    onCreateFolder(newFolderNameInput.trim());
                    setNewFolderNameInput('');
                    setIsNewFolderModalOpen(false);
                  }
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors"
              >
                Crear Carpeta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Document Content */}
      {currentDoc ? (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
          
          {/* Document Header Bar */}
          <div className="p-4 border-b border-slate-200 bg-slate-50/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-1.5">
                  <span>{currentDoc.name}</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-medium">
                  • {new Date(currentDoc.uploadDate).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-[11px] text-slate-500 mt-1">
                <span className="flex items-center space-x-1">
                  <User className="w-3 h-3 text-slate-400" />
                  <span>Subido por: <strong>{currentDoc.uploadedBy}</strong></span>
                </span>
                <span>•</span>
                <span>{currentDoc.sheets.length} {currentDoc.sheets.length === 1 ? 'Hoja' : 'Hojas'}</span>
                <span>•</span>
                <span>{currentSheet?.rows.length || 0} Filas de datos</span>
                <span>•</span>
                <span>{currentSheet?.headers.length || 0} Columnas</span>
              </div>
            </div>

            {/* Document Tools */}
            <div className="flex items-center space-x-2">
              {/* Search in document */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchFilter}
                  onChange={(e) => {
                    setSearchFilter(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Buscar en el documento..."
                  className="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 w-40 sm:w-56"
                />
              </div>

              {/* Toggle Excel Edit Mode */}
              <button
                type="button"
                onClick={() => setIsEditMode(!isEditMode)}
                title="Modo Edición Interactiva de la Tabla"
                className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs ${
                  isEditMode ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditMode ? 'Finalizar Edición' : 'Modo Edición'}</span>
              </button>

              {/* Open in external app (Excel / PDF) */}
              <button
                type="button"
                onClick={() => handleOpenExternalApp(currentDoc)}
                title="Abrir este archivo en la aplicación externa (Excel o PDF)"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir en App</span>
              </button>

              {/* Download original */}
              <button
                type="button"
                onClick={() => handleDownloadOriginal(currentDoc)}
                title="Descargar este archivo Excel"
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-200/80 border border-slate-200 bg-white"
              >
                <Download className="w-4 h-4" />
              </button>

              {/* Fullscreen toggle */}
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? 'Salir de pantalla completa' : 'Ver a pantalla completa'}
                className="p-2 rounded-lg text-slate-600 hover:bg-slate-200/80 border border-slate-200 bg-white"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Delete Document (Admin) */}
              <button
                type="button"
                onClick={() => handleDeleteClick(currentDoc.id, currentDoc.name)}
                title="Eliminar este documento de Hojas de Vida"
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-rose-700 hover:bg-rose-50 border border-rose-200 bg-white text-xs font-bold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Eliminar Documento</span>
              </button>
            </div>
          </div>

          {/* Sheet Selector Tabs (Excel Style) */}
          {currentDoc.sheets.length > 1 && (
            <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center space-x-1.5 overflow-x-auto">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mr-1">
                Hojas:
              </span>
              {currentDoc.sheets.map((sheet, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setSelectedSheetIdx(idx);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1 rounded-md text-xs font-semibold whitespace-nowrap transition-colors flex items-center space-x-1.5 ${
                    selectedSheetIdx === idx
                      ? 'bg-white text-emerald-800 shadow-xs border border-slate-200'
                      : 'text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Table className="w-3 h-3 text-emerald-600" />
                  <span>{sheet.name || `Hoja ${idx + 1}`}</span>
                  <span className="text-[10px] text-slate-400">({sheet.rows.length})</span>
                </button>
              ))}
            </div>
          )}

          {/* Edit Control Bar (When in Edit Mode) */}
          {isEditMode && (
            <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
              <div className="flex items-center space-x-3">
                <span className="font-bold flex items-center space-x-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-amber-700" />
                  <span>Modo Edición Excel Activo</span>
                </span>
                <span className="text-[11px] text-amber-700 hidden sm:inline">
                  (Haz clic en cualquier celda o encabezado para editar texto, añade filas/columnas o cambia temas)
                </span>
              </div>

              <div className="flex items-center space-x-2 flex-wrap">
                {/* Theme Selector */}
                <div className="flex items-center space-x-1 bg-white/80 border border-amber-300 rounded-lg p-1">
                  <Palette className="w-3.5 h-3.5 text-slate-500 ml-1" />
                  <span className="text-[10px] font-bold text-slate-600 mr-1">Tema:</span>
                  <button
                    type="button"
                    onClick={() => setHeaderTheme('emerald')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${headerTheme === 'emerald' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    Verde
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeaderTheme('blue')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${headerTheme === 'blue' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    Azul
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeaderTheme('dark')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${headerTheme === 'dark' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    Oscuro
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeaderTheme('amber')}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${headerTheme === 'amber' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
                  >
                    Ámbar
                  </button>
                </div>

                {/* Add Row */}
                <button
                  type="button"
                  onClick={handleAddRow}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Fila</span>
                </button>

                {/* Add Column */}
                <button
                  type="button"
                  onClick={handleAddColumn}
                  className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-amber-900 font-bold transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir Columna</span>
                </button>
              </div>
            </div>
          )}

          {/* Spreadsheet Table View (Exact representation) */}
          <div className="overflow-x-auto max-h-[600px] select-text relative">
            {currentSheet && currentSheet.headers.length > 0 ? (
              <table className="w-full border-collapse text-left font-sans text-xs">
                {/* Excel Column Coordinates (A, B, C...) */}
                <thead>
                  <tr className="bg-slate-100 text-slate-500 border-b border-slate-200 text-[10px] font-mono select-none sticky top-0 z-20">
                    <th className="w-12 px-2 py-1 border-r border-slate-200 text-center bg-slate-200/80 font-bold sticky left-0 z-30">
                      #
                    </th>
                    {currentSheet.headers.map((_, colIdx) => (
                      <th key={colIdx} className="px-3 py-1 border-r border-slate-200 text-center font-bold bg-slate-100 min-w-[120px]">
                        {getColLetter(colIdx)}
                      </th>
                    ))}
                  </tr>

                  {/* Header Row (Original Column Names from File) */}
                  <tr className={`${theme.headerTr} border-b-2 font-bold text-xs sticky top-[24px] z-10 shadow-xs`}>
                    <th className={`px-2 py-2.5 border-r text-center ${theme.headerIndex} sticky left-0 z-20`}>
                      1
                    </th>
                    {currentSheet.headers.map((header, colIdx) => (
                      <th key={colIdx} className="px-3 py-2.5 border-r border-slate-300/60 uppercase tracking-wider text-[11px] whitespace-nowrap">
                        {isEditMode ? (
                          <div className="flex items-center space-x-1">
                            <input
                              type="text"
                              value={header || ''}
                              onChange={(e) => handleHeaderEdit(colIdx, e.target.value)}
                              className="bg-white border border-slate-300 px-2 py-0.5 rounded text-xs font-bold text-slate-900 w-full"
                            />
                            {currentSheet.headers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteColumn(colIdx)}
                                title="Eliminar esta columna"
                                className="text-rose-600 hover:text-rose-800 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span>{header || `Columna ${colIdx + 1}`}</span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>

                {/* Data Rows */}
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedRows.map((row, rowIdx) => {
                    const actualRowNum = (currentPage - 1) * rowsPerPage + rowIdx + 2;
                    return (
                      <tr key={rowIdx} className="hover:bg-blue-50/50 transition-colors group">
                        {/* Row Index Column */}
                        <td className="px-2 py-2 border-r border-slate-200 text-center font-mono text-[10px] text-slate-400 bg-slate-50 group-hover:bg-blue-100/50 group-hover:text-blue-700 font-semibold sticky left-0 z-10 flex items-center justify-between">
                          <span>{actualRowNum}</span>
                          {isEditMode && (
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(rowIdx)}
                              title="Eliminar esta fila"
                              className="text-rose-500 hover:text-rose-700 ml-1 opacity-60 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                        {/* Cell Values */}
                        {currentSheet.headers.map((_, colIdx) => {
                          const cellVal = row[colIdx];
                          const displayVal = cellVal !== null && cellVal !== undefined ? String(cellVal) : '';
                          const isNumeric = typeof cellVal === 'number' || (!isNaN(Number(cellVal)) && cellVal !== '');
                          const absoluteRowIdx = (currentPage - 1) * rowsPerPage + rowIdx;
                          const cellStyle = currentSheet.cellStyles?.[`${absoluteRowIdx}-${colIdx}`];

                          return (
                            <td 
                              key={colIdx} 
                              style={{
                                backgroundColor: cellStyle?.bgColor || undefined,
                                color: cellStyle?.textColor || undefined,
                                fontWeight: cellStyle?.bold ? 'bold' : undefined,
                                textAlign: cellStyle?.align || (isNumeric ? 'right' : 'left')
                              }}
                              className={`px-3 py-2 border-r border-slate-100 whitespace-nowrap max-w-[280px] ${
                                !cellStyle?.textColor ? 'text-slate-800' : ''
                              } ${isNumeric && !cellStyle?.align ? 'text-right font-mono' : ''}`}
                            >
                              {isEditMode ? (
                                <input
                                  type="text"
                                  value={displayVal}
                                  onChange={(e) => handleCellEdit(rowIdx, colIdx, e.target.value)}
                                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:ring-1 focus:ring-emerald-500 px-2 py-1 rounded text-xs text-slate-900"
                                />
                              ) : (
                                <span className="truncate block" title={displayVal}>
                                  {displayVal || <span className="text-slate-300 italic">-</span>}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={currentSheet.headers.length + 1} className="p-8 text-center text-slate-400 text-xs">
                        {searchFilter ? 'No hay filas que coincidan con el término de búsqueda.' : 'Esta hoja no contiene filas con datos.'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                No se han detectado columnas o datos en esta hoja.
              </div>
            )}
          </div>

          {/* Table Footer: Pagination & Stats */}
          <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
            <div className="flex items-center space-x-2">
              <span>
                Mostrando {filteredRows.length > 0 ? (currentPage - 1) * rowsPerPage + 1 : 0} a {Math.min(currentPage * rowsPerPage, filteredRows.length)} de {filteredRows.length} filas
              </span>
              {searchFilter && (
                <span className="text-emerald-700 font-semibold">
                  (filtrado de {currentSheet?.rows.length || 0} filas totales)
                </span>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center space-x-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                  className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-100 font-semibold"
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
                  className="px-2.5 py-1 rounded-md border border-slate-200 bg-white text-slate-700 disabled:opacity-40 hover:bg-slate-100 font-semibold"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>

        </div>
      ) : (
        /* Empty State */
        <div className="bg-white rounded-2xl p-12 border border-slate-200/90 text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto">
            <FileSpreadsheet className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900">
              No hay documentos cargados en el sistema
            </h3>
            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
              Carga tus inventarios, hojas de cálculo de Excel (.xlsx, .xls, .csv) o documentación técnica para visualizarlos con total fidelidad en esta sección.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleUploadClick}
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Upload className="w-4 h-4" />
              <span>Cargar Primer Documento Excel</span>
            </button>
          </div>
        </div>
      )}

    </div>
  );
};
