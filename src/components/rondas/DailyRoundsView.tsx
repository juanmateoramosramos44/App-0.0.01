import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useMaintenance, checkRealInternetConnection, isUserOwnRound } from '../../context/MaintenanceContext';
import { 
  DailyRound, 
  RoundShift, 
  RoundCheckpoint, 
  RoundAnomaly,
  RoundMeasurementField
} from '../../types';
import { 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  PlusCircle, 
  Calendar, 
  User, 
  Droplets, 
  Flame, 
  ShieldAlert, 
  ChevronRight, 
  X, 
  FileText, 
  Check, 
  Search, 
  Trash2, 
  Eye,
  AlertCircle,
  Lock,
  Loader2,
  Shield,
  Wrench,
  Snowflake,
  Gauge,
  Edit2,
  RefreshCw,
  Wind,
  DoorClosed,
  Lightbulb,
  MessageSquare,
  Info,
  Sparkles,
  Sliders,
  Battery,
  Plus,
  Thermometer,
  Activity,
  Music,
  Share2,
  FileDown,
  Printer,
  Play,
  Camera,
  Image as ImageIcon,
  Zap,
  ArrowRight,
  Filter,
  CheckCircle,
  WifiOff,
  Wifi
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';
import { CustomButtonBuilder, getButtonColorClass, getStatusBadgeClass, ButtonActionConfig } from '../common/CustomButtonBuilder';
import { DecimalInput } from '../common/DecimalInput';
import { getRoundItemIcon, WaterPumpIcon, ManometerIcon, CondenserIcon, SubstationIcon, TankIcon, SaunaColdPlungeIcon, CavaRefrigerationIcon } from '../../utils/roundIcons';
import { getCheckpointButtonAction, getFieldButtonAction, isCheckpointAlarmActive, isCheckpointComplete, getIncompleteCheckpoints } from '../../utils/roundButtonUtils';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';
import { RoundShareModal } from './RoundShareModal';
import { SmartMeterScannerModal, MeterScanResult } from './SmartMeterScannerModal';
import { downloadRoundPdf, formatShiftName } from '../../utils/roundPdfReport';
import { Fuel } from 'lucide-react';

export interface FormMeasurementField {
  id: string;
  name: string;
  unit: string;
  isCustomUnit?: boolean;
  customUnitValue?: string;
  minValue?: number | '';
  maxValue?: number | '';
  includeButtons?: boolean;
  options?: string;
  buttonActions?: Record<string, ButtonActionConfig>;
}

const STANDARD_MEASUREMENT_UNITS = [
  { value: '°C', label: '°C (Grados Celsius - Frío/Calor)', color: 'blue' },
  { value: '°F', label: '°F (Grados Fahrenheit)', color: 'blue' },
  { value: 'PSI', label: 'PSI (Presión Hidráulica / Gas)', color: 'indigo' },
  { value: 'Bar', label: 'Bar (Presión)', color: 'indigo' },
  { value: 'Gal', label: 'Gal (Galones - Nivel / Tanque Combustible ACPM)', color: 'amber' },
  { value: 'L', label: 'L (Litros - Tanques / Aceite / Combustible)', color: 'amber' },
  { value: 'cm', label: 'cm (Centímetros - Nivel de Tanque / Regla)', color: 'slate' },
  { value: 'V', label: 'V (Voltios - Voltaje de Baterías / Tensión)', color: 'emerald' },
  { value: 'VDC', label: 'VDC (Voltaje DC - Banco de Baterías / UPS)', color: 'emerald' },
  { value: 'A', label: 'A (Amperios - Corriente / Carga de Baterías)', color: 'amber' },
  { value: 'kWh', label: 'kWh (Consumo Eléctrico)', color: 'amber' },
  { value: 'm³', label: 'm³ (Metros Cúbicos / Agua / Gas)', color: 'emerald' },
  { value: 'kW', label: 'kW (Potencia)', color: 'amber' },
  { value: 'FP', label: 'FP (Factor de Potencia - Condensadores)', color: 'teal' },
  { value: '%', label: '% (Porcentaje / Nivel de Batería / Tanque / Carga)', color: 'slate' },
  { value: 'PPM', label: 'PPM (Partes por millón / Cloro)', color: 'cyan' },
  { value: 'RPM', label: 'RPM (Revoluciones de motor)', color: 'slate' },
  { value: 'L/min', label: 'L/min (Caudal / Litros por minuto)', color: 'blue' },
  { value: 'Unidades', label: 'Unidades (Conteo / Cantidad)', color: 'slate' },
  { value: 'CUSTOM', label: '✏️ Otra Unidad Personalizada...', color: 'slate' },
];

export const DailyRoundsView: React.FC = () => {
  const { 
    rounds, 
    activeRound, 
    inProgressRounds,
    roundTemplate,
    addRoundTemplateItem,
    updateRoundTemplateItem,
    deleteRoundTemplateItem,
    resetRoundTemplateToDefault,
    clearAllRoundTemplate,
    refreshRoundTemplateFromCloud,
    refreshRoundsFromCloud,
    syncRoundsSilently,
    startNewRound, 
    updateActiveRoundCheckpoint, 
    updateActiveRoundMeasurementField,
    updateActiveRoundMeterReadings,
    addRoundAnomaly, 
    completeActiveRound, 
    cancelActiveRound, 
    deleteRound, 
    resumeRound,
    updateRound,
    settings,
    currentUser,
    users,
    isAdmin,
    canDeleteRecords,
    canEditSettings,
    canStartRounds,
    notify
  } = useMaintenance();

  const { isMobile, isPhone } = useDeviceDetection();

  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [newItemArea, setNewItemArea] = useState('Habitaciones - Extracciones');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemType, setNewItemType] = useState<'ok_nok' | 'options' | 'numeric' | 'boolean' | 'text'>('ok_nok');
  const [newItemPreset, setNewItemPreset] = useState('ok_obs_nok');
  const [newItemUnit, setNewItemUnit] = useState('°C');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [customUnitValue, setCustomUnitValue] = useState('');
  const [newItemMinValue, setNewItemMinValue] = useState<number | ''>('');
  const [newItemMaxValue, setNewItemMaxValue] = useState<number | ''>('');
  const [newItemOptions, setNewItemOptions] = useState('OK, En Observación, NO OK');
  const [newItemSuggestedNotes, setNewItemSuggestedNotes] = useState('');
  const [newItemNotesPreset, setNewItemNotesPreset] = useState('none');
  const [newItemInstructions, setNewItemInstructions] = useState('');
  const [newItemAllowNotes, setNewItemAllowNotes] = useState(true);
  const [newItemRequireNotesOnFailure, setNewItemRequireNotesOnFailure] = useState(false);
  const [newItemCategory, setNewItemCategory] = useState('extraccion');
  const [newItemCritical, setNewItemCritical] = useState(false);
  const [newItemPhotoMode, setNewItemPhotoMode] = useState<'none' | 'normal' | 'ai' | 'both'>('both');
  const [newItemPhotoRequired, setNewItemPhotoRequired] = useState(false);

  // Custom meters in active round
  const [showAddMeterModal, setShowAddMeterModal] = useState(false);
  const [newCustomMeterName, setNewCustomMeterName] = useState('');
  const [newCustomMeterUnit, setNewCustomMeterUnit] = useState('m³');
  const [newCustomMeterInitialValue, setNewCustomMeterInitialValue] = useState<number | ''>('');

  // Multi-measurement fields state
  const [newItemFields, setNewItemFields] = useState<FormMeasurementField[]>([
    { id: '1', name: '', unit: '°C', isCustomUnit: false, customUnitValue: '', minValue: '', maxValue: '' }
  ]);
  const [newItemIncludeStatus, setNewItemIncludeStatus] = useState(false);
  const [newItemStatusOptions, setNewItemStatusOptions] = useState('Encendido, Apagado, Alarmado');
  const [newItemButtonActions, setNewItemButtonActions] = useState<Record<string, { actionType?: string; color?: string }>>({});
  const [alarmToastMessage, setAlarmToastMessage] = useState<string | null>(null);

  const triggerAlarmAlert = (msg: string) => {
    setAlarmToastMessage(msg);
    setTimeout(() => {
      setAlarmToastMessage((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  const startEditingItem = (item: RoundCheckpoint) => {
    setEditingTemplateId(item.id);
    setNewItemArea(item.area || 'Habitaciones - Extracciones');
    setNewItemTitle(item.title || '');
    setNewItemType((item.type as any) || 'ok_nok');
    setNewItemButtonActions(item.buttonActions || {});
    setNewItemPhotoMode(item.photoMode ? item.photoMode : (item.allowPhoto === false ? 'none' : 'both'));
    setNewItemPhotoRequired(item.photoRequired ?? false);

    const standardUnits = ['°C', '°F', 'PSI', 'Bar', 'V', 'VDC', 'A', 'kWh', 'm³', '%', 'PPM', 'RPM', 'L/min', 'kW', 'FP', 'Unidades'];

    if (item.measurementFields && Array.isArray(item.measurementFields) && item.measurementFields.length > 0) {
      setNewItemFields(item.measurementFields.map((f, idx) => {
        const u = f.unit || '°C';
        const isCust = !standardUnits.includes(u);
        const hasBtns = !!f.includeButtons || (f.options && f.options.length > 0);
        return {
          id: f.id || `f-${idx}-${Date.now()}`,
          name: f.name || '',
          unit: isCust ? 'CUSTOM' : u,
          isCustomUnit: isCust,
          customUnitValue: isCust ? u : '',
          minValue: f.minValue !== undefined ? f.minValue : '',
          maxValue: f.maxValue !== undefined ? f.maxValue : '',
          includeButtons: hasBtns,
          options: f.options && f.options.length > 0 ? f.options.join(', ') : 'Encendido, Apagado',
          buttonActions: f.buttonActions || {}
        };
      }));
    } else if (item.unit) {
      const isCust = !standardUnits.includes(item.unit);
      setNewItemFields([{
        id: '1',
        name: '',
        unit: isCust ? 'CUSTOM' : item.unit,
        isCustomUnit: isCust,
        customUnitValue: isCust ? item.unit : '',
        minValue: item.minValue !== undefined ? item.minValue : '',
        maxValue: item.maxValue !== undefined ? item.maxValue : '',
        includeButtons: false,
        options: 'Encendido, Apagado',
        buttonActions: {}
      }]);
      setIsCustomUnit(isCust);
      setNewItemUnit(isCust ? 'CUSTOM' : item.unit);
      setCustomUnitValue(isCust ? item.unit : '');
    } else {
      setNewItemFields([{
        id: '1',
        name: '',
        unit: '°C',
        isCustomUnit: false,
        customUnitValue: '',
        minValue: item.minValue !== undefined ? item.minValue : '',
        maxValue: item.maxValue !== undefined ? item.maxValue : '',
        includeButtons: false,
        options: 'Encendido, Apagado',
        buttonActions: {}
      }]);
      setIsCustomUnit(false);
      setNewItemUnit('°C');
    }

    setNewItemIncludeStatus(!!item.includeStatusButtons || (item.type === 'numeric' && !!item.options && item.options.length > 0));
    setNewItemStatusOptions(item.options && item.options.length > 0 ? item.options.join(', ') : 'Encendido, Apagado, Alarmado');
    setNewItemButtonActions(item.buttonActions || {});

    setNewItemMinValue(item.minValue !== undefined ? item.minValue : '');
    setNewItemMaxValue(item.maxValue !== undefined ? item.maxValue : '');
    setNewItemOptions(item.options && item.options.length > 0 ? item.options.join(', ') : 'OK, En Observación, NO OK');
    const hasNotes = item.suggestedNotes && Array.isArray(item.suggestedNotes) && item.suggestedNotes.length > 0;
    setNewItemSuggestedNotes(hasNotes ? item.suggestedNotes!.join(', ') : '');
    setNewItemNotesPreset(hasNotes ? 'custom' : 'none');
    setNewItemInstructions(item.instructions || '');
    setNewItemAllowNotes(item.allowNotes !== undefined ? item.allowNotes : true);
    setNewItemRequireNotesOnFailure(item.requireNotesOnFailure ?? false);
    
    // Smart category resolution for existing items
    let resolvedCategory = item.category || 'extraccion';
    const normText = ((item.title || '') + ' ' + (item.category || '')).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (normText.includes('cava') || normText.includes('refrigera') || normText.includes('nevera') || normText.includes('congelad') || normText.includes('cuarto frio')) {
      resolvedCategory = 'refrigeracion';
    } else if (normText.includes('sauna') || normText.includes('cold plunge') || normText.includes('spa')) {
      resolvedCategory = 'sauna_cold_plunge';
    } else if (normText.includes('tanque') || normText.includes('cisterna')) {
      resolvedCategory = 'tanque';
    } else if (normText.includes('subestacion') || normText.includes('transformador')) {
      resolvedCategory = 'subestacion';
    } else if (normText.includes('combustible') || normText.includes('diesel') || normText.includes('acpm')) {
      resolvedCategory = 'combustible';
    }
    setNewItemCategory(resolvedCategory);
    setNewItemCritical(item.isCritical ?? false);
  };

  const cancelEditing = () => {
    setEditingTemplateId(null);
    setNewItemTitle('');
    setNewItemInstructions('');
    setNewItemSuggestedNotes('');
    setNewItemNotesPreset('none');
    setNewItemIncludeStatus(false);
    setNewItemStatusOptions('Encendido, Apagado, Alarmado');
    setNewItemButtonActions({});
    setNewItemPhotoMode('both');
    setNewItemPhotoRequired(false);
    setNewItemFields([{ id: '1', name: '', unit: '°C', isCustomUnit: false, customUnitValue: '', minValue: '', maxValue: '', includeButtons: false, options: 'Encendido, Apagado', buttonActions: {} }]);
  };

  const handleAddTemplateItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) {
      notify('⚠️ Por favor ingresa el nombre del equipo o punto de control.');
      return;
    }

    let resolvedFields: RoundMeasurementField[] | undefined = undefined;
    if (newItemType === 'numeric') {
      resolvedFields = newItemFields.map((f, idx) => {
        const finalUnit = f.isCustomUnit ? (f.customUnitValue.trim() || 'Unidad') : f.unit;
        let fieldOptions: string[] | undefined = undefined;
        if (f.includeButtons && f.options) {
          fieldOptions = f.options.split(',').map(s => s.trim()).filter(Boolean);
          if (fieldOptions.length === 0) {
            fieldOptions = ['Encendido', 'Apagado'];
          }
        }
        return {
          id: f.id || `fld-${idx + 1}-${Date.now()}`,
          name: f.name.trim() ? f.name.trim() : undefined,
          unit: finalUnit || '°C',
          minValue: f.minValue !== '' ? Number(f.minValue) : undefined,
          maxValue: f.maxValue !== '' ? Number(f.maxValue) : undefined,
          includeButtons: f.includeButtons ?? false,
          options: fieldOptions,
          buttonActions: f.includeButtons ? f.buttonActions : undefined,
          statusValue: fieldOptions && fieldOptions.length > 0 ? fieldOptions[0] : undefined,
          photoMode: newItemPhotoMode,
          allowPhoto: newItemPhotoMode !== 'none'
        };
      });
    }

    const firstField = resolvedFields && resolvedFields.length > 0 ? resolvedFields[0] : undefined;
    
    let resolvedOptions: string[] | undefined = undefined;
    if (newItemType === 'ok_nok' || newItemType === 'options') {
      resolvedOptions = newItemOptions.split(',').map(s => s.trim()).filter(Boolean);
      if (resolvedOptions.length === 0) {
        resolvedOptions = newItemType === 'ok_nok' ? ['OK', 'En Observación', 'NO OK'] : ['Operativo', 'En Falla'];
      }
    } else if (newItemType === 'numeric' && newItemIncludeStatus) {
      resolvedOptions = newItemStatusOptions.split(',').map(s => s.trim()).filter(Boolean);
      if (resolvedOptions.length === 0) {
        resolvedOptions = ['Encendido', 'Apagado', 'Alarmado'];
      }
    }

    const resolvedNotes = newItemSuggestedNotes.split(',').map(s => s.trim()).filter(Boolean);

    const itemData = {
      area: newItemArea,
      title: newItemTitle.trim(),
      type: newItemType,
      unit: newItemType === 'numeric' ? (firstField?.unit || '°C') : undefined,
      minValue: newItemType === 'numeric' ? firstField?.minValue : undefined,
      maxValue: newItemType === 'numeric' ? firstField?.maxValue : undefined,
      measurementFields: newItemType === 'numeric' ? resolvedFields : undefined,
      includeStatusButtons: newItemType === 'numeric' ? newItemIncludeStatus : undefined,
      options: resolvedOptions,
      suggestedNotes: resolvedNotes.length > 0 ? resolvedNotes : undefined,
      instructions: newItemInstructions.trim() ? newItemInstructions.trim() : undefined,
      allowNotes: newItemAllowNotes,
      requireNotesOnFailure: newItemRequireNotesOnFailure,
      category: newItemCategory,
      isCritical: newItemCritical,
      buttonActions: newItemButtonActions,
      photoMode: newItemPhotoMode,
      photoRequired: newItemPhotoRequired,
      allowPhoto: newItemPhotoMode !== 'none'
    };

    if (editingTemplateId) {
      updateRoundTemplateItem(editingTemplateId, itemData);
      setEditingTemplateId(null);
    } else {
      addRoundTemplateItem(itemData);
    }
    setNewItemTitle('');
    setNewItemInstructions('');
    setNewItemSuggestedNotes('');
    setNewItemNotesPreset('none');
    setNewItemIncludeStatus(false);
    setNewItemStatusOptions('Encendido, Apagado, Alarmado');
    setNewItemButtonActions({});
    setNewItemPhotoMode('both');
    setNewItemPhotoRequired(false);
    setNewItemFields([{ id: '1', name: '', unit: '°C', isCustomUnit: false, customUnitValue: '', minValue: '', maxValue: '' }]);
  };

  const getCurrentShift = (): RoundShift => {
    const hours = new Date().getHours();
    if (hours >= 6 && hours < 14) return 'manana';
    return 'tarde';
  };

  const [selectedShift, setSelectedShift] = useState<RoundShift>(getCurrentShift);

  // Detectar automáticamente el nombre del usuario activo que inicia la ronda
  const detectedTechnicianName = useMemo(() => {
    if (currentUser?.displayName && currentUser.displayName.trim() !== '') {
      return currentUser.displayName.trim();
    }
    if (currentUser?.email) {
      const matchingUser = users?.find(u => u.id === currentUser.id || u.email?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim());
      if (matchingUser?.displayName && matchingUser.displayName.trim() !== '') {
        return matchingUser.displayName.trim();
      }
      return currentUser.email.split('@')[0];
    }
    return 'Técnico de Turno';
  }, [currentUser, users]);

  const [isStartingRound, setIsStartingRound] = useState(false);
  const [isSubmittingRound, setIsSubmittingRound] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [isNetworkOnline, setIsNetworkOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);

  useEffect(() => {
    const handleOnline = () => {
      setIsNetworkOnline(true);
    };
    const handleOffline = () => {
      setIsNetworkOnline(false);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isStartingRound) {
      setSelectedShift(getCurrentShift());
    }
  }, [isStartingRound]);

  // Filter state for rounds history
  const [searchTerm, setSearchTerm] = useState('');
  const [filterShift, setFilterShift] = useState<string>('todos');
  const [selectedRoundDetail, setSelectedRoundDetail] = useState<DailyRound | null>(null);
  const [modalFilterTab, setModalFilterTab] = useState<'todos' | 'cargados' | 'pendientes' | 'novedades' | 'fotos'>('todos');

  // Derive live real-time version of selected round so any checkpoint updated by a colleague renders live!
  const liveSelectedRoundDetail = selectedRoundDetail 
    ? (rounds.find(r => r.id === selectedRoundDetail.id) || selectedRoundDetail) 
    : null;

  // Deletion modal states
  const [roundToDelete, setRoundToDelete] = useState<DailyRound | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDiscardActiveConfirm, setShowDiscardActiveConfirm] = useState(false);

  // Share and PDF export modal state
  const [roundToShare, setRoundToShare] = useState<DailyRound | null>(null);
  const [isJustCompletedShare, setIsJustCompletedShare] = useState(false);

  // Auto-cerrar modales de detalle o confirmación si la ronda fue eliminada desde otra pantalla conectada
  useEffect(() => {
    if (selectedRoundDetail && !rounds.some(r => r.id === selectedRoundDetail.id)) {
      setSelectedRoundDetail(null);
    }
    if (roundToDelete && !rounds.some(r => r.id === roundToDelete.id)) {
      setRoundToDelete(null);
    }
  }, [rounds, selectedRoundDetail, roundToDelete]);

  // Sincronizar inmediatamente en segundo plano al entrar a la sección de rondas sin parpadeos
  useEffect(() => {
    syncRoundsSilently();
  }, [syncRoundsSilently]);

  const handleConfirmDelete = async () => {
    if (!roundToDelete) return;
    const id = roundToDelete.id;
    if (selectedRoundDetail?.id === id) {
      setSelectedRoundDetail(null);
    }
    setRoundToDelete(null); // Close modal immediately
    try {
      deleteRound(id); // Run in background without awaiting so UI doesn't block
    } catch (e) {
      console.error(e);
    }
  };

  // Active round state for final submission
  const [meterReadings, setMeterReadings] = useState<DailyRound['meterReadings']>({
    waterCubicMeters: 48925,
    electricKwh: 341950,
    gasCubicMeters: 18215,
    poolPh: 7.35,
    poolChlorinePpm: 2.1,
    hotWaterSupplyTempC: 60.0,
    hotWaterReturnTempC: 53.5,
    mainWaterPressurePsi: 72,
  });
  const [generalNotes, setGeneralNotes] = useState('');
  const [signatureName, setSignatureName] = useState('');

  // Incomplete checkpoints modal and jump highlighting
  const [showIncompleteCheckpointsModal, setShowIncompleteCheckpointsModal] = useState(false);
  const [incompleteModalFilterArea, setIncompleteModalFilterArea] = useState<string>('todos');
  const [incompleteModalSearch, setIncompleteModalSearch] = useState<string>('');
  const [highlightedCheckpointId, setHighlightedCheckpointId] = useState<string | null>(null);

  const handleJumpToCheckpoint = (checkpointId: string) => {
    setShowIncompleteCheckpointsModal(false);
    setHighlightedCheckpointId(checkpointId);
    setTimeout(() => {
      const el = document.getElementById(`checkpoint-item-${checkpointId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        const firstInput = el.querySelector('input') as HTMLInputElement | null;
        if (firstInput) {
          firstInput.focus();
        }
      }
    }, 200);
    setTimeout(() => {
      setHighlightedCheckpointId(prev => prev === checkpointId ? null : prev);
    }, 4500);
  };

  // Meter OCR scanner state
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerConfig, setScannerConfig] = useState<{
    targetType: 'generalWater' | 'generalElectric' | 'generalGas' | 'customMeter' | 'checkpoint' | 'field';
    customMeterId?: string;
    checkpointId?: string;
    fieldIndex?: number;
    fieldId?: string;
    title: string;
    meterName: string;
    meterTypeHint: string;
    unit: string;
    initialValue?: number | string;
    initialPhotoMode?: 'ai' | 'normal';
    allowedPhotoMode?: 'ai' | 'normal' | 'both' | 'none';
  } | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [previewPhotoTitle, setPreviewPhotoTitle] = useState<string>('Evidencia Fotográfica de la Ronda');

  const isValidPhoto = (url?: string | null): boolean => {
    if (!url || typeof url !== 'string') return false;
    if (url.includes('cached_in_db')) return false;
    return url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/assets/') || url.startsWith('blob:');
  };

  const openPhotoPreview = (url?: string | null, title?: string) => {
    if (!isValidPhoto(url)) return;
    setPreviewPhotoUrl(url!);
    setPreviewPhotoTitle(title || 'Evidencia Fotográfica de la Ronda');
  };

  const getRoundTotalPhotos = (round: DailyRound): number => {
    if (!round) return 0;
    let count = 0;
    (round.checkpoints || []).forEach(c => {
      if (isValidPhoto(c.photoUrl)) count++;
      (c.measurementFields || []).forEach(f => {
        if (isValidPhoto(f.photoUrl)) count++;
      });
    });
    if (isValidPhoto(round.meterReadings?.waterMeterPhotoUrl)) count++;
    if (isValidPhoto(round.meterReadings?.electricMeterPhotoUrl)) count++;
    if (isValidPhoto(round.meterReadings?.gasMeterPhotoUrl)) count++;
    (round.anomalies || []).forEach(a => {
      if (isValidPhoto(a.photoUrl)) count++;
    });
    return count;
  };

  const openMeterScanner = (config: {
    targetType: 'generalWater' | 'generalElectric' | 'generalGas' | 'customMeter' | 'checkpoint' | 'field';
    customMeterId?: string;
    checkpointId?: string;
    fieldIndex?: number;
    fieldId?: string;
    title: string;
    meterName: string;
    meterTypeHint: string;
    unit: string;
    initialValue?: number | string;
    initialPhotoMode?: 'ai' | 'normal';
    allowedPhotoMode?: 'ai' | 'normal' | 'both' | 'none';
  }) => {
    setScannerConfig(config);
    setIsScannerOpen(true);
  };

  const handleApplyMeterReading = (result: MeterScanResult) => {
    if (!scannerConfig) return;

    if (scannerConfig.targetType === 'generalWater') {
      const updated = {
        waterCubicMeters: result.value,
        waterMeterPhotoUrl: result.photoUrl
      };
      setMeterReadings(p => ({ ...p, ...updated }));
      updateActiveRoundMeterReadings(updated);
    } else if (scannerConfig.targetType === 'generalElectric') {
      const updated = {
        electricKwh: result.value,
        electricMeterPhotoUrl: result.photoUrl
      };
      setMeterReadings(p => ({ ...p, ...updated }));
      updateActiveRoundMeterReadings(updated);
    } else if (scannerConfig.targetType === 'generalGas') {
      const updated = {
        gasCubicMeters: result.value,
        gasMeterPhotoUrl: result.photoUrl
      };
      setMeterReadings(p => ({ ...p, ...updated }));
      updateActiveRoundMeterReadings(updated);
    } else if (scannerConfig.targetType === 'customMeter' && scannerConfig.customMeterId) {
      const customId = scannerConfig.customMeterId;
      const current = { ...(meterReadings.customMeters || {}) };
      current[customId] = {
        ...(current[customId] || { id: customId, name: scannerConfig.meterName, unit: scannerConfig.unit }),
        value: result.value,
        photoUrl: result.photoUrl
      };
      const updated = { customMeters: current };
      setMeterReadings(p => ({ ...p, ...updated }));
      updateActiveRoundMeterReadings(updated);
    } else if (scannerConfig.targetType === 'checkpoint' && scannerConfig.checkpointId) {
      const chk = activeRound?.checkpoints.find(c => c.id === scannerConfig.checkpointId);
      if (chk) {
        let finalVal = chk.currentValue;
        if (chk.type === 'numeric') {
          finalVal = result.value;
        } else if (chk.type === 'text') {
          finalVal = result.rawText || (typeof chk.currentValue === 'string' && chk.currentValue ? chk.currentValue : 'Evidencia registrada');
        }
        const defaultNote = scannerConfig.initialPhotoMode === 'ai' ? '📸 Lectura tomada con foto IA' : '📸 Foto de evidencia adjunta';
        updateActiveRoundCheckpoint(
          chk.id,
          finalVal,
          chk.notes ? chk.notes : defaultNote,
          chk.measurementFields,
          chk.statusValue,
          chk.ampState || 'Encendido',
          true,
          result.photoUrl
        );
      }
    } else if (scannerConfig.targetType === 'field' && scannerConfig.checkpointId && scannerConfig.fieldIndex !== undefined) {
      const chk = activeRound?.checkpoints.find(c => c.id === scannerConfig.checkpointId);
      if (chk && chk.measurementFields) {
        const updatedFields = chk.measurementFields.map((f, idx) => {
          if (idx === scannerConfig.fieldIndex || f.id === scannerConfig.fieldId) {
            return {
              ...f,
              value: result.value,
              photoUrl: result.photoUrl
            };
          }
          return f;
        });
        updateActiveRoundCheckpoint(
          chk.id,
          chk.currentValue,
          chk.notes,
          updatedFields,
          chk.statusValue,
          chk.ampState || 'Encendido',
          true,
          result.photoUrl
        );
      }
    }
  };

  const handleAddCustomMeter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomMeterName.trim()) return;
    const customId = `meter-${Date.now()}`;
    const parsedVal = newCustomMeterInitialValue !== '' ? Number(newCustomMeterInitialValue) : 0;
    const updatedCustomMeters = {
      ...(meterReadings.customMeters || {}),
      [customId]: {
        id: customId,
        name: newCustomMeterName.trim(),
        unit: newCustomMeterUnit || 'm³',
        value: !isNaN(parsedVal) ? parsedVal : 0,
        photoUrl: ''
      }
    };
    const updated = { customMeters: updatedCustomMeters };
    setMeterReadings(p => ({ ...p, ...updated }));
    updateActiveRoundMeterReadings(updated);
    setNewCustomMeterName('');
    setNewCustomMeterUnit('m³');
    setNewCustomMeterInitialValue('');
    setShowAddMeterModal(false);
  };

  const handleRemoveCustomMeter = (customId: string) => {
    const updatedCustomMeters = { ...(meterReadings.customMeters || {}) };
    delete updatedCustomMeters[customId];
    const updated = { customMeters: updatedCustomMeters };
    setMeterReadings(p => ({ ...p, ...updated }));
    updateActiveRoundMeterReadings(updated);
  };

  // Sync meterReadings with activeRound when a new round is opened or resumed
  const syncedRoundIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (activeRound) {
      if (syncedRoundIdRef.current !== activeRound.id) {
        syncedRoundIdRef.current = activeRound.id;
        if (activeRound.meterReadings) {
          setMeterReadings(p => ({ ...p, ...activeRound.meterReadings }));
        }
        if (activeRound.generalNotes !== undefined) {
          setGeneralNotes(activeRound.generalNotes);
        }
        if (activeRound.technicianName && !signatureName) {
          setSignatureName(activeRound.technicianName);
        }
      }
    } else {
      syncedRoundIdRef.current = null;
    }
  }, [activeRound?.id]);

  // Anomaly reporting modal during round
  const [showAnomalyModal, setShowAnomalyModal] = useState(false);
  const [anomalyForm, setAnomalyForm] = useState<{
    area: string;
    title: string;
    description: string;
    severity: 'baja' | 'media' | 'alta' | 'urgente';
    photoUrl?: string;
  }>({
    area: 'Sótano 2 - Cuarto de Bombas',
    title: '',
    description: '',
    severity: 'media',
    photoUrl: '',
  });

  const anomalyCameraInputRef = useRef<HTMLInputElement | null>(null);
  const anomalyGalleryInputRef = useRef<HTMLInputElement | null>(null);

  const handleAnomalyPhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 1000;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.75);
          setAnomalyForm(prev => ({ ...prev, photoUrl: compressed }));
        } else {
          setAnomalyForm(prev => ({ ...prev, photoUrl: rawDataUrl }));
        }
      };
      img.onerror = () => {
        setAnomalyForm(prev => ({ ...prev, photoUrl: rawDataUrl }));
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    // Reset file input so user can retake if needed
    e.target.value = '';
  };

  const handleStartRound = () => {
    startNewRound(selectedShift, detectedTechnicianName);
    setIsStartingRound(false);
    setSignatureName(detectedTechnicianName);
  };

  // Incomplete checkpoints in active round
  const activeRoundIncompleteCheckpoints = useMemo(() => {
    return getIncompleteCheckpoints(activeRound?.checkpoints, roundTemplate);
  }, [activeRound?.checkpoints, roundTemplate]);

  const handleFinishRound = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeRound) return;

    const templateLength = roundTemplate?.length || 0;
    const incompleteCheckpoints = getIncompleteCheckpoints(activeRound.checkpoints, roundTemplate);
    const totalPoints = activeRound.checkpoints?.length || 0;
    const filledCount = (activeRound.checkpoints || []).filter(c => isCheckpointComplete(c, roundTemplate)).length;
    const is100Strict = templateLength > 0
      ? (totalPoints >= templateLength && incompleteCheckpoints.length === 0 && filledCount >= templateLength)
      : (totalPoints > 0 && incompleteCheckpoints.length === 0 && filledCount === totalPoints);

    if (!is100Strict || (activeRound.compliancePercentage !== undefined && activeRound.compliancePercentage < 100)) {
      setShowIncompleteCheckpointsModal(true);
      notify(`⚠️ Bloqueo de seguridad: La ronda está al ${activeRound.compliancePercentage || 0}%. Debes registrar el 100% de los puntos obligatorios (${incompleteCheckpoints.length} pendientes) para poder finalizar y cerrar la ronda.`);
      return;
    }

    // VERIFICACIÓN ESTRICTA DE INTERNET O WI-FI:
    // La ronda solo puede cargarse y cerrarse con internet. Si no hay señal, NO se puede cargar ni cerrar, y no se borran datos.
    setIsSubmittingRound(true);
    const isRealOnline = navigator.onLine && (await checkRealInternetConnection());
    if (!isRealOnline) {
      setIsSubmittingRound(false);
      setShowOfflineModal(true);
      notify('⚠️ Sin conexión a Internet: No es posible cargar la ronda en el sistema. Por favor busca señal Wi-Fi o datos móviles para cerrar la ronda.');
      return;
    }

    const finalSignature = (signatureName && signatureName.trim()) || activeRound.technicianName || currentUser?.displayName || 'Técnico';
    if (!finalSignature.trim()) {
      setIsSubmittingRound(false);
      notify('⚠️ Por favor ingresa el nombre del técnico firmante para validar la ronda.');
      const sigEl = document.getElementById('signature-name-input') as HTMLInputElement | null;
      if (sigEl) {
        sigEl.focus();
        sigEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    try {
      await completeActiveRound(meterReadings, generalNotes, finalSignature, false);
      setShowOfflineModal(false);
    } catch (err) {
      console.error('Error saving round to cloud:', err);
      setShowOfflineModal(true);
      notify('⚠️ Inconveniente de conexión al cargar en el sistema. Por favor verifica tu acceso a Internet e intenta de nuevo. Tu ronda y datos siguen 100% intactos.');
    } finally {
      setIsSubmittingRound(false);
    }
  };

  const handleAddAnomalySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!anomalyForm.title.trim() || !anomalyForm.description.trim()) {
      notify('⚠️ Por favor completa el título y la descripción del inconveniente detectado.');
      return;
    }
    addRoundAnomaly({
      area: anomalyForm.area,
      title: anomalyForm.title,
      description: anomalyForm.description,
      severity: anomalyForm.severity,
      status: 'pendiente',
      registeredBy: activeRound?.technicianName || detectedTechnicianName,
      photoUrl: anomalyForm.photoUrl || undefined,
    });
    setAnomalyForm({
      area: 'Sótano 2 - Cuarto de Bombas',
      title: '',
      description: '',
      severity: 'media',
      photoUrl: '',
    });
    setShowAnomalyModal(false);
  };

  // Helper to verify if a round is genuinely completed at 100% (Unified 1:1 parity with KPI dashboard & system records)
  const isRoundTruly100 = useCallback((r: DailyRound): boolean => {
    if (!r) return false;
    if (r.status === 'completada' || Boolean(r.completedAt && r.technicianSignature) || r.compliancePercentage === 100) return true;
    const chks = r.checkpoints || [];
    if (chks.length === 0) return false;
    const filledCount = chks.filter(c => isCheckpointComplete(c, roundTemplate)).length;
    return filledCount >= chks.length;
  }, [roundTemplate]);

  // Filtered rounds list (memoized to prevent expensive re-filtering while typing in checkpoints) - strictly completed history rounds (100% compliance)
  const filteredRounds = useMemo(() => {
    const getRoundSortTime = (r: DailyRound): number => {
      const dateStr = (r.date || '').replace(/\//g, '-').trim();
      const [hRaw, mRaw] = (r.time || '00:00').trim().split(':');
      let h = parseInt(hRaw || '0', 10) || 0;
      const m = parseInt(mRaw || '0', 10) || 0;
      if ((r.shift === 'tarde' || r.shift === 'noche') && h < 12) h += 12;
      if (dateStr) {
        const t = new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      return new Date(r.completedAt || r.lastUpdated || 0).getTime() || 0;
    };

    return (rounds || [])
      .filter(r => {
        if (!r) return false;
        // En el historial oficial de rondas realizadas se muestran las rondas cerradas al 100%
        if (!isRoundTruly100(r)) {
          return false;
        }
        const matchesSearch = (r.technicianName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                              (r.date || '').includes(searchTerm) ||
                              (r.generalNotes || '').toLowerCase().includes(searchTerm.toLowerCase());
        const matchesShift = filterShift === 'todos' || r.shift === filterShift;
        return matchesSearch && matchesShift;
      })
      .sort((a, b) => getRoundSortTime(b) - getRoundSortTime(a));
  }, [rounds, searchTerm, filterShift, isRoundTruly100]);

  // Rondas en progreso o que quedaron incompletas pendientes de cargar al 100%
  const pendingIncompleteRounds = useMemo(() => {
    return (rounds || []).filter(r => {
      if (!r || !r.id) return false;
      if (r.id === activeRound?.id) return false;
      if (r.status === 'completada' || Boolean(r.completedAt && r.technicianSignature)) return false;
      return r.status === 'incompleta' || r.status === 'en_progreso';
    });
  }, [rounds, activeRound?.id]);

  // Other technicians' rounds currently in progress (synced in real time across devices)
  const isMyRound = useMemo(() => {
    return isUserOwnRound(activeRound, currentUser);
  }, [activeRound, currentUser]);

  const isCompletedRound = useMemo(() => {
    if (!activeRound) return false;
    return activeRound.status === 'completada' && Boolean(activeRound.completedAt && activeRound.technicianSignature);
  }, [activeRound]);

  // Si la ronda está en curso en este dispositivo, NUNCA sacarlo de la pantalla de la ronda (incluso si entra al ascensor, cambia de red o pierde señal temporalmente)
  const canShowActiveRound = Boolean(activeRound && activeRound.status === 'en_progreso' && !isCompletedRound);

  // Group active round checkpoints by area (memoized for instantaneous UI rendering)
  const checkpointsByArea = useMemo(() => {
    return canShowActiveRound && activeRound && Array.isArray(activeRound.checkpoints) ? activeRound.checkpoints.reduce((acc, chk) => {
      if (!chk) return acc;
      if (!acc[chk.area]) acc[chk.area] = [];
      acc[chk.area].push(chk);
      return acc;
    }, {} as Record<string, RoundCheckpoint[]>) : {};
  }, [activeRound?.checkpoints, canShowActiveRound]);

  // Unique areas from template
  const uniqueTemplateAreas = useMemo(() => {
    return Array.from(new Set((roundTemplate || []).map(item => item.area).filter(Boolean))).sort();
  }, [roundTemplate]);

  return (
    <div className="space-y-6">
      
      {/* Top Section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Clock className="w-5 h-5 text-blue-600" />
            <span>Rondas Diarias de Mantenimiento</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Recorridos programados por cuartos de máquinas, piscinas, calderas e infraestructura hotelera
          </p>
        </div>

        {!canShowActiveRound && (
          <div className="flex items-center space-x-2 flex-wrap gap-2">
            {canEditSettings && (
              <button
                onClick={() => setShowTemplateModal(true)}
                className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl shadow-xs transition-colors"
              >
                <Wrench className="w-4 h-4 text-blue-600" />
                <span>Configurar Equipos y Rondas</span>
              </button>
            )}
            {canStartRounds && (
              <button
                id="btn-start-round-dialog"
                onClick={() => setIsStartingRound(true)}
                className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Iniciar Nueva Ronda</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* BANNER DE RONDA EN CURSO POR COMPAÑERO (Visible para todos los usuarios en tiempo real) */}
      {!canShowActiveRound && inProgressRounds && inProgressRounds.length > 0 && (
        <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-4 sm:p-5 text-white border-2 border-blue-500/40 shadow-lg">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                <span className="w-3 h-3 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black uppercase tracking-wider text-blue-300">Ronda Técnica en Curso</span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                    En Vivo
                  </span>
                </div>
                <h4 className="text-sm font-black text-white mt-0.5">
                  {inProgressRounds[0].technicianName} • Turno {formatShiftName(inProgressRounds[0].shift)}
                </h4>
                <p className="text-xs text-slate-300 mt-0.5">
                  Avance actual: <strong className="text-emerald-400">{inProgressRounds[0].compliancePercentage || 0}% de 100%</strong> ({inProgressRounds[0].checkpoints ? inProgressRounds[0].checkpoints.filter(c => isCheckpointComplete(c, roundTemplate)).length : 0} puntos registrados)
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setSelectedRoundDetail(inProgressRounds[0])}
                className="flex-1 sm:flex-none px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Ver Avance en Tiempo Real</span>
              </button>
              <button
                type="button"
                onClick={() => setRoundToDelete(inProgressRounds[0])}
                className="px-3.5 py-2 bg-rose-600/90 hover:bg-rose-600 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center justify-center space-x-1.5 cursor-pointer border border-rose-400/30"
                title="Descartar esta ronda en curso"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Descartar Ronda</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ACTIVE ROUND INTERFACE (When a round is running and belongs to this user) */}
      {canShowActiveRound && activeRound && (
        <div className="bg-white rounded-2xl border-2 border-blue-500 shadow-md p-6 relative">
          {alarmToastMessage && (
            <div className="mb-4 p-3 bg-rose-600 text-white rounded-xl shadow-md flex items-center justify-between animate-bounce">
              <div className="flex items-center space-x-2 text-xs sm:text-sm font-bold">
                <AlertTriangle className="w-5 h-5 shrink-0 text-white" />
                <span>{alarmToastMessage}</span>
              </div>
              <button 
                type="button" 
                onClick={() => setAlarmToastMessage(null)} 
                className="p-1 hover:bg-rose-700 rounded-lg text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          {!isNetworkOnline && (
            <div className="mb-4 p-3.5 bg-amber-500/10 border-2 border-amber-500/40 rounded-xl flex items-start sm:items-center space-x-3 text-amber-900 text-xs shadow-xs">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-700 flex items-center justify-center shrink-0">
                <WifiOff className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-extrabold flex items-center gap-1.5 flex-wrap">
                  <span>Modo Sin Conexión / Ascensor (Señal no disponible)</span>
                  <span className="px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                    Guardado Local Seguro
                  </span>
                </div>
                <p className="text-amber-800 mt-0.5 leading-relaxed">
                  Puedes continuar llenando todos los puntos, cifras y observaciones con total tranquilidad. Tus datos se guardan al instante en tu equipo. Cuando termines, el sistema solicitará conexión a Internet para cargar la ronda al 100% en el servidor.
                </p>
              </div>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div className="flex items-center space-x-3">
              <span className="flex h-3 w-3 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Ronda en Curso: Turno {formatShiftName(activeRound.shift, true)}
                </h3>
                <p className="text-xs text-slate-500">
                  Técnico responsable: <span className="font-semibold text-slate-800">{activeRound.technicianName}</span> • Fecha: {activeRound.date} a las {activeRound.time}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-600">Cumplimiento:</span>
                <span className="text-sm font-extrabold text-blue-600 ml-1.5">{activeRound.compliancePercentage}%</span>
              </div>
              {activeRoundIncompleteCheckpoints.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowIncompleteCheckpointsModal(true)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl border border-amber-600 transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs active:scale-95"
                  title="Ver los puntos pendientes por registrar"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-slate-950 animate-pulse" />
                  <span>{activeRoundIncompleteCheckpoints.length} pendiente{activeRoundIncompleteCheckpoints.length > 1 ? 's' : ''}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => downloadRoundPdf(activeRound, settings?.hotelInfo)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-300 transition-colors flex items-center space-x-1 cursor-pointer shadow-2xs"
                title="Descargar reporte PDF oficial con estado de alarmas y rangos"
              >
                <FileDown className="w-3.5 h-3.5 text-rose-600" />
                <span>Descargar PDF</span>
              </button>
              <button
                onClick={() => setShowAnomalyModal(true)}
                className="px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold rounded-xl border border-amber-300 transition-colors flex items-center space-x-1"
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>+ Reportar Incidencia</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowDiscardActiveConfirm(true);
                }}
                className="px-3 py-1.5 text-xs text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl border border-rose-200 font-semibold transition-colors flex items-center space-x-1 cursor-pointer"
                title="Descartar y cancelar este recorrido"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Descartar Ronda</span>
              </button>
            </div>
          </div>

          {/* Anomalies recorded in this active round */}
          {(activeRound.anomalies || []).length > 0 && (
            <div className="my-4 p-3.5 rounded-xl bg-amber-50/80 border border-amber-200">
              <h4 className="text-xs font-bold text-amber-900 flex items-center space-x-1.5 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Incidencias registradas en este recorrido ({(activeRound.anomalies || []).length})</span>
              </h4>
              <div className="space-y-2">
                {(activeRound.anomalies || []).map(anom => (
                  <div key={anom.id} className="bg-white p-2.5 rounded-lg border border-amber-200 text-xs flex items-center justify-between gap-3">
                    <div className="flex items-start space-x-2.5 min-w-0 flex-1">
                      {anom.photoUrl && (
                        <div 
                          className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 border border-amber-300 shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                          onClick={() => openPhotoPreview(anom.photoUrl, `Incidencia: ${anom.title} (${anom.area})`)}
                          title="Clic para ver foto"
                        >
                          <img src={anom.photoUrl} alt="Foto anomalía" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-slate-800">{anom.title}</span>
                          <span className="text-slate-500 text-[11px]">({anom.area})</span>
                        </div>
                        <p className="text-slate-600 text-[11px] mt-0.5">{anom.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      {anom.photoUrl && (
                        <button
                          type="button"
                          onClick={() => openPhotoPreview(anom.photoUrl, `Incidencia: ${anom.title} (${anom.area})`)}
                          className="p-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                          title="Ver foto de la anomalía"
                        >
                          <Camera className="w-3.5 h-3.5 text-emerald-700" />
                          <span>Foto</span>
                        </button>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 uppercase">
                        {anom.severity}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Checkpoints organized by technical zones */}
          <div className="space-y-6 mt-6">
            {(Object.entries(checkpointsByArea) as [string, RoundCheckpoint[]][]).map(([areaName, items]) => (
              <div key={areaName} className="rounded-2xl border-2 border-slate-300 bg-slate-100/80 shadow-xs overflow-hidden">
                {/* Zona Header - High-contrast distinct banner */}
                <div className="bg-slate-900 text-white px-4 sm:px-5 py-3.5 flex items-center justify-between border-b-2 border-slate-800">
                  <div className="flex items-center space-x-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
                    <span className="text-xs sm:text-sm font-extrabold uppercase tracking-wide flex items-center space-x-1.5 text-white">
                      <span>📍 ZONA:</span>
                      <span className="text-blue-300 font-black">{areaName}</span>
                    </span>
                  </div>
                  <span className="text-[11px] font-bold bg-slate-800 text-slate-200 px-3 py-1 rounded-full border border-slate-700 shadow-2xs">
                    {items.length} {items.length === 1 ? 'punto de inspección' : 'puntos de inspección'}
                  </span>
                </div>

                {/* List of checkpoint cards with dark, clear borders and spacing */}
                <div className="p-3 sm:p-4.5 space-y-3.5">
                  {items.map((chk, itemIdx) => {
                    const currentButtonAction = chk.statusValue 
                      ? getCheckpointButtonAction(chk, chk.statusValue, roundTemplate) 
                      : 'default';
                    const isOff = currentButtonAction === 'turn_off';
                    const parsedCurrentVal = typeof chk.currentValue === 'number' 
                      ? chk.currentValue 
                      : parseFloat(String(chk.currentValue || '').replace(',', '.'));
                    const isOutOfRange = !isOff &&
                      chk.type === 'numeric' &&
                      !isNaN(parsedCurrentVal) &&
                      chk.currentValue !== '' && chk.currentValue !== undefined &&
                      ((chk.minValue !== undefined && parsedCurrentVal < chk.minValue) ||
                       (chk.maxValue !== undefined && parsedCurrentVal > chk.maxValue));

                    const alarmCheck = isCheckpointAlarmActive(chk, roundTemplate);
                    const isAlarm = alarmCheck.isAlarm || isOutOfRange;

                    const isHighlighted = highlightedCheckpointId === chk.id;

                    return (
                      <div 
                        key={chk.id} 
                        id={`checkpoint-item-${chk.id}`}
                        className={`rounded-xl border-2 overflow-hidden transition-all duration-300 ${
                          isHighlighted
                            ? 'border-amber-500 ring-4 ring-amber-400/80 ring-offset-2 bg-amber-50/40 shadow-xl'
                            : isAlarm 
                              ? 'border-rose-500 bg-rose-50/40 shadow-sm ring-2 ring-rose-300' 
                              : 'bg-white border-slate-300 hover:border-blue-500/80 shadow-xs'
                        }`}
                      >
                        {/* Checkpoint Header and Main Controls */}
                        <div className="p-4 sm:p-4.5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                          <div className="flex items-start space-x-3 flex-1 min-w-0">
                            <span className="w-6 h-6 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 shadow-2xs">
                              {itemIdx + 1}
                            </span>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border ${
                              isAlarm ? 'bg-rose-100 border-rose-300 text-rose-700' : 'bg-slate-100 border-slate-200 text-slate-700'
                            }`}>
                              {getRoundItemIcon(chk.title, chk.category)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                                <span className="text-sm font-extrabold text-slate-900">{chk.title}</span>
                                {isAlarm && (
                                  <span className="text-[10px] bg-rose-600 text-white border border-rose-700 px-2 py-0.5 rounded-md font-extrabold flex items-center space-x-1 shadow-2xs animate-pulse">
                                    <AlertTriangle className="w-3 h-3 mr-0.5 shrink-0" />
                                    <span>¡ALARMA DETECTADA!</span>
                                  </span>
                                )}
                                {chk.isCritical && (
                                  <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-md font-bold">
                                    ⚠️ Crítico
                                  </span>
                                )}
                                {chk.category && (
                                  <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded-md border border-slate-200 capitalize">
                                    {chk.category}
                                  </span>
                                )}
                                {chk.equipmentRef && (
                                  <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-md font-mono font-bold">
                                    TAG: {chk.equipmentRef}
                                  </span>
                                )}
                                {isCheckpointComplete(chk, roundTemplate) ? (
                                  <span className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>OK ✓</span>
                                  </span>
                                ) : (
                                  <span className="text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-md font-bold flex items-center gap-0.5">
                                    <Clock className="w-3 h-3 text-amber-600" />
                                    <span>Cifra pendiente</span>
                                  </span>
                                )}
                              </div>
                              {chk.instructions && (
                                <p className="text-[11px] text-blue-800 bg-blue-50 border border-blue-200 rounded-lg px-2.5 py-1 mt-1.5 inline-flex items-center font-medium">
                                  <Info className="w-3.5 h-3.5 mr-1.5 text-blue-600 shrink-0" />
                                  <span>{chk.instructions}</span>
                                </p>
                              )}
                              {isAlarm && alarmCheck.reason && (
                                <p className="text-[11px] text-rose-900 bg-rose-100/90 border border-rose-300 rounded-lg px-2.5 py-1 mt-1.5 flex items-center font-bold">
                                  <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-rose-600 shrink-0" />
                                  <span>{alarmCheck.reason}</span>
                                </p>
                              )}
                              {chk.measurementFields && chk.measurementFields.length > 0 ? (
                                <div className="flex flex-wrap gap-1.5 mt-2">
                                  {chk.measurementFields.map((f, i) => (
                                    f.minValue !== undefined && f.maxValue !== undefined ? (
                                      <span key={i} className="text-[11px] text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded-lg border border-slate-300 font-medium">
                                        {f.name ? `${f.name}: ` : `Medición ${i+1}: `}
                                        <strong className="text-slate-900 font-bold ml-1">{f.minValue} a {f.maxValue} {f.unit || '°C'}</strong>
                                      </span>
                                    ) : null
                                  ))}
                                </div>
                              ) : chk.minValue !== undefined && chk.maxValue !== undefined && (
                                <p className="text-[11px] text-slate-600 mt-1.5 font-medium">
                                  Rango seguro: <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{chk.minValue} a {chk.maxValue} {chk.unit}</span>
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Input Control */}
                          <div className="flex flex-col items-stretch sm:items-end w-full lg:w-auto shrink-0 space-y-2">
                             {(chk.type === 'ok_nok' || chk.type === 'options') ? (
                              <div className="flex flex-wrap items-center gap-1.5 justify-start sm:justify-end w-full sm:w-auto max-w-full">
                                {(chk.options && chk.options.length > 0 ? chk.options : ['OK', 'En Observación', 'NO OK']).map(opt => {
                                  const isSelected = chk.currentValue === opt || chk.statusValue === opt;
                                  const actionType = getCheckpointButtonAction(chk, opt, roundTemplate);
                                  const isOffBtn = actionType === 'turn_off';
                                  const isEncBtn = actionType === 'turn_on';
                                  const isFailBtn = actionType === 'failure';
                                  const actionCfg = chk.buttonActions?.[opt];
                                  const buttonStyle = getButtonColorClass(opt, isSelected, actionCfg?.color);

                                  return (
                                    <button
                                      key={opt}
                                      type="button"
                                      onClick={() => {
                                        const newAmpState = isOffBtn ? 'Apagado' : (isEncBtn ? 'Encendido' : (chk.ampState || 'Encendido'));
                                        const updatedFields = chk.measurementFields ? chk.measurementFields.map(f => {
                                          const currentVal = typeof f.value === 'number' ? f.value : parseFloat(f.value as any);
                                          const prevNonZero = f.lastNonZeroValue || (!isNaN(currentVal) && currentVal > 0 ? currentVal : (f.minValue ?? 0));
                                          return {
                                            ...f,
                                            value: isOffBtn ? 0 : (isEncBtn && (f.value === 0 || f.value === undefined) ? prevNonZero : (f.value ?? prevNonZero)),
                                            ampState: newAmpState,
                                            lastNonZeroValue: prevNonZero
                                          };
                                        }) : undefined;
                                        updateActiveRoundCheckpoint(chk.id, opt, chk.notes, updatedFields, opt, newAmpState, true);
                                        if (isFailBtn) {
                                          triggerAlarmAlert(`🚨 ¡Alarma activada en ${chk.title}: "${opt}"!`);
                                        }
                                      }}
                                      className={`py-1.5 px-2.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all shadow-2xs flex items-center justify-center space-x-1 border cursor-pointer shrink-0 ${buttonStyle}`}
                                    >
                                      {isSelected && <span>✓</span>}
                                      <span className="truncate">{opt}</span>
                                    </button>
                                  );
                                })}

                                {/* Photo options for ok_nok / options if enabled */}
                                {chk.photoMode && chk.photoMode !== 'none' && (
                                  <div className="flex items-center space-x-1 shrink-0">
                                    {(chk.photoMode === 'ai' || chk.photoMode === 'both') && (
                                      <button
                                        type="button"
                                        onClick={() => openMeterScanner({
                                          targetType: 'checkpoint',
                                          checkpointId: chk.id,
                                          title: `Foto IA: ${chk.title}`,
                                          meterName: chk.title,
                                          meterTypeHint: `${chk.title} (${chk.area})`,
                                          unit: '',
                                          initialValue: '',
                                          initialPhotoMode: 'ai',
                                          allowedPhotoMode: chk.photoMode
                                        })}
                                        className="px-2 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors shadow-2xs flex items-center space-x-1 text-[11px] font-bold cursor-pointer"
                                        title="Tomar foto con IA"
                                      >
                                        <Camera className="w-3.5 h-3.5 text-purple-600" />
                                        <span>Foto IA</span>
                                      </button>
                                    )}
                                    {(chk.photoMode === 'normal' || chk.photoMode === 'both') && (
                                      <button
                                        type="button"
                                        onClick={() => openMeterScanner({
                                          targetType: 'checkpoint',
                                          checkpointId: chk.id,
                                          title: `Foto Evidencia: ${chk.title}`,
                                          meterName: chk.title,
                                          meterTypeHint: `${chk.title} (${chk.area})`,
                                          unit: '',
                                          initialValue: '',
                                          initialPhotoMode: 'normal',
                                          allowedPhotoMode: chk.photoMode
                                        })}
                                        className="px-2 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors shadow-2xs flex items-center space-x-1 text-[11px] font-bold cursor-pointer"
                                        title="Tomar foto de evidencia normal"
                                      >
                                        <Camera className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Foto</span>
                                      </button>
                                    )}
                                  </div>
                                )}

                                {chk.photoUrl && (
                                  <button
                                    type="button"
                                    onClick={() => openPhotoPreview(chk.photoUrl, `${chk.title} (${chk.area})`)}
                                    className="px-2 py-1 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs shrink-0"
                                    title="Ver foto capturada"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Foto ✓</span>
                                  </button>
                                )}
                              </div>
                            ) : chk.type === 'numeric' ? (
                              <div className="flex flex-col space-y-3 w-full">
                                {/* Multiple or Single Measurement Fields */}
                                {chk.measurementFields && chk.measurementFields.length > 0 ? (
                                  <div className="flex flex-col gap-3 w-full">
                                    {chk.measurementFields.map((field, fIdx) => {
                                      const hasFieldButtons = field.options && Array.isArray(field.options) && field.options.length > 0;
                                      const fieldButtonAction = field.statusValue 
                                        ? getFieldButtonAction(field, field.statusValue, chk, roundTemplate, fIdx)
                                        : 'default';
                                      const isThisFieldOff = hasFieldButtons
                                        ? (fieldButtonAction === 'turn_off')
                                        : isOff;

                                      const parsedFieldVal = typeof field.value === 'number' 
                                        ? field.value 
                                        : parseFloat(String(field.value || '').replace(',', '.'));
                                      const fieldOutOfRange = !isThisFieldOff && !isNaN(parsedFieldVal) && field.value !== '' && field.value !== undefined &&
                                        ((field.minValue !== undefined && parsedFieldVal < field.minValue) ||
                                         (field.maxValue !== undefined && parsedFieldVal > field.maxValue));
                                      const fieldAlarm = !isThisFieldOff && (fieldButtonAction === 'failure' || fieldOutOfRange);
                                      const effectivePhotoMode = field.photoMode || chk.photoMode || (chk.allowPhoto ? 'normal' : 'none');
                                      const allowFieldPhoto = effectivePhotoMode !== 'none';
                                      
                                      return (
                                        <div key={field.id || fIdx} className={`flex flex-col p-2.5 rounded-xl border-2 transition-all ${
                                          isThisFieldOff 
                                            ? 'bg-slate-100/90 border-slate-300' 
                                            : fieldAlarm 
                                              ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-300' 
                                              : 'bg-slate-50 border-slate-300'
                                        }`}>
                                          <div className="flex flex-wrap items-center justify-between gap-2">
                                            {field.name && (
                                              <span className="text-xs font-bold text-slate-800 break-words">
                                                {field.name}:
                                              </span>
                                            )}
                                            <div className="flex flex-wrap items-center gap-1.5 justify-end">
                                              <DecimalInput
                                                disabled={isThisFieldOff}
                                                placeholder="0.0"
                                                value={isThisFieldOff ? '0' : (field.value !== undefined && field.value !== null ? String(field.value) : '')}
                                                onChange={(val) => {
                                                  updateActiveRoundMeasurementField(chk.id, fIdx, val, undefined, field.statusValue, false);
                                                }}
                                                onBlur={(val) => {
                                                  updateActiveRoundMeasurementField(chk.id, fIdx, val, undefined, field.statusValue, true);
                                                }}
                                                className={`w-24 px-2.5 py-1.5 rounded-lg border-2 text-sm font-bold text-center transition-all ${
                                                  isThisFieldOff 
                                                    ? 'bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed select-none shadow-inner' 
                                                    : fieldAlarm
                                                      ? 'border-rose-500 bg-white text-rose-900 focus:ring-2 focus:ring-rose-500'
                                                      : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500'
                                                }`}
                                              />
                                              <span className="text-xs font-bold text-slate-700 min-w-[28px]">{field.unit || '°C'}</span>

                                              {/* Photo buttons based on photoMode */}
                                              {!isThisFieldOff && allowFieldPhoto && (
                                                <div className="flex items-center space-x-1">
                                                  {(effectivePhotoMode === 'ai' || effectivePhotoMode === 'both') && (
                                                    <button
                                                      type="button"
                                                      onClick={() => openMeterScanner({
                                                        targetType: 'field',
                                                        checkpointId: chk.id,
                                                        fieldIndex: fIdx,
                                                        fieldId: field.id,
                                                        title: `Lectura IA: ${field.name || chk.title}`,
                                                        meterName: `${chk.title} - ${field.name || 'Medición'}`,
                                                        meterTypeHint: `${chk.title} (${field.name || ''})`,
                                                        unit: field.unit || '',
                                                        initialValue: field.value,
                                                        initialPhotoMode: 'ai',
                                                        allowedPhotoMode: effectivePhotoMode
                                                      })}
                                                      className="p-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors shadow-2xs flex items-center space-x-1 text-[11px] font-semibold cursor-pointer"
                                                      title="Tomar foto / Reconocer dígitos con IA"
                                                    >
                                                      <Camera className="w-3.5 h-3.5 text-purple-600" />
                                                      <span className="hidden sm:inline">Foto IA</span>
                                                    </button>
                                                  )}
                                                  {(effectivePhotoMode === 'normal' || effectivePhotoMode === 'both') && (
                                                    <button
                                                      type="button"
                                                      onClick={() => openMeterScanner({
                                                        targetType: 'field',
                                                        checkpointId: chk.id,
                                                        fieldIndex: fIdx,
                                                        fieldId: field.id,
                                                        title: `Foto Evidencia: ${field.name || chk.title}`,
                                                        meterName: `${chk.title} - ${field.name || 'Medición'}`,
                                                        meterTypeHint: `${chk.title} (${field.name || ''})`,
                                                        unit: field.unit || '',
                                                        initialValue: field.value,
                                                        initialPhotoMode: 'normal',
                                                        allowedPhotoMode: effectivePhotoMode
                                                      })}
                                                      className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors shadow-2xs flex items-center space-x-1 text-[11px] font-semibold cursor-pointer"
                                                      title="Tomar foto de evidencia normal"
                                                    >
                                                      <Camera className="w-3.5 h-3.5 text-emerald-600" />
                                                      <span className="hidden sm:inline">Foto</span>
                                                    </button>
                                                  )}
                                                </div>
                                              )}

                                              {field.photoUrl && (
                                                <button
                                                  type="button"
                                                  onClick={() => openPhotoPreview(field.photoUrl, `${chk.title} — ${field.name || 'Medición'} (${chk.area})`)}
                                                  className="px-1.5 py-1 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 text-[10px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                                                  title="Ver foto capturada del contador"
                                                >
                                                  <ImageIcon className="w-3 h-3 text-emerald-700" />
                                                  <span>Foto ✓</span>
                                                </button>
                                              )}
                                            </div>
                                            {isThisFieldOff ? (
                                              <span className="text-[10px] font-bold text-slate-600 bg-slate-200 border border-slate-300 px-2 py-0.5 rounded-md flex items-center space-x-1">
                                                <Lock className="w-3 h-3 text-slate-500" />
                                                <span>Apagado</span>
                                              </span>
                                            ) : fieldAlarm ? (
                                              <span className="text-[10px] font-extrabold text-white bg-rose-600 px-2 py-0.5 rounded-md shadow-xs animate-pulse">
                                                ¡ALARMA!
                                              </span>
                                            ) : null}
                                          </div>

                                          {/* Individual Field Status Buttons */}
                                          {hasFieldButtons && (
                                            <div className="flex flex-wrap gap-1 mt-2 pt-1.5 border-t border-slate-200/80 w-full justify-start sm:justify-end">
                                              {field.options!.map(opt => {
                                                const isSelected = field.statusValue === opt;
                                                const optAction = getFieldButtonAction(field, opt, chk, roundTemplate, fIdx);
                                                const isOffBtn = optAction === 'turn_off';
                                                const isEncBtn = optAction === 'turn_on';
                                                const isFailBtn = optAction === 'failure';
                                                const actionCfg = field.buttonActions?.[opt];
                                                const buttonStyle = getButtonColorClass(opt, isSelected, actionCfg?.color);

                                                return (
                                                  <button
                                                    key={opt}
                                                    type="button"
                                                    onClick={() => {
                                                      const newAmpState = isOffBtn ? 'Apagado' : 'Encendido';
                                                      const currentVal = typeof field.value === 'number' ? field.value : parseFloat(String(field.value || ''));
                                                      const validNonZero = !isNaN(currentVal) && currentVal > 0 ? currentVal : (field.lastNonZeroValue || (field.minValue ?? 0));
                                                      const newVal = isOffBtn ? 0 : (isEncBtn && (field.value === 0 || field.value === '0' || field.value === undefined) ? validNonZero : (field.value !== undefined && field.value !== '' ? field.value : ''));
                                                      updateActiveRoundMeasurementField(chk.id, fIdx, newVal, newAmpState, opt, true);
                                                      if (isFailBtn) {
                                                        triggerAlarmAlert(`🚨 ¡Alarma activada en ${chk.title} (${field.name || fIdx + 1}): "${opt}"!`);
                                                      }
                                                    }}
                                                    className={`py-1 px-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all shadow-2xs flex items-center justify-center space-x-0.5 border cursor-pointer ${buttonStyle}`}
                                                  >
                                                    {isSelected && <span>✓</span>}
                                                    <span className="truncate">{opt}</span>
                                                  </button>
                                                );
                                              })}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <div className="flex flex-col space-y-2">
                                    <div className="flex flex-wrap items-center gap-1.5 justify-start sm:justify-end">
                                      <DecimalInput
                                        disabled={isOff}
                                        placeholder="0.0"
                                        value={isOff ? '0' : (chk.currentValue !== undefined && chk.currentValue !== null ? String(chk.currentValue) : '')}
                                        onChange={(val) => {
                                          updateActiveRoundCheckpoint(
                                            chk.id, 
                                            val, 
                                            chk.notes, 
                                            chk.measurementFields, 
                                            chk.statusValue, 
                                            chk.ampState || 'Encendido',
                                            false
                                          );
                                        }}
                                        onBlur={(val) => {
                                          updateActiveRoundCheckpoint(
                                            chk.id, 
                                            val, 
                                            chk.notes, 
                                            chk.measurementFields, 
                                            chk.statusValue, 
                                            chk.ampState || 'Encendido',
                                            true
                                          );
                                        }}
                                        className={`w-28 px-3 py-1.5 rounded-xl border-2 text-sm font-bold text-center transition-all ${
                                          isOff 
                                            ? 'bg-slate-200 text-slate-500 border-slate-300 cursor-not-allowed select-none shadow-inner' 
                                            : isAlarm 
                                              ? 'border-rose-500 bg-rose-50 text-rose-900 focus:ring-2 focus:ring-rose-500' 
                                              : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500'
                                        }`}
                                      />
                                      <span className="text-xs font-bold text-slate-700">{chk.unit || '°C'}</span>

                                      {/* Camera Scanner for numeric checkpoint based on photoMode */}
                                      {!isOff && (chk.photoMode && chk.photoMode !== 'none') && (
                                        <div className="flex items-center space-x-1">
                                          {(chk.photoMode === 'ai' || chk.photoMode === 'both') && (
                                            <button
                                              type="button"
                                              onClick={() => openMeterScanner({
                                                targetType: 'checkpoint',
                                                checkpointId: chk.id,
                                                title: `Lectura IA: ${chk.title}`,
                                                meterName: chk.title,
                                                meterTypeHint: `${chk.title} (${chk.area})`,
                                                unit: chk.unit || '',
                                                initialValue: chk.currentValue as any,
                                                initialPhotoMode: 'ai',
                                                allowedPhotoMode: chk.photoMode
                                              })}
                                              className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors shadow-2xs flex items-center space-x-1 text-xs font-bold cursor-pointer"
                                              title="Tomar foto / Reconocer dígitos con IA"
                                            >
                                              <Camera className="w-3.5 h-3.5 text-purple-600" />
                                              <span>Foto IA</span>
                                            </button>
                                          )}
                                          {(chk.photoMode === 'normal' || chk.photoMode === 'both') && (
                                            <button
                                              type="button"
                                              onClick={() => openMeterScanner({
                                                targetType: 'checkpoint',
                                                checkpointId: chk.id,
                                                title: `Foto Evidencia: ${chk.title}`,
                                                meterName: chk.title,
                                                meterTypeHint: `${chk.title} (${chk.area})`,
                                                unit: chk.unit || '',
                                                initialValue: chk.currentValue as any,
                                                initialPhotoMode: 'normal',
                                                allowedPhotoMode: chk.photoMode
                                              })}
                                              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors shadow-2xs flex items-center space-x-1 text-xs font-bold cursor-pointer"
                                              title="Tomar foto de evidencia normal"
                                            >
                                              <Camera className="w-3.5 h-3.5 text-emerald-600" />
                                              <span>Foto</span>
                                            </button>
                                          )}
                                        </div>
                                      )}

                                      {chk.photoUrl && (
                                        <button
                                          type="button"
                                          onClick={() => openPhotoPreview(chk.photoUrl, `${chk.title} (${chk.area})`)}
                                          className="px-2 py-1 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs"
                                          title="Ver foto capturada del contador"
                                        >
                                          <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                                          <span>Foto ✓</span>
                                        </button>
                                      )}

                                      {isOff ? (
                                        <span className="text-[10px] font-bold text-slate-600 bg-slate-200 border border-slate-300 px-2 py-0.5 rounded-md flex items-center space-x-1">
                                          <Lock className="w-3 h-3 text-slate-500" />
                                          <span>Apagado</span>
                                        </span>
                                      ) : isAlarm ? (
                                        <span className="text-[10px] font-extrabold text-white bg-rose-600 px-2 py-0.5 rounded-md shadow-xs animate-pulse">
                                          ¡ALARMA!
                                        </span>
                                      ) : null}
                                    </div>
                                  </div>
                                )}

                                {/* Optional Status Buttons for Numeric items */}
                                {chk.options && chk.options.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 w-full pt-1 justify-start sm:justify-end">
                                    {chk.options.map(opt => {
                                      const isSelected = chk.statusValue === opt;
                                      const actionType = getCheckpointButtonAction(chk, opt, roundTemplate);
                                      const isOffBtn = actionType === 'turn_off';
                                      const isEncBtn = actionType === 'turn_on';
                                      const isFailBtn = actionType === 'failure';
                                      const actionCfg = chk.buttonActions?.[opt];
                                      const buttonStyle = getButtonColorClass(opt, isSelected, actionCfg?.color);

                                      return (
                                        <button
                                          key={opt}
                                          type="button"
                                          onClick={() => {
                                            const newAmpState = isOffBtn ? 'Apagado' : 'Encendido';
                                            const updatedFields = chk.measurementFields ? chk.measurementFields.map(f => {
                                              const currentVal = typeof f.value === 'number' ? f.value : parseFloat(f.value as any);
                                              const prevNonZero = f.lastNonZeroValue || (!isNaN(currentVal) && currentVal > 0 ? currentVal : (f.minValue ?? 0));
                                              return {
                                                ...f,
                                                value: isOffBtn ? 0 : (isEncBtn && (f.value === 0 || f.value === undefined) ? prevNonZero : (f.value ?? prevNonZero)),
                                                ampState: newAmpState,
                                                lastNonZeroValue: prevNonZero
                                              };
                                            }) : undefined;
                                            
                                            const currentNumVal = typeof chk.currentValue === 'number' ? chk.currentValue : parseFloat(String(chk.currentValue || ''));
                                            const validCurrentVal = !isNaN(currentNumVal) && currentNumVal > 0 ? currentNumVal : (chk.lastNonZeroValue || (chk.minValue ?? 0));
                                            const newVal = isOffBtn ? 0 : (isEncBtn && (chk.currentValue === 0 || chk.currentValue === '0' || chk.currentValue === undefined) ? validCurrentVal : (chk.currentValue !== undefined && chk.currentValue !== '' ? chk.currentValue : ''));
                                            updateActiveRoundCheckpoint(chk.id, newVal, chk.notes, updatedFields, opt, newAmpState, true);
                                            if (isFailBtn) {
                                              triggerAlarmAlert(`🚨 ¡Alarma activada en ${chk.title}: "${opt}"!`);
                                            }
                                          }}
                                          className={`py-1 px-2 rounded-lg text-[10px] sm:text-xs font-bold transition-all shadow-2xs flex items-center justify-center space-x-0.5 border cursor-pointer ${buttonStyle}`}
                                        >
                                          {isSelected && <span>✓</span>}
                                          <span className="truncate">{opt}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            ) : chk.type === 'text' ? (
                              <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto justify-start sm:justify-end">
                                <div className="w-full sm:w-64">
                                  <input
                                    type="text"
                                    value={(chk.currentValue as string) || ''}
                                    onChange={(e) => updateActiveRoundCheckpoint(chk.id, e.target.value)}
                                    placeholder="Registro o estado..."
                                    className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800"
                                  />
                                </div>
                                {chk.photoMode && chk.photoMode !== 'none' && (
                                  <div className="flex items-center space-x-1 shrink-0">
                                    {(chk.photoMode === 'ai' || chk.photoMode === 'both') && (
                                      <button
                                        type="button"
                                        onClick={() => openMeterScanner({
                                          targetType: 'checkpoint',
                                          checkpointId: chk.id,
                                          title: `Foto IA: ${chk.title}`,
                                          meterName: chk.title,
                                          meterTypeHint: `${chk.title} (${chk.area})`,
                                          unit: '',
                                          initialValue: '',
                                          initialPhotoMode: 'ai',
                                          allowedPhotoMode: chk.photoMode
                                        })}
                                        className="px-2 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-200 transition-colors shadow-2xs flex items-center space-x-1 text-[11px] font-bold cursor-pointer"
                                        title="Tomar foto con IA"
                                      >
                                        <Camera className="w-3.5 h-3.5 text-purple-600" />
                                        <span>Foto IA</span>
                                      </button>
                                    )}
                                    {(chk.photoMode === 'normal' || chk.photoMode === 'both') && (
                                      <button
                                        type="button"
                                        onClick={() => openMeterScanner({
                                          targetType: 'checkpoint',
                                          checkpointId: chk.id,
                                          title: `Foto Evidencia: ${chk.title}`,
                                          meterName: chk.title,
                                          meterTypeHint: `${chk.title} (${chk.area})`,
                                          unit: '',
                                          initialValue: '',
                                          initialPhotoMode: 'normal',
                                          allowedPhotoMode: chk.photoMode
                                        })}
                                        className="px-2 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 transition-colors shadow-2xs flex items-center space-x-1 text-[11px] font-bold cursor-pointer"
                                        title="Tomar foto de evidencia normal"
                                      >
                                        <Camera className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Foto</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                                {chk.photoUrl && (
                                  <button
                                    type="button"
                                    onClick={() => openPhotoPreview(chk.photoUrl, `${chk.title} (${chk.area})`)}
                                    className="px-2 py-1 rounded-xl bg-emerald-100 hover:bg-emerald-200 text-emerald-800 border border-emerald-300 text-[11px] font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-2xs shrink-0"
                                    title="Ver foto capturada"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5 text-emerald-700" />
                                    <span>Foto ✓</span>
                                  </button>
                                )}
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => updateActiveRoundCheckpoint(chk.id, !chk.currentValue)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                                  chk.currentValue 
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                    : 'bg-slate-100 text-slate-600 border border-slate-300'
                                }`}
                              >
                                {chk.currentValue ? '✓ Conforme' : 'Pendiente'}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Dedicated Well for Technician Note & Findings (Divided with clean top border) */}
                        {chk.allowNotes !== false && (
                          <div className="px-4 py-3 bg-slate-50 border-t-2 border-slate-200/90 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
                            <div className="flex items-center space-x-1.5 text-slate-700 font-bold shrink-0">
                              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                              <span>Comentario técnico / Estado del equipo:</span>
                            </div>
                            <div className="w-full sm:w-3/5 flex flex-col gap-1.5">
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={chk.notes || ''}
                                  onChange={(e) => updateActiveRoundCheckpoint(chk.id, chk.currentValue as any, e.target.value)}
                                  placeholder="ej. Rejilla limpia, succionando bien, sin ruidos anormales..."
                                  className="w-full px-3 py-1.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 font-medium"
                                />
                                {chk.notes && (
                                  <button
                                    type="button"
                                    onClick={() => updateActiveRoundCheckpoint(chk.id, chk.currentValue as any, '')}
                                    className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-slate-200/70"
                                    title="Limpiar comentario"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                              {chk.suggestedNotes && chk.suggestedNotes.length > 0 && (
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  <span className="text-[10px] text-slate-500 font-semibold">Sugeridos:</span>
                                  {chk.suggestedNotes.map((tag, tIdx) => (
                                    <button
                                      key={`${chk.id}-tag-${tIdx}-${tag}`}
                                      type="button"
                                      onClick={() => {
                                        const current = chk.notes ? `${chk.notes} | ${tag}` : tag;
                                        updateActiveRoundCheckpoint(chk.id, chk.currentValue as any, current);
                                      }}
                                      className="text-[10px] px-2 py-0.5 rounded-md bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 font-medium border border-slate-300 transition-colors shadow-2xs cursor-pointer"
                                      title={`Añadir "${tag}" a la nota`}
                                    >
                                      + {tag}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Finalize Round Form */}
          <form onSubmit={handleFinishRound} className="mt-8 pt-6 border-t border-slate-200 bg-slate-50/70 -mx-6 -mb-6 p-6 rounded-b-2xl">
            <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center space-x-2">
              <FileText className="w-4 h-4 text-blue-600" />
              <span>Cierre de Ronda y Validación Técnica</span>
            </h4>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observaciones Generales de la Ronda
                </label>
                <textarea
                  rows={2}
                  value={generalNotes}
                  onChange={(e) => {
                    setGeneralNotes(e.target.value);
                    updateActiveRoundMeterReadings({}, e.target.value);
                  }}
                  onBlur={(e) => {
                    updateActiveRoundMeterReadings({}, e.target.value);
                  }}
                  placeholder="Detallar cualquier condición extraordinaria observada en salas técnicas, cuartos de bombeo o piscinas..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800"
                />
              </div>

              {activeRoundIncompleteCheckpoints.length > 0 ? (
                <div className="p-3 bg-amber-50 border-2 border-amber-300 rounded-xl flex items-start space-x-2 text-amber-900 text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold">
                      {activeRoundIncompleteCheckpoints.length === 1
                        ? 'Falta 1 punto por registrar para poder cerrar la ronda:'
                        : `Faltan ${activeRoundIncompleteCheckpoints.length} puntos por registrar para poder cerrar la ronda:`}
                    </span>
                    <span className="ml-1 text-amber-800">
                      Todos los registros deben estar completos con sus cifras o estados (OK/Nok/Apagado/Valores) para poder guardar.
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center space-x-2 text-emerald-900 text-xs font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>¡Todos los puntos están completos y listos para validar!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Firma / Nombre del Técnico que Entrega la Ronda *
                  </label>
                  <input
                    id="signature-name-input"
                    type="text"
                    value={signatureName}
                    onChange={(e) => setSignatureName(e.target.value)}
                    placeholder="Ej. Mateo Ramos"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 font-medium"
                  />
                </div>

                <div>
                  {activeRoundIncompleteCheckpoints.length > 0 || (activeRound.checkpoints?.length || 0) < (roundTemplate?.length || 0) || (activeRound.compliancePercentage !== undefined && activeRound.compliancePercentage < 100) ? (
                    <div className="space-y-2">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          type="submit"
                          disabled={isSubmittingRound}
                          className="w-full py-3 px-4 font-bold text-xs rounded-xl shadow-sm transition-all flex items-center justify-center space-x-2 bg-slate-300 hover:bg-slate-400 text-slate-700 cursor-pointer"
                          title="Debes completar el 100% de los puntos para poder cerrar la ronda"
                        >
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>Finalizar Ronda ({activeRound.compliancePercentage || 0}% - Incompleta)</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => setShowIncompleteCheckpointsModal(true)}
                          className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs rounded-xl border border-amber-300 transition-all flex items-center justify-center space-x-1.5 cursor-pointer active:scale-98"
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Revisar {activeRoundIncompleteCheckpoints.length} Puntos Pendientes</span>
                        </button>
                      </div>

                      <p className="text-[11px] text-amber-700 font-semibold text-center flex items-center justify-center gap-1.5">
                        <span>🔒 El sistema exige el 100% de los puntos registrados para permitir el cierre de la ronda.</span>
                      </p>
                    </div>
                  ) : (
                    <button
                      type="submit"
                      disabled={isSubmittingRound}
                      className={`w-full py-3 px-4 font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center space-x-2 ${
                        isSubmittingRound
                          ? 'bg-slate-500 text-white cursor-not-allowed opacity-90'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer active:scale-98'
                      }`}
                    >
                      {isSubmittingRound ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin text-white" />
                          <span>Sincronizando y Guardando en la Nube...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Validar y Guardar Ronda Diaria (100% Completa)</span>
                        </>
                      )}
                    </button>
                  )}
                  {(!activeRoundIncompleteCheckpoints.length && (activeRound.checkpoints?.length || 0) >= (roundTemplate?.length || 0) && (activeRound.compliancePercentage === 100)) && (
                    <p className="text-[10px] text-emerald-600 font-semibold text-center mt-1.5 flex items-center justify-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      <span>100% de puntos auditados. Lista para firma, cierre oficial y sincronización en la nube.</span>
                    </p>
                  )}
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* START ROUND MODAL */}
      {isStartingRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Clock className="w-5 h-5 text-blue-600" />
                <span>Iniciar Ronda Diaria de Hotel</span>
              </h3>
              <button 
                onClick={() => setIsStartingRound(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Seleccione Turno Operativo
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'manana', label: 'Mañana', desc: '06:00 - 15:00' },
                    { id: 'tarde', label: 'Tarde', desc: '14:00 - 22:00' },
                  ].map(shift => (
                    <button
                      key={shift.id}
                      type="button"
                      onClick={() => setSelectedShift(shift.id as RoundShift)}
                      className={`p-2.5 rounded-xl border text-center transition-colors ${
                        selectedShift === shift.id 
                          ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold' 
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold">{shift.label}</div>
                      <div className="text-[10px] text-slate-500">{shift.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Técnico Responsable detectado automáticamente por la sesión activa */}
              <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-3.5 flex items-center space-x-3.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
                  {detectedTechnicianName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">
                    Técnico / Responsable de la Ronda
                  </div>
                  <div className="text-sm font-extrabold text-slate-900 truncate">
                    {detectedTechnicianName}
                  </div>
                  <div className="text-[10px] text-emerald-700 font-semibold flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                    <span>Detectado automáticamente de la sesión ({currentUser?.role === 'admin' ? 'Administrador' : (currentUser?.role || 'Técnico')})</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-800">Puntos a inspeccionar durante la ronda:</p>
                <ul className="list-disc pl-4 text-[11px] text-slate-500 space-y-0.5">
                  {uniqueTemplateAreas.length > 0 ? (
                    uniqueTemplateAreas.map((area, idx) => (
                      <li key={idx} className="capitalize">{area.toLowerCase()}</li>
                    ))
                  ) : (
                    <>
                      <li>Presiones de bombas hidroneumáticas de agua potable</li>
                      <li>Temperatura de agua caliente sanitaria (calderas)</li>
                      <li>Nivel de cloro y pH de albercas y jacuzzi</li>
                      <li>Presión de red contra incendios</li>
                      <li>Cárcamo y bombas sumergibles de achique</li>
                    </>
                  )}
                </ul>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsStartingRound(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleStartRound}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
                >
                  Comenzar Recorrido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REPORT ANOMALY MODAL */}
      {showAnomalyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-4">
          <div className="bg-white rounded-2xl p-4 sm:p-6 w-full max-w-md shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span>Reportar Novedad o Incidencia Técnica</span>
              </h3>
              <button 
                onClick={() => setShowAnomalyModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAnomalySubmit} className="space-y-4">
              <div>
                <CustomSelect
                  label="Área / Ubicación del Hotel"
                  value={anomalyForm.area}
                  onChange={(val) => setAnomalyForm(p => ({ ...p, area: val }))}
                  options={[
                    { value: 'Sótano 2 - Cuarto de Bombas', label: 'Sótano 2 - Cuarto de Bombas', color: 'blue' },
                    { value: 'Sótano 1 - Sala de Calderas', label: 'Sótano 1 - Sala de Calderas', color: 'rose' },
                    { value: 'Exterior - Caseta de Piscina', label: 'Exterior - Caseta de Piscina', color: 'blue' },
                    { value: 'Sótano 2 - Red Contra Incendios', label: 'Sótano 2 - Red Contra Incendios', color: 'rose' },
                    { value: 'Sótano 3 - Cárcamos de Achique', label: 'Sótano 3 - Cárcamos de Achique', color: 'slate' },
                    { value: 'Azotea - Chillers Climatización', label: 'Azotea - Chillers Climatización', color: 'blue' },
                    { value: 'Áreas Comunes y Habitaciones', label: 'Áreas Comunes y Habitaciones', color: 'amber' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Título de la Falla / Anomalía *
                </label>
                <input
                  type="text"
                  required
                  value={anomalyForm.title}
                  onChange={(e) => setAnomalyForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="Ej. Goteo en sello de bomba 2 o zumbido anormal"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nivel de Severidad
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: 'baja', label: 'Baja', color: 'text-slate-700 bg-slate-100' },
                    { id: 'media', label: 'Media', color: 'text-blue-700 bg-blue-100' },
                    { id: 'alta', label: 'Alta', color: 'text-amber-700 bg-amber-100' },
                    { id: 'urgente', label: 'Urgente', color: 'text-rose-700 bg-rose-100' }
                  ].map(sev => (
                    <button
                      key={sev.id}
                      type="button"
                      onClick={() => setAnomalyForm(p => ({ ...p, severity: sev.id as any }))}
                      className={`py-1.5 px-2 rounded-lg text-xs font-bold text-center border transition-colors ${
                        anomalyForm.severity === sev.id 
                          ? 'border-slate-800 ring-2 ring-slate-800 ' + sev.color 
                          : 'border-slate-200 text-slate-600'
                      }`}
                    >
                      {sev.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción Detallada *
                </label>
                <textarea
                  rows={3}
                  required
                  value={anomalyForm.description}
                  onChange={(e) => setAnomalyForm(p => ({ ...p, description: e.target.value }))}
                  placeholder="Explique lo que encontró, lecturas anómalas o acciones inmediatas tomadas..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {/* Evidencia Fotográfica / Foto de la Anomalía */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Foto de Evidencia (Opcional)
                </label>

                {/* Hidden File Inputs */}
                <input
                  ref={anomalyCameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleAnomalyPhotoCapture}
                  className="hidden"
                />
                <input
                  ref={anomalyGalleryInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAnomalyPhotoCapture}
                  className="hidden"
                />

                {anomalyForm.photoUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border-2 border-emerald-300 bg-emerald-50/50 p-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3 min-w-0 flex-1">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 shrink-0">
                        <img
                          src={anomalyForm.photoUrl}
                          alt="Foto capturada"
                          className="w-full h-full object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => openPhotoPreview(anomalyForm.photoUrl, `Foto de novedad: ${anomalyForm.title || 'Nueva incidencia'}`)}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-emerald-800 flex items-center space-x-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">Foto lista para adjuntar</span>
                        </span>
                        <p className="text-[10px] text-slate-500 mt-0.5">Se guardará junto a la novedad en la ronda.</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openPhotoPreview(anomalyForm.photoUrl, `Foto de novedad: ${anomalyForm.title || 'Nueva incidencia'}`)}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold transition-colors cursor-pointer"
                        title="Ver foto en grande"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        onClick={() => setAnomalyForm(p => ({ ...p, photoUrl: '' }))}
                        className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer border border-rose-200"
                        title="Eliminar foto"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => anomalyCameraInputRef.current?.click()}
                      className="py-2.5 px-3 rounded-xl border-2 border-dashed border-emerald-300 hover:border-emerald-500 bg-emerald-50/40 hover:bg-emerald-50 text-emerald-800 text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs"
                    >
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span>Tomar Foto (Cámara)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => anomalyGalleryInputRef.current?.click()}
                      className="py-2.5 px-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs"
                    >
                      <ImageIcon className="w-4 h-4 text-slate-500" />
                      <span>Galería / Archivo</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAnomalyModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-xs"
                >
                  Guardar Novedad
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HISTORIAL DE RONDAS DIARIAS (Estricto 100% de cumplimiento oficial) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900">
                Historial de Rondas Realizadas
              </h3>
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>
                  {filterShift !== 'todos' || searchTerm.trim() !== ''
                    ? `${filteredRounds.length} de ${(rounds || []).filter(r => r && r.status === 'completada').length} cerradas al 100% (En vivo)`
                    : `${filteredRounds.length} cerradas al 100% (En vivo)`
                  }
                </span>
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Auditoría y registro de recorridos finalizados al 100% conforme a protocolos del hotel
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
            {/* Search filter */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por técnico o fecha..."
                className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs w-full sm:w-48 bg-slate-50 focus:bg-white"
              />
            </div>

            {/* Shift filter */}
            <div className="w-full sm:w-44">
              <CustomSelect
                value={filterShift}
                onChange={(val) => setFilterShift(val)}
                options={[
                  { value: 'todos', label: 'Todos los Turnos', color: 'slate' },
                  { value: 'manana', label: 'Turno Mañana', color: 'amber' },
                  { value: 'tarde', label: 'Turno Tarde', color: 'blue' },
                  { value: 'noche', label: 'Turno Noche', color: 'purple' },
                ]}
              />
            </div>
          </div>
        </div>

        {filteredRounds.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs">
            No se encontraron rondas con los filtros especificados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold border-b-2 border-slate-800">
                <tr>
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Turno</th>
                  <th className="py-3 px-4">Técnico a Cargo</th>
                  <th className="py-3 px-4">Lecturas Clave</th>
                  <th className="py-3 px-4">Incidencias</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-slate-200 text-slate-700 bg-white">
                {filteredRounds.map(rnd => (
                  <tr key={rnd.id} className="hover:bg-blue-50/50 transition-colors border-b border-slate-200">
                    <td className="py-3.5 px-4 font-mono">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{rnd.date}</span>
                        </span>
                        <span className="text-slate-600 font-semibold text-[11px] flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                          <span>Horario: {rnd.time || '00:00'} hs</span>
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase border shadow-2xs ${
                        rnd.shift === 'manana' ? 'bg-amber-100 text-amber-900 border-amber-300' :
                        rnd.shift === 'tarde' ? 'bg-blue-100 text-blue-900 border-blue-300' :
                        'bg-purple-100 text-purple-900 border-purple-300'
                      }`}>
                        {formatShiftName(rnd.shift, true)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {rnd.technicianName}
                    </td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-600 font-medium">
                      <div>
                        <span>{rnd.meterReadings?.mainWaterPressurePsi ? `${rnd.meterReadings.mainWaterPressurePsi} PSI` : '—'} • {rnd.meterReadings?.hotWaterSupplyTempC ? `${rnd.meterReadings.hotWaterSupplyTempC}°C ACS` : '—'}</span>
                        {getRoundTotalPhotos(rnd) > 0 && (
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedRoundDetail(rnd);
                                setModalFilterTab('fotos');
                              }}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[10px] transition-colors cursor-pointer shadow-2xs"
                              title={`Ver las ${getRoundTotalPhotos(rnd)} fotografías registradas en esta ronda`}
                            >
                              <Camera className="w-3 h-3 text-emerald-600" />
                              <span>{getRoundTotalPhotos(rnd)} foto{getRoundTotalPhotos(rnd) > 1 ? 's' : ''} ✓</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {(rnd.anomalies || []).length > 0 ? (
                        <span className="inline-flex items-center text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-bold text-[11px]">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                          {(rnd.anomalies || []).length} novedad(es)
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">✓ Sin novedades</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center text-emerald-800 font-extrabold bg-emerald-100 px-2.5 py-0.5 rounded-md border border-emerald-300 text-[10px] shadow-2xs">
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                        100% OK
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => {
                          resumeRound(rnd);
                        }}
                        className={`p-1.5 rounded-lg transition-colors inline-flex items-center cursor-pointer shadow-2xs ${
                          rnd.status === 'en_progreso'
                            ? 'text-emerald-700 hover:text-emerald-900 hover:bg-emerald-100 border border-emerald-300'
                            : 'text-amber-700 hover:text-amber-900 hover:bg-amber-100 border border-amber-300'
                        }`}
                        title={rnd.status === 'en_progreso' ? "Continuar llenando esta ronda" : "Reanudar ronda para completar o corregir puntos"}
                      >
                        <Play className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setSelectedRoundDetail(rnd)}
                        className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-blue-100/70 border border-slate-200 hover:border-blue-300 rounded-lg transition-colors inline-flex items-center cursor-pointer"
                        title="Ver detalle completo de la ronda"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {getRoundTotalPhotos(rnd) > 0 && (
                        <button
                          onClick={() => {
                            setSelectedRoundDetail(rnd);
                            setModalFilterTab('fotos');
                          }}
                          className="p-1.5 text-emerald-700 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-300 rounded-lg transition-colors inline-flex items-center cursor-pointer shadow-2xs"
                          title={`Ver las ${getRoundTotalPhotos(rnd)} fotos cargadas en esta ronda`}
                        >
                          <Camera className="w-4 h-4" />
                        </button>
                      )}
                      
                      {/* Ajustes y opciones de compartir (Exclusivo para Administrador) */}
                      {isAdmin && rnd.status !== 'en_progreso' && (
                        <button
                          onClick={() => {
                            setRoundToShare(rnd);
                            setIsJustCompletedShare(false);
                          }}
                          className="p-1.5 text-indigo-700 hover:text-indigo-950 hover:bg-indigo-100/80 border border-indigo-200 hover:border-indigo-300 rounded-lg transition-colors inline-flex items-center cursor-pointer shadow-2xs"
                          title="Ajustes de ronda, descargar PDF y enviar a WhatsApp / Redes (Exclusivo Administrador)"
                        >
                          <Sliders className="w-4 h-4" />
                        </button>
                      )}

                      {rnd.status !== 'en_progreso' && (
                        <button
                          onClick={() => downloadRoundPdf(rnd, settings?.hotelInfo)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-100/70 border border-rose-200 hover:border-rose-300 rounded-lg transition-colors inline-flex items-center cursor-pointer"
                          title="Descargar Reporte PDF Oficial"
                        >
                          <FileDown className="w-4 h-4" />
                        </button>
                      )}

                      {(canDeleteRecords || rnd.status === 'en_progreso') && (
                        <button
                          onClick={() => setRoundToDelete(rnd)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-lg transition-colors inline-flex items-center cursor-pointer"
                          title={rnd.status === 'en_progreso' ? "Descartar esta ronda en curso" : "Eliminar ronda"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ROUND DETAIL / LIVE SUPERVISION MODAL */}
      {liveSelectedRoundDetail && (() => {
        const isLive = liveSelectedRoundDetail.status === 'en_progreso';
        const allCheckpoints = liveSelectedRoundDetail.checkpoints || [];
        
        const isFilled = (c: RoundCheckpoint) => {
          if (c.currentValue !== undefined && String(c.currentValue).trim() !== '') return true;
          if (c.statusValue !== undefined && String(c.statusValue).trim() !== '') return true;
          if (c.measurementFields && c.measurementFields.length > 0) {
            return c.measurementFields.some(f => (f.value !== undefined && String(f.value).trim() !== '') || (f.statusValue !== undefined && String(f.statusValue).trim() !== ''));
          }
          return false;
        };

        const isAlarm = (c: RoundCheckpoint) => {
          if (c.isAlarmActive !== undefined) return c.isAlarmActive;
          return isCheckpointAlarmActive(c, roundTemplate).isAlarm;
        };

        const filledCount = allCheckpoints.filter(isFilled).length;
        const pendingCount = allCheckpoints.length - filledCount;
        const alarmCheckpointsCount = allCheckpoints.filter(isAlarm).length;
        const anomaliesCount = liveSelectedRoundDetail.anomalies?.length || 0;
        const alarmCount = Math.max(alarmCheckpointsCount, anomaliesCount);
        
        // Compile complete list of all photos in this round (checkpoints, measurement fields, utility meters, and anomalies)
        const allRoundPhotos: Array<{
          id: string;
          url: string;
          title: string;
          area: string;
          sourceType: 'Punto de Inspección' | 'Medición Técnica' | 'Contador General' | 'Incidencia / Avería';
          details?: string;
        }> = [];

        allCheckpoints.forEach(c => {
          if (!c) return;
          const checkpointPhotos = new Set<string>();
          if (isValidPhoto(c.photoUrl)) checkpointPhotos.add(c.photoUrl!);
          if (Array.isArray(c.photos)) {
            c.photos.forEach(p => {
              if (isValidPhoto(p)) checkpointPhotos.add(p);
            });
          }
          checkpointPhotos.forEach((photoUrl, pIdx) => {
            allRoundPhotos.push({
              id: `chk-${c.id || 'item'}-${pIdx}`,
              url: photoUrl,
              title: c.title || 'Punto de Inspección',
              area: c.area || 'Zona técnica',
              sourceType: 'Punto de Inspección',
              details: (c.currentValue !== undefined && String(c.currentValue).trim() !== '') 
                ? `Valor registrado: ${c.currentValue} ${c.unit || ''}` 
                : (c.statusValue ? `Estado: ${c.statusValue}` : undefined)
            });
          });

          (c.measurementFields || []).forEach((f, idx) => {
            if (!f) return;
            const fieldPhotos = new Set<string>();
            if (isValidPhoto(f.photoUrl)) fieldPhotos.add(f.photoUrl!);
            if (Array.isArray(f.photos)) {
              f.photos.forEach(p => {
                if (isValidPhoto(p)) fieldPhotos.add(p);
              });
            }
            fieldPhotos.forEach((photoUrl, fPIdx) => {
              allRoundPhotos.push({
                id: `field-${c.id || 'item'}-${f.id || idx}-${fPIdx}`,
                url: photoUrl,
                title: `${c.title || 'Punto'} — ${f.name || `Medición ${idx + 1}`}`,
                area: c.area || 'Zona técnica',
                sourceType: 'Medición Técnica',
                details: f.value !== undefined ? `Lectura: ${f.value} ${f.unit || ''}` : undefined
              });
            });
          });
        });

        if (isValidPhoto(liveSelectedRoundDetail.meterReadings?.waterMeterPhotoUrl)) {
          allRoundPhotos.push({
            id: 'meter-water',
            url: liveSelectedRoundDetail.meterReadings!.waterMeterPhotoUrl!,
            title: 'Contador General de Agua Potable',
            area: 'Cuarto de Contadores / Acometida Principal',
            sourceType: 'Contador General',
            details: liveSelectedRoundDetail.meterReadings?.waterCubicMeters !== undefined 
              ? `${liveSelectedRoundDetail.meterReadings.waterCubicMeters.toLocaleString()} m³` 
              : undefined
          });
        }

        if (isValidPhoto(liveSelectedRoundDetail.meterReadings?.electricMeterPhotoUrl)) {
          allRoundPhotos.push({
            id: 'meter-electric',
            url: liveSelectedRoundDetail.meterReadings!.electricMeterPhotoUrl!,
            title: 'Contador de Energía Eléctrica Total',
            area: 'Subestación Eléctrica / TTA Sótano',
            sourceType: 'Contador General',
            details: liveSelectedRoundDetail.meterReadings?.electricKwh !== undefined 
              ? `${liveSelectedRoundDetail.meterReadings.electricKwh.toLocaleString()} kWh` 
              : undefined
          });
        }

        if (isValidPhoto(liveSelectedRoundDetail.meterReadings?.gasMeterPhotoUrl)) {
          allRoundPhotos.push({
            id: 'meter-gas',
            url: liveSelectedRoundDetail.meterReadings!.gasMeterPhotoUrl!,
            title: 'Contador de Gas Natural',
            area: 'Caseta de Gas / Acometida',
            sourceType: 'Contador General',
            details: liveSelectedRoundDetail.meterReadings?.gasCubicMeters !== undefined 
              ? `${liveSelectedRoundDetail.meterReadings.gasCubicMeters.toLocaleString()} m³` 
              : undefined
          });
        }

        (liveSelectedRoundDetail.anomalies || []).forEach((a, idx) => {
          const anomalyPhotos = new Set<string>();
          if (isValidPhoto(a.photoUrl)) anomalyPhotos.add(a.photoUrl!);
          if (Array.isArray(a.photos)) {
            a.photos.forEach(p => {
              if (isValidPhoto(p)) anomalyPhotos.add(p);
            });
          }
          anomalyPhotos.forEach((photoUrl, aPIdx) => {
            allRoundPhotos.push({
              id: `anom-${a.id || idx}-${aPIdx}`,
              url: photoUrl,
              title: `Incidencia: ${a.title}`,
              area: a.area || 'Área afectada',
              sourceType: 'Incidencia / Avería',
              details: a.description
            });
          });
        });

        const totalRoundPhotos = allRoundPhotos.length;

        const filteredCheckpoints = allCheckpoints.filter(c => {
          if (modalFilterTab === 'cargados') return isFilled(c);
          if (modalFilterTab === 'pendientes') return !isFilled(c);
          if (modalFilterTab === 'novedades') return isAlarm(c) || !!c.notes;
          if (modalFilterTab === 'fotos') return isValidPhoto(c.photoUrl) || (c.measurementFields && c.measurementFields.some(f => isValidPhoto(f.photoUrl)));
          return true;
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col justify-between">
              <div>
                {/* Header Section */}
                <div className="flex items-start justify-between pb-4 border-b border-slate-200 gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md flex items-center gap-1.5 ${
                        isLive ? 'bg-amber-500 text-slate-950 border border-amber-400 shadow-2xs animate-pulse' : 'bg-blue-100 text-blue-900 border border-blue-200'
                      }`}>
                        {isLive ? (
                          <>
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950"></span>
                            </span>
                            <span>🔴 SUPERVISIÓN EN VIVO (EN CURSO)</span>
                          </>
                        ) : (
                          '📋 REPORTE FINAL AUDITADO'
                        )}
                      </span>

                      {isLive && (
                        <span className="text-xs bg-emerald-100 text-emerald-900 border border-emerald-300 font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Avance: {liveSelectedRoundDetail.compliancePercentage}%</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-extrabold text-slate-900 mt-1 flex flex-wrap items-center gap-2">
                      <span>Ronda de Turno {formatShiftName(liveSelectedRoundDetail.shift, true)}</span>
                      <span className="text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200 text-xs sm:text-sm font-bold flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-blue-600 inline" />
                        <span>{liveSelectedRoundDetail.date}</span>
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                      <span>Técnico responsable: <strong className="text-slate-900 font-bold">{liveSelectedRoundDetail.technicianName}</strong></span>
                      <span className="flex items-center gap-1 font-medium text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-500 inline" />
                        <span>Horario de Ejecución: <strong className="text-slate-900 font-bold">{liveSelectedRoundDetail.time || '00:00'} hs</strong></span>
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => downloadRoundPdf(liveSelectedRoundDetail, settings?.hotelInfo)}
                      className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                      title="Descargar Reporte en PDF"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">PDF</span>
                    </button>
                    {isAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setRoundToShare(liveSelectedRoundDetail);
                          setIsJustCompletedShare(false);
                        }}
                        className="px-2.5 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                        title="Ajustes de ronda y enviar a WhatsApp / Redes (Exclusivo Administrador)"
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Ajustes</span>
                      </button>
                    )}
                    <button 
                      onClick={() => {
                        setSelectedRoundDetail(null);
                        setModalFilterTab('todos');
                      }}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Cerrar"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                {/* Real-Time Live Status Banner (When round is in progress) */}
                {isLive && (
                  <div className="mt-4 p-3.5 bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/10 rounded-xl border border-amber-300 flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center space-x-2.5">
                      <span className="relative flex h-3 w-3 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-600"></span>
                      </span>
                      <div>
                        <p className="text-xs font-bold text-amber-950">
                          Sincronización bidireccional inmediata en la nube Firestore
                        </p>
                        <p className="text-[11px] text-amber-900/80">
                          A medida que <strong>{liveSelectedRoundDetail.technicianName}</strong> registra cada valor o punto en su dispositivo, se reflejará aquí al instante sin recargar la pantalla.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-xs font-bold">
                      <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-900 border border-emerald-300">
                        ✓ {filledCount} cargados
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300">
                        ⏳ {pendingCount} pendientes
                      </span>
                      {alarmCount > 0 && (
                        <span className="px-2.5 py-1 rounded-lg bg-rose-100 text-rose-900 border border-rose-300">
                          ⚠️ {alarmCount} alertas
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4 py-4">
                  {/* Checkpoints List with Live Tabs */}
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                        Puntos de Control de la Ronda ({allCheckpoints.length})
                      </h4>

                      {/* Modal Filter Tabs */}
                      <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-bold border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setModalFilterTab('todos')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            modalFilterTab === 'todos' ? 'bg-white text-slate-900 shadow-2xs font-black' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Todos ({allCheckpoints.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalFilterTab('cargados')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            modalFilterTab === 'cargados' ? 'bg-emerald-600 text-white shadow-2xs font-black' : 'text-emerald-700 hover:text-emerald-900'
                          }`}
                        >
                          ✓ Cargados ({filledCount})
                        </button>
                        <button
                          type="button"
                          onClick={() => setModalFilterTab('pendientes')}
                          className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                            modalFilterTab === 'pendientes' ? 'bg-amber-500 text-slate-950 shadow-2xs font-black' : 'text-amber-700 hover:text-amber-900'
                          }`}
                        >
                          ⏳ Pendientes ({pendingCount})
                        </button>
                        {alarmCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setModalFilterTab('novedades')}
                            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                              modalFilterTab === 'novedades' ? 'bg-rose-600 text-white shadow-2xs font-black' : 'text-rose-700 hover:text-rose-900'
                            }`}
                          >
                            ⚠️ Alertas ({alarmCount})
                          </button>
                        )}
                        {totalRoundPhotos > 0 && (
                          <button
                            type="button"
                            onClick={() => setModalFilterTab('fotos')}
                            className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 ${
                              modalFilterTab === 'fotos' ? 'bg-indigo-600 text-white shadow-2xs font-black' : 'text-indigo-700 hover:text-indigo-900'
                            }`}
                          >
                            <Camera className="w-3.5 h-3.5" />
                            <span>Fotos ({totalRoundPhotos})</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Dedicated Photo Gallery when 'fotos' tab is active */}
                    {modalFilterTab === 'fotos' && (
                      <div className="mb-3 space-y-2.5">
                        <div className="p-3 bg-gradient-to-r from-indigo-50 via-slate-50 to-indigo-50 rounded-xl border border-indigo-200 flex items-center justify-between">
                          <div className="flex items-center space-x-2.5">
                            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-2xs shrink-0">
                              <Camera className="w-4 h-4" />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-indigo-950 uppercase tracking-wide">
                                Evidencias Fotográficas de la Ronda ({allRoundPhotos.length})
                              </h4>
                              <p className="text-[10px] text-slate-500 font-medium">
                                Clic en cualquier foto para ampliarla en alta resolución
                              </p>
                            </div>
                          </div>
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-300">
                            ✓ {allRoundPhotos.length} foto{allRoundPhotos.length > 1 ? 's' : ''}
                          </span>
                        </div>

                        {allRoundPhotos.length === 0 ? (
                          <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                            No se registraron fotografías adjuntas en esta ronda.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-80 overflow-y-auto pr-1">
                            {allRoundPhotos.map(photo => (
                              <div 
                                key={photo.id}
                                className="group bg-white rounded-xl border-2 border-slate-200 hover:border-indigo-400 p-2.5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between"
                              >
                                <div>
                                  <div 
                                    className="relative w-full h-36 rounded-lg overflow-hidden bg-slate-900 border border-slate-300 cursor-pointer mb-2"
                                    onClick={() => openPhotoPreview(photo.url, `${photo.title} (${photo.area})`)}
                                    title="Clic para ampliar foto en alta resolución"
                                  >
                                    <img 
                                      src={photo.url} 
                                      alt={photo.title} 
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-80 group-hover:opacity-95 transition-opacity" />
                                    <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white">
                                      <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/60 backdrop-blur-xs border border-white/20">
                                        {photo.sourceType}
                                      </span>
                                      <span className="text-[10px] font-extrabold flex items-center gap-1 bg-indigo-600/90 px-2 py-0.5 rounded">
                                        <Eye className="w-3 h-3" />
                                        <span>Ampliar</span>
                                      </span>
                                    </div>
                                  </div>

                                  <div className="space-y-0.5">
                                    <h5 className="text-xs font-black text-slate-900 leading-snug line-clamp-1">
                                      {photo.title}
                                    </h5>
                                    <p className="text-[11px] text-slate-500 font-medium">
                                      📍 {photo.area}
                                    </p>
                                    {photo.details && (
                                      <p className="text-[10px] text-indigo-900 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200/80 inline-block">
                                        {photo.details}
                                      </p>
                                    )}
                                  </div>
                                </div>

                                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                                  <button
                                    type="button"
                                    onClick={() => openPhotoPreview(photo.url, `${photo.title} (${photo.area})`)}
                                    className="flex-1 py-1 px-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                                  >
                                    <Camera className="w-3.5 h-3.5" />
                                    <span>Ver Foto</span>
                                  </button>
                                  <a
                                    href={photo.url}
                                    download={`${photo.title.replace(/[^a-zA-Z0-9]/g, '_')}.jpg`}
                                    className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                                    title="Descargar imagen"
                                  >
                                    <FileDown className="w-3.5 h-3.5" />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Points Container */}
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                      {filteredCheckpoints.length === 0 ? (
                        <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300 text-slate-500 text-xs">
                          {modalFilterTab === 'cargados' ? 'Aún no se ha registrado ningún punto en esta categoría.' :
                           modalFilterTab === 'pendientes' ? '¡Excelente! Todos los puntos de la ronda han sido registrados.' :
                           modalFilterTab === 'novedades' ? 'No se han detectado alertas ni incidencias en estos puntos.' :
                           modalFilterTab === 'fotos' ? 'No hay puntos adicionales que mostrar en esta lista.' :
                           'No hay puntos de control para mostrar.'}
                        </div>
                      ) : (
                        filteredCheckpoints.map(c => {
                          const filled = isFilled(c);
                          const hasAlarm = isAlarm(c);

                          const rawVal = (c.currentValue !== undefined && c.currentValue !== null && c.currentValue !== '') ? c.currentValue : (c.statusValue ?? '');
                          const valStr = String(rawVal);
                          const lowerVal = valStr.toLowerCase();
                          const isOk = valStr === 'OK' || valStr === 'true' || lowerVal.includes('operativo') || lowerVal.includes('limpio') || lowerVal.includes('no alarma') || lowerVal.includes('sin alarma') || lowerVal.includes('conforme') || lowerVal.includes('bueno') || lowerVal.includes('normal');
                          const isNok = valStr === 'NO OK' || valStr === 'false' || lowerVal.includes('falla') || lowerVal.includes('sucio') || lowerVal.includes('fuera') || lowerVal.includes('crítico') || (lowerVal.includes('alarma') && !lowerVal.includes('no alarma') && !lowerVal.includes('sin alarma'));
                          const isObs = lowerVal.includes('observación') || lowerVal.includes('alerta') || lowerVal.includes('atención') || lowerVal.includes('mantenimiento') || lowerVal.includes('requiere');

                          return (
                            <div 
                              key={c.id} 
                              className={`p-3 rounded-xl border-2 transition-all space-y-2 ${
                                hasAlarm 
                                  ? 'bg-rose-50/60 border-rose-300 border-l-4 border-l-rose-500 shadow-2xs' 
                                  : filled 
                                  ? 'bg-white border-slate-200 border-l-4 border-l-emerald-500 shadow-2xs hover:border-slate-300' 
                                  : 'bg-slate-50/70 border-dashed border-slate-300 border-l-4 border-l-amber-400'
                              }`}
                            >
                              <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                                <div className="flex items-center space-x-2.5">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border shadow-2xs ${
                                    hasAlarm ? 'bg-rose-100 text-rose-700 border-rose-300' :
                                    filled ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                    'bg-slate-100 text-slate-500 border-slate-200'
                                  }`}>
                                    {getRoundItemIcon(c.title, c.category)}
                                  </div>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-bold text-slate-900">{c.title}</span>
                                      {filled ? (
                                        <span className="text-[10px] font-black uppercase px-2 py-0.2 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                          ✓ Cargado
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-bold uppercase px-2 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                          ⏳ Pendiente
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[11px] text-slate-500 font-medium">📍 {c.area}</p>
                                  </div>
                                </div>

                                <div className="font-mono font-bold text-right">
                                  {!filled ? (
                                    <span className="text-[11px] text-amber-700/80 italic font-medium">
                                      Esperando registro del compañero...
                                    </span>
                                  ) : c.measurementFields && c.measurementFields.length > 0 ? (
                                    <div className="flex flex-col items-end gap-1">
                                      <div className="flex flex-wrap gap-1.5 w-full sm:w-auto justify-start sm:justify-end">
                                        {c.measurementFields.map((f, fIdx) => (
                                          <span key={f.id || fIdx} className="text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border-2 border-blue-200 text-xs font-bold flex items-center gap-1.5">
                                            <span>{f.name ? `${f.name}: ` : `Med. ${fIdx+1}: `}</span>
                                            <strong className="text-blue-950 font-black">{f.value !== undefined ? f.value : '—'} {f.unit || ''}</strong>
                                            {f.statusValue && (
                                              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getStatusBadgeClass(f.statusValue, f.buttonActions?.[f.statusValue]?.color)}`}>
                                                {f.statusValue}
                                              </span>
                                            )}
                                            {isValidPhoto(f.photoUrl) && (
                                              <button
                                                type="button"
                                                onClick={() => openPhotoPreview(f.photoUrl, `${c.title} - ${f.name || 'Medición'} (${c.area})`)}
                                                className="px-1.5 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold flex items-center gap-1 shadow-2xs cursor-pointer ml-1 transition-colors"
                                                title="Ver foto de esta medición"
                                              >
                                                <Camera className="w-3 h-3" />
                                                <span>Foto</span>
                                              </button>
                                            )}
                                          </span>
                                        ))}
                                      </div>
                                      {c.statusValue && (
                                        <span className={`text-[10px] px-2 py-0.5 rounded-md border ${getStatusBadgeClass(c.statusValue, c.buttonActions?.[c.statusValue]?.color)}`}>
                                          Estado: {c.statusValue}
                                        </span>
                                      )}
                                    </div>
                                  ) : c.type === 'ok_nok' || c.type === 'options' || c.type === 'boolean' ? (
                                    <span className={`px-2.5 py-1 rounded-lg text-xs border shadow-2xs ${getStatusBadgeClass(valStr, c.buttonActions?.[valStr]?.color)}`}>
                                      {valStr === 'true' ? '✓ Conforme' : valStr === 'false' ? '✗ Pendiente' : (isOk ? `✓ ${valStr}` : valStr)}
                                    </span>
                                  ) : (
                                    <div className="flex flex-col items-end gap-0.5">
                                      <span className="text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border-2 border-blue-200 font-bold">
                                        {valStr} {c.unit || ''}
                                      </span>
                                      {c.statusValue && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getStatusBadgeClass(c.statusValue, c.buttonActions?.[c.statusValue]?.color)}`}>
                                          {c.statusValue}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {hasAlarm && (
                                <div className="pt-2 border-t border-rose-100 flex items-start space-x-1.5 text-[11px] text-rose-700 bg-rose-50/50 p-2 rounded-lg">
                                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                                  <span><strong className="text-rose-900 font-bold">Desviación / Alerta detectada:</strong> {c.alarmReason || isCheckpointAlarmActive(c, roundTemplate).reason || 'Equipo detectado en estado de alarma / falla.'}</span>
                                </div>
                              )}

                              {c.notes && (
                                <div className="pt-2 border-t border-slate-100 flex items-start space-x-1.5 text-[11px] text-slate-600 bg-slate-50/70 p-2 rounded-lg">
                                  <MessageSquare className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                                  <span><strong className="text-slate-800 font-semibold">Nota técnica:</strong> {c.notes}</span>
                                </div>
                              )}

                              {/* Checkpoint Attached Photo */}
                              {isValidPhoto(c.photoUrl) && (
                                <div className="pt-2 border-t border-emerald-100 flex items-center justify-between text-[11px] bg-emerald-50/70 p-2.5 rounded-xl border border-emerald-200 shadow-2xs">
                                  <div className="flex items-center space-x-2.5">
                                    <div 
                                      className="w-10 h-10 rounded-lg overflow-hidden bg-emerald-200 shrink-0 border-2 border-emerald-400 cursor-pointer hover:opacity-85 transition-opacity shadow-xs"
                                      onClick={() => openPhotoPreview(c.photoUrl, `${c.title} (${c.area})`)}
                                      title="Clic para ampliar foto en alta resolución"
                                    >
                                      <img src={c.photoUrl} alt="Foto de punto" className="w-full h-full object-cover" />
                                    </div>
                                    <div>
                                      <span className="text-emerald-950 font-bold block">Evidencia fotográfica adjunta</span>
                                      <span className="text-[10px] text-emerald-800">Punto inspeccionado con registro visual</span>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => openPhotoPreview(c.photoUrl, `${c.title} (${c.area})`)}
                                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-extrabold flex items-center space-x-1.5 shadow-2xs cursor-pointer transition-colors"
                                    title="Ver foto en tamaño completo"
                                  >
                                    <Camera className="w-3.5 h-3.5" />
                                    <span>Ver Foto</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>



                  {/* Anomalies */}
                  {(liveSelectedRoundDetail.anomalies || []).length > 0 && (
                    <div className="pt-2">
                      <h4 className="text-xs font-extrabold text-rose-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600" />
                        <span>Incidencias y Averías Reportadas en la Ronda ({(liveSelectedRoundDetail.anomalies || []).length})</span>
                      </h4>
                      <div className="space-y-2.5">
                        {liveSelectedRoundDetail.anomalies.map(a => (
                          <div key={a.id} className="p-3.5 bg-rose-50/80 border border-rose-200 rounded-2xl text-xs space-y-2.5">
                            <div className="flex justify-between items-start gap-2 font-bold text-rose-950">
                              <div className="space-y-0.5">
                                <span className="text-xs font-black text-rose-950">{a.title}</span>
                                <span className="text-[11px] text-rose-700 block font-semibold">📍 {a.area}</span>
                              </div>
                              <span className="uppercase text-[10px] bg-rose-200 text-rose-900 border border-rose-300 px-2 py-0.5 rounded-full font-black shrink-0">
                                {a.severity}
                              </span>
                            </div>

                            <p className="text-slate-800 text-[11px] leading-relaxed">{a.description}</p>

                            {/* Anomaly Photo Preview Button and Card */}
                            {isValidPhoto(a.photoUrl) && (
                              <div className="pt-2.5 border-t border-rose-200/80 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => openPhotoPreview(a.photoUrl, `Incidencia: ${a.title} (${a.area})`)}
                                  className="inline-flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-white hover:bg-rose-100/70 border border-rose-300 text-rose-950 font-bold text-[11px] shadow-2xs transition-colors cursor-pointer group"
                                >
                                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-rose-200 shrink-0 border border-rose-300">
                                    <img 
                                      src={a.photoUrl} 
                                      alt="Foto de anomalía" 
                                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200" 
                                    />
                                  </div>
                                  <div className="text-left">
                                    <span className="flex items-center space-x-1 text-rose-700 font-extrabold">
                                      <Camera className="w-3.5 h-3.5" />
                                      <span>Ver Fotografía de la Falla</span>
                                    </span>
                                    <span className="text-[9px] text-slate-500 block">Clic para ampliar en alta resolución</span>
                                  </div>
                                </button>
                              </div>
                            )}

                            <div className="flex items-center justify-between text-[10px] text-rose-800/80 pt-1">
                              <span>Reportado por: <strong>{a.registeredBy}</strong></span>
                              <span>Estado: <strong className="uppercase">{a.status}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* General Notes & Signature */}
                  <div className="pt-3 border-t border-slate-200 text-xs">
                    <span className="text-slate-500 font-medium">Observaciones generales:</span>
                    <p className="text-slate-800 italic mt-0.5">{liveSelectedRoundDetail.generalNotes || 'Sin observaciones adicionales.'}</p>
                    <div className="mt-3 p-2.5 bg-slate-100 rounded-lg flex items-center justify-between">
                      <span className="text-slate-600 font-medium">Validado por firma digital:</span>
                      <span className="font-extrabold text-slate-900">{liveSelectedRoundDetail.technicianSignature || liveSelectedRoundDetail.technicianName}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200 mt-2">
                {(canDeleteRecords || liveSelectedRoundDetail.status === 'en_progreso') ? (
                  <button
                    type="button"
                    onClick={() => {
                      setRoundToDelete(liveSelectedRoundDetail);
                    }}
                    className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{liveSelectedRoundDetail.status === 'en_progreso' ? 'Descartar esta Ronda' : 'Eliminar esta Ronda'}</span>
                  </button>
                ) : <div />}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      resumeRound(liveSelectedRoundDetail);
                      setSelectedRoundDetail(null);
                    }}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors flex items-center space-x-1.5"
                    title="Reanudar y continuar llenando esta ronda"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>{liveSelectedRoundDetail.status === 'en_progreso' ? 'Continuar Ronda' : 'Reanudar y Completar Puntos'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRoundDetail(null);
                      setModalFilterTab('todos');
                    }}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL DE CONFIRMACIÓN DE DESCARTE DE RONDA EN CURSO */}
      {showDiscardActiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  ¿Descartar Ronda en Curso?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  ¿Estás seguro de que deseas descartar esta ronda en curso? Los datos registrados en este recorrido no se guardarán.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowDiscardActiveConfirm(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  const targetId = activeRound?.id;
                  setShowDiscardActiveConfirm(false);
                  await cancelActiveRound();
                  if (targetId) {
                    await deleteRound(targetId);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 shadow-sm cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sí, Descartar</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE ELIMINACIÓN DE RONDA */}
      {roundToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-slate-900">
                  {roundToDelete.status === 'en_progreso' ? '¿Descartar Ronda en Curso?' : '¿Eliminar Ronda del Historial?'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {roundToDelete.status === 'en_progreso'
                    ? 'Esta acción descartará permanentemente esta ronda en curso y la removerá de todos los dispositivos conectados.'
                    : 'Esta acción borrará permanentemente la ronda en la base de datos de la nube y en todos los dispositivos conectados.'}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 mb-5 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Fecha y Hora:</span>
                <span className="font-semibold text-slate-800">{roundToDelete.date} • {roundToDelete.time}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Turno:</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                  roundToDelete.shift === 'manana' ? 'bg-amber-100 text-amber-800' :
                  roundToDelete.shift === 'tarde' ? 'bg-blue-100 text-blue-800' :
                  'bg-purple-100 text-purple-800'
                }`}>
                  {formatShiftName(roundToDelete.shift, true)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Técnico a Cargo:</span>
                <span className="font-medium text-slate-900">{roundToDelete.technicianName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Puntos Chequeados:</span>
                <span className="font-mono font-medium text-slate-700">{(roundToDelete.checkpoints || []).length} puntos</span>
              </div>
              {(roundToDelete.anomalies || []).length > 0 && (
                <div className="flex justify-between items-center text-amber-700">
                  <span className="font-medium">Incidencias registradas:</span>
                  <span className="font-bold">{(roundToDelete.anomalies || []).length}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setRoundToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{roundToDelete.status === 'en_progreso' ? 'Sí, Descartar Definitivamente' : 'Sí, Eliminar Definitivamente'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TEMPLATE CONFIGURATION MODAL */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-2 sm:p-4">
          <div className="bg-white rounded-2xl p-3 sm:p-6 w-full max-w-3xl max-h-[94vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex items-start justify-between pb-3 sm:pb-4 border-b border-slate-200 gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider">Gestión de Rondas Diarias</span>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 flex items-center space-x-2 mt-0.5">
                  <Wrench className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 shrink-0" />
                  <span className="break-words">Configurar Plantilla, Equipos, Contadores y Cavas</span>
                </h3>
                <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                  Agrega equipos, contadores o neveras. El sistema asignará automáticamente su figura e icono visual. Todos los cambios se guardan y reflejan automáticamente en todos los dispositivos en tiempo real.
                </p>
              </div>
              <button 
                onClick={() => setShowTemplateModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 sm:space-y-6 py-3 sm:py-4 pb-24">
              {/* Form to add or edit item */}
              <form onSubmit={handleAddTemplateItemSubmit} className={`p-3 sm:p-5 rounded-xl sm:rounded-2xl border space-y-3.5 sm:space-y-4.5 w-full min-w-0 ${editingTemplateId ? 'bg-amber-50/60 border-amber-300 shadow-sm' : 'bg-slate-50/90 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center">
                    {editingTemplateId ? (
                      <>
                        <Edit2 className="w-4 h-4 mr-1.5 text-amber-600" />
                        <span className="text-amber-900">Editando Punto / Revisión en Plantilla</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4 mr-1.5 text-blue-600" />
                        <span>Agregar Nuevo Equipo / Inspección / Extracción a la Ronda</span>
                      </>
                    )}
                  </h4>
                  {editingTemplateId && (
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="text-xs text-amber-800 hover:text-amber-950 underline font-semibold"
                    >
                      Cancelar Edición
                    </button>
                  )}
                </div>

                {/* AREA SELECTION & QUICK SUGGESTIONS */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Área o Zona del Hotel
                  </label>
                  <input
                    type="text"
                    value={newItemArea}
                    onChange={(e) => setNewItemArea(e.target.value)}
                    placeholder="ej. Habitaciones - Extracciones, Cocina Principal, Sótano..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <span className="text-[10px] text-slate-400 font-medium self-center mr-0.5">Sugerencias:</span>
                    {Array.from(new Set(roundTemplate.map(item => item.area).filter(Boolean))).sort().map(sug => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setNewItemArea(sug)}
                        className={`text-[10px] px-2 py-0.5 rounded-lg border transition-colors ${
                          newItemArea === sug 
                            ? 'bg-blue-100 text-blue-800 border-blue-300 font-bold' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {sug}
                      </button>
                    ))}
                    {Array.from(new Set(roundTemplate.map(item => item.area).filter(Boolean))).length === 0 && (
                      <span className="text-[10px] text-slate-400 italic self-center">Agrega puntos a la ronda para ver zonas aquí.</span>
                    )}
                  </div>
                </div>

                {/* ITEM NAME */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Equipo, Punto de Control o Extracción
                  </label>
                  <input
                    type="text"
                    value={newItemTitle}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewItemTitle(val);
                      const norm = val.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
                      if (
                        norm.includes('cava') ||
                        norm.includes('refrigera') ||
                        norm.includes('congelad') ||
                        norm.includes('nevera') ||
                        norm.includes('cuarto frio')
                      ) {
                        if (newItemCategory === 'extraccion' || newItemCategory === 'general') {
                          setNewItemCategory('refrigeracion');
                        }
                      } else if (norm.includes('sauna') || norm.includes('cold plunge') || norm.includes('spa')) {
                        if (newItemCategory === 'extraccion' || newItemCategory === 'general') {
                          setNewItemCategory('sauna_cold_plunge');
                        }
                      } else if (norm.includes('tanque') || norm.includes('cisterna')) {
                        if (newItemCategory === 'extraccion' || newItemCategory === 'general') {
                          setNewItemCategory('tanque');
                        }
                      } else if (norm.includes('subestacion') || norm.includes('transformador')) {
                        if (newItemCategory === 'extraccion' || newItemCategory === 'general') {
                          setNewItemCategory('subestacion');
                        }
                      } else if (norm.includes('combustible') || norm.includes('diesel') || norm.includes('acpm')) {
                        if (newItemCategory === 'extraccion' || newItemCategory === 'general') {
                          setNewItemCategory('combustible');
                        }
                      }
                    }}
                    placeholder="ej. Extractor Habitación 201, Cavas de Refrigeración, Subestación Principal, Música Lobby..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 font-medium focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                {/* DROPDOWNS: TYPE & CATEGORY WITH CUSTOMSELECT */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <CustomSelect
                      label="Tipo de Control / Verificación"
                      value={newItemType}
                      onChange={(val) => {
                        const t = val as any;
                        setNewItemType(t);
                        if (t === 'ok_nok') {
                          setNewItemOptions('OK, En Observación, NO OK');
                          setNewItemPreset('ok_obs_nok');
                        }
                      }}
                      options={[
                        { 
                          value: 'ok_nok', 
                          label: 'Verificación Rápida: OK / NO OK', 
                          description: 'Ideal para extracciones, ventiladores, música, iluminación, puertas, etc.',
                          badge: 'Rápido',
                          color: 'emerald',
                          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        },
                        { 
                          value: 'numeric', 
                          label: 'Medición Numérica (Temperaturas, Presión, Contadores)', 
                          description: 'Registra lecturas con unidades (°C, PSI, kWh, m³, V, A, etc.)',
                          color: 'amber',
                          icon: <Gauge className="w-4 h-4 text-amber-600" />
                        }
                      ]}
                    />
                  </div>

                  <div>
                    <CustomSelect
                      label="Categoría / Icono Visual del Equipo"
                      value={newItemCategory}
                      onChange={(val) => setNewItemCategory(val)}
                      options={[
                        { value: 'refrigeracion', label: 'Cavas de Refrigeración / Cuartos Fríos / Neveras', icon: <CavaRefrigerationIcon className="w-4 h-4 text-cyan-600" />, color: 'blue' },
                        { value: 'sauna_cold_plunge', label: 'Sauna / Cold Plunge / Spa / Zona Húmeda', icon: <SaunaColdPlungeIcon className="w-4 h-4 text-cyan-600" />, color: 'cyan' },
                        { value: 'tanque', label: 'Tanques / Depósitos / Almacenamiento de Agua / Cisternas', icon: <TankIcon className="w-4 h-4 text-sky-600" />, color: 'sky' },
                        { value: 'subestacion', label: 'Subestación Eléctrica / Transformador / Media Tensión', icon: <SubstationIcon className="w-4 h-4 text-amber-600" />, color: 'amber' },
                        { value: 'musica', label: 'Música Ambiental / Sistema de Audio / Sonido', icon: <Music className="w-4 h-4 text-violet-600" />, color: 'violet' },
                        { value: 'combustible', label: 'Combustible / Tanque de Diésel / ACPM', icon: <Fuel className="w-4 h-4 text-orange-600" />, color: 'orange' },
                        { value: 'hidraulico', label: 'Bombas de Agua / Red Hidráulica', icon: <WaterPumpIcon className="w-4 h-4 text-blue-600" />, color: 'blue' },
                        { value: 'manometro', label: 'Manómetros / Presión / PSI / Bar', icon: <ManometerIcon className="w-4 h-4 text-blue-600" />, color: 'blue' },
                        { value: 'extraccion', label: 'Extracción / Ventilación / Clima', icon: <Wind className="w-4 h-4 text-teal-600" />, color: 'teal' },
                        { value: 'condensador', label: 'Condensadores / Unidades Condensadoras', icon: <CondenserIcon className="w-4 h-4 text-cyan-600" />, color: 'cyan' },
                        { value: 'temperatura', label: 'Temperatura / Termómetros / Sensores', icon: <Thermometer className="w-4 h-4 text-rose-500" />, color: 'rose' },
                        { value: 'habitaciones', label: 'Habitaciones / Baños / Puertas', icon: <DoorClosed className="w-4 h-4 text-indigo-600" />, color: 'indigo' },
                        { value: 'caldera', label: 'Calderas / Agua Caliente ACS', icon: <Flame className="w-4 h-4 text-amber-600" />, color: 'amber' },
                        { value: 'iluminacion', label: 'Iluminación / Tableros Eléctricos', icon: <Lightbulb className="w-4 h-4 text-amber-500" />, color: 'amber' },
                        { value: 'contador', label: 'Contadores y Medidores de Consumo', icon: <Gauge className="w-4 h-4 text-emerald-600" />, color: 'emerald' },
                        { value: 'bateria', label: 'Batería / Banco de Baterías / UPS', icon: <Battery className="w-4 h-4 text-emerald-600" />, color: 'emerald' },
                        { value: 'general', label: 'Inspección General / Otros', icon: <Shield className="w-4 h-4 text-slate-600" />, color: 'slate' },
                      ]}
                    />
                  </div>
                </div>

                {/* CONDITIONAL CONTROLS BASED ON TYPE */}
                {(newItemType === 'ok_nok' || newItemType === 'options') && (
                  <div className="space-y-3">
                    {/* Quick presets for OK / NO OK / Music / Tanks */}
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span className="text-[10px] font-semibold text-slate-400">Atajos rápidos:</span>
                      <button
                        type="button"
                        onClick={() => {
                          setNewItemTitle('Tanque de Agua Potable / Reserva');
                          setNewItemArea('Cuarto de Tanques de Agua');
                          setNewItemCategory('tanque');
                          setNewItemOptions('Nivel Óptimo (100%), Nivel Normal (75%), Nivel Medio (50%), Nivel Bajo / Crítico');
                          setNewItemInstructions('Verificar nivel en visor/flotador, estanqueidad, ausencia de fugas y tapas cerradas.');
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 font-medium"
                      >
                        🛢️ Tanque de Agua
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewItemTitle('Sistema de Música Ambiental');
                          setNewItemArea('Zonas Comunes - Música Ambiental');
                          setNewItemCategory('musica');
                          setNewItemOptions('Sonando OK, En Observación, Sin Audio / Apagado');
                          setNewItemInstructions('Verificar volumen agradable y parlantes operando en zonas comunes.');
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200 font-medium"
                      >
                        🎵 Música Ambiental
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewItemTitle('Subestación Eléctrica General');
                          setNewItemArea('Subestación Eléctrica');
                          setNewItemCategory('subestacion');
                          setNewItemOptions('Normal / Sin Alarmas, En Observación, Alarmado / Falla');
                          setNewItemInstructions('Inspección visual de celdas, transformador y estado de ventilación.');
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-medium"
                      >
                        ⚡ Subestación Eléctrica
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewItemTitle('Sauna y Cold Plunge');
                          setNewItemArea('Zona Húmeda / Spa & Wellness');
                          setNewItemCategory('sauna_cold_plunge');
                          setNewItemOptions('Operando OK, En Observación, Fuera de Servicio');
                          setNewItemInstructions('Inspección de temperatura en tina de inmersión en frío y cabina sauna, verificación de recirculación y aseo.');
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-lg bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200 font-medium"
                      >
                        🧖‍♂️ Sauna & Cold Plunge
                      </button>
                    </div>

                    <CustomButtonBuilder
                      label="Configuración de Botones de Estado y Opciones"
                      description="Diseña y crea a tu gusto los botones interactivos que saldrán en este punto para el técnico"
                      value={newItemOptions}
                      onChange={(val) => {
                        setNewItemOptions(val);
                        setNewItemPreset('custom');
                      }}
                      buttonActions={newItemButtonActions}
                      onButtonActionsChange={setNewItemButtonActions}
                      placeholder="Escribe el nombre de tu botón (ej. Encendido, Apagado, Alarmado, etc.)..."
                      badge="Botones de Estado"
                    />
                  </div>
                )}

                {newItemType === 'numeric' && (
                  <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h5 className="text-xs font-bold text-slate-850 flex items-center space-x-1.5">
                          <span>Campos de Medición Numérica ({newItemFields.length})</span>
                        </h5>
                        <p className="text-[11px] text-slate-500">
                          Configure uno o varios campos de medición (ej. 2 temperaturas para cavas, o voltaje y amperaje para baterías).
                        </p>
                      </div>

                      {/* Quick multi-field presets */}
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                        <span className="text-[10px] font-semibold text-slate-400">Plantillas:</span>
                        <button
                          type="button"
                          onClick={() => {
                            setNewItemTitle('Tanque de Agua Potable y Reserva');
                            setNewItemArea('Cuarto de Tanques de Agua');
                            setNewItemCategory('tanque');
                            setNewItemFields([
                              { id: '1', name: 'Nivel Tanque Principal', unit: '%', minValue: 35, maxValue: 100 },
                              { id: '2', name: 'Nivel Tanque Reserva', unit: '%', minValue: 35, maxValue: 100 },
                              { id: '3', name: 'Presión Entrada Red', unit: 'PSI', minValue: 30, maxValue: 70 }
                            ]);
                            setNewItemIncludeStatus(true);
                            setNewItemOptions('Normal / Lleno, En Recarga, Nivel Crítico');
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 font-medium"
                        >
                          🛢️ Tanques (% + PSI)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewItemTitle('Subestación Eléctrica Principal');
                            setNewItemArea('Subestación Eléctrica');
                            setNewItemCategory('subestacion');
                            setNewItemFields([
                              { id: '1', name: 'Voltaje L-L', unit: 'V', minValue: 208, maxValue: 230 },
                              { id: '2', name: 'Corriente Total', unit: 'A', minValue: 10, maxValue: 150 },
                              { id: '3', name: 'Temperatura Transformador', unit: '°C', minValue: 20, maxValue: 75 }
                            ]);
                            setNewItemIncludeStatus(true);
                            setNewItemOptions('Normal OK, En Observación, Alarmado');
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-medium"
                        >
                          ⚡ Subestación (V + A + °C)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewItemTitle('Cavas de Refrigeración');
                            setNewItemArea('Cocina Principal / Cavas');
                            setNewItemCategory('refrigeracion');
                            setNewItemFields([
                              { id: '1', name: 'Cava Conservación 1', unit: '°C', minValue: 0, maxValue: 4 },
                              { id: '2', name: 'Cava Congelación 2', unit: '°C', minValue: -25, maxValue: -18 }
                            ]);
                            setNewItemIncludeStatus(true);
                            setNewItemOptions('OK, En Observación, NO OK');
                            setNewItemInstructions('Verificar temperaturas de conservación (0°C a 4°C) y congelación (-18°C a -25°C), empaques herméticos y ausencia de hielo excesivo.');
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 font-medium"
                        >
                          ❄️ Cavas de Refrigeración (°C)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewItemFields([
                              { id: '1', name: 'Voltaje Batería', unit: 'VDC', minValue: 12.4, maxValue: 13.8 },
                              { id: '2', name: 'Amperaje / Carga', unit: 'A', minValue: 0.5, maxValue: 10 }
                            ]);
                            setNewItemIncludeStatus(true);
                            setNewItemOptions('OK, En Observación, NO OK');
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 font-medium"
                        >
                          🔋 Baterías (V + A)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewItemTitle('Sauna y Cold Plunge');
                            setNewItemArea('Zona Húmeda / Spa & Wellness');
                            setNewItemCategory('sauna_cold_plunge');
                            setNewItemFields([
                              {
                                id: '1',
                                name: 'Cold Plunge (Tina Fría)',
                                unit: '°C',
                                minValue: 4,
                                maxValue: 12,
                                includeButtons: true,
                                options: 'Operando, Standby, Apagado',
                                buttonActions: {
                                  'Operando': { actionType: 'turn_on', color: 'cyan' },
                                  'Standby': { actionType: 'default', color: 'amber' },
                                  'Apagado': { actionType: 'turn_off', color: 'slate' }
                                }
                              },
                              {
                                id: '2',
                                name: 'Temperatura Sauna Seco',
                                unit: '°C',
                                minValue: 70,
                                maxValue: 90,
                                includeButtons: true,
                                options: 'Operando, Standby, Apagado',
                                buttonActions: {
                                  'Operando': { actionType: 'turn_on', color: 'amber' },
                                  'Standby': { actionType: 'default', color: 'slate' },
                                  'Apagado': { actionType: 'turn_off', color: 'rose' }
                                }
                              }
                            ]);
                            setNewItemIncludeStatus(true);
                            setNewItemOptions('Operando, Standby, Fuera de Servicio');
                            setNewItemInstructions('Verificar temperaturas de inmersión en frío (Cold Plunge: 4°C - 12°C), cabina sauna (70°C - 90°C), filtrado e higiene.');
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200 font-medium"
                        >
                          🧖‍♂️ Sauna & Cold Plunge (°C)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewItemFields([
                              { id: '1', name: 'Factor de Potencia', unit: 'FP', minValue: 0.85, maxValue: 1.0 },
                              { id: '2', name: 'Pasos Activos', unit: 'Unidades', minValue: 0, maxValue: 12 }
                            ]);
                            setNewItemCategory('contador');
                            setNewItemTitle('Banco de Condensadores');
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200 font-medium"
                        >
                          ⚡ Factor de Potencia
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewItemFields([
                              { id: '1', name: 'Fase L1', unit: 'A', minValue: 10, maxValue: 50 },
                              { id: '2', name: 'Fase L2', unit: 'A', minValue: 10, maxValue: 50 },
                              { id: '3', name: 'Fase L3', unit: 'A', minValue: 10, maxValue: 50 }
                            ]);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 font-medium"
                        >
                          ⚡ Trifásico (3 Fases)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewItemFields([
                              { id: '1', name: 'Presión Succión', unit: 'PSI', minValue: 20, maxValue: 40 },
                              { id: '2', name: 'Presión Descarga', unit: 'PSI', minValue: 60, maxValue: 90 }
                            ]);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 font-medium"
                        >
                          💧 Presión Bombas
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewItemFields([
                              { id: '1', name: 'Nivel Tanque Principal', unit: '%', minValue: 30, maxValue: 100 },
                              { id: '2', name: 'Volumen Actual', unit: 'Gal', minValue: 50, maxValue: 500 },
                              { id: '3', name: 'Nivel Tanque Diario', unit: '%', minValue: 40, maxValue: 100 }
                            ]);
                          }}
                          className="text-[10px] px-2 py-0.5 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 font-medium"
                        >
                          ⛽ Combustible / ACPM
                        </button>
                      </div>
                    </div>

                    {/* Fields List */}
                    <div className="space-y-3 w-full min-w-0">
                      {newItemFields.map((field, idx) => (
                        <div key={field.id || idx} className="p-2.5 sm:p-3 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2.5 w-full min-w-0 overflow-visible">
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[10px]">
                                {idx + 1}
                              </span>
                              <span>Campo de Medición {idx + 1}</span>
                            </span>

                            {newItemFields.length > 1 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setNewItemFields(newItemFields.filter((_, i) => i !== idx));
                                }}
                                className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold flex items-center space-x-1 hover:bg-rose-50 px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Eliminar campo</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                            {/* Field Name */}
                            <div className="sm:col-span-4">
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Nombre / Etiqueta del Campo:
                              </label>
                              <input
                                type="text"
                                value={field.name}
                                onChange={(e) => {
                                  const updated = [...newItemFields];
                                  updated[idx] = { ...updated[idx], name: e.target.value };
                                  setNewItemFields(updated);
                                }}
                                placeholder={idx === 0 ? "ej. Cava Congelación 1" : "ej. Cava Congelación 2"}
                                className="w-full px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-medium text-slate-900"
                              />
                            </div>

                            {/* Unit */}
                            <div className="sm:col-span-3">
                              <CustomSelect
                                label="Unidad:"
                                value={['°C', '°F', 'V', 'VDC', 'A', 'PSI', 'Bar', 'kWh', 'm³', '%', 'PPM', 'RPM', 'L/min', 'kW', 'FP'].includes(field.unit) ? field.unit : 'CUSTOM'}
                                onChange={(val) => {
                                  const updated = [...newItemFields];
                                  updated[idx] = { ...updated[idx], unit: val === 'CUSTOM' ? '' : val };
                                  setNewItemFields(updated);
                                }}
                                options={[
                                  { value: '°C', label: '°C (Temperatura)', color: 'blue' },
                                  { value: '°F', label: '°F (Fahrenheit)', color: 'blue' },
                                  { value: 'V', label: 'V (Voltios AC)', color: 'emerald' },
                                  { value: 'VDC', label: 'VDC (Voltaje Baterías DC)', color: 'emerald' },
                                  { value: 'A', label: 'A (Amperios - Corriente)', color: 'amber' },
                                  { value: 'PSI', label: 'PSI (Presión)', color: 'indigo' },
                                  { value: 'Bar', label: 'Bar (Presión)', color: 'indigo' },
                                  { value: 'kWh', label: 'kWh (Consumo Eléctrico)', color: 'amber' },
                                  { value: 'm³', label: 'm³ (Agua / Gas)', color: 'emerald' },
                                  { value: '%', label: '% (Porcentaje / Nivel)', color: 'slate' },
                                  { value: 'PPM', label: 'PPM (Cloro / Químicos)', color: 'cyan' },
                                  { value: 'RPM', label: 'RPM (Velocidad)', color: 'slate' },
                                  { value: 'L/min', label: 'L/min (Caudal)', color: 'blue' },
                                  { value: 'kW', label: 'kW (Potencia)', color: 'amber' },
                                  { value: 'FP', label: 'FP (Factor de Potencia)', color: 'teal' },
                                  { value: 'CUSTOM', label: '✏️ Otra unidad...', color: 'slate' },
                                ]}
                              />
                              {!['°C', '°F', 'V', 'VDC', 'A', 'PSI', 'Bar', 'kWh', 'm³', '%', 'PPM', 'RPM', 'L/min', 'kW', 'FP'].includes(field.unit) && (
                                <input
                                  type="text"
                                  value={field.unit}
                                  onChange={(e) => {
                                    const updated = [...newItemFields];
                                    updated[idx] = { ...updated[idx], unit: e.target.value };
                                    setNewItemFields(updated);
                                  }}
                                  placeholder="Escriba unidad..."
                                  className="w-full mt-1.5 px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold"
                                />
                              )}
                            </div>

                            {/* Safe Min */}
                            <div className="sm:col-span-2">
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Mínimo Seguro:
                              </label>
                              <DecimalInput
                                value={field.minValue !== undefined ? String(field.minValue) : ''}
                                onChange={(val) => {
                                  const updated = [...newItemFields];
                                  updated[idx] = { ...updated[idx], minValue: val !== '' ? (val as any) : undefined };
                                  setNewItemFields(updated);
                                }}
                                onBlur={(val) => {
                                  const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                                  const updated = [...newItemFields];
                                  updated[idx] = { ...updated[idx], minValue: !isNaN(parsed) ? parsed : undefined };
                                  setNewItemFields(updated);
                                }}
                                placeholder="ej. -25"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-center"
                              />
                            </div>

                            {/* Safe Max */}
                            <div className="sm:col-span-3">
                              <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                                Máximo Seguro:
                              </label>
                              <DecimalInput
                                value={field.maxValue !== undefined ? String(field.maxValue) : ''}
                                onChange={(val) => {
                                  const updated = [...newItemFields];
                                  updated[idx] = { ...updated[idx], maxValue: val !== '' ? (val as any) : undefined };
                                  setNewItemFields(updated);
                                }}
                                onBlur={(val) => {
                                  const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                                  const updated = [...newItemFields];
                                  updated[idx] = { ...updated[idx], maxValue: !isNaN(parsed) ? parsed : undefined };
                                  setNewItemFields(updated);
                                }}
                                placeholder="ej. -18"
                                className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-semibold text-center"
                              />
                            </div>
                          </div>

                          {/* Botones de Estado Individuales para este Campo */}
                          <div className="pt-2.5 border-t border-slate-100 space-y-2">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                              <label className="flex items-center space-x-2 text-xs font-bold text-slate-800 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={!!field.includeButtons}
                                  onChange={(e) => {
                                    const updated = [...newItemFields];
                                    const willInclude = e.target.checked;
                                    updated[idx] = {
                                      ...updated[idx],
                                      includeButtons: willInclude,
                                      options: willInclude && !updated[idx].options ? 'Encendido, Apagado' : updated[idx].options,
                                      buttonActions: willInclude && (!updated[idx].buttonActions || Object.keys(updated[idx].buttonActions || {}).length === 0) ? {
                                        'Apagado': { actionType: 'turn_off', color: 'slate' },
                                        'Encendido': { actionType: 'turn_on', color: 'emerald' }
                                      } : updated[idx].buttonActions
                                    };
                                    setNewItemFields(updated);
                                  }}
                                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                                />
                                <span className="flex items-center space-x-1.5">
                                  <span>🔘 Botones interactivos en este campo</span>
                                  {field.includeButtons && (
                                    <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded-md border border-blue-200">
                                      Habilitado
                                    </span>
                                  )}
                                </span>
                              </label>

                              {field.includeButtons && (
                                <div className="flex items-center space-x-1 flex-wrap gap-1">
                                  <span className="text-[10px] text-slate-400 font-medium">Plantillas:</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...newItemFields];
                                      updated[idx] = {
                                        ...updated[idx],
                                        options: 'Encendido, Apagado',
                                        buttonActions: {
                                          'Apagado': { actionType: 'turn_off', color: 'slate' },
                                          'Encendido': { actionType: 'turn_on', color: 'emerald' }
                                        }
                                      };
                                      setNewItemFields(updated);
                                    }}
                                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 transition-colors cursor-pointer"
                                  >
                                    Encendido / Apagado
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...newItemFields];
                                      updated[idx] = {
                                        ...updated[idx],
                                        options: 'Operando, Standby, Fuera de Servicio',
                                        buttonActions: {
                                          'Operando': { actionType: 'turn_on', color: 'emerald' },
                                          'Standby': { actionType: 'default', color: 'amber' },
                                          'Fuera de Servicio': { actionType: 'turn_off', color: 'rose' }
                                        }
                                      };
                                      setNewItemFields(updated);
                                    }}
                                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 transition-colors cursor-pointer"
                                  >
                                    Operando / Standby / Falla
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...newItemFields];
                                      updated[idx] = {
                                        ...updated[idx],
                                        options: 'OK, En Observación, NO OK',
                                        buttonActions: {
                                          'OK': { actionType: 'default', color: 'emerald' },
                                          'En Observación': { actionType: 'default', color: 'amber' },
                                          'NO OK': { actionType: 'failure', color: 'rose' }
                                        }
                                      };
                                      setNewItemFields(updated);
                                    }}
                                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold border border-slate-300 transition-colors cursor-pointer"
                                  >
                                    OK / NO OK
                                  </button>
                                </div>
                              )}
                            </div>

                            {field.includeButtons && (
                              <div className="mt-2 p-1.5 sm:p-2.5 bg-slate-50/90 rounded-xl border border-slate-200/90 space-y-2 w-full min-w-0">
                                <CustomButtonBuilder
                                  label={`Configurar botones de "${field.name || `Medición ${idx + 1}`}"`}
                                  description="Agrega o modifica los botones con sus colores y comportamientos (ej. Apagar bloquea en 0, Encender habilita cifra)"
                                  value={field.options || 'Encendido, Apagado'}
                                  onChange={(val) => {
                                    const updated = [...newItemFields];
                                    updated[idx] = { ...updated[idx], options: val };
                                    setNewItemFields(updated);
                                  }}
                                  buttonActions={field.buttonActions || {}}
                                  onButtonActionsChange={(actions) => {
                                    const updated = [...newItemFields];
                                    updated[idx] = { ...updated[idx], buttonActions: actions };
                                    setNewItemFields(updated);
                                  }}
                                  placeholder="ej. Encendido, Apagado, Standby..."
                                  badge={`Botones Campo ${idx + 1}`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Button to add another field */}
                    <div className="flex justify-start">
                      <button
                        type="button"
                        onClick={() => {
                          const lastUnit = newItemFields[newItemFields.length - 1]?.unit || '°C';
                          setNewItemFields([
                            ...newItemFields,
                            {
                              id: String(Date.now()),
                              name: `Medición ${newItemFields.length + 1}`,
                              unit: lastUnit,
                              minValue: newItemFields[0]?.minValue,
                              maxValue: newItemFields[0]?.maxValue,
                              isCustomUnit: false,
                              customUnitValue: '',
                              includeButtons: false,
                              options: 'Encendido, Apagado',
                              buttonActions: {}
                            }
                          ]);
                        }}
                        className="w-full sm:w-auto px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-xl border border-blue-200 transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <PlusCircle className="w-4 h-4 text-blue-600" />
                        <span>+ Agregar Otro Campo de Medición a este Punto</span>
                      </button>
                    </div>

                    {/* Status Buttons Toggle for Numeric Items */}
                    <div className="pt-3 border-t border-slate-200/80 space-y-3 w-full min-w-0">
                      <div className="flex items-start sm:items-center space-x-2">
                        <input
                          type="checkbox"
                          id="include-status-check"
                          checked={newItemIncludeStatus}
                          onChange={(e) => {
                            setNewItemIncludeStatus(e.target.checked);
                            if (e.target.checked && !newItemStatusOptions.trim()) {
                              setNewItemStatusOptions('Encendido, Apagado, Alarmado');
                            }
                          }}
                          className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 mt-0.5 sm:mt-0 cursor-pointer shrink-0"
                        />
                        <label htmlFor="include-status-check" className="text-xs font-bold text-slate-850 cursor-pointer">
                          Incluir también botones de estado de verificación rápida (ej. Encendido / Apagado / Alarmado, o OK / NO OK)
                        </label>
                      </div>

                      {newItemIncludeStatus && (
                        <div className="w-full min-w-0">
                          <CustomButtonBuilder
                            label="Botones de Estado que saldrán junto a las mediciones"
                            description="Diseña tus propios botones a tu gusto para que el técnico los seleccione al registrar los valores"
                            value={newItemStatusOptions}
                            onChange={(val) => setNewItemStatusOptions(val)}
                            buttonActions={newItemButtonActions}
                            onButtonActionsChange={setNewItemButtonActions}
                            placeholder="Escribe tu botón (ej. Encendido, Apagado, Alarmado, Standby)..."
                            badge="Medición + Botones"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* GUIDANCE / INSTRUCTIONS FOR TECHNICIAN */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Guía / Instrucciones de Inspección para el Técnico (Opcional)
                  </label>
                  <input
                    type="text"
                    value={newItemInstructions}
                    onChange={(e) => setNewItemInstructions(e.target.value)}
                    placeholder="ej. Comprobar que no vibre, succione adecuadamente y la rejilla esté libre de polvo"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-800 placeholder:text-slate-400"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Este mensaje aparecerá como una guía de ayuda visual para el técnico durante la ronda.
                  </p>
                </div>

                {/* ADVANCED CHECKBOXES */}
                <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2.5 text-xs">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="allow-notes-check"
                      checked={newItemAllowNotes}
                      onChange={(e) => setNewItemAllowNotes(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <label htmlFor="allow-notes-check" className="font-semibold text-slate-800">
                      Permitir al técnico registrar comentarios y notas sobre cómo encontró el equipo
                    </label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="crit-check"
                      checked={newItemCritical}
                      onChange={(e) => setNewItemCritical(e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <label htmlFor="crit-check" className="font-semibold text-slate-800">
                      Punto crítico para la operación del hotel (Genera alertas de atención prioritaria)
                    </label>
                  </div>
                </div>

                {/* PHOTO MODE & EVIDENCE CONFIGURATION */}
                <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-200/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-bold text-emerald-900">
                      <Camera className="w-4 h-4 text-emerald-600" />
                      <span>Configuración de Fotografías / Evidencia en Ronda</span>
                    </div>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100 font-bold px-2 py-0.5 rounded-full">
                      Modo Normal o IA
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600">
                    Define cómo tomará la foto el técnico para este punto: Foto normal estándar (evidencia visual) o Foto con IA (lectura automática de números/contadores).
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewItemPhotoMode('none')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        newItemPhotoMode === 'none'
                          ? 'bg-white border-slate-500 ring-2 ring-slate-400 font-bold shadow-xs'
                          : 'bg-white/70 border-slate-200 hover:bg-white text-slate-600'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-base">🚫</span>
                        <div>
                          <div className="text-xs font-bold text-slate-800">Sin Foto</div>
                          <div className="text-[10px] text-slate-500">No solicita foto al técnico</div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewItemPhotoMode('normal')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        newItemPhotoMode === 'normal'
                          ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400 font-bold shadow-xs text-blue-900'
                          : 'bg-white/70 border-slate-200 hover:bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-base">📷</span>
                        <div>
                          <div className="text-xs font-bold text-blue-900">Foto Normal</div>
                          <div className="text-[10px] text-blue-700">Evidencia estándar sin IA</div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewItemPhotoMode('ai')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        newItemPhotoMode === 'ai'
                          ? 'bg-purple-50 border-purple-500 ring-2 ring-purple-400 font-bold shadow-xs text-purple-900'
                          : 'bg-white/70 border-slate-200 hover:bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-base">⚡</span>
                        <div>
                          <div className="text-xs font-bold text-purple-900">Foto con IA</div>
                          <div className="text-[10px] text-purple-700">Reconoce números y contadores</div>
                        </div>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewItemPhotoMode('both')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        newItemPhotoMode === 'both'
                          ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400 font-bold shadow-xs text-emerald-900'
                          : 'bg-white/70 border-slate-200 hover:bg-white text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-base">✨</span>
                        <div>
                          <div className="text-xs font-bold text-emerald-900">Ambas Opciones</div>
                          <div className="text-[10px] text-emerald-700">Muestra botón Normal e IA</div>
                        </div>
                      </div>
                    </button>
                  </div>

                  {newItemPhotoMode !== 'none' && (
                    <div className="pt-2 border-t border-emerald-200/60 flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="photo-required-check"
                        checked={newItemPhotoRequired}
                        onChange={(e) => setNewItemPhotoRequired(e.target.checked)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                      />
                      <label htmlFor="photo-required-check" className="text-xs font-semibold text-emerald-950 cursor-pointer">
                        📸 Foto obligatoria para validar este punto en la ronda
                      </label>
                    </div>
                  )}
                </div>

                {/* SUGGESTED NOTES / QUICK BUTTONS CONFIGURATION */}
                {newItemAllowNotes && (
                  <div className="p-4 bg-blue-50/50 rounded-xl border border-blue-200/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-xs font-bold text-blue-900">
                        <MessageSquare className="w-4 h-4 text-blue-600" />
                        <span>Opciones Rápidas / Botones de Comentario para el Técnico</span>
                      </div>
                      <span className="text-[10px] text-blue-700 bg-blue-100 font-bold px-2 py-0.5 rounded-full">
                        Personalizable
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-600">
                      Personaliza los botones de un clic que verá el técnico debajo del campo de comentarios (ej. <em>Rejilla limpia, Ruido anormal, Filtro sucio</em>).
                    </p>

                    {/* Presets selector */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-[11px] font-semibold text-slate-700">
                          Cargar plantilla rápida de opciones sugeridas:
                        </label>
                        {newItemSuggestedNotes.trim() && (
                          <button
                            type="button"
                            onClick={() => {
                              setNewItemSuggestedNotes('');
                              setNewItemNotesPreset('none');
                            }}
                            className="text-[10px] text-rose-600 hover:text-rose-800 font-bold hover:underline cursor-pointer"
                          >
                            🗑️ Quitar todos los botones
                          </button>
                        )}
                      </div>
                      <CustomSelect
                        value={newItemNotesPreset}
                        onChange={(val) => {
                          setNewItemNotesPreset(val);
                          if (val === 'none') {
                            setNewItemSuggestedNotes('');
                          } else if (val === 'general') {
                            setNewItemSuggestedNotes('En buen estado, Ruido anormal, Filtro sucio, Vibración leve, Apagado por usuario, Revisado OK');
                          } else if (val === 'extraccion') {
                            setNewItemSuggestedNotes('Rejilla limpia, Succionando bien, Filtro sucio, Ruido anormal, Apagado por usuario, Revisado OK');
                          } else if (val === 'bombas') {
                            setNewItemSuggestedNotes('Presión normal, Sin fugas, Sello mecánico OK, Sin cavitación, Vibración normal, Revisado OK');
                          } else if (val === 'tableros') {
                            setNewItemSuggestedNotes('Voltaje estable, Térmicos OK, Sin sobrecalentamiento, Cableado ordenado, Limpio, Revisado OK');
                          } else if (val === 'frio') {
                            setNewItemSuggestedNotes('Enfriando normal, Puerta hermética, Sin escarcha excesiva, Drenaje libre, Filtro limpio, Revisado OK');
                          } else if (val === 'calderas') {
                            setNewItemSuggestedNotes('Presión de vapor OK, Llama azul estable, Sin fugas de gas, Válvula de alivio OK, Purga realizada');
                          } else if (val === 'baterias') {
                            setNewItemSuggestedNotes('Voltaje normal, Carga flotante OK, Sin sulfatación en bornes, Temperatura normal, Sin hinchamiento, Autonomía OK');
                          } else if (val === 'combustible') {
                            setNewItemSuggestedNotes('Nivel normal, Sin fugas en tubería, Válvula de paso abierta, Filtro trampa purgado, Contenedor de derrame limpio, Medición conforme');
                          } else if (val === 'condensador') {
                            setNewItemSuggestedNotes('Aletas y serpentín limpios, Ventilador sin vibración, Presión normal, Sin fugas de refrigerante, Motor OK, Revisado OK');
                          } else if (val === 'temperatura') {
                            setNewItemSuggestedNotes('Temperatura dentro de rango, Sensor calibrado, Sin fluctuación térmica, Alarma inactiva, Registro conforme');
                          }
                        }}
                        options={[
                          { value: 'none', label: '🚫 Sin opciones rápidas (No mostrar botones al técnico)', color: 'slate' },
                          { value: 'combustible', label: '⛽ Combustible / ACPM (Nivel normal, Sin fugas, Válvula abierta, Filtro OK...)', color: 'orange' },
                          { value: 'bombas', label: '💧 Bombas / Hidráulico (Presión normal, Sin fugas, Sello OK...)', color: 'blue' },
                          { value: 'general', label: '🛡️ General Estándar (Buen estado, Ruido, Filtro, Vibración...)', color: 'blue' },
                          { value: 'condensador', label: '🌀 Condensadores (Aletas limpias, Ventilador OK, Sin fugas...)', color: 'cyan' },
                          { value: 'temperatura', label: '🌡️ Temperatura (En rango normal, Sensor calibrado, Registro OK...)', color: 'rose' },
                          { value: 'extraccion', label: '💨 Ventilación / Extracción (Rejilla limpia, Succionando, Filtro sucio...)', color: 'cyan' },
                          { value: 'tableros', label: '⚡ Eléctrico / Tableros (Voltaje estable, Térmicos OK, Limpio...)', color: 'amber' },
                          { value: 'baterias', label: '🔋 Baterías / UPS (Voltaje normal, Carga flotante, Bornes limpios...)', color: 'emerald' },
                          { value: 'frio', label: '❄️ Clima / Cavas (Enfriando normal, Puerta hermética, Sin escarcha...)', color: 'cyan' },
                          { value: 'calderas', label: '🔥 Calderas / Calentadores (Llama azul, Presión vapor OK, Sin fugas...)', color: 'rose' },
                          { value: 'custom', label: '✏️ Escribir mis propias opciones a mi gusto', color: 'slate' },
                        ]}
                      />
                    </div>

                    {/* Comma-separated input */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Escriba las opciones que quiera que salgan (o déjelo vacío si no quiere botones):
                      </label>
                      <input
                        type="text"
                        value={newItemSuggestedNotes}
                        onChange={(e) => {
                          setNewItemSuggestedNotes(e.target.value);
                          setNewItemNotesPreset(e.target.value.trim() ? 'custom' : 'none');
                        }}
                        placeholder="Deje vacío para no mostrar botones, o escriba ej: Rejilla limpia, Ruido anormal..."
                        className="w-full px-3.5 py-2 rounded-xl border border-blue-300 bg-white text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Interactive Live Preview of buttons */}
                    <div>
                      <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                        Vista previa de cómo le saldrán los botones al técnico:
                      </span>
                      <div className="flex flex-wrap gap-1.5 p-2.5 bg-white rounded-xl border border-blue-200 min-h-10 items-center">
                        {newItemSuggestedNotes.split(',').map(s => s.trim()).filter(Boolean).map((tag, idx) => (
                          <span
                            key={`preview-tag-${idx}-${tag}`}
                            className="inline-flex items-center text-[11px] px-2.5 py-1 rounded-lg bg-blue-50 text-blue-800 font-semibold border border-blue-200 shadow-2xs"
                          >
                            + {tag}
                          </span>
                        ))}
                        {newItemSuggestedNotes.split(',').map(s => s.trim()).filter(Boolean).length === 0 && (
                          <span className="text-[11px] text-slate-500 font-medium italic">
                            🚫 Ningún botón se mostrará al técnico para este punto (campo de comentario limpio).
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
                  {editingTemplateId && (
                    <button
                      type="button"
                      onClick={cancelEditing}
                      className="w-full sm:w-auto px-4 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors text-center"
                    >
                      Cancelar Edición
                    </button>
                  )}
                  <button
                    type="submit"
                    className={`w-full sm:w-auto px-5 py-2.5 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center space-x-1.5 ${editingTemplateId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-blue-600 hover:bg-blue-700'}`}
                  >
                    {editingTemplateId ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Guardar Cambios del Punto</span>
                      </>
                    ) : (
                      <>
                        <PlusCircle className="w-4 h-4" />
                        <span>Añadir a la Plantilla de Rondas</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Template Items List */}
              <div>
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Puntos y Equipos Configurados en la Plantilla ({roundTemplate.length})
                  </h4>
                  <div className="flex items-center space-x-2">
                    {canDeleteRecords && (
                      <button
                        type="button"
                        onClick={() => clearAllRoundTemplate()}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold rounded-lg transition-colors flex items-center space-x-1"
                        title="Borrar todos los puntos creados"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Borrar Todos (Vaciar)</span>
                      </button>
                    )}
                    {canEditSettings && (
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('¿Restaurar la plantilla de rondas a los valores predeterminados de fábrica?')) {
                            resetRoundTemplateToDefault();
                          }
                        }}
                        className="text-xs text-slate-600 hover:text-slate-900 font-semibold"
                      >
                        Restaurar Predeterminados
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                  {roundTemplate.map(item => (
                    <div 
                      key={item.id} 
                      className={`p-2.5 sm:p-3.5 bg-white rounded-xl border-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs transition-all shadow-2xs gap-2 sm:gap-0 ${
                        editingTemplateId === item.id 
                          ? 'border-amber-400 bg-amber-50/70 ring-2 ring-amber-300' 
                          : 'border-slate-300 hover:border-blue-400'
                      }`}
                    >
                      <div className="flex items-start sm:items-center space-x-2.5 sm:space-x-3 min-w-0 flex-1">
                        <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0 shadow-2xs border border-slate-200">
                          {getRoundItemIcon(item.title, item.category)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                            <span className="font-extrabold text-slate-900 text-xs">{item.title}</span>
                            {item.isCritical && (
                              <span className="text-[10px] bg-rose-100 text-rose-800 border border-rose-300 px-1.5 py-0.2 rounded font-bold">
                                ⚠️ Crítico
                              </span>
                            )}
                            <span className="text-[10px] bg-blue-100 text-blue-800 border border-blue-300 px-2 py-0.2 rounded-md font-bold uppercase">
                              {item.type === 'ok_nok' ? 'OK / NO OK' : item.type}
                            </span>
                            {item.category && (
                              <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-medium border border-slate-200 capitalize">
                                {item.category}
                              </span>
                            )}
                            {item.photoMode === 'normal' && (
                              <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.2 rounded font-bold border border-blue-200">
                                📷 Foto Normal
                              </span>
                            )}
                            {item.photoMode === 'ai' && (
                              <span className="text-[10px] bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-bold border border-purple-200">
                                ⚡ Foto IA
                              </span>
                            )}
                            {item.photoMode === 'both' && (
                              <span className="text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-bold border border-emerald-200">
                                ✨ Foto Normal e IA
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-600 mt-1.5 font-medium flex flex-wrap items-center gap-x-2 gap-y-1.5 leading-relaxed">
                            <span className="font-bold text-slate-800 shrink-0">📍 {item.area}</span>
                            {item.measurementFields && item.measurementFields.length > 0 ? (
                              <span className="inline-block text-blue-800 font-bold bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 leading-normal max-w-full">
                                • {item.measurementFields.length} {item.measurementFields.length === 1 ? 'medición' : 'mediciones'}: {item.measurementFields.map(f => `${f.name || 'Medición'} (${f.unit || '°C'})`).join(', ')}
                              </span>
                            ) : (
                              item.unit ? <span className="inline-block text-slate-700 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200 leading-normal">• Unidad: {item.unit}</span> : null
                            )}
                          </div>
                          {item.options && item.options.length > 0 && (
                            <div className="flex flex-wrap gap-x-2 gap-y-1.5 mt-2 items-center py-0.5">
                              <span className="text-[10px] font-bold text-slate-500">Botones configurados:</span>
                              {item.options.map(opt => {
                                const cfg = item.buttonActions?.[opt];
                                const actionLabel = cfg?.actionType === 'turn_off' ? ' (0 / Apagar)' :
                                                    cfg?.actionType === 'turn_on' ? ' (Habilita valor)' :
                                                    cfg?.actionType === 'failure' ? ' (Alarma)' : '';
                                const chipColor = getButtonColorClass(opt, false, cfg?.color);
                                return (
                                  <span
                                    key={opt}
                                    className={`inline-block text-[10px] px-2 py-0.5 rounded-lg font-bold border shadow-2xs leading-normal ${chipColor}`}
                                  >
                                    ✓ {opt}{actionLabel}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                          {item.measurementFields && item.measurementFields.some(f => f.options && f.options.length > 0) && (
                            <div className="flex flex-col gap-y-2.5 mt-2.5 pt-2 border-t border-slate-100">
                              {item.measurementFields.filter(f => f.options && f.options.length > 0).map((f, fi) => (
                                <div key={f.id || fi} className="flex flex-wrap gap-x-2 gap-y-1.5 items-center py-0.5">
                                  <span className="text-[10px] font-bold text-slate-500">Botones {f.name || `Medición ${fi + 1}`}:</span>
                                  {f.options!.map(opt => {
                                    const cfg = f.buttonActions?.[opt];
                                    const actionLabel = cfg?.actionType === 'turn_off' ? ' (0/Off)' :
                                                        cfg?.actionType === 'turn_on' ? ' (On)' :
                                                        cfg?.actionType === 'failure' ? ' (Alarma)' : '';
                                    const chipColor = getButtonColorClass(opt, false, cfg?.color);
                                    return (
                                      <span key={opt} className={`inline-block text-[9px] px-1.5 py-0.5 rounded-md font-bold border leading-normal ${chipColor}`}>
                                        {opt}{actionLabel}
                                      </span>
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          )}
                          {item.instructions && (
                            <p className="text-[11px] text-blue-700 bg-blue-50/70 border border-blue-200/60 rounded px-2 py-0.5 mt-1 truncate">
                              💡 {item.instructions}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 self-end sm:self-auto shrink-0 sm:ml-2 pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 w-full sm:w-auto justify-end">
                        {canEditSettings && (
                          <button
                            type="button"
                            onClick={() => startEditingItem(item)}
                            className="px-2.5 py-1.5 sm:p-1.5 text-xs text-blue-700 bg-blue-50 sm:bg-transparent hover:bg-blue-100 border border-blue-200 sm:border-slate-200 hover:border-blue-300 rounded-lg transition-colors flex items-center space-x-1 font-semibold cursor-pointer"
                            title="Editar este punto"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span className="sm:hidden">Editar</span>
                          </button>
                        )}
                        {canDeleteRecords && (
                          <button
                            type="button"
                            onClick={() => deleteRoundTemplateItem(item.id)}
                            className="px-2.5 py-1.5 sm:p-1.5 text-xs text-rose-600 bg-rose-50 sm:bg-transparent hover:bg-rose-100 border border-rose-200 sm:border-rose-200 hover:border-rose-300 rounded-lg transition-colors flex items-center space-x-1 font-semibold cursor-pointer"
                            title="Eliminar de la plantilla"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span className="sm:hidden">Eliminar</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowTemplateModal(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cerrar y Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ROUND SHARE & PDF EXPORT MODAL */}
      {roundToShare && (
        <RoundShareModal
          round={roundToShare}
          hotelInfo={settings?.hotelInfo}
          onClose={() => {
            setRoundToShare(null);
            setIsJustCompletedShare(false);
          }}
          isJustCompleted={isJustCompletedShare}
        />
      )}

      {/* SMART METER SCANNER MODAL */}
      {isScannerOpen && scannerConfig && (
        <SmartMeterScannerModal
          isOpen={isScannerOpen}
          onClose={() => {
            setIsScannerOpen(false);
            setScannerConfig(null);
          }}
          title={scannerConfig.title}
          meterName={scannerConfig.meterName}
          meterTypeHint={scannerConfig.meterTypeHint}
          expectedUnit={scannerConfig.unit}
          initialValue={scannerConfig.initialValue}
          initialPhotoMode={scannerConfig.initialPhotoMode}
          allowedPhotoMode={scannerConfig.allowedPhotoMode}
          onApplyReading={handleApplyMeterReading}
        />
      )}

      {/* PHOTO PREVIEW LIGHTBOX MODAL */}
      {previewPhotoUrl && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewPhotoUrl(null);
          }}
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 shrink-0">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="font-bold text-xs sm:text-sm truncate">
                  {previewPhotoTitle || 'Evidencia Fotográfica de la Ronda'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer shrink-0"
                title="Cerrar visor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center flex-1 overflow-hidden min-h-[260px] sm:min-h-[360px]">
              <img
                src={previewPhotoUrl}
                alt={previewPhotoTitle || 'Foto de evidencia'}
                className="max-h-[68vh] w-auto max-w-full object-contain rounded-xl shadow-xl border border-slate-800"
              />
            </div>
            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2">
              <a
                href={previewPhotoUrl}
                download="evidencia_fotografica_ronda.jpg"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                title="Descargar foto en tu dispositivo"
              >
                <FileDown className="w-4 h-4 text-blue-600" />
                <span>Descargar Foto</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LUXURY INCOMPLETE CHECKPOINTS MODAL (REPLACES NATIVE BROWSER ALERT) */}
      {showIncompleteCheckpointsModal && activeRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-slate-900 border-2 border-amber-500/40 text-white rounded-3xl max-w-2xl w-full shadow-2xl shadow-amber-950/70 overflow-hidden flex flex-col max-h-[92vh] my-auto">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-start justify-between gap-3">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                  <AlertTriangle className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">Inspección Incompleta</span>
                    <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/30">
                      {activeRoundIncompleteCheckpoints.length} {activeRoundIncompleteCheckpoints.length === 1 ? 'punto pendiente' : 'puntos pendientes'}
                    </span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-white tracking-tight mt-0.5">
                    Puntos Requeridos por Registrar
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIncompleteCheckpointsModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer border border-slate-700/60"
                title="Cerrar modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Progress & Quality Notice */}
            <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto custom-scrollbar">
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-300">Progreso actual de la ronda:</span>
                  <span className="text-amber-400 font-extrabold">
                    {activeRound.checkpoints.length - activeRoundIncompleteCheckpoints.length} de {activeRound.checkpoints.length} puntos ({
                      Math.round(((activeRound.checkpoints.length - activeRoundIncompleteCheckpoints.length) / (activeRound.checkpoints.length || 1)) * 100)
                    }%)
                  </span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5">
                  <div 
                    className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.max(4, Math.round(((activeRound.checkpoints.length - activeRoundIncompleteCheckpoints.length) / (activeRound.checkpoints.length || 1)) * 100))}%` 
                    }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Para asegurar la calidad técnica y la trazabilidad del hotel, <strong className="text-slate-200">todos los puntos de control deben estar medidos o validados</strong> antes de poder finalizar y guardar.
                </p>
              </div>

              {/* Filters & Search */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={incompleteModalSearch}
                    onChange={(e) => setIncompleteModalSearch(e.target.value)}
                    placeholder="Buscar punto de inspección o zona..."
                    className="w-full pl-9 pr-3.5 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
                  />
                  {incompleteModalSearch && (
                    <button
                      type="button"
                      onClick={() => setIncompleteModalSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {/* Zone filter chips */}
                <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 custom-scrollbar">
                  <button
                    type="button"
                    onClick={() => setIncompleteModalFilterArea('todos')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                      incompleteModalFilterArea === 'todos'
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Todas las zonas ({activeRoundIncompleteCheckpoints.length})
                  </button>
                  {Array.from(new Set(activeRoundIncompleteCheckpoints.map(c => c.area || 'Sin Zona'))).map(area => {
                    const countInArea = activeRoundIncompleteCheckpoints.filter(c => (c.area || 'Sin Zona') === area).length;
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => setIncompleteModalFilterArea(area)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-all cursor-pointer ${
                          incompleteModalFilterArea === area
                            ? 'bg-amber-500 text-slate-950 shadow-xs'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        {area} ({countInArea})
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Incomplete Checkpoints List */}
              <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-1 custom-scrollbar">
                {activeRoundIncompleteCheckpoints
                  .filter(chk => {
                    const matchesArea = incompleteModalFilterArea === 'todos' || (chk.area || 'Sin Zona') === incompleteModalFilterArea;
                    const matchesSearch = !incompleteModalSearch || 
                      (chk.title || '').toLowerCase().includes(incompleteModalSearch.toLowerCase()) ||
                      (chk.area || '').toLowerCase().includes(incompleteModalSearch.toLowerCase());
                    return matchesArea && matchesSearch;
                  })
                  .map((chk, idx) => (
                    <div
                      key={chk.id}
                      className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 hover:border-amber-500/50 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="flex items-start space-x-3 min-w-0 flex-1">
                        <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-[11px] font-black shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center space-x-1.5 flex-wrap">
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 shrink-0">
                              📍 {chk.area || 'Zona General'}
                            </span>
                            {chk.type === 'numeric' && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded text-amber-300/90 bg-amber-950/60">
                                {chk.unit || '°C'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm font-bold text-white mt-1 truncate group-hover:text-amber-300 transition-colors">
                            {chk.title}
                          </p>
                          {chk.measurementFields && chk.measurementFields.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {chk.measurementFields
                                .filter(f => f && (f.value === undefined || f.value === null || String(f.value).trim() === '') && f.ampState !== 'Apagado' && f.statusValue !== 'Apagado')
                                .map((f, fIdx) => (
                                  <span key={f.name || fIdx} className="text-[10px] font-semibold text-amber-300 bg-amber-950/70 border border-amber-500/40 px-1.5 py-0.2 rounded">
                                    Falta cifra: {f.name || `Medición ${fIdx + 1}`}
                                  </span>
                                ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleJumpToCheckpoint(chk.id)}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all shrink-0 flex items-center space-x-1.5 shadow-md cursor-pointer active:scale-95"
                      >
                        <span>Completar</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-[11px] text-amber-300 font-semibold text-center sm:text-left">
                🔒 Es obligatorio completar el 100% de los puntos pendientes para poder finalizar y cerrar la ronda.
              </span>
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setShowIncompleteCheckpointsModal(false)}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2"
                >
                  <span>Continuar Llenando Puntos</span>
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* OFFLINE WARNING MODAL (Cuando el técnico intenta cerrar sin internet o Wi-Fi) */}
      {showOfflineModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-5 text-center">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-inner">
              <WifiOff className="w-8 h-8 animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-lg font-black text-white">
                Sin Conexión a Internet / Señal Débil
              </h3>
              <p className="text-xs text-amber-300 font-bold">
                No se puede cerrar ni cargar la ronda en el sistema en este momento.
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-left space-y-2 text-xs text-slate-300 leading-relaxed">
              <p className="font-semibold text-white flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block shrink-0"></span>
                <span>Tus datos y registros están 100% seguros</span>
              </p>
              <p>
                El sistema ha guardado cada punto, cifra y observación de tu ronda localmente en tu dispositivo. Ningún dato se perderá, incluso si entraste al ascensor o perdiste señal temporalmente.
              </p>
              <p className="text-amber-300 font-medium pt-1 border-t border-slate-800">
                👉 Para cerrar y cargar la ronda definitivamente en el servidor, por favor conéctate a una red Wi-Fi o busca señal de datos y vuelve a presionar el botón de finalizar.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowOfflineModal(false)}
                className="w-full py-3 px-5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 active:scale-98"
              >
                <span>Entendido • Continuar Trabajando</span>
                <Check className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
