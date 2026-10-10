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
  Fuel
} from 'lucide-react';
import { OriginalDocumentViewer } from './OriginalDocumentViewer';
import { CustomSelect } from '../common/CustomSelect';
import { WaterPumpIcon, CondenserIcon, SubstationIcon, TankIcon, SaunaColdPlungeIcon } from '../../utils/roundIcons';

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
    deleteUploadedDocument,
    clearAllUploadedDocuments,
    documentFolders,
    createDocumentFolder,
    deleteDocumentFolder,
    verifyAdminPin,
    setRole,
    pumpInspections, 
    workOrders, 
    incidents, 
    settings, 
    isAdmin, 
    notify,
    setSelectedTab,
    canDeleteRecords
  } = useMaintenance();

  // Navigation Sub-tab: Hojas de Vida Técnicas vs Visor de Documentos Originales
  const [activeSubTab, setActiveSubTab] = useState<'hojas_vida' | 'visor_documentos'>('hojas_vida');
  const [activeDocId, setActiveDocId] = useState<string>('');
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  const handleCreateFolder = async (name: string) => {
    await createDocumentFolder(name);
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (activeFolderId === folderId) {
      setActiveFolderId(null);
    }
    deleteDocumentFolder(folderId); // background
  };

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
  const [parsedUploadedDoc, setParsedUploadedDoc] = useState<Omit<UploadedDocument, 'id'> | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Handle Excel File Upload (Stores original document sheets and detects equipment)
  const handleExcelFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setExcelFileName(file.name);
    setImportError(null);

    const base64Reader = new FileReader();
    let rawBase64Data = '';
    base64Reader.onload = (bevt) => {
      rawBase64Data = bevt.target?.result as string || '';
    };
    base64Reader.readAsDataURL(file);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const bstr = evt.target?.result;
        const workbook = XLSX.read(bstr, { type: 'binary', cellStyles: true });

        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          setImportError('El archivo no contiene hojas de cálculo.');
          return;
        }

        const extractedSheets: UploadedDocumentSheet[] = [];
        let totalExtractedRows = 0;
        let maxCols = 0;

        // Process all sheets in workbook
        workbook.SheetNames.forEach((sheetName) => {
          const worksheet = workbook.Sheets[sheetName];
          const rawAoa: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          if (!rawAoa || rawAoa.length === 0) return;

          // Find the best header row within first 10 rows
          let bestHeaderIdx = 0;
          let bestScore = -1;

          const headerKeywords = [
            'tag', 'cod', 'codigo', 'equipo', 'nombre', 'marca', 'modelo',
            'serie', 'area', 'ubicacion', 'hp', 'kw', 'potencia', 'item',
            'voltaje', 'tension', 'amperaje', 'presion', 'descripcion', 'estado'
          ];

          for (let r = 0; r < Math.min(rawAoa.length, 12); r++) {
            const row = rawAoa[r];
            if (!Array.isArray(row)) continue;

            const textCells = row.filter(c => typeof c === 'string' && c.trim().length > 0);
            if (textCells.length === 0) continue;

            let score = textCells.length;
            row.forEach(c => {
              const str = String(c).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
              if (headerKeywords.some(kw => str.includes(kw))) {
                score += 5;
              }
            });

            if (score > bestScore) {
              bestScore = score;
              bestHeaderIdx = r;
            }
          }

          // Headers
          const rawHeaderRow = rawAoa[bestHeaderIdx] || [];
          const headers: string[] = rawHeaderRow.map((cell, idx) => {
            const val = String(cell || '').trim();
            return val || `Columna ${idx + 1}`;
          });

          if (headers.length > maxCols) maxCols = headers.length;

          // Data rows (rows after header row with non-empty content)
          const dataRows: any[][] = rawAoa.slice(bestHeaderIdx + 1).filter(row => {
            if (!Array.isArray(row)) return false;
            return row.some(cell => cell !== '' && cell !== null && cell !== undefined);
          });

          totalExtractedRows += dataRows.length;

          // Extract cell styles if present
          const cellStyles: Record<string, any> = {};
          try {
            const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
            for (let R = range.s.r; R <= range.e.r; ++R) {
              for (let C = range.s.c; C <= range.e.c; ++C) {
                const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
                const cell = worksheet[cellRef];
                if (cell && cell.s) {
                  const styleInfo: any = {};
                  if (cell.s.fill && cell.s.fill.fgColor) {
                    const rgb = cell.s.fill.fgColor.rgb || cell.s.fill.fgColor.theme;
                    if (rgb && typeof rgb === 'string') {
                      styleInfo.bgColor = `#${rgb.length === 8 ? rgb.substring(2) : rgb}`;
                    }
                  }
                  if (cell.s.font) {
                    if (cell.s.font.color && cell.s.font.color.rgb) {
                      const frgb = cell.s.font.color.rgb;
                      styleInfo.textColor = `#${frgb.length === 8 ? frgb.substring(2) : frgb}`;
                    }
                    if (cell.s.font.bold) styleInfo.bold = true;
                    if (cell.s.font.italic) styleInfo.italic = true;
                  }
                  if (cell.s.alignment && cell.s.alignment.horizontal) {
                    styleInfo.align = cell.s.alignment.horizontal;
                  }
                  if (R > bestHeaderIdx) {
                    const dataRowIdx = R - bestHeaderIdx - 1;
                    cellStyles[`${dataRowIdx}-${C}`] = styleInfo;
                  }
                }
              }
            }
          } catch (stErr) {
            console.warn('Could not parse cell styles:', stErr);
          }

          extractedSheets.push({
            name: sheetName,
            headers,
            rows: dataRows,
            cellStyles
          });
        });

        if (extractedSheets.length === 0 || totalExtractedRows === 0) {
          setImportError('El archivo Excel no contiene filas de datos.');
          return;
        }

        // Create the UploadedDocument object
        const newUploadedDoc: Omit<UploadedDocument, 'id'> = {
          name: file.name,
          uploadDate: new Date().toISOString(),
          uploadedBy: isAdmin ? 'Administrador' : 'Técnico Autorizado',
          sizeBytes: file.size,
          type: 'excel',
          sheets: extractedSheets,
          totalRows: totalExtractedRows,
          totalColumns: maxCols,
          rawBase64: rawBase64Data
        };
        setParsedUploadedDoc(newUploadedDoc);

        // Map primary sheet to Equipment objects intelligently
        const primarySheet = extractedSheets[0];
        const headers = primarySheet.headers;

        // Determine column indexes
        const findColIdx = (keywords: string[]) => {
          return headers.findIndex(h => {
            const clean = h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
            return keywords.some(kw => clean.includes(kw));
          });
        };

        const tagIdx = findColIdx(['tag', 'cod', 'codigo', 'id', 'activo', 'item', 'numero', 'no']);
        const nameIdx = findColIdx(['nombre', 'equipo', 'descripcion', 'denominacion', 'maquinaria', 'maquina', 'aparato', 'elemento', 'activo']);
        const brandIdx = findColIdx(['marca', 'fabricante', 'brand', 'make']);
        const modelIdx = findColIdx(['modelo', 'model', 'referencia', 'ref', 'tipo']);
        const serialIdx = findColIdx(['serie', 'serial', 'noserie', 'numeroserie', 'sn', 'placa']);
        const areaIdx = findColIdx(['area', 'ubicacion', 'zona', 'sector', 'lugar', 'piso', 'cuarto', 'sala']);
        const locationDetailsIdx = findColIdx(['detalles', 'sububicacion', 'especifica', 'exacta']);
        const hpIdx = findColIdx(['hp', 'kw', 'potencia', 'capacidad']);
        const voltageIdx = findColIdx(['voltaje', 'tension', 'v', 'fase']);
        const ampsIdx = findColIdx(['amperaje', 'corriente', 'amps', 'a']);
        const pressureIdx = findColIdx(['presion', 'psi', 'bar']);
        const statusIdx = findColIdx(['estado', 'status', 'condicion']);

        const mappedList: Partial<Equipment>[] = primarySheet.rows.map((row, idx) => {
          // Extract tag
          let tag = tagIdx !== -1 && row[tagIdx] ? String(row[tagIdx]).trim() : '';
          
          // Extract name
          let name = nameIdx !== -1 && row[nameIdx] ? String(row[nameIdx]).trim() : '';
          
          // If name wasn't found in nameIdx, look for first text cell with reasonable length
          if (!name) {
            for (let c = 0; c < row.length; c++) {
              const cellVal = String(row[c] ?? '').trim();
              if (c !== tagIdx && cellVal.length > 3 && isNaN(Number(cellVal))) {
                name = cellVal;
                break;
              }
            }
          }

          if (!name) {
            name = `Equipo Fila ${idx + 1}`;
          }

          if (!tag) {
            // Generate clean tag from name initials or number
            const prefix = name.toLowerCase().includes('bomba') ? 'BOM' :
                           name.toLowerCase().includes('calder') ? 'CAL' :
                           name.toLowerCase().includes('chiller') ? 'CHI' :
                           name.toLowerCase().includes('tanque') ? 'TNQ' : 'EQ';
            tag = `${prefix}-${(idx + 1).toString().padStart(2, '0')}`;
          }

          const brand = brandIdx !== -1 && row[brandIdx] ? String(row[brandIdx]).trim() : 'N/A';
          const model = modelIdx !== -1 && row[modelIdx] ? String(row[modelIdx]).trim() : 'N/A';
          const serialNumber = serialIdx !== -1 && row[serialIdx] ? String(row[serialIdx]).trim() : 'S/N';
          const area = areaIdx !== -1 && row[areaIdx] ? String(row[areaIdx]).trim() : 'Sala de Máquinas General';
          const locationDetails = locationDetailsIdx !== -1 && row[locationDetailsIdx] ? String(row[locationDetailsIdx]).trim() : '';

          const powerHp = hpIdx !== -1 ? (parseFloat(String(row[hpIdx]).replace(/[^0-9.]/g, '')) || 0) : 0;
          const voltage = voltageIdx !== -1 && row[voltageIdx] ? String(row[voltageIdx]).trim() : '220V / 3F';
          const nominalAmps = ampsIdx !== -1 ? (parseFloat(String(row[ampsIdx]).replace(/[^0-9.]/g, '')) || 0) : 0;
          const nominalPressurePsi = pressureIdx !== -1 ? (parseFloat(String(row[pressureIdx]).replace(/[^0-9.]/g, '')) || 0) : 0;

          const statusRaw = statusIdx !== -1 && row[statusIdx] ? String(row[statusIdx]).toLowerCase() : 'operativo';
          let status: EquipmentStatus = 'operativo';
          if (statusRaw.includes('manten') || statusRaw.includes('taller')) status = 'en_mantenimiento';
          else if (statusRaw.includes('fuer') || statusRaw.includes('dan') || statusRaw.includes('par')) status = 'fuera_servicio';
          else if (statusRaw.includes('alert') || statusRaw.includes('obs')) status = 'alerta';

          // Category detection
          let category: PumpCategory = 'bomba_presion';
          const combinedText = `${name} ${tag}`.toLowerCase();
          if (combinedText.includes('impuls')) category = 'bomba_impulsion';
          else if (combinedText.includes('calder') || combinedText.includes('boiler')) category = 'caldera';
          else if (combinedText.includes('chiller') || combinedText.includes('enfriad')) category = 'chiller';
          else if (combinedText.includes('sauna') || combinedText.includes('plunge') || combinedText.includes('turco')) category = 'sauna_cold_plunge';
          else if (combinedText.includes('piscina') || combinedText.includes('alberca')) category = 'bomba_piscina';
          else if (combinedText.includes('acs') || combinedText.includes('caliente')) category = 'bomba_acs';
          else if (combinedText.includes('achique') || combinedText.includes('fosa')) category = 'bomba_achique';
          else if (combinedText.includes('incend') || combinedText.includes('jockey')) category = 'bomba_incendio';
          else if (combinedText.includes('generad') || combinedText.includes('planta')) category = 'generador';
          else if (combinedText.includes('bater') || combinedText.includes('battery') || combinedText.includes('ups') || combinedText.includes('acumulad')) category = 'bateria';

          // Collect extra columns in notes
          const extraInfo: string[] = [];
          row.forEach((cell, cIdx) => {
            if (![tagIdx, nameIdx, brandIdx, modelIdx, serialIdx, areaIdx, locationDetailsIdx, hpIdx, voltageIdx, ampsIdx, pressureIdx, statusIdx].includes(cIdx)) {
              if (cell !== '' && cell !== null && cell !== undefined) {
                const headerLabel = headers[cIdx] || `Columna ${cIdx + 1}`;
                extraInfo.push(`${headerLabel}: ${cell}`);
              }
            }
          });

          return {
            tag,
            name,
            brand,
            model,
            serialNumber,
            area,
            locationDetails,
            powerHp,
            powerKw: powerHp > 0 ? Number((powerHp * 0.7457).toFixed(2)) : 0,
            voltage,
            nominalAmps,
            nominalPressurePsi,
            category,
            status,
            installationDate: new Date().toISOString().split('T')[0],
            notes: extraInfo.length > 0 ? `Datos del documento original:\n${extraInfo.join('\n')}` : '',
            criticality: 'media'
          };
        });

        setExcelPreviewData(mappedList);
      } catch (err: any) {
        console.error('Error parsing Excel:', err);
        setImportError('Error al leer el archivo. Asegúrate de que sea un archivo de Excel válido (.xlsx, .xls o .csv).');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Confirm Excel Import and Save Document into Visor (Exclusively in Hojas de Vida)
  const handleConfirmExcelImport = async () => {
    if (!parsedUploadedDoc) {
      notify('Por favor selecciona un archivo Excel válido');
      return;
    }

    setIsImporting(true);
    try {
      // Save exclusively into uploadedDocuments (Hojas de Vida) with optional folderId
      const docToSave = {
        ...parsedUploadedDoc,
        folderId: activeFolderId || undefined
      };
      const savedDoc = await addUploadedDocument(docToSave);
      setActiveDocId(savedDoc.id);
      setActiveSubTab('visor_documentos');
      notify(`Documento "${savedDoc.name}" guardado exclusivamente en este apartado`);

      setIsExcelModalOpen(false);
      setExcelPreviewData([]);
      setParsedUploadedDoc(null);
      setExcelFileName('');
    } catch (e) {
      console.error(e);
      notify('Ocurrió un inconveniente al guardar el documento');
    } finally {
      setIsImporting(false);
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
            onClick={() => setIsExcelModalOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center space-x-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-98 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Upload className="w-4 h-4" />
            <span>Cargar Excel / Doc</span>
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
          onClick={() => setActiveSubTab('hojas_vida')}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeSubTab === 'hojas_vida'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Hojas de Vida Técnicas</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            activeSubTab === 'hojas_vida' ? 'bg-slate-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {equipments.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('visor_documentos')}
          className={`inline-flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
            activeSubTab === 'visor_documentos'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Documentos Excel Guardados</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            activeSubTab === 'visor_documentos' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
          }`}>
            {uploadedDocuments.length}
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
          onDeleteDocument={async (id) => {
            deleteUploadedDocument(id);
          }}
          onClearAllDocuments={async () => {
            clearAllUploadedDocuments();
          }}
          onTriggerUpload={() => {
            requireAdmin('Cargar Documentos', () => {
              setIsExcelModalOpen(true);
            });
          }}
          isAdmin={isAdmin}
          onRequireAdminPin={requireAdmin}
          onCleanImportedEquipments={async () => {
            await cleanAllImportedEquipments();
          }}
          importedEquipmentsCount={importedEquipmentsCount}
          folders={documentFolders}
          onCreateFolder={handleCreateFolder}
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

      {/* MODAL PARA IMPORTAR ARCHIVO EXCEL (.XLSX / .XLS / .CSV) */}
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
                    Cargar Documento Excel (.xlsx, .xls, .csv)
                  </h3>
                  <p className="text-xs text-slate-500">
                    El documento se guardará exclusivamente en la casilla de Hojas de Vida de Equipos
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsExcelModalOpen(false);
                  setExcelPreviewData([]);
                  setParsedUploadedDoc(null);
                  setExcelFileName('');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* Zona de Arrastrar o Seleccionar Archivo */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/50 hover:bg-emerald-50/80 rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all space-y-3"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleExcelFileUpload}
                  className="hidden"
                />
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    {excelFileName ? excelFileName : 'Haz clic aquí o arrastra tu archivo Excel / CSV'}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Formatos compatibles: .xlsx, .xls, .csv (Se conservan hojas, columnas y filas originales)
                  </p>
                </div>
                {excelFileName && (
                  <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white shadow-2xs">
                    <Check className="w-3.5 h-3.5" />
                    <span>Archivo analizado: {parsedUploadedDoc?.sheets.length || 1} Hoja(s) • {parsedUploadedDoc?.totalRows || 0} Filas</span>
                  </div>
                )}
              </div>

              {/* Mensaje de Error si ocurre */}
              {importError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{importError}</span>
                </div>
              )}

              {/* Vista Previa de los Datos Extraídos */}
              {parsedUploadedDoc && (
                <div className="space-y-3 border border-slate-200 rounded-2xl p-4 bg-slate-50/60">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Table className="w-4 h-4 text-emerald-600" />
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Vista Previa del Documento Original
                      </h4>
                    </div>
                    <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {parsedUploadedDoc.totalRows} filas extraídas con fidelidad
                    </span>
                  </div>

                  {/* Tabla con las primeras 5 filas tal como están en el Excel */}
                  {parsedUploadedDoc.sheets[0] && (
                    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white max-h-48">
                      <table className="min-w-full text-left text-[11px] border-collapse">
                        <thead className="bg-slate-100 text-slate-700 uppercase font-semibold sticky top-0 border-b border-slate-200">
                          <tr>
                            <th className="px-2.5 py-1.5 border-r border-slate-200 text-slate-400">#</th>
                            {parsedUploadedDoc.sheets[0].headers.slice(0, 8).map((h, i) => (
                              <th key={i} className="px-2.5 py-1.5 border-r border-slate-200 truncate max-w-[140px]" title={h}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-mono text-slate-700">
                          {parsedUploadedDoc.sheets[0].rows.slice(0, 5).map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-50">
                              <td className="px-2.5 py-1 text-slate-400 border-r border-slate-100 bg-slate-50/60">{rIdx + 1}</td>
                              {parsedUploadedDoc.sheets[0].headers.slice(0, 8).map((_, cIdx) => (
                                <td key={cIdx} className="px-2.5 py-1 border-r border-slate-100 truncate max-w-[140px]">
                                  {String(row[cIdx] ?? '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Instrucción o ayuda */}
              <div className="bg-emerald-50/80 p-3.5 rounded-xl border border-emerald-200 text-xs text-emerald-900 space-y-1">
                <p className="font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>Almacenamiento exclusivo en Hojas de Vida:</span>
                </p>
                <p className="text-emerald-800">
                  Este documento quedará guardado <strong>únicamente en la casilla de Hojas de Vida de Equipos</strong> para su consulta exacta con todas sus hojas y tablas. NO se agregará al inventario general ni aparecerá en el Parque de Bombas u otras secciones.
                </p>
              </div>

            </div>

            {/* Pie del Modal */}
            <div className="p-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50">
              <button
                type="button"
                onClick={() => {
                  setIsExcelModalOpen(false);
                  setExcelPreviewData([]);
                  setParsedUploadedDoc(null);
                  setExcelFileName('');
                }}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 self-start sm:self-auto"
              >
                Cancelar
              </button>

              <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={!parsedUploadedDoc || isImporting}
                  onClick={() => handleConfirmExcelImport()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-sm transition-all flex items-center space-x-2"
                  title="Guardar documento exclusivamente en Hojas de Vida"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{isImporting ? 'Guardando en la nube...' : 'Guardar Documento en Hojas de Vida'}</span>
                </button>
              </div>
            </div>
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
