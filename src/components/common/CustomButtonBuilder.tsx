import React, { useState } from 'react';
import { Plus, X, Sparkles, Tag, Check, RefreshCw, Edit3, Trash2, Pencil, CheckSquare, Save, Settings } from 'lucide-react';
import { CustomSelect, OptionItem } from './CustomSelect';
import { getNaturalButtonAction } from '../../utils/roundButtonUtils';
import { useDeviceDetection } from '../../hooks/useDeviceDetection';

const ACTION_OPTIONS: OptionItem[] = [
  {
    value: 'default',
    label: 'Solo Accionar / Marcar Estado (Permite escribir cifras)',
    description: 'No bloquea el campo ni fija en 0; permite ingresar cualquier valor',
    color: 'blue'
  },
  {
    value: 'turn_off',
    label: 'Apagar y Bloquear (Fija cifra en 0 y bloquea casilla)',
    description: 'Fija en 0 y deshabilita la entrada numérica',
    color: 'slate'
  },
  {
    value: 'turn_on',
    label: 'Encender Equipo (Habilitar valor numérico)',
    description: 'Restaura y habilita lecturas de medición',
    color: 'emerald'
  },
  {
    value: 'failure',
    label: 'Marcar Alarma / Falla Prioritaria',
    description: 'Reporta anomalía crítica de inmediato',
    color: 'rose'
  }
];

const COLOR_OPTIONS: OptionItem[] = [
  {
    value: 'auto',
    label: 'Automático (Según nombre)',
    description: 'Detección inteligente de color',
    color: 'slate'
  },
  {
    value: 'emerald',
    label: '🟢 Verde',
    description: 'Éxito / Operativo / Marcha',
    color: 'emerald'
  },
  {
    value: 'rose',
    label: '🔴 Rojo',
    description: 'Alarma / Peligro / Falla',
    color: 'rose'
  },
  {
    value: 'amber',
    label: '🟡 Amarillo',
    description: 'Advertencia / Observación',
    color: 'amber'
  },
  {
    value: 'slate',
    label: '⚫ Gris',
    description: 'Apagado / Inactivo / Detenido',
    color: 'slate'
  },
  {
    value: 'blue',
    label: '🔵 Azul',
    description: 'Estado normal / Estándar',
    color: 'blue'
  }
];

export interface ButtonActionConfig {
  actionType?: 'default' | 'turn_off' | 'turn_on' | 'failure';
  color?: 'auto' | 'emerald' | 'rose' | 'amber' | 'slate' | 'blue';
}

export interface CustomButtonBuilderProps {
  label?: string;
  description?: string;
  value: string; // Comma-separated list of buttons (e.g., "Encendido, Apagado, Alarmado")
  onChange: (newValue: string) => void;
  buttonActions?: Record<string, ButtonActionConfig>;
  onButtonActionsChange?: (newActions: Record<string, ButtonActionConfig>) => void;
  placeholder?: string;
  badge?: string;
}

