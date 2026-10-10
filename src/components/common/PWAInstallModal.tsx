import React, { useState } from 'react';
import { 
  Download, 
  Smartphone, 
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
  ShieldCheck
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'android' | 'ios' | 'updates'>(
    isIOS ? 'ios' : 'android'
  );

  if (!isOpen) return null;

  const currentUrl = window.location.href;

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
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-5 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1.5 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center space-x-3.5">
            <div className="w-13 h-13 rounded-2xl bg-blue-600 p-2.5 shadow-lg border border-blue-400/30 flex items-center justify-center shrink-0">
              <img src="/pwa-192x192.png" alt="App Icon" className="w-full h-full object-contain rounded-xl" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-white leading-snug">
                  Instalar App en tu Teléfono
                </h3>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  PWA Nativa
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Mantenimiento Hotelero & Bombas
              </p>
            </div>
          </div>

          {/* Quick Tabs */}
          <div className="flex space-x-1.5 mt-4 p-1 bg-white/10 rounded-xl">
            <button
              onClick={() => setActiveTab('android')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'android' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Android (Chrome)</span>
            </button>
            <button
              onClick={() => setActiveTab('ios')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'ios' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
              }`}
            >
              <span>iPhone (Safari)</span>
            </button>
            <button
              onClick={() => setActiveTab('updates')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                activeTab === 'updates' ? 'bg-amber-500 text-slate-950 shadow-xs font-extrabold' : 'text-slate-300 hover:text-white'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>¿Actualizaciones?</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5">
          
          {/* Direct Install Button if browser supports beforeinstallprompt */}
          {isInstallable && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-emerald-900 flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>¡Tu teléfono está listo para instalar en 1 clic!</span>
                </p>
                <p className="text-[11px] text-emerald-700 mt-0.5">
                  Presiona el botón para agregar el icono directo a tu pantalla de inicio.
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

          {/* Already installed banner */}
          {isInstalled && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3.5 text-xs text-blue-900 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
              <span>¡La aplicación ya se encuentra instalada y funcionando en modo autónomo!</span>
            </div>
          )}

          {/* TAB 1: ANDROID */}
          {activeTab === 'android' && (
            <div className="space-y-3.5">
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
                      Asegúrate de abrir esta app directamente en el navegador Google Chrome de tu teléfono móvil (no dentro de un visor de chat).
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                      <span>Toca los tres puntos</span>
                      <MoreVertical className="w-3.5 h-3.5 text-slate-600 inline" />
                      <span>arriba a la derecha</span>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      En la esquina superior derecha del navegador Chrome, pulsa el menú de opciones (los tres puntos verticales).
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                      <span>Selecciona</span>
                      <strong className="text-blue-700">"Instalar aplicación"</strong>
                      <span>o</span>
                      <strong className="text-blue-700">"Agregar a la pantalla principal"</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Confirma la instalación. Aparecerá el icono de la app en la pantalla de tu móvil y abrirá a pantalla completa como cualquier app nativa (sin barra de direcciones web).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: IPHONE / IPAD */}
          {activeTab === 'ios' && (
            <div className="space-y-3.5">
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
                      <span>Toca el botón Compartir</span>
                      <Share2 className="w-3.5 h-3.5 text-blue-600 inline" />
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      En la barra inferior de Safari, pulsa el icono cuadrado con la flecha apuntando hacia arriba.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    2
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800 flex items-center space-x-1">
                      <span>Desliza y toca</span>
                      <PlusSquare className="w-3.5 h-3.5 text-blue-600 inline" />
                      <strong className="text-blue-700">"Añadir a pantalla de inicio"</strong>
                    </p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      Busca la opción con el signo de suma entre las acciones disponibles de Safari.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    3
                  </span>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Toca "Añadir" en la esquina superior</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                      El icono de la aplicación se creará en tu pantalla de inicio junto a tus demás aplicaciones y abrirá a pantalla completa.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: UPDATES (RESPUESTA EXACTA A LA PREGUNTA DEL USUARIO) */}
          {activeTab === 'updates' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-950 space-y-2">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="w-4 h-4 text-amber-600 shrink-0 animate-spin-slow" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                    ¿La puedo ir actualizando poco a poco?
                  </h4>
                </div>
                <p className="text-xs font-bold text-emerald-700">
                  ¡SÍ, TOTALMENTE! Y es la mayor ventaja de esta aplicación:
                </p>
                <p className="text-xs text-amber-900/90 leading-relaxed">
                  No necesitas ir a Google Play ni a la App Store a descargar actualizaciones manualmente. Cada vez que hagamos cambios o mejoras aquí en la app:
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Actualización Silenciosa y Automática</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Cuando abras la aplicación en tu teléfono con conexión a internet, el sistema descargará los nuevos ajustes en segundo plano automáticamente.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Tus Datos Nunca se Borran</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Todas tus rondas diarias registradas, revisiones de bombas, configuraciones y órdenes de trabajo se mantienen intactas en la memoria de tu teléfono aunque la app se actualice.
                    </p>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-2.5">
                  <Smartphone className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-slate-900">Icono e Identidad Permanente</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      No tienes que volver a instalarla. El mismo icono en la pantalla de tu móvil se renovará solo con las nuevas funciones.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Copy Link / Open in new tab Box */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5">
            <div className="w-full sm:w-auto flex-1">
              <p className="text-[10px] text-slate-400 font-medium truncate">
                Enlace para abrir en tu teléfono:
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
                rel="noreferrer"
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
