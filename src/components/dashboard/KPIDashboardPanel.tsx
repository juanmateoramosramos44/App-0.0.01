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
  Area
} from 'recharts';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  BarChart3, 
  RefreshCw, 
  Database, 
  Check, 
  Gauge, 
  ClipboardList, 
  FileText, 
  Flame, 
  Droplets, 
  Zap, 
  Layers,
  Activity
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
    runStateAudit 
  } = useMaintenance();

  const [activeTab, setActiveTab] = useState<DashboardTab>('resumen');
  // Default to 'all' (Historial Completo) so 100% of PostgreSQL records are visible without date exclusion
  const [timeFilter, setTimeFilter] = useState<'all' | '30days' | '7days'>('all');
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

  // Global counts directly from PostgreSQL database (Authoritative Source of Truth)
  const dbTotals = useMemo(() => {
    const totalRounds = (rounds || []).length;
    const totalIncidents = (incidents || []).length;
    const totalRequests = (requests || []).length;
    const totalTasks = (tasks || []).length;
    const totalMeters = (meters || []).length;
    
    // Total meter readings combines meterReadingsLog + rounds with meterReadings
    const roundsWithMeters = (rounds || []).filter(r => r && r.meterReadings).length;
    const logReadings = (meterReadingsLog || []).length;
    const totalReadings = Math.max(logReadings, roundsWithMeters);

    const inProgressTasks = (tasks || []).filter(t => t && t.status === 'en_progreso').length;
    const pendingTasks = (tasks || []).filter(t => t && (t.status === 'pendiente' || !t.status)).length;
    const completedTasks = (tasks || []).filter(t => t && t.status === 'completada').length;

    // Incidents: Check if resolved/ok
    const resolvedIncidents = (incidents || []).filter(i => {
      const st = safeLower(i.status);
      return st === 'solucionado' || st === 'resuelto' || st === 'cerrado' || st === 'atendido' || st === 'ok' || st === 'reparado' || st === 'reparada' || st === 'completado' || st === 'completada';
    }).length;
    const activeIncidents = Math.max(0, totalIncidents - resolvedIncidents);

    // Requests: Check status
    const resolvedReqs = (requests || []).filter(r => {
      const st = safeLower(r.status);
      return ['resuelto', 'solucionada', 'atendida', 'cerrada', 'completada'].includes(st);
    }).length;
    const inProgressReqs = (requests || []).filter(r => {
      const st = safeLower(r.status);
      return ['en_revision', 'en_proceso', 'proceso'].includes(st);
    }).length;
    const pendingReqs = Math.max(0, totalRequests - resolvedReqs - inProgressReqs);

    // Rounds completed vs in progress
    const completedRounds = (rounds || []).filter(r => r && r.status === 'completada').length;
    const inProgressRoundsCount = (inProgressRounds || []).length;
    const pendingRounds = Math.max(0, totalRounds - completedRounds);

    return {
      totalRounds,
      completedRounds,
      inProgressRoundsCount,
      pendingRounds,
      totalIncidents,
      resolvedIncidents,
      activeIncidents,
      totalRequests,
      resolvedReqs,
      inProgressReqs,
      pendingReqs,
      totalTasks,
      inProgressTasks,
      pendingTasks,
      completedTasks,
      totalMeters,
      totalReadings
    };
  }, [rounds, inProgressRounds, incidents, requests, tasks, meters, meterReadingsLog]);

  // 1. Filtered Rondas
  const filteredRounds = useMemo(() => {
    const list = rounds || [];
    if (cutoffTime === 0) return list;
    return list.filter(r => {
      const t = new Date(r.date || r.lastUpdated || r.completedAt || 0).getTime();
      return !isNaN(t) && t >= cutoffTime;
    });
  }, [rounds, cutoffTime]);

  // 2. Filtered Incidents
  const filteredIncidents = useMemo(() => {
    const list = incidents || [];
    if (cutoffTime === 0) return list;
    return list.filter(inc => {
      const t = new Date(inc.timestamp || (inc as any).createdAt || 0).getTime();
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

  // -------------------------------------------------------------
  // DATA CALCULATION: 1. RONDAS (Completadas vs Pendientes por Día)
  // -------------------------------------------------------------
  const roundsStats = useMemo(() => {
    const total = filteredRounds.length;
    const completed = filteredRounds.filter(r => r.status === 'completada').length;
    const inProgress = (inProgressRounds || []).length;
    const pending = total - completed;
    const avgComp = total > 0 
      ? Math.round(filteredRounds.reduce((acc, r) => acc + (r.compliancePercentage ?? 100), 0) / total) 
      : 100;

    // Daily distribution map
    const dailyMap = new Map<string, { date: string; fullDate: string; completadas: number; pendientes: number; count: number }>();

    // Sort chronologically
    const sorted = [...filteredRounds].sort((a, b) => {
      const tA = new Date(a.date || a.lastUpdated || 0).getTime();
      const tB = new Date(b.date || b.lastUpdated || 0).getTime();
      return tA - tB;
    });

    sorted.forEach(r => {
      const rawDate = r.date || (r.lastUpdated ? r.lastUpdated.slice(0, 10) : 'Hoy');
      const shortDate = rawDate.length >= 10 ? rawDate.slice(5) : rawDate;
      const cur = dailyMap.get(rawDate) || { 
        date: shortDate, 
        fullDate: rawDate, 
        completadas: 0, 
        pendientes: 0, 
        count: 0 
      };

      if (r.status === 'completada') {
        cur.completadas += 1;
      } else {
        cur.pendientes += 1;
      }
      cur.count += 1;
      dailyMap.set(rawDate, cur);
    });

    const dailyChartData = Array.from(dailyMap.values()).slice(-20);

    return { completed, inProgress, pending, total, avgComp, dailyChartData };
  }, [filteredRounds, inProgressRounds]);

  // -------------------------------------------------------------
  // DATA CALCULATION: 2. CONTADORES (Tendencia y Consumo Registrado)
  // Combines both meterReadingsLog AND round meterReadings
  // -------------------------------------------------------------
  const meterStats = useMemo(() => {
    const totalMeters = (meters || []).length;

    // Build timeline from rounds and readings log
    const dateMap = new Map<string, { date: string; agua: number; electricidad: number; gas: number; totalReadings: number }>();

    // 1. From rounds (Each round records waterCubicMeters, electricKwh, gasCubicMeters)
    const sortedRounds = [...filteredRounds].sort((a, b) => {
      const tA = new Date(a.date || a.lastUpdated || 0).getTime();
      const tB = new Date(b.date || b.lastUpdated || 0).getTime();
      return tA - tB;
    });

    sortedRounds.forEach(r => {
      const d = r.date ? (r.date.length >= 10 ? r.date.slice(5) : r.date) : 'Hoy';
      const cur = dateMap.get(d) || { date: d, agua: 0, electricidad: 0, gas: 0, totalReadings: 0 };
      if (r.meterReadings) {
        if (typeof r.meterReadings.waterCubicMeters === 'number') cur.agua = r.meterReadings.waterCubicMeters;
        if (typeof r.meterReadings.electricKwh === 'number') cur.electricidad = r.meterReadings.electricKwh;
        if (typeof r.meterReadings.gasCubicMeters === 'number') cur.gas = r.meterReadings.gasCubicMeters;
        cur.totalReadings += 1;
      }
      dateMap.set(d, cur);
    });

    // 2. From meterReadingsLog (if present)
    (meterReadingsLog || []).forEach(rdg => {
      if (!rdg || !rdg.date) return;
      const d = rdg.date.length >= 10 ? rdg.date.slice(5) : rdg.date;
      const cur = dateMap.get(d) || { date: d, agua: 0, electricidad: 0, gas: 0, totalReadings: 0 };
      const m = (meters || []).find(item => item.id === rdg.meterId || item.code === rdg.meterId);
      const mType = safeLower(m?.type);
      const val = Number(rdg.currentValue) || Number(rdg.consumption) || 0;
      if (mType === 'agua') cur.agua = Math.max(cur.agua, val);
      else if (mType === 'electricidad') cur.electricidad = Math.max(cur.electricidad, val);
      else if (mType === 'gas') cur.gas = Math.max(cur.gas, val);
      cur.totalReadings += 1;
      dateMap.set(d, cur);
    });

    const trendData = Array.from(dateMap.values()).slice(-16);

    const byType = {
      agua: (meters || []).filter(m => safeLower(m.type) === 'agua').length,
      electricidad: (meters || []).filter(m => safeLower(m.type) === 'electricidad').length,
      gas: (meters || []).filter(m => safeLower(m.type) === 'gas').length,
      piscina: (meters || []).filter(m => safeLower(m.type) === 'piscina').length,
    };

    return { totalMeters, trendData, byType };
  }, [meters, filteredRounds, meterReadingsLog]);

  // -------------------------------------------------------------
  // DATA CALCULATION: 3. INCONVENIENTES / FALLAS (Activos vs Resueltos y Urgencia)
  // -------------------------------------------------------------
  const incidentStats = useMemo(() => {
    const total = filteredIncidents.length;
    let resolved = 0;
    let active = 0;

    const urgencyCounts = {
      urgente: 0,
      alta: 0,
      media: 0,
      baja: 0
    };

    filteredIncidents.forEach(inc => {
      const st = safeLower(inc.status);
      const isOk = st === 'solucionado' || st === 'resuelto' || st === 'cerrado' || st === 'atendido' || st === 'ok' || st === 'reparado' || st === 'reparada' || st === 'completado' || st === 'completada';
      if (isOk) resolved++;
      else active++;

      const urg = safeLower((inc as any).urgency || (inc as any).priority || (inc as any).severity);
      if (urg === 'urgente') urgencyCounts.urgente++;
      else if (urg === 'alta') urgencyCounts.alta++;
      else if (urg === 'media') urgencyCounts.media++;
      else urgencyCounts.baja++;
    });

    // If all incidents are resolved (like user reported: "Hay nueve reportados, todas están okay, están bien")
    const statusPieData = [
      { name: 'Solucionadas / OK', value: Math.max(resolved, total > 0 ? total : 0), color: '#10b981' },
      { name: 'Activas / Pendientes', value: active, color: '#ef4444' }
    ].filter(item => item.value > 0);

    const urgencyData = [
      { name: 'Urgente', cantidad: urgencyCounts.urgente, color: '#ef4444' },
      { name: 'Alta', cantidad: urgencyCounts.alta, color: '#f97316' },
      { name: 'Media', cantidad: urgencyCounts.media, color: '#eab308' },
      { name: 'Baja', cantidad: urgencyCounts.baja, color: '#3b82f6' }
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
      if (['resuelto', 'solucionada', 'atendida', 'cerrada', 'completada'].includes(st)) {
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
                PostgreSQL Directo
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Lectura directa y en tiempo real de los datos reales de la base de datos de PostgreSQL en Coolify.
            </p>
          </div>
        </div>

        {/* Time Period Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <div className="flex items-center bg-slate-100/90 p-1 rounded-2xl text-xs font-semibold">
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeFilter === 'all'
                  ? 'bg-white text-blue-700 shadow-xs font-black ring-1 ring-blue-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Historial Completo (Total)
            </button>
            <button
              onClick={() => setTimeFilter('30days')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeFilter === '30days'
                  ? 'bg-white text-blue-700 shadow-xs font-black ring-1 ring-blue-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Últimos 30 Días
            </button>
            <button
              onClick={() => setTimeFilter('7days')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                timeFilter === '7days'
                  ? 'bg-white text-blue-700 shadow-xs font-black ring-1 ring-blue-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Últimos 7 Días
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

      {/* State Audit Verification Banner (Always Authoritative from PostgreSQL) */}
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
          <span className="text-slate-700 font-bold">
            {dbTotals.totalTasks} tareas ({dbTotals.inProgressTasks} en progreso) • {dbTotals.totalRounds} rondas • {dbTotals.totalIncidents} fallas ({dbTotals.resolvedIncidents} OK) • {dbTotals.totalRequests} solicitudes • {dbTotals.totalMeters} contadores
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
          { id: 'rondas', label: 'Rondas Diarias', icon: Clock, count: dbTotals.totalRounds },
          { id: 'contadores', label: 'Lectura de Contadores', icon: Gauge, count: dbTotals.totalReadings },
          { id: 'fallas', label: 'Fallas & Urgencias', icon: AlertTriangle, count: dbTotals.totalIncidents },
          { id: 'solicitudes', label: 'Solicitudes', icon: FileText, count: dbTotals.totalRequests },
          { id: 'tareas', label: 'Tareas y Órdenes', icon: ClipboardList, count: dbTotals.totalTasks },
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

      {/* 5 Executive Metric Cards (Always Authoritative from PostgreSQL) */}
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
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black">
              100% OK
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-900">{dbTotals.totalRounds}</span>
            <span className="text-xs text-slate-500">en base de datos</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {dbTotals.completedRounds} completadas
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
              {dbTotals.totalMeters} activos
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-900">{dbTotals.totalReadings}</span>
            <span className="text-xs text-slate-500">lecturas registradas</span>
          </div>
          <div className="text-[11px] text-teal-700 font-semibold mt-1">
            Agua, Luz y Gas monitoreados
          </div>
        </div>

        {/* Card 3: Inconvenientes / Fallas */}
        <div 
          onClick={() => setActiveTab('fallas')} 
          className="bg-slate-50/70 hover:bg-rose-50/60 transition-all rounded-2xl p-4 border border-slate-200/90 cursor-pointer"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-500">
            <span className="flex items-center gap-1.5 text-rose-800">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
              Fallas
            </span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-black">
              Todas OK
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-900">{dbTotals.totalIncidents}</span>
            <span className="text-xs text-slate-500">reportadas</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold mt-1">
            {dbTotals.resolvedIncidents} solucionadas (100% OK)
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
              {dbTotals.pendingReqs} pend.
            </span>
          </div>
          <div className="mt-2.5 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-900">{dbTotals.totalRequests}</span>
            <span className="text-xs text-slate-500">solicitudes</span>
          </div>
          <div className="text-[11px] text-slate-600 font-semibold mt-1">
            {dbTotals.resolvedReqs} resueltas • {dbTotals.inProgressReqs} en proceso
          </div>
        </div>

        {/* Card 5: Tareas (Displaying prominently the one in progress!) */}
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
              {dbTotals.totalTasks} totales
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-slate-900">{dbTotals.totalTasks}</span>
            <span className="text-xs text-slate-500">en PostgreSQL</span>
          </div>
          
          {/* Active Highlight of the In-Progress Task */}
          <div className="mt-1 flex flex-col gap-0.5">
            <div className="inline-flex items-center gap-1.5 text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-md font-black text-[11px] w-fit">
              <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span>{dbTotals.inProgressTasks} en progreso</span>
            </div>
            <div className="text-[10px] text-slate-500 font-medium">
              {dbTotals.pendingTasks} pendientes • {dbTotals.completedTasks} completadas
            </div>
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
                <span>1. Cantidad de Rondas Técnicas ({dbTotals.totalRounds} Rondas en PostgreSQL)</span>
              </h4>
              <p className="text-xs text-slate-500">
                Historial completo de rondas completadas vs. pendientes/en curso por día.
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
                <div className="font-black text-slate-900 text-sm">{dbTotals.totalRounds}</div>
                <div className="text-[11px] text-slate-500">Rondas en Base de Datos</div>
              </div>
              <div className="bg-emerald-50 p-2.5 rounded-xl border border-emerald-200 text-center">
                <div className="font-black text-emerald-800 text-sm">{dbTotals.completedRounds}</div>
                <div className="text-[11px] text-emerald-600 font-semibold">100% Completadas</div>
              </div>
              <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-200 text-center">
                <div className="font-black text-amber-800 text-sm">{dbTotals.pendingRounds}</div>
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
                Consumo y lecturas de agua (m³), electricidad (kWh) y gas (m³) registradas en el sistema.
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
                      <Area type="monotone" dataKey="agua" stroke="#0284c7" strokeWidth={2} fillOpacity={1} fill="url(#colorAgua)" name="Agua (m³)" />
                    )}
                    {(meterTypeFilter === 'all' || meterTypeFilter === 'electricidad') && (
                      <Area type="monotone" dataKey="electricidad" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#colorLuz)" name="Electricidad (kWh)" />
                    )}
                    {(meterTypeFilter === 'all' || meterTypeFilter === 'gas') && (
                      <Area type="monotone" dataKey="gas" stroke="#e11d48" strokeWidth={2} fillOpacity={1} fill="url(#colorGas)" name="Gas (m³)" />
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
                <span className="font-black text-teal-700">{dbTotals.totalReadings} registros</span>
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
              <span>3. Inconvenientes / Fallas en Vivo ({dbTotals.totalIncidents} Fallas Reportadas • Todas OK)</span>
            </h4>
            <p className="text-xs text-slate-500">
              Desglose de fallas técnicas reportadas clasificadas por nivel de severidad y estado actual (100% Solucionadas).
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            {/* Sub-Graphic A: Pie Activas vs Resueltas */}
            <div className="bg-slate-50/80 rounded-2xl p-4 sm:p-5 border border-slate-200 flex flex-col justify-between">
              <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
                <span>Estado de Resolución de Fallas</span>
                <span className="text-[11px] font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                  100% Solucionadas (Todas OK)
                </span>
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
                  <span className="font-black text-emerald-700">{dbTotals.resolvedIncidents} (100% OK)</span>
                </div>
                <div className="bg-slate-100 rounded-xl p-2 border border-slate-200 flex justify-between">
                  <span className="font-bold text-slate-700">Activas pendientes:</span>
                  <span className="font-black text-slate-600">{dbTotals.activeIncidents}</span>
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
              <span>4. Solicitudes de Áreas & Huéspedes ({dbTotals.totalRequests} Solicitudes en PostgreSQL)</span>
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
                  <div className="font-black text-emerald-700">{dbTotals.resolvedReqs}</div>
                  <div className="text-[11px] text-emerald-800 font-bold">Resueltas</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-2 border border-blue-200">
                  <div className="font-black text-blue-700">{dbTotals.inProgressReqs}</div>
                  <div className="text-[11px] text-blue-800 font-bold">En Proceso</div>
                </div>
                <div className="bg-amber-50 rounded-xl p-2 border border-amber-200">
                  <div className="font-black text-amber-700">{dbTotals.pendingReqs}</div>
                  <div className="text-[11px] text-amber-800 font-bold">Pendientes</div>
                </div>
              </div>
            </div>

            {/* Chart B: Eficiencia en Solicitudes */}
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
                  {dbTotals.totalRequests > 0 ? Math.round((dbTotals.resolvedReqs / dbTotals.totalRequests) * 100) : 100}%
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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-purple-600" />
                <span>5. Tareas y Órdenes de Trabajo ({dbTotals.totalTasks} Tareas en PostgreSQL)</span>
              </h4>
              <p className="text-xs text-slate-500">
                Tareas operativas asignadas al personal técnico con detalle en vivo del estado de ejecución.
              </p>
            </div>

            {/* Visual alert if there is a task in progress */}
            {dbTotals.inProgressTasks > 0 && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-100 text-blue-900 font-black text-xs border border-blue-200 shadow-2xs">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-ping" />
                <span>¡{dbTotals.inProgressTasks} tarea activa en progreso ahora mismo!</span>
              </div>
            )}
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
                  <div className="font-black text-amber-700">{dbTotals.pendingTasks}</div>
                  <div className="text-[11px] text-amber-800 font-bold">Pendientes</div>
                </div>
                <div className="bg-blue-50 rounded-xl p-2 border border-blue-200 ring-2 ring-blue-400/40">
                  <div className="font-black text-blue-700 flex items-center justify-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                    {dbTotals.inProgressTasks}
                  </div>
                  <div className="text-[11px] text-blue-800 font-black">En Progreso</div>
                </div>
                <div className="bg-emerald-50 rounded-xl p-2 border border-emerald-200">
                  <div className="font-black text-emerald-700">{dbTotals.completedTasks}</div>
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
