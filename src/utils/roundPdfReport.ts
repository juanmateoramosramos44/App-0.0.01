import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { DailyRound, HotelInfo, RoundCheckpoint, RoundMeasurementField } from '../types';
import { getCheckpointButtonAction, getFieldButtonAction } from './roundButtonUtils';

/**
 * Returns color codes and metadata for any button or status text
 * exactly identical to the web and mobile application theme.
 */
export interface StatusTheme {
  name: string;
  emoji: string;
  pdfBg: [number, number, number];
  pdfText: [number, number, number];
  pdfBorder: [number, number, number];
  badgeFill: [number, number, number];
}

export function getStatusTheme(statusText: any, customColor?: string): StatusTheme {
  const strStatus = String(statusText ?? '');
  const lower = strStatus.toLowerCase().trim();

  if (customColor && customColor !== 'auto') {
    if (customColor === 'emerald') {
      return {
        name: statusText,
        emoji: '🟢',
        pdfBg: [220, 252, 231],
        pdfText: [22, 101, 52],
        pdfBorder: [134, 239, 172],
        badgeFill: [16, 185, 129]
      };
    }
    if (customColor === 'rose') {
      return {
        name: statusText,
        emoji: '🔴',
        pdfBg: [254, 226, 226],
        pdfText: [159, 18, 57],
        pdfBorder: [248, 113, 113],
        badgeFill: [225, 29, 72]
      };
    }
    if (customColor === 'amber') {
      return {
        name: statusText,
        emoji: '🟡',
        pdfBg: [254, 243, 199],
        pdfText: [146, 64, 14],
        pdfBorder: [252, 211, 77],
        badgeFill: [217, 119, 6]
      };
    }
    if (customColor === 'slate') {
      return {
        name: statusText,
        emoji: '⚫',
        pdfBg: [241, 245, 249],
        pdfText: [51, 65, 85],
        pdfBorder: [203, 213, 225],
        badgeFill: [71, 85, 105]
      };
    }
    if (customColor === 'blue') {
      return {
        name: statusText,
        emoji: '🔵',
        pdfBg: [224, 242, 254],
        pdfText: [7, 89, 133],
        pdfBorder: [125, 211, 252],
        badgeFill: [37, 99, 235]
      };
    }
  }

  const isDanger = lower.includes('crítico') || 
                   lower.includes('critico') || 
                   lower.includes('fuga') || 
                   lower.includes('anomalía') || 
                   lower.includes('anomalia') || 
                   lower.includes('falla') || 
                   lower.includes('fuera') || 
                   lower.includes('no ok') || 
                   lower.includes('nok') || 
                   lower.includes('peligro') || 
                   lower.includes('disparado') || 
                   lower.includes('trip') || 
                   (lower.includes('alarma') && !lower.includes('no alarma') && !lower.includes('sin alarma')) ||
                   lower === 'sucio';

  const isWarning = lower.includes('atención') || 
                    lower.includes('atencion') || 
                    lower.includes('observación') || 
                    lower.includes('observacion') || 
                    lower.includes('leve') || 
                    lower.includes('medio') || 
                    lower.includes('requiere') || 
                    lower.includes('aseo') || 
                    lower.includes('mantenimiento') || 
                    lower.includes('standby') || 
                    lower.includes('espera') || 
                    lower.includes('manual') || 
                    lower === 'bajo' ||
                    lower === 'revisar';

  const isOff = lower.includes('apagado') || 
                lower === 'off' || 
                lower.includes('desactivado') || 
                lower.includes('inactivo') ||
                lower.includes('detenido');

  const isBlue = lower.includes('automático') || 
                 lower.includes('automatico') || 
                 lower.includes('auto') || 
                 lower.includes('sistema');

  const isSuccess = lower.includes('ok') || 
                    lower.includes('bueno') || 
                    lower.includes('operativo') || 
                    lower.includes('limpio') || 
                    lower.includes('normal') || 
                    lower.includes('no alarma') || 
                    lower.includes('sin alarma') || 
                    lower.includes('conforme') || 
                    lower.includes('servicio') || 
                    lower.includes('encendido') || 
                    lower === 'on' || 
                    lower.includes('abierto') || 
                    lower.includes('marcha') ||
                    lower.includes('lleno') ||
                    lower === 'true';

  if (isDanger) {
    return {
      name: statusText,
      emoji: '🔴',
      pdfBg: [254, 226, 226],
      pdfText: [159, 18, 57],
      pdfBorder: [248, 113, 113],
      badgeFill: [225, 29, 72]
    };
  }

  if (isWarning) {
    return {
      name: statusText,
      emoji: '🟡',
      pdfBg: [254, 243, 199],
      pdfText: [146, 64, 14],
      pdfBorder: [252, 211, 77],
      badgeFill: [217, 119, 6]
    };
  }

  if (isOff) {
    return {
      name: statusText,
      emoji: '⚫',
      pdfBg: [241, 245, 249],
      pdfText: [51, 65, 85],
      pdfBorder: [203, 213, 225],
      badgeFill: [71, 85, 105]
    };
  }

  if (isBlue) {
    return {
      name: statusText,
      emoji: '🔵',
      pdfBg: [224, 242, 254],
      pdfText: [7, 89, 133],
      pdfBorder: [125, 211, 252],
      badgeFill: [37, 99, 235]
    };
  }

  if (isSuccess) {
    return {
      name: statusText,
      emoji: '🟢',
      pdfBg: [220, 252, 231],
      pdfText: [22, 101, 52],
      pdfBorder: [134, 239, 172],
      badgeFill: [16, 185, 129]
    };
  }

  // Default Blue/Neutral
  return {
    name: statusText,
    emoji: '🔹',
    pdfBg: [239, 246, 255],
    pdfText: [30, 64, 175],
    pdfBorder: [191, 219, 254],
    badgeFill: [37, 99, 235]
  };
}

/**
 * Detailed description of an alarm issue detected on a checkpoint
 */
export interface CheckpointAlarmIssue {
  parameterName: string;
  measuredValue: string;
  allowedRange: string;
  deviation: string;
  alarmType: 'HIGH' | 'LOW' | 'STATUS_DANGER' | 'ANOMALY';
}

/**
 * Granular individual equipment or checkpoint sub-item.
 * Allows auditing and styling each physical equipment individually.
 */
export interface IndividualEquipment {
  id: string;
  checkpointId: string;
  area: string;
  systemTitle: string;
  name: string;
  displayName: string;
  statusValue?: string;
  numericValue?: number | string;
  unit?: string;
  statusAndValue: string;
  rangeDisplay: string;
  notes: string;
  isOff: boolean;
  isAlarmed: boolean;
  isWarning: boolean;
  isOk: boolean;
  isPending: boolean;
  alarmReason?: string;
  theme: {
    pdfBg: [number, number, number];
    pdfText: [number, number, number];
  };
}

