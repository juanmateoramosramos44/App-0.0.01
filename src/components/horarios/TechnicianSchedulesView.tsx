import React, { useState, useMemo, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { db, safeFirestoreWrite, cleanForFirestore } from '../../lib/firebase';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { useMaintenance } from '../../context/MaintenanceContext';
import { isColombianHoliday } from '../../utils/colombianHolidays';
import { 
  getHotelCurrentDateIso, 
  getHotelCurrentTimeStr, 
  getLocalDateString, 
  getLocalTimeString 
} from '../../utils/dateUtils';
import { 
  downloadSchedulePdf, 
  downloadScheduleExcel, 
  downloadScheduleCsv 
} from '../../utils/scheduleExportUtils';
import { 
  TechnicianSchedule, 
  ShiftType, 
  ShiftSwapRequest, 
  BulkScheduleParams,
  User 
} from '../../types';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  FileSpreadsheet, 
  Printer, 
  Camera, 
  Filter, 
  Search, 
  Sun, 
  Sunrise, 
  Moon, 
  Coffee, 
  ShieldAlert, 
  Sliders, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ArrowRightLeft, 
  Building2, 
  Wrench, 
  Check, 
  Trash2, 
  Edit3, 
  Info,
  CalendarDays,
  UserCheck,
  UserPlus,
  UserMinus,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Zap,
  MapPin,
  CalendarCheck,
  Layers,
  LayoutGrid,
  List,
  Eye,
  SlidersHorizontal,
  Download,
  Share2,
  Send,
  Loader2
} from 'lucide-react';

export const SHIFT_PRESETS: Record<ShiftType, {
  label: string;
  icon: string;
  startTime: string;
  endTime: string;
  color: string;
  badgeBg: string;
  badgeText: string;
  border: string;
}> = {
  manana: {
    label: 'Turno Mañana',
    icon: '🌅',
    startTime: '06:00',
    endTime: '15:00',
    color: 'amber',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeText: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700/50'
  },
  tarde: {
    label: 'Turno Tarde',
    icon: '☀️',
    startTime: '13:00',
    endTime: '22:00',
    color: 'blue',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    badgeText: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700/50'
  },
  noche: {
    label: 'Turno Noche',
    icon: '🌙',
    startTime: '21:00',
    endTime: '06:00',
    color: 'purple',
    badgeBg: 'bg-purple-500/10 dark:bg-purple-500/20',
    badgeText: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700/50'
  },
  diurno: {
    label: 'Jornada Intermedia',
    icon: '🏢',
    startTime: '08:00',
    endTime: '17:00',
    color: 'emerald',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700/50'
  },
  supervisor: {
    label: 'Horario Supervisor',
    icon: '👔',
    startTime: '10:00',
    endTime: '19:00',
    color: 'teal',
    badgeBg: 'bg-teal-500/10 dark:bg-teal-500/20',
    badgeText: 'text-teal-700 dark:text-teal-300',
    border: 'border-teal-300 dark:border-teal-700/50'
  },
  guardia_24h: {
    label: 'Turno Intermedio',
    icon: '🏢',
    startTime: '08:00',
    endTime: '17:00',
    color: 'emerald',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-300 dark:border-emerald-700/50'
  },
  descanso: {
    label: 'Día de Descanso / Franco',
    icon: '🏝️',
    startTime: '00:00',
    endTime: '00:00',
    color: 'slate',
    badgeBg: 'bg-slate-100 dark:bg-slate-800',
    badgeText: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-700'
  },
  personalizado: {
    label: 'Horario Personalizado',
    icon: '⚙️',
    startTime: '07:00',
    endTime: '15:00',
    color: 'indigo',
    badgeBg: 'bg-indigo-500/10 dark:bg-indigo-500/20',
    badgeText: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-300 dark:border-indigo-700/50'
  }
};

const BULK_PATTERNS = [
  { id: '6x1', title: '6x1 Rotativo Quincenal', desc: '6 días trabajo + 1 día descanso rotativo parejo.', icon: '⚡' },
  { id: '5x2', title: '5x2 Diurno Quincenal', desc: 'Lunes a Viernes diurno, fin de semana libre.', icon: '📅' },
  { id: 'rotativo_3turnos', title: 'Rotación 3 Turnos Equitativa', desc: 'Mañana ➔ Tarde ➔ Noche ➔ Descanso.', icon: '🔄' },
  { id: 'fijo_manana', title: 'Fijo Mañana (06:00 - 15:00)', desc: 'Turno constante de mañana toda la quincena.', icon: '🌅' },
  { id: 'fijo_tarde', title: 'Fijo Tarde (13:00 - 22:00)', desc: 'Turno constante de tarde toda la quincena.', icon: '☀️' },
  { id: 'fijo_noche', title: 'Fijo Noche (21:00 - 06:00)', desc: 'Turno constante nocturno toda la quincena.', icon: '🌙' },
  { id: 'fijo_diurno', title: 'Fijo Jornada Intermedia (08:00 - 17:00)', desc: 'Jornada continua intermedia de mantenimiento.', icon: '🏢' },
  { id: 'fijo_supervisor', title: 'Fijo Supervisor (10:00 - 19:00)', desc: 'Turno constante de supervisión de 10am a 7pm.', icon: '👔' },
];

const TECHNICAL_AREAS_LIST = [
  'Cuarto de Bombas Principal',
  'Calderas & Agua Caliente',
  'Subestación Eléctrica & Planta',
  'Zona Apartamentos',
  'Pisos de Hotel',
  'Piscina / Jacuzzi / Spa',
  'Aire Acondicionado / Chiller',
  'Taller de Mantenimiento',
  'Toda la Infraestructura'
];

