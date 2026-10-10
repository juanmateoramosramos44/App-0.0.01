import React, { useState, useEffect } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { BellRing, Bell, X, CheckCircle, Smartphone } from 'lucide-react';
import { syncPushSubscriptionWithServer } from '../../lib/notifications';

export const NotificationPermissionBanner: React.FC = () => {
  const { currentUser, notificationPermission, requestSystemNotificationPermission } = useMaintenance();
  const [isDismissed, setIsDismissed] = useState(false);
  const [isActivating, setIsActivating] = useState(false);

  // Si ya tiene permisos o no hay usuario conectado, o el usuario lo cerró en esta sesión, no mostrar
  if (!currentUser || notificationPermission === 'granted' || isDismissed) {
    return null;
  }

  // Si el navegador no soporta notificaciones
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  const handleActivate = async () => {
    setIsActivating(true);
    try {
      const granted = await requestSystemNotificationPermission();
      if (granted && currentUser) {
        await syncPushSubscriptionWithServer(currentUser);
      }
    } catch (e) {
      console.warn('Error activating notifications:', e);
    } finally {
      setIsActivating(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-slate-950 px-4 py-2.5 shadow-md border-b border-amber-400/40 relative z-30 animate-in slide-in-from-top duration-200">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 text-xs sm:text-sm font-medium text-center sm:text-left">
          <div className="w-8 h-8 rounded-xl bg-slate-950/15 flex items-center justify-center shrink-0">
            <BellRing className="w-4 h-4 text-slate-950 animate-bounce" />
          </div>
          <div>
            <span className="font-bold text-slate-950">¡Activa las alertas en este dispositivo!</span>
            <span className="hidden md:inline text-slate-900 ml-1.5 text-xs">
              Recibe solicitudes asignadas, tareas y rondas incluso con la aplicación cerrada o pantalla bloqueada.
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleActivate}
            disabled={isActivating}
            className="px-4 py-1.5 bg-slate-950 hover:bg-slate-900 text-amber-300 font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
          >
            <Bell className="w-3.5 h-3.5" />
            <span>{isActivating ? 'Activando...' : 'Activar Alertas Ahora'}</span>
          </button>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1.5 text-slate-900/80 hover:text-slate-950 rounded-lg hover:bg-slate-950/10 transition-colors cursor-pointer"
            title="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
