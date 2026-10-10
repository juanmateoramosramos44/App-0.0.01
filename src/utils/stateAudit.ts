import {
  MaintenanceTask,
  PreventiveWorkOrder,
  Incident,
  HotelRequest,
  DailyRound,
  TaskStatus,
  Equipment,
  AuditLogEntry
} from '../types';

export interface StateAuditCorrection {
  entity: 'tasks' | 'workOrders' | 'incidents' | 'requests' | 'rounds' | 'equipments';
  id: string;
  field: string;
  originalValue: any;
  correctedValue: any;
  reason: string;
}

export interface StateAuditResult {
  auditedAt: string;
  isConsistent: boolean;
  totalCorrections: number;
  corrections: StateAuditCorrection[];
  counts: {
    tasks: { total: number; pending: number; inProgress: number; completed: number; canceled: number };
    workOrders: { total: number; pending: number; dueSoon: number; overdue: number; completed: number };
    incidents: { total: number; open: number; solved: number };
    requests: { total: number; pending: number; inProgress: number; resolved: number; canceled: number };
    rounds: { total: number; inProgress: number; completed: number };
  };
  summaryMessage: string;
}

export const CANONICAL_INCIDENT_MAP: Record<string, string> = {
  'inc-1789643372377-carlos-m': 'inc-1789647000266-k0ogc',
  'inc-1789556089784-juan-m': 'inc-1789558924973-m8oie',
  'inc-anom-rnd-1789643372377-Alarma_en:_Combustible': 'inc-1789647000266-k0ogc',
  'inc-anom-rnd-1789614646673-Alarma_en:_Combustible': 'inc-1789617826284-mxa5x',
  'inc-anom-rnd-1789556089784-Alarma_en:_Combustible': 'inc-1789558924973-m8oie',
  'inc-anom-rnd-1789521648195-Alarma_en:_Combustible': 'inc-1789525663358-c3mmn',
  'inc-anom-rnd-1789470736664-Alarma_en:_Combustible': 'inc-1789474138830-6b0c6',
  'inc-anom-rnd-1789987951724-Alarma_en:_Cava_De_Congelación': 'inc-1789990278160-gj2mc'
};

/**
 * Normaliza y audita las tareas de mantenimiento
 */
export function auditTasks(
  tasksList: MaintenanceTask[],
  deletedIdsSet: Set<string>,
  corrections: StateAuditCorrection[]
): MaintenanceTask[] {
  const result: MaintenanceTask[] = [];
  const seenIds = new Set<string>();

  for (const raw of tasksList || []) {
    if (!raw || typeof raw !== 'object') continue;
    if (!raw.id || typeof raw.id !== 'string') continue;
    if (deletedIdsSet.has(raw.id)) continue;
    if (seenIds.has(raw.id)) {
      corrections.push({
        entity: 'tasks',
        id: raw.id,
        field: 'id',
        originalValue: raw.id,
        correctedValue: 'omitted_duplicate',
        reason: 'Eliminado duplicado exacto de tarea por ID.'
      });
      continue;
    }
    seenIds.add(raw.id);

    const task: MaintenanceTask = { ...raw };

    // 1. Validar y corregir estado
    const validStatuses: TaskStatus[] = ['pendiente', 'en_progreso', 'completada', 'cancelada'];
    let normalizedStatus: TaskStatus = task.status;

    if (!validStatuses.includes(normalizedStatus)) {
      const rawStatusStr = String(normalizedStatus || '').toLowerCase();
      if (rawStatusStr === 'completado' || rawStatusStr === 'finalizada' || rawStatusStr === 'resuelto' || rawStatusStr === 'resuelta') {
        normalizedStatus = 'completada';
      } else if (rawStatusStr === 'en_proceso' || rawStatusStr === 'en_curso' || rawStatusStr === 'in_progress') {
        normalizedStatus = 'en_progreso';
      } else if (rawStatusStr === 'cancelado' || rawStatusStr === 'anulada') {
        normalizedStatus = 'cancelada';
      } else {
        normalizedStatus = 'pendiente';
      }

      corrections.push({
        entity: 'tasks',
        id: task.id,
        field: 'status',
        originalValue: task.status,
        correctedValue: normalizedStatus,
        reason: `Estado de tarea '${task.status}' corregido al estándar '${normalizedStatus}'.`
      });
      task.status = normalizedStatus;
    }

    // 2. Corregir metadatos de finalización si está completada
    if (task.status === 'completada' && !task.completedAt) {
      const completionTime = task.updatedAt || task.createdAt || new Date().toISOString();
      corrections.push({
        entity: 'tasks',
        id: task.id,
        field: 'completedAt',
        originalValue: task.completedAt,
        correctedValue: completionTime,
        reason: 'Fecha de completado generada automáticamente para tarea completada.'
      });
      task.completedAt = completionTime;
    }

    // 3. Garantizar lista de verificación consistente
    if (!Array.isArray(task.checklist)) {
      task.checklist = [];
    } else {
      task.checklist = task.checklist.map((item, idx) => ({
        id: item.id || `chk-${task.id}-${idx}`,
        text: item.text || 'Punto de verificación',
        completed: Boolean(item.completed),
        completedAt: item.completedAt,
        completedBy: item.completedBy
      }));
    }

    // 4. Garantizar comentarios
    if (!Array.isArray(task.comments)) {
      task.comments = [];
    }

    result.push(task);
  }

  return result;
}

