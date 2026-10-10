import React, { useState } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { User, UserRole, UserPermissions } from '../../types';
import { 
  Users, 
  Plus, 
  PlusCircle,
  Trash2, 
  Edit, 
  Check, 
  X, 
  Shield, 
  UserCheck, 
  Mail, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Power, 
  Clock, 
  Layers, 
  FileSpreadsheet, 
  AlertTriangle, 
  CalendarCheck, 
  Settings, 
  Lock,
  Search,
  KeyRound,
  Eye,
  EyeOff,
  Server,
  Cloud,
  Bell,
  ClipboardList,
  CheckSquare,
  CalendarRange,
  Gauge
} from 'lucide-react';

const AVAILABLE_MODULES = [
  { id: 'dashboard', label: 'Panel General', icon: Layers, desc: 'Métricas e indicadores globales' },
  { id: 'rondas', label: 'Rondas Diarias', icon: Clock, desc: 'Toma de lecturas e inspecciones' },
  { id: 'contadores', label: 'Lectura de Contadores', icon: Gauge, desc: 'Control de agua, energía eléctrica y gas' },
  { id: 'bombas', label: 'Equipos & Bombas', icon: Layers, desc: 'Inventario y bitácora técnica' },
  { id: 'hojas_vida', label: 'Hojas de Vida', icon: FileSpreadsheet, desc: 'Historial y documentación' },
  { id: 'incidencias', label: 'Inconvenientes en Vivo', icon: AlertTriangle, desc: 'Reportes y alertas inmediatas' },
  { id: 'preventivo', label: 'Mantenimiento Preventivo', icon: CalendarCheck, desc: 'Planes y órdenes de trabajo' },
  { id: 'solicitudes', label: 'Solicitudes', icon: ClipboardList, desc: 'Solicitudes y reportes de servicios del hotel' },
  { id: 'tareas', label: 'Tareas para compañeros', icon: CheckSquare, desc: 'Gestión y asignación de tareas operativas' },
  { id: 'cronograma', label: 'Cronogramas Maestros', icon: CalendarRange, desc: 'Planificación anual, proyectos y paradas técnicas' },
  { id: 'horarios', label: 'Horarios & Turnos Técnicos', icon: Calendar, desc: 'Turnos, cuadrantes y horarios del personal' },
  { id: 'usuarios', label: 'Creación de usuarios', icon: Users, desc: 'Gestión y creación de personal' },
  { id: 'configuraciones', label: 'Configuraciones & Ajustes', icon: Settings, desc: 'Ajustes del sistema y umbrales' },
];