export const TechnicianSchedulesView: React.FC = () => {
  const { 
    schedules, 
    shiftSwapRequests, 
    addSchedule, 
    updateSchedule, 
    deleteSchedule, 
    bulkGenerateSchedules, 
    requestShiftSwap, 
    resolveShiftSwap, 
    users, 
    addUser,
    updateUser,
    deleteUser,
    currentUser, 
    settings,
    notify 
  } = useMaintenance();

  const [activeViewMode, setActiveViewMode] = useState<'matriz' | 'calendario' | 'cobertura' | 'permutas'>('matriz');
  const [matrixPeriodMode, setMatrixPeriodMode] = useState<'quincena1' | 'quincena2' | 'semana'>(() => {
    const now = new Date();
    return now.getDate() > 15 ? 'quincena2' : 'quincena1';
  });
  const [currentMonthOffset, setCurrentMonthOffset] = useState<number>(0);
  const [currentWeekOffset, setCurrentWeekOffset] = useState<number>(0);
  const [currentHotelDateIso, setCurrentHotelDateIso] = useState<string>(() => getHotelCurrentDateIso());
  const [selectedDate, setSelectedDate] = useState<string>(() => getHotelCurrentDateIso());

  useEffect(() => {
    const timer = setInterval(() => {
      const nowIso = getHotelCurrentDateIso();
      setCurrentHotelDateIso(prev => prev !== nowIso ? nowIso : prev);
    }, 15000); // Actualización precisa a las 12:00 de la noche (medianoche)
    return () => clearInterval(timer);
  }, []);
  const [searchTerm, setSearchTerm] = useState('');

  // Schedule Personnel List synchronized in real-time with Cloud Firestore
  const [schedulePersonnel, setSchedulePersonnel] = useState<Array<{ id: string; displayName: string; role?: string; department?: string; email?: string }>>(() => {
    try {
      const saved = localStorage.getItem('hotel_maint_schedule_personnel');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      { id: 'pers-1', displayName: 'Juan Mateo Ramos', role: 'admin', department: 'Mantenimiento e Ingeniería' },
      { id: 'pers-2', displayName: 'Ferney Machado', role: 'técnico', department: 'Mantenimiento e Ingeniería' },
      { id: 'pers-3', displayName: 'Carlos Manuel/ Técnico', role: 'técnico', department: 'Mantenimiento e Ingeniería' },
      { id: 'pers-4', displayName: 'Ferney Alonso/Supervisor', role: 'técnico', department: 'Mantenimiento e Ingeniería' },
      { id: 'pers-5', displayName: 'Adrián', role: 'Técnico de Mantenimiento', department: 'Mantenimiento e Ingeniería' }
    ];
  });

  // Custom Technician Ordering State
  const [techOrder, setTechOrder] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('hotel_maint_tech_order');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // 🔄 Real-time Bidirectional Synchronization of Schedule Personnel and Order with Cloud Firestore
  useEffect(() => {
    let isMounted = true;
    const unsub = onSnapshot(doc(db, 'app_data', 'schedule_config'), (snap) => {
      if (!isMounted) return;
      if (snap.exists()) {
        const data = snap.data();
        if (Array.isArray(data.schedulePersonnel) && data.schedulePersonnel.length > 0) {
          setSchedulePersonnel(data.schedulePersonnel);
          try {
            localStorage.setItem('hotel_maint_schedule_personnel', JSON.stringify(data.schedulePersonnel));
          } catch {}
        }
        if (Array.isArray(data.techOrder) && data.techOrder.length > 0) {
          setTechOrder(data.techOrder);
          try {
            localStorage.setItem('hotel_maint_tech_order', JSON.stringify(data.techOrder));
          } catch {}
        }
      } else {
        // Si no existe aún en Firestore, respaldar inmediatamente lo que tenga el dispositivo actual
        const currentSaved = localStorage.getItem('hotel_maint_schedule_personnel');
        if (currentSaved) {
          try {
            const parsed = JSON.parse(currentSaved);
            if (Array.isArray(parsed) && parsed.length > 0) {
              safeFirestoreWrite(() => setDoc(doc(db, 'app_data', 'schedule_config'), cleanForFirestore({
                schedulePersonnel: parsed,
                techOrder: techOrder,
                updatedAt: new Date().toISOString()
              }), { merge: true })).catch(() => {});
            }
          } catch {}
        }
      }
    }, (err) => {
      console.warn('Schedule config listener notice:', err);
    });

    return () => {
      isMounted = false;
      unsub();
    };
  }, []);

  // Helper to persist schedule personnel and ordering directly to Cloud Firestore & LocalStorage
  const syncSchedulePersonnelCloud = async (
    newList: Array<{ id: string; displayName: string; role?: string; department?: string }>,
    newOrder?: string[]
  ) => {
    try {
      localStorage.setItem('hotel_maint_schedule_personnel', JSON.stringify(newList));
      if (newOrder) {
        localStorage.setItem('hotel_maint_tech_order', JSON.stringify(newOrder));
      }
      await safeFirestoreWrite(() => setDoc(doc(db, 'app_data', 'schedule_config'), cleanForFirestore({
        schedulePersonnel: newList,
        techOrder: newOrder !== undefined ? newOrder : techOrder,
        updatedAt: new Date().toISOString()
      }), { merge: true }));
    } catch (e) {
      console.warn('Error syncing schedule personnel to cloud:', e);
    }
  };

  // Edit Technician Name State
  const [editingTechId, setEditingTechId] = useState<string | null>(null);
  const [editingTechName, setEditingTechName] = useState<string>('');

  // Sincronizar automáticamente el personal de turnos cuando se edita el nombre de un usuario en el sistema
  useEffect(() => {
    if (!users || users.length === 0) return;
    setSchedulePersonnel(prev => {
      let hasChanges = false;
      const synced = prev.map(p => {
        const matched = users.find(u => u.id === p.id || (u.displayName && u.displayName.toLowerCase().trim() === p.displayName.toLowerCase().trim()));
        if (matched && matched.displayName && matched.displayName !== p.displayName) {
          hasChanges = true;
          return { ...p, displayName: matched.displayName };
        }
        return p;
      });
      if (hasChanges) {
        syncSchedulePersonnelCloud(synced);
        return synced;
      }
      return prev;
    });
  }, [users]);

  const handleSaveTechName = async (techId: string) => {
    const cleanName = editingTechName.trim();
    if (!cleanName) return;
    try {
      const prevPerson = schedulePersonnel.find(p => p.id === techId);
      const updated = schedulePersonnel.map(p => p.id === techId ? { ...p, displayName: cleanName } : p);
      setSchedulePersonnel(updated);
      setEditingTechId(null);
      await syncSchedulePersonnelCloud(updated);

      // Sincronizar también con la lista de usuarios si corresponde a un usuario registrado
      const prevName = prevPerson?.displayName?.toLowerCase().trim();
      const matchingUser = users.find(u => 
        u.id === techId || 
        (prevName && u.displayName && u.displayName.toLowerCase().trim() === prevName)
      );
      if (matchingUser) {
        await updateUser(matchingUser.id, { displayName: cleanName });
      }

      notify('✅ Nombre actualizado y sincronizado en la nube');
    } catch (err) {
      console.error(err);
      notify('❌ Error al actualizar el nombre del personal');
    }
  };

  // Interactive Matrix Layout Options
  const [matrixLayoutMode, setMatrixLayoutMode] = useState<'tabla' | 'tarjetas' | 'desglose'>('tabla');
  const [isCompactNames, setIsCompactNames] = useState<boolean>(true);
  const [selectedDayIso, setSelectedDayIso] = useState<string>(() => getHotelCurrentDateIso());

  // Custom Futuristic Dropdowns Popover States
  const [isStartTimeOpen, setIsStartTimeOpen] = useState(false);
  const [isEndTimeOpen, setIsEndTimeOpen] = useState(false);
  const [isDateOpen, setIsDateOpen] = useState(false);

  // Custom Cyberpunk Calendar Picker Navigation State
  const [calNavYear, setCalNavYear] = useState<number>(() => new Date().getFullYear());
  const [calNavMonth, setCalNavMonth] = useState<number>(() => new Date().getMonth());

  const SPANISH_MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  // PDF Export and WhatsApp Share Handlers
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    notify({
      type: 'info',
      title: 'Generando Formato Oficial PDF...',
      message: 'Creando el formato oficial auditado de programación de turnos en alta definición.'
    });

    try {
      const periodSublabel = matrixPeriodMode === 'quincena1' 
        ? '1ª Quincena (Días 1 al 15)' 
        : matrixPeriodMode === 'quincena2' 
        ? '2ª Quincena (Días 16 al Fin de Mes)' 
        : 'Semana Actual';

      downloadSchedulePdf({
        periodLabel: currentMonthLabel,
        periodSublabel,
        displayedDays,
        technicians: technicianUsers,
        schedules: schedules || [],
        hotelInfo: settings?.hotelInfo
      });

      notify({
        type: 'success',
        title: 'Formato PDF Descargado Exitosamente 📄',
        message: 'Tu programación de turnos en formato oficial está lista para imprimir o compartir.'
      });
    } catch (err) {
      console.error('Error al generar PDF oficial:', err);
      notify({
        type: 'error',
        title: 'Error al generar PDF',
        message: 'Hubo un inconveniente al generar el formato PDF.'
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    try {
      notify({
        type: 'info',
        title: 'Generando Planilla Excel (.xlsx)...',
        message: 'Exportando matriz de turnos quincenal con totales y convenciones.'
      });

      const periodSublabel = matrixPeriodMode === 'quincena1' 
        ? '1ª Quincena (Días 1-15)' 
        : matrixPeriodMode === 'quincena2' 
        ? '2ª Quincena (Días 16-Fin)' 
        : 'Semanal';

      await downloadScheduleExcel({
        periodLabel: currentMonthLabel,
        periodSublabel,
        displayedDays,
        technicians: technicianUsers,
        schedules: schedules || [],
        hotelInfo: settings?.hotelInfo
      });

      notify({
        type: 'success',
        title: 'Planilla Excel Descargada 📊',
        message: 'La planilla en formato Excel (.xlsx) se descargó correctamente.'
      });
    } catch (err) {
      console.error('Error al exportar Excel:', err);
      notify({
        type: 'error',
        title: 'Error al exportar Excel',
        message: 'No se pudo generar la planilla Excel.'
      });
    }
  };

  const handleDownloadImage = async () => {
    const element = document.getElementById('schedule-matrix-export-container');
    if (!element) {
      notify({
        type: 'error',
        title: 'Elemento no encontrado',
        message: 'No se encontró el cuadro de programación en la pantalla.'
      });
      return;
    }
    setIsExportingPdf(true);
    notify({
      type: 'info',
      title: 'Generando Imagen del Cuadro...',
      message: 'Capturando la programación idéntica en alta calidad...'
    });

    try {
      const overflowWrappers = element.querySelectorAll('.overflow-x-auto');
      const originalStyles: string[] = [];
      overflowWrappers.forEach((w) => {
        const el = w as HTMLElement;
        originalStyles.push(el.style.overflow);
        el.style.overflow = 'visible';
      });

      const exportWidth = Math.max(element.scrollWidth || element.offsetWidth, 1200);

      const canvas = await html2canvas(element, {
        scale: 1.5,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        width: exportWidth,
        windowWidth: exportWidth + 50,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('schedule-matrix-export-container');
          if (clonedElement) {
            clonedElement.querySelectorAll('*').forEach((node) => {
              const el = node as HTMLElement;
              const bg = window.getComputedStyle(el).backgroundImage;
              if (bg && bg !== 'none') {
                el.style.backgroundImage = 'none';
              }
            });
          }
        }
      });

      overflowWrappers.forEach((w, idx) => {
        (w as HTMLElement).style.overflow = originalStyles[idx];
      });

      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `Cuadro_Turnos_${currentMonthLabel.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      notify({
        type: 'success',
        title: '¡Imagen del Cuadro Descargada! 📸',
        message: 'El cuadro de turnos idéntico se ha guardado como imagen PNG.'
      });
    } catch (err) {
      console.error('Error al generar imagen de la programación:', err);
      // Fallback: open print view pre-configured for clean image saving
      try {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head>
                <title>Cuadro de Turnos - Hotel Mantenimiento</title>
                <style>
                  body { font-family: sans-serif; background: white; margin: 20px; }
                  table { width: 100%; border-collapse: collapse; font-size: 11px; }
                  th, td { border: 1px solid #cbd5e1; padding: 4px; text-align: center; }
                  th { background: #1e293b; color: white; }
                </style>
              </head>
              <body>
                <h2>PROGRAMACIÓN OFICIAL DE TURNOS - HOTEL MANTENIMIENTO</h2>
                <p>Período: ${currentMonthLabel}</p>
                ${element.innerHTML}
                <script>
                  window.onload = () => {
                    window.print();
                  };
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
          notify({
            type: 'success',
            title: 'Vista de Exportación Lista',
            message: 'Se abrió la vista de impresión/guardado limpio para su cuadro.'
          });
          return;
        }
      } catch (printErr) {
        console.error('Fallback print error:', printErr);
      }

      notify({
        type: 'error',
        title: 'Error al generar imagen',
        message: 'No se pudo exportar la imagen del cuadro.'
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleShareWhatsApp = async () => {
    const element = document.getElementById('schedule-matrix-export-container');
    if (element && navigator.share) {
      setIsExportingPdf(true);
      try {
        const overflowWrappers = element.querySelectorAll('.overflow-x-auto');
        const originalStyles: string[] = [];
        overflowWrappers.forEach((w) => {
          const el = w as HTMLElement;
          originalStyles.push(el.style.overflow);
          el.style.overflow = 'visible';
        });

        const exportWidth = Math.max(element.scrollWidth, 1400);

        const canvas = await html2canvas(element, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#0f172a',
          logging: false,
          width: exportWidth,
          windowWidth: exportWidth + 100,
          scrollX: 0,
          scrollY: 0
        });

        overflowWrappers.forEach((w, idx) => {
          (w as HTMLElement).style.overflow = originalStyles[idx];
        });

        canvas.toBlob(async (blob) => {
          if (blob) {
            const periodTitle = matrixPeriodMode === 'quincena1' ? '1ª Quincena' : matrixPeriodMode === 'quincena2' ? '2ª Quincena' : 'Semanal';
            const file = new File([blob], `Programacion_Turnos_${currentMonthLabel.replace(/\s+/g, '_')}.png`, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
              await navigator.share({
                files: [file],
                title: 'Programación de Turnos - Mantenimiento Hotel',
                text: `📋 Programación Oficial de Turnos (${currentMonthLabel} - ${periodTitle})`
              });
              setIsExportingPdf(false);
              return;
            }
          }
          setIsExportingPdf(false);
          openWhatsAppText();
        }, 'image/png');
        return;
      } catch (e) {
        console.log('Share API fallback:', e);
        setIsExportingPdf(false);
      }
    }
    openWhatsAppText();
  };

  const openWhatsAppText = () => {
    const periodTitle = matrixPeriodMode === 'quincena1' ? '1ª Quincena' : matrixPeriodMode === 'quincena2' ? '2ª Quincena' : 'Semanal';
    let summary = `📋 *PROGRAMACIÓN OFICIAL DE TURNOS - HOTEL MANTENIMIENTO*\n`;
    summary += `🗓️ *Período:* ${currentMonthLabel} (${periodTitle})\n`;
    summary += `------------------------------------\n\n`;

    technicianUsers.forEach(tech => {
      summary += `👤 *${(tech.displayName || tech.email || '').toUpperCase()}*\n`;
      displayedDays.forEach(day => {
        const sch = (schedules || []).find(s => (s.technicianId === tech.id || s.technicianName === tech.displayName) && s.date === day.dateIso);
        if (sch) {
          const preset = SHIFT_PRESETS[sch.shiftType];
          const icon = preset?.icon || '⏰';
          const label = preset?.label || sch.shiftType;
          summary += `  • ${day.dayName} ${day.dayNum}: ${icon} ${label} (${sch.startTime} - ${sch.endTime})\n`;
        } else {
          summary += `  • ${day.dayName} ${day.dayNum}: ⚪ Sin Asignar\n`;
        }
      });
      summary += `\n`;
    });

    summary += `------------------------------------\n`;
    summary += `📲 *Generado desde la Plataforma de Mantenimiento Hotelero*`;

    const encodedText = encodeURIComponent(summary);
    window.open(`https://api.whatsapp.com/send?text=${encodedText}`, '_blank');
  };

  // Helper generator for custom calendar days grid
  const getCalendarDays = (year: number, month: number, selectedIso: string) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekDay = firstDay.getDay(); // 0 is Sunday
    const totalDays = lastDay.getDate();
    const todayIso = getHotelCurrentDateIso();

    const days = [];

    // Padding previous month
    const prevLastDay = new Date(year, month, 0).getDate();
    for (let i = startWeekDay - 1; i >= 0; i--) {
      const dayNum = prevLastDay - i;
      const prevDate = new Date(year, month - 1, dayNum);
      const iso = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
      const hol = isColombianHoliday(iso);
      days.push({
        dateIso: iso,
        dayNum,
        isCurrentMonth: false,
        isSelected: iso === selectedIso,
        isToday: iso === todayIso,
        isHoliday: hol.isHoliday,
        holidayName: hol.holidayName
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hol = isColombianHoliday(iso);
      days.push({
        dateIso: iso,
        dayNum: d,
        isCurrentMonth: true,
        isSelected: iso === selectedIso,
        isToday: iso === todayIso,
        isHoliday: hol.isHoliday,
        holidayName: hol.holidayName
      });
    }

    // Padding next month to fill grid
    const rem = 35 - days.length > 0 ? 35 - days.length : (42 - days.length > 0 ? 42 - days.length : 0);
    for (let i = 1; i <= rem; i++) {
      const nextDate = new Date(year, month + 1, i);
      const iso = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const hol = isColombianHoliday(iso);
      days.push({
        dateIso: iso,
        dayNum: i,
        isCurrentMonth: false,
        isSelected: iso === selectedIso,
        isToday: iso === todayIso,
        isHoliday: hol.isHoliday,
        holidayName: hol.holidayName
      });
    }

    return days;
  };

  // Helper formatting for time dropdown labels
  const formatTimeLabel = (timeStr: string) => {
    if (!timeStr) return 'Seleccionar Hora...';
    const [hStr, mStr] = timeStr.split(':');
    let h = parseInt(hStr || '0', 10);
    const m = mStr || '00';
    const ampm = h >= 12 ? 'p.m.' : 'a.m.';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const formatted = `${String(displayH).padStart(2, '0')}:${m} ${ampm}`;

    if (timeStr === '06:00') return `🌅 ${formatted} (Mañana)`;
    if (timeStr === '08:00') return `🏢 ${formatted} (Intermedia)`;
    if (timeStr === '10:00') return `👔 ${formatted} (Supervisor)`;
    if (timeStr === '13:00') return `☀️ ${formatted} (Tarde)`;
    if (timeStr === '17:00') return `🏢 ${formatted} (Fin Intermedia)`;
    if (timeStr === '19:00') return `👔 ${formatted} (Fin Supervisor)`;
    if (timeStr === '21:00') return `☀️ ${formatted} (Fin Tarde)`;
    if (timeStr === '22:00') return `🌙 ${formatted} (Noche)`;
    if (timeStr === '00:00' || timeStr === '23:59') return `🏢 ${formatted} (Intermedio)`;
    return `⏰ ${formatted}`;
  };

  // Helper formatting for date dropdown labels
  const formatDateLabel = (isoDate: string) => {
    if (!isoDate) return 'Seleccionar Fecha...';
    try {
      const parts = isoDate.split('-');
      if (parts.length !== 3) return isoDate;
      const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const dayName = days[d.getDay()];
      const monthName = months[d.getMonth()];
      const todayIso = getHotelCurrentDateIso();
      const isToday = isoDate === todayIso;
      const hol = isColombianHoliday(isoDate);
      const holSuffix = hol.isHoliday ? ` 🇨🇴 (${hol.holidayName})` : '';
      return `${dayName}, ${parts[2]} ${monthName} ${parts[0]}${isToday ? ' (Hoy)' : ''}${holSuffix}`;
    } catch {
      return isoDate;
    }
  };

  // Personnel Management Modals
  const [isAddPersonModalOpen, setIsAddPersonModalOpen] = useState(false);
  const [isEditPersonModalOpen, setIsEditPersonModalOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<User | null>(null);

  const [newPersonData, setNewPersonData] = useState({
    displayName: '',
    roleTitle: 'Técnico de Mantenimiento',
    roleMode: 'técnico',
    pin: '1234',
    email: ''
  });

  // Modals
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<TechnicianSchedule | null>(null);

  // Form State for Add/Edit Schedule
  const [formData, setFormData] = useState<{
    technicianId: string;
    technicianName: string;
    technicianRole: string;
    date: string;
    shiftType: ShiftType;
    startTime: string;
    endTime: string;
    breakDurationMinutes: number;
    assignedAreas: string[];
    isOnCall: boolean;
    notes: string;
  }>({
    technicianId: '',
    technicianName: '',
    technicianRole: 'Técnico de Mantenimiento',
    date: getHotelCurrentDateIso(),
    shiftType: 'manana',
    startTime: '06:00',
    endTime: '15:00',
    breakDurationMinutes: 60,
    assignedAreas: ['Toda la Infraestructura'],
    isOnCall: false,
    notes: ''
  });

  // Bulk Generator State
  const [bulkData, setBulkData] = useState<BulkScheduleParams>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();
    const start15 = `${y}-${String(m + 1).padStart(2, '0')}-01`;
    const end15 = `${y}-${String(m + 1).padStart(2, '0')}-15`;
    return {
      technicianIds: [],
      startDate: start15,
      endDate: end15,
      pattern: '6x1',
      assignedAreas: ['Toda la Infraestructura'],
      overwriteExisting: true
    };
  });

  // Swap Request Form State
  const [swapData, setSwapData] = useState<{
    scheduleId: string;
    targetTechnicianId: string;
    reason: string;
  }>({
    scheduleId: '',
    targetTechnicianId: '',
    reason: ''
  });

  const isAdmin = currentUser?.role === 'admin' || 
                  currentUser?.email?.toLowerCase() === 'juanmateoramosramos44@gmail.com' ||
                  Boolean(currentUser?.permissions?.canManageUsers);

  // Independent personnel list for schedules (completely decoupled from system users)
  const technicianUsers = useMemo(() => {
    const list = [...schedulePersonnel];

    if (techOrder.length > 0) {
      list.sort((a, b) => {
        const idxA = techOrder.indexOf(a.id);
        const idxB = techOrder.indexOf(b.id);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return 0;
      });
    }
    return list;
  }, [schedulePersonnel, techOrder]);

  // Handler to move technician position UP or DOWN
  const handleMoveTechnician = async (techId: string, direction: 'up' | 'down') => {
    const currentIds = technicianUsers.map(u => u.id);
    const index = currentIds.indexOf(techId);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= currentIds.length) return;

    const newIds = [...currentIds];
    const [moved] = newIds.splice(index, 1);
    newIds.splice(targetIndex, 0, moved);

    setTechOrder(newIds);
    await syncSchedulePersonnelCloud(schedulePersonnel, newIds);
    notify('↕️ Orden de personal actualizado en la nube');
  };

  // Handler to create brand new person in schedule view (independent of system users)
  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonData.displayName.trim()) {
      notify('⚠️ Ingresa el nombre del personal.');
      return;
    }

    const cleanName = newPersonData.displayName.trim();
    const resolvedRole = newPersonData.roleMode || (newPersonData.roleTitle?.toLowerCase().includes('admin') ? 'admin' : 'técnico');

    try {
      const newId = `pers-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const newPerson = {
        id: newId,
        displayName: cleanName,
        role: resolvedRole,
        department: newPersonData.roleTitle || 'Mantenimiento e Ingeniería'
      };
      const updated = [...schedulePersonnel, newPerson];
      setSchedulePersonnel(updated);
      await syncSchedulePersonnelCloud(updated);

      notify(`✅ ¡Personal agregado y sincronizado en la nube!: ${cleanName}`);
      setNewPersonData({
        displayName: '',
        roleTitle: 'Técnico de Mantenimiento',
        roleMode: 'técnico',
        pin: '1234',
        email: ''
      });
      setIsAddPersonModalOpen(false);
    } catch (err) {
      notify('Error al registrar personal.');
    }
  };

  // Handler to delete / remove technician from schedule view (does NOT affect system users)
  const handleDeletePerson = async (techId: string, name: string) => {
    if (confirm(`¿Estás seguro de quitar a "${name}" de la lista de turnos? (No afectará las cuentas de usuarios)`)) {
      try {
        const updated = schedulePersonnel.filter(p => p.id !== techId);
        setSchedulePersonnel(updated);

        // Also clean from techOrder
        const updatedOrder = techOrder.filter(id => id !== techId);
        setTechOrder(updatedOrder);
        await syncSchedulePersonnelCloud(updated, updatedOrder);
        notify(`🗑️ Personal ${name} quitado de los turnos.`);
      } catch (err) {
        notify('Error al quitar el personal.');
      }
    }
  };

  // Current Month Label
  const currentMonthLabel = useMemo(() => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth() + currentMonthOffset, 1);
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  }, [currentMonthOffset]);

  // Displayed Days calculation (Quincena 1: 1-15, Quincena 2: 16-fin, o Semana: 7 días)
  const displayedDays = useMemo(() => {
    const todayColombiaIso = currentHotelDateIso;
    const now = new Date();
    const targetDate = new Date(now.getFullYear(), now.getMonth() + currentMonthOffset, 1);
    const year = targetDate.getFullYear();
    const month = targetDate.getMonth();

    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    if (matrixPeriodMode === 'semana') {
      const today = new Date();
      const day = today.getDay(); // 0 is Sun, 1 is Mon
      const diffToMon = (day === 0 ? -6 : 1 - day) + (currentWeekOffset * 7);
      const monday = new Date(today);
      monday.setDate(today.getDate() + diffToMon);

      const days = [];
      for (let i = 0; i < 7; i++) {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const hol = isColombianHoliday(iso);
        days.push({
          dateIso: iso,
          dayName: dayNames[d.getDay()],
          dayNum: d.getDate(),
          monthName: monthNames[d.getMonth()],
          isToday: iso === todayColombiaIso,
          isHoliday: hol.isHoliday,
          holidayName: hol.holidayName
        });
      }
      return days;
    }

    let startDay = 1;
    let endDay = 15;

    if (matrixPeriodMode === 'quincena2') {
      startDay = 16;
      endDay = new Date(year, month + 1, 0).getDate();
    }

    const days = [];
    for (let d = startDay; d <= endDay; d++) {
      const dateObj = new Date(year, month, d);
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hol = isColombianHoliday(iso);
      days.push({
        dateIso: iso,
        dayName: dayNames[dateObj.getDay()],
        dayNum: d,
        monthName: monthNames[month],
        isToday: iso === todayColombiaIso,
        isHoliday: hol.isHoliday,
        holidayName: hol.holidayName
      });
    }
    return days;
  }, [matrixPeriodMode, currentMonthOffset, currentWeekOffset, currentHotelDateIso]);

  // Helper to accurately classify any active technician by shift preset or hours
  function classifyShift(item: TechnicianSchedule): 'manana' | 'supervisor' | 'diurno' | 'tarde' | 'noche' {
    // If times match known presets, use them directly:
    if (item.startTime === '10:00' && item.endTime === '19:00') return 'supervisor';
    if (item.startTime === '06:00' && (item.endTime === '14:00' || item.endTime === '15:00')) return 'manana';
    if (item.startTime === '08:00' && item.endTime === '17:00') return 'diurno';
    if (item.startTime === '13:00' && (item.endTime === '21:00' || item.endTime === '22:00')) return 'tarde';
    if (item.startTime === '21:00' || item.startTime === '22:00') return 'noche';

    // Check explicit shiftType
    if (item.shiftType === 'supervisor') return 'supervisor';
    if (item.shiftType === 'manana') return 'manana';
    if (item.shiftType === 'diurno' || item.shiftType === 'guardia_24h' || item.isOnCall) return 'diurno';
    if (item.shiftType === 'tarde') return 'tarde';
    if (item.shiftType === 'noche') return 'noche';

    // Fallback by starting hour
    if (item.startTime) {
      const h = parseInt(item.startTime.split(':')[0], 10);
      if (h >= 5 && h < 8) return 'manana';
      if (h >= 8 && h < 10) return 'diurno';
      if (h >= 10 && h < 12) return 'supervisor';
      if (h >= 12 && h < 20) return 'tarde';
      return 'noche';
    }
    return 'manana';
  }

  // Technicians currently on shift right now in real time (evaluated in Hotel Colombia Time and Local Time)
  const activeTechniciansNow = useMemo(() => {
    const now = new Date();
    const hotelDateIso = getHotelCurrentDateIso(now);
    const localDateIso = getLocalDateString(now);
    const utcDateIso = now.toISOString().split('T')[0];

    const hotelTime = getHotelCurrentTimeStr(now);
    const localTime = getLocalTimeString(now);

    const toMinutes = (timeStr: string): number => {
      if (!timeStr) return 0;
      const clean = timeStr.trim().toUpperCase();
      let hours = 0;
      let minutes = 0;
      if (clean.includes('AM') || clean.includes('PM')) {
        const parts = clean.split(' ');
        const timeParts = parts[0].split(':');
        hours = parseInt(timeParts[0] || '0', 10);
        minutes = parseInt(timeParts[1] || '0', 10);
        if (clean.includes('PM') && hours < 12) hours += 12;
        if (clean.includes('AM') && hours === 12) hours = 0;
      } else {
        const parts = clean.split(':');
        hours = parseInt(parts[0] || '0', 10);
        minutes = parseInt(parts[1] || '0', 10);
      }
      return hours * 60 + minutes;
    };

    const checkTimeInRange = (currentTime: string, start?: string, end?: string): boolean => {
      if (!start || !end) return false;
      if (start === '00:00' && end === '00:00') return false;
      
      const curM = toMinutes(currentTime);
      const startM = toMinutes(start);
      const endM = toMinutes(end);

      if (startM > endM) {
        // Overnight shift (e.g. 21:00 to 06:00)
        return curM >= startM || curM <= endM;
      }
      return curM >= startM && curM <= endM;
    };

    const matching = (schedules || []).filter(s => {
      if (!s || s.shiftType === 'descanso') return false;
      if (s.shiftType === 'guardia_24h') return true;

      const matchesDate = s.date === hotelDateIso || s.date === localDateIso || s.date === utcDateIso;
      if (!matchesDate) return false;

      // Handle shift hour range matching either in official hotel Colombia time or local device time
      const isHotelTimeActive = checkTimeInRange(hotelTime, s.startTime, s.endTime);
      const isLocalTimeActive = checkTimeInRange(localTime, s.startTime, s.endTime);

      return isHotelTimeActive || isLocalTimeActive;
    });

    // Deduplicate by technician name/id and ensure at most one primary technician per active shift category right now
    const categoryMap = new Map<string, TechnicianSchedule>();
    const seenTechNames = new Set<string>();

    for (const item of matching) {
      const techKey = (item.technicianName || item.technicianId || '').toLowerCase().trim();
      if (seenTechNames.has(techKey)) continue;
      seenTechNames.add(techKey);

      const cat = classifyShift(item);
      const existing = categoryMap.get(cat);
      if (!existing) {
        categoryMap.set(cat, item);
      } else {
        const isExistingActive = existing.status === 'en_curso';
        const isItemActive = item.status === 'en_curso';
        if (isItemActive && !isExistingActive) {
          categoryMap.set(cat, item);
        } else {
          const timeExisting = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
          const timeItem = new Date(item.updatedAt || item.createdAt || 0).getTime();
          if (timeItem >= timeExisting) {
            categoryMap.set(cat, item);
          }
        }
      }
    }
    return Array.from(categoryMap.values());
  }, [schedules]);

  // Stats Counters for technicians currently on shift right now in real time
  const todayStats = useMemo(() => {
    return {
      totalOnShift: activeTechniciansNow.length,
      morningCount: activeTechniciansNow.filter(s => classifyShift(s) === 'manana').length,
      supervisorCount: activeTechniciansNow.filter(s => classifyShift(s) === 'supervisor').length,
      intermediateCount: activeTechniciansNow.filter(s => classifyShift(s) === 'diurno').length,
      afternoonCount: activeTechniciansNow.filter(s => classifyShift(s) === 'tarde').length,
      nightCount: activeTechniciansNow.filter(s => classifyShift(s) === 'noche').length,
      offCount: 0
    };
  }, [activeTechniciansNow]);

  // Quick Fortnight preset setter for Bulk Generator
  const setFortnightPreset = (mode: 'q1' | 'q2' | 'next15') => {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth();

    if (mode === 'q1') {
      setBulkData(prev => ({
        ...prev,
        startDate: `${y}-${String(m + 1).padStart(2, '0')}-01`,
        endDate: `${y}-${String(m + 1).padStart(2, '0')}-15`
      }));
    } else if (mode === 'q2') {
      const lastDay = new Date(y, m + 1, 0).getDate();
      setBulkData(prev => ({
        ...prev,
        startDate: `${y}-${String(m + 1).padStart(2, '0')}-16`,
        endDate: `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`
      }));
    } else if (mode === 'next15') {
      const startIso = now.toISOString().split('T')[0];
      const endObj = new Date(now.getTime() + 14 * 86400000);
      const endIso = endObj.toISOString().split('T')[0];
      setBulkData(prev => ({
        ...prev,
        startDate: startIso,
        endDate: endIso
      }));
    }
  };

  // Open modal to add or edit schedule
  const handleOpenAddModal = (initialTechId?: string, initialDate?: string) => {
    const selectedTech = technicianUsers.find(u => u.id === initialTechId) || technicianUsers[0];
    setEditingSchedule(null);
    setFormData({
      technicianId: selectedTech?.id || '',
      technicianName: selectedTech?.displayName || 'Técnico de Turno',
      technicianRole: selectedTech?.role || 'Técnico de Mantenimiento',
      date: initialDate || getHotelCurrentDateIso(),
      shiftType: 'manana',
      startTime: '06:00',
      endTime: '15:00',
      breakDurationMinutes: 60,
      assignedAreas: ['Toda la Infraestructura'],
      isOnCall: false,
      notes: ''
    });
    setIsAddEditModalOpen(true);
  };

  const handleOpenEditModal = (sched: TechnicianSchedule) => {
    setEditingSchedule(sched);
    setFormData({
      technicianId: sched.technicianId,
      technicianName: sched.technicianName,
      technicianRole: sched.technicianRole || 'Técnico',
      date: sched.date,
      shiftType: sched.shiftType,
      startTime: sched.startTime,
      endTime: sched.endTime,
      breakDurationMinutes: sched.breakDurationMinutes || 60,
      assignedAreas: sched.assignedAreas || ['Toda la Infraestructura'],
      isOnCall: !!sched.isOnCall,
      notes: sched.notes || ''
    });
    setIsAddEditModalOpen(true);
  };

  const handleShiftPresetChange = (presetKey: ShiftType) => {
    const preset = SHIFT_PRESETS[presetKey];
    setFormData(prev => ({
      ...prev,
      shiftType: presetKey,
      startTime: preset.startTime,
      endTime: preset.endTime,
      isOnCall: presetKey === 'guardia_24h'
    }));
  };

  const handleSaveSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.technicianName.trim() || !formData.date) {
      notify('⚠️ Por favor selecciona el técnico y la fecha.');
      return;
    }

    try {
      if (editingSchedule) {
        await updateSchedule(editingSchedule.id, formData);
        notify(`✅ Horario de ${formData.technicianName} actualizado.`);
      } else {
        await addSchedule(formData);
        notify(`✅ Horario programado para ${formData.technicianName}.`);
      }
      setIsAddEditModalOpen(false);
    } catch (err) {
      notify('Error al guardar el horario.');
    }
  };

  const handleRunBulkGenerator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bulkData.technicianIds.length === 0) {
      notify('⚠️ Selecciona al menos un técnico para la programación quincenal.');
      return;
    }

    try {
      await bulkGenerateSchedules(bulkData);
      notify(`⚡ Programación quincenal generada con éxito.`);
      setIsBulkModalOpen(false);
    } catch (err) {
      notify('Error al generar la programación masiva.');
    }
  };

  const handleSendSwapRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapData.scheduleId || !swapData.targetTechnicianId) {
      notify('⚠️ Selecciona el turno a permutar y el compañero.');
      return;
    }

    const sched = schedules.find(s => s.id === swapData.scheduleId);
    const targetTech = users.find(u => u.id === swapData.targetTechnicianId);

    try {
      await requestShiftSwap({
        scheduleId: swapData.scheduleId,
        requesterId: currentUser?.id || 'usr-anon',
        requesterName: currentUser?.displayName || 'Técnico',
        targetTechnicianId: swapData.targetTechnicianId,
        targetTechnicianName: targetTech?.displayName || 'Técnico Destino',
        date: sched?.date || getHotelCurrentDateIso(),
        reason: swapData.reason || 'Cambio quincenal por asuntos personales'
      });
      notify('🔄 Solicitud de permuta enviada.');
      setIsSwapModalOpen(false);
    } catch (err) {
      notify('Error al enviar la solicitud de permuta.');
    }
  };

  // Export to CSV / Spreadsheet
  const handleExportCSV = () => {
    if (!schedules || schedules.length === 0) {
      notify('No hay horarios registrados para exportar.');
      return;
    }

    const periodSublabel = matrixPeriodMode === 'quincena1' ? '1ª Quincena' : matrixPeriodMode === 'quincena2' ? '2ª Quincena' : 'Semana';

    downloadScheduleCsv({
      periodLabel: currentMonthLabel,
      periodSublabel,
      displayedDays,
      technicians: technicianUsers,
      schedules: schedules || [],
      hotelInfo: settings?.hotelInfo
    });

    notify({
      type: 'success',
      title: 'Planilla CSV Descargada 📄',
      message: 'Matriz de turnos quincenal exportada a CSV compatible con Excel.'
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER TITLE & CONTROL BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-indigo-600/30 text-indigo-400 rounded-2xl border border-indigo-500/30 shrink-0">
            <Clock className="w-8 h-8 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Horarios & Turnos Quincenales
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                En Vivo
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Programación quincenal de guardias, rotaciones de 15 días y cobertura continua para mantenimiento.
            </p>
          </div>
        </div>

        {/* TOP ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button
                onClick={() => handleOpenAddModal()}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center space-x-2 cursor-pointer active:scale-95"
              >
                <Plus className="w-4 h-4" />
                <span>Asignar Turno</span>
              </button>

              <button
                onClick={() => {
                  setBulkData(prev => ({ ...prev, technicianIds: technicianUsers.map(u => u.id) }));
                  setIsBulkModalOpen(true);
                }}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center space-x-2 cursor-pointer active:scale-95"
              >
                <Zap className="w-4 h-4 text-purple-200" />
                <span>Wizard Quincenal</span>
              </button>
            </>
          )}

          <button
            onClick={() => setIsSwapModalOpen(true)}
            className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs sm:text-sm rounded-xl transition-all border border-slate-700 flex items-center space-x-2 cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
            <span>Permutas</span>
          </button>

          <button
            onClick={handleExportCSV}
            title="Exportar a CSV"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          </button>

          <button
            onClick={handlePrint}
            title="Imprimir cartelera de turnos"
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-all border border-slate-700 cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-400" />
          </button>
        </div>
      </div>

      {/* LIVE TECHNICIANS ON SHIFT BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-5 rounded-2xl border border-indigo-500/20 shadow-lg text-white">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <span>Técnicos De Turno Ahora Mismo</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activeTechniciansNow.length} de servicio
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Personal activo cubriendo la operación del hotel en tiempo real
              </p>
            </div>
          </div>

          {/* Quick Counter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            <div className="px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs font-medium text-amber-300 shrink-0 flex items-center gap-1.5">
              <span>🌅 Mañana:</span>
              <span className="font-bold">{todayStats.morningCount}</span>
            </div>
            <div className="px-3 py-1.5 bg-teal-500/10 border border-teal-500/20 rounded-xl text-xs font-medium text-teal-300 shrink-0 flex items-center gap-1.5">
              <span>👔 Supervisor:</span>
              <span className="font-bold">{todayStats.supervisorCount}</span>
            </div>
            <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs font-medium text-emerald-300 shrink-0 flex items-center gap-1.5">
              <span>🏢 Turno Intermedio:</span>
              <span className="font-bold">{todayStats.intermediateCount}</span>
            </div>
            <div className="px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-xl text-xs font-medium text-blue-300 shrink-0 flex items-center gap-1.5">
              <span>☀️ Tarde:</span>
              <span className="font-bold">{todayStats.afternoonCount}</span>
            </div>
            <div className="px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl text-xs font-medium text-purple-300 shrink-0 flex items-center gap-1.5">
              <span>🌙 Noche:</span>
              <span className="font-bold">{todayStats.nightCount}</span>
            </div>
          </div>
        </div>

        {/* ACTIVE TECHNICIANS BADGES */}
        {activeTechniciansNow.length > 0 ? (
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-3 border-t border-slate-800">
            {activeTechniciansNow.map(tech => (
              <div 
                key={tech.id} 
                className="bg-slate-800/80 backdrop-blur border border-slate-700/80 p-3 rounded-xl flex items-center justify-between gap-3 shadow-sm hover:border-indigo-500/50 transition-all"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-md ring-2 ring-emerald-500/50">
                    {tech.technicianName.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-white truncate flex items-center gap-1.5">
                      <span>{tech.technicianName}</span>
                      {tech.isOnCall && (
                        <span className="px-1.5 py-0.2 text-[10px] bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">Turno Intermedio</span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-300 truncate">
                      {tech.startTime} - {tech.endTime} • {SHIFT_PRESETS[tech.shiftType]?.label || tech.shiftType}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-slate-400 block">Áreas:</span>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 inline-block max-w-[110px] truncate">
                    {(tech.assignedAreas || ['General'])[0]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-xs text-amber-300 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Sin asignación activa en este momento exacto. Revisa el cronograma de turnos.</span>
          </div>
        )}
      </div>

      {/* VIEW SELECTOR TABS & FORTNIGHT/WEEK NAVIGATION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {/* VIEW MODES */}
        <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl overflow-x-auto">
          <button
            onClick={() => setActiveViewMode('matriz')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              activeViewMode === 'matriz'
                ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Matriz Quincenal</span>
          </button>

          <button
            onClick={() => setActiveViewMode('calendario')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              activeViewMode === 'calendario'
                ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            <span>Calendario Mensual</span>
          </button>

          <button
            onClick={() => setActiveViewMode('cobertura')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              activeViewMode === 'cobertura'
                ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4" />
            <span>Cobertura 24h</span>
          </button>

          <button
            onClick={() => setActiveViewMode('permutas')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 shrink-0 cursor-pointer ${
              activeViewMode === 'permutas'
                ? 'bg-white dark:bg-indigo-600 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Permutas ({shiftSwapRequests.filter(s => s.status === 'pendiente').length})</span>
          </button>
        </div>

        {/* PERIOD MODE SELECTOR & MONTH NAVIGATOR */}
        {activeViewMode === 'matriz' && (
          <div className="flex flex-wrap items-center gap-2 self-end md:self-auto">
            {/* Period Pills */}
            <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setMatrixPeriodMode('quincena1')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  matrixPeriodMode === 'quincena1'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                1ª Quincena (1-15)
              </button>
              <button
                onClick={() => setMatrixPeriodMode('quincena2')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  matrixPeriodMode === 'quincena2'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                2ª Quincena (16-Fin)
              </button>
              <button
                onClick={() => setMatrixPeriodMode('semana')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  matrixPeriodMode === 'semana'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                Semanal
              </button>
            </div>

            {/* Month Switcher */}
            {matrixPeriodMode !== 'semana' ? (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentMonthOffset(prev => prev - 1)}
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[100px] text-center">
                  {currentMonthLabel}
                </span>
                <button
                  onClick={() => setCurrentMonthOffset(prev => prev + 1)}
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {currentMonthOffset !== 0 && (
                  <button
                    onClick={() => setCurrentMonthOffset(0)}
                    className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 cursor-pointer"
                  >
                    Mes Actual
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setCurrentWeekOffset(prev => prev - 1)}
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 min-w-[120px] text-center">
                  {displayedDays[0]?.dayNum} {displayedDays[0]?.monthName} - {displayedDays[6]?.dayNum} {displayedDays[6]?.monthName}
                </span>
                <button
                  onClick={() => setCurrentWeekOffset(prev => prev + 1)}
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* VISTA 1: MATRIZ QUINCENAL / SEMANAL DE TÉCNICOS */}
      {/* ========================================================================= */}
      {activeViewMode === 'matriz' && (
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden space-y-0">
          
          {/* HEADER DE CONTROL E INTERACCIÓN DE LA MATRIZ */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Buscador & Agregar Personal */}
            <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[280px]">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="Buscar técnico..."
                  className="w-full pl-9 pr-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                />
              </div>

              {isAdmin && (
                <button
                  onClick={() => setIsAddPersonModalOpen(true)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer shrink-0"
                  title="Agregar nuevo técnico o personal"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Personal</span>
                </button>
              )}

              {/* BOTONES EXPORTAR PDF, EXCEL Y COMPARTIR POR WHATSAPP */}
              <div className="flex items-center space-x-2 shrink-0">
                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={isExportingPdf}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black text-xs rounded-xl transition-all shadow-md shadow-indigo-950/40 flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  title="Descargar la programación en formato PDF oficial auditado"
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5 text-indigo-200" />
                  )}
                  <span>Descargar PDF</span>
                </button>
              </div>
            </div>

            {/* Selector de Modos de Vista Originales */}
            <div className="flex flex-wrap items-center gap-2">
              
              {/* Botón Ancho de Columna de Nombres (Ahorra espacio en móvil) */}
              <button
                onClick={() => setIsCompactNames(prev => !prev)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center space-x-1.5 cursor-pointer ${
                  isCompactNames
                    ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 shadow-xs'
                    : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                }`}
                title="Con el modo compacto los nombres ocupan menos espacio para ver todos los días completos"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>{isCompactNames ? '👤 Nombres Compactos' : '📄 Nombres Detallados'}</span>
              </button>

              {/* Layout Switcher Pills */}
              <div className="flex items-center space-x-1 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setMatrixLayoutMode('tabla')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                    matrixLayoutMode === 'tabla'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                  title="Vista de Tabla Horizontal con Desplazamiento"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tabla</span>
                </button>

                <button
                  onClick={() => setMatrixLayoutMode('tarjetas')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                    matrixLayoutMode === 'tarjetas'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                  title="Tarjetas Individuales por Técnico con Línea de Tiempo de Turnos"
                >
                  <Users className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tarjetas</span>
                </button>

                <button
                  onClick={() => setMatrixLayoutMode('desglose')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center space-x-1 cursor-pointer ${
                    matrixLayoutMode === 'desglose'
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                  title="Vista Desglosada Día por Día"
                >
                  <CalendarDays className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Día a Día</span>
                </button>
              </div>

            </div>

          </div>

          {/* WRAPPER EXPORTABLE CON ENCABEZADO DE DOCUMENTO OFICIAL */}
          <div id="schedule-matrix-export-container" className="p-3 bg-white dark:bg-slate-900 rounded-b-2xl space-y-2">
            
            {/* ENCABEZADO DE DOCUMENTO OFICIAL PARA PDF E IMÁGENES */}
            <div className="p-3 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl border border-indigo-500/40 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 border border-indigo-400/50 flex items-center justify-center text-2xl shadow-inner">
                  🏢
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-indigo-200 via-cyan-100 to-white">
                    PROGRAMACIÓN OFICIAL DE TURNOS - HOTEL MANTENIMIENTO
                  </h3>
                  <p className="text-[11px] font-bold text-indigo-300 flex flex-wrap items-center gap-2 mt-0.5">
                    <span>🗓️ Período: <strong>{currentMonthLabel}</strong> ({matrixPeriodMode === 'quincena1' ? '1ª Quincena (Días 1-15)' : matrixPeriodMode === 'quincena2' ? '2ª Quincena (Días 16-Fin)' : 'Semana Actual'})</span>
                    <span className="text-slate-500">•</span>
                    <span className="text-rose-300 font-extrabold">🇨🇴 Festivos Nacionales de Colombia Incluidos</span>
                  </p>
                </div>
              </div>
              <div className="text-right text-[10px] text-slate-400 font-mono hidden md:block shrink-0">
                <div className="font-bold text-indigo-300">Documento Oficial de Operaciones</div>
                <div>Actualizado: {new Date().toLocaleDateString('es-CO')}</div>
              </div>
            </div>

            {/* Leyenda de Turnos Compacta */}
            <div className="px-4 py-2 bg-slate-100/50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 overflow-x-auto gap-3">
            <div className="flex items-center space-x-3 shrink-0">
              <span className="font-semibold text-slate-700 dark:text-slate-300">Turnos:</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400"></span> 🌅 Mañana (06-15)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-teal-400"></span> 👔 Supervisor (10-19)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400"></span> ☀️ Tarde (13-22)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-400"></span> 🌙 Noche (21-06)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400"></span> 🏢 Intermedia (08-17)</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> 🏢 Turno Intermedio</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span> 🏝️ Descanso</span>
            </div>
            <div className="text-[10px] text-slate-400 italic shrink-0 hidden md:block">
              {displayedDays.length} Días de la {matrixPeriodMode === 'semana' ? 'Semana' : matrixPeriodMode === 'quincena1' ? '1ª Quincena' : '2ª Quincena'}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* OPCIÓN A: TABLA FLUYENTE (CON COLUMNA STICKY ADAPTABLE Y DIAS VISIBLES) */}
          {/* ========================================================================= */}
          {matrixLayoutMode === 'tabla' && (
            <div className="overflow-x-auto w-full pb-2">
              <table className="w-full text-left border-collapse min-w-[720px]">
                <thead>
                  <tr className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold border-b border-slate-200 dark:border-slate-700">
                    
                    {/* COLUMNA FIXA DE TÉCNICOS (STICKY LEFT) */}
                    <th 
                      className={`p-2.5 sticky left-0 bg-slate-100 dark:bg-slate-800 z-20 border-r border-slate-200 dark:border-slate-700 shadow-xs transition-all ${
                        isCompactNames ? 'w-20 sm:w-28 min-w-[80px]' : 'w-56 sm:w-64 min-w-[200px]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate text-[11px] font-extrabold uppercase tracking-tight text-slate-700 dark:text-slate-200">
                          {isCompactNames ? 'Personal' : 'Técnico de Turno'}
                        </span>
                        {isAdmin && (
                          <button
                            onClick={() => setIsAddPersonModalOpen(true)}
                            className="p-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 rounded-lg transition-colors cursor-pointer shrink-0"
                            title="Agregar nuevo personal"
                          >
                            <UserPlus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </th>

                    {/* ENCABEZADOS DE DÍAS (1 AL 15 / 16 AL 31) */}
                    {displayedDays.map(day => {
                      const isWeekend = day.dayName === 'Sáb' || day.dayName === 'Dom';
                      return (
                        <th 
                          key={day.dateIso} 
                          className={`p-2 text-center border-l border-slate-200 dark:border-slate-700 min-w-[52px] sm:min-w-[62px] ${
                            day.isHoliday
                              ? 'bg-rose-100/90 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 font-black ring-1 ring-rose-400/80'
                              : day.isToday 
                              ? 'bg-indigo-100/80 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-black ring-1 ring-indigo-400' 
                              : isWeekend
                              ? 'bg-amber-50/60 dark:bg-amber-950/20 text-amber-800 dark:text-amber-300'
                              : 'hover:bg-slate-200/50'
                          }`}
                          title={day.isHoliday ? `🇨🇴 Festivo Colombia: ${day.holidayName}` : undefined}
                        >
                          <div className={`text-[10px] uppercase font-bold tracking-wider ${
                            day.isHoliday 
                              ? 'text-rose-700 dark:text-rose-300' 
                              : isWeekend 
                              ? 'text-amber-700 dark:text-amber-400' 
                              : ''
                          }`}>
                            {day.dayName}
                          </div>
                          <div className="text-xs font-black mt-0.5 flex items-center justify-center gap-0.5">
                            <span>{day.dayNum}</span>
                            {day.isHoliday && <span className="text-[10px]" title={day.holidayName}>🇨🇴</span>}
                            {day.isToday && !day.isHoliday && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>}
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 text-xs">
                  {technicianUsers
                    .filter(u => !searchTerm || u.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
                    .map(tech => (
                      <tr key={tech.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        
                        {/* CELDA DE INFORMACIÓN DEL TÉCNICO CON ORDENACIÓN Y BORRADO */}
                        <td 
                          className={`p-2 sticky left-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-10 shadow-xs transition-all ${
                            isCompactNames ? 'w-20 sm:w-28 min-w-[80px]' : 'w-56 sm:w-64 min-w-[200px]'
                          }`}
                        >
                          {editingTechId === tech.id ? (
                            <div className="flex items-center space-x-1 py-1">
                              <input
                                type="text"
                                value={editingTechName}
                                onChange={(e) => setEditingTechName(e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-indigo-500 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveTechName(tech.id);
                                  if (e.key === 'Escape') setEditingTechId(null);
                                }}
                              />
                              <button
                                onClick={() => handleSaveTechName(tech.id)}
                                className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 cursor-pointer shrink-0"
                                title="Guardar"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingTechId(null)}
                                className="p-1 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded hover:bg-slate-300 cursor-pointer shrink-0 text-xs px-1.5"
                                title="Cancelar"
                              >
                                ✕
                              </button>
                            </div>
                          ) : isCompactNames ? (
                            /* MODO COMPACTO: AVATAR + NOMBRE CORTO PARA DEJAR MÁXIMO ESPACIO A LOS DÍAS */
                            <div className="flex items-center justify-between gap-1 group relative">
                              <div className="flex items-center space-x-1.5 min-w-0" title={`${tech.displayName} - ${tech.role || 'Técnico'}`}>
                                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-[10px] shadow-xs">
                                  {tech.displayName.substring(0, 2).toUpperCase()}
                                </div>
                                <span className="font-bold text-slate-800 dark:text-slate-100 text-[11px] truncate max-w-[80px] sm:max-w-[100px]" title={tech.displayName}>
                                  {tech.displayName}
                                </span>
                              </div>

                              {isAdmin && (
                                <div className="flex items-center space-x-0.5 shrink-0 opacity-70 hover:opacity-100">
                                  <button
                                    onClick={() => {
                                      setEditingTechId(tech.id);
                                      setEditingTechName(tech.displayName);
                                    }}
                                    className="p-0.5 hover:bg-indigo-100 dark:hover:bg-indigo-950 text-slate-500 hover:text-indigo-600 rounded cursor-pointer"
                                    title="Editar nombre"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveTechnician(tech.id, 'up')}
                                    className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded cursor-pointer"
                                    title="Arriba"
                                  >
                                    <ArrowUp className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveTechnician(tech.id, 'down')}
                                    className="p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded cursor-pointer"
                                    title="Abajo"
                                  >
                                    <ArrowDown className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </div>
                          ) : (
                            /* MODO COMPLETO: AVATAR + NOMBRE COMPLETO + CONTROLES */
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center space-x-2 min-w-0">
                                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-sm">
                                  {tech.displayName.substring(0, 2).toUpperCase()}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-bold text-slate-800 dark:text-slate-100 truncate text-xs flex items-center gap-1">
                                    <span title={tech.displayName}>{tech.displayName}</span>
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">
                                    {tech.role || 'Técnico'}
                                  </div>
                                </div>
                              </div>

                              {isAdmin && (
                                <div className="flex items-center space-x-0.5 shrink-0 opacity-80 hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => {
                                      setEditingTechId(tech.id);
                                      setEditingTechName(tech.displayName);
                                    }}
                                    className="p-1 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 text-slate-400 hover:text-indigo-600 rounded cursor-pointer"
                                    title="Editar nombre"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveTechnician(tech.id, 'up')}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:text-slate-400 rounded cursor-pointer"
                                    title="Mover arriba"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleMoveTechnician(tech.id, 'down')}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 dark:text-slate-400 rounded cursor-pointer"
                                    title="Mover abajo"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePerson(tech.id, tech.displayName)}
                                    className="p-1 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                                    title="Quitar personal"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        {/* CELDAS DE TURNOS PARA CADA DÍA */}
                        {displayedDays.map(day => {
                          const daySched = (schedules || []).find(s => 
                            (s.technicianId === tech.id || 
                             (!s.technicianId && Boolean(s.technicianName) && Boolean(tech.displayName) && s.technicianName.toLowerCase().trim() === tech.displayName.toLowerCase().trim())) && 
                            s.date === day.dateIso
                          );
                          const preset = daySched ? SHIFT_PRESETS[daySched.shiftType] : null;

                          return (
                            <td 
                              key={day.dateIso} 
                              className={`p-1 border-l text-center align-middle transition-colors ${
                                day.isHoliday
                                  ? 'bg-rose-100/60 dark:bg-rose-950/40 border-x border-rose-300/80 dark:border-rose-800/80'
                                  : day.isToday 
                                  ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-slate-200 dark:border-slate-800' 
                                  : 'border-slate-200 dark:border-slate-800'
                              }`}
                            >
                              {daySched ? (
                                <div 
                                  onClick={() => isAdmin && handleOpenEditModal(daySched)}
                                  className={`p-1.5 rounded-xl border ${
                                    day.isHoliday
                                      ? 'ring-2 ring-rose-400/90 dark:ring-rose-500/90 bg-rose-50/90 dark:bg-rose-950/90 border-rose-300 dark:border-rose-700 shadow-2xs text-rose-900 dark:text-rose-100'
                                      : `${preset?.badgeBg} ${preset?.badgeText} ${preset?.border}`
                                  } cursor-pointer hover:scale-105 transition-all shadow-2xs group relative flex flex-col items-center justify-center min-h-[46px]`}
                                  title={day.isHoliday ? `🇨🇴 Festivo Colombia (${day.holidayName}): ${preset?.label} (${daySched.startTime}-${daySched.endTime})` : `${preset?.label} (${daySched.startTime}-${daySched.endTime})`}
                                >
                                  <div className="font-bold text-[11px] flex items-center justify-center gap-0.5 leading-none">
                                    <span>{preset?.icon}</span>
                                    <span className="truncate text-[10px]">
                                      {daySched.shiftType === 'diurno' 
                                        ? 'Intermedia' 
                                        : daySched.shiftType === 'descanso' 
                                        ? 'Descanso' 
                                        : daySched.shiftType === 'manana'
                                        ? 'Mañana'
                                        : daySched.shiftType === 'tarde'
                                        ? 'Tarde'
                                        : daySched.shiftType === 'noche'
                                        ? 'Noche'
                                        : daySched.shiftType === 'supervisor'
                                        ? 'Supervisor'
                                        : daySched.shiftType === 'guardia_24h'
                                        ? 'Intermedio'
                                        : (preset?.label || '').replace('Turno ', '')}
                                    </span>
                                  </div>

                                  {daySched.shiftType !== 'descanso' && (
                                    <div className="text-[9px] font-semibold opacity-90 mt-0.5 tracking-tighter">
                                      {daySched.startTime}
                                    </div>
                                  )}

                                  {daySched.isOnCall && (
                                    <span className="mt-0.5 px-1 py-0.2 bg-emerald-500 text-white text-[7px] font-bold rounded-full inline-block">
                                      Intermedio
                                    </span>
                                  )}

                                  {isAdmin && (
                                    <div className="absolute top-0.5 right-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Edit3 className="w-2.5 h-2.5 text-slate-600 dark:text-slate-300" />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                day.isHoliday ? (
                                  isAdmin ? (
                                    <button
                                      onClick={() => handleOpenAddModal(tech.id, day.dateIso)}
                                      className="w-full py-2 border-2 border-dashed border-rose-300 dark:border-rose-700/80 rounded-xl bg-rose-100/60 dark:bg-rose-950/40 hover:bg-rose-200/70 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 transition-all flex items-center justify-center cursor-pointer min-h-[46px] shadow-2xs group"
                                      title={`Asignar Turno en Día Festivo: ${day.holidayName}`}
                                    >
                                      <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                                    </button>
                                  ) : (
                                    <div className="w-full py-2.5 px-1 rounded-xl bg-rose-100/60 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 text-[10px] font-black text-center flex items-center justify-center min-h-[46px]">
                                      -
                                    </div>
                                  )
                                ) : (
                                  isAdmin ? (
                                    <button
                                      onClick={() => handleOpenAddModal(tech.id, day.dateIso)}
                                      className="w-full py-2 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30 transition-all flex items-center justify-center cursor-pointer min-h-[46px]"
                                      title="Asignar Turno"
                                    >
                                      <Plus className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-700 text-[10px] italic">-</span>
                                  )
                                )
                              )}
                            </td>
                          );
                        })}

                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}

          {/* ========================================================================= */}
          {/* OPCIÓN B: TARJETAS DE PERSONAL CON LÍNEA DE TIEMPO INTERACTIVA */}
          {/* ========================================================================= */}
          {matrixLayoutMode === 'tarjetas' && (
            <div className="p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
              {technicianUsers
                .filter(u => !searchTerm || u.displayName.toLowerCase().includes(searchTerm.toLowerCase()))
                .map(tech => {
                  const techScheds = (schedules || []).filter(s => 
                    s.technicianId === tech.id || 
                    (!s.technicianId && Boolean(s.technicianName) && Boolean(tech.displayName) && s.technicianName.toLowerCase().trim() === tech.displayName.toLowerCase().trim())
                  );
                  const activeCount = displayedDays.filter(d => {
                    const s = techScheds.find(sched => sched.date === d.dateIso);
                    return s && s.shiftType !== 'descanso';
                  }).length;

                  return (
                    <div 
                      key={tech.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow space-y-3"
                    >
                      {/* Encabezado de la Tarjeta del Técnico */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-extrabold flex items-center justify-center shrink-0 text-sm shadow-sm">
                            {tech.displayName.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                              <span>{tech.displayName}</span>
                              <span className="px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold rounded-lg border border-indigo-200 dark:border-indigo-800">
                                {tech.role || 'Técnico'}
                              </span>
                            </h4>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                              {activeCount} días con turno asignado de {displayedDays.length} días de la quincena
                            </p>
                          </div>
                        </div>

                        {/* Opciones de Administración */}
                        {isAdmin && (
                          <div className="flex items-center space-x-1 self-end sm:self-auto">
                            <button
                              onClick={() => handleMoveTechnician(tech.id, 'up')}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded-lg cursor-pointer"
                              title="Subir de posición"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleMoveTechnician(tech.id, 'down')}
                              className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 hover:text-indigo-600 rounded-lg cursor-pointer"
                              title="Bajar de posición"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeletePerson(tech.id, tech.displayName)}
                              className="p-1.5 hover:bg-rose-100 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                              title="Quitar técnico"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Cinta Horizontal de Días y Turnos */}
                      <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                        {displayedDays.map(day => {
                          const daySched = techScheds.find(s => s.date === day.dateIso);
                          const preset = daySched ? SHIFT_PRESETS[daySched.shiftType] : null;

                          return (
                            <div 
                              key={day.dateIso}
                              onClick={() => {
                                if (isAdmin) {
                                  if (daySched) handleOpenEditModal(daySched);
                                  else handleOpenAddModal(tech.id, day.dateIso);
                                }
                              }}
                              className={`flex-1 min-w-[85px] max-w-[110px] p-2 rounded-xl border text-center transition-all cursor-pointer ${
                                day.isHoliday
                                  ? 'bg-rose-100/90 dark:bg-rose-950/80 border-2 border-rose-400 dark:border-rose-600 text-rose-900 dark:text-rose-100 ring-2 ring-rose-400/80 shadow-xs'
                                  : daySched 
                                  ? `${preset?.badgeBg} ${preset?.border} ${preset?.badgeText} hover:scale-105` 
                                  : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-slate-400'
                              } ${day.isToday ? 'ring-2 ring-indigo-500 shadow-sm' : ''}`}
                            >
                              <div className={`text-[10px] font-extrabold uppercase tracking-tight ${day.isHoliday ? 'text-rose-800 dark:text-rose-200' : 'opacity-75'}`}>
                                {day.dayName} {day.dayNum} {day.isHoliday ? '🇨🇴' : ''}
                              </div>

                              {daySched ? (
                                <div className="mt-1 space-y-0.5">
                                  <div className="text-xs font-bold flex items-center justify-center gap-1">
                                    <span>{preset?.icon}</span>
                                    <span className="truncate">{preset?.label.replace('Turno ', '')}</span>
                                  </div>
                                  {daySched.shiftType !== 'descanso' && (
                                    <div className="text-[10px] font-medium opacity-90">
                                      {daySched.startTime} - {daySched.endTime}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className={`mt-1.5 py-1 text-[10px] font-semibold flex items-center justify-center gap-1 ${day.isHoliday ? 'text-rose-600 dark:text-rose-400 font-extrabold' : 'text-slate-400 dark:text-slate-500'}`}>
                                  <Plus className="w-3 h-3" />
                                  <span>Asignar</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* ========================================================================= */}
          {/* OPCIÓN C: DESGLOSE DIARIO POR FECHA DE LA QUINCENA */}
          {/* ========================================================================= */}
          {matrixLayoutMode === 'desglose' && (
            <div className="p-4 space-y-5 bg-slate-50/50 dark:bg-slate-900/50">
              
              {/* Barra de Selección de Día */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-indigo-500" />
                  <span>Selecciona el día de la quincena para ver el personal programado:</span>
                </label>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                  {displayedDays.map(day => (
                    <button
                      key={day.dateIso}
                      onClick={() => setSelectedDayIso(day.dateIso)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex flex-col items-center ${
                        selectedDayIso === day.dateIso
                          ? 'bg-indigo-600 text-white shadow-md scale-105'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      } ${day.isToday ? 'ring-2 ring-indigo-400' : ''}`}
                    >
                      <span className="text-[10px] uppercase tracking-wider opacity-80">{day.dayName}</span>
                      <span className="text-sm font-extrabold">{day.dayNum}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Contenido del Día Seleccionado */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div>
                    <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                      <span>Programación del Día:</span>
                      <span className="text-indigo-600 dark:text-indigo-400">
                        {displayedDays.find(d => d.dateIso === selectedDayIso)?.dayName} {selectedDayIso.split('-')[2]} de {currentMonthLabel}
                      </span>
                    </h3>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => handleOpenAddModal(undefined, selectedDayIso)}
                      className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Asignar Turno en este Día</span>
                    </button>
                  )}
                </div>

                {/* Grupos de Turnos del Día */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(SHIFT_PRESETS).map(([shiftKey, preset]) => {
                    const schedsForType = (schedules || []).filter(s => s.date === selectedDayIso && s.shiftType === shiftKey);

                    return (
                      <div 
                        key={shiftKey}
                        className={`p-4 rounded-2xl border ${preset.badgeBg} ${preset.border} space-y-3`}
                      >
                        <div className="flex items-center justify-between border-b border-slate-200/50 dark:border-slate-700/50 pb-2">
                          <span className={`text-xs font-extrabold flex items-center gap-1.5 ${preset.badgeText}`}>
                            <span className="text-base">{preset.icon}</span>
                            <span>{preset.label}</span>
                          </span>
                          <span className="px-2 py-0.5 bg-white/80 dark:bg-slate-900/80 rounded-full text-[10px] font-black text-slate-700 dark:text-slate-300 shadow-2xs">
                            {schedsForType.length}
                          </span>
                        </div>

                        {schedsForType.length > 0 ? (
                          <div className="space-y-2">
                            {schedsForType.map(sched => (
                              <div 
                                key={sched.id}
                                className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs flex items-center justify-between group"
                              >
                                <div className="space-y-0.5 min-w-0">
                                  <div className="font-bold text-slate-800 dark:text-slate-100 text-xs truncate">
                                    {sched.technicianName}
                                  </div>
                                  <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-slate-400" />
                                    <span>{sched.startTime} - {sched.endTime}</span>
                                  </div>
                                  {sched.assignedAreas && sched.assignedAreas.length > 0 && (
                                    <div className="text-[9px] text-indigo-600 dark:text-indigo-400 font-semibold truncate">
                                      📍 {sched.assignedAreas.join(', ')}
                                    </div>
                                  )}
                                </div>

                                {isAdmin && (
                                  <button
                                    onClick={() => handleOpenEditModal(sched)}
                                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-indigo-600 rounded-lg cursor-pointer"
                                    title="Editar turno"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic text-center py-2">
                            Sin personal asignado
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>

            </div>
          )}

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 2: CALENDARIO MENSUAL */}
      {/* ========================================================================= */}
      {activeViewMode === 'calendario' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-indigo-500" />
              <span>Programación Mensual de Turnos</span>
            </h3>

            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {(schedules || [])
              .filter(s => s.date.startsWith(selectedDate.substring(0, 7)))
              .sort((a, b) => a.date.localeCompare(b.date))
              .map(sched => {
                const preset = SHIFT_PRESETS[sched.shiftType];
                return (
                  <div 
                    key={sched.id} 
                    className={`p-4 rounded-2xl border ${preset.badgeBg} ${preset.border} shadow-sm space-y-2 relative group`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{sched.date}</span>
                      </span>

                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${preset.badgeText} border border-current/20`}>
                        {preset.icon} {preset.label}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 pt-1">
                      <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center shrink-0 text-xs shadow-md">
                        {sched.technicianName.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                          {sched.technicianName}
                        </h4>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400">
                          Horario: <span className="font-semibold">{sched.startTime} - {sched.endTime}</span>
                        </p>
                      </div>
                    </div>

                    {sched.assignedAreas && sched.assignedAreas.length > 0 && (
                      <div className="text-[11px] text-slate-600 dark:text-slate-400 flex items-center gap-1 truncate pt-1">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        <span className="truncate">{sched.assignedAreas.join(', ')}</span>
                      </div>
                    )}

                    {isAdmin && (
                      <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
                        <button
                          onClick={() => handleOpenEditModal(sched)}
                          className="px-2.5 py-1 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-medium rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer"
                        >
                          Editar
                        </button>

                        <button
                          onClick={async () => {
                            if (confirm(`¿Eliminar turno de ${sched.technicianName}?`)) {
                              await deleteSchedule(sched.id);
                              notify('Turno eliminado.');
                            }
                          }}
                          className="p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 3: COBERTURA DE INGENIERÍA 24 HORAS */}
      {/* ========================================================================= */}
      {activeViewMode === 'cobertura' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <span>Análisis de Cobertura Continua 24h</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Evaluación de presencia técnica para asegurar atención ininterrumpida de emergencias
              </p>
            </div>

            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-800 dark:text-slate-200"
            />
          </div>

          {/* TIMELINE HOURLY COVERAGE BARS */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
              Línea de Tiempo del Día ({selectedDate}):
            </div>

            <div className="grid grid-cols-24 gap-1 bg-slate-100 dark:bg-slate-800 p-3 rounded-2xl overflow-x-auto min-w-[700px]">
              {Array.from({ length: 24 }).map((_, hour) => {
                const hourStr = `${String(hour).padStart(2, '0')}:00`;
                const techOnHour = (schedules || []).filter(s => {
                  if (s.date !== selectedDate || s.shiftType === 'descanso') return false;
                  if (s.shiftType === 'guardia_24h' || s.isOnCall) return true;
                  const startH = parseInt(s.startTime.split(':')[0], 10);
                  const endH = parseInt(s.endTime.split(':')[0], 10);
                  if (startH > endH) {
                    return hour >= startH || hour < endH;
                  }
                  return hour >= startH && hour < endH;
                });

                const isCovered = techOnHour.length > 0;

                return (
                  <div key={hour} className="flex flex-col items-center space-y-1">
                    <div 
                      className={`w-full h-12 rounded-lg flex items-center justify-center font-bold text-xs transition-all ${
                        isCovered 
                          ? 'bg-emerald-500 text-white shadow-sm ring-1 ring-emerald-400' 
                          : 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-300 dark:border-rose-800 animate-pulse'
                      }`}
                      title={isCovered ? `Cubierto por: ${techOnHour.map(t => t.technicianName).join(', ')}` : `Hora ${hourStr} sin técnico de turno`}
                    >
                      {techOnHour.length}
                    </div>
                    <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">{hour}h</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VISTA 4: PERMUTAS Y SOLICITUDES DE CAMBIO DE TURNO */}
      {/* ========================================================================= */}
      {activeViewMode === 'permutas' && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-cyan-500" />
              <span>Solicitudes de Permuta entre Compañeros</span>
            </h3>

            <button
              onClick={() => setIsSwapModalOpen(true)}
              className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs rounded-xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Solicitar Cambio</span>
            </button>
          </div>

          <div className="space-y-3">
            {shiftSwapRequests.length > 0 ? (
              shiftSwapRequests.map(swap => (
                <div 
                  key={swap.id} 
                  className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {swap.requesterName}
                      </span>
                      <ArrowRightLeft className="w-4 h-4 text-cyan-500" />
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {swap.targetTechnicianName}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-400">
                      Fecha: <span className="font-semibold text-slate-800 dark:text-slate-200">{swap.date}</span> • Motivo: "{swap.reason}"
                    </p>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {swap.status === 'pendiente' ? (
                      isAdmin ? (
                        <>
                          <button
                            onClick={() => resolveShiftSwap(swap.id, true)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl shadow-sm cursor-pointer"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() => resolveShiftSwap(swap.id, false)}
                            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-xl shadow-sm cursor-pointer"
                          >
                            Rechazar
                          </button>
                        </>
                      ) : (
                        <span className="px-3 py-1 bg-amber-500/10 text-amber-600 dark:text-amber-300 font-semibold text-xs rounded-full border border-amber-500/20">
                          Pendiente de Aprobación
                        </span>
                      )
                    ) : (
                      <span className={`px-3 py-1 font-semibold text-xs rounded-full border ${
                        swap.status === 'aprobado' 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20' 
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-300 border-rose-500/20'
                      }`}>
                        {swap.status === 'aprobado' ? 'Aprobado' : 'Rechazado'}
                      </span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400 italic">
                No hay solicitudes de permuta pendientes en este momento.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: AGREGAR / EDITAR TURNO INDIVIDUAL CON TARJETAS INTERACTIVAS */}
      {/* ========================================================================= */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 max-w-xl w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <Clock className="w-5 h-5" />
                </div>
                <span>{editingSchedule ? 'Editar Turno Técnico' : 'Asignar Nuevo Turno Técnico'}</span>
              </h3>
              <button 
                onClick={() => setIsAddEditModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSchedule} className="space-y-4 text-xs">
              {/* TÉCNICO INTERACTIVE CARDS SELECTOR */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <UserCheck className="w-4 h-4 text-indigo-500" />
                    <span>Seleccionar Técnico de Mantenimiento:</span>
                  </span>
                  <span className="text-[10px] text-indigo-400 font-semibold">{technicianUsers.length} disponibles</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800">
                  {technicianUsers.map(u => {
                    const isSelected = formData.technicianId === u.id;
                    return (
                      <button
                        type="button"
                        key={u.id}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          technicianId: u.id,
                          technicianName: u.displayName,
                          technicianRole: u.role || 'Técnico'
                        }))}
                        className={`p-2.5 rounded-2xl border text-left transition-all flex items-center space-x-3 cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 ring-2 ring-indigo-500/50 shadow-md scale-[1.01]'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400 dark:hover:border-slate-700'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center shrink-0 text-xs shadow-sm ${
                          isSelected ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200'
                        }`}>
                          {u.displayName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-bold text-xs truncate">{u.displayName}</div>
                          <div className="text-[10px] opacity-75 truncate">{u.role || 'Técnico de Mantenimiento'}</div>
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* PLANTILLA DE TURNO INTERACTIVE VISUAL CARDS */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-500" />
                    <span>Plantilla de Turno:</span>
                  </span>
                  <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold">Selección Rápida</span>
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {Object.entries(SHIFT_PRESETS).map(([key, preset]) => {
                    const isSelected = formData.shiftType === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => handleShiftPresetChange(key as ShiftType)}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                          isSelected
                            ? `${preset.badgeBg} ${preset.border} ring-2 ring-indigo-500 shadow-md scale-[1.02]`
                            : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base">{preset.icon}</span>
                          {isSelected && <span className="w-2 h-2 rounded-full bg-indigo-500"></span>}
                        </div>
                        <div className="mt-1">
                          <div className={`font-bold text-[11px] truncate ${isSelected ? preset.badgeText : 'text-slate-800 dark:text-slate-200'}`}>
                            {preset.label.replace('Turno ', '')}
                          </div>
                          <div className="text-[10px] font-medium opacity-80 mt-0.5">
                            {preset.startTime} - {preset.endTime}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* FECHA, HORA INICIO & HORA FIN CON LISTAS DESPLEGABLES FUTURISTAS Y CHIPS DE PRESET */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* 1. DESPLEGABLE DE FECHA DE TURNO */}
                <div className="relative">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Fecha:</span>
                    </span>
                    <span className="text-[10px] text-indigo-400 font-semibold">Seleccionar</span>
                  </label>

                  {/* Trigger Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsDateOpen(prev => !prev);
                      setIsStartTimeOpen(false);
                      setIsEndTimeOpen(false);
                    }}
                    className={`w-full px-3 py-2.5 bg-slate-900/90 dark:bg-slate-950/90 border hover:border-indigo-400 rounded-2xl text-slate-100 font-bold text-xs flex items-center justify-between shadow-md transition-all cursor-pointer group ${
                      isColombianHoliday(formData.date).isHoliday 
                        ? 'border-rose-500/80 shadow-rose-950/40' 
                        : 'border-indigo-500/40 shadow-indigo-950/40'
                    }`}
                  >
                    <span className="truncate flex items-center gap-1.5 text-indigo-200">
                      <span>{isColombianHoliday(formData.date).isHoliday ? '🇨🇴' : '🗓️'}</span>
                      <span>{formatDateLabel(formData.date)}</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 text-indigo-400 transition-transform duration-200 ${isDateOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Banner de Día Festivo en Colombia */}
                  {isColombianHoliday(formData.date).isHoliday && (
                    <div className="mt-1.5 p-2 bg-rose-500/20 border border-rose-500/50 rounded-xl text-[10px] text-rose-200 font-bold flex items-center gap-1.5 shadow-xs">
                      <span>🇨🇴 Festivo Oficial Colombia:</span>
                      <span className="text-white font-extrabold">{isColombianHoliday(formData.date).holidayName}</span>
                    </div>
                  )}

                  {/* Popover Dropdown Panel - Custom Cyberpunk Calendar */}
                  {isDateOpen && (
                    <div className="absolute z-50 left-0 right-0 sm:-left-4 sm:w-[310px] mt-1.5 p-3.5 bg-slate-950/98 border border-indigo-500/60 rounded-3xl shadow-2xl shadow-indigo-950/90 backdrop-blur-2xl animate-in fade-in zoom-in-95 space-y-3">
                      
                      {/* Calendar Navigation Header */}
                      <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (calNavMonth === 0) {
                              setCalNavMonth(11);
                              setCalNavYear(prev => prev - 1);
                            } else {
                              setCalNavMonth(prev => prev - 1);
                            }
                          }}
                          className="p-1 hover:bg-indigo-600/30 text-indigo-300 rounded-lg transition-colors cursor-pointer"
                          title="Mes Anterior"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>

                        <div className="text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-cyan-200 to-indigo-100 flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-cyan-400 inline" />
                          <span>{SPANISH_MONTHS[calNavMonth]} {calNavYear}</span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            if (calNavMonth === 11) {
                              setCalNavMonth(0);
                              setCalNavYear(prev => prev + 1);
                            } else {
                              setCalNavMonth(prev => prev + 1);
                            }
                          }}
                          className="p-1 hover:bg-indigo-600/30 text-indigo-300 rounded-lg transition-colors cursor-pointer"
                          title="Mes Siguiente"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Quick Date Preset Chips */}
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date();
                            const todayIso = getHotelCurrentDateIso();
                            setFormData(prev => ({ ...prev, date: todayIso }));
                            setCalNavYear(today.getFullYear());
                            setCalNavMonth(today.getMonth());
                            setIsDateOpen(false);
                          }}
                          className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 rounded-xl text-[10px] font-bold text-indigo-200 text-center cursor-pointer transition-all shadow-2xs"
                        >
                          🗓️ Hoy Mismo
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const tom = new Date();
                            tom.setDate(tom.getDate() + 1);
                            const tomIso = getLocalDateString(tom);
                            setFormData(prev => ({ ...prev, date: tomIso }));
                            setCalNavYear(tom.getFullYear());
                            setCalNavMonth(tom.getMonth());
                            setIsDateOpen(false);
                          }}
                          className="p-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 border border-indigo-500/40 rounded-xl text-[10px] font-bold text-indigo-200 text-center cursor-pointer transition-all shadow-2xs"
                        >
                          ⚡ Mañana
                        </button>
                      </div>

                      {/* Days of Week Header */}
                      <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-black text-cyan-400/80 uppercase tracking-tight">
                        <span>D</span>
                        <span>L</span>
                        <span>M</span>
                        <span>M</span>
                        <span>J</span>
                        <span>V</span>
                        <span>S</span>
                      </div>

                      {/* Calendar Days Grid */}
                      <div className="grid grid-cols-7 gap-1">
                        {getCalendarDays(calNavYear, calNavMonth, formData.date).map((cell, idx) => (
                          <button
                            type="button"
                            key={idx}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, date: cell.dateIso }));
                              setIsDateOpen(false);
                            }}
                            className={`h-7 w-7 rounded-xl font-extrabold text-[11px] flex flex-col items-center justify-center transition-all cursor-pointer mx-auto relative ${
                              cell.isSelected
                                ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white font-black shadow-md shadow-indigo-500/60 ring-2 ring-cyan-300 scale-110 z-10'
                                : cell.isHoliday
                                ? 'bg-rose-500/30 text-rose-100 border border-rose-500/60 font-black ring-1 ring-rose-400/50 hover:bg-rose-500/50'
                                : cell.isToday
                                ? 'bg-indigo-900/60 text-indigo-200 border border-indigo-400/60 font-black'
                                : cell.isCurrentMonth
                                ? 'text-slate-200 hover:bg-indigo-600/30 hover:text-white'
                                : 'text-slate-600 hover:text-slate-400'
                            }`}
                            title={cell.isHoliday ? `🇨🇴 Festivo Colombia: ${cell.holidayName} (${cell.dateIso})` : cell.dateIso}
                          >
                            <span>{cell.dayNum}</span>
                            {cell.isHoliday && !cell.isSelected && (
                              <span className="text-[7px] leading-none absolute -top-1 -right-1 bg-rose-600 text-white rounded-full px-0.5 border border-rose-300">
                                🇨🇴
                              </span>
                            )}
                          </button>
                        ))}
                      </div>

                      {/* Selected Date & Colombian Holiday Info */}
                      {isColombianHoliday(formData.date).isHoliday && (
                        <div className="p-2 bg-rose-500/20 border border-rose-500/40 rounded-xl text-[10px] text-rose-200 font-bold flex items-center justify-between gap-1 animate-pulse">
                          <span className="flex items-center gap-1">
                            <span>🇨🇴 Festivo:</span>
                            <strong className="text-white">{isColombianHoliday(formData.date).holidayName}</strong>
                          </span>
                        </div>
                      )}

                      {/* Selected Date Confirmation Info */}
                      <div className="pt-2 border-t border-indigo-500/20 flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 truncate">
                          Elegido: <strong className="text-cyan-300">{formData.date}</strong>
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsDateOpen(false)}
                          className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg cursor-pointer shadow-2xs"
                        >
                          Confirmar
                        </button>
                      </div>

                    </div>
                  )}
                </div>

                {/* 2. DESPLEGABLE DE HORA INICIO */}
                <div className="relative">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Hora Inicio:</span>
                    </span>
                    <span className="text-[10px] text-amber-400 font-semibold">Tecnológica</span>
                  </label>

                  {/* Trigger Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsStartTimeOpen(prev => !prev);
                      setIsEndTimeOpen(false);
                      setIsDateOpen(false);
                    }}
                    className="w-full px-3 py-2.5 bg-slate-900/90 dark:bg-slate-950/90 border border-amber-500/40 hover:border-amber-400 rounded-2xl text-slate-100 font-bold text-xs flex items-center justify-between shadow-md shadow-amber-950/40 transition-all cursor-pointer group"
                  >
                    <span className="truncate flex items-center gap-1.5 text-amber-200">
                      <span>{formatTimeLabel(formData.startTime)}</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 text-amber-400 transition-transform duration-200 ${isStartTimeOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Popover Dropdown Panel */}
                  {isStartTimeOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1.5 p-3 bg-slate-900/95 border border-amber-500/50 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 space-y-2.5 min-w-[220px]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center justify-between">
                        <span>Horarios de Inicio Comunes:</span>
                        <button 
                          type="button" 
                          onClick={() => setIsStartTimeOpen(false)}
                          className="text-slate-400 hover:text-white"
                        >✕</button>
                      </div>

                      {/* Lista de Turnos Frecuentes */}
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                        {[
                          { time: '06:00', label: '🌅 06:00 a.m. (Turno Mañana)' },
                          { time: '07:00', label: '⚙️ 07:00 a.m. (Personalizado)' },
                          { time: '08:00', label: '🏢 08:00 a.m. (Jornada Diurna)' },
                          { time: '10:00', label: '👔 10:00 a.m. (Horario Supervisor)' },
                          { time: '13:00', label: '☀️ 01:00 p.m. (Turno Tarde)' },
                          { time: '22:00', label: '🌙 10:00 p.m. (Turno Noche)' },
                          { time: '00:00', label: '🏢 00:00 a.m. (Turno Intermedio)' }
                        ].map(opt => (
                          <button
                            type="button"
                            key={opt.time}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, startTime: opt.time }));
                              setIsStartTimeOpen(false);
                            }}
                            className={`w-full p-2 rounded-xl text-[11px] font-bold text-left transition-all flex items-center justify-between cursor-pointer border ${
                              formData.startTime === opt.time
                                ? 'bg-amber-500/30 border-amber-400 text-amber-200 ring-1 ring-amber-400'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {formData.startTime === opt.time && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                          </button>
                        ))}
                      </div>

                      {/* Custom Glassmorphic Hour & Minute Quick Selector (NO native OS clock) */}
                      <div className="pt-2.5 border-t border-slate-800 space-y-2">
                        <div className="text-[10px] font-bold text-amber-400 flex items-center justify-between">
                          <span>Selector Digital de Hora Exacta:</span>
                          <span className="text-amber-200 font-mono text-xs font-extrabold px-2 py-0.5 bg-amber-500/20 rounded-lg border border-amber-500/40 shadow-2xs">
                            {formData.startTime}
                          </span>
                        </div>

                        {/* Grid de Horas Comunes */}
                        <div className="grid grid-cols-5 gap-1">
                          {[
                            { h: '06', label: '6 am' },
                            { h: '07', label: '7 am' },
                            { h: '08', label: '8 am' },
                            { h: '09', label: '9 am' },
                            { h: '10', label: '10 am' },
                            { h: '12', label: '12 pm' },
                            { h: '13', label: '1 pm' },
                            { h: '14', label: '2 pm' },
                            { h: '15', label: '3 pm' },
                            { h: '22', label: '10 pm' },
                          ].map(item => {
                            const isCurrentH = formData.startTime.startsWith(item.h + ':');
                            return (
                              <button
                                type="button"
                                key={item.h}
                                onClick={() => {
                                  const curM = formData.startTime.split(':')[1] || '00';
                                  setFormData(prev => ({ ...prev, startTime: `${item.h}:${curM}` }));
                                }}
                                className={`py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                  isCurrentH
                                    ? 'bg-amber-500 text-slate-950 font-black ring-1 ring-amber-300 scale-105 shadow-sm'
                                    : 'bg-slate-950/80 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:border-amber-500/40'
                                }`}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Selector de Minutos */}
                        <div className="flex items-center space-x-1 pt-1">
                          <span className="text-[9px] text-slate-400 font-bold mr-1">Min:</span>
                          {['00', '15', '30', '45'].map(m => {
                            const curH = formData.startTime.split(':')[0] || '08';
                            const isCurrentM = formData.startTime.endsWith(':' + m);
                            return (
                              <button
                                type="button"
                                key={m}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, startTime: `${curH}:${m}` }));
                                }}
                                className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  isCurrentM
                                    ? 'bg-cyan-500 text-slate-950 font-black shadow-xs ring-1 ring-cyan-300'
                                    : 'bg-slate-950/80 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:border-cyan-500/40'
                                }`}
                              >
                                :{m}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. DESPLEGABLE DE HORA FIN */}
                <div className="relative">
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>Hora Fin:</span>
                    </span>
                    <span className="text-[10px] text-blue-400 font-semibold">Tecnológica</span>
                  </label>

                  {/* Trigger Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsEndTimeOpen(prev => !prev);
                      setIsStartTimeOpen(false);
                      setIsDateOpen(false);
                    }}
                    className="w-full px-3 py-2.5 bg-slate-900/90 dark:bg-slate-950/90 border border-blue-500/40 hover:border-blue-400 rounded-2xl text-slate-100 font-bold text-xs flex items-center justify-between shadow-md shadow-blue-950/40 transition-all cursor-pointer group"
                  >
                    <span className="truncate flex items-center gap-1.5 text-blue-200">
                      <span>{formatTimeLabel(formData.endTime)}</span>
                    </span>
                    <ChevronDown className={`w-4 h-4 text-blue-400 transition-transform duration-200 ${isEndTimeOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Popover Dropdown Panel */}
                  {isEndTimeOpen && (
                    <div className="absolute z-50 left-0 right-0 mt-1.5 p-3 bg-slate-900/95 border border-blue-500/50 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 space-y-2.5 min-w-[220px]">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-blue-400 flex items-center justify-between">
                        <span>Horarios de Fin Comunes:</span>
                        <button 
                          type="button" 
                          onClick={() => setIsEndTimeOpen(false)}
                          className="text-slate-400 hover:text-white"
                        >✕</button>
                      </div>

                      {/* Lista de Horarios Fin Frecuentes */}
                      <div className="space-y-1 max-h-48 overflow-y-auto pr-1 scrollbar-thin">
                        {[
                          { time: '14:00', label: '🌅 02:00 p.m. (Fin Mañana)' },
                          { time: '15:00', label: '⚙️ 03:00 p.m. (Fin Personalizado)' },
                          { time: '17:00', label: '🏢 05:00 p.m. (Fin Diurno)' },
                          { time: '19:00', label: '👔 07:00 p.m. (Fin Supervisor)' },
                          { time: '21:00', label: '☀️ 09:00 p.m. (Fin Tarde)' },
                          { time: '22:00', label: '☀️ 10:00 p.m. (Fin Tarde 22h)' },
                          { time: '06:00', label: '🌙 06:00 a.m. (Fin Noche)' },
                          { time: '23:59', label: '🏢 11:59 p.m. (Fin Intermedio)' }
                        ].map(opt => (
                          <button
                            type="button"
                            key={opt.time}
                            onClick={() => {
                              setFormData(prev => ({ ...prev, endTime: opt.time }));
                              setIsEndTimeOpen(false);
                            }}
                            className={`w-full p-2 rounded-xl text-[11px] font-bold text-left transition-all flex items-center justify-between cursor-pointer border ${
                              formData.endTime === opt.time
                                ? 'bg-blue-500/30 border-blue-400 text-blue-200 ring-1 ring-blue-400'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <span>{opt.label}</span>
                            {formData.endTime === opt.time && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                          </button>
                        ))}
                      </div>

                      {/* Custom Glassmorphic Hour & Minute Quick Selector (NO native OS clock) */}
                      <div className="pt-2.5 border-t border-slate-800 space-y-2">
                        <div className="text-[10px] font-bold text-blue-400 flex items-center justify-between">
                          <span>Selector Digital de Hora Exacta:</span>
                          <span className="text-blue-200 font-mono text-xs font-extrabold px-2 py-0.5 bg-blue-500/20 rounded-lg border border-blue-500/40 shadow-2xs">
                            {formData.endTime}
                          </span>
                        </div>

                        {/* Grid de Horas Comunes Fin */}
                        <div className="grid grid-cols-5 gap-1">
                          {[
                            { h: '14', label: '2 pm' },
                            { h: '15', label: '3 pm' },
                            { h: '17', label: '5 pm' },
                            { h: '19', label: '7 pm' },
                            { h: '21', label: '9 pm' },
                            { h: '22', label: '10 pm' },
                            { h: '23', label: '11 pm' },
                            { h: '00', label: '12 am' },
                            { h: '06', label: '6 am' },
                            { h: '07', label: '7 am' },
                          ].map(item => {
                            const isCurrentH = formData.endTime.startsWith(item.h + ':');
                            return (
                              <button
                                type="button"
                                key={item.h}
                                onClick={() => {
                                  const curM = formData.endTime.split(':')[1] || '00';
                                  setFormData(prev => ({ ...prev, endTime: `${item.h}:${curM}` }));
                                }}
                                className={`py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer ${
                                  isCurrentH
                                    ? 'bg-blue-500 text-slate-950 font-black ring-1 ring-blue-300 scale-105 shadow-sm'
                                    : 'bg-slate-950/80 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:border-blue-500/40'
                                }`}
                              >
                                {item.label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Selector de Minutos */}
                        <div className="flex items-center space-x-1 pt-1">
                          <span className="text-[9px] text-slate-400 font-bold mr-1">Min:</span>
                          {['00', '15', '30', '45', '59'].map(m => {
                            const curH = formData.endTime.split(':')[0] || '17';
                            const isCurrentM = formData.endTime.endsWith(':' + m);
                            return (
                              <button
                                type="button"
                                key={m}
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, endTime: `${curH}:${m}` }));
                                }}
                                className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                  isCurrentM
                                    ? 'bg-cyan-500 text-slate-950 font-black shadow-xs ring-1 ring-cyan-300'
                                    : 'bg-slate-950/80 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:border-cyan-500/40'
                                }`}
                              >
                                :{m}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

              </div>

              {/* ÁREAS TÉCNICAS ASIGNADAS */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-rose-500" />
                  <span>Áreas Técnicas Asignadas:</span>
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2.5 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-300 dark:border-slate-700/80">
                  {TECHNICAL_AREAS_LIST.map(area => {
                    const isSelected = formData.assignedAreas.includes(area);
                    return (
                      <button
                        type="button"
                        key={area}
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            assignedAreas: isSelected
                              ? prev.assignedAreas.filter(a => a !== area)
                              : [...prev.assignedAreas, area]
                          }));
                        }}
                        className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                        }`}
                      >
                        {isSelected && '✓ '}
                        {area}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* INTERMEDIO TOGGLE */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center space-x-2.5">
                <input
                  type="checkbox"
                  id="isOnCallCheck"
                  checked={formData.isOnCall}
                  onChange={e => setFormData(prev => ({ ...prev, isOnCall: e.target.checked }))}
                  className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <label htmlFor="isOnCallCheck" className="text-slate-800 dark:text-slate-200 font-bold cursor-pointer text-xs">
                  🏢 Turno Intermedio / Jornada Intermedia
                </label>
              </div>

              {/* NOTAS */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                  Instrucciones o Notas Especiales del Turno:
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Ej. Revisión especial de chillers en el cambio de turno..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>

              {/* ACTIONS */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  {editingSchedule ? 'Guardar Cambios' : 'Asignar Turno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: GENERADOR MASIVO DE HORARIOS QUINCENALES (WIZARD) */}
      {/* ========================================================================= */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-5 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl">
                  <Zap className="w-5 h-5" />
                </div>
                <span>Wizard de Programación Quincenal</span>
              </h3>
              <button onClick={() => setIsBulkModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleRunBulkGenerator} className="space-y-4 text-xs">
              {/* QUINCENA PRESET BUTTONS */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                  <CalendarCheck className="w-4 h-4 text-purple-500" />
                  <span>Rango Quincenal Rápido:</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setFortnightPreset('q1')}
                    className="p-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 rounded-2xl font-bold text-center transition-all cursor-pointer"
                  >
                    🗓️ 1ª Quincena
                    <span className="block text-[10px] font-medium opacity-80">Días 1 al 15</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFortnightPreset('q2')}
                    className="p-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30 rounded-2xl font-bold text-center transition-all cursor-pointer"
                  >
                    🗓️ 2ª Quincena
                    <span className="block text-[10px] font-medium opacity-80">Días 16 al fin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFortnightPreset('next15')}
                    className="p-2.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 rounded-2xl font-bold text-center transition-all cursor-pointer"
                  >
                    ⚡ Próximos 15d
                    <span className="block text-[10px] font-medium opacity-80">Desde hoy</span>
                  </button>
                </div>
              </div>

              {/* TÉCNICOS INCLUIDOS CARDS */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-purple-500" />
                    <span>Técnicos a Programar:</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const allIds = technicianUsers.map(u => u.id);
                      setBulkData(prev => ({
                        ...prev,
                        technicianIds: prev.technicianIds.length === allIds.length ? [] : allIds
                      }));
                    }}
                    className="text-[10px] text-purple-500 dark:text-purple-400 font-bold hover:underline cursor-pointer"
                  >
                    {bulkData.technicianIds.length === technicianUsers.length ? 'Desmarcar Todos' : 'Marcar Todos'}
                  </button>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800">
                  {technicianUsers.map(u => {
                    const isSelected = bulkData.technicianIds.includes(u.id);
                    return (
                      <label key={u.id} className={`p-2 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-purple-500/15 border-purple-500/60 text-purple-300 font-bold' 
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                      }`}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={e => {
                            setBulkData(prev => ({
                              ...prev,
                              technicianIds: e.target.checked
                                ? [...prev.technicianIds, u.id]
                                : prev.technicianIds.filter(id => id !== u.id)
                            }));
                          }}
                          className="rounded text-purple-600 focus:ring-purple-500 w-4 h-4"
                        />
                        <span className="truncate text-xs">👤 {u.displayName}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* DATES */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Fecha Inicio:</label>
                  <input
                    type="date"
                    value={bulkData.startDate}
                    onChange={e => setBulkData(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-slate-100 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Fecha Fin:</label>
                  <input
                    type="date"
                    value={bulkData.endDate}
                    onChange={e => setBulkData(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-slate-100 font-semibold"
                  />
                </div>
              </div>

              {/* PATRÓN DE TURNOS CARDS */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-2 flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 text-purple-500" />
                  <span>Seleccionar Patrón de Turno Quincenal:</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                  {BULK_PATTERNS.map(pat => {
                    const isSelected = bulkData.pattern === pat.id;
                    return (
                      <button
                        type="button"
                        key={pat.id}
                        onClick={() => setBulkData(prev => ({ ...prev, pattern: pat.id as any }))}
                        className={`p-2.5 rounded-2xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-purple-600/20 border-purple-500 text-purple-200 ring-2 ring-purple-500 shadow-md'
                            : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-400'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{pat.icon} {pat.title}</span>
                          {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                        </div>
                        <p className="text-[10px] opacity-75 mt-0.5">{pat.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Generar Quincena
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: SOLICITAR PERMUTA / CAMBIO DE TURNO CON CARDS INTERACTIVAS */}
      {/* ========================================================================= */}
      {isSwapModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 max-w-lg w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl">
                  <ArrowRightLeft className="w-5 h-5" />
                </div>
                <span>Solicitar Cambio de Turno Quincenal</span>
              </h3>
              <button onClick={() => setIsSwapModalOpen(false)} className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSendSwapRequest} className="space-y-4 text-xs">
              {/* TURNO PROPIO A PERMUTAR */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-cyan-500" />
                  <span>Selecciona Tu Turno a Permutar:</span>
                </label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800">
                  {(schedules || [])
                    .filter(s => !currentUser || s.technicianId === currentUser.id || isAdmin)
                    .map(s => {
                      const isSelected = swapData.scheduleId === s.id;
                      const preset = SHIFT_PRESETS[s.shiftType];
                      return (
                        <button
                          type="button"
                          key={s.id}
                          onClick={() => setSwapData(prev => ({ ...prev, scheduleId: s.id }))}
                          className={`p-2.5 rounded-2xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-600/15 border-cyan-500 text-cyan-300 ring-2 ring-cyan-500 shadow-md'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <span className="text-base">{preset?.icon}</span>
                            <div className="min-w-0">
                              <div className="font-bold text-xs truncate">📅 {s.date} • {s.technicianName}</div>
                              <div className="text-[10px] opacity-75">{preset?.label} ({s.startTime} - {s.endTime})</div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* COMPAÑERO DESTINO CARDS */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-cyan-500" />
                  <span>Compañero con quien Permutar:</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800">
                  {technicianUsers
                    .filter(u => u.id !== currentUser?.id)
                    .map(u => {
                      const isSelected = swapData.targetTechnicianId === u.id;
                      return (
                        <button
                          type="button"
                          key={u.id}
                          onClick={() => setSwapData(prev => ({ ...prev, targetTechnicianId: u.id }))}
                          className={`p-2.5 rounded-2xl border text-left transition-all flex items-center space-x-3 cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-600/15 border-cyan-500 text-cyan-300 ring-2 ring-cyan-500 shadow-md'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center shrink-0 text-xs shadow-sm ${
                            isSelected ? 'bg-cyan-600 text-white' : 'bg-slate-200 dark:bg-slate-800'
                          }`}>
                            {u.displayName.substring(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-xs truncate">{u.displayName}</div>
                            <div className="text-[10px] opacity-75 truncate">{u.role || 'Técnico'}</div>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Motivo del Cambio:</label>
                <textarea
                  rows={2}
                  value={swapData.reason}
                  onChange={e => setSwapData(prev => ({ ...prev, reason: e.target.value }))}
                  placeholder="Ej. Cambio por asuntos médicos o personales..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-slate-100 font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSwapModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Enviar Solicitud
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: AGREGAR NUEVO PERSONAL / TÉCNICO AL SISTEMA */}
      {/* ========================================================================= */}
      {isAddPersonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <span>Agregar Nuevo Personal a Horarios</span>
              </h3>
              <button 
                onClick={() => setIsAddPersonModalOpen(false)} 
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePerson} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-emerald-500" />
                  <span>Nombre Completo del Personal / Técnico:</span>
                </label>
                <input
                  type="text"
                  required
                  value={newPersonData.displayName}
                  onChange={e => setNewPersonData(prev => ({ ...prev, displayName: e.target.value }))}
                  placeholder="Ej: Mauricio Gómez / Ferney Alonso"
                  className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-slate-100 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Wrench className="w-4 h-4 text-emerald-500" />
                    <span>Cargo / Especialidad:</span>
                  </span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Seleccionar</span>
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-slate-50 dark:bg-slate-950/80 rounded-2xl border border-slate-200 dark:border-slate-800">
                  {[
                    { id: 'Técnico de Mantenimiento', label: '🔧 Mantenimiento General', desc: 'Soporte global infraestructura' },
                    { id: 'Técnico Electromecánico', label: '⚡ Electromecánico', desc: 'Planta, tableros y bombas' },
                    { id: 'Técnico Plomero & Climatización', label: '💧 Plomero / Chiller', desc: 'Agua caliente, A/C y tuberías' },
                    { id: 'Técnico de Piscinas & Spa', label: '🏊 Piscinas & Spa', desc: 'Tratamiento químico y filtros' },
                    { id: 'Auxiliar de Ingeniería', label: '👷 Auxiliar de Ingeniería', desc: 'Asistencia y mantenimiento' },
                    { id: 'Administrador de Mantenimiento', label: '👑 Admin Mantenimiento', desc: 'Gestión y coordinación' }
                  ].map(role => {
                    const isSelected = newPersonData.roleTitle === role.id;
                    return (
                      <button
                        type="button"
                        key={role.id}
                        onClick={() => setNewPersonData(prev => ({ ...prev, roleTitle: role.id }))}
                        className={`p-2 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-emerald-600/20 border-emerald-500 text-emerald-200 font-bold shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-400/50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs truncate">{role.label}</div>
                          <div className="text-[9px] opacity-70 truncate">{role.desc}</div>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">PIN de Acceso (4 dígitos):</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newPersonData.pin}
                    onChange={e => setNewPersonData(prev => ({ ...prev, pin: e.target.value }))}
                    placeholder="1234"
                    className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-2xl text-slate-900 dark:text-slate-100 font-bold text-center tracking-widest"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Rol de Acceso:</label>
                  <div className="flex items-center space-x-1.5 p-1 bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700/80 rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setNewPersonData(prev => ({ ...prev, roleMode: 'técnico' }))}
                      className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        newPersonData.roleMode === 'técnico'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-white'
                      }`}
                    >
                      🛠️ Técnico
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewPersonData(prev => ({ ...prev, roleMode: 'admin' }))}
                      className={`flex-1 py-1.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        newPersonData.roleMode === 'admin'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'text-slate-600 dark:text-slate-400 hover:text-white'
                      }`}
                    >
                      👑 Admin
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddPersonModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold rounded-xl cursor-pointer hover:bg-slate-300 dark:hover:bg-slate-700"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Guardar Personal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
