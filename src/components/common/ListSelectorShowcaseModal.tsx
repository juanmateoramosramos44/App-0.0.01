import React, { useState } from 'react';
import { 
  Check, 
  ChevronDown, 
  Layers, 
  Sparkles, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  HelpCircle,
  Smartphone,
  Sliders,
  Radio
} from 'lucide-react';

export type SelectorStyle = 'segmented' | 'popover' | 'cards' | 'bottomSheet';

export interface OptionItem<T = string> {
  value: T;
  label: string;
  description?: string;
  badge?: string;
  color?: 'emerald' | 'amber' | 'rose' | 'blue' | 'slate';
  icon?: React.ReactNode;
}

interface ListSelectorShowcaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentStyle: SelectorStyle;
  onSelectStyle: (style: SelectorStyle) => void;
}

export const ListSelectorShowcaseModal: React.FC<ListSelectorShowcaseModalProps> = ({
  isOpen,
  onClose,
  currentStyle,
  onSelectStyle,
}) => {
  // Demo state for the interactive preview
  const [demoValue, setDemoValue] = useState<string>('sin_goteo');
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isBottomSheetOpen, setIsBottomSheetOpen] = useState(false);

  if (!isOpen) return null;

  const demoOptions: OptionItem[] = [
    {
      value: 'sin_goteo',
      label: 'Sin goteo (Seco OK)',
      description: 'Estanqueidad perfecta, caras de carburo y silicio sellando.',
      badge: 'Óptimo',
      color: 'emerald',
    },
    {
      value: 'goteo_normal',
      label: 'Goteo normal refrigerado',
      description: 'Micro-lubricación aceptable por el fabricante (<10 gotas/min).',
      badge: 'En Rango',
      color: 'amber',
    },
    {
      value: 'fuga_excesiva',
      label: 'Fuga excesiva (Cambiar)',
      description: 'Pérdida continua de agua, riesgo de inundación de rodamiento.',
      badge: 'Alerta',
      color: 'rose',
    },
  ];

  const selectedOption = demoOptions.find(o => o.value === demoValue) || demoOptions[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-3xl my-8 shadow-2xl border border-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-start justify-between pb-5 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  Diseño de Interfaz Móvil
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 mt-1">
                Formas Modernas de Despliegue de Listas
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Reemplazos modernos a la lista emergente negra predeterminada de Android para mayor velocidad técnica
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Introduction note */}
        <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-start space-x-3">
          <Smartphone className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-slate-800">
              ¿Por qué salía esa lista oscura en tu teléfono?
            </p>
            <p className="mt-0.5 leading-relaxed text-slate-600">
              En dispositivos móviles, la etiqueta estándar de navegador <code className="bg-slate-200 px-1 py-0.5 rounded font-mono text-[11px]">&lt;select&gt;</code> abre el menú nativo del sistema operativo (con botones de radio grandes y fondo oscuro). A continuación puedes ver y activar las <strong>4 alternativas profesionales</strong> diseñadas directamente en la app.
            </p>
          </div>
        </div>

        {/* 4 STYLES SHOWCASE */}
        <div className="space-y-6 mt-6">
          
          {/* OPCIÓN 1: BOTONES SEGMENTADOS / CHIPS (Recomendado para 2-4 opciones) */}
          <div className={`p-5 rounded-2xl border transition-all ${
            currentStyle === 'segmented' 
              ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-500/20' 
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  1
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  Botones Segmentados / Chips Táctiles (Pills)
                </h4>
                <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                  ★ Más Rápido en Campo
                </span>
              </div>
              <button
                type="button"
                onClick={() => onSelectStyle('segmented')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  currentStyle === 'segmented'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {currentStyle === 'segmented' ? '✓ Activo' : 'Usar este estilo'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Todas las opciones están visibles de inmediato en pantalla. No requiere desplegar ningún menú: se selecciona con un solo toque.
            </p>

            {/* LIVE PREVIEW: SEGMENTED */}
            <div className="bg-slate-100/80 p-3 rounded-xl border border-slate-200">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Demostración Interactiva (Toca una opción):
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {demoOptions.map(opt => {
                  const isSelected = demoValue === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setDemoValue(opt.value)}
                      className={`p-2.5 rounded-xl text-xs font-semibold flex items-center justify-between transition-all ${
                        isSelected
                          ? opt.color === 'emerald'
                            ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                            : opt.color === 'amber'
                              ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
                              : 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                          : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <span className={`w-2 h-2 rounded-full ${
                          isSelected ? 'bg-white' : 
                          opt.color === 'emerald' ? 'bg-emerald-500' :
                          opt.color === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
                        }`} />
                        <span className="text-left">{opt.label}</span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 shrink-0 ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* OPCIÓN 2: MENÚ DESPLEGABLE FLOTANTE ELEGANTE (Popover) */}
          <div className={`p-5 rounded-2xl border transition-all ${
            currentStyle === 'popover' 
              ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-500/20' 
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  2
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  Desplegable Flotante Moderno (Dropdown Popover)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => onSelectStyle('popover')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  currentStyle === 'popover'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {currentStyle === 'popover' ? '✓ Activo' : 'Usar este estilo'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Mantiene la apariencia de un campo desplegable pero se abre suavemente justo debajo como un menú integrado en la app, sin oscurecer toda la pantalla.
            </p>

            {/* LIVE PREVIEW: POPOVER */}
            <div className="bg-slate-100/80 p-3 rounded-xl border border-slate-200 relative">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                Demostración Interactiva (Toca el campo):
              </label>
              
              <button
                type="button"
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                className="w-full p-3 rounded-xl bg-white border border-slate-300 shadow-xs flex items-center justify-between text-xs text-left"
              >
                <div className="flex items-center space-x-2.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    selectedOption?.color === 'emerald' ? 'bg-emerald-500' :
                    selectedOption?.color === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
                  }`} />
                  <span className="font-semibold text-slate-800">{selectedOption?.label || ''}</span>
                  {selectedOption?.badge && (
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-bold">
                      {selectedOption.badge}
                    </span>
                  )}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isPopoverOpen ? 'rotate-180' : ''}`} />
              </button>

              {isPopoverOpen && (
                <div className="mt-2 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden divide-y divide-slate-100 z-10 animate-in fade-in zoom-in-95 duration-150">
                  {demoOptions.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setDemoValue(opt.value);
                        setIsPopoverOpen(false);
                      }}
                      className={`w-full p-3 text-left text-xs flex items-center justify-between hover:bg-slate-50 transition-colors ${
                        demoValue === opt.value ? 'bg-blue-50/50 font-bold text-blue-900' : 'text-slate-700'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          opt.color === 'emerald' ? 'bg-emerald-500' :
                          opt.color === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
                        }`} />
                        <div>
                          <p>{opt.label}</p>
                          <p className="text-[11px] text-slate-400 font-normal">{opt.description}</p>
                        </div>
                      </div>
                      {demoValue === opt.value && (
                        <Check className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* OPCIÓN 3: TARJETAS VISUALES CON DESCRIPCIÓN */}
          <div className={`p-5 rounded-2xl border transition-all ${
            currentStyle === 'cards' 
              ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-500/20' 
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  3
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  Tarjetas Visuales con Diagnóstico Técnico
                </h4>
              </div>
              <button
                type="button"
                onClick={() => onSelectStyle('cards')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  currentStyle === 'cards'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {currentStyle === 'cards' ? '✓ Activo' : 'Usar este estilo'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Muestra cada estado como una tarjeta táctil amplia con texto explicativo, ideal para técnicos noveles o auditorías rigurosas.
            </p>

            {/* LIVE PREVIEW: CARDS */}
            <div className="bg-slate-100/80 p-3 rounded-xl border border-slate-200 space-y-2">
              {demoOptions.map(opt => {
                const isSelected = demoValue === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setDemoValue(opt.value)}
                    className={`w-full p-3 rounded-xl text-left transition-all flex items-start justify-between ${
                      isSelected
                        ? 'bg-white border-2 border-blue-600 shadow-md'
                        : 'bg-white/70 border border-slate-200 hover:bg-white'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-4 h-4 rounded-full mt-0.5 border flex items-center justify-center ${
                        isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-400 bg-white'
                      }`}>
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-slate-900">{opt.label}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full ${
                            opt.color === 'emerald' ? 'bg-emerald-100 text-emerald-800' :
                            opt.color === 'amber' ? 'bg-amber-100 text-amber-800' :
                            'bg-rose-100 text-rose-800'
                          }`}>
                            {opt.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{opt.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* OPCIÓN 4: HOJA INFERIOR MÓVIL ESTILIZADA (Modern Bottom Sheet) */}
          <div className={`p-5 rounded-2xl border transition-all ${
            currentStyle === 'bottomSheet' 
              ? 'border-blue-600 bg-blue-50/20 ring-2 ring-blue-500/20' 
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                  4
                </span>
                <h4 className="text-sm font-bold text-slate-900">
                  Hoja Deslizante Inferior Estilizada (Action Bottom Sheet)
                </h4>
              </div>
              <button
                type="button"
                onClick={() => onSelectStyle('bottomSheet')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  currentStyle === 'bottomSheet'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {currentStyle === 'bottomSheet' ? '✓ Activo' : 'Usar este estilo'}
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Similar al concepto móvil que se desliza desde la parte inferior, pero con estética limpia, iconos claros, colores técnicos y sin el fondo negro genérico de Android.
            </p>

            {/* LIVE PREVIEW: BOTTOM SHEET TRIGGER */}
            <div className="bg-slate-100/80 p-3 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setIsBottomSheetOpen(true)}
                className="w-full p-3 rounded-xl bg-white border border-slate-300 shadow-xs flex items-center justify-between text-xs font-semibold text-slate-800"
              >
                <span>Probar Hoja Deslizante: <strong>{selectedOption.label}</strong></span>
                <span className="px-2 py-1 rounded bg-blue-50 text-blue-600 text-[11px] font-bold">
                  Abrir Demo ↓
                </span>
              </button>
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Estilo seleccionado actualmente: <strong className="text-blue-600 uppercase font-bold">{currentStyle}</strong>
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            Listo, Aplicar a la App
          </button>
        </div>

      </div>

      {/* DEMO BOTTOM SHEET (MODERN) */}
      {isBottomSheetOpen && (
        <div 
          className="fixed inset-0 z-60 flex items-end justify-center bg-slate-950/70"
          onClick={() => setIsBottomSheetOpen(false)}
        >
          <div className="bg-white rounded-t-3xl w-full max-w-lg p-6 shadow-2xl animate-in slide-in-from-bottom duration-250 border-t border-slate-200">
            {/* Grab handle bar */}
            <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />
            
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Estado del Sello Mecánico</h4>
                <p className="text-xs text-slate-500">Seleccione el diagnóstico observado en la bomba</p>
              </div>
              <button
                onClick={() => setIsBottomSheetOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              {demoOptions.map(opt => {
                const isSelected = demoValue === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      setDemoValue(opt.value);
                      setIsBottomSheetOpen(false);
                    }}
                    className={`w-full p-3.5 rounded-2xl text-left flex items-center justify-between transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border border-blue-300 font-bold text-blue-950'
                        : 'bg-slate-50 hover:bg-slate-100 border border-slate-200/70 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <span className={`w-3 h-3 rounded-full ${
                        opt.color === 'emerald' ? 'bg-emerald-500' :
                        opt.color === 'amber' ? 'bg-amber-500' : 'bg-rose-500'
                      }`} />
                      <div>
                        <p className="text-xs">{opt.label}</p>
                        <p className="text-[11px] text-slate-500 font-normal">{opt.description}</p>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setIsBottomSheetOpen(false)}
              className="mt-4 w-full py-2.5 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
