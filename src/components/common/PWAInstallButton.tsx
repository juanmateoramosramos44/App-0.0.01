import React, { useState } from 'react';
import { Download, Smartphone, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import { PWAInstallModal } from './PWAInstallModal';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'nav' | 'banner' | 'settings' | 'compact';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ 
  className = '',
  variant = 'nav'
}) => {
  const { isInstalled, isInstallable } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already running in standalone mode (installed app), optionally render a subtle badge or null
  if (isInstalled && variant === 'nav') {
    return null;
  }

  if (variant === 'settings') {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className={`inline-flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all ${className}`}
        >
          <Smartphone className="w-4 h-4 text-cyan-300" />
          <span>{isInstalled ? 'App Instalada en Teléfono' : 'Descargar e Instalar en Teléfono'}</span>
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
          onClick={() => setShowModal(true)}
          className={`p-2 rounded-xl text-xs font-bold text-blue-300 hover:text-white bg-blue-500/20 hover:bg-blue-500/30 border border-blue-400/30 transition-all flex items-center space-x-1.5 ${className}`}
          title="Descargar App en mi teléfono"
        >
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <span className="hidden sm:inline">Instalar App</span>
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
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center space-x-2 px-3 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-xs border border-blue-400/30 transition-all active:scale-98 animate-pulse-slow ${className}`}
      >
        <Smartphone className="w-4 h-4 text-cyan-300" />
        <span>Descargar en Teléfono</span>
        <Download className="w-3.5 h-3.5 text-white/90" />
      </button>

      <PWAInstallModal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)} 
      />
    </>
  );
};