export function getButtonColorClass(btnText: string, isSelected: boolean = false, customColor?: string) {
  const lower = (btnText || '').toLowerCase().trim();
  
  if (customColor && customColor !== 'auto') {
    if (isSelected) {
      if (customColor === 'emerald') return 'bg-emerald-600 text-white shadow-xs font-bold ring-2 ring-emerald-400 border-emerald-600';
      if (customColor === 'rose') return 'bg-rose-600 text-white shadow-xs font-bold ring-2 ring-rose-400 border-rose-600';
      if (customColor === 'amber') return 'bg-amber-500 text-white shadow-xs font-bold ring-2 ring-amber-300 border-amber-500';
      if (customColor === 'slate') return 'bg-slate-700 text-white shadow-xs font-bold ring-2 ring-slate-400 border-slate-700';
      if (customColor === 'blue') return 'bg-blue-600 text-white shadow-xs font-bold ring-2 ring-blue-400 border-blue-600';
    } else {
      if (customColor === 'emerald') return 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100';
      if (customColor === 'rose') return 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100';
      if (customColor === 'amber') return 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100';
      if (customColor === 'slate') return 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200';
      if (customColor === 'blue') return 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100';
    }
  }

  const isDanger = lower.includes('crítico') || 
                   lower.includes('critico') || 
                   lower.includes('fuga') || 
                   lower.includes('anomalía') || 
                   lower.includes('anomalia') || 
                   lower.includes('falla') || 
                   lower.includes('fuera') || 
                   lower.includes('no ok') || 
                   lower.includes('nok') || 
                   lower.includes('peligro') || 
                   lower.includes('disparado') || 
                   lower.includes('trip') || 
                   (lower.includes('alarma') && !lower.includes('no alarma') && !lower.includes('sin alarma')) ||
                   lower === 'sucio' ||
                   lower === 'crítico';

  const isWarning = lower.includes('atención') || 
                    lower.includes('atencion') || 
                    lower.includes('observación') || 
                    lower.includes('observacion') || 
                    lower.includes('leve') || 
                    lower.includes('medio') || 
                    lower.includes('requiere') || 
                    lower.includes('aseo') || 
                    lower.includes('mantenimiento') || 
                    lower.includes('standby') || 
                    lower.includes('espera') || 
                    lower.includes('manual') || 
                    lower === 'bajo' ||
                    lower === 'revisar';

  const isOff = lower.includes('apagado') || lower === 'off' || lower.includes('desactivado') || lower.includes('inactivo');

  const isSuccess = lower.includes('ok') || 
                    lower.includes('bueno') || 
                    lower.includes('operativo') || 
                    lower.includes('limpio') || 
                    lower.includes('normal') || 
                    lower.includes('no alarma') || 
                    lower.includes('sin alarma') || 
                    lower.includes('conforme') || 
                    lower.includes('servicio') || 
                    lower.includes('encendido') || 
                    lower === 'on' || 
                    lower.includes('abierto') || 
                    lower.includes('lleno') || 
                    lower.includes('automático') || 
                    lower.includes('automatico');

  if (isSelected) {
    if (isDanger) return 'bg-rose-600 text-white shadow-xs font-bold ring-2 ring-rose-400 border-rose-600';
    if (isWarning) return 'bg-amber-500 text-white shadow-xs font-bold ring-2 ring-amber-300 border-amber-500';
    if (isOff) return 'bg-slate-700 text-white shadow-xs font-bold ring-2 ring-slate-400 border-slate-700';
    if (isSuccess) return 'bg-emerald-600 text-white shadow-xs font-bold ring-2 ring-emerald-400 border-emerald-600';
    return 'bg-blue-600 text-white shadow-xs font-bold ring-2 ring-blue-400 border-blue-600';
  }

  if (isDanger) return 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100';
  if (isWarning) return 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100';
  if (isOff) return 'bg-slate-100 text-slate-800 border-slate-300 hover:bg-slate-200';
  if (isSuccess) return 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100';
  return 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100';
}

export function getStatusBadgeClass(statusText: string, customColor?: string): string {
  const lower = (statusText || '').toLowerCase().trim();

  if (customColor && customColor !== 'auto') {
    if (customColor === 'emerald') return 'bg-emerald-100 text-emerald-900 border-emerald-300 font-extrabold';
    if (customColor === 'rose') return 'bg-rose-100 text-rose-900 border-rose-300 font-extrabold';
    if (customColor === 'amber') return 'bg-amber-100 text-amber-900 border-amber-300 font-extrabold';
    if (customColor === 'slate') return 'bg-slate-700 text-white border-slate-800 font-extrabold';
    if (customColor === 'blue') return 'bg-blue-100 text-blue-900 border-blue-300 font-extrabold';
  }

  const isDanger = lower.includes('crítico') || 
                   lower.includes('critico') || 
                   lower.includes('fuga') || 
                   lower.includes('anomalía') || 
                   lower.includes('anomalia') || 
                   lower.includes('falla') || 
                   lower.includes('fuera') || 
                   lower.includes('no ok') || 
                   lower.includes('nok') || 
                   lower.includes('peligro') || 
                   lower.includes('disparado') || 
                   lower.includes('trip') || 
                   (lower.includes('alarma') && !lower.includes('no alarma') && !lower.includes('sin alarma')) ||
                   lower === 'sucio';

  const isWarning = lower.includes('atención') || 
                    lower.includes('atencion') || 
                    lower.includes('observación') || 
                    lower.includes('observacion') || 
                    lower.includes('leve') || 
                    lower.includes('requiere') || 
                    lower.includes('mantenimiento') || 
                    lower.includes('standby') || 
                    lower.includes('espera') || 
                    lower === 'bajo' ||
                    lower === 'revisar';

  const isOff = lower.includes('apagado') || lower.includes('apagar') || lower === 'off' || lower.includes('desactivado') || lower.includes('inactivo');

  const isSuccess = lower.includes('ok') || 
                    lower.includes('bueno') || 
                    lower.includes('operativo') || 
                    lower.includes('limpio') || 
                    lower.includes('normal') || 
                    lower.includes('no alarma') || 
                    lower.includes('sin alarma') || 
                    lower.includes('conforme') || 
                    lower.includes('servicio') || 
                    lower.includes('encendido') || 
                    lower.includes('encender') || 
                    lower === 'on' || 
                    lower.includes('abierto') || 
                    lower.includes('lleno') || 
                    lower.includes('automático') || 
                    lower.includes('automatico');

  if (isDanger) return 'bg-rose-100 text-rose-900 border-rose-300 shadow-2xs font-black';
  if (isWarning) return 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs font-black';
  if (isOff) return 'bg-slate-700 text-white border-slate-800 shadow-2xs font-black';
  if (isSuccess) return 'bg-emerald-100 text-emerald-900 border-emerald-300 shadow-2xs font-black';
  return 'bg-blue-100 text-blue-900 border-blue-300 shadow-2xs font-black';
}