/**
 * Normaliza y audita las órdenes de trabajo preventivas (OTs)
 */
export function auditWorkOrders(
  workOrdersList: PreventiveWorkOrder[],
  deletedIdsSet: Set<string>,
  corrections: StateAuditCorrection[]
): PreventiveWorkOrder[] {
  const result: PreventiveWorkOrder[] = [];
  const seenIds = new Set<string>();
  const todayStr = new Date().toISOString().split('T')[0];

  for (const raw of workOrdersList || []) {
    if (!raw || typeof raw !== 'object') continue;
    if (!raw.id || typeof raw.id !== 'string') continue;
    if (deletedIdsSet.has(raw.id)) continue;
    if (seenIds.has(raw.id)) {
      corrections.push({
        entity: 'workOrders',
        id: raw.id,
        field: 'id',
        originalValue: raw.id,
        correctedValue: 'omitted_duplicate',
        reason: 'Eliminado duplicado exacto de orden preventiva.'
      });
      continue;
    }
    seenIds.add(raw.id);

    const order: PreventiveWorkOrder = { ...raw };

    // Si ya está completada o en ejecución, respetar el estado
    if (order.status === 'completado' || order.status === 'en_ejecucion') {
      result.push(order);
      continue;
    }

    // Calcular estado dinámico según fecha programada
    const scheduledDate = order.scheduledDate;
    if (scheduledDate) {
      let expectedStatus: 'pendiente' | 'por_vencer' | 'vencido' = 'pendiente';

      if (scheduledDate < todayStr) {
        expectedStatus = 'vencido';
      } else {
        const schedTime = new Date(scheduledDate).getTime();
        const todayTime = new Date(todayStr).getTime();
        const diffDays = Math.ceil((schedTime - todayTime) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 3) {
          expectedStatus = 'por_vencer';
        } else {
          expectedStatus = 'pendiente';
        }
      }

      if (order.status !== expectedStatus) {
        corrections.push({
          entity: 'workOrders',
          id: order.id,
          field: 'status',
          originalValue: order.status,
          correctedValue: expectedStatus,
          reason: `Estado de OT actualizado de '${order.status}' a '${expectedStatus}' según fecha programada ${scheduledDate}.`
        });
        order.status = expectedStatus;
      }
    }

    if (!Array.isArray(order.stepsCompleted)) {
      order.stepsCompleted = [];
    }

    result.push(order);
  }

  return result;
}

/**
 * Normaliza y audita las incidencias y averías
 */
