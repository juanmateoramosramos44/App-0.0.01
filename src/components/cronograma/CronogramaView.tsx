import React, { useState, useMemo } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { Cronograma, CronogramaMilestone, CronogramaCategory, CronogramaStatus, CronogramaPriority } from '../../types';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  BarChart3, 
  Kanban, 
  ListFilter, 
  Sparkles, 
  ChevronRight, 
  ChevronLeft, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle, 
  CalendarCheck, 
  DollarSign, 
  User, 
  Layers, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Copy, 
  FileDown, 
  X, 
  Flame, 
  Building, 
  Activity, 
  Check, 
  Percent, 
  Info,
  CalendarRange
} from 'lucide-react';

const CATEGORY_MAP: Record<CronogramaCategory, { label: string; color: string; badge: string; icon: any }> = {
  mantenimiento_preventivo: { label: 'Preventivo Mayor', color: 'text-blue-700 bg-blue-50 border-blue-200', badge: 'bg-blue-500', icon: CalendarCheck },
  correctivo_mayor: { label: 'Correctivo Mayor', color: 'text-amber-700 bg-amber-50 border-amber-200', badge: 'bg-amber-500', icon: AlertTriangle },
  parada_tecnica: { label: 'Parada Técnica', color: 'text-rose-700 bg-rose-50 border-rose-200', badge: 'bg-rose-500', icon: Flame },
  auditoria_certificacion: { label: 'Auditoría / Certificación', color: 'text-purple-700 bg-purple-50 border-purple-200', badge: 'bg-purple-500', icon: CheckCircle2 },
  infraestructura_mejoras: { label: 'Infraestructura & Obra', color: 'text-indigo-700 bg-indigo-50 border-indigo-200', badge: 'bg-indigo-500', icon: Building },
  limpieza_desinfeccion: { label: 'Limpieza Profunda', color: 'text-emerald-700 bg-emerald-50 border-emerald-200', badge: 'bg-emerald-500', icon: Activity },
  seguridad_brigada: { label: 'Seguridad & Brigada', color: 'text-cyan-700 bg-cyan-50 border-cyan-200', badge: 'bg-cyan-500', icon: Clock },
  otro: { label: 'Otro Plan', color: 'text-slate-700 bg-slate-100 border-slate-200', badge: 'bg-slate-500', icon: Layers },
};

const STATUS_MAP: Record<CronogramaStatus, { label: string; badge: string; bg: string; border: string }> = {
  planificado: { label: 'Planificado', badge: 'bg-blue-100 text-blue-800', bg: 'bg-blue-50/50', border: 'border-blue-200' },
  en_ejecucion: { label: 'En Ejecución', badge: 'bg-amber-100 text-amber-800 animate-pulse', bg: 'bg-amber-50/50', border: 'border-amber-200' },
  pausado: { label: 'Pausado', badge: 'bg-purple-100 text-purple-800', bg: 'bg-purple-50/50', border: 'border-purple-200' },
  completado: { label: 'Completado', badge: 'bg-emerald-100 text-emerald-800', bg: 'bg-emerald-50/50', border: 'border-emerald-200' },
  cancelado: { label: 'Cancelado', badge: 'bg-rose-100 text-rose-800', bg: 'bg-rose-50/50', border: 'border-rose-200' },
};

const PRIORITY_MAP: Record<CronogramaPriority, { label: string; color: string; dot: string }> = {
  baja: { label: 'Baja', color: 'text-slate-600 bg-slate-100', dot: 'bg-slate-400' },
  media: { label: 'Media', color: 'text-blue-700 bg-blue-100', dot: 'bg-blue-500' },
  alta: { label: 'Alta', color: 'text-amber-700 bg-amber-100', dot: 'bg-amber-500' },
  critica: { label: 'Crítica', color: 'text-rose-700 bg-rose-100 font-bold', dot: 'bg-rose-600' },
};

