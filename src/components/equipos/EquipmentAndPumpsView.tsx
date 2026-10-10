import React, { useState } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import { getLocalDateTimeString } from '../../utils/dateUtils';
import { 
  Equipment, 
  PumpCategory, 
  PumpInspection, 
  InspectionCondition 
} from '../../types';
import { 
  Layers, 
  Gauge, 
  Plus, 
  Search, 
  Activity, 
  Thermometer, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  X, 
  Edit3, 
  Trash2, 
  Calendar, 
  Droplets, 
  FileText, 
  CheckCircle2, 
  Info,
  Clock,
  Sparkles,
  Fuel
} from 'lucide-react';
import { SelectorStyle } from '../common/ListSelectorShowcaseModal';
import { CustomSelect } from '../common/CustomSelect';
import { DecimalInput } from '../common/DecimalInput';
import { WaterPumpIcon, CondenserIcon, SubstationIcon, TankIcon, SaunaColdPlungeIcon } from '../../utils/roundIcons';

interface EquipmentAndPumpsViewProps {
  preselectedEquipmentId?: string | null;
  onClearPreselection?: () => void;
}

export const EquipmentAndPumpsView: React.FC<EquipmentAndPumpsViewProps> = ({
  preselectedEquipmentId,
  onClearPreselection,
}) => {
  const { 
    equipments, 
    addEquipment, 
    updateEquipment, 
    deleteEquipment, 
    pumpInspections, 
    addPumpInspection, 
    settings,
    setSelectedTab,
    canDeleteRecords,
    notify
  } = useMaintenance();

  const [categoryFilter, setCategoryFilter] = useState<string>('todas');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal states
  const [showNewInspectionModal, setShowNewInspectionModal] = useState<boolean>(!!preselectedEquipmentId);
  const [inspectionTargetId, setInspectionTargetId] = useState<string>(preselectedEquipmentId || equipments[0]?.id || '');
  const [selectedEquipmentDetail, setSelectedEquipmentDetail] = useState<Equipment | null>(null);
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);

  // Global list selector presentation style configured by Admin in Settings
  const listStyle: SelectorStyle = settings.listSelectorStyle || 'popover';

  // Inspection form state
  const [inspForm, setInspForm] = useState({
    technicianName: settings.technicians[0] || 'Técnico de Turno',
    suctionPressurePsi: 15.0,
    dischargePressurePsi: 75.0,
    flowEstimateGpm: 120,
    ampL1: 8.8,
    ampL2: 8.9,
    ampL3: 8.7,
    voltageMeasure: 460,
    motorTempC: 48.0,
    pumpBearingTempC: 52.0,
    vibrationMmS: 1.4,
    mechanicalSealStatus: 'sin_goteo' as 'sin_goteo' | 'goteo_normal' | 'fuga_excesiva',
    noiseLevel: 'normal' as 'normal' | 'leve_zumbido' | 'cavitacion' | 'golpeteo_fuerte',
    couplingStatus: 'alineado' as 'alineado' | 'desalineado_leve' | 'desgaste',
    hourMeter: 4300,
    valvesCondition: 'correctas' as 'correctas' | 'bloqueadas' | 'fugas',
    overallCondition: 'optimo' as InspectionCondition,
    findings: '',
    correctiveActionsNeeded: '',
  });

  // Calculate electrical unbalance on the fly
  const avgAmps = (inspForm.ampL1 + inspForm.ampL2 + inspForm.ampL3) / 3;
  const maxAmpDev = Math.max(
    Math.abs(inspForm.ampL1 - avgAmps),
    Math.abs(inspForm.ampL2 - avgAmps),
    Math.abs(inspForm.ampL3 - avgAmps)
  );
  const currentUnbalance = avgAmps > 0 ? ((maxAmpDev / avgAmps) * 100).toFixed(1) : '0';
  const differentialPressure = (inspForm.dischargePressurePsi - inspForm.suctionPressurePsi).toFixed(1);

  // New/Edit equipment form state
  const [eqForm, setEqForm] = useState<Partial<Equipment>>({
    tag: '',
    name: '',
    category: 'bomba_presion',
    area: 'Sótano 2 - Cuarto de Bombas',
    locationDetails: '',
    brand: '',
    model: '',
    serialNumber: '',
    powerHp: 5.0,
    flowGpm: 100,
    voltage: '460V / 3F / 60Hz',
    nominalAmps: 8.0,
    nominalPressurePsi: 70,
    suctionDiameterInches: '2.5"',
    dischargeDiameterInches: '2"',
    installationDate: new Date().toISOString().split('T')[0],
    status: 'operativo',
    currentHours: 0,
    notes: '',
    limits: {
      minPressurePsi: 50,
      maxPressurePsi: 85,
      maxBearingTempC: 75,
      maxVibrationMmS: 3.0,
    }
  });

  const handleOpenNewInspection = (eqId?: string) => {
    const target = eqId || equipments[0]?.id;
    setInspectionTargetId(target);
    const targetEq = equipments.find(e => e.id === target);
    if (targetEq) {
      setInspForm(prev => ({
        ...prev,
        suctionPressurePsi: 15,
        dischargePressurePsi: targetEq.nominalPressurePsi || 70,
        ampL1: targetEq.nominalAmps * 0.9,
        ampL2: targetEq.nominalAmps * 0.9,
        ampL3: targetEq.nominalAmps * 0.9,
        hourMeter: targetEq.currentHours || 0,
      }));
    }
    setShowNewInspectionModal(true);
  };

  const handleSaveInspection = (e: React.FormEvent) => {
    e.preventDefault();
    const targetEq = equipments.find(e => e.id === inspectionTargetId);
    if (!targetEq) return;

    const dateStr = getLocalDateTimeString();

    addPumpInspection({
      equipmentId: targetEq.id,
      equipmentTag: targetEq.tag,
      equipmentName: targetEq.name,
      date: dateStr,
      technicianName: inspForm.technicianName,
      suctionPressurePsi: Number(inspForm.suctionPressurePsi),
      dischargePressurePsi: Number(inspForm.dischargePressurePsi),
      differentialPressurePsi: parseFloat(differentialPressure),
      flowEstimateGpm: Number(inspForm.flowEstimateGpm),
      ampL1: Number(inspForm.ampL1),
      ampL2: Number(inspForm.ampL2),
      ampL3: Number(inspForm.ampL3),
      voltageMeasure: Number(inspForm.voltageMeasure),
      currentUnbalancePercent: parseFloat(currentUnbalance),
      motorTempC: Number(inspForm.motorTempC),
      pumpBearingTempC: Number(inspForm.pumpBearingTempC),
      vibrationMmS: Number(inspForm.vibrationMmS),
      mechanicalSealStatus: inspForm.mechanicalSealStatus,
      noiseLevel: inspForm.noiseLevel,
      couplingStatus: inspForm.couplingStatus,
      hourMeter: Number(inspForm.hourMeter),
      valvesCondition: inspForm.valvesCondition,
      overallCondition: inspForm.overallCondition,
      findings: inspForm.findings || 'Inspección técnica de rutina conforme.',
      correctiveActionsNeeded: inspForm.correctiveActionsNeeded,
    });

    setShowNewInspectionModal(false);
    if (onClearPreselection) onClearPreselection();
  };

  const handleOpenAddModal = () => {
    setEditingEquipment(null);
    setEqForm({
      tag: `BOM-${Math.floor(100 + Math.random() * 900)}`,
      name: '',
      category: 'bomba_presion',
      area: 'Sótano 2 - Cuarto de Bombas',
      locationDetails: '',
      brand: 'Grundfos',
      model: '',
      serialNumber: '',
      powerHp: 5.0,
      flowGpm: 100,
      voltage: '460V / 3F / 60Hz',
      nominalAmps: 7.5,
      nominalPressurePsi: 70,
      suctionDiameterInches: '2.5"',
      dischargeDiameterInches: '2"',
      installationDate: new Date().toISOString().split('T')[0],
      status: 'operativo',
      currentHours: 10,
      notes: '',
      limits: {
        minPressurePsi: 50,
        maxPressurePsi: 85,
        maxBearingTempC: 75,
        maxVibrationMmS: 3.0,
      }
    });
    setShowAddEditModal(true);
  };

  const handleOpenEditModal = (eq: Equipment) => {
    setEditingEquipment(eq);
    setEqForm({ ...eq });
    setShowAddEditModal(true);
  };

  const handleSaveEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eqForm.tag || !eqForm.name) {
      notify('⚠️ Por favor ingresa el código (TAG) y el nombre del equipo.');
      return;
    }

    if (editingEquipment) {
      updateEquipment(editingEquipment.id, eqForm);
    } else {
      addEquipment(eqForm as Omit<Equipment, 'id'>);
    }
    setShowAddEditModal(false);
  };

  // Filtered equipment list
  const filteredEquipments = (equipments || []).filter(eq => {
    if (!eq) return false;
    const matchesCategory = categoryFilter === 'todas' || eq.category === categoryFilter;
    const matchesStatus = statusFilter === 'todos' || eq.status === statusFilter;
    const matchesSearch = (eq.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (eq.tag || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (eq.brand || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (eq.area || '').toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Top Header & Admin Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <Layers className="w-5 h-5 text-blue-600" />
            <span>Gestión Técnica de Bombas y Maquinaria</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Registro de grupos de presión, recirculadoras de ACS, bombas de piscina y revisiones electromecánicas
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <button
            onClick={() => handleOpenNewInspection()}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
          >
            <Gauge className="w-4 h-4 text-cyan-300" />
            <span>+ Nueva Revisión de Bomba</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center space-x-2 px-3.5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-300 text-xs font-semibold rounded-xl border border-amber-500/30 transition-colors"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>+ Alta de Equipo</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-wrap items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por TAG, marca o ubicación..."
            className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:bg-white"
          />
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-1 text-xs">
          {[
            { id: 'todas', label: 'Todos los Equipos' },
            { id: 'sauna_cold_plunge', label: 'Sauna & Cold Plunge' },
            { id: 'bomba_presion', label: 'Bombas Presión' },
            { id: 'bomba_impulsion', label: 'Bombas de Impulsión' },
            { id: 'bomba_acs', label: 'Bombas ACS' },
            { id: 'bomba_piscina', label: 'Piscinas / Spa' },
            { id: 'bomba_achique', label: 'Achique / Fosas' },
            { id: 'bomba_incendio', label: 'Contra Incendios' },
            { id: 'combustible', label: 'Combustible / ACPM' },
            { id: 'caldera', label: 'Calderas' },
            { id: 'chiller', label: 'Chillers Clima' },
            { id: 'condensador', label: 'Condensadores' },
            { id: 'bateria', label: 'Baterías / UPS' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
                categoryFilter === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Status Dropdown */}
        <div className="w-full sm:w-48">
          <CustomSelect
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: 'todos', label: 'Todos los Estados', color: 'slate' },
              { value: 'operativo', label: 'Operativo (Normal)', color: 'emerald' },
              { value: 'alerta', label: 'En Alerta', color: 'amber' },
              { value: 'fuera_servicio', label: 'Fuera de Servicio', color: 'rose' },
            ]}
          />
        </div>
      </div>

      {/* Equipment Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredEquipments.map(eq => {
          const isPump = eq.category.startsWith('bomba');
          const lastInsp = pumpInspections.find(i => i.equipmentId === eq.id);

          return (
            <div 
              key={eq.id}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              <div className="p-5">
                {/* Top TAG and Status Badge */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      {eq.tag}
                    </span>
                    <span className="text-[11px] text-slate-500">{eq.brand}</span>
                  </div>

                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    eq.status === 'operativo' ? 'bg-emerald-100 text-emerald-800' :
                    eq.status === 'alerta' ? 'bg-amber-100 text-amber-800 ring-2 ring-amber-200' :
                    'bg-rose-100 text-rose-800'
                  }`}>
                    {eq.status === 'operativo' ? 'Operativo' : eq.status === 'alerta' ? 'Alerta' : 'Fuera Servicio'}
                  </span>
                </div>

                {/* Equipment Name & Model */}
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {eq.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Modelo: {eq.model}
                </p>

                {/* Area & Location */}
                <div className="mt-3 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p className="font-medium text-slate-800 flex items-center space-x-1">
                    <span>📍 {eq.area}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{eq.locationDetails}</p>
                </div>

                {/* Technical Specs Mini-Grid */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100 text-center">
                  <div className="bg-slate-50/60 p-1.5 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase">Potencia</span>
                    <p className="text-xs font-bold text-slate-800">{eq.powerHp} HP</p>
                  </div>
                  <div className="bg-slate-50/60 p-1.5 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase">Presión Nom.</span>
                    <p className="text-xs font-bold text-slate-800">{eq.nominalPressurePsi} PSI</p>
                  </div>
                  <div className="bg-slate-50/60 p-1.5 rounded-lg">
                    <span className="text-[10px] text-slate-400 uppercase">Horómetro</span>
                    <p className="text-xs font-bold text-slate-800 font-mono">{eq.currentHours} h</p>
                  </div>
                </div>

                {/* Last inspection / notes */}
                {lastInsp && (
                  <div className="mt-3 text-[11px] text-slate-500 flex items-center justify-between bg-blue-50/40 p-2 rounded-lg border border-blue-100">
                    <span className="flex items-center text-blue-800 font-medium">
                      <Gauge className="w-3 h-3 mr-1 text-blue-600" />
                      Última revisión: {lastInsp.date.split(' ')[0]}
                    </span>
                    <span className={`font-bold uppercase text-[10px] ${
                      lastInsp.overallCondition === 'optimo' ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {lastInsp.overallCondition}
                    </span>
                  </div>
                )}
              </div>

              {/* Bottom Card Actions */}
              <div className="bg-slate-50/80 px-4 py-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedEquipmentDetail(eq)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                >
                  Ficha Técnica
                </button>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleOpenNewInspection(eq.id)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center space-x-1"
                  >
                    <Gauge className="w-3.5 h-3.5" />
                    <span>Revisar</span>
                  </button>

                  <button
                    onClick={() => handleOpenEditModal(eq)}
                    className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-200/60 rounded-lg"
                    title="Editar Equipo"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* NEW PUMP INSPECTION MODAL */}
      {showNewInspectionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Gauge className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Revisión Técnica Electromecánica de Bomba
                  </h3>
                  <p className="text-xs text-slate-500">
                    Registro de presiones, amperaje trifásico, vibración y sello mecánico
                  </p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowNewInspectionModal(false);
                  if (onClearPreselection) onClearPreselection();
                }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveInspection} className="space-y-6 pt-4">
              {/* Select Target Pump */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <CustomSelect
                    label="Bomba / Equipo a Inspeccionar *"
                    value={inspectionTargetId}
                    onChange={(val) => {
                      setInspectionTargetId(val);
                      const t = equipments.find(x => x.id === val);
                      if (t) {
                        setInspForm(p => ({
                          ...p,
                          dischargePressurePsi: t.nominalPressurePsi || 70,
                          hourMeter: t.currentHours || 0
                        }));
                      }
                    }}
                    style={listStyle}
                    options={equipments.map(eq => ({
                      value: eq.id,
                      label: `${eq.tag} - ${eq.name}`,
                      description: `${eq.powerHp} HP • ${eq.brand} • ${eq.area}`,
                      color: eq.status === 'operativo' ? 'emerald' : eq.status === 'alerta' ? 'amber' : 'rose'
                    }))}
                  />
                </div>

                <div>
                  <CustomSelect
                    label="Técnico Inspector Responsable"
                    value={inspForm.technicianName}
                    onChange={(val) => setInspForm(p => ({ ...p, technicianName: val }))}
                    style={listStyle}
                    options={settings.technicians.map(t => ({
                      value: t,
                      label: t,
                      color: 'blue'
                    }))}
                  />
                </div>
              </div>

              {/* 1. SECCIÓN HIDRÁULICA */}
              <div className="border border-slate-200 rounded-xl p-4">
                <h4 className="text-xs font-bold text-blue-900 uppercase tracking-wider mb-3 flex items-center space-x-1.5">
                  <Droplets className="w-4 h-4 text-blue-600" />
                  <span>1. Parámetros Hidráulicos</span>
                </h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Presión Succión (PSI)
                    </label>
                    <DecimalInput
                      value={inspForm.suctionPressurePsi}
                      onChange={(val) => {
                        const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                        setInspForm(p => ({ ...p, suctionPressurePsi: !isNaN(parsed) ? parsed : 0 }));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Presión Descarga (PSI)
                    </label>
                    <DecimalInput
                      value={inspForm.dischargePressurePsi}
                      onChange={(val) => {
                        const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                        setInspForm(p => ({ ...p, dischargePressurePsi: !isNaN(parsed) ? parsed : 0 }));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-center"
                    />
                  </div>

                  <div className="bg-blue-50/70 p-2 rounded-lg border border-blue-200 text-center">
                    <span className="text-[10px] font-bold text-blue-800 uppercase">Presión Diferencial</span>
                    <p className="text-sm font-extrabold text-blue-900 font-mono mt-0.5">{differentialPressure} PSI</p>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Caudal Estimado (GPM)
                    </label>
                    <DecimalInput
                      value={inspForm.flowEstimateGpm}
                      onChange={(val) => {
                        const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                        setInspForm(p => ({ ...p, flowEstimateGpm: !isNaN(parsed) ? parsed : 0 }));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-center"
                    />
                  </div>
                </div>
              </div>

              {/* 2. SECCIÓN ELÉCTRICA */}
              <div className="border border-slate-200 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Zap className="w-4 h-4 text-amber-600" />
                    <span>2. Parámetros Eléctricos del Motor</span>
                  </h4>
                  {parseFloat(currentUnbalance) > (settings.alertThresholds.defaultMaxCurrentUnbalancePercent || 5) && (
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full animate-pulse">
                      ¡Alerta: Desbalance &gt; 5%!
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fase 1 (Amps)</label>
                    <DecimalInput
                      value={inspForm.ampL1}
                      onChange={(val) => {
                        const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                        setInspForm(p => ({ ...p, ampL1: !isNaN(parsed) ? parsed : 0 }));
                      }}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fase 2 (Amps)</label>
                    <DecimalInput
                      value={inspForm.ampL2}
                      onChange={(val) => {
                        const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                        setInspForm(p => ({ ...p, ampL2: !isNaN(parsed) ? parsed : 0 }));
                      }}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Fase 3 (Amps)</label>
                    <DecimalInput
                      value={inspForm.ampL3}
                      onChange={(val) => {
                        const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                        setInspForm(p => ({ ...p, ampL3: !isNaN(parsed) ? parsed : 0 }));
                      }}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono font-bold text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Voltaje (V)</label>
                    <DecimalInput
                      value={inspForm.voltageMeasure}
                      onChange={(val) => {
                        const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                        setInspForm(p => ({ ...p, voltageMeasure: !isNaN(parsed) ? parsed : 0 }));
                      }}
                      className="w-full px-2 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-center"
                    />
                  </div>
                  <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-center">
                    <span className="text-[10px] font-bold text-amber-800 uppercase">Desbalance</span>
                    <p className={`text-sm font-extrabold font-mono mt-0.5 ${
                      parseFloat(currentUnbalance) > 5 ? 'text-rose-700' : 'text-slate-800'
                    }`}>
                      {currentUnbalance}%
                    </p>
                  </div>
                </div>
              </div>

              {/* 3. SECCIÓN MECÁNICA, TÉRMICA & VIBRACIÓN */}
              <div className="border border-slate-200 rounded-xl p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-1.5">
                    <Thermometer className="w-4 h-4 text-rose-600" />
                    <span>3. Estado Mecánico, Térmico & Sellado</span>
                  </h4>
                  
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                      Estilo activo: <strong className="text-blue-700 font-bold">{
                        listStyle === 'segmented' ? 'Botones Segmentados' :
                        listStyle === 'popover' ? 'Menú Flotante' :
                        listStyle === 'cards' ? 'Tarjetas' : 'Hoja Inferior'
                      }</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setShowNewInspectionModal(false);
                        setSelectedTab('configuraciones');
                      }}
                      className="inline-flex items-center space-x-1 text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg border border-slate-300 transition-colors"
                      title="Configurar forma de listas en Ajustes"
                    >
                      <span>⚙ Cambiar estilo</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Temp. Motor (°C)
                    </label>
                    <DecimalInput
                      value={inspForm.motorTempC}
                      onChange={(val) => {
                        const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                        setInspForm(p => ({ ...p, motorTempC: !isNaN(parsed) ? parsed : 0 }));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Temp. Cojinete / Bomba (°C)
                    </label>
                    <DecimalInput
                      value={inspForm.pumpBearingTempC}
                      onChange={(val) => {
                        const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                        setInspForm(p => ({ ...p, pumpBearingTempC: !isNaN(parsed) ? parsed : 0 }));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-center"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Vibración (mm/s RMS)
                    </label>
                    <DecimalInput
                      value={inspForm.vibrationMmS}
                      onChange={(val) => {
                        const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                        setInspForm(p => ({ ...p, vibrationMmS: !isNaN(parsed) ? parsed : 0 }));
                      }}
                      className="w-full px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-center"
                    />
                  </div>
                </div>

                {/* Modern Selectors for Mechanical Seal & Noise Level */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                  <CustomSelect
                    label="Estado Sello Mecánico"
                    value={inspForm.mechanicalSealStatus}
                    onChange={(val) => setInspForm(p => ({ ...p, mechanicalSealStatus: val as any }))}
                    style={listStyle}
                    options={[
                      { 
                        value: 'sin_goteo', 
                        label: 'Sin goteo (Seco OK)', 
                        description: 'Estanqueidad perfecta, sellos herméticos.',
                        color: 'emerald' 
                      },
                      { 
                        value: 'goteo_normal', 
                        label: 'Goteo normal refrigerado', 
                        description: 'Micro-lubricación aceptable por fabricante.',
                        color: 'amber' 
                      },
                      { 
                        value: 'fuga_excesiva', 
                        label: 'Fuga excesiva (Cambiar)', 
                        description: 'Chorro de agua continuo, peligro de rodamiento.',
                        color: 'rose' 
                      },
                    ]}
                  />

                  <CustomSelect
                    label="Nivel de Ruido Operativo"
                    value={inspForm.noiseLevel}
                    onChange={(val) => setInspForm(p => ({ ...p, noiseLevel: val as any }))}
                    style={listStyle}
                    options={[
                      { value: 'normal', label: 'Silencioso / Normal', color: 'emerald' },
                      { value: 'leve_zumbido', label: 'Leve zumbido', color: 'amber' },
                      { value: 'cavitacion', label: 'Cavitación (Falta succión)', color: 'rose' },
                      { value: 'golpeteo_fuerte', label: 'Golpeteo mecánico', color: 'rose' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Horómetro Actual (Horas acumuladas)
                  </label>
                  <DecimalInput
                    value={inspForm.hourMeter}
                    onChange={(val) => {
                      const parsed = typeof val === 'number' ? Math.round(val) : parseInt(String(val));
                      setInspForm(p => ({ ...p, hourMeter: !isNaN(parsed) ? parsed : 0 }));
                    }}
                    className="w-full sm:w-1/2 px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-mono text-center"
                  />
                </div>
              </div>

              {/* 4. DIAGNÓSTICO Y CONCLUSIÓN */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase">
                    Diagnóstico Operativo General
                  </label>
                  <div className="flex space-x-2">
                    {[
                      { id: 'optimo', label: 'Óptimo', color: 'bg-emerald-600 text-white' },
                      { id: 'observacion', label: 'Observación', color: 'bg-amber-500 text-white' },
                      { id: 'critico', label: 'Crítico', color: 'bg-rose-600 text-white' },
                    ].map(cond => (
                      <button
                        key={cond.id}
                        type="button"
                        onClick={() => setInspForm(p => ({ ...p, overallCondition: cond.id as any }))}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          inspForm.overallCondition === cond.id
                            ? cond.color + ' ring-2 ring-slate-900'
                            : 'bg-white border border-slate-300 text-slate-700'
                        }`}
                      >
                        {cond.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Hallazgos Técnicos & Recomendaciones
                  </label>
                  <textarea
                    rows={2}
                    value={inspForm.findings}
                    onChange={(e) => setInspForm(p => ({ ...p, findings: e.target.value }))}
                    placeholder="Registrar estado de pernos, lubricación, acople, temperatura superficial..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewInspectionModal(false);
                    if (onClearPreselection) onClearPreselection();
                  }}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors"
                >
                  Guardar Revisión Técnica
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EQUIPMENT DETAIL MODAL */}
      {selectedEquipmentDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                    {selectedEquipmentDetail.tag}
                  </span>
                  <span className="text-xs font-bold uppercase text-slate-500">Ficha Técnica</span>
                </div>
                <h3 className="text-lg font-bold text-slate-900 mt-1">
                  {selectedEquipmentDetail.name}
                </h3>
              </div>
              <button 
                onClick={() => setSelectedEquipmentDetail(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400">Marca / Fabricante:</span>
                  <p className="font-semibold text-slate-900">{selectedEquipmentDetail.brand}</p>
                </div>
                <div>
                  <span className="text-slate-400">Modelo:</span>
                  <p className="font-semibold text-slate-900">{selectedEquipmentDetail.model}</p>
                </div>
                <div>
                  <span className="text-slate-400">Número de Serie:</span>
                  <p className="font-mono font-semibold text-slate-900">{selectedEquipmentDetail.serialNumber}</p>
                </div>
                <div>
                  <span className="text-slate-400">Potencia de Motor:</span>
                  <p className="font-semibold text-slate-900">{selectedEquipmentDetail.powerHp} HP ({selectedEquipmentDetail.powerKw || '—'} kW)</p>
                </div>
                <div>
                  <span className="text-slate-400">Alimentación Eléctrica:</span>
                  <p className="font-semibold text-slate-900">{selectedEquipmentDetail.voltage}</p>
                </div>
                <div>
                  <span className="text-slate-400">Corriente Nominal:</span>
                  <p className="font-semibold text-slate-900">{selectedEquipmentDetail.nominalAmps} Amperes</p>
                </div>
              </div>

              {/* Operational Limits */}
              <div className="border border-slate-200 rounded-xl p-3.5">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Umbrales de Operación Segura
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="bg-slate-100 p-2 rounded-lg">
                    <span className="text-slate-500 text-[10px]">Presión Mínima</span>
                    <p className="font-bold text-slate-800">{selectedEquipmentDetail.limits.minPressurePsi ?? '—'} PSI</p>
                  </div>
                  <div className="bg-slate-100 p-2 rounded-lg">
                    <span className="text-slate-500 text-[10px]">Presión Máxima</span>
                    <p className="font-bold text-slate-800">{selectedEquipmentDetail.limits.maxPressurePsi ?? '—'} PSI</p>
                  </div>
                  <div className="bg-slate-100 p-2 rounded-lg">
                    <span className="text-slate-500 text-[10px]">Temp. Máx Cojinete</span>
                    <p className="font-bold text-slate-800">{selectedEquipmentDetail.limits.maxBearingTempC ?? 75} °C</p>
                  </div>
                  <div className="bg-slate-100 p-2 rounded-lg">
                    <span className="text-slate-500 text-[10px]">Vibración Máx.</span>
                    <p className="font-bold text-slate-800">{selectedEquipmentDetail.limits.maxVibrationMmS ?? 3.0} mm/s</p>
                  </div>
                </div>
              </div>

              {/* History of technical inspections */}
              <div>
                <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-2">
                  Historial de Revisiones Técnicas Registradas
                </h4>
                {pumpInspections.filter(i => i.equipmentId === selectedEquipmentDetail.id).length === 0 ? (
                  <p className="text-slate-400 italic">No hay revisiones registradas aún para este equipo.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {pumpInspections.filter(i => i.equipmentId === selectedEquipmentDetail.id).map(insp => (
                      <div key={insp.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-semibold">{insp.date}</span>
                            <span className={`px-2 py-0.2 rounded text-[10px] font-bold uppercase ${
                              insp.overallCondition === 'optimo' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {insp.overallCondition}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] mt-0.5">{insp.findings}</p>
                        </div>
                        <div className="text-right text-[11px] text-slate-500 font-mono">
                          <div>P.Desc: {insp.dischargePressurePsi} PSI</div>
                          <div>Amps: {insp.ampL1}A</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Notes */}
              {selectedEquipmentDetail.notes && (
                <div className="bg-amber-50 p-3 rounded-lg border border-amber-200">
                  <span className="font-semibold text-amber-900">Observaciones Técnicas:</span>
                  <p className="text-amber-800 mt-0.5">{selectedEquipmentDetail.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-200">
              <button
                onClick={() => setSelectedEquipmentDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT EQUIPMENT MODAL (Admin only) */}
      {showAddEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {editingEquipment ? `Editar Equipo: ${editingEquipment.tag}` : 'Alta de Nuevo Equipo o Bomba (Admin)'}
              </h3>
              <button onClick={() => setShowAddEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEquipment} className="space-y-4 pt-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Código / TAG *</label>
                  <input
                    type="text"
                    required
                    value={eqForm.tag}
                    onChange={(e) => setEqForm(p => ({ ...p, tag: e.target.value.toUpperCase() }))}
                    placeholder="Ej. BOM-PRES-04"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nombre Descriptivo *</label>
                  <input
                    type="text"
                    required
                    value={eqForm.name}
                    onChange={(e) => setEqForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ej. Bomba de Presión Hidroneumática 4"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <CustomSelect
                    label="Categoría del Equipo"
                    value={eqForm.category}
                    onChange={(val) => setEqForm(p => ({ ...p, category: val as any }))}
                    options={[
                      { value: 'sauna_cold_plunge', label: 'Sauna / Cold Plunge / Zona Húmeda / Spa', color: 'cyan', icon: <SaunaColdPlungeIcon className="w-4 h-4 text-cyan-600" /> },
                      { value: 'tanque_agua', label: 'Tanque de Agua / Depósito / Cisterna', color: 'sky', icon: <TankIcon className="w-4 h-4 text-sky-600" /> },
                      { value: 'subestacion', label: 'Subestación Eléctrica / Transformador', color: 'amber', icon: <SubstationIcon className="w-4 h-4 text-amber-600" /> },
                      { value: 'bomba_presion', label: 'Bomba de Presión', color: 'blue', icon: <WaterPumpIcon className="w-4 h-4 text-blue-600" /> },
                      { value: 'bomba_impulsion', label: 'Bomba de Impulsión', color: 'blue', icon: <WaterPumpIcon className="w-4 h-4 text-blue-600" /> },
                      { value: 'bomba_acs', label: 'Bomba de ACS (Caliente)', color: 'amber', icon: <WaterPumpIcon className="w-4 h-4 text-amber-600" /> },
                      { value: 'bomba_piscina', label: 'Bomba de Piscina / Spa', color: 'blue', icon: <WaterPumpIcon className="w-4 h-4 text-blue-600" /> },
                      { value: 'bomba_achique', label: 'Bomba de Achique / Cárcamo', color: 'slate', icon: <WaterPumpIcon className="w-4 h-4 text-slate-600" /> },
                      { value: 'bomba_incendio', label: 'Bomba Contra Incendios', color: 'rose', icon: <WaterPumpIcon className="w-4 h-4 text-rose-600" /> },
                      { value: 'combustible', label: 'Tanque de Combustible / ACPM', color: 'orange', icon: <Fuel className="w-4 h-4 text-orange-600" /> },
                      { value: 'caldera', label: 'Caldera / Termotanque', color: 'rose' },
                      { value: 'chiller', label: 'Chiller / Climatización', color: 'blue' },
                      { value: 'condensador', label: 'Condensador / Unidad Condensadora', color: 'cyan', icon: <CondenserIcon className="w-4 h-4 text-cyan-600" /> },
                      { value: 'generador', label: 'Generador Eléctrico', color: 'amber' },
                      { value: 'bateria', label: 'Banco de Baterías / UPS', color: 'emerald' },
                      { value: 'otro', label: 'Otro Equipo', color: 'slate' },
                    ]}
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Marca</label>
                  <input
                    type="text"
                    value={eqForm.brand}
                    onChange={(e) => setEqForm(p => ({ ...p, brand: e.target.value }))}
                    placeholder="Grundfos, Wilo, Pentair, etc."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Modelo</label>
                  <input
                    type="text"
                    value={eqForm.model}
                    onChange={(e) => setEqForm(p => ({ ...p, model: e.target.value }))}
                    placeholder="Modelo técnico"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Ubicación / Área del Hotel</label>
                  <input
                    type="text"
                    value={eqForm.area}
                    onChange={(e) => setEqForm(p => ({ ...p, area: e.target.value }))}
                    placeholder="Sótano 2 - Cuarto de Bombas"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Detalle de Montaje</label>
                  <input
                    type="text"
                    value={eqForm.locationDetails}
                    onChange={(e) => setEqForm(p => ({ ...p, locationDetails: e.target.value }))}
                    placeholder="Bancada 3, conexión colector 3 pulgadas"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Potencia (HP)</label>
                  <DecimalInput
                    value={eqForm.powerHp}
                    onChange={(val) => {
                      const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                      setEqForm(p => ({ ...p, powerHp: !isNaN(parsed) ? parsed : 0 }));
                    }}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Presión Nom. (PSI)</label>
                  <DecimalInput
                    value={eqForm.nominalPressurePsi}
                    onChange={(val) => {
                      const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                      setEqForm(p => ({ ...p, nominalPressurePsi: !isNaN(parsed) ? parsed : 0 }));
                    }}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-center"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-600 mb-1">Amperaje Nom.</label>
                  <DecimalInput
                    value={eqForm.nominalAmps}
                    onChange={(val) => {
                      const parsed = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
                      setEqForm(p => ({ ...p, nominalAmps: !isNaN(parsed) ? parsed : 0 }));
                    }}
                    className="w-full px-2 py-1.5 rounded-lg border border-slate-300 font-mono text-center"
                  />
                </div>
                <div>
                  <CustomSelect
                    label="Estado"
                    value={eqForm.status}
                    onChange={(val) => setEqForm(p => ({ ...p, status: val as any }))}
                    options={[
                      { value: 'operativo', label: 'Operativo', color: 'emerald' },
                      { value: 'alerta', label: 'En Alerta', color: 'amber' },
                      { value: 'fuera_servicio', label: 'Fuera de Servicio', color: 'rose' },
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notas y Recomendaciones Técnicas</label>
                <textarea
                  rows={2}
                  value={eqForm.notes}
                  onChange={(e) => setEqForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Instrucciones específicas de operación, lubricación o proveedores..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                {editingEquipment && canDeleteRecords ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(`¿Está seguro de eliminar el equipo ${editingEquipment.tag}?`)) {
                        deleteEquipment(editingEquipment.id);
                        setShowAddEditModal(false);
                      }
                    }}
                    className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-lg flex items-center space-x-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Eliminar Equipo</span>
                  </button>
                ) : <div />}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowAddEditModal(false)}
                    className="px-4 py-2 text-slate-600 hover:text-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl"
                  >
                    {editingEquipment ? 'Actualizar Ficha' : 'Guardar Equipo'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