export function auditIncidents(
  incidentsList: Incident[],
  roundsList: DailyRound[],
  deletedIdsSet: Set<string>,
  corrections: StateAuditCorrection[]
): Incident[] {
  const result: Incident[] = [];
  const seenIds = new Set<string>();

  // 1. Procesar incidencias directas
  for (const raw of incidentsList || []) {
    if (!raw || typeof raw !== 'object' || !raw.id) continue;

    const rawId = raw.id;
    const resolvedId = CANONICAL_INCIDENT_MAP[rawId] || rawId;

    if (deletedIdsSet.has(resolvedId) || deletedIdsSet.has(rawId)) {
      continue;
    }

    if (rawId !== resolvedId) {
      corrections.push({
        entity: 'incidents',
        id: rawId,
        field: 'id',
        originalValue: rawId,
        correctedValue: resolvedId,
        reason: 'ID de incidencia mapeado a identificador canónico permanente.'
      });
    }

    const existingIndex = result.findIndex(i => i.id === resolvedId);
    let inc: Incident = { ...raw, id: resolvedId };

    // Normalizar estado
    let normStatus = inc.status || 'pendiente';
    if ((normStatus as string) === 'resuelto') {
      normStatus = 'solucionado';
      inc.status = 'solucionado';
    }

    // Corregir metadatos de solución
    if (normStatus === 'solucionado' && !inc.resolvedAt) {
      inc.resolvedAt = inc.timestamp || new Date().toISOString().replace('T', ' ').substring(0, 16);
      if (!inc.resolvedBy) {
        inc.resolvedBy = 'Equipo de Mantenimiento';
      }
    }

    if (existingIndex >= 0) {
      const existing = result[existingIndex];
      const p1 = normStatus === 'solucionado' ? 3 : normStatus === 'en_atencion' ? 2 : 1;
      const p2 = existing.status === 'solucionado' ? 3 : existing.status === 'en_atencion' ? 2 : 1;
      const finalStatus = p1 >= p2 ? normStatus : existing.status;

      result[existingIndex] = {
        ...existing,
        ...inc,
        id: resolvedId,
        status: finalStatus,
        resolvedBy: existing.resolvedBy || inc.resolvedBy,
        resolvedAt: existing.resolvedAt || inc.resolvedAt,
        resolutionNotes: existing.resolutionNotes || inc.resolutionNotes
      };
    } else {
      seenIds.add(resolvedId);
      result.push(inc);
    }
  }

  // 2. Reconciliar novedades de rondas
  for (const round of roundsList || []) {
    if (!round || !Array.isArray(round.anomalies)) continue;
    for (const anom of round.anomalies) {
      if (!anom || !anom.title) continue;

      let anomId = anom.id || `inc-anom-${round.id}-${anom.title.replace(/\s+/g, '_')}`;
      if (CANONICAL_INCIDENT_MAP[anomId]) {
        anomId = CANONICAL_INCIDENT_MAP[anomId];
      }
      if (anom.id && CANONICAL_INCIDENT_MAP[anom.id]) {
        anom.id = CANONICAL_INCIDENT_MAP[anom.id];
      }

      if (deletedIdsSet.has(anomId) || (anom.id && deletedIdsSet.has(anom.id))) {
        continue;
      }

      const matchIndex = result.findIndex(i => {
        if (anom.id && i.id === anom.id) return true;
        if (i.id === anomId) return true;
        if (i.area === anom.area && i.registeredBy === (anom.registeredBy || round.technicianName)) {
          const timeA = (i.timestamp || '').slice(0, 10);
          const timeB = (anom.timestamp || round.date || '').slice(0, 10);
          if (timeA && timeB && timeA === timeB) return true;
        }
        return false;
      });

      if (matchIndex >= 0) {
        const match = result[matchIndex];
        const p1 = (anom.status === 'solucionado' || (anom as any).status === 'resuelto') ? 3 : anom.status === 'en_atencion' ? 2 : 1;
        const p2 = (match.status === 'solucionado' || (match as any).status === 'resuelto') ? 3 : match.status === 'en_atencion' ? 2 : 1;
        const higher = p1 >= p2 ? anom.status : match.status;

        match.status = higher || 'pendiente';
        anom.id = match.id;
        anom.status = match.status;
      } else {
        const newInc: Incident = {
          id: anomId,
          title: anom.title,
          description: anom.description || `Novedad detectada en ${anom.area || 'área técnica'}.`,
          area: anom.area || 'General',
          severity: anom.severity || 'alta',
          status: anom.status || 'pendiente',
          registeredBy: anom.registeredBy || round.technicianName || 'Técnico de Turno',
          timestamp: anom.timestamp || (round.date ? `${round.date} ${round.time || '00:00'}` : new Date().toISOString()),
          photoUrl: anom.photoUrl,
          equipmentId: anom.equipmentId,
          equipmentTag: anom.equipmentTag,
          resolvedBy: anom.resolvedBy,
          resolvedAt: anom.resolvedAt,
          resolutionNotes: anom.resolutionNotes
        };
        corrections.push({
          entity: 'incidents',
          id: anomId,
          field: 'record',
          originalValue: null,
          correctedValue: newInc.title,
          reason: 'Novedad de ronda incorporada al inventario unificado de incidencias.'
        });
        result.push(newInc);
      }
    }
  }

  return result;
}

