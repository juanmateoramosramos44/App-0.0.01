import React, { useState, useEffect } from 'react';
import { Bell, BellRing, CheckCircle, Smartphone, Send, X, Clock, Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { 
  sendTestPushNotification, 
  syncPushSubscriptionWithServer, 
  checkPushSubscriptionStatus,
  sendSystemNotification
} from '../../lib/notifications';

export const NotificationBell: React.FC = () => {
  const { 
    notificationPermission, 
    requestSystemNotificationPermission, 
    currentUser,
    notify 
  } = useMaintenance();
  
  const [isOpen, setIsOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState<boolean | null>(null);
  const [totalSubscribers, setTotalSubscribers] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isActivating, setIsActivating] = useState(false);

  const isGranted = notificationPermission === 'granted';

  // Verificar estado de suscripción cuando se abre el modal
  const checkStatus = async () => {
    setIsSyncing(true);
    try {
      if (isGranted) {
        // Asegurar sincronización
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
        notify('🔔 ¡Notificaciones activadas! Ahora recibirás alertas en tiempo real con la app cerrada.');
      } else {
        notify('⚠️ Permiso no concedido. Por favor habilita los permisos de notificaciones en los ajustes de tu navegador.');
      }
    } finally {
      setIsActivating(false);
    }
  };

  const handleForceResync = async () => {
    setIsSyncing(true);
    try {
      notify('🔄 Re-vinculando notificaciones con Google FCM...');
      const success = await syncPushSubscriptionWithServer(currentUser, true);
      await checkStatus();
      if (success) {
        notify('✅ ¡Dispositivo re-vinculado con éxito! Recibirás alertas con la app cerrada.');
      } else {
        notify('⚠️ No se pudo re-vincular. Asegúrate de tener permisos activos.');
      }
    } catch (e) {
      console.warn('Error force re-syncing:', e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Prueba 1: Notificación Inmediata en pantalla
  const handleInstantTest = async () => {
    notify('🔔 Disparando alerta inmediata en tu teléfono...');
    await sendSystemNotification('🔔 Alerta Inmediata de Prueba', {
      body: '¡Sonido y vibración verificados! El sistema de alertas está activo en tu dispositivo.',
      tag: `test-instant-${Date.now()}`
    });
  };

  // Prueba 2: Temporizador en la nube para probar con pantalla bloqueada o app cerrada
  const handleCloudTest = async (seconds: number = 10) => {
    setCountdown(seconds);
    notify(`⏱️ Cuenta regresiva de ${seconds}s iniciada: Sal de la app o bloquea el teléfono AHORA.`);

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

  return (
    <div className="relative">
      {/* Botón en el Navbar */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
          isGranted
            ? 'bg-slate-800 text-emerald-400 border border-emerald-500/30 hover:bg-slate-700/80 shadow-xs'
            : 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm shadow-amber-500/30 animate-pulse'
        }`}
        title={isGranted ? "Notificaciones en segundo plano activas" : "Activar notificaciones para recibirlas con la app cerrada"}
      >
        {isGranted ? (
          <>
            <BellRing className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Alertas Activas</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          </>
        ) : (
          <>
            <Bell className="w-3.5 h-3.5" />
            <span>Activar Alertas</span>
          </>
        )}
      </button>

      {/* Modal interactivo con guía y pruebas comprobables */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 text-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${isGranted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Notificaciones en Teléfono</h3>
                  <p className="text-[11px] text-slate-400">Estilo WhatsApp (App abierta o cerrada)</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Estado del dispositivo con el servidor */}
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

            {/* Eventos que se notifican */}
            <div className="space-y-1.5 text-xs text-slate-300">
              <p className="font-semibold text-slate-200">
                Llegan a tu barra de notificaciones para:
              </p>
              <ul className="space-y-1 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800 text-[11px]">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Rondas de turno:</strong> Al iniciar y al guardarse.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Solicitudes:</strong> Nuevas, en progreso o resueltas.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Cierre de solicitudes:</strong> Cuando un compañero la termina.</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Tareas:</strong> Asignadas, en proceso o completadas.</span>
                </li>
              </ul>
            </div>

            {/* Opciones de prueba */}
            <div className="space-y-2.5 pt-1">
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
                <div className="space-y-2">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Opciones para comprobar funcionamiento:
                  </p>

                  {/* Botón de Re-sincronización y Renovación forzada */}
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

                  {/* Prueba 1: Inmediata */}
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

                  {/* Prueba 2: Temporizador en la nube (App cerrada) */}
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

                  {/* Prueba 3: Explicación de prueba en equipo */}
                  <div className="p-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-[11px] text-slate-300 space-y-1">
                    <p className="font-semibold text-white flex items-center gap-1">
                      <span>👥 Prueba 3: La prueba real con otro dispositivo</span>
                    </p>
                    <p className="text-slate-400 leading-relaxed">
                      Cierra la app en tu teléfono. Luego, abre la aplicación en una computadora u otro celular y crea una solicitud o inicia una ronda. Tu teléfono sonará y vibrará al instante en tu bolsillo.
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-1.5 text-center text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
