import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { 
  MaintenanceTask, 
  TaskPriority, 
  TaskStatus, 
  TaskCategory, 
  TaskChecklistItem,
  User as UserType 
} from '../../types';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  User, 
  MapPin, 
  Calendar, 
  X, 
  Edit2, 
  AlertTriangle,
  Wrench,
  ChevronDown,
  Users,
  MessageSquare,
  Sparkles,
  Camera,
  Image as ImageIcon,
  Send,
  Check,
  Filter,
  Play,
  RotateCcw,
  Zap,
  Droplet,
  Flame,
  ShieldAlert,
  ListTodo,
  Paperclip,
  Maximize2,
  Bell,
  BellRing
} from 'lucide-react';
import { 
  getLocalDateString, 
  getLocalTimeString, 
  getLocalDateTimeString, 
  formatRequestDateTime, 
  format12HourTime 
} from '../../utils/dateUtils';
import { FuturisticDateTimePickerModal } from '../common/FuturisticDateTimePickerModal';

const CATEGORY_CONFIG: Record<TaskCategory, { label: string; icon: any; color: string; bg: string }> = {
  mantenimiento: { label: 'Mantenimiento', icon: Wrench, color: 'text-blue-700', bg: 'bg-blue-50 border-blue-200' },
  reparacion: { label: 'Reparación', icon: Wrench, color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  revision: { label: 'Revisión / Chequeo', icon: CheckSquare, color: 'text-teal-700', bg: 'bg-teal-50 border-teal-200' },
  limpieza_tecnica: { label: 'Limpieza Técnica', icon: Sparkles, color: 'text-cyan-700', bg: 'bg-cyan-50 border-cyan-200' },
  inspeccion: { label: 'Inspección', icon: Search, color: 'text-indigo-700', bg: 'bg-indigo-50 border-indigo-200' },
  electrico: { label: 'Eléctrico', icon: Zap, color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200' },
  plomeria: { label: 'Plomería / Hidráulico', icon: Droplet, color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
  climatizacion: { label: 'Climatización (HVAC)', icon: Flame, color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200' },
  cerrajeria: { label: 'Cerrajería', icon: ShieldAlert, color: 'text-slate-700', bg: 'bg-slate-100 border-slate-300' },
  pintura: { label: 'Pintura y Acabados', icon: Sparkles, color: 'text-pink-700', bg: 'bg-pink-50 border-pink-200' },
  compra_repuesto: { label: 'Compra de Repuesto', icon: ListTodo, color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  otro: { label: 'General / Otro', icon: Wrench, color: 'text-slate-700', bg: 'bg-slate-50 border-slate-200' }
};

const PRIORITY_CONFIG: Record<TaskPriority, { label: string; bg: string; text: string; border: string; iconColor: string }> = {
  urgente: { label: 'Urgente', bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300', iconColor: 'text-rose-600' },
  alta: { label: 'Alta', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', iconColor: 'text-orange-600' },
  media: { label: 'Media', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-300', iconColor: 'text-blue-600' },
  baja: { label: 'Baja', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', iconColor: 'text-emerald-600' }
};

const STATUS_CONFIG: Record<TaskStatus, { label: string; bg: string; text: string; border: string; dotColor: string }> = {
  pendiente: { label: 'Pendiente', bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-300', dotColor: 'bg-amber-500' },
  en_progreso: { label: 'En Progreso', bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-300', dotColor: 'bg-blue-500 animate-pulse' },
  completada: { label: 'Completada', bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-300', dotColor: 'bg-emerald-500' },
  cancelada: { label: 'Cancelada', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', dotColor: 'bg-slate-400' }
};

const QUICK_SUGGESTIONS_TITLES = [
  'Revisión y cambio de empaque en llave de paso',
  'Limpieza y purga de filtros de agua',
  'Chequeo de presión en bombas hidroneumáticas',
  'Revisión de fuga en sanitario / grifería',
  'Cambio de bombillos / luminarias LED',
  'Mantenimiento preventivo de aire acondicionado',
  'Revisión de cerradura electrónica y manija',
  'Pintura y resane de pared afectada por humedad',
  'Revisión de tomacorriente / interruptor sin energía',
  'Inspección de tablero eléctrico secundario',
  'Cotización y compra de repuesto urgente',
  'Limpieza técnica de trampas de grasa'
];

const QUICK_AREAS = [
  'Cuarto de Bombas (Sótano 1)',
  'Sala de Calderas',
  'Piscina & Zona Húmeda',
  'Cocina Principal',
  'Restaurante',
  'Lavandería & Lencería',
  'Piso 1 - Lobby & Recepción',
  'Piso 2 - Habitaciones',
  'Piso 3 - Habitaciones',
  'Piso 4 - Habitaciones',
  'Piso 5 - Habitaciones',
  'Terraza & Techo Técnico',
  'Parqueadero & Exteriores'
];

interface BeautifulSelectOption {
  value: string;
  label: string;
  subtitle?: string;
  icon?: React.ReactNode;
  colorDot?: string;
  badge?: string;
}

interface BeautifulSelectProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: BeautifulSelectOption[];
  leadingIcon?: React.ReactNode;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const BeautifulSelect: React.FC<BeautifulSelectProps> = ({
  label,
  value,
  onChange,
  options = [],
  leadingIcon,
  placeholder = 'Seleccionar...',
  disabled = false,
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const safeOptions = Array.isArray(options) ? options : [];
  const selectedOption = safeOptions.find(o => o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : (value || placeholder);

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      {label && (
        <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1 truncate">
          {label}
        </label>
      )}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full px-3 py-2 bg-slate-50 hover:bg-white border rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between transition-all duration-150 shadow-2xs text-left cursor-pointer ${
          isOpen ? 'ring-2 ring-emerald-500 border-emerald-500 bg-white shadow-sm' : 'border-slate-200 hover:border-slate-300'
        } ${disabled ? 'opacity-60 cursor-not-allowed bg-slate-100' : ''}`}
      >
        <div className="flex items-center gap-2 truncate pr-1">
          {leadingIcon && <span className="shrink-0">{leadingIcon}</span>}
          {selectedOption?.colorDot && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${selectedOption.colorDot}`} />
          )}
          {selectedOption?.icon && (
            <span className="shrink-0">{selectedOption.icon}</span>
          )}
          <span className="truncate">{displayLabel}</span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1.5 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50 max-h-64 overflow-y-auto p-1.5 space-y-0.5 animate-in fade-in zoom-in-95 duration-150">
          {safeOptions.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-2.5 rounded-xl text-left text-xs font-medium flex items-center justify-between transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-50 font-bold text-emerald-900 border border-emerald-200/80'
                    : 'text-slate-700 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate mr-2">
                  {opt.colorDot && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${opt.colorDot}`} />
                  )}
                  {opt.icon && (
                    <span className="shrink-0">{opt.icon}</span>
                  )}
                  <div className="truncate">
                    <span className="truncate block font-semibold">{opt.label}</span>
                    {opt.subtitle && (
                      <span className="text-[10px] text-slate-400 block font-normal truncate mt-0.5">{opt.subtitle}</span>
                    )}
                  </div>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0 ml-1.5" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export const TasksView: React.FC = () => {
  const { 
    tasks, 
    addTask, 
    updateTask, 
    deleteTask, 
    toggleTaskChecklistItem, 
    addTaskComment, 
    currentUser, 
    users, 
    equipments, 
    settings,
    notify
  } = useMaintenance();

  // Configured technicians from system settings (Source of truth)
  const configuredCompanions = useMemo(() => {
    return (settings?.technicians && settings.technicians.length > 0)
      ? settings.technicians
      : ['Mateo Ramos (Mecánico & Bombas)', 'Carlos Gómez (Técnico Nocturno)', 'Luis Peña (Fontanería & Piscinas)', 'Andrés Salazar (Electricista)', 'Roberto Méndez (Climatización & Chillers)'];
  }, [settings?.technicians]);

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [assignmentFilter, setAssignmentFilter] = useState<'all' | 'my_tasks' | 'created_by_me' | string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<MaintenanceTask | null>(null);

  // Complete task modal
  const [completingTask, setCompletingTask] = useState<MaintenanceTask | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completionPhotos, setCompletionPhotos] = useState<string[]>([]);

  // Task detail, progress tracking & comments modal
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [progressText, setProgressText] = useState('');
  const [progressPhotos, setProgressPhotos] = useState<string[]>([]);
  const progressFileInputRef = useRef<HTMLInputElement>(null);

  // Derived live activeTask to guarantee 100% real-time freshness
  const activeTask = useMemo(() => {
    if (!activeTaskId) return null;
    return (tasks || []).find(t => t.id === activeTaskId) || null;
  }, [activeTaskId, tasks]);

  // Image zoom modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  // Form states
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAssignedToId, setFormAssignedToId] = useState('');
  const [formAssignedToName, setFormAssignedToName] = useState('Todo el equipo');
  const [formAssignedToDept, setFormAssignedToDept] = useState('');
  const [formPriority, setFormPriority] = useState<TaskPriority>('media');
  const [formCategory, setFormCategory] = useState<TaskCategory>('mantenimiento');
  const [formArea, setFormArea] = useState('');
  const [formEquipmentId, setFormEquipmentId] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formDueTime, setFormDueTime] = useState('');
  const [isDateTimePickerOpen, setIsDateTimePickerOpen] = useState(false);
  const [dateTimePickerInitialTab, setDateTimePickerInitialTab] = useState<'date' | 'time'>('date');

  const formatDisplayDate = (isoDate: string) => {
    if (!isoDate || !isoDate.includes('-')) return null;
    const [y, m, d] = isoDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return `${dayNames[dateObj.getDay()]}, ${d} ${months[m - 1]} ${y}`;
  };

  const formatDisplayTime = (timeStr: string) => {
    if (!timeStr || !timeStr.includes(':')) return null;
    const [h24, min] = timeStr.split(':').map(Number);
    const h12 = h24 % 12 || 12;
    const ampm = h24 >= 12 ? 'PM' : 'AM';
    return `${String(h12).padStart(2, '0')}:${String(min).padStart(2, '0')} ${ampm}`;
  };
  const [formEstimatedMinutes, setFormEstimatedMinutes] = useState<string>('30');
  const [formChecklist, setFormChecklist] = useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newChecklistInput, setNewChecklistInput] = useState('');
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [formError, setFormError] = useState('');

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const completionFileInputRef = useRef<HTMLInputElement>(null);

  // Helpers for photo processing (compressing to standard thumbnail base64 for fast sync)
  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 1000;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height *= maxDim / width;
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width *= maxDim / height;
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.75));
          } else {
            resolve(e.target?.result as string);
          }
        };
        img.onerror = () => reject(new Error('Error procesando imagen'));
        img.src = e.target?.result as string;
      };
      reader.onerror = (e) => reject(e);
      reader.readAsDataURL(file);
    });
  };

  const handleAddPhotos = async (e: React.ChangeEvent<HTMLInputElement>, isCompletion = false) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const fileList: File[] = Array.from(files);
      const promises = fileList.map(file => processImageFile(file));
      const base64List = await Promise.all(promises);
      if (isCompletion) {
        setCompletionPhotos(prev => [...prev, ...base64List]);
      } else {
        setFormPhotos(prev => [...prev, ...base64List]);
      }
    } catch (err) {
      notify('Error al procesar la imagen seleccionada');
    }
  };

  const openCreateModal = () => {
    setEditingTask(null);
    setFormTitle('');
    setFormDescription('');
    setFormAssignedToId('');
    setFormAssignedToName('Todo el equipo');
    setFormAssignedToDept('');
    setFormPriority('media');
    setFormCategory('mantenimiento');
    setFormArea('');
    setFormEquipmentId('');
    setFormDueDate(getLocalDateString());
    setFormDueTime('');
    setFormEstimatedMinutes('30');
    setFormChecklist([]);
    setNewChecklistInput('');
    setFormPhotos([]);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (task: MaintenanceTask) => {
    setEditingTask(task);
    setFormTitle(task.title);
    setFormDescription(task.description || '');
    setFormAssignedToId(task.assignedToId || '');
    setFormAssignedToName(task.assignedToName || 'Todo el equipo');
    setFormAssignedToDept(task.assignedToDepartment || '');
    setFormPriority(task.priority);
    setFormCategory(task.category);
    setFormArea(task.area || '');
    setFormEquipmentId(task.equipmentId || '');
    setFormDueDate(task.dueDate || '');
    setFormDueTime(task.dueTime || '');
    setFormEstimatedMinutes(task.estimatedMinutes ? String(task.estimatedMinutes) : '30');
    setFormChecklist(task.checklist ? task.checklist.map(c => ({ ...c })) : []);
    setNewChecklistInput('');
    setFormPhotos(task.photos ? [...task.photos] : []);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleAddChecklistItem = () => {
    if (!newChecklistInput.trim()) return;
    const newItem: TaskChecklistItem = {
      id: `chk-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      text: newChecklistInput.trim(),
      completed: false
    };
    setFormChecklist(prev => [...prev, newItem]);
    setNewChecklistInput('');
  };

  const handleRemoveChecklistItem = (id: string) => {
    setFormChecklist(prev => prev.filter(item => item.id !== id));
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Por favor ingresa el título de la tarea.');
      return;
    }
    if (!formArea.trim()) {
      setFormError('Por favor especifica el área o ubicación del hotel.');
      return;
    }

    // Lookup equipment details if selected
    let selectedEq = equipments.find(eq => eq.id === formEquipmentId);

    const taskPayload = {
      title: formTitle.trim(),
      description: formDescription.trim(),
      assignedToId: formAssignedToId || undefined,
      assignedToName: formAssignedToName || 'Todo el equipo',
      assignedToDepartment: formAssignedToDept || undefined,
      priority: formPriority,
      category: formCategory,
      area: formArea.trim(),
      equipmentId: selectedEq ? selectedEq.id : undefined,
      equipmentTag: selectedEq ? selectedEq.tag : undefined,
      equipmentName: selectedEq ? selectedEq.name : undefined,
      dueDate: formDueDate || undefined,
      dueTime: formDueTime || undefined,
      estimatedMinutes: formEstimatedMinutes ? parseInt(formEstimatedMinutes, 10) : undefined,
      checklist: formChecklist,
      photos: formPhotos,
      status: (editingTask ? editingTask.status : 'pendiente') as TaskStatus,
      createdById: editingTask ? editingTask.createdById : (currentUser?.id || 'usr-anon'),
      createdByName: editingTask ? editingTask.createdByName : (currentUser?.displayName || currentUser?.email || 'Compañero de Mantenimiento'),
      createdByRole: editingTask ? editingTask.createdByRole : (currentUser?.role || 'técnico'),
      comments: editingTask ? editingTask.comments : [],
      completionNotes: editingTask ? editingTask.completionNotes : undefined,
      completionPhotos: editingTask ? editingTask.completionPhotos : undefined,
      completedAt: editingTask ? editingTask.completedAt : undefined,
      completedBy: editingTask ? editingTask.completedBy : undefined
    };

    if (editingTask) {
      await updateTask(editingTask.id, {
        ...taskPayload,
        updatedAt: new Date().toISOString()
      });
      notify(`Tarea "${formTitle}" actualizada correctamente`);
    } else {
      await addTask(taskPayload);
    }

    setIsModalOpen(false);
  };

  const handleOpenCompleteModal = (task: MaintenanceTask) => {
    setCompletingTask(task);
    setCompletionNotes(task.completionNotes || '');
    setCompletionPhotos(task.completionPhotos ? [...task.completionPhotos] : []);
  };

  const handleConfirmComplete = async () => {
    if (!completingTask) return;
    const nowIso = new Date().toISOString();
    const completedBy = currentUser?.displayName || currentUser?.email || 'Técnico de Turno';
    
    // Auto-mark all checklist items as completed if not done
    const updatedChecklist = (completingTask.checklist || []).map(item => ({
      ...item,
      completed: true,
      completedAt: item.completedAt || nowIso,
      completedBy: item.completedBy || completedBy
    }));

    await updateTask(completingTask.id, {
      status: 'completada',
      completionNotes: completionNotes.trim() || 'Tarea completada satisfactoriamente.',
      completionPhotos: completionPhotos,
      completedAt: nowIso,
      completedBy: completedBy,
      checklist: updatedChecklist,
      updatedAt: nowIso
    });

    notify(`✅ ¡Tarea "${completingTask.title}" completada con éxito!`);
    setCompletingTask(null);
  };

  const handleStartTask = async (task: MaintenanceTask) => {
    await updateTask(task.id, {
      status: 'en_progreso',
      updatedAt: new Date().toISOString()
    });
    notify(`▶️ Tarea iniciada: "${task.title}"`);
  };

  const handleReopenTask = async (task: MaintenanceTask) => {
    await updateTask(task.id, {
      status: 'en_progreso',
      updatedAt: new Date().toISOString()
    });
    notify(`🔄 Tarea reabierta: "${task.title}"`);
  };

  const handleAddProgressPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const fileList: File[] = Array.from(files);
      const promises = fileList.map(file => processImageFile(file));
      const base64List = await Promise.all(promises);
      setProgressPhotos(prev => [...prev, ...base64List]);
    } catch (err) {
      notify('Error al procesar la foto de avance');
    }
    if (e.target) e.target.value = '';
  };

  const handleRemoveProgressPhoto = (index: number) => {
    setProgressPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveProgress = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeTask) return;
    if (!progressText.trim() && progressPhotos.length === 0) return;

    await addTaskComment(activeTask.id, progressText.trim(), progressPhotos);
    setProgressText('');
    setProgressPhotos([]);
    notify('✅ Avance registrado en la bitácora de la tarea');
  };

  const formatCommentTimestamp = (isoOrDateStr?: string) => {
    if (!isoOrDateStr) return '';
    try {
      const d = new Date(isoOrDateStr.includes('T') ? isoOrDateStr : isoOrDateStr.replace(' ', 'T'));
      if (isNaN(d.getTime())) return isoOrDateStr;
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = d.toLocaleDateString([], { day: '2-digit', month: 'short' });
      return `${timeStr} • ${dateStr}`;
    } catch {
      return isoOrDateStr;
    }
  };

  // Filtered tasks computation
  const filteredTasks = useMemo(() => {
    return (tasks || []).filter(task => {
      if (!task) return false;

      // Search term (title, description, area, equipment tag/name, assignedToName, createdByName)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim();
        const matchesTitle = task.title?.toLowerCase().includes(query);
        const matchesDesc = task.description?.toLowerCase().includes(query);
        const matchesArea = task.area?.toLowerCase().includes(query);
        const matchesTag = task.equipmentTag?.toLowerCase().includes(query);
        const matchesEq = task.equipmentName?.toLowerCase().includes(query);
        const matchesAssigned = task.assignedToName?.toLowerCase().includes(query);
        const matchesCreator = task.createdByName?.toLowerCase().includes(query);
        if (!matchesTitle && !matchesDesc && !matchesArea && !matchesTag && !matchesEq && !matchesAssigned && !matchesCreator) {
          return false;
        }
      }

      // Assignment filter
      if (assignmentFilter === 'my_tasks') {
        const isAssignedToMe = 
          !task.assignedToId || 
          task.assignedToId === currentUser?.id || 
          task.assignedToName?.toLowerCase().includes('todos') || 
          task.assignedToName?.toLowerCase().includes('general') ||
          (currentUser?.displayName && task.assignedToName?.toLowerCase().trim() === currentUser.displayName.toLowerCase().trim());
        if (!isAssignedToMe) return false;
      } else if (assignmentFilter === 'created_by_me') {
        if (task.createdById !== currentUser?.id) return false;
      } else if (assignmentFilter !== 'all') {
        if (task.assignedToId !== assignmentFilter && task.assignedToName !== assignmentFilter) return false;
      }

      // Status filter
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false;
      }

      // Priority filter
      if (priorityFilter !== 'all' && task.priority !== priorityFilter) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && task.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [tasks, searchTerm, assignmentFilter, statusFilter, priorityFilter, categoryFilter, currentUser]);

  // Quick stats
  const stats = useMemo(() => {
    const all = tasks || [];
    const pending = all.filter(t => t.status === 'pendiente').length;
    const inProgress = all.filter(t => t.status === 'en_progreso').length;
    const completed = all.filter(t => t.status === 'completada').length;
    const urgent = all.filter(t => t.priority === 'urgente' && t.status !== 'completada').length;
    const myTasksCount = all.filter(t => 
      t.status !== 'completada' && (
        !t.assignedToId || 
        t.assignedToId === currentUser?.id || 
        t.assignedToName?.toLowerCase().includes('todos') || 
        t.assignedToName?.toLowerCase().includes('general') ||
        (currentUser?.displayName && t.assignedToName?.toLowerCase().trim() === currentUser.displayName.toLowerCase().trim())
      )
    ).length;

    return { total: all.length, pending, inProgress, completed, urgent, myTasksCount };
  }, [tasks, currentUser]);

  // Options for BeautifulSelect Dropdowns (Compañeros strictly from configuration, deduplicated against active users)
  const companionFilterOptions: BeautifulSelectOption[] = useMemo(() => {
    const activeUsersList = (users || []).filter(u => u && u.status !== 'inactive');
    const filteredCompanions = configuredCompanions.filter(tech => {
      const cleanTech = tech.replace(/\/(técnico|tecnico|admin|supervisor)/gi, '').toLowerCase().trim();
      return !activeUsersList.some(u => {
        const uName = (u.displayName || u.name || '').toLowerCase().trim();
        const cleanUName = uName.replace(/\/(técnico|tecnico|admin|supervisor)/gi, '').trim();
        return cleanTech === cleanUName || cleanTech.includes(cleanUName) || cleanUName.startsWith(cleanUName) || cleanUName === 'juan mateo' || cleanUName === 'carlos manuel';
      });
    });

    return [
      {
        value: 'all',
        label: 'Todos los compañeros',
        subtitle: 'Ver tareas de todo el equipo',
        icon: <Users className="w-3.5 h-3.5 text-emerald-600" />
      },
      ...filteredCompanions.map((tech) => ({
        value: tech,
        label: tech,
        subtitle: 'Personal registrado en configuración',
        icon: <User className="w-3.5 h-3.5 text-slate-500" />
      }))
    ];
  }, [users, configuredCompanions]);

  const statusFilterOptions: BeautifulSelectOption[] = useMemo(() => [
    { value: 'all', label: 'Todos los estados', colorDot: 'bg-slate-400' },
    { value: 'pendiente', label: 'Pendiente', colorDot: 'bg-amber-500' },
    { value: 'en_progreso', label: 'En Progreso', colorDot: 'bg-blue-500' },
    { value: 'completada', label: 'Completada', colorDot: 'bg-emerald-500' },
    { value: 'cancelada', label: 'Cancelada', colorDot: 'bg-slate-400' }
  ], []);

  const priorityFilterOptions: BeautifulSelectOption[] = useMemo(() => [
    { value: 'all', label: 'Todas las prioridades', colorDot: 'bg-slate-400' },
    { value: 'urgente', label: 'Urgente', colorDot: 'bg-rose-500' },
    { value: 'alta', label: 'Alta', colorDot: 'bg-orange-500' },
    { value: 'media', label: 'Media', colorDot: 'bg-blue-500' },
    { value: 'baja', label: 'Baja', colorDot: 'bg-emerald-500' }
  ], []);

  const categoryFilterOptions: BeautifulSelectOption[] = useMemo(() => [
    { value: 'all', label: 'Todas las categorías', icon: <Filter className="w-3.5 h-3.5 text-slate-400" /> },
    ...Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
      const IconComp = config.icon;
      return {
        value: key,
        label: config.label,
        icon: <IconComp className={`w-3.5 h-3.5 ${config.color}`} />
      };
    })
  ], []);

  const modalCompanionOptions: BeautifulSelectOption[] = useMemo(() => {
    const options: BeautifulSelectOption[] = [
      {
        value: '',
        label: '👥 Todo el equipo (General)',
        subtitle: 'Visible para todos los técnicos',
        icon: <Users className="w-3.5 h-3.5 text-emerald-600" />
      }
    ];

    const activeUsersList = (users || []).filter(u => u && u.status !== 'inactive');
    for (const u of activeUsersList) {
      options.push({
        value: u.displayName || u.email,
        label: `👤 ${u.displayName}`,
        subtitle: `${u.department || 'Personal'} • ${u.role || 'Usuario'}`,
        icon: <User className="w-3.5 h-3.5 text-blue-600" />
      });
    }

    // Add any configured companion not already present (strictly ignoring duplicates)
    for (const tech of configuredCompanions) {
      const cleanTech = tech.replace(/\/(técnico|tecnico|admin|supervisor)/gi, '').toLowerCase().trim();
      const isAlreadyPresent = activeUsersList.some(u => {
        const uName = (u.displayName || u.name || '').toLowerCase().trim();
        const cleanUName = uName.replace(/\/(técnico|tecnico|admin|supervisor)/gi, '').trim();
        return cleanTech === cleanUName || cleanTech.includes(cleanUName) || cleanUName.startsWith(cleanUName) || cleanUName === 'juan mateo' || cleanUName === 'carlos manuel';
      });

      if (!isAlreadyPresent) {
        options.push({
          value: tech,
          label: `👤 ${tech}`,
          subtitle: 'Personal registrado en configuración',
          icon: <User className="w-3.5 h-3.5 text-slate-500" />
        });
      }
    }

    return options;
  }, [users, configuredCompanions]);

  const modalCategoryOptions: BeautifulSelectOption[] = useMemo(() => 
    Object.entries(CATEGORY_CONFIG).map(([key, config]) => {
      const IconComp = config.icon;
      return {
        value: key,
        label: config.label,
        icon: <IconComp className={`w-3.5 h-3.5 ${config.color}`} />
      };
    })
  , []);

  const modalEquipmentOptions: BeautifulSelectOption[] = useMemo(() => [
    { value: '', label: 'Ningún equipo específico', subtitle: 'Tarea general de área o instalación' },
    ...equipments.map((eq) => ({
      value: eq.id,
      label: `[${eq.tag}] ${eq.name}`,
      subtitle: `${eq.area} • ${eq.brand || 'Equipo'}`,
      icon: <Wrench className="w-3.5 h-3.5 text-blue-600" />
    }))
  ], [equipments]);

  return (
    <div id="tasks-module" className="space-y-6">
      {/* Top Banner / Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-md shadow-emerald-600/20">
              <CheckSquare className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                  Tareas para Compañeros
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full border border-emerald-200">
                  En Vivo
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">
                Crea, asigna y realiza seguimiento a las actividades y tareas entre compañeros del equipo.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              id="btn-create-task"
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Nueva Tarea para Compañero</span>
            </button>
          </div>
        </div>

        {/* Quick Stat Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-100">
          <button
            type="button"
            onClick={() => { setStatusFilter('all'); setAssignmentFilter('all'); }}
            className={`p-3 rounded-xl border text-left transition-all ${
              statusFilter === 'all' && assignmentFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
            }`}
          >
            <div className="text-xs font-medium opacity-80">Total Tareas</div>
            <div className="text-xl font-bold mt-0.5">{stats.total}</div>
          </button>

          <button
            type="button"
            onClick={() => { setAssignmentFilter('my_tasks'); setStatusFilter('all'); }}
            className={`p-3 rounded-xl border text-left transition-all ${
              assignmentFilter === 'my_tasks'
                ? 'bg-emerald-700 text-white border-emerald-700 shadow-sm'
                : 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-900'
            }`}
          >
            <div className="text-xs font-medium opacity-80">Mis Tareas</div>
            <div className="text-xl font-bold mt-0.5">{stats.myTasksCount}</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('pendiente')}
            className={`p-3 rounded-xl border text-left transition-all ${
              statusFilter === 'pendiente'
                ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900'
            }`}
          >
            <div className="text-xs font-medium opacity-80">Pendientes</div>
            <div className="text-xl font-bold mt-0.5">{stats.pending}</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('en_progreso')}
            className={`p-3 rounded-xl border text-left transition-all ${
              statusFilter === 'en_progreso'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-900'
            }`}
          >
            <div className="text-xs font-medium opacity-80">En Progreso</div>
            <div className="text-xl font-bold mt-0.5">{stats.inProgress}</div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('completada')}
            className={`p-3 rounded-xl border text-left transition-all ${
              statusFilter === 'completada'
                ? 'bg-teal-700 text-white border-teal-700 shadow-sm'
                : 'bg-teal-50 hover:bg-teal-100 border-teal-200 text-teal-900'
            }`}
          >
            <div className="text-xs font-medium opacity-80">Completadas</div>
            <div className="text-xl font-bold mt-0.5">{stats.completed}</div>
          </button>

          <button
            type="button"
            onClick={() => { setPriorityFilter('urgente'); setStatusFilter('all'); }}
            className={`p-3 rounded-xl border text-left transition-all ${
              priorityFilter === 'urgente'
                ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                : 'bg-rose-50 hover:bg-rose-100 border-rose-200 text-rose-900'
            }`}
          >
            <div className="text-xs font-medium opacity-80">Urgentes</div>
            <div className="text-xl font-bold mt-0.5 flex items-center gap-1.5">
              <span>{stats.urgent}</span>
              {stats.urgent > 0 && <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />}
            </div>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              id="input-search-tasks"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por tarea, compañero asignado, área o equipo..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-slate-900 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Tab: Assignment filter */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl shrink-0 overflow-x-auto">
            <button
              type="button"
              onClick={() => setAssignmentFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                assignmentFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => setAssignmentFilter('my_tasks')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                assignmentFilter === 'my_tasks'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Mis Tareas ({stats.myTasksCount})
            </button>
            <button
              type="button"
              onClick={() => setAssignmentFilter('created_by_me')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                assignmentFilter === 'created_by_me'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Creadas por mí
            </button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
          {/* Asignado a / Compañero registrado en configuración */}
          <BeautifulSelect
            label="Compañero"
            value={assignmentFilter === 'my_tasks' || assignmentFilter === 'created_by_me' ? 'all' : assignmentFilter}
            onChange={(val) => setAssignmentFilter(val)}
            options={companionFilterOptions}
            leadingIcon={<Users className="w-3.5 h-3.5 text-emerald-600" />}
            placeholder="Todos los compañeros"
          />

          {/* Estado */}
          <BeautifulSelect
            label="Estado"
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={statusFilterOptions}
            leadingIcon={<Clock className="w-3.5 h-3.5 text-blue-600" />}
            placeholder="Todos los estados"
          />

          {/* Prioridad */}
          <BeautifulSelect
            label="Prioridad"
            value={priorityFilter}
            onChange={(val) => setPriorityFilter(val)}
            options={priorityFilterOptions}
            leadingIcon={<AlertTriangle className="w-3.5 h-3.5 text-rose-600" />}
            placeholder="Todas las prioridades"
          />

          {/* Categoría */}
          <BeautifulSelect
            label="Categoría"
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val)}
            options={categoryFilterOptions}
            leadingIcon={<Wrench className="w-3.5 h-3.5 text-teal-600" />}
            placeholder="Todas las categorías"
          />
        </div>
      </div>

      {/* Task List / Cards Grid */}
      {filteredTasks.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <div className="w-16 h-16 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckSquare className="w-8 h-8" />
          </div>
          <h3 className="text-base font-semibold text-slate-800">
            No se encontraron tareas
          </h3>
          <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
            {searchTerm || statusFilter !== 'all' || priorityFilter !== 'all' || categoryFilter !== 'all' || assignmentFilter !== 'all'
              ? 'Intenta ajustar los filtros de búsqueda para ver más tareas.'
              : 'Aún no hay tareas creadas. Crea una nueva tarea para tus compañeros usando el botón superior.'}
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-5 inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Crear la primera tarea</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {filteredTasks.map((task) => {
            const priorityStyle = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.media;
            const statusStyle = STATUS_CONFIG[task.status] || STATUS_CONFIG.pendiente;
            const categoryStyle = CATEGORY_CONFIG[task.category] || CATEGORY_CONFIG.mantenimiento;
            const CategoryIcon = categoryStyle.icon;

            const checklistItems = task.checklist || [];
            const completedCount = checklistItems.filter(c => c.completed).length;
            const progressPercent = checklistItems.length > 0 ? Math.round((completedCount / checklistItems.length) * 100) : 0;
            const commentsCount = (task.comments || []).length;
            const photosCount = (task.photos || []).length + (task.completionPhotos || []).length;

            const isAssignedToMe = 
              !task.assignedToId || 
              task.assignedToId === currentUser?.id || 
              task.assignedToName?.toLowerCase().includes('todos') || 
              task.assignedToName?.toLowerCase().includes('general') ||
              (currentUser?.displayName && task.assignedToName?.toLowerCase().trim() === currentUser.displayName.toLowerCase().trim());

            return (
              <div
                key={task.id}
                id={`task-card-${task.id}`}
                className={`bg-white rounded-2xl border transition-all duration-200 flex flex-col justify-between hover:shadow-md ${
                  task.status === 'completada'
                    ? 'border-emerald-200 bg-emerald-50/10'
                    : task.priority === 'urgente'
                    ? 'border-rose-300 ring-1 ring-rose-200'
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="p-5 space-y-4">
                  {/* Card Top: Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Priority Badge */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${priorityStyle.bg} ${priorityStyle.text} ${priorityStyle.border}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${task.priority === 'urgente' ? 'bg-rose-500 animate-ping' : 'bg-current'}`} />
                        {priorityStyle.label}
                      </span>

                      {/* Category Badge */}
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full border ${categoryStyle.bg} ${categoryStyle.color}`}>
                        <CategoryIcon className="w-3 h-3" />
                        {categoryStyle.label}
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold rounded-full border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusStyle.dotColor}`} />
                      {statusStyle.label}
                    </span>
                  </div>

                  {/* Title and Description (Click to open details & progress) */}
                  <div 
                    onClick={() => setActiveTaskId(task.id)}
                    className="cursor-pointer group/title"
                    title="Toca para ver detalles y registrar avances"
                  >
                    <h3 className="text-base font-bold text-slate-900 leading-snug group-hover/title:text-blue-600 transition-colors">
                      {task.title}
                    </h3>
                    {task.description && (
                      <p className="text-xs text-slate-600 mt-1.5 line-clamp-3 leading-relaxed whitespace-pre-line group-hover/title:text-slate-800">
                        {task.description}
                      </p>
                    )}
                  </div>

                  {/* Area, Equipment and Assigned Teammate Info */}
                  <div className="space-y-1.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{task.area}</span>
                      </div>
                      {task.equipmentTag && (
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-mono text-[11px] rounded font-semibold shrink-0">
                          {task.equipmentTag}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-200/60">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px] font-bold">
                          {task.assignedToName?.charAt(0).toUpperCase() || 'E'}
                        </div>
                        <span className="font-semibold text-slate-800 truncate">
                          {task.assignedToName}
                        </span>
                        {isAssignedToMe && (
                          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                            Tú
                          </span>
                        )}
                      </div>

                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-slate-500 font-medium shrink-0">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{task.dueDate} {task.dueTime || ''}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Interactive Checklist (Subtasks) */}
                  {checklistItems.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span className="flex items-center gap-1">
                          <ListTodo className="w-3.5 h-3.5 text-slate-500" />
                          <span>Pasos ({completedCount}/{checklistItems.length})</span>
                        </span>
                        <span className="text-emerald-700">{progressPercent}%</span>
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>

                      {/* Checklist Items list */}
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {checklistItems.map((item) => (
                          <label
                            key={item.id}
                            className={`flex items-start gap-2 p-1.5 rounded-lg text-xs cursor-pointer transition-colors ${
                              item.completed
                                ? 'bg-emerald-50/60 text-slate-500 line-through'
                                : 'bg-white hover:bg-slate-50 text-slate-800 border border-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={item.completed}
                              onChange={() => toggleTaskChecklistItem(task.id, item.id)}
                              className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-3.5 h-3.5 shrink-0"
                            />
                            <span className="leading-tight select-none break-words">
                              {item.text}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Attached Photos Previews */}
                  {((task.photos && task.photos.length > 0) || (task.completionPhotos && task.completionPhotos.length > 0)) && (
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {(task.photos || []).map((photo, pIdx) => (
                        <button
                          key={`photo-${pIdx}`}
                          type="button"
                          onClick={() => setPreviewImage(photo)}
                          className="relative w-12 h-12 rounded-lg overflow-hidden border border-slate-200 shrink-0 group/img focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <img 
                            src={photo} 
                            alt="Foto adjunta" 
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform" 
                          />
                          <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                            <Maximize2 className="w-3.5 h-3.5 text-white" />
                          </div>
                        </button>
                      ))}
                      {(task.completionPhotos || []).map((photo, pIdx) => (
                        <button
                          key={`cphoto-${pIdx}`}
                          type="button"
                          onClick={() => setPreviewImage(photo)}
                          className="relative w-12 h-12 rounded-lg overflow-hidden border-2 border-emerald-400 shrink-0 group/img focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        >
                          <img 
                            src={photo} 
                            alt="Foto solución" 
                            className="w-full h-full object-cover group-hover/img:scale-105 transition-transform" 
                          />
                          <span className="absolute bottom-0 right-0 bg-emerald-600 text-white text-[9px] px-1 rounded-tl font-bold">
                            Fin
                          </span>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Completion notes if solved */}
                  {task.status === 'completada' && task.completionNotes && (
                    <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                      <div className="font-semibold flex items-center gap-1 text-emerald-800 mb-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Solución registrada ({task.completedBy || 'Compañero'}):</span>
                      </div>
                      <p className="whitespace-pre-line text-emerald-800/90 leading-relaxed">
                        {task.completionNotes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Card Footer: Action Buttons */}
                <div className="p-4 bg-slate-50/80 border-t border-slate-100 rounded-b-2xl flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {/* Botón para abrir avances y bitácora */}
                    <button
                      type="button"
                      onClick={() => setActiveTaskId(task.id)}
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                        commentsCount > 0
                          ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 border border-blue-200'
                          : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
                      }`}
                      title="Abrir resumen de avances y fotos"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{commentsCount > 0 ? `${commentsCount} avances` : 'Avance'}</span>
                    </button>

                    {/* Edit button */}
                    <button
                      type="button"
                      onClick={() => openEditModal(task)}
                      className="p-1.5 bg-white hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 transition-colors cursor-pointer"
                      title="Editar detalles de la tarea"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={() => setTaskToDelete(task)}
                      className="p-1.5 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl border border-slate-200 hover:border-rose-200 transition-colors cursor-pointer"
                      title="Eliminar tarea"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Main Action buttons based on status */}
                  <div className="flex items-center gap-1.5">
                    {task.status === 'pendiente' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleStartTask(task)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
                          title="Iniciar tarea"
                        >
                          <Play className="w-3 h-3 fill-current" />
                          <span>Iniciar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleOpenCompleteModal(task)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer"
                          title="Cerrar tarea directamente al 100%"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Cerrar</span>
                        </button>
                      </>
                    )}

                    {task.status === 'en_progreso' && (
                      <button
                        type="button"
                        onClick={() => handleOpenCompleteModal(task)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                        title="Terminar y cerrar tarea al 100%"
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Cerrar Tarea</span>
                      </button>
                    )}

                    {task.status === 'completada' && (
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100/90 border border-emerald-300 px-2 py-1 rounded-xl">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>100% OK</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleReopenTask(task)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                          title="Reabrir tarea"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Reabrir</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CREATE / EDIT TASK (Ultra Completo) */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <CheckSquare className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">
                    {editingTask ? 'Editar Tarea de Compañero' : 'Nueva Tarea para Compañero'}
                  </h2>
                  <p className="text-xs text-slate-400">
                    Asigna instrucciones claras, pasos a seguir y fecha límite
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Body */}
            <form onSubmit={handleSaveTask} className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-900">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Título de la tarea */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Título de la Tarea <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => { setFormTitle(e.target.value); setFormError(''); }}
                  placeholder="Ej: Cambio de empaque y chequeo de presión en bombas..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  required
                />

                {/* Quick Title Suggestions */}
                <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase shrink-0">Sugerencias:</span>
                  {QUICK_SUGGESTIONS_TITLES.slice(0, 4).map((sugg, sIdx) => (
                    <button
                      key={sIdx}
                      type="button"
                      onClick={() => setFormTitle(sugg)}
                      className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[11px] whitespace-nowrap transition-colors"
                    >
                      {sugg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Asignación y Prioridad */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Asignar a compañero registrado en configuración */}
                <div>
                  <BeautifulSelect
                    label="Asignar a Compañero *"
                    value={formAssignedToName === 'Todo el equipo' || !formAssignedToName ? '' : formAssignedToName}
                    onChange={(selectedTech) => {
                      if (!selectedTech || selectedTech === '') {
                        setFormAssignedToId('');
                        setFormAssignedToName('Todo el equipo');
                        setFormAssignedToDept('');
                      } else {
                        setFormAssignedToId(selectedTech);
                        setFormAssignedToName(selectedTech);
                        setFormAssignedToDept('');
                      }
                    }}
                    options={modalCompanionOptions}
                    leadingIcon={<Users className="w-3.5 h-3.5 text-emerald-600" />}
                    placeholder="Seleccionar compañero..."
                  />
                </div>

                {/* Prioridad */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Prioridad <span className="text-rose-500">*</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                    {(['baja', 'media', 'alta', 'urgente'] as TaskPriority[]).map((p) => {
                      const pCfg = PRIORITY_CONFIG[p];
                      const isSelected = formPriority === p;
                      return (
                        <button
                          key={p}
                          type="button"
                          onClick={() => setFormPriority(p)}
                          className={`py-2 px-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${
                            isSelected
                              ? `${pCfg.bg} ${pCfg.text} ${pCfg.border} ring-2 ring-emerald-500 shadow-sm`
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Categoría y Ubicación / Área */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Categoría */}
                <div>
                  <BeautifulSelect
                    label="Categoría de Trabajo"
                    value={formCategory}
                    onChange={(val) => setFormCategory(val as TaskCategory)}
                    options={modalCategoryOptions}
                    placeholder="Seleccionar categoría..."
                  />
                </div>

                {/* Área / Ubicación */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                    Área o Ubicación <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    placeholder="Ej: Cuarto de Máquinas, Hab 302, Cocina..."
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                    required
                  />

                  {/* Quick Areas */}
                  <div className="mt-1.5 flex items-center gap-1 overflow-x-auto pb-1">
                    {QUICK_AREAS.slice(0, 3).map((area, aIdx) => (
                      <button
                        key={aIdx}
                        type="button"
                        onClick={() => setFormArea(area)}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] whitespace-nowrap transition-colors"
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Equipo Asociado (Opcional) y Tiempo Estimado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Equipo */}
                <div>
                  <BeautifulSelect
                    label="Equipo Vinculado (Opcional)"
                    value={formEquipmentId}
                    onChange={(val) => setFormEquipmentId(val)}
                    options={modalEquipmentOptions}
                    leadingIcon={<Wrench className="w-3.5 h-3.5 text-blue-600" />}
                    placeholder="Ningún equipo específico"
                  />
                </div>

                {/* Fecha y Hora Límite con Selector Futurista */}
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2.5">
                    {/* Trigger Fecha Límite */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Fecha Límite</span>
                        </span>
                        {formDueDate && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormDueDate('');
                            }}
                            className="text-[10px] text-slate-400 hover:text-rose-500 font-semibold cursor-pointer"
                          >
                            Quitar
                          </button>
                        )}
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setDateTimePickerInitialTab('date');
                          setIsDateTimePickerOpen(true);
                        }}
                        className="w-full text-left px-3 py-2.5 bg-gradient-to-r from-slate-50 to-emerald-50/40 hover:from-white hover:to-emerald-50/70 border border-slate-200 hover:border-emerald-500 rounded-xl transition-all shadow-xs group cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold text-slate-800 group-hover:text-emerald-950 truncate">
                              {formatDisplayDate(formDueDate) || 'Elegir fecha...'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {formDueDate ? '📅 Fecha programada' : 'Toca para programar'}
                            </div>
                          </div>
                        </div>
                        <Sparkles className="w-3.5 h-3.5 text-emerald-500 opacity-60 group-hover:opacity-100 shrink-0 ml-1" />
                      </button>
                    </div>

                    {/* Trigger Hora Límite */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-purple-600" />
                          <span>Hora</span>
                        </span>
                        {formDueTime && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFormDueTime('');
                            }}
                            className="text-[10px] text-slate-400 hover:text-rose-500 font-semibold cursor-pointer"
                          >
                            Quitar
                          </button>
                        )}
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          setDateTimePickerInitialTab('time');
                          setIsDateTimePickerOpen(true);
                        }}
                        className="w-full text-left px-3 py-2.5 bg-gradient-to-r from-slate-50 to-purple-50/40 hover:from-white hover:to-purple-50/70 border border-slate-200 hover:border-purple-500 rounded-xl transition-all shadow-xs group cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="p-1.5 rounded-lg bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <Clock className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="text-xs font-bold text-slate-800 group-hover:text-purple-950 truncate">
                              {formatDisplayTime(formDueTime) || 'Opcional (Sin hora)'}
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              {formDueTime ? '⏰ Hora fijada' : 'Toca para ajustar'}
                            </div>
                          </div>
                        </div>
                        <Sparkles className="w-3.5 h-3.5 text-purple-500 opacity-60 group-hover:opacity-100 shrink-0 ml-1" />
                      </button>
                    </div>
                  </div>

                  {/* Atajos Rápidos */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[11px] no-scrollbar">
                    <span className="text-slate-400 font-semibold text-[10px] uppercase shrink-0">Atajos:</span>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        const y = now.getFullYear();
                        const m = String(now.getMonth() + 1).padStart(2, '0');
                        const d = String(now.getDate()).padStart(2, '0');
                        setFormDueDate(`${y}-${m}-${d}`);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 font-medium transition-colors shrink-0 cursor-pointer"
                    >
                      Hoy
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const now = new Date();
                        now.setDate(now.getDate() + 1);
                        const y = now.getFullYear();
                        const m = String(now.getMonth() + 1).padStart(2, '0');
                        const d = String(now.getDate()).padStart(2, '0');
                        setFormDueDate(`${y}-${m}-${d}`);
                      }}
                      className="px-2 py-0.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 font-medium transition-colors shrink-0 cursor-pointer"
                    >
                      Mañana
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDueTime('14:00')}
                      className="px-2 py-0.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-medium transition-colors shrink-0 cursor-pointer"
                    >
                      Fin Mañana (14:00)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormDueTime('22:00')}
                      className="px-2 py-0.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 font-medium transition-colors shrink-0 cursor-pointer"
                    >
                      Fin Tarde (22:00)
                    </button>
                  </div>
                </div>
              </div>

              {/* Descripción detallada */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Descripción e Instrucciones para el Compañero
                </label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detalla qué se debe hacer, precauciones técnicas, repuestos requeridos o instrucciones especiales..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Lista de Verificación / Checklist (Subtareas) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <ListTodo className="w-4 h-4 text-emerald-600" />
                    <span>Pasos a Seguir / Checklist ({formChecklist.length})</span>
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Puntos de control para el compañero
                  </span>
                </div>

                {/* Input to add subtask */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newChecklistInput}
                    onChange={(e) => setNewChecklistInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddChecklistItem();
                      }
                    }}
                    placeholder="Escribe un paso (ej: 1. Cerrar válvula de paso, 2. Probar presión)..."
                    className="flex-1 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddChecklistItem}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
                  >
                    + Agregar
                  </button>
                </div>

                {/* Checklist items */}
                {formChecklist.length > 0 && (
                  <div className="space-y-1.5 mt-2 max-h-40 overflow-y-auto">
                    {formChecklist.map((item, idx) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-800"
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px]">
                            {idx + 1}
                          </span>
                          <span>{item.text}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => handleRemoveChecklistItem(item.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Fotos Adjuntas de Soporte */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span>Fotos / Evidencia Inicial ({formPhotos.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Adjuntar Foto</span>
                  </button>
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={(e) => handleAddPhotos(e, false)}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                {formPhotos.length > 0 ? (
                  <div className="grid grid-cols-4 gap-2">
                    {formPhotos.map((photo, pIdx) => (
                      <div key={pIdx} className="relative group rounded-lg overflow-hidden border border-slate-200 h-20">
                        <img src={photo} alt={`Foto ${pIdx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setFormPhotos(prev => prev.filter((_, i) => i !== pIdx))}
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-90 hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                  >
                    <ImageIcon className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                    <span className="text-xs text-slate-500 font-medium">
                      Toca aquí para tomar o subir fotos de apoyo
                    </span>
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md hover:shadow-lg transition-all active:scale-95 cursor-pointer"
                >
                  {editingTask ? 'Guardar Cambios' : 'Crear y Asignar Tarea'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: COMPLETAR TAREA (Registrar notas finales y foto de resultado) */}
      {/* ========================================================================= */}
      {completingTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="px-6 py-4 bg-emerald-700 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-800 rounded-xl">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold">Completar Tarea</h2>
                  <p className="text-xs text-emerald-100">Registra el trabajo realizado y la solución</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCompletingTask(null)}
                className="p-1.5 text-emerald-200 hover:text-white rounded-lg hover:bg-emerald-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <div className="font-bold text-slate-900">{completingTask.title}</div>
                <div>Área: {completingTask.area}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Notas de Solución / Trabajo Realizado
                </label>
                <textarea
                  rows={3}
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="Explica qué se reparó, qué piezas se reemplazaron o cómo quedó funcionando..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>

              {/* Fotos de Evidencia Final */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Camera className="w-4 h-4 text-slate-500" />
                    <span>Fotos de Trabajo Terminado ({completionPhotos.length})</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => completionFileInputRef.current?.click()}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tomar Foto</span>
                  </button>
                </div>

                <input
                  type="file"
                  ref={completionFileInputRef}
                  onChange={(e) => handleAddPhotos(e, true)}
                  accept="image/*"
                  multiple
                  className="hidden"
                />

                {completionPhotos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {completionPhotos.map((photo, pIdx) => (
                      <div key={pIdx} className="relative group rounded-lg overflow-hidden border border-slate-200 h-20">
                        <img src={photo} alt={`Resultado ${pIdx + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setCompletionPhotos(prev => prev.filter((_, i) => i !== pIdx))}
                          className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-90 hover:opacity-100"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setCompletingTask(null)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmComplete}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-md transition-all cursor-pointer"
                >
                  Confirmar Finalización
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SEGUIMIENTO, RESUMEN DE AVANCES Y CIERRE DE TAREA */}
      {/* ========================================================================= */}
      {activeTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3 min-w-0 pr-2">
                <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-2xl shrink-0">
                  <ListTodo className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Gestión de Tarea
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${STATUS_CONFIG[activeTask.status]?.bg || 'bg-slate-100'} ${STATUS_CONFIG[activeTask.status]?.text || 'text-slate-700'} ${STATUS_CONFIG[activeTask.status]?.border || 'border-slate-300'}`}>
                      {STATUS_CONFIG[activeTask.status]?.label || activeTask.status}
                    </span>
                  </div>
                  <h2 className="text-base sm:text-lg font-bold truncate text-white">
                    {activeTask.title}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveTaskId(null);
                  setProgressText('');
                  setProgressPhotos([]);
                }}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content Body */}
            <div className="p-5 overflow-y-auto flex-1 space-y-4 bg-slate-50/50">
              {/* Task Overview Card */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                {activeTask.description && (
                  <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                    {activeTask.description}
                  </p>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Asignado a</span>
                    <span className="font-semibold text-slate-800 truncate block mt-0.5">
                      {activeTask.assignedToName}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Ubicación</span>
                    <span className="font-semibold text-slate-800 truncate block mt-0.5">
                      {activeTask.area || 'Hotel'}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Prioridad</span>
                    <span className="font-semibold text-slate-800 capitalize block mt-0.5">
                      {PRIORITY_CONFIG[activeTask.priority]?.label || activeTask.priority}
                    </span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Fecha Límite</span>
                    <span className="font-semibold text-slate-800 truncate block mt-0.5">
                      {activeTask.dueDate ? `${activeTask.dueDate} ${activeTask.dueTime || ''}` : 'Sin fecha'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Checklist Interactivo */}
              {activeTask.checklist && activeTask.checklist.length > 0 && (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                      <span>Pasos a Realizar ({activeTask.checklist.filter(c => c.completed).length}/{activeTask.checklist.length})</span>
                    </span>
                    <span className="text-emerald-700">
                      {Math.round((activeTask.checklist.filter(c => c.completed).length / activeTask.checklist.length) * 100)}%
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.round((activeTask.checklist.filter(c => c.completed).length / activeTask.checklist.length) * 100)}%` }}
                    />
                  </div>

                  <div className="space-y-1.5 pt-1">
                    {activeTask.checklist.map(item => (
                      <label 
                        key={item.id}
                        className={`flex items-start gap-2.5 p-2 rounded-xl text-xs cursor-pointer border transition-colors ${
                          item.completed 
                            ? 'bg-emerald-50/70 border-emerald-200 text-slate-500 line-through'
                            : 'bg-slate-50 hover:bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={() => toggleTaskChecklistItem(activeTask.id, item.id)}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4 shrink-0"
                        />
                        <span className="leading-snug select-none">{item.text}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Acceso para Cerrar/Terminar Tarea cuando esté lista al 100% */}
              {activeTask.status !== 'completada' ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Check className="w-5 h-5 stroke-[3]" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wider">
                        ¿Tarea finalizada al 100%?
                      </h4>
                      <p className="text-xs text-emerald-800 mt-0.5">
                        Si ya terminaste todo el trabajo, cierra la tarea y sube la foto de resultado.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenCompleteModal(activeTask);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Cerrar Tarea (100% OK)</span>
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      <span>Tarea Finalizada y Cerrada con Éxito (100% OK)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleReopenTask(activeTask)}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-emerald-300 text-emerald-800 text-[11px] font-semibold rounded-lg flex items-center gap-1 cursor-pointer transition-colors"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reabrir</span>
                    </button>
                  </div>
                  {activeTask.completionNotes && (
                    <p className="text-xs text-emerald-900/90 whitespace-pre-line bg-white/70 p-2.5 rounded-xl border border-emerald-100">
                      {activeTask.completionNotes}
                    </p>
                  )}
                  {activeTask.completionPhotos && activeTask.completionPhotos.length > 0 && (
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {activeTask.completionPhotos.map((photo, pIdx) => (
                        <button
                          key={pIdx}
                          type="button"
                          onClick={() => setPreviewImage(photo)}
                          className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-emerald-400 shrink-0 group focus:outline-none cursor-pointer"
                        >
                          <img src={photo} alt={`Resultado ${pIdx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          <span className="absolute bottom-0 right-0 bg-emerald-600 text-white text-[9px] px-1 rounded-tl font-bold">
                            Fin
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Formulario para ir Resumiendo Avances y Cargar Fotos */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span>Registrar Avance / Novedad de Trabajo</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    Visible en tiempo real
                  </span>
                </div>

                <textarea
                  rows={2}
                  value={progressText}
                  onChange={(e) => setProgressText(e.target.value)}
                  placeholder="Escribe el resumen de lo que vas haciendo en la tarea (ej: se colocaron las primeras baldas, se lijó la zona, piezas listas)..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all placeholder:text-slate-400"
                />

                {/* Previsualización de Fotos de Avance listas para registrar */}
                {progressPhotos.length > 0 && (
                  <div>
                    <span className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Fotos de avance listas para adjuntar ({progressPhotos.length}):
                    </span>
                    <div className="flex items-center gap-2 overflow-x-auto py-1">
                      {progressPhotos.map((photo, pIdx) => (
                        <div key={pIdx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 group shadow-2xs">
                          <img src={photo} alt={`Avance ${pIdx + 1}`} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => handleRemoveProgressPhoto(pIdx)}
                            className="absolute top-1 right-1 p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-sm cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => progressFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                  >
                    <Camera className="w-3.5 h-3.5 text-blue-600" />
                    <span>{progressPhotos.length > 0 ? `Fotos (${progressPhotos.length})` : 'Cargar Fotos de Avance'}</span>
                  </button>
                  <input
                    type="file"
                    ref={progressFileInputRef}
                    onChange={handleAddProgressPhotos}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={handleSaveProgress}
                    disabled={!progressText.trim() && progressPhotos.length === 0}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Registrar Avance</span>
                  </button>
                </div>
              </div>

              {/* Bitácora / Línea de Tiempo de Avances Registrados */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <span>Historial y Resumen de Avances ({activeTask.comments?.length || 0})</span>
                  </span>
                </div>

                {(!activeTask.comments || activeTask.comments.length === 0) ? (
                  <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200 text-xs text-slate-400">
                    Aún no se han registrado resúmenes de avance en esta tarea. Usa el cuadro superior para agregar lo que vas haciendo y fotos del progreso.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                    {[...(activeTask.comments || [])].reverse().map((comment) => (
                      <div key={comment.id} className="p-3.5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                              {comment.userName?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            <span className="font-bold text-slate-900">{comment.userName}</span>
                            {comment.userRole && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                                {comment.userRole}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">
                            {formatCommentTimestamp(comment.timestamp)}
                          </span>
                        </div>

                        {comment.text && (
                          <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed pl-8">
                            {comment.text}
                          </p>
                        )}

                        {/* Fotos adjuntas a este avance */}
                        {comment.photos && comment.photos.length > 0 && (
                          <div className="flex items-center gap-2 overflow-x-auto pl-8 pt-1">
                            {comment.photos.map((photo, pIdx) => (
                              <button
                                key={pIdx}
                                type="button"
                                onClick={() => setPreviewImage(photo)}
                                className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 shrink-0 group focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              >
                                <img src={photo} alt={`Foto avance ${pIdx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Maximize2 className="w-3.5 h-3.5 text-white" />
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <span className="text-xs text-slate-500 truncate">
                Creado por {activeTask.createdByName || 'Compañero'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setActiveTaskId(null);
                  setProgressText('');
                  setProgressPhotos([]);
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                Cerrar Ventana
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: CONFIRMACIÓN DE ELIMINACIÓN */}
      {/* ========================================================================= */}
      {taskToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 text-center">
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">
              ¿Eliminar esta tarea?
            </h3>
            <p className="text-xs text-slate-600 mt-1 mb-6">
              Esta acción eliminará la tarea <strong>"{taskToDelete.title}"</strong> de forma permanente para todos los compañeros.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={async () => {
                  await deleteTask(taskToDelete.id);
                  setTaskToDelete(null);
                }}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-md"
              >
                Sí, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: IMAGE PREVIEW ZOOM */}
      {/* ========================================================================= */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out animate-fade-in"
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <img 
              src={previewImage} 
              alt="Foto ampliada" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl" 
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="absolute top-3 right-3 p-2 bg-black/60 text-white rounded-full hover:bg-black/80 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: SELECTOR FUTURISTA DE FECHA Y HORA */}
      {/* ========================================================================= */}
      <FuturisticDateTimePickerModal
        isOpen={isDateTimePickerOpen}
        onClose={() => setIsDateTimePickerOpen(false)}
        dateValue={formDueDate}
        timeValue={formDueTime}
        initialTab={dateTimePickerInitialTab}
        onApply={(date, time) => {
          setFormDueDate(date);
          setFormDueTime(time);
        }}
      />
    </div>
  );
};