/**
 * Normaliza y audita las solicitudes hoteleras
 */
export function auditRequests(
  requestsList: HotelRequest[],
  deletedIdsSet: Set<string>,
  corrections: StateAuditCorrection[]
): HotelRequest[] {
  const result: HotelRequest[] = [];
  const seenIds = new Set<string>();

  for (const raw of requestsList || []) {
    if (!raw || typeof raw !== 'object' || !raw.id) continue;
    if (deletedIdsSet.has(raw.id)) continue;
    if (seenIds.has(raw.id)) {
      corrections.push({
        entity: 'requests',
        id: raw.id,
        field: 'id',
        originalValue: raw.id,
        correctedValue: 'omitted_duplicate',
        reason: 'Eliminado duplicado de solicitud por ID.'
      });
      continue;
    }
    seenIds.add(raw.id);

    const req: HotelRequest = { ...raw };
    const validStatuses = ['pendiente', 'en_proceso', 'resuelto', 'cancelado'];

    if (!validStatuses.includes(req.status)) {
      const rawStr = String(req.status || '').toLowerCase();
      let norm: 'pendiente' | 'en_proceso' | 'resuelto' | 'cancelado' = 'pendiente';
      if (rawStr === 'completado' || rawStr === 'solucionado' || rawStr === 'resuelto') {
        norm = 'resuelto';
      } else if (rawStr === 'en_atencion' || rawStr === 'en_curso' || rawStr === 'en_progreso') {
        norm = 'en_proceso';
      } else if (rawStr === 'cancelado' || rawStr === 'anulado') {
        norm = 'cancelado';
      }
      corrections.push({
        entity: 'requests',
        id: req.id,
        field: 'status',
        originalValue: req.status,
        correctedValue: norm,
        reason: `Estado de solicitud corregido a '${norm}'.`
      });
      req.status = norm;
    }

    if (req.status === 'resuelto' && !req.resolvedAt) {
      req.resolvedAt = req.createdAt || new Date().toISOString();
    }

    result.push(req);
  }

  return result;
}

/**
 * Normaliza y audita los registros de rondas técnicas diarias
 */
