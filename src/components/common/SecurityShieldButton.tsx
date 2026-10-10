import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { SecurityShieldModal } from './SecurityShieldModal';

export const SecurityShieldButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 text-emerald-400 border border-emerald-500/30 hover:bg-slate-700/80 transition-all cursor-pointer shadow-xs"
        title="Escudo de Seguridad Avanzada (Zero-Trust) Activo"
      >
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden xl:inline text-slate-200">Seguridad 100%</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      </button>

      <SecurityShieldModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};