export const CronogramaView: React.FC = () => {
  const { 
    cronogramas = [], 
    addCronograma, 
    updateCronograma, 
    deleteCronograma, 
    equipments = [], 
    users = [], 
    currentUser, 
    notify,
    isCloudSynced 
  } = useMaintenance();

  const [activeViewMode, setActiveViewMode] = useState<'lista' | 'kanban' | 'gantt' | 'calendario'>('lista');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<'all' | CronogramaStatus>('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<'all' | CronogramaCategory>('all');
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<'all' | CronogramaPriority>('all');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false);
  const [selectedCronogramaForDetail, setSelectedCronogramaForDetail] = useState<Cronograma | null>(null);
  const [editingCronograma, setEditingCronograma] = useState<Cronograma | null>(null);
  const [cronogramaToDelete, setCronogramaToDelete] = useState<Cronograma | null>(null);

  // Calendario mensual state
  const [calendarDate, setCalendarDate] = useState(() => new Date());

  // Formulario de creación / edición
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState<CronogramaCategory>('mantenimiento_preventivo');
  const [formArea, setFormArea] = useState('Cuarto de Máquinas y Calderas');
  const [formStartDate, setFormStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [formEndDate, setFormEndDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [formStatus, setFormStatus] = useState<CronogramaStatus>('planificado');
  const [formPriority, setFormPriority] = useState<CronogramaPriority>('media');
  const [formLeaderName, setFormLeaderName] = useState(() => currentUser?.displayName || 'Juan Mateo Ramos');
  const [formBudgetEstimated, setFormBudgetEstimated] = useState<number | ''>('');
  const [formMilestones, setFormMilestones] = useState<Omit<CronogramaMilestone, 'id'>[]>([]);

  // Sub-formulario para agregar hitos rápidos dentro del modal
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');
  const [newMilestoneStart, setNewMilestoneStart] = useState('');
  const [newMilestoneEnd, setNewMilestoneEnd] = useState('');
  const [newMilestoneAssignee, setNewMilestoneAssignee] = useState('');
  const [newMilestoneTag, setNewMilestoneTag] = useState('');

  // Estadísticas y Métricas
  const stats = useMemo(() => {
    const total = cronogramas.length;
    const enEjecucion = cronogramas.filter(c => c.status === 'en_ejecucion').length;
    const planificados = cronogramas.filter(c => c.status === 'planificado').length;
    const completados = cronogramas.filter(c => c.status === 'completado').length;

    let totalMilestones = 0;
    let completedMilestones = 0;
    let totalBudgetPlan = 0;
    let totalBudgetReal = 0;
    let avgProgressSum = 0;

    cronogramas.forEach(c => {
      const ms = c.milestones || [];
      totalMilestones += ms.length;
      completedMilestones += ms.filter(m => m.status === 'completado').length;
      totalBudgetPlan += Number(c.budgetEstimated || 0);
      totalBudgetReal += Number(c.budgetActual || 0);

      // Calcular progreso ponderado
      let prog = 0;
      if (ms.length > 0) {
        prog = ms.reduce((acc, m) => acc + (m.progress || 0), 0) / ms.length;
      } else {
        prog = c.status === 'completado' ? 100 : c.status === 'en_ejecucion' ? 50 : 0;
      }
      avgProgressSum += prog;
    });

    const globalProgress = total > 0 ? Math.round(avgProgressSum / total) : 0;

    return {
      total,
      enEjecucion,
      planificados,
      completados,
      totalMilestones,
      completedMilestones,
      totalBudgetPlan,
      totalBudgetReal,
      globalProgress
    };
  }, [cronogramas]);

  // Cronogramas filtrados
  const filteredCronogramas = useMemo(() => {
    return cronogramas.filter(c => {
      if (selectedStatusFilter !== 'all' && c.status !== selectedStatusFilter) return false;
      if (selectedCategoryFilter !== 'all' && c.category !== selectedCategoryFilter) return false;
      if (selectedPriorityFilter !== 'all' && c.priority !== selectedPriorityFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchTitle = c.title.toLowerCase().includes(q);
        const matchDesc = c.description.toLowerCase().includes(q);
        const matchArea = c.area.toLowerCase().includes(q);
        const matchLeader = c.leaderName.toLowerCase().includes(q);
        const matchMilestones = (c.milestones || []).some(m => m.title.toLowerCase().includes(q));
        if (!matchTitle && !matchDesc && !matchArea && !matchLeader && !matchMilestones) return false;
      }
      return true;
    });
  }, [cronogramas, selectedStatusFilter, selectedCategoryFilter, selectedPriorityFilter, searchTerm]);

  // Manejo de guardado (Crear o Actualizar)
  const handleOpenCreateModal = () => {
    setEditingCronograma(null);
    setFormTitle('');
    setFormDescription('');
    setFormCategory('mantenimiento_preventivo');
    setFormArea('Cuarto de Calderas & Bombas');
    const today = new Date().toISOString().split('T')[0];
    setFormStartDate(today);
    const inOneMonth = new Date();
    inOneMonth.setMonth(inOneMonth.getMonth() + 1);
    setFormEndDate(inOneMonth.toISOString().split('T')[0]);
    setFormStatus('planificado');
    setFormPriority('media');
    setFormLeaderName(currentUser?.displayName || 'Juan Mateo Ramos');
    setFormBudgetEstimated('');
    setFormMilestones([
      {
        title: 'Fase 1: Inspección diagnóstica inicial y aislamiento',
        startDate: today,
        endDate: today,
        assignedToName: currentUser?.displayName || 'Técnico',
        status: 'pendiente',
        progress: 0
      },
      {
        title: 'Fase 2: Ejecución de mantenimiento y cambio de repuestos',
        startDate: today,
        endDate: inOneMonth.toISOString().split('T')[0],
        assignedToName: 'Equipo de Mantenimiento',
        status: 'pendiente',
        progress: 0
      }
    ]);
    setIsCreateModalOpen(true);
  };

  const handleOpenEditModal = (c: Cronograma) => {
    setEditingCronograma(c);
    setFormTitle(c.title);
    setFormDescription(c.description);
    setFormCategory(c.category);
    setFormArea(c.area);
    setFormStartDate(c.startDate);
    setFormEndDate(c.endDate);
    setFormStatus(c.status);
    setFormPriority(c.priority);
    setFormLeaderName(c.leaderName);
    setFormBudgetEstimated(c.budgetEstimated || '');
    setFormMilestones(c.milestones ? c.milestones.map(m => ({ ...m })) : []);
    setIsCreateModalOpen(true);
  };

  const handleAddMilestoneToForm = () => {
    if (!newMilestoneTitle.trim()) {
      notify('Por favor escribe el nombre de la actividad o hito');
      return;
    }
    const ms: Omit<CronogramaMilestone, 'id'> = {
      title: newMilestoneTitle.trim(),
      startDate: newMilestoneStart || formStartDate,
      endDate: newMilestoneEnd || formEndDate,
      assignedToName: newMilestoneAssignee.trim() || formLeaderName,
      equipmentTag: newMilestoneTag.trim() || undefined,
      status: 'pendiente',
      progress: 0
    };
    setFormMilestones(prev => [...prev, ms]);
    setNewMilestoneTitle('');
    setNewMilestoneStart('');
    setNewMilestoneEnd('');
    setNewMilestoneTag('');
  };

  const handleRemoveMilestoneFromForm = (index: number) => {
    setFormMilestones(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveCronograma = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      notify('Por favor ingresa un título para el cronograma');
      return;
    }

    const startYear = parseInt(formStartDate.split('-')[0]) || new Date().getFullYear();
    const startMonth = parseInt(formStartDate.split('-')[1]) || (new Date().getMonth() + 1);

    const formattedMilestones: CronogramaMilestone[] = formMilestones.map((m, idx) => ({
      ...m,
      id: (m as any).id || `ms-${Date.now()}-${idx}`
    }));

    // Calcular progreso automático
    let completionPercentage = 0;
    if (formattedMilestones.length > 0) {
      const sum = formattedMilestones.reduce((acc, m) => acc + (m.progress || 0), 0);
      completionPercentage = Math.round(sum / formattedMilestones.length);
    } else {
      completionPercentage = formStatus === 'completado' ? 100 : formStatus === 'en_ejecucion' ? 40 : 0;
    }

    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim(),
      category: formCategory,
      area: formArea.trim(),
      startDate: formStartDate,
      endDate: formEndDate,
      year: startYear,
      month: startMonth,
      status: formStatus,
      priority: formPriority,
      leaderName: formLeaderName.trim(),
      budgetEstimated: formBudgetEstimated ? Number(formBudgetEstimated) : 0,
      budgetActual: editingCronograma?.budgetActual || 0,
      currency: 'COP',
      milestones: formattedMilestones,
      completionPercentage,
      createdByName: currentUser?.displayName || 'Administrador',
      createdById: currentUser?.id || 'usr-admin'
    };

    if (editingCronograma) {
      await updateCronograma(editingCronograma.id, payload);
      notify('Cronograma actualizado exitosamente');
    } else {
      await addCronograma(payload);
      notify('¡Cronograma creado con éxito!');
    }

    setIsCreateModalOpen(false);
    setEditingCronograma(null);
  };

  // Duplicar cronograma
  const handleDuplicate = async (c: Cronograma) => {
    const today = new Date().toISOString().split('T')[0];
    const clonedPayload = {
      ...c,
      title: `${c.title} (Copia)`,
      startDate: today,
      status: 'planificado' as CronogramaStatus,
      milestones: (c.milestones || []).map(m => ({
        ...m,
        id: `ms-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        status: 'pendiente' as const,
        progress: 0
      })),
      completionPercentage: 0,
      createdByName: currentUser?.displayName || 'Administrador',
      createdById: currentUser?.id || 'usr-admin'
    };
    // Remover campos de ID
    delete (clonedPayload as any).id;
    delete (clonedPayload as any).createdAt;
    delete (clonedPayload as any).updatedAt;

    await addCronograma(clonedPayload as any);
    notify('Cronograma duplicado correctamente');
  };

  // Instanciar plantilla maestra
  const handleLoadTemplate = async (templateKey: string) => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const inThreeMonths = new Date(today);
    inThreeMonths.setMonth(today.getMonth() + 3);
    const inThreeMonthsStr = inThreeMonths.toISOString().split('T')[0];

    let tpl: Omit<Cronograma, 'id' | 'createdAt' | 'updatedAt'> | null = null;

    if (templateKey === 'preventivo_anual') {
      tpl = {
        title: 'Plan Maestro de Mantenimiento Preventivo Anual Hotelero',
        description: 'Programa anual de revisión y servicio integral de cuartos de máquinas, bombas de agua, calderas, aires acondicionados y subestación eléctrica.',
        category: 'mantenimiento_preventivo',
        area: 'Instalaciones Generales del Hotel',
        startDate: todayStr,
        endDate: inThreeMonthsStr,
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        status: 'en_ejecucion',
        priority: 'alta',
        leaderName: currentUser?.displayName || 'Juan Mateo Ramos',
        budgetEstimated: 12500000,
        budgetActual: 0,
        currency: 'COP',
        milestones: [
          { id: `ms-${Date.now()}-1`, title: 'Inspección de grupos de presión y recirculadoras ACS', startDate: todayStr, endDate: todayStr, status: 'en_progreso', progress: 50, equipmentTag: 'BOM-01' },
          { id: `ms-${Date.now()}-2`, title: 'Desincrustación y purga de calderas de vapor', startDate: todayStr, endDate: inThreeMonthsStr, status: 'pendiente', progress: 0, equipmentTag: 'CAL-01' },
          { id: `ms-${Date.now()}-3`, title: 'Mantenimiento de Unidades Manejadoras de Aire (UMA) y Chillers', startDate: todayStr, endDate: inThreeMonthsStr, status: 'pendiente', progress: 0, equipmentTag: 'CHILL-01' },
          { id: `ms-${Date.now()}-4`, title: 'Prueba de transferencia automática y planta diésel de emergencia', startDate: todayStr, endDate: inThreeMonthsStr, status: 'pendiente', progress: 0, equipmentTag: 'PLANT-01' }
        ],
        completionPercentage: 15,
        createdByName: currentUser?.displayName || 'Administrador',
        createdById: currentUser?.id
      };
    } else if (templateKey === 'parada_calderas') {
      tpl = {
        title: 'Parada Técnica Mayor: Deshollinado, Válvulas y Seguridad Calderas',
        description: 'Mantenimiento de alta exigencia técnica para limpieza interior de hogar, pruebas hidrostáticas, calibración de válvulas de alivio y control de combustión.',
        category: 'parada_tecnica',
        area: 'Cuarto de Calderas & Vapor',
        startDate: todayStr,
        endDate: inThreeMonthsStr,
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        status: 'planificado',
        priority: 'critica',
        leaderName: currentUser?.displayName || 'Juan Mateo Ramos',
        budgetEstimated: 4500000,
        budgetActual: 0,
        currency: 'COP',
        milestones: [
          { id: `ms-${Date.now()}-1`, title: 'Enfriamiento seguro y drenaje completo de calderas', startDate: todayStr, endDate: todayStr, status: 'pendiente', progress: 0 },
          { id: `ms-${Date.now()}-2`, title: 'Desarme de cabezales y cepillado mecánico de tubos pirotubulares', startDate: todayStr, endDate: inThreeMonthsStr, status: 'pendiente', progress: 0 },
          { id: `ms-${Date.now()}-3`, title: 'Calibración certificada de presostatos y válvula de seguridad', startDate: todayStr, endDate: inThreeMonthsStr, status: 'pendiente', progress: 0 },
          { id: `ms-${Date.now()}-4`, title: 'Encendido de prueba, análisis de gases y ajuste de quemador', startDate: todayStr, endDate: inThreeMonthsStr, status: 'pendiente', progress: 0 }
        ],
        completionPercentage: 0,
        createdByName: currentUser?.displayName || 'Administrador',
        createdById: currentUser?.id
      };
    } else if (templateKey === 'piscinas_humedas') {
      tpl = {
        title: 'Cronograma de Reparación & Puesta a Punto de Zonas Húmedas',
        description: 'Lavado químico de filtros de arena, cambio de medio filtrante, balance químico, revisión de cloradores automáticos y motobombas de jacuzzi.',
        category: 'limpieza_desinfeccion',
        area: 'Piscina Principal, Jacuzzi & Sauna',
        startDate: todayStr,
        endDate: inThreeMonthsStr,
        year: today.getFullYear(),
        month: today.getMonth() + 1,
        status: 'en_ejecucion',
        priority: 'alta',
        leaderName: 'Ferney Machado',
        budgetEstimated: 3200000,
        budgetActual: 1100000,
        currency: 'COP',
        milestones: [
          { id: `ms-${Date.now()}-1`, title: 'Retrolavado profundo y cambio de arena sílice en filtros', startDate: todayStr, endDate: todayStr, status: 'completado', progress: 100 },
          { id: `ms-${Date.now()}-2`, title: 'Revisión y engrase de rodamientos motobombas piscina', startDate: todayStr, endDate: inThreeMonthsStr, status: 'en_progreso', progress: 60 },
          { id: `ms-${Date.now()}-3`, title: 'Calibración de dosificadores de cloro y pH automatizados', startDate: todayStr, endDate: inThreeMonthsStr, status: 'pendiente', progress: 0 }
        ],
        completionPercentage: 55,
        createdByName: currentUser?.displayName || 'Administrador',
        createdById: currentUser?.id
      };
    }

    if (tpl) {
      await addCronograma(tpl);
      setIsTemplatesModalOpen(false);
      notify('¡Plantilla maestra agregada al cronograma!');
    }
  };

  // Actualizar progreso de un hito en detalle
  const handleUpdateMilestoneProgress = async (cronogramaId: string, milestoneId: string, newProgress: number) => {
    const targetCron = cronogramas.find(c => c.id === cronogramaId);
    if (!targetCron) return;

    const updatedMilestones = (targetCron.milestones || []).map(m => {
      if (m.id === milestoneId) {
        const status = newProgress === 100 ? 'completado' : newProgress > 0 ? 'en_progreso' : 'pendiente';
        return { ...m, progress: newProgress, status: status as any };
      }
      return m;
    });

    const sum = updatedMilestones.reduce((acc, m) => acc + (m.progress || 0), 0);
    const completionPercentage = Math.round(sum / updatedMilestones.length);

    await updateCronograma(cronogramaId, {
      milestones: updatedMilestones,
      completionPercentage,
      status: completionPercentage === 100 ? 'completado' : targetCron.status === 'planificado' && completionPercentage > 0 ? 'en_ejecucion' : targetCron.status
    });

    // Actualizar vista modal si está abierta
    if (selectedCronogramaForDetail && selectedCronogramaForDetail.id === cronogramaId) {
      setSelectedCronogramaForDetail(prev => prev ? {
        ...prev,
        milestones: updatedMilestones,
        completionPercentage
      } : null);
    }
  };

  // Renderizado del calendario mensual
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: { dateStr: string; dayNumber: number; isCurrentMonth: boolean; cronogramasCount: number; items: Cronograma[] }[] = [];

    // Rellenar días del mes
    for (let d = 1; d <= daysInMonth; d++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const fullDateStr = `${year}-${monthStr}-${dayStr}`;

      const activeOnDay = cronogramas.filter(c => {
        return c.startDate <= fullDateStr && c.endDate >= fullDateStr;
      });

      days.push({
        dateStr: fullDateStr,
        dayNumber: d,
        isCurrentMonth: true,
        cronogramasCount: activeOnDay.length,
        items: activeOnDay
      });
    }

    return { days, firstDayIndex, monthName: calendarDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' }) };
  }, [calendarDate, cronogramas]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Encabezado Superior */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-slate-700/60">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold uppercase tracking-wider">
              <CalendarRange className="w-3.5 h-3.5 text-indigo-400" />
              <span>Gestión Maestra de Operaciones</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-tight">
              Módulo de Cronogramas
            </h1>
            <p className="text-slate-300 text-sm sm:text-base max-w-2xl leading-relaxed">
              Planificación estratégica de paradas técnicas, proyectos de mantenimiento, preventivos mayores y seguimiento temporal en tiempo real.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsTemplatesModalOpen(true)}
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-2xl text-xs sm:text-sm font-semibold flex items-center space-x-2 shadow-sm transition-all hover:scale-105 active:scale-95"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Plantillas Rápidas</span>
            </button>

            <button
              onClick={handleOpenCreateModal}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs sm:text-sm font-bold flex items-center space-x-2 shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Crear Cronograma</span>
            </button>
          </div>
        </div>

        {/* Barra de Métricas y KPIs */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/40 backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Cronogramas Activos</p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{stats.total}</span>
              <span className="text-xs text-indigo-400 font-semibold">{stats.enEjecucion} en curso</span>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/40 backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Avance Global</p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-emerald-400">{stats.globalProgress}%</span>
              <span className="text-xs text-slate-400">{stats.completados} terminados</span>
            </div>
            <div className="w-full bg-slate-700/60 h-1.5 rounded-full mt-2 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${stats.globalProgress}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/40 backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Hitos / Actividades</p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-black text-white">{stats.completedMilestones}/{stats.totalMilestones}</span>
              <span className="text-xs text-amber-400 font-semibold">
                {stats.totalMilestones > 0 ? Math.round((stats.completedMilestones / stats.totalMilestones) * 100) : 0}% listos
              </span>
            </div>
          </div>

          <div className="bg-slate-800/60 rounded-2xl p-3.5 border border-slate-700/40 backdrop-blur-sm">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Presupuesto Estimado</p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-lg sm:text-xl font-black text-white">
                ${(stats.totalBudgetPlan / 1000000).toFixed(1)}M
              </span>
              <span className="text-xs text-slate-400">COP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Filtros, Vistas y Búsqueda */}
      <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Selector de Modos de Vista */}
        <div className="flex items-center p-1 bg-slate-100 rounded-2xl self-start">
          <button
            onClick={() => setActiveViewMode('lista')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeViewMode === 'lista'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Lista</span>
          </button>

          <button
            onClick={() => setActiveViewMode('kanban')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeViewMode === 'kanban'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Kanban className="w-3.5 h-3.5" />
            <span>Tablero</span>
          </button>

          <button
            onClick={() => setActiveViewMode('gantt')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeViewMode === 'gantt'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Cronología Gantt</span>
          </button>

          <button
            onClick={() => setActiveViewMode('calendario')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center space-x-1.5 transition-all ${
              activeViewMode === 'calendario'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Calendario</span>
          </button>
        </div>

        {/* Buscador & Filtros Dropdown */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 md:justify-end">
          <div className="relative min-w-[200px] flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por título, área o líder..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
          </div>

          <select
            value={selectedStatusFilter}
            onChange={e => setSelectedStatusFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todos los Estados</option>
            <option value="planificado">Planificado</option>
            <option value="en_ejecucion">En Ejecución</option>
            <option value="pausado">Pausado</option>
            <option value="completado">Completado</option>
          </select>

          <select
            value={selectedCategoryFilter}
            onChange={e => setSelectedCategoryFilter(e.target.value as any)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Todas las Categorías</option>
            <option value="mantenimiento_preventivo">Preventivo Mayor</option>
            <option value="correctivo_mayor">Correctivo Mayor</option>
            <option value="parada_tecnica">Parada Técnica</option>
            <option value="infraestructura_mejoras">Infraestructura</option>
            <option value="limpieza_desinfeccion">Limpieza Profunda</option>
            <option value="auditoria_certificacion">Auditoría</option>
          </select>
        </div>
      </div>

      {/* Contenido Según Vista Activa */}

      {/* 1. VISTA LISTA */}
      {activeViewMode === 'lista' && (
        <div className="space-y-4">
          {filteredCronogramas.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-sm space-y-4">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                <CalendarRange className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">No hay cronogramas que coincidan</h3>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                No se encontraron registros con los filtros actuales. Crea tu primer cronograma o usa una de las plantillas preconfiguradas.
              </p>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setIsTemplatesModalOpen(true)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
                >
                  Cargar Plantilla
                </button>
                <button
                  onClick={handleOpenCreateModal}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all"
                >
                  Crear Nuevo
                </button>
              </div>
            </div>
          ) : (
            filteredCronogramas.map(c => {
              const cat = CATEGORY_MAP[c.category] || CATEGORY_MAP.otro;
              const st = STATUS_MAP[c.status] || STATUS_MAP.planificado;
              const pr = PRIORITY_MAP[c.priority] || PRIORITY_MAP.media;
              const milestones = c.milestones || [];
              const completedCount = milestones.filter(m => m.status === 'completado').length;

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm hover:shadow-md transition-all duration-200 space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3.5">
                      <div className={`p-3 rounded-2xl ${cat.color} shrink-0 shadow-sm`}>
                        <cat.icon className="w-6 h-6" />
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-base sm:text-lg font-black text-slate-900 hover:text-indigo-600 transition-colors cursor-pointer"
                              onClick={() => setSelectedCronogramaForDetail(c)}>
                            {c.title}
                          </h2>
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${st.badge}`}>
                            {st.label}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium flex items-center space-x-1 ${pr.color}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${pr.dot}`} />
                            <span>{pr.label}</span>
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 self-end sm:self-center">
                      <button
                        onClick={() => setSelectedCronogramaForDetail(c)}
                        className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition-colors"
                      >
                        Ver Detalle & Hitos
                      </button>

                      <button
                        onClick={() => handleOpenEditModal(c)}
                        title="Editar cronograma"
                        className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDuplicate(c)}
                        title="Duplicar cronograma"
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => setCronogramaToDelete(c)}
                        title="Eliminar cronograma"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Barra de progreso e Información secundaria */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100 text-xs">
                    <div>
                      <p className="text-slate-400 font-medium">Periodo Programado</p>
                      <p className="font-semibold text-slate-800 mt-0.5 flex items-center space-x-1">
                        <CalendarIcon className="w-3.5 h-3.5 text-indigo-500 inline" />
                        <span>{c.startDate} al {c.endDate}</span>
                      </p>
                    </div>

                    <div>
                      <p className="text-slate-400 font-medium">Área & Responsable</p>
                      <p className="font-semibold text-slate-800 mt-0.5 truncate">
                        {c.area} • <span className="text-slate-600">{c.leaderName}</span>
                      </p>
                    </div>

                    <div>
                      <div className="flex items-center justify-between font-semibold">
                        <span className="text-slate-600">Progreso ({completedCount}/{milestones.length} hitos)</span>
                        <span className="text-indigo-600">{c.completionPercentage || 0}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${c.completionPercentage || 0}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* 2. VISTA TABLERO KANBAN */}
      {activeViewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
          {(['planificado', 'en_ejecucion', 'pausado', 'completado'] as CronogramaStatus[]).map(statusKey => {
            const columnItems = filteredCronogramas.filter(c => c.status === statusKey);
            const st = STATUS_MAP[statusKey];

            return (
              <div 
                key={statusKey} 
                className="bg-slate-50/80 rounded-3xl p-4 border border-slate-200/80 flex flex-col space-y-3 min-h-[420px]"
              >
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${st.badge.split(' ')[0]}`} />
                    <h3 className="font-bold text-slate-800 text-sm">{st.label}</h3>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full text-xs font-bold">
                    {columnItems.length}
                  </span>
                </div>

                <div className="space-y-3 flex-1">
                  {columnItems.length === 0 ? (
                    <div className="h-36 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400 text-xs font-medium">
                      Sin cronogramas
                    </div>
                  ) : (
                    columnItems.map(c => {
                      const cat = CATEGORY_MAP[c.category] || CATEGORY_MAP.otro;
                      return (
                        <div
                          key={c.id}
                          onClick={() => setSelectedCronogramaForDetail(c)}
                          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md cursor-pointer transition-all space-y-2.5"
                        >
                          <div className="flex items-center justify-between">
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${cat.color}`}>
                              {cat.label}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">{c.startDate}</span>
                          </div>

                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-2">
                            {c.title}
                          </h4>

                          <p className="text-[11px] text-slate-500 truncate">
                            {c.area}
                          </p>

                          <div>
                            <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                              <span>Avance</span>
                              <span>{c.completionPercentage || 0}%</span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-indigo-600 h-full rounded-full"
                                style={{ width: `${c.completionPercentage || 0}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. VISTA GANTT / CRONOLOGÍA */}
      {activeViewMode === 'gantt' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Línea de Tiempo & Diagrama de Gantt</h3>
              <p className="text-xs text-slate-500">Visualización de avance temporal y distribución de cronogramas.</p>
            </div>
            <div className="flex items-center space-x-2 text-xs">
              <span className="inline-block w-3 h-3 bg-indigo-600 rounded-sm" />
              <span className="text-slate-600 font-medium">Progreso alcanzado</span>
              <span className="inline-block w-3 h-3 bg-indigo-200 rounded-sm ml-2" />
              <span className="text-slate-600 font-medium">Programado</span>
            </div>
          </div>

          <div className="space-y-4">
            {filteredCronogramas.map(c => {
              return (
                <div key={c.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{c.title}</h4>
                      <p className="text-xs text-slate-500">{c.area} • {c.startDate} al {c.endDate}</p>
                    </div>
                    <span className="text-xs font-black text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-xl">
                      {c.completionPercentage || 0}% Completado
                    </span>
                  </div>

                  {/* Barra Gantt */}
                  <div className="w-full bg-slate-200 h-6 rounded-xl relative overflow-hidden flex items-center">
                    <div
                      className="bg-indigo-600 h-full rounded-l-xl transition-all duration-500 flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(5, c.completionPercentage || 0)}%` }}
                    >
                      <span className="text-[10px] text-white font-bold">{c.completionPercentage || 0}%</span>
                    </div>
                  </div>

                  {/* Sub-hitos de este cronograma */}
                  {(c.milestones || []).length > 0 && (
                    <div className="pl-4 border-l-2 border-indigo-200 space-y-1.5 mt-2">
                      {c.milestones.map(m => (
                        <div key={m.id} className="flex items-center justify-between text-xs py-1">
                          <span className="text-slate-700 font-medium flex items-center space-x-2">
                            <span className={`w-2 h-2 rounded-full ${m.status === 'completado' ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            <span>{m.title}</span>
                          </span>
                          <span className="text-slate-500 font-bold">{m.progress}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. VISTA CALENDARIO MENSUAL */}
      {activeViewMode === 'calendario' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h3 className="text-base font-bold text-slate-900 capitalize">
                {calendarDays.monthName}
              </h3>
              <button
                onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                className="p-2 hover:bg-slate-100 rounded-xl text-slate-600 transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => setCalendarDate(new Date())}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
            >
              Hoy
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(dayHeader => (
              <div key={dayHeader} className="text-center font-bold text-xs text-slate-400 py-1 uppercase">
                {dayHeader}
              </div>
            ))}

            {/* Espacios vacíos antes del primer día */}
            {Array.from({ length: calendarDays.firstDayIndex }).map((_, idx) => (
              <div key={`empty-${idx}`} className="h-24 bg-slate-50/50 rounded-2xl border border-transparent" />
            ))}

            {/* Días del mes */}
            {calendarDays.days.map(d => {
              const isToday = d.dateStr === new Date().toISOString().split('T')[0];
              return (
                <div
                  key={d.dateStr}
                  className={`h-28 p-2 rounded-2xl border transition-all flex flex-col justify-between overflow-hidden ${
                    isToday 
                      ? 'bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-500/20' 
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold ${isToday ? 'text-indigo-700' : 'text-slate-800'}`}>
                      {d.dayNumber}
                    </span>
                    {d.cronogramasCount > 0 && (
                      <span className="w-5 h-5 bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                        {d.cronogramasCount}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1 overflow-y-auto max-h-16 pr-0.5">
                    {d.items.slice(0, 2).map(item => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedCronogramaForDetail(item)}
                        className="text-[10px] font-semibold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded truncate cursor-pointer hover:bg-indigo-200"
                        title={item.title}
                      >
                        {item.title}
                      </div>
                    ))}
                    {d.items.length > 2 && (
                      <span className="text-[9px] text-slate-400 font-bold block">
                        +{d.items.length - 2} más
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: Crear / Editar Cronograma */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-scaleUp my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-2xl">
                  <CalendarRange className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    {editingCronograma ? 'Editar Cronograma' : 'Crear Nuevo Cronograma'}
                  </h3>
                  <p className="text-xs text-slate-500">Completa la planificación y las actividades clave.</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCronograma} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Título del Cronograma *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Plan Maestro de Calderas y Agua Caliente Sanitaria"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Categoría
                  </label>
                  <select
                    value={formCategory}
                    onChange={e => setFormCategory(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="mantenimiento_preventivo">Mantenimiento Preventivo Mayor</option>
                    <option value="correctivo_mayor">Correctivo Mayor</option>
                    <option value="parada_tecnica">Parada Técnica</option>
                    <option value="auditoria_certificacion">Auditoría / Certificación</option>
                    <option value="infraestructura_mejoras">Infraestructura & Obra</option>
                    <option value="limpieza_desinfeccion">Limpieza Profunda & Desinfección</option>
                    <option value="seguridad_brigada">Seguridad & Brigada</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Área o Ubicación
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Cuarto de Máquinas / Piscinas"
                    value={formArea}
                    onChange={e => setFormArea(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Fecha de Inicio *
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={e => setFormStartDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Fecha de Finalización *
                  </label>
                  <input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={e => setFormEndDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Estado
                  </label>
                  <select
                    value={formStatus}
                    onChange={e => setFormStatus(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="planificado">Planificado</option>
                    <option value="en_ejecucion">En Ejecución</option>
                    <option value="pausado">Pausado</option>
                    <option value="completado">Completado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Prioridad
                  </label>
                  <select
                    value={formPriority}
                    onChange={e => setFormPriority(e.target.value as any)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Presupuesto ($)
                  </label>
                  <input
                    type="number"
                    placeholder="Ej: 5000000"
                    value={formBudgetEstimated}
                    onChange={e => setFormBudgetEstimated(e.target.value ? Number(e.target.value) : '')}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Descripción y Objetivos
                </label>
                <textarea
                  rows={2}
                  placeholder="Detalles técnicos, alcance y especificaciones del cronograma..."
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Sección de Hitos / Actividades */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Hitos / Fases de Ejecución ({formMilestones.length})
                  </h4>
                </div>

                {/* Lista de hitos ya agregados */}
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {formMilestones.map((m, idx) => (
                    <div key={idx} className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <p className="font-bold text-slate-800">{m.title}</p>
                        <p className="text-[10px] text-slate-500">{m.assignedToName} • {m.startDate} al {m.endDate}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveMilestoneFromForm(idx)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Sub-formulario para agregar un hito */}
                <div className="bg-indigo-50/50 p-3 rounded-2xl border border-indigo-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Nombre del hito o tarea..."
                      value={newMilestoneTitle}
                      onChange={e => setNewMilestoneTitle(e.target.value)}
                      className="flex-1 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddMilestoneToForm}
                      className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500"
                    >
                      + Añadir Hito
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95"
                >
                  {editingCronograma ? 'Guardar Cambios' : 'Crear Cronograma'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Plantillas Maestras */}
      {isTemplatesModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-100 text-amber-700 rounded-2xl">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Plantillas Maestras Hoteleras</h3>
                  <p className="text-xs text-slate-500">Crea planes con 1 clic con hitos técnicos precargados.</p>
                </div>
              </div>
              <button
                onClick={() => setIsTemplatesModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div
                onClick={() => handleLoadTemplate('preventivo_anual')}
                className="p-4 bg-slate-50 hover:bg-indigo-50/70 border border-slate-200 hover:border-indigo-300 rounded-2xl cursor-pointer transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">Plan Maestro Anual de Mantenimiento</h4>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-[10px] font-bold">Preventivo</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Supervisión y servicio de cuartos de máquinas, bombas, calderas, chillers y planta de emergencia con 4 fases clave.
                </p>
              </div>

              <div
                onClick={() => handleLoadTemplate('parada_calderas')}
                className="p-4 bg-slate-50 hover:bg-rose-50/70 border border-slate-200 hover:border-rose-300 rounded-2xl cursor-pointer transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">Parada Técnica Mayor de Calderas</h4>
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold">Parada Técnica</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Deshollinado de tubos, prueba hidrostática y calibración de válvulas de seguridad con normas de calderería.
                </p>
              </div>

              <div
                onClick={() => handleLoadTemplate('piscinas_humedas')}
                className="p-4 bg-slate-50 hover:bg-emerald-50/70 border border-slate-200 hover:border-emerald-300 rounded-2xl cursor-pointer transition-all space-y-1"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-slate-900 text-sm">Mantenimiento de Zonas Húmedas & Piscinas</h4>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">Limpieza / Filtros</span>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Cambio de arena sílice, desinfección, empaques mecánicos y dosificadores automáticos.
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsTemplatesModalOpen(false)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl text-xs font-bold transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Detalle de Cronograma & Gestión de Hitos */}
      {selectedCronogramaForDetail && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6 animate-scaleUp my-8">
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${STATUS_MAP[selectedCronogramaForDetail.status]?.badge || 'bg-slate-100'}`}>
                    {STATUS_MAP[selectedCronogramaForDetail.status]?.label}
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {selectedCronogramaForDetail.startDate} al {selectedCronogramaForDetail.endDate}
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 mt-1">
                  {selectedCronogramaForDetail.title}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Área: <strong className="text-slate-700">{selectedCronogramaForDetail.area}</strong> • Líder: <strong className="text-slate-700">{selectedCronogramaForDetail.leaderName}</strong>
                </p>
              </div>
              <button
                onClick={() => setSelectedCronogramaForDetail(null)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
                {selectedCronogramaForDetail.description || 'Sin descripción detallada registrada.'}
              </p>

              <div>
                <div className="flex justify-between items-center text-xs font-bold text-slate-700 mb-1.5">
                  <span>Cumplimiento Ponderado</span>
                  <span className="text-indigo-600 text-sm">{selectedCronogramaForDetail.completionPercentage || 0}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${selectedCronogramaForDetail.completionPercentage || 0}%` }}
                  />
                </div>
              </div>

              {/* Lista interactiva de Hitos */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Hitos y Tareas del Cronograma (Ajusta el avance en vivo)
                </h4>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {(selectedCronogramaForDetail.milestones || []).map(m => (
                    <div
                      key={m.id}
                      className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900">{m.title}</span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          m.status === 'completado' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {m.status === 'completado' ? 'Completado' : `${m.progress}%`}
                        </span>
                      </div>

                      <div className="flex items-center space-x-3 text-xs">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          step="10"
                          value={m.progress || 0}
                          onChange={e => handleUpdateMilestoneProgress(selectedCronogramaForDetail.id, m.id, Number(e.target.value))}
                          className="flex-1 accent-indigo-600 cursor-pointer"
                        />
                        <button
                          onClick={() => handleUpdateMilestoneProgress(selectedCronogramaForDetail.id, m.id, m.progress === 100 ? 0 : 100)}
                          className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all ${
                            m.progress === 100
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {m.progress === 100 ? '✓ Listo' : 'Marcar 100%'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedCronogramaForDetail(null)}
                className="px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Confirmar Eliminación */}
      {cronogramaToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">¿Eliminar este cronograma?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Se eliminará "{cronogramaToDelete.title}" junto con todos sus hitos. Esta acción se sincronizará en todos los dispositivos.
              </p>
            </div>
            <div className="flex items-center justify-end space-x-2.5 pt-2">
              <button
                onClick={() => setCronogramaToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={async () => {
                  await deleteCronograma(cronogramaToDelete.id);
                  setCronogramaToDelete(null);
                  notify('Cronograma eliminado');
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-md shadow-rose-600/20 transition-all"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