export function auditRounds(
  roundsList: DailyRound[],
  deletedIdsSet: Set<string>,
  corrections: StateAuditCorrection[]
): DailyRound[] {
  const result: DailyRound[] = [];
  const seenIds = new Set<string>();

  for (const raw of roundsList || []) {
    if (!raw || typeof raw !== 'object' || !raw.id) continue;
    if (deletedIdsSet.has(raw.id)) continue;
    if (seenIds.has(raw.id)) {
      corrections.push({
        entity: 'rounds',
        id: raw.id,
        field: 'id',
        originalValue: raw.id,
        correctedValue: 'omitted_duplicate',
        reason: 'Eliminado duplicado exacto de ronda por ID.'
      });
      continue;
    }
    seenIds.add(raw.id);

    const round: DailyRound = { ...raw };

    if (!Array.isArray(round.anomalies)) {
      round.anomalies = [];
    }

    const realAnomaliesCount = round.anomalies.length;
    if (round.anomaliesCount !== realAnomaliesCount) {
      corrections.push({
        entity: 'rounds',
        id: round.id,
        field: 'anomaliesCount',
        originalValue: round.anomaliesCount,
        correctedValue: realAnomaliesCount,
        reason: `Contador de anomalías corregido de ${round.anomaliesCount} a ${realAnomaliesCount}.`
      });
      round.anomaliesCount = realAnomaliesCount;
    }

    // Calcular porcentaje de cumplimiento si falta o es inválido
    if (typeof round.compliancePercentage !== 'number' || isNaN(round.compliancePercentage)) {
      const totalPoints = Array.isArray(round.checkpoints) ? round.checkpoints.length : 0;
      const checkedPoints = Array.isArray(round.checkpoints) 
        ? round.checkpoints.filter(c => c.statusValue !== null && c.statusValue !== undefined).length 
        : 0;
      const calcPct = totalPoints > 0 ? Math.round((checkedPoints / totalPoints) * 100) : 100;
      round.compliancePercentage = calcPct;
      corrections.push({
        entity: 'rounds',
        id: round.id,
        field: 'compliancePercentage',
        originalValue: null,
        correctedValue: calcPct,
        reason: 'Porcentaje de cumplimiento calculado según puntos verificados.'
      });
    }

    result.push(round);
  }

  return result;
}

/**
 * Función Maestra de Auditoría de Estado:
 * Verifica y reconcilia completamente la consistencia entre las cantidades y registros
 * de tareas, órdenes de trabajo, reportes, solicitudes y rondas.
 */
export function performStateAudit(data: {
  tasks?: MaintenanceTask[];
  workOrders?: PreventiveWorkOrder[];
  incidents?: Incident[];
  requests?: HotelRequest[];
  rounds?: DailyRound[];
  equipments?: Equipment[];
  deletedIds?: string[] | Set<string>;
}): {
  auditedData: {
    tasks: MaintenanceTask[];
    workOrders: PreventiveWorkOrder[];
    incidents: Incident[];
    requests: HotelRequest[];
    rounds: DailyRound[];
  };
  auditResult: StateAuditResult;
} {
  const deletedSet = data.deletedIds instanceof Set 
    ? data.deletedIds 
    : new Set<string>(Array.isArray(data.deletedIds) ? data.deletedIds : []);

  const corrections: StateAuditCorrection[] = [];

  // Ejecutar auditorías individuales
  const auditedTasks = auditTasks(data.tasks || [], deletedSet, corrections);
  const auditedWorkOrders = auditWorkOrders(data.workOrders || [], deletedSet, corrections);
  const auditedRounds = auditRounds(data.rounds || [], deletedSet, corrections);
  const auditedIncidents = auditIncidents(data.incidents || [], auditedRounds, deletedSet, corrections);
  const auditedRequests = auditRequests(data.requests || [], deletedSet, corrections);

  // Calcular métricas auditadas
  const taskCounts = {
    total: auditedTasks.length,
    pending: auditedTasks.filter(t => t.status === 'pendiente').length,
    inProgress: auditedTasks.filter(t => t.status === 'en_progreso').length,
    completed: auditedTasks.filter(t => t.status === 'completada').length,
    canceled: auditedTasks.filter(t => t.status === 'cancelada').length
  };

  const workOrderCounts = {
    total: auditedWorkOrders.length,
    pending: auditedWorkOrders.filter(w => w.status === 'pendiente').length,
    dueSoon: auditedWorkOrders.filter(w => w.status === 'por_vencer').length,
    overdue: auditedWorkOrders.filter(w => w.status === 'vencido').length,
    completed: auditedWorkOrders.filter(w => w.status === 'completado').length
  };

  const incidentCounts = {
    total: auditedIncidents.length,
    open: auditedIncidents.filter(i => i.status !== 'solucionado').length,
    solved: auditedIncidents.filter(i => i.status === 'solucionado').length
  };

  const requestCounts = {
    total: auditedRequests.length,
    pending: auditedRequests.filter(r => r.status === 'pendiente').length,
    inProgress: auditedRequests.filter(r => r.status === 'en_proceso').length,
    resolved: auditedRequests.filter(r => r.status === 'resuelto').length,
    canceled: auditedRequests.filter(r => r.status === 'cancelado').length
  };

  const roundCounts = {
    total: auditedRounds.length,
    inProgress: auditedRounds.filter(r => r.status === 'en_progreso').length,
    completed: auditedRounds.filter(r => r.status === 'completada').length
  };

  const isConsistent = corrections.length === 0;
  const summaryMessage = isConsistent
    ? `Auditoría completada con éxito: 100% de consistencia entre dashboard y base de datos (${taskCounts.total} tareas, ${workOrderCounts.total} OTs, ${incidentCounts.total} reportes, ${requestCounts.total} solicitudes, ${roundCounts.total} rondas).`
    : `Auditoría completada: Se corrigieron automáticamente ${corrections.length} discrepancias garantizando consistencia absoluta en el dashboard.`;

  const auditResult: StateAuditResult = {
    auditedAt: new Date().toISOString(),
    isConsistent,
    totalCorrections: corrections.length,
    corrections,
    counts: {
      tasks: taskCounts,
      workOrders: workOrderCounts,
      incidents: incidentCounts,
      requests: requestCounts,
      rounds: roundCounts
    },
    summaryMessage
  };

  return {
    auditedData: {
      tasks: auditedTasks,
      workOrders: auditedWorkOrders,
      incidents: auditedIncidents,
      requests: auditedRequests,
      rounds: auditedRounds
    },
    auditResult
  };
}

