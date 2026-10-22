import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, X } from 'lucide-react';

export const PWAAutoPrompt: React.FC = () => {
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check if already running standalone (installed)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://');

    if (isStandalone) return;

    // Check if iOS device in Safari
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /safari/.test(ua) && !/chrome|crios|crmo|firefox|fxios/.test(ua);

    const hasDismissed = sessionStorage.getItem('hotel_pwa_ios_dismissed') === 'true';

    if (isIOS && isSafari && !hasDismissed) {
      // Show automatic guidance on iOS after brief delay
      const timer = setTimeout(() => {
        setShowIOSPrompt(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  if (!showIOSPrompt) return null;

  return (
    <div className="fixed bottom-3 left-3 right-3 sm:left-auto sm:right-4 sm:bottom-4 z-50 max-w-sm bg-slate-900/95 backdrop-blur-md text-white p-4 rounded-2xl shadow-2xl border border-blue-500/40 animate-in slide-in-from-bottom duration-300">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center space-x-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shrink-0">
            <Share className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Descargar App en tu iPhone</h4>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
              Para tenerla en tu teléfono, toca el botón <strong>Compartir</strong> de Safari abajo y selecciona <strong className="text-blue-300">"Agregar a Inicio"</strong> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5" />.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setShowIOSPrompt(false);
            sessionStorage.setItem('hotel_pwa_ios_dismissed', 'true');
          }}
          className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          title="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