/**
 * Extracts and strictly evaluates every single physical equipment or inspection point in the round.
 * If a checkpoint contains measurementFields (e.g. Nevera 1, Nevera 2, Base chef, Nevera Entrada),
 * each one is extracted as an independent IndividualEquipment so that only the truly alarmed equipment
 * is marked in red and listed in the alarms audit.
 */
export function extractRoundEquipments(round: DailyRound): IndividualEquipment[] {
  const result: IndividualEquipment[] = [];
  const checkpoints = round.checkpoints || [];

  checkpoints.forEach((c) => {
    const area = c.area || 'General';
    const btnAction = c.statusValue ? getCheckpointButtonAction(c, c.statusValue) : 'default';
    const isParentOff = btnAction === 'turn_off';
    const checkpointNotes = c.notes && c.notes.trim() !== '' ? c.notes : '—';

    if (c.measurementFields && c.measurementFields.length > 0) {
      // Sub-equipments
      c.measurementFields.forEach((f: RoundMeasurementField, fIdx: number) => {
        const fieldName = f.name || `Punto ${fIdx + 1}`;
        const fieldAction = f.statusValue ? getFieldButtonAction(f, f.statusValue, c, undefined, fIdx) : 'default';
        const isFieldOff = isParentOff || fieldAction === 'turn_off';

        const fStatus = f.statusValue ? String(f.statusValue).trim() : '';
        const fStatusLower = fStatus.toLowerCase();

        // Status-based danger check
        const isStatusDanger = !isFieldOff && (
          fStatusLower.includes('no ok') ||
          fStatusLower.includes('nok') ||
          fStatusLower.includes('falla') ||
          fStatusLower.includes('crítico') ||
          fStatusLower.includes('critico') ||
          fStatusLower.includes('peligro') ||
          fStatusLower.includes('disparado') ||
          (fStatusLower.includes('alarma') && !fStatusLower.includes('no alarma') && !fStatusLower.includes('sin alarma')) ||
          f.buttonActions?.[fStatus]?.color === 'rose'
        );

        // Numeric out-of-range check
        let isOutOfRange = false;
        let alarmReason = '';
        const rawNum = typeof f.value === 'number' ? f.value : parseFloat(String(f.value ?? '').replace(',', '.'));
        const hasNum = f.value !== undefined && f.value !== null && String(f.value).trim() !== '' && !isNaN(rawNum);

        const minVal = f.minValue !== undefined ? f.minValue : c.minValue;
        const maxVal = f.maxValue !== undefined ? f.maxValue : c.maxValue;
        const unit = f.unit || c.unit || '';

        if (!isFieldOff && hasNum) {
          if (minVal !== undefined && rawNum < minVal) {
            isOutOfRange = true;
            const diff = (minVal - rawNum).toFixed(1);
            alarmReason = `Bajo: ${rawNum} ${unit} (Mínimo: ${minVal} ${unit}) [-${diff} ${unit}]`.trim();
          } else if (maxVal !== undefined && rawNum > maxVal) {
            isOutOfRange = true;
            const diff = (rawNum - maxVal).toFixed(1);
            alarmReason = `Exceso: ${rawNum} ${unit} (Máximo: ${maxVal} ${unit}) [+${diff} ${unit}]`.trim();
          }
        }

        if (isStatusDanger && !alarmReason) {
          alarmReason = `Condición: [${fStatus}] - No Conforme / Alarma`;
        }

        const isAlarmed = !isFieldOff && (isStatusDanger || isOutOfRange);

        const isWarning = !isAlarmed && !isFieldOff && (
          fStatusLower.includes('observación') ||
          fStatusLower.includes('observacion') ||
          fStatusLower.includes('atención') ||
          fStatusLower.includes('atencion') ||
          f.buttonActions?.[fStatus]?.color === 'amber'
        );

        const hasAnyValue = hasNum || (fStatus !== '');
        const isOk = !isFieldOff && !isAlarmed && !isWarning && hasAnyValue;
        const isPending = !isFieldOff && !isAlarmed && !isWarning && !hasAnyValue;

        // Clean status and measurement representation (NO text like [DENTRO DE RANGO] or emojis)
        let statusAndValue = '';
        if (isFieldOff) {
          statusAndValue = 'Apagado';
        } else if (fStatus && hasNum) {
          statusAndValue = `${fStatus} (${rawNum} ${unit})`.trim();
        } else if (fStatus) {
          statusAndValue = fStatus;
        } else if (hasNum) {
          statusAndValue = `${rawNum} ${unit}`.trim();
        } else {
          statusAndValue = '—';
        }

        // Safe range display
        let rangeDisplay = '—';
        if (minVal !== undefined && maxVal !== undefined) {
          rangeDisplay = `${minVal} a ${maxVal} ${unit}`.trim();
        } else if (minVal !== undefined) {
          rangeDisplay = `>= ${minVal} ${unit}`.trim();
        } else if (maxVal !== undefined) {
          rangeDisplay = `<= ${maxVal} ${unit}`.trim();
        } else if (unit) {
          rangeDisplay = unit;
        }

        let pdfBg: [number, number, number] = [255, 255, 255];
        let pdfText: [number, number, number] = [30, 41, 59];

        if (isAlarmed) {
          pdfBg = [254, 226, 226]; // soft red
          pdfText = [190, 18, 60];  // bold dark red
        } else if (isWarning) {
          pdfBg = [254, 243, 199];
          pdfText = [146, 64, 14];
        } else if (isFieldOff) {
          pdfBg = [241, 245, 249];
          pdfText = [71, 85, 105];
        }

        result.push({
          id: `${c.id}-f-${fIdx}`,
          checkpointId: c.id,
          area,
          systemTitle: c.title,
          name: fieldName,
          displayName: `${c.title} - ${fieldName}`,
          statusValue: fStatus || undefined,
          numericValue: hasNum ? rawNum : undefined,
          unit,
          statusAndValue,
          rangeDisplay,
          notes: checkpointNotes,
          isOff: isFieldOff,
          isAlarmed,
          isWarning,
          isOk,
          isPending,
          alarmReason: alarmReason || undefined,
          theme: { pdfBg, pdfText }
        });
      });
    } else {
      // Standalone equipment
      const isChkOff = isParentOff;
      const statusStr = c.statusValue ? String(c.statusValue).trim() : '';
      const statusLower = statusStr.toLowerCase();

      const isStatusDanger = !isChkOff && (
        statusLower.includes('no ok') ||
        statusLower.includes('nok') ||
        statusLower.includes('falla') ||
        statusLower.includes('crítico') ||
        statusLower.includes('critico') ||
        statusLower.includes('peligro') ||
        statusLower.includes('disparado') ||
        (statusLower.includes('alarma') && !statusLower.includes('no alarma') && !statusLower.includes('sin alarma')) ||
        c.buttonActions?.[statusStr]?.color === 'rose'
      );

      let isOutOfRange = false;
      let alarmReason = '';
      const rawNum = typeof c.currentValue === 'number' ? c.currentValue : parseFloat(String(c.currentValue ?? '').replace(',', '.'));
      const hasNum = c.currentValue !== undefined && c.currentValue !== null && String(c.currentValue).trim() !== '' && !isNaN(rawNum);

      const minVal = c.minValue;
      const maxVal = c.maxValue;
      const unit = c.unit || '';

      if (!isChkOff && hasNum) {
        if (minVal !== undefined && rawNum < minVal) {
          isOutOfRange = true;
          const diff = (minVal - rawNum).toFixed(1);
          alarmReason = `Bajo: ${rawNum} ${unit} (Mínimo: ${minVal} ${unit}) [-${diff} ${unit}]`.trim();
        } else if (maxVal !== undefined && rawNum > maxVal) {
          isOutOfRange = true;
          const diff = (rawNum - maxVal).toFixed(1);
          alarmReason = `Exceso: ${rawNum} ${unit} (Máximo: ${maxVal} ${unit}) [+${diff} ${unit}]`.trim();
        }
      }

      if (isStatusDanger && !alarmReason) {
        alarmReason = `Condición: [${statusStr}] - No Conforme / Alarma`;
      }

      if (c.anomalyId && !alarmReason) {
        alarmReason = 'Incidencia técnica registrada';
      }

      const isAlarmed = !isChkOff && (isStatusDanger || isOutOfRange || !!c.anomalyId);

      const isWarning = !isAlarmed && !isChkOff && (
        statusLower.includes('observación') ||
        statusLower.includes('observacion') ||
        statusLower.includes('atención') ||
        statusLower.includes('atencion') ||
        c.buttonActions?.[statusStr]?.color === 'amber'
      );

      const hasAnyValue = hasNum || (statusStr !== '') || (typeof c.currentValue === 'boolean');
      const isOk = !isChkOff && !isAlarmed && !isWarning && hasAnyValue;
      const isPending = !isChkOff && !isAlarmed && !isWarning && !hasAnyValue;

      let statusAndValue = '';
      if (isChkOff) {
        statusAndValue = 'Apagado';
      } else if (statusStr && hasNum) {
        statusAndValue = `${statusStr} (${rawNum} ${unit})`.trim();
      } else if (statusStr) {
        statusAndValue = statusStr;
      } else if (hasNum) {
        statusAndValue = `${rawNum} ${unit}`.trim();
      } else if (typeof c.currentValue === 'boolean') {
        statusAndValue = c.currentValue ? 'Conforme' : 'No Conforme';
      } else {
        statusAndValue = '—';
      }

      let rangeDisplay = '—';
      if (minVal !== undefined && maxVal !== undefined) {
        rangeDisplay = `${minVal} a ${maxVal} ${unit}`.trim();
      } else if (minVal !== undefined) {
        rangeDisplay = `>= ${minVal} ${unit}`.trim();
      } else if (maxVal !== undefined) {
        rangeDisplay = `<= ${maxVal} ${unit}`.trim();
      } else if (unit) {
        rangeDisplay = unit;
      }

      let pdfBg: [number, number, number] = [255, 255, 255];
      let pdfText: [number, number, number] = [30, 41, 59];

      if (isAlarmed) {
        pdfBg = [254, 226, 226];
        pdfText = [190, 18, 60];
      } else if (isWarning) {
        pdfBg = [254, 243, 199];
        pdfText = [146, 64, 14];
      } else if (isChkOff) {
        pdfBg = [241, 245, 249];
        pdfText = [71, 85, 105];
      }

      result.push({
        id: c.id,
        checkpointId: c.id,
        area,
        systemTitle: c.title,
        name: c.title,
        displayName: c.title,
        statusValue: statusStr || undefined,
        numericValue: hasNum ? rawNum : undefined,
        unit,
        statusAndValue,
        rangeDisplay,
        notes: checkpointNotes,
        isOff: isChkOff,
        isAlarmed,
        isWarning,
        isOk,
        isPending,
        alarmReason: alarmReason || undefined,
        theme: { pdfBg, pdfText }
      });
    }
  });

  return result;
}