/**
 * Convierte correcciones del estado a registros estructurados de trazabilidad y auditoría
 */
export function correctionsToAuditLogEntries(
  corrections: StateAuditCorrection[],
  user: string = 'Sistema Automático'
): AuditLogEntry[] {
  const now = new Date().toISOString();
  return corrections.map((c, idx) => ({
    id: `audit-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: now,
    type: 'auto_correction',
    entity: c.entity,
    entityId: c.id,
    action: `Corrección automática en ${c.field}`,
    details: c.reason,
    user,
    status: 'warning',
    changes: [
      {
        field: c.field,
        oldValue: c.originalValue,
        newValue: c.correctedValue
      }
    ]
  }));
}

/**
 * Genera eventos de trazabilidad iniciales para el historial
 */
export function getInitialAuditLogs(): AuditLogEntry[] {
  return [
    {
      id: 'audit-init-001',
      timestamp: new Date(Date.now() - 3600000 * 24 * 3).toISOString(),
      type: 'audit_check',
      entity: 'system',
      action: 'Auditoría Integral de Integridad',
      details: 'Verificación de concordancia de esquemas de datos, sincronización Firestore y eliminación de duplicados.',
      user: 'Motor de Integridad',
      status: 'success'
    },
    {
      id: 'audit-init-002',
      timestamp: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
      type: 'auto_correction',
      entity: 'incidents',
      entityId: 'inc-1789643372377-carlos-m',
      action: 'Unificación Canónica de Identificador',
      details: 'Mapeo del reporte de novedad de ronda al ID permanente inc-1789647000266-k0ogc sin pérdida de historial.',
      user: 'Reconciliador Canónico',
      status: 'warning',
      changes: [{ field: 'id', oldValue: 'inc-1789643372377-carlos-m', newValue: 'inc-1789647000266-k0ogc' }]
    },
    {
      id: 'audit-init-003',
      timestamp: new Date(Date.now() - 3600000 * 18).toISOString(),
      type: 'auto_correction',
      entity: 'workOrders',
      entityId: 'ot-prev-bomba-01',
      action: 'Cálculo Dinámico de Estado Preventivo',
      details: 'Actualización automática del estado según fecha límite programada para prevenir desfases visuales.',
      user: 'Motor de Mantenimiento Preventivo',
      status: 'info',
      changes: [{ field: 'status', oldValue: 'pendiente', newValue: 'por_vencer' }]
    },
    {
      id: 'audit-init-004',
      timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
      type: 'data_sync',
      entity: 'system',
      action: 'Sincronización Bidireccional Servidor / Firestore',
      details: 'Consolidación exitosa de datos de equipos, lecturas de bombas y hojas de vida en tiempo real.',
      user: 'Servicio de Sincronización',
      status: 'success'
    }
  ];
}

