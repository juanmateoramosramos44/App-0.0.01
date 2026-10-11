export type NavigationTab = 
  | 'dashboard' 
  | 'rondas' 
  | 'contadores'
  | 'bombas' 
  | 'hojas_vida' 
  | 'incidencias' 
  | 'preventivo' 
  | 'solicitudes'
  | 'tareas'
  | 'cronograma'
  | 'usuarios'
  | 'configuraciones'
  | 'horarios';

export type RoleMode = 'tecnico' | 'admin';

export type PumpCategory = 
  | 'bomba_presion'      // Grupo de presión potable
  | 'bomba_impulsion'    // Bomba de impulsión / elevación de agua
  | 'bomba_acs'          // Recirculación agua caliente sanitaria
  | 'bomba_piscina'      // Filtrado y recirculación alberca/jacuzzi
  | 'bomba_achique'      // Fosas sépticas y cárcamos de sótano
  | 'bomba_incendio'     // Sistema contra incendios (jockey / principal)
  | 'bomba_chiller'      // Agua helada climatización
  | 'caldera'            // Generador de calor / vapor
  | 'chiller'            // Unidad enfriadora central
  | 'condensador'        // Unidad condensadora / Condensador
  | 'generador'          // Grupo electrógeno de emergencia
  | 'subestacion'        // Subestación eléctrica / Transformador
  | 'tanque_agua'        // Tanque de agua potable / Reserva / Cisterna
  | 'combustible'        // Tanques de combustible / Diésel / ACPM
  | 'bateria'            // Banco de baterías / UPS / Sistemas de respaldo
  | 'sauna_cold_plunge'   // Sauna / Cold Plunge / Zona Húmeda / Spa
  | 'otro';

export type EquipmentStatus = 'operativo' | 'alerta' | 'fuera_servicio' | 'en_mantenimiento';

export interface OperationalLimits {
  minPressurePsi?: number;
  maxPressurePsi?: number;
  maxBearingTempC?: number;
  maxAmperageL1?: number;
  maxAmperageL2?: number;
  maxAmperageL3?: number;
  maxVibrationMmS?: number;
}

export interface Equipment {
  id: string;
  tag: string; // e.g., "BOM-PRES-01"
  name: string;
  category: PumpCategory;
  area: string; // e.g., "Sótano 2 - Cuarto de Bombas Principal"
  locationDetails: string;
  brand: string;
  model: string;
  serialNumber: string;
  powerHp: number;
  powerKw?: number;
  flowGpm?: number;
  voltage: string; // e.g. "380V / 3F / 60Hz"
  nominalAmps: number;
  nominalPressurePsi: number;
  suctionDiameterInches?: string;
  dischargeDiameterInches?: string;
  installationDate: string;
  status: EquipmentStatus;
  currentHours: number;
  limits: OperationalLimits;
  lastInspectionDate?: string;
  lastPreventiveDate?: string;
  nextPreventiveDate?: string;
  notes?: string;
  // Campos técnicos extendidos para Hoja de Vida
  supplier?: string;
  assetNumber?: string;
  criticality?: 'alta' | 'media' | 'baja';
  lubricationType?: string;
  rpm?: number;
  ipRating?: string;
  warrantyExpiry?: string;
  recommendedSpares?: string[];
  maintenanceResponsible?: string;
}

export type InspectionCondition = 'optimo' | 'observacion' | 'critico';

export interface PumpInspection {
  id: string;
  equipmentId: string;
  equipmentTag: string;
  equipmentName: string;
  date: string; // YYYY-MM-DD HH:mm
  technicianName: string;
  
  // Hidráulico
  suctionPressurePsi: number;
  dischargePressurePsi: number;
  differentialPressurePsi: number;
  flowEstimateGpm?: number;
  
  // Eléctrico
  ampL1: number;
  ampL2: number;
  ampL3: number;
  voltageMeasure: number;
  currentUnbalancePercent: number; // calculated
  