/**
 * Complete evaluation of a checkpoint for strict auditing and rendering in PDF
 */
export interface EvaluatedCheckpoint {
  checkpoint: RoundCheckpoint;
  isOff: boolean;
  isAlarmed: boolean;
  isWarning: boolean;
  isOk: boolean;
  isPending: boolean;
  alarmIssues: CheckpointAlarmIssue[];
  statusSummaryLabel: string;
  theme: StatusTheme;
  valStr: string;
  subItemsCount: number;
  rangeStr: string;
  notes: string;
}

/**
 * Evaluates any checkpoint, calculating whether it is currently in RED / ALARM,
 * in range (GREEN), switched OFF (SLATE), in OBSERVATION (YELLOW) or PENDING.
 * Guarantees 100% fidelity with web and mobile UI states.
 */
export function evaluateCheckpointStatus(c: RoundCheckpoint): EvaluatedCheckpoint {
  const btnAction = c.statusValue ? getCheckpointButtonAction(c, c.statusValue) : 'default';
  const isChkOff = btnAction === 'turn_off';
  
  const alarmIssues: CheckpointAlarmIssue[] = [];
  const statusLower = String(c.statusValue || '').toLowerCase().trim();

  // Status-based danger check
  const isStatusDanger = !isChkOff && (
    statusLower.includes('crítico') || 
    statusLower.includes('critico') || 
    statusLower.includes('falla') || 
    statusLower.includes('fuera') || 
    statusLower.includes('no ok') || 
    statusLower.includes('nok') || 
    statusLower.includes('peligro') || 
    statusLower.includes('disparado') || 
    statusLower.includes('trip') || 
    statusLower.includes('fuga') || 
    statusLower.includes('anomalía') || 
    statusLower.includes('anomalia') || 
    statusLower === 'sucio' || 
    (statusLower.includes('alarma') && !statusLower.includes('no alarma') && !statusLower.includes('sin alarma')) || 
    c.buttonActions?.[c.statusValue || '']?.color === 'rose'
  );

  if (isStatusDanger) {
    alarmIssues.push({
      parameterName: c.title,
      measuredValue: `[${c.statusValue}]`,
      allowedRange: 'Estado Normal / Conforme',
      deviation: 'Condición Anormal / Falla Activa',
      alarmType: 'STATUS_DANGER'
    });
  }

  // Single numeric checkpoint check
  const hasSingleValue = c.currentValue !== undefined && c.currentValue !== null && String(c.currentValue).trim() !== '';
  if (!isChkOff && hasSingleValue) {
    const rawStr = String(c.currentValue).replace(',', '.');
    const numVal = typeof c.currentValue === 'number' ? c.currentValue : parseFloat(rawStr);
    
    if (!isNaN(numVal)) {
      if (c.minValue !== undefined && numVal < c.minValue) {
        const diff = (c.minValue - numVal).toFixed(1);
        alarmIssues.push({
          parameterName: c.title,
          measuredValue: `${numVal} ${c.unit || ''}`.trim(),
          allowedRange: `${c.minValue} a ${c.maxValue ?? '—'} ${c.unit || ''}`.trim(),
          deviation: `Bajo: -${diff} ${c.unit || ''} por debajo del mínimo permitido`.trim(),
          alarmType: 'LOW'
        });
      } else if (c.maxValue !== undefined && numVal > c.maxValue) {
        const diff = (numVal - c.maxValue).toFixed(1);
        alarmIssues.push({
          parameterName: c.title,
          measuredValue: `${numVal} ${c.unit || ''}`.trim(),
          allowedRange: `${c.minValue ?? '—'} a ${c.maxValue} ${c.unit || ''}`.trim(),
          deviation: `Exceso: +${diff} ${c.unit || ''} por encima del límite máximo`.trim(),
          alarmType: 'HIGH'
        });
      }
    }
  }

  // Multi-fields checkpoint check (measurementFields)
  let subItemsCount = 0;
  if (c.measurementFields && c.measurementFields.length > 0) {
    subItemsCount = c.measurementFields.length;
    c.measurementFields.forEach((f: RoundMeasurementField, idx: number) => {
      const fieldAction = f.statusValue ? getFieldButtonAction(f, f.statusValue, c, undefined, idx) : 'default';
      const isFieldOff = isChkOff || fieldAction === 'turn_off';
      if (isFieldOff) return;

      const fStatusLower = String(f.statusValue || '').toLowerCase().trim();
      const isFieldDanger = fStatusLower.includes('no ok') || 
                            fStatusLower.includes('nok') || 
                            fStatusLower.includes('falla') || 
                            fStatusLower.includes('crítico') || 
                            fStatusLower.includes('critico') || 
                            fStatusLower.includes('peligro') || 
                            fStatusLower.includes('disparado') || 
                            (fStatusLower.includes('alarma') && !fStatusLower.includes('no alarma') && !fStatusLower.includes('sin alarma')) || 
                            f.buttonActions?.[f.statusValue || '']?.color === 'rose';

      const fieldLabel = f.name || `Punto ${idx + 1}`;

      if (isFieldDanger) {
        alarmIssues.push({
          parameterName: `${c.title} ➔ ${fieldLabel}`,
          measuredValue: `[${f.statusValue}]`,
          allowedRange: 'Operación Conforme',
          deviation: 'Estado de Alerta Activo',
          alarmType: 'STATUS_DANGER'
        });
      }

      if (f.value !== undefined && f.value !== null && String(f.value).trim() !== '') {
        const fRawStr = String(f.value).replace(',', '.');
        const fNum = typeof f.value === 'number' ? f.value : parseFloat(fRawStr);

        if (!isNaN(fNum)) {
          if (f.minValue !== undefined && fNum < f.minValue) {
            const diff = (f.minValue - fNum).toFixed(1);
            alarmIssues.push({
              parameterName: `${c.title} ➔ ${fieldLabel}`,
              measuredValue: `${fNum} ${f.unit || ''}`.trim(),
              allowedRange: `${f.minValue} a ${f.maxValue ?? '—'} ${f.unit || ''}`.trim(),
              deviation: `Bajo: -${diff} ${f.unit || ''} bajo el mínimo seguro`.trim(),
              alarmType: 'LOW'
            });
          } else if (f.maxValue !== undefined && fNum > f.maxValue) {
            const diff = (fNum - f.maxValue).toFixed(1);
            alarmIssues.push({
              parameterName: `${c.title} ➔ ${fieldLabel}`,
              measuredValue: `${fNum} ${f.unit || ''}`.trim(),
              allowedRange: `${f.minValue ?? '—'} a ${f.maxValue} ${f.unit || ''}`.trim(),
              deviation: `Exceso: +${diff} ${f.unit || ''} sobre el límite máximo`.trim(),
              alarmType: 'HIGH'
            });
          }
        }
      }
    });
  }

  // Linked anomaly
  if (c.anomalyId && !isChkOff) {
    alarmIssues.push({
      parameterName: c.title,
      measuredValue: '⚠️ Incidencia Técnica',
      allowedRange: 'Sin Novedad',
      deviation: 'Reporte de Avería Asociado',
      alarmType: 'ANOMALY'
    });
  }

  const isAlarmed = alarmIssues.length > 0;
  const isOff = isChkOff;

  const isWarning = !isAlarmed && !isOff && (
    statusLower.includes('observación') || 
    statusLower.includes('observacion') || 
    statusLower.includes('atención') || 
    statusLower.includes('atencion') || 
    statusLower.includes('requiere') || 
    statusLower.includes('mantenimiento') || 
    c.buttonActions?.[c.statusValue || '']?.color === 'amber'
  );

  const hasAnyValue = hasSingleValue || (c.statusValue && c.statusValue.trim() !== '') || (c.measurementFields && c.measurementFields.some(f => (f.value !== undefined && String(f.value).trim() !== '') || f.statusValue));
  const isOk = !isAlarmed && !isWarning && !isOff && hasAnyValue;
  const isPending = !isAlarmed && !isWarning && !isOff && !hasAnyValue;

  let theme: StatusTheme;
  let statusSummaryLabel = '';

  if (isAlarmed) {
    theme = {
      name: 'Fuera de Rango / Alarma',
      emoji: '🔴',
      pdfBg: [254, 226, 226], // rose-100
      pdfText: [159, 18, 57], // rose-800
      pdfBorder: [244, 63, 94],
      badgeFill: [225, 29, 72]
    };
    statusSummaryLabel = '¡FUERA DE RANGO / ALARMA!';
  } else if (isWarning) {
    theme = {
      name: 'En Observación',
      emoji: '🟡',
      pdfBg: [254, 243, 199], // amber-100
      pdfText: [146, 64, 14], // amber-800
      pdfBorder: [245, 158, 11],
      badgeFill: [217, 119, 6]
    };
    statusSummaryLabel = 'EN OBSERVACIÓN';
  } else if (isOff) {
    theme = {
      name: 'Apagado',
      emoji: '⚫',
      pdfBg: [241, 245, 249], // slate-100
      pdfText: [51, 65, 85], // slate-700
      pdfBorder: [148, 163, 184],
      badgeFill: [71, 85, 105]
    };
    statusSummaryLabel = 'APAGADO / INACTIVO';
  } else if (isOk) {
    theme = {
      name: 'Conforme',
      emoji: '🟢',
      pdfBg: [220, 252, 231], // emerald-100
      pdfText: [22, 101, 52], // emerald-800
      pdfBorder: [52, 211, 153],
      badgeFill: [16, 185, 129]
    };
    statusSummaryLabel = 'DENTRO DE RANGO / OK';
  } else {
    theme = {
      name: 'Pendiente',
      emoji: '⏳',
      pdfBg: [248, 250, 252],
      pdfText: [100, 116, 139],
      pdfBorder: [203, 213, 225],
      badgeFill: [100, 116, 139]
    };
    statusSummaryLabel = 'PENDIENTE / NO REGISTRADO';
  }

  // Format detailed cell value string
  let valStr = '';
  if (c.measurementFields && c.measurementFields.length > 0) {
    const fieldParts: string[] = [];
    
    c.measurementFields.forEach((f, idx) => {
      const itemLabel = f.name || `Punto ${idx + 1}`;
      const fieldAction = f.statusValue ? getFieldButtonAction(f, f.statusValue, c, undefined, idx) : 'default';
      const isFieldOff = isChkOff || fieldAction === 'turn_off';
      
      if (isFieldOff) {
        fieldParts.push(`• ${itemLabel}: [Apagado] 0 ${f.unit || ''}`.trim());
        return;
      }

      let subValStr = '';
      if (f.statusValue && f.value !== undefined && String(f.value).trim() !== '') {
        subValStr = `[${f.statusValue}]  ${f.value} ${f.unit || ''}`.trim();
      } else if (f.statusValue) {
        subValStr = `[${f.statusValue}]`;
      } else if (f.value !== undefined && String(f.value).trim() !== '') {
        subValStr = `${f.value} ${f.unit || ''}`.trim();
      } else {
        subValStr = '—';
      }

      // Check if this subfield is out of range
      const fRawStr = String(f.value ?? '').replace(',', '.');
      const fNum = typeof f.value === 'number' ? f.value : parseFloat(fRawStr);
      let fieldAlarmFlag = '';
      if (!isNaN(fNum)) {
        if (f.minValue !== undefined && fNum < f.minValue) {
          fieldAlarmFlag = `  ⚠️ ¡FUERA DE RANGO! (Mín: ${f.minValue})`;
        } else if (f.maxValue !== undefined && fNum > f.maxValue) {
          fieldAlarmFlag = `  ⚠️ ¡FUERA DE RANGO! (Máx: ${f.maxValue})`;
        } else if (f.minValue !== undefined || f.maxValue !== undefined) {
          fieldAlarmFlag = `  ✓ Normal`;
        }
      }

      fieldParts.push(`• ${itemLabel}: ${subValStr}${fieldAlarmFlag}`);
    });

    const headerBadge = isAlarmed 
      ? `🔴 [¡FUERA DE RANGO / ALARMA!]` 
      : isOff 
        ? `⚫ [APAGADO / INACTIVO]` 
        : isWarning 
          ? `🟡 [${c.statusValue || 'EN OBSERVACIÓN'}]` 
          : isOk 
            ? `🟢 [DENTRO DE RANGO / CONFORME]` 
            : `⏳ [SIN REGISTRAR]`;

    if (c.statusValue && !isOff && !isAlarmed) {
      valStr = `${headerBadge} [${c.statusValue}]\n\n` + fieldParts.join('\n\n');
    } else {
      valStr = `${headerBadge}\n\n` + fieldParts.join('\n\n');
    }
  } else {
    if (isOff) {
      valStr = `⚫ [APAGADO / INACTIVO]\n0 ${c.unit || ''} (Equipo Fuera de Servicio)`;
    } else if (isAlarmed) {
      const parts: string[] = [`🔴 [¡FUERA DE RANGO / ALARMA!]`];
      if (c.statusValue) parts.push(`ESTADO: [${c.statusValue}]`);
      if (hasSingleValue) {
        parts.push(`VALOR MEDIDO: ${c.currentValue} ${c.unit || ''}`.trim());
      }
      if (alarmIssues.length > 0) {
        parts.push(`⚠️ ${alarmIssues[0].deviation}`);
      }
      valStr = parts.join('\n');
    } else if (isWarning) {
      valStr = `🟡 [EN OBSERVACIÓN]\n${c.statusValue ? `[${c.statusValue}] ` : ''}${hasSingleValue ? `${c.currentValue} ${c.unit || ''}` : ''}`.trim();
    } else if (isOk) {
      valStr = `🟢 [CONFORME / NORMAL]\n${c.statusValue ? `[${c.statusValue}] ` : ''}${hasSingleValue ? `${c.currentValue} ${c.unit || ''} (Rango Seguro)` : 'Operativo'}`.trim();
    } else {
      valStr = `⏳ (Sin registrar)`;
    }
  }

  const rangeStr = (c.minValue !== undefined && c.maxValue !== undefined) 
    ? `${c.minValue} a ${c.maxValue} ${c.unit || ''}`.trim()
    : c.minValue !== undefined 
      ? `Mín: ${c.minValue} ${c.unit || ''}`.trim()
      : c.maxValue !== undefined
        ? `Máx: ${c.maxValue} ${c.unit || ''}`.trim()
        : (c.unit ? c.unit : '—');

  return {
    checkpoint: c,
    isOff,
    isAlarmed,
    isWarning,
    isOk,
    isPending,
    alarmIssues,
    statusSummaryLabel,
    theme,
    valStr,
    subItemsCount,
    rangeStr,
    notes: c.notes || '—'
  };
}

