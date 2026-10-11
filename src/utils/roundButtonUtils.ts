import { RoundCheckpoint, RoundMeasurementField, DailyRound } from '../types';

export type ButtonActionType = 'default' | 'turn_off' | 'turn_on' | 'failure';

/**
 * Returns the natural default action type for a button label if not explicitly configured.
 */
export function getNaturalButtonAction(btnText: any): ButtonActionType {
  const lower = String(btnText ?? '').toLowerCase().trim();
  if (
    lower.includes('apagado') || 
    lower.includes('apagar') || 
    lower === 'off' || 
    lower.includes('detenido') || 
    lower.includes('parado') ||
    lower.includes('desactivado') ||
    lower.includes('inactivo')
  ) {
    return 'turn_off';
  }
  if (
    lower.includes('encendido') || 
    lower.includes('encender') || 
    lower === 'on' || 
    lower.includes('marcha') || 
    lower.includes('operando') ||
    lower.includes('activo')
  ) {
    return 'turn_on';
  }
  if (
    lower.includes('falla') || 
    (lower.includes('alarma') && !lower.includes('sin alarma') && !lower.includes('no alarma')) || 
    lower.includes('crítico') || 
    lower.includes('critico') || 
    lower.includes('no ok') ||
    lower.includes('disparado') ||
    lower.includes('trip')
  ) {
    return 'failure';
  }
  return 'default';
}

/**
 * Resolves the effective action type for a checkpoint button:
 * 1. Checks the checkpoint's own buttonActions (if configured)
 * 2. Fallbacks to the roundTemplate's buttonActions for this checkpoint
 * 3. Fallbacks to the natural action based on button text
 */
export function getCheckpointButtonAction(
  chk?: Partial<RoundCheckpoint> | null,
  btnName?: any,
  roundTemplate?: RoundCheckpoint[]
): ButtonActionType {
  if (btnName === undefined || btnName === null || btnName === '') return 'default';
  const strBtnName = String(btnName);

  // 1. Direct checkpoint buttonActions
  if (chk?.buttonActions && chk.buttonActions[strBtnName]?.actionType) {
    return chk.buttonActions[strBtnName].actionType as ButtonActionType;
  }

  // 2. Lookup in roundTemplate if available
  if (roundTemplate && roundTemplate.length > 0 && chk) {
    const tpl = roundTemplate.find(
      t => (chk.id && t.id === chk.id) || 
           (chk.title && t.title === chk.title && (!chk.area || t.area === chk.area)) || 
           (chk.title && t.title === chk.title)
    );
    if (tpl?.buttonActions && tpl.buttonActions[strBtnName]?.actionType) {
      return tpl.buttonActions[strBtnName].actionType as ButtonActionType;
    }
  }

  // 3. Fallback to natural button action
  return getNaturalButtonAction(strBtnName);
}

/**
 * Resolves the effective action type for an individual measurement field button:
 * 1. Checks the field's own buttonActions (if configured)
 * 2. Fallbacks to the roundTemplate's field buttonActions if available
 * 3. Fallbacks to natural button action based on button text
 */
export function getFieldButtonAction(
  field?: Partial<RoundMeasurementField> | null,
  btnName?: any,
  chk?: Partial<RoundCheckpoint> | null,
  roundTemplate?: RoundCheckpoint[],
  fieldIndex?: number
): ButtonActionType {
  if (btnName === undefined || btnName === null || btnName === '') return 'default';
  const strBtnName = String(btnName);

  // 1. Direct field buttonActions
  if (field?.buttonActions && field.buttonActions[strBtnName]?.actionType) {
    return field.buttonActions[strBtnName].actionType as ButtonActionType;
  }

  // 2. Lookup in roundTemplate if available
  if (roundTemplate && roundTemplate.length > 0 && chk) {
    const tpl = roundTemplate.find(
      t => (chk.id && t.id === chk.id) || 
           (chk.title && t.title === chk.title && (!chk.area || t.area === chk.area)) || 
           (chk.title && t.title === chk.title)
    );
    if (tpl?.measurementFields && fieldIndex !== undefined && tpl.measurementFields[fieldIndex]) {
      const tplField = tpl.measurementFields[fieldIndex];
      if (tplField?.buttonActions && tplField.buttonActions[strBtnName]?.actionType) {
        return tplField.buttonActions[strBtnName].actionType as ButtonActionType;
      }
    }
  }

  // 3. Fallback to natural button action
  return getNaturalButtonAction(strBtnName);
}

