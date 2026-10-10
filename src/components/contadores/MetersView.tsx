import React, { useState, useMemo } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { MeterDefinition, MeterReadingRecord, MeterType } from '../../types';
import { INITIAL_METERS, INITIAL_METER_READINGS } from '../../data/initialData';
import { 
  Gauge, 
  Droplets, 
  Zap, 
  Flame, 
  Plus, 
  Camera, 
  Sparkles, 
  Calendar, 
  Clock, 
  User, 
  Search, 
  Filter, 
  TrendingUp, 
  AlertTriangle, 
  Trash2, 
  Edit3, 
  Eye, 
  FileDown, 
  X, 
  Activity, 
  RefreshCw, 
  Sliders, 
  CheckCircle2,
  Image as ImageIcon,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Info,
  LayoutGrid,
  Table,
  Layers,
  ArrowDownRight,
  Lock,
  Unlock,
  CalendarDays,
  BarChart3,
  Archive
} from 'lucide-react';
import { SmartMeterScannerModal, MeterScanResult } from '../rondas/SmartMeterScannerModal';
import { FuturisticMeterSelect } from './FuturisticMeterSelect';

export const MetersView: React.FC = () => {
  const { 
    meters = [], 
    meterReadingsLog = [], 
    addMeter, 
    updateMeter, 
    deleteMeter, 
    recordMeterReading, 
    deleteMeterReading, 
    currentUser, 
    settings,
    notify
  } = useMaintenance();

  // Active Tab in the Module
  const [activeTab, setActiveTab] = useState<'cards' | 'history' | 'analytics' | 'closures' | 'config'>('cards');

  // View Mode for Contadores: Cards Grid vs Executive Table
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Period Selector States (Diario, Semanal, Mensual, Anual)
  const [kpiPeriod, setKpiPeriod] = useState<'diario' | 'semanal' | 'mensual' | 'anual'>('diario');
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'diario' | 'semanal' | 'mensual' | 'anual'>('mensual');

  // Cierres y Consumos Históricos Guardados (Semanas, Meses, Años)
  const [closuresPeriodType, setClosuresPeriodType] = useState<'semanas' | 'meses' | 'anios'>('semanas');
  const [selectedClosureMeter, setSelectedClosureMeter] = useState<string>('todos');
  const [selectedClosureYear, setSelectedClosureYear] = useState<number>(new Date().getFullYear());
  const [expandedPeriodId, setExpandedPeriodId] = useState<string | null>(null);

  // Filter States
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'todos' | MeterType>('todos');
  const [selectedMeterFilter, setSelectedMeterFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Local calendar metadata
  const currentMonthName = useMemo(() => {
    const m = new Date().toLocaleDateString('es-CO', { month: 'long' });
    return m.charAt(0).toUpperCase() + m.slice(1);
  }, []);
  const currentYear = useMemo(() => new Date().getFullYear(), []);

  // Modals State
  const [isReadingModalOpen, setIsReadingModalOpen] = useState(false);
  const [isMeterConfigModalOpen, setIsMeterConfigModalOpen] = useState(false);
  const [isEditReadingModalOpen, setIsEditReadingModalOpen] = useState(false);
  const [editingMeter, setEditingMeter] = useState<MeterDefinition | null>(null);
  const [selectedMeterForReading, setSelectedMeterForReading] = useState<MeterDefinition | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);
  const [isSubmittingReading, setIsSubmittingReading] = useState(false);
  const [isSubmittingMeterConfig, setIsSubmittingMeterConfig] = useState(false);

  // Scanner modal state for AI Camera OCR
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerTargetMeter, setScannerTargetMeter] = useState<MeterDefinition | null>(null);

  // Form State: New Reading
  const [readingForm, setReadingForm] = useState<{
    meterId: string;
    currentValue: string;
    date: string;
    time: string;
    technicianName: string;
    photoUrl: string;
    recognitionMethod: 'manual' | 'foto_ia' | 'foto_normal';
    notes: string;
  }>({
    meterId: '',
    currentValue: '',
    date: new Date().toISOString().split('T')[0],
    time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
    technicianName: currentUser?.displayName || 'Juan Mateo Ramos',
    photoUrl: '',
    recognitionMethod: 'manual',
    notes: ''
  });

  // Form State: Meter Config (New or Edit)
  const [meterForm, setMeterForm] = useState<{
    code: string;
    name: string;
    type: MeterType;
    unit: string;
    location: string;
    brandModel: string;
    serialNumber: string;
    initialReading: string;
    alertThresholdPerDay: string;
    photoUrl: string;
    status: 'activo' | 'inactivo' | 'mantenimiento';
    notes: string;
    isMainMeter: boolean;
    parentMeterId: string;
    parentMeterName: string;
    areaTag: string;
  }>({
    code: '',
    name: '',
    type: 'agua',
    unit: 'm³',
    location: '',
    brandModel: '',
    serialNumber: '',
    initialReading: '0',
    alertThresholdPerDay: '',
    photoUrl: '',
    status: 'activo',
    notes: '',
    isMainMeter: false,
    parentMeterId: '',
    parentMeterName: '',
    areaTag: 'general'
  });

  // Comprehensive helper to calculate Daily, Weekly, Monthly, and Annual consumptions for any meter
  const getMeterStats = (meterId: string, meterDef?: MeterDefinition) => {
    const meter = meterDef || meters.find(m => m.id === meterId);
    
    // Sort logs chronologically (oldest to newest) to correctly determine real incremental consumption between readings
    const sortedLogsAsc = (meterReadingsLog || [])
      .filter(r => r && (r.meterId === meterId || (meter && r.meterId === meter.code)))
      .sort((a, b) => {
        const tA = new Date(a.timestamp || `${a.date}T${a.time || '00:00'}:00.000Z`).getTime();
        const tB = new Date(b.timestamp || `${b.date}T${b.time || '00:00'}:00.000Z`).getTime();
        return tA - tB;
      });

    // Most recent logs for last interval
    const logsDesc = [...sortedLogsAsc].reverse();
    const last = logsDesc[0];
    const previous = logsDesc[1];

    let lastIntervalConsumption = 0;
    let lastIntervalHours = 24;

    if (last) {
      if (previous) {
        lastIntervalConsumption = Math.max(0, parseFloat((last.currentValue - previous.currentValue).toFixed(3)));
      } else if (last.consumption !== undefined && !isNaN(last.consumption)) {
        lastIntervalConsumption = Math.max(0, parseFloat(Number(last.consumption).toFixed(3)));
      } else if (last.previousValue !== undefined && !isNaN(last.previousValue)) {
        lastIntervalConsumption = Math.max(0, parseFloat((last.currentValue - last.previousValue).toFixed(3)));
      } else if (meter && meter.initialReading !== undefined && last.currentValue >= meter.initialReading) {
        lastIntervalConsumption = Math.max(0, parseFloat((last.currentValue - meter.initialReading).toFixed(3)));
      } else {
        lastIntervalConsumption = Math.max(0, parseFloat(last.currentValue.toFixed(3)));
      }
      lastIntervalHours = last.intervalHours || 24;
    }

    // Comparación con la lectura anterior para saber si el consumo fue mayor o menor
    let prevReadingConsumption = 0;
    if (logsDesc.length >= 2) {
      const secondLast = logsDesc[1];
      const thirdLast = logsDesc[2];
      if (thirdLast) {
        prevReadingConsumption = Math.max(0, parseFloat((secondLast.currentValue - thirdLast.currentValue).toFixed(3)));
      } else if (secondLast.consumption !== undefined && !isNaN(secondLast.consumption)) {
        prevReadingConsumption = Math.max(0, parseFloat(Number(secondLast.consumption).toFixed(3)));
      } else if (secondLast.previousValue !== undefined && !isNaN(secondLast.previousValue)) {
        prevReadingConsumption = Math.max(0, parseFloat((secondLast.currentValue - secondLast.previousValue).toFixed(3)));
      } else if (meter && meter.initialReading !== undefined && secondLast.currentValue >= meter.initialReading) {
        prevReadingConsumption = Math.max(0, parseFloat((secondLast.currentValue - meter.initialReading).toFixed(3)));
      } else {
        prevReadingConsumption = Math.max(0, parseFloat(secondLast.currentValue.toFixed(3)));
      }
    }

    let trendComparison: 'mayor' | 'menor' | 'igual' | 'primera' = 'primera';
    let trendDiff = 0;
    if (logsDesc.length >= 2) {
      trendDiff = parseFloat(Math.abs(lastIntervalConsumption - prevReadingConsumption).toFixed(2));
      if (lastIntervalConsumption > prevReadingConsumption) {
        trendComparison = 'mayor';
      } else if (lastIntervalConsumption < prevReadingConsumption) {
        trendComparison = 'menor';
      } else {
        trendComparison = 'igual';
      }
    }

    // Almanaque Colombiano (Lunes a Domingo / Mes Calendario / Año Calendario)
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // Semana Calendario Colombiana (Lunes 00:00:00 a Domingo 23:59:59)
    const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Lunes, ..., 6 = Sábado
    const diffToMonday = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const startOfCurrentWeek = new Date(now.getFullYear(), now.getMonth(), diffToMonday, 0, 0, 0, 0);
    const endOfCurrentWeek = new Date(startOfCurrentWeek);
    endOfCurrentWeek.setDate(startOfCurrentWeek.getDate() + 6);
    endOfCurrentWeek.setHours(23, 59, 59, 999);

    // Mes Calendario Colombiano (Día 1 a último día del mes)
    const startOfCurrentMonth = new Date(currentYear, currentMonth, 1, 0, 0, 0, 0);
    const endOfCurrentMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999);

    // Año Calendario (1 Enero a 31 Diciembre)
    const startOfCurrentYear = new Date(currentYear, 0, 1, 0, 0, 0, 0);
    const endOfCurrentYear = new Date(currentYear, 11, 31, 23, 59, 59, 999);

    let weeklyAccumulated = 0;
    let weeklyReadingsCount = 0;
    let monthlyAccumulated = 0;
    let monthlyReadingsCount = 0;
    let yearlyAccumulated = 0;
    let yearlyReadingsCount = 0;
    let totalAccumulated = 0;

    sortedLogsAsc.forEach((r, idx) => {
      let cons = 0;
      if (idx > 0) {
        const prevReading = sortedLogsAsc[idx - 1];
        cons = Math.max(0, parseFloat((r.currentValue - prevReading.currentValue).toFixed(3)));
      } else if (r.consumption !== undefined && !isNaN(r.consumption)) {
        cons = Math.max(0, parseFloat(Number(r.consumption).toFixed(3)));
      } else if (r.previousValue !== undefined && !isNaN(r.previousValue)) {
        cons = Math.max(0, parseFloat((r.currentValue - r.previousValue).toFixed(3)));
      } else if (meter && meter.initialReading !== undefined && r.currentValue >= meter.initialReading) {
        cons = Math.max(0, parseFloat((r.currentValue - meter.initialReading).toFixed(3)));
      } else {
        cons = Math.max(0, parseFloat(r.currentValue.toFixed(3)));
      }

      totalAccumulated += cons;

      const rDate = new Date(r.timestamp || `${r.date}T${r.time || '12:00'}:00`);
      const rTime = !isNaN(rDate.getTime()) ? rDate.getTime() : now.getTime();

      // Semanal: suma dentro de la semana calendario colombiana actual (Lunes a Domingo)
      if (rTime >= startOfCurrentWeek.getTime() && rTime <= endOfCurrentWeek.getTime()) {
        weeklyAccumulated += cons;
        weeklyReadingsCount++;
      }

      // Mensual: suma dentro del mes calendario actual (ej. Octubre)
      if (rTime >= startOfCurrentMonth.getTime() && rTime <= endOfCurrentMonth.getTime()) {
        monthlyAccumulated += cons;
        monthlyReadingsCount++;
      }

      // Anual: suma dentro del año calendario actual (ej. 2026)
      if (rTime >= startOfCurrentYear.getTime() && rTime <= endOfCurrentYear.getTime()) {
        yearlyAccumulated += cons;
        yearlyReadingsCount++;
      }
    });

    // 1. Consumo Diario = Delta exacto de la última lectura realizada (NO se suma con lecturas anteriores)
    const daily = parseFloat(lastIntervalConsumption.toFixed(2));
    const dailyLabel = last 
      ? (last.date === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
          ? `Hoy ${last.time || ''}`.trim()
          : `${last.date} ${last.time || ''}`.trim())
      : 'Sin lecturas';

    const weekly = parseFloat(weeklyAccumulated.toFixed(2));
    const monthly = parseFloat(monthlyAccumulated.toFixed(2));
    const yearly = parseFloat(yearlyAccumulated.toFixed(2));

    const isWaterMeter = meter?.type === 'agua';
    const isMainWater = isWaterMeter && (meter?.isMainMeter || meter?.id === 'meter-agua-general' || meter?.code === 'MED-AGU-01');
    const isSubWater = isWaterMeter && !isMainWater && (
      !!meter?.parentMeterId || 
      meter?.id.includes('cocina') || 
      meter?.id.includes('piscina') || 
      meter?.name.toLowerCase().includes('cocina') || 
      meter?.name.toLowerCase().includes('piscina')
    );

    return {
      last,
      previous,
      lastIntervalConsumption: parseFloat(lastIntervalConsumption.toFixed(2)),
      lastIntervalHours,
      totalReadingsCount: sortedLogsAsc.length,
      daily,
      dailyLabel,
      trendComparison,
      trendDiff,
      weekly,
      weeklyReadingsCount,
      monthly,
      monthlyReadingsCount,
      yearly,
      yearlyReadingsCount,
      totalAccumulated: parseFloat(totalAccumulated.toFixed(2)),
      isMainWater,
      isSubWater
    };
  };

  // Summary Metrics with Multi-Period Support (Diario, Semanal, Mensual, Anual)
  const metrics = useMemo(() => {
    const totalMeters = meters.length;
    const waterMeters = meters.filter(m => m.type === 'agua').length;
    const electricMeters = meters.filter(m => m.type === 'energia').length;
    const gasMeters = meters.filter(m => m.type === 'gas').length;

    let waterDaily = 0;
    let waterWeekly = 0;
    let waterMonthly = 0;
    let waterYearly = 0;

    let electricDaily = 0;
    let electricWeekly = 0;
    let electricMonthly = 0;
    let electricYearly = 0;

    let gasDaily = 0;
    let gasWeekly = 0;
    let gasMonthly = 0;
    let gasYearly = 0;

    // Detectar contadores de agua principales y subcontadores
    const explicitMainWater = meters.filter(m => m.type === 'agua' && m.isMainMeter);
    const subWaterIds = new Set(meters.filter(m => m.type === 'agua' && m.parentMeterId).map(m => m.id));

    if (explicitMainWater.length > 0) {
      // Sumar principales y los que no sean subcontadores
      meters.filter(m => m.type === 'agua' && !subWaterIds.has(m.id)).forEach(m => {
        const stats = getMeterStats(m.id, m);
        waterDaily += stats.daily;
        waterWeekly += stats.weekly;
        waterMonthly += stats.monthly;
        waterYearly += stats.yearly;
      });
    } else {
      // Sumar todos los contadores de agua independientes
      meters.filter(m => m.type === 'agua' && !m.parentMeterId).forEach(m => {
        const stats = getMeterStats(m.id, m);
        waterDaily += stats.daily;
        waterWeekly += stats.weekly;
        waterMonthly += stats.monthly;
        waterYearly += stats.yearly;
      });
    }

    // Calcular consumos de Energía y Gas
    meters.forEach(m => {
      const stats = getMeterStats(m.id, m);
      if (m.type === 'energia') {
        electricDaily += stats.daily;
        electricWeekly += stats.weekly;
        electricMonthly += stats.monthly;
        electricYearly += stats.yearly;
      } else if (m.type === 'gas') {
        gasDaily += stats.daily;
        gasWeekly += stats.weekly;
        gasMonthly += stats.monthly;
        gasYearly += stats.yearly;
      }
    });

    // Desglose de subpuntos de agua (Cocina y Piscina)
    const hasSubmeters = subWaterIds.size > 0 || meters.some(m => m.type === 'agua' && (!!m.parentMeterId || m.id.includes('cocina') || m.id.includes('piscina')));
    let waterKitchenDaily = 0;
    let waterKitchenWeekly = 0;
    let waterKitchenMonthly = 0;
    let waterKitchenYearly = 0;

    let waterPoolDaily = 0;
    let waterPoolWeekly = 0;
    let waterPoolMonthly = 0;
    let waterPoolYearly = 0;

    meters.filter(m => m.type === 'agua').forEach(m => {
      const stats = getMeterStats(m.id, m);
      if (m.id.includes('cocina') || m.areaTag === 'cocina' || m.name.toLowerCase().includes('cocina')) {
        waterKitchenDaily += stats.daily;
        waterKitchenWeekly += stats.weekly;
        waterKitchenMonthly += stats.monthly;
        waterKitchenYearly += stats.yearly;
      } else if (m.id.includes('piscina') || m.areaTag === 'piscina' || m.name.toLowerCase().includes('piscina')) {
        waterPoolDaily += stats.daily;
        waterPoolWeekly += stats.weekly;
        waterPoolMonthly += stats.monthly;
        waterPoolYearly += stats.yearly;
      }
    });

    // Determine current active metric based on selected KPI period
    let waterActive = waterDaily;
    let electricActive = electricDaily;
    let gasActive = gasDaily;
    let waterKitchenActive = waterKitchenDaily;
    let waterPoolActive = waterPoolDaily;
    let periodLabel = 'Hoy / 24h';

    if (kpiPeriod === 'semanal') {
      waterActive = waterWeekly;
      electricActive = electricWeekly;
      gasActive = gasWeekly;
      waterKitchenActive = waterKitchenWeekly;
      waterPoolActive = waterPoolWeekly;
      periodLabel = 'Últimos 7 días';
    } else if (kpiPeriod === 'mensual') {
      waterActive = waterMonthly;
      electricActive = electricMonthly;
      gasActive = gasMonthly;
      waterKitchenActive = waterKitchenMonthly;
      waterPoolActive = waterPoolMonthly;
      periodLabel = `Mes de ${currentMonthName}`;
    } else if (kpiPeriod === 'anual') {
      waterActive = waterYearly;
      electricActive = electricYearly;
      gasActive = gasYearly;
      waterKitchenActive = waterKitchenYearly;
      waterPoolActive = waterPoolYearly;
      periodLabel = `Año ${currentYear}`;
    }

    const waterKitchenPct = waterActive > 0 ? Math.min(100, Math.round((waterKitchenActive / waterActive) * 100)) : 0;
    const waterPoolPct = waterActive > 0 ? Math.min(100, Math.round((waterPoolActive / waterActive) * 100)) : 0;

    return {
      totalMeters,
      waterMeters,
      electricMeters,
      gasMeters,
      totalReadings: meterReadingsLog.length,
      waterDaily: parseFloat(waterDaily.toFixed(2)),
      waterWeekly: parseFloat(waterWeekly.toFixed(2)),
      waterMonthly: parseFloat(waterMonthly.toFixed(2)),
      waterYearly: parseFloat(waterYearly.toFixed(2)),
      electricDaily: parseFloat(electricDaily.toFixed(2)),
      electricWeekly: parseFloat(electricWeekly.toFixed(2)),
      electricMonthly: parseFloat(electricMonthly.toFixed(2)),
      electricYearly: parseFloat(electricYearly.toFixed(2)),
      gasDaily: parseFloat(gasDaily.toFixed(2)),
      gasWeekly: parseFloat(gasWeekly.toFixed(2)),
      gasMonthly: parseFloat(gasMonthly.toFixed(2)),
      gasYearly: parseFloat(gasYearly.toFixed(2)),
      waterActive: parseFloat(waterActive.toFixed(2)),
      electricActive: parseFloat(electricActive.toFixed(2)),
      gasActive: parseFloat(gasActive.toFixed(2)),
      waterKitchenActive: parseFloat(waterKitchenActive.toFixed(2)),
      waterPoolActive: parseFloat(waterPoolActive.toFixed(2)),
      waterKitchenPct,
      waterPoolPct,
      hasSubmeters,
      periodLabel
    };
  }, [meters, meterReadingsLog, kpiPeriod, currentMonthName, currentYear]);

  // Filtered Meters
  const filteredMeters = useMemo(() => {
    return meters.filter(m => {
      const matchType = selectedTypeFilter === 'todos' || m.type === selectedTypeFilter;
      const matchSearch = searchTerm === '' || 
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        m.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.location.toLowerCase().includes(searchTerm.toLowerCase());
      return matchType && matchSearch;
    });
  }, [meters, selectedTypeFilter, searchTerm]);

  // Filtered Readings History
  const filteredReadings = useMemo(() => {
    return [...meterReadingsLog]
      .filter(r => {
        if (!r || !r.id) return false;
        const matchType = selectedTypeFilter === 'todos' || r.meterType === selectedTypeFilter;
        const matchMeter = selectedMeterFilter === 'todos' || r.meterId === selectedMeterFilter || (r.meterCode && r.meterCode === selectedMeterFilter);
        const matchSearch = searchTerm === '' ||
          (r.meterName && r.meterName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (r.meterCode && r.meterCode.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (r.technicianName && r.technicianName.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (r.notes && r.notes.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchType && matchMeter && matchSearch;
      })
      .sort((a, b) => {
        const tA = new Date(a.timestamp || `${a.date}T${a.time || '00:00'}:00.000Z`).getTime();
        const tB = new Date(b.timestamp || `${b.date}T${b.time || '00:00'}:00.000Z`).getTime();
        return tB - tA;
      });
  }, [meterReadingsLog, selectedTypeFilter, selectedMeterFilter, searchTerm]);

  // Helper para agrupar y calcular cierres históricos de Semanas, Meses y Años
  const historicalClosures = useMemo(() => {
    const now = new Date();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    // 1. Enriquecer cada lectura con su consumo incremental calculado respecto a la anterior de ese contador
    const readingsByMeter = new Map<string, MeterReadingRecord[]>();
    (meterReadingsLog || []).forEach(r => {
      if (!r || !r.meterId) return;
      if (!readingsByMeter.has(r.meterId)) {
        readingsByMeter.set(r.meterId, []);
      }
      readingsByMeter.get(r.meterId)!.push(r);
    });

    interface EnrichedReading extends MeterReadingRecord {
      incrementalConsumption: number;
      dateObj: Date;
    }

    const allEnrichedReadings: EnrichedReading[] = [];

    readingsByMeter.forEach((meterLogs, mId) => {
      const targetMeter = meters.find(m => m.id === mId || m.code === mId);
      const sorted = [...meterLogs].sort((a, b) => {
        const tA = new Date(a.timestamp || `${a.date}T${a.time || '00:00'}:00.000Z`).getTime();
        const tB = new Date(b.timestamp || `${b.date}T${b.time || '00:00'}:00.000Z`).getTime();
        return tA - tB;
      });

      sorted.forEach((r, idx) => {
        let cons = 0;
        if (idx > 0) {
          cons = Math.max(0, parseFloat((r.currentValue - sorted[idx - 1].currentValue).toFixed(3)));
        } else if (r.consumption !== undefined && !isNaN(r.consumption)) {
          cons = Math.max(0, parseFloat(Number(r.consumption).toFixed(3)));
        } else if (r.previousValue !== undefined && !isNaN(r.previousValue)) {
          cons = Math.max(0, parseFloat((r.currentValue - r.previousValue).toFixed(3)));
        } else if (targetMeter && targetMeter.initialReading !== undefined && r.currentValue >= targetMeter.initialReading) {
          cons = Math.max(0, parseFloat((r.currentValue - targetMeter.initialReading).toFixed(3)));
        } else {
          cons = Math.max(0, parseFloat(r.currentValue.toFixed(3)));
        }
        const dObj = new Date(r.timestamp || `${r.date}T${r.time || '12:00'}:00`);
        allEnrichedReadings.push({
          ...r,
          incrementalConsumption: cons,
          dateObj: isNaN(dObj.getTime()) ? new Date() : dObj
        });
      });
    });

    // Helper Semana Colombiana (Lunes a Domingo)
    const getWeekBoundaries = (d: Date) => {
      const date = new Date(d);
      const day = date.getDay();
      const diff = date.getDate() - day + (day === 0 ? -6 : 1);
      const mon = new Date(date.setDate(diff));
      mon.setHours(0, 0, 0, 0);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      sun.setHours(23, 59, 59, 999);
      return { start: mon, end: sun };
    };

    const getISOWeekNumber = (d: Date) => {
      const target = new Date(d.valueOf());
      const dayNr = (d.getDay() + 6) % 7;
      target.setDate(target.getDate() - dayNr + 3);
      const firstThursday = target.valueOf();
      target.setMonth(0, 1);
      if (target.getDay() !== 4) {
        target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
      }
      return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    };

    type MeterBreakdownItem = {
      meterId: string;
      meterName: string;
      meterCode?: string;
      meterType: MeterType;
      unit: string;
      consumption: number;
      readingsCount: number;
      initialReading?: number;
      lastReading?: number;
    };

    type ClosureItem = {
      id: string;
      periodType: 'semana' | 'mes' | 'anio';
      title: string;
      dateRangeLabel: string;
      year: number;
      isCurrent: boolean;
      isClosed: boolean;
      totalWater: number;
      totalElectric: number;
      totalGas: number;
      totalReadingsCount: number;
      byMeter: MeterBreakdownItem[];
      readings: EnrichedReading[];
    };

    const weeksMap = new Map<string, {
      id: string;
      weekNumber: number;
      year: number;
      startDate: Date;
      endDate: Date;
      label: string;
      isCurrent: boolean;
      isClosed: boolean;
      totalWater: number;
      totalElectric: number;
      totalGas: number;
      readingsCount: number;
      byMeter: Map<string, MeterBreakdownItem>;
      readings: EnrichedReading[];
    }>();

    const monthsMap = new Map<string, {
      id: string;
      monthNumber: number;
      monthName: string;
      year: number;
      label: string;
      isCurrent: boolean;
      isClosed: boolean;
      totalWater: number;
      totalElectric: number;
      totalGas: number;
      readingsCount: number;
      byMeter: Map<string, MeterBreakdownItem>;
      readings: EnrichedReading[];
    }>();

    const yearsMap = new Map<string, {
      id: string;
      year: number;
      label: string;
      isCurrent: boolean;
      isClosed: boolean;
      totalWater: number;
      totalElectric: number;
      totalGas: number;
      readingsCount: number;
      byMeter: Map<string, MeterBreakdownItem>;
      readings: EnrichedReading[];
    }>();

    allEnrichedReadings.forEach(r => {
      const d = r.dateObj;
      const y = d.getFullYear();
      const m = d.getMonth();
      const wNum = getISOWeekNumber(d);
      const { start: wStart, end: wEnd } = getWeekBoundaries(d);

      const mDef = meters.find(item => item.id === r.meterId || item.code === r.meterId);
      const mType: MeterType = r.meterType || mDef?.type || 'agua';
      const mUnit = r.unit || mDef?.unit || (mType === 'energia' ? 'kWh' : 'm³');
      const mName = r.meterName || mDef?.name || 'Contador';
      const mCode = r.meterCode || mDef?.code || '';

      // 1. SEMANAS
      const weekKey = `${y}-W${String(wNum).padStart(2, '0')}`;
      if (!weeksMap.has(weekKey)) {
        const isCur = now >= wStart && now <= wEnd;
        const isCls = now > wEnd;
        const startStr = `${wStart.getDate()} ${monthNames[wStart.getMonth()].slice(0, 3)}`;
        const endStr = `${wEnd.getDate()} ${monthNames[wEnd.getMonth()].slice(0, 3)} ${wEnd.getFullYear()}`;
        weeksMap.set(weekKey, {
          id: weekKey,
          weekNumber: wNum,
          year: y,
          startDate: wStart,
          endDate: wEnd,
          label: `Semana ${wNum} (${startStr} - ${endStr})`,
          isCurrent: isCur,
          isClosed: isCls,
          totalWater: 0,
          totalElectric: 0,
          totalGas: 0,
          readingsCount: 0,
          byMeter: new Map(),
          readings: []
        });
      }
      const wEntry = weeksMap.get(weekKey)!;
      wEntry.readingsCount++;
      wEntry.readings.push(r);
      if (mType === 'agua') wEntry.totalWater += r.incrementalConsumption;
      else if (mType === 'energia') wEntry.totalElectric += r.incrementalConsumption;
      else if (mType === 'gas') wEntry.totalGas += r.incrementalConsumption;

      if (!wEntry.byMeter.has(r.meterId)) {
        wEntry.byMeter.set(r.meterId, { meterId: r.meterId, meterName: mName, meterCode: mCode, meterType: mType, unit: mUnit, consumption: 0, readingsCount: 0 });
      }
      const mWeekEntry = wEntry.byMeter.get(r.meterId)!;
      mWeekEntry.consumption += r.incrementalConsumption;
      mWeekEntry.readingsCount++;

      // 2. MESES
      const monthKey = `${y}-${String(m + 1).padStart(2, '0')}`;
      if (!monthsMap.has(monthKey)) {
        const isCur = y === now.getFullYear() && m === now.getMonth();
        const isCls = y < now.getFullYear() || (y === now.getFullYear() && m < now.getMonth());
        monthsMap.set(monthKey, {
          id: monthKey,
          monthNumber: m + 1,
          monthName: monthNames[m],
          year: y,
          label: `${monthNames[m]} ${y}`,
          isCurrent: isCur,
          isClosed: isCls,
          totalWater: 0,
          totalElectric: 0,
          totalGas: 0,
          readingsCount: 0,
          byMeter: new Map(),
          readings: []
        });
      }
      const mEntry = monthsMap.get(monthKey)!;
      mEntry.readingsCount++;
      mEntry.readings.push(r);
      if (mType === 'agua') mEntry.totalWater += r.incrementalConsumption;
      else if (mType === 'energia') mEntry.totalElectric += r.incrementalConsumption;
      else if (mType === 'gas') mEntry.totalGas += r.incrementalConsumption;

      if (!mEntry.byMeter.has(r.meterId)) {
        mEntry.byMeter.set(r.meterId, { meterId: r.meterId, meterName: mName, meterCode: mCode, meterType: mType, unit: mUnit, consumption: 0, readingsCount: 0 });
      }
      const mMonthEntry = mEntry.byMeter.get(r.meterId)!;
      mMonthEntry.consumption += r.incrementalConsumption;
      mMonthEntry.readingsCount++;

      // 3. AÑOS
      const yearKey = `${y}`;
      if (!yearsMap.has(yearKey)) {
        const isCur = y === now.getFullYear();
        const isCls = y < now.getFullYear();
        yearsMap.set(yearKey, {
          id: yearKey,
          year: y,
          label: `Año ${y}`,
          isCurrent: isCur,
          isClosed: isCls,
          totalWater: 0,
          totalElectric: 0,
          totalGas: 0,
          readingsCount: 0,
          byMeter: new Map(),
          readings: []
        });
      }
      const yEntry = yearsMap.get(yearKey)!;
      yEntry.readingsCount++;
      yEntry.readings.push(r);
      if (mType === 'agua') yEntry.totalWater += r.incrementalConsumption;
      else if (mType === 'energia') yEntry.totalElectric += r.incrementalConsumption;
      else if (mType === 'gas') yEntry.totalGas += r.incrementalConsumption;

      if (!yEntry.byMeter.has(r.meterId)) {
        yEntry.byMeter.set(r.meterId, { meterId: r.meterId, meterName: mName, meterCode: mCode, meterType: mType, unit: mUnit, consumption: 0, readingsCount: 0 });
      }
      const mYearEntry = yEntry.byMeter.get(r.meterId)!;
      mYearEntry.consumption += r.incrementalConsumption;
      mYearEntry.readingsCount++;
    });

    const weeksList: ClosureItem[] = Array.from(weeksMap.values())
      .map(w => ({
        id: w.id,
        periodType: 'semana' as const,
        title: w.label,
        dateRangeLabel: `${w.startDate.toLocaleDateString('es-CO')} - ${w.endDate.toLocaleDateString('es-CO')}`,
        year: w.year,
        isCurrent: w.isCurrent,
        isClosed: w.isClosed,
        totalWater: parseFloat(w.totalWater.toFixed(2)),
        totalElectric: parseFloat(w.totalElectric.toFixed(2)),
        totalGas: parseFloat(w.totalGas.toFixed(2)),
        totalReadingsCount: w.readingsCount,
        byMeter: Array.from(w.byMeter.values()).map(b => ({ ...b, consumption: parseFloat(b.consumption.toFixed(2)) })),
        readings: w.readings.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())
      }))
      .sort((a, b) => b.id.localeCompare(a.id));

    const monthsList: ClosureItem[] = Array.from(monthsMap.values())
      .map(m => ({
        id: m.id,
        periodType: 'mes' as const,
        title: m.label,
        dateRangeLabel: `1 al 31 de ${m.monthName} ${m.year}`,
        year: m.year,
        isCurrent: m.isCurrent,
        isClosed: m.isClosed,
        totalWater: parseFloat(m.totalWater.toFixed(2)),
        totalElectric: parseFloat(m.totalElectric.toFixed(2)),
        totalGas: parseFloat(m.totalGas.toFixed(2)),
        totalReadingsCount: m.readingsCount,
        byMeter: Array.from(m.byMeter.values()).map(b => ({ ...b, consumption: parseFloat(b.consumption.toFixed(2)) })),
        readings: m.readings.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())
      }))
      .sort((a, b) => b.id.localeCompare(a.id));

    const yearsList: ClosureItem[] = Array.from(yearsMap.values())
      .map(y => ({
        id: y.id,
        periodType: 'anio' as const,
        title: y.label,
        dateRangeLabel: `1 Enero - 31 Diciembre ${y.year}`,
        year: y.year,
        isCurrent: y.isCurrent,
        isClosed: y.isClosed,
        totalWater: parseFloat(y.totalWater.toFixed(2)),
        totalElectric: parseFloat(y.totalElectric.toFixed(2)),
        totalGas: parseFloat(y.totalGas.toFixed(2)),
        totalReadingsCount: y.readingsCount,
        byMeter: Array.from(y.byMeter.values()).map(b => ({ ...b, consumption: parseFloat(b.consumption.toFixed(2)) })),
        readings: y.readings.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())
      }))
      .sort((a, b) => b.year - a.year);

    // Available years in dataset
    const availableYearsSet = new Set<number>([now.getFullYear()]);
    allEnrichedReadings.forEach(r => availableYearsSet.add(r.dateObj.getFullYear()));
    const availableYears = Array.from(availableYearsSet).sort((a, b) => b - a);

    return {
      weeks: weeksList,
      months: monthsList,
      years: yearsList,
      availableYears
    };
  }, [meterReadingsLog, meters]);

  // Helpers
  const getTypeBadge = (type: MeterType) => {
    switch (type) {
      case 'agua':
        return {
          label: 'Agua Potable',
          icon: Droplets,
          bg: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
          dot: 'bg-blue-400'
        };
      case 'energia':
        return {
          label: 'Energía Eléctrica',
          icon: Zap,
          bg: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400'
        };
      case 'gas':
        return {
          label: 'Gas Natural / GLP',
          icon: Flame,
          bg: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-400'
        };
      default:
        return {
          label: 'Otro Medidor',
          icon: Gauge,
          bg: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
          dot: 'bg-purple-400'
        };
    }
  };



  // Open New Reading Modal for specific meter
  const handleOpenNewReading = (meter?: MeterDefinition) => {
    const target = meter || meters[0];
    if (!target) {
      alert('Primero debes registrar al menos un contador.');
      return;
    }

    const stats = getMeterStats(target.id);
    const lastVal = stats.last ? stats.last.currentValue : target.initialReading;

    setSelectedMeterForReading(target);
    setReadingForm({
      meterId: target.id,
      currentValue: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
      technicianName: currentUser?.displayName || 'Juan Mateo Ramos',
      photoUrl: '',
      recognitionMethod: 'manual',
      notes: ''
    });
    setIsReadingModalOpen(true);
  };

  // Handle Submit New Reading
  const handleSaveReading = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingReading) return;
    if (!readingForm.meterId || readingForm.currentValue === '') {
      notify('⚠️ Por favor ingresa el valor de la lectura.');
      return;
    }

    const meter = meters.find(m => m.id === readingForm.meterId);
    if (!meter) return;

    const val = parseFloat(readingForm.currentValue);
    if (isNaN(val)) {
      notify('⚠️ El valor de la lectura debe ser un número válido.');
      return;
    }

    const readingData = {
      meterId: meter.id,
      meterName: meter.name,
      meterCode: meter.code,
      meterType: meter.type,
      unit: meter.unit,
      currentValue: val,
      date: readingForm.date,
      time: readingForm.time,
      timestamp: `${readingForm.date}T${readingForm.time}:00.000Z`,
      technicianName: readingForm.technicianName,
      technicianId: currentUser?.id,
      photoUrl: readingForm.photoUrl || undefined,
      recognitionMethod: readingForm.recognitionMethod,
      notes: readingForm.notes || undefined
    };

    // Cerrar el modal instantáneamente y limpiar formulario de una (cero demoras)
    setIsReadingModalOpen(false);
    setSelectedMeterForReading(null);
    setPreviewPhotoUrl(null);
    setReadingForm({
      meterId: '',
      currentValue: '',
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
      technicianName: currentUser?.displayName || 'Juan Mateo Ramos',
      photoUrl: '',
      recognitionMethod: 'manual',
      notes: ''
    });

    try {
      setIsSubmittingReading(true);
      await recordMeterReading(readingData);
    } catch (err) {
      console.error('Error guardando lectura:', err);
    } finally {
      setIsSubmittingReading(false);
    }
  };

  // Helper to generate a guaranteed unique next meter code
  const getNextMeterCode = (type: MeterType = 'agua') => {
    const prefix = type === 'agua' ? 'MED-AGU' : type === 'energia' ? 'MED-ENE' : type === 'gas' ? 'MED-GAS' : 'MED-OTR';
    const existingCodes = new Set((meters || []).map(m => (m.code || '').trim().toUpperCase()));
    let count = (meters || []).length + 1;
    let candidate = `${prefix}-${String(count).padStart(2, '0')}`;
    while (existingCodes.has(candidate)) {
      count++;
      candidate = `${prefix}-${String(count).padStart(2, '0')}`;
    }
    return candidate;
  };

  // Open Meter Config Modal
  const handleOpenMeterConfig = (meterToEdit?: MeterDefinition) => {
    if (meterToEdit) {
      setEditingMeter(meterToEdit);
      setMeterForm({
        code: meterToEdit.code,
        name: meterToEdit.name,
        type: meterToEdit.type,
        unit: meterToEdit.unit,
        location: meterToEdit.location,
        brandModel: meterToEdit.brandModel || '',
        serialNumber: meterToEdit.serialNumber || '',
        initialReading: String(meterToEdit.initialReading),
        alertThresholdPerDay: meterToEdit.alertThresholdPerDay ? String(meterToEdit.alertThresholdPerDay) : '',
        photoUrl: meterToEdit.photoUrl || '',
        status: meterToEdit.status,
        notes: meterToEdit.notes || '',
        isMainMeter: !!meterToEdit.isMainMeter,
        parentMeterId: meterToEdit.parentMeterId || '',
        parentMeterName: meterToEdit.parentMeterName || '',
        areaTag: meterToEdit.areaTag || 'general'
      });
    } else {
      setEditingMeter(null);
      const nextCode = getNextMeterCode('agua');
      setMeterForm({
        code: nextCode,
        name: '',
        type: 'agua',
        unit: 'm³',
        location: 'Área Técnica',
        brandModel: '',
        serialNumber: '',
        initialReading: '0',
        alertThresholdPerDay: '',
        photoUrl: '',
        status: 'activo',
        notes: '',
        isMainMeter: false,
        parentMeterId: '',
        parentMeterName: '',
        areaTag: 'general'
      });
    }
    setIsMeterConfigModalOpen(true);
  };

  // Save Meter Config (supports creating one or creating multiple successively)
  const handleSaveMeterConfig = async (e: React.FormEvent, createAnother: boolean = false) => {
    if (e && e.preventDefault) e.preventDefault();
    if (isSubmittingMeterConfig) return;

    const isEditing = !!editingMeter;
    const meterId = editingMeter?.id;

    let code = meterForm.code.trim().toUpperCase();
    if (!code) {
      code = getNextMeterCode(meterForm.type);
    }

    const defaultTypeName = meterForm.type === 'agua' ? 'Contador de Agua' : meterForm.type === 'energia' ? 'Contador de Energía' : meterForm.type === 'gas' ? 'Contador de Gas' : 'Contador';
    const name = meterForm.name.trim() || `${defaultTypeName} (${code})`;

    const initReading = parseFloat(meterForm.initialReading) || 0;
    const threshold = meterForm.alertThresholdPerDay ? parseFloat(meterForm.alertThresholdPerDay) : undefined;
    const parentMeter = meters.find(m => m.id === meterForm.parentMeterId);

    const meterData = {
      code,
      name,
      type: meterForm.type,
      unit: meterForm.unit.trim() || (meterForm.type === 'energia' ? 'kWh' : 'm³'),
      location: meterForm.location.trim() || 'Área Técnica',
      brandModel: meterForm.brandModel.trim() || undefined,
      serialNumber: meterForm.serialNumber.trim() || undefined,
      initialReading: initReading,
      currentReading: initReading,
      alertThresholdPerDay: threshold,
      photoUrl: meterForm.photoUrl.trim() || undefined,
      status: meterForm.status,
      notes: meterForm.notes.trim() || undefined,
      isMainMeter: meterForm.isMainMeter,
      parentMeterId: meterForm.parentMeterId || undefined,
      parentMeterName: parentMeter ? parentMeter.name : undefined,
      areaTag: meterForm.areaTag || undefined
    };

    try {
      setIsSubmittingMeterConfig(true);
      if (isEditing && meterId) {
        await updateMeter(meterId, meterData);
        setIsMeterConfigModalOpen(false);
        setEditingMeter(null);
      } else {
        await addMeter(meterData);
        setSelectedTypeFilter('todos');
        setSearchTerm('');

        if (createAnother) {
          // Prepare form immediately for the next individual meter
          const nextType = meterForm.type;
          const nextCode = getNextMeterCode(nextType);
          setMeterForm({
            code: nextCode,
            name: '',
            type: nextType,
            unit: meterForm.unit,
            location: meterForm.location || 'Área Técnica',
            brandModel: '',
            serialNumber: '',
            initialReading: '0',
            alertThresholdPerDay: '',
            photoUrl: '',
            status: 'activo',
            notes: '',
            isMainMeter: false,
            parentMeterId: '',
            parentMeterName: '',
            areaTag: 'general'
          });
          setEditingMeter(null);
        } else {
          setIsMeterConfigModalOpen(false);
          setEditingMeter(null);
        }
      }
    } catch (err) {
      console.error('Error guardando contador:', err);
    } finally {
      setIsSubmittingMeterConfig(false);
    }
  };

  // Cargar contadores y lecturas iniciales estándar del hotel (Principal de Agua, Cocina, Piscina, Energía, Gas)
  const handleLoadStandardHotelMeters = async () => {
    try {
      for (const m of INITIAL_METERS) {
        if (!meters.some(existing => existing.id === m.id || existing.code === m.code)) {
          await addMeter(m);
        }
      }
      for (const r of INITIAL_METER_READINGS) {
        if (!meterReadingsLog.some(existing => existing.id === r.id)) {
          await recordMeterReading(r);
        }
      }
    } catch (e) {
      console.error('Error cargando contadores estándar:', e);
    }
  };

  // Launch AI Camera Scanner for a Meter
  const handleLaunchAIScanner = (meter: MeterDefinition) => {
    setScannerTargetMeter(meter);
    setIsScannerOpen(true);
  };

  // Apply OCR Scan Result from Camera Modal
  const handleApplyAIScan = (result: MeterScanResult) => {
    if (!scannerTargetMeter) return;

    setSelectedMeterForReading(scannerTargetMeter);
    setReadingForm({
      meterId: scannerTargetMeter.id,
      currentValue: String(result.value),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }),
      technicianName: currentUser?.displayName || 'Juan Mateo Ramos',
      photoUrl: result.photoUrl || '',
      recognitionMethod: 'foto_ia',
      notes: result.notes || 'Lectura reconocida con IA'
    });
    setIsReadingModalOpen(true);
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredReadings.length === 0) {
      alert('No hay lecturas para exportar.');
      return;
    }

    const headers = ['Fecha', 'Hora', 'Contador', 'Codigo', 'Tipo', 'Lectura Actual', 'Lectura Previa', 'Consumo Calculado', 'Unidad', 'Intervalo (Horas)', 'Tecnico', 'Metodo', 'Notas'];
    const rows = filteredReadings.map(r => [
      `"${r.date}"`,
      `"${r.time}"`,
      `"${r.meterName}"`,
      `"${r.meterCode || ''}"`,
      `"${r.meterType}"`,
      r.currentValue,
      r.previousValue !== undefined ? r.previousValue : '',
      r.consumption !== undefined ? r.consumption : '',
      `"${r.unit}"`,
      r.intervalHours !== undefined ? r.intervalHours : '',
      `"${r.technicianName}"`,
      `"${r.recognitionMethod || 'manual'}"`,
      `"${r.notes || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `lecturas_contadores_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-16">
      
      {/* HEADER PRINCIPAL */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl text-white relative overflow-hidden">
        <div className="absolute -right-10 -top-10 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 -bottom-10 w-64 h-64 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-cyan-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30 shadow-inner">
                <Gauge className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
                  Lectura de Contadores & Consumos
                </h2>
                <p className="text-xs sm:text-sm text-slate-400">
                  Control de agua, energía eléctrica y gas con cálculo automático de intervalos y fotos con IA
                </p>
              </div>
            </div>
          </div>

          {/* Botones de Acción Rápida */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <button
              onClick={() => handleOpenNewReading()}
              className="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center space-x-2 text-xs sm:text-sm transition-all cursor-pointer active:scale-95"
            >
              <Camera className="w-4 h-4" />
              <span>+ Registrar Lectura</span>
            </button>

            <button
              onClick={() => handleOpenMeterConfig()}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl flex items-center space-x-2 text-xs sm:text-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 text-cyan-400" />
              <span>+ Nuevo Contador</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="p-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition-colors cursor-pointer"
              title="Exportar reporte de lecturas en CSV"
            >
              <FileDown className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* SELECTOR DE PERÍODO & MÉTRICAS KPI PRINCIPALES */}
        <div className="pt-6 mt-6 border-t border-slate-800/80 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-slate-300">
                Consumos Totales del Hotel por Período:
              </span>
            </div>

            {/* Pestañas de Período: Diario, Semanal, Mensual, Anual */}
            <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 self-start sm:self-auto overflow-x-auto">
              <button
                type="button"
                onClick={() => setKpiPeriod('diario')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                  kpiPeriod === 'diario' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Clock className="w-3 h-3" />
                <span>Diario (Hoy)</span>
              </button>
              <button
                type="button"
                onClick={() => setKpiPeriod('semanal')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                  kpiPeriod === 'semanal' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>Semanal (7d)</span>
              </button>
              <button
                type="button"
                onClick={() => setKpiPeriod('mensual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                  kpiPeriod === 'mensual' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3 h-3" />
                <span>Mensual ({currentMonthName})</span>
              </button>
              <button
                type="button"
                onClick={() => setKpiPeriod('anual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
                  kpiPeriod === 'anual' 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3 h-3" />
                <span>Anual ({currentYear})</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800/80">
              <div className="flex items-center justify-between text-slate-400 mb-1">
                <span className="text-xs font-semibold">Total Contadores</span>
                <Gauge className="w-4 h-4 text-slate-500" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-white">{metrics.totalMeters}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{metrics.waterMeters} Agua • {metrics.electricMeters} Luz • {metrics.gasMeters} Gas</p>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-blue-900/30">
              <div className="flex items-center justify-between text-blue-400 mb-1">
                <span className="text-xs font-semibold">
                  Agua ({kpiPeriod === 'diario' ? 'Diario' : kpiPeriod === 'semanal' ? 'Semanal' : kpiPeriod === 'mensual' ? 'Mensual' : 'Anual'})
                </span>
                <Droplets className="w-4 h-4 text-blue-400" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-white">
                +{metrics.waterActive.toLocaleString('es-CO')} <span className="text-xs font-normal text-blue-300">m³</span>
              </p>
              <p className="text-[10px] text-blue-300/70 mt-0.5">
                {metrics.periodLabel} • Todos los puntos
              </p>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-amber-900/30">
              <div className="flex items-center justify-between text-amber-400 mb-1">
                <span className="text-xs font-semibold">
                  Energía ({kpiPeriod === 'diario' ? 'Diario' : kpiPeriod === 'semanal' ? 'Semanal' : kpiPeriod === 'mensual' ? 'Mensual' : 'Anual'})
                </span>
                <Zap className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-white">
                +{metrics.electricActive.toLocaleString('es-CO')} <span className="text-xs font-normal text-amber-300">kWh</span>
              </p>
              <p className="text-[10px] text-amber-300/70 mt-0.5">
                {metrics.periodLabel} • Subestación
              </p>
            </div>

            <div className="bg-slate-950/60 p-3.5 rounded-2xl border border-rose-900/30">
              <div className="flex items-center justify-between text-rose-400 mb-1">
                <span className="text-xs font-semibold">
                  Gas ({kpiPeriod === 'diario' ? 'Diario' : kpiPeriod === 'semanal' ? 'Semanal' : kpiPeriod === 'mensual' ? 'Mensual' : 'Anual'})
                </span>
                <Flame className="w-4 h-4 text-rose-400" />
              </div>
              <p className="text-xl sm:text-2xl font-black text-white">
                +{metrics.gasActive.toLocaleString('es-CO')} <span className="text-xs font-normal text-rose-300">m³</span>
              </p>
              <p className="text-[10px] text-rose-300/70 mt-0.5">
                {metrics.periodLabel} • Calderas & Cocina
              </p>
            </div>
          </div>

          {/* DESGLOSE DE AGUA: CONTADOR PRINCIPAL Y PUNTOS DERIVADOS (COCINA, PISCINA, OTROS) */}
          {metrics.waterMeters > 1 && (
            <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-blue-900/40 text-xs text-slate-300 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <span className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg">
                  <Droplets className="w-3.5 h-3.5" />
                </span>
                <div>
                  <span className="font-bold text-white block">Distribución del Agua Potable ({metrics.periodLabel}):</span>
                  <span className="text-[10px] text-slate-400">Cocina y piscina derivan de la misma agua del contador principal</span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 text-[11px]">
                <span className="bg-blue-950/80 px-2.5 py-1 rounded-lg border border-blue-800/60 font-semibold text-blue-200">
                  🏢 Principal Total: <strong>+{metrics.waterActive} m³</strong>
                </span>
                {metrics.waterKitchenActive > 0 && (
                  <span className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                    🍳 Cocina: <strong>+{metrics.waterKitchenActive} m³</strong> ({metrics.waterKitchenPct}%)
                  </span>
                )}
                {metrics.waterPoolActive > 0 && (
                  <span className="bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
                    🏊 Piscina: <strong>+{metrics.waterPoolActive} m³</strong> ({metrics.waterPoolPct}%)
                  </span>
                )}
                <span className="text-slate-400 px-1 text-[10px]">
                  🏨 Resto / Habitaciones: <strong>+{Math.max(0, parseFloat((metrics.waterActive - metrics.waterKitchenActive - metrics.waterPoolActive).toFixed(2)))} m³</strong>
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* NAVEGACIÓN POR PESTAÑAS & FILTROS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        {/* Pestañas */}
        <div className="flex items-center space-x-1 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTab('cards')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'cards' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Contadores & Consumos</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'history' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Historial de Lecturas ({meterReadingsLog.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'analytics' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Intervalos & Gráficas</span>
          </button>

          <button
            onClick={() => setActiveTab('closures')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'closures' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Cierres de Períodos (Semanas/Meses/Años)</span>
          </button>

          <button
            onClick={() => setActiveTab('config')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 whitespace-nowrap ${
              activeTab === 'config' 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Ajustes & Puntos ({meters.length})</span>
          </button>
        </div>

        {/* Filtros de Tipo y Búsqueda */}
        <div className="flex items-center space-x-2">
          {/* Selector de Vista en Pestaña Contadores: Tarjetas vs Tabla */}
          {activeTab === 'cards' && (
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                  viewMode === 'cards' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Vista de Tarjetas individuales con los 4 consumos"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tarjetas</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                  viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                }`}
                title="Vista Tabla Resumen con Consumo Diario, Semanal, Mensual y Anual de cada contador"
              >
                <Table className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Tabla Resumen</span>
              </button>
            </div>
          )}

          {/* Selector Futurista de Tipo de Servicio */}
          <div className="min-w-[185px] sm:min-w-[215px]">
            <FuturisticMeterSelect
              value={selectedTypeFilter}
              onChange={(val) => setSelectedTypeFilter(val as any)}
              variant="filter"
              align="center"
              options={[
                {
                  value: 'todos',
                  label: 'Todos los Servicios',
                  sublabel: 'Agua, luz y gas unificados',
                  badge: 'Global',
                  color: 'slate',
                  code: 'ALL',
                  icon: <Gauge className="w-3.5 h-3.5 text-slate-500" />
                },
                {
                  value: 'agua',
                  label: 'Agua Potable',
                  sublabel: 'Red general y subcontadores',
                  badge: 'm³',
                  color: 'cyan',
                  code: 'AGU',
                  icon: <Droplets className="w-3.5 h-3.5 text-cyan-600" />
                },
                {
                  value: 'energia',
                  label: 'Energía Eléctrica',
                  sublabel: 'Subestación y tableros',
                  badge: 'kWh',
                  color: 'amber',
                  code: 'ELE',
                  icon: <Zap className="w-3.5 h-3.5 text-amber-600" />
                },
                {
                  value: 'gas',
                  label: 'Gas Natural / GLP',
                  sublabel: 'Calderas y cocina',
                  badge: 'm³',
                  color: 'rose',
                  code: 'GAS',
                  icon: <Flame className="w-3.5 h-3.5 text-rose-600" />
                }
              ]}
            />
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar contador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white text-slate-800 outline-none w-36 sm:w-48"
            />
          </div>
        </div>
      </div>

      {/* VISTA 1: CONTADORES Y SUS 4 CONSUMOS (DIARIO, SEMANAL, MENSUAL, ANUAL) */}
      {activeTab === 'cards' && (
        <div className="space-y-4">
          {filteredMeters.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 text-slate-500 space-y-4">
              <Gauge className="w-12 h-12 text-slate-300 mx-auto" />
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-700">No se encontraron contadores registrados</p>
                <p className="text-xs text-slate-400">Puedes agregar un nuevo contador manual o cargar los puntos estándar del hotel (Principal de Agua, Cocina, Piscina, Energía y Gas).</p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => handleOpenMeterConfig()}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Plus className="w-4 h-4 text-cyan-400" />
                  <span>+ Crear Contador Manual</span>
                </button>
                <button
                  onClick={handleLoadStandardHotelMeters}
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md shadow-blue-500/20 flex items-center space-x-1.5"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>⚡ Cargar Contadores Estándar del Hotel</span>
                </button>
              </div>
            </div>
          ) : viewMode === 'table' ? (
            /* VISTA TABLA RESUMEN EJECUTIVA CON LOS 4 CONSUMOS */
            <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Table className="w-4 h-4 text-blue-600" />
                    <span>Tabla de Consumos por Contador (Diario, Semanal, Mensual y Anual)</span>
                  </h3>
                  <p className="text-xs text-slate-400">Comparativa directa de los 4 períodos de consumo para cada uno de los contadores</p>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200">
                    {filteredMeters.length} Contadores Registrados
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-3.5 rounded-l-xl">Contador / Código</th>
                      <th className="py-3 px-3.5">Punto / Relación</th>
                      <th className="py-3 px-3.5 text-right">Última Lectura</th>
                      <th className="py-3 px-3.5 text-right bg-cyan-950 text-cyan-200">Consumo Diario</th>
                      <th className="py-3 px-3.5 text-right bg-blue-950 text-blue-200">Consumo Semanal</th>
                      <th className="py-3 px-3.5 text-right bg-indigo-950 text-indigo-200">Consumo Mensual</th>
                      <th className="py-3 px-3.5 text-right bg-emerald-950 text-emerald-200">Consumo Anual</th>
                      <th className="py-3 px-3.5 rounded-r-xl text-center">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredMeters.map(meter => {
                      const stats = getMeterStats(meter.id, meter);
                      const typeBadge = getTypeBadge(meter.type);
                      const TypeIcon = typeBadge.icon;
                      const currentVal = meter.currentReading !== undefined ? meter.currentReading : meter.initialReading;

                      return (
                        <tr key={meter.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3.5 px-3.5">
                            <div className="flex items-center space-x-2">
                              <span className={`p-1.5 rounded-lg border ${typeBadge.bg}`}>
                                <TypeIcon className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <div className="font-bold text-slate-900">{meter.name}</div>
                                <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {meter.code}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-3.5">
                            <div className="space-y-0.5">
                              <div className="text-slate-600 font-medium">📍 {meter.location}</div>
                              {stats.isMainWater ? (
                                <span className="inline-flex items-center text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                                  💧 Principal Acometida
                                </span>
                              ) : stats.isSubWater ? (
                                <span className="inline-flex items-center text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                                  💧 Subcontador ({meter.areaTag || 'Misma agua'})
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="py-3.5 px-3.5 text-right font-mono font-bold text-slate-900">
                            {currentVal.toLocaleString('es-CO')} <span className="text-slate-500 font-normal text-[11px]">{meter.unit}</span>
                          </td>
                          {/* 1. Consumo Diario (Última lectura - no acumula) */}
                          <td className="py-3.5 px-3.5 text-right font-mono font-black text-cyan-700 bg-cyan-50/40">
                            <div>+{stats.daily.toLocaleString('es-CO')} <span className="text-[10px] font-normal text-slate-500">{meter.unit}</span></div>
                            <div className="text-[9px] text-slate-500 font-normal">
                              {stats.trendComparison === 'mayor' ? `🔺 Mayor (+${stats.trendDiff})` : stats.trendComparison === 'menor' ? `🔻 Menor (-${stats.trendDiff})` : stats.dailyLabel}
                            </div>
                          </td>
                          {/* 2. Consumo Semanal (Semana Lun-Dom) */}
                          <td className="py-3.5 px-3.5 text-right font-mono font-black text-blue-700 bg-blue-50/40">
                            <div>+{stats.weekly.toLocaleString('es-CO')} <span className="text-[10px] font-normal text-slate-500">{meter.unit}</span></div>
                            <div className="text-[9px] text-slate-400 font-normal">Semana ({stats.weeklyReadingsCount} {stats.weeklyReadingsCount === 1 ? 'lec.' : 'lecs.'})</div>
                          </td>
                          {/* 3. Consumo Mensual (Mes Calendario) */}
                          <td className="py-3.5 px-3.5 text-right font-mono font-black text-indigo-700 bg-indigo-50/40">
                            <div>+{stats.monthly.toLocaleString('es-CO')} <span className="text-[10px] font-normal text-slate-500">{meter.unit}</span></div>
                            <div className="text-[9px] text-slate-400 font-normal">{currentMonthName} ({stats.monthlyReadingsCount})</div>
                          </td>
                          {/* 4. Consumo Anual (Año Calendario) */}
                          <td className="py-3.5 px-3.5 text-right font-mono font-black text-emerald-700 bg-emerald-50/40">
                            <div>+{stats.yearly.toLocaleString('es-CO')} <span className="text-[10px] font-normal text-slate-500">{meter.unit}</span></div>
                            <div className="text-[9px] text-slate-400 font-normal">Año {currentYear} ({stats.yearlyReadingsCount})</div>
                          </td>
                          <td className="py-3.5 px-3.5 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => handleLaunchAIScanner(meter)}
                                className="p-1.5 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white rounded-lg transition-colors cursor-pointer"
                                title="Foto con IA"
                              >
                                <Sparkles className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenNewReading(meter)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                                title="Registrar lectura"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* VISTA DE CUADRÍCULA DE TARJETAS INDIVIDUALES */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMeters.map(meter => {
                const typeBadge = getTypeBadge(meter.type);
                const TypeIcon = typeBadge.icon;
                const stats = getMeterStats(meter.id, meter);
                const currentVal = meter.currentReading !== undefined ? meter.currentReading : meter.initialReading;

                return (
                  <div 
                    key={meter.id} 
                    className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 group"
                  >
                    {/* Encabezado del Contador */}
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${typeBadge.bg}`}>
                          <TypeIcon className="w-3.5 h-3.5" />
                          <span>{typeBadge.label}</span>
                        </span>

                        <div className="flex items-center space-x-1 text-slate-400">
                          <button
                            onClick={() => handleOpenMeterConfig(meter)}
                            className="p-1.5 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                            title="Editar ajustes del contador"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`¿Estás seguro de eliminar el contador "${meter.name}" (${meter.code})?`)) {
                                await deleteMeter(meter.id);
                              }
                            }}
                            className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer text-slate-400"
                            title="Eliminar contador"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-3">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {meter.code}
                          </span>
                          <h3 className="font-bold text-base text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {meter.name}
                          </h3>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center space-x-1">
                          <span>📍 {meter.location}</span>
                        </p>
                      </div>

                      {/* Relación Contador Principal vs Subcontador de Agua */}
                      {stats.isMainWater && (
                        <div className="mt-2.5 p-2 bg-blue-50/80 rounded-xl border border-blue-200 text-[11px] text-blue-900 flex items-center space-x-2">
                          <Droplets className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="font-bold">Contador Principal de Agua:</span>
                          <span className="text-blue-700">Alimenta todo el hotel y deriva a cocina y piscina.</span>
                        </div>
                      )}
                      {stats.isSubWater && (
                        <div className="mt-2.5 p-2 bg-cyan-50/80 rounded-xl border border-cyan-200 text-[11px] text-cyan-900 flex items-center space-x-2">
                          <Droplets className="w-3.5 h-3.5 text-cyan-600 shrink-0" />
                          <span className="font-bold">Subcontador ({meter.areaTag || 'Derivado'}):</span>
                          <span className="text-cyan-700">Misma agua del contador principal para este punto específico.</span>
                        </div>
                      )}
                    </div>

                    {/* Lectura Actual & Consumo en Intervalo */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-xs font-semibold text-slate-500">Última Lectura:</span>
                        <div className="text-right">
                          <span className="text-2xl font-mono font-black text-slate-900 tracking-tight">
                            {currentVal.toLocaleString('es-CO')}
                          </span>
                          <span className="ml-1 font-bold text-xs text-slate-500">{meter.unit}</span>
                        </div>
                      </div>

                      {/* Consumo Calculado en el Intervalo */}
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                        <span className="text-slate-500 font-medium">
                          Consumo en intervalo ({stats.lastIntervalHours}h):
                        </span>
                        <span className={`font-mono font-black px-2 py-0.5 rounded-md ${
                          stats.lastIntervalConsumption > 0 
                            ? 'bg-blue-100 text-blue-900 border border-blue-200' 
                            : 'bg-slate-200 text-slate-700'
                        }`}>
                          +{stats.lastIntervalConsumption.toLocaleString('es-CO')} {meter.unit}
                        </span>
                      </div>

                      {meter.lastReadingDate && (
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>Registrado: {meter.lastReadingDate} {meter.lastReadingTime || ''}</span>
                          {stats.last?.photoUrl && (
                            <button
                              onClick={() => setPreviewPhotoUrl(stats.last?.photoUrl || null)}
                              className="text-emerald-600 font-bold flex items-center space-x-1 hover:underline cursor-pointer"
                            >
                              <ImageIcon className="w-3 h-3" />
                              <span>Ver Foto</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* BLOQUE DE LOS 4 CONSUMOS: DIARIO, SEMANAL, MENSUAL, ANUAL */}
                    <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                          <Activity className="w-3.5 h-3.5 text-blue-600" />
                          <span>Consumos de este Contador</span>
                        </span>
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold border border-blue-200">
                          4 Períodos
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {/* 1. Consumo Diario (Delta de la última lectura realizada - No acumula) */}
                        <div className="bg-gradient-to-br from-cyan-50/70 to-blue-50/40 p-2.5 rounded-xl border border-cyan-200/80 transition-all hover:shadow-xs flex flex-col justify-between">
                          <div className="flex items-center justify-between text-cyan-800 text-[10px] font-bold mb-0.5">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3 text-cyan-600" />
                              <span>Consumo Diario</span>
                            </span>
                            {stats.trendComparison === 'mayor' && (
                              <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200" title="Consumo mayor que la lectura anterior">
                                🔺 Mayor (+{stats.trendDiff})
                              </span>
                            )}
                            {stats.trendComparison === 'menor' && (
                              <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-200" title="Consumo menor que la lectura anterior">
                                🔻 Menor (-{stats.trendDiff})
                              </span>
                            )}
                            {stats.trendComparison === 'igual' && stats.last && (
                              <span className="text-[9px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200" title="Mismo consumo que la lectura anterior">
                                ➖ Igual
                              </span>
                            )}
                          </div>
                          <p className="font-mono font-black text-slate-900 text-sm tracking-tight">
                            +{stats.daily.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            <span className="text-[10px] font-semibold text-cyan-700 ml-1">{meter.unit}</span>
                          </p>
                          <span className="text-[9px] text-slate-500 font-medium mt-0.5 truncate">
                            Última: {stats.dailyLabel}
                          </span>
                        </div>

                        {/* 2. Consumo Semanal (Acumulado de la Semana Calendario en curso) */}
                        <div className="bg-gradient-to-br from-blue-50/70 to-indigo-50/40 p-2.5 rounded-xl border border-blue-200/80 transition-all hover:shadow-xs flex flex-col justify-between">
                          <div className="flex items-center justify-between text-blue-800 text-[10px] font-bold mb-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-blue-600" />
                              <span>Consumo Semanal</span>
                            </span>
                          </div>
                          <p className="font-mono font-black text-slate-900 text-sm tracking-tight">
                            +{stats.weekly.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            <span className="text-[10px] font-semibold text-blue-700 ml-1">{meter.unit}</span>
                          </p>
                          <span className="text-[9px] text-slate-500 font-medium mt-0.5 truncate">
                            Semana Lun-Dom ({stats.weeklyReadingsCount} {stats.weeklyReadingsCount === 1 ? 'lectura' : 'lecturas'})
                          </span>
                        </div>

                        {/* 3. Consumo Mensual (Acumulado del Mes Calendario en curso) */}
                        <div className="bg-gradient-to-br from-indigo-50/70 to-purple-50/40 p-2.5 rounded-xl border border-indigo-200/80 transition-all hover:shadow-xs flex flex-col justify-between">
                          <div className="flex items-center justify-between text-indigo-800 text-[10px] font-bold mb-0.5">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-indigo-600" />
                              <span>Consumo Mensual</span>
                            </span>
                          </div>
                          <p className="font-mono font-black text-slate-900 text-sm tracking-tight">
                            +{stats.monthly.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            <span className="text-[10px] font-semibold text-indigo-700 ml-1">{meter.unit}</span>
                          </p>
                          <span className="text-[9px] text-slate-500 font-medium mt-0.5 truncate">
                            {currentMonthName} ({stats.monthlyReadingsCount} {stats.monthlyReadingsCount === 1 ? 'lectura' : 'lecturas'})
                          </span>
                        </div>

                        {/* 4. Consumo Anual (Acumulado del Año Calendario en curso) */}
                        <div className="bg-gradient-to-br from-emerald-50/70 to-teal-50/40 p-2.5 rounded-xl border border-emerald-200/80 transition-all hover:shadow-xs flex flex-col justify-between">
                          <div className="flex items-center justify-between text-emerald-800 text-[10px] font-bold mb-0.5">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="w-3 h-3 text-emerald-600" />
                              <span>Consumo Anual</span>
                            </span>
                          </div>
                          <p className="font-mono font-black text-slate-900 text-sm tracking-tight">
                            +{stats.yearly.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                            <span className="text-[10px] font-semibold text-emerald-700 ml-1">{meter.unit}</span>
                          </p>
                          <span className="text-[9px] text-slate-500 font-medium mt-0.5 truncate">
                            Año {currentYear} ({stats.yearlyReadingsCount} {stats.yearlyReadingsCount === 1 ? 'lectura' : 'lecturas'})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Botones de Acción de la Tarjeta */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        onClick={() => handleLaunchAIScanner(meter)}
                        className="py-2.5 px-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-md shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
                        title="Tomar foto con cámara y reconocer números con IA"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Foto con IA</span>
                      </button>

                      <button
                        onClick={() => handleOpenNewReading(meter)}
                        className="py-2.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs flex items-center justify-center space-x-1 transition-colors cursor-pointer"
                        title="Ingresar lectura manualmente o con foto de galería"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-slate-600" />
                        <span>Manual / Foto</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* VISTA 2: HISTORIAL COMPLETO DE LECTURAS */}
      {activeTab === 'history' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-bold text-base text-slate-900">Historial Cronológico de Lecturas</h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-200">
                  {filteredReadings.length !== meterReadingsLog.length ? `${filteredReadings.length} de ${meterReadingsLog.length}` : `${meterReadingsLog.length}`} {meterReadingsLog.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>
              <p className="text-xs text-slate-400">Registro histórico con consumo por intervalo, método y evidencia fotográfica</p>
            </div>

            <div className="w-full sm:w-auto min-w-[220px]">
              <FuturisticMeterSelect
                value={selectedMeterFilter}
                onChange={(val) => setSelectedMeterFilter(val)}
                variant="filter"
                align="center"
                placeholder="Filtrar por contador..."
                options={[
                  {
                    value: 'todos',
                    label: 'Todos los Contadores',
                    sublabel: 'Consolidado general del hotel',
                    badge: `${meters.length}`,
                    color: 'slate',
                    code: 'TODOS',
                    icon: <Layers className="w-3.5 h-3.5 text-slate-500" />
                  },
                  ...meters.map(m => ({
                    value: m.id,
                    label: m.name,
                    sublabel: `${m.location} (${m.unit})`,
                    badge: m.unit,
                    code: m.code,
                    color: (m.type === 'agua' ? 'cyan' : m.type === 'energia' ? 'amber' : m.type === 'gas' ? 'rose' : 'slate') as any,
                    icon: m.type === 'agua' ? <Droplets className="w-3.5 h-3.5 text-cyan-600" /> : m.type === 'energia' ? <Zap className="w-3.5 h-3.5 text-amber-600" /> : m.type === 'gas' ? <Flame className="w-3.5 h-3.5 text-rose-600" /> : <Gauge className="w-3.5 h-3.5 text-slate-600" />
                  }))
                ]}
              />
            </div>
          </div>

          {filteredReadings.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No hay lecturas registradas con los filtros seleccionados.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider">
                    <th className="py-3 px-3.5 rounded-l-xl">Fecha / Hora</th>
                    <th className="py-3 px-3.5">Contador</th>
                    <th className="py-3 px-3.5 text-right">Lectura Anterior</th>
                    <th className="py-3 px-3.5 text-right">Lectura Actual</th>
                    <th className="py-3 px-3.5 text-right">Consumo Intervalo</th>
                    <th className="py-3 px-3.5 text-center">Intervalo</th>
                    <th className="py-3 px-3.5">Técnico</th>
                    <th className="py-3 px-3.5 text-center">Evidencia</th>
                    <th className="py-3 px-3.5 rounded-r-xl text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredReadings.map((r, idx) => {
                    const typeBadge = getTypeBadge(r.meterType);
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3.5 font-mono font-bold text-slate-900">
                          {r.date} <span className="text-slate-400 font-normal">{r.time}</span>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-900">{r.meterName}</span>
                            {r.meterCode && (
                              <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                                {r.meterCode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono text-slate-500">
                          {r.previousValue !== undefined ? `${r.previousValue.toLocaleString('es-CO')} ${r.unit}` : '—'}
                        </td>
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-900">
                          {r.currentValue.toLocaleString('es-CO')} {r.unit}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-md font-mono font-extrabold text-xs ${
                            r.consumption && r.consumption > 0 
                              ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' 
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            +{r.consumption !== undefined ? r.consumption.toLocaleString('es-CO') : 0} {r.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 text-center font-mono text-slate-500 text-[11px]">
                          {r.intervalHours ? `${r.intervalHours}h` : '24h'}
                        </td>
                        <td className="py-3 px-3.5 font-medium text-slate-800">
                          {r.technicianName}
                        </td>
                        <td className="py-3 px-3.5 text-center">
                          {r.photoUrl ? (
                            <button
                              onClick={() => setPreviewPhotoUrl(r.photoUrl || null)}
                              className="p-1 text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors inline-flex items-center space-x-1 text-[10px] font-bold cursor-pointer"
                              title="Ver foto capturada del contador"
                            >
                              <ImageIcon className="w-3 h-3 text-emerald-600" />
                              <span>Foto</span>
                            </button>
                          ) : (
                            <span className="text-slate-300 text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-right">
                          <button
                            onClick={async () => {
                              if (confirm('¿Deseas eliminar este registro de lectura?')) {
                                await deleteMeterReading(r.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Eliminar registro"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* VISTA 3: INTERVALOS & GRÁFICAS COMPARATIVAS */}
      {activeTab === 'analytics' && (
        <div className="space-y-5">
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-base text-slate-900">Análisis de Intervalos y Consumo por Período</h3>
              <p className="text-xs text-slate-400">Comparativa visual del consumo registrado en cada intervalo entre lecturas</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['agua', 'energia', 'gas'].map((serviceType) => {
                const typeMeters = meters.filter(m => m.type === serviceType);
                const typeBadge = getTypeBadge(serviceType as MeterType);
                const TypeIcon = typeBadge.icon;
                const typeLogs = meterReadingsLog
                  .filter(r => r.meterType === serviceType)
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(-6);

                const totalTypeConsumption = typeLogs.reduce((acc, r) => acc + (r.consumption || 0), 0);
                const maxVal = Math.max(...typeLogs.map(r => r.consumption || 0), 1);

                return (
                  <div key={serviceType} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${typeBadge.bg}`}>
                        <TypeIcon className="w-3.5 h-3.5" />
                        <span>{typeBadge.label}</span>
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-700">
                        {typeLogs.length} lecturas
                      </span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-xs text-slate-500">Consumo Acumulado Período:</span>
                      <p className="text-xl font-mono font-black text-slate-900">
                        {totalTypeConsumption.toLocaleString('es-CO')} <span className="text-xs font-normal text-slate-500">{typeLogs[0]?.unit || 'unidades'}</span>
                      </p>
                    </div>

                    {/* Gráfico de Barras Simple y Ultra Limpio */}
                    <div className="space-y-2 pt-2 border-t border-slate-200/80">
                      <span className="text-[11px] font-bold text-slate-600 block">Histórico de Consumos por Intervalo:</span>
                      {typeLogs.length === 0 ? (
                        <p className="text-[11px] text-slate-400 italic py-4 text-center">Sin lecturas suficientes</p>
                      ) : (
                        <div className="space-y-2">
                          {typeLogs.map((log) => {
                            const pct = Math.min(Math.round(((log.consumption || 0) / maxVal) * 100), 100);
                            return (
                              <div key={log.id} className="space-y-1">
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-medium text-slate-700">{log.date} ({log.intervalHours || 24}h)</span>
                                  <span className="font-mono font-bold text-slate-900">+{log.consumption || 0} {log.unit}</span>
                                </div>
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all duration-500 ${
                                      serviceType === 'agua' ? 'bg-blue-600' :
                                      serviceType === 'energia' ? 'bg-amber-500' : 'bg-rose-500'
                                    }`}
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VISTA 4: CIERRES HISTÓRICOS DE CONSUMOS (SEMANALES, MENSUALES Y ANUALES) */}
      {activeTab === 'closures' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-6">
          {/* Header del Módulo de Cierres Históricos */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="space-y-1">
              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl border border-blue-200">
                  <Archive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-lg text-slate-900 flex items-center gap-2">
                    <span>Histórico de Cierres & Consumos Guardados</span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                      Almanaque Colombiano
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Supervisión de consumos consolidados por Semana (Lun-Dom), Mes y Año. Al terminar cada ciclo la cifra se archiva y el nuevo período inicia en cero.
                  </p>
                </div>
              </div>
            </div>

            {/* Sub-selector de tipo de cierre: Semanas, Meses, Años */}
            <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start md:self-auto">
              <button
                type="button"
                onClick={() => setClosuresPeriodType('semanas')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  closuresPeriodType === 'semanas'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Semanas ({historicalClosures.weeks.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setClosuresPeriodType('meses')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  closuresPeriodType === 'meses'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Meses ({historicalClosures.months.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setClosuresPeriodType('anios')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 ${
                  closuresPeriodType === 'anios'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" />
                <span>Años ({historicalClosures.years.length})</span>
              </button>
            </div>
          </div>

          {/* Tarjeta Informativa de Regla de Negocio */}
          <div className="p-4 bg-gradient-to-r from-blue-50/80 via-cyan-50/50 to-indigo-50/80 rounded-2xl border border-blue-200/80 text-xs text-blue-950 flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-900 block">
                Control Automático por Calendario Colombiano:
              </span>
              <p className="text-slate-600 leading-relaxed">
                • <strong>Consumo Diario:</strong> Muestra el consumo individual de cada lectura tomada (indica si fue mayor o menor respecto a la previa sin acumularse).<br />
                • <strong>Consumo Semanal:</strong> Suma exclusivamente las lecturas desde el <strong>Lunes 00:00 al Domingo 23:59</strong>. Al llegar el nuevo lunes, el contador en vivo se reinicia a 0.00 y el total de la semana queda guardado aquí permanentemente.<br />
                • <strong>Consumo Mensual & Anual:</strong> Acumulan durante todo el mes en curso y año calendario respectivo, archivando cada cierre para auditorías y comparativas de costos.
              </p>
            </div>
          </div>

          {/* LISTADO DE PERIODOS GUARDADOS (SEMANAS, MESES O AÑOS) */}
          {(() => {
            const listToRender = 
              closuresPeriodType === 'semanas' ? historicalClosures.weeks :
              closuresPeriodType === 'meses' ? historicalClosures.months :
              historicalClosures.years;

            if (listToRender.length === 0) {
              return (
                <div className="p-10 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 space-y-2">
                  <Archive className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="font-bold text-sm text-slate-700">No hay registros de lecturas suficientes para generar cierres</p>
                  <p className="text-xs text-slate-400">Registra lecturas en tus contadores para ver los consumos consolidados por semana, mes y año.</p>
                </div>
              );
            }

            return (
              <div className="space-y-4">
                {listToRender.map((closure) => {
                  const isExpanded = expandedPeriodId === closure.id;

                  return (
                    <div
                      key={closure.id}
                      className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                        closure.isCurrent
                          ? 'border-blue-300 bg-blue-50/30 shadow-sm ring-1 ring-blue-400/30'
                          : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                      }`}
                    >
                      {/* Cabecera del Cierre / Período */}
                      <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-xs font-black text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                              {closure.id}
                            </span>
                            <h4 className="font-black text-base text-slate-900">
                              {closure.title}
                            </h4>
                            {closure.isCurrent ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-600 text-white shadow-xs">
                                <Activity className="w-3 h-3 animate-pulse" />
                                <span>Período en Curso (Abierto)</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                                <Lock className="w-3 h-3 text-slate-500" />
                                <span>Cierre Archivado</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 flex items-center space-x-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>Rango: <strong>{closure.dateRangeLabel}</strong></span>
                            <span>•</span>
                            <span>{closure.totalReadingsCount} {closure.totalReadingsCount === 1 ? 'lectura cargada' : 'lecturas cargadas'}</span>
                          </p>
                        </div>

                        {/* Totales del Período (Agua, Electricidad, Gas) */}
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="bg-white px-3.5 py-2 rounded-xl border border-blue-200/80 shadow-xs flex items-center space-x-2.5 min-w-[110px]">
                            <Droplets className="w-4 h-4 text-blue-500" />
                            <div>
                              <span className="text-[10px] font-semibold text-slate-400 block uppercase">Agua</span>
                              <span className="text-sm font-mono font-black text-blue-900">
                                +{closure.totalWater.toLocaleString('es-CO')} <span className="text-[10px] font-normal text-slate-500">m³</span>
                              </span>
                            </div>
                          </div>

                          <div className="bg-white px-3.5 py-2 rounded-xl border border-amber-200/80 shadow-xs flex items-center space-x-2.5 min-w-[110px]">
                            <Zap className="w-4 h-4 text-amber-500" />
                            <div>
                              <span className="text-[10px] font-semibold text-slate-400 block uppercase">Energía</span>
                              <span className="text-sm font-mono font-black text-amber-900">
                                +{closure.totalElectric.toLocaleString('es-CO')} <span className="text-[10px] font-normal text-slate-500">kWh</span>
                              </span>
                            </div>
                          </div>

                          <div className="bg-white px-3.5 py-2 rounded-xl border border-rose-200/80 shadow-xs flex items-center space-x-2.5 min-w-[110px]">
                            <Flame className="w-4 h-4 text-rose-500" />
                            <div>
                              <span className="text-[10px] font-semibold text-slate-400 block uppercase">Gas</span>
                              <span className="text-sm font-mono font-black text-rose-900">
                                +{closure.totalGas.toLocaleString('es-CO')} <span className="text-[10px] font-normal text-slate-500">m³</span>
                              </span>
                            </div>
                          </div>

                          {/* Botón Desplegar Detalle por Contador */}
                          <button
                            type="button"
                            onClick={() => setExpandedPeriodId(isExpanded ? null : closure.id)}
                            className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all cursor-pointer flex items-center space-x-1"
                            title="Ver desglose por cada contador"
                          >
                            <span>{isExpanded ? 'Ocultar Detalle' : 'Ver Detalle'}</span>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {/* Desglose Detallado Expandible por Contador */}
                      {isExpanded && (
                        <div className="border-t border-slate-200/80 bg-slate-50/70 p-4 sm:p-5 space-y-4 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <h5 className="font-bold text-xs uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                              <Table className="w-3.5 h-3.5 text-blue-600" />
                              <span>Consumo Desglosado por Contador en {closure.title}:</span>
                            </h5>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {closure.byMeter.length} {closure.byMeter.length === 1 ? 'contador con actividad' : 'contadores con actividad'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {closure.byMeter.map((bm) => {
                              const typeBadge = getTypeBadge(bm.meterType);
                              const TypeIcon = typeBadge.icon;

                              return (
                                <div
                                  key={bm.meterId}
                                  className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-2"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="space-y-0.5">
                                      <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${typeBadge.bg}`}>
                                        <TypeIcon className="w-3 h-3" />
                                        <span>{typeBadge.label}</span>
                                      </span>
                                      <h6 className="font-bold text-xs text-slate-900 line-clamp-1">{bm.meterName}</h6>
                                      {bm.meterCode && (
                                        <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                                          {bm.meterCode}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-lg">
                                      {bm.readingsCount} {bm.readingsCount === 1 ? 'lectura' : 'lecturas'}
                                    </span>
                                  </div>

                                  <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                                    <span className="text-[11px] text-slate-500 font-medium">Consumo acumulado:</span>
                                    <span className="font-mono font-black text-sm text-slate-900">
                                      +{bm.consumption.toLocaleString('es-CO')} <span className="text-[10px] font-normal text-slate-500">{bm.unit}</span>
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>

                          {/* Listado de Lecturas Registradas en este Período */}
                          {closure.readings.length > 0 && (
                            <div className="pt-3 border-t border-slate-200 space-y-2">
                              <span className="text-[11px] font-bold text-slate-700 block">
                                Registro Cronológico de Lecturas en este Cierre ({closure.readings.length}):
                              </span>
                              <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200 overflow-hidden">
                                  <thead>
                                    <tr className="bg-slate-100 text-slate-600 text-[10px] font-bold uppercase">
                                      <th className="py-2 px-3">Fecha & Hora</th>
                                      <th className="py-2 px-3">Contador</th>
                                      <th className="py-2 px-3 text-right">Lectura</th>
                                      <th className="py-2 px-3 text-right">Consumo</th>
                                      <th className="py-2 px-3">Técnico</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {closure.readings.map((cr) => (
                                      <tr key={cr.id} className="hover:bg-slate-50">
                                        <td className="py-2 px-3 font-medium">
                                          {cr.date} <span className="text-slate-400 text-[10px]">{cr.time || ''}</span>
                                        </td>
                                        <td className="py-2 px-3 font-bold text-slate-900">
                                          {cr.meterName || cr.meterId}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-bold">
                                          {cr.currentValue.toLocaleString('es-CO')} {cr.unit}
                                        </td>
                                        <td className="py-2 px-3 text-right font-mono font-black text-emerald-700">
                                          +{cr.incrementalConsumption.toLocaleString('es-CO')} {cr.unit}
                                        </td>
                                        <td className="py-2 px-3 text-slate-600">
                                          {cr.technicianName}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* VISTA 5: GESTIÓN & CONFIGURACIÓN DE PUNTOS DE MEDICIÓN */}
      {activeTab === 'config' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-bold text-base text-slate-900">Configuración & Puntos de Contadores</h3>
              <p className="text-xs text-slate-400">Ajusta ubicaciones, marcas, números de serie y umbrales de consumo</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={handleLoadStandardHotelMeters}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                title="Cargar puntos estándar sin sobreescribir los existentes"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Cargar Puntos Estándar</span>
              </button>
              <button
                onClick={() => handleOpenMeterConfig()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Agregar Contador</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {meters.map(meter => {
              const typeBadge = getTypeBadge(meter.type);
              const TypeIcon = typeBadge.icon;
              const stats = getMeterStats(meter.id, meter);

              return (
                <div key={meter.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-black text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {meter.code}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{meter.name}</h4>
                    </div>
                    <p className="text-xs text-slate-500">📍 {meter.location}</p>

                    {stats.isMainWater && (
                      <span className="inline-flex items-center text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                        💧 Contador Principal de Agua
                      </span>
                    )}
                    {stats.isSubWater && (
                      <span className="inline-flex items-center text-[10px] font-bold text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200">
                        💧 Subcontador de Agua ({meter.areaTag || 'Derivado'})
                      </span>
                    )}

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-600 pt-1">
                      <span>Unidad: <strong>{meter.unit}</strong></span>
                      <span>•</span>
                      <span>Lectura Inicial: <strong>{meter.initialReading} {meter.unit}</strong></span>
                      {meter.alertThresholdPerDay && (
                        <>
                          <span>•</span>
                          <span className="text-amber-700 font-bold">Máx/Día: {meter.alertThresholdPerDay} {meter.unit}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={() => handleOpenMeterConfig(meter)}
                      className="p-2 text-slate-600 hover:text-blue-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                      title="Editar contador"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (confirm(`¿Estás seguro de eliminar el contador "${meter.name}" y su configuración?`)) {
                          await deleteMeter(meter.id);
                        }
                      }}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-white rounded-xl border border-transparent hover:border-slate-200 transition-all cursor-pointer"
                      title="Eliminar contador"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: REGISTRAR NUEVA LECTURA */}
      {isReadingModalOpen && selectedMeterForReading && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200 my-auto">
            {/* Encabezado del Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">Registrar Lectura de Contador</h3>
                  <p className="text-xs text-slate-400">{selectedMeterForReading.name} ({selectedMeterForReading.code})</p>
                </div>
              </div>
              <button 
                onClick={() => setIsReadingModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReading} className="space-y-4">
              {/* Selector Futurista de Contador */}
              <div>
                <FuturisticMeterSelect
                  label="Contador Seleccionado *"
                  sublabel="Selecciona o cambia el punto a registrar"
                  value={readingForm.meterId}
                  onChange={(val) => {
                    const m = meters.find(item => item.id === val);
                    if (m) {
                      setSelectedMeterForReading(m);
                      setReadingForm(p => ({ ...p, meterId: m.id }));
                    }
                  }}
                  variant="form"
                  placeholder="Selecciona el contador..."
                  options={meters.map(m => ({
                    value: m.id,
                    label: m.name,
                    sublabel: `${m.location} • Lectura actual: ${m.currentReading.toLocaleString('es-CO')} ${m.unit}`,
                    badge: m.unit,
                    code: m.code,
                    color: (m.type === 'agua' ? 'cyan' : m.type === 'energia' ? 'amber' : m.type === 'gas' ? 'rose' : 'slate') as any,
                    icon: m.type === 'agua' ? <Droplets className="w-3.5 h-3.5 text-cyan-600" /> : m.type === 'energia' ? <Zap className="w-3.5 h-3.5 text-amber-600" /> : m.type === 'gas' ? <Flame className="w-3.5 h-3.5 text-rose-600" /> : <Gauge className="w-3.5 h-3.5 text-slate-600" />
                  }))}
                />
              </div>

              {/* Resumen de los 4 Consumos Actuales del Contador */}
              {(() => {
                const currentStats = getMeterStats(selectedMeterForReading.id, selectedMeterForReading);
                return (
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span>Consumos Registrados para este Contador:</span>
                      <span className="text-[10px] text-blue-600 font-semibold">4 Períodos</span>
                    </div>
                    <div className="grid grid-cols-4 gap-2 text-center">
                      <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                        <span className="text-[9px] font-semibold text-slate-400 block">Diario</span>
                        <span className="text-xs font-mono font-black text-cyan-700">+{currentStats.daily}</span>
                        <span className="text-[9px] text-slate-400 block truncate">{selectedMeterForReading.unit}</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                        <span className="text-[9px] font-semibold text-slate-400 block">Semanal</span>
                        <span className="text-xs font-mono font-black text-blue-700">+{currentStats.weekly}</span>
                        <span className="text-[9px] text-slate-400 block truncate">{selectedMeterForReading.unit}</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                        <span className="text-[9px] font-semibold text-slate-400 block">Mensual</span>
                        <span className="text-xs font-mono font-black text-indigo-700">+{currentStats.monthly}</span>
                        <span className="text-[9px] text-slate-400 block truncate">{selectedMeterForReading.unit}</span>
                      </div>
                      <div className="bg-white p-2 rounded-xl border border-slate-200/80">
                        <span className="text-[9px] font-semibold text-slate-400 block">Anual</span>
                        <span className="text-xs font-mono font-black text-emerald-700">+{currentStats.yearly}</span>
                        <span className="text-[9px] text-slate-400 block truncate">{selectedMeterForReading.unit}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Botón de Escaneo con IA */}
              <div className="p-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-2xl flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-blue-950 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    <span>Reconocimiento Óptico con IA</span>
                  </span>
                  <p className="text-[11px] text-blue-700">Toma una foto al display o aguja y la IA lee los números</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsReadingModalOpen(false);
                    handleLaunchAIScanner(selectedMeterForReading);
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 cursor-pointer"
                >
                  Abrir Cámara IA
                </button>
              </div>

              {/* Valor de la Lectura Actual */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Lectura Actual ({selectedMeterForReading.unit}) *
                  </label>
                  {selectedMeterForReading.currentReading !== undefined && (
                    <span className="text-[11px] text-slate-400 font-mono">
                      Previa: {selectedMeterForReading.currentReading} {selectedMeterForReading.unit}
                    </span>
                  )}
                </div>
                <input
                  type="number"
                  step="any"
                  placeholder="ej. 48940"
                  value={readingForm.currentValue}
                  onChange={(e) => setReadingForm(p => ({ ...p, currentValue: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 font-mono text-lg font-black text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                  autoFocus
                />

                {/* Cálculo Dinámico del Consumo */}
                {readingForm.currentValue !== '' && selectedMeterForReading.currentReading !== undefined && (
                  <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">Consumo calculado en este intervalo:</span>
                    <span className={`font-mono font-black ${
                      parseFloat(readingForm.currentValue) - selectedMeterForReading.currentReading >= 0
                        ? 'text-emerald-700'
                        : 'text-amber-700'
                    }`}>
                      +{(parseFloat(readingForm.currentValue) - selectedMeterForReading.currentReading).toFixed(2)} {selectedMeterForReading.unit}
                    </span>
                  </div>
                )}
              </div>

              {/* Fecha, Hora y Técnico */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={readingForm.date}
                    onChange={(e) => setReadingForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hora</label>
                  <input
                    type="time"
                    value={readingForm.time}
                    onChange={(e) => setReadingForm(p => ({ ...p, time: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Técnico que toma la lectura</label>
                <input
                  type="text"
                  value={readingForm.technicianName}
                  onChange={(e) => setReadingForm(p => ({ ...p, technicianName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-medium text-slate-800"
                  required
                />
              </div>

              {/* Notas u Observaciones */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones / Novedad (Opcional)</label>
                <textarea
                  rows={2}
                  value={readingForm.notes}
                  onChange={(e) => setReadingForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="ej. Presión de red normal, lectura tomada al inicio del turno..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 outline-none"
                />
              </div>

              {/* Botones de Acción */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsReadingModalOpen(false)}
                  className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                >
                  {isSubmittingReading ? 'Guardando...' : 'Guardar Lectura'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AJUSTES / CREACIÓN DE CONTADOR */}
      {isMeterConfigModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200 my-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className={`p-2 rounded-xl border ${editingMeter ? 'bg-amber-50 text-amber-600 border-amber-200' : 'bg-cyan-50 text-cyan-600 border-cyan-200'}`}>
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base text-slate-900">
                    {editingMeter ? 'Editar Ajustes del Contador' : 'Nuevo Contador Individual'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingMeter ? `Editando: ${editingMeter.name} (${editingMeter.code})` : 'Crea contador por contador de forma independiente sin sobreescribir los existentes.'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsMeterConfigModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={(e) => handleSaveMeterConfig(e, false)} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Código / Tag *</label>
                  <input
                    type="text"
                    placeholder="ej. MED-AGU-01"
                    value={meterForm.code}
                    onChange={(e) => setMeterForm(p => ({ ...p, code: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs font-bold uppercase text-slate-900"
                    required
                  />
                </div>
                <div>
                  <FuturisticMeterSelect
                    label="Tipo de Servicio *"
                    sublabel="Fluido / energía"
                    value={meterForm.type}
                    onChange={(val) => {
                      const t = val as MeterType;
                      let defaultUnit = 'm³';
                      if (t === 'energia') defaultUnit = 'kWh';
                      if (t === 'gas') defaultUnit = 'm³';
                      setMeterForm(p => ({ ...p, type: t, unit: defaultUnit }));
                    }}
                    variant="form"
                    options={[
                      {
                        value: 'agua',
                        label: 'Agua Potable',
                        sublabel: 'Red hidráulica del hotel',
                        badge: 'm³',
                        color: 'cyan',
                        code: 'AGU',
                        icon: <Droplets className="w-3.5 h-3.5 text-cyan-600" />
                      },
                      {
                        value: 'energia',
                        label: 'Energía Eléctrica',
                        sublabel: 'Subestación y tableros',
                        badge: 'kWh',
                        color: 'amber',
                        code: 'ELE',
                        icon: <Zap className="w-3.5 h-3.5 text-amber-600" />
                      },
                      {
                        value: 'gas',
                        label: 'Gas Natural / GLP',
                        sublabel: 'Red de calderas y cocina',
                        badge: 'm³',
                        color: 'rose',
                        code: 'GAS',
                        icon: <Flame className="w-3.5 h-3.5 text-rose-600" />
                      },
                      {
                        value: 'otro',
                        label: 'Otro Contador Especial',
                        sublabel: 'Fluidos o parámetros técnicos',
                        badge: 'Personalizado',
                        color: 'purple',
                        code: 'OTR',
                        icon: <Gauge className="w-3.5 h-3.5 text-purple-600" />
                      }
                    ]}
                  />
                </div>
              </div>

              {/* Opciones de relación para contadores de Agua (Principal vs Subcontadores) */}
              {meterForm.type === 'agua' && (
                <div className="p-3 bg-blue-50/70 rounded-2xl border border-blue-200/80 space-y-3">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Droplets className="w-3.5 h-3.5 text-blue-600" />
                    <span>Configuración de Red de Agua del Hotel:</span>
                  </span>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <label className={`p-2.5 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                      meterForm.isMainMeter 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="waterRole"
                          checked={meterForm.isMainMeter}
                          onChange={() => setMeterForm(p => ({ ...p, isMainMeter: true, parentMeterId: '', areaTag: 'general' }))}
                          className="text-blue-600"
                        />
                        <span className="font-bold text-[11px]">Contador Principal</span>
                      </div>
                      <span className={`text-[10px] mt-1 ${meterForm.isMainMeter ? 'text-blue-100' : 'text-slate-400'}`}>
                        Acometida general del hotel
                      </span>
                    </label>

                    <label className={`p-2.5 rounded-xl border cursor-pointer flex flex-col justify-between transition-all ${
                      !meterForm.isMainMeter 
                        ? 'bg-blue-600 text-white border-blue-600 shadow-xs' 
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          name="waterRole"
                          checked={!meterForm.isMainMeter}
                          onChange={() => {
                            const main = meters.find(m => m.type === 'agua' && m.isMainMeter);
                            setMeterForm(p => ({ ...p, isMainMeter: false, parentMeterId: main?.id || '' }));
                          }}
                          className="text-blue-600"
                        />
                        <span className="font-bold text-[11px]">Subcontador</span>
                      </div>
                      <span className={`text-[10px] mt-1 ${!meterForm.isMainMeter ? 'text-blue-100' : 'text-slate-400'}`}>
                        Misma agua del contador principal
                      </span>
                    </label>
                  </div>

                  {!meterForm.isMainMeter && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-xs">
                      <div>
                        <FuturisticMeterSelect
                          label="Punto / Área de Destino"
                          sublabel="Zona de consumo"
                          value={meterForm.areaTag || 'cocina'}
                          onChange={(val) => setMeterForm(p => ({ ...p, areaTag: val }))}
                          variant="compact"
                          options={[
                            {
                              value: 'cocina',
                              label: 'Cocina Principal',
                              sublabel: 'Preparación de alimentos',
                              badge: 'Alimentos',
                              color: 'amber',
                              code: 'COC'
                            },
                            {
                              value: 'piscina',
                              label: 'Piscina & Húmedas',
                              sublabel: 'Recreación y jacuzzis',
                              badge: 'Húmedas',
                              color: 'cyan',
                              code: 'PIS'
                            },
                            {
                              value: 'lavanderia',
                              label: 'Lavandería Industrial',
                              sublabel: 'Lavado de lencería',
                              badge: 'Lavado',
                              color: 'blue',
                              code: 'LAV'
                            },
                            {
                              value: 'habitaciones',
                              label: 'Habitaciones / Torres',
                              sublabel: 'Alojamiento huéspedes',
                              badge: 'Torres',
                              color: 'emerald',
                              code: 'HAB'
                            },
                            {
                              value: 'calderas',
                              label: 'Calderas / ACS',
                              sublabel: 'Agua caliente sanitaria',
                              badge: 'Térmico',
                              color: 'rose',
                              code: 'CAL'
                            },
                            {
                              value: 'otro',
                              label: 'Otro Punto',
                              sublabel: 'Punto auxiliar',
                              badge: 'Especial',
                              color: 'purple',
                              code: 'OTR'
                            }
                          ]}
                        />
                      </div>

                      <div>
                        <FuturisticMeterSelect
                          label="Contador del que deriva"
                          sublabel="Acometida origen"
                          value={meterForm.parentMeterId || ''}
                          onChange={(val) => setMeterForm(p => ({ ...p, parentMeterId: val }))}
                          variant="compact"
                          options={[
                            {
                              value: '',
                              label: 'Contador Principal de Agua',
                              sublabel: 'Acometida General de la Red',
                              badge: 'Principal',
                              color: 'cyan',
                              code: 'RED-GRAL'
                            },
                            ...meters
                              .filter(m => m.type === 'agua' && m.id !== editingMeter?.id)
                              .map(m => ({
                                value: m.id,
                                label: m.name,
                                sublabel: m.location,
                                badge: m.isMainMeter ? 'Principal' : 'Subcontador',
                                color: (m.isMainMeter ? 'cyan' : 'blue') as any,
                                code: m.code
                              }))
                          ]}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nombre Descriptivo *</label>
                <input
                  type="text"
                  placeholder="ej. Acometida General Agua Fría"
                  value={meterForm.name}
                  onChange={(e) => setMeterForm(p => ({ ...p, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Unidad de Medida *</label>
                  <input
                    type="text"
                    placeholder="m³, kWh, gal..."
                    value={meterForm.unit}
                    onChange={(e) => setMeterForm(p => ({ ...p, unit: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Lectura Inicial de Partida</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="0"
                    value={meterForm.initialReading}
                    onChange={(e) => setMeterForm(p => ({ ...p, initialReading: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-xs text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ubicación Física en el Hotel</label>
                <input
                  type="text"
                  placeholder="ej. Sótano 2 - Cuarto de Bombas Principal"
                  value={meterForm.location}
                  onChange={(e) => setMeterForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Marca / Modelo</label>
                  <input
                    type="text"
                    placeholder="ej. Elster V200"
                    value={meterForm.brandModel}
                    onChange={(e) => setMeterForm(p => ({ ...p, brandModel: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Umbral Máx. Diario (Alerta)</label>
                  <input
                    type="number"
                    step="any"
                    placeholder="ej. 50"
                    value={meterForm.alertThresholdPerDay}
                    onChange={(e) => setMeterForm(p => ({ ...p, alertThresholdPerDay: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Notas Técnicas</label>
                <textarea
                  rows={2}
                  value={meterForm.notes}
                  onChange={(e) => setMeterForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Observaciones de instalación, calibración o acometida..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs text-slate-800 outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100">
                {editingMeter ? (
                  <button
                    type="button"
                    onClick={async () => {
                      if (confirm(`¿Estás seguro de eliminar el contador "${editingMeter.name}"?`)) {
                        await deleteMeter(editingMeter.id);
                        setIsMeterConfigModalOpen(false);
                      }
                    }}
                    className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Contador</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSubmittingMeterConfig}
                    onClick={(e) => handleSaveMeterConfig(e, true)}
                    className="px-4 py-2.5 bg-cyan-50 hover:bg-cyan-100 border border-cyan-300 text-cyan-800 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                    title="Guarda este contador y deja listo el formulario para crear el siguiente"
                  >
                    <Plus className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Guardar y Crear Siguiente</span>
                  </button>
                )}
                <div className="flex items-center space-x-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsMeterConfigModalOpen(false)}
                    className="px-4 py-2.5 text-slate-600 hover:bg-slate-100 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingMeterConfig}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    {isSubmittingMeterConfig ? 'Guardando...' : (editingMeter ? 'Actualizar Contador' : 'Guardar Contador')}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE FOTO CON IA / SCANNER COMPONENT */}
      {isScannerOpen && scannerTargetMeter && (
        <SmartMeterScannerModal
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          title={`Escaneo IA: ${scannerTargetMeter.name}`}
          meterName={scannerTargetMeter.name}
          meterTypeHint={`contador de ${scannerTargetMeter.type} en ${scannerTargetMeter.unit}`}
          expectedUnit={scannerTargetMeter.unit}
          initialValue={scannerTargetMeter.currentReading || scannerTargetMeter.initialReading}
          initialPhotoMode="ai"
          onApplyReading={handleApplyAIScan}
        />
      )}

      {/* MODAL DE VISTA PREVIA DE FOTO */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
          <div className="relative max-w-2xl w-full bg-slate-900 rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">
            <div className="p-3 border-b border-slate-800 flex items-center justify-between text-white">
              <span className="text-xs font-bold">Evidencia Fotográfica de la Lectura</span>
              <button
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex items-center justify-center max-h-[75vh] overflow-hidden">
              <img
                src={previewPhotoUrl}
                alt="Foto evidencia del contador"
                className="max-h-[70vh] w-auto object-contain rounded-2xl shadow-lg"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