  // Mecánico & Térmico
  motorTempC: number;
  pumpBearingTempC: number;
  vibrationMmS: number;
  mechanicalSealStatus: 'sin_goteo' | 'goteo_normal' | 'fuga_excesiva';
  noiseLevel: 'normal' | 'leve_zumbido' | 'cavitacion' | 'golpeteo_fuerte';
  couplingStatus: 'alineado' | 'desalineado_leve' | 'desgaste';
  
  // Operacional
  hourMeter: number;
  valvesCondition: 'correctas' | 'bloqueadas' | 'fugas';
  overallCondition: InspectionCondition;
  findings: string;
  correctiveActionsNeeded?: string;
}

export type RoundShift = 'manana' | 'tarde' | 'noche';

export interface RoundMeasurementField {
  id: string;
  name?: string;
  unit?: string;
  minValue?: number;
  maxValue?: number;
  value?: number | string;
  ampState?: string;
  lastNonZeroValue?: number;
  includeButtons?: boolean;
  options?: string[];
  buttonActions?: Record<string, { color?: string; actionType?: string; requireNotes?: boolean }>;
  statusValue?: string;
  photoUrl?: string;
  photos?: string[];
  photoMode?: 'none' | 'normal' | 'ai' | 'both';
  allowPhoto?: boolean;
}

export interface RoundCheckpoint {
  id: string;
  area: string;
  equipmentRef?: string;
  title: string;
  type: 'numeric' | 'boolean' | 'options' | 'ok_nok' | 'text' | 'multi_numeric';
  unit?: string;
  minValue?: number;
  maxValue?: number;
  options?: string[];
  measurementFields?: RoundMeasurementField[];
  statusValue?: string;
  ampState?: string;
  lastNonZeroValue?: number;
  includeStatusButtons?: boolean;
  buttonActions?: Record<string, { color?: string; actionType?: string; requireNotes?: boolean }>;
  suggestedNotes?: string[];
  currentValue?: string | number | boolean | Record<string, any>;
  notes?: string;
  instructions?: string;
  allowNotes?: boolean;
  requireNotesOnFailure?: boolean;
  isCritical?: boolean;
  category?: string;
  icon?: string;
  anomalyId?: string;
  isAlarmActive?: boolean;
  alarmReason?: string;
  photoUrl?: string;
  photos?: string[];
  photoMode?: 'none' | 'normal' | 'ai' | 'both';
  allowPhoto?: boolean;
  photoRequired?: boolean;
}

export interface RoundAnomaly {
  id: string;
  area: string;
  equipmentId?: string;
  equipmentTag?: string;
  title: string;
  description: string;
  severity: 'baja' | 'media' | 'alta' | 'urgente';
  status: 'pendiente' | 'en_atencion' | 'solucionado';
  registeredBy: string;
  timestamp: string;
  photoUrl?: string;
  photos?: string[];
  resolvedBy?: string;
  resolvedAt?: string;
  resolutionNotes?: string;
}

export type Incident = RoundAnomaly;

export interface HotelRequest {
  id: string;
  title: string;
  description: string;
  location: string; // e.g. "Habitación 302", "Lobby", "Restaurante"
  category: 'habitacion' | 'mantenimiento_general' | 'plomeria' | 'electricidad' | 'climatizacion' | 'limpieza' | 'mobiliario' | 'otro';
  priority: 'baja' | 'media' | 'alta' | 'urgente';
  status: 'pendiente' | 'en_proceso' | 'resuelto' | 'cancelado';
  requestedBy: string;
  requestedByEmail?: string;
  requestedById?: string;
  assignedTo?: string;
  assignedToId?: string;
  assignedToEmail?: string;
  createdAt: string;
  updatedAt?: string;
  resolvedAt?: string;
  notes?: string;
}

