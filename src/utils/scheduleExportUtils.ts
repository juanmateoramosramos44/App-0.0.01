import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TechnicianSchedule, User, HotelInfo, ShiftType } from '../types';

export interface DisplayedDay {
  dateIso: string;
  dayName: string;
  dayNum: number;
  monthName: string;
  isToday?: boolean;
  isHoliday?: boolean;
  holidayName?: string;
}

export type ScheduleTechnician = {
  id: string;
  displayName: string;
  role?: string;
  email?: string;
  department?: string;
};

export interface ScheduleExportParams {
  periodLabel: string;
  periodSublabel: string;
  displayedDays: DisplayedDay[];
  technicians: (User | ScheduleTechnician)[];
  schedules: TechnicianSchedule[];
  hotelInfo?: HotelInfo;
}

/**
 * Returns compact code and label for a shift in PDF / Excel
 */
export function getShiftCellInfo(schedule?: TechnicianSchedule | null): {
  code: string;
  label: string;
  hours: string;
  bgColor: [number, number, number];
  textColor: [number, number, number];
  isOff: boolean;
} {
  if (!schedule) {
    return {
      code: '---',
      label: 'Sin Turno',
      hours: '',
      bgColor: [248, 250, 252], // slate-50
      textColor: [148, 163, 184], // slate-400
      isOff: true
    };
  }

  const shift = schedule.shiftType;
  switch (shift) {
    case 'manana':
      return {
        code: 'M (06-15)',
        label: 'Mañana',
        hours: `${schedule.startTime || '06:00'}-${schedule.endTime || '15:00'}`,
        bgColor: [254, 243, 199], // amber-100
        textColor: [146, 64, 14], // amber-800
        isOff: false
      };
    case 'tarde':
      return {
        code: 'T (13-22)',
        label: 'Tarde',
        hours: `${schedule.startTime || '13:00'}-${schedule.endTime || '22:00'}`,
        bgColor: [219, 234, 254], // blue-100
        textColor: [30, 64, 175], // blue-800
        isOff: false
      };
    case 'noche':
      return {
        code: 'N (21-06)',
        label: 'Noche',
        hours: `${schedule.startTime || '21:00'}-${schedule.endTime || '06:00'}`,
        bgColor: [243, 232, 255], // purple-100
        textColor: [107, 33, 168], // purple-800
        isOff: false
      };
    case 'supervisor':
      return {
        code: 'SUP (10-19)',
        label: 'Supervisor',
        hours: `${schedule.startTime || '10:00'}-${schedule.endTime || '19:00'}`,
        bgColor: [204, 251, 241], // teal-100
        textColor: [17, 94, 89], // teal-800
        isOff: false
      };
    case 'diurno':
      return {
        code: 'INT (08-17)',
        label: 'Intermedia',
        hours: `${schedule.startTime || '08:00'}-${schedule.endTime || '17:00'}`,
        bgColor: [209, 250, 229], // emerald-100
        textColor: [6, 95, 70], // emerald-800
        isOff: false
      };
    case 'guardia_24h':
      return {
        code: 'INT',
        label: 'Turno Intermedio',
        hours: 'Intermedio',
        bgColor: [209, 250, 229], // emerald-100
        textColor: [6, 95, 70], // emerald-800
        isOff: false
      };
    case 'vacaciones':
      return {
        code: 'VAC',
        label: 'Vacaciones',
        hours: 'Vacaciones',
        bgColor: [224, 242, 254], // sky-100
        textColor: [3, 105, 161], // sky-700
        isOff: true
      };
    case 'stay':
      return {
        code: 'STAY',
        label: 'Stay',
        hours: 'Stay',
        bgColor: [237, 233, 254], // violet-100
        textColor: [109, 40, 217], // violet-700
        isOff: false
      };
    case 'cumpleanos':
      return {
        code: 'CUMP',
        label: 'Cumpleaños',
        hours: 'Cumpleaños',
        bgColor: [252, 231, 243], // pink-100
        textColor: [190, 24, 93], // pink-700
        isOff: true
      };
    case 'descanso':
    default:
      return {
        code: 'DESC',
        label: 'Descanso',
        hours: 'Libre',
        bgColor: [241, 245, 249], // slate-100
        textColor: [100, 116, 139], // slate-500
        isOff: true
      };
  }
}

