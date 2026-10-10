import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Gauge, 
  Wrench, 
  Zap, 
  Layers,
  X,
  Check,
  Building2,
  SlidersHorizontal,
  RotateCcw
} from 'lucide-react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { Equipment, EquipmentStatus, PumpCategory } from '../../types';
import { CustomSelect, OptionItem } from '../common/CustomSelect';
import { TankIcon, SubstationIcon, SaunaColdPlungeIcon } from '../../utils/roundIcons';

const CATEGORY_OPTIONS: OptionItem<PumpCategory>[] = [
  { value: 'sauna_cold_plunge', label: 'Sauna / Cold Plunge / Zona Húmeda / Spa', color: 'cyan', icon: <SaunaColdPlungeIcon className="w-4 h-4 text-cyan-600" />, description: 'Tinás de inmersión en frío, saunas y zonas de relajación' },
  { value: 'tanque_agua', label: 'Tanque de Agua / Cisterna / Reserva', color: 'sky', icon: <TankIcon className="w-4 h-4 text-sky-600" />, description: 'Almacenamiento y depósitos de agua' },
  { value: 'subestacion', label: 'Subestación Eléctrica / Transformador', color: 'amber', icon: <SubstationIcon className="w-4 h-4 text-amber-600" />, description: 'Transformadores y celdas eléctricas' },
  { value: 'bomba_presion', label: 'Bomba de Presión Potable', color: 'blue', description: 'Grupos hidroneumáticos' },
  { value: 'bomba_impulsion', label: 'Bomba de Impulsión / Elevación', color: 'blue', description: 'Impulsión de agua y trasvase a tanques' },
  { value: 'bomba_acs', label: 'Bomba de Recirculación ACS', color: 'amber', description: 'Agua caliente sanitaria' },
  { value: 'bomba_piscina', label: 'Bomba de Piscina / Spa', color: 'blue', description: 'Filtrado y recirculación' },
  { value: 'bomba_achique', label: 'Bomba de Achique / Cárcamo', color: 'slate', description: 'Aguas pluviales y residuales' },
  { value: 'bomba_incendio', label: 'Bomba Red Contra Incendios', color: 'rose', description: 'Jockey y bomba principal' },
  { value: 'bomba_chiller', label: 'Bomba Primaria/Secundaria Chiller', color: 'blue', description: 'Circuito agua helada' },
  { value: 'caldera', label: 'Caldera / Generador de Calor', color: 'rose', description: 'Agua caliente central' },
  { value: 'chiller', label: 'Chiller / Aire Acondicionado Central', color: 'blue', description: 'Sistema de climatización' },
  { value: 'generador', label: 'Generador Eléctrico de Emergencia', color: 'amber', description: 'Planta diésel de respaldo' },
  { value: 'bateria', label: 'Banco de Baterías / Sistemas UPS', color: 'emerald', description: 'Respaldo eléctrico y acumuladores' },
  { value: 'otro', label: 'Otro Equipo / Maquinaria', color: 'slate', description: 'Instalaciones auxiliares' },
];

const STATUS_OPTIONS: OptionItem<EquipmentStatus>[] = [
  { value: 'operativo', label: 'Operativo (Normal)', color: 'emerald', description: 'Equipo funcionando dentro de parámetros' },
  { value: 'alerta', label: 'En Observación / Alerta', color: 'amber', description: 'Requiere monitoreo o presenta ruido/vibración' },
  { value: 'fuera_servicio', label: 'Fuera de Servicio', color: 'rose', description: 'Detenido por avería o seguridad' },
  { value: 'en_mantenimiento', label: 'En Mantenimiento', color: 'blue', description: 'Intervención preventiva o correctiva en curso' },
];

