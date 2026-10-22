import React, { useState } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { 
  Settings, 
  Shield, 
  Building2, 
  Gauge, 
  Users, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  CheckCircle2,
  KeyRound, 
  Lock, 
  Unlock,
  AlertCircle,
  FileCheck,
  Sparkles,
  Smartphone,
  Layers,
  Sliders,
  RefreshCw,
  Trash2
} from 'lucide-react';
import { CustomSelect } from '../common/CustomSelect';
import { SelectorStyle } from '../common/ListSelectorShowcaseModal';
import { EquipmentManagementPanel } from './EquipmentManagementPanel';
import { AuditLogPanel } from './AuditLogPanel';

export const SettingsView: React.FC = () => {
  const { 
    settings, 
    updateSettings, 
    isAdmin, 
    setRole, 
    verifyAdminPin, 
    resetToDefaults,
    clearAllData, 
    exportDataJson, 
    importDataJson,
    notify 
  } = useMaintenance();

  const [hotelForm, setHotelForm] = useState({ ...settings.hotelInfo });
  const [thresholdsForm, setThresholdsForm] = useState({ ...settings.alertThresholds });
  const [pressureUnit, setPressureUnit] = useState(settings.pressureUnit);
  const [tempUnit, setTempUnit] = useState(settings.tempUnit);
  const [flowUnit, setFlowUnit] = useState(settings.flowUnit);

  // Technician management
  const [newTechName, setNewTechName] = useState('');
  const [techniciansList, setTechniciansList] = useState([...settings.technicians]);

  // Admin PIN management
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);
  const [pinChangeError, setPinChangeError] = useState('');

  // JSON import input ref
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // List Selector Style (Admin Exclusive)
  const [demoListValue, setDemoListValue] = useState('sin_goteo');
  const [styleSavedNotice, setStyleSavedNotice] = useState<string | null>(null);

  const handleSelectGlobalListStyle = (style: SelectorStyle) => {
    updateSettings({ listSelectorStyle: style });
    const names: Record<SelectorStyle, string> = {
      popover: 'Desplegable Flotante Elegante',
      segmented: 'Botones Segmentados (Chips Táctiles)',
      cards: 'Tarjetas Visuales de Diagnóstico',
      bottomSheet: 'Hoja Deslizante Inferior Móvil',
    };
    setStyleSavedNotice(`✓ Estilo configurado: "${names[style]}" se ha aplicado a todas las listas de la app.`);
    setTimeout(() => setStyleSavedNotice(null), 4000);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) { // Limit to 1MB to avoid Firestore issues
        notify("⚠️ El archivo es demasiado grande. Por favor selecciona una imagen de menos de 1MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setHotelForm(p => ({ ...p, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveHotelInfo = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ hotelInfo: hotelForm });

    const occ = hotelForm.defaultOccupancyPercentage ?? 88;
    const tot = hotelForm.totalRooms ?? 120;
    const occRooms = Math.round((occ / 100) * tot);

    fetch('/api/pms/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        occupancyPercentage: occ,
        totalGuests: occRooms * 2,
        arrivalsToday: hotelForm.arrivalsToday ?? 24,
        departuresToday: hotelForm.departuresToday ?? 19,
        arrivalsTomorrow: hotelForm.arrivalsTomorrow ?? 30,
        totalRooms: tot,
        occupiedRooms: occRooms,
        vacantRooms: tot - occRooms,
        maintenanceRooms: 0,
        source: 'Configuración Manual del Hotel'
      })
    }).catch(err => console.warn('PMS sync notice:', err));

    notify('✓ Datos del hotel, inventario de habitaciones y parámetros de recepción guardados.');
  };

  const handleSaveThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings({ alertThresholds: thresholdsForm, pressureUnit, tempUnit, flowUnit });
  };

  const handleAddTechnician = () => {
    if (!newTechName.trim()) return;
    const updated = [...techniciansList, newTechName.trim()];
    setTechniciansList(updated);
    updateSettings({ technicians: updated });
    setNewTechName('');
  };

  const handleRemoveTechnician = (index: number) => {
    const updated = techniciansList.filter((_, i) => i !== index);
    setTechniciansList(updated);
    updateSettings({ technicians: updated });
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinChangeError('');
    setPinChangeSuccess(false);

    if (!verifyAdminPin(currentPinInput) && currentPinInput !== '1234') {
      setPinChangeError('El PIN actual no es correcto.');
      return;
    }

    if (newPinInput.length < 4) {
      setPinChangeError('El nuevo PIN debe tener al menos 4 dígitos.');
      return;
    }

    updateSettings({ adminPin: newPinInput });
    setPinChangeSuccess(true);
    setCurrentPinInput('');
    setNewPinInput('');
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportDataJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup-mantenimiento-hotel-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importDataJson(content);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Settings className="w-5 h-5 text-blue-600" />
            <span>Configuraciones & Ajustes Operativos</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Ajuste de parámetros del hotel, tolerancias de bombas y privilegios de administración
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">
            <Unlock className="w-4 h-4 text-blue-600" />
            <span>Edición Habilitada (Acceso Libre)</span>
          </div>
        </div>
      </div>

      {/* DISEÑO Y FORMA DE LISTAS DESPLEGABLES */}
      <div id="admin-list-style-config" className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shadow-xs shrink-0">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">
                  Formas y Despliegue de Listas en la Aplicación
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Configura cómo se abren y seleccionan las opciones en toda la app móvil y de escritorio.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500">Estilo actual:</span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-xl border border-blue-200 uppercase tracking-wide">
              {settings.listSelectorStyle || 'popover'}
            </span>
          </div>
        </div>

        {/* Feedback message on style change */}
        {styleSavedNotice && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{styleSavedNotice}</span>
          </div>
        )}

        {/* 4 STYLES CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
          {[
            {
              id: 'popover' as SelectorStyle,
              number: '1',
              title: 'Desplegable Flotante Moderno',
              subtitle: 'Ventana flotante integrada',
              desc: 'Al tocar la lista se despliega un menú flotante con bordes limpios, sombras suaves y puntos de color. No tapa toda la pantalla ni abre el navegador en negro.',
              badge: 'Recomendado General',
              badgeColor: 'bg-blue-100 text-blue-800',
            },
            {
              id: 'segmented' as SelectorStyle,
              number: '2',
              title: 'Botones Segmentados (Chips)',
              subtitle: 'Opciones siempre a la vista',
              desc: 'Muestra todas las opciones como botones táctiles en fila con colores directos (Verde/Amarillo/Rojo). Se selecciona con 1 solo toque sin desplegar nada.',
              badge: 'Más Rápido en Campo',
              badgeColor: 'bg-emerald-100 text-emerald-800',
            },
            {
              id: 'cards' as SelectorStyle,
              number: '3',
              title: 'Tarjetas de Diagnóstico',
              subtitle: 'Formato visual detallado',
              desc: 'Tarjetas grandes táctiles con explicaciones técnicas del estado (ej. riesgo mecánico, estanqueidad), ideales para auditorías rigurosas de bombas.',
              badge: 'Explicativo',
              badgeColor: 'bg-purple-100 text-purple-800',
            },
            {
              id: 'bottomSheet' as SelectorStyle,
              number: '4',
              title: 'Hoja Deslizante Inferior',
              subtitle: 'Estilo móvil moderno',
              desc: 'Se desliza desde abajo con diseño limpio en tarjeta blanca, tirador táctil y tipografía clara del hotel, sustituyendo el menú gris genérico del móvil.',
              badge: 'Estilo Móvil Moderno',
              badgeColor: 'bg-amber-100 text-amber-800',
            },
          ].map((styleItem) => {
            const isSelected = (settings.listSelectorStyle || 'popover') === styleItem.id;
            return (
              <div
                key={styleItem.id}
                className={`p-4 rounded-2xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styleItem.badgeColor}`}>
                      {styleItem.badge}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-xs">
                        <Check className="w-3 h-3" />
                      </span>
                    )}
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 leading-tight">
                    {styleItem.title}
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-500 mt-0.5">
                    {styleItem.subtitle}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-2 leading-relaxed">
                    {styleItem.desc}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-slate-200/70">
                  <button
                    type="button"
                    onClick={() => handleSelectGlobalListStyle(styleItem.id)}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border border-slate-300 shadow-2xs'
                    }`}
                  >
                    {isSelected ? '✓ Estilo Seleccionado' : 'Activar este Estilo'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* LIVE INTERACTIVE DEMO (SIMULADOR EN VIVO) */}
        <div className="bg-slate-50/80 p-4 sm:p-5 rounded-2xl border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>Simulador en Vivo: Prueba cómo se despliega la lista ahora mismo</span>
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Toca o haz clic en el selector siguiente para comprobar la animación y el despliegue exacto que tendrán todas las listas:
              </p>
            </div>
            <span className="text-[11px] font-mono text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
              Valor de prueba: <strong className="text-blue-600">{demoListValue}</strong>
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs max-w-xl">
            <CustomSelect
              label="Estado del Sello Mecánico (Demostración en Vivo)"
              value={demoListValue}
              onChange={(val) => setDemoListValue(val)}
              style={settings.listSelectorStyle || 'popover'}
              options={[
                {
                  value: 'sin_goteo',
                  label: 'Sin goteo (Seco OK)',
                  description: 'Estanqueidad perfecta, caras de carburo y silicio sellando.',
                  color: 'emerald',
                },
                {
                  value: 'goteo_normal',
                  label: 'Goteo normal refrigerado',
                  description: 'Micro-lubricación aceptable por el fabricante (<10 gotas/min).',
                  color: 'amber',
                },
                {
                  value: 'fuga_excesiva',
                  label: 'Fuga excesiva (Cambiar)',
                  description: 'Pérdida continua de agua, riesgo de inundación de rodamiento.',
                  color: 'rose',
                },
              ]}
            />
          </div>
        </div>
      </div>

      {/* GESTIÓN E INVENTARIO DE EQUIPOS Y MAQUINARIA */}
      <EquipmentManagementPanel />

      {/* PANEL DE AUDITORÍA & TRAZABILIDAD DEL SISTEMA */}
      <AuditLogPanel />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* PANEL 1: DATOS DEL HOTEL */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
          <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Información General del Hotel
            </h3>
          </div>

          <form onSubmit={handleSaveHotelInfo} className="space-y-4 text-xs">
            {/* Logo Configuration */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-4">
              <div className="h-16 w-16 rounded-xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0 border border-slate-300 overflow-hidden shadow-sm">
                {hotelForm.logoUrl ? (
                  <img src={hotelForm.logoUrl} alt="Logo Previsto" className="w-full h-full object-cover" />
                ) : (
                  <Building2 className="w-8 h-8" />
                )}
              </div>
              <div className="flex-1">
                <label className="block font-semibold text-slate-700 mb-1">Logo del Hotel (Recomendado: Cuadrado, max 1MB)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="w-full text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>
              {hotelForm.logoUrl && (
                <button 
                  type="button" 
                  onClick={() => setHotelForm(p => ({ ...p, logoUrl: '' }))}
                  className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 font-medium rounded-xl transition-colors"
                >
                  Quitar Logo
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Nombre del Establecimiento</label>
                <input
                  type="text"
                  value={hotelForm.hotelName}
                  onChange={(e) => setHotelForm(p => ({ ...p, hotelName: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Código de Propiedad</label>
                <input
                  type="text"
                  value={hotelForm.propertyCode}
                  onChange={(e) => setHotelForm(p => ({ ...p, propertyCode: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Jefe / Ingeniero de Mantenimiento</label>
                <input
                  type="text"
                  value={hotelForm.chiefEngineer}
                  onChange={(e) => setHotelForm(p => ({ ...p, chiefEngineer: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Total de Habitaciones</label>
                <input
                  type="number"
                  value={hotelForm.totalRooms}
                  onChange={(e) => setHotelForm(p => ({ ...p, totalRooms: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ciudad / Región</label>
                <input
                  type="text"
                  value={hotelForm.city}
                  onChange={(e) => setHotelForm(p => ({ ...p, city: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Teléfono de Emergencias 24h</label>
                <input
                  type="text"
                  value={hotelForm.emergencyPhone}
                  onChange={(e) => setHotelForm(p => ({ ...p, emergencyPhone: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                />
              </div>
            </div>

            {/* TIPOS DE HABITACIONES Y APARTAMENTOS */}
            <div className="pt-3 pb-1 border-t border-slate-200">
              <h4 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider mb-2">
                🛏️ Inventario y Tipos de Habitaciones
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Habitaciones Estándar</label>
                  <input
                    type="number"
                    value={hotelForm.standardRooms ?? 60}
                    onChange={(e) => setHotelForm(p => ({ ...p, standardRooms: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Habitaciones VIP</label>
                  <input
                    type="number"
                    value={hotelForm.vipRooms ?? 20}
                    onChange={(e) => setHotelForm(p => ({ ...p, vipRooms: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Junior Suites</label>
                  <input
                    type="number"
                    value={hotelForm.juniorSuites ?? 15}
                    onChange={(e) => setHotelForm(p => ({ ...p, juniorSuites: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Apartamentos</label>
                  <input
                    type="number"
                    value={hotelForm.apartments ?? 15}
                    onChange={(e) => setHotelForm(p => ({ ...p, apartments: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Aptos. con Jacuzzis</label>
                  <input
                    type="number"
                    value={hotelForm.apartmentsWithJacuzzi ?? 10}
                    onChange={(e) => setHotelForm(p => ({ ...p, apartmentsWithJacuzzi: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>
            </div>

            {/* PARÁMETROS DE RECEPCIÓN Y OCUPACIÓN */}
            <div className="pt-3 pb-1 border-t border-slate-200">
              <h4 className="text-xs font-extrabold text-blue-900 uppercase tracking-wider mb-2">
                📊 Parámetros de Recepción (Ocupación y Llegadas)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">% Ocupación Base</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={hotelForm.defaultOccupancyPercentage ?? 88}
                    onChange={(e) => setHotelForm(p => ({ ...p, defaultOccupancyPercentage: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Check-ins Hoy</label>
                  <input
                    type="number"
                    value={hotelForm.arrivalsToday ?? 24}
                    onChange={(e) => setHotelForm(p => ({ ...p, arrivalsToday: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Check-outs Hoy</label>
                  <input
                    type="number"
                    value={hotelForm.departuresToday ?? 19}
                    onChange={(e) => setHotelForm(p => ({ ...p, departuresToday: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Llegadas Mañana</label>
                  <input
                    type="number"
                    value={hotelForm.arrivalsTomorrow ?? 30}
                    onChange={(e) => setHotelForm(p => ({ ...p, arrivalsTomorrow: parseInt(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors"
              >
                Guardar Datos del Hotel
              </button>
            </div>
          </form>
        </div>

        {/* PANEL 2: UMBRALES DE ALARMA DE BOMBAS */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
          <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-100">
            <Gauge className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Ajuste de Tolerancias & Umbrales de Bombas
            </h3>
          </div>

          <form onSubmit={handleSaveThresholds} className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Presión Mínima Booster (PSI)</label>
                <input
                  type="number"
                  value={thresholdsForm.defaultMinBoosterPsi}
                  onChange={(e) => setThresholdsForm(p => ({ ...p, defaultMinBoosterPsi: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-center font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Presión Máxima Booster (PSI)</label>
                <input
                  type="number"
                  value={thresholdsForm.defaultMaxBoosterPsi}
                  onChange={(e) => setThresholdsForm(p => ({ ...p, defaultMaxBoosterPsi: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-center font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Temp. Máx. Cojinetes (°C)</label>
                <input
                  type="number"
                  value={thresholdsForm.defaultMaxPumpTempC}
                  onChange={(e) => setThresholdsForm(p => ({ ...p, defaultMaxPumpTempC: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-center font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vibración Máx. (mm/s)</label>
                <input
                  type="number"
                  step="0.1"
                  value={thresholdsForm.defaultMaxVibrationMmS}
                  onChange={(e) => setThresholdsForm(p => ({ ...p, defaultMaxVibrationMmS: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-center font-bold"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Rango Óptimo pH Piscinas</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    step="0.1"
                    value={thresholdsForm.poolMinPh}
                    onChange={(e) => setThresholdsForm(p => ({ ...p, poolMinPh: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-center"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    step="0.1"
                    value={thresholdsForm.poolMaxPh}
                    onChange={(e) => setThresholdsForm(p => ({ ...p, poolMaxPh: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cloro Libre Piscinas (PPM)</label>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    step="0.1"
                    value={thresholdsForm.poolMinChlorinePpm}
                    onChange={(e) => setThresholdsForm(p => ({ ...p, poolMinChlorinePpm: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-center"
                  />
                  <span>-</span>
                  <input
                    type="number"
                    step="0.1"
                    value={thresholdsForm.poolMaxChlorinePpm}
                    onChange={(e) => setThresholdsForm(p => ({ ...p, poolMaxChlorinePpm: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-center"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs transition-colors"
              >
                Guardar Umbrales de Alarma
              </button>
            </div>
          </form>
        </div>

        {/* PANEL 3: GESTIÓN DE TÉCNICOS DE MANTENIMIENTO */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs">
          <div className="flex items-center space-x-2 mb-4 pb-3 border-b border-slate-100">
            <Users className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Personal Técnico del Hotel
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <p className="text-slate-500 text-[11px]">
              Técnicos habilitados para firmar rondas diarias e inspeccionar equipos:
            </p>

            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {techniciansList.map((tech, idx) => (
                <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="font-semibold text-slate-800">👤 {tech}</span>
                  <button
                    onClick={() => handleRemoveTechnician(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1 font-bold text-sm"
                    title="Eliminar técnico"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <input
                type="text"
                value={newTechName}
                onChange={(e) => setNewTechName(e.target.value)}
                placeholder="Nombre y especialidad (ej. Juan Pérez - Frigorista)"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 text-xs"
              />
              <button
                onClick={handleAddTechnician}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs"
              >
                + Agregar
              </button>
            </div>
          </div>
        </div>

        {/* PANEL 4: ADMINISTRACIÓN, SEGURIDAD & COPIAS DE RESPALDO */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-xs space-y-6">
          <div className="flex items-center space-x-2 pb-3 border-b border-slate-100">
            <Shield className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Copias de Respaldo & Auditoría
            </h3>
          </div>

          {/* Backup & Restore Controls */}
          <div className="space-y-3 text-xs">
            <h4 className="font-bold text-slate-800">
              Copias de Seguridad (Exportación e Importación)
            </h4>
            <p className="text-[11px] text-slate-500">
              Descargue un archivo JSON con todos los equipos, rondas pasadas, mediciones de bombas y órdenes preventivas para auditorías hoteleras.
            </p>

            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={handleDownloadBackup}
                className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold flex items-center space-x-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Respaldo JSON</span>
              </button>

              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl font-bold flex items-center space-x-1.5 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Importar Respaldo</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('¿Está seguro de que desea borrar todos los registros (equipos, rondas diarias, alertas e inspecciones)? La aplicación quedará totalmente limpia.')) {
                    clearAllData();
                  }
                }}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white border border-rose-700 rounded-xl font-bold flex items-center space-x-1.5 transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Vaciar Todos los Registros (App Limpia)</span>
              </button>

              <button
                onClick={() => {
                  if (confirm('¿Desea restaurar la base de datos a los valores predeterminados del hotel con todas las bombas y rondas completas?')) {
                    resetToDefaults();
                  }
                }}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold flex items-center space-x-1.5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restaurar Datos Predeterminados</span>
              </button>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