export function getExportShiftHours(schedule?: TechnicianSchedule | null): number {
  if (!schedule || !schedule.shiftType || schedule.shiftType === 'descanso' || schedule.shiftType === 'vacaciones' || schedule.shiftType === 'cumpleanos') return 0;
  let start = schedule.startTime;
  let end = schedule.endTime;
  if (schedule.shiftType === 'manana') {
    if (!start) start = '06:00';
    if (!end || end === '14:00') end = '15:00';
  } else if (schedule.shiftType === 'noche') {
    if (!start || start === '09:00' || start === '9:00') start = '21:00';
    if (!end) end = '06:00';
  } else if (!start || !end) {
    if (schedule.shiftType === 'tarde') { start = '13:00'; end = '22:00'; }
    else if (schedule.shiftType === 'supervisor') { start = '10:00'; end = '19:00'; }
    else if (schedule.shiftType === 'diurno' || schedule.shiftType === 'guardia_24h') { start = '08:00'; end = '17:00'; }
    else { start = '08:00'; end = '17:00'; }
  }
  const [startH, startM = 0] = start.split(':').map(Number);
  const [endH, endM = 0] = end.split(':').map(Number);
  if (isNaN(startH) || isNaN(endH)) return 0;
  let normStartH = startH;
  if (schedule.shiftType === 'noche' && normStartH < 12) normStartH += 12;
  const startMins = normStartH * 60 + startM;
  let endMins = endH * 60 + endM;
  if (endMins <= startMins) endMins += 24 * 60;
  let diff = (endMins - startMins) / 60;
  if (diff > 14) diff = 9;
  return Math.round(diff * 10) / 10;
}

export function isScheduleForTechExport(
  s: TechnicianSchedule | null | undefined,
  tech: { id: string; displayName?: string; email?: string } | null | undefined
): boolean {
  if (!s || !tech) return false;
  if (s.technicianId && s.technicianId === tech.id) return true;
  if (!s.technicianName || !tech.displayName) return false;
  const sName = s.technicianName.toLowerCase().replace(/\/.*$/, '').replace(/técnico|supervisor|operador/gi, '').trim();
  const tName = tech.displayName.toLowerCase().replace(/\/.*$/, '').replace(/técnico|supervisor|operador/gi, '').trim();
  return sName === tName || s.technicianName.toLowerCase().trim() === tech.displayName.toLowerCase().trim();
}

/**
 * Generates and downloads the official institutional hotel shift schedule PDF
 */