import { formatShiftName } from './formatShift';
export { formatShiftName };

/**
 * Formats a clean, 100% faithful text summary for WhatsApp, Telegram, etc.
 * Highlights alarmed equipment at the very top.
 */
export function generateRoundSummaryText(round: DailyRound, hotelInfo?: HotelInfo): string {
  const hotelName = hotelInfo?.hotelName || 'Grand Hotel & Resort';
  const shiftName = formatShiftName(round.shift, false);
  
  const allEquipments = extractRoundEquipments(round);
  const alarmedEquipments = allEquipments.filter(e => e.isAlarmed);
  const okEquipments = allEquipments.filter(e => e.isOk);
  const offEquipments = allEquipments.filter(e => e.isOff);
  const completedCount = allEquipments.filter(e => !e.isPending).length;
  const totalCount = allEquipments.length;

  let text = `📋 *REPORTE DE RONDA DIARIA DE MANTENIMIENTO*\n`;
  text += `🏨 *Hotel:* ${hotelName}\n`;
  text += `📅 *Fecha:* ${round.date} | ⏰ *Hora:* ${round.time} hs\n`;
  text += `🔄 *Turno:* ${shiftName} | 👷 *Técnico:* ${round.technicianName}\n`;
  text += `📊 *Cumplimiento:* ${round.compliancePercentage ?? 100}% (${completedCount}/${totalCount} equipos)\n\n`;
  
  if (alarmedEquipments.length > 0) {
    text += `🚨 *ESTADO DE ALARMAS:* ⚠️ ¡${alarmedEquipments.length} EQUIPOS ALARMADOS!\n`;
    text += `🔴 *DETALLE DE EQUIPOS EN ALARMA:*\n`;
    alarmedEquipments.forEach((eq, idx) => {
      text += `${idx + 1}. 📍 *[${eq.area}]* ${eq.displayName}: ${eq.statusAndValue}\n`;
      if (eq.alarmReason) text += `   ↳ ⚠️ ${eq.alarmReason}\n`;
      if (eq.notes && eq.notes !== '—') text += `   ↳ 📝 Obs: ${eq.notes}\n`;
    });
    text += `\n`;
  } else {
    text += `✅ *ESTADO DE ALARMAS:* 0 Alarmas (Todos los equipos conformes y en rango)\n\n`;
  }

  text += `📌 *Resumen Operativo:* ${okEquipments.length} conformes | ${offEquipments.length} apagados | ${alarmedEquipments.length} en alarma\n\n`;

  // Key meter readings
  const mr = round.meterReadings || {};
  const hasReadings = Object.values(mr).some(v => v !== undefined && v !== null);
  if (hasReadings) {
    text += `🚰 *LECTURAS Y CONTADORES PRINCIPALES:*\n`;
    if (mr.mainWaterPressurePsi !== undefined) text += `• Presión Red General: ${mr.mainWaterPressurePsi} PSI\n`;
    if (mr.hotWaterSupplyTempC !== undefined) text += `• Temp. Suministro ACS: ${mr.hotWaterSupplyTempC} °C\n`;
    if (mr.hotWaterReturnTempC !== undefined) text += `• Temp. Retorno ACS: ${mr.hotWaterReturnTempC} °C\n`;
    if (mr.poolPh !== undefined || mr.poolChlorinePpm !== undefined) {
      text += `• Piscina: pH ${mr.poolPh ?? '—'} | Cloro ${mr.poolChlorinePpm ?? '—'} ppm\n`;
    }
    if (mr.waterCubicMeters !== undefined) text += `• Contador Agua: ${mr.waterCubicMeters} m³\n`;
    if (mr.electricKwh !== undefined) text += `• Contador Electricidad: ${mr.electricKwh} kWh\n`;
    if (mr.gasCubicMeters !== undefined) text += `• Contador Gas: ${mr.gasCubicMeters} m³\n`;
    if (mr.customMeters && typeof mr.customMeters === 'object') {
      Object.values(mr.customMeters).forEach((cm: any) => {
        if (cm && cm.name && cm.value !== undefined && cm.value !== '') {
          text += `• ${cm.name}: ${cm.value} ${cm.unit || ''}\n`;
        }
      });
    }
    text += `\n`;
  }

  // Group by Area
  const groupedByArea: Record<string, IndividualEquipment[]> = {};
  allEquipments.forEach(eq => {
    const areaKey = eq.area || 'Área General';
    if (!groupedByArea[areaKey]) groupedByArea[areaKey] = [];
    groupedByArea[areaKey].push(eq);
  });

  text += `🔍 *DETALLE POR ÁREAS Y EQUIPOS:*\n`;
  Object.entries(groupedByArea).forEach(([area, eqs]) => {
    text += `\n📍 *${area.toUpperCase()}*\n`;
    eqs.forEach(eq => {
      const bullet = eq.isAlarmed ? '🔴' : eq.isOk ? '🟢' : eq.isOff ? '⚫' : eq.isWarning ? '🟡' : '⏳';
      text += `${bullet} *${eq.displayName}:* ${eq.statusAndValue}\n`;
      if (eq.notes && eq.notes !== '—') {
        text += `   ↳ 📝 Obs: ${eq.notes}\n`;
      }
    });
  });

  if (round.generalNotes && round.generalNotes.trim() !== '') {
    text += `\n📝 *Observaciones de Turno:*\n${round.generalNotes}\n`;
  }

  if (round.technicianSignature) {
    text += `\n✍️ *Firmado por:* ${round.technicianSignature}\n`;
  }

  text += `\n_Generado por el Sistema de Mantenimiento Hotelero._`;
  return text;
}