/**
 * Checks whether a checkpoint has an active alarm condition (via configured failure action,
 * alarm status, or out-of-safe-range measurement values).
 */
export function isCheckpointAlarmActive(
  chk?: Partial<RoundCheckpoint> | null,
  roundTemplate?: RoundCheckpoint[]
): { isAlarm: boolean; reason?: string } {
  if (!chk) return { isAlarm: false };

  const currentButtonAction = chk.statusValue 
    ? getCheckpointButtonAction(chk, chk.statusValue, roundTemplate) 
    : 'default';
  const valButtonAction = typeof chk.currentValue === 'string' && chk.currentValue
    ? getCheckpointButtonAction(chk, chk.currentValue, roundTemplate)
    : 'default';

  const isOff = currentButtonAction === 'turn_off';
  if (isOff) return { isAlarm: false };

  if (currentButtonAction === 'failure') {
    return { isAlarm: true, reason: `Botón de alarma activado: "${chk.statusValue}"` };
  }
  if (valButtonAction === 'failure') {
    return { isAlarm: true, reason: `Estado de alarma activado: "${chk.currentValue}"` };
  }

  // Check numeric bounds on main checkpoint
  const parsedCurrentVal = typeof chk.currentValue === 'number' 
    ? chk.currentValue 
    : parseFloat(String(chk.currentValue || '').replace(',', '.'));
  if (chk.type === 'numeric' && !isNaN(parsedCurrentVal) && (chk.currentValue !== '' && chk.currentValue !== undefined)) {
    if (chk.minValue !== undefined && parsedCurrentVal < chk.minValue) {
      return { isAlarm: true, reason: `Valor ${parsedCurrentVal} ${chk.unit || ''} inferior al mínimo (${chk.minValue})` };
    }
    if (chk.maxValue !== undefined && parsedCurrentVal > chk.maxValue) {
      return { isAlarm: true, reason: `Valor ${parsedCurrentVal} ${chk.unit || ''} superior al máximo (${chk.maxValue})` };
    }
  }

  // Check measurement fields
  if (chk.measurementFields && chk.measurementFields.length > 0) {
    for (let fIdx = 0; fIdx < chk.measurementFields.length; fIdx++) {
      const f = chk.measurementFields[fIdx];
      const fieldAction = f.statusValue 
        ? getFieldButtonAction(f, f.statusValue, chk, roundTemplate, fIdx) 
        : 'default';
      const isFieldOff = fieldAction === 'turn_off';
      if (!isFieldOff) {
        if (fieldAction === 'failure') {
          return { isAlarm: true, reason: `Campo "${f.name || fIdx + 1}" con botón de alarma activado: "${f.statusValue}"` };
        }
        const pVal = typeof f.value === 'number' ? f.value : parseFloat(String(f.value || '').replace(',', '.'));
        if (!isNaN(pVal) && (f.value !== '' && f.value !== undefined)) {
          if (f.minValue !== undefined && pVal < f.minValue) {
            return { isAlarm: true, reason: `Campo "${f.name || fIdx + 1}" valor ${pVal} ${f.unit || ''} inferior al mínimo (${f.minValue})` };
          }
          if (f.maxValue !== undefined && pVal > f.maxValue) {
            return { isAlarm: true, reason: `Campo "${f.name || fIdx + 1}" valor ${pVal} ${f.unit || ''} superior al máximo (${f.maxValue})` };
          }
        }
      }
    }
  }

  return { isAlarm: false };
}

