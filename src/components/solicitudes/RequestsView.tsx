import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { HotelRequest, User as UserType } from '../../types';
import DatePicker, { registerLocale } from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../styles/datepicker-overrides.css';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { 
  ClipboardList, 
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
  BedDouble,
  Droplet,
  Zap,
  Thermometer,
  Sparkles,
  Armchair,
  MoreHorizontal,
  Building2,
  Users,
  Shield,
  Utensils,
  ChefHat,
  Shirt,
  Bell,
  UserCheck
} from 'lucide-react';
import { 
  getLocalDateString, 
  getLocalTimeString, 
  getLocalDateTimeString, 
  formatRequestDateTime, 
  format12HourTime 
} from '../../utils/dateUtils';

registerLocale('es', es);

export const RequestsView: React.FC = () => {
  const { 
    requests, 
    addRequest, 
    updateRequest, 
    deleteRequest, 
    currentUser, 
    isAdmin: ctxIsAdmin,
    settings, 
    users, 
    notify 
  } = useMaintenance();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<Date | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<HotelRequest | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formLocation, setFormLocation] = useState('');
  const [formCategory, setFormCategory] = useState<HotelRequest['category']>('habitacion');
  const [formPriority, setFormPriority] = useState<HotelRequest['priority']>('media');
  const [formAssignedTo, setFormAssignedTo] = useState('');
  const [formDate, setFormDate] = useState(getLocalDateString());
  const [formTime, setFormTime] = useState(getLocalTimeString());
  const [formError, setFormError] = useState('');

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  
  const [isAreaOpen, setIsAreaOpen] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  const [requestToDelete, setRequestToDelete] = useState<HotelRequest | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setIsCategoryOpen(false);
      }
      if (areaRef.current && !areaRef.current.contains(event.target as Node)) {
        setIsAreaOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const openCreateModal = () => {
    setEditingRequest(null);
    setFormTitle('');
    setFormDescription('');
    setFormLocation('');
    setFormCategory('habitacion');
    setFormPriority('media');
    setFormAssignedTo('');
    setFormDate(getLocalDateString());
    setFormTime(getLocalTimeString());
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (req: HotelRequest) => {
    setEditingRequest(req);
    setFormTitle(req.title);
    setFormDescription(req.description);
    setFormLocation(req.location);
    setFormCategory(req.category);
    setFormPriority(req.priority);
    setFormAssignedTo(req.assignedTo || '');
    if (req.createdAt) {
      const parts = req.createdAt.split(' ');
      setFormDate(parts[0] || getLocalDateString());
      setFormTime(parts[1] || getLocalTimeString());
    } else {
      setFormDate(getLocalDateString());
      setFormTime(getLocalTimeString());
    }
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('Por favor ingrese el título o asunto de la solicitud.');
      notify?.('⚠️ Por favor ingrese el título o asunto de la solicitud.');
      return;
    }
    if (!formLocation.trim()) {
      setFormError('Por favor indique la ubicación (ej. Habitación 302, Lobby).');
      notify?.('⚠️ Por favor indique la ubicación (ej. Habitación 302, Lobby).');
      return;
    }
    if (!formAssignedTo.trim()) {
      setFormError('Debe seleccionar la persona o el área asignada para enviar esta solicitud.');
      notify?.('⚠️ Debe seleccionar la persona o el área asignada para enviar la solicitud.');
      return;
    }

    const explicitCreatedAt = `${formDate} ${formTime}`;

    try {
      if (editingRequest) {
        await updateRequest(editingRequest.id, {
          title: formTitle.trim(),
          description: formDescription.trim(),
          location: formLocation.trim(),
          category: formCategory,
          priority: formPriority,
          assignedTo: formAssignedTo.trim(),
          createdAt: explicitCreatedAt
        });
      } else {
        await addRequest({
          title: formTitle.trim(),
          description: formDescription.trim(),
          location: formLocation.trim(),
          category: formCategory,
          priority: formPriority,
          status: 'pendiente',
          requestedBy: currentUser?.displayName || currentUser?.email || 'Usuario del Hotel',
          requestedByEmail: currentUser?.email,
          requestedById: currentUser?.id,
          assignedTo: formAssignedTo.trim(),
          createdAt: explicitCreatedAt
        });
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      setFormError('Error al guardar la solicitud.');
    }
  };

  const normalize = (str?: string) => {
    if (!str) return '';
    return str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  };

  const handleStatusChange = async (id: string, newStatus: HotelRequest['status']) => {
    const updateData: Partial<HotelRequest> = { status: newStatus };
    if (newStatus === 'resuelto') {
      updateData.resolvedAt = getLocalDateTimeString();
    }
    const targetReq = requests.find(r => r.id === id);
    if (newStatus === 'en_proceso' && targetReq && !targetReq.assignedTo && currentUser?.displayName) {
      updateData.assignedTo = currentUser.displayName;
    }
    await updateRequest(id, updateData);
  };

  const [scopeFilter, setScopeFilter] = useState<'all' | 'assigned_to_me' | 'created_by_me'>('all');

  const isAdmin = ctxIsAdmin ||
                  !currentUser ||
                  currentUser?.role === 'admin' || 
                  currentUser?.email?.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com' ||
                  currentUser?.id === 'usr-admin-master' ||
                  currentUser?.id === 'usr-1789230683226' ||
                  Boolean(currentUser?.permissions?.canManageUsers) || 
                  Boolean(currentUser?.permissions?.canEditSettings) ||
                  normalize(currentUser?.displayName || '') === 'administrador principal' ||
                  normalize(currentUser?.displayName || '') === 'juan mateo ramos' ||
                  normalize(currentUser?.role || '') === 'administrador' ||
                  normalize(currentUser?.role || '') === 'admin';

  const isAssignedToUser = (req: HotelRequest) => {
    if (!currentUser || !req.assignedTo) return false;
    const assignNorm = normalize(req.assignedTo);
    const userNameNorm = normalize(currentUser.displayName);
    const userEmailNorm = normalize(currentUser.email);
    const userDeptNorm = normalize(currentUser.department);
    const userRoleNorm = normalize(currentUser.role);

    // 1. Direct name match (e.g. "Juan Mateo Ramos", "Ferney Machado")
    if (userNameNorm && (assignNorm === userNameNorm || assignNorm.includes(userNameNorm) || userNameNorm.includes(assignNorm))) return true;
    
    // 2. Direct email match
    if (userEmailNorm && (assignNorm === userEmailNorm || assignNorm.includes(userEmailNorm))) return true;
    
    // 3. Department match ONLY IF assigned directly to a general department name (and not a specific person's name)
    const isGeneralDeptAssignment = assignNorm === 'mantenimiento' || assignNorm === 'tecnico' || 
                                    assignNorm === 'housekeeping' || assignNorm === 'recepcion' || 
                                    assignNorm === 'alimentos y bebidas' || assignNorm === 'ayb' || 
                                    assignNorm === 'cocina' || assignNorm === 'administracion' || 
                                    assignNorm === 'lavanderia / sastreria' || assignNorm === 'sastreria' || 
                                    assignNorm === 'seguridad';

    if (isGeneralDeptAssignment) {
      if (userDeptNorm && (assignNorm === userDeptNorm || assignNorm.includes(userDeptNorm) || userDeptNorm.includes(assignNorm))) return true;
      if ((userRoleNorm.includes('tecnico') || userRoleNorm.includes('mantenimiento')) && (assignNorm === 'mantenimiento' || assignNorm === 'tecnico')) return true;
      if (userRoleNorm.includes('housekeeping') && assignNorm === 'housekeeping') return true;
      if (userRoleNorm.includes('cocina') && assignNorm === 'cocina') return true;
      if (userRoleNorm.includes('ayb') && (assignNorm === 'ayb' || assignNorm === 'alimentos y bebidas')) return true;
      if (userRoleNorm.includes('sastra') && (assignNorm === 'sastreria' || assignNorm === 'lavanderia / sastreria')) return true;
    }
    
    return false;
  };

  const isCreatedByUser = (req: HotelRequest) => {
    if (!currentUser) return false;
    const reqUserEmail = (req.requestedByEmail || '').toLowerCase().trim();
    const currUserEmail = (currentUser.email || '').toLowerCase().trim();
    const reqUserBy = normalize(req.requestedBy);
    const currUserDisplayName = normalize(currentUser.displayName);

    if (req.requestedById && currentUser.id && req.requestedById === currentUser.id) return true;
    if (reqUserEmail && currUserEmail && reqUserEmail === currUserEmail) return true;
    if (reqUserBy && currUserDisplayName && (reqUserBy === currUserDisplayName || reqUserBy.includes(currUserDisplayName) || currUserDisplayName.includes(reqUserBy))) return true;
    return false;
  };

  // Todas las solicitudes se preservan con su estado firme y exacto
  const totalRequests = requests || [];

  // Si es administrador, tiene visibilidad completa de todas las solicitudes del hotel.
  // Si es un técnico/sujeto de mantenimiento con configuración específica, sólo puede ver las solicitudes asignadas específicamente a él o las creadas por él.
  const userAllowedRequests = isAdmin 
    ? totalRequests 
    : totalRequests.filter(req => isAssignedToUser(req) || isCreatedByUser(req));

  // Conteo para los chips de filtro basados en las solicitudes
  const assignedToMeCount = userAllowedRequests.filter(isAssignedToUser).length;
  const createdByMeCount = userAllowedRequests.filter(isCreatedByUser).length;

  const scopedRequests = useMemo(() => {
    if (scopeFilter === 'assigned_to_me') return userAllowedRequests.filter(isAssignedToUser);
    if (scopeFilter === 'created_by_me') return userAllowedRequests.filter(isCreatedByUser);
    return userAllowedRequests;
  }, [userAllowedRequests, scopeFilter]);

  // Filtered requests based on UI selections
  const filteredRequests = scopedRequests.filter(req => {
    const matchesSearch = 
      req.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requestedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (req.assignedTo || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || req.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || req.priority === priorityFilter;
    const matchesCategory = categoryFilter === 'all' || req.category === categoryFilter;
    
    let matchesDate = true;
    if (dateFilter) {
      // req.createdAt is in "YYYY-MM-DD HH:mm" format
      const reqDate = req.createdAt.split(' ')[0];
      const selectedDate = format(dateFilter, 'yyyy-MM-dd');
      matchesDate = reqDate === selectedDate;
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesDate;
  });

  // Stats calculadas sobre las solicitudes visibles y permitidas para este usuario
  const totalCount = userAllowedRequests.length;
  const pendingCount = userAllowedRequests.filter(r => r.status === 'pendiente').length;
  const inProcessCount = userAllowedRequests.filter(r => r.status === 'en_proceso').length;
  const resolvedCount = userAllowedRequests.filter(r => r.status === 'resuelto').length;
  const urgentCount = userAllowedRequests.filter(r => r.priority === 'urgente' && r.status !== 'resuelto').length;

  const getPriorityBadge = (p: HotelRequest['priority']) => {
    switch (p) {
      case 'urgente': return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-100 text-rose-700 border border-rose-200">🚨 Urgente</span>;
      case 'alta': return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-orange-100 text-orange-700 border border-orange-200">⚡ Alta</span>;
      case 'media': return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">🔵 Media</span>;
      case 'baja': return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">🟢 Baja</span>;
    }
  };

  const getStatusBadge = (s: HotelRequest['status']) => {
    switch (s) {
      case 'pendiente': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 flex items-center gap-1"><Clock className="w-3 h-3" /> Pendiente</span>;
      case 'en_proceso': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex items-center gap-1"><Wrench className="w-3 h-3" /> En Proceso</span>;
      case 'resuelto': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Resuelto</span>;
      case 'cancelado': return <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 flex items-center gap-1"><X className="w-3 h-3" /> Cancelado</span>;
    }
  };

  const roleDisplayNames: Record<string, string> = {
    'admin': 'Administrador',
    'técnico': 'Mantenimiento',
    'housekeeping': 'Housekeeping',
    'ayb': 'Alimentos y Bebidas',
    'sastra': 'Sastrería / Ropería',
    'cocina': 'Cocina'
  };

  const hotelDepartments = [
    { id: 'maint', name: 'Mantenimiento', desc: 'Área Técnica, Reparaciones y Averías', icon: Wrench, color: 'text-amber-600 bg-amber-50' },
    { id: 'hk', name: 'Housekeeping', desc: 'Ama de Llaves, Habitaciones y Limpieza', icon: Sparkles, color: 'text-emerald-600 bg-emerald-50' },
    { id: 'rec', name: 'Recepción', desc: 'Front Desk, Check-in y Atención al Huésped', icon: Bell, color: 'text-indigo-600 bg-indigo-50' },
    { id: 'ayb', name: 'Alimentos y Bebidas', desc: 'Restaurante, Bar y Servicio de Mesa', icon: Utensils, color: 'text-rose-600 bg-rose-50' },
    { id: 'coc', name: 'Cocina', desc: 'Área de Cocina, Equipos y Producción', icon: ChefHat, color: 'text-orange-600 bg-orange-50' },
    { id: 'adm', name: 'Administración', desc: 'Gerencia, Finanzas y Oficinas', icon: Building2, color: 'text-blue-600 bg-blue-50' },
    { id: 'lav', name: 'Lavandería / Sastrería', desc: 'Lavandería, Lencería y Blancos', icon: Shirt, color: 'text-purple-600 bg-purple-50' },
    { id: 'seg', name: 'Seguridad', desc: 'Vigilancia, Accesos y Control', icon: Shield, color: 'text-slate-600 bg-slate-50' }
  ];

  // Deduplicate active users by displayName to prevent any possible UI duplicates
  const activeUsersMap = new Map<string, UserType>();
  (users || []).forEach(u => {
    if (u && u.status !== 'inactive' && u.displayName) {
      const key = u.displayName.trim().toLowerCase();
      if (!activeUsersMap.has(key)) {
        activeUsersMap.set(key, u);
      } else {
        const existing = activeUsersMap.get(key)!;
        if (!existing.email && u.email) {
          activeUsersMap.set(key, u);
        }
      }
    }
  });
  const activeUsers = Array.from(activeUsersMap.values());

  const [areaSearchTerm, setAreaSearchTerm] = useState('');

  const categoryOptions = [
    { value: 'habitacion', label: 'Habitación', icon: BedDouble, color: 'text-indigo-500', bg: 'bg-indigo-50' },
    { value: 'mantenimiento_general', label: 'Mantenimiento General', icon: Wrench, color: 'text-slate-500', bg: 'bg-slate-50' },
    { value: 'plomeria', label: 'Plomería', icon: Droplet, color: 'text-blue-500', bg: 'bg-blue-50' },
    { value: 'electricidad', label: 'Electricidad', icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50' },
    { value: 'climatizacion', label: 'Climatización', icon: Thermometer, color: 'text-cyan-500', bg: 'bg-cyan-50' },
    { value: 'limpieza', label: 'Limpieza', icon: Sparkles, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    { value: 'mobiliario', label: 'Mobiliario', icon: Armchair, color: 'text-orange-500', bg: 'bg-orange-50' },
    { value: 'otro', label: 'Otro', icon: MoreHorizontal, color: 'text-slate-400', bg: 'bg-slate-50' },
  ] as const;

  const getCategoryLabel = (c: HotelRequest['category']) => {
    return categoryOptions.find(opt => opt.value === c)?.label || 'Otro';
  };

  const selectedCategoryOption = categoryOptions.find(c => c.value === formCategory) || categoryOptions[0];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 bg-amber-500/10 text-amber-600 rounded-xl">
              <ClipboardList className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Solicitudes y Órdenes de Servicio</h1>
              <p className="text-sm text-slate-500 mt-0.5">Gestión de reportes, averías y peticiones de servicios del hotel</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium px-5 py-2.5 rounded-xl shadow-sm transition-all duration-200 hover:shadow cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Nueva Solicitud</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{totalCount}</p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <ClipboardList className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-amber-600 uppercase tracking-wider">Pendientes</p>
            <p className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-blue-600 uppercase tracking-wider">En Proceso</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">{inProcessCount}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Wrench className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider">Resueltas</p>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{resolvedCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between col-span-2 sm:col-span-1">
          <div>
            <p className="text-xs font-medium text-rose-600 uppercase tracking-wider">Urgentes</p>
            <p className="text-2xl font-bold text-rose-700 mt-1">{urgentCount}</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Scope Selector Tabs */}
      <div className="flex flex-wrap items-center gap-2 bg-slate-200/70 p-1.5 rounded-2xl w-fit">
        <button
          type="button"
          onClick={() => setScopeFilter('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            scopeFilter === 'all'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <ClipboardList className="w-4 h-4 text-amber-600" />
          <span>Todas las del Hotel</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
            {totalCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setScopeFilter('assigned_to_me')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            scopeFilter === 'assigned_to_me'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Wrench className="w-4 h-4 text-blue-600" />
          <span>Mis Asignadas</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
            {assignedToMeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setScopeFilter('created_by_me')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
            scopeFilter === 'created_by_me'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <User className="w-4 h-4 text-emerald-600" />
          <span>Creadas por mí</span>
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
            {createdByMeCount}
          </span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col xl:flex-row gap-3 items-center justify-between">
        <div className="relative w-full xl:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por título, ubicación..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
          <div className="relative flex-1 min-w-[140px] z-20">
            <DatePicker
              selected={dateFilter}
              onChange={(date) => setDateFilter(date)}
              locale="es"
              dateFormat="dd/MM/yyyy"
              placeholderText="Filtrar por fecha"
              isClearable
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
              wrapperClassName="w-full"
              calendarClassName="!border-slate-200 !rounded-xl !shadow-xl !font-sans"
              dayClassName={date => "!rounded-lg hover:!bg-amber-50"}
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 flex-1 min-w-[140px]"
          >
            <option value="all">Todos los Estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="en_proceso">En Proceso</option>
            <option value="resuelto">Resueltos</option>
            <option value="cancelado">Cancelados</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 flex-1 min-w-[140px]"
          >
            <option value="all">Todas las Prioridades</option>
            <option value="urgente">🚨 Urgente</option>
            <option value="alta">⚡ Alta</option>
            <option value="media">🔵 Media</option>
            <option value="baja">🟢 Baja</option>
          </select>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20 flex-1 min-w-[140px]"
          >
            <option value="all">Todas las Categorías</option>
            {categoryOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Requests List */}
      <div className="space-y-3">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto mb-3">
              <ClipboardList className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No se encontraron solicitudes</h3>
            <p className="text-sm text-slate-500 mt-1">Intenta ajustar los filtros o crea una nueva solicitud.</p>
          </div>
        ) : (
          filteredRequests.map(req => (
            <div 
              key={req.id} 
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {getStatusBadge(req.status)}
                  {getPriorityBadge(req.priority)}
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                    {getCategoryLabel(req.category)}
                  </span>
                  {(() => {
                    const dt = formatRequestDateTime(req.createdAt);
                    return (
                      <div 
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 border border-slate-200/80 text-xs text-slate-600 ml-auto md:ml-0 shadow-xs"
                        title={`Fecha y hora exacta de creación: ${dt.fullFormatted}`}
                      >
                        <Calendar className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                        <span className="font-semibold text-slate-800">{dt.isToday ? 'Hoy' : dt.dateLabel}</span>
                        <span className="text-slate-300 font-normal">•</span>
                        <Clock className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className={`font-bold ${dt.isMorning ? 'text-amber-700' : 'text-indigo-700'}`}>
                          {dt.timeLabel}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                <div>
                  <h3 className="text-base font-bold text-slate-900">{req.title}</h3>
                  <p className="text-sm text-slate-600 mt-0.5">{req.description || 'Sin descripción adicional.'}</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1 font-medium text-slate-700">
                    <MapPin className="w-3.5 h-3.5 text-amber-600" />
                    {req.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    Reportado por: {req.requestedBy}
                  </span>
                  {req.assignedTo && (
                    <span className="flex items-center gap-1">
                      <Wrench className="w-3.5 h-3.5 text-blue-500" />
                      Asignado: {req.assignedTo}
                    </span>
                  )}
                  {req.resolvedAt && (() => {
                    const rdt = formatRequestDateTime(req.resolvedAt);
                    return (
                      <span 
                        className="inline-flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70"
                        title={`Fecha y hora de resolución: ${rdt.fullFormatted}`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Resuelto: {rdt.isToday ? `Hoy ${rdt.timeLabel}` : `${rdt.dateLabel}, ${rdt.timeLabel}`}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                {req.status === 'pendiente' && (
                  <button
                    onClick={() => handleStatusChange(req.id, 'en_proceso')}
                    className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-medium transition-colors"
                  >
                    Iniciar Proceso
                  </button>
                )}
                {req.status !== 'resuelto' && !req.resolvedAt && (
                  <button
                    onClick={() => handleStatusChange(req.id, 'resuelto')}
                    className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-xs font-medium transition-colors"
                  >
                    Marcar Resuelto
                  </button>
                )}
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={() => openEditModal(req)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    title="Editar solicitud"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
                {currentUser?.permissions?.canDeleteRecords && (
                  <button
                    onClick={() => setRequestToDelete(req)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                    title="Eliminar solicitud"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {requestToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">¿Eliminar Solicitud?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar permanentemente esta solicitud?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setRequestToDelete(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    deleteRequest(requestToDelete.id);
                    setRequestToDelete(null);
                  }}
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base">
                  {editingRequest ? 'Editar Solicitud' : 'Nueva Solicitud de Servicio'}
                </h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Título o Asunto *
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ej. Fuga de agua en lavabo o Aire acondicionado no enfría"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Ubicación / Área *
                    </label>
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="Ej. Habitación 302, Lobby, Cocina"
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                      required
                    />
                  </div>

                  <div className="relative" ref={categoryRef}>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Categoría
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsCategoryOpen(!isCategoryOpen)}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`p-1.5 rounded-lg ${selectedCategoryOption.bg} ${selectedCategoryOption.color}`}>
                          <selectedCategoryOption.icon className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-slate-700">{selectedCategoryOption.label}</span>
                      </div>
                      <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isCategoryOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isCategoryOpen && (
                      <div className="absolute z-10 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-lg py-2 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-2">
                        {categoryOptions.map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => {
                              setFormCategory(opt.value as any);
                              setIsCategoryOpen(false);
                            }}
                            className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors ${formCategory === opt.value ? 'bg-amber-50/50' : ''}`}
                          >
                            <div className={`p-1.5 rounded-lg ${opt.bg} ${opt.color}`}>
                              <opt.icon className="w-4 h-4" />
                            </div>
                            <span className={`text-sm ${formCategory === opt.value ? 'font-semibold text-amber-700' : 'font-medium text-slate-700'}`}>
                              {opt.label}
                            </span>
                            {formCategory === opt.value && (
                              <CheckCircle2 className="w-4 h-4 text-amber-600 ml-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                    Nivel de Prioridad
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { value: 'baja', label: 'Baja', icon: '🟢', colorClass: 'hover:border-slate-400 focus:border-slate-400', activeClass: 'border-slate-500 bg-slate-50 shadow-sm' },
                      { value: 'media', label: 'Media', icon: '🔵', colorClass: 'hover:border-blue-400 focus:border-blue-400', activeClass: 'border-blue-500 bg-blue-50 shadow-sm' },
                      { value: 'alta', label: 'Alta', icon: '⚡', colorClass: 'hover:border-orange-400 focus:border-orange-400', activeClass: 'border-orange-500 bg-orange-50 shadow-sm' },
                      { value: 'urgente', label: 'Urgente', icon: '🚨', colorClass: 'hover:border-rose-400 focus:border-rose-400', activeClass: 'border-rose-500 bg-rose-50 shadow-sm' }
                    ].map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setFormPriority(p.value as any)}
                        className={`px-4 py-3 border-2 rounded-xl text-sm font-semibold transition-all duration-200 flex flex-col items-center gap-1.5
                          ${formPriority === p.value 
                            ? p.activeClass 
                            : `border-slate-200 bg-white text-slate-600 ${p.colorClass}`
                          }`}
                      >
                        <span className="text-xl leading-none">{p.icon}</span>
                        <span>{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative" ref={areaRef}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      Área o Responsable Asignado *
                    </label>
                    <span className="text-[11px] text-slate-400 font-medium">Ej. Mantenimiento, Ferney Machado...</span>
                  </div>

                  {/* Quick Select Chips */}
                  <div className="flex flex-wrap items-center gap-1.5 mb-2">
                    <button
                      type="button"
                      onClick={() => setFormAssignedTo('Mantenimiento')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        formAssignedTo === 'Mantenimiento' 
                          ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/20' 
                          : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                      Mantenimiento
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormAssignedTo('Housekeeping')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        formAssignedTo === 'Housekeeping' 
                          ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/20' 
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Housekeeping
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormAssignedTo('Recepción')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        formAssignedTo === 'Recepción' 
                          ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/20' 
                          : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                      }`}
                    >
                      <Bell className="w-3.5 h-3.5" />
                      Recepción
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormAssignedTo('Administración')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        formAssignedTo === 'Administración' 
                          ? 'bg-blue-600 text-white shadow-sm ring-2 ring-blue-500/20' 
                          : 'bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      Administración
                    </button>
                  </div>

                  {/* Dropdown Toggle Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsAreaOpen(!isAreaOpen);
                      setAreaSearchTerm('');
                    }}
                    className={`w-full px-4 py-3 bg-slate-50 border ${
                      !formAssignedTo && formError 
                        ? 'border-rose-400 bg-rose-50/30 ring-2 ring-rose-500/20' 
                        : 'border-slate-200'
                    } rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors flex items-center justify-between shadow-xs`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={`w-6 h-6 rounded-lg ${!formAssignedTo && formError ? 'bg-rose-500/15 text-rose-600' : 'bg-amber-500/10 text-amber-600'} flex items-center justify-center`}>
                        <UserCheck className="w-3.5 h-3.5" />
                      </div>
                      <span className={formAssignedTo ? 'font-semibold text-slate-800' : (!formAssignedTo && formError ? 'text-rose-600 font-medium' : 'text-slate-500 font-normal')}>
                        {formAssignedTo || 'Seleccionar área o persona asignada... *'}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isAreaOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {!formAssignedTo && formError && (
                    <p className="text-xs text-rose-600 font-medium mt-1.5 flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>Debe seleccionar la persona o el área para enviar esta solicitud.</span>
                    </p>
                  )}

                  {/* Rich Dropdown Menu */}
                  {isAreaOpen && (
                    <div className="absolute z-20 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl py-2 max-h-80 overflow-y-auto animate-in fade-in slide-in-from-top-2 divide-y divide-slate-100">
                      {/* Search & Custom Input */}
                      <div className="p-2 sticky top-0 bg-white z-10">
                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                          <input
                            type="text"
                            value={areaSearchTerm}
                            onChange={(e) => setAreaSearchTerm(e.target.value)}
                            placeholder="Buscar o escribir nombre/área..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      </div>

                      {/* Custom typed option if user typed something */}
                      {areaSearchTerm.trim() && (
                        <div className="p-1">
                          <button
                            type="button"
                            onClick={() => {
                              setFormAssignedTo(areaSearchTerm.trim());
                              setIsAreaOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors flex items-center gap-2"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Asignar a: "<strong>{areaSearchTerm.trim()}</strong>"</span>
                          </button>
                        </div>
                      )}

                      {/* Section: Hotel Departments */}
                      <div className="p-2 space-y-1">
                        <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Building2 className="w-3 h-3" />
                          Departamentos y Áreas
                        </div>
                        {hotelDepartments
                          .filter(dept => 
                            !areaSearchTerm.trim() || 
                            dept.name.toLowerCase().includes(areaSearchTerm.toLowerCase()) || 
                            dept.desc.toLowerCase().includes(areaSearchTerm.toLowerCase())
                          )
                          .map((dept) => {
                            const isSelected = formAssignedTo === dept.name;
                            const IconComponent = dept.icon;
                            return (
                              <button
                                key={dept.id}
                                type="button"
                                onClick={() => {
                                  setFormAssignedTo(dept.name);
                                  setIsAreaOpen(false);
                                }}
                                className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition-colors ${
                                  isSelected ? 'bg-amber-50/80 text-amber-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className={`p-1.5 rounded-lg ${dept.color} shrink-0`}>
                                  <IconComponent className="w-4 h-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-xs font-bold truncate">{dept.name}</div>
                                  <div className="text-[11px] text-slate-400 font-normal truncate">{dept.desc}</div>
                                </div>
                                {isSelected && (
                                  <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                                )}
                              </button>
                            );
                          })}
                      </div>

                      {/* Section: Registered Users */}
                      {activeUsers.length > 0 && (
                        <div className="p-2 space-y-1 border-t border-slate-100">
                          <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5" />
                            Personal y Usuarios Registrados
                          </div>
                          {activeUsers
                            .filter(u => 
                              !areaSearchTerm.trim() || 
                              u.displayName.toLowerCase().includes(areaSearchTerm.toLowerCase()) || 
                              (u.department && u.department.toLowerCase().includes(areaSearchTerm.toLowerCase())) ||
                              u.role.toLowerCase().includes(areaSearchTerm.toLowerCase())
                            )
                            .map((u) => {
                              const isSelected = formAssignedTo === u.displayName;
                              return (
                                <button
                                  key={u.id}
                                  type="button"
                                  onClick={() => {
                                    setFormAssignedTo(u.displayName);
                                    setIsAreaOpen(false);
                                  }}
                                  className={`w-full text-left px-3 py-2 rounded-xl flex items-center gap-3 transition-colors ${
                                    isSelected ? 'bg-amber-50/80 text-amber-900 font-semibold' : 'hover:bg-slate-50 text-slate-700'
                                  }`}
                                >
                                  <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-200">
                                    {u.displayName.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold truncate">{u.displayName}</div>
                                    <div className="text-[11px] text-slate-400 font-normal truncate flex items-center gap-1">
                                      <span className="capitalize">{u.role}</span>
                                      {u.department && (
                                        <>
                                          <span>•</span>
                                          <span>{u.department}</span>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                  {isSelected && (
                                    <CheckCircle2 className="w-4 h-4 text-amber-600 shrink-0" />
                                  )}
                                </button>
                              );
                            })}
                        </div>
                      )}

                    </div>
                  )}
                </div>

                {/* Explicit Creation Date and Time */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      Fecha y Hora de la Solicitud *
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
                      {(() => {
                        const [h, m] = (formTime || '00:00').split(':').map(n => parseInt(n, 10) || 0);
                        return format12HourTime(h, m);
                      })()}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-[11px] text-slate-500 font-medium block mb-1">Fecha de Creación</span>
                      <input
                        type="date"
                        value={formDate}
                        onChange={(e) => setFormDate(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                        required
                      />
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 font-medium block mb-1">Hora Exacta</span>
                      <input
                        type="time"
                        value={formTime}
                        onChange={(e) => setFormTime(e.target.value)}
                        className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 font-medium"
                        required
                      />
                    </div>
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>Registro oficial: <strong>{formatRequestDateTime(`${formDate} ${formTime}`).fullFormatted}</strong></span>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Descripción o Detalles Adicionales
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={4}
                    placeholder="Describa detalladamente el inconveniente o servicio requerido..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors resize-none"
                  ></textarea>
                </div>
              </div>

              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span className="font-medium">{formError}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-xl text-sm shadow-sm transition-colors cursor-pointer"
                >
                  {editingRequest ? 'Guardar Cambios' : 'Enviar Solicitud'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

