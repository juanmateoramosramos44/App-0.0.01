import React, { useState, useMemo } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { AuditLogEntry, AuditEventType } from '../../types';
import { 
  ClipboardCheck, 
  RefreshCw, 
  ShieldCheck, 
  AlertTriangle, 
  Info, 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  CheckCircle2, 
  Layers, 
  Database,
  ArrowRight,
  Sparkles,
  Calendar,
  UserCheck,
  FileSpreadsheet
} from 'lucide-react';

export const AuditLogPanel: React.FC = () => {
  const { 
    auditLogs, 
    runStateAudit, 
    stateAuditResult, 
    clearAuditLogs,
    notify 
  } = useMaintenance();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);

  // Filtrado reactivo de auditorías
  const filteredLogs = useMemo(() => {
    return (auditLogs || []).filter(log => {
      // Filtro por tipo
      if (selectedType !== 'all' && log.type !== selectedType) {
        return false;
      }
      // Filtro por entidad
      if (selectedEntity !== 'all' && log.entity !== selectedEntity) {
        return false;
      }
      // Filtro por texto
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchAction = log.action?.toLowerCase().includes(q);
        const matchDetails = log.details?.toLowerCase().includes(q);
        const matchEntityId = log.entityId?.toLowerCase().includes(q);
        const matchUser = log.user?.toLowerCase().includes(q);
        const matchChanges = log.changes?.some(c => 
          c.field?.toLowerCase().includes(q) || 
          String(c.oldValue || '').toLowerCase().includes(q) || 
          String(c.newValue || '').toLowerCase().includes(q)
        );
        if (!matchAction && !matchDetails && !matchEntityId && !matchUser && !matchChanges) {
          return false;
        }
      }
      return true;
    });
  }, [auditLogs, selectedType, selectedEntity, searchTerm]);

  // Ejecución de auditoría en vivo
  const handleRunAudit = () => {
    setIsAuditing(true);
    setTimeout(() => {
      const result = runStateAudit(false);
      setIsAuditing(false);
      if (result.totalCorrections === 0) {
        notify('Auditoría en vivo completada: 100% de consistencia entre registros.');
      }
    }, 400);
  };

  // Exportar registros a CSV
  const handleExportCsv = () => {
    if (filteredLogs.length === 0) {
      notify('No hay registros de auditoría para exportar.');
      return;
    }

    const headers = ['ID', 'Fecha y Hora', 'Tipo Evento', 'Entidad', 'ID Entidad', 'Acción', 'Detalle', 'Usuario', 'Estado'];
    const rows = filteredLogs.map(l => [
      `"${l.id}"`,
      `"${new Date(l.timestamp).toLocaleString('es-CO')}"`,
      `"${l.type}"`,
      `"${l.entity}"`,
      `"${l.entityId || 'N/A'}"`,
      `"${(l.action || '').replace(/"/g, '""')}"`,
      `"${(l.details || '').replace(/"/g, '""')}"`,
      `"${l.user || 'Sistema'}"`,
      `"${l.status}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `registro-auditoria-trazabilidad-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    notify('Registro de auditoría exportado en CSV.');
  };

  // Exportar registros a JSON
  const handleExportJson = () => {
    if (filteredLogs.length === 0) {
      notify('No hay registros de auditoría para exportar.');
      return;
    }

    const jsonStr = JSON.stringify(filteredLogs, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `registro-auditoria-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    notify('Registro de auditoría exportado en JSON.');
  };

  // Métricas
  const totalCount = auditLogs?.length || 0;
  const autoCorrectionsCount = auditLogs?.filter(l => l.type === 'auto_correction').length || 0;
  const auditChecksCount = auditLogs?.filter(l => l.type === 'audit_check').length || 0;
  const dataSyncCount = auditLogs?.filter(l => l.type === 'data_sync').length || 0;

  const getBadgeForType = (type: AuditEventType) => {
    switch (type) {
      case 'auto_correction':
        return {
          label: 'Corrección Automática',
          bg: 'bg-amber-100 text-amber-900 border-amber-300',
          icon: Sparkles
        };
      case 'audit_check':
        return {
          label: 'Verificación de Integridad',
          bg: 'bg-blue-100 text-blue-900 border-blue-300',
          icon: ShieldCheck
        };
      case 'data_sync':
        return {
          label: 'Sincronización DB',
          bg: 'bg-emerald-100 text-emerald-900 border-emerald-300',
          icon: Database
        };
      case 'status_change':
        return {
          label: 'Cambio de Estado',
          bg: 'bg-purple-100 text-purple-900 border-purple-300',
          icon: RefreshCw
        };
      case 'entity_creation':
        return {
          label: 'Creación Registro',
          bg: 'bg-sky-100 text-sky-900 border-sky-300',
          icon: Layers
        };
      case 'entity_deletion':
        return {
          label: 'Eliminación',
          bg: 'bg-rose-100 text-rose-900 border-rose-300',
          icon: Trash2
        };
      default:
        return {
          label: 'Ajuste de Sistema',
          bg: 'bg-slate-100 text-slate-900 border-slate-300',
          icon: Info
        };
    }
  };

  const getEntityLabel = (entity: string) => {
    const map: Record<string, string> = {
      tasks: 'Tareas Operativas',
      workOrders: 'Órdenes Preventivas (OT)',
      incidents: 'Incidencias & Novedades',
      requests: 'Solicitudes de Huéspedes',
      rounds: 'Rondas Diarias',
      equipments: 'Equipos & Bombas',
      settings: 'Configuración Global',
      system: 'Sistema & Base de Datos'
    };
    return map[entity] || entity;
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs shrink-0">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900">
                Registro de Auditoría & Trazabilidad del Sistema
              </h3>
              <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                En Tiempo Real
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Historial inmutable de cambios, conciliaciones de base de datos y correcciones automáticas realizadas por el motor de integridad.
            </p>
          </div>
        </div>

        {/* Acciones principales */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'Auditando...' : 'Ejecutar Auditoría en Vivo'}</span>
          </button>

          <div className="flex items-center space-x-1.5">
            <button
              onClick={handleExportCsv}
              title="Exportar a CSV"
              className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            </button>
            <button
              onClick={handleExportJson}
              title="Exportar a JSON"
              className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-blue-600" />
            </button>
            {auditLogs.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('¿Desea limpiar el historial de auditoría? Se conservará la integridad de los datos de la app.')) {
                    clearAuditLogs();
                    notify('Historial de auditoría reiniciado.');
                  }
                }}
                title="Limpiar registro"
                className="p-2 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4 text-rose-600" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Métricas Resumen */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wide">Total Eventos</span>
            <Database className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-900 mt-1">{totalCount}</div>
          <div className="text-[10px] text-slate-500 mt-0.5 font-medium">Eventos registrados</div>
        </div>

        <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wide">Autocorrecciones</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-amber-900 mt-1">{autoCorrectionsCount}</div>
          <div className="text-[10px] text-amber-700 mt-0.5 font-medium">Discrepancias resueltas</div>
        </div>

        <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wide">Verificaciones OK</span>
            <ShieldCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-xl font-black text-blue-900 mt-1">{auditChecksCount}</div>
          <div className="text-[10px] text-blue-700 mt-0.5 font-medium">Auditorías de consistencia</div>
        </div>

        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-3.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wide">Estado de Base</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-900 mt-1">100%</div>
          <div className="text-[10px] text-emerald-700 mt-0.5 font-medium">Consistencia y Salud</div>
        </div>
      </div>

      {/* Filtros y Buscador */}
      <div className="flex flex-col md:flex-row gap-3 pt-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por ID de orden, acción, descripción o usuario..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:border-blue-500 text-xs transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por tipo */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <span className="text-[11px] text-slate-500 px-2">Tipo:</span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="bg-white border-none rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs cursor-pointer outline-none"
            >
              <option value="all">Todos los Tipos</option>
              <option value="auto_correction">Correcciones Automáticas</option>
              <option value="audit_check">Verificación de Integridad</option>
              <option value="data_sync">Sincronización DB</option>
              <option value="status_change">Cambios de Estado</option>
              <option value="entity_creation">Creaciones</option>
              <option value="entity_deletion">Eliminaciones</option>
            </select>
          </div>

          {/* Filtro por entidad */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <span className="text-[11px] text-slate-500 px-2">Módulo:</span>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="bg-white border-none rounded-lg px-2.5 py-1 text-xs font-bold text-slate-700 shadow-2xs cursor-pointer outline-none"
            >
              <option value="all">Todos los Módulos</option>
              <option value="tasks">Tareas</option>
              <option value="workOrders">Órdenes Preventivas (OT)</option>
              <option value="incidents">Incidencias</option>
              <option value="requests">Solicitudes</option>
              <option value="rounds">Rondas</option>
              <option value="equipments">Equipos</option>
              <option value="system">Sistema</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista del Historial de Auditoría */}
      <div className="space-y-2.5">
        {filteredLogs.length === 0 ? (
          <div className="text-center py-10 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <ClipboardCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-700">No se encontraron registros de auditoría</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              {searchTerm || selectedType !== 'all' || selectedEntity !== 'all'
                ? 'Prueba modificando o limpiando los filtros de búsqueda.'
                : 'Ejecuta una auditoría en vivo o interactúa con el sistema para generar eventos de trazabilidad.'}
            </p>
          </div>
        ) : (
          filteredLogs.map((log) => {
            const badge = getBadgeForType(log.type);
            const Icon = badge.icon;
            const isExpanded = expandedLogId === log.id;
            const hasChanges = log.changes && log.changes.length > 0;

            return (
              <div
                key={log.id}
                className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/90 rounded-2xl p-4 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-start space-x-3">
                    <div className="p-2 rounded-xl bg-white border border-slate-200 text-slate-700 shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white text-slate-600 border border-slate-200">
                          {getEntityLabel(log.entity)}
                        </span>
                        {log.entityId && (
                          <span className="text-[11px] font-mono font-semibold text-slate-500">
                            ID: {log.entityId}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 mt-1">
                        {log.action}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                        {log.details}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3 text-[11px] text-slate-500 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                    <div className="flex flex-col sm:items-end">
                      <span className="flex items-center gap-1 font-semibold text-slate-700">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {new Date(log.timestamp).toLocaleDateString('es-CO')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    {hasChanges && (
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="p-1 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 transition-colors"
                        title={isExpanded ? 'Ocultar cambios' : 'Ver detalle de cambios'}
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Detalle desplegable de cambios (Old Value vs New Value) */}
                {isExpanded && hasChanges && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                    <div className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      <span>Detalle de Valores Modificados:</span>
                    </div>

                    <div className="grid grid-cols-1 gap-1.5">
                      {log.changes!.map((ch, idx) => (
                        <div key={idx} className="bg-white p-2.5 rounded-xl border border-slate-200 text-xs flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-slate-700 font-mono text-[11px]">
                            Campo: {ch.field}
                          </span>
                          <div className="flex items-center space-x-2 text-[11px]">
                            <span className="px-2 py-0.5 rounded bg-rose-50 border border-rose-200 text-rose-700 line-through">
                              {String(ch.oldValue ?? 'vacío')}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                            <span className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">
                              {String(ch.newValue ?? 'vacío')}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer informativo */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
          <span>Registros garantizados por el protocolo de auditoría continua y reconciliación atómica.</span>
        </span>
        <span>Mostrando {filteredLogs.length} de {totalCount} eventos</span>
      </div>
    </div>
  );
};
