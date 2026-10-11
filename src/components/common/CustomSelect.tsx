import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export type SelectorStyle = 'segmented' | 'popover' | 'cards' | 'bottomSheet';

export interface OptionItem<T = string> {
  value: T;
  label: string;
  description?: string;
  badge?: string;
  color?: 'emerald' | 'amber' | 'rose' | 'blue' | 'slate' | 'indigo' | 'teal' | 'cyan' | 'sky' | 'orange' | 'violet' | string;
  icon?: React.ReactNode;
}

interface CustomSelectProps {
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: OptionItem[];
  style?: SelectorStyle;
  className?: string;
  disabled?: boolean;
  placeholder?: string;
}

const getDotColorClass = (color?: string, fallback = 'bg-slate-400') => {
  if (!color) return fallback;
  if (color === 'emerald') return 'bg-emerald-500';
  if (color === 'amber') return 'bg-amber-500';
  if (color === 'rose') return 'bg-rose-500';
  if (color === 'blue') return 'bg-blue-500';
  if (color === 'sky') return 'bg-sky-500';
  if (color === 'indigo') return 'bg-indigo-500';
  if (color === 'teal') return 'bg-teal-500';
  if (color === 'cyan') return 'bg-cyan-500';
  if (color === 'orange') return 'bg-orange-500';
  if (color === 'violet') return 'bg-violet-500';
  return fallback;
};

export const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  onChange,
  options = [],
  style = 'popover',
  className = '',
  disabled = false,
  placeholder = 'Seleccionar...',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const safeOptions = Array.isArray(options) ? options.filter(Boolean) : [];
  const selectedOption: OptionItem | undefined = safeOptions.find(o => o && o.value === value);
  const displayLabel = selectedOption ? selectedOption.label : (value || placeholder);

  // 1. STYLE: SEGMENTED BUTTONS (Best for quick 2-4 option choices)
  if (style === 'segmented' && safeOptions.length <= 4) {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {label && (
          <label className="block text-[11px] font-semibold text-slate-700">
            {label}
          </label>
        )}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-100/90 rounded-xl border border-slate-200">
          {safeOptions.map(opt => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange(opt.value)}
                className={`flex-1 min-w-[75px] py-2 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all text-center ${
                  isSelected
                    ? opt.color === 'rose'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : opt.color === 'amber'
                        ? 'bg-amber-500 text-white shadow-xs'
                        : opt.color === 'blue'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  isSelected ? 'bg-white' : getDotColorClass(opt.color)
                }`} />
                <span className="truncate">{opt.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. STYLE: CUSTOM POPOVER DROPDOWN (Sleek in-app floating menu, white, crisp & responsive)
  if (style === 'popover' || (style === 'segmented' && safeOptions.length > 4)) {
    return (
      <div ref={containerRef} className={`space-y-1 relative ${className}`}>
        {label && (
          <label className="block text-[11px] font-semibold text-slate-700">
            {label}
          </label>
        )}
        
        <button
          type="button"
          disabled={disabled}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full px-3 py-2 rounded-xl bg-white border text-xs flex items-center justify-between shadow-2xs transition-colors text-left ${
            disabled ? 'opacity-60 cursor-not-allowed bg-slate-50 border-slate-200' : 'border-slate-300 hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500'
          }`}
        >
          <div className="flex items-center space-x-2 truncate pr-2">
            {selectedOption?.color && (
              <span className={`w-2 h-2 rounded-full shrink-0 ${getDotColorClass(selectedOption.color)}`} />
            )}
            <span className={`truncate ${selectedOption ? 'font-semibold text-slate-800' : 'text-slate-400'}`}>
              {displayLabel}
            </span>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-blue-600' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden divide-y divide-slate-100 z-50 max-h-64 overflow-y-auto animate-in fade-in zoom-in-95 duration-150">
            {safeOptions.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                  value === opt.value ? 'bg-blue-50/90 font-bold text-blue-950' : 'text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2.5 truncate mr-2">
                  {opt.color && (
                    <span className={`w-2 h-2 rounded-full shrink-0 ${getDotColorClass(opt.color)}`} />
                  )}
                  <div className="truncate">
                    <span className="truncate block font-medium">{opt.label}</span>
                    {opt.description && (
                      <span className="text-[10px] text-slate-400 block truncate font-normal">{opt.description}</span>
                    )}
                  </div>
                </div>
                {value === opt.value && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0 ml-1" />}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  // 3. STYLE: VISUAL CARDS
  if (style === 'cards') {
    return (
      <div className={`space-y-1.5 ${className}`}>
        {label && (
          <label className="block text-[11px] font-semibold text-slate-700">
            {label}
          </label>
        )}
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {safeOptions.map(opt => {
            const isSelected = value === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                disabled={disabled}
                onClick={() => onChange(opt.value)}
                className={`w-full p-2.5 rounded-xl text-left transition-all flex items-center justify-between border ${
                  isSelected
                    ? 'bg-blue-50/80 border-blue-500 text-blue-950 shadow-2xs font-semibold'
                    : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-start space-x-2.5 mr-2 truncate">
                  <span className={`w-2.5 h-2.5 rounded-full mt-1 shrink-0 ${getDotColorClass(opt.color)}`} />
                  <div className="truncate">
                    <span className="text-xs font-bold block truncate">{opt.label}</span>
                    {opt.description && (
                      <p className="text-[10px] text-slate-500 font-normal mt-0.5 leading-tight truncate">{opt.description}</p>
                    )}
                  </div>
                </div>
                {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // 4. STYLE: BOTTOM SHEET (Drawer from bottom on mobile)
  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label className="block text-[11px] font-semibold text-slate-700">
          {label}
        </label>
      )}
      
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className="w-full px-3 py-2 rounded-xl bg-white border border-slate-300 text-xs flex items-center justify-between shadow-2xs hover:border-blue-400 text-left transition-colors"
      >
        <div className="flex items-center space-x-2 truncate pr-2">
          {selectedOption?.color && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${getDotColorClass(selectedOption.color)}`} />
          )}
          <span className="font-semibold text-slate-800 truncate">{displayLabel}</span>
        </div>
        <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />
      </button>

      {isOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 animate-in fade-in duration-150"
          onClick={() => setIsOpen(false)}
        >
          <div 
            className="bg-white rounded-t-3xl w-full max-w-md p-5 shadow-2xl max-h-[80vh] flex flex-col animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-3 shrink-0" />
            <div className="flex items-center justify-between mb-3 shrink-0">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">{label || 'Seleccionar Opción'}</h4>
              <button 
                type="button"
                onClick={() => setIsOpen(false)} 
                className="text-slate-400 p-1 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5 overflow-y-auto pr-1">
              {safeOptions.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full p-3 rounded-xl text-left flex items-center justify-between text-xs transition-colors ${
                    value === opt.value ? 'bg-blue-50 text-blue-900 font-bold border border-blue-200' : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5 truncate mr-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${getDotColorClass(opt.color)}`} />
                    <div className="truncate">
                      <span className="block font-medium truncate">{opt.label}</span>
                      {opt.description && (
                        <span className="text-[10px] text-slate-400 block font-normal truncate">{opt.description}</span>
                      )}
                    </div>
                  </div>
                  {value === opt.value && <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
