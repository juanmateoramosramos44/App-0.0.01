import React, { useState, useMemo, useRef } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import {
  BitacoraEntry,
  BitacoraShift,
  BitacoraCategory,
  BitacoraStatus
} from '../../types';
import {
  BookOpen,
  PlusCircle,
  Search,
  Calendar,
  Clock,
  User,
  MapPin,
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Camera,
  Image as ImageIcon,
  X,
  Edit2,
  FileDown,
  Package,
  MessageSquare,
  Filter,
  Loader2,
  ClipboardCheck
} from 'lucide-react';
import { SmartMeterScannerModal, MeterScanResult } from '../rondas/SmartMeterScannerModal';
import { compressImageFile, mergeUniquePhotos } from '../../utils/imageCompression';

const getLocalDateIso = (): string => {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getLocalTimeHm = (): string => {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
};

const detectCurrentShift = (): BitacoraShift => {
  const h = new Date().getHours();
  if (h >= 6 && h < 15) return 'manana';
  if (h >= 15 && h < 21) return 'tarde';
  return 'noche';
};

const SHIFT_META: Record<BitacoraShift, { label: string; range: string; badgeClass: string }> = {
  manana: { label: 'Turno Mañana', range: '06:00 - 15:00', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' },
  tarde: { label: 'Turno Tarde', range: '15:00 - 21:00', badgeClass: 'bg-blue-100 text-blue-900 border-blue-300' },
  noche: { label: 'Turno Noche', range: '21:00 - 06:00', badgeClass: 'bg-purple-100 text-purple-900 border-purple-300' }
};

const CATEGORY_META: Record<BitacoraCategory, { label: string; badgeClass: string }> = {
  mantenimiento_diario: { label: 'Mantenimiento Diario', badgeClass: 'bg-sky-50 text-sky-800 border-sky-200' },
  reparacion: { label: 'Reparación', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  emergencia: { label: 'Emergencia', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' },
  entrega_turno: { label: 'Entrega de Turno', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200' },
  observacion: { label: 'Observación', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' }
};

const STATUS_META: Record<BitacoraStatus, { label: string; badgeClass: string }> = {
  normal: { label: 'Normal / Registrado', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' },
  pendiente: { label: 'Pendiente', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' },
  en_seguimiento: { label: 'En Seguimiento', badgeClass: 'bg-blue-100 text-blue-900 border-blue-300' },
  resuelto: { label: 'Resuelto ✓', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
};

const COMMON_HOTEL_AREAS = [
  'Sótano 2 - Cuarto de Bombas',
  'Sótano 1 - Sala de Calderas',
  'Sótano 2 - Subestación / Planta Eléctrica',
  'Sótano 3 - Cárcamos de Achique',
  'Exterior - Piscina / Jacuzzi / Zona Húmeda',
  'Azotea - Chillers y Climatización',
  'Cocina / Cuartos Fríos',
  'Lavandería / Calderería',
  'Habitaciones / Pisos',
  'Áreas Comunes / Lobby / Recepción'
];

export const BitacoraTecnicaView: React.FC = () => {
  const {
    bitacora,
    addBitacoraEntry,
    updateBitacoraEntry,
    users,
    currentUser,
    isCloudSynced,
    notify
  } = useMaintenance();

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterShift, setFilterShift] = useState<'todos' | BitacoraShift>('todos');
  const [filterCategory, setFilterCategory] = useState<'todos' | BitacoraCategory>('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | BitacoraStatus>('todos');
  const [filterTechnician, setFilterTechnician] = useState<string>('todos');

  // Create / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BitacoraEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [formDate, setFormDate] = useState(getLocalDateIso());
  const [formTime, setFormTime] = useState(getLocalTimeHm());
  const [formShift, setFormShift] = useState<BitacoraShift>(detectCurrentShift());
  const [formTechName, setFormTechName] = useState(currentUser?.displayName || '');
  const [formArea, setFormArea] = useState('');
  const [formCategory, setFormCategory] = useState<BitacoraCategory>('mantenimiento_diario');
  const [formStatus, setFormStatus] = useState<BitacoraStatus>('normal');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMaterials, setFormMaterials] = useState('');
  const [formObservations, setFormObservations] = useState('');
  const [formPhotos, setFormPhotos] = useState<string[]>([]);

  // Camera scanner & gallery inputs
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Photo preview lightbox
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; title: string } | null>(null);

  const todayIso = getLocalDateIso();

  const uniqueTechnicians = useMemo(() => {
    const names = new Set<string>();
    (bitacora || []).forEach(e => {
      if (e?.technicianName) names.add(e.technicianName.trim());
    });
    (users || []).forEach(u => {
      if (u?.displayName) names.add(u.displayName.trim());
    });
    return Array.from(names).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [bitacora, users]);

  const filteredEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (bitacora || [])
      .filter(entry => {
        if (!entry) return false;
        if (filterDate && entry.date !== filterDate) return false;
        if (filterShift !== 'todos' && entry.shift !== filterShift) return false;
        if (filterCategory !== 'todos' && entry.category !== filterCategory) return false;
        if (filterStatus !== 'todos' && entry.status !== filterStatus) return false;
        if (filterTechnician !== 'todos' && (entry.technicianName || '').trim() !== filterTechnician) return false;
        if (q) {
          const haystack = [
            entry.title,
            entry.description,
            entry.area,
            entry.technicianName,
            entry.materialsUsed,
            entry.observations
          ].filter(Boolean).join(' ').toLowerCase();
          if (!haystack.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const tsA = new Date(a.createdAt || `${a.date}T${a.time || '00:00'}:00`).getTime() || 0;
        const tsB = new Date(b.createdAt || `${b.date}T${b.time || '00:00'}:00`).getTime() || 0;
        return tsB - tsA;
      });
  }, [bitacora, searchTerm, filterDate, filterShift, filterCategory, filterStatus, filterTechnician]);

  const stats = useMemo(() => {
    const list = bitacora || [];
    return {
      total: list.length,
      today: list.filter(e => e && e.date === todayIso).length,
      activeFollowup: list.filter(e => e && (e.status === 'pendiente' || e.status === 'en_seguimiento')).length,
      resolved: list.filter(e => e && e.status === 'resuelto').length
    };
  }, [bitacora, todayIso]);

  const openCreateModal = () => {
    setEditingEntry(null);
    setFormDate(getLocalDateIso());
    setFormTime(getLocalTimeHm());
    setFormShift(detectCurrentShift());
    setFormTechName(currentUser?.displayName || users?.[0]?.displayName || 'Técnico de Turno');
    setFormArea('');
    setFormCategory('mantenimiento_diario');
    setFormStatus('normal');
    setFormTitle('');
    setFormDescription('');
    setFormMaterials('');
    setFormObservations('');
    setFormPhotos([]);
    setIsModalOpen(true);
  };

  const openEditModal = (entry: BitacoraEntry) => {
    setEditingEntry(entry);
    setFormDate(entry.date || getLocalDateIso());
    setFormTime(entry.time || getLocalTimeHm());
    setFormShift(entry.shift || detectCurrentShift());
    setFormTechName(entry.technicianName || currentUser?.displayName || '');
    setFormArea(entry.area || '');
    setFormCategory(entry.category || 'mantenimiento_diario');
    setFormStatus(entry.status || 'normal');
    setFormTitle(entry.title || '');
    setFormDescription(entry.description || '');
    setFormMaterials(entry.materialsUsed || '');
    setFormObservations(entry.observations || '');
    setFormPhotos(mergeUniquePhotos(entry.photos, entry.photoUrl ? [entry.photoUrl] : []));
    setIsModalOpen(true);
  };

  const handleGalleryPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;

    const compressed: string[] = [];
    for (const file of files) {
      try {
        const img = await compressImageFile(file, 1080, 0.74);
        if (img) compressed.push(img);
      } catch (err) {
        console.warn('Error comprimiendo imagen de bitácora:', err);
      }
    }
    if (compressed.length > 0) {
      setFormPhotos(prev => mergeUniquePhotos(prev, compressed));
    }
    e.target.value = '';
  };

  const handleCameraApply = (result: MeterScanResult) => {
    const captured = mergeUniquePhotos(result.photoUrls, result.photoUrl ? [result.photoUrl] : []);
    if (captured.length > 0) {
      setFormPhotos(prev => mergeUniquePhotos(prev, captured));
    }
    setIsCameraOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formDescription.trim() || !formArea.trim()) {
      notify('⚠️ Completa el área, el título y la descripción técnica del registro.');
      return;
    }

    setIsSaving(true);
    try {
      const cleanPhotos = mergeUniquePhotos(formPhotos);
      const payload = {
        date: formDate || getLocalDateIso(),
        time: formTime || getLocalTimeHm(),
        shift: formShift,
        technicianId: currentUser?.id,
        technicianName: formTechName.trim() || currentUser?.displayName || 'Técnico de Turno',
        area: formArea.trim(),
        category: formCategory,
        status: formStatus,
        title: formTitle.trim(),
        description: formDescription.trim(),
        materialsUsed: formMaterials.trim() || undefined,
        observations: formObservations.trim() || undefined,
        photos: cleanPhotos.length > 0 ? cleanPhotos : undefined,
        photoUrl: cleanPhotos[cleanPhotos.length - 1] || undefined
      };

      if (editingEntry) {
        await updateBitacoraEntry(editingEntry.id, payload);
      } else {
        await addBitacoraEntry(payload);
      }

      setIsModalOpen(false);
      setEditingEntry(null);
    } catch (err) {
      console.error('Error guardando en bitácora:', err);
      notify('⚠️ No se pudo completar el guardado en Bitácora. Revisa tu conexión.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    filterDate ||
    filterShift !== 'todos' ||
    filterCategory !== 'todos' ||
    filterStatus !== 'todos' ||
    filterTechnician !== 'todos'
  );

  const clearFilters = () => {
    setSearchTerm('');
    setFilterDate('');
    setFilterShift('todos');
    setFilterCategory('todos');
    setFilterStatus('todos');
    setFilterTechnician('todos');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-teal-600" />
            <span>Bitácora Técnica de Mantenimiento</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
            <span>Registro cronológico de novedades, reparaciones, entregas de turno y observaciones</span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
              isCloudSynced
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isCloudSynced ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span>{isCloudSynced ? 'PostgreSQL Sincronizado' : 'Guardado Local'}</span>
            </span>
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center space-x-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Nuevo Registro en Bitácora</span>
        </button>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">Total Registros</div>
          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{stats.total}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Historial guardado en PostgreSQL</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="text-[11px] font-semibold text-teal-700 uppercase tracking-wide">Registrados Hoy</div>
          <div className="text-2xl font-black text-teal-700 mt-1 tabular-nums">{stats.today}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Fecha: {todayIso}</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="text-[11px] font-semibold text-amber-700 uppercase tracking-wide">Pendientes / Seguimiento</div>
          <div className="text-2xl font-black text-amber-600 mt-1 tabular-nums">{stats.activeFollowup}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Requieren continuidad de turno</div>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wide">Resueltos</div>
          <div className="text-2xl font-black text-emerald-600 mt-1 tabular-nums">{stats.resolved}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Trabajos finalizados</div>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span>Filtros de Búsqueda y Trazabilidad</span>
          </span>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar título, área, técnico o material..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            title="Filtrar por fecha exacta"
          />

          <select
            value={filterShift}
            onChange={(e) => setFilterShift(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="todos">Todos los Turnos</option>
            <option value="manana">Turno Mañana</option>
            <option value="tarde">Turno Tarde</option>
            <option value="noche">Turno Noche</option>
          </select>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="todos">Todas las Categorías</option>
            <option value="mantenimiento_diario">Mantenimiento Diario</option>
            <option value="reparacion">Reparación</option>
            <option value="emergencia">Emergencia</option>
            <option value="entrega_turno">Entrega de Turno</option>
            <option value="observacion">Observación</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="todos">Todos los Estados</option>
            <option value="normal">Normal / Registrado</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_seguimiento">En Seguimiento</option>
            <option value="resuelto">Resuelto</option>
          </select>
        </div>

        {uniqueTechnicians.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-500 mr-1">Técnico:</span>
            <button
              type="button"
              onClick={() => setFilterTechnician('todos')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                filterTechnician === 'todos'
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Todos
            </button>
            {uniqueTechnicians.map(name => (
              <button
                key={name}
                type="button"
                onClick={() => setFilterTechnician(name)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  filterTechnician === name
                    ? 'bg-teal-600 text-white font-bold'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Timeline / Entries List */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-dashed border-slate-300 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto border border-teal-200">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            {hasActiveFilters
              ? 'No se encontraron registros que coincidan con los filtros'
              : 'No hay registros en la Bitácora Técnica todavía'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {hasActiveFilters
              ? 'Prueba limpiando los filtros para ver todo el historial guardado en PostgreSQL.'
              : 'Crea el primer registro para documentar novedades, trabajos ejecutados, materiales utilizados y entregas de turno.'}
          </p>
          {!hasActiveFilters && (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Crear Primer Registro</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredEntries.map(entry => {
            const shiftInfo = SHIFT_META[entry.shift] || SHIFT_META.manana;
            const catInfo = CATEGORY_META[entry.category] || CATEGORY_META.mantenimiento_diario;
            const statusInfo = STATUS_META[entry.status] || STATUS_META.normal;
            const entryPhotos = mergeUniquePhotos(entry.photos, entry.photoUrl ? [entry.photoUrl] : []);

            return (
              <div
                key={entry.id}
                className={`bg-white rounded-2xl p-4 sm:p-5 border-2 shadow-xs transition-all ${
                  entry.category === 'emergencia'
                    ? 'border-rose-300'
                    : entry.status === 'pendiente'
                      ? 'border-amber-300'
                      : 'border-slate-200/90 hover:border-teal-300'
                }`}
              >
                {/* Top Meta Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold font-mono tabular-nums">
                        <Calendar className="w-3 h-3 text-teal-400" />
                        <span>{entry.date}</span>
                        <span className="text-slate-400">•</span>
                        <Clock className="w-3 h-3 text-teal-400" />
                        <span>{entry.time} hs</span>
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border uppercase ${shiftInfo.badgeClass}`}>
                        {shiftInfo.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catInfo.badgeClass}`}>
                        {catInfo.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold border ${statusInfo.badgeClass}`}>
                        {statusInfo.label}
                      </span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                      {entry.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                        <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span>{entry.area}</span>
                      </span>
                      <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                        <User className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        <span>{entry.technicianName}</span>
                      </span>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    {entry.status !== 'resuelto' && (
                      <button
                        type="button"
                        onClick={() => updateBitacoraEntry(entry.id, { status: 'resuelto' })}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                        title="Marcar registro como resuelto"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Marcar Resuelto</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditModal(entry)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                      title="Editar detalles o agregar fotos"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Editar</span>
                    </button>
                  </div>
                </div>

                {/* Body Content */}
                <div className="pt-3 space-y-3">
                  <p className="text-xs sm:text-sm text-slate-800 whitespace-pre-line leading-relaxed">
                    {entry.description}
                  </p>

                  {(entry.materialsUsed || entry.observations) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {entry.materialsUsed && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          <div className="font-bold text-slate-700 flex items-center gap-1.5 mb-0.5">
                            <Package className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Materiales / Repuestos Utilizados:</span>
                          </div>
                          <p className="text-slate-700 whitespace-pre-line">{entry.materialsUsed}</p>
                        </div>
                      )}
                      {entry.observations && (
                        <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs">
                          <div className="font-bold text-amber-900 flex items-center gap-1.5 mb-0.5">
                            <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                            <span>Observaciones / Recomendaciones:</span>
                          </div>
                          <p className="text-slate-800 whitespace-pre-line">{entry.observations}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Multi-Photo Gallery */}
                  {entryPhotos.length > 0 && (
                    <div className="pt-2 border-t border-slate-100 space-y-1.5">
                      <div className="text-[11px] font-bold text-emerald-800 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Evidencias Fotográficas ({entryPhotos.length})</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {entryPhotos.map((pUrl, pIdx) => (
                          <button
                            key={`${entry.id}-photo-${pIdx}`}
                            type="button"
                            onClick={() => setPreviewPhoto({ url: pUrl, title: `${entry.title} — Foto ${pIdx + 1}` })}
                            className="w-16 h-16 rounded-xl overflow-hidden border-2 border-slate-200 hover:border-teal-500 bg-slate-900 cursor-pointer transition-all shadow-2xs"
                            title={`Ampliar foto ${pIdx + 1}`}
                          >
                            <img src={pUrl} alt={`Evidencia ${pIdx + 1}`} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 sm:p-6 w-full max-w-2xl shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-600 flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingEntry ? 'Editar Registro de Bitácora' : 'Nuevo Registro en Bitácora Técnica'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Guardado permanente en PostgreSQL en tiempo real
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Auto Date, Time & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Hora *</label>
                  <input
                    type="time"
                    required
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Turno Operativo *</label>
                  <select
                    value={formShift}
                    onChange={(e) => setFormShift(e.target.value as BitacoraShift)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    <option value="manana">Mañana (06:00 - 15:00)</option>
                    <option value="tarde">Tarde (15:00 - 21:00)</option>
                    <option value="noche">Noche (21:00 - 06:00)</option>
                  </select>
                </div>
              </div>

              {/* Technician & Area */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Técnico Responsable *</label>
                  <input
                    type="text"
                    required
                    list="bitacora-tech-list"
                    value={formTechName}
                    onChange={(e) => setFormTechName(e.target.value)}
                    placeholder="Nombre del técnico"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                  />
                  <datalist id="bitacora-tech-list">
                    {uniqueTechnicians.map(name => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Área / Ubicación del Hotel *</label>
                  <input
                    type="text"
                    required
                    list="bitacora-area-list"
                    value={formArea}
                    onChange={(e) => setFormArea(e.target.value)}
                    placeholder="Ej. Sótano 2 - Cuarto de Bombas, Piso 8..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                  <datalist id="bitacora-area-list">
                    {COMMON_HOTEL_AREAS.map(area => (
                      <option key={area} value={area} />
                    ))}
                  </datalist>
                </div>
              </div>

              {/* Category & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Categoría *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as BitacoraCategory)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    <option value="mantenimiento_diario">Mantenimiento Diario</option>
                    <option value="reparacion">Reparación</option>
                    <option value="emergencia">Emergencia</option>
                    <option value="entrega_turno">Entrega de Turno</option>
                    <option value="observacion">Observación</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Estado *</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as BitacoraStatus)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold bg-white"
                  >
                    <option value="normal">Normal / Registrado</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_seguimiento">En Seguimiento</option>
                    <option value="resuelto">Resuelto</option>
                  </select>
                </div>
              </div>

              {/* Title & Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título del Trabajo / Novedad *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ej. Cambio de sello mecánico bomba booster #2 / Entrega de turno sin novedades"
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Descripción Técnica Detallada *</label>
                <textarea
                  rows={4}
                  required
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Detalla lo inspeccionado, parámetros medidos, acciones ejecutadas y estado final del equipo o zona..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              {/* Materials & Observations */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Materiales / Repuestos Utilizados</label>
                  <textarea
                    rows={2}
                    value={formMaterials}
                    onChange={(e) => setFormMaterials(e.target.value)}
                    placeholder="Ej. 2 empaques vitón, 1 breaker 20A, cinta teflón..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Observaciones / Notas para Siguiente Turno</label>
                  <textarea
                    rows={2}
                    value={formObservations}
                    onChange={(e) => setFormObservations(e.target.value)}
                    placeholder="Ej. Monitorear presión en el turno de la noche..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
              </div>

              {/* Multiple Photos */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Fotografías de Evidencia (Múltiples fotos permitidas)
                </label>
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleGalleryPhotos}
                  className="hidden"
                />

                {formPhotos.length > 0 && (
                  <div className="mb-2.5 p-2.5 rounded-xl border-2 border-emerald-300 bg-emerald-50/50 space-y-2">
                    <div className="flex items-center justify-between text-xs font-bold text-emerald-800">
                      <span>{formPhotos.length} fotografía{formPhotos.length > 1 ? 's' : ''} adjunta{formPhotos.length > 1 ? 's' : ''}</span>
                      <button
                        type="button"
                        onClick={() => setFormPhotos([])}
                        className="text-[11px] text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                      >
                        Quitar todas
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formPhotos.map((pUrl, idx) => (
                        <div key={`bit-form-photo-${idx}`} className="relative">
                          <img
                            src={pUrl}
                            alt={`Evidencia ${idx + 1}`}
                            className="w-16 h-16 rounded-xl object-cover border border-emerald-400 bg-slate-900 cursor-pointer"
                            onClick={() => setPreviewPhoto({ url: pUrl, title: `Evidencia ${idx + 1}` })}
                          />
                          <button
                            type="button"
                            onClick={() => setFormPhotos(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs hover:bg-rose-700 cursor-pointer"
                            title="Eliminar foto"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setIsCameraOpen(true)}
                    className="py-2.5 px-3 rounded-xl border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50 text-teal-800 text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-teal-600" />
                    <span>{formPhotos.length > 0 ? '+ Tomar Otra Foto' : 'Tomar Foto (Cámara)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl border border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-slate-600" />
                    <span>{formPhotos.length > 0 ? '+ Agregar de Galería' : 'Subir de Galería'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-2 cursor-pointer"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingEntry ? 'Guardar Cambios' : 'Guardar en Bitácora'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Capture Modal (reuses fixed SmartMeterScannerModal with normal mode, flash cleanup, crop options & multi-photo) */}
      {isCameraOpen && (
        <SmartMeterScannerModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          title={formTitle ? `Evidencia Bitácora: ${formTitle}` : 'Evidencia Fotográfica — Bitácora Técnica'}
          meterName={formArea || 'Bitácora Técnica'}
          meterTypeHint="Bitácora Técnica"
          expectedUnit=""
          initialPhotoMode="normal"
          allowedPhotoMode="normal"
          allowMultiple={true}
          onApplyReading={handleCameraApply}
        />
      )}

      {/* Photo Preview Lightbox */}
      {previewPhoto && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewPhoto(null);
          }}
        >
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3">
              <span className="font-bold text-xs sm:text-sm truncate">{previewPhoto.title}</span>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="p-1 hover:bg-white/10 rounded-full text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-950 flex items-center justify-center flex-1 overflow-hidden min-h-[260px]">
              <img
                src={previewPhoto.url}
                alt={previewPhoto.title}
                className="max-h-[68vh] w-auto max-w-full object-contain rounded-xl border border-slate-800"
              />
            </div>
            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2">
              <a
                href={previewPhoto.url}
                download="evidencia_bitacora_tecnica.jpg"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-blue-600" />
                <span>Descargar Foto</span>
              </a>
              <button
                type="button"
                onClick={() => setPreviewPhoto(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