export interface DailyRound {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  startTime?: string;
  endTime?: string;
  shift: RoundShift;
  technicianName: string;
  technicianSignature?: string;
  signatureName?: string;
  userId?: string;
  userEmail?: string;
  status: 'completada' | 'en_progreso' | 'incompleta';
  checkpoints: RoundCheckpoint[];
  anomaliesCount: number;
  anomalies: RoundAnomaly[];
  photos?: string[];
  meterReadings: {
    waterCubicMeters?: number;
    electricKwh?: number;
    gasCubicMeters?: number;
    waterMeterPhotoUrl?: string;
    electricMeterPhotoUrl?: string;
    gasMeterPhotoUrl?: string;
    customPhotos?: Record<string, string>;
    customMeters?: Record<string, { id?: string; name: string; unit: string; value?: number | string; photoUrl?: string }>;
    poolPh?: number;
    poolChlorinePpm?: number;
    hotWaterSupplyTempC?: number;
    hotWaterReturnTempC?: number;
    mainWaterPressurePsi?: number;
  };
  generalNotes: string;
  compliancePercentage: number;
  lastUpdated?: string;
  lastHeartbeat?: string;
  completedAt?: string;
}

export type PreventiveFrequency = 
  | 'diario' 
  | 'semanal' 
  | 'quincenal' 
  | 'mensual' 
  | 'trimestral' 
  | 'semestral' 
  | 'anual';

export interface PreventiveStep {
  id: string;
  description: string;
  completed: boolean;
  technicalNote?: string;
}

export interface PreventivePlan {
  id: string;
  equipmentId: string;
  equipmentTag: string;
  equipmentName: string;
  title: string;
  frequency: PreventiveFrequency;
  estimatedMinutes: number;
  steps: PreventiveStep[];
  requiredMaterials: string[];
  safetyInstructions: string[];
  lastExecutedDate?: string;
  nextDueDate: string; // YYYY-MM-DD
  active: boolean;
}

export interface PreventiveWorkOrder {
  id: string;
  planId: string;
  equipmentId: string;
  equipmentTag: string;
  equipmentName: string;
  title: string;
  frequency: PreventiveFrequency;
  scheduledDate: string;
  executionDate?: string;
  status: 'pendiente' | 'por_vencer' | 'vencido' | 'en_ejecucion' | 'completado';
  technicianAssigned: string;
  technicianNotes?: string;
  stepsCompleted: { id: string; description: string; completed: boolean }[];
  usedMaterials: string[];
  durationMinutes?: number;
  approvedByAdmin?: boolean;
}

export interface HotelInfo {
  hotelName: string;
  propertyCode: string;
  totalRooms: number;
  chiefEngineer: string;
  city: string;
  address: string;
  contactPhone: string;
  emergencyPhone: string;
  logoUrl?: string;
  standardRooms?: number;
  vipRooms?: number;
  juniorSuites?: number;
  apartments?: number;
  apartmentsWithJacuzzi?: number;
  defaultOccupancyPercentage?: number;
  arrivalsToday?: number;
  departuresToday?: number;
  arrivalsTomorrow?: number;
}

export interface DocumentFolder {
  id: string;
  name: string;
  color?: string;
  createdAt: string;
}

export type UserRole = 'admin' | 'técnico' | 'housekeeping' | 'ayb' | 'sastra' | 'cocina';
export type UserStatus = 'active' | 'inactive';

export interface UserPermissions {
  canEditSettings: boolean;
  canDeleteRecords: boolean;
  canManageUsers: boolean;
  canStartRounds?: boolean;        // Permiso para iniciar/ejecutar nuevas rondas (botón Iniciar Nueva Ronda)
  notifyRoundInProgress?: boolean; // Permiso para recibir notificaciones cuando un compañero inicia o realiza una ronda
  notifyRounds?: boolean;          // Recibir notificaciones de Rondas
  notifyRequests?: boolean;        // Recibir notificaciones de Solicitudes
  notifyTasks?: boolean;           // Recibir notificaciones de Tareas
  notifyIncidents?: boolean;       // Recibir notificaciones de Inconvenientes / Averías
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  name?: string;
  phone?: string;
  role: UserRole;
  password?: string;
  department?: string;
  permissions: UserPermissions;
  status: UserStatus;
  visibleSections: string[];
  canStartRounds?: boolean;
  notifyRoundInProgress?: boolean;
  notifyRounds?: boolean;
  notifyRequests?: boolean;
  notifyTasks?: boolean;
  notifyIncidents?: boolean;
  createdAt: string;
  updatedAt?: string;
  lastSeenAt?: string;
  isOnline?: boolean;
}

