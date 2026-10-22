import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
  Monitor,
  CheckCircle2, 
  Share2, 
  PlusSquare, 
  MoreVertical, 
  RefreshCw, 
  X, 
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  Database
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isDesktop, isInIframe, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'desktop' | 'android' | 'ios' | 'updates'>(
    isIOS ? 'ios' : isDesktop ? 'desktop' : 'android'
  );

  if (!isOpen) return null;

  const currentUrl = window.location.origin;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDirectInstall = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-70 flex items-center justify-center bg-slate-950/75 p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3.5">
            <div className="w-13 h-13 rounded-2xl bg-blue-600 p-2 shadow-lg border border-blue-400/30 flex items-center justify-center shrink-0">
              <img src="/pwa-192x192.png" alt="App Icon" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-white leading-snug">
                  Instalar App en Teléfono y Computador
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Sistema Completo Cargado
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Wake Maintenance · Rondas, Equipos, Horarios, Consumos y Solicitudes
              </p>
            </div>
          </div>

          {/* Quick Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-4 p-1 bg-white/10 rounded-xl">
            <button
              onClick={() => setActiveTab('desktop')}
              className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'desktop' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5 shrink-0" />
              <span>Computador</span>
            </button>
            <button
              onClick={() => setActiveTab('android')}
              className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'android' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span>Android</span>
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'ios' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5 shrink-0" />
              <span>iPhone / iPad</span>
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`py-1.5 px-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'updates' ? 'bg-amber-500 text-slate-950 shadow-xs font-extrabold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Database className="w-3.5 h-3.5 shrink-0" />
              <span>Datos y Sync</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          
          {/* Direct Install Button if browser supports beforeinstallprompt */}
          {isInstallable && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-emerald-900 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>¡Dispositivo listo para instalar en 1 clic!</span>
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Instala la aplicación directamente en tu pantalla de inicio o escritorio con todos los datos del sistema.
                </p>
              </div>
              <button
                onClick={handleDirectInstall}
                className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center justify-center space-x-2 shadow-xs"
              >
                <Download className="w-4 h-4" />
                <span>Instalar Ahora</span>
              </button>
            </div>
          )}

          {/* Notice when inside AI Studio preview iframe */}
          {!isInstallable && !isInstalled && isInIframe && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-blue-900">
                  Paso previo para instalar en este computador o teléfono:
                </p>
                <p className="text-[11px] text-blue-700 mt-0.5 leading-relaxed">
                  Abre primero la aplicación en una pestaña completa del navegador para habilitar el botón nativo de instalación del sistema operativo.
                </p>
              </div>
              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Abrir en Pestaña Completa</span>
              </a>
            </div>
          )}

          {/* Already installed banner */}
          {isInstalled && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs text-emerald-900 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>¡La aplicación ya se encuentra instalada en este dispositivo con todo el sistema cargado!</span>
            </div>
          )}

          {/* TAB 0: COMPUTADOR (WINDOWS / MAC / CHROME / EDGE) */}
          {activeTab === 'desktop' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Instalar en Computador (Windows / Mac):
                </h4>
                <span className="text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                  Google Chrome / Microsoft Edge
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Abre el enlace en una pestaña de Chrome o Edge</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Si estás en el visor de vista previa, haz clic en <strong>"Abrir en Pestaña Completa"</strong> aquí abajo.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Haz clic en el botón "Instalar App Ahora" o en el icono de la barra de direcciones
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      En la parte derecha de la barra de direcciones (junto a la estrella de favoritos) verás un icono de <strong>computador con una flecha de descarga</strong>. Haz clic en él y selecciona <strong>"Instalar"</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Acceso directo en tu Escritorio y Barra de Tareas</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      La app se abrirá en su propia ventana independiente y creará su icono en el Escritorio de tu computador con las 60 rondas, horarios, medidores, solicitudes y usuarios cargados.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 1: ANDROID */}
          {activeTab === 'android' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Pasos para instalar en teléfonos Android:
                </h4>
                <span className="text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                  Google Chrome
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Abre el enlace en Google Chrome</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Copia el enlace de abajo y ábrelo directamente en el navegador Google Chrome de tu teléfono móvil.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                      <span>Toca "Instalar App Ahora" o los tres puntos</span>
                      <MoreVertical className="w-3.5 h-3.5 text-slate-600 inline" />
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Puedes pulsar el botón verde <strong>"Instalar Ahora"</strong> o abrir el menú de tres puntos arriba a la derecha en Chrome.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">
                      Selecciona <strong className="text-blue-700">"Instalar aplicación"</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Confirma la instalación. El icono quedará en tu pantalla principal y abrirá a pantalla completa con todos los datos del sistema listos.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IPHONE / IPAD */}
          {activeTab === 'ios' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Pasos para instalar en iPhone o iPad:
                </h4>
                <span className="text-[11px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-md">
                  Safari iOS
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    1
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                      <span>Abre en Safari y toca Compartir</span>
                      <Share2 className="w-3.5 h-3.5 text-blue-600 inline" />
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      En la barra de Safari, pulsa el icono cuadrado con la flecha apuntando hacia arriba.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                      <span>Selecciona</span>
                      <PlusSquare className="w-3.5 h-3.5 text-blue-600 inline" />
                      <strong className="text-blue-700">"Añadir a pantalla de inicio"</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Desliza hacia abajo en el menú de opciones de Safari y elige "Añadir a pantalla de inicio".
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Toca "Añadir" arriba a la derecha</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      La app quedará instalada en tu inicio como aplicación nativa con toda la información del sistema cargada.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DATOS Y SINCRONIZACIÓN */}
          {activeTab === 'updates' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 space-y-1.5">
                <div className="flex items-center space-x-2">
                  <Database className="w-4 h-4 text-emerald-600 shrink-0" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-900">
                    Todo Cargado en el Sistema sin Errores
                  </h4>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Al instalar la aplicación en cualquier teléfono o computador, incluye de forma inmediata e íntegra toda la base de datos del hotel:
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Historial Completo Pre-Cargado y Sincronizado</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Incluye todas las rondas diarias registradas (60 rondas con sus 26 puntos de control), 323 turnos de horarios de técnicos, 13 medidores de consumo, solicitudes, novedades y los 7 perfiles de usuario.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2.5">
                  <RefreshCw className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Sincronización en Tiempo Real (Móvil y PC)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Cualquier ronda, lectura, solicitud o cambio registrado en el teléfono se refleja al instante en el computador y viceversa, sin parpadeos ni pérdida de información.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Respaldo Offline con IndexedDB</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Protección automática de memoria para que nunca ocurran errores de cuota ni pérdida de fotos o firmas incluso en cuartos de máquinas sin señal.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Copy Link / Open in new tab Box */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="w-full sm:w-auto flex-1 min-w-0">
              <p className="text-[10px] text-slate-400 font-medium truncate">
                Enlace directo de instalación (Teléfono y Computador):
              </p>
              <p className="text-[11px] font-mono text-slate-600 truncate bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 mt-0.5">
                {currentUrl}
              </p>
            </div>

            <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
              <button
                onClick={handleCopyLink}
                className="flex-1 sm:flex-initial py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors border border-slate-200"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? '¡Copiado!' : 'Copiar Enlace'}</span>
              </button>

              <a
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-initial py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-colors shadow-2xs"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Abrir en Pestaña</span>
              </a>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Entendido / Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
