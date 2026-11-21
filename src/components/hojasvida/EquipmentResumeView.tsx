import React, { useState, useRef, useMemo } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { 
  Equipment, 
  PumpCategory, 
  EquipmentStatus,
  PreventiveWorkOrder,
  Incident,
  PumpInspection,
  UploadedDocument,
  UploadedDocumentSheet,
  DocumentFolder
} from '../../types';
import { 
  FileSpreadsheet, 
  Upload, 
  Download, 
  Printer, 
  Search, 
  Filter, 
  Plus, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Building2, 
  Cpu, 
  Zap, 
  Droplets, 
  Wrench, 
  Activity, 
  Calendar, 
  FileText, 
  Check, 
  X, 
  ChevronRight, 
  Layers, 
  Sliders, 
  Share2,
  AlertCircle,
  Lock,
  Eye,
  KeyRound,
  Table,
  Fuel,
  FilePlus2,
  FolderOpen,
  Loader2
} from 'lucide-react';
import { OriginalDocumentViewer } from './OriginalDocumentViewer';
import { CustomSelect } from '../common/CustomSelect';
import { WaterPumpIcon, CondenserIcon, SubstationIcon, TankIcon, SaunaColdPlungeIcon } from '../../utils/roundIcons';
import {
  parseUniversalFileToUploadedDocument,
  createExcelDocumentFromTemplate,
  ExcelTemplateType
} from '../../utils/excelEngine';

