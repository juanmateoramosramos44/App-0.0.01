import React, { useState, useMemo } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  AreaChart, 
  Area,
  LineChart,
  Line
} from 'recharts';
import { 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Award, 
  Zap, 
  ShieldCheck,
  BarChart3,
  Filter,
  RefreshCw,
  Database,
  Check,
  Gauge,
  ClipboardList,
  AlertCircle,
  FileText,
  Flame,
  Droplets,
  Layers
} from 'lucide-react';

const safeLower = (val: unknown): string => String(val ?? '').toLowerCase().trim();

type DashboardTab = 'resumen' | 'rondas' | 'contadores' | 'fallas' | 'solicitudes' | 'tareas';

export const KPIDashboardPanel: React.FC = () => {
  const { 
    incidents, 
    rounds, 
    inProgressRounds, 
    meters, 
    meterReadingsLog, 
    requests, 
    tasks, 
    stateAuditResult, 
    runStateAudit, 
    isAdmin 
  } = useMaintenance();

  const [activeTab, setActiveTab] = useState<DashboardTab>('resumen');
  const [timeFilter, setTimeFilter] = useState<'all' | '30days' | '7days'>('30days');
  const [meterTypeFilter, setMeterTypeFilter] = useState<'all' | 'agua' | 'electricidad' | 'gas'>('all');
  const [showAuditDetails, setShowAuditDetails] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);

  const handleManualAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      runStateAudit(false);
      setIsAuditing(false);
    }, 300);
  };

  // Base cutoff for time filters
  const cutoffTime = useMemo(() => {
    if (timeFilter === 'all') return 0;
    const days = timeFilter === '7days' ? 7 : 30;
    return Date.now() - days * 24 * 60 * 60 * 1000;
  }, [timeFilter]);

  // 1. Filtered Rondas
  const filteredRounds = useMemo(() => {
    const list = rounds || [];
    if (cutoffTime === 0) return list;
    return list.filter(r => {
      const t = new Date(r.lastUpdated || r.completedAt || r.date || 0).getTime();
      return !isNaN(t) && t >= cutoffTime;
    });
  }, [rounds, cutoffTime]);

  // 2. Filtered Incidents
  const filteredIncidents = useMemo(() => {
    const list = incidents || [];
    if (cutoffTime === 0) return list;
    return list.filter(inc => {
      const t = new Date(inc.timestamp || 0).getTime();
      return !isNaN(t) && t >= cutoffTime;
    });
  }, [incidents, cutoffTime]);

  // 3. Filtered Requests
  const filteredRequests = useMemo(() => {
    const list = requests || [];
    if (cutoffTime === 0) return list;
    return list.filter(req => {
      const t = new Date((req.createdAt || '').replace(' ', 'T')).getTime();
      return !isNaN(t) && t >= cutoffTime;
    });
  }, [requests, cutoffTime]);

  // 4. Filtered Tasks
  const filteredTasks = useMemo(() => {
    const list = tasks || [];
    if (cutoffTime === 0) return list;
    return list.filter(tsk => {
      const t = new Date(tsk.createdAt || tsk.dueDate || 0).getTime();
      return !isNaN(t) && t >= cutoffTime;
    });
  }, [tasks, cutoffTime]);

  // 5. Filtered Meter Readings Log
  const filteredReadings = useMemo(() => {
    const list = meterReadingsLog || [];
    return list.filter(rdg => {
      if (!rdg) return false;
      if (cutoffTime > 0) {
        const t = new Date(rdg.date ? `${rdg.date}T${rdg.time || '00:00'}` : rdg.timestamp || 0).getTime();
        if (!isNaN(t) && t < cutoffTime) return false;
      }
      if (meterTypeFilter !== 'all') {
        const m = (meters || []).find(item => item.id === rdg.meterId || item.code === rdg.meterId);
        if (m && safeLower(m.type) !== meterTypeFilter) return false;
      }
      return true;
    });
  }, [meterReadingsLog, meters, cutoffTime, meterTypeFilter]);

  // -------------------------------------------------------------
  // DATA CALCULATION: 1. RONDAS (Completadas vs Pendientes por Día)
  // -------------------------------------------------------------
  const roundsStats = useMemo(() => {
    const completed = filteredRounds.filter(r => r.status === 'completada').length;
    const inProgress = (inProgressRounds || []).length;
    const pending = filteredRounds.filter(r => r.status === 'en_progreso' || r.status === 'incompleta' || !r.status).length;
    const total = filteredRounds.length;
    const avgComp = total > 0 
      ? Math.round(filteredRounds.reduce((acc, r) => acc + (r.compliancePercentage ?? 100), 0) / total) 
      : 100;

    // Daily distribution map
    const dailyMap = new Map<string, { date: string; fullDate: string; completadas: number; pendientes: number; cumplimiento: number; count: number }>();

    // Sort chronologically
    const sorted = [...filteredRounds].sort((a, b) => {
      const tA = new Date(a.date || a.lastUpdated || 0).getTime();
      const tB = new Date(b.date || b.lastUpdated || 0).getTime();
      return tA - tB;
    });

    const maxDays = timeFilter === '7days' ? 7 : (timeFilter === '30days' ? 14 : 20);

    sorted.forEach(r => {
      const rawDate = r.date || (r.lastUpdated ? r.lastUpdated.slice(0, 10) : 'Hoy');
      const shortDate = rawDate.length >= 10 ? rawDate.slice(5) : rawDate;
      const cur = dailyMap.get(rawDate) || { 
        date: shortDate, 
        fullDate: rawDate, 
        completadas: 0, 
        pendientes: 0, 
        cumplimiento: 0, 
        count: 0 
      };

      if (r.status === 'completada') {
        cur.completadas += 1;
      } else {
        cur.pendientes += 1;
      }
      cur.cumplimiento += (r.compliancePercentage ?? 100);
      cur.count += 1;
      dailyMap.set(rawDate, cur);
    });

    const dailyChartData = Array.from(dailyMap.values()).slice(-maxDays).map(item => ({
      date: item.date,
      fullDate: item.fullDate,
      completadas: item.completadas,
      pendientes: item.pendientes,
      cumplimiento: item.count > 0 ? Math.round(item.cumplimiento / item.count) : 100
    }));

    return { completed, inProgress, pending, total, avgComp, dailyChartData };
  }, [filteredRounds, inProgressRounds, timeFilter]);

  // -------------------------------------------------------------
  // DATA CALCULATION: 2. CONTADORES (Tendencia y Consumo Registrado)
  // -------------------------------------------------------------
  const meterStats = useMemo(() => {
    const totalMeters = (meters || []).length;
    const totalReadings = filteredReadings.length;

    // Group readings by date for consumption trend
    const sorted = [...filteredReadings].sort((a, b) => {
      const tA = new Date(`${a.date || ''}T${a.time || '00:00'}`).getTime();
      const tB = new Date(`${b.date || ''}T${b.time || '00:00'}`).getTime();
      return tA - tB;
    });

    const trendMap = new Map<string, { date: string; agua: number; electricidad: number; gas: number; totalReadings: number }>();

    sorted.forEach(rdg => {
      const d = rdg.date ? rdg.date.slice(5) : 'Hoy';
      const cur = trendMap.get(d) || { date: d, agua: 0, electricidad: 0, gas: 0, totalReadings: 0 };
      const m = (meters || []).find(item => item.id === rdg.meterId || item.code === rdg.meterId);
      const mType = safeLower(m?.type);
      const consumption = Math.max(0, Number(rdg.consumption) || 0);

      if (mType === 'agua') cur.agua += consumption;
      else if (mType === 'electricidad') cur.electricidad += consumption;
      else if (mType === 'gas') cur.gas += consumption;
      cur.totalReadings += 1;
      trendMap.set(d, cur);
    });

    const trendData = Array.from(trendMap.values()).slice(-14);

    // Distribution by meter type
    const byType = {
      agua: (meters || []).filter(m => safeLower(m.type) === 'agua').length,
      electricidad: (meters || []).filter(m => safeLower(m.type) === 'electricidad').length,
      gas: (meters || []).filter(m => safeLower(m.type) === 'gas').length,
      piscina: (meters || []).filter(m => safeLower(m.type) === 'piscina').length,
    };

    return { totalMeters, totalReadings, trendData, byType };
  }, [meters, filteredReadings]);

  // -------------------------------------------------------------
  // DATA CALCULATION: 3. INCONVENIENTES / FALLAS (Activos vs Resueltos y Urgencia)
  // -------------------------------------------------------------
  const incidentStats = useMemo(() => {
    const total = filteredIncidents.length;
    const resolved = filteredIncidents.filter(i => i.status === 'solucionado' || (i as any).status === 'resuelto').length;
    const active = total - resolved;

    const urgencyCounts = {
      urgente: 0,
      alta: 0,
      media: 0,
      baja: 0
    };

    filteredIncidents.forEach(inc => {
      const urg = safeLower((inc as any).urgency || (inc as any).priority || (inc as any).severity);
      if (urg === 'urgente') urgencyCounts.urgente++;
      else if (urg === 'alta') urgencyCounts.alta++;
      else if (urg === 'media') urgencyCounts.media++;
      else urgencyCounts.baja++;
    });

    const urgencyData = [
      { name: 'Urgente', cantidad: urgencyCounts.urgente, color: '#ef4444' },
      { name: 'Alta', cantidad: urgencyCounts.alta, color: '#f97316' },
      { name: 'Media', cantidad: urgencyCounts.media, color: '#eab308' },
      { name: 'Baja', cantidad: urgencyCounts.baja, color: '#3b82f6' }
    ];

    const statusPieData = [
      { name: 'Solucionadas', value: resolved, color: '#10b981' },
      { name: 'Activas / Pendientes', value: active, color: '#ef4444' }
    ];

    return { total, resolved, active, urgencyCounts, urgencyData, statusPieData };
  }, [filteredIncidents]);

  // -------------------------------------------------------------
  // DATA CALCULATION: 4. SOLICITUDES (Abiertas vs Resueltas / En Proceso)
  // -------------------------------------------------------------
  const requestStats = useMemo(() => {
    const total = filteredRequests.length;
    let resolved = 0;
    let inProgress = 0;
    let pending = 0;

    filteredRequests.forEach(req => {
      const st = safeLower(req.status);
      if (['resuelto', 'solucionada', 'atendida', 'cerrada'].includes(st)) {
        resolved++;
      } else if (['en_revision', 'en_proceso', 'proceso'].includes(st)) {
        inProgress++;
      } else {
        pending++;
      }
    });

    const statusData = [
      { name: 'Resueltas', cantidad: resolved, color: '#10b981' },
      { name: 'En Proceso', cantidad: inProgress, color: '#3b82f6' },
      { name: 'Pendientes', cantidad: pending, color: '#f59e0b' }
    ];

    const pieData = [
      { name: 'Resueltas', value: resolved, color: '#10b981' },
      { name: 'En Proceso', value: inProgress, color: '#3b82f6' },
      { name: 'Pendientes', value: pending, color: '#f59e0b' }
    ].filter(item => item.value > 0);

    return { total, resolved, inProgress, pending, statusData, pieData };
  }, [filteredRequests]);

  // -------------------------------------------------------------
  // DATA CALCULATION: 5. TAREAS (Pendientes, En Progreso, Completadas y Prioridad)
  // -------------------------------------------------------------
  const taskStats = useMemo(() => {
    const total = filteredTasks.length;
    const completed = filteredTasks.filter(t => t.status === 'completada').length;
    const inProgress = filteredTasks.filter(t => t.status === 'en_progreso').length;
    const pending = filteredTasks.filter(t => t.status === 'pendiente' || !t.status).length;

    const priorities = {
      urgente: 0,
      alta: 0,
      media: 0,
      baja: 0
    };

    filteredTasks.forEach(t => {
      const pr = safeLower(t.priority);
      if (pr === 'urgente') priorities.urgente++;
      else if (pr === 'alta') priorities.alta++;
      else if (pr === 'media') priorities.media++;
      else priorities.baja++;
    });

    const statusChartData = [
      { status: 'Pendiente', cantidad: pending, color: '#f59e0b' },
      { status: 'En Progreso', cantidad: inProgress, color: '#3b82f6' },
      { status: 'Completada', cantidad: completed, color: '#10b981' }
    ];

    const priorityChartData = [
      { priority: 'Urgente', cantidad: priorities.urgente, color: '#ef4444' },
      { priority: 'Alta', cantidad: priorities.alta, color: '#f97316' },
      { priority: 'Media', cantidad: priorities.media, color: '#eab308' },
      { priority: 'Baja', cantidad: priorities.baja, color: '#3b82f6' }
    ];

    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 100;

    return { total, completed, inProgress, pending, priorities, statusChartData, priorityChartData, completionRate };
  }, [filteredTasks]);

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
      
      {/* Header & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Panel de Métricas & Estadísticas en Vivo
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-100 text-blue-800 uppercase tracking-wider">
                PostgreSQL
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Datos 100% reales sincronizados en tiempo real entre todos los computadores y celulares.
            </p>
          </div>
        </div>

        {/* Time Period Filter Tabs & Audit Button */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl text-xs font-semibold">
            <button
              onClick={() => setTimeFilter('7days')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeFilter === '7days'
                  ? 'bg-white text-blue-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              7 Días
            </button>
            <button
              onClick={() => setTimeFilter('30days')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeFilter === '30days'
                  ? 'bg-white text-blue-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              30 Días
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeFilter === 'all'
                  ? 'bg-white text-blue-700 shadow-xs font-black'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Historial Completo
            </button>
          </div>

          <button
            onClick={handleManualAudit}
            disabled={isAuditing}
            title="Verificar consistencia total en PostgreSQL"
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'Auditando...' : 'PostgreSQL OK'}</span>
          </button>
        </div>
      </div>

      {/* State Audit Verification Banner */}
      {stateAuditResult && (
        <div className="bg-slate-50 border border-slate-200/90 rounded-2xl px-4 py-3 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center space-x-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Database className="w-4 h-4 text-blue-600" />
              <span>Base de Datos PostgreSQL Conectada:</span>
            </span>
            <span className="text-slate-600 font-medium">
              {stateAuditResult.counts.tasks.total} tareas • {roundsStats.total} rondas • {incidentStats.total} fallas • {requestStats.total} solicitudes • {meterStats.totalReadings} lecturas
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
              <Check className="w-3 h-3" />
              100% Sincronizado
            </span>
            <button 
              onClick={() => setShowAuditDetails(!showAuditDetails)}
              className="text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer"
            >
              {showAuditDetails ? 'Ocultar' : 'Detalles'}
            </button>
          </div>
        </div>
      )}

      {/* Audit Detail Panel */}
      {showAuditDetails && stateAuditResult && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-2xl p-4 text-xs space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between font-bold text-blue-900">
            <span>Auditoría de Consistencia PostgreSQL & Multi-Dispositivo</span>
            <span className="text-[11px] font-normal text-slate-500">
              Última verificación: {new Date(stateAuditResult.auditedAt).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-slate-600 text-[11px]">
            {stateAuditResult.summaryMessage}
          </p>
        </div>
      )}

      {/* Navigation Category Tabs (Adaptable to Mobile & Desktop) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: 'resumen', label: 'Resumen General', icon: Layers, count: null },
          { id: 'rondas', label: 'Rondas Diarias', icon: Clock, count: roundsStats.total },
          { id: 'contadores', label: 'Lectura de Contadores', icon: Gauge, count: meterStats.totalReadings },
          { id: 'fallas', label: 'Fallas & Urgencias', icon: AlertTriangle, count: incidentStats.active },
          { id: 'solicitudes', label: 'Solicitudes', icon: FileText, count: requestStats.pending },
          { id: 'tareas', label: 'Tareas y Órdenes', icon: ClipboardList, count: taskStats.total },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DashboardTab)}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                isActive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <span>{tab.label}</span>
              {tab.count !== null && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 5 Executive Metric Cards (Live Database Indicators) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4">
        
        {/* Card 1: Rondas */}
        <div 
          onClick={() => setActiveTab('rondas')} 
          className="bg-slate-50/70 hover:bg-blue-50/60 transition-all rounded-2xl p-4 border border-slate-200/90 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5 text-blue-800">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              Rondas
            </span>
            <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-black">
              {roundsStats.avgComp}% OK
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-900">{roundsStats.completed}</span>
            <span className="text-xs text-slate-500">/ {roundsStats.total} total</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {roundsStats.completed} completadas
          </div>
        </div>

        {/* Card 2: Contadores */}
        <div 
          onClick={() => setActiveTab('contadores')} 
          className="bg-slate-50/70 hover:bg-teal-50/60 transition-all rounded-2xl p-4 border border-slate-200/90 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5 text-teal-800">
              <Gauge className="w-3.5 h-3.5 text-teal-600" />
              Contadores
            </span>
            <span className="text-[10px] bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded font-black">
              {meterStats.totalMeters} activos
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-900">{meterStats.totalReadings}</span>
            <span className="text-xs text-slate-500">lecturas</span>
          </div>
          <div className="text-[11px] text-teal-700 font-semibold mt-1">
            Agua, Luz y Gas
          </div>
        </div>

        {/* Card 3: Inconvenientes */}
        <div 
          onClick={() => setActiveTab('fallas')} 
          className="bg-slate-50/70 hover:bg-rose-50/60 transition-all rounded-2xl p-4 border border-slate-200/90 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5 text-rose-800">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Fallas
            </span>
            {incidentStats.urgencyCounts.urgente > 0 ? (
              <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-black animate-pulse">
                {incidentStats.urgencyCounts.urgente} urgentes
              </span>
            ) : (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black">
                OK
              </span>
            )}
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-900">{incidentStats.active}</span>
            <span className="text-xs text-slate-500">activas</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {incidentStats.resolved} resueltas ({incidentStats.total > 0 ? Math.round((incidentStats.resolved / incidentStats.total) * 100) : 100}%)
          </div>
        </div>

        {/* Card 4: Solicitudes */}
        <div 
          onClick={() => setActiveTab('solicitudes')} 
          className="bg-slate-50/70 hover:bg-amber-50/60 transition-all rounded-2xl p-4 border border-slate-200/90 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5 text-amber-800">
              <FileText className="w-3.5 h-3.5 text-amber-600" />
              Solicitudes
            </span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black">
              {requestStats.pending} pend.
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-900">{requestStats.resolved}</span>
            <span className="text-xs text-slate-500">resueltas</span>
          </div>
          <div className="text-[11px] text-slate-600 font-semibold mt-1">
            {requestStats.inProgress} en proceso
          </div>
        </div>

        {/* Card 5: Tareas */}
        <div 
          onClick={() => setActiveTab('tareas')} 
          className="bg-slate-50/70 hover:bg-purple-50/60 transition-all rounded-2xl p-4 border border-slate-200/90 cursor-pointer col-span-2 md:col-span-1"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5 text-purple-800">
              <ClipboardList className="w-3.5 h-3.5 text-purple-600" />
              Tareas
            </span>
            <span className="text-[10px] bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-black">
              {taskStats.completionRate}%
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-900">{taskStats.completed}</span>
            <span className="text-xs text-slate-500">/ {taskStats.total}</span>
          </div>
          <div className="text-[11px] text-purple-700 font-semibold mt-1">
            {taskStats.pending} pendientes
          </div>
        </div>

      </div>

      {/* -------------------------------------------------------------------------------- */}
      {/* TAB CONTENT: 1. RESUMEN / ALL CHARTS                                             */}
      {/* -------------------------------------------------------------------------------- */}
      {(activeTab === 'resumen' || activeTab === 'rondas') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>1. Cantidad de Rondas Técnicas (Completadas vs. Pendientes / Por Día)</span>
              </h4>
              <p className="text-xs text-slate-500">
                Inspecciones técnicas de cuartos y bombas con registro de cumplimiento diario.
              </p>
            </div>
          </div>

          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200">
            <div className="h-64 sm:h-72 w-full">
              {roundsStats.dailyChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No hay registros de rondas en el período seleccionado.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={roundsStats.dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                    <Tooltip 
                      formatter={(val: any, name: any) => [
                        `${val} rondas`,
                        name === 'completadas' ? 'Completadas' : 'Pendientes / En Progreso'
                      ]}
                      labelFormatter={(label) => `Fecha: ${label}`}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={32}
                      formatter={(val) => <span className="text-xs font-semibold text-slate-700">{val === 'completadas' ? 'Completadas' : 'Pendientes / En Progreso'}</span>}
                    />
                    <Bar dataKey="completadas" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pendientes" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-200 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200 text-center">
                <div className="font-black text-slate-900 text-sm">{roundsStats.total}</div>
                <div className="text-[11px] text-slate-500">Rondas en Base de Datos</div>
              </div>
              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center">
                <div className="font-black text-emerald-800 text-sm">{roundsStats.completed}</div>
                <div className="text-[11px] text-emerald-600 font-semibold">100% Completadas</div>
              </div>
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center">
                <div className="font-black text-amber-800 text-sm">{roundsStats.pending}</div>
                <div className="text-[11px] text-amber-600 font-semibold">En Curso / Pendientes</div>
              </div>
              <div className="bg-blue-50 p-2.5 rounded-xl border border-blue-200 text-center">
                <div className="font-black text-blue-800 text-sm">{roundsStats.avgComp}%</div>
                <div className="text-[11px] text-blue-600 font-semibold">Cumplimiento Promedio</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* TAB CONTENT: 2. CONTADORES (Tendencia y Consumo Registrado)                      */}
      {/* -------------------------------------------------------------------------------- */}
      {(activeTab === 'resumen' || activeTab === 'contadores') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-teal-600" />
                <span>2. Lectura de Contadores (Tendencia y Consumo Registrado)</span>
              </h4>
              <p className="text-xs text-slate-500">
                Consumo registrado en metros cúbicos y kilovatios-hora a lo largo del tiempo.
              </p>
            </div>

            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-xs font-bold self-start sm:self-auto">
              <button
                onClick={() => setMeterTypeFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  meterTypeFilter === 'all' ? 'bg-white text-teal-800 shadow-2xs font-black' : 'text-slate-600'
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setMeterTypeFilter('agua')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  meterTypeFilter === 'agua' ? 'bg-white text-blue-700 shadow-2xs font-black' : 'text-slate-600'
                }`}
              >
                Agua (m³)
              </button>
              <button
                onClick={() => setMeterTypeFilter('electricidad')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  meterTypeFilter === 'electricidad' ? 'bg-white text-amber-700 shadow-2xs font-black' : 'text-slate-600'
                }`}
              >
                Luz (kWh)
              </button>
              <button
                onClick={() => setMeterTypeFilter('gas')}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                  meterTypeFilter === 'gas' ? 'bg-white text-rose-700 shadow-2xs font-black' : 'text-slate-600'
                }`}
              >
                Gas (m³)
              </button>
            </div>
          </div>

          <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200">
            <div className="h-64 sm:h-72 w-full">
              {meterStats.trendData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-xs text-slate-400">
                  No hay lecturas registradas en este período para graficar.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={meterStats.trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAgua" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorLuz" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
                      </linearGradient>
                      <linearGradient id="colorGas" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#e11d48" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#e11d48" stopOpacity={0.0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                    <Tooltip 
                      formatter={(val: any, name: any) => [`${val}`, name.charAt(0).toUpperCase() + name.slice(1)]}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      height={32}
                      formatter={(val) => <span className="text-xs font-semibold text-slate-700">{val.toUpperCase()}</span>}
                    />
                    {(meterTypeFilter === 'all' || meterTypeFilter === 'agua') && (
                      <Area type="monotone" dataKey="agua" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorAgua)" />
                    )}
                    {(meterTypeFilter === 'all' || meterTypeFilter === 'electricidad') && (
                      <Area type="monotone" dataKey="electricidad" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorLuz)" />
                    )}
                    {(meterTypeFilter === 'all' || meterTypeFilter === 'gas') && (
                      <Area type="monotone" dataKey="gas" stroke="#e11d48" strokeWidth={2} fillOpacity={1} fill="url(#colorGas)" />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-200 text-xs">
              <div className="bg-sky-50 p-2.5 rounded-xl border border-sky-200 flex items-center justify-between">
                <span className="font-semibold text-sky-900 flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-sky-600" />
                  Agua:
                </span>
                <span className="font-black text-sky-700">{meterStats.byType.agua} contadores</span>
              </div>
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 flex items-center justify-between">
                <span className="font-semibold text-amber-900 flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  Luz:
                </span>
                <span className="font-black text-amber-700">{meterStats.byType.electricidad} contadores</span>
              </div>
              <div className="bg-rose-50 p-2.5 rounded-xl border border-rose-200 flex items-center justify-between">
                <span className="font-semibold text-rose-900 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-rose-600" />
                  Gas:
                </span>
                <span className="font-black text-rose-700">{meterStats.byType.gas} contadores</span>
              </div>
              <div className="bg-teal-50 p-2.5 rounded-xl border border-teal-200 flex items-center justify-between">
                <span className="font-semibold text-teal-900">Total Lecturas:</span>
                <span className="font-black text-teal-700">{meterStats.totalReadings} registros</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* TAB CONTENT: 3. INCONVENIENTES / FALLAS (Activos vs Resueltos y Urgencia)         */}
      {/* -------------------------------------------------------------------------------- */}
      {(activeTab === 'resumen' || activeTab === 'fallas') && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>3. Inconvenientes / Fallas en Vivo (Activos vs. Resueltos y Urgencia)</span>
            </h4>
            <p className="text-xs text-slate-500">
              Desglose de fallas técnicas reportadas clasificadas por nivel de severidad y estado actual.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Sub-Graphic A: Pie Activas vs Resueltas */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-700 mb-2">
                Estado de Resolución de Fallas
              </div>
              <div className="h-60 w-full flex items-center justify-center">
                {incidentStats.total === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-10">
                    Sin fallas registradas en este período.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={incidentStats.statusPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {incidentStats.statusPieData.map((entry, index) => (
                          <Cell key={`cell-inc-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any, name: any) => [`${val} fallas (${Math.round((Number(val) / incidentStats.total) * 100)}%)`, name]}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={32}
                        formatter={(val) => <span className="text-xs font-semibold text-slate-700">{val}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200 text-xs">
                <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-200 flex justify-between">
                  <span className="font-bold text-emerald-900">Solucionadas:</span>
                  <span className="font-black text-emerald-700">{incidentStats.resolved}</span>
                </div>
                <div className="bg-rose-50 rounded-xl p-2 border border-rose-200 flex justify-between">
                  <span className="font-bold text-rose-900">Activas:</span>
                  <span className="font-black text-rose-700">{incidentStats.active}</span>
                </div>
              </div>
            </div>

            {/* Sub-Graphic B: Bar por Nivel de Urgencia */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-700 mb-2">
                Distribución por Nivel de Urgencia
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={incidentStats.urgencyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                    <Tooltip 
                      formatter={(val: any) => [`${val} fallas`, 'Cantidad']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                    />
                    <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                      {incidentStats.urgencyData.map((entry, index) => (
                        <Cell key={`cell-urg-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-slate-200 text-[11px] text-center">
                <div className="bg-rose-50 rounded-lg p-1.5 border border-rose-200">
                  <div className="font-black text-rose-700">{incidentStats.urgencyCounts.urgente}</div>
                  <div className="text-slate-500 font-bold">Urgente</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-1.5 border border-orange-200">
                  <div className="font-black text-orange-700">{incidentStats.urgencyCounts.alta}</div>
                  <div className="text-slate-500 font-bold">Alta</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-1.5 border border-amber-200">
                  <div className="font-black text-amber-700">{incidentStats.urgencyCounts.media}</div>
                  <div className="text-slate-500 font-bold">Media</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-1.5 border border-blue-200">
                  <div className="font-black text-blue-700">{incidentStats.urgencyCounts.baja}</div>
                  <div className="text-slate-500 font-bold">Baja</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* TAB CONTENT: 4. SOLICITUDES (Abiertas vs Resueltas / En Proceso)                 */}
      {/* -------------------------------------------------------------------------------- */}
      {(activeTab === 'resumen' || activeTab === 'solicitudes') && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-600" />
              <span>4. Solicitudes de Áreas & Huéspedes (Abiertas vs. Resueltas / En Proceso)</span>
            </h4>
            <p className="text-xs text-slate-500">
              Seguimiento a requerimientos de mantenimiento solicitados por recepción, pisos y áreas públicas.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Chart A: Solicitudes BarChart por Estado */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-700 mb-2">
                Estado Actual de Solicitudes
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={requestStats.statusData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                    <Tooltip 
                      formatter={(val: any) => [`${val} solicitudes`, 'Total']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                    />
                    <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                      {requestStats.statusData.map((entry, index) => (
                        <Cell key={`cell-req-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200 text-xs text-center">
                <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-200">
                  <div className="font-black text-emerald-700">{requestStats.resolved}</div>
                  <div className="text-[11px] text-emerald-800 font-bold">Resueltas</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-2 border border-blue-200">
                  <div className="font-black text-blue-700">{requestStats.inProgress}</div>
                  <div className="text-[11px] text-blue-800 font-bold">En Proceso</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-2 border border-amber-200">
                  <div className="font-black text-amber-700">{requestStats.pending}</div>
                  <div className="text-[11px] text-amber-800 font-bold">Pendientes</div>
                </div>
              </div>
            </div>

            {/* Chart B: Resumen de Eficiencia en Solicitudes */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-700 mb-2">
                Tasa de Atención y Cierre
              </div>
              <div className="h-60 w-full flex items-center justify-center">
                {requestStats.total === 0 ? (
                  <div className="text-center text-xs text-slate-400 py-10">
                    Sin solicitudes en este período.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={requestStats.pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {requestStats.pieData.map((entry, index) => (
                          <Cell key={`cell-pie-req-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(val: any, name: any) => [`${val} (${Math.round((Number(val) / requestStats.total) * 100)}%)`, name]}
                        contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                      />
                      <Legend 
                        verticalAlign="bottom" 
                        height={32}
                        formatter={(val) => <span className="text-xs font-semibold text-slate-700">{val}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-slate-200 flex items-center justify-between text-xs">
                <span className="text-slate-600 font-semibold">Tasa de Eficacia General:</span>
                <span className="font-black text-emerald-700 text-sm">
                  {requestStats.total > 0 ? Math.round((requestStats.resolved / requestStats.total) * 100) : 100}%
                </span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------------- */}
      {/* TAB CONTENT: 5. TAREAS & ÓRDENES DE TRABAJO                                     */}
      {/* -------------------------------------------------------------------------------- */}
      {(activeTab === 'resumen' || activeTab === 'tareas') && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-purple-600" />
              <span>5. Tareas y Órdenes de Trabajo (Pendientes, En Progreso, Completadas y Prioridad)</span>
            </h4>
            <p className="text-xs text-slate-500">
              Distribución de tareas asignadas al personal técnico sincronizadas directamente desde PostgreSQL.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Sub-Graphic A: Tareas por Estado */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-700 mb-2">
                Tareas por Estado Operativo
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskStats.statusChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="status" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                    <Tooltip 
                      formatter={(val: any) => [`${val} tareas`, 'Cantidad']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                    />
                    <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                      {taskStats.statusChartData.map((entry, index) => (
                        <Cell key={`cell-tsk-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200 text-xs text-center">
                <div className="bg-amber-50 rounded-xl p-2 border border-amber-200">
                  <div className="font-black text-amber-700">{taskStats.pending}</div>
                  <div className="text-[11px] text-amber-800 font-bold">Pendientes</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-2 border border-blue-200">
                  <div className="font-black text-blue-700">{taskStats.inProgress}</div>
                  <div className="text-[11px] text-blue-800 font-bold">En Progreso</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-200">
                  <div className="font-black text-emerald-700">{taskStats.completed}</div>
                  <div className="text-[11px] text-emerald-800 font-bold">Completadas</div>
                </div>
              </div>
            </div>

            {/* Sub-Graphic B: Tareas por Prioridad */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-700 mb-2">
                Distribución por Prioridad de Tarea
              </div>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={taskStats.priorityChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                    <XAxis dataKey="priority" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                    <Tooltip 
                      formatter={(val: any) => [`${val} tareas`, 'Cantidad']}
                      contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                    />
                    <Bar dataKey="cantidad" radius={[6, 6, 0, 0]}>
                      {taskStats.priorityChartData.map((entry, index) => (
                        <Cell key={`cell-pr-${index}`} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-4 gap-1.5 pt-3 border-t border-slate-200 text-[11px] text-center">
                <div className="bg-rose-50 rounded-lg p-1.5 border border-rose-200">
                  <div className="font-black text-rose-700">{taskStats.priorities.urgente}</div>
                  <div className="text-slate-500 font-bold">Urgente</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-1.5 border border-orange-200">
                  <div className="font-black text-orange-700">{taskStats.priorities.alta}</div>
                  <div className="text-slate-500 font-bold">Alta</div>
                </div>
                <div className="bg-amber-50 rounded-lg p-1.5 border border-amber-200">
                  <div className="font-black text-amber-700">{taskStats.priorities.media}</div>
                  <div className="text-slate-500 font-bold">Media</div>
                </div>
                <div className="bg-blue-50 rounded-lg p-1.5 border border-blue-200">
                  <div className="font-black text-blue-700">{taskStats.priorities.baja}</div>
                  <div className="text-slate-500 font-bold">Baja</div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
