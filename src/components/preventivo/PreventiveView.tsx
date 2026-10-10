import React, { useState } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { 
  PreventivePlan, 
  PreventiveWorkOrder, 
  PreventiveFrequency 
} from '../../types';
import { 
  CalendarCheck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Search, 
  Wrench, 
  ShieldAlert, 
  FileText, 
  X, 
  Check, 
  Calendar, 
  Trash2, 
  Edit3, 
  User, 
  PackageCheck
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';

export const PreventiveView: React.FC = () => {
  const { 
    preventivePlans, 
    workOrders, 
    equipments, 
    executeWorkOrder, 
    createPreventivePlan, 
    deletePreventivePlan, 
    createWorkOrderFromPlan, 
    isAdmin, 
    settings,
    canDeleteRecords,
    notify
  } = useMaintenance();

  const [activeTab, setActiveTab] = useState<'ordenes' | 'planes'>('ordenes');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Work order execution modal
  const [executingOrder, setExecutingOrder] = useState<PreventiveWorkOrder | null>(null);
  const [execSteps, setExecSteps] = useState<{ id: string; description: string; completed: boolean }[]>([]);
  const [execMaterials, setExecMaterials] = useState<string>('');
  const [execNotes, setExecNotes] = useState<string>('');
  const [execDuration, setExecDuration] = useState<number>(45);

  // Create new plan modal (Admin)
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [newPlanEquipmentId, setNewPlanEquipmentId] = useState(equipments[0]?.id || '');
  const [newPlanTitle, setNewPlanTitle] = useState('');
  const [newPlanFrequency, setNewPlanFrequency] = useState<PreventiveFrequency>('mensual');
  const [newPlanMinutes, setNewPlanMinutes] = useState(60);
  const [newPlanSteps, setNewPlanSteps] = useState<string[]>([
    'Inspección visual de fugas y estado general',
    'Comprobación de niveles de fluidos y lubricación',
    'Medición de parámetros eléctricos y vibración'
  ]);
  const [newStepInput, setNewStepInput] = useState('');
  const [newPlanMaterials, setNewPlanMaterials] = useState('Grasa para rodamientos, Paño de limpieza');
  const [newPlanSafety, setNewPlanSafety] = useState('Uso de EPP y bloqueo LOTO si aplica');

  const handleOpenExecuteModal = (order: PreventiveWorkOrder) => {
    setExecutingOrder(order);
    setExecSteps((order.stepsCompleted || []).map(s => ({ ...s })));
    setExecMaterials((order.usedMaterials || []).join(', '));
    setExecNotes(order.technicianNotes || '');
    setExecDuration(order.durationMinutes || 45);
  };

  const handleSaveExecution = (e: React.FormEvent) => {
    e.preventDefault();
    if (!executingOrder) return;

    const materialsArray = execMaterials.split(',').map(m => m.trim()).filter(Boolean);

    executeWorkOrder(executingOrder.id, {
      steps: execSteps,
      usedMaterials: materialsArray,
      technicianNotes: execNotes,
      durationMinutes: execDuration,
    });

    setExecutingOrder(null);
  };

  const handleAddStepToNewPlan = () => {
    if (!newStepInput.trim()) return;
    setNewPlanSteps(prev => [...prev, newStepInput.trim()]);
    setNewStepInput('');
  };

  const handleRemoveStepFromNewPlan = (idx: number) => {
    setNewPlanSteps(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveNewPlan = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEq = equipments.find(e => e.id === newPlanEquipmentId);
    if (!targetEq || !newPlanTitle.trim()) {
      notify('⚠️ Por favor selecciona el equipo y el título para el plan preventivo.');
      return;
    }

    const today = new Date();
    today.setDate(today.getDate() + 30);
    const dueDate = today.toISOString().split('T')[0];

    createPreventivePlan({
      equipmentId: targetEq.id,
      equipmentTag: targetEq.tag,
      equipmentName: targetEq.name,
      title: newPlanTitle,
      frequency: newPlanFrequency,
      estimatedMinutes: newPlanMinutes,
      steps: newPlanSteps.map((s, idx) => ({ id: `st-${idx + 1}`, description: s, completed: false })),
      requiredMaterials: newPlanMaterials.split(',').map(m => m.trim()).filter(Boolean),
      safetyInstructions: newPlanSafety.split(',').map(s => s.trim()).filter(Boolean),
      nextDueDate: dueDate,
      active: true,
    });

    setShowCreatePlanModal(false);
    setNewPlanTitle('');
  };

  // Filtered work orders
  const filteredOrders = (workOrders || []).filter(order => {
    if (!order) return false;
    const matchesStatus = statusFilter === 'todos' || order.status === statusFilter;
    const matchesSearch = (order.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (order.equipmentTag || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (order.equipmentName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (order.technicianAssigned || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header & Navigation Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <CalendarCheck className="w-5 h-5 text-blue-600" />
            <span>Mantenimiento Preventivo (Planes & OTs)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Programa de servicio técnico para bombas de presión, calderas, chillers y grupos electrógenos
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {/* Subtabs Switcher */}
          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center text-xs font-semibold">
            <button
              onClick={() => setActiveTab('ordenes')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors ${
                activeTab === 'ordenes'
                  ? 'bg-white text-blue-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Órdenes de Trabajo ({workOrders.length})
            </button>
            <button
              onClick={() => setActiveTab('planes')}
              className={`px-3.5 py-1.5 rounded-lg transition-colors ${
                activeTab === 'planes'
                  ? 'bg-white text-blue-600 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Planes Maestros ({preventivePlans.length})
            </button>
          </div>

          <button
            onClick={() => setShowCreatePlanModal(true)}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nuevo Plan</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: WORK ORDERS (OTs) */}
      {activeTab === 'ordenes' && (
        <div className="space-y-4">
          
          {/* Filters */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por equipo, título o técnico..."
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white"
              />
            </div>

            <div className="w-full sm:w-48">
              <CustomSelect
                value={statusFilter}
                onChange={(val) => setStatusFilter(val)}
                options={[
                  { value: 'todos', label: 'Todos los Estados', color: 'slate' },
                  { value: 'pendiente', label: 'Pendientes', color: 'amber' },
                  { value: 'por_vencer', label: 'Próximos a Vencer', color: 'rose' },
                  { value: 'completado', label: 'Completados', color: 'emerald' },
                ]}
              />
            </div>
          </div>

          {/* Orders Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredOrders.map(order => {
              const completedCount = order.stepsCompleted.filter(s => s.completed).length;
              const totalCount = order.stepsCompleted.length;
              const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
              const isDone = order.status === 'completado';

              return (
                <div 
                  key={order.id}
                  className={`bg-white rounded-2xl border p-5 transition-all shadow-xs ${
                    isDone 
                      ? 'border-slate-200 bg-slate-50/40' 
                      : order.status === 'por_vencer' 
                        ? 'border-amber-300 ring-1 ring-amber-200' 
                        : 'border-slate-200 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {order.equipmentTag}
                        </span>
                        <span className="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">
                          {order.frequency}
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-slate-900 mt-1.5">
                        {order.title}
                      </h3>
                      <p className="text-xs text-slate-500">{order.equipmentName}</p>
                    </div>

                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase shrink-0 ${
                      isDone ? 'bg-emerald-100 text-emerald-800' :
                      order.status === 'por_vencer' ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {isDone ? 'Completado' : order.status === 'por_vencer' ? 'Próximo' : 'Pendiente'}
                    </span>
                  </div>

                  {/* Programmed date & Assigned technician */}
                  <div className="mt-3 py-2 px-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Prog: <strong className="text-slate-800">{order.scheduledDate}</strong></span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{order.technicianAssigned}</span>
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                      <span>Tareas: {completedCount} de {totalCount}</span>
                      <span className="font-bold text-slate-700">{percent}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          isDone ? 'bg-emerald-500' : 'bg-blue-600'
                        }`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Execution details if completed */}
                  {isDone && (
                    <div className="mt-3 p-2.5 bg-emerald-50/60 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                      <div className="flex justify-between font-semibold">
                        <span>Ejecutado: {order.executionDate}</span>
                        <span>Duración: {order.durationMinutes} min</span>
                      </div>
                      {order.technicianNotes && (
                        <p className="text-[11px] text-emerald-800 mt-1 italic">
                          "{order.technicianNotes}"
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end">
                    <button
                      onClick={() => handleOpenExecuteModal(order)}
                      className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors flex items-center space-x-1.5 ${
                        isDone 
                          ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      <span>{isDone ? 'Ver / Reabrir OT' : 'Ejecutar Preventivo'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 2: MASTER PREVENTIVE PLANS */}
      {activeTab === 'planes' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {preventivePlans.map(plan => (
              <div 
                key={plan.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {plan.equipmentTag}
                      </span>
                      <span className="text-[11px] font-bold uppercase text-slate-500">
                        {plan.frequency}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">
                      Est: {plan.estimatedMinutes} min
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900">{plan.title}</h3>
                  <p className="text-xs text-slate-500 mt-0.5">{plan.equipmentName}</p>

                  {/* Steps Checklist Preview */}
                  <div className="mt-4 space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      Protocolo de Tareas ({plan.steps.length}):
                    </span>
                    <ul className="text-xs text-slate-600 space-y-1 pl-1">
                      {plan.steps.map((st, i) => (
                        <li key={st.id} className="flex items-start space-x-2">
                          <span className="text-blue-600 font-bold text-[10px] mt-0.5">{i + 1}.</span>
                          <span className="text-[11px] leading-relaxed">{st.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Materials & Safety */}
                  <div className="mt-3 pt-3 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
                    <p><strong>Materiales:</strong> {plan.requiredMaterials.join(', ')}</p>
                    <p><strong>Seguridad:</strong> {plan.safetyInstructions.join(', ')}</p>
                  </div>
                </div>

                {/* Bottom Actions */}
                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    Próxima fecha: <strong className="text-slate-800">{plan.nextDueDate}</strong>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => {
                        const date = prompt('Ingrese fecha programada (YYYY-MM-DD):', plan.nextDueDate);
                        if (date) {
                          createWorkOrderFromPlan(plan.id, date, settings.technicians[0]);
                          setActiveTab('ordenes');
                        }
                      }}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 transition-colors"
                    >
                      + Generar OT
                    </button>

                    {canDeleteRecords && (
                      <button
                        onClick={() => {
                          if (confirm(`¿Eliminar el plan preventivo "${plan.title}"?`)) {
                            deletePreventivePlan(plan.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                        title="Eliminar Plan"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* EXECUTE WORK ORDER MODAL */}
      {executingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <span className="text-xs font-bold text-blue-600 uppercase">Orden de Trabajo Preventiva</span>
                <h3 className="text-base font-bold text-slate-900 mt-0.5">
                  {executingOrder.title}
                </h3>
                <p className="text-xs text-slate-500">
                  Equipo: <span className="font-mono font-bold text-slate-800">{executingOrder.equipmentTag}</span> - {executingOrder.equipmentName}
                </p>
              </div>
              <button onClick={() => setExecutingOrder(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExecution} className="space-y-5 pt-4 text-xs">
              {/* Steps Checklist */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Tareas a Realizar (Marque conforme completa):</span>
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
                  {execSteps.map((step, idx) => (
                    <label 
                      key={step.id} 
                      className={`p-3 flex items-start space-x-3 cursor-pointer hover:bg-slate-100/70 transition-colors ${
                        step.completed ? 'bg-emerald-50/40' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={step.completed}
                        onChange={(e) => {
                          const val = e.target.checked;
                          setExecSteps(prev => prev.map((s, i) => i === idx ? { ...s, completed: val } : s));
                        }}
                        className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className={`text-xs leading-relaxed ${step.completed ? 'text-slate-800 font-medium' : 'text-slate-600'}`}>
                        {step.description}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Materials used */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Repuestos & Materiales Consumidos (Separados por comas)
                </label>
                <input
                  type="text"
                  value={execMaterials}
                  onChange={(e) => setExecMaterials(e.target.value)}
                  placeholder="Ej. Grasa SKF LGMT 2 (100g), Junta de estanqueidad, Filtro de aire"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              {/* Duration and Observations */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Tiempo Real Invertido (Minutos)
                  </label>
                  <input
                    type="number"
                    value={execDuration}
                    onChange={(e) => setExecDuration(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono text-center"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">
                    Notas y Diagnóstico del Técnico
                  </label>
                  <textarea
                    rows={2}
                    value={execNotes}
                    onChange={(e) => setExecNotes(e.target.value)}
                    placeholder="Detalles sobre rodamientos, presiones o recomendaciones para el próximo ciclo..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setExecutingOrder(null)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Finalizar y Guardar OT</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE NEW PREVENTIVE PLAN MODAL (Admin only) */}
      {showCreatePlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                Crear Nuevo Plan Preventivo Maestro (Admin)
              </h3>
              <button onClick={() => setShowCreatePlanModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNewPlan} className="space-y-4 pt-4 text-xs">
              <div>
                <CustomSelect
                  label="Equipo o Bomba *"
                  value={newPlanEquipmentId}
                  onChange={(val) => setNewPlanEquipmentId(val)}
                  options={equipments.map(eq => ({
                    value: eq.id,
                    label: `${eq.tag} - ${eq.name}`,
                    description: eq.area,
                    color: 'blue'
                  }))}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Título del Plan Preventivo *</label>
                  <input
                    type="text"
                    required
                    value={newPlanTitle}
                    onChange={(e) => setNewPlanTitle(e.target.value)}
                    placeholder="Ej. Revisión Mensual y Lubricación de Cojinetes"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <CustomSelect
                    label="Periodicidad"
                    value={newPlanFrequency}
                    onChange={(val) => setNewPlanFrequency(val as any)}
                    options={[
                      { value: 'diario', label: 'Diario', color: 'emerald' },
                      { value: 'semanal', label: 'Semanal', color: 'blue' },
                      { value: 'quincenal', label: 'Quincenal', color: 'blue' },
                      { value: 'mensual', label: 'Mensual', color: 'indigo' },
                      { value: 'trimestral', label: 'Trimestral', color: 'amber' },
                      { value: 'semestral', label: 'Semestral', color: 'amber' },
                      { value: 'anual', label: 'Anual', color: 'rose' },
                    ]}
                  />
                </div>
              </div>

              {/* Protocol steps */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Pasos y Tareas del Protocolo ({newPlanSteps.length})
                </label>
                <div className="space-y-1.5 mb-2">
                  {newPlanSteps.map((s, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-50 border border-slate-200 rounded-lg">
                      <span className="text-slate-800">{idx + 1}. {s}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveStepFromNewPlan(idx)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={newStepInput}
                    onChange={(e) => setNewStepInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddStepToNewPlan(); }}}
                    placeholder="Escriba un nuevo paso y presione Agregar..."
                    className="flex-1 px-3 py-1.5 rounded-xl border border-slate-300 text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddStepToNewPlan}
                    className="px-3 py-1.5 bg-slate-800 text-white rounded-xl font-semibold"
                  >
                    + Agregar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Materiales Requeridos</label>
                  <input
                    type="text"
                    value={newPlanMaterials}
                    onChange={(e) => setNewPlanMaterials(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Instrucciones de Seguridad</label>
                  <input
                    type="text"
                    value={newPlanSafety}
                    onChange={(e) => setNewPlanSafety(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreatePlanModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                >
                  Guardar Plan Preventivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
