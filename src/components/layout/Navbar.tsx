import React, { useState, useEffect } from 'react';
import { useMaintenance, isUserOwnRound } from '../../context/MaintenanceContext';
import { UpdateBell } from '../updates/UpdateBell';
import { NotificationBell } from '../notifications/NotificationBell';
import { SecurityShieldButton } from '../common/SecurityShieldButton';
import { 
  Shield, 
  Wrench, 
  Clock, 
  Building2, 
  KeyRound, 
  Activity, 
  CalendarCheck, 
  Settings, 
  Layers, 
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  ChevronRight,
  Gauge,
  Phone,
  Smartphone,
  Plus,
  AlertTriangle,
  Radio,
  FileSpreadsheet,
  Trash2,
  Users,
  ClipboardList,
  MessageSquare,
  Bell,
  BellOff,
  CheckSquare,
  Hotel,
  UserCheck,
  Check,
  LogOut,
  User as UserIcon,
  CalendarRange
} from 'lucide-react';
import { getHotelCurrentDateIso } from '../../utils/dateUtils';

export const Navbar: React.FC = () => {
  const { 
    selectedTab, 
    setSelectedTab, 
    settings,
    activeRound,
    inProgressRounds,
    notification,
    workOrders,
    equipments,
    incidents,
    requests,
    tasks,
    schedules,
    cronogramas,
    users,
    isCloudSynced,
    setIsIncidentModalOpen,
    currentUser,
    setCurrentUser,
    updateUser,
    notify,
    isSectionAllowed,
    isAdmin
  } = useMaintenance();

  const isJuanMateoAdmin = !currentUser || 
                           currentUser?.role === 'admin' || 
                           currentUser?.email?.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com' ||
                           currentUser?.displayName?.toLowerCase().includes('juan mateo') ||
                           currentUser?.id === 'usr-admin-master' ||
                           currentUser?.id === 'usr-1789230683226';

  const isUserAdmin = isJuanMateoAdmin || 
                      Boolean(currentUser?.permissions?.canManageUsers) || 
                      Boolean(currentUser?.permissions?.canEditSettings);

  const activeDisplayUser = currentUser || (users || []).find(u => 
    u.email?.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com' ||
    u.displayName?.toLowerCase().includes('juan mateo')
  ) || users?.[0] || null;

  const userAllowedRequests = isUserAdmin
    ? (requests || [])
    : (requests || []).filter(req => {
        if (!activeDisplayUser) return true;
        const currentName = (activeDisplayUser.displayName || activeDisplayUser.name || '').toLowerCase().trim();
        const currentEmail = (activeDisplayUser.email || '').toLowerCase().trim();
        const assigned = (req.assignedTo || '').toLowerCase().trim();
        const assignedEmail = (req.assignedToEmail || '').toLowerCase().trim();
        const reqBy = (req.requestedBy || '').toLowerCase().trim();
        const reqEmail = (req.requestedByEmail || '').toLowerCase().trim();

        const isAssigned = (assigned && currentName && assigned === currentName) ||
                           (assignedEmail && currentEmail && assignedEmail === currentEmail) ||
                           (currentName && assigned.includes(currentName)) ||
                           (currentName && currentName.includes(assigned) && assigned.length > 3);
        const isCreated = (reqBy && currentName && reqBy === currentName) ||
                          (reqEmail && currentEmail && reqEmail === currentEmail) ||
                          (reqBy && currentName && reqBy.includes(currentName));
        return isAssigned || isCreated;
      });

  const pendingRequestsCount = userAllowedRequests.filter(r => r.status === 'pendiente').length;
  const userAllowedTasks = isUserAdmin
    ? (tasks || [])
    : (tasks || []).filter(t => {
        if (!t) return false;
        if (!activeDisplayUser) return true;
        const currentName = (activeDisplayUser.displayName || activeDisplayUser.name || '').toLowerCase().trim();
        const assignedName = (t.assignedToName || '').toLowerCase().trim();
        const isAssigned = (t.assignedToId && t.assignedToId === activeDisplayUser.id) ||
                           (currentName && assignedName && (assignedName === currentName || assignedName.includes(currentName) || currentName.includes(assignedName))) ||
                           (t.createdById && t.createdById === activeDisplayUser.id);
        return isAssigned;
      });
  const pendingTasksCount = userAllowedTasks.filter(t => t.status !== 'completada').length;

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuModalOpen, setIsUserMenuModalOpen] = useState(false);
  const [isUserAdjustMode, setIsUserAdjustMode] = useState(false);
  const [adjustName, setAdjustName] = useState('');
  const [adjustDept, setAdjustDept] = useState('');
  const [adjustPhone, setAdjustPhone] = useState('');
  const [isSavingUserAdjust, setIsSavingUserAdjust] = useState(false);

  const getInitials = (name?: string) => {
    if (!name) return 'US';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  // Close sidebar on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const getShift = () => {
    const hours = new Date().getHours();
    if (hours >= 6 && hours < 15) return { label: 'Turno Mañana (06:00 - 15:00)', icon: '🌅' };
    if (hours >= 15 && hours < 21) return { label: 'Turno Tarde (15:00 - 21:00)', icon: '☀️' };
    return { label: 'Turno Noche (21:00 - 06:00)', icon: '🌙' };
  };

  const currentShift = getShift();
  const pendingOrdersCount = workOrders.filter(w => w.status !== 'completado').length;
  const pendingIncidentsCount = incidents.filter(w => w.status !== 'solucionado').length;

  const navigateTo = (tab: any) => {
    setSelectedTab(tab);
    setIsSidebarOpen(false);
  };

  const allTabs = [
    {
      id: 'dashboard',
      label: 'Panel General',
      drawerLabel: 'Panel General',
      icon: Activity,
      badge: null as any,
      color: 'text-blue-400',
      badgeColor: 'bg-blue-500/30 text-blue-200'
    },
    {
      id: 'rondas',
      label: 'Rondas Diarias',
      drawerLabel: 'Rondas Diarias de Turno',
      icon: Clock,
      badge: isSectionAllowed('rondas') 
        ? ((activeRound && (isAdmin || isUserOwnRound(activeRound, currentUser)))
            ? 'active' 
            : (isAdmin && inProgressRounds.length > 0
                ? `${inProgressRounds.length} en curso` 
                : null))
        : null,
      color: 'text-cyan-400',
      badgeColor: 'bg-amber-400 text-slate-950'
    },
    {
      id: 'contadores',
      label: 'Lectura de Contadores',
      drawerLabel: 'Lectura de Contadores',
      icon: Gauge,
      badge: null as any,
      color: 'text-cyan-400',
      badgeColor: 'bg-cyan-500/30 text-cyan-200'
    },
    {
      id: 'bombas',
      label: 'Equipos & Bombas',
      drawerLabel: 'Equipos & Bombas',
      icon: Layers,
      badge: equipments.length > 0 ? equipments.length : null,
      color: 'text-indigo-400',
      badgeColor: 'bg-slate-800 text-slate-400'
    },
    {
      id: 'hojas_vida',
      label: 'Hojas de Vida',
      drawerLabel: 'Hoja de Vida de Equipos',
      icon: FileSpreadsheet,
      badge: null as any,
      color: 'text-emerald-400',
      badgeColor: 'bg-emerald-500/30 text-emerald-200'
    },
    {
      id: 'incidencias',
      label: 'Inconvenientes en Vivo',
      drawerLabel: 'Inconvenientes en Vivo',
      icon: AlertTriangle,
      badge: pendingIncidentsCount > 0 ? pendingIncidentsCount : null,
      color: 'text-rose-400',
      badgeColor: 'bg-rose-500 text-white',
      activeColor: 'bg-rose-600 text-white'
    },
    {
      id: 'preventivo',
      label: 'Preventivo',
      drawerLabel: 'Mantenimiento Preventivo',
      icon: CalendarCheck,
      badge: pendingOrdersCount > 0 ? `${pendingOrdersCount} OTs` : null,
      color: 'text-emerald-400',
      badgeColor: 'bg-blue-500/30 text-blue-200'
    },
    {
      id: 'solicitudes',
      label: 'Solicitudes',
      drawerLabel: 'Solicitudes y Servicios',
      icon: ClipboardList,
      badge: pendingRequestsCount > 0 ? `${pendingRequestsCount} pend` : null,
      color: 'text-amber-400',
      badgeColor: 'bg-amber-500/30 text-amber-200'
    },
    {
      id: 'tareas',
      label: 'Tareas',
      drawerLabel: 'Tareas para compañeros',
      icon: CheckSquare,
      badge: pendingTasksCount > 0 ? `${pendingTasksCount} pend` : null,
      color: 'text-emerald-400',
      badgeColor: 'bg-emerald-500/30 text-emerald-200'
    },
    {
      id: 'cronograma',
      label: 'Cronogramas',
      drawerLabel: 'Cronogramas Maestros',
      icon: CalendarRange,
      badge: (cronogramas && cronogramas.length > 0) ? `${cronogramas.length}` : null,
      color: 'text-indigo-400',
      badgeColor: 'bg-indigo-500/30 text-indigo-200'
    },
    {
      id: 'horarios',
      label: 'Horarios Técnicos',
      drawerLabel: 'Horarios & Turnos Técnicos',
      icon: Clock,
      badge: (() => {
        if (!schedules || schedules.length === 0) return null;
        const todayIso = getHotelCurrentDateIso();
        
        let personnelIds = new Set(['pers-1', 'pers-2', 'pers-3', 'pers-4', 'pers-5']);
        try {
          const saved = localStorage.getItem('hotel_maint_schedule_personnel');
          if (saved) {
            const parsed = JSON.parse(saved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              personnelIds = new Set(parsed.map((p: any) => p.id));
            }
          }
        } catch {}

        // Sincronizado 1:1 con los turnos cargados del día en la matriz de horarios
        const todaySchedules = (schedules || []).filter(s => {
          if (!s || s.date !== todayIso) return false;
          return s.technicianId && personnelIds.has(s.technicianId);
        });

        const count = todaySchedules.length > 0 ? todaySchedules.length : personnelIds.size;
        return `${count} hoy`;
      })(),
      color: 'text-indigo-400',
      badgeColor: 'bg-indigo-500/30 text-indigo-200'
    },
    {
      id: 'usuarios',
      label: 'Creación de usuarios',
      drawerLabel: 'Creación de usuarios',
      icon: Users,
      badge: users.length > 0 ? users.length : null,
      color: 'text-purple-400',
      badgeColor: 'bg-purple-500/30 text-purple-200'
    },
    {
      id: 'configuraciones',
      label: 'Configuraciones & Ajustes',
      drawerLabel: 'Configuraciones & Ajustes',
      icon: Settings,
      badge: null as any,
      color: 'text-amber-400',
      badgeColor: 'bg-slate-800 text-slate-400'
    },
  ];

  // Tabs permitidas según la configuración del usuario
  const allowedTabs = allTabs.filter(t => isSectionAllowed(t.id));

  // 'hojas_vida' solo debe aparecer en el menú desplegable lateral izquierdo (sidebar drawer), no en la barra horizontal superior
  const horizontalTabs = allowedTabs.filter(t => t.id !== 'hojas_vida');

  return (
    <>
      <header id="app-header" className="bg-slate-900 text-slate-100 border-b border-slate-800 sticky top-0 z-40 shadow-sm">
        {/* Top bar with Menu Button, Hotel info and Admin toggle */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left side: Hamburger button + Brand and Hotel identity */}
            <div className="flex items-center space-x-3">
              {/* Botón de Menú Desplegable Izquierdo */}
              <button
                id="btn-open-sidebar-menu"
                type="button"
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 -ml-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                aria-label="Abrir menú de navegación lateral"
                title="Abrir menú principal"
              >
                <Menu className="w-6 h-6" />
              </button>

              {settings?.hotelInfo?.logoUrl || '/wake-bio-logo.jpg' ? (
                <img 
                  src={settings?.hotelInfo?.logoUrl || '/wake-bio-logo.jpg'} 
                  alt="Logo del Hotel" 
                  className="h-10 w-10 rounded-xl object-cover shrink-0 bg-slate-900 border border-slate-700 shadow-md shadow-slate-900/20"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = '/images/app_logo.jpg';
                  }}
                />
              ) : (
                <div className="h-10 w-10 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-center p-1 shadow-md shadow-cyan-950/40 shrink-0 overflow-hidden">
                  <img 
                    src="/images/app_logo.jpg" 
                    alt="Logo" 
                    className="w-full h-full object-contain rounded-lg" 
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/app-logo.svg';
                    }}
                  />
                </div>
              )}
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-base font-bold tracking-tight text-white line-clamp-1">
                    {settings?.hotelInfo?.hotelName && !settings.hotelInfo.hotelName.includes('Grand Horizon') ? settings.hotelInfo.hotelName : 'WAKE BIO HOTEL'}
                  </h1>
                  {settings?.hotelInfo?.propertyCode && settings.hotelInfo.propertyCode !== 'GHLR-041' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono hidden sm:inline-block">
                      {settings.hotelInfo.propertyCode}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <p className="text-xs text-slate-400 hidden sm:block">
                    Dpto. de Mantenimiento & Sala de Bombas
                  </p>
                  <span 
                    className={`inline-flex items-center space-x-1 text-[11px] font-medium sm:hidden ${
                      isCloudSynced ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    <Radio className="w-2.5 h-2.5 animate-pulse" />
                    <span>{isCloudSynced ? 'En vivo' : 'Conectando...'}</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Center Status Indicators */}
            <div className="hidden lg:flex items-center space-x-3 text-xs">
              {/* Real-time Cloud Badge */}
              <div 
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-full border ${
                  isCloudSynced 
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30' 
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
                title="Sincronización en la nube con todos los compañeros"
              >
                <Radio className={`w-3.5 h-3.5 ${isCloudSynced ? 'text-emerald-400 animate-pulse' : 'text-amber-400'}`} />
                <span>{isCloudSynced ? 'En Línea • Tiempo Real' : 'Modo Local'}</span>
              </div>

              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700/60">
                <span>{currentShift.icon}</span>
                <span>{currentShift.label}</span>
              </div>
              {isSectionAllowed('rondas') && (
                (activeRound && (isAdmin || isUserOwnRound(activeRound, currentUser))) ? (
                  <div 
                    onClick={() => navigateTo('rondas')}
                    className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse cursor-pointer hover:bg-amber-500/20 transition-colors"
                  >
                    <Activity className="w-3.5 h-3.5" />
                    <span>Ronda en Proceso ({activeRound.compliancePercentage}%)</span>
                  </div>
                ) : (isAdmin && inProgressRounds.length > 0) ? (
                  <div 
                    onClick={() => navigateTo('rondas')}
                    className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30 animate-pulse cursor-pointer hover:bg-amber-500/20 transition-colors"
                    title={`Ronda en proceso: ${inProgressRounds.map(r => `${r.technicianName} (Turno ${r.shift === 'manana' ? 'Mañana' : (r.shift ? r.shift.charAt(0).toUpperCase() + r.shift.slice(1) : '')})`).join(', ')}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping mr-0.5" />
                    <Activity className="w-3.5 h-3.5" />
                    <span>
                      {inProgressRounds.length === 1 
                        ? `Ronda en Proceso: ${inProgressRounds[0].technicianName}`
                        : `${inProgressRounds.length} Rondas en Proceso`}
                    </span>
                  </div>
                ) : null
              )}
            </div>

            {/* Quick Actions */}
            <div className="flex items-center space-x-2 sm:space-x-3">
              {/* Notificaciones del Sistema, Escudo de Seguridad y Actualizaciones */}
              <SecurityShieldButton />
              <NotificationBell />
              <UpdateBell />

              {currentUser && (
                <div className="hidden md:flex items-center space-x-2 px-3 py-1 rounded-xl bg-slate-800 border border-slate-700 text-xs">
                  <span className="font-bold text-white">{currentUser.displayName}</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600 text-white font-mono uppercase">
                    {currentUser.role === 'técnico' ? 'Mantenimiento' : currentUser.role === 'ayb' ? 'A & B' : currentUser.role === 'admin' ? 'Administrador' : currentUser.role === 'sastra' ? 'Sastra' : currentUser.role === 'cocina' ? 'Cocina' : currentUser.role}
                  </span>
                  <button onClick={() => setCurrentUser(null)} className="text-slate-400 hover:text-rose-400 ml-1 font-semibold cursor-pointer" title="Cerrar sesión">Salir</button>
                </div>
              )}
              {/* Botón rápido para Reportar Inconveniente desde cualquier pantalla si tiene acceso */}
              {isSectionAllowed('incidencias') && (
                <button
                  id="btn-quick-report-incident"
                  onClick={() => setIsIncidentModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-sm shadow-rose-600/30 transition-all cursor-pointer"
                  title="Cargar y compartir un inconveniente con todos los compañeros"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">+ Inconveniente</span>
                  <span className="sm:hidden">+ Falla</span>
                </button>
              )}
            </div>
          </div>

          {/* Navigation Tabs (Filtered strictly by user permissions and visibleSections, excluding hojas_vida) */}
          <nav className="flex space-x-1 border-t border-slate-800/80 overflow-x-auto py-2 no-scrollbar" aria-label="Tabs">
            {horizontalTabs.map(tab => {
              const Icon = tab.icon;
              const isSelected = selectedTab === tab.id;
              return (
                <button
                  key={tab.id}
                  id={`tab-${tab.id}`}
                  onClick={() => setSelectedTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-colors relative cursor-pointer ${
                    isSelected
                      ? (tab.activeColor || 'bg-blue-600 text-white shadow-sm')
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : tab.color}`} />
                  <span>{tab.label}</span>
                  {tab.id === 'rondas' && tab.badge ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-sm border border-yellow-200 ring-2 ring-amber-400/60 animate-pulse">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-950"></span>
                      </span>
                      <span>{tab.badge === 'active' ? 'En curso' : tab.badge}</span>
                    </span>
                  ) : tab.badge === 'active' ? (
                    <span className="w-2 h-2 rounded-full bg-amber-400 ring-2 ring-slate-900 animate-pulse" />
                  ) : typeof tab.badge === 'number' && tab.badge > 0 ? (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${tab.badgeColor}`}>
                      {tab.badge}
                    </span>
                  ) : typeof tab.badge === 'string' ? (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${tab.badgeColor}`}>
                      {tab.badge}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* MENÚ DESPLEGABLE DE LA PARTE IZQUIERDA (SIDEBAR DRAWER) */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop con oscurecimiento suave */}
          <div 
            className="fixed inset-0 bg-slate-950/75 transition-opacity duration-200"
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />

          {/* Panel Lateral Desplegable */}
          <div 
            id="sidebar-drawer-menu"
            className="relative w-80 max-w-[85vw] bg-slate-900 text-slate-100 h-full shadow-2xl flex flex-col z-10 border-r border-slate-800 transform transition-transform duration-300 ease-in-out"
          >
            {/* Cabecera del Menú Lateral */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
              <div className="flex items-center space-x-3">
                {settings?.hotelInfo?.logoUrl || '/wake-bio-logo.jpg' ? (
                  <img 
                    src={settings?.hotelInfo?.logoUrl || '/wake-bio-logo.jpg'} 
                    alt="Logo del Hotel" 
                    className="h-9 w-9 rounded-xl object-cover shrink-0 bg-slate-900 border border-slate-700 shadow-md"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = '/images/app_logo.jpg';
                    }}
                  />
                ) : (
                  <div className="h-9 w-9 rounded-xl bg-slate-900/90 border border-cyan-500/30 flex items-center justify-center p-1 shadow-md shrink-0 overflow-hidden">
                    <img 
                      src="/images/app_logo.jpg" 
                      alt="Logo" 
                      className="w-full h-full object-contain rounded-lg" 
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = '/app-logo.svg';
                      }}
                    />
                  </div>
                )}
                <div>
                  <h2 className="text-sm font-bold text-white leading-tight">
                    {settings?.hotelInfo?.hotelName && !settings.hotelInfo.hotelName.includes('Grand Horizon') ? settings.hotelInfo.hotelName : 'WAKE BIO HOTEL'}
                  </h2>
                  <p className="text-[11px] text-slate-400 font-mono">
                    {settings?.hotelInfo?.propertyCode && settings.hotelInfo.propertyCode !== 'GHLR-041' ? `${settings.hotelInfo.propertyCode} • ` : ''}Mant. Hotel
                  </p>
                </div>
              </div>

              <button
                id="btn-close-sidebar-menu"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                aria-label="Cerrar menú lateral"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Lista Principal de Secciones Filtrada */}
            <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Navegación Asignada
              </p>

              {allowedTabs.map(tab => {
                const Icon = tab.icon;
                const isSelected = selectedTab === tab.id;
                const isRondaWithProgress = tab.id === 'rondas' && Boolean(tab.badge);
                return (
                  <button
                    key={`drawer-${tab.id}`}
                    id={`drawer-nav-${tab.id}`}
                    onClick={() => navigateTo(tab.id as any)}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? (tab.activeColor || 'bg-blue-600 text-white shadow-sm')
                        : isRondaWithProgress
                          ? 'text-amber-100 bg-amber-500/15 border border-amber-400/50 hover:bg-amber-500/25 shadow-sm shadow-amber-500/10'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : isRondaWithProgress ? 'text-amber-400 animate-pulse' : tab.color}`} />
                      <span className={isRondaWithProgress && !isSelected ? 'font-bold text-white tracking-tight' : ''}>
                        {tab.drawerLabel || tab.label}
                      </span>
                    </div>
                    {isRondaWithProgress ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-slate-950 shadow-md shadow-amber-500/50 border border-yellow-200 ring-2 ring-amber-400/60 animate-pulse">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-950 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-950"></span>
                        </span>
                        <span>{tab.badge === 'active' ? 'En curso' : tab.badge}</span>
                      </span>
                    ) : tab.badge === 'active' ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-400 text-slate-950 font-bold animate-pulse">
                        En curso
                      </span>
                    ) : tab.badge ? (
                      <span className={`text-[11px] font-mono px-2 py-0.5 rounded-md ${
                        typeof tab.badge === 'number' && tab.id === 'incidencias' 
                          ? 'bg-rose-500 text-white font-bold animate-pulse' 
                          : 'text-slate-400 bg-slate-800'
                      }`}>
                        {tab.badge}
                      </span>
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Pie del Menú Lateral: Perfil de Usuario Activo */}
            <div className="p-3.5 border-t border-slate-800 bg-slate-950/90 space-y-2.5">
              <div 
                onClick={() => {
                  const target = activeDisplayUser;
                  if (target) {
                    setAdjustName(target.displayName || '');
                    setAdjustDept(target.department || 'Mantenimiento & Ingeniería');
                    setAdjustPhone(target.phone || '');
                  }
                  setIsUserAdjustMode(false);
                  setIsUserMenuModalOpen(true);
                }}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 transition-all flex items-center justify-between gap-2.5 shadow-sm cursor-pointer group"
                title="Toca para ver opciones de usuario y cerrar sesión"
              >
                <div className="flex items-center space-x-2.5 min-w-0 flex-1 text-left">
                  <div className="relative shrink-0">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center font-bold text-xs shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                      {getInitials(activeDisplayUser?.displayName)}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full" title="Usuario activo"></span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center space-x-1">
                      <h4 className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                        {activeDisplayUser?.displayName || 'Juan Mateo Ramos'}
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-400 truncate">
                      <span className="text-blue-400 font-medium capitalize">{activeDisplayUser?.role || 'Técnico'}</span> • {activeDisplayUser?.department || 'Mantenimiento & Ingeniería'}
                    </p>
                  </div>
                </div>

                <div className="p-2 text-slate-400 group-hover:text-white rounded-lg transition-colors shrink-0">
                  <Settings className="w-4 h-4 text-slate-400 group-hover:text-amber-400 transition-colors" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mini Ventana de Usuario (Cerrar Sesión & Ajustes Rápidos) */}
      {isUserMenuModalOpen && (
        <div className="fixed inset-0 z-[99999] bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-5 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200 text-left">
            {/* Cabecera del Usuario */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 text-white flex items-center justify-center font-bold text-sm shadow-md shadow-blue-500/30 shrink-0">
                  {getInitials(activeDisplayUser?.displayName)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-bold text-white truncate">
                    {activeDisplayUser?.displayName || 'Usuario'}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">
                    <span className="text-blue-400 font-medium capitalize">{activeDisplayUser?.role || 'Técnico'}</span> • {activeDisplayUser?.department || 'Mantenimiento'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsUserMenuModalOpen(false);
                  setIsUserAdjustMode(false);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Opciones de la Ventanita */}
            {!isUserAdjustMode ? (
              <div className="space-y-2.5">
                {/* Botón Principal: Cerrar Sesión */}
                <button
                  type="button"
                  onClick={() => {
                    const userName = activeDisplayUser?.displayName || 'este usuario';
                    setCurrentUser(null);
                    localStorage.removeItem('hotel_maint_current_user');
                    sessionStorage.removeItem('hotel_maint_current_user');
                    setIsUserMenuModalOpen(false);
                    setIsSidebarOpen(false);
                    notify(`👋 Sesión cerrada de ${userName}`);
                  }}
                  className="w-full py-2.5 px-3.5 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 hover:text-rose-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm active:scale-98"
                >
                  <LogOut className="w-4 h-4 text-rose-400" />
                  <span>Cerrar la sesión de este usuario</span>
                </button>

                {/* Botón Secundario: Ajustes de Perfil */}
                <button
                  type="button"
                  onClick={() => {
                    const target = activeDisplayUser;
                    if (target) {
                      setAdjustName(target.displayName || '');
                      setAdjustDept(target.department || 'Mantenimiento & Ingeniería');
                      setAdjustPhone(target.phone || '');
                    }
                    setIsUserAdjustMode(true);
                  }}
                  className="w-full py-2 px-3.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Settings className="w-3.5 h-3.5 text-amber-400" />
                  <span>Ajustes rápidos de este usuario</span>
                </button>

                {/* Botón: Compartir enlace a otro teléfono (Pide su propio usuario) */}
                <button
                  type="button"
                  onClick={async () => {
                    const shareUrl = `${window.location.origin}/?solicitar_usuario=1`;
                    try {
                      if (navigator.share) {
                        await navigator.share({
                          title: settings?.hotelInfo?.hotelName || 'Sistema de Mantenimiento',
                          text: 'Ingresa con tu usuario personal al sistema de mantenimiento:',
                          url: shareUrl
                        });
                      } else {
                        await navigator.clipboard.writeText(shareUrl);
                      }
                      notify('📋 Enlace copiado. Al abrirlo en otro teléfono pedirá usuario automáticamente.');
                    } catch {
                      try {
                        await navigator.clipboard.writeText(shareUrl);
                        notify('📋 Enlace copiado. Al abrirlo en otro teléfono pedirá usuario automáticamente.');
                      } catch {}
                    }
                    setIsUserMenuModalOpen(false);
                  }}
                  className="w-full py-2 px-3.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:text-indigo-200 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
                >
                  <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Compartir Link para otro Teléfono (Pide Usuario)</span>
                </button>

                {/* Lista rápida de cambio de usuario: ÚNICA Y EXCLUSIVAMENTE para Juan Mateo / Administrador */}
                {isJuanMateoAdmin && (users || []).length > 1 && (
                  <div className="pt-2 border-t border-slate-800">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 px-1">
                      Cambiar a otro usuario:
                    </p>
                    <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                      {(users || [])
                        .filter(u => u.id !== activeDisplayUser?.id)
                        .map(u => (
                          <button
                            key={u.id}
                            type="button"
                            onClick={() => {
                              setCurrentUser(u);
                              notify(`👤 Sesión cambiada a: ${u.displayName}`);
                              setIsUserMenuModalOpen(false);
                              setIsSidebarOpen(false);
                            }}
                            className="w-full p-1.5 rounded-lg bg-slate-800/60 hover:bg-blue-600/20 hover:border-blue-500/30 border border-transparent flex items-center justify-between text-left transition-colors cursor-pointer"
                          >
                            <div className="flex items-center space-x-2 min-w-0">
                              <div className="w-6 h-6 rounded-lg bg-slate-700 text-slate-200 flex items-center justify-center font-bold text-[10px] shrink-0">
                                {getInitials(u.displayName)}
                              </div>
                              <span className="text-xs text-slate-200 truncate">{u.displayName}</span>
                            </div>
                            <span className="text-[10px] text-blue-400 font-medium capitalize shrink-0 ml-1">{u.role}</span>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Formulario de Ajustes Rápidos */
              <div className="space-y-3 animate-in fade-in duration-150">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Nombre Completo</label>
                  <input
                    type="text"
                    value={adjustName}
                    onChange={(e) => setAdjustName(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Departamento / Cargo</label>
                  <input
                    type="text"
                    value={adjustDept}
                    onChange={(e) => setAdjustDept(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Teléfono / Celular</label>
                  <input
                    type="text"
                    value={adjustPhone}
                    onChange={(e) => setAdjustPhone(e.target.value)}
                    placeholder="Ej: 3127551592"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsUserAdjustMode(false)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                  >
                    Volver
                  </button>
                  <button
                    type="button"
                    disabled={isSavingUserAdjust || !adjustName.trim()}
                    onClick={async () => {
                      const target = activeDisplayUser;
                      if (!target) return;
                      setIsSavingUserAdjust(true);
                      try {
                        await updateUser(target.id, {
                          displayName: adjustName.trim(),
                          department: adjustDept.trim(),
                          phone: adjustPhone.trim()
                        });
                        if (currentUser && currentUser.id === target.id) {
                          setCurrentUser({
                            ...currentUser,
                            displayName: adjustName.trim(),
                            department: adjustDept.trim(),
                            phone: adjustPhone.trim()
                          });
                        }
                        notify('✅ Ajustes de usuario guardados correctamente');
                        setIsUserAdjustMode(false);
                      } catch (err) {
                        console.error('Error guardando ajustes de usuario:', err);
                      } finally {
                        setIsSavingUserAdjust(false);
                      }
                    }}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-600/30 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSavingUserAdjust ? 'Guardando...' : 'Guardar'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Toast Notification */}
      {notification && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 sm:top-auto sm:bottom-6 sm:right-6 sm:left-auto sm:translate-x-0 z-[99999] flex items-center space-x-3 bg-slate-900/95 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700 backdrop-blur-md max-w-[90vw] sm:max-w-md animate-in fade-in slide-in-from-top-4 sm:slide-in-from-bottom-4 duration-300">
          {notification.toLowerCase().includes('elimina') ? (
            <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg shrink-0">
              <Trash2 className="w-4 h-4" />
            </div>
          ) : notification.toLowerCase().includes('💬') || notification.toLowerCase().includes('solicitud') ? (
            <div className="p-1.5 bg-blue-500/20 text-blue-400 rounded-lg shrink-0">
              <MessageSquare className="w-4 h-4" />
            </div>
          ) : notification.toLowerCase().includes('nuevo') || notification.toLowerCase().includes('alerta') || notification.toLowerCase().includes('🚨') ? (
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded-lg shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
          ) : (
            <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}
          <p className="text-sm font-semibold tracking-wide text-slate-100">{notification}</p>
        </div>
      )}
    </>
  );
};