export interface CellStyleInfo {
  bgColor?: string;
  textColor?: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
}

export interface UploadedDocumentSheet {
  name: string;
  headers: string[];
  rows: (string | number | boolean | null)[][];
  totalColumns?: number;
  totalRows?: number;
  cellStyles?: Record<string, CellStyleInfo>; // Key format "rowIdx-colIdx"
  headerBgColor?: string;
  headerTextColor?: string;
}

export interface UploadedDocument {
  id: string;
  name: string;
  uploadDate: string;
  uploadedBy: string;
  sizeBytes: number;
  type: 'excel' | 'pdf' | 'image' | 'csv' | 'otro';
  sheets: UploadedDocumentSheet[];
  totalRows: number;
  totalColumns: number;
  rawBase64?: string;
  notes?: string;
  folderId?: string; // ID of the folder this document belongs to
}

export interface SystemSettings {
  hotelInfo: HotelInfo;
  pressureUnit: 'psi' | 'bar';
  tempUnit: 'c' | 'f';
  flowUnit: 'gpm' | 'm3h';
  listSelectorStyle: 'segmented' | 'popover' | 'cards' | 'bottomSheet';
  alertThresholds: {
    defaultMinBoosterPsi: number;
    defaultMaxBoosterPsi: number;
    defaultMaxPumpTempC: number;
    defaultMaxVibrationMmS: number;
    defaultMaxCurrentUnbalancePercent: number;
    poolMinPh: number;
    poolMaxPh: number;
    poolMinChlorinePpm: number;
    poolMaxChlorinePpm: number;
  };
  adminPin: string;
  technicians: string[];
}

export type TaskPriority = 'baja' | 'media' | 'alta' | 'urgente';
export type TaskStatus = 'pendiente' | 'en_progreso' | 'completada' | 'cancelada';
export type TaskCategory = 
  | 'mantenimiento' 
  | 'reparacion' 
  | 'revision' 
  | 'limpieza_tecnica' 
  | 'compra_repuesto' 
  | 'inspeccion' 
  | 'electrico' 
  | 'plomeria' 
  | 'climatizacion' 
  | 'cerrajeria' 
  | 'pintura' 
  | 'otro';

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface TaskComment {
  id: string;
  userId: string;
  userName: string;
  userRole?: string;
  text: string;
  timestamp: string;
  photos?: string[];
  progressPercent?: number;
  isProgressLog?: boolean;
}

export interface MaintenanceTask {
  id: string;
  title: string;
  description: string;
  assignedToId?: string;
  assignedToName: string;
  assignedToDepartment?: string;
  createdById: string;
  createdByName: string;
  createdByRole?: string;
  priority: TaskPriority;
  status: TaskStatus;
  category: TaskCategory;
  area: string;
  equipmentId?: string;
  equipmentTag?: string;
  equipmentName?: string;
  dueDate?: string; // YYYY-MM-DD
  dueTime?: string; // HH:mm
  estimatedMinutes?: number;
  checklist: TaskChecklistItem[];
  comments: TaskComment[];
  photos?: string[];
  completionNotes?: string;
  completionPhotos?: string[];
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export type AuditEventType = 
  | 'auto_correction' 
  | 'data_sync' 
  | 'audit_check' 
  | 'manual_repair' 
  | 'status_change' 
  | 'entity_creation' 
  | 'entity_deletion'
  | 'settings_update';

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  type: AuditEventType;
  entity: 'tasks' | 'workOrders' | 'incidents' | 'requests' | 'rounds' | 'equipments' | 'settings' | 'system';
  entityId?: string;
  action: string;
  details: string;
  user?: string;
  status: 'success' | 'warning' | 'info';
  changes?: {
    field: string;
    oldValue?: any;
    newValue?: any;
  }[];
}

export type ShiftType = 'manana' | 'tarde' | 'noche' | 'diurno' | 'supervisor' | 'descanso' | 'guardia_24h' | 'personalizado';