/**
 * Checks whether an active round checkpoint is fully registered/completed.
 */
export function isCheckpointComplete(
  chk?: Partial<RoundCheckpoint> | null,
  roundTemplate?: RoundCheckpoint[]
): boolean {
  if (!chk) return false;

  const directVal = chk.currentValue !== undefined && chk.currentValue !== null && String(chk.currentValue).trim() !== '';
  const statusVal = chk.statusValue !== undefined && chk.statusValue !== null && String(chk.statusValue).trim() !== '';

  // Find corresponding template if available to verify if the checkpoint requires subfields
  const tpl = roundTemplate?.find(t => (t.id && t.id === chk.id) || (chk.title && t.title === chk.title));

  const chkAction = chk.statusValue 
    ? getCheckpointButtonAction(chk, chk.statusValue, roundTemplate) 
    : 'default';
  const isGlobalOff = chkAction === 'turn_off' || chk.ampState === 'Apagado' || chk.statusValue === 'Apagado';
  if (isGlobalOff) return true;

  // 1. If checkpoint has multiple measurement fields (e.g. Sistema De Agua Caliente, Neveras, Bar, etc.)
  const hasFieldsOnChk = Boolean(chk.measurementFields && Array.isArray(chk.measurementFields) && chk.measurementFields.length > 0);
  const hasFieldsOnTpl = Boolean(tpl?.measurementFields && Array.isArray(tpl.measurementFields) && tpl.measurementFields.length > 0);

  if (hasFieldsOnChk || hasFieldsOnTpl) {
    const fields = (chk.measurementFields && chk.measurementFields.length > 0) ? chk.measurementFields : tpl!.measurementFields!;
    
    // If the checkpoint has a single field and direct value or status is provided on the checkpoint
    if (fields.length <= 1 && (directVal || statusVal)) {
      return true;
    }

    // If template has fields but checkpoint was filled as a direct numeric/status value
    if (hasFieldsOnTpl && (!hasFieldsOnChk || chk.measurementFields!.length < tpl!.measurementFields!.length)) {
      if (directVal || statusVal) return true;
      return false;
    }

    return fields.every((f, fIdx) => {
      if (!f) return false;
      const tplF = tpl?.measurementFields?.[fIdx];
      const fieldAction = f.statusValue 
        ? getFieldButtonAction(f, f.statusValue, chk, roundTemplate, fIdx) 
        : 'default';
      const isFieldOff = isGlobalOff || fieldAction === 'turn_off' || f.ampState === 'Apagado' || f.statusValue === 'Apagado' || (typeof f.statusValue === 'string' && f.statusValue.toLowerCase().includes('apagado')) || f.value === 0;
      if (isFieldOff) return true; // Off equipment is counted as filled/completed

      const effVal = (f.value !== undefined && f.value !== null && String(f.value).trim() !== '') 
        ? f.value 
        : (fields.length === 1 ? chk.currentValue : undefined);

      const hasUnit = Boolean(f.unit || tplF?.unit || f.name || tplF?.name);
      if (hasUnit && (f.unit === '°C' || f.unit === '°F' || f.unit === 'PSI' || f.unit === 'bar' || f.unit === 'kWh' || f.unit === 'm³' || f.unit === 'L' || f.unit === '%' || f.unit === 'ppm' || f.unit === 'pH' || f.unit)) {
        if (effVal === undefined || effVal === null || String(effVal).trim() === '') {
          return false;
        }
        const num = typeof effVal === 'number' ? effVal : parseFloat(String(effVal).replace(',', '.'));
        return !isNaN(num);
      }

      const effStatus = (f.statusValue !== undefined && f.statusValue !== null && String(f.statusValue).trim() !== '')
        ? f.statusValue
        : (fields.length === 1 ? chk.statusValue : undefined);

      if (effStatus !== undefined && effStatus !== null && String(effStatus).trim() !== '') {
        return true;
      }

      if (effVal !== undefined && effVal !== null && String(effVal).trim() !== '') {
        const num = typeof effVal === 'number' ? effVal : parseFloat(String(effVal).replace(',', '.'));
        return !isNaN(num);
      }

      return false;
    });
  }

  // 2. Numeric single checkpoint (e.g. Nevera, Temperatura, Presión, etc.)
  if (chk.type === 'numeric' || tpl?.type === 'numeric') {
    if (directVal) {
      const num = typeof chk.currentValue === 'number' ? chk.currentValue : parseFloat(String(chk.currentValue).replace(',', '.'));
      return !isNaN(num);
    }
    if (statusVal && !(chk.unit || tpl?.unit)) return true;
    return false;
  }

  // 3. Options or OK_NOK
  if (chk.type === 'options' || chk.type === 'ok_nok' || tpl?.type === 'options' || tpl?.type === 'ok_nok') {
    const val = chk.currentValue !== undefined && chk.currentValue !== null && String(chk.currentValue).trim() !== ''
      ? String(chk.currentValue).trim()
      : (chk.statusValue ? String(chk.statusValue).trim() : '');
    return val !== '';
  }

  // 4. Text
  if (chk.type === 'text' || tpl?.type === 'text') {
    return chk.currentValue !== undefined && chk.currentValue !== null && String(chk.currentValue).trim() !== '';
  }

  // 5. Boolean
  if (chk.type === 'boolean' || tpl?.type === 'boolean') {
    return chk.currentValue !== undefined && chk.currentValue !== null && chk.currentValue !== '';
  }

  // 6. Generic fallback
  return directVal || statusVal;
}