/**
 * Builds the complete PDF document with jsPDF and jspdf-autotable.
 * - Header with verified executive summary (clean ASCII typography, no emoji distortion).
 * - Section 2: Audit of Alarmed Equipment (Strictly displays ONLY the specific alarmed equipment).
 * - Section 3: Complete Inspection Table (Every equipment in its own sequential row; alarmed ones highlighted in red).
 */
export function generateRoundPdf(round: DailyRound, hotelInfo?: HotelInfo): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const hotelName = hotelInfo?.hotelName || 'GRAND HOTEL & RESORT';
  const chiefEngStr = String(hotelInfo?.chiefEngineer ?? '');
  const chiefEngineer = (chiefEngStr && !chiefEngStr.toLowerCase().includes('mateo') && !chiefEngStr.toLowerCase().includes('juan'))
    ? hotelInfo?.chiefEngineer
    : 'Mauricio Marín';
  const shiftName = round.shift === 'manana' ? 'MAÑANA' : round.shift === 'tarde' ? 'TARDE' : 'NOCHE';

  // Extract every physical equipment individually
  const allEquipments = extractRoundEquipments(round);
  const alarmedEquipments = allEquipments.filter(e => e.isAlarmed);
  const okEquipments = allEquipments.filter(e => e.isOk);
  const offEquipments = allEquipments.filter(e => e.isOff);
  const totalEquipments = allEquipments.length;

  // --- BRAND HEADER ---
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, 210, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(hotelName.toUpperCase(), 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text('DEPARTAMENTO DE MANTENIMIENTO E INGENIERÍA HOTELERA', 14, 17);
  doc.text('REPORTE OFICIAL AUDITADO DE RONDA TÉCNICA DIARIA', 14, 22);

  // Status Badge in Header
  const isComplete = round.status === 'completada';
  const statusLabel = isComplete ? 'RONDA COMPLETADA' : 'RONDA EN PROCESO';
  if (isComplete) {
    doc.setFillColor(16, 185, 129); // emerald-500
  } else {
    doc.setFillColor(217, 119, 6); // amber-500
  }
  doc.roundedRect(146, 8, 50, 11, 2, 2, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(statusLabel, 171, 15, { align: 'center' });

  // --- ROUND METADATA BOX ---
  let currentY = 32;
  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 26, 2, 2, 'FD');

  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);

  // Column 1
  doc.setFont('helvetica', 'bold');
  doc.text('Fecha:', 18, currentY + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(round.date || '—', 32, currentY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Hora:', 18, currentY + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${round.time || '—'} hs`, 32, currentY + 13.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Turno:', 18, currentY + 20.5);
  doc.setFont('helvetica', 'normal');
  doc.text(shiftName, 32, currentY + 20.5);

  // Column 2
  doc.setFont('helvetica', 'bold');
  doc.text('Técnico:', 72, currentY + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(round.technicianName || '—', 86, currentY + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Cumplimiento:', 72, currentY + 13.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${round.compliancePercentage ?? 100}% (${totalEquipments} equipos)`, 96, currentY + 13.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Auditoría Alarmas:', 72, currentY + 20.5);
  if (alarmedEquipments.length > 0) {
    doc.setTextColor(190, 18, 60); // red
    doc.setFont('helvetica', 'bold');
    doc.text(`[ALERTA] ${alarmedEquipments.length} ALARMA(S) ACTIVAS`, 102, currentY + 20.5);
  } else {
    doc.setTextColor(22, 101, 52); // green
    doc.setFont('helvetica', 'bold');
    doc.text(`[CONFORME] 0 ALARMAS (Todo en Rango)`, 102, currentY + 20.5);
  }
  doc.setTextColor(51, 65, 85);

  // Column 3
  doc.setFont('helvetica', 'bold');
  doc.text('Estado Equipos:', 142, currentY + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${okEquipments.length} Ok | ${offEquipments.length} Off`, 142, currentY + 13.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Novedades:', 142, currentY + 20.5);
  doc.setFont('helvetica', 'normal');
  doc.text(`${round.anomalies?.length || 0} registrada(s)`, 160, currentY + 20.5);

  currentY += 30;

  // --- 1. KEY METER READINGS TABLE ---
  const mr = round.meterReadings || {};
  const meterRows = [
    [
      'Presión Red Agua General',
      mr.mainWaterPressurePsi !== undefined ? `${mr.mainWaterPressurePsi} PSI` : '—',
      'Temp. Suministro ACS',
      mr.hotWaterSupplyTempC !== undefined ? `${mr.hotWaterSupplyTempC} °C` : '—'
    ],
    [
      'Temp. Retorno ACS',
      mr.hotWaterReturnTempC !== undefined ? `${mr.hotWaterReturnTempC} °C` : '—',
      'Piscina (pH / Cloro)',
      (mr.poolPh !== undefined || mr.poolChlorinePpm !== undefined) 
        ? `pH: ${mr.poolPh ?? '—'} | Cl: ${mr.poolChlorinePpm ?? '—'} ppm` 
        : '—'
    ],
    [
      'Contador Agua Potable',
      mr.waterCubicMeters !== undefined ? `${mr.waterCubicMeters} m³` : '—',
      'Contador Energía Eléctrica',
      mr.electricKwh !== undefined ? `${mr.electricKwh} kWh` : '—'
    ],
    [
      'Contador Gas Natural / GLP',
      mr.gasCubicMeters !== undefined ? `${mr.gasCubicMeters} m³` : '—',
      'Estado General del Sistema',
      round.status === 'completada' ? 'Operativo y Verificado' : 'En Inspección'
    ]
  ];

  if (mr.customMeters && typeof mr.customMeters === 'object') {
    const customList = Object.values(mr.customMeters).filter((cm: any) => cm && cm.name);
    for (let i = 0; i < customList.length; i += 2) {
      const cm1 = customList[i] as any;
      const cm2 = customList[i + 1] as any;
      meterRows.push([
        cm1.name,
        cm1.value !== undefined && cm1.value !== '' ? `${cm1.value} ${cm1.unit || ''}` : '—',
        cm2 ? cm2.name : '—',
        cm2 && cm2.value !== undefined && cm2.value !== '' ? `${cm2.value} ${cm2.unit || ''}` : '—'
      ]);
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('1. CONTADORES Y LECTURAS PRINCIPALES DE ENERGÍA Y FLUIDOS', 14, currentY);
  currentY += 2.5;

  autoTable(doc, {
    startY: currentY,
    head: [['Parámetro', 'Valor Registrado', 'Parámetro', 'Valor Registrado']],
    body: meterRows,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2, textColor: [30, 41, 59] },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, fillColor: [248, 250, 252] },
      1: { cellWidth: 41, fontStyle: 'bold', textColor: [15, 23, 42] },
      2: { fontStyle: 'bold', cellWidth: 50, fillColor: [248, 250, 252] },
      3: { cellWidth: 41, fontStyle: 'bold', textColor: [15, 23, 42] },
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // --- 2. AUDIT OF ALARMED EQUIPMENT (ONLY THE SPECIFIC ALARMED ONES!) ---
  if (alarmedEquipments.length > 0) {
    if (currentY > 230) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(190, 18, 60); // rose-700
    doc.text(`2. AUDITORÍA DE EQUIPOS ALARMADOS (${alarmedEquipments.length} ALARMAS ACTIVAS)`, 14, currentY);
    currentY += 2.5;

    const alarmTableBody = alarmedEquipments.map((a, i) => [
      `${i + 1}`,
      a.area,
      a.displayName,
      a.statusAndValue,
      a.rangeDisplay,
      a.alarmReason || 'Condición NO OK / Fuera de Rango'
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Área', 'Equipo Específico Alarmado', 'Estado / Medición', 'Rango Seguro', 'Motivo de Alarma']],
      body: alarmTableBody,
      theme: 'grid',
      styles: { 
        fontSize: 7.5, 
        cellPadding: 2.5, 
        overflow: 'linebreak', 
        textColor: [159, 18, 57], 
        fontStyle: 'bold',
        fillColor: [255, 241, 242], // soft red
        lineColor: [253, 164, 175],
        lineWidth: 0.15
      },
      headStyles: { 
        fillColor: [190, 18, 60],
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        fontSize: 8,
        cellPadding: 2.5
      },
      columnStyles: {
        0: { cellWidth: 8, fontStyle: 'bold', halign: 'center' },
        1: { cellWidth: 32 },
        2: { cellWidth: 48, fontStyle: 'bold' },
        3: { cellWidth: 32, halign: 'center', textColor: [190, 18, 60] },
        4: { cellWidth: 26, halign: 'center', textColor: [51, 65, 85] },
        5: { cellWidth: 36, fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 7;
  } else {
    // Green confirmation banner when 0 alarms exist
    doc.setDrawColor(187, 247, 208);
    doc.setFillColor(240, 253, 244);
    doc.roundedRect(14, currentY, 182, 10, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(22, 101, 52);
    doc.text('AUDITORÍA DE SEGURIDAD OPERATIVA: 0 equipos alarmados. Todos los parámetros inspeccionados operan dentro de límites seguros.', 18, currentY + 6.5);
    currentY += 15;
  }

  // --- 3. COMPLETE CHECKPOINTS TABLE (EACH EQUIPMENT HAS ITS OWN CLEAN ROW IN ORDER) ---
  if (currentY > 230) {
    doc.addPage();
    currentY = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('3. DETALLE COMPLETO DE TODOS LOS PUNTOS DE INSPECCIÓN Y MEDICIONES', 14, currentY);
  currentY += 2.5;

  const tableBody = allEquipments.map((e, i) => [
    `${i + 1}`,
    e.area,
    e.displayName,
    e.statusAndValue,
    e.rangeDisplay,
    e.notes
  ]);

  autoTable(doc, {
    startY: currentY,
    head: [['#', 'Área', 'Equipo / Sistema', 'Estado / Medición', 'Rango Seguro', 'Observaciones']],
    body: tableBody,
    theme: 'grid',
    styles: { 
      fontSize: 7.5, 
      cellPadding: 2, 
      overflow: 'linebreak', 
      textColor: [30, 41, 59],
      valign: 'middle',
      lineColor: [203, 213, 225],
      lineWidth: 0.15
    },
    headStyles: { 
      fillColor: [15, 23, 42], 
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      fontSize: 8,
      cellPadding: 2.5
    },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center', fillColor: [248, 250, 252] },
      1: { cellWidth: 30, fontStyle: 'bold', fillColor: [248, 250, 252] },
      2: { cellWidth: 50, fontStyle: 'bold' },
      3: { cellWidth: 34, halign: 'center' },
      4: { cellWidth: 26, halign: 'center' },
      5: { cellWidth: 34 },
    },
    didParseCell: (data) => {
      if (data.section === 'body') {
        const eq = allEquipments[data.row.index];
        if (eq) {
          if (eq.isAlarmed) {
            // Highlight the alarmed equipment row in light red with dark red bold text
            data.cell.styles.fillColor = [254, 226, 226];
            data.cell.styles.textColor = [190, 18, 60];
            data.cell.styles.fontStyle = 'bold';
          } else if (eq.isOff) {
            if (data.column.index === 3) {
              data.cell.styles.fillColor = [241, 245, 249];
              data.cell.styles.textColor = [71, 85, 105];
              data.cell.styles.fontStyle = 'bold';
            }
          } else if (eq.isOk) {
            if (data.column.index === 3) {
              data.cell.styles.textColor = [22, 101, 52];
              data.cell.styles.fontStyle = 'bold';
            }
          }
        }
      }
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 7;

  // --- 4. NOVEDADES / ANOMALIES TABLE (IF ANY) ---
  if (round.anomalies && round.anomalies.length > 0) {
    if (currentY > 235) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(190, 18, 60); // rose-700
    doc.text(`4. NOVEDADES E INCIDENCIAS REGISTRADAS (${round.anomalies.length})`, 14, currentY);
    currentY += 2.5;

    const anomalyRows = round.anomalies.map((a, i) => [
      `${i + 1}`,
      a.area,
      a.title,
      a.severity.toUpperCase(),
      a.description,
      a.status.toUpperCase()
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Área', 'Título / Falla', 'Severidad', 'Detalle de la Novedad', 'Estado']],
      body: anomalyRows,
      theme: 'grid',
      styles: { fontSize: 7, cellPadding: 2, textColor: [30, 41, 59] },
      headStyles: { fillColor: [190, 18, 60], textColor: [255, 255, 255], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 8, fontStyle: 'bold' },
        1: { cellWidth: 35 },
        2: { cellWidth: 35, fontStyle: 'bold' },
        3: { cellWidth: 22, fontStyle: 'bold', textColor: [190, 18, 60] },
        4: { cellWidth: 58 },
        5: { cellWidth: 24, fontStyle: 'bold' },
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 7;
  }

  // --- 5. GENERAL OBSERVATIONS & SIGNATURE BOX ---
  if (currentY > 230) {
    doc.addPage();
    currentY = 18;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('5. OBSERVACIONES GENERALES Y VALIDACIÓN DE TURNO', 14, currentY);
  currentY += 2.5;

  doc.setDrawColor(226, 232, 240);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(14, currentY, 182, 32, 2, 2, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const notesText = round.generalNotes && round.generalNotes.trim() !== '' 
    ? round.generalNotes 
    : 'Sin observaciones extraordinarias adicionales registradas en este turno.';
  doc.text(doc.splitTextToSize(notesText, 174), 18, currentY + 6);

  // Signatures at bottom
  const sigY = currentY + 23;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`Técnico de Turno: ${round.technicianName}`, 18, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Firma / Registro: ${round.technicianSignature || round.technicianName}`, 18, sigY + 4);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(`Revisión Jefatura: ${chiefEngineer}`, 120, sigY);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, 120, sigY + 4);

  // Page Numbers
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Página ${i} de ${pageCount} • Sistema de Gestión de Mantenimiento Hotelero • Registro ID: ${round.id}`,
      105,
      292,
      { align: 'center' }
    );
  }

  return doc;
}

/**
 * Downloads the PDF directly to user's device
 */
export function downloadRoundPdf(round: DailyRound, hotelInfo?: HotelInfo): void {
  const doc = generateRoundPdf(round, hotelInfo);
  const safeDate = (round.date || 'fecha').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeShift = (round.shift || 'turno').toLowerCase();
  const filename = `Ronda_Mantenimiento_${safeDate}_${safeShift}.pdf`;
  doc.save(filename);
}

/**
 * Returns a Blob of the generated PDF
 */
export function getRoundPdfBlob(round: DailyRound, hotelInfo?: HotelInfo): Blob {
  const doc = generateRoundPdf(round, hotelInfo);
  return doc.output('blob');
}

/**
 * Shares round via WhatsApp App / Protocol / Web
 */
export function shareRoundViaWhatsApp(round: DailyRound, hotelInfo?: HotelInfo): void {
  const text = generateRoundSummaryText(round, hotelInfo);
  const encoded = encodeURIComponent(text);
  
  const appScheme = `whatsapp://send?text=${encoded}`;
  const webUrl = `https://api.whatsapp.com/send?text=${encoded}`;

  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    window.location.href = appScheme;
    setTimeout(() => {
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    }, 1200);
  } else {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = appScheme;
    document.body.appendChild(iframe);

    setTimeout(() => {
      document.body.removeChild(iframe);
      window.open(webUrl, '_blank', 'noopener,noreferrer');
    }, 800);
  }
}

