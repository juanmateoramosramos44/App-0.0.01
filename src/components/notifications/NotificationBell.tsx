import React, { useState, useEffect, useMemo } from 'react';
import { 
  Bell, 
  BellRing, 
  CheckCircle, 
  Smartphone, 
  Send, 
  X, 
  Clock, 
  Sparkles, 
  RefreshCw, 
  AlertCircle,
  CheckCheck,
  CheckSquare,
  ClipboardList,
  AlertTriangle,
  Activity,
  Layers,
  ChevronRight,
  Wifi,
  Trash2
} from 'lucide-react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { 
  sendTestPushNotification, 
  syncPushSubscriptionWithServer, 
  checkPushSubscriptionStatus,
  sendSystemNotification,
  getQueuedNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  deleteQueuedNotification,
  AppNotification
} from '../../lib/notifications';

export const NotificationBell: React.FC = () => {
  const { 
    notificationPermission, 
    requestSystemNotificationPermission, 
    currentUser,
    setSelectedTab,
    isAdmin: ctxIsAdmin,
    notify 
  } = useMaintenance();
  
  const [isOpen, setIsOpen] = useState(false);
  const [modalTab, setModalTab] = useState<'notificaciones' | 'pruebas'>('notificaciones');
  const [filterCategory, setFilterCategory] = useState<'todas' | 'tareas' | 'solicitudes' | 'rondas'>('todas');
  const [notifications, setNotifications] = useState<AppNotification[]>(() => getQueuedNotifications());
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [totalSubscribers, setTotalSubscribers] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  const isGranted = notificationPermission === 'granted';

  // Role resolution
  const isAdmin = Boolean(
    ctxIsAdmin ||
    currentUser?.role === 'admin' || 
    currentUser?.email?.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com' ||
    currentUser?.id === 'usr-admin-master' ||
    currentUser?.id === 'usr-1789230683226' ||
    Boolean(currentUser?.permissions?.canManageUsers) || 
    Boolean(currentUser?.permissions?.canEditSettings)
  );

  // Escuchar actualizaciones del almacén persistente de notificaciones y eventos de red
  useEffect(() => {
    const handleUpdate = () => {
      setNotifications(getQueuedNotifications());
    };

    window.addEventListener('in_app_notifications_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Detección de reconexión a Internet (datos o Wi-Fi) estilo WhatsApp/Facebook
    const handleOnline = () => {
      setNotifications(getQueuedNotifications());
      notify?.('📶 Conexión restaurada: Se sincronizaron las novedades y alertas pendientes.');
    };
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('in_app_notifications_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      window.removeEventListener('online', handleOnline);
    };
  }, [notify]);

  // Filtrado de notificaciones por Usuario y Rol (Regla 2)
  const allowedNotifications = useMemo(() => {
    return notifications.filter(n => {
      if (isAdmin) return true; // Administrador ve todas las notificaciones
      if (!currentUser) return true;

      // Si la notificación va dirigida a un usuario específico
      if (n.targetUserId && n.targetUserId !== currentUser.id) return false;

      // Si va dirigida a un nombre de técnico específico
      if (n.targetUserName) {
        const myName = (currentUser.displayName || currentUser.email || '').toLowerCase().trim();
        const targetName = n.targetUserName.toLowerCase().trim();
        if (myName && targetName && !targetName.includes('todo el equipo') && !targetName.includes('general')) {
          if (!myName.includes(targetName) && !targetName.includes(myName)) return false;
        }
      }

      return true;
    });
  }, [notifications, isAdmin, currentUser]);

  const unreadCount = useMemo(() => {
    return allowedNotifications.filter(n => !n.read).length;
  }, [allowedNotifications]);

  const filteredList = useMemo(() => {
    if (filterCategory === 'todas') return allowedNotifications;
    return allowedNotifications.filter(n => n.category === filterCategory);
  }, [allowedNotifications, filterCategory]);

  // Verificar estado de suscripción push
  const checkStatus = async () => {
    setIsSyncing(true);
    try {
      if (isGranted) {
        await syncPushSubscriptionWithServer(currentUser);
      }
      const status = await checkPushSubscriptionStatus();
      setIsSubscribed(status.subscribed);
      setTotalSubscribers(status.totalSubscribers);
    } catch (e) {
      console.warn('Error checking subscription:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      checkStatus();
    }
  }, [isOpen, isGranted]);

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const granted = await requestSystemNotificationPermission();
      if (granted) {
        await syncPushSubscriptionWithServer(currentUser);
        await checkStatus();
        notify?.('🔔 ¡Notificaciones activadas! Ahora recibirás alertas en tiempo real con la app cerrada.');
      } else {
        notify?.('⚠️ Permiso no concedido. Habilita los permisos de notificaciones en los ajustes del navegador.');
      }
    } finally {
      setIsActivating(false);
    }
  };

  const handleForceResync = async () => {
    setIsSyncing(true);
    try {
      notify?.('🔄 Re-vinculando notificaciones con Google FCM...');
      const success = await syncPushSubscriptionWithServer(currentUser, true);
      await checkStatus();
      if (success) {
        notify?.('✅ ¡Dispositivo re-vinculado con éxito! Recibirás alertas con la app cerrada.');
      } else {
        notify?.('⚠️ No se pudo re-vincular. Asegúrate de tener permisos activos.');
      }
    } catch (e) {
      console.warn('Error force re-syncing:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleInstantTest = async () => {
    notify?.('🔔 Disparando alerta inmediata en tu teléfono...');
    await sendSystemNotification('🔔 Alerta Inmediata de Prueba', {
      body: '¡Sonido y vibración verificados! El sistema de alertas está activo en tu dispositivo.',
      tag: `test-instant-${Date.now()}`
    });
  };

  const handleCloudTest = async (seconds: number = 10) => {
    setCountdown(seconds);
    notify?.(`⏱️ Cuenta regresiva de ${seconds}s iniciada: Sal de la app o bloquea el teléfono AHORA.`);

    try {
      await sendTestPushNotification(currentUser, seconds);
    } catch (e) {
      console.warn('Error al solicitar prueba:', e);
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timer);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleNotificationClick = (item: AppNotification) => {
    markNotificationAsRead(item.id);
    if (item.category === 'tareas') {
      setSelectedTab?.('tareas');
      setIsOpen(false);
    } else if (item.category === 'solicitudes') {
      setSelectedTab?.('solicitudes');
      setIsOpen(false);
    } else if (item.category === 'rondas') {
      setSelectedTab?.('rondas');
      setIsOpen(false);
    } else if (item.category === 'incidencias') {
      setSelectedTab?.('incidencias');
      setIsOpen(false);
    }
  };

  const formatRelativeTime = (isoString: string): string => {
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const mins = Math.floor(diffMs / 60000);
      if (mins < 1) return 'Ahora mismo';
      if (mins < 60) return `Hace ${mins} min`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `Hace ${hours} h`;
      const days = Math.floor(hours / 24);
      return `Hace ${days} d`;
    } catch {
      return '';
    }
  };

  const getCategoryIcon = (category: AppNotification['category']) => {
    switch (category) {
      case 'tareas':
        return <CheckSquare className="w-4 h-4 text-emerald-400" />;
      case 'solicitudes':
        return <ClipboardList className="w-4 h-4 text-blue-400" />;
      case 'rondas':
        return <Activity className="w-4 h-4 text-indigo-400" />;
      case 'incidencias':
        return <AlertTriangle className="w-4 h-4 text-rose-400" />;
      default:
        return <Sparkles className="w-4 h-4 text-amber-400" />;
    }
  };

  return (
    <div className="relative">
      {/* Botón Bell en el Header con Contador Unread Dinámico */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 ${
          unreadCount > 0
            ? 'bg-rose-500/15 text-rose-400 border border-rose-500/40 hover:bg-rose-500/25'
            : isGranted
            ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 hover:bg-slate-700/80'
            : 'bg-amber-500 text-slate-950 hover:bg-amber-400'
        }`}
        title={unreadCount > 0 ? `${unreadCount} novedades sin leer` : "Centro de Alertas y Notificaciones"}
      >
        {unreadCount > 0 ? (
          <>
            <BellRing className="w-4 h-4 animate-bounce text-rose-400" />
            <span className="hidden sm:inline">Alertas</span>
            <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-[10px] font-black rounded-full bg-rose-500 text-white min-w-[18px]">
              {unreadCount}
            </span>
          </>
        ) : isGranted ? (
          <>
            <Bell className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Alertas</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </>
        ) : (
          <>
            <Bell className="w-3.5 h-3.5" />
            <span>Activar Alertas</span>
          </>
        )}
      </button>

      {/* Bandeja de Notificaciones Persistente Estilo WhatsApp/Facebook */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-3xl max-w-lg w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            
            {/* Header de la Bandeja */}
            <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className={`p-2 rounded-xl ${unreadCount > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-blue-500/20 text-blue-400'}`}>
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-white">Notificaciones del Sistema</h3>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-black bg-rose-500 text-white rounded-full">
                        {unreadCount} nuevas
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Sincronizadas y persistentes • Estilo WhatsApp
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={() => markAllNotificationsAsRead()}
                    className="p-1.5 text-xs text-blue-400 hover:text-blue-300 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                    title="Marcar todas como leídas"
                  >
                    <CheckCheck className="w-4 h-4" />
                    <span className="hidden sm:inline text-[11px] font-semibold">Leídas</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Pestañas de la Bandeja: Lista vs Pruebas / Ajustes */}
            <div className="flex items-center border-b border-slate-800 px-5 pt-2 shrink-0 bg-slate-900/90 gap-4 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setModalTab('notificaciones')}
                className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  modalTab === 'notificaciones'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <span>Bandeja de Entrada</span>
                <span className="px-1.5 py-0.2 bg-slate-800 text-[10px] rounded-full">
                  {allowedNotifications.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setModalTab('pruebas')}
                className={`pb-2.5 border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
                  modalTab === 'pruebas'
                    ? 'border-blue-500 text-white'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Ajustes & Pruebas Push</span>
              </button>
            </div>

            {/* Contenido según pestaña */}
            {modalTab === 'notificaciones' ? (
              <div className="flex flex-col flex-1 overflow-hidden">
                {/* Filtro rápido por categorías */}
                <div className="px-5 py-2.5 bg-slate-950/50 border-b border-slate-800/80 flex items-center gap-1.5 overflow-x-auto shrink-0 text-[11px]">
                  <button
                    type="button"
                    onClick={() => setFilterCategory('todas')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      filterCategory === 'todas'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Todas ({allowedNotifications.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterCategory('tareas')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      filterCategory === 'tareas'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Tareas
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterCategory('solicitudes')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      filterCategory === 'solicitudes'
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Solicitudes
                  </button>
                  <button
                    type="button"
                    onClick={() => setFilterCategory('rondas')}
                    className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                      filterCategory === 'rondas'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    Rondas
                  </button>
                </div>

                {/* Lista de Notificaciones */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/60">
                  {filteredList.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 space-y-2">
                      <Bell className="w-10 h-10 mx-auto text-slate-600 opacity-60" />
                      <p className="text-sm font-semibold">No tienes notificaciones pendientes</p>
                      <p className="text-xs text-slate-500">
                        Cualquier tarea, solicitud o ronda asignada a ti aparecerá aquí al instante.
                      </p>
                    </div>
                  ) : (
                    filteredList.map((item) => (
                      <div
                        key={item.id}
                        onClick={() => handleNotificationClick(item)}
                        className={`pt-2.5 first:pt-0 p-3 rounded-2xl transition-all cursor-pointer flex items-start justify-between gap-3 group ${
                          !item.read
                            ? 'bg-blue-950/30 border border-blue-500/30 hover:bg-blue-950/50'
                            : 'bg-slate-800/40 hover:bg-slate-800/70 border border-slate-800'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="p-2 rounded-xl bg-slate-900 border border-slate-700/80 shrink-0 mt-0.5">
                            {getCategoryIcon(item.category)}
                          </div>
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`text-xs font-bold truncate ${!item.read ? 'text-white' : 'text-slate-300'}`}>
                                {item.title}
                              </h4>
                              {item.priority === 'urgente' && (
                                <span className="px-1.5 py-0.2 text-[9px] font-black rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                  URGENTE
                                </span>
                              )}
                              {!item.read && (
                                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" title="No leída" />
                              )}
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                              {item.body}
                            </p>
                            <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                              <span>{formatRelativeTime(item.timestamp)}</span>
                              <span className="capitalize text-slate-500">• {item.category}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteQueuedNotification(item.id);
                            }}
                            className="p-1 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-800 transition-colors"
                            title="Eliminar notificación"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Banner de Sincronización Persistente */}
                <div className="p-3 bg-slate-950 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <Wifi className="w-3.5 h-3.5" />
                    <span>Sincronización fuera de línea activa</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    className="text-slate-300 hover:text-white font-semibold cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              /* Pestaña: Ajustes y Pruebas Push */
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                {/* Estado del dispositivo */}
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Estado del teléfono:</span>
                    <span className="flex items-center gap-1.5 font-bold">
                      {isSyncing ? (
                        <span className="text-amber-400 flex items-center gap-1">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Verificando...
                        </span>
                      ) : isSubscribed ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Conectado a la Nube
                        </span>
                      ) : isGranted ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Permiso Concedido
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertCircle className="w-3.5 h-3.5" /> Requiere Activación
                        </span>
                      )}
                    </span>
                  </div>

                  {totalSubscribers > 0 && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 border-t border-slate-700/50 pt-1.5">
                      <span>Dispositivos del hotel recibiendo alertas:</span>
                      <span className="font-mono font-bold text-white bg-slate-700/60 px-2 py-0.5 rounded">
                        {totalSubscribers} {totalSubscribers === 1 ? 'dispositivo' : 'dispositivos'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Botón de Activación o Pruebas */}
                {!isGranted ? (
                  <button
                    onClick={handleActivate}
                    disabled={isActivating}
                    className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-amber-500/20 cursor-pointer"
                  >
                    <Bell className="w-4 h-4" />
                    <span>{isActivating ? 'Solicitando permiso...' : 'Activar Notificaciones en mi Teléfono'}</span>
                  </button>
                ) : (
                  <div className="space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Opciones para comprobar funcionamiento:
                    </p>

                    <button
                      onClick={handleForceResync}
                      disabled={isSyncing}
                      className="w-full py-2 px-3 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 hover:text-white font-medium rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isSyncing ? 'animate-spin' : ''}`} />
                        <span>{isSyncing ? 'Re-vinculando con FCM...' : 'Re-vincular este dispositivo (FCM)'}</span>
                      </span>
                      <span className="text-[10px] text-blue-300 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">Garantizar Entrega</span>
                    </button>

                    <button
                      onClick={handleInstantTest}
                      className="w-full py-2 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer"
                    >
                      <span className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                        <span>1. Probar Sonido y Alerta Ahora</span>
                      </span>
                      <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded">Inmediato</span>
                    </button>

                    <button
                      onClick={() => handleCloudTest(10)}
                      disabled={countdown !== null}
                      className="w-full py-2.5 px-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md shadow-blue-600/30"
                    >
                      <Clock className="w-3.5 h-3.5" />
                      <span>
                        {countdown !== null
                          ? `⏱️ Enviando en ${countdown}s... ¡Sal de la app o bloquea el teléfono!`
                          : '2. Probar con App Cerrada (10 Segundos)'}
                      </span>
                    </button>

                    {countdown !== null && (
                      <div className="p-3 bg-amber-500/15 border border-amber-400/40 rounded-xl text-xs text-amber-200 space-y-1 animate-pulse">
                        <p className="font-bold flex items-center gap-1.5 text-amber-300">
                          <Clock className="w-4 h-4" />
                          <span>¡Bloquea tu teléfono ahora mismo!</span>
                        </p>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          El servidor en la nube disparará la notificación en <strong>{countdown} segundos</strong>. Deja tu teléfono bloqueado sobre la mesa y verás cómo enciende la pantalla y suena como un WhatsApp.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