/**
 * Rigorously validates whether a complete round has all mandatory checkpoints and fields filled.
 * Returns an object with isValid, missingCount, and missingDetails.
 */
export function validateRoundCompletion(
  round: Partial<DailyRound> | null | undefined,
  roundTemplate?: RoundCheckpoint[]
): { isValid: boolean; missingCount: number; missingDetails: string[] } {
  if (!round || !Array.isArray(round.checkpoints) || round.checkpoints.length === 0) {
    return { isValid: false, missingCount: 1, missingDetails: ['No contiene puntos de inspección'] };
  }

  const missingDetails: string[] = [];
  round.checkpoints.forEach((chk, idx) => {
    if (!isCheckpointComplete(chk, roundTemplate)) {
      const name = chk.title || `Punto #${idx + 1}`;
      const area = chk.area ? ` (${chk.area})` : '';
      missingDetails.push(`${name}${area}`);
    }
  });

  return {
    isValid: missingDetails.length === 0,
    missingCount: missingDetails.length,
    missingDetails
  };
}

/**
 * Returns list of incomplete checkpoints from an active round.
 */
export function getIncompleteCheckpoints(
  checkpoints?: Partial<RoundCheckpoint>[] | null,
  roundTemplate?: RoundCheckpoint[]
): RoundCheckpoint[] {
  if (!checkpoints || !Array.isArray(checkpoints)) return roundTemplate ? [...roundTemplate] : [];
  const incomplete = (checkpoints as RoundCheckpoint[]).filter(chk => !isCheckpointComplete(chk, roundTemplate));

  if (roundTemplate && Array.isArray(roundTemplate) && roundTemplate.length > 0) {
    const existingIds = new Set(checkpoints.map(c => c?.id).filter(Boolean));
    const existingTitles = new Set(checkpoints.map(c => c?.title ? `${c.title.trim().toLowerCase()}___${(c.area || '').trim().toLowerCase()}` : '').filter(Boolean));

    roundTemplate.forEach(tpl => {
      const key = `${(tpl.title || '').trim().toLowerCase()}___${(tpl.area || '').trim().toLowerCase()}`;
      if (!existingIds.has(tpl.id) && !existingTitles.has(key)) {
        if (!incomplete.some(item => item.id === tpl.id || (item.title === tpl.title && item.area === tpl.area))) {
          incomplete.push(tpl);
        }
      }
    });
  }

  return incomplete;
}
