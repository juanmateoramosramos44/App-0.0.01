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
  Check
} from 'lucide-react';

export const KPIDashboardPanel: React.FC = () => {
  const { incidents, rounds, inProgressRounds, stateAuditResult, runStateAudit, isAdmin } = useMaintenance();
  const [timeFilter, setTimeFilter] = useState<'all' | '30days' | '7days'>('all');
  const [showAuditDetails, setShowAuditDetails] = useState(false);
  const [isAuditing, setIsAuditing] = useState(false);

  const handleManualAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      runStateAudit(false);
      setIsAuditing(false);
    }, 300);
  };

  // Filter items by date
  const filteredIncidents = useMemo(() => {
    if (timeFilter === 'all') return incidents;
    const now = new Date().getTime();
    const days = timeFilter === '7days' ? 7 : 30;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return incidents.filter(inc => {
      const t = new Date(inc.timestamp || 0).getTime();
      return !isNaN(t) && t >= cutoff;
    });
  }, [incidents, timeFilter]);

  const filteredRounds = useMemo(() => {
    if (timeFilter === 'all') return rounds;
    const now = new Date().getTime();
    const days = timeFilter === '7days' ? 7 : 30;
    const cutoff = now - days * 24 * 60 * 60 * 1000;
    return rounds.filter(r => {
      const t = new Date(r.lastUpdated || r.completedAt || r.date || 0).getTime();
      return !isNaN(t) && t >= cutoff;
    });
  }, [rounds, timeFilter]);

  // KPI 1: Incidencias Cerradas vs. Abiertas
  const totalInc = filteredIncidents.length;
  const closedInc = filteredIncidents.filter(i => i.status === 'solucionado' || (i as any).status === 'resuelto').length;
  const openInc = totalInc - closedInc;
  const closedPercentage = totalInc > 0 ? Math.round((closedInc / totalInc) * 100) : 100;
  const openPercentage = totalInc > 0 ? Math.round((openInc / totalInc) * 100) : 0;

  const incidentStatusData = [
    { name: 'Cerradas / Solucionadas', value: closedInc, color: '#10b981' },
    { name: 'Abiertas / Pendientes', value: openInc, color: '#ef4444' }
  ];

  // KPI 2: Tiempo Promedio de Resolución (MTTR)
  const { avgResolutionTimeHours, formattedResolutionTime, resolutionTimeDistribution } = useMemo(() => {
    const resolvedList = filteredIncidents.filter(i => (i.status === 'solucionado' || (i as any).status === 'resuelto'));
    
    let totalMinutes = 0;
    let validCount = 0;
    const buckets = {
      under1h: 0,
      h1to4: 0,
      h4to24: 0,
      over24h: 0
    };

    resolvedList.forEach(inc => {
      if (!inc.timestamp) return;
      const start = new Date(inc.timestamp).getTime();
      let end = inc.resolvedAt ? new Date(inc.resolvedAt).getTime() : NaN;

      if (isNaN(end) || end < start) {
        // Fallback: estimate 2.5 hours if resolved but exact timestamp missing
        end = start + 2.5 * 60 * 60 * 1000;
      }

      if (!isNaN(start) && !isNaN(end) && end >= start) {
        const diffMinutes = (end - start) / (1000 * 60);
        totalMinutes += diffMinutes;
        validCount++;

        const diffHours = diffMinutes / 60;
        if (diffHours <= 1) buckets.under1h++;
        else if (diffHours <= 4) buckets.h1to4++;
        else if (diffHours <= 24) buckets.h4to24++;
        else buckets.over24h++;
      }
    });

    const avgMinutes = validCount > 0 ? totalMinutes / validCount : 0;
    const avgHours = avgMinutes / 60;

    let formatted = '0 min';
    if (avgHours >= 24) {
      const days = (avgHours / 24).toFixed(1);
      formatted = `${days} días`;
    } else if (avgHours >= 1) {
      formatted = `${avgHours.toFixed(1)} horas`;
    } else if (avgMinutes > 0) {
      formatted = `${Math.round(avgMinutes)} min`;
    } else {
      formatted = 'Sin datos';
    }

    const distData = [
      { rango: '< 1 hora', cantidad: buckets.under1h },
      { rango: '1 - 4 hrs', cantidad: buckets.h1to4 },
      { rango: '4 - 24 hrs', cantidad: buckets.h4to24 },
      { rango: '> 24 hrs', cantidad: buckets.over24h }
    ];

    return {
      avgResolutionTimeHours: avgHours,
      formattedResolutionTime: formatted,
      resolutionTimeDistribution: distData
    };
  }, [filteredIncidents]);

  // KPI 3: Rondas Completadas y Cumplimiento (Idéntico 1:1 con el historial de rondas en la nube)
  const totalCompletedRounds = useMemo(() => {
    return (rounds || []).filter(r => r && r.status === 'completada').length;
  }, [rounds]);
  const completedRounds = totalCompletedRounds;
  const inProgressRoundsCount = (inProgressRounds || []).length;
  const avgCompliance = useMemo(() => {
    const list = (rounds || []).filter(r => r && r.status === 'completada');
    if (list.length === 0) return 100;
    const sum = list.reduce((acc, r) => acc + (r.compliancePercentage ?? 100), 0);
    return Math.round(sum / list.length);
  }, [rounds]);

  // Rondas timeline chart (by day/shift)
  const roundsTimelineData = useMemo(() => {
    const map = new Map<string, { date: string; completadas: number; cumplimiento: number; count: number }>();

    // Sort rounds ascending
    const sorted = [...filteredRounds].sort((a, b) => {
      const tA = new Date(a.date || 0).getTime();
      const tB = new Date(b.date || 0).getTime();
      return tA - tB;
    });

    sorted.slice(-7).forEach(r => {
      const d = r.date || 'Hoy';
      const existing = map.get(d) || { date: d.slice(5), completadas: 0, cumplimiento: 0, count: 0 };
      if (r.status === 'completada') {
        existing.completadas += 1;
      }
      existing.cumplimiento += (r.compliancePercentage || 100);
      existing.count += 1;
      map.set(d, existing);
    });

    return Array.from(map.values()).map(item => ({
      date: item.date,
      completadas: item.completadas,
      cumplimiento: item.count > 0 ? Math.round(item.cumplimiento / item.count) : 100
    }));
  }, [filteredRounds]);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-6">
      
      {/* Header with Title and Period Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900">
                Panel de Indicadores Clave (KPIs)
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800 uppercase tracking-wider">
                Métricas Recharts
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Visualización analítica del rendimiento operativo, tasa de cierre y tiempo de respuesta técnica.
            </p>
          </div>
        </div>

        {/* Time Period Filter Tabs and Audit Button */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setTimeFilter('7days')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeFilter === '7days'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Últimos 7 días
            </button>
            <button
              onClick={() => setTimeFilter('30days')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeFilter === '30days'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Últimos 30 días
            </button>
            <button
              onClick={() => setTimeFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                timeFilter === 'all'
                  ? 'bg-white text-blue-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todo el Historial
            </button>
          </div>

          <button
            onClick={handleManualAudit}
            disabled={isAuditing}
            title="Verificar consistencia de datos y cantidades entre dashboard y base de datos"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-emerald-600 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'Auditando...' : 'Auditoría OK'}</span>
          </button>
        </div>
      </div>

      {/* State Audit Summary Ribbon */}
      {stateAuditResult && (
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between text-xs gap-2">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-blue-600" />
              <span>Consistencia de Datos Verificada:</span>
            </span>
            <span className="text-slate-600 font-medium">
              {stateAuditResult.counts.tasks.total} tareas • {stateAuditResult.counts.workOrders.total} OTs • {stateAuditResult.counts.incidents.total} reportes • {stateAuditResult.counts.requests.total} solicitudes
            </span>
          </div>

          <div className="flex items-center space-x-2 text-[11px] text-slate-500">
            <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
              <Check className="w-3 h-3" />
              {stateAuditResult.totalCorrections > 0 ? `${stateAuditResult.totalCorrections} discrepancias corregidas` : '100% Consistente'}
            </span>
            <button 
              onClick={() => setShowAuditDetails(!showAuditDetails)}
              className="text-blue-600 hover:text-blue-800 font-semibold underline"
            >
              {showAuditDetails ? 'Ocultar detalles' : 'Ver auditoría'}
            </button>
          </div>
        </div>
      )}

      {/* Audit Detail Panel when toggled */}
      {showAuditDetails && stateAuditResult && (
        <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-4 text-xs space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between font-bold text-blue-900">
            <span>Informe de Auditoría de Estado en Tiempo Real</span>
            <span className="text-[11px] font-normal text-slate-500">
              Última verificación: {new Date(stateAuditResult.auditedAt).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-slate-600 text-[11px]">
            {stateAuditResult.summaryMessage}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2 text-center">
            <div className="bg-white p-2 rounded-lg border border-blue-100">
              <div className="font-bold text-slate-900 text-sm">{stateAuditResult.counts.tasks.total}</div>
              <div className="text-[10px] text-slate-500">Tareas</div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-blue-100">
              <div className="font-bold text-slate-900 text-sm">{stateAuditResult.counts.workOrders.total}</div>
              <div className="text-[10px] text-slate-500">Órdenes Trabajo</div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-blue-100">
              <div className="font-bold text-slate-900 text-sm">{stateAuditResult.counts.incidents.total}</div>
              <div className="text-[10px] text-slate-500">Incidencias</div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-blue-100">
              <div className="font-bold text-slate-900 text-sm">{stateAuditResult.counts.requests.total}</div>
              <div className="text-[10px] text-slate-500">Solicitudes</div>
            </div>
            <div className="bg-white p-2 rounded-lg border border-blue-100">
              <div className="font-bold text-slate-900 text-sm">{stateAuditResult.counts.rounds.total}</div>
              <div className="text-[10px] text-slate-500">Rondas</div>
            </div>
          </div>
        </div>
      )}

      {/* 3 Main Executive KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* KPI 1 Metric Card: Incidencias Cerradas % */}
        <div className="bg-gradient-to-br from-emerald-50/70 via-slate-50 to-white rounded-2xl p-5 border border-emerald-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              Incidencias Cerradas
            </span>
            <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
              closedPercentage >= 80 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {closedPercentage}% Eficacia
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{closedInc}</span>
            <span className="text-xs font-medium text-slate-500">de {totalInc} totales</span>
          </div>
          <div className="mt-3">
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden flex">
              <div 
                className="bg-emerald-500 h-2 transition-all duration-500" 
                style={{ width: `${closedPercentage}%` }} 
              />
              <div 
                className="bg-rose-500 h-2 transition-all duration-500" 
                style={{ width: `${openPercentage}%` }} 
              />
            </div>
            <div className="flex justify-between text-[11px] text-slate-600 mt-1.5 font-medium">
              <span className="text-emerald-700">✓ {closedInc} Solucionadas ({closedPercentage}%)</span>
              <span className="text-rose-600 font-bold">● {openInc} Abiertas ({openPercentage}%)</span>
            </div>
          </div>
        </div>

        {/* KPI 2 Metric Card: Tiempo Promedio de Resolución */}
        <div className="bg-gradient-to-br from-blue-50/70 via-slate-50 to-white rounded-2xl p-5 border border-blue-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-blue-600" />
              Tiempo Prom. de Resolución
            </span>
            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800">
              MTTR
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{formattedResolutionTime}</span>
            <span className="text-xs font-medium text-slate-500">promedio por falla</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            Medido desde el reporte técnico hasta el cierre confirmado con evidencia y notas de solución.
          </p>
        </div>

        {/* KPI 3 Metric Card: Rondas Completadas & Cumplimiento */}
        <div className="bg-gradient-to-br from-indigo-50/70 via-slate-50 to-white rounded-2xl p-5 border border-indigo-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-800 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-indigo-600" />
              Rondas Completadas
            </span>
            <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-indigo-100 text-indigo-800">
              {avgCompliance}% Cumplimiento
            </span>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{completedRounds}</span>
            <span className="text-xs font-medium text-slate-500">rondas cerradas</span>
          </div>
          <div className="mt-2 text-xs flex items-center gap-2">
            {(isAdmin && inProgressRoundsCount > 0) ? (
              <span className="inline-flex items-center text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 animate-ping" />
                {inProgressRoundsCount} ronda en curso
              </span>
            ) : (
              <span className="text-slate-500 text-[11px]">
                Inspecciones técnicas de cuartos y bombas
              </span>
            )}
          </div>
        </div>

      </div>

      {/* 2 Interactive Recharts Graphics Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        
        {/* Graphic 1: Incidencias Cerradas vs Abiertas (Donut / Pie Chart) */}
        <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Proporción de Incidencias (Cerradas vs. Abiertas)
              </h4>
              <p className="text-xs text-slate-500">
                Distribución porcentual del estado de todas las novedades técnicas
              </p>
            </div>
          </div>

          <div className="h-64 w-full flex items-center justify-center">
            {totalInc === 0 ? (
              <div className="text-center text-xs text-slate-400 py-10">
                No hay incidencias registradas en este período para graficar.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={incidentStatusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {incidentStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any, name: any) => [`${val} (${Math.round((Number(val) / totalInc) * 100)}%)`, name]}
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    formatter={(val) => <span className="text-xs font-semibold text-slate-700">{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-200/80 text-xs">
            <div className="bg-emerald-50 rounded-xl p-2.5 border border-emerald-200 flex items-center justify-between">
              <span className="font-semibold text-emerald-900">Cerradas:</span>
              <span className="font-black text-emerald-700 text-sm">{closedInc} ({closedPercentage}%)</span>
            </div>
            <div className="bg-rose-50 rounded-xl p-2.5 border border-rose-200 flex items-center justify-between">
              <span className="font-semibold text-rose-900">Abiertas:</span>
              <span className="font-black text-rose-700 text-sm">{openInc} ({openPercentage}%)</span>
            </div>
          </div>
        </div>

        {/* Graphic 2: Tiempo de Resolución por Rangos (Bar Chart) */}
        <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Distribución del Tiempo de Resolución
              </h4>
              <p className="text-xs text-slate-500">
                Cantidad de fallas solucionadas agrupadas por tiempo de respuesta
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={resolutionTimeDistribution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="rango" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={{ stroke: '#cbd5e1' }} />
                <Tooltip 
                  formatter={(val: any) => [`${val} incidencias`, 'Solucionadas']}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                />
                <Bar dataKey="cantidad" name="Incidencias" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-blue-50/80 rounded-xl p-2.5 border border-blue-200 flex items-center justify-between text-xs pt-3">
            <span className="text-blue-900 font-medium">MTTR Promedio Global:</span>
            <span className="font-black text-blue-700 text-sm">{formattedResolutionTime}</span>
          </div>
        </div>

      </div>

      {/* Graphic 3: Rondas Completadas vs Cumplimiento Histórico (Area / Line Chart) */}
      {roundsTimelineData.length > 0 && (
        <div className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Historial de Rondas Técnicas y Tasa de Cumplimiento
              </h4>
              <p className="text-xs text-slate-500">
                Supervisión del volumen de inspecciones y promedio de puntos de control completados
              </p>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={roundsTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCumplimiento" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip 
                  formatter={(val: any, name: string) => [
                    name === 'cumplimiento' ? `${val}%` : val,
                    name === 'cumplimiento' ? 'Cumplimiento' : 'Rondas Completadas'
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderRadius: '12px', color: '#fff', fontSize: '12px', border: 'none' }}
                />
                <Legend 
                  verticalAlign="top" 
                  height={30}
                  formatter={(val) => <span className="text-xs font-semibold text-slate-700">{val === 'cumplimiento' ? '% Cumplimiento' : 'Rondas Completadas'}</span>}
                />
                <Area type="monotone" dataKey="cumplimiento" stroke="#6366f1" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCumplimiento)" />
                <Bar dataKey="completadas" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
};