/**
 * Shares round via Facebook / Messenger App
 */
export function shareRoundViaFacebook(round: DailyRound, hotelInfo?: HotelInfo): void {
  const text = generateRoundSummaryText(round, hotelInfo);
  const currentUrl = window.location.href;
  const encodedText = encodeURIComponent(text);
  const fbAppScheme = `fb://facewebmodal/f?href=${encodeURIComponent(currentUrl)}`;
  const fbWebUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(currentUrl)}&quote=${encodedText}`;

  const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  if (isMobile) {
    window.location.href = fbAppScheme;
    setTimeout(() => {
      window.open(fbWebUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
    }, 1200);
  } else {
    window.open(fbWebUrl, '_blank', 'noopener,noreferrer,width=600,height=500');
  }
}

/**
 * Native Device Share API (WhatsApp, Facebook, Telegram, Mail, AirDrop, etc.)
 */
export async function shareRoundNative(
  round: DailyRound,
  hotelInfo?: HotelInfo,
  onPdfShared?: () => void
): Promise<boolean> {
  const text = generateRoundSummaryText(round, hotelInfo);
  const title = `Ronda de Mantenimiento - ${round.date} (${round.shift})`;
  const filename = `Ronda_Mantenimiento_${round.date}_${round.shift}.pdf`;

  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      const pdfBlob = getRoundPdfBlob(round, hotelInfo);
      const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });

      if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
        await navigator.share({
          title,
          text,
          files: [pdfFile]
        });
        if (onPdfShared) onPdfShared();
        return true;
      } else {
        await navigator.share({
          title,
          text,
          url: window.location.href
        });
        if (onPdfShared) onPdfShared();
        return true;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Share error:', err);
      }
      return false;
    }
  }
  return false;
}