export interface TechnicianSchedule {
  id: string;
  technicianId: string;
  technicianName: string;
  technicianRole?: string;
  department?: string;
  date: string; // YYYY-MM-DD
  shiftType: ShiftType;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  breakDurationMinutes?: number;
  assignedAreas?: string[];
  isOnCall?: boolean; // Turno de guardia / disponibilidad activa
  notes?: string;
  status?: 'programado' | 'en_curso' | 'completado' | 'ausente' | 'cambio_solicitado';
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface ShiftSwapRequest {
  id: string;
  scheduleId: string;
  requesterId: string;
  requesterName: string;
  targetTechnicianId: string;
  targetTechnicianName: string;
  targetScheduleId?: string;
  date: string;
  reason: string;
  status: 'pendiente' | 'aprobado' | 'rechazado';
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface BulkScheduleParams {
  technicianIds: string[];
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  pattern: '6x1' | '5x2' | 'rotativo_3turnos' | 'fijo_manana' | 'fijo_tarde' | 'fijo_noche' | 'fijo_diurno';
  assignedAreas?: string[];
  overwriteExisting?: boolean;
}

export type CronogramaCategory = 
  | 'mantenimiento_preventivo' 
  | 'correctivo_mayor' 
  | 'parada_tecnica' 
  | 'auditoria_certificacion' 
  | 'infraestructura_mejoras' 
  | 'limpieza_desinfeccion' 
  | 'seguridad_brigada' 
  | 'otro';

export type CronogramaStatus = 'planificado' | 'en_ejecucion' | 'pausado' | 'completado' | 'cancelado';
export type CronogramaPriority = 'baja' | 'media' | 'alta' | 'critica';

export interface CronogramaMilestone {
  id: string;
  title: string;
  description?: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  assignedToName?: string;
  assignedToId?: string;
  equipmentTag?: string;
  equipmentId?: string;
  status: 'pendiente' | 'en_progreso' | 'completado' | 'atrasado';
  progress: number; // 0 - 100
  notes?: string;
  budgetEstimated?: number;
  budgetActual?: number;
}

export interface Cronograma {
  id: string;
  title: string;
  description: string;
  category: CronogramaCategory;
  area: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  year: number;
  month?: number;    // 1 - 12
  status: CronogramaStatus;
  priority: CronogramaPriority;
  leaderName: string;
  leaderId?: string;
  leaderEmail?: string;
  budgetEstimated?: number;
  budgetActual?: number;
  currency?: string; // 'COP' | 'USD'
  milestones: CronogramaMilestone[];
  tags?: string[];
  completionPercentage?: number; // 0 - 100
  createdAt: string;
  updatedAt: string;
  createdById?: string;
  createdByName?: string;
}

export type MeterType = 'agua' | 'energia' | 'gas' | 'otro';

export interface MeterDefinition {
  id: string;
  code: string; // e.g., "MED-AGU-01"
  name: string; // e.g., "Contador General Agua Fría"
  type: MeterType;
  unit: string; // "m³", "kWh", "gal", "kg", "PSI", etc.
  location: string; // "Sótano 2 - Entrada Acometida Principal"
  brandModel?: string;
  serialNumber?: string;
  initialReading: number;
  currentReading?: number;
  lastReadingDate?: string;
  lastReadingTime?: string;
  alertThresholdPerDay?: number; // Consumo máximo esperado por día
  photoUrl?: string; // Foto de referencia física del contador
  status: 'activo' | 'inactivo' | 'mantenimiento';
  notes?: string;
  isMainMeter?: boolean;
  parentMeterId?: string;
  parentMeterName?: string;
  areaTag?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface MeterReadingRecord {
  id: string;
  meterId: string;
  meterName: string;
  meterCode?: string;
  meterType: MeterType;
  unit: string;
  currentValue: number;
  previousValue?: number;
  consumption?: number; // currentValue - previousValue
  intervalHours?: number; // Horas transcurridas desde la lectura previa
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  timestamp: string; // ISO string
  technicianName: string;
  technicianId?: string;
  photoUrl?: string;
  recognitionMethod?: 'manual' | 'foto_ia' | 'foto_normal';
  notes?: string;
  anomalyDetected?: boolean;
  anomalyNotes?: string;
  createdAt: string;
}