export function downloadSchedulePdf(params: ScheduleExportParams): void {
  const { periodLabel, periodSublabel, displayedDays, technicians, schedules, hotelInfo } = params;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const marginX = 8;
  let currentY = 8;

  const hotelName = (hotelInfo?.hotelName || 'HOTEL MANTENIMIENTO & OPERACIONES').toUpperCase();

  // --- 1. INSTITUTIONAL HEADER BAR ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.roundedRect(marginX, currentY, pageWidth - marginX * 2, 22, 2, 2, 'F');

  // Left Icon Badge
  doc.setFillColor(79, 70, 229); // indigo-600
  doc.roundedRect(marginX + 3, currentY + 3, 16, 16, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('H', marginX + 8, currentY + 14);

  // Hotel & Department Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(255, 255, 255);
  doc.text(hotelName, marginX + 22, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(199, 210, 254); // indigo-200
  doc.text('DEPARTAMENTO DE MANTENIMIENTO E INGENIERÍA HOTELERA', marginX + 22, currentY + 13);
  doc.text('PROGRAMACIÓN OFICIAL DE TURNOS • VIGILANCIA Y OPERACIÓN TÉCNICA 24/7', marginX + 22, currentY + 18);

  // Right Metadata Box
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text('FORMATO OFICIAL: FOR-MNT-TUR-01', pageWidth - marginX - 5, currentY + 7, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(226, 232, 240); // slate-200
  doc.text(`Período: ${periodLabel} (${periodSublabel})`, pageWidth - marginX - 5, currentY + 12, { align: 'right' });
  doc.text(`Emisión: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`, pageWidth - marginX - 5, currentY + 17, { align: 'right' });

  currentY += 24;

  // --- 2. NOMENCLATURE & CONVENCIONES BANNER ---
  doc.setFillColor(241, 245, 249); // slate-100
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.roundedRect(marginX, currentY, pageWidth - marginX * 2, 7, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85); // slate-700
  doc.text('CONVENCIONES:', marginX + 3, currentY + 4.8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  const legendItems = [
    { label: 'M: Mañana (06:00-15:00)', color: [146, 64, 14] as [number, number, number] },
    { label: 'T: Tarde (13:00-22:00)', color: [30, 64, 175] as [number, number, number] },
    { label: 'N: Noche (21:00-06:00)', color: [107, 33, 168] as [number, number, number] },
    { label: 'SUP: Supervisor (10:00-19:00)', color: [17, 94, 89] as [number, number, number] },
    { label: 'INT: Turno Intermedio (08:00-17:00)', color: [6, 95, 70] as [number, number, number] },
    { label: 'DESC: Descanso', color: [100, 116, 139] as [number, number, number] }
  ];

  let legendX = marginX + 26;
  legendItems.forEach(item => {
    doc.setTextColor(item.color[0], item.color[1], item.color[2]);
    doc.text(item.label, legendX, currentY + 4.8);
    legendX += doc.getTextWidth(item.label) + 6;
  });

  currentY += 9;

  // Banner para Festivos Registrados del Periodo si existen
  const holidaysInPeriod = displayedDays.filter(d => d.isHoliday);
  if (holidaysInPeriod.length > 0) {
    doc.setFillColor(254, 242, 242); // rose-50
    doc.setDrawColor(252, 165, 165); // rose-300
    doc.roundedRect(marginX, currentY, pageWidth - marginX * 2, 7, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(185, 28, 28); // rose-700
    doc.text('DÍAS FESTIVOS REGISTRADOS EN EL PERÍODO:', marginX + 3, currentY + 4.8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(127, 29, 29); // rose-900
    
    const holidayStrings = holidaysInPeriod.map(h => `${h.dayName} ${h.dayNum}: ${h.holidayName || 'Festivo'}`);
    doc.text(holidayStrings.join('   |   '), marginX + 76, currentY + 4.8);

    currentY += 9;
  }

  // --- 3. SCHEDULE TABLE (via autoTable) ---
  const tableHead = [
    [
      { content: 'N°', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'Colaborador / Técnico', rowSpan: 2, styles: { halign: 'left' as const, valign: 'middle' as const } },
      { content: 'Cargo', rowSpan: 2, styles: { halign: 'left' as const, valign: 'middle' as const } },
      { content: `DÍAS DE LA ${periodSublabel.toUpperCase()}`, colSpan: displayedDays.length, styles: { halign: 'center' as const } },
      { content: 'TOTALES', colSpan: 2, styles: { halign: 'center' as const } }
    ],
    [
      ...displayedDays.map(d => ({
        content: d.isHoliday 
          ? `FESTIVO\n${d.dayName.toUpperCase()}\n${d.dayNum}`
          : `${d.dayName.toUpperCase()}\n${d.dayNum}`,
        styles: {
          halign: 'center' as const,
          valign: 'middle' as const,
          fontSize: d.isHoliday ? 5.2 : 6,
          fillColor: d.isHoliday ? [225, 29, 72] as [number, number, number] : [51, 65, 85] as [number, number, number], // rose-600 for holidays, slate-700 for regular days
          textColor: [255, 255, 255] as [number, number, number],
          fontStyle: 'bold' as const
        }
      })),
      { content: 'Turnos', styles: { halign: 'center' as const, valign: 'middle' as const } },
      { content: 'Desc.', styles: { halign: 'center' as const, valign: 'middle' as const } }
    ]
  ];

  const cellColorMap: Record<string, { bg: [number, number, number]; text: [number, number, number] }> = {};

  const tableBody = technicians.map((tech, techIdx) => {
    let workedCount = 0;
    let restCount = 0;

    const rowCells: any[] = [
      `${techIdx + 1}`,
      tech.displayName || tech.email || 'Técnico',
      tech.role === 'admin' ? 'Administrador' : (tech.role || 'Técnico')
    ];

    displayedDays.forEach((day, dayIdx) => {
      // Find shift matching technician id or exact display name
      const sched = schedules.find(s => s && s.date === day.dateIso && isScheduleForTechExport(s, tech));

      const cellInfo = getShiftCellInfo(sched);
      if (cellInfo.isOff) restCount++;
      else workedCount++;

      const cellKey = `${techIdx}_${dayIdx + 3}`;
      cellColorMap[cellKey] = { bg: cellInfo.bgColor, text: cellInfo.textColor };

      // Generate much clearer and informative multi-line content
      let pdfCellText = '';
      if (!sched) {
        pdfCellText = '---\nLibre';
      } else {
        const shift = sched.shiftType;
        const start = sched.startTime || '';
        const end = sched.endTime || '';
        const hoursStr = start && end ? `${start}-${end}` : '';

        switch (shift) {
          case 'manana':
            pdfCellText = `M\n${hoursStr || '06:00-15:00'}\nMañana`;
            break;
          case 'tarde':
            pdfCellText = `T\n${hoursStr || '13:00-22:00'}\nTarde`;
            break;
          case 'noche':
            pdfCellText = `N\n${hoursStr || '21:00-06:00'}\nNoche`;
            break;
          case 'supervisor':
            pdfCellText = `SUP\n${hoursStr || '10:00-19:00'}\nSuperv`;
            break;
          case 'diurno':
          case 'guardia_24h':
            pdfCellText = `INT\n${hoursStr || '08:00-17:00'}\nInterm`;
            break;
          case 'vacaciones':
            pdfCellText = `VAC\nVacaciones`;
            break;
          case 'stay':
            pdfCellText = `STAY\n${hoursStr || 'Stay'}`;
            break;
          case 'cumpleanos':
            pdfCellText = `CUMP\nCumpleaños`;
            break;
          case 'descanso':
          default:
            pdfCellText = `DESC\nLibre\nDescanso`;
            break;
        }
      }

      rowCells.push({
        content: pdfCellText,
        styles: {
          halign: 'center' as const,
          valign: 'middle' as const,
          fontSize: 4.6,
          fontStyle: 'bold' as const,
          cellPadding: [1.2, 0.3]
        }
      });
    });

    rowCells.push({
      content: `${workedCount}`,
      styles: { halign: 'center' as const, fontStyle: 'bold' as const, textColor: [30, 64, 175] as [number, number, number], fontSize: 6.5 }
    });
    rowCells.push({
      content: `${restCount}`,
      styles: { halign: 'center' as const, fontStyle: 'bold' as const, textColor: [100, 116, 139] as [number, number, number], fontSize: 6.5 }
    });

    return rowCells;
  });

  // Calculate daily coverage totals
  const coverageRow: any[] = [
    { content: 'Personal en Turno:', colSpan: 3, styles: { halign: 'right' as const, fontStyle: 'bold' as const, fontSize: 6 } }
  ];

  displayedDays.forEach(day => {
    const activeTechs = technicians.filter(tech => {
      const s = schedules.find(x => x && x.date === day.dateIso && isScheduleForTechExport(x, tech));
      return s && s.shiftType !== 'descanso';
    }).length;

    coverageRow.push({
      content: `${activeTechs}`,
      styles: { 
        halign: 'center' as const, 
        fontStyle: 'bold' as const, 
        fillColor: [241, 245, 249] as [number, number, number], 
        textColor: [15, 23, 42] as [number, number, number],
        fontSize: 6.5
      }
    });
  });

  // Totals column in coverage row
  coverageRow.push({ content: '-', styles: { halign: 'center' as const } });
  coverageRow.push({ content: '-', styles: { halign: 'center' as const } });

  tableBody.push(coverageRow);

  // Column width calculations (optimized for maximum day column width and zero line breaking)
  const numDays = displayedDays.length;
  const fixedWidths = 6 + 32 + 22 + 10 + 10; // 80mm
  const availableForDays = (pageWidth - marginX * 2) - fixedWidths;
  const dayColWidth = Math.max(8, availableForDays / numDays);

  const dynamicColumnStyles: Record<string, any> = {
    0: { cellWidth: 6, halign: 'center' },
    1: { cellWidth: 32, fontStyle: 'bold', fontSize: 6.5 },
    2: { cellWidth: 22, fontSize: 5.5 }
  };
  for (let i = 0; i < numDays; i++) {
    dynamicColumnStyles[String(i + 3)] = { cellWidth: dayColWidth, halign: 'center' };
  }
  dynamicColumnStyles[String(numDays + 3)] = { cellWidth: 10, halign: 'center' };
  dynamicColumnStyles[String(numDays + 4)] = { cellWidth: 10, halign: 'center' };

  autoTable(doc, {
    startY: currentY,
    head: tableHead,
    body: tableBody,
    theme: 'grid',
    styles: {
      fontSize: 6,
      cellPadding: 1,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6
    },
    columnStyles: dynamicColumnStyles,
    didParseCell: (data) => {
      if (data.section === 'body') {
        const key = `${data.row.index}_${data.column.index}`;
        if (cellColorMap[key]) {
          data.cell.styles.fillColor = cellColorMap[key].bg;
          data.cell.styles.textColor = cellColorMap[key].text;
        }

        // Highlight cells belonging to a holiday column
        const colIdx = data.column.index;
        if (colIdx >= 3 && colIdx < 3 + displayedDays.length) {
          const day = displayedDays[colIdx - 3];
          if (day.isHoliday) {
            data.cell.styles.lineColor = [244, 63, 94]; // rose-500
            data.cell.styles.lineWidth = 0.45; // slightly thicker border
          }
        }
      }
    },
    margin: { left: marginX, right: marginX }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || currentY + 80;
  const signatureY = Math.min(finalY + 12, pageHeight - 32);

  // --- 4. SIGNATURES & APPROVAL SECTION ---
  const sigBoxWidth = 80;
  const sigSpacing = (pageWidth - marginX * 2 - sigBoxWidth * 3) / 2;

  // Box 1: Elaborado Por (Jefe de Mantenimiento)
  const sig1X = marginX;
  doc.setDrawColor(148, 163, 184); // slate-400
  doc.line(sig1X + 5, signatureY + 12, sig1X + sigBoxWidth - 5, signatureY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('ELABORADO POR:', sig1X + 5, signatureY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Juan Mateo Ramos', sig1X + 5, signatureY + 20);

  // Box 2: Aprobado Por (Gerencia)
  const sig2X = sig1X + sigBoxWidth + sigSpacing;
  doc.line(sig2X + 5, signatureY + 12, sig2X + sigBoxWidth - 5, signatureY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('APROBADO POR:', sig2X + 5, signatureY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Gerencia General', sig2X + 5, signatureY + 20);
  doc.text('Dirección y Operaciones', sig2X + 5, signatureY + 23.5);

  // Box 3: Registro y Notificación (Recepción / Operaciones)
  const sig3X = sig2X + sigBoxWidth + sigSpacing;
  doc.line(sig3X + 5, signatureY + 12, sig3X + sigBoxWidth - 5, signatureY + 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text('NOTIFICADO A OPERACIONES:', sig3X + 5, signatureY + 16);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.text('Mauricio Marín', sig3X + 5, signatureY + 20);
  doc.text('Recepción & Operaciones', sig3X + 5, signatureY + 23.5);

  // --- 5. FOOTER ---
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(
    `Documento oficial generado desde la plataforma de Mantenimiento Hotelero • Software de Gestión Técnica • Página 1 de 1`,
    pageWidth / 2,
    pageHeight - 4,
    { align: 'center' }
  );

  const cleanFileName = `Programacion_Turnos_${periodLabel.replace(/\s+/g, '_')}_${periodSublabel.replace(/\s+/g, '_')}.pdf`;
  doc.save(cleanFileName);
}

/**
 * Generates and downloads the official shift schedule as an Excel (.xlsx) matrix
 */
export async function downloadScheduleExcel(params: ScheduleExportParams): Promise<void> {
  const { periodLabel, periodSublabel, displayedDays, technicians, schedules, hotelInfo } = params;

  const XLSX = await import('xlsx');
  const hotelName = (hotelInfo?.hotelName || 'HOTEL MANTENIMIENTO').toUpperCase();

  const sheetData: any[][] = [];

  // Header Title Rows
  sheetData.push([hotelName]);
  sheetData.push(['DEPARTAMENTO DE MANTENIMIENTO E INGENIERÍA HOTELERA']);
  sheetData.push([`PROGRAMACIÓN OFICIAL DE TURNOS - PERÍODO: ${periodLabel} (${periodSublabel})`]);
  sheetData.push([`Fecha de Generación: ${new Date().toLocaleDateString('es-CO')} ${new Date().toLocaleTimeString('es-CO')}`]);
  sheetData.push([]); // blank separator

  // Table Column Headers
  const headerRow = [
    'N°',
    'Colaborador / Técnico',
    'Cargo',
    ...displayedDays.map(d => `${d.dayName} ${d.dayNum}${d.isHoliday ? ' (Festivo)' : ''}`),
    'Total Turnos',
    'Total Horas',
    'Total Descansos'
  ];
  sheetData.push(headerRow);

  // Technician Rows
  technicians.forEach((tech, idx) => {
    let workedCount = 0;
    let restCount = 0;
    let totalHours = 0;

    const row = [
      idx + 1,
      tech.displayName || tech.email || 'Técnico',
      tech.role === 'admin' ? 'Administrador' : (tech.role || 'Técnico')
    ];

    displayedDays.forEach(day => {
      const sched = schedules.find(s => 
        (s.technicianId === tech.id || 
         (!s.technicianId && s.technicianName && tech.displayName && s.technicianName.toLowerCase().trim() === tech.displayName.toLowerCase().trim())
        ) && s.date === day.dateIso
      );

      const cellInfo = getShiftCellInfo(sched);
      if (cellInfo.isOff) restCount++;
      else {
        workedCount++;
        totalHours += getExportShiftHours(sched);
      }

      row.push(cellInfo.code);
    });

    row.push(workedCount);
    row.push(Math.round(totalHours * 10) / 10);
    row.push(restCount);
    sheetData.push(row);
  });

  // Daily Coverage Summary Row
  const coverageRow: any[] = ['-', 'PERSONAL ACTIVO EN TURNO', '-'];
  displayedDays.forEach(day => {
    const active = technicians.filter(tech => {
      const s = schedules.find(x => 
        (x.technicianId === tech.id || 
         (!x.technicianId && x.technicianName && tech.displayName && x.technicianName.toLowerCase().trim() === tech.displayName.toLowerCase().trim())
        ) && x.date === day.dateIso
      );
      return s && s.shiftType !== 'descanso';
    }).length;
    coverageRow.push(active);
  });
  coverageRow.push('-');
  coverageRow.push('-');
  coverageRow.push('-');
  sheetData.push(coverageRow);

  sheetData.push([]);
  sheetData.push(['CONVENCIONES:', 'M: Mañana (06:00-15:00)', 'T: Tarde (13:00-22:00)', 'N: Noche (21:00-06:00)', 'SUP: Supervisor (10:00-19:00)', 'INT: Turno Intermedio (08:00-17:00)', 'DESC: Descanso']);
  sheetData.push([]);
  sheetData.push(['Elaborado por: Juan Mateo Ramos (Jefe de Mantenimiento)', '', 'Aprobado por: Gerencia General', '', 'Notificado a Operaciones: Mauricio Marín']);

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Set column widths
  ws['!cols'] = [
    { wch: 5 },  // N°
    { wch: 28 }, // Técnico
    { wch: 20 }, // Cargo
    ...displayedDays.map(() => ({ wch: 14 })),
    { wch: 14 },
    { wch: 14 },
    { wch: 14 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Turnos_Quincenales');

  const cleanFileName = `Programacion_Turnos_${periodLabel.replace(/\s+/g, '_')}_${periodSublabel.replace(/\s+/g, '_')}.xlsx`;
  XLSX.writeFile(wb, cleanFileName);
}

/**
 * Generates and downloads a clean CSV matrix with UTF-8 BOM
 */
export function downloadScheduleCsv(params: ScheduleExportParams): void {
  const { periodLabel, periodSublabel, displayedDays, technicians, schedules, hotelInfo } = params;

  const lines: string[] = [];
  const hotelName = (hotelInfo?.hotelName || 'HOTEL MANTENIMIENTO').toUpperCase();

  lines.push(`"${hotelName} - PROGRAMACION OFICIAL DE TURNOS"`);
  lines.push(`"Periodo: ${periodLabel} (${periodSublabel})"`);
  lines.push(`"Fecha de Emision: ${new Date().toLocaleDateString('es-CO')}"`);
  lines.push('');

  const headers = [
    'N°',
    'Técnico',
    'Cargo',
    ...displayedDays.map(d => `"${d.dayName} ${d.dayNum}${d.isHoliday ? ' (Festivo)' : ''}"`),
    'Total Turnos',
    'Total Horas',
    'Total Descansos'
  ];
  lines.push(headers.join(';'));

  technicians.forEach((tech, idx) => {
    let worked = 0;
    let rest = 0;
    let totalHours = 0;
    
    const row = [
      `${idx + 1}`,
      `"${tech.displayName || tech.email || ''}"`,
      `"${tech.role === 'admin' ? 'Administrador' : (tech.role || 'Técnico')}"`
    ];

    displayedDays.forEach(day => {
      const sched = schedules.find(s => s && s.date === day.dateIso && isScheduleForTechExport(s, tech));

      const cellInfo = getShiftCellInfo(sched);
      if (cellInfo.isOff) rest++;
      else {
        worked++;
        totalHours += getExportShiftHours(sched);
      }

      row.push(`"${cellInfo.code}"`);
    });

    row.push(`${worked}`);
    row.push(`${Math.round(totalHours * 10) / 10}h`);
    row.push(`${rest}`);
    lines.push(row.join(';'));
  });

  // UTF-8 BOM so Excel opens with proper accents
  const bom = '\uFEFF';
  const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(bom + lines.join('\n'));
  const link = document.createElement('a');
  link.setAttribute('href', csvContent);
  link.setAttribute('download', `Programacion_Turnos_${periodLabel.replace(/\s+/g, '_')}_${periodSublabel.replace(/\s+/g, '_')}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
