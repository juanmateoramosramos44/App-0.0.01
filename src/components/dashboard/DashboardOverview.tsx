import React, { useState, useMemo } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { formatShiftName } from '../../utils/formatShift';
import { isCheckpointComplete, isCheckpointAlarmActive } from '../../utils/roundButtonUtils';
import { getRoundItemIcon } from '../../utils/roundIcons';
import { getStatusBadgeClass } from '../common/CustomButtonBuilder';
import { KPIDashboardPanel } from './KPIDashboardPanel';
import { 
  Activity, 
  Clock, 
  CalendarCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Droplets, 
  Flame, 
  ShieldCheck, 
  ArrowRight,
  Gauge,
  PlusCircle,
  TrendingUp,
  Cpu,
  Radio,
  Plus,
  Eye,
  X
} from 'lucide-react';

interface DashboardOverviewProps {
  onStartRound: () => void;
  onNewPumpInspection: (equipmentId?: string) => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ 
  onStartRound, 
  onNewPumpInspection 
}) => {
  const { 
    equipments, 
    rounds, 
    activeRound, 
    inProgressRounds,
    workOrders, 
    pumpInspections, 
    incidents,
    setSelectedTab,
    setIsIncidentModalOpen,
    isCloudSynced,
    settings,
    currentUser,
    isSectionAllowed,
    roundTemplate,
    isAdmin
  } = useMaintenance();

  const isRondasAllowed = isSectionAllowed('rondas');
  const isBombasAllowed = isSectionAllowed('bombas');
  const isPreventivoAllowed = isSectionAllowed('preventivo');
  const isIncidenciasAllowed = isSectionAllowed('incidencias');

  // Inspección modal en vivo para el administrador en el módulo principal
  const [inspectingRoundId, setInspectingRoundId] = useState<string | null>(null);
  const [modalFilterTab, setModalFilterTab] = useState<'todos' | 'cargados' | 'pendientes' | 'novedades'>('todos');

  const liveInspectingRound = useMemo(() => {
    if (!inspectingRoundId) return null;
    return (rounds || []).find(r => r && r.id === inspectingRoundId) || (inProgressRounds || []).find(r => r && r.id === inspectingRoundId) || null;
  }, [inspectingRoundId, rounds, inProgressRounds]);

  // Statistics calculation
  const totalEquipments = equipments.length;
  const operationalEquipments = equipments.filter(e => e.status === 'operativo').length;
  const alertEquipments = equipments.filter(e => e.status === 'alerta').length;
  const outOfServiceEquipments = equipments.filter(e => e.status === 'fuera_servicio').length;

  const today = new Date().toISOString().split('T')[0];
  const todayRound = rounds.find(r => r.date === today);

  const pendingWorkOrders = workOrders.filter(o => o.status === 'pendiente' || o.status === 'por_vencer');
  const overdueWorkOrders = workOrders.filter(o => o.status === 'vencido');
  const completedWorkOrders = workOrders.filter(o => o.status === 'completado');

  // Count active incidents in real time
  const activeIncidents = incidents.filter(i => i.status !== 'solucionado');
  const urgentIncidents = incidents.filter(i => i.severity === 'urgente' && i.status !== 'solucionado');

  // Latest critical equipment for quick metrics
  const boosterPump1 = equipments.find(e => e.tag === 'BOM-PRES-01');
  const acsBoiler = equipments.find(e => e.tag === 'CAL-ACS-01');
  const fireJockey = equipments.find(e => e.tag === 'BOM-INC-JOK');
  const poolPump = equipments.find(e => e.tag === 'BOM-PISC-01');

  // Latest readings from latest round or default
  const latestRound = rounds[0];
  const pressureReading = latestRound?.meterReadings?.mainWaterPressurePsi ?? 72;
  const acsTempReading = latestRound?.meterReadings?.hotWaterSupplyTempC ?? 59.5;
  const poolPhReading = latestRound?.meterReadings?.poolPh ?? 7.35;
  const poolClReading = latestRound?.meterReadings?.poolChlorinePpm ?? 2.1;

  return (
    <div className="space-y-6">
      
      {/* Top Welcome Banner & Quick Action Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-medium mb-2 border border-blue-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sistema de Gestión de Mantenimiento Hotelero</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Centro de Operaciones y Maquinaria
            </h2>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl">
              Monitoreo diario de cuartos técnicos, grupos de presión hidráulica, bombas de recirculación y programa preventivo del hotel.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
            {isRondasAllowed && (
              <button
                id="btn-quick-round"
                onClick={onStartRound}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-xl shadow-sm transition-all transform active:scale-95"
              >
                <Clock className="w-4 h-4" />
                <span>{activeRound ? 'Continuar Ronda Diaria' : 'Iniciar Ronda Diaria'}</span>
              </button>
            )}

            {isIncidenciasAllowed && (
              <button
                id="btn-quick-report-incident-dash"
                onClick={() => setIsIncidentModalOpen(true)}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-sm transition-all transform active:scale-95"
              >
                <AlertTriangle className="w-4 h-4" />
                <span>+ Cargar Inconveniente</span>
              </button>
            )}

            {isBombasAllowed && (
              <button
                id="btn-quick-pump-insp"
                onClick={() => onNewPumpInspection()}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-xl border border-slate-700 transition-all transform active:scale-95"
              >
                <Gauge className="w-4 h-4 text-cyan-400" />
                <span>Revisar Bomba</span>
              </button>
            )}

            {isPreventivoAllowed && (
              <button
                id="btn-quick-preventive"
                onClick={() => setSelectedTab('preventivo')}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-xl border border-slate-700 transition-all transform active:scale-95"
              >
                <CalendarCheck className="w-4 h-4 text-emerald-400" />
                <span>Ver Preventivos</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Real-Time Round Monitoring Panel (Supervisión exclusiva para el Administrador) */}
      {isAdmin && inProgressRounds.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/15 via-yellow-500/10 to-amber-500/10 border-2 border-amber-400/80 rounded-2xl p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-3">
              <span className="relative flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-amber-500"></span>
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-amber-950 flex items-center gap-2">
                  <span>Rondas Diarias en Progreso en Tiempo Real</span>
                  <span className="px-3 py-1 rounded-full text-xs bg-amber-400 text-slate-950 font-black shadow-xs ring-1 ring-amber-300 animate-pulse flex items-center gap-1.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950"></span>
                    </span>
                    <span>{inProgressRounds.length} en curso</span>
                  </span>
                </h3>
                <p className="text-xs text-amber-800/80 mt-0.5">
                  Técnicos de mantenimiento realizando la inspección de cuartos técnicos en este instante.
                </p>
              </div>
            </div>
            {inProgressRounds.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setInspectingRoundId(inProgressRounds[0].id);
                  setModalFilterTab('todos');
                }}
                className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Visualizar en Vivo</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {inProgressRounds.map((rnd) => (
              <div 
                key={rnd.id}
                onClick={() => {
                  setInspectingRoundId(rnd.id);
                  setModalFilterTab('todos');
                }}
                className="bg-white rounded-xl p-4 border border-amber-200/90 shadow-xs flex flex-col justify-between cursor-pointer hover:border-amber-400 hover:shadow-md transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      {rnd.technicianName}
                    </span>
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      Turno {formatShiftName(rnd.shift)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Iniciada a las <strong className="text-slate-700 font-semibold">{rnd.time}</strong> • Hoy ({rnd.date})
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-600 font-medium">Avance de puntos:</span>
                    <span className="font-extrabold text-amber-600">{rnd.compliancePercentage}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-emerald-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(rnd.compliancePercentage, 5)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-2 text-[11px] text-slate-500">
                    <span>{(rnd.checkpoints || []).filter(c => isCheckpointComplete(c, roundTemplate)).length} de {(rnd.checkpoints || []).length} puntos</span>
                    {rnd.anomaliesCount !== undefined && rnd.anomaliesCount > 0 && (
                      <span className="font-semibold text-rose-600 flex items-center">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        <span>{rnd.anomaliesCount} novedades</span>
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setInspectingRoundId(rnd.id);
                      setModalFilterTab('todos');
                    }}
                    className="mt-3.5 w-full inline-flex items-center justify-center space-x-1.5 py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 text-xs font-black rounded-xl shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Visualizar cómo va la ronda</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Equipment Status */}
        <div 
          onClick={() => setSelectedTab('bombas')}
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Parque de Bombas & Equipos</span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{totalEquipments}</span>
            <span className="text-xs text-slate-500">unidades registradas</span>
          </div>
          <div className="mt-3 flex items-center space-x-2 text-xs">
            <span className="inline-flex items-center text-emerald-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5" />
              {operationalEquipments} OK
            </span>
            {alertEquipments > 0 && (
              <span className="inline-flex items-center text-amber-700 font-medium ml-2">
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5" />
                {alertEquipments} en Alerta
              </span>
            )}
            {outOfServiceEquipments > 0 && (
              <span className="inline-flex items-center text-rose-700 font-medium ml-2">
                <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5" />
                {outOfServiceEquipments} Parado
              </span>
            )}
          </div>
        </div>

        {/* Card 2: Today's Round Status (Only if user has permission for rondas) */}
        {isRondasAllowed ? (
          <div 
            onClick={() => {
              if (isAdmin && inProgressRounds.length > 0) {
                setInspectingRoundId(inProgressRounds[0].id);
                setModalFilterTab('todos');
              } else {
                setSelectedTab('rondas');
              }
            }}
            className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Ronda de Hoy</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Clock className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-xl font-bold text-slate-900 flex items-center gap-2">
                {activeRound ? (
                  <span className="text-amber-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    En Progreso
                  </span>
                ) : (isAdmin && inProgressRounds.length > 0) ? (
                  <span className="text-amber-600 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                    {inProgressRounds.length === 1 ? '1 en Progreso' : `${inProgressRounds.length} en Progreso`}
                  </span>
                ) : todayRound ? (
                  <span className="text-emerald-700">Completada</span>
                ) : (
                  'Pendiente'
                )}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              {activeRound ? (
                <span className="text-amber-700 font-bold flex items-center bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 animate-ping" />
                  {activeRound.compliancePercentage}% de puntos
                </span>
              ) : (isAdmin && inProgressRounds.length > 0) ? (
                <span className="text-amber-700 font-bold flex items-center bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 animate-ping" />
                  {inProgressRounds[0].technicianName} en turno
                </span>
              ) : todayRound ? (
                <span className="text-emerald-600 font-semibold flex items-center">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                  Turno {formatShiftName(todayRound.shift)} OK
                </span>
              ) : (
                <span className="text-slate-400">Sin ronda iniciada hoy</span>
              )}
              <span className="text-blue-600 font-medium group-hover:translate-x-0.5 transition-transform flex items-center">
                Ver <ArrowRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </div>
        ) : (
          /* When user is NOT configured for rondas, show general technical reliability */
          <div 
            className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Disponibilidad Técnica</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline space-x-2">
              <span className="text-xl font-bold text-slate-900">
                {totalEquipments > 0 ? `${Math.round((operationalEquipments / totalEquipments) * 100)}%` : '100%'}
              </span>
              <span className="text-xs text-slate-500">operatividad global</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
              <span className="text-emerald-600 font-semibold flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-500" />
                {operationalEquipments} de {totalEquipments} activos
              </span>
            </div>
          </div>
        )}

        {/* Card 3: Preventives & Work Orders */}
        <div 
          onClick={() => setSelectedTab('preventivo')}
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-blue-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Órdenes Preventivas</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{pendingWorkOrders.length}</span>
            <span className="text-xs text-slate-500">OTs en cola</span>
          </div>
          <div className="mt-3 flex items-center space-x-3 text-xs">
            <span className="text-emerald-700 font-medium">{completedWorkOrders.length} completadas</span>
            {overdueWorkOrders.length > 0 ? (
              <span className="text-rose-600 font-semibold">{overdueWorkOrders.length} vencidas</span>
            ) : (
              <span className="text-slate-400">0 vencidas</span>
            )}
          </div>
        </div>

        {/* Card 4: Inconvenientes & Averías en Vivo */}
        <div 
          onClick={() => setSelectedTab('incidencias')}
          className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs hover:border-rose-300 transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Inconvenientes en Vivo</span>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center group-hover:scale-105 transition-transform ${
              activeIncidents.length > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'
            }`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-extrabold text-slate-900">{activeIncidents.length}</span>
            <span className="text-xs text-slate-500">en tiempo real</span>
          </div>
          <div className="mt-3 flex items-center justify-between text-xs">
            {activeIncidents.length > 0 ? (
              <span className="text-rose-600 font-semibold flex items-center">
                <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5 animate-ping" />
                {urgentIncidents.length > 0 ? `${urgentIncidents.length} urgentes` : 'Ver reportes'}
              </span>
            ) : (
              <span className="text-emerald-600 font-medium">Sin fallas activas</span>
            )}
            <span className="text-rose-600 font-medium group-hover:translate-x-0.5 transition-transform flex items-center">
              Abrir <ArrowRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
        </div>
      </div>

      {/* KPI Interactive Metrics & Analytics Panel with Recharts */}
      <KPIDashboardPanel />

      {/* Real-time Inconvenientes Shared Live Board */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-rose-100 text-rose-600">
              <Radio className="w-4 h-4 animate-pulse" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm flex items-center space-x-2">
                <span>Tablero de Inconvenientes en Vivo (Compartido entre Compañeros)</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-normal">
                  Nube Firestore Activa
                </span>
              </h3>
              <p className="text-xs text-slate-500">
                Cualquier falla cargada por un técnico o supervisor se sincroniza al instante en todos los dispositivos.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsIncidentModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Cargar Inconveniente</span>
            </button>
            <button
              onClick={() => setSelectedTab('incidencias')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <span>Ver todos ({incidents.length})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Incidents preview cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3">
          {incidents.length === 0 ? (
            <div className="col-span-full py-6 text-center text-slate-400 text-xs">
              No hay inconvenientes registrados actualmente. El sistema está limpio y al día.
            </div>
          ) : (
            incidents.slice(0, 3).map(inc => {
            const isResolved = inc.status === 'solucionado';
            return (
              <div 
                key={inc.id}
                onClick={() => setSelectedTab('incidencias')}
                className={`p-3 rounded-xl border text-xs transition-all cursor-pointer hover:shadow-xs ${
                  inc.severity === 'urgente' && !isResolved
                    ? 'border-rose-300 bg-rose-50/30'
                    : isResolved
                    ? 'border-slate-200 bg-slate-50/60 opacity-85'
                    : 'border-slate-200 bg-white hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    inc.severity === 'urgente' ? 'bg-rose-100 text-rose-800' :
                    inc.severity === 'alta' ? 'bg-amber-100 text-amber-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {inc.severity.toUpperCase()}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isResolved ? 'bg-emerald-100 text-emerald-800' :
                    inc.status === 'en_atencion' ? 'bg-amber-100 text-amber-800' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {isResolved ? 'Solucionado' : inc.status === 'en_atencion' ? 'En Atención' : 'Pendiente'}
                  </span>
                </div>
                <h4 className="font-bold text-slate-900 line-clamp-1 text-xs">{inc.title}</h4>
                <p className="text-slate-500 line-clamp-2 mt-0.5 text-[11px]">{inc.description}</p>
                <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                  <span className="truncate max-w-[120px] font-medium text-slate-600">{inc.registeredBy}</span>
                  <span>{inc.timestamp.split(' ')[0]}</span>
                </div>
              </div>
            );
          }))}
        </div>
      </div>

      {/* Critical Gauges & Hotel Machine Parameters */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Variables Críticas de Operación Hotelera
            </h3>
            <p className="text-xs text-slate-500">
              Lecturas en vivo tomadas durante las rondas técnicas y chequeo de cuartos
            </p>
          </div>
          {isRondasAllowed && (
            <button
              onClick={() => setSelectedTab('rondas')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
            >
              <span>Historial completo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Gauge 1: Water Pressure */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700 flex items-center">
                <Droplets className="w-3.5 h-3.5 mr-1 text-blue-600" />
                Red Agua Potable
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                NORMAL
              </span>
            </div>
            <div className="flex items-baseline space-x-1 my-2">
              <span className="text-2xl font-extrabold text-slate-900">{pressureReading}</span>
              <span className="text-xs font-semibold text-slate-500">PSI</span>
            </div>
            {/* Progress bar with safe range indicator */}
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden relative">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, Math.max(10, (pressureReading / 100) * 100))}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Min: {settings.alertThresholds.defaultMinBoosterPsi} PSI</span>
              <span>Óptimo: 70-75</span>
              <span>Max: {settings.alertThresholds.defaultMaxBoosterPsi} PSI</span>
            </div>
          </div>

          {/* Gauge 2: ACS Hot Water Supply */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700 flex items-center">
                <Flame className="w-3.5 h-3.5 mr-1 text-amber-600" />
                Agua Caliente (ACS)
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                ANTI-LEGIONELLA OK
              </span>
            </div>
            <div className="flex items-baseline space-x-1 my-2">
              <span className="text-2xl font-extrabold text-slate-900">{acsTempReading}</span>
              <span className="text-xs font-semibold text-slate-500">°C</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-amber-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (acsTempReading / 80) * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Rango seguro: 55°C - 65°C</span>
              <span>Retorno: 53.0°C</span>
            </div>
          </div>

          {/* Gauge 3: Pool Disinfection */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700 flex items-center">
                <Droplets className="w-3.5 h-3.5 mr-1 text-cyan-600" />
                Piscina Central & Spa
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                BALANCEADO
              </span>
            </div>
            <div className="flex items-center justify-between my-2">
              <div>
                <span className="text-lg font-bold text-slate-900">{poolPhReading}</span>
                <span className="text-[11px] text-slate-500 ml-1">pH</span>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-slate-900">{poolClReading}</span>
                <span className="text-[11px] text-slate-500 ml-1">ppm Cl</span>
              </div>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-cyan-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: '65%' }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>pH 7.2 - 7.6</span>
              <span>Cloro 1.5 - 3.0 ppm</span>
            </div>
          </div>

          {/* Gauge 4: Fire System Pressure */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span className="font-semibold text-slate-700 flex items-center">
                <ShieldCheck className="w-3.5 h-3.5 mr-1 text-rose-600" />
                Red Contra Incendios
              </span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                STANDBY
              </span>
            </div>
            <div className="flex items-baseline space-x-1 my-2">
              <span className="text-2xl font-extrabold text-slate-900">125</span>
              <span className="text-xs font-semibold text-slate-500">PSI</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-rose-500 h-2 rounded-full transition-all duration-500" 
                style={{ width: '85%' }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-1">
              <span>Bomba Jockey activa</span>
              <span>Presostato: 120-130 PSI</span>
            </div>
          </div>

        </div>
      </div>

      {/* Two-Column Details: Critical Pumps Status & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Quick Equipment Health Watchlist */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Estado de Bombas Principales</h3>
              <p className="text-xs text-slate-500">Chequeo técnico rápido de las bombas del hotel</p>
            </div>
            <button 
              onClick={() => setSelectedTab('bombas')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Ver todas ({equipments.length})
            </button>
          </div>

          <div className="space-y-3">
            {equipments.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No hay equipos registrados actualmente en el inventario.
              </div>
            ) : (
              equipments.slice(0, 5).map(eq => (
              <div 
                key={eq.id}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50/70 border border-slate-200/80 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className={`w-3 h-3 rounded-full shrink-0 ${
                    eq.status === 'operativo' ? 'bg-emerald-500' :
                    eq.status === 'alerta' ? 'bg-amber-500 ring-2 ring-amber-200' :
                    'bg-rose-500'
                  }`} />
                  <div className="truncate">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-slate-900">{eq.tag}</span>
                      <span className="text-xs text-slate-600 truncate">{eq.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">{eq.area} • {eq.powerHp} HP • {eq.brand}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 ml-3">
                  <button
                    onClick={() => onNewPumpInspection(eq.id)}
                    className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 shadow-2xs transition-colors"
                  >
                    Revisar
                  </button>
                </div>
              </div>
            )))}
          </div>
        </div>

        {/* Right: Upcoming Preventive Orders & History */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Mantenimiento Preventivo Pendiente</h3>
              <p className="text-xs text-slate-500">Órdenes de trabajo técnicas programadas</p>
            </div>
            <button 
              onClick={() => setSelectedTab('preventivo')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Gestionar OTs
            </button>
          </div>

          <div className="space-y-3">
            {pendingWorkOrders.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                No hay órdenes preventivas pendientes en este momento.
              </div>
            ) : (
              pendingWorkOrders.slice(0, 4).map(order => (
                <div 
                  key={order.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-blue-700">{order.equipmentTag}</span>
                        <span className="text-xs font-medium text-slate-900">{order.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Programada: {order.scheduledDate} • Asignado: {order.technicianAssigned}
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${
                      order.status === 'por_vencer' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {order.status === 'por_vencer' ? 'Próximo' : 'Pendiente'}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-slate-200/60 text-xs">
                    <span className="text-slate-500 text-[11px]">
                      {order.stepsCompleted.filter(s => s.completed).length} de {order.stepsCompleted.length} tareas realizadas
                    </span>
                    <button
                      onClick={() => setSelectedTab('preventivo')}
                      className="text-blue-600 hover:text-blue-700 font-semibold text-[11px] flex items-center space-x-0.5"
                    >
                      <span>Completar OT</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Modal de Supervisión y Visualización en Vivo de la Ronda (Módulo Principal) */}
      {liveInspectingRound && (() => {
        const allCheckpoints = liveInspectingRound.checkpoints || [];
        const filledCount = allCheckpoints.filter(c => isCheckpointComplete(c, roundTemplate)).length;
        const pendingCount = allCheckpoints.length - filledCount;
        const alarmCount = allCheckpoints.filter(c => isCheckpointAlarmActive(c, roundTemplate).isAlarm).length;

        const filteredCheckpoints = allCheckpoints.filter(c => {
          const isCompleted = isCheckpointComplete(c, roundTemplate);
          const hasAlarm = isCheckpointAlarmActive(c, roundTemplate).isAlarm;
          if (modalFilterTab === 'cargados') return isCompleted;
          if (modalFilterTab === 'pendientes') return !isCompleted;
          if (modalFilterTab === 'novedades') return hasAlarm;
          return true;
        });

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden my-auto animate-scale-up">
              {/* Modal Header */}
              <div className="p-5 sm:p-6 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white flex items-start justify-between border-b border-slate-800">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="relative flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500"></span>
                    </span>
                    <h3 className="text-base sm:text-lg font-black text-white">
                      Supervisión en Vivo: Turno {formatShiftName(liveInspectingRound.shift, true)}
                    </h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-amber-500 text-slate-950">
                      En Curso
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Técnico: <strong className="text-white font-bold">{liveInspectingRound.technicianName}</strong> • Iniciada: <strong className="text-white font-bold">{liveInspectingRound.date} a las {liveInspectingRound.time}</strong>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setInspectingRoundId(null)}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                  title="Cerrar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Live Progress Bar Banner */}
              <div className="px-5 sm:px-6 py-3.5 bg-amber-50/80 border-b border-amber-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3 flex-1 min-w-[200px]">
                  <div className="flex-1">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-800 mb-1">
                      <span>Avance general de la ronda en tiempo real</span>
                      <span className="text-amber-900 font-extrabold">{liveInspectingRound.compliancePercentage}%</span>
                    </div>
                    <div className="w-full h-2.5 bg-amber-200/70 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all duration-500"
                        style={{ width: `${Math.max(liveInspectingRound.compliancePercentage, 5)}%` }}
                      />
                    </div>
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

              {/* Filter Tabs */}
              <div className="px-5 sm:px-6 pt-4 pb-2 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/50">
                <span className="text-xs font-black uppercase text-slate-700 tracking-wider">
                  Puntos de Inspección ({allCheckpoints.length})
                </span>
                <div className="flex items-center space-x-1 bg-slate-200/70 p-1 rounded-xl text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setModalFilterTab('todos')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      modalFilterTab === 'todos' ? 'bg-white text-slate-900 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Todos ({allCheckpoints.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalFilterTab('cargados')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      modalFilterTab === 'cargados' ? 'bg-emerald-600 text-white shadow-xs font-black' : 'text-emerald-800 hover:text-emerald-950'
                    }`}
                  >
                    ✓ Cargados ({filledCount})
                  </button>
                  <button
                    type="button"
                    onClick={() => setModalFilterTab('pendientes')}
                    className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                      modalFilterTab === 'pendientes' ? 'bg-amber-500 text-slate-950 shadow-xs font-black' : 'text-amber-800 hover:text-amber-950'
                    }`}
                  >
                    ⏳ Pendientes ({pendingCount})
                  </button>
                  {alarmCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setModalFilterTab('novedades')}
                      className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                        modalFilterTab === 'novedades' ? 'bg-rose-600 text-white shadow-xs font-black' : 'text-rose-800 hover:text-rose-950'
                      }`}
                    >
                      ⚠️ Alertas ({alarmCount})
                    </button>
                  )}
                </div>
              </div>

              {/* Checkpoints Body List */}
              <div className="p-5 sm:p-6 overflow-y-auto max-h-[50vh] space-y-2.5">
                {filteredCheckpoints.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-300 text-slate-500 text-xs">
                    {modalFilterTab === 'cargados' ? 'El técnico aún no ha cargado puntos en esta categoría.' :
                     modalFilterTab === 'pendientes' ? '¡Excelente! Todos los puntos de la ronda han sido completados.' :
                     modalFilterTab === 'novedades' ? 'No se han reportado alertas en esta ronda.' :
                     'No hay puntos de control para mostrar.'}
                  </div>
                ) : (
                  filteredCheckpoints.map(c => {
                    const isCompleted = isCheckpointComplete(c, roundTemplate);
                    const alarmInfo = isCheckpointAlarmActive(c, roundTemplate);
                    const hasAlarm = alarmInfo.isAlarm;

                    const rawVal = (c.currentValue !== undefined && c.currentValue !== null && c.currentValue !== '') ? c.currentValue : (c.statusValue ?? '');
                    const valStr = String(rawVal);
                    const isOk = valStr === 'OK' || valStr === 'true' || valStr.toLowerCase().includes('operativo') || valStr.toLowerCase().includes('normal') || valStr.toLowerCase().includes('conforme');

                    return (
                      <div
                        key={c.id}
                        className={`p-3.5 rounded-2xl border-2 transition-all space-y-2 ${
                          hasAlarm
                            ? 'bg-rose-50/70 border-rose-300 border-l-4 border-l-rose-500 shadow-2xs'
                            : isCompleted
                            ? 'bg-white border-slate-200 border-l-4 border-l-emerald-500 shadow-2xs'
                            : 'bg-slate-50/80 border-dashed border-slate-300 border-l-4 border-l-amber-400'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between text-xs gap-2">
                          <div className="flex items-center space-x-2.5">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border shadow-2xs ${
                              hasAlarm ? 'bg-rose-100 text-rose-700 border-rose-300' :
                              isCompleted ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                              'bg-slate-100 text-slate-500 border-slate-200'
                            }`}>
                              {getRoundItemIcon(c.title, c.category)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-bold text-slate-900">{c.title}</span>
                                {isCompleted ? (
                                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    ✓ Cargado
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                    ⏳ Pendiente
                                  </span>
                                )}
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium">📍 {c.area}</p>
                            </div>
                          </div>

                          <div className="font-mono font-bold text-right">
                            {!isCompleted ? (
                              <span className="text-[11px] text-amber-700/90 italic font-medium">
                                En espera de registro del técnico...
                              </span>
                            ) : c.measurementFields && c.measurementFields.length > 0 ? (
                              <div className="flex flex-col items-end gap-1">
                                <div className="flex flex-wrap gap-1.5 justify-end">
                                  {c.measurementFields.map((f, fIdx) => (
                                    <span key={f.id || fIdx} className="text-blue-900 bg-blue-50 px-2.5 py-1 rounded-lg border-2 border-blue-200 text-xs font-bold flex items-center gap-1.5">
                                      <span>{f.name ? `${f.name}: ` : `Med. ${fIdx+1}: `}</span>
                                      <strong className="text-blue-950 font-black">{f.value !== undefined && f.value !== '' ? f.value : '—'} {f.unit || ''}</strong>
                                      {f.statusValue && (
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getStatusBadgeClass(f.statusValue, f.buttonActions?.[f.statusValue]?.color)}`}>
                                          {f.statusValue}
                                        </span>
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
                                {isOk ? `✓ ${valStr}` : valStr}
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
                            <span><strong className="text-rose-900 font-bold">Desviación / Alerta detectada:</strong> {alarmInfo.reason || 'Equipo fuera de rango o en estado de alarma.'}</span>
                          </div>
                        )}

                        {c.notes && (
                          <div className="pt-2 border-t border-slate-100 flex items-start space-x-1.5 text-[11px] text-slate-600 bg-slate-50/70 p-2 rounded-lg">
                            <span className="font-bold text-slate-800">Nota del técnico:</span>
                            <span>{c.notes}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setInspectingRoundId(null)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-colors"
                >
                  Cerrar Visualización
                </button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
};
