import React, { useState, useMemo, useRef } from 'react';
import { useMaintenance } from '../../context/MaintenanceContext';
import {
  BitacoraEntry,
  BitacoraShift,
  BitacoraCategory,
  BitacoraStatus,
  BitacoraComment
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
  ClipboardCheck,
  Sun,
  Sunset,
  Moon,
  Star,
  LayoutList,
  Grid,
  Table2,
  Send,
  ChevronLeft,
  ChevronRight,
  Timer,
  Sparkles,
  AlertTriangle
} from 'lucide-react';
import { SmartMeterScannerModal, MeterScanResult } from '../rondas/SmartMeterScannerModal';
import { compressImageFile, mergeUniquePhotos } from '../../utils/imageCompression';

const getLocalDateIso = (offsetDays = 0): string => {
  const now = new Date();
  if (offsetDays !== 0) {
    now.setDate(now.getDate() + offsetDays);
  }
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

const formatDateLabel = (iso: string, todayIso: string, yesterdayIso: string): string => {
  if (!iso) return 'Sin fecha';
  if (iso === todayIso) return `Hoy — ${iso}`;
  if (iso === yesterdayIso) return `Ayer — ${iso}`;
  try {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const formatted = dt.toLocaleDateString('es-ES', {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  } catch {
    return iso;
  }
};

const SHIFT_META: Record<BitacoraShift, { label: string; shortLabel: string; range: string; badgeClass: string }> = {
  manana: { label: 'Turno Mañana', shortLabel: 'Mañana', range: '06:00 - 15:00', badgeClass: 'bg-amber-50 text-amber-900 border-amber-300' },
  tarde: { label: 'Turno Tarde', shortLabel: 'Tarde', range: '15:00 - 21:00', badgeClass: 'bg-blue-50 text-blue-900 border-blue-300' },
  noche: { label: 'Turno Noche', shortLabel: 'Noche', range: '21:00 - 06:00', badgeClass: 'bg-indigo-50 text-indigo-900 border-indigo-300' }
};

const CATEGORY_META: Record<BitacoraCategory, { label: string; badgeClass: string }> = {
  mantenimiento_diario: { label: 'Mantenimiento Diario', badgeClass: 'bg-sky-50 text-sky-800 border-sky-200' },
  reparacion: { label: 'Reparación', badgeClass: 'bg-indigo-50 text-indigo-800 border-indigo-200' },
  emergencia: { label: 'Emergencia', badgeClass: 'bg-rose-100 text-rose-800 border-rose-300' },
  entrega_turno: { label: 'Entrega de Turno', badgeClass: 'bg-teal-50 text-teal-800 border-teal-200' },
  observacion: { label: 'Observación', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' }
};

const STATUS_META: Record<BitacoraStatus, { label: string; badgeClass: string }> = {
  normal: { label: 'Registrado', badgeClass: 'bg-slate-100 text-slate-800 border-slate-300' },
  pendiente: { label: 'Pendiente', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300' },
  en_seguimiento: { label: 'En Seguimiento', badgeClass: 'bg-blue-100 text-blue-900 border-blue-300' },
  resuelto: { label: 'Resuelto', badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300' }
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

interface QuickTemplate {
  id: string;
  label: string;
  category: BitacoraCategory;
  area: string;
  title: string;
  description: string;
  handover?: boolean;
}

const DAILY_ACTIVITY_TEMPLATES: QuickTemplate[] = [
  {
    id: 'entrega',
    label: 'Entrega de Turno',
    category: 'entrega_turno',
    area: 'Sala de Máquinas / General Hotel',
    title: 'Entrega de turno operativo — Estado general de sistemas',
    description: '• Equipos principales operando en parámetros normales.\n• Novedades atendidas durante el turno:\n• Pendientes para el turno entrante:',
    handover: true
  },
  {
    id: 'habitacion',
    label: 'Habitación',
    category: 'reparacion',
    area: 'Habitaciones / Pisos',
    title: 'Atención técnica en Habitación #',
    description: 'Trabajo realizado en plomería, electricidad, aire acondicionado o mobiliario. Habitación verificada y operativa.'
  },
  {
    id: 'bombas',
    label: 'Bombas / Calderas',
    category: 'mantenimiento_diario',
    area: 'Sótano 2 - Cuarto de Bombas',
    title: 'Inspección y ajuste en Cuarto de Bombas / Calderas',
    description: 'Verificación de presiones, sellos mecánicos, temperatura, nivel de combustible y tableros de control.'
  },
  {
    id: 'piscina',
    label: 'Piscina / Spa',
    category: 'mantenimiento_diario',
    area: 'Exterior - Piscina / Jacuzzi / Zona Húmeda',
    title: 'Control químico y filtración de Piscina / Zona Húmeda',
    description: 'Medición de cloro libre, pH, retrolavado de filtros, temperatura del agua y limpieza de canastillas.'
  },
  {
    id: 'cocina',
    label: 'Cocina / Lavandería',
    category: 'reparacion',
    area: 'Cocina / Cuartos Fríos',
    title: 'Mantenimiento en Cocina / Lavandería / Cuartos Fríos',
    description: 'Revisión de temperaturas de cuartos fríos, vapor, trampas de grasa o equipos de línea caliente.'
  },
  {
    id: 'emergencia',
    label: 'Emergencia',
    category: 'emergencia',
    area: 'Áreas Comunes / Lobby / Recepción',
    title: 'Atención de emergencia técnica en el hotel',
    description: 'Descripción inmediata de la falla, acción de contención aplicada, estado actual del área y seguimiento requerido.',
    handover: true
  }
];

type ViewMode = 'timeline' | 'photos' | 'ledger';
type DateRangeMode = 'today' | 'yesterday' | 'week' | 'all' | 'custom';

export const BitacoraTecnicaView: React.FC = () => {
  const {
    bitacora,
    addBitacoraEntry,
    updateBitacoraEntry,
    equipments,
    users,
    currentUser,
    settings,
    isCloudSynced,
    notify
  } = useMaintenance();

  const todayIso = getLocalDateIso(0);
  const yesterdayIso = getLocalDateIso(-1);
  const weekStartIso = getLocalDateIso(-6);
  const currentShiftNow = detectCurrentShift();

  // Creative View & Filter State
  const [viewMode, setViewMode] = useState<ViewMode>('timeline');
  const [dateRangeMode, setDateRangeMode] = useState<DateRangeMode>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterShift, setFilterShift] = useState<'todos' | BitacoraShift>('todos');
  const [filterCategory, setFilterCategory] = useState<'todos' | BitacoraCategory>('todos');
  const [filterStatus, setFilterStatus] = useState<'todos' | BitacoraStatus>('todos');
  const [filterTechnician, setFilterTechnician] = useState<string>('todos');
  const [onlyHandover, setOnlyHandover] = useState(false);

  // Create / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<BitacoraEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const [formDate, setFormDate] = useState(todayIso);
  const [formTime, setFormTime] = useState(getLocalTimeHm());
  const [formShift, setFormShift] = useState<BitacoraShift>(currentShiftNow);
  const [formTechName, setFormTechName] = useState(currentUser?.displayName || '');
  const [formArea, setFormArea] = useState('');
  const [formEquipmentId, setFormEquipmentId] = useState('');
  const [formCategory, setFormCategory] = useState<BitacoraCategory>('mantenimiento_diario');
  const [formStatus, setFormStatus] = useState<BitacoraStatus>('normal');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formMaterials, setFormMaterials] = useState('');
  const [formObservations, setFormObservations] = useState('');
  const [formDurationMinutes, setFormDurationMinutes] = useState('');
  const [formHandoverHighlighted, setFormHandoverHighlighted] = useState(false);
  const [formPhotos, setFormPhotos] = useState<string[]>([]);

  // Inline follow-up comments per entry
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});

  // Camera scanner & gallery inputs
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  // Photo preview lightbox with multi-photo navigation
  const [lightboxState, setLightboxState] = useState<{
    photos: string[];
    index: number;
    title: string;
    subtitle?: string;
  } | null>(null);

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

  // Handover highlights (highlighted OR pending/follow-up)
  const handoverAlerts = useMemo(() => {
    return (bitacora || []).filter(e =>
      e && (e.handoverHighlighted || e.status === 'pendiente' || e.status === 'en_seguimiento')
    ).slice(0, 5);
  }, [bitacora]);

  const filteredEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (bitacora || [])
      .filter(entry => {
        if (!entry) return false;
        if (dateRangeMode === 'today' && entry.date !== todayIso) return false;
        if (dateRangeMode === 'yesterday' && entry.date !== yesterdayIso) return false;
        if (dateRangeMode === 'week' && (entry.date < weekStartIso || entry.date > todayIso)) return false;
        if (dateRangeMode === 'custom' && filterDate && entry.date !== filterDate) return false;
        if (filterShift !== 'todos' && entry.shift !== filterShift) return false;
        if (filterCategory !== 'todos' && entry.category !== filterCategory) return false;
        if (filterStatus !== 'todos' && entry.status !== filterStatus) return false;
        if (filterTechnician !== 'todos' && (entry.technicianName || '').trim() !== filterTechnician) return false;
        if (onlyHandover && !entry.handoverHighlighted && entry.status !== 'pendiente' && entry.status !== 'en_seguimiento') {
          return false;
        }
        if (q) {
          const haystack = [
            entry.title,
            entry.description,
            entry.area,
            entry.technicianName,
            entry.materialsUsed,
            entry.observations,
            entry.equipmentTag,
            entry.equipmentName
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
  }, [
    bitacora,
    searchTerm,
    dateRangeMode,
    todayIso,
    yesterdayIso,
    weekStartIso,
    filterDate,
    filterShift,
    filterCategory,
    filterStatus,
    filterTechnician,
    onlyHandover
  ]);

  // Group entries by date for Timeline view
  const groupedByDate = useMemo(() => {
    const groups: Array<{ date: string; label: string; items: BitacoraEntry[] }> = [];
    const map = new Map<string, BitacoraEntry[]>();
    for (const entry of filteredEntries) {
      const d = entry.date || todayIso;
      const arr = map.get(d);
      if (arr) arr.push(entry);
      else map.set(d, [entry]);
    }
    Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .forEach(([date, items]) => {
        groups.push({
          date,
          label: formatDateLabel(date, todayIso, yesterdayIso),
          items
        });
      });
    return groups;
  }, [filteredEntries, todayIso, yesterdayIso]);

  // Photo Wall aggregation
  const allWallPhotos = useMemo(() => {
    const list: Array<{
      url: string;
      entry: BitacoraEntry;
      photoIdx: number;
      entryPhotos: string[];
    }> = [];
    for (const entry of filteredEntries) {
      const photos = mergeUniquePhotos(entry.photos, entry.photoUrl ? [entry.photoUrl] : []);
      photos.forEach((url, idx) => {
        list.push({ url, entry, photoIdx: idx, entryPhotos: photos });
      });
    }
    return list;
  }, [filteredEntries]);

  // Shift cockpit stats (for today or current active dataset)
  const shiftStats = useMemo(() => {
    const todayItems = (bitacora || []).filter(e => e && e.date === todayIso);
    const totalPhotosToday = todayItems.reduce((acc, e) => {
      return acc + mergeUniquePhotos(e.photos, e.photoUrl ? [e.photoUrl] : []).length;
    }, 0);
    return {
      total: (bitacora || []).length,
      todayCount: todayItems.length,
      todayPhotos: totalPhotosToday,
      manana: todayItems.filter(e => e.shift === 'manana').length,
      tarde: todayItems.filter(e => e.shift === 'tarde').length,
      noche: todayItems.filter(e => e.shift === 'noche').length,
      pendingFollowup: (bitacora || []).filter(e => e && (e.status === 'pendiente' || e.status === 'en_seguimiento')).length
    };
  }, [bitacora, todayIso]);

  const openCreateModal = (preset?: QuickTemplate) => {
    setEditingEntry(null);
    setFormDate(getLocalDateIso());
    setFormTime(getLocalTimeHm());
    setFormShift(detectCurrentShift());
    setFormTechName(currentUser?.displayName || users?.[0]?.displayName || 'Técnico de Turno');
    setFormArea(preset?.area || '');
    setFormEquipmentId('');
    setFormCategory(preset?.category || 'mantenimiento_diario');
    setFormStatus('normal');
    setFormTitle(preset?.title || '');
    setFormDescription(preset?.description || '');
    setFormMaterials('');
    setFormObservations('');
    setFormDurationMinutes('');
    setFormHandoverHighlighted(Boolean(preset?.handover));
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
    setFormEquipmentId(entry.equipmentId || '');
    setFormCategory(entry.category || 'mantenimiento_diario');
    setFormStatus(entry.status || 'normal');
    setFormTitle(entry.title || '');
    setFormDescription(entry.description || '');
    setFormMaterials(entry.materialsUsed || '');
    setFormObservations(entry.observations || '');
    setFormDurationMinutes(entry.durationMinutes ? String(entry.durationMinutes) : '');
    setFormHandoverHighlighted(Boolean(entry.handoverHighlighted));
    setFormPhotos(mergeUniquePhotos(entry.photos, entry.photoUrl ? [entry.photoUrl] : []));
    setIsModalOpen(true);
  };

  const applyTemplateInModal = (tpl: QuickTemplate) => {
    setFormCategory(tpl.category);
    if (!formArea.trim()) setFormArea(tpl.area);
    setFormTitle(tpl.title);
    setFormDescription(tpl.description);
    if (tpl.handover !== undefined) setFormHandoverHighlighted(tpl.handover);
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
      notify('Completa el área, el título y la descripción del registro.');
      return;
    }

    setIsSaving(true);
    try {
      const cleanPhotos = mergeUniquePhotos(formPhotos);
      const linkedEq = equipments.find(eq => eq.id === formEquipmentId);
      const parsedDuration = parseInt(formDurationMinutes, 10);

      const payload: Partial<BitacoraEntry> = {
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
        equipmentId: linkedEq?.id || undefined,
        equipmentTag: linkedEq?.tag || undefined,
        equipmentName: linkedEq?.name || undefined,
        durationMinutes: !isNaN(parsedDuration) && parsedDuration > 0 ? parsedDuration : undefined,
        handoverHighlighted: formHandoverHighlighted,
        photos: cleanPhotos.length > 0 ? cleanPhotos : undefined,
        photoUrl: cleanPhotos[cleanPhotos.length - 1] || undefined
      };

      if (editingEntry) {
        await updateBitacoraEntry(editingEntry.id, payload);
      } else {
        await addBitacoraEntry(payload as Omit<BitacoraEntry, 'id' | 'createdAt' | 'updatedAt'>);
      }

      setIsModalOpen(false);
      setEditingEntry(null);
    } catch (err) {
      console.error('Error guardando en bitácora:', err);
      notify('No se pudo completar el guardado en Bitácora. Revisa tu conexión.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddFollowupComment = async (entry: BitacoraEntry) => {
    const text = (commentDrafts[entry.id] || '').trim();
    if (!text) return;

    const newComment: BitacoraComment = {
      id: `bcmt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      userName: currentUser?.displayName || 'Compañero de Turno',
      text,
      timestamp: new Date().toISOString()
    };

    const existingComments = Array.isArray(entry.comments) ? entry.comments : [];
    await updateBitacoraEntry(entry.id, {
      comments: [...existingComments, newComment]
    });
    setCommentDrafts(prev => ({ ...prev, [entry.id]: '' }));
    setExpandedComments(prev => ({ ...prev, [entry.id]: true }));
  };

  const handleExportPdf = async () => {
    if (filteredEntries.length === 0) {
      notify('No hay registros visibles para exportar a PDF');
      return;
    }
    setIsExportingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const hotelName = settings?.hotelInfo?.hotelName || 'Hotel Operativo';

      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, 297, 24, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`BITÁCORA DIARIA DE MANTENIMIENTO — ${hotelName.toUpperCase()}`, 14, 11);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `Generado: ${new Date().toLocaleString('es-ES')} | Registros incluidos: ${filteredEntries.length}`,
        14,
        18
      );

      const bodyRows = filteredEntries.map(e => [
        `${e.date}\n${e.time} hs`,
        SHIFT_META[e.shift]?.shortLabel || e.shift,
        `${e.area}${e.equipmentTag ? `\n[${e.equipmentTag}]` : ''}`,
        `${e.title}\n${e.description}`,
        e.technicianName || 'Técnico',
        STATUS_META[e.status]?.label || e.status,
        String(mergeUniquePhotos(e.photos, e.photoUrl ? [e.photoUrl] : []).length)
      ]);

      autoTable(doc, {
        startY: 28,
        head: [['Fecha / Hora', 'Turno', 'Área / Equipo', 'Trabajo Realizado', 'Técnico', 'Estado', 'Fotos']],
        body: bodyRows,
        styles: { fontSize: 8, cellPadding: 2.5, overflow: 'linebreak' },
        headStyles: { fillColor: [13, 148, 136], textColor: 255, fontStyle: 'bold' },
        columnStyles: {
          0: { cellWidth: 26 },
          1: { cellWidth: 20 },
          2: { cellWidth: 44 },
          3: { cellWidth: 118 },
          4: { cellWidth: 32 },
          5: { cellWidth: 24 },
          6: { cellWidth: 14, halign: 'center' }
        }
      });

      doc.save(`Bitacora_Diaria_${todayIso}.pdf`);
      notify(`PDF de Bitácora (${filteredEntries.length} registros) descargado`);
    } catch (err) {
      console.error('Error exportando PDF de bitácora:', err);
      notify('Error al generar el PDF de Bitácora');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const hasActiveFilters = Boolean(
    searchTerm.trim() ||
    dateRangeMode !== 'all' ||
    filterDate ||
    filterShift !== 'todos' ||
    filterCategory !== 'todos' ||
    filterStatus !== 'todos' ||
    filterTechnician !== 'todos' ||
    onlyHandover
  );

  const clearFilters = () => {
    setSearchTerm('');
    setDateRangeMode('all');
    setFilterDate('');
    setFilterShift('todos');
    setFilterCategory('todos');
    setFilterStatus('todos');
    setFilterTechnician('todos');
    setOnlyHandover(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <span>Bitácora Diaria del Hotel</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
            <span>Diario operativo por turnos: trabajos del día, relevos, evidencias fotográficas y seguimiento entre compañeros</span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
              isCloudSynced
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {isCloudSynced ? 'PostgreSQL Sincronizado' : 'Guardado Local'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isExportingPdf || filteredEntries.length === 0}
            onClick={handleExportPdf}
            className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-800 border border-slate-200 text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {isExportingPdf ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4 text-rose-600" />}
            <span>Exportar PDF</span>
          </button>

          <button
            type="button"
            onClick={() => openCreateModal()}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Registrar Actividad Diaria</span>
          </button>
        </div>
      </div>

      {/* Shift Cockpit Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => { setDateRangeMode('today'); setFilterShift('todos'); }}
          className={`rounded-2xl p-3.5 border text-left transition-colors cursor-pointer ${
            dateRangeMode === 'today' && filterShift === 'todos'
              ? 'bg-teal-600 text-white border-teal-600'
              : 'bg-white border-slate-200 hover:border-teal-300'
          }`}
        >
          <div className={`text-[11px] font-semibold uppercase tracking-wide ${dateRangeMode === 'today' && filterShift === 'todos' ? 'text-teal-100' : 'text-slate-500'}`}>
            Actividad Hoy
          </div>
          <div className="text-2xl font-black mt-1 tabular-nums">{shiftStats.todayCount}</div>
          <div className={`text-[11px] mt-0.5 tabular-nums ${dateRangeMode === 'today' && filterShift === 'todos' ? 'text-teal-100' : 'text-slate-500'}`}>
            {shiftStats.todayPhotos} foto{shiftStats.todayPhotos === 1 ? '' : 's'} hoy • {todayIso}
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setDateRangeMode('today'); setFilterShift('manana'); }}
          className={`rounded-2xl p-3.5 border text-left transition-colors cursor-pointer ${
            filterShift === 'manana'
              ? 'bg-amber-50 border-amber-400 ring-1 ring-amber-400'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-amber-800">
            <span className="flex items-center gap-1"><Sun className="w-3.5 h-3.5 text-amber-500" /> Mañana</span>
            {currentShiftNow === 'manana' && <span className="text-[9px] bg-amber-200 px-1.5 py-0.5 rounded font-bold">Activo</span>}
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{shiftStats.manana}</div>
          <div className="text-[11px] text-slate-500 tabular-nums">06:00 - 15:00</div>
        </button>

        <button
          type="button"
          onClick={() => { setDateRangeMode('today'); setFilterShift('tarde'); }}
          className={`rounded-2xl p-3.5 border text-left transition-colors cursor-pointer ${
            filterShift === 'tarde'
              ? 'bg-blue-50 border-blue-400 ring-1 ring-blue-400'
              : 'bg-white border-slate-200 hover:border-blue-300'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-blue-800">
            <span className="flex items-center gap-1"><Sunset className="w-3.5 h-3.5 text-blue-500" /> Tarde</span>
            {currentShiftNow === 'tarde' && <span className="text-[9px] bg-blue-200 px-1.5 py-0.5 rounded font-bold">Activo</span>}
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{shiftStats.tarde}</div>
          <div className="text-[11px] text-slate-500 tabular-nums">15:00 - 21:00</div>
        </button>

        <button
          type="button"
          onClick={() => { setDateRangeMode('today'); setFilterShift('noche'); }}
          className={`rounded-2xl p-3.5 border text-left transition-colors cursor-pointer ${
            filterShift === 'noche'
              ? 'bg-indigo-50 border-indigo-400 ring-1 ring-indigo-400'
              : 'bg-white border-slate-200 hover:border-indigo-300'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-indigo-800">
            <span className="flex items-center gap-1"><Moon className="w-3.5 h-3.5 text-indigo-500" /> Noche</span>
            {currentShiftNow === 'noche' && <span className="text-[9px] bg-indigo-200 px-1.5 py-0.5 rounded font-bold">Activo</span>}
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1 tabular-nums">{shiftStats.noche}</div>
          <div className="text-[11px] text-slate-500 tabular-nums">21:00 - 06:00</div>
        </button>

        <button
          type="button"
          onClick={() => { setOnlyHandover(prev => !prev); setDateRangeMode('all'); }}
          className={`rounded-2xl p-3.5 border text-left transition-colors cursor-pointer col-span-2 lg:col-span-1 ${
            onlyHandover
              ? 'bg-rose-50 border-rose-400 ring-1 ring-rose-400'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <div className="flex items-center justify-between text-[11px] font-bold text-rose-800">
            <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-500" /> Relevos / Pend.</span>
          </div>
          <div className="text-2xl font-black text-rose-700 mt-1 tabular-nums">{shiftStats.pendingFollowup}</div>
          <div className="text-[11px] text-slate-500">Para seguimiento</div>
        </button>
      </div>

      {/* Handover Alert Strip (only when there are highlighted/pending handovers) */}
      {handoverAlerts.length > 0 && !onlyHandover && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
            <div className="text-xs text-amber-950 min-w-0">
              <span className="font-bold">Relevo de Turno: </span>
              <span className="text-amber-900">
                Hay {handoverAlerts.length} novedad{handoverAlerts.length === 1 ? '' : 'es'} destacada{handoverAlerts.length === 1 ? '' : 's'} o pendiente{handoverAlerts.length === 1 ? '' : 's'} (última: «{handoverAlerts[0].title}» por {handoverAlerts[0].technicianName}).
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setOnlyHandover(true); setDateRangeMode('all'); }}
            className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer"
          >
            Ver Relevos Pendientes
          </button>
        </div>
      )}

      {/* Quick Start Bar + View Mode Switcher */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Date Quick Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-500 uppercase mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-teal-600" /> Período:
            </span>
            {[
              { id: 'all' as DateRangeMode, label: `Todo (${shiftStats.total})` },
              { id: 'today' as DateRangeMode, label: `Hoy (${shiftStats.todayCount})` },
              { id: 'yesterday' as DateRangeMode, label: 'Ayer' },
              { id: 'week' as DateRangeMode, label: 'Últimos 7 días' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setDateRangeMode(tab.id);
                  if (tab.id !== 'custom') setFilterDate('');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  dateRangeMode === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <input
              type="date"
              value={filterDate}
              onChange={(e) => {
                setFilterDate(e.target.value);
                setDateRangeMode(e.target.value ? 'custom' : 'all');
              }}
              className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
              title="Elegir fecha específica"
            />
          </div>

          {/* Creative View Switcher */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('timeline')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'timeline' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5 text-teal-600" />
              <span>Línea Diaria</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('photos')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'photos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5 text-teal-600" />
              <span>Muro de Fotos ({allWallPhotos.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('ledger')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                viewMode === 'ledger' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table2 className="w-3.5 h-3.5 text-teal-600" />
              <span>Libro Tabular</span>
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
          <div className="relative lg:col-span-2">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar trabajo, equipo, área, material o técnico..."
              className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

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
            <option value="normal">Registrado</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_seguimiento">En Seguimiento</option>
            <option value="resuelto">Resuelto</option>
          </select>
        </div>

        {/* Technician Quick Filter + Clear */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {uniqueTechnicians.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-semibold text-slate-500 mr-1">Compañero:</span>
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

          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer ml-auto"
            >
              <Filter className="w-3 h-3" />
              <span>Restablecer filtros</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick 1-Click Daily Templates Bar */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 flex items-center gap-2 overflow-x-auto">
        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wide flex items-center gap-1.5 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-teal-600" />
          <span>Registro Rápido:</span>
        </span>
        {DAILY_ACTIVITY_TEMPLATES.map(tpl => (
          <button
            key={tpl.id}
            type="button"
            onClick={() => openCreateModal(tpl)}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-xs font-semibold text-slate-800 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            + {tpl.label}
          </button>
        ))}
      </div>

      {/* Main Content Area by ViewMode */}
      {filteredEntries.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 border border-dashed border-slate-300 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 flex items-center justify-center mx-auto border border-teal-200">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">
            {hasActiveFilters
              ? 'No hay actividades que coincidan con los filtros actuales'
              : 'Aún no hay registros en la Bitácora Diaria'}
          </h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {hasActiveFilters
              ? 'Prueba limpiando los filtros o seleccionando «Todo» para consultar el historial guardado en PostgreSQL.'
              : 'Documenta las actividades diarias del hotel con fotografías, equipos intervenidos y notas para el siguiente turno.'}
          </p>
          <button
            type="button"
            onClick={() => hasActiveFilters ? clearFilters() : openCreateModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{hasActiveFilters ? 'Ver Todo el Historial' : 'Crear Primer Registro'}</span>
          </button>
        </div>
      ) : viewMode === 'timeline' ? (
        /* VIEW 1: DAILY CHRONOLOGICAL TIMELINE GROUPED BY DAY */
        <div className="space-y-6">
          {groupedByDate.map(group => (
            <div key={group.date} className="space-y-3">
              {/* Day Sticky Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-slate-100/90 border border-slate-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-700" />
                  <span className="text-xs font-extrabold text-slate-900">{group.label}</span>
                </div>
                <span className="text-[11px] font-bold text-slate-600 tabular-nums">
                  {group.items.length} {group.items.length === 1 ? 'registro' : 'registros'}
                </span>
              </div>

              <div className="space-y-3 pl-2 sm:pl-4 border-l-2 border-teal-200">
                {group.items.map(entry => {
                  const shiftInfo = SHIFT_META[entry.shift] || SHIFT_META.manana;
                  const catInfo = CATEGORY_META[entry.category] || CATEGORY_META.mantenimiento_diario;
                  const statusInfo = STATUS_META[entry.status] || STATUS_META.normal;
                  const entryPhotos = mergeUniquePhotos(entry.photos, entry.photoUrl ? [entry.photoUrl] : []);
                  const comments = Array.isArray(entry.comments) ? entry.comments : [];
                  const isCommentsOpen = Boolean(expandedComments[entry.id] || comments.length > 0);

                  return (
                    <div
                      key={entry.id}
                      className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all ${
                        entry.category === 'emergencia'
                          ? 'border-rose-300 ring-1 ring-rose-100'
                          : entry.handoverHighlighted || entry.status === 'pendiente'
                          ? 'border-amber-300'
                          : 'border-slate-200 hover:border-teal-300'
                      }`}
                    >
                      {/* Top Meta Row */}
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-3 border-b border-slate-100">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-900 text-white text-[11px] font-bold font-mono tabular-nums">
                              <Clock className="w-3 h-3 text-teal-400" />
                              <span>{entry.time} hs</span>
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase ${shiftInfo.badgeClass}`}>
                              {shiftInfo.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${catInfo.badgeClass}`}>
                              {catInfo.label}
                            </span>
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusInfo.badgeClass}`}>
                              {statusInfo.label}
                            </span>
                            {entry.handoverHighlighted && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                <Star className="w-3 h-3 fill-amber-500 text-amber-600" />
                                <span>Entrega de Turno</span>
                              </span>
                            )}
                            {entry.durationMinutes && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 tabular-nums">
                                <Timer className="w-3 h-3 text-slate-500" />
                                <span>{entry.durationMinutes} min</span>
                              </span>
                            )}
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
                            {entry.equipmentTag && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-mono text-[11px] font-bold">
                                <Wrench className="w-3 h-3" />
                                <span>{entry.equipmentTag}{entry.equipmentName ? ` • ${entry.equipmentName}` : ''}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          {entry.status !== 'resuelto' && (
                            <button
                              type="button"
                              onClick={() => updateBitacoraEntry(entry.id, { status: 'resuelto' })}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Marcar Resuelto</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => openEditModal(entry)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            <span>Editar</span>
                          </button>
                        </div>
                      </div>

                      {/* Body */}
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
                                  <span>Materiales / Repuestos:</span>
                                </div>
                                <p className="text-slate-700 whitespace-pre-line">{entry.materialsUsed}</p>
                              </div>
                            )}
                            {entry.observations && (
                              <div className="p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
                                <div className="font-bold text-amber-900 flex items-center gap-1.5 mb-0.5">
                                  <MessageSquare className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Notas para Siguiente Turno:</span>
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
                                  onClick={() =>
                                    setLightboxState({
                                      photos: entryPhotos,
                                      index: pIdx,
                                      title: entry.title,
                                      subtitle: `${entry.date} ${entry.time} hs • ${entry.technicianName} (${entry.area})`
                                    })
                                  }
                                  className="w-20 h-20 rounded-xl overflow-hidden border border-slate-300 hover:border-teal-500 bg-slate-900 cursor-pointer transition-all"
                                >
                                  <img src={pUrl} alt={`Evidencia ${pIdx + 1}`} className="w-full h-full object-cover" />
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Follow-up Comments from Teammates */}
                        <div className="pt-2 border-t border-slate-100">
                          {comments.length > 0 && (
                            <div className="space-y-1.5 mb-2">
                              {comments.map(c => (
                                <div key={c.id} className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs flex items-start justify-between gap-2">
                                  <div>
                                    <span className="font-bold text-slate-900">{c.userName}: </span>
                                    <span className="text-slate-700">{c.text}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                                    {new Date(c.timestamp).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}

                          {isCommentsOpen ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="text"
                                value={commentDrafts[entry.id] || ''}
                                onChange={(e) => setCommentDrafts(prev => ({ ...prev, [entry.id]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddFollowupComment(entry);
                                  }
                                }}
                                placeholder="Añadir nota o seguimiento de compañero..."
                                className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddFollowupComment(entry)}
                                disabled={!(commentDrafts[entry.id] || '').trim()}
                                className="px-3 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                              >
                                <Send className="w-3 h-3" />
                                <span>Enviar</span>
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setExpandedComments(prev => ({ ...prev, [entry.id]: true }))}
                              className="text-[11px] font-semibold text-slate-500 hover:text-teal-700 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Agregar seguimiento o comentario de turno</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : viewMode === 'photos' ? (
        /* VIEW 2: VISUAL PHOTO WALL OF DAILY HOTEL ACTIVITIES */
        allWallPhotos.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 border border-slate-200 text-center text-xs text-slate-500">
            No hay fotografías en los registros seleccionados. Sube evidencias desde la cámara o galería al registrar una actividad.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {allWallPhotos.map((item, idx) => (
              <div
                key={`${item.entry.id}-wall-${idx}`}
                onClick={() =>
                  setLightboxState({
                    photos: item.entryPhotos,
                    index: item.photoIdx,
                    title: item.entry.title,
                    subtitle: `${item.entry.date} ${item.entry.time} hs • ${item.entry.technicianName} (${item.entry.area})`
                  })
                }
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-teal-400 transition-all cursor-pointer group flex flex-col"
              >
                <div className="aspect-4/3 bg-slate-900 overflow-hidden relative">
                  <img
                    src={item.url}
                    alt={item.entry.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-slate-950/80 text-white text-[10px] font-mono font-bold tabular-nums">
                    {item.entry.date} • {item.entry.time}
                  </span>
                </div>
                <div className="p-3 space-y-1">
                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{item.entry.title}</h4>
                  <p className="text-[11px] text-slate-500 truncate">{item.entry.area}</p>
                  <div className="flex items-center justify-between text-[10px] text-slate-600 pt-1 border-t border-slate-100">
                    <span className="font-semibold truncate">{item.entry.technicianName}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 font-bold">
                      {SHIFT_META[item.entry.shift]?.shortLabel || item.entry.shift}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* VIEW 3: AUDIT LEDGER TABLE */
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px]">
                  <th className="px-3.5 py-3">Fecha / Hora</th>
                  <th className="px-3.5 py-3">Turno</th>
                  <th className="px-3.5 py-3">Área / Equipo</th>
                  <th className="px-3.5 py-3">Actividad Realizada</th>
                  <th className="px-3.5 py-3">Técnico</th>
                  <th className="px-3.5 py-3">Estado</th>
                  <th className="px-3.5 py-3 text-center">Fotos</th>
                  <th className="px-3.5 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEntries.map(entry => {
                  const photos = mergeUniquePhotos(entry.photos, entry.photoUrl ? [entry.photoUrl] : []);
                  const statusInfo = STATUS_META[entry.status] || STATUS_META.normal;
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-3.5 py-2.5 font-mono text-[11px] text-slate-800 whitespace-nowrap tabular-nums">
                        <div className="font-bold">{entry.date}</div>
                        <div className="text-slate-500">{entry.time} hs</div>
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${SHIFT_META[entry.shift]?.badgeClass || ''}`}>
                          {SHIFT_META[entry.shift]?.shortLabel || entry.shift}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 max-w-[200px]">
                        <div className="font-semibold text-slate-800 truncate">{entry.area}</div>
                        {entry.equipmentTag && (
                          <div className="text-[10px] font-mono text-blue-700 font-bold">{entry.equipmentTag}</div>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 max-w-[320px]">
                        <div className="font-bold text-slate-900 truncate">{entry.title}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-2">{entry.description}</div>
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap font-semibold text-slate-700">
                        {entry.technicianName}
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${statusInfo.badgeClass}`}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-3.5 py-2.5 text-center tabular-nums">
                        {photos.length > 0 ? (
                          <button
                            type="button"
                            onClick={() =>
                              setLightboxState({
                                photos,
                                index: 0,
                                title: entry.title,
                                subtitle: `${entry.date} ${entry.time} hs • ${entry.technicianName}`
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[11px] cursor-pointer"
                          >
                            <Camera className="w-3 h-3" />
                            <span>{photos.length}</span>
                          </button>
                        ) : (
                          <span className="text-slate-300">0</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(entry)}
                          className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold cursor-pointer"
                        >
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
                    {editingEntry ? 'Editar Registro de Bitácora' : 'Registrar Actividad Diaria'}
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

            {!editingEntry && (
              <div className="mb-4 space-y-1.5">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Plantillas rápidas del hotel:</span>
                <div className="flex flex-wrap gap-1.5">
                  {DAILY_ACTIVITY_TEMPLATES.map(tpl => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplateInModal(tpl)}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 hover:text-teal-800 border border-slate-200 text-[11px] font-semibold text-slate-700 cursor-pointer transition-colors"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
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

              {/* Category, Status, Equipment & Duration */}
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
                    <option value="normal">Registrado</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="en_seguimiento">En Seguimiento</option>
                    <option value="resuelto">Resuelto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Equipo Relacionado (opcional)</label>
                  <select
                    value={formEquipmentId}
                    onChange={(e) => setFormEquipmentId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
                  >
                    <option value="">Ninguno / Trabajo general de área</option>
                    {equipments.map(eq => (
                      <option key={eq.id} value={eq.id}>[{eq.tag}] {eq.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Tiempo Invertido (min, opcional)</label>
                  <input
                    type="number"
                    min="0"
                    value={formDurationMinutes}
                    onChange={(e) => setFormDurationMinutes(e.target.value)}
                    placeholder="Ej. 45"
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formHandoverHighlighted}
                  onChange={(e) => setFormHandoverHighlighted(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <span className="text-xs font-bold text-amber-950">
                  Destacar para Entrega de Turno (visible en el aviso superior para el siguiente turno)
                </span>
              </label>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Título del Trabajo / Novedad *</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ej. Cambio de sello mecánico bomba booster #2"
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
                  placeholder="Detalla lo realizado en el hotel, parámetros medidos y estado final..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Materiales / Repuestos Utilizados</label>
                  <textarea
                    rows={2}
                    value={formMaterials}
                    onChange={(e) => setFormMaterials(e.target.value)}
                    placeholder="Ej. 2 empaques vitón, 1 breaker 20A..."
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Notas para Siguiente Turno</label>
                  <textarea
                    rows={2}
                    value={formObservations}
                    onChange={(e) => setFormObservations(e.target.value)}
                    placeholder="Ej. Monitorear presión en la noche..."
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
                  <div className="mb-2.5 p-2.5 rounded-xl border border-emerald-300 bg-emerald-50/50 space-y-2">
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
                            onClick={() =>
                              setLightboxState({
                                photos: formPhotos,
                                index: idx,
                                title: formTitle || 'Evidencia de Bitácora'
                              })
                            }
                          />
                          <button
                            type="button"
                            onClick={() => setFormPhotos(prev => prev.filter((_, i) => i !== idx))}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xs hover:bg-rose-700 cursor-pointer"
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
                    className="py-2.5 px-3 rounded-xl border-2 border-dashed border-teal-300 hover:border-teal-500 bg-teal-50/40 hover:bg-teal-50 text-teal-800 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Camera className="w-4 h-4 text-teal-600" />
                    <span>{formPhotos.length > 0 ? '+ Tomar Otra Foto' : 'Tomar Foto (Cámara)'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="py-2.5 px-3 rounded-xl border border-slate-300 hover:border-slate-400 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <ImageIcon className="w-4 h-4 text-slate-600" />
                    <span>{formPhotos.length > 0 ? '+ Agregar de Galería' : 'Subir de Galería'}</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
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
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  {isSaving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingEntry ? 'Guardar Cambios' : 'Guardar en Bitácora'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Camera Capture Modal */}
      {isCameraOpen && (
        <SmartMeterScannerModal
          isOpen={isCameraOpen}
          onClose={() => setIsCameraOpen(false)}
          title={formTitle ? `Evidencia Bitácora: ${formTitle}` : 'Evidencia Fotográfica — Bitácora'}
          meterName={formArea || 'Bitácora Diaria'}
          meterTypeHint="Bitácora Técnica"
          expectedUnit=""
          initialPhotoMode="normal"
          allowedPhotoMode="normal"
          allowMultiple={true}
          onApplyReading={handleCameraApply}
        />
      )}

      {/* Multi-Photo Lightbox */}
      {lightboxState && lightboxState.photos.length > 0 && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLightboxState(null);
          }}
        >
          <div className="bg-white rounded-3xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[92vh]">
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="font-bold text-xs sm:text-sm block truncate">
                  {lightboxState.title} ({lightboxState.index + 1}/{lightboxState.photos.length})
                </span>
                {lightboxState.subtitle && (
                  <span className="text-[11px] text-slate-300 block truncate">{lightboxState.subtitle}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setLightboxState(null)}
                className="p-1 hover:bg-white/10 rounded-full text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="relative p-4 bg-slate-950 flex items-center justify-center flex-1 overflow-hidden min-h-[280px]">
              <img
                src={lightboxState.photos[lightboxState.index]}
                alt={lightboxState.title}
                className="max-h-[68vh] w-auto max-w-full object-contain rounded-xl border border-slate-800"
              />
              {lightboxState.photos.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxState(prev => prev ? {
                        ...prev,
                        index: (prev.index - 1 + prev.photos.length) % prev.photos.length
                      } : null)
                    }
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 cursor-pointer"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setLightboxState(prev => prev ? {
                        ...prev,
                        index: (prev.index + 1) % prev.photos.length
                      } : null)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-white border border-slate-700 cursor-pointer"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between gap-2">
              <a
                href={lightboxState.photos[lightboxState.index]}
                download={`evidencia_bitacora_${lightboxState.index + 1}.jpg`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-200 border border-slate-300 rounded-xl text-slate-800 text-xs font-bold transition-colors cursor-pointer"
              >
                <FileDown className="w-4 h-4 text-blue-600" />
                <span>Descargar Foto</span>
              </a>
              <button
                type="button"
                onClick={() => setLightboxState(null)}
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
