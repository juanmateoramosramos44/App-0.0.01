// Utility to compute and identify official Colombian Public Holidays (Festivos de Colombia)
// Based on Ley Emiliani (Ley 51 de 1983) and Colombian fixed/easter holiday calendars

interface HolidayInfo {
  dateIso: string; // YYYY-MM-DD
  name: string;
  type: 'fijo' | 'emiliani' | 'pascua';
}

// Calculate Easter Sunday for any year (Meeus/Jones/Butcher algorithm)
function getEasterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

// Format date to YYYY-MM-DD
function formatIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Ley Emiliani: If date is not Monday, move to the following Monday
function moveToNextMonday(d: Date): Date {
  const dayOfWeek = d.getDay(); // 0 = Sunday, 1 = Monday, ...
  if (dayOfWeek === 1) return d; // Already Monday
  const diff = (8 - dayOfWeek) % 7; // days until next Monday
  const result = new Date(d);
  result.setDate(result.getDate() + (diff === 0 ? 7 : diff));
  return result;
}

// Add days to date
function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
}

// Map cache for year -> record of YYYY-MM-DD -> Holiday Name
const holidaysCache: Record<number, Record<string, string>> = {};

export function getColombianHolidaysForYear(year: number): Record<string, string> {
  if (holidaysCache[year]) {
    return holidaysCache[year];
  }

  const holidays: Record<string, string> = {};

  // 1. Fixed Date Holidays (no Ley Emiliani)
  const fixedHolidays = [
    { m: 0, d: 1, name: 'Año Nuevo' },
    { m: 4, d: 1, name: 'Día del Trabajo' },
    { m: 6, d: 20, name: 'Día de la Independencia' },
    { m: 7, d: 7, name: 'Batalla de Boyacá' },
    { m: 11, d: 8, name: 'Inmaculada Concepción' },
    { m: 11, d: 25, name: 'Navidad' },
  ];

  fixedHolidays.forEach(fh => {
    const date = new Date(year, fh.m, fh.d);
    holidays[formatIso(date)] = fh.name;
  });

  // 2. Ley Emiliani Holidays (moved to next Monday if not Monday)
  const emilianiHolidays = [
    { m: 0, d: 6, name: 'Reyes Magos' },
    { m: 2, d: 19, name: 'San José' },
    { m: 5, d: 29, name: 'San Pedro y San Pablo' },
    { m: 7, d: 15, name: 'La Asunción de la Virgen' },
    { m: 9, d: 12, name: 'Día de la Raza' },
    { m: 10, d: 1, name: 'Todos los Santos' },
    { m: 10, d: 11, name: 'Independencia de Cartagena' },
  ];

  emilianiHolidays.forEach(eh => {
    const origDate = new Date(year, eh.m, eh.d);
    const actualDate = moveToNextMonday(origDate);
    holidays[formatIso(actualDate)] = eh.name;
  });

  // 3. Easter-relative Holidays
  const easter = getEasterSunday(year);

  // Jueves Santo (Easter - 3 days)
  const juevesSanto = addDays(easter, -3);
  holidays[formatIso(juevesSanto)] = 'Jueves Santo';

  // Viernes Santo (Easter - 2 days)
  const viernesSanto = addDays(easter, -2);
  holidays[formatIso(viernesSanto)] = 'Viernes Santo';

  // Ascensión del Señor (Easter + 43 days -> moved to Monday)
  const ascencion = addDays(easter, 43);
  holidays[formatIso(ascencion)] = 'Ascensión del Señor';

  // Corpus Christi (Easter + 64 days -> moved to Monday)
  const corpusChristi = addDays(easter, 64);
  holidays[formatIso(corpusChristi)] = 'Corpus Christi';

  // Sagrado Corazón (Easter + 71 days -> moved to Monday)
  const sagradoCorazon = addDays(easter, 71);
  holidays[formatIso(sagradoCorazon)] = 'Sagrado Corazón de Jesús';

  holidaysCache[year] = holidays;
  return holidays;
}

// Helper to check if an ISO date string (YYYY-MM-DD) is a Colombian Holiday
export function isColombianHoliday(dateIso: string): { isHoliday: boolean; holidayName?: string } {
  if (!dateIso) return { isHoliday: false };
  const parts = dateIso.split('-');
  if (parts.length < 3) return { isHoliday: false };
  const year = parseInt(parts[0], 10);
  if (isNaN(year)) return { isHoliday: false };

  const holidays = getColombianHolidaysForYear(year);
  const name = holidays[dateIso];
  if (name) {
    return { isHoliday: true, holidayName: name };
  }
  return { isHoliday: false };
}
