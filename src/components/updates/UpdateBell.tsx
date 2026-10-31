import React, { useState, useEffect } from 'react';
import { Bell, Sparkles, CheckCircle2, ShieldCheck, Zap, Download } from 'lucide-react';

// =========================================================================
// INCREMENTA ESTE NÚMERO CON CADA ACTUALIZACIÓN PARA DISPARAR LA CAMPANA
// =========================================================================
const LOCAL_VERSION_CODE = 4; 
const CURRENT_CHANGELOG = {
  version: 'v1.2.2',
  date: 'Septiembre 2026',
  title: 'Actualizaciones Instantáneas en Tiempo Real',
  changes: [
    {
      iconType: 'zap',
      title: 'Actualizaciones al Instante',
      description: 'Cualquier actualización del sistema se aplica de inmediato en todos los dispositivos conectados sin necesidad de recargar manualmente.'
    },
    {
      iconType: 'check',
      title: 'Visualización de Turnos (MAÑANA)',
      description: 'Corrección completa de la acentuación en el Turno MAÑANA con virgulilla en todas las tablas, rondas y reportes, protegiendo al 100% todos los datos históricos.'
    }
  ]
};

const getAppliedVersionCode = (): number => {
  try {
    const saved = localStorage.getItem('hotel_maint_applied_version');
    return saved ? parseInt(saved, 10) : 0;
  } catch {
    return 0;
  }
};

export const UpdateBell: React.FC = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [remoteVersionInfo, setRemoteVersionInfo] = useState<any>(CURRENT_CHANGELOG);

  useEffect(() => {
    // 1. Consultar la versión del sistema en /api/app-data/app_version
    const checkVersion = () => {
      fetch('/api/app-data/app_version')
        .then(res => res.json())
        .then(data => {
          if (data && data.versionCode) {
            const remoteCode = Number(data.versionCode) || 0;
            const appliedCode = getAppliedVersionCode();
            const currentActiveCode = Math.max(LOCAL_VERSION_CODE, appliedCode);

            if (remoteCode > currentActiveCode) {
              setHasUpdate(true);
              setRemoteVersionInfo(data.changelog || { ...CURRENT_CHANGELOG, versionCode: remoteCode });
            } else {
              setHasUpdate(false);
              setRemoteVersionInfo(CURRENT_CHANGELOG);
            }

            if (LOCAL_VERSION_CODE > remoteCode) {
              fetch('/api/app-data/app_version', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  versionCode: LOCAL_VERSION_CODE,
                  changelog: CURRENT_CHANGELOG,
                  timestamp: new Date().toISOString()
                })
              }).catch(() => {});
            }
          } else {
            // Registro inicial de versión
            fetch('/api/app-data/app_version', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                versionCode: LOCAL_VERSION_CODE,
                changelog: CURRENT_CHANGELOG,
                timestamp: new Date().toISOString()
              })
            }).catch(() => {});
          }
        })
        .catch(() => {});
    };

    checkVersion();
    const interval = setInterval(checkVersion, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleApplyUpdate = () => {
    setIsUpdating(true);
    const targetCode = Math.max(
      LOCAL_VERSION_CODE,
      Number(remoteVersionInfo?.versionCode) || 0
    );

    try {
      localStorage.setItem('hotel_maint_applied_version', String(targetCode));
    } catch {}

    // Marcar de inmediato como al día para que no vuelva a aparecer
    setHasUpdate(false);

    // Limpiar cachés del navegador y Service Worker para forzar la carga limpia
    if (typeof caches !== 'undefined' && caches.keys) {
      caches.keys().then(names => {
        return Promise.all(names.map(name => caches.delete(name)));
      }).catch(() => {});
    }

    // Efecto visual y recarga con parámetro de timestamp para romper la caché del navegador móvil
    setTimeout(() => {
      setIsUpdating(false);
      setIsModalOpen(false);
      const url = new URL(window.location.href);
      url.searchParams.set('_v', String(Date.now()));
      window.location.replace(url.toString());
    }, 600);
  };

  return (
    <>
      <button 
        onClick={handleOpenModal}
        className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
        title={hasUpdate ? "¡Nueva actualización disponible!" : `Sistema al día (${CURRENT_CHANGELOG.version})`}
      >
        <Bell className="w-5 h-5" />
        {hasUpdate && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-slate-900 rounded-full animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
        )}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header: Diferenciado según si hay actualización pendiente o si ya está al día */}
            {hasUpdate ? (
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 shrink-0 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <Sparkles className="w-12 h-12 mx-auto mb-3 text-blue-200" />
                <h2 className="text-2xl font-bold">¡Nueva Actualización Disponible!</h2>
                <p className="text-blue-100 mt-1 font-medium">Versión {remoteVersionInfo.version} • {remoteVersionInfo.date}</p>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 shrink-0 text-white text-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-200" />
                <h2 className="text-2xl font-bold">Sistema Actualizado y al Día</h2>
                <p className="text-emerald-100 mt-1 font-medium">Versión actual: {CURRENT_CHANGELOG.version} • No hay actualizaciones pendientes</p>
              </div>
            )}

            {/* Content */}
            <div className="p-6 overflow-y-auto">
              {/* Banner de estado */}
              {!hasUpdate && (
                <div className="mb-5 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-2xl p-4 flex items-start gap-3 text-sm">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-emerald-800">Tienes instalada la versión más reciente</p>
                    <p className="text-emerald-700 text-xs mt-0.5 leading-relaxed">
                      La aplicación cuenta con todas las mejoras operativas, sincronización en tiempo real y persistencia segura de datos.
                    </p>
                  </div>
                </div>
              )}

              <h3 className="text-base font-bold text-slate-800 mb-3">
                {hasUpdate ? remoteVersionInfo.title : 'Mejoras activas en esta versión:'}
              </h3>
              
              <div className="space-y-3">
                {((hasUpdate ? remoteVersionInfo.changes : CURRENT_CHANGELOG.changes) || []).map((change: any, idx: number) => (
                  <div key={idx} className="flex gap-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="shrink-0 mt-0.5">
                      {change.iconType === 'zap' ? (
                        <Zap className="w-5 h-5 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="w-5 h-5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-sm mb-0.5">{change.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{change.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-5 bg-slate-50 text-slate-700 border border-slate-200 rounded-xl p-3.5 flex gap-3 text-xs font-medium">
                <ShieldCheck className="w-5 h-5 shrink-0 text-emerald-600" />
                <p>
                  Tus datos están protegidos. Las sincronizaciones no alteran, dañan ni borran inventarios, solicitudes ni rondas guardadas.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t shrink-0 border-slate-100 flex justify-end gap-3">
              {hasUpdate ? (
                <>
                  <button
                    onClick={() => setIsModalOpen(false)}
                    disabled={isUpdating}
                    className="px-5 py-2.5 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={handleApplyUpdate}
                    disabled={isUpdating}
                    className="px-6 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-80"
                  >
                    {isUpdating ? (
                      <>
                        <Download className="w-4 h-4 animate-bounce" />
                        Instalando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Aplicar Actualización Segura
                      </>
                    )}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full sm:w-auto px-6 py-2.5 text-sm font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Entendido (Sistema al día)
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
