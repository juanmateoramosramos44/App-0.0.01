import React, { useState } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { CustomSelect } from '../common/CustomSelect';
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  Radio, 
  MapPin, 
  Layers, 
  User, 
  Trash2, 
  ChevronRight,
  ShieldAlert,
  Sparkles,
  Check,
  Camera,
  X,
  Image as ImageIcon
} from 'lucide-react';
import { Incident } from '../../types';
import { getLocalDateTimeString, formatRequestDateTime } from '../../utils/dateUtils';

export const IncidentsLiveView: React.FC = () => {
  const { 
    incidents, 
    updateIncident, 
    deleteIncident, 
    setIsIncidentModalOpen,
    isCloudSynced,
    settings,
    canDeleteRecords
  } = useMaintenance();

  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendiente' | 'en_atencion' | 'solucionado'>('todos');
  const [severityFilter, setSeverityFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Resolution modal state
  const [resolvingIncident, setResolvingIncident] = useState<Incident | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolvedBy, setResolvedBy] = useState(settings.technicians[0] || 'Técnico de Turno');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Filter incidents
  const filtered = incidents.filter(inc => {
    if (statusFilter !== 'todos' && inc.status !== statusFilter) return false;
    if (severityFilter !== 'todos' && inc.severity !== severityFilter) return false;
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      const matchTitle = inc.title.toLowerCase().includes(q);
      const matchArea = inc.area.toLowerCase().includes(q);
      const matchDesc = inc.description.toLowerCase().includes(q);
      const matchTag = inc.equipmentTag ? inc.equipmentTag.toLowerCase().includes(q) : false;
      const matchReporter = inc.registeredBy.toLowerCase().includes(q);
      if (!matchTitle && !matchArea && !matchDesc && !matchTag && !matchReporter) return false;
    }
    return true;
  });

  const countPending = incidents.filter(i => i.status === 'pendiente').length;
  const countInAttention = incidents.filter(i => i.status === 'en_atencion').length;
  const countResolved = incidents.filter(i => i.status === 'solucionado').length;
  const countUrgent = incidents.filter(i => i.severity === 'urgente' && i.status !== 'solucionado').length;

  const handleStartAttention = async (incident: Incident) => {
    await updateIncident(incident.id, {
      status: 'en_atencion'
    });
  };

  const handleConfirmResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingIncident) return;

    const timestamp = getLocalDateTimeString();

    await updateIncident(resolvingIncident.id, {
      status: 'solucionado',
      resolvedBy,
      resolvedAt: timestamp,
      resolutionNotes: resolutionNotes || 'Inconveniente verificado y solucionado por el técnico.'
    });

    setResolvingIncident(null);
    setResolutionNotes('');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Cloud Indicator */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Inconvenientes & Averías en Vivo
            </h2>
            <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Radio className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>Sincronización en Tiempo Real</span>
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Los problemas reportados aquí se reflejan al instante en los teléfonos de todos los compañeros y supervisores.
          </p>
        </div>

        {/* Action button */}
        <button
          onClick={() => setIsIncidentModalOpen(true)}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Cargar Nuevo Inconveniente</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Pendientes</span>
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{countPending}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Esperando intervención</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">En Atención</span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{countInAttention}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Técnico revisando</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Solucionados</span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{countResolved}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Casos cerrados</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Críticos / Urgentes</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{countUrgent}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Prioridad máxima</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por falla, equipo, área o técnico..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-slate-50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Status filter */}
          <div className="w-40">
            <CustomSelect
              value={statusFilter}
              onChange={(val) => setStatusFilter(val as any)}
              options={[
                { value: 'todos', label: 'Todos los Estados', color: 'slate' },
                { value: 'pendiente', label: 'Pendientes', color: 'rose' },
                { value: 'en_atencion', label: 'En Atención', color: 'amber' },
                { value: 'solucionado', label: 'Solucionados', color: 'emerald' },
              ]}
            />
          </div>

          {/* Severity filter */}
          <div className="w-36">
            <CustomSelect
              value={severityFilter}
              onChange={(val) => setSeverityFilter(val)}
              options={[
                { value: 'todos', label: 'Severidad: Todas', color: 'slate' },
                { value: 'urgente', label: 'Urgente', color: 'rose' },
                { value: 'alta', label: 'Alta', color: 'amber' },
                { value: 'media', label: 'Media', color: 'blue' },
                { value: 'baja', label: 'Baja', color: 'slate' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Incidents List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-base font-bold text-slate-800">No hay inconvenientes en este filtro</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Todos los sistemas e instalaciones del hotel reportan funcionamiento correcto o no coinciden con la búsqueda.
            </p>
            <button
              onClick={() => setIsIncidentModalOpen(true)}
              className="mt-4 inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
            >
              <Plus className="w-4 h-4" />
              <span>Reportar un Inconveniente</span>
            </button>
          </div>
        ) : (
          filtered.map(inc => {
            const isUrgent = inc.severity === 'urgente';
            const isPending = inc.status === 'pendiente';
            const isInAttention = inc.status === 'en_atencion';
            const isResolved = inc.status === 'solucionado';

            return (
              <div 
                key={inc.id}
                className={`bg-white rounded-2xl border transition-all p-4 sm:p-5 shadow-xs ${
                  isUrgent && isPending 
                    ? 'border-rose-300 ring-1 ring-rose-200 bg-rose-50/20' 
                    : isPending
                    ? 'border-slate-200/90'
                    : isResolved
                    ? 'border-slate-200 opacity-90'
                    : 'border-amber-200 bg-amber-50/15'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  {/* Left content */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Severity pill */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        inc.severity === 'urgente' 
                          ? 'bg-rose-100 text-rose-800 border border-rose-200 animate-pulse' 
                          : inc.severity === 'alta'
                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                          : inc.severity === 'media'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {inc.severity.toUpperCase()}
                      </span>

                      {/* Status pill */}
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold flex items-center space-x-1 ${
                        isPending 
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : isInAttention
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {isPending && <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping" />}
                        {isInAttention && <Clock className="w-3 h-3 text-amber-600" />}
                        {isResolved && <Check className="w-3 h-3 text-emerald-600" />}
                        <span>
                          {isPending ? 'Pendiente' : isInAttention ? 'En Atención' : 'Solucionado'}
                        </span>
                      </span>

                      {/* Equipment Tag if present */}
                      {inc.equipmentTag && (
                        <span className="px-2 py-0.5 rounded-lg bg-slate-900 text-white font-mono text-[10px] font-bold">
                          {inc.equipmentTag}
                        </span>
                      )}

                      {(() => {
                        const dt = formatRequestDateTime(inc.timestamp);
                        return (
                          <span 
                            className="inline-flex items-center gap-1 text-[11px] text-slate-500 font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-200/60"
                            title={`Registrado: ${dt.fullFormatted}`}
                          >
                            <Clock className="w-3 h-3 text-slate-400" />
                            {dt.relativeLabel}
                          </span>
                        );
                      })()}
                    </div>

                    {/* Title */}
                    <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight">
                      {inc.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {inc.description}
                    </p>

                    {/* Attached Photo Preview */}
                    {inc.photoUrl && (
                      <div className="pt-1">
                        <button
                          type="button"
                          onClick={() => setPreviewPhotoUrl(inc.photoUrl || null)}
                          className="inline-flex items-center space-x-2.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-800 text-xs font-bold transition-all cursor-pointer group shadow-2xs"
                        >
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-slate-200 shrink-0 border border-slate-300">
                            <img src={inc.photoUrl} alt="Foto evidencia" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                          </div>
                          <div className="text-left">
                            <span className="flex items-center space-x-1 text-rose-700 font-extrabold text-[11px]">
                              <Camera className="w-3.5 h-3.5" />
                              <span>Ver Foto de Evidencia</span>
                            </span>
                            <span className="text-[9px] text-slate-500 block">Clic para ampliar en alta resolución</span>
                          </div>
                        </button>
                      </div>
                    )}

                    {/* Resolution details if solved */}
                    {isResolved && inc.resolutionNotes && (
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100 text-xs text-emerald-900 mt-2">
                        <div className="font-bold flex items-center space-x-1 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Solución Registrada:</span>
                        </div>
                        <p className="mt-1 text-emerald-800">{inc.resolutionNotes}</p>
                        {inc.resolvedBy && (
                          <p className="text-[10px] text-emerald-600 mt-1 font-medium">
                            Cerrado por: {inc.resolvedBy} {inc.resolvedAt && `(${formatRequestDateTime(inc.resolvedAt).fullFormatted})`}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Location & Reporter Info */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                      <div className="flex items-center space-x-1.5">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-medium text-slate-700">{inc.area}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>Reportado por: <strong className="text-slate-700">{inc.registeredBy}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {isPending && (
                      <button
                        onClick={() => handleStartAttention(inc)}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-semibold transition-colors"
                      >
                        <Wrench className="w-3.5 h-3.5 text-amber-600" />
                        <span>Tomar Caso</span>
                      </button>
                    )}

                    {!isResolved && (
                      <button
                        onClick={() => {
                          setResolvingIncident(inc);
                          setResolutionNotes('');
                        }}
                        className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Dar por Solucionado</span>
                      </button>
                    )}

                    {isResolved && (
                      <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Completado</span>
                      </span>
                    )}

                    {/* Delete button */}
                    {canDeleteRecords && (
                      confirmDeleteId === inc.id ? (
                        <div className="flex items-center space-x-1 animate-in fade-in zoom-in duration-200">
                          <button
                            onClick={() => {
                              setConfirmDeleteId(null);
                              deleteIncident(inc.id);
                            }}
                            className="px-3 py-1.5 text-[11px] font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition-colors"
                          >
                            Confirmar
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteId(inc.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Eliminar inconveniente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal for marking resolved */}
      {resolvingIncident && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Cerrar y Solucionar Inconveniente</h3>
                <p className="text-xs text-slate-500">{resolvingIncident.title}</p>
              </div>
            </div>

            <form onSubmit={handleConfirmResolve} className="space-y-3 pt-3 text-xs">
              <div>
                <CustomSelect
                  label="Técnico que Solucionó"
                  value={resolvedBy}
                  onChange={(val) => setResolvedBy(val)}
                  options={settings.technicians.map(tech => ({
                    value: tech,
                    label: tech,
                    color: 'emerald'
                  }))}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notas de Solución y Acciones Realizadas *
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ej. Se reemplazó el sello mecánico por repuesto nuevo de bodega, se verificó presión a 75 PSI sin goteo."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none text-slate-900 text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setResolvingIncident(null)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-sm"
                >
                  Confirmar Solución
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PHOTO PREVIEW LIGHTBOX MODAL */}
      {previewPhotoUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-emerald-400" />
                <span className="font-bold text-xs sm:text-sm">Fotografía de Evidencia del Inconveniente</span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="p-1 hover:bg-white/10 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center flex-1 overflow-hidden">
              <img
                src={previewPhotoUrl}
                alt="Foto del inconveniente"
                className="max-h-[65vh] w-auto max-w-full object-contain rounded-xl shadow-lg border border-slate-800"
              />
            </div>
            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewPhotoUrl(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