export const CustomButtonBuilder: React.FC<CustomButtonBuilderProps> = ({
  label = "Botones Interactivos de Estado",
  description,
  value,
  onChange,
  buttonActions = {},
  onButtonActionsChange,
  placeholder = "Escribe el nombre de tu botón (ej. Encendido, Apagado, Alarmado)...",
  badge
}) => {
  const [newBtnInput, setNewBtnInput] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [configuringIndex, setConfiguringIndex] = useState<number | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [activePreview, setActivePreview] = useState<string | null>(null);

  // Parse buttons from comma-separated string
  const buttonList = value
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  const updateButtons = (newList: string[]) => {
    onChange(newList.join(', '));
  };

  const updateButtonActionConfig = (btnName: string, key: keyof ButtonActionConfig, val: any) => {
    if (!onButtonActionsChange) return;
    const effectiveAction = buttonActions[btnName]?.actionType || getNaturalButtonAction(btnName);
    const effectiveColor = buttonActions[btnName]?.color || 'auto';
    const currentConfig = { actionType: effectiveAction, color: effectiveColor };
    const updated = {
      ...buttonActions,
      [btnName]: { ...currentConfig, [key]: val }
    };
    onButtonActionsChange(updated);
  };

  const handleAddButton = () => {
    const trimmed = newBtnInput.trim();
    if (!trimmed) return;

    // Support entering comma separated inside the add input as well
    const parts = trimmed.split(',').map(s => s.trim()).filter(Boolean);
    const updated = [...buttonList];
    for (const part of parts) {
      if (!updated.includes(part)) {
        updated.push(part);
      }
    }
    updateButtons(updated);
    setNewBtnInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddButton();
    }
  };

  const startEditingButton = (idx: number, currentText: string) => {
    setEditingIndex(idx);
    setEditingText(currentText);
  };

  const saveEditingButton = (idx: number) => {
    const trimmed = editingText.trim();
    if (!trimmed) {
      handleRemoveButton(idx);
    } else {
      const updated = [...buttonList];
      updated[idx] = trimmed;
      updateButtons(updated);
    }
    setEditingIndex(null);
    setEditingText('');
  };

  const handleEditingKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      saveEditingButton(idx);
    } else if (e.key === 'Escape') {
      setEditingIndex(null);
      setEditingText('');
    }
  };

  const handleRemoveButton = (indexToRemove: number) => {
    const updated = buttonList.filter((_, idx) => idx !== indexToRemove);
    updateButtons(updated);
    if (editingIndex === indexToRemove) {
      setEditingIndex(null);
    }
  };

  const handleQuickAdd = (tag: string) => {
    if (!buttonList.includes(tag)) {
      updateButtons([...buttonList, tag]);
    }
  };

  const handleApplyPreset = (presetButtons: string[]) => {
    updateButtons(presetButtons);
  };

  const handleClearAll = () => {
    updateButtons([]);
    setEditingIndex(null);
  };

  const { isMobile } = useDeviceDetection();

  return (
    <div className="p-2.5 sm:p-4 bg-white rounded-xl sm:rounded-2xl border border-blue-200 sm:border-2 sm:border-blue-200/90 shadow-2xs space-y-3 sm:space-y-4 w-full min-w-0 max-w-full overflow-visible">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-start sm:items-center space-x-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold shrink-0 mt-0.5 sm:mt-0">
            <Tag className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h5 className="text-xs font-extrabold text-slate-900 flex flex-wrap items-center gap-1.5">
              <span className="break-words">{label}</span>
              {badge && (
                <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                  {badge}
                </span>
              )}
            </h5>
            {description && (
              <p className="text-[11px] text-slate-500 leading-snug mt-0.5">{description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center space-x-3 self-end sm:self-auto shrink-0 pt-0.5 sm:pt-0">
          <button
            type="button"
            onClick={() => setShowRawText(!showRawText)}
            className="text-[11px] text-blue-600 hover:text-blue-800 font-bold flex items-center space-x-1 hover:underline cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{showRawText ? 'Ocultar editor' : 'Editar texto directo'}</span>
          </button>

          {buttonList.length > 0 && (
            <button
              type="button"
              onClick={handleClearAll}
              className="text-[11px] text-rose-600 hover:text-rose-800 font-bold flex items-center space-x-1 hover:underline cursor-pointer ml-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Limpiar todo</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. CREAR / AGREGAR BOTÓN NUEVO */}
      <div className="space-y-1.5 bg-blue-50/60 p-2.5 sm:p-3 rounded-xl border border-blue-200 w-full min-w-0">
        <label className="block text-[11px] font-extrabold text-blue-950 leading-tight">
          ✨ Crear nuevo botón (Escribe el nombre y haz clic en Agregar):
        </label>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            type="text"
            value={newBtnInput}
            onChange={(e) => setNewBtnInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full sm:flex-1 min-w-0 px-3 py-2 sm:py-2.5 rounded-xl border border-blue-300 bg-white text-xs font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            type="button"
            onClick={handleAddButton}
            className="w-full sm:w-auto px-4 py-2 sm:py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center space-x-1.5 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Agregar Botón</span>
          </button>
        </div>
      </div>

      {/* 2. LISTA DE BOTONES CON EDICIÓN DIRECTA EN CADA UNO */}
      <div className="space-y-2 w-full min-w-0">
        <div className="flex items-center justify-between flex-wrap gap-1">
          <span className="text-[11px] font-extrabold text-slate-800 flex items-center space-x-1.5">
            <span>Botones actuales ({buttonList.length}):</span>
            <span className="text-[10px] text-blue-600 font-normal">
              (Haz clic en ✏️ para renombrar, o en ✕ para eliminar)
            </span>
          </span>
        </div>

        {buttonList.length > 0 ? (
          <div className="flex flex-wrap gap-2 p-2 sm:p-3.5 bg-slate-50/80 rounded-xl border border-slate-200 sm:border-2 min-h-[50px] items-center w-full min-w-0">
            {buttonList.map((btnText, idx) => {
              const isEditingThis = editingIndex === idx;

              if (isEditingThis) {
                return (
                  <div
                    key={`edit-${idx}`}
                    className="inline-flex items-center space-x-1.5 bg-white p-1 rounded-xl border-2 border-blue-500 shadow-md ring-2 ring-blue-200 animate-fadeIn max-w-full"
                  >
                    <input
                      type="text"
                      autoFocus
                      value={editingText}
                      onChange={(e) => setEditingText(e.target.value)}
                      onKeyDown={(e) => handleEditingKeyDown(e, idx)}
                      className="px-2.5 py-1 text-xs font-bold text-slate-900 bg-white rounded-lg border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-blue-500 w-32 sm:w-40 min-w-0"
                    />
                    <button
                      type="button"
                      onClick={() => saveEditingButton(idx)}
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Guardar nombre del botón"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingIndex(null)}
                      className="p-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Cancelar edición"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }

              const isConfiguringThis = configuringIndex === idx;
              const effectiveAction = buttonActions[btnText]?.actionType || getNaturalButtonAction(btnText);
              const effectiveColor = buttonActions[btnText]?.color || 'auto';
              const buttonCfg = { actionType: effectiveAction, color: effectiveColor };
              const chipColor = getButtonColorClass(btnText, false, buttonCfg.color);

              return (
                <div key={`${idx}-${btnText}`} className="inline-flex flex-col space-y-1.5 max-w-full">
                  <div
                    className={`group inline-flex items-center space-x-2 text-xs px-2.5 sm:px-3 py-1.5 rounded-xl border font-bold shadow-2xs transition-all max-w-full flex-wrap gap-y-1 ${chipColor}`}
                  >
                    <span className="select-none flex items-center space-x-1.5 min-w-0">
                      <span className="break-words">✓ {btnText}</span>
                      {effectiveAction === 'default' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-blue-100 text-blue-800 font-bold border border-blue-200 shrink-0">
                          ⚡ Solo accionar
                        </span>
                      )}
                      {effectiveAction === 'turn_off' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-slate-200 text-slate-800 font-bold border border-slate-300 shrink-0">
                          🔒 Bloquea en 0
                        </span>
                      )}
                      {effectiveAction === 'turn_on' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-bold border border-emerald-200 shrink-0">
                          🟢 Habilita
                        </span>
                      )}
                      {effectiveAction === 'failure' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-rose-100 text-rose-800 font-bold border border-rose-200 shrink-0">
                          🚨 Alarma
                        </span>
                      )}
                    </span>

                    <div className="inline-flex items-center space-x-1 pl-1 border-l border-black/10 shrink-0">
                      <button
                        type="button"
                        onClick={() => setConfiguringIndex(isConfiguringThis ? null : idx)}
                        className={`w-6 h-6 sm:w-5 sm:h-5 rounded-md flex items-center justify-center transition-colors cursor-pointer ${
                          isConfiguringThis ? 'bg-blue-600 text-white' : 'bg-black/5 hover:bg-blue-600 hover:text-white text-slate-600'
                        }`}
                        title={`Configurar acción y color para "${btnText}"`}
                      >
                        <Settings className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => startEditingButton(idx, btnText)}
                        className="w-6 h-6 sm:w-5 sm:h-5 rounded-md bg-black/5 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-colors text-slate-600 cursor-pointer"
                        title={`Editar / Renombrar botón "${btnText}"`}
                      >
                        <Pencil className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveButton(idx)}
                        className="w-6 h-6 sm:w-5 sm:h-5 rounded-md bg-black/5 hover:bg-rose-600 hover:text-white flex items-center justify-center transition-colors text-slate-600 cursor-pointer"
                        title={`Eliminar botón "${btnText}"`}
                      >
                        <X className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Action & Color Configuration Panel for this Button */}
                  {isConfiguringThis && (
                    <div className="p-3 bg-white rounded-xl sm:rounded-2xl border-2 border-blue-400 shadow-xl space-y-3 w-full sm:w-80 max-w-full text-xs animate-fadeIn z-30">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="font-extrabold text-blue-950 flex items-center space-x-1.5">
                          <Settings className="w-3.5 h-3.5 text-blue-600" />
                          <span>Ajustes de "{btnText}"</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => setConfiguringIndex(null)}
                          className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                          title="Cerrar ajustes"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        <CustomSelect
                          label="Acción al presionar en la ronda:"
                          value={effectiveAction}
                          onChange={(val) => updateButtonActionConfig(btnText, 'actionType', val)}
                          options={ACTION_OPTIONS}
                          style="popover"
                        />
                      </div>

                      <div className="space-y-1">
                        <CustomSelect
                          label="Color / Apariencia visual:"
                          value={buttonCfg.color || 'auto'}
                          onChange={(val) => updateButtonActionConfig(btnText, 'color', val)}
                          options={COLOR_OPTIONS}
                          style="popover"
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-center space-y-1">
            <p className="text-xs font-bold text-amber-900">
              ⚠️ No has creado ningún botón todavía.
            </p>
            <p className="text-[11px] text-amber-700">
              Escribe el nombre de tu botón en el recuadro superior o selecciona de las plantillas rápidas.
            </p>
          </div>
        )}
      </div>

      {/* 3. PLANTILLAS COMPLETAS PRECONFIGURADAS (1 clic para reemplazar) */}
      <div className="space-y-1.5 pt-1">
        <span className="block text-[11px] font-bold text-slate-700">
          ⚡ Plantillas Listas (Haz 1 clic para cargar el grupo completo):
        </span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: '🟢 Encendido / ⚪ Apagado / 🔴 Alarmado', list: ['Encendido', 'Apagado', 'Alarmado'] },
            { label: '✅ OK / ⚠️ En Observación / ❌ NO OK', list: ['OK', 'En Observación', 'NO OK'] },
            { label: '🟢 Operativo / 🟡 Mantenimiento / 🔴 Fuera de Servicio', list: ['Operativo', 'En Mantenimiento', 'Fuera de Servicio'] },
            { label: '🛡️ No Alarmado / 🚨 Alarmado', list: ['No Alarmado', 'Alarmado'] },
            { label: '⚙️ Automático / ✋ Manual / ⚪ Apagado', list: ['Automático', 'Manual', 'Apagado'] },
            { label: '⛽ Lleno / 🟡 Normal / 🔴 Nivel Bajo / ⚠️ Crítico', list: ['Lleno', 'Normal', 'Nivel Bajo', 'Crítico'] },
            { label: '✨ Limpio / 🧹 Requiere Aseo / ⚠️ Sucio', list: ['Limpio', 'Requiere Aseo', 'Sucio'] },
            { label: '✅ Conforme / ❌ No Conforme', list: ['Conforme', 'No Conforme'] },
          ].map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleApplyPreset(preset.list)}
              className="text-[10px] sm:text-[11px] px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-blue-100 hover:text-blue-900 border border-slate-200 text-slate-700 font-semibold transition-all cursor-pointer text-left sm:text-center"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. BOTONES INDIVIDUALES SUGERIDOS */}
      <div className="space-y-1.5 pt-1 w-full min-w-0">
        <span className="block text-[11px] font-bold text-slate-700">
          ➕ Sugerencias rápidas para añadir (1 clic):
        </span>
        <div className="flex flex-wrap gap-1.5">
          {[
            'Encendido',
            'Apagado',
            'Alarmado',
            'No Alarmado',
            'En Espera (Standby)',
            'Automático',
            'Manual',
            'Trip / Disparado',
            'OK',
            'En Observación',
            'NO OK',
            'Operativo',
            'En Falla',
            'Fuera de Servicio',
            'Lleno',
            'Nivel Normal',
            'Nivel Bajo',
            'Limpio',
            'Sucio',
            'Abierto',
            'Cerrado',
            'Sin Fugas',
            'Fuga Leve'
          ].map(tag => {
            const alreadyIn = buttonList.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleQuickAdd(tag)}
                disabled={alreadyIn}
                className={`text-[10px] px-2 py-0.5 rounded-lg border font-medium transition-all ${
                  alreadyIn
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                    : 'bg-white hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 text-slate-700 border-slate-200 cursor-pointer'
                }`}
              >
                {alreadyIn ? `✓ ${tag}` : `+ ${tag}`}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. EDITAR TEXTO DIRECTO (Separado por comas) */}
      {showRawText && (
        <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1.5 animate-fadeIn w-full min-w-0">
          <label className="block text-[11px] font-bold text-blue-900">
            📝 Edición en bloque (Separados por coma):
          </label>
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="ej. Encendido, Apagado, Alarmado, En Reparación"
            className="w-full px-3 py-2 rounded-lg border border-blue-300 bg-white text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[10px] text-blue-700">
            Puedes escribir o editar todos los botones directamente aquí separándolos por coma.
          </p>
        </div>
      )}

      {/* 6. VISTA PREVIA INTERACTIVA */}
      {buttonList.length > 0 && (
        <div className="p-3 sm:p-3.5 bg-slate-900 text-white rounded-xl space-y-2 w-full min-w-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <span className="text-[11px] font-bold text-emerald-400 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Simulador: Vista previa de los botones para el técnico</span>
            </span>
            {activePreview && (
              <span className="text-[10px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full self-start sm:self-auto">
                Probando toque: <strong className="text-white">{activePreview}</strong>
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {buttonList.map((btnText, i) => {
              const isSelected = activePreview === btnText;
              const colorClass = getButtonColorClass(btnText, isSelected);

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActivePreview(isSelected ? null : btnText)}
                  className={`text-xs px-3 sm:px-3.5 py-1.5 rounded-xl border font-bold transition-all shadow-sm cursor-pointer flex items-center space-x-1.5 ${
                    isSelected ? colorClass : 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {isSelected && <Check className="w-3.5 h-3.5" />}
                  <span>{btnText}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-400 italic">
            El técnico podrá seleccionar cualquiera de estos botones con un solo toque en su pantalla.
          </p>
        </div>
      )}
    </div>
  );
};
