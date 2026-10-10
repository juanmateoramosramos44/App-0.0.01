import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Sparkles } from 'lucide-react';

export interface FuturisticSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  badge?: string;
  code?: string;
  icon?: React.ReactNode;
  color?: 'cyan' | 'blue' | 'amber' | 'rose' | 'emerald' | 'purple' | 'slate';
}

interface FuturisticMeterSelectProps {
  label?: string;
  sublabel?: string;
  value: string;
  onChange: (val: string) => void;
  options: FuturisticSelectOption[];
  placeholder?: string;
  className?: string;
  variant?: 'filter' | 'form' | 'compact';
  disabled?: boolean;
  align?: 'left' | 'right' | 'center';
  icon?: React.ReactNode;
}

export const FuturisticMeterSelect: React.FC<FuturisticMeterSelectProps> = ({
  label,
  sublabel,
  value,
  onChange,
  options = [],
  placeholder = 'Seleccionar...',
  className = '',
  variant = 'form',
  disabled = false,
  align = 'center',
  icon,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [computedAlign, setComputedAlign] = useState<'left' | 'right' | 'center'>(align);
  const containerRef = useRef<HTMLDivElement>(null);

  // Smart placement to keep the popover centered and within mobile viewport boundaries
  useEffect(() => {
    if (isOpen && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const screenWidth = window.innerWidth;
      const popoverEstimatedWidth = 290;
      const centerPos = rect.left + rect.width / 2;

      if (align === 'center') {
        if (centerPos - popoverEstimatedWidth / 2 < 8) {
          setComputedAlign('left');
        } else if (centerPos + popoverEstimatedWidth / 2 > screenWidth - 8) {
          setComputedAlign('right');
        } else {
          setComputedAlign('center');
        }
      } else if (align === 'right') {
        if (rect.right < popoverEstimatedWidth + 8) {
          setComputedAlign('center');
        } else {
          setComputedAlign('right');
        }
      } else {
        if (rect.left + popoverEstimatedWidth > screenWidth - 8) {
          if (centerPos - popoverEstimatedWidth / 2 >= 8 && centerPos + popoverEstimatedWidth / 2 <= screenWidth - 8) {
            setComputedAlign('center');
          } else {
            setComputedAlign('right');
          }
        } else {
          setComputedAlign('left');
        }
      }
    }
  }, [isOpen, align]);

  // Close when clicking outside or pressing Escape
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
  const selectedOption = safeOptions.find(o => o.value === value);

  // Dot color helper
  const getDotStyle = (color?: string) => {
    switch (color) {
      case 'cyan':
        return 'bg-cyan-500 shadow-sm shadow-cyan-400';
      case 'blue':
        return 'bg-blue-500 shadow-sm shadow-blue-400';
      case 'amber':
        return 'bg-amber-500 shadow-sm shadow-amber-400';
      case 'rose':
        return 'bg-rose-500 shadow-sm shadow-rose-400';
      case 'emerald':
        return 'bg-emerald-500 shadow-sm shadow-emerald-400';
      case 'purple':
        return 'bg-purple-500 shadow-sm shadow-purple-400';
      default:
        return 'bg-slate-400';
    }
  };

  // Badge color helper
  const getBadgeStyle = (color?: string) => {
    switch (color) {
      case 'cyan':
        return 'bg-cyan-100 text-cyan-800 border-cyan-300';
      case 'blue':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'amber':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'rose':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'emerald':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'purple':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300';
    }
  };

  return (
    <div ref={containerRef} className={`relative space-y-1 ${className}`}>
      {/* Label si se suministra */}
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-xs font-mono font-bold tracking-wide text-slate-700">
            {label}
          </label>
          {sublabel && (
            <span className="text-[10px] font-mono text-cyan-600 font-semibold">
              {sublabel}
            </span>
          )}
        </div>
      )}

      {/* Trigger Button - Futuristic Style (No plain black) */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(prev => !prev)}
        className={`w-full text-left font-mono transition-all duration-200 flex items-center justify-between cursor-pointer rounded-xl ${
          variant === 'filter'
            ? 'px-3 py-1.5 bg-gradient-to-r from-slate-50 via-cyan-50/30 to-blue-50/20 border-2 border-cyan-400/60 hover:border-cyan-500 text-slate-800 text-xs shadow-xs hover:shadow-cyan-500/10'
            : variant === 'compact'
            ? 'px-2.5 py-1.5 bg-white border-2 border-cyan-400/50 hover:border-cyan-500 text-slate-800 text-[11px] shadow-xs'
            : 'px-3.5 py-2.5 bg-white border-2 border-cyan-500/40 hover:border-cyan-500 text-slate-900 text-xs shadow-xs focus:ring-2 focus:ring-cyan-500/20'
        } ${isOpen ? 'ring-2 ring-cyan-500/30 border-cyan-500 shadow-md shadow-cyan-500/10' : ''} ${
          disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''
        }`}
      >
        <div className="flex items-center space-x-2 truncate pr-1">
          {/* Custom or service icon */}
          {icon ? (
            <span className="shrink-0 text-cyan-600">{icon}</span>
          ) : selectedOption?.icon ? (
            <span className="shrink-0">{selectedOption.icon}</span>
          ) : (
            <span
              className={`w-2 h-2 rounded-full shrink-0 transition-transform ${
                selectedOption ? getDotStyle(selectedOption.color) : 'bg-slate-300'
              }`}
            />
          )}

          {/* Label text */}
          <span className="truncate font-mono font-bold tracking-tight text-slate-800 text-xs">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        {/* Right side: animated chevron */}
        <div className="flex items-center shrink-0 ml-1">
          <ChevronDown
            className={`w-4 h-4 text-cyan-600 transition-transform duration-200 shrink-0 ${
              isOpen ? 'rotate-180 text-cyan-700' : ''
            }`}
          />
        </div>
      </button>

      {/* Floating Futuristic Popover Panel (Clean crisp light-cyber background, NO black native picker) */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-60 bg-white rounded-2xl border-2 border-cyan-400/80 shadow-2xl backdrop-blur-xl ring-4 ring-cyan-500/10 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-w-[calc(100vw-1.5rem)] ${
            computedAlign === 'center'
              ? 'left-1/2 -translate-x-1/2'
              : computedAlign === 'right'
              ? 'right-0'
              : 'left-0'
          } ${variant === 'filter' || variant === 'compact' ? 'w-[290px] sm:w-[320px]' : 'w-full min-w-[260px]'}`}
        >
          {/* High-tech Header bar */}
          <div className="px-3 py-1.5 bg-gradient-to-r from-cyan-50 via-blue-50/50 to-slate-50 border-b border-cyan-100 flex items-center justify-between text-[10px] font-mono font-bold text-cyan-800">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-600" />
              <span>{label || 'OPCIONES DISPONIBLES'}</span>
            </span>
            <span className="text-[9px] text-cyan-600 font-extrabold px-1.5 py-0.2 bg-white rounded-full border border-cyan-200">
              {safeOptions.length}
            </span>
          </div>

          {/* Options list */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 scrollbar-thin">
            {safeOptions.map(opt => {
              const isSelected = value === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 text-left font-mono transition-all flex items-center justify-between group cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-cyan-50 via-blue-50/70 to-white font-bold text-cyan-950 border-l-4 border-cyan-500'
                      : 'hover:bg-slate-50 text-slate-700 hover:text-slate-950'
                  }`}
                >
                  <div className="flex items-start space-x-2.5 mr-2 truncate">
                    {/* Icon or Color Dot */}
                    {opt.icon ? (
                      <span className="shrink-0 mt-0.5">{opt.icon}</span>
                    ) : (
                      <span
                        className={`w-2 h-2 rounded-full mt-1 shrink-0 ${getDotStyle(
                          opt.color
                        )}`}
                      />
                    )}

                    <div className="truncate">
                      <div className="flex items-center space-x-1.5 truncate">
                        {opt.code && (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-black bg-slate-100 group-hover:bg-cyan-100 text-slate-800 group-hover:text-cyan-900 border border-slate-200 shrink-0">
                            {opt.code}
                          </span>
                        )}
                        <span className="text-xs font-mono font-bold truncate block">
                          {opt.label}
                        </span>
                      </div>

                      {opt.sublabel && (
                        <p className="text-[10px] font-sans text-slate-400 group-hover:text-slate-600 mt-0.5 truncate leading-tight">
                          {opt.sublabel}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right side: Badge and Check */}
                  <div className="flex items-center space-x-2 shrink-0 ml-1">
                    {opt.badge && (
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-extrabold uppercase border ${getBadgeStyle(
                          opt.color
                        )}`}
                      >
                        {opt.badge}
                      </span>
                    )}

                    {isSelected && (
                      <div className="w-5 h-5 rounded-full bg-cyan-500 text-white flex items-center justify-center shrink-0 shadow-xs">
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
