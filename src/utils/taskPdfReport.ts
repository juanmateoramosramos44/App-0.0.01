import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MaintenanceTask, HotelInfo } from '../types';

/**
 * Convierte cualquier imagen (Data URL, URL relativa o remota) a base64 seguro
 * para incrustación directa en el reporte PDF mediante Canvas.
 */
async function getImageDataUrl(src: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  if (!src) return null;
  return new Promise((resolve) => {
    try {
      if (src.startsWith('data:image/')) {
        const img = new Image();
        img.onload = () => {
          resolve({
            dataUrl: src,
            width: img.naturalWidth || 400,
            height: img.naturalHeight || 300
          });
        };
        img.onerror = () => resolve(null);
        img.src = src;
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          const maxDim = 900;
          let w = img.naturalWidth || 400;
          let h = img.naturalHeight || 300;
          if (w > maxDim || h > maxDim) {
            if (w > h) {
              h = Math.round((h * maxDim) / w);
              w = maxDim;
            } else {
              w = Math.round((w * maxDim) / h);
              h = maxDim;
            }
          }
          canvas.width = w;
          canvas.height = h;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
          resolve({ dataUrl, width: w, height: h });
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = src;
      setTimeout(() => resolve(null), 3500);
    } catch {
      resolve(null);
    }
  });
}

const CATEGORY_NAMES: Record<string, string> = {
  mantenimiento: 'Mantenimiento General',
  reparacion: 'Reparación Técnica',
  revision: 'Revisión y Chequeo',
  limpieza_tecnica: 'Limpieza Técnica Especializada',
  inspeccion: 'Inspección de Equipos / Instalaciones',
  electrico: 'Sistema Eléctrico y Luminarias',
  plomeria: 'Plomería y Red Hidráulica',
  climatizacion: 'Climatización y Aire Acondicionado (HVAC)',
  cerrajeria: 'Cerrajería y Seguridad',
  pintura: 'Pintura, Resane y Acabados',
  compra_repuesto: 'Adquisición de Repuestos',
  otro: 'General / Otro'
};

const PRIORITY_LABELS: Record<string, { label: string; fill: [number, number, number]; text: [number, number, number] }> = {
  urgente: { label: 'URGENTE', fill: [254, 226, 226], text: [190, 18, 60] },
  alta: { label: 'ALTA', fill: [255, 237, 213], text: [194, 65, 12] },
  media: { label: 'MEDIA', fill: [224, 242, 254], text: [3, 105, 161] },
  baja: { label: 'BAJA', fill: [220, 252, 231], text: [21, 128, 61] }
};

/**
 * Genera el documento PDF completo y oficial para una tarea técnica
 * tal cual como se ejecutó, con su procedimiento, bitácora de novedades y registro fotográfico.
 */
export async function generateTaskPdf(task: MaintenanceTask, hotelInfo?: HotelInfo): Promise<jsPDF> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const leftMargin = 14;
  const rightMargin = 14;
  const contentWidth = pageWidth - leftMargin - rightMargin; // 182mm

  const hotelName = (hotelInfo?.hotelName && !hotelInfo.hotelName.includes('Grand Horizon'))
    ? hotelInfo.hotelName
    : 'WAKE BIO HOTEL';

  const chiefEngStr = String(hotelInfo?.chiefEngineer ?? '');
  const chiefEngineer = (chiefEngStr && !chiefEngStr.toLowerCase().includes('mateo') && !chiefEngStr.toLowerCase().includes('juan'))
    ? hotelInfo?.chiefEngineer
    : 'Mauricio Marín';

  // --- BRAND HEADER ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, 'F');

  // Decorative cyan accent stripe
  doc.setFillColor(6, 182, 212); // cyan-500
  doc.rect(0, 28, pageWidth, 1.2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(hotelName.toUpperCase(), leftMargin, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('DEPARTAMENTO DE MANTENIMIENTO E INGENIERÍA HOTELERA', leftMargin, 16.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(56, 189, 248); // sky-400
  doc.text('REPORTE OFICIAL DE EJECUCIÓN TÉCNICA Y PROCEDIMIENTO DE TAREA', leftMargin, 22);

  // Status Badge in Header
  const isComplete = task.status === 'completada';
  const isInProgress = task.status === 'en_progreso';
  let statusText = 'TAREA PENDIENTE';
  let statusBg: [number, number, number] = [217, 119, 6]; // amber-600

  if (isComplete) {
    statusText = '100% COMPLETADA';
    statusBg = [16, 185, 129]; // emerald-500
  } else if (isInProgress) {
    statusText = 'EN PROGRESO';
    statusBg = [37, 99, 235]; // blue-600
  } else if (task.status === 'cancelada') {
    statusText = 'CANCELADA';
    statusBg = [100, 116, 139]; // slate-500
  }

  doc.setFillColor(...statusBg);
  doc.roundedRect(pageWidth - rightMargin - 46, 7.5, 46, 11, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(statusText, pageWidth - rightMargin - 23, 14.5, { align: 'center' });

  // Task code badge under status
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184); // slate-400
  const shortId = (task.id || '').toUpperCase().slice(-8);
  doc.text(`ID: ${shortId}`, pageWidth - rightMargin - 23, 23, { align: 'center' });

  let currentY = 33;

  // --- TASK TITLE & MAIN CARD ---
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.roundedRect(leftMargin, currentY, contentWidth, 34, 2, 2, 'FD');

  // Title
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  const titleLines = doc.splitTextToSize(task.title || 'Tarea Técnica de Mantenimiento', contentWidth - 12);
  doc.text(titleLines.slice(0, 2), leftMargin + 6, currentY + 7);

  // Metadata Grid inside card
  doc.setFontSize(7.5);
  const col1X = leftMargin + 6;
  const col2X = leftMargin + 68;
  const col3X = leftMargin + 128;
  const row1Y = currentY + 16;
  const row2Y = currentY + 23;
  const row3Y = currentY + 30;

  // Col 1
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Asignado a:', col1X, row1Y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(task.assignedToName || 'Personal Técnico', col1X + 22, row1Y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Ubicación / Área:', col1X, row2Y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(task.area || 'Instalaciones del Hotel', col1X + 22, row2Y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Categoría:', col1X, row3Y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(CATEGORY_NAMES[task.category] || task.category || 'Mantenimiento', col1X + 22, row3Y);

  // Col 2
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Prioridad:', col2X, row1Y);
  const prioInfo = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.media;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...prioInfo.text);
  doc.text(prioInfo.label, col2X + 22, row1Y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Equipo Vinculado:', col2X, row2Y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  const eqStr = task.equipmentTag ? `${task.equipmentTag} (${task.equipmentName || ''})` : (task.equipmentName || 'Instalación General');
  doc.text(doc.splitTextToSize(eqStr, 38)[0] || 'General', col2X + 24, row2Y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Creado por:', col2X, row3Y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(`${task.createdByName || 'Administración'} (${task.createdByRole || 'Admin'})`, col2X + 22, row3Y);

  // Col 3
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Fecha Creación:', col3X, row1Y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(task.createdAt || '—', col3X + 22, row1Y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Fecha Límite:', col3X, row2Y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(task.dueDate ? `${task.dueDate} ${task.dueTime || ''}` : 'Sin límite', col3X + 22, row2Y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Tiempo Estimado:', col3X, row3Y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(task.estimatedMinutes ? `${task.estimatedMinutes} minutos` : 'Según requerimiento', col3X + 24, row3Y);

  currentY += 38;

  // --- SECTION 1: DESCRIPCIÓN Y OBJETIVO DE LA TAREA ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('1. DESCRIPCIÓN Y ALCANCE DE LA TAREA', leftMargin, currentY);
  currentY += 3;

  const descText = task.description?.trim() || 'Sin descripción detallada especificada en la creación.';
  const descLines = doc.splitTextToSize(descText, contentWidth - 10);
  const descBoxHeight = Math.max(14, descLines.length * 4.2 + 8);

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(leftMargin, currentY, contentWidth, descBoxHeight, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(descLines, leftMargin + 5, currentY + 6);

  currentY += descBoxHeight + 5;

  // --- SECTION 2: PROCEDIMIENTO Y LISTA DE CHEQUEO (PASOS REALIZADOS) ---
  const checklist = task.checklist || [];
  const completedSteps = checklist.filter((c) => c.completed).length;
  const percentComplete = checklist.length > 0 ? Math.round((completedSteps / checklist.length) * 100) : (isComplete ? 100 : 0);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(
    `2. PROCEDIMIENTO TÉCNICO Y LISTA DE CHEQUEO DE PASOS (${checklist.length > 0 ? `${completedSteps}/${checklist.length} Pasos - ${percentComplete}% Concluido` : 'Procedimiento Estándar'})`,
    leftMargin,
    currentY
  );
  currentY += 3;

  if (checklist.length > 0) {
    const checklistRows = checklist.map((item, idx) => [
      `Paso ${idx + 1}`,
      item.text,
      item.completed ? '✓ REALIZADO / OK' : 'PENDIENTE',
      item.completed ? (item.completedBy || task.assignedToName || 'Técnico') : '—',
      item.completedAt || '—'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Paso', 'Procedimiento / Instrucción Técnica', 'Estado', 'Realizado por', 'Fecha y Hora']],
      body: checklistRows,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 16, fontStyle: 'bold', halign: 'center', fillColor: [248, 250, 252] },
        1: { cellWidth: 84 },
        2: { cellWidth: 32, fontStyle: 'bold', halign: 'center' },
        3: { cellWidth: 26, fontSize: 7 },
        4: { cellWidth: 24, fontSize: 7, halign: 'center' },
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 2) {
          const val = String(data.cell.raw || '');
          if (val.includes('REALIZADO') || val.includes('OK')) {
            data.cell.styles.fillColor = [220, 252, 231]; // emerald-100
            data.cell.styles.textColor = [22, 101, 52]; // emerald-800
          } else {
            data.cell.styles.fillColor = [254, 243, 199]; // amber-100
            data.cell.styles.textColor = [146, 64, 14]; // amber-800
          }
        }
      },
      margin: { left: leftMargin, right: rightMargin },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  } else {
    // No specific checklist items defined, write procedural standard note
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(leftMargin, currentY, contentWidth, 14, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Esta tarea fue ejecutada bajo el procedimiento técnico estándar de mantenimiento e inspección hotelera.', leftMargin + 5, currentY + 6);
    doc.text(`Cumplimiento general reportado: ${isComplete ? '100% Satisfactorio (Tarea Cerrada)' : 'En curso según requerimiento operativo'}.`, leftMargin + 5, currentY + 10.5);
    currentY += 18;
  }

  // Check page break safety
  if (currentY > 230) {
    doc.addPage();
    currentY = 18;
  }

  // --- SECTION 3: BITÁCORA DE AVANCES Y NOVEDADES REGISTRADAS ---
  const comments = task.comments || [];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text(`3. BITÁCORA DE AVANCES Y NOVEDADES REGISTRADAS (${comments.length} Registro(s))`, leftMargin, currentY);
  currentY += 3;

  if (comments.length > 0) {
    const commentsRows = comments.map((comm, idx) => [
      `${idx + 1}`,
      comm.timestamp || '—',
      comm.userName || 'Técnico',
      comm.text || 'Registro de novedad',
      comm.photos && comm.photos.length > 0 ? `${comm.photos.length} foto(s)` : 'Sin fotos'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Fecha / Hora', 'Técnico', 'Detalle del Avance / Novedad Registrada', 'Evidencia']],
      body: commentsRows,
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2.5, textColor: [30, 41, 59] },
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center', fillColor: [248, 250, 252], fontStyle: 'bold' },
        1: { cellWidth: 28, fontSize: 7 },
        2: { cellWidth: 32, fontStyle: 'bold' },
        3: { cellWidth: 92 },
        4: { cellWidth: 20, halign: 'center', fontSize: 7, fontStyle: 'bold' },
      },
      margin: { left: leftMargin, right: rightMargin },
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  } else {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(leftMargin, currentY, contentWidth, 11, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No se registraron comentarios intermedios en la bitácora previa al cierre.', leftMargin + 5, currentY + 7);
    currentY += 15;
  }

  // Check page break safety
  if (currentY > 230) {
    doc.addPage();
    currentY = 18;
  }

  // --- SECTION 4: SOLUCIÓN FINAL Y RESULTADO DE LA EJECUCIÓN ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('4. CONCLUSIÓN, SOLUCIÓN FINAL Y RESULTADO DE LA EJECUCIÓN', leftMargin, currentY);
  currentY += 3;

  const completionNotesText = task.completionNotes?.trim() || (isComplete ? 'Trabajo completado satisfactoriamente al 100% de acuerdo a lo solicitado.' : 'Tarea actualmente en proceso de resolución.');
  const compNotesLines = doc.splitTextToSize(completionNotesText, contentWidth - 10);
  const compBoxHeight = Math.max(18, compNotesLines.length * 4.2 + 13);

  doc.setFillColor(isComplete ? 240 : 248, isComplete ? 253 : 250, isComplete ? 244 : 252); // soft emerald if complete
  doc.setDrawColor(isComplete ? 187 : 226, isComplete ? 247 : 232, isComplete ? 208 : 240);
  doc.roundedRect(leftMargin, currentY, contentWidth, compBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(isComplete ? 22 : 51, isComplete ? 101 : 65, isComplete ? 52 : 85);
  doc.text(isComplete ? '✓ Solución y Cierre Técnico Conforme:' : 'Estado Técnico Actual:', leftMargin + 5, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(30, 41, 59);
  doc.text(compNotesLines, leftMargin + 5, currentY + 11);

  if (isComplete) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    const completedInfo = `Certificado por: ${task.completedBy || task.assignedToName || 'Técnico de Mantenimiento'} | Fecha de Cierre: ${task.completedAt || 'Fecha registrada'}`;
    doc.text(completedInfo, leftMargin + 5, currentY + compBoxHeight - 3);
  }

  currentY += compBoxHeight + 6;

  // --- SECTION 5: REGISTRO FOTOGRÁFICO DE EVIDENCIAS (FOTOS COMPLETAS) ---
  // Collect all photos with context labels
  interface PhotoEntry {
    url: string;
    label: string;
    sublabel?: string;
  }
  const allPhotos: PhotoEntry[] = [];

  // 1. Initial photos
  if (task.photos && task.photos.length > 0) {
    task.photos.forEach((url, i) => {
      allPhotos.push({
        url,
        label: `Foto Inicial #${i + 1}`,
        sublabel: 'Estado inicial / Diagnóstico'
      });
    });
  }

  // 2. Comments / progress photos
  if (task.comments && task.comments.length > 0) {
    task.comments.forEach((comm) => {
      if (comm.photos && comm.photos.length > 0) {
        comm.photos.forEach((url, ci) => {
          allPhotos.push({
            url,
            label: `Avance: ${comm.userName || 'Técnico'} (#${ci + 1})`,
            sublabel: comm.timestamp || 'Bitácora de avance'
          });
        });
      }
    });
  }

  // 3. Completion photos
  if (task.completionPhotos && task.completionPhotos.length > 0) {
    task.completionPhotos.forEach((url, i) => {
      allPhotos.push({
        url,
        label: `Trabajo Finalizado #${i + 1}`,
        sublabel: 'Evidencia 100% OK / Entrega'
      });
    });
  }

  // Check if we need a new page for photos
  if (allPhotos.length > 0) {
    // If less than 85mm left, jump to new page for clean photo gallery
    if (currentY > 210) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`5. REGISTRO FOTOGRÁFICO DE EVIDENCIAS (${allPhotos.length} Fotografía(s))`, leftMargin, currentY);
    currentY += 4;

    // Load images asynchronously in parallel
    const loadedImages = await Promise.all(
      allPhotos.map(async (entry) => {
        const loaded = await getImageDataUrl(entry.url);
        return {
          ...entry,
          loaded
        };
      })
    );

    // Grid layout: 2 photos per row
    const photoWidth = 86;
    const photoHeight = 58;
    const gapX = 10;
    const gapY = 8;
    const labelHeight = 8;

    for (let i = 0; i < loadedImages.length; i += 2) {
      // Need page break check
      if (currentY + photoHeight + labelHeight > pageHeight - 20) {
        doc.addPage();
        currentY = 18;
      }

      // Left photo
      const leftEntry = loadedImages[i];
      const leftX = leftMargin;

      // Card container for left photo
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(leftX, currentY, photoWidth, photoHeight + labelHeight, 2, 2, 'FD');

      if (leftEntry.loaded?.dataUrl) {
        try {
          doc.addImage(
            leftEntry.loaded.dataUrl,
            'JPEG',
            leftX + 2,
            currentY + 2,
            photoWidth - 4,
            photoHeight - 4,
            undefined,
            'FAST'
          );
        } catch {
          doc.setTextColor(148, 163, 184);
          doc.setFontSize(7.5);
          doc.text('Foto adjunta procesada', leftX + 8, currentY + 28);
        }
      } else {
        doc.setTextColor(148, 163, 184);
        doc.setFontSize(7.5);
        doc.text('Fotografía adjunta en el sistema', leftX + 8, currentY + 28);
      }

      // Left label
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(leftEntry.label, leftX + 3, currentY + photoHeight + 3);
      if (leftEntry.sublabel) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(leftEntry.sublabel, leftX + 3, currentY + photoHeight + 6.5);
      }

      // Right photo if exists
      if (i + 1 < loadedImages.length) {
        const rightEntry = loadedImages[i + 1];
        const rightX = leftMargin + photoWidth + gapX;

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(rightX, currentY, photoWidth, photoHeight + labelHeight, 2, 2, 'FD');

        if (rightEntry.loaded?.dataUrl) {
          try {
            doc.addImage(
              rightEntry.loaded.dataUrl,
              'JPEG',
              rightX + 2,
              currentY + 2,
              photoWidth - 4,
              photoHeight - 4,
              undefined,
              'FAST'
            );
          } catch {
            doc.setTextColor(148, 163, 184);
            doc.setFontSize(7.5);
            doc.text('Foto adjunta procesada', rightX + 8, currentY + 28);
          }
        } else {
          doc.setTextColor(148, 163, 184);
          doc.setFontSize(7.5);
          doc.text('Fotografía adjunta en el sistema', rightX + 8, currentY + 28);
        }

        // Right label
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(rightEntry.label, rightX + 3, currentY + photoHeight + 3);
        if (rightEntry.sublabel) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(100, 116, 139);
          doc.text(rightEntry.sublabel, rightX + 3, currentY + photoHeight + 6.5);
        }
      }

      currentY += photoHeight + labelHeight + gapY;
    }
    currentY += 2;
  } else {
    // Note that no photos were attached
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('5. REGISTRO FOTOGRÁFICO DE EVIDENCIAS', leftMargin, currentY);
    currentY += 3;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(leftMargin, currentY, contentWidth, 11, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Esta tarea no contiene fotografías ni evidencias visuales registradas.', leftMargin + 5, currentY + 7);
    currentY += 15;
  }

  // --- SECTION 6: FIRMAS Y CERTIFICACIÓN OFICIAL ---
  if (currentY > 240) {
    doc.addPage();
    currentY = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('6. VALIDACIÓN Y RESPONSABILIDAD TÉCNICA', leftMargin, currentY);
  currentY += 5;

  const sigBoxWidth = (contentWidth - 10) / 2;
  const sigBoxHeight = 32;

  // Left signature box: Técnico
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(leftMargin, currentY, sigBoxWidth, sigBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('TÉCNICO EJECUTOR / RESPONSABLE:', leftMargin + 5, currentY + 6);

  // Line for signature
  doc.setDrawColor(148, 163, 184);
  doc.line(leftMargin + 6, currentY + 22, leftMargin + sigBoxWidth - 6, currentY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(task.assignedToName || 'Técnico de Mantenimiento', leftMargin + 6, currentY + 27);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(task.assignedToDepartment || 'Mantenimiento e Ingeniería Hotelera', leftMargin + 6, currentY + 30.5);

  // Right signature box: Jefatura de Mantenimiento
  const rightSigX = leftMargin + sigBoxWidth + 10;
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(rightSigX, currentY, sigBoxWidth, sigBoxHeight, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('VO.BO. JEFATURA DE MANTENIMIENTO:', rightSigX + 5, currentY + 6);

  // Line for signature
  doc.setDrawColor(148, 163, 184);
  doc.line(rightSigX + 6, currentY + 22, rightSigX + sigBoxWidth - 6, currentY + 22);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  doc.text(chiefEngineer || 'Mauricio Marín', rightSigX + 6, currentY + 27);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text('Director de Ingeniería y Mantenimiento Hotelero', rightSigX + 6, currentY + 30.5);

  currentY += sigBoxHeight + 6;

  // Digital audit footer on all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  const printTimestamp = new Date().toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.line(leftMargin, pageHeight - 12, pageWidth - rightMargin, pageHeight - 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Documento técnico oficial emitido por el Sistema de Mantenimiento ${hotelName} · Fecha de emisión: ${printTimestamp}`,
      leftMargin,
      pageHeight - 8
    );
    doc.text(`Página ${p} de ${totalPages}`, pageWidth - rightMargin, pageHeight - 8, { align: 'right' });
  }

  return doc;
}

/**
 * Función directa para generar y descargar el reporte PDF de una tarea específica
 */
export async function downloadTaskPdfReport(task: MaintenanceTask, hotelInfo?: HotelInfo): Promise<void> {
  const doc = await generateTaskPdf(task, hotelInfo);
  const safeTitle = (task.title || 'tarea')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]/g, '_')
    .slice(0, 30);
  const shortId = (task.id || '').slice(-6);
  const fileName = `Tarea_${safeTitle}_${shortId}.pdf`;
  doc.save(fileName);
}
