export function formatShiftName(shift?: any, uppercase: boolean = false): string {
  if (shift === undefined || shift === null || shift === '') return '';
  const strShift = String(shift);
  const s = strShift.trim().toLowerCase();
  if (s === 'manana' || s === 'mañana') {
    return uppercase ? 'MAÑANA' : 'Mañana';
  }
  if (s === 'tarde') {
    return uppercase ? 'TARDE' : 'Tarde';
  }
  if (s === 'noche') {
    return uppercase ? 'NOCHE' : 'Noche';
  }
  return uppercase ? strShift.toUpperCase() : strShift;
}
