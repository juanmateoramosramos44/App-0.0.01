import React, { useState } from 'react';
import { Download, Smartphone, Monitor, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'nav' | 'banner' | 'settings' | 'compact' | 'login';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '',
  variant = 'nav'
}) => {
  const { isInstalled, isInstallable, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted) return;
    }
    setShowModal(true);
  };

  if (isInstalled && (variant === 'nav' || variant === 'compact')) {
    return null;
  }

  if (variant === 'login') {
    return (
      <>
        <div className="w-full bg-slate-950/60 border border-cyan-500/30 rounded-2xl p-3.5 space-y-2 text-center shadow-lg">
          <div className="flex items-center justify-center gap-1.5 text-cyan-300 text-xs font-bold uppercase tracking-wider">
            <Smartphone className="w-4 h-4" />
            <Monitor className="w-4 h-4" />
            <span>Descargar Aplicación</span>
          </div>
          <p className="text-[11px] text-slate-300 leading-snug">
            Instálala en tu teléfono (Android / iPhone) o computador (Windows / Mac) para abrirla al instante en pantalla completa.
          </p>
          <button
            type="button"
            onClick={handleClick}
            className={`w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md border border-cyan-400/40 transition-all flex items-center justify-center space-x-2 active:scale-[0.99] cursor-pointer ${className}`}
          >
            <Download className="w-4 h-4 text-white shrink-0" />
            <span>
              {isInstalled
                ? 'App Instalada (Ver Guía / Reinstalar)'
                : isInstallable
                ? 'Descargar / Instalar en 1 Clic'
                : 'Descargar en Teléfono o PC'}
            </span>
          </button>
        </div>

        <PWAInstallModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
        />
      </>
    );
  }

  if (variant === 'settings') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all ${className}`}
        >
          {isInstalled ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          ) : (
            <>
              <Smartphone className="w-4 h-4 text-cyan-300" />
              <Monitor className="w-4 h-4 text-cyan-300" />
            </>
          )}
          <span>
            {isInstalled
              ? 'App Instalada (Ver Guía para Otros Dispositivos)'
              : isInstallable
              ? 'Instalar App Ahora en 1 Clic'
              : 'Instalar en Teléfono y Computador'}
          </span>
          <Download className="w-3.5 h-3.5 ml-1" />
        </button>

        <PWAInstallModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
        />
      </>
    );
  }

  if (variant === 'compact') {
    return (
      <>
        <button
          type="button"
          onClick={handleClick}
          className={`px-2.5 py-1.5 rounded-xl text-xs font-bold text-cyan-300 hover:text-white bg-blue-600/25 hover:bg-blue-600/40 border border-blue-400/30 transition-all flex items-center space-x-1.5 shrink-0 ${className}`}
          title="Instalar App en Teléfono o Computador"
        >
          <Download className="w-3.5 h-3.5 text-cyan-300" />
          <span>Instalar App</span>
        </button>

        <PWAInstallModal 
          isOpen={showModal} 
          onClose={() => setShowModal(false)} 
        />
      </>
    );
  }

  // Default 'nav' variant
  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={`inline-flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs border border-blue-400/30 transition-all active:scale-98 ${className}`}
      >
        <Smartphone className="w-4 h-4 text-cyan-300" />
        <Monitor className="w-4 h-4 text-cyan-300 hidden sm:inline" />
        <span>{isInstallable ? 'Instalar App Ahora' : 'Instalar en Teléfono / PC'}</span>
        <Download className="w-3.5 h-3.5 text-white/90" />
      </button>

      <PWAInstallModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  );
};