export const EquipmentManagementPanel: React.FC = () => {
  const { 
    equipments, 
    addEquipment, 
    updateEquipment, 
    deleteEquipment, 
    cleanAllImportedEquipments
  } = useMaintenance();

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const initialIds = React.useMemo(() => new Set(['eq-1','eq-2','eq-3','eq-4','eq-5','eq-6','eq-7','eq-8','eq-9','eq-10','eq-11','eq-12']), []);
  const importedCount = React.useMemo(() => {
    return equipments.filter(e => 
      !initialIds.has(e.id) || 
      e.tag.startsWith('EQ-IMP-') || 
      e.name === 'Equipo Importado' || 
      (e.notes && e.notes.includes('documento original'))
    ).length;
  }, [equipments, initialIds]);

  // Form State
  const [formTag, setFormTag] = useState('');
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState<PumpCategory>('bomba_presion');
  const [formArea, setFormArea] = useState('Sótano 2 - Cuarto de Bombas Principal');
  const [formLocationDetails, setFormLocationDetails] = useState('');
  const [formBrand, setFormBrand] = useState('');
  const [formModel, setFormModel] = useState('');
  const [formPowerHp, setFormPowerHp] = useState<number>(5.5);
  const [formNominalPressurePsi, setFormNominalPressurePsi] = useState<number>(65);
  const [formNominalAmps, setFormNominalAmps] = useState<number>(8.5);
  const [formVoltage, setFormVoltage] = useState('380V / 3F / 60Hz');
  const [formStatus, setFormStatus] = useState<EquipmentStatus>('operativo');
  const [formNotes, setFormNotes] = useState('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormTag(`EQ-${String(equipments.length + 1).padStart(2, '0')}`);
    setFormName('');
    setFormCategory('bomba_presion');
    setFormArea('Sótano 2 - Cuarto de Bombas');
    setFormLocationDetails('');
    setFormBrand('Grundfos');
    setFormModel('');
    setFormPowerHp(5.5);
    setFormNominalPressurePsi(65);
    setFormNominalAmps(8.5);
    setFormVoltage('380V / 3F / 60Hz');
    setFormStatus('operativo');
    setFormNotes('');
    setShowModal(true);
  };

  const handleOpenEditModal = (eq: Equipment) => {
    setEditingId(eq.id);
    setFormTag(eq.tag);
    setFormName(eq.name);
    setFormCategory(eq.category);
    setFormArea(eq.area);
    setFormLocationDetails(eq.locationDetails || '');
    setFormBrand(eq.brand);
    setFormModel(eq.model || '');
    setFormPowerHp(eq.powerHp || 0);
    setFormNominalPressurePsi(eq.nominalPressurePsi || 0);
    setFormNominalAmps(eq.nominalAmps || 0);
    setFormVoltage(eq.voltage || '380V / 3F / 60Hz');
    setFormStatus(eq.status);
    setFormNotes(eq.notes || '');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTag.trim() || !formName.trim()) return;

    if (editingId) {
      updateEquipment(editingId, {
        tag: formTag.trim().toUpperCase(),
        name: formName.trim(),
        category: formCategory,
        area: formArea.trim(),
        locationDetails: formLocationDetails.trim(),
        brand: formBrand.trim(),
        model: formModel.trim(),
        powerHp: Number(formPowerHp) || 0,
        nominalPressurePsi: Number(formNominalPressurePsi) || 0,
        nominalAmps: Number(formNominalAmps) || 0,
        voltage: formVoltage.trim(),
        status: formStatus,
        notes: formNotes.trim(),
      });
      showToast(`Equipo "${formTag}" actualizado con éxito`);
    } else {
      addEquipment({
        tag: formTag.trim().toUpperCase(),
        name: formName.trim(),
        category: formCategory,
        area: formArea.trim(),
        locationDetails: formLocationDetails.trim(),
        brand: formBrand.trim(),
        model: formModel.trim(),
        serialNumber: `SN-${Date.now().toString().slice(-6)}`,
        powerHp: Number(formPowerHp) || 0,
        nominalPressurePsi: Number(formNominalPressurePsi) || 0,
        nominalAmps: Number(formNominalAmps) || 0,
        voltage: formVoltage.trim(),
        installationDate: new Date().toISOString().split('T')[0],
        status: formStatus,
        currentHours: 0,
        limits: {
          minPressurePsi: Math.max(10, Number(formNominalPressurePsi) - 15),
          maxPressurePsi: Number(formNominalPressurePsi) + 20,
          maxBearingTempC: 75,
          maxAmperageL1: Number(formNominalAmps) * 1.15,
          maxAmperageL2: Number(formNominalAmps) * 1.15,
          maxAmperageL3: Number(formNominalAmps) * 1.15,
          maxVibrationMmS: 4.5,
        },
        notes: formNotes.trim(),
      });
      showToast(`Nuevo equipo "${formTag}" registrado en el sistema`);
    }

    setShowModal(false);
  };

  const handleQuickStatusChange = (id: string, newStatus: EquipmentStatus) => {
    updateEquipment(id, { status: newStatus });
    showToast(`Estado actualizado a ${newStatus}`);
  };

  const handleDelete = (id: string) => {
    setDeleteConfirmId(null);
    try {
      deleteEquipment(id); // run in background
      showToast('Equipo eliminado permanentemente del inventario');
    } catch (e) {
      showToast('Error al eliminar equipo');
    }
  };

  // Filtered equipments
  const filtered = (equipments || []).filter(eq => {
    if (!eq) return false;
    const matchesCat = categoryFilter === 'todas' || eq.category === categoryFilter;
    const s = searchTerm.toLowerCase();
    const matchesSearch = (eq.name || '').toLowerCase().includes(s) ||
                          (eq.tag || '').toLowerCase().includes(s) ||
                          (eq.area || '').toLowerCase().includes(s) ||
                          (eq.brand || '').toLowerCase().includes(s);
    return matchesCat && matchesSearch;
  });

  const countOperativo = equipments.filter(e => e.status === 'operativo').length;
  const countAlerta = equipments.filter(e => e.status === 'alerta').length;
  const countFuera = equipments.filter(e => e.status === 'fuera_servicio' || e.status === 'en_mantenimiento').length;

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-xs space-y-6">
      
      {/* Toast notification */}
      {toastMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shadow-xs shrink-0">
            <Gauge className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-base font-bold text-slate-900">
                Inventario & Configuración de Equipos del Hotel
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {equipments.length} registrados
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Agrega, edita o retira bombas, calderas y maquinaria crítica para su inclusión en rondas e inspecciones.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          {importedCount > 0 && (
            <button
              type="button"
              onClick={async () => {
                if (window.confirm(`¿Deseas limpiar los ${importedCount} equipos importados de Excel y restaurar el parque oficial de 12 bombas?`)) {
                  await cleanAllImportedEquipments();
                  showToast(`Se limpiaron los ${importedCount} equipos importados de Excel`);
                }
              }}
              className="px-3.5 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-colors shrink-0"
              title="Eliminar equipos generados por Excel y restaurar las 12 bombas originales"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              <span>Limpiar Equipos de Excel ({importedCount})</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenAddModal}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-2 shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>+ Agregar Nuevo Equipo</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Total Activos</span>
          <span className="text-xl font-extrabold text-slate-900 mt-0.5 block">{equipments.length}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80">
          <span className="text-[10px] font-semibold text-emerald-700 uppercase tracking-wider block">Operativos</span>
          <span className="text-xl font-extrabold text-emerald-700 mt-0.5 block">{countOperativo}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200/80">
          <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wider block">En Observación</span>
          <span className="text-xl font-extrabold text-amber-700 mt-0.5 block">{countAlerta}</span>
        </div>
        <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200/80">
          <span className="text-[10px] font-semibold text-rose-700 uppercase tracking-wider block">Fuera de Servicio</span>
          <span className="text-xl font-extrabold text-rose-700 mt-0.5 block">{countFuera}</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por TAG (ej. BOM-PRES), nombre, marca o área..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white focus:border-blue-500 focus:outline-none transition-colors"
          />
        </div>

        <div className="w-full sm:w-60 shrink-0">
          <CustomSelect
            value={categoryFilter}
            onChange={(val) => setCategoryFilter(val)}
            options={[
              { value: 'todas', label: 'Todas las Categorías', color: 'slate' },
              ...CATEGORY_OPTIONS.map(c => ({
                value: c.value,
                label: c.label,
                color: c.color
              }))
            ]}
          />
        </div>
      </div>

      {/* Equipment Items List */}
      <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-xs text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
            No se encontraron equipos que coincidan con la búsqueda.
          </div>
        ) : (
          filtered.map(eq => {
            const statusConfig = {
              operativo: { bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500', label: 'Operativo' },
              alerta: { bg: 'bg-amber-50 text-amber-700 border-amber-200', dot: 'bg-amber-500', label: 'Alerta' },
              fuera_servicio: { bg: 'bg-rose-50 text-rose-700 border-rose-200', dot: 'bg-rose-500', label: 'Fuera de Servicio' },
              en_mantenimiento: { bg: 'bg-blue-50 text-blue-700 border-blue-200', dot: 'bg-blue-500', label: 'Mantenimiento' },
            }[eq.status] || { bg: 'bg-slate-50 text-slate-700 border-slate-200', dot: 'bg-slate-400', label: eq.status };

            return (
              <div
                key={eq.id}
                className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors"
              >
                <div className="flex items-start space-x-3 truncate">
                  <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 shrink-0 shadow-2xs">
                    <Wrench className="w-5 h-5 text-slate-500" />
                  </div>
                  <div className="truncate">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        {eq.tag}
                      </span>
                      <span className="font-bold text-xs text-slate-900 truncate">{eq.name}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span>📍 {eq.area}</span>
                      <span>•</span>
                      <span>🏷️ {eq.brand} {eq.model}</span>
                      {eq.powerHp > 0 && <span>• ⚡ {eq.powerHp} HP</span>}
                      {eq.nominalPressurePsi > 0 && <span>• 💧 {eq.nominalPressurePsi} PSI</span>}
                    </div>
                  </div>
                </div>

                {/* Right Quick Controls */}
                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  {/* Status Badge & Quick Toggle */}
                  <div className={`px-2.5 py-1 rounded-xl text-xs font-semibold border flex items-center space-x-1.5 ${statusConfig.bg}`}>
                    <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                    <span>{statusConfig.label}</span>
                  </div>

                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={() => handleOpenEditModal(eq)}
                    className="p-2 rounded-xl text-slate-500 hover:text-blue-600 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                    title="Editar equipo"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>

                  {/* Delete button */}
                  {deleteConfirmId === eq.id ? (
                    <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-rose-300 animate-in fade-in duration-150">
                      <button
                        type="button"
                        onClick={() => handleDelete(eq.id)}
                        className="px-2 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-bold hover:bg-rose-700"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-[10px] hover:bg-slate-200"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirmId(eq.id)}
                      className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-white border border-transparent hover:border-slate-200 transition-colors"
                      title="Eliminar equipo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* MODAL REGISTRAR / EDITAR EQUIPO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-3 sm:p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl p-5 sm:p-6 w-full max-w-xl shadow-2xl border border-slate-200 max-h-[92vh] flex flex-col my-auto">
            
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    {editingId ? 'Editar Parámetros de Equipo' : 'Registrar Nuevo Equipo o Maquinaria'}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Introduce los datos técnicos para el control de mantenimiento
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col min-h-0 flex-1">
              
              <div className="overflow-y-auto py-3 space-y-4 text-xs flex-1 pr-1">
                {/* TAG and Name */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Código / TAG *
                    </label>
                    <input
                      type="text"
                      required
                      value={formTag}
                      onChange={(e) => setFormTag(e.target.value.toUpperCase())}
                      placeholder="Ej. BOM-PRES-04"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Nombre Descriptivo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="Ej. Bomba Hidroneumática Potable 4"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Category Dropdown using CustomSelect (No black screen!) */}
                <div>
                  <CustomSelect
                    label="Categoría del Equipo o Sistema"
                    value={formCategory}
                    onChange={(val) => setFormCategory(val as PumpCategory)}
                    options={CATEGORY_OPTIONS}
                  />
                </div>

                {/* Area and Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Área / Ubicación del Hotel *
                    </label>
                    <input
                      type="text"
                      required
                      value={formArea}
                      onChange={(e) => setFormArea(e.target.value)}
                      placeholder="Sótano 2 - Cuarto de Bombas"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Detalles de Bancada / Colector
                    </label>
                    <input
                      type="text"
                      value={formLocationDetails}
                      onChange={(e) => setFormLocationDetails(e.target.value)}
                      placeholder="Bancada 4, salida manifold 3 pulgadas"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Brand and Model */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Marca del Fabricante
                    </label>
                    <input
                      type="text"
                      value={formBrand}
                      onChange={(e) => setFormBrand(e.target.value)}
                      placeholder="Grundfos, Wilo, Pentair, etc."
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Modelo Técnico
                    </label>
                    <input
                      type="text"
                      value={formModel}
                      onChange={(e) => setFormModel(e.target.value)}
                      placeholder="CR 15-3 / Noryl"
                      className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Technical Operating Parameters */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-slate-700 block">
                    Parámetros Nominales de Operación
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">Potencia (HP)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formPowerHp}
                        onChange={(e) => setFormPowerHp(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-center font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">Presión (PSI)</label>
                      <input
                        type="number"
                        value={formNominalPressurePsi}
                        onChange={(e) => setFormNominalPressurePsi(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-center font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">Amperaje Nom.</label>
                      <input
                        type="number"
                        step="0.1"
                        value={formNominalAmps}
                        onChange={(e) => setFormNominalAmps(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-mono text-center font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">Voltaje</label>
                      <input
                        type="text"
                        value={formVoltage}
                        onChange={(e) => setFormVoltage(e.target.value)}
                        placeholder="380V / 3F"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-center text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Initial Status (using CustomSelect, no black dialog!) */}
                <div>
                  <CustomSelect
                    label="Estado Operativo Inicial"
                    value={formStatus}
                    onChange={(val) => setFormStatus(val as EquipmentStatus)}
                    options={STATUS_OPTIONS}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Notas de Mantenimiento / Instrucciones Técnicas
                  </label>
                  <textarea
                    rows={2}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Recomendaciones para rondas diarias o periodicidad de engrase..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Buttons Footer - Always visible at bottom */}
              <div className="flex items-center justify-end space-x-2.5 pt-3 border-t border-slate-100 shrink-0 bg-white mt-auto">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  {editingId ? 'Guardar Cambios' : 'Registrar Equipo'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