export const UsersView: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, isCloudSynced, currentUser, canManageUsers, notify } = useMaintenance();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | UserRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [formRole, setFormRole] = useState<UserRole>('técnico');
  const [formDepartment, setFormDepartment] = useState('');
  const [formSections, setFormSections] = useState<string[]>([
    'dashboard', 'rondas', 'bombas', 'hojas_vida', 'incidencias', 'preventivo'
  ]);
  const [formPermissions, setFormPermissions] = useState<UserPermissions>({
    canEditSettings: false,
    canDeleteRecords: false,
    canManageUsers: false,
    canStartRounds: true,
    notifyRoundInProgress: false
  });
  const [formStatus, setFormStatus] = useState<'active' | 'inactive'>('active');
  const [formError, setFormError] = useState('');

  // Role labels
  const roleDisplay: Record<UserRole, { label: string; bg: string; text: string; border: string }> = {
    admin: { label: 'Administrador', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    técnico: { label: 'Mantenimiento', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    housekeeping: { label: 'Housekeeping', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' },
    ayb: { label: 'A & B', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    sastra: { label: 'Sastra', bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200' },
    cocina: { label: 'Cocina', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' }
  };

  const openCreateModal = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setShowPasswordModal(false);
    setFormRole('técnico');
    setFormDepartment('');
    setFormSections(['dashboard', 'rondas', 'bombas', 'hojas_vida', 'incidencias', 'preventivo']);
    setFormPermissions({
      canEditSettings: false,
      canDeleteRecords: false,
      canManageUsers: false,
      canStartRounds: true,
      notifyRoundInProgress: false,
      notifyRounds: false,
      notifyRequests: true,
      notifyTasks: true,
      notifyIncidents: true
    });
    setFormStatus('active');
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setFormName(user.displayName);
    setFormEmail(user.email);
    setFormPassword(user.password || '123456');
    setShowPasswordModal(false);
    setFormRole(user.role);
    setFormDepartment(user.department || '');

    // Normalize any legacy section IDs in visibleSections
    const rawSections = user.visibleSections || (user.role === 'admin'
      ? AVAILABLE_MODULES.map(m => m.id)
      : user.role === 'housekeeping'
        ? ['dashboard', 'rondas', 'incidencias']
        : ['dashboard', 'rondas', 'bombas', 'hojas_vida', 'incidencias', 'preventivo']);

    const normalizedSections = Array.from(new Set(rawSections.map(s => {
      if (s === 'equipos') return 'bombas';
      if (s === 'preventivos') return 'preventivo';
      if (s === 'hojasvida') return 'hojas_vida';
      if (s === 'ajustes' || s === 'settings') return 'configuraciones';
      return s;
    })));

    setFormSections(normalizedSections);
    setFormPermissions({
      canEditSettings: !!user.permissions?.canEditSettings,
      canDeleteRecords: !!user.permissions?.canDeleteRecords,
      canManageUsers: !!user.permissions?.canManageUsers,
      canStartRounds: user.permissions?.canStartRounds !== undefined
        ? !!user.permissions.canStartRounds
        : (user.canStartRounds !== undefined ? !!user.canStartRounds : (user.role === 'técnico' || (user.role === 'admin' && user.id !== 'usr-1790639954575-671'))),
      notifyRoundInProgress: user.permissions?.notifyRoundInProgress !== undefined 
        ? !!user.permissions.notifyRoundInProgress 
        : (user.notifyRoundInProgress !== undefined ? !!user.notifyRoundInProgress : (user.role === 'admin')),
      notifyRounds: user.permissions?.notifyRounds !== undefined
        ? !!user.permissions.notifyRounds
        : (user.notifyRounds !== undefined ? !!user.notifyRounds : user.role === 'admin'),
      notifyRequests: user.permissions?.notifyRequests !== undefined
        ? !!user.permissions.notifyRequests
        : (user.notifyRequests !== undefined ? !!user.notifyRequests : true),
      notifyTasks: user.permissions?.notifyTasks !== undefined
        ? !!user.permissions.notifyTasks
        : (user.notifyTasks !== undefined ? !!user.notifyTasks : true),
      notifyIncidents: user.permissions?.notifyIncidents !== undefined
        ? !!user.permissions.notifyIncidents
        : (user.notifyIncidents !== undefined ? !!user.notifyIncidents : true)
    });
    setFormStatus(user.status);
    setFormError('');
    setIsCreateModalOpen(true);
  };

  const handleRoleChange = (role: UserRole) => {
    setFormRole(role);
    if (role === 'admin') {
      setFormSections(AVAILABLE_MODULES.map(m => m.id));
      setFormPermissions({
        canEditSettings: true,
        canDeleteRecords: true,
        canManageUsers: true,
        canStartRounds: true,
        notifyRoundInProgress: true,
        notifyRounds: true,
        notifyRequests: true,
        notifyTasks: true,
        notifyIncidents: true
      });
    } else if (role === 'técnico') {
      setFormSections(['dashboard', 'rondas', 'bombas', 'hojas_vida', 'incidencias', 'preventivo', 'solicitudes', 'tareas', 'horarios', 'cronograma']);
      setFormPermissions({
        canEditSettings: false,
        canDeleteRecords: false,
        canManageUsers: false,
        canStartRounds: true,
        notifyRoundInProgress: false,
        notifyRounds: false,
        notifyRequests: true,
        notifyTasks: true,
        notifyIncidents: true
      });
    } else if (role === 'housekeeping') {
      setFormSections(['dashboard', 'rondas', 'incidencias', 'solicitudes', 'tareas']);
      setFormPermissions({
        canEditSettings: false,
        canDeleteRecords: false,
        canManageUsers: false,
        canStartRounds: false,
        notifyRoundInProgress: false,
        notifyRounds: false,
        notifyRequests: true,
        notifyTasks: true,
        notifyIncidents: true
      });
    } else {
      setFormSections(['dashboard', 'rondas', 'bombas', 'hojas_vida', 'incidencias', 'solicitudes', 'tareas']);
      setFormPermissions({
        canEditSettings: false,
        canDeleteRecords: false,
        canManageUsers: false,
        canStartRounds: false,
        notifyRoundInProgress: false,
        notifyRounds: false,
        notifyRequests: true,
        notifyTasks: true,
        notifyIncidents: true
      });
    }
  };

  const toggleSection = (sectionId: string) => {
    setFormSections(prev => {
      const willInclude = !prev.includes(sectionId);
      const nextSections = willInclude ? [...prev, sectionId] : prev.filter(id => id !== sectionId);

      // Sincronizar automáticamente permisos especiales si se selecciona o deselecciona un módulo crítico
      if (sectionId === 'configuraciones') {
        setFormPermissions(p => ({ ...p, canEditSettings: willInclude }));
      }
      if (sectionId === 'usuarios') {
        setFormPermissions(p => ({ ...p, canManageUsers: willInclude }));
      }

      return nextSections;
    });
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const trimmedName = formName.trim();
    const trimmedEmail = (formEmail.trim() || `${trimmedName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString().slice(-4)}@hotel.com`).toLowerCase();

    if (!trimmedName) {
      setFormError('Por favor ingresa el nombre completo del usuario.');
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setFormError('Por favor ingresa un correo electrónico válido.');
      return;
    }

    // Check email uniqueness only if different user
    if (editingUser) {
      const existsEmail = users.some(u => u.id !== editingUser.id && u.email?.toLowerCase().trim() === trimmedEmail);
      if (existsEmail) {
        setFormError('Ya existe otro usuario registrado con este correo electrónico.');
        return;
      }
    }

    // Preservar exactamente las configuraciones y permisos asignados por el administrador
    const trimmedPassword = formPassword.trim() || (editingUser?.password ? editingUser.password : '123456');

    if (!trimmedPassword) {
      setFormError('Por favor ingresa una contraseña de acceso para este usuario.');
      return;
    }

    const finalPermissions: UserPermissions = {
      canEditSettings: Boolean(formPermissions.canEditSettings),
      canDeleteRecords: Boolean(formPermissions.canDeleteRecords),
      canManageUsers: Boolean(formPermissions.canManageUsers),
      canStartRounds: formPermissions.canStartRounds !== undefined ? Boolean(formPermissions.canStartRounds) : (formRole === 'técnico'),
      notifyRoundInProgress: Boolean(formPermissions.notifyRoundInProgress),
      notifyRounds: formPermissions.notifyRounds !== undefined ? Boolean(formPermissions.notifyRounds) : (formRole === 'admin'),
      notifyRequests: formPermissions.notifyRequests !== undefined ? Boolean(formPermissions.notifyRequests) : true,
      notifyTasks: formPermissions.notifyTasks !== undefined ? Boolean(formPermissions.notifyTasks) : true,
      notifyIncidents: formPermissions.notifyIncidents !== undefined ? Boolean(formPermissions.notifyIncidents) : true
    };

    const finalSections = [...formSections];

    if (!editingUser) {
      await addUser({
        displayName: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
        role: formRole,
        department: formDepartment.trim(),
        visibleSections: finalSections,
        permissions: finalPermissions,
        canStartRounds: finalPermissions.canStartRounds,
        notifyRoundInProgress: finalPermissions.notifyRoundInProgress,
        notifyRounds: finalPermissions.notifyRounds,
        notifyRequests: finalPermissions.notifyRequests,
        notifyTasks: finalPermissions.notifyTasks,
        notifyIncidents: finalPermissions.notifyIncidents,
        status: formStatus
      });
    } else {
      // Editing existing user
      const updateData: Partial<User> = {
        displayName: trimmedName,
        email: trimmedEmail,
        password: trimmedPassword,
        role: formRole,
        department: formDepartment.trim(),
        visibleSections: finalSections,
        permissions: finalPermissions,
        canStartRounds: finalPermissions.canStartRounds,
        notifyRoundInProgress: finalPermissions.notifyRoundInProgress,
        notifyRounds: finalPermissions.notifyRounds,
        notifyRequests: finalPermissions.notifyRequests,
        notifyTasks: finalPermissions.notifyTasks,
        notifyIncidents: finalPermissions.notifyIncidents,
        status: formStatus
      };

      await updateUser(editingUser.id, updateData);
    }

    setIsCreateModalOpen(false);
  };

  const handleDelete = async (user: User) => {
    if (currentUser && (user.id === currentUser.id || user.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim())) {
      notify('⚠️ No puedes eliminar tu propia cuenta en sesión activa.');
      return;
    }

    setUserToDelete(user);
  };

  const confirmDelete = async () => {
    if (userToDelete) {
      const id = userToDelete.id;
      setUserToDelete(null); // Close modal immediately
      await deleteUser(id);
    }
  };

  const toggleUserActiveStatus = async (user: User) => {
    if (currentUser && (user.id === currentUser.id || user.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim())) {
      notify('⚠️ No puedes desactivar tu propia cuenta en sesión activa.');
      return;
    }
    const newStatus = user.status === 'active' ? 'inactive' : 'active';
    await updateUser(user.id, { status: newStatus });
  };

  // Helper para verificar el estado de conexión en vivo del usuario
  const checkIsUserOnline = (u: User): { isOnline: boolean; label: string; timeText: string } => {
    const isMe = currentUser && (u.id === currentUser.id || (u.email && u.email.toLowerCase().trim() === currentUser.email?.toLowerCase().trim()));
    if (isMe) {
      return { isOnline: true, label: 'En línea (Tu sesión actual)', timeText: 'Activo ahora' };
    }

    if (!u.lastSeenAt) {
      return { isOnline: false, label: 'Desconectado', timeText: 'Sin conexión reciente' };
    }

    const lastTime = new Date(u.lastSeenAt).getTime();
    if (isNaN(lastTime)) {
      return { isOnline: false, label: 'Desconectado', timeText: 'Sin conexión' };
    }

    const diffMs = Date.now() - lastTime;
    const diffMins = Math.floor(diffMs / 60000);

    if (u.isOnline !== false && diffMs < 90000) { // Menos de 90 segundos
      return { isOnline: true, label: 'En línea ahora', timeText: 'Conectado en la app' };
    }

    if (diffMins < 1) {
      return { isOnline: false, label: 'Desconectado', timeText: 'Hace 1 min' };
    } else if (diffMins < 60) {
      return { isOnline: false, label: 'Desconectado', timeText: `Hace ${diffMins} min` };
    } else {
      const hours = Math.floor(diffMins / 60);
      return { isOnline: false, label: 'Desconectado', timeText: `Hace ${hours} h` };
    }
  };

  const totalUsers = users.length;
  const onlineUsersCount = users.filter(u => checkIsUserOnline(u).isOnline).length;
  const offlineUsersCount = totalUsers - onlineUsersCount;
  const adminUsers = users.filter(u => u.role === 'admin').length;
  const techUsers = users.filter(u => u.role === 'técnico').length;
  const activeUsers = users.filter(u => u.status === 'active').length;

  // Filtered users
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const isOnline = checkIsUserOnline(user).isOnline;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'online' && isOnline) || 
      (statusFilter === 'offline' && !isOnline);
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Title */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start sm:items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                Creación de usuarios
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                {totalUsers} Registrados
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Crea nuevos usuarios, asigna roles, define módulos visibles y monitorea quién está conectado en la aplicación en tiempo real.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-bold">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span>{onlineUsersCount} {onlineUsersCount === 1 ? 'Usuario Conectado' : 'Usuarios Conectados'}</span>
          </div>
          
          {canManageUsers && (
            <button
              id="btn-create-user-main"
              onClick={openCreateModal}
              className="inline-flex items-center space-x-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Crear Usuario</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Total Usuarios</p>
          <p className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 sm:mt-1">{totalUsers}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Cuentas en el sistema</p>
        </div>
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider">En Línea Ahora</p>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <p className="text-xl sm:text-2xl font-black text-emerald-700 mt-0.5 sm:mt-1">{onlineUsersCount}</p>
          <p className="text-[10px] sm:text-[11px] text-emerald-600/80 mt-0.5">Dentro de la aplicación</p>
        </div>
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-wider">Desconectados</p>
          <p className="text-xl sm:text-2xl font-black text-slate-700 mt-0.5 sm:mt-1">{offlineUsersCount}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Fuera de la aplicación</p>
        </div>
        <div className="bg-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-[10px] sm:text-xs font-bold text-blue-600 uppercase tracking-wider">Habilitados</p>
          <p className="text-xl sm:text-2xl font-black text-blue-700 mt-0.5 sm:mt-1">{activeUsers}</p>
          <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">Con acceso activo</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col gap-3.5">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nombre o correo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Online status filters */}
          <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({totalUsers})
            </button>
            <button
              onClick={() => setStatusFilter('online')}
              className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'online'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>En Línea ({onlineUsersCount})</span>
            </button>
            <button
              onClick={() => setStatusFilter('offline')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                statusFilter === 'offline'
                  ? 'bg-slate-700 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Desconectados ({offlineUsersCount})
            </button>
          </div>
        </div>

        {/* Role filters */}
        <div className="flex items-center space-x-2 w-full overflow-x-auto pt-2 border-t border-slate-100">
          <span className="text-xs text-slate-500 font-bold whitespace-nowrap">Rol:</span>
          {(['all', 'admin', 'técnico', 'housekeeping', 'ayb', 'sastra', 'cocina'] as const).map(role => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                roleFilter === role
                  ? 'bg-blue-600 text-white shadow-2xs font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {role === 'all' ? 'Todos los roles' : roleDisplay[role]?.label || role}
            </button>
          ))}
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
        {filteredUsers.map(user => {
          const isCurrentUser = currentUser && (user.id === currentUser.id || user.email.toLowerCase().trim() === currentUser.email.toLowerCase().trim());
          const roleBadge = roleDisplay[user.role] || roleDisplay.técnico;
          const isActive = user.status === 'active';
          const onlineInfo = checkIsUserOnline(user);

          return (
            <div 
              key={user.id} 
              className={`bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 border transition-all shadow-xs flex flex-col justify-between space-y-4 overflow-hidden ${
                isActive ? (onlineInfo.isOnline ? 'border-emerald-300 ring-1 ring-emerald-400/20' : 'border-slate-200/90') : 'border-slate-200 opacity-60 bg-slate-50/50'
              }`}
            >
              {/* Card Header */}
              <div>
                <div className="flex items-start justify-between gap-2.5">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <div className="relative shrink-0">
                      <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center font-bold text-sm sm:text-base shrink-0 shadow-xs ${
                        user.role === 'admin' 
                          ? 'bg-purple-600 text-white shadow-purple-500/20' 
                          : user.role === 'técnico'
                          ? 'bg-blue-600 text-white shadow-blue-500/20'
                          : user.role === 'housekeeping'
                          ? 'bg-teal-600 text-white shadow-teal-500/20'
                          : 'bg-slate-600 text-white'
                      }`}>
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      {/* Indicador de conexión sobre avatar */}
                      <span 
                        className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-xs ${
                          onlineInfo.isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                        }`}
                        title={onlineInfo.label}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center space-x-1.5 flex-wrap gap-y-0.5">
                        <h3 className="text-sm font-black text-slate-900 truncate">{user.displayName}</h3>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium mt-0.5 min-w-0 flex-wrap gap-y-1">
                        <p className="flex items-center space-x-1 min-w-0">
                          <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{user.email}</span>
                        </p>
                        <span className="text-slate-300">•</span>
                        <p className="flex items-center space-x-1 text-[11px] font-mono bg-amber-50 border border-amber-200 text-amber-900 px-1.5 py-0.5 rounded" title="Contraseña de acceso configurada">
                          <KeyRound className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                          <span className="font-semibold">Clave: {user.password || '123456'}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status Toggle & Role Badge */}
                  <div className="flex flex-col items-end space-y-1.5 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}`}>
                      {roleBadge.label}
                    </span>
                    <button
                      onClick={() => toggleUserActiveStatus(user)}
                      disabled={!!isCurrentUser}
                      className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold border cursor-pointer whitespace-nowrap transition-colors ${
                        isActive 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                          : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                      }`}
                      title={isCurrentUser ? 'No puedes desactivar tu propia cuenta' : (isActive ? 'Clic para desactivar' : 'Clic para activar')}
                    >
                      <Power className="w-2.5 h-2.5" />
                      <span>{isActive ? 'Activo' : 'Inactivo'}</span>
                    </button>
                  </div>
                </div>

                {/* Banner de Conexión en Tiempo Real (En línea / Desconectado) */}
                <div className={`mt-2.5 flex items-center justify-between gap-2 p-2 px-3 rounded-xl border transition-all ${
                  onlineInfo.isOnline 
                    ? 'bg-emerald-50/90 border-emerald-300 text-emerald-950 shadow-2xs' 
                    : 'bg-slate-50 border-slate-200 text-slate-600'
                }`}>
                  <div className="flex items-center space-x-2 min-w-0">
                    <span className="relative flex h-2.5 w-2.5 shrink-0">
                      {onlineInfo.isOnline && (
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      )}
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${onlineInfo.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                    </span>
                    <span className={`text-xs font-black truncate ${onlineInfo.isOnline ? 'text-emerald-900' : 'text-slate-700'}`}>
                      {onlineInfo.isOnline ? 'En línea en la app' : 'Desconectado'}
                    </span>
                  </div>
                  <span className={`text-[11px] font-bold shrink-0 ${onlineInfo.isOnline ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {onlineInfo.timeText}
                  </span>
                </div>

                {/* Visible Modules Preview */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 space-y-1.5">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Módulos permitidos</p>
                  <div className="flex flex-wrap gap-1.5">
                    {(user.visibleSections && user.visibleSections.length > 0) ? (
                      user.visibleSections.map(secId => {
                        const mod = AVAILABLE_MODULES.find(m => m.id === secId);
                        return (
                          <span 
                            key={secId} 
                            className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700"
                          >
                            <Check className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                            <span className="truncate">{mod?.label || secId}</span>
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Sin módulos asignados</span>
                    )}
                  </div>
                </div>

                {/* Permissions Badges */}
                <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Permisos:</span>
                  <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${user.permissions?.canEditSettings ? 'bg-blue-50 text-blue-700' : 'bg-slate-50 text-slate-400'}`}>
                      Ajustes
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${user.permissions?.canDeleteRecords ? 'bg-rose-50 text-rose-700' : 'bg-slate-50 text-slate-400'}`}>
                      Borrar
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${user.permissions?.canManageUsers ? 'bg-purple-50 text-purple-700' : 'bg-slate-50 text-slate-400'}`}>
                      Usuarios
                    </span>
                    <span 
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        (user.permissions?.canStartRounds !== undefined ? !!user.permissions.canStartRounds : (user.canStartRounds !== undefined ? !!user.canStartRounds : (user.role === 'técnico' || (user.role === 'admin' && user.id !== 'usr-1790639954575-671'))))
                          ? 'bg-blue-600 text-white shadow-2xs' 
                          : 'bg-slate-100 text-slate-400'
                      }`}
                      title={
                        (user.permissions?.canStartRounds !== undefined ? !!user.permissions.canStartRounds : (user.canStartRounds !== undefined ? !!user.canStartRounds : (user.role === 'técnico' || (user.role === 'admin' && user.id !== 'usr-1790639954575-671'))))
                          ? 'Puede Iniciar Rondas (Botón + Iniciar Nueva Ronda Activo)' 
                          : 'Modo Visualizador (Sin Botón Iniciar Nueva Ronda)'
                      }
                    >
                      {(user.permissions?.canStartRounds !== undefined ? !!user.permissions.canStartRounds : (user.canStartRounds !== undefined ? !!user.canStartRounds : (user.role === 'técnico' || (user.role === 'admin' && user.id !== 'usr-1790639954575-671'))))
                        ? '+ Iniciar Ronda' 
                        : 'Solo Ver'}
                    </span>
                    <span 
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        (user.permissions?.notifyRounds !== undefined ? !!user.permissions.notifyRounds : (user.notifyRounds !== undefined ? !!user.notifyRounds : user.role === 'admin'))
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                          : 'bg-slate-50 text-slate-400'
                      }`}
                      title="Notificaciones de Rondas de Mantenimiento"
                    >
                      Rondas
                    </span>
                    <span 
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        (user.permissions?.notifyRequests !== undefined ? !!user.permissions.notifyRequests : (user.notifyRequests !== undefined ? !!user.notifyRequests : true))
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-slate-50 text-slate-400'
                      }`}
                      title="Notificaciones de Solicitudes Hoteleras"
                    >
                      Sol.
                    </span>
                    <span 
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        (user.permissions?.notifyTasks !== undefined ? !!user.permissions.notifyTasks : (user.notifyTasks !== undefined ? !!user.notifyTasks : true))
                          ? 'bg-purple-50 text-purple-700 border border-purple-200' 
                          : 'bg-slate-50 text-slate-400'
                      }`}
                      title="Notificaciones de Tareas Asignadas"
                    >
                      Tareas
                    </span>
                    <span 
                      className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        (user.permissions?.notifyIncidents !== undefined ? !!user.permissions.notifyIncidents : (user.notifyIncidents !== undefined ? !!user.notifyIncidents : true))
                          ? 'bg-amber-50 text-amber-700 border border-amber-200' 
                          : 'bg-slate-50 text-slate-400'
                      }`}
                      title="Notificaciones de Averías / Incidencias"
                    >
                      Averías
                    </span>
                  </div>
                </div>
              </div>

              {/* Card Footer Actions */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  Creado: {new Date(user.createdAt || Date.now()).toLocaleDateString('es-ES')}
                </span>

                <div className="flex items-center space-x-2">
                  {canManageUsers && (
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Editar usuario y permisos"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}

                  {canManageUsers && !isCurrentUser && (
                    <button
                      onClick={() => handleDelete(user)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="Eliminar usuario"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredUsers.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/90 shadow-xs space-y-3">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No se encontraron usuarios</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchTerm ? 'No hay ningún usuario que coincida con tu búsqueda.' : 'Crea tu primer usuario técnico o administrativo para comenzar.'}
          </p>
          <button
            onClick={openCreateModal}
            className="mt-2 inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Usuario Ahora</span>
          </button>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-8 h-8 text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">¿Eliminar Usuario?</h3>
              <p className="text-sm text-slate-500 mb-6">
                Esta acción no se puede deshacer. ¿Estás seguro de que deseas eliminar permanentemente el usuario "{userToDelete.displayName}"?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-sm"
                >
                  Sí, eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-950/75 backdrop-blur-xs">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            
            {/* Sticky Header */}
            <div className="flex items-center justify-between p-4 sm:p-5 sm:px-6 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20 shrink-0">
                  <Users className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg font-black text-slate-900 leading-tight">
                    {editingUser ? 'Editar Usuario & Permisos' : 'Crear Nuevo Usuario'}
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500 line-clamp-1">
                    Los datos se guardan de inmediato en el servidor y la nube en tiempo real.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 shrink-0 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mx-4 sm:mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-bold flex items-center space-x-2 shrink-0">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form with scrollable body and sticky footer */}
            <form onSubmit={handleSaveUser} className="flex flex-col flex-1 min-h-0">
              {/* Scrollable Form Body */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
                {/* Name and Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. Carlos Gómez"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                      Correo Electrónico *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej. carlos.gomez@hotelwake.com"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                  </div>
                </div>

                {/* Contraseña de Acceso */}
                <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 uppercase flex items-center space-x-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-blue-600" />
                      <span>Contraseña de Acceso al Sistema *</span>
                    </label>
                    <span className="text-[10px] font-semibold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded-full border border-blue-300">
                      Exacta para ingresar
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type={showPasswordModal ? 'text' : 'password'}
                      required
                      placeholder="Escribe la contraseña exacta para este usuario..."
                      value={formPassword}
                      onChange={(e) => setFormPassword(e.target.value)}
                      className="w-full pl-3.5 pr-11 py-2.5 rounded-xl border border-slate-300 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium tracking-normal shadow-2xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(!showPasswordModal)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1.5 rounded-lg transition-colors cursor-pointer"
                      title={showPasswordModal ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showPasswordModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    El usuario deberá ingresar su correo y esta contraseña exacta en la pantalla de inicio para entrar al sistema.
                  </p>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Rol del Usuario
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3">
                    {(['admin', 'técnico', 'housekeeping', 'ayb', 'sastra', 'cocina'] as UserRole[]).map(role => (
                      <button
                        type="button"
                        key={role}
                        onClick={() => handleRoleChange(role)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          formRole === role
                            ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-900 capitalize">{roleDisplay[role].label}</span>
                          {formRole === role && <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          {role === 'admin' ? 'Acceso completo' : role === 'técnico' ? 'Operación de rondas' : role === 'housekeeping' ? 'Fallas y rondas' : 'Solo lectura'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Department Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1.5">
                    Área / Departamento
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="departments-list"
                      placeholder="Ej. Mantenimiento, Housekeeping, Cocina..."
                      value={formDepartment}
                      onChange={(e) => setFormDepartment(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                    />
                    <datalist id="departments-list">
                      {Array.from(new Set(users.map(u => u.department).filter(Boolean))).map(dep => (
                        <option key={dep} value={dep} />
                      ))}
                    </datalist>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5">
                    Escriba un área nueva o seleccione una existente. Esta área aparecerá como opción al asignar solicitudes de servicio.
                  </p>
                </div>



                {/* Visible Modules Selector */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase">
                      Módulos y Secciones Permitidas
                    </label>
                    <div className="flex items-center space-x-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setFormSections(AVAILABLE_MODULES.map(m => m.id))}
                        className="text-blue-600 hover:underline font-bold"
                      >
                        Todos
                      </button>
                      <span>•</span>
                      <button
                        type="button"
                        onClick={() => setFormSections(['dashboard'])}
                        className="text-slate-500 hover:underline"
                      >
                        Mínimo
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 rounded-2xl border border-slate-200 bg-slate-50">
                    {AVAILABLE_MODULES.map(mod => {
                      const isChecked = formSections.includes(mod.id);

                      return (
                        <div
                          key={mod.id}
                          onClick={() => toggleSection(mod.id)}
                          className={`p-2.5 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                            isChecked 
                              ? 'bg-white border-blue-300 shadow-xs ring-1 ring-blue-500/20' 
                              : 'bg-slate-100/60 border-slate-200 text-slate-400'
                          }`}
                        >
                          <div className={`w-4 h-4 rounded-md flex items-center justify-center border transition-all ${
                            isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isChecked && <Check className="w-3 h-3" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-xs font-bold truncate ${isChecked ? 'text-slate-900' : 'text-slate-500'}`}>
                              {mod.label}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">{mod.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Granular Special Permissions */}
                <div className="pt-2 border-t border-slate-100 space-y-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Permisos Especiales y Operativos
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <label className={`p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition-all ${
                      formPermissions.canStartRounds 
                        ? 'bg-blue-50/80 border-blue-300 ring-1 ring-blue-400/20' 
                        : 'border-slate-200 bg-slate-50 hover:bg-slate-100/60'
                    }`}>
                      <input
                        type="checkbox"
                        checked={!!formPermissions.canStartRounds}
                        onChange={(e) => setFormPermissions(prev => ({ ...prev, canStartRounds: e.target.checked }))}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      />
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <PlusCircle className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>Iniciar Nueva Ronda</span>
                        </span>
                        <span className="text-[10px] text-slate-500 leading-tight mt-0.5">
                          {formPermissions.canStartRounds 
                            ? '✅ Botón visible (Puede crear rondas)' 
                            : '👁️ Solo ver rondas (Sin botón)'}
                        </span>
                      </div>
                    </label>

                    <label className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center space-x-2.5 cursor-pointer hover:bg-slate-100/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={formPermissions.canEditSettings}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormPermissions(prev => ({ ...prev, canEditSettings: checked }));
                          setFormSections(prev => checked ? (prev.includes('configuraciones') ? prev : [...prev, 'configuraciones']) : prev.filter(id => id !== 'configuraciones'));
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="text-xs font-medium text-slate-700">Editar Ajustes</span>
                    </label>

                    <label className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center space-x-2.5 cursor-pointer hover:bg-slate-100/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={formPermissions.canDeleteRecords}
                        onChange={(e) => setFormPermissions(prev => ({ ...prev, canDeleteRecords: e.target.checked }))}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="text-xs font-medium text-slate-700">Eliminar Registros</span>
                    </label>

                    <label className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center space-x-2.5 cursor-pointer hover:bg-slate-100/60 transition-colors">
                      <input
                        type="checkbox"
                        checked={formPermissions.canManageUsers}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setFormPermissions(prev => ({ ...prev, canManageUsers: checked }));
                          setFormSections(prev => checked ? (prev.includes('usuarios') ? prev : [...prev, 'usuarios']) : prev.filter(id => id !== 'usuarios'));
                        }}
                        className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4"
                      />
                      <span className="text-xs font-medium text-slate-700">Crear Usuarios</span>
                    </label>
                  </div>
                </div>

                {/* Configuración de Notificaciones del Sistema (Push) */}
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  <label className="text-xs font-bold text-slate-800 uppercase flex items-center space-x-1.5">
                    <Bell className="w-3.5 h-3.5 text-blue-500" />
                    <span>Canales de Notificaciones Push Activas</span>
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Selecciona qué alertas deseas enviar directamente al teléfono o dispositivo de este usuario:
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Canal Rondas */}
                    <div 
                      onClick={() => setFormPermissions(prev => ({ ...prev, notifyRounds: !prev.notifyRounds }))}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        formPermissions.notifyRounds
                          ? 'bg-blue-50/70 border-blue-300 ring-1 ring-blue-400/10'
                          : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 opacity-75'
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        <input
                          type="checkbox"
                          checked={!!formPermissions.notifyRounds}
                          onChange={(e) => setFormPermissions(prev => ({ ...prev, notifyRounds: e.target.checked }))}
                          className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Notificaciones de Rondas</p>
                          <p className="text-[10px] text-slate-600 leading-normal mt-0.5">Recibir alertas de inicios y cierres de rondas de mantenimiento del día.</p>
                        </div>
                      </div>
                    </div>

                    {/* Canal Solicitudes */}
                    <div 
                      onClick={() => setFormPermissions(prev => ({ ...prev, notifyRequests: !prev.notifyRequests }))}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        formPermissions.notifyRequests
                          ? 'bg-emerald-50/70 border-emerald-300 ring-1 ring-emerald-400/10'
                          : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 opacity-75'
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        <input
                          type="checkbox"
                          checked={!!formPermissions.notifyRequests}
                          onChange={(e) => setFormPermissions(prev => ({ ...prev, notifyRequests: e.target.checked }))}
                          className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Notificaciones de Solicitudes</p>
                          <p className="text-[10px] text-slate-600 leading-normal mt-0.5">Recibir alertas de solicitudes creadas, asignadas o escaladas.</p>
                        </div>
                      </div>
                    </div>

                    {/* Canal Tareas */}
                    <div 
                      onClick={() => setFormPermissions(prev => ({ ...prev, notifyTasks: !prev.notifyTasks }))}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        formPermissions.notifyTasks
                          ? 'bg-purple-50/70 border-purple-300 ring-1 ring-purple-400/10'
                          : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 opacity-75'
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        <input
                          type="checkbox"
                          checked={!!formPermissions.notifyTasks}
                          onChange={(e) => setFormPermissions(prev => ({ ...prev, notifyTasks: e.target.checked }))}
                          className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Notificaciones de Tareas</p>
                          <p className="text-[10px] text-slate-600 leading-normal mt-0.5">Recibir alertas de tareas operativas asignadas por sus compañeros.</p>
                        </div>
                      </div>
                    </div>

                    {/* Canal Incidencias */}
                    <div 
                      onClick={() => setFormPermissions(prev => ({ ...prev, notifyIncidents: !prev.notifyIncidents }))}
                      className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                        formPermissions.notifyIncidents
                          ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400/10'
                          : 'bg-slate-50/70 border-slate-200 hover:border-slate-300 opacity-75'
                      }`}
                    >
                      <div className="flex items-start space-x-2.5">
                        <input
                          type="checkbox"
                          checked={!!formPermissions.notifyIncidents}
                          onChange={(e) => setFormPermissions(prev => ({ ...prev, notifyIncidents: e.target.checked }))}
                          className="mt-0.5 rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900">Notificaciones de Averías</p>
                          <p className="text-[10px] text-slate-600 leading-normal mt-0.5">Recibir alertas en vivo de averías e inconvenientes reportados.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Select */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700">Estado de la cuenta:</span>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as 'active' | 'inactive')}
                    className="px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Activo (Habilitado)</option>
                    <option value="inactive">Inactivo (Suspendido)</option>
                  </select>
                </div>
              </div>

              {/* Sticky Footer with Action Buttons */}
              <div className="flex items-center justify-end space-x-3 p-4 sm:p-5 border-t border-slate-100 shrink-0 bg-slate-50/90">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md shadow-blue-600/20 cursor-pointer transition-all active:scale-95"
                >
                  {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
