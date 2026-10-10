/**
 * Utilidades para manejo y formateo preciso de fechas y horas locales.
 * Evita la discrepancia entre fechas UTC (toISOString) y horas locales del usuario/hotel.
 */

export const getLocalDateTimeString = (date: Date = new Date()): string => {
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
};

export const getLocalDateString = (date: Date = new Date()): string => {
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getLocalTimeString = (date: Date = new Date()): string => {
  const d = date instanceof Date && !isNaN(date.getTime()) ? date : new Date();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const getHotelCurrentDateIso = (date: Date = new Date()): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(date);
  } catch (e) {
    return getLocalDateString(date);
  }
};

export const getHotelCurrentTimeStr = (date: Date = new Date()): string => {
  try {
    const formatter = new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false });
    return formatter.format(date);
  } catch (e) {
    return getLocalTimeString(date);
  }
};

/**
 * Convierte horas y minutos a formato legible 12 horas (ej. 07:35 a. m. / 03:15 p. m.)
 */
export const format12HourTime = (hours: number, minutes: number): string => {
  const period = hours >= 12 ? 'p. m.' : 'a. m.';
  const h12 = hours % 12 === 0 ? 12 : hours % 12;
  const hStr = String(h12).padStart(2, '0');
  const mStr = String(minutes).padStart(2, '0');
  return `${hStr}:${mStr} ${period}`;
};

export interface FormattedDateTime {
  dateLabel: string;
  timeLabel: string;
  fullFormatted: string;
  relativeLabel: string;
  isToday: boolean;
  isYesterday: boolean;
  isMorning: boolean;
}

const MONTH_NAMES_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTH_NAMES_FULL = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];

/**
 * Parsea y formatea de forma inequívoca una fecha/hora de solicitud o incidencia.
 * Acepta formatos como: "YYYY-MM-DD HH:mm", ISO strings, o timestamps.
 */
export const formatRequestDateTime = (rawStr?: string): FormattedDateTime => {
  if (!rawStr || typeof rawStr !== 'string') {
    return {
      dateLabel: 'Fecha no disponible',
      timeLabel: '--:--',
      fullFormatted: 'Sin fecha registrada',
      relativeLabel: 'Sin fecha',
      isToday: false,
      isYesterday: false,
      isMorning: true,
    };
  }

  let year: number;
  let monthIndex: number; // 0-11
  let day: number;
  let hours: number;
  let minutes: number;

  const standardMatch = rawStr.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
  if (standardMatch) {
    year = parseInt(standardMatch[1], 10);
    monthIndex = parseInt(standardMatch[2], 10) - 1;
    day = parseInt(standardMatch[3], 10);
    hours = parseInt(standardMatch[4], 10);
    minutes = parseInt(standardMatch[5], 10);
  } else {
    const parsed = new Date(rawStr);
    if (isNaN(parsed.getTime())) {
      return {
        dateLabel: rawStr,
        timeLabel: '',
        fullFormatted: rawStr,
        relativeLabel: rawStr,
        isToday: false,
        isYesterday: false,
        isMorning: true,
      };
    }
    year = parsed.getFullYear();
    monthIndex = parsed.getMonth();
    day = parsed.getDate();
    hours = parsed.getHours();
    minutes = parsed.getMinutes();
  }

  const timeLabel = format12HourTime(hours, minutes);
  const monthShort = MONTH_NAMES_SHORT[monthIndex] || '';
  const monthFull = MONTH_NAMES_FULL[monthIndex] || '';
  const dateLabel = `${day} ${monthShort} ${year}`;
  const fullFormatted = `${day} de ${monthFull} de ${year} a las ${timeLabel}`;

  // Verificar si es hoy o ayer relativo a la fecha local actual
  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  const isToday = year === todayYear && monthIndex === todayMonth && day === todayDay;

  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = year === yesterday.getFullYear() && monthIndex === yesterday.getMonth() && day === yesterday.getDate();

  let relativeLabel = `${day} ${monthShort}, ${timeLabel}`;
  if (isToday) {
    relativeLabel = `Hoy a las ${timeLabel}`;
  } else if (isYesterday) {
    relativeLabel = `Ayer a las ${timeLabel}`;
  }

  const isMorning = hours < 12;

  return {
    dateLabel,
    timeLabel,
    fullFormatted,
    relativeLabel,
    isToday,
    isYesterday,
    isMorning,
  };
};
