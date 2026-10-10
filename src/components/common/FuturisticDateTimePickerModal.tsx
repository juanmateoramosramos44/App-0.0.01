import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Check, 
  X, 
  Sparkles, 
  Zap,
  Sun,
  Sunset,
  Moon,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';

interface FuturisticDateTimePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  dateValue: string; // 'YYYY-MM-DD'
  timeValue: string; // 'HH:mm'
  onApply: (date: string, time: string) => void;
  initialTab?: 'date' | 'time';
}

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const FuturisticDateTimePickerModal: React.FC<FuturisticDateTimePickerModalProps> = ({
  isOpen,
  onClose,
  dateValue,
  timeValue,
  onApply,
  initialTab = 'date',
}) => {
  const [activeTab, setActiveTab] = useState<'date' | 'time'>(initialTab);

  // Selected date state
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (dateValue && dateValue.includes('-')) {
      return parseInt(dateValue.split('-')[0], 10);
    }
    return new Date().getFullYear();
  });

  const [selectedMonth, setSelectedMonth] = useState<number>(() => {
    if (dateValue && dateValue.includes('-')) {
      return parseInt(dateValue.split('-')[1], 10) - 1;
    }
    return new Date().getMonth();
  });

  const [selectedDay, setSelectedDay] = useState<number | null>(() => {
    if (dateValue && dateValue.includes('-')) {
      return parseInt(dateValue.split('-')[2], 10);
    }
    return new Date().getDate();
  });

  // Calendar browsing month/year
  const [viewYear, setViewYear] = useState<number>(selectedYear);
  const [viewMonth, setViewMonth] = useState<number>(selectedMonth);

  // Selected time state (12h format internally)
  const [selectedHour12, setSelectedHour12] = useState<number>(() => {
    if (timeValue && timeValue.includes(':')) {
      const h24 = parseInt(timeValue.split(':')[0], 10);
      return h24 % 12 || 12;
    }
    return 18; // 6 PM default
  });

  const [selectedMinute, setSelectedMinute] = useState<number>(() => {
    if (timeValue && timeValue.includes(':')) {
      return parseInt(timeValue.split(':')[1], 10);
    }
    return 0;
  });

  const [selectedAmPm, setSelectedAmPm] = useState<'AM' | 'PM'>(() => {
    if (timeValue && timeValue.includes(':')) {
      const h24 = parseInt(timeValue.split(':')[0], 10);
      return h24 >= 12 ? 'PM' : 'AM';
    }
    return 'PM';
  });

  const [hasTimeSelected, setHasTimeSelected] = useState<boolean>(Boolean(timeValue));

  // Sync state whenever modal opens or values change
  useEffect(() => {
    if (!isOpen) return;
    setActiveTab(initialTab);

    if (dateValue && dateValue.includes('-')) {
      const [y, m, d] = dateValue.split('-').map(Number);
      setSelectedYear(y);
      setSelectedMonth(m - 1);
      setSelectedDay(d);
      setViewYear(y);
      setViewMonth(m - 1);
    } else {
      const now = new Date();
      setSelectedYear(now.getFullYear());
      setSelectedMonth(now.getMonth());
      setSelectedDay(now.getDate());
      setViewYear(now.getFullYear());
      setViewMonth(now.getMonth());
    }

    if (timeValue && timeValue.includes(':')) {
      const [h24, min] = timeValue.split(':').map(Number);
      setSelectedHour12(h24 % 12 || 12);
      setSelectedMinute(min);
      setSelectedAmPm(h24 >= 12 ? 'PM' : 'AM');
      setHasTimeSelected(true);
    } else {
      setHasTimeSelected(false);
    }
  }, [isOpen, dateValue, timeValue, initialTab]);

  // Calendar matrix calculation
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(viewYear, viewMonth, 1);
    const lastDayOfMonth = new Date(viewYear, viewMonth + 1, 0);
    
    // Day of week (0: Sun -> 6, 1: Mon -> 0)
    let startDayIndex = firstDayOfMonth.getDay() - 1;
    if (startDayIndex === -1) startDayIndex = 6;

    const totalDays = lastDayOfMonth.getDate();
    const prevMonthLastDay = new Date(viewYear, viewMonth, 0).getDate();

    const days: Array<{
      day: number;
      month: number;
      year: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
    }> = [];

    const today = new Date();

    // Previous month padding
    for (let i = startDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const m = viewMonth === 0 ? 11 : viewMonth - 1;
      const y = viewMonth === 0 ? viewYear - 1 : viewYear;
      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false
      });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const isToday = 
        today.getDate() === d && 
        today.getMonth() === viewMonth && 
        today.getFullYear() === viewYear;

      const isSelected = 
        selectedDay === d && 
        selectedMonth === viewMonth && 
        selectedYear === viewYear;

      days.push({
        day: d,
        month: viewMonth,
        year: viewYear,
        isCurrentMonth: true,
        isToday,
        isSelected
      });
    }

    // Next month padding to fill grid (up to 35 or 42)
    const remaining = 42 - days.length;
    for (let d = 1; d <= remaining; d++) {
      const m = viewMonth === 11 ? 0 : viewMonth + 1;
      const y = viewMonth === 11 ? viewYear + 1 : viewYear;
      days.push({
        day: d,
        month: m,
        year: y,
        isCurrentMonth: false,
        isToday: false,
        isSelected: false
      });
    }

    return days;
  }, [viewYear, viewMonth, selectedDay, selectedMonth, selectedYear]);

  if (!isOpen) return null;

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(prev => prev - 1);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(prev => prev + 1);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const handleSelectDay = (day: number, month: number, year: number) => {
    setSelectedDay(day);
    setSelectedMonth(month);
    setSelectedYear(year);
    setViewMonth(month);
    setViewYear(year);
  };

  const handleQuickDatePreset = (daysOffset: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysOffset);
    setSelectedYear(target.getFullYear());
    setSelectedMonth(target.getMonth());
    setSelectedDay(target.getDate());
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
  };

  const handleQuickTimePreset = (h24: number, min: number = 0) => {
    setSelectedHour12(h24 % 12 || 12);
    setSelectedMinute(min);
    setSelectedAmPm(h24 >= 12 ? 'PM' : 'AM');
    setHasTimeSelected(true);
  };

  const handlePlusHours = (hoursToAdd: number) => {
    const now = new Date();
    now.setHours(now.getHours() + hoursToAdd);
    const h24 = now.getHours();
    setSelectedHour12(h24 % 12 || 12);
    setSelectedMinute(Math.round(now.getMinutes() / 5) * 5 % 60);
    setSelectedAmPm(h24 >= 12 ? 'PM' : 'AM');
    setHasTimeSelected(true);
  };

  const computed24Hour = () => {
    if (selectedAmPm === 'PM') {
      return selectedHour12 === 12 ? 12 : selectedHour12 + 12;
    } else {
      return selectedHour12 === 12 ? 0 : selectedHour12;
    }
  };

  const formattedDateResult = () => {
    if (!selectedDay) return '';
    const m = String(selectedMonth + 1).padStart(2, '0');
    const d = String(selectedDay).padStart(2, '0');
    return `${selectedYear}-${m}-${d}`;
  };

  const formattedTimeResult = () => {
    if (!hasTimeSelected) return '';
    const h24 = String(computed24Hour()).padStart(2, '0');
    const min = String(selectedMinute).padStart(2, '0');
    return `${h24}:${min}`;
  };

  const handleConfirm = () => {
    onApply(formattedDateResult(), formattedTimeResult());
    onClose();
  };

  const handleClear = () => {
    onApply('', '');
    onClose();
  };

  // Human readable preview text
  const previewSummary = () => {
    if (!selectedDay) return 'Sin fecha programada';
    const dateObj = new Date(selectedYear, selectedMonth, selectedDay);
    const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dateObj.getDay()];
    const monthName = MONTH_NAMES[selectedMonth];
    
    let timePart = '';
    if (hasTimeSelected) {
      const h12 = String(selectedHour12).padStart(2, '0');
      const min = String(selectedMinute).padStart(2, '0');
      timePart = ` a las ${h12}:${min} ${selectedAmPm}`;
    }

    return `${dayName} ${selectedDay} de ${monthName}, ${selectedYear}${timePart}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white/95 backdrop-blur-2xl border-2 border-emerald-400/30 shadow-[0_25px_60px_-15px_rgba(16,185,129,0.25)] rounded-3xl w-full max-w-md overflow-hidden flex flex-col text-slate-800 max-h-[95vh] ring-1 ring-emerald-500/20">
        
        {/* Futuristic Luminous Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white relative overflow-hidden shadow-sm flex items-center justify-between">
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-200 to-transparent animate-pulse"></div>
          <div className="absolute -right-10 -top-10 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

          <div className="flex items-center space-x-3 relative z-10">
            <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md text-white shadow-inner border border-white/30">
              <Sparkles className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm sm:text-base tracking-wide text-white flex items-center gap-1.5 drop-shadow-xs">
                <span>Configurar Fecha y Hora</span>
              </h3>
              <p className="text-[11px] text-emerald-100 font-medium tracking-wide">
                Programación Inteligente &amp; Precisa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-white/80 hover:text-white hover:bg-white/20 transition-all cursor-pointer relative z-10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: Fecha vs Hora */}
        <div className="p-3 bg-gradient-to-b from-slate-50 to-emerald-50/30 border-b border-emerald-100/70">
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-white rounded-2xl border border-emerald-200/60 shadow-xs">
            <button
              type="button"
              onClick={() => setActiveTab('date')}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'date'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25 ring-1 ring-emerald-400/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <CalendarIcon className="w-4 h-4" />
              <span>Fecha Límite</span>
              {selectedDay && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                  activeTab === 'date' 
                    ? 'bg-white/25 text-white font-bold' 
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {String(selectedDay).padStart(2, '0')}/{String(selectedMonth + 1).padStart(2, '0')}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('time');
                if (!hasTimeSelected) setHasTimeSelected(true);
              }}
              className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                activeTab === 'time'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25 ring-1 ring-emerald-400/40'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Hora Límite</span>
              {hasTimeSelected && (
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                  activeTab === 'time' 
                    ? 'bg-white/25 text-white font-bold' 
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {String(selectedHour12).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')} {selectedAmPm}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 bg-white">
          {activeTab === 'date' ? (
            /* ================= DATE PICKER TAB ================= */
            <div className="space-y-4">
              {/* Quick Presets Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickDatePreset(0)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-50 to-amber-100/60 hover:from-amber-100 hover:to-amber-200/60 border border-amber-300 text-amber-900 font-extrabold whitespace-nowrap flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-600" />
                  <span>Hoy</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDatePreset(1)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-300 text-emerald-900 font-extrabold whitespace-nowrap transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  <span>Mañana</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDatePreset(2)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-50 to-blue-50 hover:from-cyan-100 hover:to-blue-100 border border-cyan-300 text-cyan-900 font-extrabold whitespace-nowrap transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  <span>En 2 Días</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDatePreset(7)}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 border border-purple-300 text-purple-900 font-extrabold whitespace-nowrap transition-all active:scale-95 cursor-pointer shadow-xs"
                >
                  <span>En 1 Semana</span>
                </button>
              </div>

              {/* Month & Year Navigation Header */}
              <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/70 rounded-2xl border border-emerald-200 shadow-xs">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-100/60 transition-colors cursor-pointer"
                  title="Mes anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <div className="text-center">
                  <span className="text-sm font-black tracking-wide text-slate-800 uppercase font-mono">
                    {MONTH_NAMES[viewMonth]}
                  </span>
                  <span className="text-xs text-emerald-700 font-extrabold ml-2 px-2 py-0.5 bg-emerald-100/80 rounded-md">
                    {viewYear}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-2 rounded-xl text-slate-600 hover:text-emerald-700 hover:bg-emerald-100/60 transition-colors cursor-pointer"
                  title="Mes siguiente"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* Days of Week Header */}
              <div className="grid grid-cols-7 gap-1 text-center font-mono text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                {DAY_NAMES_SHORT.map((name, i) => (
                  <div key={i} className="py-1">{name}</div>
                ))}
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarDays.map((item, idx) => {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectDay(item.day, item.month, item.year)}
                      className={`h-9 sm:h-10 rounded-xl font-mono text-xs font-bold flex flex-col items-center justify-center relative transition-all active:scale-95 cursor-pointer ${
                        item.isSelected
                          ? 'bg-gradient-to-tr from-emerald-600 via-teal-600 to-cyan-500 text-white font-black shadow-md shadow-emerald-600/35 ring-2 ring-emerald-300 scale-105'
                          : item.isToday
                          ? 'bg-emerald-50 text-emerald-800 border-2 border-emerald-500 hover:bg-emerald-100 font-black'
                          : item.isCurrentMonth
                          ? 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 border border-transparent'
                          : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      <span>{item.day}</span>
                      {item.isToday && !item.isSelected && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 absolute bottom-1"></span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* ================= TIME PICKER TAB ================= */
            <div className="space-y-4">
              {/* Luminous Cyber Time Display Card (Light & Futuristic) */}
              <div className="bg-gradient-to-br from-emerald-50 via-teal-50/50 to-cyan-50 border-2 border-emerald-300/70 rounded-3xl p-5 text-center relative overflow-hidden shadow-xs">
                <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"></div>
                
                <div className="text-[11px] uppercase tracking-widest font-extrabold text-emerald-800/80 mb-2 flex items-center justify-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Hora Límite Programada</span>
                </div>

                <div className="flex items-center justify-center space-x-2 text-3xl sm:text-4xl font-mono font-black">
                  <div className="px-4 py-2 rounded-2xl bg-white border border-emerald-200 text-emerald-800 shadow-md">
                    {String(selectedHour12).padStart(2, '0')}
                  </div>
                  <span className="text-emerald-600 animate-pulse font-extrabold">:</span>
                  <div className="px-4 py-2 rounded-2xl bg-white border border-emerald-200 text-emerald-800 shadow-md">
                    {String(selectedMinute).padStart(2, '0')}
                  </div>

                  {/* AM / PM Toggle Badge */}
                  <div className="flex flex-col space-y-1.5 ml-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAmPm('AM');
                        setHasTimeSelected(true);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-black font-mono transition-all cursor-pointer ${
                        selectedAmPm === 'AM'
                          ? 'bg-amber-500 text-white shadow-md shadow-amber-500/30'
                          : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      AM
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedAmPm('PM');
                        setHasTimeSelected(true);
                      }}
                      className={`px-3 py-1 rounded-xl text-xs font-black font-mono transition-all cursor-pointer ${
                        selectedAmPm === 'PM'
                          ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30'
                          : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      PM
                    </button>
                  </div>
                </div>

                {/* 24-Hour equivalent badge */}
                <div className="mt-3 text-xs font-mono text-slate-600 font-medium">
                  Formato Militar 24h: <strong className="text-slate-900 font-extrabold">{String(computed24Hour()).padStart(2, '0')}:{String(selectedMinute).padStart(2, '0')}</strong>
                </div>
              </div>

              {/* Shift Presets */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                  Atajos de Turno / Horarios
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => handleQuickTimePreset(14, 0)}
                    className="p-2.5 rounded-2xl bg-amber-50/70 hover:bg-amber-100 border border-amber-200 text-left transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center space-x-1 text-amber-700 text-[11px] font-extrabold">
                      <Sun className="w-3.5 h-3.5" />
                      <span>Mañana</span>
                    </div>
                    <div className="text-xs font-black text-slate-800 mt-0.5">14:00 (2:00 PM)</div>
                    <div className="text-[10px] text-slate-500">Fin de Turno</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickTimePreset(22, 0)}
                    className="p-2.5 rounded-2xl bg-purple-50/70 hover:bg-purple-100 border border-purple-200 text-left transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center space-x-1 text-purple-700 text-[11px] font-extrabold">
                      <Sunset className="w-3.5 h-3.5" />
                      <span>Tarde</span>
                    </div>
                    <div className="text-xs font-black text-slate-800 mt-0.5">22:00 (10:00 PM)</div>
                    <div className="text-[10px] text-slate-500">Fin de Turno</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleQuickTimePreset(6, 0)}
                    className="p-2.5 rounded-2xl bg-cyan-50/70 hover:bg-cyan-100 border border-cyan-200 text-left transition-all active:scale-95 cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center space-x-1 text-cyan-700 text-[11px] font-extrabold">
                      <Moon className="w-3.5 h-3.5" />
                      <span>Noche</span>
                    </div>
                    <div className="text-xs font-black text-slate-800 mt-0.5">06:00 (6:00 AM)</div>
                    <div className="text-[10px] text-slate-500">Fin de Turno</div>
                  </button>
                </div>
              </div>

              {/* Hours Grid (1 to 12) */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                  Seleccionar Hora
                </div>
                <div className="grid grid-cols-6 gap-1.5 font-mono text-xs">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((hour) => (
                    <button
                      key={hour}
                      type="button"
                      onClick={() => {
                        setSelectedHour12(hour);
                        setHasTimeSelected(true);
                      }}
                      className={`h-9 rounded-xl font-bold transition-all active:scale-95 cursor-pointer ${
                        selectedHour12 === hour
                          ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-black shadow-md shadow-emerald-600/30'
                          : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200'
                      }`}
                    >
                      {String(hour).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Minutes Selector */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
                  Seleccionar Minutos
                </div>
                <div className="grid grid-cols-4 gap-2 font-mono text-xs">
                  {[0, 15, 30, 45].map((min) => (
                    <button
                      key={min}
                      type="button"
                      onClick={() => {
                        setSelectedMinute(min);
                        setHasTimeSelected(true);
                      }}
                      className={`py-2 rounded-xl font-bold transition-all active:scale-95 cursor-pointer ${
                        selectedMinute === min
                          ? 'bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-black shadow-md shadow-emerald-600/30'
                          : 'bg-slate-50 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800 border border-slate-200'
                      }`}
                    >
                      :{String(min).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Relative Hours */}
              <div className="flex items-center gap-2 pt-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => handlePlusHours(1)}
                  className="flex-1 py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition-all cursor-pointer font-bold"
                >
                  ⚡ +1 Hora
                </button>
                <button
                  type="button"
                  onClick={() => handlePlusHours(2)}
                  className="flex-1 py-2 px-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl transition-all cursor-pointer font-bold"
                >
                  ⚡ +2 Horas
                </button>
                <button
                  type="button"
                  onClick={() => setHasTimeSelected(false)}
                  className="py-2 px-3 bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 border border-slate-200 rounded-xl transition-all cursor-pointer font-medium"
                >
                  Sin Hora Fija
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Realtime Summary Preview Box */}
        <div className="px-5 py-3 bg-gradient-to-r from-emerald-50/80 via-teal-50/50 to-cyan-50/80 border-t border-emerald-100 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 truncate">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
            <span className="text-emerald-950 font-bold truncate">
              {previewSummary()}
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleClear}
            className="px-3.5 py-2 text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer flex items-center space-x-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Limpiar</span>
          </button>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-xl transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-md shadow-emerald-600/30 transition-all transform active:scale-95 cursor-pointer flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Confirmar y Aplicar</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