export const EquipmentResumeView: React.FC = () => {
  const { 
    equipments, 
    addEquipment, 
    updateEquipment, 
    deleteEquipment,
    clearGenericImportedEquipments,
    cleanAllImportedEquipments,
    restoreOfficialEquipmentPark,
    uploadedDocuments,
    addUploadedDocument,
    updateUploadedDocument,
    moveUploadedDocument,
    deleteUploadedDocument,
    clearAllUploadedDocuments,
    documentFolders,
    createDocumentFolder,
    updateDocumentFolder,
    deleteDocumentFolder,
    verifyAdminPin,
    setRole,
    pumpInspections, 
    workOrders, 
    incidents, 
    settings, 
    isAdmin,
    currentUser,
    notify,
    setSelectedTab,
    canDeleteRecords
  } = useMaintenance();

  // Navigation Sub-tab: Hojas de Vida Técnicas vs Visor de Documentos Originales
  const [activeSubTab, setActiveSubTab] = useState<'hojas_vida' | 'visor_documentos'>('visor_documentos');
  const [activeDocId, setActiveDocId] = useState<string>('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const handleCreateFolder = async (name: string, color?: string, description?: string, parentFolderId?: string | null) => {
    return await createDocumentFolder(name, color, description, parentFolderId ?? null);
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (activeFolderId === folderId) {
      const deleted = documentFolders.find(f => f.id === folderId);
      setActiveFolderId(deleted?.parentFolderId || null);
    }
    deleteDocumentFolder(folderId); // background
  };

  const flattenedFolderOptions = useMemo(() => {
    const folderMap = new Map(documentFolders.map(f => [f.id, f]));
    const getParent = (f: DocumentFolder) =>
      f.parentFolderId && f.parentFolderId !== f.id && folderMap.has(f.parentFolderId) ? f.parentFolderId : null;
    const list: { id: string; label: string }[] = [];
    const visited = new Set<string>();
    const walk = (parentId: string | null, depth: number) => {
      for (const f of documentFolders) {
        if (getParent(f) === parentId && !visited.has(f.id)) {
          visited.add(f.id);
          const prefix = depth > 0 ? `${'— '.repeat(depth)}📁 ` : '📁 ';
          list.push({ id: f.id, label: `${prefix}${f.name}` });
          walk(f.id, depth + 1);
        }
      }
    };
    walk(null, 0);
    for (const f of documentFolders) {
      if (!visited.has(f.id)) {
        list.push({ id: f.id, label: `📁 ${f.name}` });
      }
    }
    return list;
  }, [documentFolders]);

  // Selected Equipment for Hoja de Vida
  const [selectedEqId, setSelectedEqId] = useState<string>(equipments[0]?.id || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');

  // Imported Equipments detection from previous Excel imports
  const initialIds = useMemo(() => new Set(['eq-1','eq-2','eq-3','eq-4','eq-5','eq-6','eq-7','eq-8','eq-9','eq-10','eq-11','eq-12']), []);
  const importedEquipmentsCount = useMemo(() => {
    return equipments.filter(e => 
      !initialIds.has(e.id) || 
      e.tag.startsWith('EQ-IMP-') || 
      e.name === 'Equipo Importado' || 
      (e.notes && e.notes.includes('documento original'))
    ).length;
  }, [equipments, initialIds]);
  
  // Modals
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isCreateExcelModalOpen, setIsCreateExcelModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Admin PIN Authorization Modal State
  const [isAdminPinModalOpen, setIsAdminPinModalOpen] = useState(false);
  const [pendingActionTitle, setPendingActionTitle] = useState('');
  const [pendingActionCallback, setPendingActionCallback] = useState<(() => void) | null>(null);
  const [enteredPin, setEnteredPin] = useState('');
  const [pinError, setPinError] = useState(false);
  
  // Excel Import & Document Extraction State
  const [excelPreviewData, setExcelPreviewData] = useState<Partial<Equipment>[]>([]);
  const [excelFileName, setExcelFileName] = useState<string>('');
  const [parsedUploadedDocs, setParsedUploadedDocs] = useState<Omit<UploadedDocument, 'id'>[]>([]);
  const [uploadTargetFolderId, setUploadTargetFolderId] = useState<string>('');
  const [isParsingExcel, setIsParsingExcel] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Create New Excel Template State
  const [newExcelFileName, setNewExcelFileName] = useState('');
  const [newExcelTemplate, setNewExcelTemplate] = useState<ExcelTemplateType>('hoja_vida_equipo');
  const [newExcelFolderId, setNewExcelFolderId] = useState<string>('');
  const [isCreatingExcelDoc, setIsCreatingExcelDoc] = useState(false);

  // Count of generic equipments previously imported
  const genericEquipmentsCount = useMemo(() => {
    return equipments.filter(e => e.tag.startsWith('EQ-IMP-') || e.name === 'Equipo Importado').length;
  }, [equipments]);

  // Authorization Guard (Unrestricted - Free Access)
  const requireAdmin = (_actionTitle: string, callback: () => void) => {
    callback();
  };

  // Form state for creating / editing equipment sheet
  const [formData, setFormData] = useState<Partial<Equipment>>({});

  // Filtered equipment list
  const filteredEquipments = useMemo(() => {
    return equipments.filter(eq => {
      const matchSearch = 
        eq.tag.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCategory = categoryFilter === 'todas' || eq.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [equipments, searchTerm, categoryFilter]);

  // Currently selected equipment
  const activeEquipment = useMemo(() => {
    return equipments.find(eq => eq.id === selectedEqId) || filteredEquipments[0] || equipments[0] || null;
  }, [equipments, selectedEqId, filteredEquipments]);

  // Inspections, OTs and Incidents for the selected equipment
  const eqInspections = useMemo(() => {
    if (!activeEquipment) return [];
    return pumpInspections.filter(p => p.equipmentId === activeEquipment.id);
  }, [pumpInspections, activeEquipment]);

  const eqWorkOrders = useMemo(() => {
    if (!activeEquipment) return [];
    return workOrders.filter(w => w.equipmentId === activeEquipment.id);
  }, [workOrders, activeEquipment]);

  const eqIncidents = useMemo(() => {
    if (!activeEquipment) return [];
    return incidents.filter(i => i.equipmentId === activeEquipment.id || i.equipmentTag === activeEquipment.tag);
  }, [incidents, activeEquipment]);

  // Open Edit Form
  const handleOpenEdit = (eq: Equipment) => {
    setFormData({ ...eq });
    setIsCreatingNew(false);
    setIsEditModalOpen(true);
  };

  // Open New Equipment Form
  const handleOpenNew = () => {
    setFormData({
      tag: `EQ-${(equipments.length + 1).toString().padStart(2, '0')}`,
      name: '',
      category: 'bomba_presion',
      area: 'Sala de Máquinas',
      locationDetails: '',
      brand: '',
      model: '',
      serialNumber: '',
      powerHp: 5,
      powerKw: 3.7,
      voltage: '220V / 3F / 60Hz',
      nominalAmps: 14.5,
      nominalPressurePsi: 60,
      installationDate: new Date().toISOString().split('T')[0],
      status: 'operativo',
      currentHours: 0,
      limits: {
        minPressurePsi: 45,
        maxPressurePsi: 75,
        maxBearingTempC: 70,
        maxAmperageL1: 16,
        maxVibrationMmS: 4.5
      },
      notes: '',
      supplier: '',
      assetNumber: '',
      criticality: 'alta',
      lubricationType: 'Grasa Litio NLGI 2',
      rpm: 3450,
      ipRating: 'IP55',
      warrantyExpiry: '',
      maintenanceResponsible: settings.technicians[0] || 'Mantenimiento'
    });
    setIsCreatingNew(true);
    setIsEditModalOpen(true);
  };

  // Save Form
  const handleSaveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.tag || !formData.name) {
      notify('Por favor completa al menos el Código/TAG y el Nombre del equipo');
      return;
    }

    try {
      if (isCreatingNew) {
        const newEq: Omit<Equipment, 'id'> = {
          tag: formData.tag || 'EQ-NUEVO',
          name: formData.name || 'Nuevo Equipo',
          category: (formData.category as PumpCategory) || 'otro',
          area: formData.area || 'General',
          locationDetails: formData.locationDetails || '',
          brand: formData.brand || 'N/A',
          model: formData.model || 'N/A',
          serialNumber: formData.serialNumber || 'S/N',
          powerHp: Number(formData.powerHp) || 0,
          powerKw: Number(formData.powerKw) || 0,
          flowGpm: Number(formData.flowGpm) || 0,
          voltage: formData.voltage || '220V / 3F',
          nominalAmps: Number(formData.nominalAmps) || 0,
          nominalPressurePsi: Number(formData.nominalPressurePsi) || 0,
          suctionDiameterInches: formData.suctionDiameterInches || '',
          dischargeDiameterInches: formData.dischargeDiameterInches || '',
          installationDate: formData.installationDate || new Date().toISOString().split('T')[0],
          status: (formData.status as EquipmentStatus) || 'operativo',
          currentHours: Number(formData.currentHours) || 0,
          limits: formData.limits || {
            minPressurePsi: 40,
            maxPressurePsi: 80,
            maxBearingTempC: 70,
            maxAmperageL1: 20,
            maxVibrationMmS: 4.5
          },
          notes: formData.notes || '',
          supplier: formData.supplier || '',
          assetNumber: formData.assetNumber || '',
          criticality: formData.criticality || 'media',
          lubricationType: formData.lubricationType || '',
          rpm: Number(formData.rpm) || 0,
          ipRating: formData.ipRating || '',
          warrantyExpiry: formData.warrantyExpiry || '',
          recommendedSpares: formData.recommendedSpares || [],
          maintenanceResponsible: formData.maintenanceResponsible || ''
        };
        await addEquipment(newEq);
        notify(`Hoja de vida creada exitosamente para ${newEq.tag}`);
      } else if (formData.id) {
        await updateEquipment(formData.id, formData);
        notify(`Hoja de vida de ${formData.tag} actualizada correctamente`);
      }
      setIsEditModalOpen(false);
    } catch (err) {
      console.error(err);
      notify('Error al guardar la hoja de vida');
    }
  };

  // Parse one or multiple files (Excel with exact ExcelJS fidelity + universal binary formats accept=*/*)
  const processSelectedExcelFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setImportError(null);
    setIsParsingExcel(true);
    setExcelFileName(files.length === 1 ? files[0].name : `${files.length} archivos seleccionados`);

    try {
      const uploader = currentUser?.displayName || (isAdmin ? 'Administrador' : 'Equipo Mantenimiento');
      const targetFolder = uploadTargetFolderId || activeFolderId || undefined;
      const parsedList: Omit<UploadedDocument, 'id'>[] = [];

      for (const file of files) {
        const parsed = await parseUniversalFileToUploadedDocument(file, uploader, targetFolder);
        parsedList.push(parsed);
      }

      setParsedUploadedDocs(parsedList);
      setExcelPreviewData([]);
    } catch (err: any) {
      console.error('Error parsing file:', err);
      setImportError(err?.message || 'Error al procesar el archivo seleccionado.');
    } finally {
      setIsParsingExcel(false);
    }
  };

  const handleExcelFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (files.length === 0) return;
    await processSelectedExcelFiles(files);
  };

  // Quick drag-and-drop direct upload into active folder (silent, optimistic PostgreSQL save)
  const handleQuickUploadFiles = async (files: File[]) => {
    if (!files || files.length === 0) return;
    const uploader = currentUser?.displayName || (isAdmin ? 'Administrador' : 'Equipo Mantenimiento');
    const targetFolder = activeFolderId || undefined;
    try {
      let lastSavedId = '';
      for (const file of files) {
        const parsed = await parseUniversalFileToUploadedDocument(file, uploader, targetFolder);
        const saved = await addUploadedDocument(parsed, { silent: true });
        lastSavedId = saved.id;
      }
      if (lastSavedId) {
        setActiveDocId(lastSavedId);
        setActiveSubTab('visor_documentos');
      }
    } catch (err) {
      console.error(err);
      notify('Error al subir uno o más archivos');
    }
  };

  // Confirm File Import and Save Documents silently into PostgreSQL
  const handleConfirmExcelImport = async () => {
    if (parsedUploadedDocs.length === 0) {
      notify('Por favor selecciona al menos un archivo');
      return;
    }

    setIsImporting(true);
    try {
      const targetFolderId = uploadTargetFolderId || undefined;
      let lastSaved: UploadedDocument | null = null;

      for (const docItem of parsedUploadedDocs) {
        const docToSave: Omit<UploadedDocument, 'id'> = {
          ...docItem,
          folderId: targetFolderId
        };
        lastSaved = await addUploadedDocument(docToSave, { silent: true });
      }

      if (lastSaved) {
        setActiveFolderId(targetFolderId || activeFolderId || null);
        setActiveDocId(lastSaved.id);
        setActiveSubTab('visor_documentos');
      }

      setIsExcelModalOpen(false);
      setExcelPreviewData([]);
      setParsedUploadedDocs([]);
      setExcelFileName('');
    } catch (e) {
      console.error(e);
      notify('Ocurrió un inconveniente al guardar el documento');
    } finally {
      setIsImporting(false);
    }
  };

  // Create New Excel Document from Template
  const handleCreateNewExcelDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newExcelFileName.trim();
    if (!cleanName) {
      notify('Escribe un nombre para el nuevo archivo Excel');
      return;
    }

    setIsCreatingExcelDoc(true);
    try {
      const uploader = currentUser?.displayName || (isAdmin ? 'Administrador' : 'Equipo Mantenimiento');
      const targetFolder = newExcelFolderId || undefined;
      const newDocDraft = await createExcelDocumentFromTemplate(
        newExcelTemplate,
        cleanName,
        uploader,
        targetFolder
      );
      const saved = await addUploadedDocument(newDocDraft, { silent: true });
      setActiveFolderId(targetFolder || null);
      setActiveDocId(saved.id);
      setActiveSubTab('visor_documentos');
      setIsCreateExcelModalOpen(false);
      setNewExcelFileName('');
    } catch (err) {
      console.error('Error creando libro Excel:', err);
      notify('No se pudo crear el libro Excel');
    } finally {
      setIsCreatingExcelDoc(false);
    }
  };

  // Download Excel Template
  const handleDownloadExcelTemplate = async () => {
    const templateData = [
      {
        'Codigo': 'BOM-PRES-01',
        'Nombre': 'Bomba de Presión Hidroneumática 01',
        'Categoria': 'bomba_presion',
        'Marca': 'Grundfos',
        'Modelo': 'CR 15-3 A-F-A-E-HQQE',
        'Serie': 'GF-2023-8891-P1',
        'Area': 'Sótano 2 - Sala de Bombas Principal',
        'DetallesUbicacion': 'Bancada B-1 al lado del manifold de succión',
        'PotenciaHP': 7.5,
        'PotenciaKW': 5.5,
        'Voltaje': '380V / 3F / 60Hz',
        'Amperaje': 11.2,
        'PresionPSI': 65,
        'Estado': 'operativo',
        'FechaInstalacion': '2023-04-15',
        'Proveedor': 'Bombas & Sistemas Hidráulicos S.A.',
        'ActivoFijo': 'ACT-HOTEL-4401',
        'Criticidad': 'alta',
        'Observaciones': 'Mantenimiento preventivo bimensual de sellos y alineación.'
      },
      {
        'Codigo': 'BOM-IMP-01',
        'Nombre': 'Bomba de Impulsión a Tanque Elevado 01',
        'Categoria': 'bomba_impulsion',
        'Marca': 'Pedrollo',
        'Modelo': 'F40/250A',
        'Serie': 'PED-2024-9120',
        'Area': 'Sótano 1 - Cisterna de Reserva',
        'DetallesUbicacion': 'Tubería de impulsión torre norte',
        'PotenciaHP': 10,
        'PotenciaKW': 7.5,
        'Voltaje': '380V / 3F / 60Hz',
        'Amperaje': 15.0,
        'PresionPSI': 85,
        'Estado': 'operativo',
        'FechaInstalacion': '2024-01-20',
        'Proveedor': 'Equipos de Bombeo del Caribe',
        'ActivoFijo': 'ACT-HOTEL-4402',
        'Criticidad': 'alta',
        'Observaciones': 'Revisar apriete de pernos y lubricación.'
      }
    ];

    const XLSX = await import('xlsx');
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HojaDeVidaEquipos");
    XLSX.writeFile(wb, `Plantilla_Hoja_De_Vida_Equipos_${settings.hotelInfo.hotelName.replace(/\s+/g, '_')}.xlsx`);
    notify('Plantilla de Excel descargada en tu dispositivo');
  };

  // Export current list to Excel
  const handleExportAllToExcel = async () => {
    const XLSX = await import('xlsx');
    const dataToExport = equipments.map(eq => ({
      'Código TAG': eq.tag,
      'Nombre del Equipo': eq.name,
      'Categoría': eq.category,
      'Área / Ubicación': eq.area,
      'Ubicación Exacta': eq.locationDetails || '',
      'Marca': eq.brand,
      'Modelo': eq.model,
      'Número de Serie': eq.serialNumber,
      'Potencia (HP)': eq.powerHp,
      'Potencia (kW)': eq.powerKw || '',
      'Voltaje': eq.voltage,
      'Amperaje Nominal (A)': eq.nominalAmps,
      'Presión Nominal (PSI)': eq.nominalPressurePsi,
      'Estado Operativo': eq.status,
      'Horas de Uso': eq.currentHours,
      'Fecha Instalación': eq.installationDate,
      'Proveedor': eq.supplier || '',
      'Activo Fijo': eq.assetNumber || '',
      'Criticidad': eq.criticality || 'media',
      'Notas': eq.notes || ''
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "InventarioEquipos");
    XLSX.writeFile(wb, `Hoja_De_Vida_Inventario_Equipos_${new Date().toISOString().split('T')[0]}.xlsx`);
    notify('Inventario de hojas de vida exportado a Excel');
  };

  // Print single Hoja de Vida
  const handlePrintSheet = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER PRINCIPAL */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center space-x-2">
                <span>Hojas de Vida & Documentos</span>
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  {equipments.length} Equipos • {uploadedDocuments.length} Docs
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Formatos técnicos de placa, visor de documentos originales y digitalización de inventarios Excel
              </p>
            </div>
          </div>
        </div>

        {/* BOTONES DE ACCIÓN RÁPIDA */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Botón Importar Excel / Documento */}
          <button
            id="btn-import-excel-hdv"
            onClick={() => {
              setUploadTargetFolderId(activeFolderId || '');
              setParsedUploadedDocs([]);
              setExcelFileName('');
              setImportError(null);
              setIsExcelModalOpen(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Subir Excel</span>
          </button>

          {/* Botón Crear Nuevo Excel desde Plantilla */}
          <button
            type="button"
            onClick={() => {
              setNewExcelFolderId(activeFolderId || '');
              setNewExcelFileName('');
              setIsCreateExcelModalOpen(true);
            }}
            className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98 bg-slate-900 hover:bg-slate-800 text-white cursor-pointer"
          >
            <FilePlus2 className="w-4 h-4 text-emerald-400" />
            <span>Crear Excel</span>
          </button>

          {/* Botón Descargar Plantilla */}
          <button
            onClick={handleDownloadExcelTemplate}
            title="Descargar plantilla de Excel para llenar tus equipos"
            className="inline-flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-300/80"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Plantilla</span>
          </button>

          {/* Botón Exportar Todo a Excel */}
          <button
            onClick={handleExportAllToExcel}
            title="Exportar todas las hojas de vida a un archivo Excel"
            className="inline-flex items-center space-x-1.5 px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors border border-slate-300/80"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Exportar</span>
          </button>

          {/* Botón Nuevo Equipo */}
          <button
            onClick={handleOpenNew}
            className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-sm active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Nueva Hoja</span>
          </button>
        </div>
      </div>

      {/* AVISO DE LIMPIEZA DE EQUIPOS IMPORTADOS DE EXCEL */}
      {importedEquipmentsCount > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                Se detectaron {importedEquipmentsCount} equipos generados por importaciones anteriores de Excel en el Parque de Bombas (Total: {equipments.length} unidades).
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Para que los documentos de Excel no aparezcan en otras secciones, haz clic aquí para eliminar los equipos importados y restaurar el Parque oficial (12 unidades).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`¿Deseas eliminar los ${importedEquipmentsCount} equipos importados de Excel y dejar únicamente las 12 bombas oficiales?`)) {
                cleanAllImportedEquipments();
              }
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shrink-0 transition-colors shadow-xs"
          >
            Limpiar Equipos de Excel ({importedEquipmentsCount})
          </button>
        </div>
      )}

      {/* NAVEGACIÓN POR SUB-PESTAÑAS */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveSubTab('visor_documentos')}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeSubTab === 'visor_documentos'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Carpetas y Archivos Excel</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
            activeSubTab === 'visor_documentos' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {uploadedDocuments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('hojas_vida')}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            activeSubTab === 'hojas_vida'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Fichas Técnicas de Equipos</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums ${
            activeSubTab === 'hojas_vida' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {equipments.length}
          </span>
        </button>
      </div>

      {/* SUB-PESTAÑA 1: VISOR DE DOCUMENTOS ORIGINALES */}
      {activeSubTab === 'visor_documentos' && (
        <OriginalDocumentViewer
          documents={uploadedDocuments}
          activeDocId={activeDocId}
          onSelectDocument={(id) => setActiveDocId(id)}
          onUpdateDocument={async (doc) => {
            await updateUploadedDocument(doc);
          }}
          onMoveDocument={moveUploadedDocument}
          onDeleteDocument={async (id) => {
            await deleteUploadedDocument(id);
          }}
          onClearAllDocuments={async () => {
            await clearAllUploadedDocuments();
          }}
          onTriggerUpload={() => {
            setUploadTargetFolderId(activeFolderId || '');
            setParsedUploadedDocs([]);
            setExcelFileName('');
            setImportError(null);
            setIsExcelModalOpen(true);
          }}
          onTriggerCreateExcel={() => {
            setNewExcelFolderId(activeFolderId || '');
            setNewExcelFileName('');
            setIsCreateExcelModalOpen(true);
          }}
          onQuickUploadFiles={handleQuickUploadFiles}
          isAdmin={isAdmin}
          onRequireAdminPin={requireAdmin}
          onCleanImportedEquipments={async () => {
            await cleanAllImportedEquipments();
          }}
          importedEquipmentsCount={importedEquipmentsCount}
          folders={documentFolders}
          onCreateFolder={handleCreateFolder}
          onUpdateFolder={updateDocumentFolder}
          onDeleteFolder={handleDeleteFolder}
          activeFolderId={activeFolderId}
          onSelectFolder={setActiveFolderId}
          canDeleteRecords={canDeleteRecords}
        />
      )}

      {/* SUB-PESTAÑA 2: HOJAS DE VIDA TÉCNICAS */}
      {activeSubTab === 'hojas_vida' && (
        <div className="space-y-4">
          
          {/* Banner si hay equipos genéricos de importación previa */}
          {genericEquipmentsCount > 0 && (
            <div className="p-4 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs text-blue-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold">
                    Se detectaron {genericEquipmentsCount} equipos con nombres genéricos ('EQ-IMP-*').
                  </p>
                  <p className="text-blue-700 text-[11px] mt-0.5">
                    Puedes eliminarlos con un clic como administrador y volver a cargar tu documento con el nuevo analizador que extrae los nombres reales de tus equipos.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  requireAdmin('Limpiar Equipos Genéricos', () => {
                    if (window.confirm(`¿Deseas eliminar los ${genericEquipmentsCount} equipos genéricos para cargar tu documento limpio?`)) {
                      clearGenericImportedEquipments();
                    }
                  });
                }}
                className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shrink-0 shadow-2xs transition-colors"
              >
                Limpiar {genericEquipmentsCount} Equipos Genéricos
              </button>
            </div>
          )}

          {/* CONTENIDO PRINCIPAL: LISTA LATERAL + FORMATO TÉCNICO HOJA DE VIDA */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* COLUMNA IZQUIERDA: BUSCADOR Y LISTA DE EQUIPOS (4 columnas) */}
            <div className="lg:col-span-4 space-y-3 print:hidden">
              <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Directorio de Equipos
              </span>
              <span className="text-xs text-slate-500 font-medium">
                {filteredEquipments.length} visibles
              </span>
            </div>

            {/* Input de Búsqueda */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por TAG, nombre, marca..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Filtro por Categoría */}
            <div>
              <CustomSelect
                value={categoryFilter}
                onChange={(val) => setCategoryFilter(val)}
                options={[
                  { value: 'todas', label: 'Todas las categorías', color: 'slate' },
                  { value: 'sauna_cold_plunge', label: 'Sauna / Cold Plunge / Spa', color: 'cyan' },
                  { value: 'bomba_presion', label: 'Bombas de Presión', color: 'blue' },
                  { value: 'bomba_impulsion', label: 'Bombas de Impulsión', color: 'blue' },
                  { value: 'bomba_acs', label: 'Bombas ACS', color: 'amber' },
                  { value: 'bomba_piscina', label: 'Bombas Piscina', color: 'cyan' },
                  { value: 'bomba_achique', label: 'Bombas de Achique', color: 'slate' },
                  { value: 'bomba_incendio', label: 'Bombas Contra Incendio', color: 'rose' },
                  { value: 'caldera', label: 'Calderas', color: 'amber' },
                  { value: 'chiller', label: 'Chillers', color: 'teal' },
                  { value: 'condensador', label: 'Condensadores', color: 'cyan' },
                  { value: 'generador', label: 'Generadores', color: 'amber' },
                  { value: 'bateria', label: 'Baterías / UPS', color: 'emerald' },
                  { value: 'otro', label: 'Otros Equipos', color: 'slate' },
                ]}
              />
            </div>
          </div>

          {/* LISTA CON SCROLL DE EQUIPOS */}
          <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
            {filteredEquipments.map((eq) => {
              const isSelected = activeEquipment?.id === eq.id;
              return (
                <div
                  key={eq.id}
                  onClick={() => setSelectedEqId(eq.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer text-left ${
                    isSelected
                      ? 'bg-blue-50/80 border-blue-400 ring-2 ring-blue-500/20 shadow-xs'
                      : 'bg-white border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/60 px-2 py-0.5 rounded">
                      {eq.tag}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                      eq.status === 'operativo' ? 'bg-emerald-100 text-emerald-800' :
                      eq.status === 'alerta' ? 'bg-amber-100 text-amber-800' :
                      eq.status === 'en_mantenimiento' ? 'bg-blue-100 text-blue-800' :
                      'bg-rose-100 text-rose-800'
                    }`}>
                      {eq.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900 line-clamp-1">
                    {eq.name}
                  </h3>

                  <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                    {eq.brand} • {eq.model}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-100">
                    <span>{eq.area.split('-')[0]}</span>
                    <span className="font-semibold text-slate-600">{eq.powerHp} HP • {eq.nominalAmps} A</span>
                  </div>
                </div>
              );
            })}

            {filteredEquipments.length === 0 && (
              <div className="bg-white rounded-xl p-8 border border-slate-200 text-center text-slate-400 text-xs">
                No se encontraron equipos que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA DERECHA: FORMATO TÉCNICO DE HOJA DE VIDA (8 columnas) */}
        <div className="lg:col-span-8">
          {activeEquipment ? (
            <div id="printable-equipment-sheet" className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
              
              {/* CABECERA DEL FORMATO INSTITUCIONAL (ESTILO DOCUMENTO DE INGENIERÍA) */}
              <div className="p-6 border-b border-slate-200 bg-slate-50/70">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3">
                    <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
                      <Building2 className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] font-mono tracking-wider uppercase font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          FORMATO HDV-MANT-{activeEquipment.tag}
                        </span>
                        <span className="text-xs text-slate-500 font-semibold">
                          REV. 2026
                        </span>
                      </div>
                      <h2 className="text-lg font-bold text-slate-900 mt-1">
                        {settings.hotelInfo.hotelName}
                      </h2>
                      <p className="text-xs text-slate-500">
                        Departamento de Mantenimiento & Sala de Máquinas • {settings.hotelInfo.propertyCode}
                      </p>
                    </div>
                  </div>

                  {/* BOTONES DE IMPRIMIR / EDITAR */}
                  <div className="flex items-center space-x-2 print:hidden w-full sm:w-auto justify-end">
                    <button
                      onClick={handlePrintSheet}
                      className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors"
                      title="Imprimir o guardar en PDF"
                    >
                      <Printer className="w-4 h-4 text-slate-500" />
                      <span>Imprimir / PDF</span>
                    </button>

                    <button
                      onClick={() => handleOpenEdit(activeEquipment)}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-2xs transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Editar Hoja</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* TÍTULO DEL EQUIPO Y ESTADO OPERATIVO */}
              <div className="px-6 py-4 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center space-x-2.5">
                    <h3 className="text-base font-bold font-mono tracking-tight text-blue-400">
                      [{activeEquipment.tag}]
                    </h3>
                    <h3 className="text-base font-bold text-white">
                      {activeEquipment.name}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeEquipment.area} {activeEquipment.locationDetails ? `• ${activeEquipment.locationDetails}` : ''}
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                    activeEquipment.status === 'operativo' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' :
                    activeEquipment.status === 'alerta' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' :
                    activeEquipment.status === 'en_mantenimiento' ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40' :
                    'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                  }`}>
                    ● {activeEquipment.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* CUERPO PRINCIPAL DEL FORMATO */}
              <div className="p-6 space-y-6">
                
                {/* 1. DATOS DE IDENTIFICACIÓN Y PLACA */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2 mb-3 pb-1 border-b border-slate-100">
                    <Cpu className="w-4 h-4 text-blue-600" />
                    <span>1. Datos de Placa e Identificación Técnica</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-semibold block">Fabricante / Marca</span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 block">{activeEquipment.brand || 'N/A'}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-semibold block">Modelo</span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 block">{activeEquipment.model || 'N/A'}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-semibold block">Número de Serie</span>
                      <span className="text-xs font-mono font-bold text-slate-900 mt-0.5 block">{activeEquipment.serialNumber || 'S/N'}</span>
                    </div>

                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-semibold block">Categoría Técnica</span>
                      <span className="text-xs font-bold text-blue-700 capitalize mt-0.5 block">{activeEquipment.category.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>

                {/* 2. ESPECIFICACIONES ELECTROMECÁNICAS */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2 mb-3 pb-1 border-b border-slate-100">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>2. Parámetros Eléctricos & Hidráulicos</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Potencia Nominal</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                        {activeEquipment.powerHp} HP {activeEquipment.powerKw ? `(${activeEquipment.powerKw} kW)` : ''}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Tensión / Fases</span>
                      <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                        {activeEquipment.voltage}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Corriente Nominal</span>
                      <span className="text-sm font-bold text-amber-600 mt-0.5 block">
                        {activeEquipment.nominalAmps} Amperios
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Presión Nominal</span>
                      <span className="text-sm font-bold text-blue-600 mt-0.5 block">
                        {activeEquipment.nominalPressurePsi} PSI
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Velocidad de Giro</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                        {activeEquipment.rpm ? `${activeEquipment.rpm} RPM` : '3,450 RPM'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Protección IP</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                        {activeEquipment.ipRating || 'IP55'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Diám. Succión / Descarga</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                        {activeEquipment.suctionDiameterInches || '2"'} / {activeEquipment.dischargeDiameterInches || '1.5"'}
                      </span>
                    </div>

                    <div className="p-3 rounded-xl border border-slate-200">
                      <span className="text-[10px] text-slate-500 font-semibold block">Horómetro Acumulado</span>
                      <span className="text-xs font-bold text-slate-800 mt-0.5 block">
                        {activeEquipment.currentHours.toLocaleString()} Horas
                      </span>
                    </div>
                  </div>
                </div>

                {/* 3. LÍMITES OPERACIONALES DE SEGURIDAD (CRITERIOS DE ALERTA) */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2 mb-3 pb-1 border-b border-slate-100">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>3. Criterios de Aceptación & Límites Operativos</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200/80">
                      <span className="text-[10px] text-emerald-700 font-semibold block">Rango de Presión</span>
                      <span className="text-xs font-bold text-emerald-950 mt-0.5 block">
                        {activeEquipment.limits?.minPressurePsi || 45} a {activeEquipment.limits?.maxPressurePsi || 75} PSI
                      </span>
                    </div>

                    <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/80">
                      <span className="text-[10px] text-amber-700 font-semibold block">Temp. Máx. Cojinetes</span>
                      <span className="text-xs font-bold text-amber-950 mt-0.5 block">
                        ≤ {activeEquipment.limits?.maxBearingTempC || 70} °C
                      </span>
                    </div>

                    <div className="bg-blue-50/50 p-2.5 rounded-xl border border-blue-200/80">
                      <span className="text-[10px] text-blue-700 font-semibold block">Amperaje Máximo</span>
                      <span className="text-xs font-bold text-blue-950 mt-0.5 block">
                        ≤ {activeEquipment.limits?.maxAmperageL1 || 16} A
                      </span>
                    </div>

                    <div className="bg-purple-50/50 p-2.5 rounded-xl border border-purple-200/80">
                      <span className="text-[10px] text-purple-700 font-semibold block">Vibración Admisible</span>
                      <span className="text-xs font-bold text-purple-950 mt-0.5 block">
                        ≤ {activeEquipment.limits?.maxVibrationMmS || 4.5} mm/s RMS
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. TRAZABILIDAD, PROVEEDOR Y FECHAS */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2 mb-3 pb-1 border-b border-slate-100">
                    <Calendar className="w-4 h-4 text-slate-600" />
                    <span>4. Datos Administrativos & Proveedor</span>
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-semibold block">Fecha de Instalación</span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                        {activeEquipment.installationDate || 'No registrada'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-semibold block">Proveedor / Contratista</span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                        {activeEquipment.supplier || 'Proveedor Local'}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-semibold block">Activo Fijo / Contable</span>
                      <span className="text-xs font-mono font-bold text-slate-900 mt-0.5 block">
                        {activeEquipment.assetNumber || `ACT-${activeEquipment.tag}`}
                      </span>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-[10px] text-slate-500 font-semibold block">Lubricación Recomendada</span>
                      <span className="text-xs font-bold text-slate-900 mt-0.5 block">
                        {activeEquipment.lubricationType || 'Grasa Litio NLGI 2'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. HISTORIAL RECIENTE DE INSPECCIONES Y ÓRDENES DE TRABAJO */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2 mb-3 pb-1 border-b border-slate-100">
                    <Wrench className="w-4 h-4 text-indigo-600" />
                    <span>5. Historial Técnico & Órdenes de Mantenimiento</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Últimas Revisiones de Bomba */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-600" />
                          <span>Revisiones de Bomba ({eqInspections.length})</span>
                        </span>
                      </div>

                      {eqInspections.length > 0 ? (
                        <div className="space-y-2 max-h-36 overflow-y-auto text-xs">
                          {eqInspections.slice(0, 3).map((insp) => (
                            <div key={insp.id} className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-slate-800 block">{insp.date}</span>
                                <span className="text-[10px] text-slate-500">Por {insp.technicianName} • {insp.dischargePressurePsi} PSI</span>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                                insp.overallCondition === 'optimo' ? 'bg-emerald-100 text-emerald-800' :
                                insp.overallCondition === 'observacion' ? 'bg-amber-100 text-amber-800' :
                                'bg-rose-100 text-rose-800'
                              }`}>
                                {insp.overallCondition}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No hay revisiones recientes registradas.</p>
                      )}
                    </div>

                    {/* Mantenimientos Preventivos Vinculados */}
                    <div className="p-4 rounded-xl border border-slate-200 bg-white">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                          <Clock className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Órdenes Preventivas ({eqWorkOrders.length})</span>
                        </span>
                      </div>

                      {eqWorkOrders.length > 0 ? (
                        <div className="space-y-2 max-h-36 overflow-y-auto text-xs">
                          {eqWorkOrders.slice(0, 3).map((ot) => (
                            <div key={ot.id} className="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                              <div>
                                <span className="font-semibold text-slate-800 block">{ot.title}</span>
                                <span className="text-[10px] text-slate-500">{ot.scheduledDate} • {ot.technicianAssigned}</span>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded capitalize ${
                                ot.status === 'completado' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {ot.status}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 italic">No hay órdenes de mantenimiento preventivo abiertas.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 6. OBSERVACIONES TÉCNICAS */}
                {activeEquipment.notes && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-2 mb-2 pb-1 border-b border-slate-100">
                      <FileText className="w-4 h-4 text-slate-600" />
                      <span>6. Observaciones Técnicas y Recomendaciones</span>
                    </h4>
                    <div className="bg-amber-50/60 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-900 leading-relaxed">
                      {activeEquipment.notes}
                    </div>
                  </div>
                )}

                {/* FIRMAS INSTITUCIONALES PARA IMPRESIÓN */}
                <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs text-slate-500">
                  <div>
                    <div className="border-b border-slate-400 w-48 mx-auto mb-2" />
                    <p className="font-bold text-slate-800">{activeEquipment.maintenanceResponsible || 'Técnico Mecánico'}</p>
                    <p className="text-[10px]">Técnico Responsable de Mantenimiento</p>
                  </div>
                  <div>
                    <div className="border-b border-slate-400 w-48 mx-auto mb-2" />
                    <p className="font-bold text-slate-800">{settings.hotelInfo.chiefEngineer}</p>
                    <p className="text-[10px]">Jefe de Ingeniería y Mantenimiento Hotelero</p>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center text-slate-400 space-y-3">
              <FileSpreadsheet className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold">Selecciona un equipo o carga un archivo Excel para ver su Hoja de Vida</p>
            </div>
          )}
        </div>
      </div>
        </div>
      )}

      {/* MODAL PARA IMPORTAR CUALQUIER ARCHIVO (EXCEL, PDF, WORD, IMÁGENES, ETC.) */}
      {isExcelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            {/* Cabecera del Modal */}
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Subir Archivos desde el Computador
                  </h3>
                  <p className="text-xs text-slate-500">
                    Acepta Excel (.xlsx, .xls, .csv), PDF, Word, imágenes y cualquier formato conservando 100% los datos en PostgreSQL
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsExcelModalOpen(false);
                  setExcelPreviewData([]);
                  setParsedUploadedDocs([]);
                  setExcelFileName('');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Selector de Carpeta Destino */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                  <FolderOpen className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Carpeta de Destino:</span>
                </div>
                <select
                  value={uploadTargetFolderId}
                  onChange={(e) => setUploadTargetFolderId(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 sm:min-w-[240px]"
                >
                  <option value="">Raíz del Archivero (Sin carpeta)</option>
                  {flattenedFolderOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Zona de Arrastrar o Seleccionar Archivo(s) */}
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={async (e) => {
                  e.preventDefault();
                  const dropped = Array.from(e.dataTransfer.files || []);
                  if (dropped.length > 0) await processSelectedExcelFiles(dropped);
                }}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50/80 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all space-y-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="*/*"
                  multiple
                  onChange={handleExcelFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  {isParsingExcel ? <Loader2 className="w-6 h-6 animate-spin" /> : <Upload className="w-6 h-6" />}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {isParsingExcel
                      ? 'Procesando archivo y conservando formato original...'
                      : excelFileName
                      ? excelFileName
                      : 'Haz clic aquí o arrastra archivos (Excel, PDF, Word, Imágenes, etc.)'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Se guarda el archivo binario 100% intacto y los Excel se editan dentro de la aplicación con fidelidad total
                  </p>
                </div>
                {parsedUploadedDocs.length > 0 && (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white">
                    <Check className="w-3.5 h-3.5" />
                    <span>
                      {parsedUploadedDocs.length === 1
                        ? parsedUploadedDocs[0].sheets?.[0]?.rows?.length
                          ? `Listo: ${parsedUploadedDocs[0].sheets.length} hoja(s) • ${parsedUploadedDocs[0].totalRows} filas`
                          : `Listo: ${parsedUploadedDocs[0].name}`
                        : `${parsedUploadedDocs.length} archivos listos para guardar`}
                    </span>
                  </div>
                )}
              </div>

              {importError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Vista Previa */}
              {parsedUploadedDocs[0] && (
                parsedUploadedDocs[0].sheets?.[0]?.rows?.length ? (
                  <div className="space-y-3 border border-slate-200 rounded-2xl p-4 bg-slate-50/60">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center space-x-2">
                        <Table className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                          Vista Previa Exacta ({parsedUploadedDocs[0].name})
                        </h4>
                      </div>
                      <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 tabular-nums">
                        {parsedUploadedDocs[0].totalRows} filas • {parsedUploadedDocs[0].sheets.length} hoja(s)
                      </span>
                    </div>

                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white max-h-52">
                      <table className="min-w-full text-left text-[11px] border-collapse">
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {parsedUploadedDocs[0].sheets[0].rows.slice(0, 6).map((row, rIdx) => (
                            <tr key={rIdx}>
                              <td className="px-2 py-1 text-slate-400 border-r border-slate-200 bg-slate-50 font-mono text-[10px] w-8 text-center">
                                {rIdx + 1}
                              </td>
                              {parsedUploadedDocs[0].sheets[0].headers.slice(0, 8).map((_, cIdx) => {
                                const st = parsedUploadedDocs[0].sheets[0].cellStyles?.[`${rIdx}-${cIdx}`];
                                return (
                                  <td
                                    key={cIdx}
                                    style={{
                                      backgroundColor: st?.bgColor || undefined,
                                      color: st?.textColor || undefined,
                                      fontWeight: st?.bold ? 700 : undefined,
                                      textAlign: st?.align || undefined
                                    }}
                                    className="px-2.5 py-1 border-r border-slate-200 truncate max-w-[160px]"
                                  >
                                    {String(row[cIdx] ?? '')}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900 truncate">{parsedUploadedDocs[0].name}</p>
                        <p className="text-[11px] text-slate-500">
                          {(parsedUploadedDocs[0].originalExtension || parsedUploadedDocs[0].type || 'ARCHIVO').toUpperCase()} • {parsedUploadedDocs[0].mimeType || 'Binario original'}
                        </p>
                      </div>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                      Archivo intacto listo
                    </span>
                  </div>
                )
              )}

              <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Respaldo Permanente en PostgreSQL:</span>
                </p>
                <p className="text-emerald-800">
                  Tus archivos y carpetas se guardan directamente en PostgreSQL sin perder formato, estilos ni archivos adjuntos al actualizar o reiniciar la aplicación.
                </p>
              </div>
            </div>

            {/* Pie del Modal */}
            <div className="p-4 border-t border-slate-200 flex items-center justify-between gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setIsExcelModalOpen(false);
                  setExcelPreviewData([]);
                  setParsedUploadedDocs([]);
                  setExcelFileName('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={parsedUploadedDocs.length === 0 || isImporting || isParsingExcel}
                onClick={handleConfirmExcelImport}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-2 cursor-pointer"
              >
                {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
                <span>
                  {isImporting
                    ? 'Guardando en PostgreSQL...'
                    : parsedUploadedDocs.length > 1
                    ? `Guardar ${parsedUploadedDocs.length} Archivos`
                    : 'Guardar Archivo Permanentemente'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR UN LIBRO EXCEL NUEVO DESDE PLANTILLA */}
      {isCreateExcelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-emerald-400">
                  <FilePlus2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Crear Nuevo Archivo Excel</h3>
                  <p className="text-xs text-slate-500">Se crea con formato profesional y se guarda en PostgreSQL</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateExcelModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewExcelDocument} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre del Archivo Excel *
                </label>
                <input
                  type="text"
                  required
                  value={newExcelFileName}
                  onChange={(e) => setNewExcelFileName(e.target.value)}
                  placeholder="Ej. Hoja_Vida_Chiller_01"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Plantilla Inicial
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    {
                      id: 'hoja_vida_equipo' as ExcelTemplateType,
                      title: 'Hoja de Vida de Equipo (Completa con Colores)',
                      desc: 'Incluye Identificación, Especificaciones de Placa e Historial de Mantenimiento.'
                    },
                    {
                      id: 'control_mantenimiento' as ExcelTemplateType,
                      title: 'Control de Mantenimiento y Repuestos',
                      desc: 'Tabla estructurada por fecha, actividad, técnico, horas y costo.'
                    },
                    {
                      id: 'en_blanco' as ExcelTemplateType,
                      title: 'Libro Excel en Blanco (8 columnas × 15 filas)',
                      desc: 'Cuadrícula libre para diseñar y formatear desde cero.'
                    }
                  ].map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => setNewExcelTemplate(tpl.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        newExcelTemplate === tpl.id
                          ? 'border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500/30'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="text-xs font-bold text-slate-900">{tpl.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{tpl.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Guardar en Carpeta
                </label>
                <select
                  value={newExcelFolderId}
                  onChange={(e) => setNewExcelFolderId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs font-semibold text-slate-800"
                >
                  <option value="">Raíz del Archivero (Sin carpeta)</option>
                  {flattenedFolderOptions.map(opt => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateExcelModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreatingExcelDoc || !newExcelFileName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-2 cursor-pointer"
                >
                  {isCreatingExcelDoc ? <Loader2 className="w-4 h-4 animate-spin" /> : <FilePlus2 className="w-4 h-4" />}
                  <span>Crear y Abrir</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR O EDITAR HOJA DE VIDA DE EQUIPO */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-700">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {isCreatingNew ? 'Nueva Hoja de Vida de Equipo' : `Editar Hoja de Vida: ${formData.tag}`}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Ingresa o actualiza los datos técnicos del equipo
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEquipment} className="p-6 overflow-y-auto space-y-6 text-xs">
              
              {/* Sección 1: Identificación */}
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3 pb-1 border-b border-slate-100 flex items-center space-x-2">
                  <Cpu className="w-3.5 h-3.5 text-blue-600" />
                  <span>Identificación y Ubicación</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Código / TAG *</label>
                    <input
                      type="text"
                      required
                      value={formData.tag || ''}
                      onChange={(e) => setFormData({ ...formData, tag: e.target.value })}
                      placeholder="e.g. BOM-PRES-01"
                      className="w-full p-2 rounded-lg border border-slate-200 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-semibold mb-1">Nombre del Equipo *</label>
                    <input
                      type="text"
                      required
                      value={formData.name || ''}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. Bomba de Presión Hidroneumática 01"
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <CustomSelect
                      label="Categoría"
                      value={formData.category || 'bomba_presion'}
                      onChange={(val) => setFormData({ ...formData, category: val as PumpCategory })}
                      options={[
                        { value: 'sauna_cold_plunge', label: 'Sauna / Cold Plunge / Spa / Zona Húmeda', color: 'cyan', icon: <SaunaColdPlungeIcon className="w-4 h-4 text-cyan-600" /> },
                        { value: 'tanque_agua', label: 'Tanque de Agua / Depósito / Cisterna', color: 'sky', icon: <TankIcon className="w-4 h-4 text-sky-600" /> },
                        { value: 'subestacion', label: 'Subestación Eléctrica / Transformador', color: 'amber', icon: <SubstationIcon className="w-4 h-4 text-amber-600" /> },
                        { value: 'bomba_presion', label: 'Bomba de Presión', color: 'blue', icon: <WaterPumpIcon className="w-4 h-4 text-blue-600" /> },
                        { value: 'bomba_impulsion', label: 'Bomba de Impulsión', color: 'blue', icon: <WaterPumpIcon className="w-4 h-4 text-blue-600" /> },
                        { value: 'bomba_acs', label: 'Bomba ACS', color: 'amber', icon: <WaterPumpIcon className="w-4 h-4 text-amber-600" /> },
                        { value: 'bomba_piscina', label: 'Bomba de Piscina', color: 'cyan', icon: <WaterPumpIcon className="w-4 h-4 text-blue-600" /> },
                        { value: 'bomba_achique', label: 'Bomba de Achique', color: 'slate', icon: <WaterPumpIcon className="w-4 h-4 text-slate-600" /> },
                        { value: 'bomba_incendio', label: 'Bomba Contra Incendio', color: 'rose', icon: <WaterPumpIcon className="w-4 h-4 text-rose-600" /> },
                        { value: 'combustible', label: 'Tanque de Combustible / ACPM', color: 'orange', icon: <Fuel className="w-4 h-4 text-orange-600" /> },
                        { value: 'caldera', label: 'Caldera', color: 'amber' },
                        { value: 'chiller', label: 'Chiller', color: 'teal' },
                        { value: 'condensador', label: 'Condensador / Unidad Condensadora', color: 'cyan', icon: <CondenserIcon className="w-4 h-4 text-cyan-600" /> },
                        { value: 'generador', label: 'Generador', color: 'amber' },
                        { value: 'bateria', label: 'Banco de Baterías / UPS', color: 'emerald' },
                        { value: 'otro', label: 'Otro Equipo', color: 'slate' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Área / Sala</label>
                    <input
                      type="text"
                      value={formData.area || ''}
                      onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                      placeholder="e.g. Sótano 2 - Sala de Bombas"
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Detalle de Ubicación</label>
                    <input
                      type="text"
                      value={formData.locationDetails || ''}
                      onChange={(e) => setFormData({ ...formData, locationDetails: e.target.value })}
                      placeholder="e.g. Bancada B-1"
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 2: Datos de Placa */}
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3 pb-1 border-b border-slate-100 flex items-center space-x-2">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Datos de Placa y Especificaciones</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Marca</label>
                    <input
                      type="text"
                      value={formData.brand || ''}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Modelo</label>
                    <input
                      type="text"
                      value={formData.model || ''}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Número de Serie</label>
                    <input
                      type="text"
                      value={formData.serialNumber || ''}
                      onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 font-mono focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <CustomSelect
                      label="Estado"
                      value={formData.status || 'operativo'}
                      onChange={(val) => setFormData({ ...formData, status: val as EquipmentStatus })}
                      options={[
                        { value: 'operativo', label: 'Operativo', color: 'emerald' },
                        { value: 'alerta', label: 'En Alerta / Observación', color: 'amber' },
                        { value: 'en_mantenimiento', label: 'En Mantenimiento', color: 'blue' },
                        { value: 'fuera_servicio', label: 'Fuera de Servicio', color: 'rose' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Potencia (HP)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.powerHp || 0}
                      onChange={(e) => setFormData({ ...formData, powerHp: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Voltaje</label>
                    <input
                      type="text"
                      value={formData.voltage || ''}
                      onChange={(e) => setFormData({ ...formData, voltage: e.target.value })}
                      placeholder="e.g. 380V / 3F / 60Hz"
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Amperaje Nominal (A)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={formData.nominalAmps || 0}
                      onChange={(e) => setFormData({ ...formData, nominalAmps: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Presión Nominal (PSI)</label>
                    <input
                      type="number"
                      step="1"
                      value={formData.nominalPressurePsi || 0}
                      onChange={(e) => setFormData({ ...formData, nominalPressurePsi: parseFloat(e.target.value) || 0 })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Sección 3: Datos de Trazabilidad y Administrativos */}
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-3 pb-1 border-b border-slate-100 flex items-center space-x-2">
                  <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Datos Administrativos y Proveedor</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Proveedor / Fabricante</label>
                    <input
                      type="text"
                      value={formData.supplier || ''}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      placeholder="e.g. Bombas & Sistemas S.A."
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Código de Activo Fijo</label>
                    <input
                      type="text"
                      value={formData.assetNumber || ''}
                      onChange={(e) => setFormData({ ...formData, assetNumber: e.target.value })}
                      placeholder="e.g. ACT-4401"
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-semibold mb-1">Fecha de Instalación</label>
                    <input
                      type="date"
                      value={formData.installationDate || ''}
                      onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })}
                      className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-slate-700 font-semibold mb-1">Notas / Observaciones Técnicas</label>
                    <textarea
                      rows={3}
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Historial particular, recomendaciones de arranque o precauciones..."
                      className="w-full p-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Botones del Formulario */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                {!isCreatingNew && formData.id && (
                  <button
                    type="button"
                    onClick={() => {
                      requireAdmin('Eliminar Hoja de Vida', async () => {
                        if (window.confirm(`¿Estás seguro de eliminar la hoja de vida de ${formData.tag}?`)) {
                          setIsEditModalOpen(false);
                          deleteEquipment(formData.id!);
                          notify(`Hoja de vida de ${formData.tag} eliminada`);
                        }
                      });
                    }}
                    className="inline-flex items-center space-x-1 px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 font-semibold text-xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar</span>
                  </button>
                )}

                <div className="flex items-center space-x-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold text-xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm text-xs"
                  >
                    Guardar Hoja de Vida
                  </button>
                </div>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
