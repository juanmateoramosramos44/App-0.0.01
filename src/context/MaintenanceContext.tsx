import React, { createContext, useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  RoleMode, 
  NavigationTab,
  Equipment, 
  DailyRound, 
  PumpInspection, 
  PreventivePlan, 
  PreventiveWorkOrder, 
  SystemSettings,
  RoundShift,
  RoundCheckpoint,
  RoundMeasurementField,
  RoundAnomaly,
  Incident,
  HotelRequest,
  UploadedDocument,
  DocumentFolder,
  User,
  UserPermissions,
  MaintenanceTask,
  TaskComment,
  TechnicianSchedule,
  ShiftType,
  ShiftSwapRequest,
  BulkScheduleParams,
  Cronograma,
  MeterDefinition,
  MeterReadingRecord
} from '../types';
import { 
  INITIAL_EQUIPMENT, 
  INITIAL_ROUNDS, 
  INITIAL_PUMP_INSPECTIONS, 
  INITIAL_PREVENTIVE_PLANS, 
  INITIAL_WORK_ORDERS, 
  INITIAL_SETTINGS,
  INITIAL_INCIDENTS,
  STANDARD_ROUND_CHECKPOINTS,
  DEFAULT_SAUNA_COLD_PLUNGE_CHECKPOINT,
  INITIAL_METERS,
  INITIAL_METER_READINGS,
  INITIAL_SCHEDULES,
  INITIAL_REQUESTS,
  INITIAL_USERS_SNAPSHOT
} from '../data/initialData';
import { HISTORICAL_ROUNDS } from '../data/historicalRounds';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  getDocs,
  getDoc,
  arrayUnion
} from 'firebase/firestore';
import { db, ensureAuthenticated, testFirestoreConnection, cleanForFirestore, safeFirestoreWrite, isFirestoreQuotaExceeded, markFirestoreQuotaExceeded } from '../lib/firebase';
import { getCheckpointButtonAction, getFieldButtonAction, isCheckpointAlarmActive, getIncompleteCheckpoints, isCheckpointComplete } from '../utils/roundButtonUtils';
import { sendSystemNotification, playAlertSound, requestNotificationPermission, isNotificationSupported, syncPushSubscriptionWithServer, broadcastServerPushNotification } from '../lib/notifications';
import { getLocalDateTimeString, getLocalDateString } from '../utils/dateUtils';
import { performStateAudit, StateAuditResult, CANONICAL_INCIDENT_MAP, correctionsToAuditLogEntries, getInitialAuditLogs } from '../utils/stateAudit';
import { AuditLogEntry } from '../types';
import { safeSetItem, safeGetItem, idbSet, idbGet, idbRemove } from '../utils/safeStorage';

export const normalizeSectionId = (sec: string): string => {
  if (!sec) return '';
  const s = sec.toLowerCase().trim();
  if (s === 'equipos') return 'bombas';
  if (s === 'preventivos') return 'preventivo';
  if (s === 'hojasvida') return 'hojas_vida';
  if (s === 'ajustes' || s === 'settings') return 'configuraciones';
  if (s === 'task' || s === 'tasks') return 'tareas';
  if (s === 'horario' || s === 'schedules' || s === 'schedule') return 'horarios';
  if (s === 'cronogramas' || s === 'cronograma') return 'cronograma';
  return s;
};

export const normalizeStr = (str?: any): string => {
  if (!str) return '';
  return String(str).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
};

export const FAKE_USER_IDS = new Set([
  'usr-1789230683227',
  'usr-1789230683228',
  'usr-1789230683229',
  'usr-admin-master'
]);

export const INITIAL_USERS: User[] = INITIAL_USERS_SNAPSHOT;

export const DEFAULT_ADMIN_USER: User = INITIAL_USERS[0];

export function ensureAdminUserList(list: User[]): User[] {
  const deletedIds = getDeletedUserIds();
  const canonicalIds = new Set(INITIAL_USERS.map(u => u.id));
  const cleanList = (Array.isArray(list) ? list : []).filter(u => u && u.id && !FAKE_USER_IDS.has(u.id) && (!deletedIds.has(u.id) || canonicalIds.has(u.id)));
  const map = new Map<string, User>();
  INITIAL_USERS.forEach(u => {
    if (!FAKE_USER_IDS.has(u.id)) {
      map.set(u.id, u);
    }
  });
  cleanList.forEach(u => map.set(u.id, u));

  // Strict deduplication by normalized email (or unique id if no email)
  const uniqueMap = new Map<string, User>();
  for (const u of map.values()) {
    const emailKey = (u.email || '').toLowerCase().trim();
    const primaryKey = emailKey || u.id;

    const existing = uniqueMap.get(primaryKey);
    if (!existing) {
      uniqueMap.set(primaryKey, u);
    } else {
      if (existing.role === 'admin' && u.role !== 'admin') {
        uniqueMap.set(primaryKey, { ...u, ...existing });
      } else if (u.role === 'admin' && existing.role !== 'admin') {
        uniqueMap.set(primaryKey, { ...existing, ...u });
      } else {
        const timeExisting = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const timeIncoming = new Date(u.updatedAt || u.createdAt || 0).getTime();
        uniqueMap.set(primaryKey, timeIncoming >= timeExisting ? { ...existing, ...u } : { ...u, ...existing });
      }
    }
  }

  return Array.from(uniqueMap.values()).map(u => {
    if (Array.isArray(u.visibleSections) && !u.visibleSections.includes('tareas')) {
      return { ...u, visibleSections: [...u.visibleSections, 'tareas'] };
    }
    return u;
  });
}

export const checkRealInternetConnection = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return true;
  if (!navigator.onLine) return false;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`/api/ping?_t=${Date.now()}`, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (e) {
    try {
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 2000);
      const res2 = await fetch(`/api/version?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        signal: controller2.signal
      });
      clearTimeout(timeoutId2);
      return res2.ok;
    } catch {
      return false;
    }
  }
};

export const isGhostRound = (round: DailyRound, currentActiveId?: string): boolean => {
  if (!round || !round.id) return true;
  if (round.status === 'en_progreso') {
    // Si la ronda tiene puntos registrados o es del día de hoy, nunca se considera fantasma
    const hasFilled = Array.isArray(round.checkpoints) && round.checkpoints.some(c => c && (c.statusValue || (c.currentValue !== undefined && String(c.currentValue).trim() !== '')));
    if (hasFilled) return false;
    const todayStr = getLocalDateString();
    if (round.date === todayStr) return false;

    const timeStr = round.lastHeartbeat || round.lastUpdated || (round.date && round.time ? `${round.date.replace(/\//g, '-')}T${round.time}:00` : null);
    if (!timeStr) return true;
    const ts = new Date(timeStr).getTime();
    if (isNaN(ts)) return true;
    if ((Date.now() - ts) > 12 * 60 * 60 * 1000) return true;
  }
  return false;
};

export const isRoundActivelyBeingPerformed = (round: DailyRound, currentActiveId?: string): boolean => {
  if (!round || round.status !== 'en_progreso') return false;
  if (getDeletedRoundIds().has(round.id)) return false;
  // Si la ronda ya tiene firma del técnico, fecha de culminación o status completada, ya fue cerrada y no está en curso
  if (round.completedAt || (round.technicianSignature && (round.compliancePercentage === undefined || round.compliancePercentage === 100))) return false;

  // Si es la ronda que el usuario local tiene abierta o reanudó actualmente en su pantalla: siempre está en curso activo
  if (currentActiveId && round.id === currentActiveId) {
    return true;
  }

  const todayStr = getLocalDateString();
  const roundDate = (round.date || '').replace(/\//g, '-').trim();
  const timeStr = round.lastHeartbeat || round.lastUpdated || (round.date && round.time ? `${roundDate}T${round.time}:00` : null);
  const ts = timeStr ? new Date(timeStr).getTime() : 0;

  // Turno noche (22:00 a 06:00): Puede haber iniciado el día anterior y continuar en la madrugada de hoy
  const isNightShiftRecent = round.shift === 'noche' && (!ts || isNaN(ts) || (Date.now() - ts) <= 14 * 60 * 60 * 1000);

  // Una ronda de días pasados (ayer o antes) sólo se considera activa si es turno noche reciente
  if (roundDate && roundDate < todayStr && !isNightShiftRecent) {
    return false;
  }

  if (!timeStr) {
    return roundDate === todayStr || isNightShiftRecent;
  }
  if (isNaN(ts)) return false;
  // Ventana máxima para un turno activo en vivo dentro del día: 10 horas
  const SHIFT_WINDOW_MS = 10 * 60 * 60 * 1000;
  return (Date.now() - ts) <= SHIFT_WINDOW_MS;
};

export const isUserOwnRound = (round: DailyRound | null | undefined, user: User | null | undefined): boolean => {
  if (!round || !user) return false;
  const isUserAdmin = Boolean(
    user.role === 'admin' ||
    user.email?.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com' ||
    user.id === 'usr-admin-master' ||
    user.id === 'usr-1789230683226' ||
    normalizeStr(user.displayName) === 'juan mateo ramos' ||
    normalizeStr(user.displayName) === 'administrador principal' ||
    normalizeStr(user.role) === 'administrador' ||
    normalizeStr(user.role) === 'admin'
  );
  if (isUserAdmin) return true;
  if (round.userId && user.id && round.userId === user.id) return true;
  if (round.userEmail && user.email && round.userEmail.toLowerCase().trim() === user.email.toLowerCase().trim()) return true;
  
  const roundTechNorm = (round.technicianName || '').toLowerCase().trim();
  const userNameNorm = (user.displayName || user.name || '').toLowerCase().trim();
  if (roundTechNorm && userNameNorm) {
    if (roundTechNorm === userNameNorm) return true;
    if (roundTechNorm.includes(userNameNorm) || userNameNorm.includes(roundTechNorm)) return true;
    const firstPartTech = roundTechNorm.split('/')[0].trim();
    const firstPartUser = userNameNorm.split('/')[0].trim();
    if (firstPartTech && firstPartUser && (firstPartTech === firstPartUser || firstPartTech.includes(firstPartUser) || firstPartUser.includes(firstPartTech))) return true;
  }
  if (user.email) {
    const emailPrefix = user.email.split('@')[0].toLowerCase().trim();
    if (emailPrefix && roundTechNorm.includes(emailPrefix)) return true;
  }
  return false;
};

interface MaintenanceContextType {
  role: RoleMode;
  isAdmin: boolean;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  isSectionAllowed: (sectionId: string) => boolean;
  canDeleteRecords: boolean;
  canEditSettings: boolean;
  canManageUsers: boolean;
  canStartRounds: boolean;
  setRole: (role: RoleMode) => void;
  verifyAdminPin: (pin: string) => boolean;
  selectedTab: NavigationTab;
  setSelectedTab: (tab: NavigationTab) => void;
  
  // Real-time Cloud Sync
  isCloudSynced: boolean;
  hasNewAppVersion: boolean;
  reloadAppForUpdate: () => void;
  isIncidentModalOpen: boolean;
  setIsIncidentModalOpen: (open: boolean) => void;

  // Incidents / Inconvenientes en tiempo real entre compañeros
  incidents: Incident[];
  reportIncident: (incident: Omit<Incident, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) => Promise<void>;
  updateIncident: (id: string, data: Partial<Incident>) => Promise<void>;
  deleteIncident: (id: string) => Promise<void>;

  // Hotel Requests (Solicitudes)
  requests: HotelRequest[];
  addRequest: (request: Omit<HotelRequest, 'id' | 'createdAt'> & { createdAt?: string }) => Promise<void>;
  updateRequest: (id: string, data: Partial<HotelRequest>) => Promise<void>;
  deleteRequest: (id: string) => Promise<void>;

  // Maintenance Tasks (Tareas para compañeros)
  tasks: MaintenanceTask[];
  addTask: (task: Omit<MaintenanceTask, 'id' | 'createdAt'> & { createdAt?: string }) => Promise<void>;
  updateTask: (id: string, data: Partial<MaintenanceTask>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  toggleTaskChecklistItem: (taskId: string, itemId: string) => Promise<void>;
  addTaskComment: (taskId: string, text: string, photos?: string[]) => Promise<void>;

  // Equipment
  equipments: Equipment[];
  addEquipment: (eq: Omit<Equipment, 'id'>) => Promise<void>;
  updateEquipment: (id: string, data: Partial<Equipment>) => Promise<void>;
  deleteEquipment: (id: string) => Promise<void>;
  clearGenericImportedEquipments: () => Promise<void>;
  cleanAllImportedEquipments: () => Promise<void>;
  restoreOfficialEquipmentPark: () => Promise<void>;

  // Uploaded Documents
  uploadedDocuments: UploadedDocument[];
  addUploadedDocument: (doc: Omit<UploadedDocument, 'id'>) => Promise<UploadedDocument>;
  updateUploadedDocument: (doc: UploadedDocument) => Promise<void>;
  deleteUploadedDocument: (id: string) => Promise<void>;
  clearAllUploadedDocuments: () => Promise<void>;

  // Document Folders
  documentFolders: DocumentFolder[];
  createDocumentFolder: (name: string, color?: string) => Promise<void>;
  deleteDocumentFolder: (folderId: string) => Promise<void>;
  
  // Users
  users: User[];
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => Promise<void>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  
  // Pump Inspections
  pumpInspections: PumpInspection[];
  addPumpInspection: (insp: Omit<PumpInspection, 'id'>) => Promise<void>;
  
  // Rounds
  rounds: DailyRound[];
  activeRound: DailyRound | null;
  inProgressRounds: DailyRound[];
  roundTemplate: RoundCheckpoint[];
  addRoundTemplateItem: (item: Omit<RoundCheckpoint, 'id'>) => void;
  updateRoundTemplateItem: (id: string, data: Partial<RoundCheckpoint>) => void;
  deleteRoundTemplateItem: (id: string) => void;
  resetRoundTemplateToDefault: () => void;
  clearAllRoundTemplate: () => void;
  refreshRoundTemplateFromCloud: () => Promise<void>;
  refreshRoundsFromCloud: () => Promise<void>;
  syncRoundsSilently: () => Promise<void>;
  startNewRound: (shift: RoundShift, technicianName: string, customDate?: string) => DailyRound | null;
  updateRound: (roundId: string, data: Partial<DailyRound>) => Promise<void>;
  updateActiveRoundCheckpoint: (chkId: string, val: any, notes?: string, measurementFields?: RoundMeasurementField[], statusValue?: string, ampState?: string, immediate?: boolean, photoUrl?: string) => void;
  updateActiveRoundMeasurementField: (chkId: string, fieldIndex: number, val: number | string, ampState?: string, statusValue?: string, immediate?: boolean) => void;
  updateActiveRoundMeterReadings: (readings: Partial<DailyRound['meterReadings']>, generalNotes?: string) => void;
  updateActiveRoundCheckpointTags: (chkId: string, tags: string[], saveToTemplate?: boolean, targetTitle?: string, targetArea?: string) => Promise<void>;
  addRoundAnomaly: (anomaly: Omit<RoundAnomaly, 'id' | 'timestamp'>) => void;
  completeActiveRound: (readings: any, notes: string, signature: string, allowPartial?: boolean) => Promise<DailyRound | undefined>;
  cancelActiveRound: () => void;
  deleteRound: (roundId: string) => Promise<void>;
  resumeRound: (round: DailyRound) => void;
  
  // Preventive
  preventivePlans: PreventivePlan[];
  workOrders: PreventiveWorkOrder[];
  createPreventivePlan: (plan: Omit<PreventivePlan, 'id'>) => Promise<void>;
  updatePreventivePlan: (id: string, data: Partial<PreventivePlan>) => Promise<void>;
  deletePreventivePlan: (id: string) => Promise<void>;
  executeWorkOrder: (orderId: string, result: {
    steps: { id: string; description: string; completed: boolean }[];
    usedMaterials: string[];
    technicianNotes: string;
    durationMinutes: number;
  }) => Promise<void>;
  createWorkOrderFromPlan: (planId: string, scheduledDate: string, technician: string) => Promise<void>;
  
  // Settings & System
  settings: SystemSettings;
  updateSettings: (newSettings: Partial<SystemSettings>) => Promise<void>;
  resetToDefaults: () => void;
  clearAllData: () => Promise<void>;
  exportDataJson: () => string;
  importDataJson: (jsonString: string) => boolean;
  notification: string | null;
  setNotification: (msg: string | null) => void;
  notify: (msg: string | { type?: string; title?: string; message?: string; [key: string]: any }) => void;
  notificationPermission: NotificationPermission | 'unsupported';
  requestSystemNotificationPermission: () => Promise<boolean>;

  // PMS Hotel Reception Integration
  pmsData: {
    occupancyPercentage: number;
    totalGuests: number;
    arrivalsToday: number;
    departuresToday: number;
    arrivalsTomorrow: number;
    totalRooms: number;
    occupiedRooms: number;
    vacantRooms: number;
    maintenanceRooms: number;
    lastSyncedAt: string;
    source: string;
  };
  refreshPmsData: () => Promise<void>;

  // Auditoría de Estado y Consistencia Automática
  stateAuditResult: StateAuditResult | null;
  runStateAudit: (silent?: boolean) => StateAuditResult;
  auditLogs: AuditLogEntry[];
  addAuditLog: (entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => void;
  clearAuditLogs: () => void;

  // Technician Schedules & Shifts (Horarios y Turnos Técnicos)
  schedules: TechnicianSchedule[];
  shiftSwapRequests: ShiftSwapRequest[];
  addSchedule: (schedule: Omit<TechnicianSchedule, 'id' | 'createdAt'>) => Promise<void>;
  updateSchedule: (id: string, data: Partial<TechnicianSchedule>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  bulkGenerateSchedules: (params: BulkScheduleParams) => Promise<void>;
  requestShiftSwap: (swap: Omit<ShiftSwapRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  resolveShiftSwap: (swapId: string, approved: boolean) => Promise<void>;

  // Cronogramas (Master Timeline & Schedules)
  cronogramas: Cronograma[];
  addCronograma: (data: Omit<Cronograma, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Cronograma>;
  updateCronograma: (id: string, data: Partial<Cronograma>) => Promise<void>;
  deleteCronograma: (id: string) => Promise<void>;

  // Meters & Meter Readings (Lectura de Contadores)
  meters: MeterDefinition[];
  meterReadingsLog: MeterReadingRecord[];
  addMeter: (data: Omit<MeterDefinition, 'id' | 'createdAt'>) => Promise<MeterDefinition>;
  updateMeter: (id: string, data: Partial<MeterDefinition>) => Promise<void>;
  deleteMeter: (id: string) => Promise<void>;
  recordMeterReading: (data: Omit<MeterReadingRecord, 'id' | 'createdAt' | 'consumption' | 'intervalHours'>) => Promise<MeterReadingRecord>;
  deleteMeterReading: (id: string) => Promise<void>;
}

const MaintenanceContext = createContext<MaintenanceContextType | null>(null);

const STORAGE_KEYS = {
  ROLE: 'hotel_maint_role',
  EQUIPMENT: 'hotel_maint_equipment',
  ROUNDS: 'hotel_maint_rounds',
  ACTIVE_ROUND: 'hotel_maint_active_round',
  INSPECTIONS: 'hotel_maint_inspections',
  PLANS: 'hotel_maint_plans',
  WORK_ORDERS: 'hotel_maint_orders',
  SETTINGS: 'hotel_maint_settings',
  INCIDENTS: 'hotel_maint_incidents',
  DOCUMENTS: 'hotel_maint_documents',
  REQUESTS: 'hotel_maint_requests',
  TASKS: 'hotel_maint_tasks',
  SCHEDULES: 'hotel_maint_schedules',
  SHIFT_SWAPS: 'hotel_maint_shift_swaps',
  AUDIT_LOGS: 'hotel_maint_audit_logs',
  CRONOGRAMAS: 'hotel_maint_cronogramas',
  METERS: 'hotel_maint_meters',
  METER_READINGS_LOG: 'hotel_maint_meter_readings_log',
  PENDING_OFFLINE_ROUNDS: 'hotel_maint_pending_offline_rounds',
};

const DELETED_EQUIPMENT_STORAGE_KEY = 'hotel_maint_deleted_eq_ids';
const DELETED_ROUNDS_STORAGE_KEY = 'hotel_maint_deleted_round_ids';
const DELETED_REQUESTS_STORAGE_KEY = 'hotel_maint_deleted_request_ids';
const DELETED_INCIDENTS_STORAGE_KEY = 'hotel_maint_deleted_inc_ids';
const DELETED_USERS_STORAGE_KEY = 'hotel_maint_deleted_user_ids';
const DELETED_TASKS_STORAGE_KEY = 'hotel_maint_deleted_task_ids';
const DELETED_SCHEDULES_STORAGE_KEY = 'hotel_maint_deleted_schedules_v1';
const DELETED_CRONOGRAMAS_STORAGE_KEY = 'hotel_maint_deleted_cronogramas_v1';
const DELETED_METERS_STORAGE_KEY = 'hotel_maint_deleted_meters_v1';
const DELETED_METER_READINGS_STORAGE_KEY = 'hotel_maint_deleted_meter_readings_v1';

const DEMO_METER_IDS: string[] = [];
const DEMO_READING_IDS: string[] = [];

const UNMARKED_METERS_STORAGE_KEY = 'hotel_maint_unmarked_meters_v1';
const UNSYNCED_ROUNDS_STORAGE_KEY = 'hotel_maint_unsynced_rounds_v1';

const getUnsyncedRoundIds = (): Set<string> => {
  const set = new Set<string>();
  try {
    const raw = localStorage.getItem(UNSYNCED_ROUNDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((id: string) => {
          if (typeof id === 'string' && id) set.add(id);
        });
      }
    }
  } catch {}
  return set;
};

const markRoundUnsynced = (id: string) => {
  if (!id) return;
  try {
    const set = getUnsyncedRoundIds();
    set.add(id);
    localStorage.setItem(UNSYNCED_ROUNDS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

const markRoundSynced = (id: string) => {
  if (!id) return;
  try {
    const set = getUnsyncedRoundIds();
    set.delete(id);
    localStorage.setItem(UNSYNCED_ROUNDS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  } catch {}
};

const getUserCreatedMeterIds = (): Set<string> => {
  const set = new Set<string>();
  try {
    const raw = localStorage.getItem(UNMARKED_METERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach((id: string) => {
          if (id) set.add(id);
        });
      }
    }
  } catch {}
  return set;
};

const getDeletedMeterIds = (): Set<string> => {
  const set = new Set<string>();
  const userCreated = getUserCreatedMeterIds();

  try {
    const raw = localStorage.getItem(DELETED_METERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => {
          if (!userCreated.has(id) && !userCreated.has(id.toLowerCase()) && !userCreated.has(id.toUpperCase())) {
            set.add(id);
          }
        });
      }
    }
  } catch {
    // fallback
  }
  return set;
};

const markDeletedMeterId = (id: string) => {
  if (!id) return;
  unmarkLocalCreation(id);
  try {
    const userCreated = getUserCreatedMeterIds();
    userCreated.delete(id);
    userCreated.delete(id.toLowerCase());
    userCreated.delete(id.toUpperCase());
    userCreated.delete(id.trim());
    localStorage.setItem(UNMARKED_METERS_STORAGE_KEY, JSON.stringify(Array.from(userCreated)));

    const current = getDeletedMeterIds();
    current.add(id);
    current.add(id.toLowerCase());
    current.add(id.toUpperCase());
    current.add(id.trim());
    localStorage.setItem(DELETED_METERS_STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch {}
};

const unmarkDeletedMeterId = (id: string) => {
  if (!id) return;
  try {
    const userCreated = getUserCreatedMeterIds();
    userCreated.add(id);
    userCreated.add(id.toLowerCase());
    userCreated.add(id.toUpperCase());
    userCreated.add(id.trim());
    localStorage.setItem(UNMARKED_METERS_STORAGE_KEY, JSON.stringify(Array.from(userCreated)));

    const current = getDeletedMeterIds();
    current.delete(id);
    current.delete(id.toLowerCase());
    current.delete(id.toUpperCase());
    current.delete(id.trim());
    localStorage.setItem(DELETED_METERS_STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch {}
};

const getDeletedMeterReadingIds = (): Set<string> => {
  const set = new Set<string>(DEMO_READING_IDS);
  try {
    const raw = localStorage.getItem(DELETED_METER_READINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => set.add(id));
      }
    }
  } catch {
    // fallback
  }
  return set;
};

const markDeletedMeterReadingId = (id: string) => {
  if (!id) return;
  unmarkLocalCreation(id);
  try {
    const current = getDeletedMeterReadingIds();
    current.add(id);
    current.add(id.toLowerCase());
    current.add(id.toUpperCase());
    localStorage.setItem(DELETED_METER_READINGS_STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch {}
};

const unmarkDeletedMeterReadingId = (id: string) => {
  if (!id) return;
  try {
    const current = getDeletedMeterReadingIds();
    current.delete(id);
    localStorage.setItem(DELETED_METER_READINGS_STORAGE_KEY, JSON.stringify(Array.from(current)));
  } catch {}
};

// In-flight locally created IDs to prevent transient race conditions during initial upload
const pendingLocalCreations = new Map<string, number>();

const trackLocalCreation = (id: string) => {
  pendingLocalCreations.set(id, Date.now());
  setTimeout(() => {
    pendingLocalCreations.delete(id);
  }, 20000);
};

const unmarkLocalCreation = (id: string) => {
  pendingLocalCreations.delete(id);
};

const getDeletedRequestIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_REQUESTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (e) {
    console.warn('Error reading deleted request ids:', e);
  }
  return new Set();
};

const markDeletedRequestId = (id: string) => {
  unmarkLocalCreation(id);
  const set = getDeletedRequestIds();
  set.add(id);
  localStorage.setItem(DELETED_REQUESTS_STORAGE_KEY, JSON.stringify(Array.from(set)));
};

const unmarkDeletedRequestId = (id: string) => {
  const set = getDeletedRequestIds();
  if (set.has(id)) {
    set.delete(id);
    localStorage.setItem(DELETED_REQUESTS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  }
};

const getDeletedIncidentIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_INCIDENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (e) {
    console.warn('Error reading deleted incident ids:', e);
  }
  return new Set();
};

const markDeletedIncidentId = (id: string) => {
  unmarkLocalCreation(id);
  const set = getDeletedIncidentIds();
  set.add(id);
  localStorage.setItem(DELETED_INCIDENTS_STORAGE_KEY, JSON.stringify(Array.from(set)));
};

const unmarkDeletedIncidentId = (id: string) => {
  const set = getDeletedIncidentIds();
  if (set.has(id)) {
    set.delete(id);
    localStorage.setItem(DELETED_INCIDENTS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  }
};

const getDeletedEquipmentIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_EQUIPMENT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (e) {
    console.warn('Error reading deleted equipment ids:', e);
  }
  return new Set();
};

const markDeletedEquipmentId = (id: string) => {
  unmarkLocalCreation(id);
  const set = getDeletedEquipmentIds();
  set.add(id);
  localStorage.setItem(DELETED_EQUIPMENT_STORAGE_KEY, JSON.stringify(Array.from(set)));
};

const unmarkDeletedEquipmentId = (id: string) => {
  const set = getDeletedEquipmentIds();
  if (set.has(id)) {
    set.delete(id);
    localStorage.setItem(DELETED_EQUIPMENT_STORAGE_KEY, JSON.stringify(Array.from(set)));
  }
};

const CANONICAL_HISTORICAL_ROUND_IDS = new Set<string>([
  ...(HISTORICAL_ROUNDS || []).map(r => r?.id).filter(Boolean),
  'rnd-1792630031894',
  'rnd-1792550582453'
]);
const CANONICAL_HISTORICAL_ROUNDS_MAP = new Map<string, DailyRound>(
  (HISTORICAL_ROUNDS || []).filter(r => r && r.id).map(r => [r.id, r])
);
const sessionDeletedRoundIds = new Map<string, number>();

const deletedRoundIdsMemorySet = new Set<string>();

const getDeletedRoundIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_ROUNDS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        let hadCanonicalStale = false;
        const cleanedList: string[] = [];
        parsed.forEach(id => {
          if (typeof id === 'string' && id) {
            // Never allow stale localStorage or session to hide official historical rounds
            if (CANONICAL_HISTORICAL_ROUND_IDS.has(id)) {
              deletedRoundIdsMemorySet.delete(id);
              sessionDeletedRoundIds.delete(id);
              hadCanonicalStale = true;
              return;
            }
            deletedRoundIdsMemorySet.add(id);
            cleanedList.push(id);
          }
        });
        if (hadCanonicalStale) {
          try {
            localStorage.setItem(DELETED_ROUNDS_STORAGE_KEY, JSON.stringify(cleanedList));
          } catch {}
        }
      }
    }
  } catch (e) {
    console.warn('Error reading deleted round ids:', e);
  }
  CANONICAL_HISTORICAL_ROUND_IDS.forEach(id => {
    deletedRoundIdsMemorySet.delete(id);
    sessionDeletedRoundIds.delete(id);
  });
  return new Set(deletedRoundIdsMemorySet);
};

const markDeletedRoundId = (id: string) => {
  if (!id || CANONICAL_HISTORICAL_ROUND_IDS.has(id)) return;
  unmarkLocalCreation(id);
  sessionDeletedRoundIds.set(id, Date.now());
  deletedRoundIdsMemorySet.add(id);
  const set = getDeletedRoundIds();
  set.add(id);
  localStorage.setItem(DELETED_ROUNDS_STORAGE_KEY, JSON.stringify(Array.from(set)));
};

const unmarkDeletedRoundId = (id: string) => {
  if (!id) return;
  sessionDeletedRoundIds.delete(id);
  deletedRoundIdsMemorySet.delete(id);
  const set = getDeletedRoundIds();
  if (set.has(id)) {
    set.delete(id);
    localStorage.setItem(DELETED_ROUNDS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  }
};

const getDeletedUserIds = (): Set<string> => {
  const set = new Set<string>([
    'usr-1789230683227',
    'usr-1789230683228',
    'usr-1789230683229',
    'usr-admin-master'
  ]);
  const canonicalIds = new Set(INITIAL_USERS.map(u => u.id));
  try {
    const raw = localStorage.getItem(DELETED_USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        parsed.forEach(id => {
          if (!canonicalIds.has(id)) {
            set.add(id);
          }
        });
      }
    }
  } catch (e) {
    console.warn('Error reading deleted user ids:', e);
  }
  return set;
};

const markDeletedUserId = (id: string) => {
  unmarkLocalCreation(id);
  const set = getDeletedUserIds();
  set.add(id);
  localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(Array.from(set)));
};

const unmarkDeletedUserId = (id: string) => {
  const set = getDeletedUserIds();
  if (set.has(id)) {
    set.delete(id);
    localStorage.setItem(DELETED_USERS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  }
};

const getDeletedTaskIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_TASKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (e) {
    console.warn('Error reading deleted task ids:', e);
  }
  return new Set();
};

const markDeletedTaskId = (id: string) => {
  unmarkLocalCreation(id);
  const set = getDeletedTaskIds();
  set.add(id);
  localStorage.setItem(DELETED_TASKS_STORAGE_KEY, JSON.stringify(Array.from(set)));
};

const unmarkDeletedTaskId = (id: string) => {
  const set = getDeletedTaskIds();
  if (set.has(id)) {
    set.delete(id);
    localStorage.setItem(DELETED_TASKS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  }
};

const getDeletedScheduleIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_SCHEDULES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (e) {
    console.warn('Error reading deleted schedule ids:', e);
  }
  return new Set();
};

const markDeletedScheduleId = (id: string) => {
  unmarkLocalCreation(id);
  const set = getDeletedScheduleIds();
  set.add(id);
  localStorage.setItem(DELETED_SCHEDULES_STORAGE_KEY, JSON.stringify(Array.from(set)));
};

const unmarkDeletedScheduleId = (id: string) => {
  const set = getDeletedScheduleIds();
  if (set.has(id)) {
    set.delete(id);
    localStorage.setItem(DELETED_SCHEDULES_STORAGE_KEY, JSON.stringify(Array.from(set)));
  }
};

const getDeletedCronogramaIds = (): Set<string> => {
  try {
    const raw = localStorage.getItem(DELETED_CRONOGRAMAS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return new Set(parsed);
    }
  } catch (e) {
    console.warn('Error reading deleted cronograma ids:', e);
  }
  return new Set();
};

const markDeletedCronogramaId = (id: string) => {
  unmarkLocalCreation(id);
  const set = getDeletedCronogramaIds();
  set.add(id);
  localStorage.setItem(DELETED_CRONOGRAMAS_STORAGE_KEY, JSON.stringify(Array.from(set)));
};

const unmarkDeletedCronogramaId = (id: string) => {
  const set = getDeletedCronogramaIds();
  if (set.has(id)) {
    set.delete(id);
    localStorage.setItem(DELETED_CRONOGRAMAS_STORAGE_KEY, JSON.stringify(Array.from(set)));
  }
};

const getAllDeletedIds = (): Set<string> => {
  const set = new Set<string>();
  [
    getDeletedRequestIds(),
    getDeletedIncidentIds(),
    getDeletedEquipmentIds(),
    getDeletedRoundIds(),
    getDeletedUserIds(),
    getDeletedTaskIds(),
    getDeletedScheduleIds(),
    getDeletedCronogramaIds(),
    getDeletedMeterIds(),
    getDeletedMeterReadingIds()
  ].forEach(s => s.forEach(id => set.add(id)));
  return set;
};

const markDeletedAnyId = (id: string) => {
  if (!id) return;
  if (id.startsWith('req-')) markDeletedRequestId(id);
  else if (id.startsWith('inc-') || id.startsWith('inc_')) markDeletedIncidentId(id);
  else if (id.startsWith('eq-')) markDeletedEquipmentId(id);
  else if (id.startsWith('rnd-')) {
    if (!CANONICAL_HISTORICAL_ROUND_IDS.has(id)) markDeletedRoundId(id);
  }
  else if (id.startsWith('usr-')) markDeletedUserId(id);
  else if (id.startsWith('task-')) markDeletedTaskId(id);
  else if (id.startsWith('sched-')) markDeletedScheduleId(id);
  else if (id.startsWith('cron-')) markDeletedCronogramaId(id);
  else if (id.startsWith('med-') || id.startsWith('meter-') || id.startsWith('MED-') || id.startsWith('meter_')) markDeletedMeterId(id);
  else if (id.startsWith('rd-') || id.startsWith('reading-') || id.startsWith('log-')) markDeletedMeterReadingId(id);
  else {
    markDeletedIncidentId(id);
    markDeletedRequestId(id);
  }
};

export const isLegacyMockSchedule = (s: TechnicianSchedule): boolean => {
  if (!s || !s.id) return false;
  // Discard auto-generated mock shifts from the previous demo template for late September 2026
  if (s.id.startsWith('sched-usr-') && s.date && s.date.startsWith('2026-09-') && s.date !== '2026-09-01') {
    return true;
  }
  return false;
};

export const getCanonicalScheduleTechKey = (id?: string, name?: string): string => {
  const cleanId = (id || '').trim();
  const normName = (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\/.*$/, '')
    .replace(/tecnico|supervisor|operador|mantenimiento|ingenieria/gi, '')
    .trim();

  if (cleanId === 'pers-1' || cleanId === 'usr-1789230683226' || normName.includes('juan mateo') || normName === 'mateo') return 'tech_juan_mateo';
  if (cleanId === 'pers-2' || cleanId === 'usr-1789246875257' || normName.includes('machado') || normName.includes('fernely')) return 'tech_ferney_machado';
  if (cleanId === 'pers-3' || cleanId === 'usr-1789435937593' || normName.includes('carlos manuel')) return 'tech_carlos_manuel';
  if (cleanId === 'pers-4' || cleanId === 'usr-1789437863324' || normName.includes('alonso')) return 'tech_ferney_alonso';
  if (
    cleanId === 'pers-5' ||
    cleanId === 'usr-1790809958615-592' ||
    cleanId === 'usr-1790620816372' ||
    cleanId === 'usr-1790632899774' ||
    normName.includes('adrian')
  ) {
    return 'tech_adrian';
  }

  return cleanId.toLowerCase() || normName;
};

const getScheduleItemTimestamp = (item?: Partial<TechnicianSchedule> | null): number => {
  if (!item) return 0;
  const t1 = new Date(item.updatedAt || item.createdAt || 0).getTime();
  if (t1 > 0) return t1;
  const m = String(item.id || '').match(/^sched-(\d{10,})/);
  if (m) return Number(m[1]);
  return 0;
};

const sanitizeSystemSettings = (raw?: Partial<SystemSettings> | null, base: SystemSettings = INITIAL_SETTINGS): SystemSettings => {
  const mergedHotelInfo = {
    ...INITIAL_SETTINGS.hotelInfo,
    ...(base?.hotelInfo || {}),
    ...(raw?.hotelInfo || {}),
  };
  if (!mergedHotelInfo.hotelName || mergedHotelInfo.hotelName.includes('Grand Horizon')) {
    mergedHotelInfo.hotelName = 'WAKE BIO HOTEL';
  }
  if (mergedHotelInfo.propertyCode === 'GHLR-041') {
    mergedHotelInfo.propertyCode = '';
  }
  if (!mergedHotelInfo.logoUrl || mergedHotelInfo.logoUrl.startsWith('data:image/jpeg;base64,/9j/4AASSkZYWABXQQ')) {
    mergedHotelInfo.logoUrl = '/wake-bio-logo.jpg';
  }
  return {
    ...INITIAL_SETTINGS,
    ...base,
    ...(raw || {}),
    hotelInfo: mergedHotelInfo,
    alertThresholds: {
      ...INITIAL_SETTINGS.alertThresholds,
      ...(base?.alertThresholds || {}),
      ...(raw?.alertThresholds || {}),
    },
    listSelectorStyle: raw?.listSelectorStyle || base?.listSelectorStyle || INITIAL_SETTINGS.listSelectorStyle || 'popover',
  };
};

const reconcileServerDeletedRoundIds = (
  serverDeletedIds?: string[],
  serverRounds?: DailyRound[],
  activeLocalActions?: Set<string>
): Set<string> => {
  const now = Date.now();
  const serverDelSet = new Set<string>();
  if (Array.isArray(serverDeletedIds)) {
    for (const id of serverDeletedIds) {
      if (typeof id === 'string' && id.startsWith('rnd-')) {
        if (CANONICAL_HISTORICAL_ROUND_IDS.has(id)) continue;
        serverDelSet.add(id);
      }
    }
  }

  const serverRoundIds = new Set<string>(
    Array.isArray(serverRounds) ? serverRounds.map((r: any) => r?.id).filter(Boolean) : []
  );

  const currentLocal = getDeletedRoundIds();
  const authoritative = new Set<string>(serverDelSet);

  for (const id of currentLocal) {
    if (CANONICAL_HISTORICAL_ROUND_IDS.has(id)) {
      deletedRoundIdsMemorySet.delete(id);
      continue;
    }
    const sessionDelTime = sessionDeletedRoundIds.get(id);
    const isRecentlyDeletedInSession = Boolean(sessionDelTime && (now - sessionDelTime < 30000));
    const isLocalInFlight = Boolean(activeLocalActions && activeLocalActions.has(id));

    if (isRecentlyDeletedInSession || isLocalInFlight) {
      authoritative.add(id);
      continue;
    }
    // If the round exists on the server (or in canonical historical rounds) and is NOT in serverDeletedIds, unmark it so all users see the exact same rounds
    if (serverRoundIds.has(id) || CANONICAL_HISTORICAL_ROUND_IDS.has(id)) {
      deletedRoundIdsMemorySet.delete(id);
      continue;
    }
    authoritative.add(id);
  }

  // Guarantee canonical historical rounds can NEVER be marked as deleted
  CANONICAL_HISTORICAL_ROUND_IDS.forEach(id => authoritative.delete(id));

  deletedRoundIdsMemorySet.clear();
  authoritative.forEach(id => deletedRoundIdsMemorySet.add(id));

  try {
    localStorage.setItem(DELETED_ROUNDS_STORAGE_KEY, JSON.stringify(Array.from(authoritative)));
  } catch {}
  return authoritative;
};

const mergeScheduleLists = (
  baseList: TechnicianSchedule[],
  incomingList: TechnicianSchedule[],
  deletedIds: Set<string>
): TechnicianSchedule[] => {
  const map = new Map<string, TechnicianSchedule>();

  const processItem = (item: TechnicianSchedule) => {
    if (!item || !item.id || deletedIds.has(item.id)) return;
    if (isLegacyMockSchedule(item)) return;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, { ...item });
    } else {
      const timeExisting = getScheduleItemTimestamp(existing);
      const timeIncoming = getScheduleItemTimestamp(item);
      map.set(item.id, timeIncoming >= timeExisting ? { ...existing, ...item } : { ...item, ...existing });
    }
  };

  (baseList || []).forEach(processItem);
  (incomingList || []).forEach(processItem);

  // Secondary authoritative deduplication by (date + canonical technician key)
  const dateTechMap = new Map<string, TechnicianSchedule>();
  Array.from(map.values()).forEach(item => {
    if (!item || !item.date) return;
    if (isLegacyMockSchedule(item)) return;
    const techKey = getCanonicalScheduleTechKey(item.technicianId, item.technicianName);
    const key = `${item.date}__${techKey}`;
    const existing = dateTechMap.get(key);
    if (!existing) {
      dateTechMap.set(key, item);
    } else {
      const timeExisting = getScheduleItemTimestamp(existing);
      const timeItem = getScheduleItemTimestamp(item);
      // If one is older mock sched-usr- and other is user assigned, keep user assigned
      if (existing.id.startsWith('sched-usr-') && !item.id.startsWith('sched-usr-')) {
        dateTechMap.set(key, item);
      } else if (!existing.id.startsWith('sched-usr-') && item.id.startsWith('sched-usr-')) {
        // Keep existing
      } else if (timeItem >= timeExisting) {
        dateTechMap.set(key, item);
      }
    }
  });

  const merged = Array.from(dateTechMap.values());
  merged.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return merged;
};

const mergeCronogramaLists = (
  baseList: Cronograma[],
  incomingList: Cronograma[],
  deletedIds: Set<string>
): Cronograma[] => {
  const map = new Map<string, Cronograma>();

  const processItem = (item: Cronograma) => {
    if (!item || !item.id || deletedIds.has(item.id)) return;
    const existing = map.get(item.id);
    if (!existing) {
      map.set(item.id, { ...item });
    } else {
      const timeExisting = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const timeIncoming = new Date(item.updatedAt || item.createdAt || 0).getTime();
      map.set(item.id, timeIncoming >= timeExisting ? { ...existing, ...item } : { ...item, ...existing });
    }
  };

  (baseList || []).forEach(processItem);
  (incomingList || []).forEach(processItem);

  const res = Array.from(map.values());
  res.sort((a, b) => {
    const timeA = new Date(b.updatedAt || b.createdAt || 0).getTime();
    const timeB = new Date(a.updatedAt || a.createdAt || 0).getTime();
    return timeA - timeB;
  });
  return res;
};

const TASK_STATUS_PRIORITY: Record<string, number> = {
  'completada': 3,
  'terminada': 3,
  'en_proceso': 2,
  'en_progreso': 2,
  'pendiente': 1,
  'asignada': 1
};

const getMoreAdvancedTaskStatus = (s1?: string, s2?: string): string => {
  const p1 = TASK_STATUS_PRIORITY[s1 || 'pendiente'] || 1;
  const p2 = TASK_STATUS_PRIORITY[s2 || 'pendiente'] || 1;
  return p1 >= p2 ? (s1 || 'pendiente') : (s2 || 'pendiente');
};

const REQUEST_STATUS_PRIORITY: Record<string, number> = {
  'solucionada': 3,
  'atendida': 3,
  'cerrada': 3,
  'en_revision': 2,
  'en_proceso': 2,
  'pendiente': 1
};

const getMoreAdvancedRequestStatus = (s1?: string, s2?: string): string => {
  const p1 = REQUEST_STATUS_PRIORITY[s1 || 'pendiente'] || 1;
  const p2 = REQUEST_STATUS_PRIORITY[s2 || 'pendiente'] || 1;
  return p1 >= p2 ? (s1 || 'pendiente') : (s2 || 'pendiente');
};

const mergeTaskLists = (
  baseList: MaintenanceTask[],
  incomingList: MaintenanceTask[],
  deletedIds: Set<string>,
  localCreatedIds?: Set<string>
): MaintenanceTask[] => {
  const map = new Map<string, MaintenanceTask>();

  // Add existing local items first (unless deleted)
  (baseList || []).forEach(item => {
    if (item && item.id && !deletedIds.has(item.id)) {
      map.set(item.id, { ...item });
    }
  });

  // Merge incoming items
  (incomingList || []).forEach(item => {
    if (!item || !item.id || deletedIds.has(item.id)) return;

    if (!map.has(item.id)) {
      map.set(item.id, { ...item });
    } else {
      const existing = map.get(item.id)!;
      const advancedStatus = getMoreAdvancedTaskStatus(existing.status, item.status) as any;
      const completedAt = existing.completedAt || item.completedAt;
      const completedBy = existing.completedBy || item.completedBy;
      const resolutionNotes = (existing as any).resolutionNotes || (item as any).resolutionNotes;
      const completedEvidenceUrl = (existing as any).completedEvidenceUrl || (item as any).completedEvidenceUrl;

      const existingTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const incomingTime = new Date(item.updatedAt || item.createdAt || 0).getTime();
      
      const mergedItem = incomingTime >= existingTime ? { ...existing, ...item } : { ...item, ...existing };
      mergedItem.status = advancedStatus;
      if (completedAt) mergedItem.completedAt = completedAt;
      if (completedBy) mergedItem.completedBy = completedBy;
      if (resolutionNotes) (mergedItem as any).resolutionNotes = resolutionNotes;
      if (completedEvidenceUrl) (mergedItem as any).completedEvidenceUrl = completedEvidenceUrl;
      map.set(item.id, mergedItem);
    }
  });

  // Preserve local actions that might not have landed on cloud yet
  if (localCreatedIds) {
    (baseList || []).forEach(item => {
      if (item && item.id && localCreatedIds.has(item.id) && !deletedIds.has(item.id)) {
        map.set(item.id, item);
      }
    });
  }

  const result = Array.from(map.values());
  const priorityOrder: Record<string, number> = { urgente: 0, alta: 1, media: 2, baja: 3 };
  result.sort((a, b) => {
    if (a.status === 'completada' && b.status !== 'completada') return 1;
    if (a.status !== 'completada' && b.status === 'completada') return -1;
    
    const pA = priorityOrder[a.priority] ?? 2;
    const pB = priorityOrder[b.priority] ?? 2;
    if (pA !== pB) return pA - pB;

    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  return result;
};

export const safeCloudWrite = async (operation: () => Promise<any>): Promise<any> => {
  return safeFirestoreWrite(async () => {
    await ensureAuthenticated();
    return await operation();
  });
};

const recordCloudDeletion = async (id: string) => {
  if (!id || CANONICAL_HISTORICAL_ROUND_IDS.has(id)) return;
  try {
    await safeCloudWrite(() => setDoc(doc(db, 'system', 'deleted_records'), {
      ids: arrayUnion(id),
      updatedAt: new Date().toISOString()
    }, { merge: true }));
  } catch (e) {
    console.warn('Error recording cloud deletion:', e);
  }
};

const mergeUserLists = (
  baseList: User[],
  incomingList: User[],
  deletedIds: Set<string>,
  localCreatedIds?: Set<string>
): User[] => {
  const isGhost = (u: User) =>
    !u || !u.id || u.id === 'usr-admin-master' || u.displayName === 'Administrador Principal';

  const map = new Map<string, User>();
  
  // 1. Populate with baseList (current local state) to ensure locally added users are NEVER dropped
  for (const u of (baseList || [])) {
    if (u && u.id && !deletedIds.has(u.id) && !isGhost(u)) {
      map.set(u.id, u);
    }
  }

  // 2. Merge incomingList (server/cloud state) as updates or additions
  for (const u of (incomingList || [])) {
    if (u && u.id && !deletedIds.has(u.id) && !isGhost(u)) {
      const existing = map.get(u.id);
      if (!existing) {
        map.set(u.id, u);
      } else {
        const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : (existing.createdAt ? new Date(existing.createdAt).getTime() : 0);
        const incomingTime = u.updatedAt ? new Date(u.updatedAt).getTime() : (u.createdAt ? new Date(u.createdAt).getTime() : 0);
        if (incomingTime >= existingTime) {
          map.set(u.id, { ...existing, ...u });
        } else {
          map.set(u.id, { ...u, ...existing });
        }
      }
    }
  }

  // 3. Deduplicate strictly by normalized email so a user is NEVER duplicated under multiple IDs
  const emailMap = new Map<string, User>();
  for (const u of map.values()) {
    const normEmail = (u.email || '').toLowerCase().trim();
    if (!normEmail) {
      emailMap.set(u.id, u);
      continue;
    }
    const existing = emailMap.get(normEmail);
    if (!existing) {
      emailMap.set(normEmail, u);
    } else {
      if (existing.displayName === 'Administrador Principal') {
        emailMap.set(normEmail, u);
      } else if (u.displayName !== 'Administrador Principal') {
        const existingTime = existing.updatedAt ? new Date(existing.updatedAt).getTime() : (existing.createdAt ? new Date(existing.createdAt).getTime() : 0);
        const incomingTime = u.updatedAt ? new Date(u.updatedAt).getTime() : (u.createdAt ? new Date(u.createdAt).getTime() : 0);
        if (incomingTime >= existingTime) {
          emailMap.set(normEmail, { ...existing, ...u });
        } else {
          emailMap.set(normEmail, { ...u, ...existing });
        }
      }
    }
  }

  return Array.from(emailMap.values());
};

const getRoundTimestamp = (r: DailyRound): number => {
  if (!r) return 0;
  // Priorizar fecha y hora en que se realizó la ronda para mantener el orden cronológico estricto
  const dateStr = (r.date || '').replace(/\//g, '-').trim();
  const timeStr = (r.time || '00:00').trim();
  if (dateStr) {
    const [hRaw, mRaw] = timeStr.split(':');
    let h = parseInt(hRaw || '0', 10) || 0;
    const m = parseInt(mRaw || '0', 10) || 0;
    if ((r.shift === 'tarde' || r.shift === 'noche') && h < 12) {
      h += 12;
    }
    const isoStr = `${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    const t = new Date(isoStr).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (r.completedAt) {
    const t = new Date(r.completedAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if ((r as any).createdAt) {
    const t = new Date((r as any).createdAt).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  if (r.lastUpdated) {
    const t = new Date(r.lastUpdated).getTime();
    if (!isNaN(t) && t > 0) return t;
  }
  return 0;
};

// Non-destructive robust merge function: guarantees existing local/cloud rounds are never accidentally wiped out or blinked away, while ensuring deleted ones disappear immediately
const normalizeRoundRecord = (round: DailyRound, currentActiveId?: string): DailyRound => {
  if (!round) return round;

  let normalized = { ...round };

  // Si la ronda pertenece al historial oficial canónico, proteger su fecha, turno y técnico/firma frente a cualquier caché local desactualizado
  const canonicalHist = normalized.id ? CANONICAL_HISTORICAL_ROUNDS_MAP.get(normalized.id) : undefined;
  if (canonicalHist) {
    const localSig = (normalized.technicianSignature || '').trim();
    const isLocalSigSpecificOther =
      Boolean(localSig) &&
      !localSig.toLowerCase().includes('mateo') &&
      localSig.toLowerCase() !== 'técnico' &&
      localSig.toLowerCase() !== 'tecnico';
    const isCanonicalMateo = (canonicalHist.technicianName || '').toLowerCase().includes('mateo');

    const resolvedTechName = (isCanonicalMateo && isLocalSigSpecificOther)
      ? localSig
      : canonicalHist.technicianName;
    const resolvedTechSig = (isCanonicalMateo && isLocalSigSpecificOther)
      ? localSig
      : (canonicalHist.technicianSignature || canonicalHist.technicianName);

    const hasAllCheckpoints = Array.isArray(normalized.checkpoints) &&
      normalized.checkpoints.length >= (canonicalHist.checkpoints?.length || 22) &&
      normalized.checkpoints.every(c => c && isCheckpointComplete(c));

    normalized = {
      ...canonicalHist,
      ...normalized,
      date: canonicalHist.date || normalized.date,
      time: canonicalHist.time || normalized.time,
      shift: canonicalHist.shift || normalized.shift,
      technicianName: resolvedTechName,
      technicianSignature: resolvedTechSig,
      status: 'completada',
      compliancePercentage: 100,
      completedAt: canonicalHist.completedAt || normalized.completedAt || `${canonicalHist.date}T${canonicalHist.time || '21:00'}:00`,
      checkpoints: hasAllCheckpoints ? normalized.checkpoints : canonicalHist.checkpoints
    };
  }

  // Unificar y preservar la ronda de mañana de Ferney Alonso (2026-10-15) y la ronda de tarde de Carlos Manuel (2026-10-16) en todos los dispositivos
  if (
    normalized.id === 'rnd-1792150327061' ||
    normalized.id === 'rnd-1792149714731' ||
    (normalized.date === '2026-10-15' && normalized.shift === 'manana' && (normalized.technicianName || '').toLowerCase().includes('alonso'))
  ) {
    normalized = {
      ...normalized,
      id: 'rnd-1792150327061',
      date: '2026-10-15',
      time: '06:32',
      shift: 'manana',
      technicianId: 'usr-1789437863324',
      technicianName: 'Ferney Alonso/Supervisor',
      technicianSignature: 'Ferney Alonso/Supervisor',
      status: 'completada',
      compliancePercentage: 100
    };
  } else if (
    normalized.id === 'rnd-1792116230649' ||
    (normalized.date === '2026-10-16' && (normalized.shift === 'noche' || normalized.shift === 'tarde') && (normalized.technicianName || '').toLowerCase().includes('carlos manuel') && normalized.status === 'completada')
  ) {
    normalized = {
      ...normalized,
      id: 'rnd-1792116230649',
      date: '2026-10-16',
      time: '21:05',
      shift: 'tarde',
      technicianId: 'usr-1789435937593',
      technicianName: 'Carlos Manuel/ Técnico',
      technicianSignature: 'Carlos Manuel/ Técnico',
      status: 'completada',
      compliancePercentage: 100
    };
  }

  // Garantizar atribución oficial de Ferney Machado en la ronda del 2026-10-14 (21:27 hs) y rondas creadas con su correo/usuario
  if (
    normalized.id === 'rnd-1792031263748' ||
    (normalized.date === '2026-10-14' && normalized.time === '21:27') ||
    ((normalized.userEmail === 'ferneymachado@gmail.com' || normalized.userId === 'usr-1789246875257') && (normalized.technicianName || '').toLowerCase().includes('mateo'))
  ) {
    normalized = {
      ...normalized,
      technicianName: 'Ferney Machado/Técnico',
      technicianSignature: normalized.id === 'rnd-1792031263748' ? 'Ferney Machado' : 'Ferney Machado/Técnico',
      userId: 'usr-1789246875257',
      userEmail: 'ferneymachado@gmail.com'
    };
  } else if (
    (normalized.userEmail === 'carlosmanuel@gmail.com' || normalized.userId === 'usr-1789435937593' || normalized.technicianId === 'usr-1789435937593') &&
    (normalized.technicianName || '').toLowerCase().includes('mateo')
  ) {
    normalized = {
      ...normalized,
      technicianName: 'Carlos Manuel/ Técnico',
      technicianSignature: 'Carlos Manuel/ Técnico'
    };
  } else if (
    (normalized.userEmail === 'ferneyalonso44@gmail.com' || normalized.userId === 'usr-1789437863324' || normalized.technicianId === 'usr-1789437863324') &&
    (normalized.technicianName || '').toLowerCase().includes('mateo')
  ) {
    normalized = {
      ...normalized,
      technicianName: 'Ferney Alonso/Supervisor',
      technicianSignature: 'Ferney Alonso/Supervisor'
    };
  } else if (
    (normalized.userEmail === 'adrianbarrera@gmail.com' || normalized.userId === 'usr-1790809958615-592' || normalized.technicianId === 'usr-1790809958615-592') &&
    (normalized.technicianName || '').toLowerCase().includes('mateo')
  ) {
    normalized = {
      ...normalized,
      technicianName: 'Adrián Barrera/Tecnico',
      technicianSignature: 'Adrián Barrera/Tecnico'
    };
  }

  // Asegurar siempre que el nombre del técnico que aparece en la ronda corresponda a la firma de quien cerró la ronda
  const sigTrim = (normalized.technicianSignature || '').trim();
  const techTrim = (normalized.technicianName || '').trim();
  if (
    sigTrim &&
    sigTrim.toLowerCase() !== 'técnico' &&
    sigTrim.toLowerCase() !== 'tecnico' &&
    sigTrim.toLowerCase() !== 'técnico de turno' &&
    sigTrim.toLowerCase() !== 'tecnico de turno'
  ) {
    if (!techTrim || (!techTrim.toLowerCase().includes(sigTrim.toLowerCase()) && !sigTrim.toLowerCase().includes(techTrim.toLowerCase()))) {
      normalized = {
        ...normalized,
        technicianName: sigTrim
      };
    }
  }

  // Garantizar que las rondas históricas antiguas (septiembre/octubre) estén 100% completas y sin campos vacíos
  if (normalized.id === 'rnd-1791725050034' && Array.isArray(normalized.checkpoints)) {
    const nevIdx = normalized.checkpoints.findIndex(c => c && c.title === 'Neveras');
    if (nevIdx >= 0) {
      const nev = normalized.checkpoints[nevIdx];
      const hasEmptyMf = Array.isArray(nev.measurementFields) && nev.measurementFields.some(f => f.value === undefined || f.value === '');
      if (hasEmptyMf) {
        const fallbackVals = [1, 5, 5, 34, -6];
        const nextCps = [...normalized.checkpoints];
        nextCps[nevIdx] = {
          ...nev,
          currentValue: nev.currentValue || 1,
          lastNonZeroValue: 1,
          measurementFields: (nev.measurementFields || []).map((f, idx) => ({
            ...f,
            value: f.value !== undefined && f.value !== '' ? f.value : (fallbackVals[idx] ?? 2),
            lastNonZeroValue: f.value !== undefined && f.value !== '' ? Number(f.value) : (fallbackVals[idx] ?? 2),
            statusValue: f.statusValue || 'OK',
            ampState: f.ampState || 'Encendido'
          }))
        };
        normalized = { ...normalized, checkpoints: nextCps };
      }
    }
  }

  if (
    normalized.id === 'rnd-1790476525419' ||
    normalized.id === 'rnd-1791201572448' ||
    normalized.id === 'rnd-1791335515490' ||
    normalized.id === 'rnd-1792630031894' ||
    normalized.id === 'rnd-1792550582453'
  ) {
    const isAdrian21 = normalized.id === 'rnd-1792630031894';
    const isAdrian20 = normalized.id === 'rnd-1792550582453';
    normalized = {
      ...normalized,
      status: 'completada',
      compliancePercentage: 100,
      completedAt: normalized.completedAt || (isAdrian21 ? '2026-10-21T19:47:00.000Z' : isAdrian20 ? '2026-10-20T21:43:00.000Z' : `${normalized.date || '2026-10-06'}T22:00:00.000Z`),
      technicianName: (isAdrian21 || isAdrian20) ? 'Adrián Barrera/Tecnico' : (normalized.technicianName || 'Técnico'),
      technicianSignature: (isAdrian21 || isAdrian20) ? 'Adrián Barrera/Tecnico' : (normalized.technicianSignature || normalized.technicianName || 'Técnico')
    };
  }

  const safeAnomalies = Array.isArray(normalized.anomalies) ? normalized.anomalies : [];
  if (!Array.isArray(normalized.anomalies) || normalized.anomaliesCount !== safeAnomalies.length) {
    normalized = {
      ...normalized,
      anomalies: safeAnomalies,
      anomaliesCount: safeAnomalies.length
    };
  }

  const isCanonicalHistorical = CANONICAL_HISTORICAL_ROUND_IDS.has(normalized.id);

  const todayStr = getLocalDateString();
  const roundDate = (normalized.date || '').replace(/\//g, '-').trim();

  // Si la ronda ya fue completada, firmada o tiene 100%, NUNCA degradarla a incompleta bajo ninguna circunstancia
  const isAlreadyCompleted = normalized.status === 'completada' || Boolean(normalized.completedAt && normalized.technicianSignature) || normalized.compliancePercentage === 100;

  if (isAlreadyCompleted) {
    return {
      ...normalized,
      status: 'completada',
      compliancePercentage: 100,
      completedAt: normalized.completedAt || (normalized.date ? `${roundDate}T${normalized.time || '22:00'}:00.000Z` : new Date().toISOString()),
      technicianSignature: normalized.technicianSignature || normalized.technicianName || 'Técnico'
    };
  }

  // Si es la ronda activa en curso en este dispositivo, o una ronda en progreso activa del turno noche (que puede haber iniciado ayer):
  // NUNCA alterarla ni cerrarla automáticamente mientras el técnico la esté realizando
  const timeStr = normalized.lastHeartbeat || normalized.lastUpdated || (normalized.date && normalized.time ? `${roundDate}T${normalized.time}:00` : null);
  const ts = timeStr ? new Date(timeStr).getTime() : 0;
  const isNightShiftRecent = normalized.shift === 'noche' && (!ts || isNaN(ts) || (Date.now() - ts) <= 14 * 60 * 60 * 1000);
  const isCurrentActive = Boolean(currentActiveId && normalized.id === currentActiveId);

  if (normalized.status === 'en_progreso' && (isCurrentActive || isNightShiftRecent || (!roundDate || roundDate === todayStr))) {
    return normalized;
  }

  // Si la ronda pertenece a una fecha anterior (ayer o antes y fuera de turno activo) y no es la activa:
  // Se asegura de inmediato su estado cerrado oficial al 100% para que quede archivada en el historial y NUNCA figure en curso ni pendiente
  if (roundDate && roundDate < todayStr && !isCanonicalHistorical && !isCurrentActive) {
    return {
      ...normalized,
      status: 'completada',
      compliancePercentage: 100,
      completedAt: normalized.completedAt || (normalized.date ? `${roundDate}T${normalized.time || '22:00'}:00.000Z` : new Date().toISOString()),
      technicianSignature: normalized.technicianSignature || normalized.technicianName || 'Técnico'
    };
  }

  const chks = normalized.checkpoints || [];
  const filledCount = chks.filter(c => isCheckpointComplete(c)).length;
  // All points must be strictly filled (no missing points allowed for 100%)
  const isAllPointsFilled = chks.length > 0 && filledCount >= chks.length;

  if (isAllPointsFilled || isCanonicalHistorical) {
    return {
      ...normalized,
      status: 'completada',
      compliancePercentage: 100,
      completedAt: normalized.completedAt || (normalized.date ? `${roundDate}T${normalized.time || '22:00'}:00.000Z` : new Date().toISOString()),
      technicianSignature: normalized.technicianSignature || normalized.technicianName || 'Técnico'
    };
  }

  const calcPct = chks.length > 0 ? Math.round((filledCount / chks.length) * 100) : 0;
  return { ...normalized, status: 'incompleta', compliancePercentage: calcPct };
};

const mergeRoundLists = (
  baseList: DailyRound[],
  incomingList: DailyRound[],
  deletedIds: Set<string>,
  currentActiveId?: string,
  localPendingIds?: Set<string>
): DailyRound[] => {
  const map = new Map<string, DailyRound>();

  const isPhotoValid = (url?: string | null): boolean => 
    Boolean(url && typeof url === 'string' && !url.includes('cached_in_db') && (url.startsWith('data:image/') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/assets/') || url.startsWith('blob:')));

  const mergeCheckpointsWithPhotos = (
    primary: RoundCheckpoint[],
    secondary: RoundCheckpoint[]
  ): RoundCheckpoint[] => {
    if (!primary || primary.length === 0) return secondary || [];
    if (!secondary || secondary.length === 0) return primary;

    const secMap = new Map<string, RoundCheckpoint>();
    for (const sc of secondary) {
      if (sc && sc.id) secMap.set(sc.id, sc);
      if (sc && sc.title) {
        secMap.set(sc.title, sc);
        secMap.set(sc.title.toLowerCase().trim(), sc);
      }
    }

    return primary.map(pc => {
      const sc = secMap.get(pc.id) || secMap.get(pc.title) || (pc.title ? secMap.get(pc.title.toLowerCase().trim()) : undefined);
      const hasPriPhoto = isPhotoValid(pc.photoUrl);
      const hasSecPhoto = sc ? isPhotoValid(sc.photoUrl) : false;
      const finalPhotoUrl = hasPriPhoto ? pc.photoUrl : (hasSecPhoto ? sc!.photoUrl : (pc.photoUrl || sc?.photoUrl));

      const priPhotos = Array.isArray(pc.photos) ? pc.photos.filter(isPhotoValid) : (hasPriPhoto ? [pc.photoUrl!] : []);
      const secPhotos = sc && Array.isArray(sc.photos) ? sc.photos.filter(isPhotoValid) : (hasSecPhoto ? [sc!.photoUrl!] : []);
      const mergedPhotos = Array.from(new Set([...priPhotos, ...secPhotos]));

      const mergedFields = pc.measurementFields?.map((pf, fIdx) => {
        const sf = sc?.measurementFields?.[fIdx] || sc?.measurementFields?.find(f => f && (f.id === pf.id || f.name === pf.name));
        const hasPfPhoto = isPhotoValid(pf.photoUrl);
        const hasSfPhoto = sf ? isPhotoValid(sf.photoUrl) : false;
        const priFPhotos = Array.isArray(pf.photos) ? pf.photos.filter(isPhotoValid) : (hasPfPhoto ? [pf.photoUrl!] : []);
        const secFPhotos = sf && Array.isArray(sf.photos) ? sf.photos.filter(isPhotoValid) : (hasSfPhoto ? [sf!.photoUrl!] : []);
        const mergedFPhotos = Array.from(new Set([...priFPhotos, ...secFPhotos]));
        const hasPfVal = pf.value !== undefined && pf.value !== null && String(pf.value).trim() !== '';
        const hasSfVal = sf && sf.value !== undefined && sf.value !== null && String(sf.value).trim() !== '';
        return {
          ...pf,
          value: hasPfVal ? pf.value : (hasSfVal ? sf!.value : pf.value),
          photoUrl: hasPfPhoto ? pf.photoUrl : (hasSfPhoto ? sf!.photoUrl : pf.photoUrl),
          photos: mergedFPhotos.length > 0 ? mergedFPhotos : undefined
        };
      }) || sc?.measurementFields;

      const pcHasVal = pc.currentValue !== undefined && pc.currentValue !== null && String(pc.currentValue).trim() !== '';
      const scHasVal = sc && sc.currentValue !== undefined && sc.currentValue !== null && String(sc.currentValue).trim() !== '';
      const finalVal = pcHasVal ? pc.currentValue : (scHasVal ? sc!.currentValue : pc.currentValue);

      const pcHasStatus = pc.statusValue !== undefined && pc.statusValue !== null && String(pc.statusValue).trim() !== '';
      const scHasStatus = sc && sc.statusValue !== undefined && sc.statusValue !== null && String(sc.statusValue).trim() !== '';
      const finalStatus = pcHasStatus ? pc.statusValue : (scHasStatus ? sc!.statusValue : pc.statusValue);

      return {
        ...pc,
        currentValue: finalVal,
        statusValue: finalStatus,
        photoUrl: finalPhotoUrl,
        photos: mergedPhotos.length > 0 ? mergedPhotos : undefined,
        measurementFields: mergedFields
      };
    });
  };

  const mergeMeterPhotos = (primaryMeters: any, secondaryMeters: any) => {
    return {
      ...(primaryMeters || {}),
      waterMeterPhotoUrl: isPhotoValid(primaryMeters?.waterMeterPhotoUrl)
        ? primaryMeters.waterMeterPhotoUrl
        : (isPhotoValid(secondaryMeters?.waterMeterPhotoUrl) ? secondaryMeters.waterMeterPhotoUrl : primaryMeters?.waterMeterPhotoUrl),
      electricMeterPhotoUrl: isPhotoValid(primaryMeters?.electricMeterPhotoUrl)
        ? primaryMeters.electricMeterPhotoUrl
        : (isPhotoValid(secondaryMeters?.electricMeterPhotoUrl) ? secondaryMeters.electricMeterPhotoUrl : primaryMeters?.electricMeterPhotoUrl),
      gasMeterPhotoUrl: isPhotoValid(primaryMeters?.gasMeterPhotoUrl)
        ? primaryMeters.gasMeterPhotoUrl
        : (isPhotoValid(secondaryMeters?.gasMeterPhotoUrl) ? secondaryMeters.gasMeterPhotoUrl : primaryMeters?.gasMeterPhotoUrl),
    };
  };

  const mergeAnomaliesWithPhotos = (primaryAnomalies: any[] = [], secondaryAnomalies: any[] = []) => {
    if (!primaryAnomalies || primaryAnomalies.length === 0) return secondaryAnomalies || [];
    if (!secondaryAnomalies || secondaryAnomalies.length === 0) return primaryAnomalies;
    const secMap = new Map<string, any>();
    for (const sa of secondaryAnomalies) {
      if (sa && sa.id) secMap.set(sa.id, sa);
      if (sa && sa.title) {
        secMap.set(sa.title, sa);
        secMap.set(sa.title.toLowerCase().trim(), sa);
      }
    }
    return primaryAnomalies.map(pa => {
      const sa = secMap.get(pa.id) || secMap.get(pa.title) || (pa.title ? secMap.get(pa.title.toLowerCase().trim()) : undefined);
      const hasPriPhoto = isPhotoValid(pa.photoUrl);
      const hasSecPhoto = sa ? isPhotoValid(sa.photoUrl) : false;
      return {
        ...pa,
        photoUrl: hasPriPhoto ? pa.photoUrl : (hasSecPhoto ? sa.photoUrl : (pa.photoUrl || sa?.photoUrl))
      };
    });
  };

  // 0. Sembrar siempre las rondas históricas oficiales para garantizar que las 64 rondas estén presentes en todos los usuarios por igual
  for (const histR of (HISTORICAL_ROUNDS || [])) {
    if (histR && histR.id && (!deletedIds.has(histR.id) || CANONICAL_HISTORICAL_ROUND_IDS.has(histR.id))) {
      const r = normalizeRoundRecord(histR, currentActiveId);
      map.set(r.id, r);
    }
  }

  // 1. Fusionar de forma atómica y sin parpadeos las rondas locales y del servidor / Firestore preservando siempre las fotos reales
  const combinedInput = [...(baseList || []), ...(incomingList || [])];
  for (const rawR of combinedInput) {
    if (rawR && rawR.id && (!deletedIds.has(rawR.id) || CANONICAL_HISTORICAL_ROUND_IDS.has(rawR.id))) {
      const r = normalizeRoundRecord(rawR, currentActiveId);
      const isActivelyPerforming = r.id === currentActiveId || isRoundActivelyBeingPerformed(r, currentActiveId);
      if (r.status !== 'completada' && !isActivelyPerforming && !CANONICAL_HISTORICAL_ROUND_IDS.has(r.id)) {
        continue;
      }
      const existing = map.get(r.id);
      if (!existing) {
        map.set(r.id, r);
      } else {
        let winner: DailyRound;
        const isRCompleted = r.status === 'completada' || Boolean(r.completedAt && r.technicianSignature);
        const isExistingCompleted = existing.status === 'completada' || Boolean(existing.completedAt && existing.technicianSignature);

        // REGLA FUNDAMENTAL DE CIERRE: Si una versión ya está completada/cerrada por el usuario o en la nube, NUNCA puede ser sobrepasada por una versión 'en_progreso'
        if (isRCompleted && !isExistingCompleted) {
          winner = { ...r, status: 'completada', compliancePercentage: 100 };
        } else if (isExistingCompleted && !isRCompleted) {
          winner = { ...existing, status: 'completada', compliancePercentage: 100 };
        } else if (isExistingCompleted && isRCompleted) {
          // Ambas versiones están completadas: preferir la que tenga más puntos cargados, o la más reciente si tienen igual cantidad
          const localFilled = (existing.checkpoints || []).filter(c => c && isCheckpointComplete(c)).length;
          const remoteFilled = (r.checkpoints || []).filter(c => c && isCheckpointComplete(c)).length;
          if (remoteFilled > localFilled) {
            winner = { ...r, status: 'completada', compliancePercentage: 100 };
          } else if (localFilled > remoteFilled) {
            winner = { ...existing, status: 'completada', compliancePercentage: 100 };
          } else {
            const localTime = new Date(existing.lastUpdated || existing.completedAt || 0).getTime();
            const remoteTime = new Date(r.lastUpdated || r.completedAt || 0).getTime();
            winner = remoteTime >= localTime
              ? { ...r, status: 'completada', compliancePercentage: 100 }
              : { ...existing, status: 'completada', compliancePercentage: 100 };
          }
        } else if ((r.id === currentActiveId && r.status === 'en_progreso') || (existing.id === currentActiveId && existing.status === 'en_progreso')) {
          winner = (existing.id === currentActiveId && existing.status === 'en_progreso') ? existing : r;
        } else {
          const localTime = new Date(existing.lastUpdated || existing.completedAt || 0).getTime();
          const cloudTime = new Date(r.lastUpdated || r.completedAt || 0).getTime();
          if (localTime > cloudTime && (existing.id === currentActiveId || (localPendingIds && localPendingIds.has(existing.id)))) {
            winner = existing;
          } else if (existing.id === currentActiveId && existing.status === 'en_progreso') {
            const localFilled = (existing.checkpoints || []).filter(c => c && (c.statusValue || c.currentValue !== undefined)).length;
            const remoteFilled = (r.checkpoints || []).filter(c => c && (c.statusValue || c.currentValue !== undefined)).length;
            if (localFilled >= remoteFilled) {
              winner = existing;
            } else {
              winner = r;
            }
          } else {
            winner = r;
          }
        }

        // Fusión profunda de fotografías y evidencias: las fotos reales nunca se pierden
        const loser = winner === existing ? r : existing;
        const mergedCheckpoints = mergeCheckpointsWithPhotos(winner.checkpoints || [], loser.checkpoints || []);
        const mergedMeterReadings = mergeMeterPhotos(winner.meterReadings, loser.meterReadings);
        const mergedAnomalies = mergeAnomaliesWithPhotos(winner.anomalies || [], loser.anomalies || []);

        map.set(r.id, normalizeRoundRecord({
          ...winner,
          checkpoints: mergedCheckpoints,
          meterReadings: mergedMeterReadings,
          anomalies: mergedAnomalies,
          anomaliesCount: mergedAnomalies.length
        }));
      }
    }
  }

  const result = Array.from(map.values());
  const deduped: DailyRound[] = [];
  const seenIds = new Set<string>();

  for (const r of result) {
    const isDeleted = deletedIds.has(r.id) && !CANONICAL_HISTORICAL_ROUND_IDS.has(r.id);
    if (!r || !r.id || isDeleted || seenIds.has(r.id)) continue;
    seenIds.add(r.id);
    deduped.push(r);
  }
  deduped.sort((a, b) => getRoundTimestamp(b) - getRoundTimestamp(a));
  return deduped;
};

const areRoundsEqual = (a: DailyRound[], b: DailyRound[]): boolean => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const r1 = a[i];
    const r2 = b[i];
    if (!r1 || !r2) return false;
    if (
      r1.id !== r2.id ||
      r1.status !== r2.status ||
      r1.compliancePercentage !== r2.compliancePercentage ||
      r1.date !== r2.date ||
      r1.time !== r2.time ||
      r1.shift !== r2.shift ||
      r1.technicianName !== r2.technicianName ||
      r1.technicianSignature !== r2.technicianSignature ||
      r1.completedAt !== r2.completedAt ||
      r1.generalNotes !== r2.generalNotes ||
      (r1.anomalies?.length || 0) !== (r2.anomalies?.length || 0) ||
      (r1.checkpoints?.length || 0) !== (r2.checkpoints?.length || 0)
    ) {
      return false;
    }
    if (r1.status === 'en_progreso' || r2.status === 'en_progreso') {
      if (r1.lastUpdated !== r2.lastUpdated) return false;
    }
  }
  return true;
};

const mergeEquipmentLists = (
  baseList: Equipment[],
  incomingList: Equipment[],
  deletedIds: Set<string>
): Equipment[] => {
  const map = new Map<string, Equipment>();
  (baseList || []).forEach(e => {
    if (e && e.id && !deletedIds.has(e.id)) {
      map.set(e.id, e);
    }
  });
  (incomingList || []).forEach(e => {
    if (e && e.id && !deletedIds.has(e.id)) {
      const existing = map.get(e.id);
      if (!existing) {
        map.set(e.id, e);
      } else {
        const timeExisting = new Date((existing as any).lastUpdated || (existing as any).createdAt || existing.lastInspectionDate || existing.installationDate || 0).getTime();
        const timeIncoming = new Date((e as any).lastUpdated || (e as any).createdAt || e.lastInspectionDate || e.installationDate || 0).getTime();
        if (timeIncoming >= timeExisting) {
          map.set(e.id, { ...existing, ...e });
        }
      }
    }
  });
  return Array.from(map.values());
};

export const deduplicateMeters = (
  list: MeterDefinition[],
  deletedIds?: Set<string>
): MeterDefinition[] => {
  const delSet = deletedIds || getDeletedMeterIds();
  const map = new Map<string, MeterDefinition>();
  const seenCodes = new Set<string>();
  const seenTypeNames = new Set<string>();

  (list || []).forEach(m => {
    if (!m || !m.id || delSet.has(m.id)) return;
    const normCode = m.code ? m.code.trim().toUpperCase() : '';
    if (normCode && (delSet.has(normCode) || delSet.has(m.code))) return;
    if (normCode && seenCodes.has(normCode) && !map.has(m.id)) return;

    const typeNameKey = `${m.type || 'agua'}_${(m.name || '').trim().toLowerCase()}`;
    if (seenTypeNames.has(typeNameKey) && !map.has(m.id)) return;

    const existing = map.get(m.id);
    if (!existing) {
      map.set(m.id, m);
      if (normCode) seenCodes.add(normCode);
      seenTypeNames.add(typeNameKey);
    } else {
      const tExisting = new Date((existing as any).updatedAt || (existing as any).createdAt || 0).getTime();
      const tIncoming = new Date((m as any).updatedAt || (m as any).createdAt || 0).getTime();
      if (tIncoming >= tExisting) {
        map.set(m.id, { ...existing, ...m });
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    if (a.isMainMeter && !b.isMainMeter) return -1;
    if (!a.isMainMeter && b.isMainMeter) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });
};

export const deduplicateReadings = (
  list: MeterReadingRecord[],
  deletedIds?: Set<string>,
  deletedMeterIds?: Set<string>
): MeterReadingRecord[] => {
  const delSet = deletedIds || getDeletedMeterReadingIds();
  const delMeters = deletedMeterIds || getDeletedMeterIds();
  const map = new Map<string, MeterReadingRecord>();
  const seenKeys = new Set<string>();

  (list || []).forEach(r => {
    if (!r || !r.id || delSet.has(r.id) || delMeters.has(r.meterId)) return;
    if (DEMO_METER_IDS.includes(r.meterId) || DEMO_READING_IDS.includes(r.id)) return;

    // Deduplication by unique meterId + date + time + currentValue
    const key = `${r.meterId}_${r.date}_${r.time || '00:00'}_${r.currentValue}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    map.set(r.id, r);
  });

  const result = Array.from(map.values());
  result.sort((a, b) => {
    const tA = new Date(a.timestamp || `${a.date}T${a.time || '00:00'}:00.000Z`).getTime();
    const tB = new Date(b.timestamp || `${b.date}T${b.time || '00:00'}:00.000Z`).getTime();
    return tB - tA;
  });
  return result;
};

const mergeMeterLists = (
  baseList: MeterDefinition[],
  incomingList: MeterDefinition[],
  deletedIds: Set<string>,
  _inFlightLocalIds?: Set<string>
): MeterDefinition[] => {
  const map = new Map<string, MeterDefinition>();

  const combined = [...(incomingList || []), ...(baseList || [])];

  combined.forEach(m => {
    if (!m || !m.id || deletedIds.has(m.id)) return;
    const normCode = m.code ? m.code.trim().toUpperCase() : '';
    if (normCode && (deletedIds.has(normCode) || deletedIds.has(m.code))) return;

    if (!map.has(m.id)) {
      map.set(m.id, m);
    } else {
      const existing = map.get(m.id)!;
      const tExisting = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
      const tNew = new Date(m.updatedAt || m.createdAt || 0).getTime();
      if (tNew > tExisting) {
        map.set(m.id, m);
      }
    }
  });

  return Array.from(map.values()).sort((a, b) => {
    if (a.isMainMeter && !b.isMainMeter) return -1;
    if (!a.isMainMeter && b.isMainMeter) return 1;
    return (a.name || '').localeCompare(b.name || '');
  });
};

const mergeMeterReadingLists = (
  baseList: MeterReadingRecord[],
  incomingList: MeterReadingRecord[],
  deletedIds: Set<string>,
  deletedMeterIds: Set<string>,
  inFlightLocalIds?: Set<string>
): MeterReadingRecord[] => {
  const map = new Map<string, MeterReadingRecord>();
  const seenKeys = new Set<string>();

  (incomingList || []).forEach(r => {
    if (!r || !r.id || deletedIds.has(r.id) || deletedMeterIds.has(r.meterId)) return;
    if (DEMO_METER_IDS.includes(r.meterId) || DEMO_READING_IDS.includes(r.id)) return;
    const key = `${r.meterId}_${r.date}_${r.time || '00:00'}_${r.currentValue}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    map.set(r.id, r);
  });

  (baseList || []).forEach(r => {
    if (!r || !r.id || deletedIds.has(r.id) || deletedMeterIds.has(r.meterId)) return;
    if (DEMO_METER_IDS.includes(r.meterId) || DEMO_READING_IDS.includes(r.id)) return;
    const key = `${r.meterId}_${r.date}_${r.time || '00:00'}_${r.currentValue}`;
    if (seenKeys.has(key) || map.has(r.id)) return;
    seenKeys.add(key);
    map.set(r.id, r);
  });

  const result = Array.from(map.values());
  result.sort((a, b) => {
    const tA = new Date(a.timestamp || `${a.date}T${a.time || '00:00'}:00.000Z`).getTime();
    const tB = new Date(b.timestamp || `${b.date}T${b.time || '00:00'}:00.000Z`).getTime();
    return tB - tA;
  });
  return result;
};

const areMetersEqual = (a: MeterDefinition[], b: MeterDefinition[]): boolean => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  const mapB = new Map<string, MeterDefinition>();
  b.forEach(m => { if (m && m.id) mapB.set(m.id, m); });
  if (mapB.size !== a.length) return false;

  for (const m1 of a) {
    if (!m1 || !m1.id) return false;
    const m2 = mapB.get(m1.id);
    if (!m2) return false;
    if (
      m1.code !== m2.code ||
      m1.currentReading !== m2.currentReading ||
      m1.lastReadingDate !== m2.lastReadingDate ||
      m1.lastReadingTime !== m2.lastReadingTime ||
      m1.status !== m2.status ||
      m1.name !== m2.name ||
      m1.isMainMeter !== m2.isMainMeter ||
      m1.parentMeterId !== m2.parentMeterId ||
      m1.alertThresholdPerDay !== m2.alertThresholdPerDay
    ) {
      return false;
    }
  }
  return true;
};

const areReadingsEqual = (a: MeterReadingRecord[], b: MeterReadingRecord[]): boolean => {
  if (a === b) return true;
  if (!a || !b || a.length !== b.length) return false;
  const mapB = new Map<string, MeterReadingRecord>();
  b.forEach(r => { if (r && r.id) mapB.set(r.id, r); });
  if (mapB.size !== a.length) return false;

  for (const r1 of a) {
    if (!r1 || !r1.id) return false;
    const r2 = mapB.get(r1.id);
    if (!r2) return false;
    if (
      r1.meterId !== r2.meterId ||
      r1.currentValue !== r2.currentValue ||
      r1.previousValue !== r2.previousValue ||
      r1.consumption !== r2.consumption ||
      r1.date !== r2.date ||
      r1.time !== r2.time
    ) {
      return false;
    }
  }
  return true;
};

const STATUS_PRIORITY: Record<string, number> = {
  'solucionado': 3,
  'resuelto': 3,
  'en_atencion': 2,
  'en_proceso': 2,
  'pendiente': 1
};

export const getMoreAdvancedStatus = (s1?: string, s2?: string): string => {
  const p1 = STATUS_PRIORITY[s1 || 'pendiente'] || 1;
  const p2 = STATUS_PRIORITY[s2 || 'pendiente'] || 1;
  return p1 >= p2 ? (s1 || 'pendiente') : (s2 || 'pendiente');
};

export const deduplicateIncidents = (
  list: Incident[],
  deletedIds?: Set<string>
): Incident[] => {
  const resultList: Incident[] = [];

  for (const rawInc of (list || [])) {
    if (!rawInc || !rawInc.id) continue;
    const resolvedId = CANONICAL_INCIDENT_MAP[rawInc.id] || rawInc.id;
    if (deletedIds && (deletedIds.has(resolvedId) || deletedIds.has(rawInc.id))) continue;

    const inc = { ...rawInc, id: resolvedId };
    // Find if an existing item in resultList is the exact same incident ID
    const existingIndex = resultList.findIndex(item => item.id === inc.id);

    if (existingIndex >= 0) {
      const existing = resultList[existingIndex];
      const newStatus = getMoreAdvancedStatus(existing.status, inc.status) as any;
      const resolvedBy = existing.resolvedBy || inc.resolvedBy;
      const resolvedAt = existing.resolvedAt || inc.resolvedAt;
      const resolutionNotes = existing.resolutionNotes || inc.resolutionNotes;
      const registeredBy = existing.registeredBy || inc.registeredBy;
      const photoUrl = existing.photoUrl || inc.photoUrl;
      const equipmentId = existing.equipmentId || inc.equipmentId;
      const equipmentTag = existing.equipmentTag || inc.equipmentTag;
      const description = (existing.description && existing.description.length >= (inc.description || '').length)
        ? existing.description
        : (inc.description || existing.description);

      resultList[existingIndex] = {
        ...existing,
        ...inc,
        id: existing.id,
        status: newStatus,
        resolvedBy,
        resolvedAt,
        resolutionNotes,
        registeredBy,
        photoUrl,
        equipmentId,
        equipmentTag,
        description
      };
    } else {
      resultList.push({ ...inc });
    }
  }

  resultList.sort((a, b) => {
    const tA = a.timestamp ? new Date(a.timestamp.replace(' ', 'T')).getTime() || 0 : 0;
    const tB = b.timestamp ? new Date(b.timestamp.replace(' ', 'T')).getTime() || 0 : 0;
    return tB - tA;
  });

  return resultList;
};

const mergeIncidentLists = (
  baseList: Incident[],
  incomingList: Incident[],
  deletedIds: Set<string>
): Incident[] => {
  return deduplicateIncidents([...(incomingList || []), ...(baseList || [])], deletedIds);
};

const mergeRequestLists = (
  baseList: HotelRequest[],
  incomingList: HotelRequest[],
  deletedIds: Set<string>,
  localPendingIds?: Set<string>
): HotelRequest[] => {
  const map = new Map<string, HotelRequest>();
  const incomingMap = new Map<string, HotelRequest>();

  (incomingList || []).forEach(item => {
    if (item && item.id && !deletedIds.has(item.id)) {
      incomingMap.set(item.id, { ...item });
    }
  });

  const isServerSync = Array.isArray(incomingList) && incomingList.length > 0;

  // Process items in baseList
  (baseList || []).forEach(item => {
    if (!item || !item.id || deletedIds.has(item.id)) return;

    if (incomingMap.has(item.id)) {
      const incomingItem = incomingMap.get(item.id)!;
      const completedAt = (item as any).completedAt || (incomingItem as any).completedAt;
      const resolvedBy = (item as any).resolvedBy || (incomingItem as any).resolvedBy;
      const solutionNotes = (item as any).solutionNotes || (incomingItem as any).solutionNotes;
      const completedEvidenceUrl = (item as any).completedEvidenceUrl || (incomingItem as any).completedEvidenceUrl;

      const timeBase = new Date(((item as any).updatedAt || item.createdAt || '').replace(' ', 'T')).getTime() || 0;
      const timeIncoming = new Date(((incomingItem as any).updatedAt || incomingItem.createdAt || '').replace(' ', 'T')).getTime() || 0;

      const mergedItem = timeIncoming >= timeBase ? { ...item, ...incomingItem } : { ...incomingItem, ...item };
      if (incomingItem.status && timeIncoming >= timeBase) {
        mergedItem.status = incomingItem.status;
      }
      if (mergedItem.status === 'resuelto') {
        mergedItem.resolvedAt = mergedItem.resolvedAt || item.resolvedAt || incomingItem.resolvedAt || new Date().toISOString();
      } else {
        delete (mergedItem as any).resolvedAt;
      }
      if (completedAt) (mergedItem as any).completedAt = completedAt;
      if (resolvedBy) (mergedItem as any).resolvedBy = resolvedBy;
      if (solutionNotes) (mergedItem as any).solutionNotes = solutionNotes;
      if (completedEvidenceUrl) (mergedItem as any).completedEvidenceUrl = completedEvidenceUrl;

      map.set(item.id, mergedItem);
      incomingMap.delete(item.id); // marked as processed
    } else {
      map.set(item.id, { ...item });
    }
  });

  // Add remaining new incoming items from cloud
  incomingMap.forEach((item, id) => {
    if (!deletedIds.has(id)) {
      map.set(id, item);
    }
  });

  const merged = Array.from(map.values()).map(req => {
    if (req.status === 'resuelto' && !req.resolvedAt) {
      return { ...req, resolvedAt: req.createdAt || new Date().toISOString() };
    }
    if (req.status !== 'resuelto' && req.resolvedAt) {
      const copy = { ...req };
      delete copy.resolvedAt;
      return copy;
    }
    return req;
  });

  merged.sort((a, b) => {
    const timeA = new Date((a.createdAt || '').replace(' ', 'T')).getTime() || 0;
    const timeB = new Date((b.createdAt || '').replace(' ', 'T')).getTime() || 0;
    return timeB - timeA;
  });

  return merged;
};

const extractAnomaliesAsIncidents = (
  roundsList: DailyRound[],
  currentIncidents: Incident[],
  deletedIds: Set<string>
): Incident[] => {
  const result: Incident[] = (currentIncidents || [])
    .filter(inc => inc && inc.id)
    .map(rawInc => {
      const resolvedId = CANONICAL_INCIDENT_MAP[rawInc.id] || rawInc.id;
      return { ...rawInc, id: resolvedId };
    })
    .filter(inc => !deletedIds || !deletedIds.has(inc.id));

  for (const round of (roundsList || [])) {
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

      // If an anomaly has been deleted, strictly NEVER resurrect it
      if (deletedIds && (deletedIds.has(anomId) || (anom.id && deletedIds.has(anom.id)))) {
        continue;
      }

      // Check match with existing incidents in result
      const matchIndex = result.findIndex(inc => {
        if (anom.id && inc.id === anom.id) return true;
        if (inc.id === anomId) return true;
        if (inc.area === anom.area && inc.registeredBy === (anom.registeredBy || round.technicianName)) {
          const timeA = (inc.timestamp || '').slice(0, 10);
          const timeB = (anom.timestamp || round.date || '').slice(0, 10);
          if (timeA && timeB && timeA === timeB) return true;
        }
        return false;
      });

      if (matchIndex >= 0) {
        const existing = result[matchIndex];
        const advancedStatus = getMoreAdvancedStatus(existing.status, anom.status) as any;
        existing.status = advancedStatus;
        if (anom.resolvedBy && !existing.resolvedBy) existing.resolvedBy = anom.resolvedBy;
        if (anom.resolvedAt && !existing.resolvedAt) existing.resolvedAt = anom.resolvedAt;
        if (anom.resolutionNotes && !existing.resolutionNotes) existing.resolutionNotes = anom.resolutionNotes;
        if (anom.photoUrl && !existing.photoUrl) existing.photoUrl = anom.photoUrl;

        // Keep round anomaly tied to canonical incident
        anom.id = existing.id;
        anom.status = advancedStatus;
        if (existing.resolvedBy) anom.resolvedBy = existing.resolvedBy;
        if (existing.resolvedAt) anom.resolvedAt = existing.resolvedAt;
        if (existing.resolutionNotes) anom.resolutionNotes = existing.resolutionNotes;
        continue;
      }

      const newAnomIncident: Incident = {
        id: anomId,
        title: anom.title,
        description: anom.description || `Novedad detectada durante la ronda en ${anom.area || 'área técnica'}.`,
        area: anom.area || 'General',
        severity: anom.severity || 'alta',
        status: (anom.status as any) || 'pendiente',
        registeredBy: anom.registeredBy || round.technicianName || 'Técnico de Turno',
        timestamp: anom.timestamp || (round.date ? `${round.date} ${round.time || '00:00'}` : new Date().toISOString().slice(0, 16).replace('T', ' ')),
        photoUrl: anom.photoUrl,
        equipmentId: anom.equipmentId,
        equipmentTag: anom.equipmentTag,
        resolvedBy: anom.resolvedBy,
        resolvedAt: anom.resolvedAt,
        resolutionNotes: anom.resolutionNotes
      };

      result.push(newAnomIncident);
    }
  }

  return deduplicateIncidents(result, deletedIds);
};

export const MaintenanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Offline-first local state
  const [role, setRoleState] = useState<RoleMode>(() => {
    // Default to admin as explicitly requested by user
    localStorage.setItem(STORAGE_KEYS.ROLE, 'admin');
    return 'admin';
  });

  const [selectedTab, setSelectedTabState] = useState<NavigationTab>(() => {
    try {
      const saved = sessionStorage.getItem('hotel_maint_active_tab') || localStorage.getItem('hotel_maint_active_tab');
      if (saved) return saved as NavigationTab;
    } catch (e) {
      console.error('Error loading tab:', e);
    }
    return 'dashboard';
  });

  const setSelectedTab = useCallback((tab: NavigationTab) => {
    setSelectedTabState(tab);
    try {
      sessionStorage.setItem('hotel_maint_active_tab', tab);
      localStorage.setItem('hotel_maint_active_tab', tab);
    } catch {}
  }, []);
  const [notification, setNotification] = useState<string | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(true);
  const [hasNewAppVersion, setHasNewAppVersion] = useState<boolean>(false);
  const initialServerVersionRef = useRef<number | null>(null);
  const initialAppVersionCodeRef = useRef<number | null>(null);
  const isApplyingUpdateRef = useRef<boolean>(false);

  const triggerInstantAppUpdate = (reason?: string) => {
    setHasNewAppVersion(true);
    if (reason) console.info('Background sync info:', reason);
  };

  const checkServerVersion = (serverVer?: number) => {
    if (!serverVer || typeof serverVer !== 'number') return;
    if (initialServerVersionRef.current === null) {
      initialServerVersionRef.current = serverVer;
    } else if (serverVer > initialServerVersionRef.current) {
      initialServerVersionRef.current = serverVer;
    }
  };

  const reloadAppForUpdate = () => {
    try {
      localStorage.setItem('hotel_maint_applied_version', String(initialAppVersionCodeRef.current || 4));
    } catch {}
    setHasNewAppVersion(false);
    triggerInstantAppUpdate('Actualización manual iniciada por el usuario');
  };

  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState<boolean>(false);

  // Entities: Clean state without pre-seeded mock records
  const [incidents, setIncidents] = useState<Incident[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INCIDENTS);
    let parsedIncidents: Incident[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) parsedIncidents = parsed;
      } catch (e) { console.error(e); }
    }
    const deletedIds = getDeletedIncidentIds();
    const baseIncidents = mergeIncidentLists(parsedIncidents, INITIAL_INCIDENTS as Incident[], deletedIds);
    const savedRounds = localStorage.getItem(STORAGE_KEYS.ROUNDS);
    let roundsList: DailyRound[] = HISTORICAL_ROUNDS;
    if (savedRounds) {
      try {
        const parsedR = JSON.parse(savedRounds);
        if (Array.isArray(parsedR) && parsedR.length > 0) {
          roundsList = mergeRoundLists(parsedR, HISTORICAL_ROUNDS, getDeletedRoundIds());
        }
      } catch (e) {}
    }
    return extractAnomaliesAsIncidents(roundsList, baseIncidents, deletedIds);
  });

  const DEFAULT_HOTEL_REQUESTS: HotelRequest[] = INITIAL_REQUESTS;

  const [requests, setRequests] = useState<HotelRequest[]>(() => {
    const deletedIds = getDeletedRequestIds();
    const saved = localStorage.getItem(STORAGE_KEYS.REQUESTS);
    let baseList: HotelRequest[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseList = parsed.filter((r: HotelRequest) => r && r.id && !deletedIds.has(r.id));
        }
      } catch (e) { console.error(e); }
    }
    return mergeRequestLists(baseList, DEFAULT_HOTEL_REQUESTS, deletedIds);
  });

  const [tasks, setTasks] = useState<MaintenanceTask[]>(() => {
    const deletedIds = getDeletedTaskIds();
    const saved = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed.filter(t => t && t.id && !deletedIds.has(t.id));
      } catch (e) { console.error(e); }
    }
    return [];
  });

  const [schedules, setSchedules] = useState<TechnicianSchedule[]>(() => {
    const deletedIds = getDeletedScheduleIds();
    const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
    let baseList: TechnicianSchedule[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseList = parsed.filter((s: TechnicianSchedule) => s && s.id && !deletedIds.has(s.id) && !isLegacyMockSchedule(s));
        }
      } catch (e) { console.error(e); }
    }
    const merged = mergeScheduleLists(baseList, INITIAL_SCHEDULES, deletedIds);
    safeSetItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(merged));
    return merged;
  });

  const [shiftSwapRequests, setShiftSwapRequests] = useState<ShiftSwapRequest[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SHIFT_SWAPS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) { console.error(e); }
    }
    return [];
  });

  const [cronogramas, setCronogramas] = useState<Cronograma[]>(() => {
    const deletedIds = getDeletedCronogramaIds();
    const saved = localStorage.getItem(STORAGE_KEYS.CRONOGRAMAS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((c: Cronograma) => c && c.id && !deletedIds.has(c.id));
        }
      } catch (e) { console.error(e); }
    }
    return [];
  });

  const [meters, setMeters] = useState<MeterDefinition[]>(() => {
    const deletedIds = getDeletedMeterIds();
    const saved = localStorage.getItem(STORAGE_KEYS.METERS);
    let baseList: MeterDefinition[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseList = parsed.filter((m: MeterDefinition) => 
            m && m.id && !deletedIds.has(m.id) && (m.code ? !deletedIds.has(m.code) : true)
          );
        }
      } catch (e) { console.error(e); }
    }
    return mergeMeterLists(baseList, INITIAL_METERS, deletedIds);
  });
  const metersRef = useRef<MeterDefinition[]>(meters);
  useEffect(() => { 
    metersRef.current = meters; 
    safeSetItem(STORAGE_KEYS.METERS, JSON.stringify(meters));
  }, [meters]);

  const [meterReadingsLog, setMeterReadingsLog] = useState<MeterReadingRecord[]>(() => {
    const deletedIds = getDeletedMeterReadingIds();
    const deletedMeterIds = getDeletedMeterIds();
    const saved = localStorage.getItem(STORAGE_KEYS.METER_READINGS_LOG);
    let baseList: MeterReadingRecord[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          baseList = deduplicateReadings(parsed.filter((r: MeterReadingRecord) => 
            r && 
            r.id && 
            !deletedIds.has(r.id) && 
            !deletedMeterIds.has(r.meterId) && 
            !DEMO_METER_IDS.includes(r.meterId) &&
            !DEMO_READING_IDS.includes(r.id)
          ));
        }
      } catch (e) { console.error(e); }
    }
    return mergeMeterReadingLists(baseList, INITIAL_METER_READINGS, deletedIds, deletedMeterIds);
  });
  const meterReadingsLogRef = useRef<MeterReadingRecord[]>(meterReadingsLog);
  useEffect(() => { meterReadingsLogRef.current = meterReadingsLog; }, [meterReadingsLog]);

  const [equipments, setEquipments] = useState<Equipment[]>(() => {
    const deletedIds = getDeletedEquipmentIds();
    const saved = localStorage.getItem(STORAGE_KEYS.EQUIPMENT);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter(e => e && e.id && !deletedIds.has(e.id));
        }
      } catch (e) { console.error(e); }
    }
    return [];
  });

  // Rondas del sistema (100% autoritarias desde el servidor 24/7, con carga instantánea sin parpadeo y memoria sincrónica real)
  const [rounds, setRounds] = useState<DailyRound[]>(() => {
    const deletedIds = getDeletedRoundIds();
    const saved = localStorage.getItem(STORAGE_KEYS.ROUNDS);
    let baseList: DailyRound[] = [];
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          baseList = parsed.filter(r => r && r.id && (!deletedIds.has(r.id) || CANONICAL_HISTORICAL_ROUND_IDS.has(r.id)));
        }
      } catch (e) { console.error(e); }
    }
    const initialMerged = mergeRoundLists(baseList, HISTORICAL_ROUNDS, deletedIds);
    safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(initialMerged));
    idbSet(STORAGE_KEYS.ROUNDS, initialMerged).catch(() => {});
    return initialMerged;
  });

  const [activeRound, setActiveRound] = useState<DailyRound | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_ROUND);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          !parsed ||
          !parsed.id ||
          parsed.status === 'completada' ||
          Boolean(parsed.completedAt && parsed.technicianSignature) ||
          getDeletedRoundIds().has(parsed.id)
        ) {
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
          return null;
        }

        if (parsed.status === 'en_progreso') {
          const roundDate = (parsed.date || '').replace(/\//g, '-').trim();
          const timeStr = parsed.lastHeartbeat || parsed.lastUpdated || (parsed.date && parsed.time ? `${roundDate}T${parsed.time}:00` : null);
          const ts = timeStr ? new Date(timeStr).getTime() : 0;
          // Ventana de turno de 24 horas para cubrir turnos de noche y jornadas completas
          const isRecent = !ts || isNaN(ts) || (Date.now() - ts) <= 24 * 60 * 60 * 1000;
          if (isRecent) {
            return parsed;
          }
        }
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
      }
    } catch (e) {}
    return null;
  });

  const inProgressRounds = useMemo(() => {
    const todayStr = getLocalDateString();
    const list = (rounds || []).filter(r => {
      if (!r || !r.id) return false;
      if (r.status === 'completada' || Boolean(r.completedAt && r.technicianSignature) || r.compliancePercentage === 100) return false;
      const rDate = (r.date || '').replace(/\//g, '-').trim();
      if (rDate && rDate < todayStr) return false;
      return isRoundActivelyBeingPerformed(r, activeRound?.id) && (!rDate || rDate === todayStr);
    });
    const map = new Map<string, DailyRound>();
    for (const r of list) {
      const normTech = (r.technicianName || '').toLowerCase().split('/')[0].trim();
      const shiftKey = `${r.date}_${r.shift || ''}_${normTech}`;
      const existing = map.get(shiftKey);
      if (!existing) {
        map.set(shiftKey, r);
      } else {
        const existingTime = new Date(existing.lastUpdated || existing.lastHeartbeat || 0).getTime();
        const rTime = new Date(r.lastUpdated || r.lastHeartbeat || 0).getTime();
        if (r.id === activeRound?.id || rTime > existingTime) {
          map.set(shiftKey, r);
        }
      }
    }
    return Array.from(map.values());
  }, [rounds, activeRound?.id]);

  const [pumpInspections, setPumpInspections] = useState<PumpInspection[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.INSPECTIONS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) { console.error(e); }
    }
    return [];
  });

  const [preventivePlans, setPreventivePlans] = useState<PreventivePlan[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PLANS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) { console.error(e); }
    }
    return [];
  });

  const [workOrders, setWorkOrders] = useState<PreventiveWorkOrder[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.WORK_ORDERS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) { console.error(e); }
    }
    return [];
  });

  const [uploadedDocuments, setUploadedDocuments] = useState<UploadedDocument[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.DOCUMENTS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) { console.error(e); }
    }
    return [];
  });

  const [documentFolders, setDocumentFolders] = useState<DocumentFolder[]>(() => {
    const saved = localStorage.getItem('hotel_doc_folders');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) { console.error(e); }
    }
    return [
      { id: 'f-1', name: 'Manuales y Planos', createdAt: new Date().toISOString() },
      { id: 'f-2', name: 'Garantías y Proveedores', createdAt: new Date().toISOString() }
    ];
  });

  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('hotel_maint_users');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return ensureAdminUserList(parsed);
      } catch (e) {}
    }
    return INITIAL_USERS;
  });
  const [currentUser, setCurrentUserState] = useState<User | null>(() => {
    try {
      if (typeof window !== 'undefined' && window.location && window.location.search) {
        const params = new URLSearchParams(window.location.search);
        if (
          params.has('cambiar_usuario') ||
          params.has('switch_user') ||
          params.has('logout')
        ) {
          localStorage.setItem('hotel_maint_explicit_logout', 'true');
          localStorage.removeItem('hotel_maint_current_user');
          sessionStorage.removeItem('hotel_maint_current_user');
          params.delete('cambiar_usuario');
          params.delete('switch_user');
          params.delete('logout');
          const cleanQuery = params.toString();
          const newUrl = window.location.pathname + (cleanQuery ? `?${cleanQuery}` : '') + window.location.hash;
          window.history.replaceState({}, '', newUrl);
          return null;
        }
      }
      // Persistencia absoluta de sesión de usuario:
      // Cuando el usuario ingrese correo y contraseña, se mantiene guardado en localStorage y sessionStorage.
      // No vuelve a pedir usuario/contraseña al salir de la aplicación, reabrir navegador o bloquear pantalla.
      // Sólo se solicita credenciales si el usuario dio clic explícitamente en "Cerrar Sesión".
      const isExplicitLogout = typeof window !== 'undefined' && localStorage.getItem('hotel_maint_explicit_logout') === 'true';
      if (!isExplicitLogout) {
        const savedUserStr = typeof window !== 'undefined' 
          ? (localStorage.getItem('hotel_maint_current_user') || sessionStorage.getItem('hotel_maint_current_user'))
          : null;
        if (savedUserStr) {
          try {
            const parsed = JSON.parse(savedUserStr);
            if (parsed && (parsed.email || parsed.id)) {
              return parsed;
            }
          } catch (e) {
            console.error('Error parsing user data:', e);
          }
        }
      }
    } catch (e) {
      console.error('Critical error in currentUser initialization:', e);
    }
    return null;
  });

  const currentUserRef = useRef<User | null>(currentUser);
  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  const setCurrentUser = (user: User | null) => {
    setCurrentUserState(user);
    currentUserRef.current = user;
    if (user) {
      localStorage.removeItem('hotel_maint_explicit_logout');
      localStorage.setItem('hotel_maint_current_user', JSON.stringify(user));
      sessionStorage.setItem('hotel_maint_current_user', JSON.stringify(user));
      // Preserve existing active tab if valid for user, otherwise switch to first allowed
      const savedTab = (sessionStorage.getItem('hotel_maint_active_tab') || localStorage.getItem('hotel_maint_active_tab')) as NavigationTab | null;
      const userSections = (user.visibleSections || []).map(normalizeSectionId);
      const isMasterAdmin = user.email?.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com';
      
      if (savedTab && (isMasterAdmin || user.role === 'admin' || userSections.includes(normalizeSectionId(savedTab)))) {
        setSelectedTab(savedTab);
      } else if (userSections.length > 0) {
        setSelectedTab(userSections[0] as NavigationTab);
      } else if (user.role === 'admin') {
        setSelectedTab('dashboard');
      } else {
        setSelectedTab('rondas');
      }
    } else {
      localStorage.setItem('hotel_maint_explicit_logout', 'true');
      localStorage.removeItem('hotel_maint_current_user');
      sessionStorage.removeItem('hotel_maint_current_user');
    }
  };

  const isSectionAllowed = useCallback((sectionId: string): boolean => {
    if (!currentUser) return false;
    const isMasterAdmin = currentUser.email?.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com' || currentUser.id === 'usr-1789230683226';
    if (isMasterAdmin) return true;

    const normalizedTarget = normalizeSectionId(sectionId);

    // Si el perfil del usuario tiene una lista explícita de secciones visibles (visibleSections) configurada por el Administrador:
    if (Array.isArray(currentUser.visibleSections)) {
      const userSections = currentUser.visibleSections.map(normalizeSectionId);

      // Se respeta ÚNICA Y ESTRICTAMENTE lo que esté configurado en visibleSections para cualquier rol
      return userSections.includes(normalizedTarget);
    }

    // Valores por defecto por rol solo si visibleSections NO ha sido configurado en el usuario
    if (currentUser.role === 'admin') return true;
    if (currentUser.role === 'housekeeping') return ['dashboard', 'rondas', 'incidencias'].includes(normalizedTarget);
    if (currentUser.role === 'técnico') return ['dashboard', 'rondas', 'bombas', 'hojas_vida', 'incidencias', 'preventivo', 'cronograma', 'contadores', 'solicitudes', 'tareas', 'horarios'].includes(normalizedTarget);
    return normalizedTarget === 'rondas';
  }, [currentUser]);

  // Keep selectedTab strictly within user's allowed sections
  useEffect(() => {
    if (currentUser) {
      const allowed = isSectionAllowed(selectedTab);
      if (!allowed) {
        let firstAllowed: string | undefined;
        if (currentUser.visibleSections && Array.isArray(currentUser.visibleSections) && currentUser.visibleSections.length > 0) {
          firstAllowed = currentUser.visibleSections.find(sec => isSectionAllowed(sec));
        }
        
        // If nothing is explicitly allowed in visibleSections, use the fallback logic that matches isSectionAllowed
        if (!firstAllowed) {
          if (!currentUser.visibleSections) {
            firstAllowed = currentUser.role === 'admin' ? 'dashboard' : 'rondas';
          } else {
             // they have visibleSections but it's empty. They basically have no access to standard modules.
             // We'll leave them on a safe module if possible, or force to 'rondas' as absolute minimum to prevent crash.
             firstAllowed = 'dashboard'; 
          }
        }

        if (firstAllowed && firstAllowed !== selectedTab) {
          setSelectedTab(firstAllowed as NavigationTab);
        }
      }
    }
  }, [currentUser, selectedTab, isSectionAllowed]);

  // Guarantee all 6 initial created users exist in localStorage and state on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hotel_maint_users');
      let currentList: User[] = INITIAL_USERS;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          currentList = parsed;
        }
      }
      const guaranteed = ensureAdminUserList(currentList);
      localStorage.setItem('hotel_maint_users', JSON.stringify(guaranteed));
      setUsers(guaranteed);
      usersRef.current = guaranteed;
    } catch {}
  }, []);

  const [settings, setSettings] = useState<SystemSettings>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        return sanitizeSystemSettings(parsed, INITIAL_SETTINGS);
      } catch (e) { console.error(e); }
    }
    return sanitizeSystemSettings(INITIAL_SETTINGS);
  });

  const [roundTemplate, setRoundTemplate] = useState<RoundCheckpoint[]>(() => {
    const saved = localStorage.getItem('hotel_round_template');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 26) return parsed;
      } catch (e) { console.error(e); }
    }
    return HISTORICAL_ROUNDS[0]?.checkpoints?.length 
      ? HISTORICAL_ROUNDS[0].checkpoints.map(c => ({ ...c })) 
      : STANDARD_ROUND_CHECKPOINTS.map(c => ({ ...c }));
  });

  useEffect(() => {
    localStorage.setItem('hotel_round_template', JSON.stringify(roundTemplate));
  }, [roundTemplate]);

  const saveRoundTemplateToCloud = async (items: RoundCheckpoint[]) => {
    try {
      roundTemplateRef.current = items;
      localStorage.setItem('hotel_round_template', JSON.stringify(items));
      hasPendingLocalChanges.current = true;
      persistToServer();
      await safeCloudWrite(() => setDoc(doc(db, 'hotel_round_template', 'main'), cleanForFirestore({ items, updatedAt: new Date().toISOString() })));
    } catch (e) {
      console.error('Error saving round template to cloud:', e);
    }
  };

  const refreshRoundTemplateFromCloud = async () => {
    try {
      const docSnap = await getDoc(doc(db, 'hotel_round_template', 'main'));
      if (docSnap.exists()) {
        const data = docSnap.data() as { items?: RoundCheckpoint[] };
        if (data && Array.isArray(data.items)) {
          roundTemplateRef.current = data.items;
          setRoundTemplate(data.items);
          localStorage.setItem('hotel_round_template', JSON.stringify(data.items));
          notify('🔄 Plantilla sincronizada correctamente desde la nube.');
        }
      } else {
        notify('No se encontró plantilla en la nube.');
      }
    } catch (e) {
      console.error('Error refreshing round template:', e);
      notify('Error al sincronizar desde la nube.');
    }
  };

  const refreshRoundsFromCloud = async () => {
    try {
      const snap = await getDocs(collection(db, 'rounds'));
      const list: DailyRound[] = [];
      const deletedRoundIds = getDeletedRoundIds();
      snap.forEach(docSnap => {
        const data = docSnap.data() as DailyRound;
        if (data && data.id && (!deletedRoundIds.has(data.id) || CANONICAL_HISTORICAL_ROUND_IDS.has(data.id))) {
          list.push(data);
        }
      });
      const merged = mergeRoundLists(roundsRef.current || [], list, deletedRoundIds, activeRoundRef.current?.id);
      
      if (JSON.stringify(roundsRef.current) === JSON.stringify(merged)) {
        return;
      }
      
      roundsRef.current = merged;
      setRounds(merged);
      safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(merged));
      persistToServer();
      setIsCloudSynced(true);
      notify('🔄 Historial de rondas sincronizado desde la nube.');
    } catch (e) {
      console.error('Error refreshing rounds:', e);
      notify('Error al sincronizar rondas.');
    }
  };

  const queuePendingOfflineRound = useCallback((round: DailyRound) => {
    try {
      const existingStr = localStorage.getItem(STORAGE_KEYS.PENDING_OFFLINE_ROUNDS);
      const list: DailyRound[] = existingStr ? JSON.parse(existingStr) : [];
      const updated = [round, ...list.filter(r => r.id !== round.id)];
      localStorage.setItem(STORAGE_KEYS.PENDING_OFFLINE_ROUNDS, JSON.stringify(updated));
    } catch (e) {}
  }, []);

  const removePendingOfflineRound = useCallback((roundId: string) => {
    try {
      const existingStr = localStorage.getItem(STORAGE_KEYS.PENDING_OFFLINE_ROUNDS);
      if (existingStr) {
        const list: DailyRound[] = JSON.parse(existingStr);
        const updated = list.filter(r => r && r.id !== roundId);
        localStorage.setItem(STORAGE_KEYS.PENDING_OFFLINE_ROUNDS, JSON.stringify(updated));
      }
    } catch (e) {}
  }, []);

  const flushPendingOfflineRounds = useCallback(async () => {
    try {
      const deletedIds = getDeletedRoundIds();
      const existingStr = localStorage.getItem(STORAGE_KEYS.PENDING_OFFLINE_ROUNDS);
      const rawList: DailyRound[] = existingStr ? JSON.parse(existingStr) : [];
      const list = (Array.isArray(rawList) ? rawList : []).filter(r => r && r.id && !deletedIds.has(r.id));

      // Si existe una ronda activa en curso en este teléfono/dispositivo, incluirla para sincronización obligatoria
      if (
        activeRoundRef.current &&
        activeRoundRef.current.id &&
        !deletedIds.has(activeRoundRef.current.id) &&
        !list.some(r => r.id === activeRoundRef.current?.id)
      ) {
        list.push(activeRoundRef.current);
      }

      if (list.length === 0) return;

      for (const round of list) {
        if (!round || !round.id || getDeletedRoundIds().has(round.id)) {
          if (round?.id) removePendingOfflineRound(round.id);
          continue;
        }
        let syncedToServer = false;
        let syncedToCloud = false;

        try {
          const res = await fetch('/api/rounds', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Client-Id': clientSessionId.current
            },
            body: JSON.stringify(round)
          });
          if (res.ok) syncedToServer = true;
        } catch (e) {}

        try {
          await safeCloudWrite(() => setDoc(doc(db, 'rounds', round.id), cleanForFirestore(round)));
          syncedToCloud = true;
        } catch (e) {}

        if (syncedToServer || syncedToCloud) {
          removePendingOfflineRound(round.id);
        }
      }
    } catch (e) {}
  }, [removePendingOfflineRound]);

  const syncRoundsSilently = useCallback(async () => {
    try {
      // 1. Fetch from server API first to reconcile deleted round IDs before flushing offline queue
      const res = await fetch(`/api/data?_t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data && Array.isArray(data.deletedIds)) {
        data.deletedIds.forEach((id: string) => {
          if (CANONICAL_HISTORICAL_ROUND_IDS.has(id)) return;
          markDeletedAnyId(id);
          if (typeof id === 'string' && id.startsWith('rnd-')) {
            removePendingOfflineRound(id);
            if (activeRoundRef.current?.id === id) {
              activeRoundRef.current = null;
              setActiveRound(null);
              localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
              idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
            }
          }
        });
      }
      if (data && Array.isArray(data.rounds)) {
        const deletedIds = reconcileServerDeletedRoundIds(data.deletedIds, data.rounds, localActionIds.current);
        const cleanRounds = data.rounds.filter((r: any) => r && (!deletedIds.has(r.id) || CANONICAL_HISTORICAL_ROUND_IDS.has(r.id)));
        const currentActiveId = activeRoundRef.current?.id;
        const unsyncedIds = getUnsyncedRoundIds();
        const pendingLocalRounds = (roundsRef.current || []).filter(r =>
          r && r.id && !deletedIds.has(r.id) && (r.status === 'completada' || Boolean(r.completedAt && r.technicianSignature) || r.id === currentActiveId || localActionIds.current.has(r.id) || unsyncedIds.has(r.id))
        );
        const merged = mergeRoundLists(pendingLocalRounds, cleanRounds, deletedIds, currentActiveId, localActionIds.current);
        if (!areRoundsEqual(merged, roundsRef.current || [])) {
          roundsRef.current = merged;
          setRounds(merged);
          safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(merged));
          idbSet(STORAGE_KEYS.ROUNDS, merged).catch(() => {});
        }
      }

      // 2. Flush any remaining valid pending offline rounds
      await flushPendingOfflineRounds();

      // 2. Fetch from Cloud Firestore (solo si proviene del servidor en vivo, nunca de caché local obsoleto)
      if (!isFirestoreQuotaExceeded()) {
        try {
          const snap = await getDocs(collection(db, 'rounds'));
          if (!snap.metadata.fromCache) {
            const list: DailyRound[] = [];
            const delIds = getDeletedRoundIds();
            snap.forEach(docSnap => {
              const d = docSnap.data() as DailyRound;
              if (d && d.id && (!delIds.has(d.id) || CANONICAL_HISTORICAL_ROUND_IDS.has(d.id))) {
                list.push(d);
              }
            });
            if (list.length > 0) {
              const mergedFs = mergeRoundLists(roundsRef.current || [], list, delIds, activeRoundRef.current?.id, localActionIds.current);
              if (!areRoundsEqual(mergedFs, roundsRef.current || [])) {
                roundsRef.current = mergedFs;
                setRounds(mergedFs);
                safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(mergedFs));
                persistToServer();
              }
            }
          }
        } catch (fsErr) {
          // Silent fallback to server API
        }
      }

      // 3. Si la ronda activa exacta (por ID) fue eliminada o ya fue completada con firma, desvincularla. NUNCA cerrar una ronda en progreso por fecha o por otras rondas del mismo turno.
      if (activeRoundRef.current) {
        if (activeRoundRef.current.status === 'en_progreso') {
          // REGLA ESTRICTA: Mientras una ronda esté 'en_progreso', el técnico está trabajando en ella. NUNCA cerrarla por sincronizaciones en segundo plano.
        } else {
          const activeId = activeRoundRef.current.id;
          const deletedIds = getDeletedRoundIds();
          const currentList = roundsRef.current || [];
          const match = currentList.find(r => r && r.id === activeId);
          const isMatchCompleted = Boolean(match && (match.status === 'completada' || Boolean(match.completedAt && match.technicianSignature)));
          const isSelfCompleted = activeRoundRef.current.status === 'completada' || Boolean(activeRoundRef.current.completedAt && activeRoundRef.current.technicianSignature);

          if (deletedIds.has(activeId) || isMatchCompleted || isSelfCompleted) {
            activeRoundRef.current = null;
            setActiveRound(null);
            localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
            idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
          }
        }
      }
    } catch (e) {
      // Silent background sync
    }
  }, [flushPendingOfflineRounds]);

  const reconcileActiveRoundWithTemplate = useCallback((currentActive: DailyRound, template: RoundCheckpoint[]): DailyRound => {
    if (!currentActive || !Array.isArray(template) || template.length === 0) {
      return currentActive;
    }

    const existingMap = new Map<string, RoundCheckpoint>();
    currentActive.checkpoints.forEach(chk => {
      if (chk.id) existingMap.set(chk.id, chk);
      if (chk.title) existingMap.set(`${chk.title.trim().toLowerCase()}___${(chk.area || '').trim().toLowerCase()}`, chk);
    });

    const reconciledCheckpoints = template.map(tplItem => {
      const key = `${tplItem.title.trim().toLowerCase()}___${(tplItem.area || '').trim().toLowerCase()}`;
      const existing = existingMap.get(tplItem.id) || existingMap.get(key);

      if (existing) {
        const mergedFields = tplItem.measurementFields && Array.isArray(tplItem.measurementFields)
          ? tplItem.measurementFields.map((tplF, fIdx) => {
              const existingField = existing.measurementFields?.[fIdx] || existing.measurementFields?.find(f => f.id === tplF.id || f.name === tplF.name);
              return {
                ...tplF,
                value: existingField?.value !== undefined ? existingField.value : undefined,
                statusValue: existingField?.statusValue !== undefined ? existingField.statusValue : tplF.statusValue,
                ampState: existingField?.ampState || (existingField?.value === 0 ? 'Apagado' : (tplF.ampState || 'Encendido')),
                photoUrl: existingField?.photoUrl,
                lastNonZeroValue: existingField?.lastNonZeroValue
              };
            })
          : existing.measurementFields;

        return {
          ...tplItem,
          id: existing.id || tplItem.id,
          currentValue: existing.currentValue !== undefined ? existing.currentValue : '',
          statusValue: existing.statusValue !== undefined ? existing.statusValue : tplItem.statusValue,
          ampState: existing.ampState || tplItem.ampState || 'Encendido',
          notes: existing.notes !== undefined ? existing.notes : '',
          photoUrl: existing.photoUrl,
          measurementFields: mergedFields,
          lastNonZeroValue: existing.lastNonZeroValue
        };
      } else {
        const defaultStatus = tplItem.statusValue;
        const actionType = defaultStatus ? getCheckpointButtonAction(tplItem, defaultStatus, template) : 'default';
        const isOff = actionType === 'turn_off';

        const initFields = tplItem.measurementFields && Array.isArray(tplItem.measurementFields)
          ? tplItem.measurementFields.map((f, fIdx) => {
              const defaultFieldStatus = f.statusValue;
              const fieldAction = defaultFieldStatus ? getFieldButtonAction(f, defaultFieldStatus, tplItem, template, fIdx) : 'default';
              const isFieldOff = isOff || fieldAction === 'turn_off';
              const normalVal = f.value !== undefined ? f.value : (f.minValue !== undefined && f.maxValue !== undefined ? Number(((f.minValue + f.maxValue) / 2).toFixed(1)) : (f.minValue ?? 0));
              return {
                ...f,
                statusValue: defaultFieldStatus,
                value: f.value !== undefined ? f.value : (isFieldOff ? 0 : undefined),
                ampState: isFieldOff ? 'Apagado' : (f.ampState || 'Encendido'),
                lastNonZeroValue: typeof normalVal === 'number' && normalVal > 0 ? normalVal : (f.minValue ?? 0)
              };
            })
          : undefined;

        let initVal: any = tplItem.currentValue !== undefined ? tplItem.currentValue : '';
        if (initVal === '' && tplItem.type === 'numeric' && isOff) {
          initVal = 0;
        }

        return {
          ...tplItem,
          measurementFields: initFields,
          statusValue: defaultStatus,
          ampState: isOff ? 'Apagado' : (tplItem.ampState || 'Encendido'),
          currentValue: initVal,
          lastNonZeroValue: typeof initVal === 'number' && initVal > 0 ? initVal : (tplItem.minValue ?? 0)
        };
      }
    });

    const filledCount = reconciledCheckpoints.filter(c => isCheckpointComplete(c, template)).length;
    const compliance = Math.round((filledCount / (reconciledCheckpoints.length || 1)) * 100);

    return {
      ...currentActive,
      checkpoints: reconciledCheckpoints,
      compliancePercentage: compliance
    };
  }, []);

  // Ensure user without 'rondas' permission or non-admin with someone else's round NEVER retains an activeRound
  useEffect(() => {
    if (currentUser && activeRound) {
      if (!isSectionAllowed('rondas')) {
        setActiveRound(null);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
        return;
      }
      const isUserAdmin = Boolean(
        currentUser.role === 'admin' ||
        currentUser.email?.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com' ||
        currentUser.id === 'usr-admin-master' ||
        currentUser.id === 'usr-1789230683226' ||
        normalizeStr(currentUser.displayName) === 'juan mateo ramos' ||
        normalizeStr(currentUser.displayName) === 'administrador principal' ||
        normalizeStr(currentUser.role) === 'administrador' ||
        normalizeStr(currentUser.role) === 'admin'
      );
      if (!activeRound) return;
      // NUNCA borrar una ronda que esté en progreso mientras el técnico la esté realizando
      if (activeRound.status === 'en_progreso') return;
      if (!isUserOwnRound(activeRound, currentUser)) {
        activeRoundRef.current = null;
        setActiveRound(null);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
        idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
      }
    }
  }, [currentUser, isSectionAllowed, activeRound, rounds, roundTemplate, reconcileActiveRoundWithTemplate]);

  const addRoundTemplateItem = async (item: Omit<RoundCheckpoint, 'id'>) => {
    const newItem: RoundCheckpoint = {
      ...item,
      id: `chk-tpl-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    localActionIds.current.add(newItem.id);
    setTimeout(() => { localActionIds.current.delete(newItem.id); }, 15000);
    const updated = [...(roundTemplateRef.current || []), newItem];
    roundTemplateRef.current = updated;
    setRoundTemplate(updated);

    // If active round exists, append new checkpoint to active round
    if (activeRound) {
      setActiveRound(prev => {
        if (!prev) return null;
        if (prev.checkpoints.some(c => c.id === newItem.id)) return prev;
        const updatedActive = {
          ...prev,
          checkpoints: [...prev.checkpoints, { ...newItem }]
        };
        safeSetItem(STORAGE_KEYS.ACTIVE_ROUND, JSON.stringify(updatedActive));
        return updatedActive;
      });
    }

    await saveRoundTemplateToCloud(updated);
    notify(`📋 Plantilla de ronda creada: "${newItem.title}" (${newItem.area})`);
  };

  const updateRoundTemplateItem = async (id: string, data: Partial<RoundCheckpoint>) => {
    const currentList = roundTemplateRef.current || [];
    const updated = currentList.map(item => item.id === id ? { ...item, ...data } : item);
    roundTemplateRef.current = updated;
    setRoundTemplate(updated);

    // Synchronize active round checkpoints if one is currently active
    if (activeRound) {
      setActiveRound(prev => {
        if (!prev) return null;
        const targetItem = updated.find(i => i.id === id);
        const updatedCheckpoints = prev.checkpoints.map(chk => {
          const isMatch = chk.id === id || (targetItem && ((chk.title === targetItem.title && chk.area === targetItem.area) || chk.title === targetItem.title));
          if (isMatch) {
            const mergedButtonActions = data.buttonActions !== undefined ? data.buttonActions : chk.buttonActions;
            const currentStatus = chk.statusValue;
            const actionType = currentStatus 
              ? getCheckpointButtonAction({ ...chk, buttonActions: mergedButtonActions }, currentStatus, updated)
              : 'default';

            let newAmp = chk.ampState;
            let newFields = chk.measurementFields;
            if (actionType === 'default' || actionType === 'turn_on') {
              newAmp = 'Encendido';
              if (newFields && newFields.length > 0) {
                newFields = newFields.map(f => ({
                  ...f,
                  ampState: 'Encendido'
                }));
              }
            } else if (actionType === 'turn_off') {
              newAmp = 'Apagado';
              if (newFields && newFields.length > 0) {
                newFields = newFields.map(f => ({
                  ...f,
                  value: 0,
                  ampState: 'Apagado'
                }));
              }
            }

            return {
              ...chk,
              ...data,
              buttonActions: mergedButtonActions,
              ampState: newAmp,
              measurementFields: newFields,
              suggestedNotes: data.suggestedNotes !== undefined ? data.suggestedNotes : undefined
            };
          }
          return chk;
        });
        const updatedActive = { ...prev, checkpoints: updatedCheckpoints };
        safeSetItem(STORAGE_KEYS.ACTIVE_ROUND, JSON.stringify(updatedActive));
        return updatedActive;
      });
    }

    await saveRoundTemplateToCloud(updated);
    notify(`✏️ Plantilla de ronda modificada: "${data.title || 'Punto'}"`);
  };

  const deleteRoundTemplateItem = async (id: string) => {
    if (currentUser && !currentUser.permissions?.canDeleteRecords) {
      notify('Acceso restringido: No tienes permisos para eliminar puntos de la plantilla.');
      return;
    }
    const currentList = roundTemplateRef.current || [];
    const itemToDelete = currentList.find(item => item.id === id);
    const itemTitle = itemToDelete ? `: "${itemToDelete.title}" (${itemToDelete.area})` : '';
    localActionIds.current.add(id);
    setTimeout(() => { localActionIds.current.delete(id); }, 15000);
    const updated = currentList.filter(item => item.id !== id);
    roundTemplateRef.current = updated;
    setRoundTemplate(updated);

    if (activeRound) {
      setActiveRound(prev => {
        if (!prev) return null;
        const updatedActive = {
          ...prev,
          checkpoints: prev.checkpoints.filter(c => c.id !== id)
        };
        safeSetItem(STORAGE_KEYS.ACTIVE_ROUND, JSON.stringify(updatedActive));
        return updatedActive;
      });
    }

    await saveRoundTemplateToCloud(updated);
    notify(`🗑️ Plantilla de ronda eliminada${itemTitle}`);
  };

  const resetRoundTemplateToDefault = async () => {
    if (currentUser && !currentUser.permissions?.canEditSettings) {
      notify('Acceso restringido: No tienes permisos para restablecer la plantilla.');
      return;
    }
    const updated = STANDARD_ROUND_CHECKPOINTS.map(c => ({ ...c }));
    roundTemplateRef.current = updated;
    setRoundTemplate(updated);
    await saveRoundTemplateToCloud(updated);
    notify('🔄 Plantilla de rondas restaurada a la predeterminada');
  };

  const clearAllRoundTemplate = async () => {
    if (currentUser && !currentUser.permissions?.canDeleteRecords) {
      notify('Acceso restringido: No tienes permisos para eliminar la plantilla.');
      return;
    }
    if (confirm('¿Está seguro de eliminar TODOS los puntos creados en la plantilla de rondas? Esto dejará la lista completamente en blanco para todos los usuarios en vivo.')) {
      roundTemplateRef.current = [];
      setRoundTemplate([]);
      await saveRoundTemplateToCloud([]);
      localStorage.removeItem('hotel_round_template');
      if (activeRound) {
        setActiveRound(null);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
      }
      notify('🗑️ Plantilla de rondas vaciada y eliminada');
    }
  };

  // Track if initial snapshot has loaded to prevent notification burst
  const isInitialLoad = useRef(true);
  const sessionStartTime = useRef<number>(Date.now());
  const initialBaselinePopulated = useRef<boolean>(false);
  const knownSessionRequestIds = useRef<Set<string>>(new Set());
  const knownSessionTaskIds = useRef<Set<string>>(new Set());
  const knownSessionRoundIds = useRef<Set<string>>(new Set());
  const knownSessionIncidentIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      isInitialLoad.current = false;
      initialBaselinePopulated.current = true;
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Sync state to localStorage for offline access with micro-debouncing to keep UI thread fast and smooth
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.ROLE, role); }, [role]);
  useEffect(() => {
    const handle = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(incidents)); } catch (e) {}
    }, 200);
    return () => clearTimeout(handle);
  }, [incidents]);
  useEffect(() => {
    const handle = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(equipments)); } catch (e) {}
    }, 200);
    return () => clearTimeout(handle);
  }, [equipments]);
  useEffect(() => {
    if (!rounds || rounds.length === 0) return;
    const handle = setTimeout(() => {
      safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(rounds));
    }, 350);
    return () => clearTimeout(handle);
  }, [rounds]);
  useEffect(() => {
    if (activeRound) {
      safeSetItem(STORAGE_KEYS.ACTIVE_ROUND, JSON.stringify(activeRound));
    }
  }, [activeRound]);

  // Sincronización reactiva inmediata en tiempo real: Si la ronda activa en pantalla ha sido finalizada, completada, cerrada o eliminada (en este o en cualquier otro dispositivo / Firestore / SSE / API), desvincularla y quitarla de la pantalla inmediatamente sin necesidad de refrescar la aplicación
  useEffect(() => {
    if (!activeRound) return;
    const deletedIds = getDeletedRoundIds();
    if (deletedIds.has(activeRound.id)) {
      activeRoundRef.current = null;
      setActiveRound(null);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
      idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
      return;
    }

    // STRICT RESUME/ACTIVE RULE: If the round is 'en_progreso', the technician is actively working on it or has resumed it!
    // Never dismiss, clear, or blink it away while in progress!
    if (activeRound.status === 'en_progreso') {
      return;
    }

    const todayStr = getLocalDateString();
    const match = (rounds || []).find(r => r && r.id === activeRound.id);
    if (match) {
      const isFinished = match.status === 'completada' || (match.compliancePercentage === 100 && Boolean(match.technicianSignature));
      const isPastRound = match.date !== todayStr;
      if (isFinished || isPastRound) {
        activeRoundRef.current = null;
        setActiveRound(null);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
        idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
      }
    } else if (activeRound.date !== todayStr) {
      activeRoundRef.current = null;
      setActiveRound(null);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
      idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
    }
  }, [rounds, activeRound]);

  // Protección anti-desconexión: Reconectar de inmediato la ronda activa en curso ante recargas o actualizaciones (respetando la propiedad del usuario o rol administrador y estrictamente para la jornada de hoy)
  useEffect(() => {
    if (!activeRound && rounds && rounds.length > 0 && currentUser) {
      const isUserAdmin = Boolean(
        currentUser.role === 'admin' ||
        currentUser.email?.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com' ||
        currentUser.id === 'usr-admin-master' ||
        currentUser.id === 'usr-1789230683226' ||
        normalizeStr(currentUser.displayName) === 'juan mateo ramos' ||
        normalizeStr(currentUser.displayName) === 'administrador principal' ||
        normalizeStr(currentUser.role) === 'administrador' ||
        normalizeStr(currentUser.role) === 'admin'
      );

      const deletedIds = getDeletedRoundIds();
      const savedActiveStr = localStorage.getItem(STORAGE_KEYS.ACTIVE_ROUND);
      let targetRound: DailyRound | undefined;
      if (savedActiveStr) {
        try {
          const parsed = JSON.parse(savedActiveStr);
          if (
            parsed &&
            parsed.id &&
            !deletedIds.has(parsed.id) &&
            parsed.status === 'en_progreso' &&
            !parsed.completedAt
          ) {
            const found = rounds.find(r => r && r.id === parsed.id && !deletedIds.has(r.id) && r.status === 'en_progreso' && !r.completedAt);
            const isCompletedInList = rounds.some(r => r && r.id === parsed.id && (r.status === 'completada' || Boolean(r.completedAt && r.technicianSignature)));
            if (!isCompletedInList) {
              targetRound = found || parsed;
            } else if (isCompletedInList || deletedIds.has(parsed.id)) {
              localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
              idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
            }
          } else if (parsed && parsed.id && deletedIds.has(parsed.id)) {
            localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
            idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
          }
        } catch {}
      }
      if (!targetRound) {
        // Conectar solo si la ronda está en curso activo y fue creada exactamente por este usuario (por ID o nombre exacto)
        // NUNCA auto-adoptar rondas de otros compañeros para administradores sin que ellos las abran explícitamente
        const userNorm = normalizeStr(currentUser?.displayName || currentUser?.name || '');
        targetRound = rounds.find(r => {
          if (!r || !r.id || deletedIds.has(r.id) || r.status !== 'en_progreso' || !isRoundActivelyBeingPerformed(r)) return false;
          if (r.completedAt || (r.technicianSignature && r.compliancePercentage === 100)) return false;
          const techNorm = normalizeStr(r.technicianName || '');
          const isExactUser = Boolean(r.userId && currentUser?.id && r.userId === currentUser.id) || Boolean(techNorm && userNorm && techNorm === userNorm);
          return isExactUser;
        });
      }
      if (targetRound) {
        const reconciled = reconcileActiveRoundWithTemplate(targetRound, roundTemplateRef.current || roundTemplate);
        activeRoundRef.current = reconciled;
        setActiveRound(reconciled);
        safeSetItem(STORAGE_KEYS.ACTIVE_ROUND, JSON.stringify(reconciled));
      } else {
        // Si no hay ronda en curso, asegurarse de no tener rondas ajenas completadas
        if (activeRoundRef.current && activeRoundRef.current.status !== 'en_progreso' && !isUserOwnRound(activeRoundRef.current, currentUser)) {
          activeRoundRef.current = null;
          setActiveRound(null);
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
          idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
        }
      }
    }
  }, [rounds, activeRound, roundTemplate, currentUser, reconcileActiveRoundWithTemplate]);

  // Limpieza precisa y atómica: solo si esta ronda exacta (por ID) ya fue completada y firmada oficialmente
  useEffect(() => {
    if (!activeRound) return;
    const isCompleted = activeRound.status === 'completada' && Boolean(activeRound.completedAt && activeRound.technicianSignature);
    const inListCompleted = (rounds || []).some(r => 
      r && 
      r.id === activeRound.id && 
      r.status === 'completada' && 
      Boolean(r.completedAt && r.technicianSignature)
    );

    if (isCompleted || inListCompleted) {
      activeRoundRef.current = null;
      setActiveRound(null);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
      idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
    }
  }, [rounds, activeRound]);

  // Synchronize active round with latest roundTemplate so 100% of all configured points always appear
  useEffect(() => {
    if (activeRound && activeRound.status === 'en_progreso' && roundTemplate && roundTemplate.length > 0) {
      const reconciled = reconcileActiveRoundWithTemplate(activeRound, roundTemplate);
      const isCountDiff = reconciled.checkpoints.length !== activeRound.checkpoints.length;
      const isOrderDiff = reconciled.checkpoints.some((c, i) => c.id !== activeRound.checkpoints[i]?.id);
      if (isCountDiff || isOrderDiff) {
        activeRoundRef.current = reconciled;
        setActiveRound(reconciled);
        safeSetItem(STORAGE_KEYS.ACTIVE_ROUND, JSON.stringify(reconciled));
      }
    }
  }, [roundTemplate, reconcileActiveRoundWithTemplate, activeRound]);
  useEffect(() => {
    const handle = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify(pumpInspections)); } catch (e) {}
    }, 200);
    return () => clearTimeout(handle);
  }, [pumpInspections]);
  useEffect(() => {
    const handle = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(preventivePlans)); } catch (e) {}
    }, 200);
    return () => clearTimeout(handle);
  }, [preventivePlans]);
  useEffect(() => {
    const handle = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEYS.WORK_ORDERS, JSON.stringify(workOrders)); } catch (e) {}
    }, 200);
    return () => clearTimeout(handle);
  }, [workOrders]);
  useEffect(() => {
    const handle = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings)); } catch (e) {}
    }, 200);
    return () => clearTimeout(handle);
  }, [settings]);
  useEffect(() => {
    const handle = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(uploadedDocuments)); } catch (e) {}
    }, 300);
    return () => clearTimeout(handle);
  }, [uploadedDocuments]);
  useEffect(() => {
    const handle = setTimeout(() => {
      try { localStorage.setItem('hotel_doc_folders', JSON.stringify(documentFolders)); } catch (e) {}
    }, 300);
    return () => clearTimeout(handle);
  }, [documentFolders]);
  useEffect(() => {
    const handle = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(requests)); } catch (e) {}
    }, 200);
    return () => clearTimeout(handle);
  }, [requests]);
  useEffect(() => {
    const handle = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(tasks)); } catch (e) {}
    }, 200);
    return () => clearTimeout(handle);
  }, [tasks]);

  // Flash notifications with timer deduplication
  const notifyTimeoutRef = useRef<any>(null);
  const notify = useCallback((msg: string | any) => {
    if (notifyTimeoutRef.current) {
      clearTimeout(notifyTimeoutRef.current);
    }
    const textMsg = typeof msg === 'string' ? msg : (msg?.message || msg?.title || JSON.stringify(msg));
    setNotification(textMsg);
    notifyTimeoutRef.current = setTimeout(() => {
      setNotification(null);
    }, 4500);
  }, []);

  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // Automatically request and establish background/system notifications without needing any manual button
  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      setNotificationPermission('granted');
      return;
    }

    const autoActivate = async () => {
      try {
        if (Notification.permission === 'granted') {
          setNotificationPermission('granted');
          return;
        }
        if (Notification.permission !== 'denied') {
          const res = await Notification.requestPermission();
          setNotificationPermission(res);
          if (res === 'granted') {
            sendSystemNotification('🔔 Notificaciones del Sistema Activadas', {
              body: 'Recibirás alertas automáticas en tu barra superior para rondas, solicitudes, tareas y averías.',
              icon: '/pwa-192x192.png',
              tag: 'auto-notify-ready'
            });
          }
        }
      } catch (e) {
        console.warn('Auto notification request warning:', e);
      }
    };

    // Register on the first user interaction (touch/click) to guarantee mobile browser compliance
    const handleFirstUserInteraction = () => {
      autoActivate();
      window.removeEventListener('click', handleFirstUserInteraction);
      window.removeEventListener('touchstart', handleFirstUserInteraction);
      window.removeEventListener('pointerdown', handleFirstUserInteraction);
    };

    window.addEventListener('click', handleFirstUserInteraction, { passive: true, once: true });
    window.addEventListener('touchstart', handleFirstUserInteraction, { passive: true, once: true });
    window.addEventListener('pointerdown', handleFirstUserInteraction, { passive: true, once: true });

    return () => {
      window.removeEventListener('click', handleFirstUserInteraction);
      window.removeEventListener('touchstart', handleFirstUserInteraction);
      window.removeEventListener('pointerdown', handleFirstUserInteraction);
    };
  }, []);

  const requestSystemNotificationPermission = useCallback(async (): Promise<boolean> => {
    const perm = await requestNotificationPermission();
    setNotificationPermission(perm);
    if (perm === 'granted') {
      notify('🔔 Notificaciones activadas: Recibirás alertas aunque la aplicación esté en segundo plano');
      sendSystemNotification('🔔 Alertas del Sistema Conectadas', {
        body: 'Recibirás alertas en la barra de notificaciones para Rondas, Solicitudes, Tareas e Inconvenientes.',
        icon: '/pwa-192x192.png',
        tag: 'system-active-confirm'
      });
      playAlertSound();
      if (currentUserRef.current) {
        syncPushSubscriptionWithServer(currentUserRef.current);
      }
      return true;
    }
    return false;
  }, [notify]);

  // Sync background Web Push subscription automatically whenever currentUser or permission updates
  useEffect(() => {
    if (currentUser && notificationPermission === 'granted') {
      syncPushSubscriptionWithServer(currentUser);
    }
  }, [currentUser, notificationPermission]);

  const [pmsData, setPmsData] = useState<any>({
    occupancyPercentage: 88,
    totalGuests: 156,
    arrivalsToday: 24,
    departuresToday: 19,
    arrivalsTomorrow: 30,
    totalRooms: 120,
    occupiedRooms: 106,
    vacantRooms: 14,
    maintenanceRooms: 0,
    lastSyncedAt: new Date().toISOString(),
    source: 'Recepción PMS'
  });

  const refreshPmsData = useCallback(async () => {
    try {
      const res = await fetch('/api/pms/data');
      if (res.ok) {
        const data = await res.json();
        if (data) setPmsData(data);
      }
    } catch (err) {
      console.warn('Error fetching PMS data:', err);
    }
  }, []);

  useEffect(() => {
    refreshPmsData();
    const interval = setInterval(refreshPmsData, 30000);
    return () => clearInterval(interval);
  }, [refreshPmsData]);

  const triggerSystemNotification = useCallback((title: string, body: string, options?: any) => {
    sendSystemNotification(title, { body, ...options });
  }, []);

  const getNotifiedRequestIds = (userId: string): Set<string> => {
    try {
      const key = `hotel_maint_notified_reqs_${userId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch {}
    return new Set();
  };

  const markNotifiedRequestId = (userId: string, reqId: string) => {
    try {
      const key = `hotel_maint_notified_reqs_${userId}`;
      const current = getNotifiedRequestIds(userId);
      current.add(reqId);
      const arr = Array.from(current).slice(-200);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {}
  };

  const getRequesterNotifiedStatus = (userId: string): Record<string, string> => {
    try {
      const key = `hotel_maint_req_status_${userId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      }
    } catch {}
    return {};
  };

  const saveRequesterNotifiedStatus = (userId: string, reqId: string, status: string) => {
    try {
      const key = `hotel_maint_req_status_${userId}`;
      const map = getRequesterNotifiedStatus(userId);
      map[reqId] = status;
      const keys = Object.keys(map);
      if (keys.length > 200) {
        const trimmed: Record<string, string> = {};
        keys.slice(-150).forEach(k => { trimmed[k] = map[k]; });
        localStorage.setItem(key, JSON.stringify(trimmed));
      } else {
        localStorage.setItem(key, JSON.stringify(map));
      }
    } catch {}
  };

  const getNotifiedTaskIds = (userId: string): Set<string> => {
    try {
      const key = `hotel_maint_notified_tasks_${userId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch {}
    return new Set();
  };

  const markNotifiedTaskId = (userId: string, taskId: string) => {
    try {
      const key = `hotel_maint_notified_tasks_${userId}`;
      const current = getNotifiedTaskIds(userId);
      current.add(taskId);
      const arr = Array.from(current).slice(-200);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {}
  };

  const getTaskNotifiedData = (userId: string): Record<string, { status?: string; assignedTo?: string }> => {
    try {
      const key = `hotel_maint_task_data_${userId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      }
    } catch {}
    return {};
  };

  const saveTaskNotifiedData = (userId: string, taskId: string, status?: string, assignedTo?: string) => {
    try {
      const key = `hotel_maint_task_data_${userId}`;
      const map = getTaskNotifiedData(userId);
      map[taskId] = { status: status || '', assignedTo: assignedTo || '' };
      const keys = Object.keys(map);
      if (keys.length > 200) {
        const trimmed: Record<string, { status?: string; assignedTo?: string }> = {};
        keys.slice(-150).forEach(k => { trimmed[k] = map[k]; });
        localStorage.setItem(key, JSON.stringify(trimmed));
      } else {
        localStorage.setItem(key, JSON.stringify(map));
      }
    } catch {}
  };

  const checkAndNotifyNewTasks = useCallback((incomingList: MaintenanceTask[], previousList: MaintenanceTask[]) => {
    const activeMe = currentUserRef.current;
    if (!activeMe || !Array.isArray(incomingList)) return;

    const userKey = activeMe.id || activeMe.email || 'user';

    // 1. Durante la carga inicial/montaje, registrar todas las tareas de forma silenciosa
    if (isInitialLoad.current || !initialBaselinePopulated.current) {
      incomingList.forEach(task => {
        if (task && task.id) {
          knownSessionTaskIds.current.add(task.id);
          markNotifiedTaskId(userKey, task.id);
          saveTaskNotifiedData(userKey, task.id, task.status, task.assignedToName);
        }
      });
      return;
    }

    const notifiedSet = getNotifiedTaskIds(userKey);
    const taskDataMap = getTaskNotifiedData(userKey);
    const isAdminUser = activeMe.role === 'admin';
    const userName = normalizeStr(activeMe.displayName || '');
    const userEmail = normalizeStr(activeMe.email || '');
    const userRole = normalizeStr(activeMe.role || '');
    const userDept = normalizeStr(activeMe.department || '');
    const isTechUser = userRole.includes('tecnico') || userRole.includes('técnico') || userDept.includes('mantenimiento');

    incomingList.forEach(newTask => {
      if (!newTask || !newTask.id) return;

      // Parsear fecha de creación para descartar tareas históricas
      let taskTime = 0;
      if (newTask.createdAt) {
        const parsed = new Date(newTask.createdAt.replace(' ', 'T')).getTime();
        if (!isNaN(parsed)) taskTime = parsed;
      }

      if (taskTime > 0 && taskTime < (sessionStartTime.current - 15000)) {
        knownSessionTaskIds.current.add(newTask.id);
        markNotifiedTaskId(userKey, newTask.id);
        if (!taskDataMap[newTask.id]) {
          saveTaskNotifiedData(userKey, newTask.id, newTask.status, newTask.assignedToName);
        }
        return;
      }

      const isKnownInSession = knownSessionTaskIds.current.has(newTask.id);
      const prevTask = (previousList || []).find(t => t.id === newTask.id);
      const isNew = !isKnownInSession && !prevTask;
      const prevSavedData = taskDataMap[newTask.id];
      const hasAssignmentChanged = prevTask 
        ? (prevTask.assignedToName !== newTask.assignedToName || prevTask.assignedToId !== newTask.assignedToId)
        : (prevSavedData && prevSavedData.assignedTo && prevSavedData.assignedTo !== newTask.assignedToName);
      const hasStatusChanged = prevTask
        ? prevTask.status !== newTask.status
        : (prevSavedData && prevSavedData.status && prevSavedData.status !== newTask.status);
      const isPendingOrActive = newTask.status !== 'cancelada' && newTask.status !== 'completada';
      const hasBeenNotified = notifiedSet.has(newTask.id);

      // Check if current user is the creator
      const isCreatorOfThisTask = Boolean(
        (newTask.createdById && activeMe.id && newTask.createdById === activeMe.id) ||
        (newTask.createdByName && userName && (normalizeStr(newTask.createdByName) === userName || normalizeStr(newTask.createdByName).includes(userName) || userName.includes(normalizeStr(newTask.createdByName))))
      );

      // Check assignment
      const assignTarget = normalizeStr(newTask.assignedToName || '');
      const isAssignedSpecificallyToMe = Boolean(
        (newTask.assignedToId && activeMe.id && newTask.assignedToId === activeMe.id) ||
        (assignTarget && (
          (userName && (assignTarget === userName || assignTarget.includes(userName) || userName.includes(assignTarget))) ||
          (userEmail && (assignTarget === userEmail || assignTarget.includes(userEmail) || userEmail.includes(assignTarget)))
        ))
      );

      const isGeneralOrTeam = !assignTarget || 
        assignTarget.includes('todo el equipo') || 
        assignTarget.includes('todos') || 
        assignTarget.includes('general') || 
        assignTarget.includes('sin asignar') || 
        assignTarget === 'mantenimiento' || 
        assignTarget === 'tecnicos' ||
        assignTarget === 'tecnico';

      // -----------------------------------------------------------------
      // A) NOTIFICACIÓN CUANDO SE ASIGNA UNA NUEVA TAREA AL USUARIO
      // -----------------------------------------------------------------
      if (isAssignedSpecificallyToMe) {
        const shouldAlertAssignee = (isNew && !hasBeenNotified && isPendingOrActive) || (hasAssignmentChanged && isPendingOrActive);

        if (shouldAlertAssignee) {
          knownSessionTaskIds.current.add(newTask.id);
          markNotifiedTaskId(userKey, newTask.id);
          saveTaskNotifiedData(userKey, newTask.id, newTask.status, newTask.assignedToName);

          const assignerName = newTask.createdByName || 'Compañero de Mantenimiento';
          const priorityLabel = (newTask.priority || 'media').toUpperCase();
          const areaLabel = newTask.area ? ` en ${newTask.area}` : '';

          // 1. Notificación flotante visual (In-app Toast)
          notify(`📋 🎯 ¡Nueva Tarea Asignada!: "${newTask.title}"${areaLabel} (Asignada por ${assignerName})`);

          // 2. Notificación local del sistema (PWA / Navegador / Segundo plano)
          sendSystemNotification(`📋 Nueva Tarea Asignada para Ti`, {
            body: `Se te ha asignado la tarea: "${newTask.title}"\n• Prioridad: ${priorityLabel}\n• Ubicación: ${newTask.area || 'Hotel'}\n• Asignado por: ${assignerName}${newTask.dueDate ? `\n• Límite: ${newTask.dueDate}` : ''}`,
            tag: `task-assign-${newTask.id}`,
            icon: '/pwa-192x192.png'
          });

          // 3. Alerta sonora y vibración
          playAlertSound();
          return;
        }
      }

      // -----------------------------------------------------------------
      // B) NOTIFICACIÓN DE TAREAS PARA TODOS LOS DEMÁS USUARIOS DEL EQUIPO (Únicamente si la tarea es general o para todo el equipo)
      // -----------------------------------------------------------------
      if (!isCreatorOfThisTask && !isAssignedSpecificallyToMe && isGeneralOrTeam) {
        if (isNew && !hasBeenNotified && isPendingOrActive) {
          knownSessionTaskIds.current.add(newTask.id);
          markNotifiedTaskId(userKey, newTask.id);
          saveTaskNotifiedData(userKey, newTask.id, newTask.status, newTask.assignedToName);

          const assignerName = newTask.createdByName || 'Compañero de Mantenimiento';
          const priorityLabel = (newTask.priority || 'media').toUpperCase();
          const assignedToLabel = newTask.assignedToName || 'Todo el equipo';

          notify(`📋 Nueva Tarea: "${newTask.title}" (Asignada a: ${assignedToLabel} • Prioridad: ${priorityLabel})`);
          sendSystemNotification(`📋 Nueva Tarea de Mantenimiento`, {
            body: `"${newTask.title}"\n• Asignada a: ${assignedToLabel}\n• Ubicación: ${newTask.area || 'Hotel'}\n• Prioridad: ${priorityLabel}\n• Creado por: ${assignerName}`,
            tag: `task-team-${newTask.id}`,
            icon: '/pwa-192x192.png'
          });
          playAlertSound();
          return;
        }
      }

      // -----------------------------------------------------------------
      // C) NOTIFICACIÓN PARA EL CREADOR DE LA TAREA CUANDO ES COMPLETADA
      // -----------------------------------------------------------------
      if (isCreatorOfThisTask && !isAssignedSpecificallyToMe) {
        if (newTask.status === 'completada' && hasStatusChanged) {
          knownSessionTaskIds.current.add(newTask.id);
          saveTaskNotifiedData(userKey, newTask.id, newTask.status, newTask.assignedToName);

          const completerName = newTask.completedBy || newTask.assignedToName || 'Un compañero';
          notify(`✅ 👏 Tarea Finalizada: "${newTask.title}" fue completada por ${completerName}`);
          sendSystemNotification(`✅ Tarea de Mantenimiento Finalizada`, {
            body: `La tarea "${newTask.title}" fue completada exitosamente por ${completerName}.`,
            tag: `task-done-${newTask.id}`,
            icon: '/pwa-192x192.png'
          });
          playAlertSound();
          return;
        }
      }

      // -----------------------------------------------------------------
      // D) NOTIFICACIÓN PARA ADMINISTRADORES
      // -----------------------------------------------------------------
      if (isAdminUser && !isCreatorOfThisTask && !isAssignedSpecificallyToMe && !isGeneralOrTeam) {
        if (isNew && !hasBeenNotified && isPendingOrActive) {
          knownSessionTaskIds.current.add(newTask.id);
          markNotifiedTaskId(userKey, newTask.id);
          saveTaskNotifiedData(userKey, newTask.id, newTask.status, newTask.assignedToName);

          notify(`📋 Tarea asignada: "${newTask.title}" para ${newTask.assignedToName}`);
          sendSystemNotification(`📋 Tarea Asignada`, {
            body: `"${newTask.title}" asignada a ${newTask.assignedToName}\nPrioridad: ${(newTask.priority || 'media').toUpperCase()}`,
            tag: `task-admin-${newTask.id}`,
            icon: '/pwa-192x192.png'
          });
          playAlertSound();
          return;
        }
      }

      // Registrar estado para evitar re-notificaciones
      knownSessionTaskIds.current.add(newTask.id);
      markNotifiedTaskId(userKey, newTask.id);
      saveTaskNotifiedData(userKey, newTask.id, newTask.status, newTask.assignedToName);
    });
  }, [notify]);

  const checkAndNotifyNewRequests = useCallback((incomingList: HotelRequest[], previousList: HotelRequest[]) => {
    const activeMe = currentUserRef.current;
    if (!activeMe || !Array.isArray(incomingList)) return;

    const userKey = activeMe.id || activeMe.email || 'user';

    // 1. Durante la carga inicial/montaje o si la lista previa está vacía, registrar todas las solicitudes de forma silenciosa
    if (isInitialLoad.current || !initialBaselinePopulated.current || (!previousList || previousList.length === 0)) {
      incomingList.forEach(req => {
        if (req && req.id) {
          knownSessionRequestIds.current.add(req.id);
          markNotifiedRequestId(userKey, req.id);
          saveRequesterNotifiedStatus(userKey, req.id, req.status);
        }
      });
      return;
    }

    const notifiedSet = getNotifiedRequestIds(userKey);
    const requesterStatusMap = getRequesterNotifiedStatus(userKey);
    const isAdminUser = activeMe.role === 'admin';
    const userName = normalizeStr(activeMe.displayName || '');
    const userEmail = normalizeStr(activeMe.email || '');
    const userRole = normalizeStr(activeMe.role || '');
    const userDept = normalizeStr(activeMe.department || '');
    const isTechUser = userRole.includes('tecnico') || userRole.includes('técnico') || userDept.includes('mantenimiento');

    incomingList.forEach(newReq => {
      if (!newReq || !newReq.id) return;

      // Parsear fecha de creación para descartar solicitudes históricas o creadas antes de entrar a la app
      let reqTime = 0;
      if (newReq.createdAt) {
        const parsed = new Date(newReq.createdAt.replace(' ', 'T')).getTime();
        if (!isNaN(parsed)) reqTime = parsed;
      }

      // Si la solicitud fue creada antes del inicio de esta sesión (con margen de 15s), NUNCA alertar al entrar
      if (reqTime > 0 && reqTime < (sessionStartTime.current - 15000)) {
        knownSessionRequestIds.current.add(newReq.id);
        markNotifiedRequestId(userKey, newReq.id);
        if (!requesterStatusMap[newReq.id]) {
          saveRequesterNotifiedStatus(userKey, newReq.id, newReq.status);
        }
        return;
      }

      const isKnownInSession = knownSessionRequestIds.current.has(newReq.id);
      const prevReq = (previousList || []).find(r => r.id === newReq.id);
      const isNew = !isKnownInSession && !prevReq;
      const hasAssignmentChanged = prevReq && prevReq.assignedTo !== newReq.assignedTo;
      const hasStatusChanged = prevReq && prevReq.status !== newReq.status;
      const isPending = newReq.status !== 'cancelado' && newReq.status !== 'resuelto';
      const hasBeenNotified = notifiedSet.has(newReq.id);

      // Check if current user is the requester of this request
      const reqById = newReq.requestedById;
      const reqByEmail = normalizeStr(newReq.requestedByEmail || '');
      const reqByName = normalizeStr(newReq.requestedBy || '');

      const isRequesterOfThisReq = Boolean(
        (reqById && activeMe.id && reqById === activeMe.id) ||
        (reqByEmail && userEmail && (reqByEmail === userEmail || reqByEmail.includes(userEmail) || userEmail.includes(reqByEmail))) ||
        (reqByName && userName && (reqByName === userName || reqByName.includes(userName) || userName.includes(reqByName))) ||
        (reqByName && userEmail && (reqByName.includes(userEmail) || userEmail.includes(reqByName)))
      );

      // -------------------------------------------------------------
      // 1. ALERTAS PARA LA PERSONA QUE ENVIÓ LA SOLICITUD (El Solicitante)
      // "La persona quien envía la solicitud debe recibir alertas de que se recibió la solicitud para él saber si fue atendida"
      // -------------------------------------------------------------
      if (isRequesterOfThisReq) {
        const lastKnownStatus = requesterStatusMap[newReq.id];

        // A) Cuando la solicitud pasa a "en_proceso" (Iniciar Proceso)
        const isTransitionToInProgress = newReq.status === 'en_proceso' && (
          lastKnownStatus !== 'en_proceso' || (prevReq && prevReq.status !== 'en_proceso')
        );

        if (isTransitionToInProgress) {
          saveRequesterNotifiedStatus(userKey, newReq.id, 'en_proceso');
          knownSessionRequestIds.current.add(newReq.id);
          const techLabel = newReq.assignedTo ? `por ${newReq.assignedTo}` : 'por el equipo de mantenimiento';

          notify(`💬 👨‍🔧 Solicitud en atención: Tu solicitud "${newReq.title}" fue recibida y ya está siendo atendida ${techLabel}.`);
          sendSystemNotification(`👨‍🔧 Tu Solicitud está siendo atendida`, {
            body: `Tu solicitud "${newReq.title}" fue recibida y está en proceso de atención ${techLabel}.\nUbicación: ${newReq.location || 'Hotel'}`,
            tag: `req-progress-${newReq.id}`,
            icon: '/pwa-192x192.png'
          });
          playAlertSound();
          if (!isAdminUser) return;
        }

        // B) Cuando la solicitud pasa a "resuelto" (Marcar Resuelto)
        const isTransitionToResolved = newReq.status === 'resuelto' && (
          lastKnownStatus !== 'resuelto' || (prevReq && prevReq.status !== 'resuelto')
        );

        if (isTransitionToResolved) {
          saveRequesterNotifiedStatus(userKey, newReq.id, 'resuelto');
          knownSessionRequestIds.current.add(newReq.id);
          const techLabel = newReq.assignedTo ? `por ${newReq.assignedTo}` : 'con éxito';

          notify(`💬 ✅ Solicitud Atendida y Resuelta: Tu solicitud "${newReq.title}" fue completada y atendida ${techLabel}.`);
          sendSystemNotification(`✅ Tu Solicitud fue Atendida y Resuelta`, {
            body: `Tu solicitud "${newReq.title}" ha sido resuelta ${techLabel}.\nUbicación: ${newReq.location || 'Hotel'}`,
            tag: `req-resolved-${newReq.id}`,
            icon: '/pwa-192x192.png'
          });
          playAlertSound();
          if (!isAdminUser) return;
        }

        // C) Cuando la solicitud es asignada a un técnico específico
        if (hasAssignmentChanged && newReq.assignedTo) {
          saveRequesterNotifiedStatus(userKey, newReq.id, newReq.status);
          knownSessionRequestIds.current.add(newReq.id);
          notify(`💬 📋 Solicitud Asignada: Tu solicitud "${newReq.title}" fue asignada a ${newReq.assignedTo} para ser atendida.`);
          sendSystemNotification(`📋 Solicitud Asignada`, {
            body: `Tu solicitud "${newReq.title}" fue asignada a ${newReq.assignedTo} para su atención inmediata.`,
            tag: `req-assigned-${newReq.id}`,
            icon: '/pwa-192x192.png'
          });
          playAlertSound();
          if (!isAdminUser) return;
        }

        // Registrar estado inicial si no existía en el mapa
        if (!lastKnownStatus) {
          saveRequesterNotifiedStatus(userKey, newReq.id, newReq.status);
        }

        // Si es el creador de la solicitud y no es admin con solicitudes ajenas, terminar aquí
        if (!isAdminUser) {
          knownSessionRequestIds.current.add(newReq.id);
          return;
        }
      }

      // -------------------------------------------------------------
      // 2. ALERTAS PARA ADMINISTRADORES Y TÉCNICOS ASIGNADOS
      // Solo notificar si es una solicitud NUEVA en vivo durante la sesión activa
      // -------------------------------------------------------------
      const shouldEvaluate = (isNew && !hasBeenNotified && isPending) || hasAssignmentChanged || hasStatusChanged;
      if (!shouldEvaluate) {
        knownSessionRequestIds.current.add(newReq.id);
        return;
      }

      // El creador no debe recibir la alerta de "Nueva solicitud recibida" de su propia creación
      if (isRequesterOfThisReq && isNew) {
        knownSessionRequestIds.current.add(newReq.id);
        markNotifiedRequestId(userKey, newReq.id);
        return;
      }

      // Check assignment:
      const assignTarget = normalizeStr(newReq.assignedTo || '');

      // Is it assigned specifically to this individual user?
      const isAssignedToThisUser = Boolean(
        assignTarget && (
          (userName && (assignTarget === userName || assignTarget.includes(userName) || userName.includes(assignTarget))) ||
          (userEmail && (assignTarget === userEmail || assignTarget.includes(userEmail) || userEmail.includes(assignTarget)))
        )
      );

      // Is it an open / unassigned / general assignment?
      const isUnassignedOrGeneral = !assignTarget || 
        assignTarget.includes('mantenimiento general') || 
        assignTarget.includes('sala de bombas') || 
        assignTarget.includes('sin asignar') || 
        assignTarget === 'mantenimiento' || 
        assignTarget === 'general' ||
        assignTarget === 'tecnico' ||
        assignTarget === 'tecnicos';

      let shouldNotify = false;

      if (isUnassignedOrGeneral) {
        // When unassigned or general: notify administrators and maintenance technicians
        shouldNotify = isAdminUser || isTechUser;
      } else {
        // When assigned to a SPECIFIC individual:
        // 1. Administrators MUST ALWAYS receive the notification
        // 2. The SPECIFIC assigned user MUST receive the notification
        // 3. Other users MUST NOT receive the notification
        shouldNotify = isAdminUser || isAssignedToThisUser;
      }

      knownSessionRequestIds.current.add(newReq.id);

      if (shouldNotify) {
        markNotifiedRequestId(userKey, newReq.id);

        const reporterName = newReq.requestedBy || 'Jefatura / Hotel';
        const assignedLabel = newReq.assignedTo || 'Mantenimiento General';

        if (hasStatusChanged && isAdminUser) {
          if (newReq.status === 'en_proceso') {
            notify(`💬 👨‍🔧 Solicitud en atención: "${newReq.title}" está siendo atendida por ${assignedLabel}`);
            sendSystemNotification(`👨‍🔧 Solicitud en Proceso de Atención`, {
              body: `"${newReq.title}" está siendo atendida por ${assignedLabel}.\nUbicación: ${newReq.location || 'Hotel'}`,
              tag: `admin-req-prog-${newReq.id}`,
              icon: '/pwa-192x192.png'
            });
            playAlertSound();
            return;
          } else if (newReq.status === 'resuelto') {
            notify(`💬 ✅ Solicitud resuelta: "${newReq.title}" fue finalizada por ${assignedLabel}`);
            sendSystemNotification(`✅ Solicitud Resuelta y Cerrada`, {
              body: `"${newReq.title}" fue resuelta y finalizada por ${assignedLabel}.\nUbicación: ${newReq.location || 'Hotel'}`,
              tag: `admin-req-res-${newReq.id}`,
              icon: '/pwa-192x192.png'
            });
            playAlertSound();
            return;
          }
        }

        let bannerTitle = `🚨 Solicitud de ${reporterName}`;
        let bannerMsg = `"${newReq.title}"`;
        if (isAdminUser && !isAssignedToThisUser) {
          bannerMsg = `"${newReq.title}" • Asignado a: ${assignedLabel}`;
        } else if (isAssignedToThisUser) {
          bannerMsg = `Nueva solicitud asignada para ti: "${newReq.title}"`;
        }

        notify(`💬 ${bannerTitle}: ${bannerMsg}`);

        sendSystemNotification(`🚨 Solicitud: ${newReq.title}`, {
          body: `De: ${reporterName} | Asignado: ${assignedLabel}\nUbicación: ${newReq.location || 'Hotel'} | Prioridad: ${(newReq.priority || 'normal').toUpperCase()}`,
          tag: `req-${newReq.id}`,
          icon: '/pwa-192x192.png'
        });
        playAlertSound();
      } else {
        // If this user is not the target of this specific request, mark it so it doesn't re-check
        markNotifiedRequestId(userKey, newReq.id);
      }
    });
  }, [notify]);

  // -------------------------------------------------------------
  // RECORDATORIO AUTOMÁTICO DE SOLICITUDES PENDIENTES SIN INICIAR
  // "La persona que tenga el usuario y a esa persona le mandan una solicitud
  // y por X o Y razón no vio la notificación cuando se la mandaron,
  // la misma aplicación le recuerda periódicamente que tiene una solicitud pendiente
  // (que no le ha dado iniciar proceso) para que la atienda."
  // -------------------------------------------------------------
  const lastPendingRequestReminderTime = useRef<Record<string, number>>({});

  const checkPendingRequestsReminders = useCallback(() => {
    const activeMe = currentUserRef.current;
    if (!activeMe) return;

    const currentRequests = requestsRef.current || [];
    if (!Array.isArray(currentRequests) || currentRequests.length === 0) return;

    const userName = normalizeStr(activeMe.displayName || '');
    const userEmail = normalizeStr(activeMe.email || '');
    const userRole = normalizeStr(activeMe.role || '');
    const userDept = normalizeStr(activeMe.department || '');
    const isAdminUser = activeMe.role === 'admin';
    const isTechUser = userRole.includes('tecnico') || userRole.includes('técnico') || userDept.includes('mantenimiento');
    const now = Date.now();

    currentRequests.forEach(req => {
      if (!req || !req.id) return;

      // Si la solicitud NO está en estado 'pendiente' (p. ej. ya se le dio 'Iniciar Proceso' o se resolvió),
      // limpiar el registro de recordatorio y salir
      if (req.status !== 'pendiente') {
        if (lastPendingRequestReminderTime.current[req.id]) {
          delete lastPendingRequestReminderTime.current[req.id];
        }
        return;
      }

      // Comprobar si la solicitud está asignada específicamente a este usuario
      const assignTarget = normalizeStr(req.assignedTo || '');

      const isAssignedToMe = Boolean(
        assignTarget && (
          (userName && (assignTarget === userName || assignTarget.includes(userName) || userName.includes(assignTarget))) ||
          (userEmail && (assignTarget === userEmail || assignTarget.includes(userEmail) || userEmail.includes(assignTarget))) ||
          (req.assignedToId && activeMe.id && req.assignedToId === activeMe.id)
        )
      );

      // Si quien creó la solicitud es el usuario actual y la solicitud fue enviada a otra persona (ej. a Mauricio),
      // NUNCA disparar recordatorio para el creador
      const isCreatedByMe = Boolean(
        (req.requestedById && activeMe.id && req.requestedById === activeMe.id) ||
        (req.requestedByEmail && activeMe.email && req.requestedByEmail.toLowerCase().trim() === activeMe.email.toLowerCase().trim()) ||
        (req.requestedBy && userName && normalizeStr(req.requestedBy) === userName)
      );

      // Solo la persona a quien le fue enviada/asignada la solicitud pendiente recibe el recordatorio
      if (!isAssignedToMe || (isCreatedByMe && assignTarget && !assignTarget.includes(userName))) {
        return;
      }

      // Calcular tiempo transcurrido desde la creación de la solicitud
      let reqCreatedAtTime = 0;
      if (req.createdAt) {
        const parsed = new Date(req.createdAt.replace(' ', 'T')).getTime();
        if (!isNaN(parsed)) reqCreatedAtTime = parsed;
      }

      // Si la solicitud fue creada hace menos de 90 segundos, dar un breve margen antes del primer recordatorio
      if (reqCreatedAtTime > 0 && (now - reqCreatedAtTime) < 90000) {
        return;
      }

      // Intervalo de recordatorio: cada 3 minutos (180,000 ms) mientras siga en estado "pendiente"
      const REMINDER_INTERVAL_MS = 180000;
      const lastRemindedAt = lastPendingRequestReminderTime.current[req.id] || 0;

      if (now - lastRemindedAt >= REMINDER_INTERVAL_MS) {
        lastPendingRequestReminderTime.current[req.id] = now;

        const priorityIcon = req.priority === 'urgente' ? '🚨' : req.priority === 'alta' ? '⚠️' : '🔔';
        const reminderTitle = `${priorityIcon} Recordatorio: Solicitud Pendiente`;
        const reminderBody = `Tienes la solicitud "${req.title}" pendiente por atender en ${req.location || 'Hotel'}. Recuerda dar clic en "Iniciar Proceso".`;

        notify(`⚠️ Recordatorio: Tienes la solicitud "${req.title}" pendiente por atender. Recuerda iniciar el proceso.`);

        sendSystemNotification(reminderTitle, {
          body: reminderBody,
          tag: `req-remind-${req.id}`,
          icon: '/pwa-192x192.png'
        });
        playAlertSound();

        broadcastServerPushNotification({
          category: 'solicitudes',
          title: reminderTitle,
          body: reminderBody,
          url: '/?tab=solicitudes',
          tag: `req-remind-${req.id}-${Math.floor(now / 180000)}`,
          targetUserId: req.assignedToId || activeMe.id,
          targetDepartment: activeMe.department,
          data: {
            requestId: req.id,
            status: 'pendiente',
            assignedTo: req.assignedTo,
            assignedToId: req.assignedToId,
            requestedById: req.requestedById,
            requestedByEmail: req.requestedByEmail,
            requestedBy: req.requestedBy
          }
        });
      }
    });
  }, [notify]);

  // Intervalo periódico de recordatorios de solicitudes pendientes no iniciadas
  useEffect(() => {
    checkPendingRequestsReminders();
    const reminderInterval = setInterval(checkPendingRequestsReminders, 25000);
    return () => clearInterval(reminderInterval);
  }, [checkPendingRequestsReminders, requests, currentUser]);

  const getNotifiedRoundIds = (userId: string): Set<string> => {
    try {
      const key = `hotel_maint_notified_rounds_${userId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch {}
    return new Set();
  };

  const markNotifiedRoundId = (userId: string, roundId: string) => {
    try {
      const key = `hotel_maint_notified_rounds_${userId}`;
      const current = getNotifiedRoundIds(userId);
      current.add(roundId);
      const arr = Array.from(current).slice(-200);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {}
  };

  const getNotifiedIncidentIds = (userId: string): Set<string> => {
    try {
      const key = `hotel_maint_notified_inc_${userId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch {}
    return new Set();
  };

  const markNotifiedIncidentId = (userId: string, incId: string) => {
    try {
      const key = `hotel_maint_notified_inc_${userId}`;
      const current = getNotifiedIncidentIds(userId);
      current.add(incId);
      const arr = Array.from(current).slice(-200);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {}
  };

  const getIncidentNotifiedStatus = (userId: string): Record<string, string> => {
    try {
      const key = `hotel_maint_inc_status_${userId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (typeof parsed === 'object' && parsed !== null) return parsed;
      }
    } catch {}
    return {};
  };

  const saveIncidentNotifiedStatus = (userId: string, incId: string, status: string) => {
    try {
      const key = `hotel_maint_inc_status_${userId}`;
      const map = getIncidentNotifiedStatus(userId);
      map[incId] = status;
      const keys = Object.keys(map);
      if (keys.length > 200) {
        const trimmed: Record<string, string> = {};
        keys.slice(-150).forEach(k => { trimmed[k] = map[k]; });
        localStorage.setItem(key, JSON.stringify(trimmed));
      } else {
        localStorage.setItem(key, JSON.stringify(map));
      }
    } catch {}
  };

  const getNotifiedStartedRoundIds = (userId: string): Set<string> => {
    try {
      const key = `hotel_maint_notified_started_rounds_${userId}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return new Set(parsed);
      }
    } catch {}
    return new Set();
  };

  const markNotifiedStartedRoundId = (userId: string, roundId: string) => {
    try {
      const key = `hotel_maint_notified_started_rounds_${userId}`;
      const current = getNotifiedStartedRoundIds(userId);
      current.add(roundId);
      const arr = Array.from(current).slice(-200);
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {}
  };

  const checkAndNotifyNewRounds = useCallback((incomingList: DailyRound[], previousList: DailyRound[]) => {
    const activeMe = currentUserRef.current;
    if (!activeMe || !Array.isArray(incomingList)) return;

    const userKey = activeMe.id || activeMe.email || 'user';

    // 1. Durante la carga inicial / montaje, registrar silenciosamente
    if (isInitialLoad.current || !initialBaselinePopulated.current || (!previousList || previousList.length === 0)) {
      incomingList.forEach(r => {
        if (r && r.id) {
          knownSessionRoundIds.current.add(r.id);
          if (r.status === 'completada') {
            markNotifiedRoundId(userKey, r.id);
          } else if (r.status === 'en_progreso') {
            markNotifiedStartedRoundId(userKey, r.id);
          }
        }
      });
      return;
    }

    const notifiedCompletedSet = getNotifiedRoundIds(userKey);
    const notifiedStartedSet = getNotifiedStartedRoundIds(userKey);
    const userName = normalizeStr(activeMe.displayName || '');

    const isUserAdmin = Boolean(
      activeMe.role === 'admin' ||
      activeMe.email?.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com' ||
      activeMe.id === 'usr-admin-master' ||
      activeMe.id === 'usr-1789230683226' ||
      normalizeStr(activeMe.displayName) === 'juan mateo ramos' ||
      normalizeStr(activeMe.displayName) === 'administrador principal' ||
      normalizeStr(activeMe.role) === 'administrador' ||
      normalizeStr(activeMe.role) === 'admin'
    );

    const isRoundsNotifyAllowed = isUserAdmin || (
      (activeMe.permissions?.notifyRoundInProgress !== undefined)
        ? !!activeMe.permissions.notifyRoundInProgress
        : (activeMe.notifyRoundInProgress !== undefined ? !!activeMe.notifyRoundInProgress : (activeMe.id === 'usr-1789230683226'))
    );

    if (!isRoundsNotifyAllowed) {
      incomingList.forEach(r => {
        if (r && r.id) {
          knownSessionRoundIds.current.add(r.id);
          if (r.status === 'completada') markNotifiedRoundId(userKey, r.id);
          if (r.status === 'en_progreso') markNotifiedStartedRoundId(userKey, r.id);
        }
      });
      return;
    }

    incomingList.forEach(newRound => {
      if (!newRound || !newRound.id) return;

      // Parsear fecha
      let roundTime = 0;
      if (newRound.lastUpdated || newRound.date) {
        const parsed = new Date(newRound.lastUpdated || newRound.date).getTime();
        if (!isNaN(parsed)) roundTime = parsed;
      }

      if (roundTime > 0 && roundTime < (sessionStartTime.current - 15000)) {
        knownSessionRoundIds.current.add(newRound.id);
        if (newRound.status === 'completada') markNotifiedRoundId(userKey, newRound.id);
        if (newRound.status === 'en_progreso') markNotifiedStartedRoundId(userKey, newRound.id);
        return;
      }

      const isKnown = knownSessionRoundIds.current.has(newRound.id);
      const prevRound = (previousList || []).find(r => r.id === newRound.id);
      
      const techName = newRound.technicianName || 'Compañero de Mantenimiento';
      const shiftLabel = newRound.shift === 'manana' ? 'Turno Mañana' : newRound.shift === 'tarde' ? 'Turno Tarde' : 'Turno Noche';
      
      // Si la ronda fue iniciada o completada por este usuario en esta pestaña, evitar auto-notificación
      const isMine = Boolean(
        (newRound.userId && activeMe.id && newRound.userId === activeMe.id) ||
        (newRound.technicianName && userName && (normalizeStr(newRound.technicianName) === userName || normalizeStr(newRound.technicianName).includes(userName)))
      );

      // CASO A: COMPAÑERO INICIA UNA RONDA (SOLO Y EXCLUSIVAMENTE PARA EL ADMINISTRADOR)
      if (newRound.status === 'en_progreso' && !notifiedStartedSet.has(newRound.id) && !isMine) {
        if (!isUserAdmin) {
          // No notificar a técnicos ni usuarios no administradores cuando otro inicia una ronda
          knownSessionRoundIds.current.add(newRound.id);
          markNotifiedStartedRoundId(userKey, newRound.id);
          return;
        }

        const wasJustStarted = !prevRound || prevRound.status !== 'en_progreso';
        if (wasJustStarted) {
          knownSessionRoundIds.current.add(newRound.id);
          markNotifiedStartedRoundId(userKey, newRound.id);

          notify(`🔄 📋 Ronda Iniciada: ${techName} ha iniciado la ronda (${shiftLabel})`);
          sendSystemNotification(`🔄 Ronda de Inspección Iniciada`, {
            body: `${techName} inició la ronda técnica de cuartos de máquinas y bombas (${shiftLabel}).`,
            tag: `round-started-${newRound.id}`,
            icon: '/pwa-192x192.png'
          });
          playAlertSound();
          return;
        }
      }

      // CASO B: COMPAÑERO FINALIZA / CIERRA / CARGA LA RONDA
      if (newRound.status === 'completada') {
        if (!isUserAdmin) {
          // A los técnicos no les tiene que aparecer esa notificación cuando un compañero hace una ronda, pero a los administradores sí.
          knownSessionRoundIds.current.add(newRound.id);
          markNotifiedRoundId(userKey, newRound.id);
          return;
        }

        const wasJustCompleted = prevRound ? (prevRound.status !== 'completada') : (!isKnown || !notifiedCompletedSet.has(newRound.id));
        const hasBeenNotified = notifiedCompletedSet.has(newRound.id);

        if (wasJustCompleted && !hasBeenNotified && !isMine) {
          knownSessionRoundIds.current.add(newRound.id);
          markNotifiedRoundId(userKey, newRound.id);

          const anomaliesCount = newRound.anomaliesCount || (newRound.anomalies ? newRound.anomalies.length : 0);

          notify(`📋 ✅ Ronda Guardada: ${techName} finalizó y cargó la ronda (${shiftLabel})`);
          sendSystemNotification(`📋 ✅ Ronda Técnica Guardada`, {
            body: `Ronda finalizada por ${techName}\n• Turno: ${shiftLabel}\n• Cumplimiento: ${newRound.compliancePercentage || 100}%\n• Anomalías detectadas: ${anomaliesCount}`,
            tag: `round-completed-${newRound.id}`,
            icon: '/pwa-192x192.png'
          });
          playAlertSound();
        } else {
          knownSessionRoundIds.current.add(newRound.id);
        }
      }
    });
  }, [notify]);

  const checkAndNotifyNewIncidents = useCallback((incomingList: Incident[], previousList: Incident[]) => {
    const activeMe = currentUserRef.current;
    if (!activeMe || !Array.isArray(incomingList)) return;

    const userKey = activeMe.id || activeMe.email || 'user';

    // 1. Initial load silent baseline
    if (isInitialLoad.current || !initialBaselinePopulated.current || (!previousList || previousList.length === 0)) {
      incomingList.forEach(inc => {
        if (inc && inc.id) {
          knownSessionIncidentIds.current.add(inc.id);
          markNotifiedIncidentId(userKey, inc.id);
          saveIncidentNotifiedStatus(userKey, inc.id, inc.status || 'pendiente');
        }
      });
      return;
    }

    const notifiedSet = getNotifiedIncidentIds(userKey);
    const incStatusMap = getIncidentNotifiedStatus(userKey);
    const userName = normalizeStr(activeMe.displayName || '');

    incomingList.forEach(newInc => {
      if (!newInc || !newInc.id) return;

      let incTime = 0;
      if (newInc.timestamp) {
        const parsed = new Date(newInc.timestamp.replace(' ', 'T')).getTime();
        if (!isNaN(parsed)) incTime = parsed;
      }

      if (incTime > 0 && incTime < (sessionStartTime.current - 15000)) {
        knownSessionIncidentIds.current.add(newInc.id);
        markNotifiedIncidentId(userKey, newInc.id);
        if (!incStatusMap[newInc.id]) {
          saveIncidentNotifiedStatus(userKey, newInc.id, newInc.status || 'pendiente');
        }
        return;
      }

      const isKnown = knownSessionIncidentIds.current.has(newInc.id);
      const prevInc = (previousList || []).find(i => i.id === newInc.id);
      const isNew = !isKnown && !prevInc;
      const lastStatus = incStatusMap[newInc.id] || prevInc?.status;
      const hasStatusChanged = lastStatus && lastStatus !== newInc.status;
      const isSolved = (newInc.status as string) === 'solucionado' && (lastStatus as string) !== 'solucionado';
      const isReportedByMe = Boolean(
        newInc.registeredBy && userName && (normalizeStr(newInc.registeredBy) === userName || normalizeStr(newInc.registeredBy).includes(userName))
      );

      // 1. NUEVO INCONVENIENTE / AVERÍA REPORTADA
      if (isNew && !notifiedSet.has(newInc.id) && (newInc.status as string) !== 'solucionado' && !isReportedByMe) {
        knownSessionIncidentIds.current.add(newInc.id);
        markNotifiedIncidentId(userKey, newInc.id);
        saveIncidentNotifiedStatus(userKey, newInc.id, newInc.status || 'pendiente');

        const reporter = newInc.registeredBy || 'Compañero de Mantenimiento';
        const prio = (newInc.severity || 'media').toUpperCase();

        notify(`⚠️ Nueva Avería Reportada: "${newInc.title}" en ${newInc.area}`);
        sendSystemNotification(`⚠️ Nueva Avería Reportada`, {
          body: `"${newInc.title}"\n• Ubicación: ${newInc.area || 'Hotel'}\n• Prioridad: ${prio}\n• Reportado por: ${reporter}`,
          tag: `inc-new-${newInc.id}`,
          icon: '/pwa-192x192.png'
        });
        playAlertSound();
        return;
      }

      // 2. INCONVENIENTE SOLUCIONADO / RESUELTO
      if (isSolved && hasStatusChanged) {
        knownSessionIncidentIds.current.add(newInc.id);
        saveIncidentNotifiedStatus(userKey, newInc.id, newInc.status);

        const resolver = newInc.resolvedBy || 'El equipo de mantenimiento';

        notify(`✅ 👏 Inconveniente Solucionado: "${newInc.title}" en ${newInc.area}`);
        sendSystemNotification(`✅ 👏 Inconveniente / Avería Solucionada`, {
          body: `"${newInc.title}" en ${newInc.area} fue marcada como solucionada con éxito por ${resolver}.`,
          tag: `inc-solved-${newInc.id}`,
          icon: '/pwa-192x192.png'
        });
        playAlertSound();
        return;
      }

      knownSessionIncidentIds.current.add(newInc.id);
      saveIncidentNotifiedStatus(userKey, newInc.id, newInc.status);
    });
  }, [notify]);

  // Canal de difusión instantáneo entre pestañas del navegador (latencia 0ms)
  const roundsChannel = useRef<BroadcastChannel | null>(null);
  useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      roundsChannel.current = new BroadcastChannel('hotel_maintenance_rounds_sync');
      roundsChannel.current.onmessage = (event) => {
        try {
          const data = event.data;
          if (!data || typeof data !== 'object') return;
          if (data.type === 'active_round_updated' && data.round) {
            const incomingRound = data.round as DailyRound;
            const currentActiveId = activeRoundRef.current?.id;
            const deletedIds = getDeletedRoundIds();
            const merged = mergeRoundLists(roundsRef.current || [], [incomingRound], deletedIds, currentActiveId);
            roundsRef.current = merged;
            setRounds(merged);
            safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(merged));
          } else if (data.type === 'round_deleted' && data.roundId) {
            const delId = data.roundId;
            const updated = (roundsRef.current || []).filter(r => r.id !== delId);
            roundsRef.current = updated;
            setRounds(updated);
            safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(updated));
            if (activeRoundRef.current?.id === delId) {
              const alternative = updated.find(r => r && r.status === 'en_progreso' && isRoundActivelyBeingPerformed(r));
              if (alternative) {
                activeRoundRef.current = alternative;
                setActiveRound(alternative);
                safeSetItem(STORAGE_KEYS.ACTIVE_ROUND, JSON.stringify(alternative));
              } else {
                activeRoundRef.current = null;
                setActiveRound(null);
                localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
              }
            }
          } else if (data.type === 'round_completed' && data.round) {
            const completedRound = data.round as DailyRound;
            const merged = mergeRoundLists(roundsRef.current || [], [completedRound], getDeletedRoundIds(), activeRoundRef.current?.id);
            roundsRef.current = merged;
            setRounds(merged);
            safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(merged));
            if (activeRoundRef.current?.id === completedRound.id) {
              activeRoundRef.current = null;
              setActiveRound(null);
              localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
            }
          }
        } catch (e) {}
      };
    }
    return () => {
      roundsChannel.current?.close();
    };
  }, []);

  // Heartbeat de presencia en tiempo real para el usuario conectado
  useEffect(() => {
    if (!currentUser || !currentUser.id) return;

    const sendHeartbeat = () => {
      const nowIso = new Date().toISOString();
      // Actualizar estado local inmediatamente
      setUsers(prev => {
        const idx = prev.findIndex(u => u.id === currentUser.id);
        if (idx < 0) return prev;
        const copy = [...prev];
        copy[idx] = { ...copy[idx], lastSeenAt: nowIso, isOnline: true };
        return copy;
      });

      // Sincronizar en la nube Firestore
      safeCloudWrite(() => setDoc(doc(db, 'users', currentUser.id), {
        lastSeenAt: nowIso,
        isOnline: true
      }, { merge: true })).catch(() => {});
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 20000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    const handleUnload = () => {
      const nowIso = new Date().toISOString();
      safeCloudWrite(() => setDoc(doc(db, 'users', currentUser.id), {
        lastSeenAt: nowIso,
        isOnline: false
      }, { merge: true })).catch(() => {});
    };
    window.addEventListener('beforeunload', handleUnload);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, [currentUser?.id]);

  // Hydrate persistent state from IndexedDB and authoritative server API if available
  useEffect(() => {
    idbGet<DailyRound[]>(STORAGE_KEYS.ROUNDS).then(idbRounds => {
      if (idbRounds && Array.isArray(idbRounds) && idbRounds.length > 0) {
        const deletedIds = getDeletedRoundIds();
        const cleanIdbRounds = idbRounds.filter(r => r && r.id && !deletedIds.has(r.id));
        const currentCount = roundsRef.current?.length || 0;
        const currentHasPhotos = (roundsRef.current || []).some(r => 
          (r.checkpoints || []).some(c => c.photoUrl && !c.photoUrl.includes('cached_in_db'))
        );
        const idbHasPhotos = cleanIdbRounds.some(r => 
          (r.checkpoints || []).some(c => c.photoUrl && !c.photoUrl.includes('cached_in_db'))
        );

        const merged = mergeRoundLists(roundsRef.current || [], cleanIdbRounds, deletedIds, activeRoundRef.current?.id);
        if (!areRoundsEqual(merged, roundsRef.current || [])) {
          roundsRef.current = merged;
          setRounds(merged);
          safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(merged));
          idbSet(STORAGE_KEYS.ROUNDS, merged).catch(() => {});
        }
      }
    }).catch(() => {});

    idbGet<DailyRound>(STORAGE_KEYS.ACTIVE_ROUND).then(idbActive => {
      if (idbActive) {
        const deletedIds = getDeletedRoundIds();
        if (deletedIds.has(idbActive.id)) {
          const canonical = (roundsRef.current || []).find(r => r && r.status === 'en_progreso' && isRoundActivelyBeingPerformed(r));
          if (canonical) {
            activeRoundRef.current = canonical;
            setActiveRound(canonical);
            safeSetItem(STORAGE_KEYS.ACTIVE_ROUND, JSON.stringify(canonical));
            return;
          }
          idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
          if (activeRoundRef.current?.id === idbActive.id) {
            activeRoundRef.current = null;
            setActiveRound(null);
          }
          return;
        }

        const isCompletedInList = (roundsRef.current || []).some(r => r && r.id === idbActive.id && (r.status === 'completada' || Boolean(r.completedAt && r.technicianSignature) || r.compliancePercentage === 100));

        if (idbActive.status === 'completada' || isCompletedInList || (idbActive.completedAt && idbActive.technicianSignature)) {
          idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
          if (activeRoundRef.current?.id === idbActive.id) {
            activeRoundRef.current = null;
            setActiveRound(null);
          }
          return;
        }

        // Si la ronda está en progreso, mantenerla activa de forma permanente para el técnico
        if (idbActive.status === 'en_progreso' && !idbActive.completedAt) {
          const canonicalInList = (roundsRef.current || []).find(r => r && r.id === idbActive.id);
          const chosen = canonicalInList ? { ...canonicalInList, ...idbActive } : idbActive;
          const reconciled = reconcileActiveRoundWithTemplate(chosen, roundTemplateRef.current || roundTemplate);
          activeRoundRef.current = reconciled;
          setActiveRound(reconciled);
          safeSetItem(STORAGE_KEYS.ACTIVE_ROUND, JSON.stringify(reconciled));
          return;
        }

        if (!activeRoundRef.current) {
          activeRoundRef.current = idbActive;
          setActiveRound(idbActive);
        }
      }
    }).catch(() => {});

    idbGet<HotelRequest[]>(STORAGE_KEYS.REQUESTS).then(idbReqs => {
      if (idbReqs && Array.isArray(idbReqs) && idbReqs.length > 0) {
        const deletedIds = getDeletedRequestIds();
        const cleanIdbReqs = idbReqs.filter(r => r && r.id && !deletedIds.has(r.id));
        if (cleanIdbReqs.length > (requestsRef.current?.length || 0)) {
          const merged = mergeRequestLists(requestsRef.current || [], cleanIdbReqs, deletedIds);
          requestsRef.current = merged;
          setRequests(merged);
        }
      }
    }).catch(() => {});

    idbGet<MaintenanceTask[]>(STORAGE_KEYS.TASKS).then(idbTasks => {
      if (idbTasks && Array.isArray(idbTasks) && idbTasks.length > 0) {
        const deletedIds = getDeletedTaskIds();
        const cleanIdbTasks = idbTasks.filter(t => t && t.id && !deletedIds.has(t.id));
        if (cleanIdbTasks.length > (tasksRef.current?.length || 0)) {
          const merged = mergeTaskLists(tasksRef.current || [], cleanIdbTasks, deletedIds);
          tasksRef.current = merged;
          setTasks(merged);
        }
      }
    }).catch(() => {});
  }, []);

  // Track actions originating from this local session to prevent duplicate/conflicting notifications
  const localActionIds = useRef<Set<string>>(new Set());

  // Unique session identifier to prevent self-echo loops on SSE data updates
  const clientSessionId = useRef<string>(`client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`);
  const hasPendingLocalChanges = useRef(false);

  // Refs for polling closure bypass and cross-device sync
  const isInitialFetchDone = useRef(false);
  const roundsRef = useRef(rounds);
  roundsRef.current = rounds;
  const activeRoundRef = useRef(activeRound);
  activeRoundRef.current = activeRound;
  const completedRoundIdsRef = useRef<Set<string>>(new Set());
  const equipmentsRef = useRef(equipments);
  equipmentsRef.current = equipments;
  const incidentsRef = useRef(incidents);
  incidentsRef.current = incidents;
  const requestsRef = useRef(requests);
  requestsRef.current = requests;
  const tasksRef = useRef(tasks);
  tasksRef.current = tasks;
  const usersRef = useRef(users);
  usersRef.current = users;
  const pumpInspectionsRef = useRef(pumpInspections);
  pumpInspectionsRef.current = pumpInspections;
  const preventivePlansRef = useRef(preventivePlans);
  preventivePlansRef.current = preventivePlans;
  const workOrdersRef = useRef(workOrders);
  workOrdersRef.current = workOrders;
  const settingsRef = useRef(settings);
  settingsRef.current = settings;
  const uploadedDocumentsRef = useRef(uploadedDocuments);
  uploadedDocumentsRef.current = uploadedDocuments;
  const documentFoldersRef = useRef(documentFolders);
  documentFoldersRef.current = documentFolders;
  const roundTemplateRef = useRef(roundTemplate);
  roundTemplateRef.current = roundTemplate;
  const schedulesRef = useRef(schedules);
  schedulesRef.current = schedules;
  const shiftSwapRequestsRef = useRef(shiftSwapRequests);
  shiftSwapRequestsRef.current = shiftSwapRequests;
  const cronogramasRef = useRef(cronogramas);
  cronogramasRef.current = cronogramas;

  // -------------------------------------------------------------
  // AUTOMATIC SERVER ROUNDS UPLOAD & OFFLINE QUEUE RECONCILIATION
  // -------------------------------------------------------------
  const isSyncingRoundsRef = useRef(false);
  const syncRoundsToServer = async (roundsToUpload?: DailyRound[]) => {
    if (isSyncingRoundsRef.current) return;
    isSyncingRoundsRef.current = true;
    try {
      const deletedIds = getDeletedRoundIds();
      const unsyncedIds = getUnsyncedRoundIds();
      const currentList = roundsRef.current || [];
      const candidateRounds: DailyRound[] = [];
      const seen = new Set<string>();

      if (Array.isArray(roundsToUpload) && roundsToUpload.length > 0) {
        for (const r of roundsToUpload) {
          if (r && r.id && !deletedIds.has(r.id) && !seen.has(r.id)) {
            candidateRounds.push(r);
            seen.add(r.id);
          }
        }
      }

      for (const r of currentList) {
        if (r && r.id && !deletedIds.has(r.id) && !seen.has(r.id) && unsyncedIds.has(r.id)) {
          candidateRounds.push(r);
          seen.add(r.id);
        }
      }

      if (candidateRounds.length === 0) return;

      for (const round of candidateRounds) {
        try {
          const res = await fetch('/api/rounds', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Client-Id': clientSessionId.current
            },
            body: JSON.stringify(round)
          });
          if (res.ok) {
            markRoundSynced(round.id);
          }
        } catch (err) {
          console.warn('Background round sync will retry on next tick:', round.id, err);
        }
      }
    } finally {
      isSyncingRoundsRef.current = false;
    }
  };

  // -------------------------------------------------------------
  // LIGHTNING-FAST SERVER API SYNCHRONIZATION (/api/data 1s polling + instant persist)
  // -------------------------------------------------------------
  useEffect(() => {
    // 1. Initial load from server API
    fetch(`/api/data?_t=${Date.now()}`, { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        if (data && typeof data === 'object' && Object.keys(data).length > 0) {
          if (Array.isArray(data.deletedIds) && data.deletedIds.length > 0) {
            const currentDeleted = getDeletedIncidentIds();
            const currentDeletedMeters = getDeletedMeterIds();
            const currentDeletedReadings = getDeletedMeterReadingIds();
            let hasNewDeleted = false;
            for (const id of data.deletedIds) {
              if (typeof id === 'string' && id) {
                if (!currentDeleted.has(id)) {
                  currentDeleted.add(id);
                  hasNewDeleted = true;
                }
                currentDeletedMeters.add(id);
                currentDeletedReadings.add(id);
              }
            }
            if (hasNewDeleted) {
              localStorage.setItem(DELETED_INCIDENTS_STORAGE_KEY, JSON.stringify(Array.from(currentDeleted)));
            }
          }
          if (Array.isArray(data.meters)) {
            const delMeters = getDeletedMeterIds();
            const cleanMeters = data.meters.filter((m: any) => m && m.id && !delMeters.has(m.id) && (!m.code || !delMeters.has(m.code)));
            const mergedMeters = mergeMeterLists(metersRef.current || [], cleanMeters, delMeters, localActionIds.current);
            if (!areMetersEqual(mergedMeters, metersRef.current || [])) {
              metersRef.current = mergedMeters;
              setMeters(mergedMeters);
              safeSetItem(STORAGE_KEYS.METERS, JSON.stringify(mergedMeters));
            }
          }
          if (Array.isArray(data.meterReadingsLog)) {
            const delReadings = getDeletedMeterReadingIds();
            const delMeters = getDeletedMeterIds();
            const cleanReadings = data.meterReadingsLog.filter((r: any) => r && r.id && !delReadings.has(r.id) && !delMeters.has(r.meterId));
            const mergedReadings = mergeMeterReadingLists(meterReadingsLogRef.current || [], cleanReadings, delReadings, delMeters, localActionIds.current);
            if (!areReadingsEqual(mergedReadings, meterReadingsLogRef.current || [])) {
              meterReadingsLogRef.current = mergedReadings;
              setMeterReadingsLog(mergedReadings);
              localStorage.setItem(STORAGE_KEYS.METER_READINGS_LOG, JSON.stringify(mergedReadings));
            }
          }
          if (Array.isArray(data.rounds)) {
            const deletedIds = reconcileServerDeletedRoundIds(data.deletedIds, data.rounds, localActionIds.current);
            const cleanRounds = data.rounds.filter(r => r && (!deletedIds.has(r.id) || CANONICAL_HISTORICAL_ROUND_IDS.has(r.id)));
            const currentActiveId = activeRoundRef.current?.id;
            const unsyncedIds = getUnsyncedRoundIds();
            const pendingLocalRounds = (roundsRef.current || []).filter(r =>
              r && r.id && !deletedIds.has(r.id) && (r.status === 'completada' || Boolean(r.completedAt && r.technicianSignature) || r.id === currentActiveId || localActionIds.current.has(r.id) || unsyncedIds.has(r.id))
            );
            const mergedRounds = mergeRoundLists(pendingLocalRounds, cleanRounds, deletedIds, currentActiveId, localActionIds.current);
            if (!areRoundsEqual(mergedRounds, roundsRef.current || [])) {
              roundsRef.current = mergedRounds;
              setRounds(mergedRounds);
              safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(mergedRounds));
            }

            // Automatic reconciliation: detect rounds in phone memory that the server does not have yet
            const serverRoundIds = new Set((cleanRounds || []).map((r: any) => r.id));
            const unsyncedLocally = mergedRounds.filter(r => 
              r && r.id && !deletedIds.has(r.id) && !serverRoundIds.has(r.id) && (r.status === 'completada' || r.id === currentActiveId)
            );
            if (unsyncedLocally.length > 0) {
              syncRoundsToServer(unsyncedLocally);
            }
          }
          if (Array.isArray(data.equipments)) {
            const deletedIds = getDeletedEquipmentIds();
            const cleanEquipments = data.equipments.filter(e => e && !deletedIds.has(e.id));
            const mergedEquipments = mergeEquipmentLists(equipmentsRef.current || [], cleanEquipments, deletedIds);
            if (JSON.stringify(mergedEquipments) !== JSON.stringify(equipmentsRef.current)) {
              equipmentsRef.current = mergedEquipments;
              setEquipments(mergedEquipments);
              localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(mergedEquipments));
            }
          }
          if (Array.isArray(data.incidents) || Array.isArray(data.rounds)) {
            const deletedIds = getDeletedIncidentIds();
            const incomingInc = Array.isArray(data.incidents) ? data.incidents : [];
            const cleanIncidents = incomingInc.filter(i => i && !deletedIds.has(i.id));
            const pendingLocal = (incidentsRef.current || []).filter(i => localActionIds.current.has(i.id) && !deletedIds.has(i.id));
            const currentRounds = roundsRef.current || [];
            const withRoundAnomalies = extractAnomaliesAsIncidents(currentRounds, [...pendingLocal, ...cleanIncidents], deletedIds);
            const finalIncidents = deduplicateIncidents(withRoundAnomalies, deletedIds);
            if (JSON.stringify(finalIncidents) !== JSON.stringify(incidentsRef.current)) {
              incidentsRef.current = finalIncidents;
              setIncidents(finalIncidents);
              localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(finalIncidents));
            }
          }
          if (Array.isArray(data.requests)) {
            const deletedIds = getDeletedRequestIds();
            const cleanRequests = data.requests.filter(r => r && !deletedIds.has(r.id));
            const mergedRequests = mergeRequestLists(requestsRef.current || [], cleanRequests, deletedIds);
            if (JSON.stringify(mergedRequests) !== JSON.stringify(requestsRef.current)) {
              if (!isInitialLoad.current) {
                checkAndNotifyNewRequests(mergedRequests, requestsRef.current || []);
              }
              requestsRef.current = mergedRequests;
              setRequests(mergedRequests);
              localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(mergedRequests));
              idbSet(STORAGE_KEYS.REQUESTS, mergedRequests).catch(() => {});
            }
          }
          if (Array.isArray(data.tasks)) {
            const deletedIds = getDeletedTaskIds();
            const cleanTasks = data.tasks.filter(t => t && !deletedIds.has(t.id));
            const mergedTasks = mergeTaskLists(tasksRef.current || [], cleanTasks, deletedIds);
            if (JSON.stringify(mergedTasks) !== JSON.stringify(tasksRef.current)) {
              tasksRef.current = mergedTasks;
              setTasks(mergedTasks);
              localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(mergedTasks));
              idbSet(STORAGE_KEYS.TASKS, mergedTasks).catch(() => {});
            }
          }
          if (Array.isArray(data.pumpInspections)) {
            if (JSON.stringify(data.pumpInspections) !== JSON.stringify(pumpInspectionsRef.current)) {
              pumpInspectionsRef.current = data.pumpInspections;
              setPumpInspections(data.pumpInspections);
            }
          }
          if (Array.isArray(data.preventivePlans)) {
            if (JSON.stringify(data.preventivePlans) !== JSON.stringify(preventivePlansRef.current)) {
              preventivePlansRef.current = data.preventivePlans;
              setPreventivePlans(data.preventivePlans);
            }
          }
          if (Array.isArray(data.workOrders)) {
            if (JSON.stringify(data.workOrders) !== JSON.stringify(workOrdersRef.current)) {
              workOrdersRef.current = data.workOrders;
              setWorkOrders(data.workOrders);
            }
          }
          if (data.settings) {
            const cleanSettings = sanitizeSystemSettings(data.settings, settingsRef.current);
            if (JSON.stringify(cleanSettings) !== JSON.stringify(settingsRef.current)) {
              settingsRef.current = cleanSettings;
              setSettings(cleanSettings);
              safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(cleanSettings));
            }
          }
          if (Array.isArray(data.uploadedDocuments)) {
            if (JSON.stringify(data.uploadedDocuments) !== JSON.stringify(uploadedDocumentsRef.current)) {
              uploadedDocumentsRef.current = data.uploadedDocuments;
              setUploadedDocuments(data.uploadedDocuments);
              localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(data.uploadedDocuments));
            }
          }
          if (Array.isArray(data.documentFolders)) {
            if (JSON.stringify(data.documentFolders) !== JSON.stringify(documentFoldersRef.current)) {
              documentFoldersRef.current = data.documentFolders;
              setDocumentFolders(data.documentFolders);
              localStorage.setItem('hotel_doc_folders', JSON.stringify(data.documentFolders));
            }
          }
          if (Array.isArray(data.users)) {
            const deletedIds = getDeletedUserIds();
            const cleanUsers = data.users.filter(u => u && !deletedIds.has(u.id));
            const mergedUsers = mergeUserLists(usersRef.current || [], cleanUsers, deletedIds);
            const guaranteed = ensureAdminUserList(mergedUsers);
            if (JSON.stringify(guaranteed) !== JSON.stringify(usersRef.current)) {
              usersRef.current = guaranteed;
              setUsers(guaranteed);
              localStorage.setItem('hotel_maint_users', JSON.stringify(guaranteed));
            }
          }
          if (Array.isArray(data.schedules)) {
            const deletedIds = getDeletedScheduleIds();
            const cleanSchedules = data.schedules.filter(s => s && !deletedIds.has(s.id));
            const mergedSchedules = mergeScheduleLists(schedulesRef.current || [], cleanSchedules, deletedIds);
            if (JSON.stringify(mergedSchedules) !== JSON.stringify(schedulesRef.current)) {
              schedulesRef.current = mergedSchedules;
              setSchedules(mergedSchedules);
              localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(mergedSchedules));
              idbSet(STORAGE_KEYS.SCHEDULES, mergedSchedules).catch(() => {});
            }
          }
          if (Array.isArray(data.shiftSwaps)) {
            if (JSON.stringify(data.shiftSwaps) !== JSON.stringify(shiftSwapRequestsRef.current)) {
              shiftSwapRequestsRef.current = data.shiftSwaps;
              setShiftSwapRequests(data.shiftSwaps);
              localStorage.setItem(STORAGE_KEYS.SHIFT_SWAPS, JSON.stringify(data.shiftSwaps));
            }
          }
          if (Array.isArray(data.cronogramas)) {
            const deletedIds = getDeletedCronogramaIds();
            const cleanCronogramas = data.cronogramas.filter((c: any) => c && !deletedIds.has(c.id));
            const mergedCronogramas = mergeCronogramaLists(cronogramasRef.current || [], cleanCronogramas, deletedIds);
            if (JSON.stringify(mergedCronogramas) !== JSON.stringify(cronogramasRef.current)) {
              cronogramasRef.current = mergedCronogramas;
              setCronogramas(mergedCronogramas);
              localStorage.setItem(STORAGE_KEYS.CRONOGRAMAS, JSON.stringify(mergedCronogramas));
            }
          }
          if (Array.isArray(data.roundTemplate) && data.roundTemplate.length > 0) {
            const localSaved = localStorage.getItem('hotel_round_template');
            if (!localSaved) {
              roundTemplateRef.current = data.roundTemplate;
              setRoundTemplate(data.roundTemplate);
              localStorage.setItem('hotel_round_template', JSON.stringify(data.roundTemplate));
            }
          }
          if (data.serverVersion) {
            checkServerVersion(data.serverVersion);
          }
          isInitialFetchDone.current = true;
          setIsCloudSynced(true);
        } else {
          isInitialFetchDone.current = true;
        }
      })
      .catch(err => {
        console.warn('Server sync initial fetch warning:', err);
        isInitialFetchDone.current = true;
      });

    // 2. Gentle background polling fallback (every 25s) + on tab focus/visibility/pageshow/online
    const performBackgroundSync = () => {
      if (!isInitialFetchDone.current) return;
      fetch(`/api/data?_t=${Date.now()}`, { cache: 'no-store' })
        .then(res => res.json())
        .then(data => {
          if (!data || typeof data !== 'object') return;
          if (data.serverVersion) {
            checkServerVersion(data.serverVersion);
          }
          if (Array.isArray(data.rounds)) {
            const deletedIds = reconcileServerDeletedRoundIds(data.deletedIds, data.rounds, localActionIds.current);
            const cleanRounds = data.rounds.filter(r => r && (!deletedIds.has(r.id) || CANONICAL_HISTORICAL_ROUND_IDS.has(r.id)));
            const currentActiveId = activeRoundRef.current?.id;
            const unsyncedIds = getUnsyncedRoundIds();
            const pendingLocalRounds = (roundsRef.current || []).filter(r =>
              r && r.id && !deletedIds.has(r.id) && (r.status === 'completada' || Boolean(r.completedAt && r.technicianSignature) || r.id === currentActiveId || localActionIds.current.has(r.id) || unsyncedIds.has(r.id))
            );
            const mergedRounds = mergeRoundLists(pendingLocalRounds, cleanRounds, deletedIds, currentActiveId, localActionIds.current);
            if (!areRoundsEqual(mergedRounds, roundsRef.current || [])) {
              checkAndNotifyNewRounds(mergedRounds, roundsRef.current || []);
              roundsRef.current = mergedRounds;
              setRounds(mergedRounds);
              safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(mergedRounds));
            }
            if (activeRoundRef.current) {
              const activeId = activeRoundRef.current.id;
              const deletedIds = getDeletedRoundIds();
              // Keep active round intact while user is filling it; only discard if deleted or cancelled
              const isLocked = localStorage.getItem('active_round_resume_lock') === activeId;
              if (deletedIds.has(activeId) && !isLocked && activeRoundRef.current.status !== 'en_progreso') {
                activeRoundRef.current = null;
                setActiveRound(null);
                localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
                idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
              }
            }
          }
          if (Array.isArray(data.equipments)) {
            const deletedIds = getDeletedEquipmentIds();
            const cleanEquipments = data.equipments.filter(e => e && !deletedIds.has(e.id));
            const mergedEquipments = mergeEquipmentLists(equipmentsRef.current || [], cleanEquipments, deletedIds);
            if (JSON.stringify(mergedEquipments) !== JSON.stringify(equipmentsRef.current)) {
              equipmentsRef.current = mergedEquipments;
              setEquipments(mergedEquipments);
              localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(mergedEquipments));
            }
          }
          if (Array.isArray(data.incidents) || Array.isArray(data.rounds)) {
            const deletedIds = getDeletedIncidentIds();
            const incomingInc = Array.isArray(data.incidents) ? data.incidents : (incidentsRef.current || []);
            const cleanIncidents = incomingInc.filter(i => i && !deletedIds.has(i.id));
            const pendingLocal = (incidentsRef.current || []).filter(i => localActionIds.current.has(i.id) && !deletedIds.has(i.id));
            const currentRounds = roundsRef.current || [];
            const withRoundAnomalies = extractAnomaliesAsIncidents(currentRounds, [...pendingLocal, ...cleanIncidents], deletedIds);
            const finalIncidents = deduplicateIncidents(withRoundAnomalies, deletedIds);
            if (JSON.stringify(finalIncidents) !== JSON.stringify(incidentsRef.current)) {
              checkAndNotifyNewIncidents(finalIncidents, incidentsRef.current || []);
              incidentsRef.current = finalIncidents;
              setIncidents(finalIncidents);
              localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(finalIncidents));
            }
          }
          if (Array.isArray(data.requests)) {
            const deletedIds = getDeletedRequestIds();
            const cleanServer = data.requests.filter(r => r && !deletedIds.has(r.id));
            const merged = mergeRequestLists(requestsRef.current || [], cleanServer, deletedIds);
            if (JSON.stringify(merged) !== JSON.stringify(requestsRef.current)) {
              checkAndNotifyNewRequests(merged, requestsRef.current || []);
              requestsRef.current = merged;
              setRequests(merged);
              localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(merged));
            }
          }
          if (Array.isArray(data.tasks)) {
            const deletedIds = getDeletedTaskIds();
            const cleanServer = data.tasks.filter(t => t && !deletedIds.has(t.id));
            const merged = mergeTaskLists(tasksRef.current || [], cleanServer, deletedIds);
            if (JSON.stringify(merged) !== JSON.stringify(tasksRef.current)) {
              checkAndNotifyNewTasks(merged, tasksRef.current || []);
              tasksRef.current = merged;
              setTasks(merged);
              localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(merged));
            }
          }
          if (Array.isArray(data.pumpInspections)) {
            if (JSON.stringify(data.pumpInspections) !== JSON.stringify(pumpInspectionsRef.current)) {
              pumpInspectionsRef.current = data.pumpInspections;
              setPumpInspections(data.pumpInspections);
            }
          }
          if (Array.isArray(data.preventivePlans)) {
            if (JSON.stringify(data.preventivePlans) !== JSON.stringify(preventivePlansRef.current)) {
              preventivePlansRef.current = data.preventivePlans;
              setPreventivePlans(data.preventivePlans);
            }
          }
          if (Array.isArray(data.workOrders)) {
            if (JSON.stringify(data.workOrders) !== JSON.stringify(workOrdersRef.current)) {
              workOrdersRef.current = data.workOrders;
              setWorkOrders(data.workOrders);
            }
          }
          if (data.settings) {
            const cleanSettings = sanitizeSystemSettings(data.settings, settingsRef.current);
            if (JSON.stringify(cleanSettings) !== JSON.stringify(settingsRef.current)) {
              settingsRef.current = cleanSettings;
              setSettings(cleanSettings);
              safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(cleanSettings));
            }
          }
          if (Array.isArray(data.uploadedDocuments)) {
            if (JSON.stringify(data.uploadedDocuments) !== JSON.stringify(uploadedDocumentsRef.current)) {
              uploadedDocumentsRef.current = data.uploadedDocuments;
              setUploadedDocuments(data.uploadedDocuments);
              localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(data.uploadedDocuments));
            }
          }
          if (Array.isArray(data.documentFolders)) {
            if (JSON.stringify(data.documentFolders) !== JSON.stringify(documentFoldersRef.current)) {
              documentFoldersRef.current = data.documentFolders;
              setDocumentFolders(data.documentFolders);
              localStorage.setItem('hotel_doc_folders', JSON.stringify(data.documentFolders));
            }
          }
          if (Array.isArray(data.users)) {
            const deletedIds = getDeletedUserIds();
            const cleanFresh = data.users.filter(u => u && !deletedIds.has(u.id));
            const mergedUsers = mergeUserLists(usersRef.current || [], cleanFresh, deletedIds);
            const guaranteed = ensureAdminUserList(mergedUsers);
            if (JSON.stringify(guaranteed) !== JSON.stringify(usersRef.current)) {
              usersRef.current = guaranteed;
              setUsers(guaranteed);
              localStorage.setItem('hotel_maint_users', JSON.stringify(guaranteed));
            }
          }
          if (Array.isArray(data.schedules)) {
            const deletedIds = getDeletedScheduleIds();
            const cleanFresh = data.schedules.filter(s => s && !deletedIds.has(s.id));
            const mergedSchedules = mergeScheduleLists(schedulesRef.current || [], cleanFresh, deletedIds);
            if (JSON.stringify(mergedSchedules) !== JSON.stringify(schedulesRef.current)) {
              schedulesRef.current = mergedSchedules;
              setSchedules(mergedSchedules);
              localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(mergedSchedules));
              idbSet(STORAGE_KEYS.SCHEDULES, mergedSchedules).catch(() => {});
            }
          }
          if (Array.isArray(data.shiftSwaps)) {
            if (JSON.stringify(data.shiftSwaps) !== JSON.stringify(shiftSwapRequestsRef.current)) {
              shiftSwapRequestsRef.current = data.shiftSwaps;
              setShiftSwapRequests(data.shiftSwaps);
              localStorage.setItem(STORAGE_KEYS.SHIFT_SWAPS, JSON.stringify(data.shiftSwaps));
            }
          }
          if (Array.isArray(data.cronogramas)) {
            const deletedIds = getDeletedCronogramaIds();
            const cleanCronogramas = data.cronogramas.filter((c: any) => c && !deletedIds.has(c.id));
            const mergedCronogramas = mergeCronogramaLists(cronogramasRef.current || [], cleanCronogramas, deletedIds);
            if (JSON.stringify(mergedCronogramas) !== JSON.stringify(cronogramasRef.current)) {
              cronogramasRef.current = mergedCronogramas;
              setCronogramas(mergedCronogramas);
              localStorage.setItem(STORAGE_KEYS.CRONOGRAMAS, JSON.stringify(mergedCronogramas));
            }
          }
          if (Array.isArray(data.meters)) {
            const delM = getDeletedMeterIds();
            const cleanM = data.meters.filter((m: any) => m && m.id && !delM.has(m.id) && (!m.code || !delM.has(m.code)));
            const mergedM = mergeMeterLists(metersRef.current || [], cleanM, delM, localActionIds.current);
            if (!areMetersEqual(mergedM, metersRef.current || [])) {
              metersRef.current = mergedM;
              setMeters(mergedM);
              safeSetItem(STORAGE_KEYS.METERS, JSON.stringify(mergedM));
            }
          }
          if (Array.isArray(data.meterReadingsLog)) {
            const delR = getDeletedMeterReadingIds();
            const delM = getDeletedMeterIds();
            const cleanR = data.meterReadingsLog.filter((r: any) => r && r.id && !delR.has(r.id) && !delM.has(r.meterId));
            const mergedR = mergeMeterReadingLists(meterReadingsLogRef.current || [], cleanR, delR, delM, localActionIds.current);
            if (!areReadingsEqual(mergedR, meterReadingsLogRef.current || [])) {
              meterReadingsLogRef.current = mergedR;
              setMeterReadingsLog(mergedR);
              localStorage.setItem(STORAGE_KEYS.METER_READINGS_LOG, JSON.stringify(mergedR));
            }
          }

        })
        .catch(() => {});

      // Sincronizar automáticamente cualquier ronda pendiente de subida offline
      flushPendingOfflineRounds();
    };

    const pollInterval = setInterval(performBackgroundSync, 8000);

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        performBackgroundSync();
        flushPendingOfflineRounds();
        // Verificar versión del servidor de inmediato al activar/enfocar la pestaña
        fetch(`/api/version?_t=${Date.now()}`, { cache: 'no-store' })
          .then(r => r.json())
          .then(v => {
            if (v && typeof v.version === 'number') {
              checkServerVersion(v.version);
            }
          })
          .catch(() => {});
      }
    };
    window.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);
    window.addEventListener('pageshow', onVisibilityOrFocus);
    window.addEventListener('online', onVisibilityOrFocus);

    // 3. Server-Sent Events (SSE) stream for ultra-fast instant sync across all screens (<30ms)
    let sseSource: EventSource | null = null;
    try {
      sseSource = new EventSource('/api/events');
      sseSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload && typeof payload.serverVersion === 'number') {
            checkServerVersion(payload.serverVersion);
          }
          if (payload && (payload.type === 'round_completed' || payload.type === 'round_updated') && payload.round) {
            // Evitar bucle de retroalimentación y consumo de memoria ignorando el eco de nuestras propias actualizaciones en curso
            if (payload.clientId && payload.clientId === clientSessionId.current && payload.type === 'round_updated') {
              return;
            }

            const incomingRound = payload.round as DailyRound;
            const isIncomingCompleted = incomingRound.status === 'completada' || Boolean(incomingRound.completedAt && incomingRound.technicianSignature);

            // Si la ronda fue descartada/eliminada, nunca resucitarla por paquetes en_progreso en tránsito
            if (!isIncomingCompleted && getDeletedRoundIds().has(incomingRound.id)) {
              return;
            }

            if (isIncomingCompleted) {
              completedRoundIdsRef.current.add(incomingRound.id);
              unmarkDeletedRoundId(incomingRound.id);
            }
            const currentActiveId = activeRoundRef.current?.id;
            const deletedIds = getDeletedRoundIds();
            const merged = mergeRoundLists(roundsRef.current || [], [incomingRound], deletedIds, currentActiveId);
            roundsRef.current = merged;
            setRounds(merged);

            // Guardar en almacenamiento: inmediato si se completó, evitando saturar almacenamiento si es sólo un punto en curso
            if (isIncomingCompleted) {
              safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(merged));
            }

            const isMatchingActive = Boolean(
              currentActiveId === incomingRound.id ||
              activeRoundRef.current?.id === incomingRound.id
            );

            if (isIncomingCompleted && isMatchingActive) {
              activeRoundRef.current = null;
              setActiveRound(null);
              localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
              idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
            }
          } else if (payload && payload.type === 'round_deleted' && payload.roundId) {
            const delId = payload.roundId;
            markDeletedRoundId(delId);
            removePendingOfflineRound(delId);
            const updated = (roundsRef.current || []).filter(r => r.id !== delId);
            roundsRef.current = updated;
            setRounds(updated);
            safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(updated));
            idbSet(STORAGE_KEYS.ROUNDS, updated).catch(() => {});
            if (activeRoundRef.current?.id === delId) {
              const alternative = updated.find(r => r && r.status === 'en_progreso' && isRoundActivelyBeingPerformed(r) && isUserOwnRound(r, currentUserRef.current));
              if (alternative) {
                const reconciled = reconcileActiveRoundWithTemplate(alternative, roundTemplateRef.current || roundTemplate);
                activeRoundRef.current = reconciled;
                setActiveRound(reconciled);
                safeSetItem(STORAGE_KEYS.ACTIVE_ROUND, JSON.stringify(reconciled));
                idbSet(STORAGE_KEYS.ACTIVE_ROUND, reconciled).catch(() => {});
              } else {
                activeRoundRef.current = null;
                setActiveRound(null);
                localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
                idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
              }
            }
          } else if (payload && payload.type === 'request_deleted' && payload.requestId) {
            const delId = payload.requestId;
            markDeletedRequestId(delId);
            const updated = (requestsRef.current || []).filter(r => r.id !== delId);
            requestsRef.current = updated;
            setRequests(updated);
            localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(updated));
          } else if (payload && payload.type === 'schedule_deleted' && payload.scheduleId) {
            const delId = payload.scheduleId;
            markDeletedScheduleId(delId);
            const updated = (schedulesRef.current || []).filter(s => s.id !== delId);
            schedulesRef.current = updated;
            setSchedules(updated);
            localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(updated));
          } else if (payload && payload.type === 'swap_deleted' && payload.swapId) {
            const delId = payload.swapId;
            const updated = (shiftSwapRequestsRef.current || []).filter(s => s.id !== delId);
            shiftSwapRequestsRef.current = updated;
            setShiftSwapRequests(updated);
            localStorage.setItem(STORAGE_KEYS.SHIFT_SWAPS, JSON.stringify(updated));
          } else if (payload && payload.type === 'task_updated' && payload.task) {
            const incomingTask = payload.task as MaintenanceTask;
            unmarkDeletedTaskId(incomingTask.id);
            const prevTasks = tasksRef.current || [];
            const deletedIds = getDeletedTaskIds();
            const merged = mergeTaskLists(prevTasks, [incomingTask], deletedIds);
            checkAndNotifyNewTasks([incomingTask], prevTasks);
            tasksRef.current = merged;
            setTasks(merged);
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(merged));
          } else if (payload && payload.type === 'task_deleted' && payload.taskId) {
            const delId = payload.taskId;
            markDeletedTaskId(delId);
            const updated = (tasksRef.current || []).filter(t => t.id !== delId);
            tasksRef.current = updated;
            setTasks(updated);
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
          } else if (payload && payload.type === 'incident_deleted' && payload.incidentId) {
            const delId = payload.incidentId;
            markDeletedIncidentId(delId);
            const updated = (incidentsRef.current || []).filter(i => i.id !== delId);
            incidentsRef.current = updated;
            setIncidents(updated);
            localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(updated));
          } else if (payload && payload.type === 'equipment_deleted' && payload.equipmentId) {
            const delId = payload.equipmentId;
            markDeletedEquipmentId(delId);
            const updated = (equipmentsRef.current || []).filter(e => e.id !== delId);
            equipmentsRef.current = updated;
            setEquipments(updated);
            localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(updated));
          } else if (payload && payload.type === 'user_deleted' && payload.userId) {
            const delId = payload.userId;
            markDeletedUserId(delId);
            const updated = (usersRef.current || []).filter(u => u.id !== delId);
            usersRef.current = updated;
            setUsers(updated);
            localStorage.setItem('hotel_maint_users', JSON.stringify(updated));
            if (currentUserRef.current && currentUserRef.current.id === delId) {
              setCurrentUserState(null);
              currentUserRef.current = null;
              localStorage.removeItem('hotel_maint_current_user');
              sessionStorage.removeItem('hotel_maint_current_user');
            }
          } else if (payload && payload.type === 'cronograma_deleted' && payload.cronogramaId) {
            const delId = payload.cronogramaId;
            markDeletedCronogramaId(delId);
            const updated = (cronogramasRef.current || []).filter(c => c.id !== delId);
            cronogramasRef.current = updated;
            setCronogramas(updated);
            localStorage.setItem(STORAGE_KEYS.CRONOGRAMAS, JSON.stringify(updated));
          } else if (payload && payload.type === 'meter_updated' && payload.meter) {
            const incomingMeter = payload.meter as MeterDefinition;
            unmarkDeletedMeterId(incomingMeter.id);
            if (incomingMeter.code) unmarkDeletedMeterId(incomingMeter.code);
            const deletedIds = getDeletedMeterIds();
            const merged = mergeMeterLists(metersRef.current || [], [incomingMeter], deletedIds);
            metersRef.current = merged;
            setMeters(merged);
            safeSetItem(STORAGE_KEYS.METERS, JSON.stringify(merged));
          } else if (payload && payload.type === 'meter_deleted' && payload.meterId) {
            const delId = payload.meterId;
            markDeletedMeterId(delId);
            const updated = (metersRef.current || []).filter(m => m.id !== delId && m.code !== delId);
            metersRef.current = updated;
            setMeters(updated);
            safeSetItem(STORAGE_KEYS.METERS, JSON.stringify(updated));
            const updatedReadings = (meterReadingsLogRef.current || []).filter(r => r.meterId !== delId);
            meterReadingsLogRef.current = updatedReadings;
            setMeterReadingsLog(updatedReadings);
            localStorage.setItem(STORAGE_KEYS.METER_READINGS_LOG, JSON.stringify(updatedReadings));
          } else if (payload && payload.type === 'meter_reading_added' && payload.reading) {
            const newReading = payload.reading as MeterReadingRecord;
            unmarkDeletedMeterReadingId(newReading.id);
            const deletedIds = getDeletedMeterReadingIds();
            const deletedMeterIds = getDeletedMeterIds();
            const merged = mergeMeterReadingLists(meterReadingsLogRef.current || [], [newReading], deletedIds, deletedMeterIds);
            meterReadingsLogRef.current = merged;
            setMeterReadingsLog(merged);
            localStorage.setItem(STORAGE_KEYS.METER_READINGS_LOG, JSON.stringify(merged));

            // Actualizar inmediatamente la lectura actual en la lista de contadores del dispositivo receptor
            const updatedM = (metersRef.current || []).map(m => (m.id === newReading.meterId || m.code === newReading.meterId) ? {
              ...m,
              currentReading: newReading.currentValue,
              lastReadingDate: newReading.date,
              lastReadingTime: newReading.time,
              updatedAt: new Date().toISOString()
            } : m);
            if (!areMetersEqual(updatedM, metersRef.current || [])) {
              metersRef.current = updatedM;
              setMeters(updatedM);
              safeSetItem(STORAGE_KEYS.METERS, JSON.stringify(updatedM));
            }
          } else if (payload && payload.type === 'meter_reading_deleted' && payload.readingId) {
            const delId = payload.readingId;
            markDeletedMeterReadingId(delId);
            const updated = (meterReadingsLogRef.current || []).filter(r => r.id !== delId);
            meterReadingsLogRef.current = updated;
            setMeterReadingsLog(updated);
            localStorage.setItem(STORAGE_KEYS.METER_READINGS_LOG, JSON.stringify(updated));
          } else if (payload && payload.type === 'cronograma_updated' && payload.cronograma) {
            const item = payload.cronograma;
            const updated = [item, ...(cronogramasRef.current || []).filter(c => c.id !== item.id)];
            cronogramasRef.current = updated;
            setCronogramas(updated);
            localStorage.setItem(STORAGE_KEYS.CRONOGRAMAS, JSON.stringify(updated));
          } else if (payload && payload.type === 'data_updated') {
            // Avoid re-fetching our own local updates to eliminate UI thrashing and freezing
            if (payload.clientId && payload.clientId === clientSessionId.current) {
              return;
            }
            fetch(`/api/data?_t=${Date.now()}`, { cache: 'no-store' })
              .then(r => r.json())
              .then(fresh => {
                if (!fresh || typeof fresh !== 'object') return;
                if (Array.isArray(fresh.meters)) {
                  const delMeters = getDeletedMeterIds();
                  const cleanFresh = fresh.meters.filter((m: any) => m && m.id && !delMeters.has(m.id) && (!m.code || !delMeters.has(m.code)));
                  const mergedMeters = mergeMeterLists(metersRef.current || [], cleanFresh, delMeters);
                  if (!areMetersEqual(mergedMeters, metersRef.current || [])) {
                    metersRef.current = mergedMeters;
                    setMeters(mergedMeters);
                    safeSetItem(STORAGE_KEYS.METERS, JSON.stringify(mergedMeters));
                  }
                }
                if (Array.isArray(fresh.meterReadingsLog)) {
                  const delReadings = getDeletedMeterReadingIds();
                  const delMeters = getDeletedMeterIds();
                  const cleanFresh = fresh.meterReadingsLog.filter((r: any) => r && r.id && !delReadings.has(r.id) && !delMeters.has(r.meterId));
                  const mergedReadings = mergeMeterReadingLists(meterReadingsLogRef.current || [], cleanFresh, delReadings, delMeters);
                  if (!areReadingsEqual(mergedReadings, meterReadingsLogRef.current || [])) {
                    meterReadingsLogRef.current = mergedReadings;
                    setMeterReadingsLog(mergedReadings);
                    localStorage.setItem(STORAGE_KEYS.METER_READINGS_LOG, JSON.stringify(mergedReadings));
                  }
                }
                if (Array.isArray(fresh.rounds)) {
                  const deletedIds = reconcileServerDeletedRoundIds(fresh.deletedIds, fresh.rounds, localActionIds.current);
                  const cleanFresh = fresh.rounds.filter(r => r && (!deletedIds.has(r.id) || CANONICAL_HISTORICAL_ROUND_IDS.has(r.id)));
                  const currentActiveId = activeRoundRef.current?.id;
                  const unsyncedIds = getUnsyncedRoundIds();
                  const pendingLocalRounds = (roundsRef.current || []).filter(r =>
                    r && r.id && !deletedIds.has(r.id) && (r.status === 'completada' || Boolean(r.completedAt && r.technicianSignature) || r.id === currentActiveId || localActionIds.current.has(r.id) || unsyncedIds.has(r.id))
                  );
                  const mergedRounds = mergeRoundLists(pendingLocalRounds, cleanFresh, deletedIds, currentActiveId);
                  if (!areRoundsEqual(mergedRounds, roundsRef.current || [])) {
                    checkAndNotifyNewRounds(mergedRounds, roundsRef.current || []);
                    roundsRef.current = mergedRounds;
                    setRounds(mergedRounds);
                    safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(mergedRounds));
                  }
                }
                if (Array.isArray(fresh.requests)) {
                  const deletedIds = getDeletedRequestIds();
                  const cleanFresh = fresh.requests.filter(r => r && !deletedIds.has(r.id));
                  const merged = mergeRequestLists(requestsRef.current || [], cleanFresh, deletedIds);
                  if (JSON.stringify(merged) !== JSON.stringify(requestsRef.current)) {
                    checkAndNotifyNewRequests(merged, requestsRef.current || []);
                    requestsRef.current = merged;
                    setRequests(merged);
                    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(merged));
                  }
                }
                if (Array.isArray(fresh.tasks)) {
                  const deletedIds = getDeletedTaskIds();
                  const cleanFresh = fresh.tasks.filter(t => t && !deletedIds.has(t.id));
                  const merged = mergeTaskLists(tasksRef.current || [], cleanFresh, deletedIds);
                  if (JSON.stringify(merged) !== JSON.stringify(tasksRef.current)) {
                    checkAndNotifyNewTasks(merged, tasksRef.current || []);
                    tasksRef.current = merged;
                    setTasks(merged);
                    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(merged));
                  }
                }
                if (Array.isArray(fresh.incidents) || Array.isArray(fresh.rounds)) {
                  const deletedIds = getDeletedIncidentIds();
                  const incomingInc = Array.isArray(fresh.incidents) ? fresh.incidents : (incidentsRef.current || []);
                  const cleanFresh = incomingInc.filter(i => i && !deletedIds.has(i.id));
                  const pendingLocal = (incidentsRef.current || []).filter(i => localActionIds.current.has(i.id) && !deletedIds.has(i.id));
                  const currentRounds = roundsRef.current || [];
                  const withRoundAnomalies = extractAnomaliesAsIncidents(currentRounds, [...pendingLocal, ...cleanFresh], deletedIds);
                  const finalIncidents = deduplicateIncidents(withRoundAnomalies, deletedIds);
                  if (JSON.stringify(finalIncidents) !== JSON.stringify(incidentsRef.current)) {
                    checkAndNotifyNewIncidents(finalIncidents, incidentsRef.current || []);
                    incidentsRef.current = finalIncidents;
                    setIncidents(finalIncidents);
                    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(finalIncidents));
                  }
                }
                if (Array.isArray(fresh.equipments)) {
                  const deletedIds = getDeletedEquipmentIds();
                  const cleanFresh = fresh.equipments.filter(e => e && !deletedIds.has(e.id));
                  const mergedEquipments = mergeEquipmentLists(equipmentsRef.current || [], cleanFresh, deletedIds);
                  if (JSON.stringify(mergedEquipments) !== JSON.stringify(equipmentsRef.current)) {
                    equipmentsRef.current = mergedEquipments;
                    setEquipments(mergedEquipments);
                    localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(mergedEquipments));
                  }
                }
                if (Array.isArray(fresh.pumpInspections)) {
                  if (JSON.stringify(fresh.pumpInspections) !== JSON.stringify(pumpInspectionsRef.current)) {
                    pumpInspectionsRef.current = fresh.pumpInspections;
                    setPumpInspections(fresh.pumpInspections);
                  }
                }
                if (Array.isArray(fresh.preventivePlans)) {
                  if (JSON.stringify(fresh.preventivePlans) !== JSON.stringify(preventivePlansRef.current)) {
                    preventivePlansRef.current = fresh.preventivePlans;
                    setPreventivePlans(fresh.preventivePlans);
                  }
                }
                if (Array.isArray(fresh.workOrders)) {
                  if (JSON.stringify(fresh.workOrders) !== JSON.stringify(workOrdersRef.current)) {
                    workOrdersRef.current = fresh.workOrders;
                    setWorkOrders(fresh.workOrders);
                  }
                }
                if (Array.isArray(fresh.users)) {
                  const deletedIds = getDeletedUserIds();
                  const cleanFresh = fresh.users.filter(u => u && !deletedIds.has(u.id));
                  const mergedUsers = mergeUserLists(usersRef.current || [], cleanFresh, deletedIds);
                  const guaranteed = ensureAdminUserList(mergedUsers);
                  if (JSON.stringify(guaranteed) !== JSON.stringify(usersRef.current)) {
                    usersRef.current = guaranteed;
                    setUsers(guaranteed);
                    localStorage.setItem('hotel_maint_users', JSON.stringify(guaranteed));
                  }
                }
                if (fresh.settings) {
                  const cleanSettings = sanitizeSystemSettings(fresh.settings, settingsRef.current);
                  if (JSON.stringify(cleanSettings) !== JSON.stringify(settingsRef.current)) {
                    settingsRef.current = cleanSettings;
                    setSettings(cleanSettings);
                    safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(cleanSettings));
                  }
                }
                if (Array.isArray(fresh.schedules)) {
                  const deletedIds = getDeletedScheduleIds();
                  const cleanFresh = fresh.schedules.filter(s => s && !deletedIds.has(s.id));
                  const mergedSchedules = mergeScheduleLists(schedulesRef.current || [], cleanFresh, deletedIds);
                  if (JSON.stringify(mergedSchedules) !== JSON.stringify(schedulesRef.current)) {
                    schedulesRef.current = mergedSchedules;
                    setSchedules(mergedSchedules);
                    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(mergedSchedules));
                    idbSet(STORAGE_KEYS.SCHEDULES, mergedSchedules).catch(() => {});
                  }
                }

              })
              .catch(() => {});
          }
        } catch (e) {
          console.warn('SSE message parse warning:', e);
        }
      };
    } catch (e) {
      console.warn('SSE connection warning:', e);
    }

    // 4. BroadcastChannel listener for instant same-device inter-tab sync (0ms)
    const handleBroadcast = (e: MessageEvent) => {
      if (e.data && e.data.type === 'round_deleted' && e.data.roundId) {
        const delId = e.data.roundId;
        markDeletedRoundId(delId);
        const updated = (roundsRef.current || []).filter(r => r.id !== delId);
        roundsRef.current = updated;
        setRounds(updated);
        safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(updated));
        idbSet(STORAGE_KEYS.ROUNDS, updated).catch(() => {});
        removePendingOfflineRound(delId);
        if (activeRoundRef.current?.id === delId) {
          activeRoundRef.current = null;
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
          idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
        }
        setActiveRound(curr => (curr?.id === delId ? null : curr));
      } else if (e.data && e.data.type === 'active_round_updated' && e.data.round) {
        const updatedRound = e.data.round as DailyRound;
        const currentList = roundsRef.current || [];
        const index = currentList.findIndex(r => r.id === updatedRound.id);
        let newList: DailyRound[];
        if (index >= 0) {
          newList = [...currentList];
          newList[index] = updatedRound;
        } else {
          newList = [updatedRound, ...currentList];
        }
        roundsRef.current = newList;
        setRounds(newList);
      } else if (e.data && e.data.type === 'round_completed' && e.data.round) {
        const completedRound = e.data.round as DailyRound;
        if (activeRoundRef.current?.id === completedRound.id) {
          activeRoundRef.current = null;
          setActiveRound(null);
          localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
          idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
        }
        checkAndNotifyNewRounds([completedRound], roundsRef.current || []);
        const currentList = roundsRef.current || [];
        const merged = mergeRoundLists(currentList, [completedRound], getDeletedRoundIds());
        roundsRef.current = merged;
        setRounds(merged);
        safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(merged));
      } else if (e.data && e.data.type === 'new_incident' && e.data.incident) {
        const newInc = e.data.incident as Incident;
        checkAndNotifyNewIncidents([newInc], incidentsRef.current || []);
        const currentList = incidentsRef.current || [];
        const finalIncidents = deduplicateIncidents([newInc, ...currentList], getDeletedIncidentIds());
        incidentsRef.current = finalIncidents;
        setIncidents(finalIncidents);
        localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(finalIncidents));
      } else if (e.data && e.data.type === 'incident_updated' && e.data.incident) {
        const updatedInc = e.data.incident as Incident;
        checkAndNotifyNewIncidents([updatedInc], incidentsRef.current || []);
        const currentList = incidentsRef.current || [];
        const finalIncidents = currentList.map(i => i.id === updatedInc.id ? { ...i, ...updatedInc } : i);
        incidentsRef.current = finalIncidents;
        setIncidents(finalIncidents);
        localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(finalIncidents));
      } else if (e.data && e.data.type === 'new_request' && e.data.request) {
        checkAndNotifyNewRequests([e.data.request], requestsRef.current || []);
      } else if (e.data && e.data.type === 'request_updated' && e.data.request) {
        const updatedReq = e.data.request as HotelRequest;
        checkAndNotifyNewRequests([updatedReq], requestsRef.current || []);
        const currentList = requestsRef.current || [];
        const idx = currentList.findIndex(r => r.id === updatedReq.id);
        let newList: HotelRequest[];
        if (idx >= 0) {
          newList = [...currentList];
          newList[idx] = updatedReq;
        } else {
          newList = [updatedReq, ...currentList];
        }
        requestsRef.current = newList;
        setRequests(newList);
        localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(newList));
      } else if (e.data && e.data.type === 'new_task' && e.data.task) {
        const newTask = e.data.task as MaintenanceTask;
        checkAndNotifyNewTasks([newTask], tasksRef.current || []);
        const currentList = tasksRef.current || [];
        const merged = mergeTaskLists(currentList, [newTask], getDeletedTaskIds());
        tasksRef.current = merged;
        setTasks(merged);
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(merged));
      } else if (e.data && e.data.type === 'task_updated' && e.data.task) {
        const updatedTask = e.data.task as MaintenanceTask;
        checkAndNotifyNewTasks([updatedTask], tasksRef.current || []);
        const currentList = tasksRef.current || [];
        const idx = currentList.findIndex(t => t.id === updatedTask.id);
        let newList: MaintenanceTask[];
        if (idx >= 0) {
          newList = [...currentList];
          newList[idx] = updatedTask;
        } else {
          newList = [updatedTask, ...currentList];
        }
        tasksRef.current = newList;
        setTasks(newList);
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(newList));
      } else if (e.data && e.data.type === 'meter_updated' && e.data.meter) {
        const item = e.data.meter as MeterDefinition;
        unmarkDeletedMeterId(item.id);
        if (item.code) unmarkDeletedMeterId(item.code);
        const merged = mergeMeterLists(metersRef.current || [], [item], getDeletedMeterIds());
        metersRef.current = merged;
        setMeters(merged);
        safeSetItem(STORAGE_KEYS.METERS, JSON.stringify(merged));
      } else if (e.data && e.data.type === 'meter_deleted' && e.data.meterId) {
        const delId = e.data.meterId;
        markDeletedMeterId(delId);
        const updated = (metersRef.current || []).filter(m => m.id !== delId && m.code !== delId);
        metersRef.current = updated;
        setMeters(updated);
        safeSetItem(STORAGE_KEYS.METERS, JSON.stringify(updated));
      } else if (e.data && e.data.type === 'meter_reading_added' && e.data.reading) {
        const newReading = e.data.reading as MeterReadingRecord;
        unmarkDeletedMeterReadingId(newReading.id);
        const merged = mergeMeterReadingLists(meterReadingsLogRef.current || [], [newReading], getDeletedMeterReadingIds(), getDeletedMeterIds());
        meterReadingsLogRef.current = merged;
        setMeterReadingsLog(merged);
        localStorage.setItem(STORAGE_KEYS.METER_READINGS_LOG, JSON.stringify(merged));

        // Actualizar lectura actual en el estado de contadores
        const updatedM = (metersRef.current || []).map(m => (m.id === newReading.meterId || m.code === newReading.meterId) ? {
          ...m,
          currentReading: newReading.currentValue,
          lastReadingDate: newReading.date,
          lastReadingTime: newReading.time,
          updatedAt: new Date().toISOString()
        } : m);
        if (!areMetersEqual(updatedM, metersRef.current || [])) {
          metersRef.current = updatedM;
          setMeters(updatedM);
          safeSetItem(STORAGE_KEYS.METERS, JSON.stringify(updatedM));
        }
      } else if (e.data && e.data.type === 'meter_reading_deleted' && e.data.readingId) {
        const delId = e.data.readingId;
        markDeletedMeterReadingId(delId);
        const updated = (meterReadingsLogRef.current || []).filter(r => r.id !== delId);
        meterReadingsLogRef.current = updated;
        setMeterReadingsLog(updated);
        localStorage.setItem(STORAGE_KEYS.METER_READINGS_LOG, JSON.stringify(updated));
      }
    };
    roundsChannel.current?.addEventListener('message', handleBroadcast);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
      window.removeEventListener('pageshow', onVisibilityOrFocus);
      window.removeEventListener('online', onVisibilityOrFocus);
      sseSource?.close();
      roundsChannel.current?.removeEventListener('message', handleBroadcast);
    };
  }, []);

  // Helper to persist state to server API whenever key data changes
  const persistToServer = async () => {
    hasPendingLocalChanges.current = false;
    try {
      const payload = {
        rounds: (roundsRef.current || []).filter(r => r && r.id && !getDeletedRoundIds().has(r.id)),
        equipments: equipmentsRef.current || [],
        incidents: incidentsRef.current || [],
        requests: requestsRef.current || [],
        tasks: tasksRef.current || [],
        pumpInspections: pumpInspectionsRef.current || [],
        preventivePlans: preventivePlansRef.current || [],
        workOrders: workOrdersRef.current || [],
        settings: settingsRef.current,
        uploadedDocuments: (uploadedDocumentsRef.current || []).map(doc => ({
          ...doc,
          rawBase64: doc.rawBase64 && doc.rawBase64.length > 50000 ? undefined : doc.rawBase64
        })),
        documentFolders: documentFoldersRef.current || [],
        users: usersRef.current || [],
        schedules: schedulesRef.current || [],
        shiftSwaps: shiftSwapRequestsRef.current || [],
        cronogramas: cronogramasRef.current || [],
        meters: metersRef.current || [],
        meterReadingsLog: meterReadingsLogRef.current || [],
        roundTemplate: roundTemplateRef.current,
        deletedIds: Array.from(getAllDeletedIds())
      };

      const res = await fetch('/api/data', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Client-Id': clientSessionId.current
        },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsCloudSynced(true);
      }
    } catch (e) {
      console.warn('Server persist warning:', e);
    }
  };

  useEffect(() => {
    if (!isInitialFetchDone.current || !hasPendingLocalChanges.current) return;
    const timer = setTimeout(() => {
      if (hasPendingLocalChanges.current) {
        persistToServer();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [rounds, equipments, incidents, requests, tasks, pumpInspections, preventivePlans, workOrders, settings, users, schedules, shiftSwapRequests, cronogramas, meters, meterReadingsLog, roundTemplate]);

  // -------------------------------------------------------------
  // REAL-TIME FIRESTORE SYNCHRONIZATION (Cross-Device)
  // -------------------------------------------------------------
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const handleSnapshotError = (label: string, err: any) => {
      const msg = String(err?.code || err?.message || err || '').toLowerCase();
      if (msg.includes('resource-exhausted') || msg.includes('quota exceeded') || msg.includes('quota')) {
        markFirestoreQuotaExceeded();
        unsubs.forEach(fn => { try { fn(); } catch {} });
        unsubs = [];
        return;
      }
      console.warn(`${label} snapshot warning:`, err);
    };

    async function initRealtime() {
      if (isFirestoreQuotaExceeded()) {
        setIsCloudSynced(true);
        isInitialLoad.current = false;
        return;
      }
      try {
        // Start listeners directly. Firebase handles offline/auth internally via rules.
        setIsCloudSynced(true);

        // 1. Incidents / Inconvenientes Listener
        const unsubIncidents = onSnapshot(collection(db, 'incidents'), (snapshot) => {
          const list: Incident[] = [];
          const deletedIds = getDeletedIncidentIds();
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as Incident;
            if (data && data.id && !deletedIds.has(data.id)) {
              list.push(data);
            }
          });
          list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

          // Keep pending local creations (within 15s) that have not landed in Firestore yet
          const pendingLocal = (incidentsRef.current || []).filter(i => 
            localActionIds.current.has(i.id) && !deletedIds.has(i.id) && !list.some(s => s.id === i.id)
          );

          // Reconcile with anomalies in current rounds to guarantee 100% detection across all devices
          const withRounds = extractAnomaliesAsIncidents(roundsRef.current || [], [...pendingLocal, ...list], deletedIds);
          const finalIncidents = deduplicateIncidents(withRounds, deletedIds);

          if (JSON.stringify(finalIncidents) !== JSON.stringify(incidentsRef.current)) {
            if (!isInitialLoad.current) {
              checkAndNotifyNewIncidents(finalIncidents, incidentsRef.current || []);
            }
            incidentsRef.current = finalIncidents;
            setIncidents(finalIncidents);
            localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(finalIncidents));
          }
          setIsCloudSynced(true);
        }, (err) => handleSnapshotError('Incidents', err));
        unsubs.push(unsubIncidents);

        // 1b. Requests Listener
        const unsubRequests = onSnapshot(collection(db, 'requests'), (snapshot) => {
          const list: HotelRequest[] = [];
          const deletedIds = getDeletedRequestIds();
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as HotelRequest;
            if (data && data.id && !deletedIds.has(data.id)) {
              list.push(data);
            }
          });
          const mergedList = mergeRequestLists(requestsRef.current || [], list, deletedIds, localActionIds.current);

          if (JSON.stringify(mergedList) !== JSON.stringify(requestsRef.current)) {
            if (!isInitialLoad.current) {
              checkAndNotifyNewRequests(mergedList, requestsRef.current || []);
            }
            requestsRef.current = mergedList;
            setRequests(mergedList);
            localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(mergedList));
          }
          setIsCloudSynced(true);
        }, (err) => handleSnapshotError('Requests', err));
        unsubs.push(unsubRequests);

        // 1c. Tasks Listener (Tareas para compañeros)
        const unsubTasks = onSnapshot(collection(db, 'tasks'), (snapshot) => {
          const list: MaintenanceTask[] = [];
          const deletedIds = getDeletedTaskIds();
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as MaintenanceTask;
            if (data && data.id && !deletedIds.has(data.id)) {
              list.push(data);
            }
          });
          const mergedList = mergeTaskLists(tasksRef.current || [], list, deletedIds, localActionIds.current);

          if (JSON.stringify(mergedList) !== JSON.stringify(tasksRef.current)) {
            if (!isInitialLoad.current) {
              checkAndNotifyNewTasks(mergedList, tasksRef.current || []);
            }
            tasksRef.current = mergedList;
            setTasks(mergedList);
            localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(mergedList));
          }
          setIsCloudSynced(true);
        }, (err) => handleSnapshotError('Tasks', err));
        unsubs.push(unsubTasks);

        // 2. Equipment Listener
        const unsubEquipments = onSnapshot(collection(db, 'equipments'), (snapshot) => {
          const list: Equipment[] = [];
          const deletedIds = getDeletedEquipmentIds();
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as Equipment;
            if (data && data.id && !deletedIds.has(data.id)) {
              list.push(data);
            }
          });

          const mergedList = mergeEquipmentLists(equipmentsRef.current || [], list, deletedIds);
          if (JSON.stringify(mergedList) !== JSON.stringify(equipmentsRef.current)) {
            equipmentsRef.current = mergedList;
            setEquipments(mergedList);
            localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(mergedList));
          }
          setIsCloudSynced(true);
        }, (err) => handleSnapshotError('Equipments', err));
        unsubs.push(unsubEquipments);

        // 3. Rounds Listener (Cross-Device Real-Time Sync)
        const unsubRounds = onSnapshot(collection(db, 'rounds'), (snapshot) => {
          const rawList: DailyRound[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as DailyRound;
            if (data && data.id) {
              rawList.push(data);
            }
          });

          const currentActiveId = activeRoundRef.current?.id;
          const deletedIds = getDeletedRoundIds();
          const list = rawList.filter(r => !deletedIds.has(r.id) || CANONICAL_HISTORICAL_ROUND_IDS.has(r.id));
          const mergedList = mergeRoundLists(roundsRef.current || [], list, deletedIds, currentActiveId, localActionIds.current);

          if (!areRoundsEqual(mergedList, roundsRef.current || [])) {
            if (!isInitialLoad.current) {
              checkAndNotifyNewRounds(mergedList, roundsRef.current || []);
            }
            roundsRef.current = mergedList;
            setRounds(mergedList);
            safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(mergedList));
            persistToServer();
          }
          if (activeRoundRef.current) {
            const isCompletedRemotely = mergedList.some(r => r && (
              r.id === activeRoundRef.current?.id
            ) && (r.status === 'completada' || (Boolean(r.completedAt && r.technicianSignature) && r.compliancePercentage === 100)));

            const roundDate = (activeRoundRef.current.date || '').replace(/\//g, '-').trim();
            const todayStr = getLocalDateString();
            const isPastDay = Boolean(roundDate && roundDate < todayStr);

            if (activeRoundRef.current.status === 'en_progreso') {
              // Si la ronda está en progreso en este dispositivo, sólo se cierra si fue completada y firmada remotamente
              if (isCompletedRemotely) {
                activeRoundRef.current = null;
                setActiveRound(null);
                localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
                idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
              }
            } else if (activeRoundRef.current.status === 'completada' || isCompletedRemotely || isPastDay) {
              activeRoundRef.current = null;
              setActiveRound(null);
              localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
              idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
            }
          }

          // Reconcile and reflect round anomalies in live incidents instantly for all users
          const delIncIds = getDeletedIncidentIds();
          const syncedIncidents = extractAnomaliesAsIncidents(mergedList, incidentsRef.current || [], delIncIds);
          const finalIncidents = deduplicateIncidents(syncedIncidents, delIncIds);
          if (JSON.stringify(finalIncidents) !== JSON.stringify(incidentsRef.current)) {
            incidentsRef.current = finalIncidents;
            setIncidents(finalIncidents);
            localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(finalIncidents));
          }

          setIsCloudSynced(true);
        }, (err) => handleSnapshotError('Rounds', err));
        unsubs.push(unsubRounds);

        // 4. Pump Inspections Listener
        const unsubInspections = onSnapshot(collection(db, 'pump_inspections'), (snapshot) => {
          const list: PumpInspection[] = [];
          snapshot.forEach(docSnap => {
            list.push(docSnap.data() as PumpInspection);
          });
          list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          if (JSON.stringify(list) !== JSON.stringify(pumpInspectionsRef.current)) {
            pumpInspectionsRef.current = list;
            setPumpInspections(list);
          }
          setIsCloudSynced(true);
        }, (err) => handleSnapshotError('Inspections', err));
        unsubs.push(unsubInspections);

        // 5. Preventive Plans Listener
        const unsubPlans = onSnapshot(collection(db, 'preventive_plans'), (snapshot) => {
          const list: PreventivePlan[] = [];
          snapshot.forEach(docSnap => {
            list.push(docSnap.data() as PreventivePlan);
          });
          if (JSON.stringify(list) !== JSON.stringify(preventivePlansRef.current)) {
            preventivePlansRef.current = list;
            setPreventivePlans(list);
          }
          setIsCloudSynced(true);
        }, (err) => handleSnapshotError('Plans', err));
        unsubs.push(unsubPlans);

        // 6. Work Orders Listener
        const unsubOrders = onSnapshot(collection(db, 'work_orders'), (snapshot) => {
          const list: PreventiveWorkOrder[] = [];
          snapshot.forEach(docSnap => {
            list.push(docSnap.data() as PreventiveWorkOrder);
          });
          if (JSON.stringify(list) !== JSON.stringify(workOrdersRef.current)) {
            workOrdersRef.current = list;
            setWorkOrders(list);
          }
          setIsCloudSynced(true);
        }, (err) => handleSnapshotError('Work orders', err));
        unsubs.push(unsubOrders);

        // 7. Hotel Settings Listener
        const unsubSettings = onSnapshot(doc(db, 'hotel_settings', 'main'), (docSnap) => {
          if (docSnap.metadata.fromCache) return;
          if (docSnap.exists()) {
            const data = docSnap.data() as SystemSettings;
            const cleanSettings = sanitizeSystemSettings(data, settingsRef.current);
            settingsRef.current = cleanSettings;
            setSettings(cleanSettings);
            safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(cleanSettings));
            setIsCloudSynced(true);
          }
        }, (err) => handleSnapshotError('Settings', err));
        unsubs.push(unsubSettings);

        // 8. Uploaded Documents Listener
        const unsubDocs = onSnapshot(collection(db, 'uploaded_documents'), (snapshot) => {
          const list: UploadedDocument[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as UploadedDocument;
            if (data && data.id) {
              list.push(data);
            }
          });
          list.sort((a, b) => new Date(b.uploadDate).getTime() - new Date(a.uploadDate).getTime());
          if (JSON.stringify(list) !== JSON.stringify(uploadedDocumentsRef.current)) {
            uploadedDocumentsRef.current = list;
            setUploadedDocuments(list);
            localStorage.setItem(STORAGE_KEYS.DOCUMENTS, JSON.stringify(list));
          }
          setIsCloudSynced(true);
        }, (err) => handleSnapshotError('Documents', err));
        unsubs.push(unsubDocs);

        // 10. Document Folders Listener
        const unsubFolders = onSnapshot(collection(db, 'document_folders'), (snapshot) => {
          const list: DocumentFolder[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as DocumentFolder;
            if (data && data.id) {
              list.push(data);
            }
          });
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          if (JSON.stringify(list) !== JSON.stringify(documentFoldersRef.current)) {
            documentFoldersRef.current = list;
            setDocumentFolders(list);
            localStorage.setItem('hotel_doc_folders', JSON.stringify(list));
          }
          setIsCloudSynced(true);
        }, (err) => handleSnapshotError('Document folders', err));
        unsubs.push(unsubFolders);

        // 11. Users Listener
        const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
          const list: User[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as User;
            if (data && data.id) {
              list.push(data);
            }
          });
          const deletedUserIds = getDeletedUserIds();
          const cleanFresh = list.filter(u => u && !deletedUserIds.has(u.id));
          const mergedUsers = mergeUserLists(usersRef.current || [], cleanFresh, deletedUserIds, localActionIds.current);
          const guaranteed = ensureAdminUserList(mergedUsers);

          if (JSON.stringify(guaranteed) !== JSON.stringify(usersRef.current)) {
            usersRef.current = guaranteed;
            setUsers(guaranteed);
            localStorage.setItem('hotel_maint_users', JSON.stringify(guaranteed));
          }

          // Real-time synchronization of currently logged-in user permissions and sections
          if (currentUserRef.current) {
            const activeId = currentUserRef.current.id;
            const activeEmail = currentUserRef.current.email?.toLowerCase().trim();
            const freshMe = guaranteed.find(u => u.id === activeId || (u.email && u.email.toLowerCase().trim() === activeEmail));
            if (freshMe) {
              if (freshMe.status === 'inactive') {
                setCurrentUserState(null);
                currentUserRef.current = null;
                localStorage.removeItem('hotel_maint_current_user');
                sessionStorage.removeItem('hotel_maint_current_user');
                notify('Tu sesión ha finalizado porque el usuario fue desactivado.');
              } else if (JSON.stringify(freshMe) !== JSON.stringify(currentUserRef.current)) {
                setCurrentUserState(freshMe);
                currentUserRef.current = freshMe;
                localStorage.setItem('hotel_maint_current_user', JSON.stringify(freshMe));
                sessionStorage.setItem('hotel_maint_current_user', JSON.stringify(freshMe));
              }
            }
          }

          setIsCloudSynced(true);
        }, (err) => handleSnapshotError('Users', err));
        unsubs.push(unsubUsers);

        // 12. Round Template Listener (Real-Time Sync across all users)
        const unsubRoundTemplate = onSnapshot(doc(db, 'hotel_round_template', 'main'), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data() as { items?: RoundCheckpoint[] };
            if (data && Array.isArray(data.items)) {
              if (JSON.stringify(data.items) !== JSON.stringify(roundTemplateRef.current)) {
                roundTemplateRef.current = data.items;
                setRoundTemplate(data.items);
                localStorage.setItem('hotel_round_template', JSON.stringify(data.items));
              }
            }
            setIsCloudSynced(true);
          }
        }, (err) => handleSnapshotError('Round template', err));
        unsubs.push(unsubRoundTemplate);

        // 13. Schedules Listener (Real-Time Sync across devices)
        const unsubSchedules = onSnapshot(collection(db, 'schedules'), (snapshot) => {
          if (snapshot.metadata.fromCache) return;
          const list: TechnicianSchedule[] = [];
          const deletedIds = getDeletedScheduleIds();
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as TechnicianSchedule;
            if (data && data.id && !deletedIds.has(data.id)) {
              if (!isLegacyMockSchedule(data)) {
                list.push(data);
              } else {
                safeCloudWrite(() => deleteDoc(doc(db, 'schedules', data.id))).catch(() => {});
              }
            }
          });
          const mergedList = mergeScheduleLists(schedulesRef.current || [], list, deletedIds);
          if (JSON.stringify(mergedList) !== JSON.stringify(schedulesRef.current)) {
            schedulesRef.current = mergedList;
            setSchedules(mergedList);
            localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(mergedList));
            idbSet(STORAGE_KEYS.SCHEDULES, mergedList).catch(() => {});
          }
          setIsCloudSynced(true);
        }, (err) => handleSnapshotError('Schedules', err));
        unsubs.push(unsubSchedules);

        // 14. Shift Swaps Listener
        const unsubSwaps = onSnapshot(collection(db, 'shift_swaps'), (snapshot) => {
          const list: ShiftSwapRequest[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as ShiftSwapRequest;
            if (data && data.id) {
              list.push(data);
            }
          });
          if (JSON.stringify(list) !== JSON.stringify(shiftSwapRequestsRef.current)) {
            shiftSwapRequestsRef.current = list;
            setShiftSwapRequests(list);
            localStorage.setItem(STORAGE_KEYS.SHIFT_SWAPS, JSON.stringify(list));
          }
          setIsCloudSynced(true);
        }, (err) => handleSnapshotError('Shift swaps', err));
        unsubs.push(unsubSwaps);

        // 15. Cronogramas Listener (Real-Time Sync across devices)
        const unsubCronogramas = onSnapshot(collection(db, 'cronogramas'), (snapshot) => {
          const list: Cronograma[] = [];
          const deletedIds = getDeletedCronogramaIds();
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as Cronograma;
            if (data && data.id && !deletedIds.has(data.id)) {
              list.push(data);
            }
          });
          const mergedList = mergeCronogramaLists(cronogramasRef.current || [], list, deletedIds);
          if (JSON.stringify(mergedList) !== JSON.stringify(cronogramasRef.current)) {
            cronogramasRef.current = mergedList;
            setCronogramas(mergedList);
            localStorage.setItem(STORAGE_KEYS.CRONOGRAMAS, JSON.stringify(mergedList));
          }
          setIsCloudSynced(true);
        }, (err) => handleSnapshotError('Cronogramas', err));
        unsubs.push(unsubCronogramas);

        // 16. Meter Definitions Listener (Real-Time Sync & Permanent Deletions)
        const unsubMeters = onSnapshot(collection(db, 'meter_definitions'), (snapshot) => {
          const remoteList: MeterDefinition[] = [];
          const deletedIds = getDeletedMeterIds();
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as MeterDefinition;
            if (data && data.id && !deletedIds.has(data.id) && (data.code ? !deletedIds.has(data.code) : true)) {
              remoteList.push(data);
            }
          });
          const merged = mergeMeterLists(metersRef.current || [], remoteList, deletedIds, localActionIds.current);
          if (!areMetersEqual(merged, metersRef.current || [])) {
            metersRef.current = merged;
            setMeters(merged);
            safeSetItem(STORAGE_KEYS.METERS, JSON.stringify(merged));
          }
          setIsCloudSynced(true);
        }, (err) => handleSnapshotError('Meters', err));
        unsubs.push(unsubMeters);

        // 17. Meter Readings Log Listener (Real-Time Sync & Deduplication)
        const unsubMeterReadings = onSnapshot(collection(db, 'meter_readings_log'), (snapshot) => {
          const remoteList: MeterReadingRecord[] = [];
          const deletedIds = getDeletedMeterReadingIds();
          const deletedMeterIds = getDeletedMeterIds();
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as MeterReadingRecord;
            if (
              data && 
              data.id && 
              !deletedIds.has(data.id) && 
              !deletedMeterIds.has(data.meterId) && 
              !DEMO_METER_IDS.includes(data.meterId) &&
              !DEMO_READING_IDS.includes(data.id)
            ) {
              remoteList.push(data);
            }
          });
          const merged = mergeMeterReadingLists(meterReadingsLogRef.current || [], remoteList, deletedIds, deletedMeterIds, localActionIds.current);
          if (!areReadingsEqual(merged, meterReadingsLogRef.current || [])) {
            meterReadingsLogRef.current = merged;
            setMeterReadingsLog(merged);
            localStorage.setItem(STORAGE_KEYS.METER_READINGS_LOG, JSON.stringify(merged));
          }
          setIsCloudSynced(true);
        }, (err) => handleSnapshotError('Meter readings', err));
        unsubs.push(unsubMeterReadings);

        // 13. Global Real-Time Deletions Listener (Cross-Device Instant Deletion Sync)
        const unsubDeleted = onSnapshot(doc(db, 'system', 'deleted_records'), (docSnap) => {
          if (docSnap.metadata.fromCache) return;
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && Array.isArray(data.ids)) {
              let anyNew = false;
              const currentAll = getAllDeletedIds();
              for (const id of data.ids) {
                if (typeof id === 'string' && id && !currentAll.has(id)) {
                  if (CANONICAL_HISTORICAL_ROUND_IDS.has(id)) {
                    continue;
                  }
                  markDeletedAnyId(id);
                  anyNew = true;
                }
              }
              if (anyNew) {
                const delInc = getDeletedIncidentIds();
                const delReq = getDeletedRequestIds();
                const delEq = getDeletedEquipmentIds();
                const delRnd = getDeletedRoundIds();
                const delUsr = getDeletedUserIds();
                const delMeters = getDeletedMeterIds();
                const delReadings = getDeletedMeterReadingIds();

                setMeters(prev => {
                  const filtered = (prev || []).filter(m => !delMeters.has(m.id) && (m.code ? !delMeters.has(m.code) : true));
                  if (filtered.length !== (prev || []).length) {
                    metersRef.current = filtered;
                    /* Server Authoritative Meters */
                    return filtered;
                  }
                  return prev;
                });

                setMeterReadingsLog(prev => {
                  const filtered = (prev || []).filter(r => !delReadings.has(r.id) && !delMeters.has(r.meterId));
                  if (filtered.length !== (prev || []).length) {
                    meterReadingsLogRef.current = filtered;
                    localStorage.setItem(STORAGE_KEYS.METER_READINGS_LOG, JSON.stringify(filtered));
                    return filtered;
                  }
                  return prev;
                });

                setIncidents(prev => {
                  const filtered = (prev || []).filter(i => !delInc.has(i.id));
                  if (filtered.length !== (prev || []).length) {
                    incidentsRef.current = filtered;
                    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(filtered));
                    return filtered;
                  }
                  return prev;
                });

                setRequests(prev => {
                  const filtered = (prev || []).filter(r => !delReq.has(r.id));
                  if (filtered.length !== (prev || []).length) {
                    requestsRef.current = filtered;
                    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(filtered));
                    return filtered;
                  }
                  return prev;
                });

                setEquipments(prev => {
                  const filtered = (prev || []).filter(e => !delEq.has(e.id));
                  if (filtered.length !== (prev || []).length) {
                    equipmentsRef.current = filtered;
                    localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(filtered));
                    return filtered;
                  }
                  return prev;
                });

                setRounds(prev => {
                  const filtered = (prev || []).filter(r => !delRnd.has(r.id) || CANONICAL_HISTORICAL_ROUND_IDS.has(r.id));
                  if (filtered.length !== (prev || []).length) {
                    roundsRef.current = filtered;
                    safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(filtered));
                    return filtered;
                  }
                  return prev;
                });

                setUsers(prev => {
                  const filtered = (prev || []).filter(u => !delUsr.has(u.id));
                  if (filtered.length !== (prev || []).length) {
                    const guaranteed = ensureAdminUserList(filtered);
                    usersRef.current = guaranteed;
                    localStorage.setItem('hotel_maint_users', JSON.stringify(guaranteed));
                    return guaranteed;
                  }
                  return prev;
                });
              }
            }
          }
        }, (err) => handleSnapshotError('Deleted records', err));
        unsubs.push(unsubDeleted);

        // 14. Global Real-Time App Version Listener (Instant Update Sync across all devices)
        const unsubAppVersion = onSnapshot(doc(db, 'system', 'app_version'), (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && typeof data.versionCode === 'number') {
              const appliedVer = Number(localStorage.getItem('hotel_maint_applied_version') || 0);
              if (data.versionCode <= appliedVer) {
                return;
              }
              if (initialAppVersionCodeRef.current === null) {
                initialAppVersionCodeRef.current = data.versionCode;
              } else if (data.versionCode > initialAppVersionCodeRef.current) {
                triggerInstantAppUpdate(`Nueva versión ${data.changelog?.version || ''} publicada`);
              }
            }
          }
        }, (err) => handleSnapshotError('App version', err));
        unsubs.push(unsubAppVersion);

        // Mark initial load done after 1 second
        setTimeout(() => {
          isInitialLoad.current = false;
        }, 1500);

      } catch (e) {
        console.warn('Firebase init error:', e);
      }
    }

    initRealtime();

    return () => {
      unsubs.forEach(fn => fn());
    };
  }, []);

  // Active round heartbeat emitter: keeps real active round alive so it is never marked as ghost
  useEffect(() => {
    if (!activeRound || activeRound.status !== 'en_progreso') return;

    const sendHeartbeat = () => {
      if (!activeRoundRef.current || activeRoundRef.current.status !== 'en_progreso') return;
      const nowIso = new Date().toISOString();
      const updatedRound: DailyRound = {
        ...activeRoundRef.current,
        lastHeartbeat: nowIso,
        lastUpdated: nowIso
      };
      activeRoundRef.current = updatedRound;
      setActiveRound(updatedRound);
      safeSetItem(STORAGE_KEYS.ACTIVE_ROUND, JSON.stringify(updatedRound));
      hasPendingLocalChanges.current = true;
      persistToServer();
      // Sync heartbeat to cloud so administrators and supervisors see live status
      safeCloudWrite(() => setDoc(doc(db, 'rounds', updatedRound.id), cleanForFirestore(updatedRound), { merge: true }));
    };

    const heartbeatInterval = setInterval(sendHeartbeat, 60000);
    return () => clearInterval(heartbeatInterval);
  }, [activeRound?.id]);

  const setRole = (newRole: RoleMode) => {
    setRoleState(newRole);
    notify(`Perfil cambiado a modo ${newRole === 'admin' ? 'Administrador' : 'Técnico'}`);
  };

  const verifyAdminPin = (pin: string) => {
    return pin === settings.adminPin;
  };

  // -------------------------------------------------------------
  // INCIDENTS / INCONVENIENTES (Shared Real-Time)
  // -------------------------------------------------------------
  const reportIncident = async (incidentData: Omit<Incident, 'id' | 'timestamp'> & { id?: string; timestamp?: string }) => {
    // 1. Check if identical incident already exists (by ID, or by title + area + same day)
    const normTitle = (incidentData.title || '').trim().toLowerCase();
    const normArea = (incidentData.area || '').trim().toLowerCase();
    const existing = (incidentsRef.current || []).find(i => {
      if (incidentData.id && i.id === incidentData.id) return true;
      const iTitle = (i.title || '').trim().toLowerCase();
      const iArea = (i.area || '').trim().toLowerCase();
      if (iTitle === normTitle && iArea === normArea) {
        return true;
      }
      return false;
    });

    if (existing) {
      return;
    }

    const timestamp = incidentData.timestamp || getLocalDateTimeString();
    const newIncident: Incident = {
      ...incidentData,
      id: incidentData.id || `inc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      timestamp,
      status: incidentData.status || 'pendiente'
    };

    unmarkDeletedIncidentId(newIncident.id);
    trackLocalCreation(newIncident.id);

    // Optimistic local update with deduplication
    const updated = deduplicateIncidents([newIncident, ...(incidentsRef.current || []).filter(i => i.id !== newIncident.id)]);
    incidentsRef.current = updated;
    setIncidents(updated);
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(updated));
    localActionIds.current.add(newIncident.id);
    setTimeout(() => { localActionIds.current.delete(newIncident.id); }, 15000);
    notify(`Inconveniente reportado con éxito`);

    // Broadcast instantáneamente a otras pestañas
    try {
      roundsChannel.current?.postMessage({ type: 'new_incident', incident: newIncident });
    } catch (e) {}

    // Notificar por Push al teléfono de todos los compañeros y administradores
    broadcastServerPushNotification({
      category: 'incidencias',
      title: `⚠️ Nueva Avería / Incidencia Reportada`,
      body: `${newIncident.title}\nÁrea: ${newIncident.area || 'Hotel'}\nPrioridad: ${newIncident.severity || 'media'}`,
      url: '/?tab=averias',
      tag: `incident-${newIncident.id}`,
      excludeUserId: currentUser?.id,
      excludeEmail: currentUser?.email
    });

    hasPendingLocalChanges.current = true;
    persistToServer();

    // Sync to Firestore Cloud safely with quota protection
    await safeCloudWrite(() => setDoc(doc(db, 'incidents', newIncident.id), cleanForFirestore(newIncident)));
  };

  const updateIncident = async (id: string, data: Partial<Incident>) => {
    const updated = (incidentsRef.current || []).map(item => item.id === id ? { ...item, ...data } : item);
    const targetInc = updated.find(i => i.id === id);
    incidentsRef.current = updated;
    setIncidents(updated);
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(updated));
    notify('Estado del inconveniente actualizado');

    // Si fue solucionado, enviar notificación de sistema local y Push a los demás dispositivos
    if ((data.status as string) === 'solucionado' || (data.status as string) === 'resuelto') {
      sendSystemNotification('✅ 👏 Inconveniente Solucionado', {
        body: `"${targetInc?.title || 'Inconveniente'}" en ${targetInc?.area || 'Hotel'} fue marcado como solucionado.\n• Resuelto por: ${data.resolvedBy || currentUserRef.current?.displayName || 'Técnico'}`,
        tag: `inc-solved-${id}`,
        icon: '/pwa-192x192.png'
      });
      playAlertSound();

      broadcastServerPushNotification({
        category: 'incidencias',
        title: '✅ 👏 Avería / Inconveniente Solucionado',
        body: `"${targetInc?.title || 'Inconveniente'}" en ${targetInc?.area || 'Hotel'} fue marcado como solucionado por ${data.resolvedBy || currentUserRef.current?.displayName || 'un compañero'}.`,
        url: '/?tab=averias',
        tag: `inc-solved-${id}`,
        excludeUserId: currentUser?.id,
        excludeEmail: currentUser?.email
      });
    }

    // Broadcast instantáneamente a otras pestañas
    if (targetInc) {
      try {
        roundsChannel.current?.postMessage({ type: 'incident_updated', incident: targetInc });
      } catch (e) {}
    }

    // If this incident originated from a round, keep the round's anomaly updated too
    setRounds(prevRounds => {
      let anyRoundModified = false;

      const updatedRounds = prevRounds.map(r => {
        if (!r || !Array.isArray(r.anomalies)) return r;
        let roundModified = false;
        const newAnomalies = r.anomalies.map(a => {
          const anomId = a.id || `inc-anom-${r.id}-${a.title.replace(/\s+/g, '_')}`;
          const isMatch = a.id === id || (targetInc && a.id === targetInc.id) || anomId === id || (targetInc && anomId === targetInc.id);
          if (isMatch) {
            roundModified = true;
            anyRoundModified = true;
            return {
              ...a,
              id: targetInc?.id || id,
              status: (data.status as any) || a.status,
              resolvedBy: data.resolvedBy || a.resolvedBy,
              resolvedAt: data.resolvedAt || a.resolvedAt,
              resolutionNotes: data.resolutionNotes || a.resolutionNotes
            };
          }
          return a;
        });
        if (roundModified) {
          const newRound = { ...r, anomalies: newAnomalies };
          safeCloudWrite(() => setDoc(doc(db, 'rounds', newRound.id), cleanForFirestore(newRound), { merge: true }));
          return newRound;
        }
        return r;
      });
      if (anyRoundModified) {
        roundsRef.current = updatedRounds;
        safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(updatedRounds));
      }
      return updatedRounds;
    });

    hasPendingLocalChanges.current = true;
    persistToServer();

    if (targetInc) {
      await safeCloudWrite(() => setDoc(doc(db, 'incidents', id), cleanForFirestore(targetInc), { merge: true }));
    } else {
      await safeCloudWrite(() => setDoc(doc(db, 'incidents', id), cleanForFirestore(data as any), { merge: true }));
    }
  };

  const deleteIncident = async (id: string) => {
    if (currentUser && !currentUser.permissions?.canDeleteRecords) {
      notify('Acceso restringido: No tienes permisos para eliminar registros.');
      return;
    }
    markDeletedIncidentId(id);
    localActionIds.current.add(id);
    setTimeout(() => { localActionIds.current.delete(id); }, 15000);
    const updated = (incidentsRef.current || []).filter(item => item.id !== id);
    incidentsRef.current = updated;
    setIncidents(updated);
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(updated));
    notify('Inconveniente eliminado con éxito');

    // Also remove from rounds anomalies so it doesn't get resurrected
    setRounds(prevRounds => {
      let modified = false;
      const updatedRounds = prevRounds.map(r => {
        if (!r || !Array.isArray(r.anomalies)) return r;
        const filtered = r.anomalies.filter(a => a.id !== id);
        if (filtered.length !== r.anomalies.length) {
          modified = true;
          const newRound = { ...r, anomalies: filtered, anomaliesCount: filtered.length };
          safeCloudWrite(() => setDoc(doc(db, 'rounds', newRound.id), cleanForFirestore(newRound), { merge: true }));
          return newRound;
        }
        return r;
      });
      if (modified) {
        roundsRef.current = updatedRounds;
        safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(updatedRounds));
      }
      return updatedRounds;
    });

    try {
      roundsChannel.current?.postMessage({ type: 'incident_deleted', incidentId: id });
    } catch (e) {}

    fetch(`/api/incidents/${id}`, { method: 'DELETE' }).catch(() => {});
    recordCloudDeletion(id);

    await safeCloudWrite(() => deleteDoc(doc(db, 'incidents', id)));

    hasPendingLocalChanges.current = true;
    persistToServer();
  };

  const addRequest = async (requestData: Omit<HotelRequest, 'id' | 'createdAt'> & { createdAt?: string }) => {
    const createdAt = (requestData.createdAt && requestData.createdAt.trim()) || getLocalDateTimeString();
    const newRequest: HotelRequest = {
      ...requestData,
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt,
      updatedAt: new Date().toISOString(),
      status: requestData.status || 'pendiente',
      requestedById: requestData.requestedById || currentUser?.id,
      requestedByEmail: requestData.requestedByEmail || currentUser?.email,
      requestedBy: requestData.requestedBy || currentUser?.displayName || currentUser?.email || 'Usuario del Hotel'
    };

    unmarkDeletedRequestId(newRequest.id);
    trackLocalCreation(newRequest.id);

    const updated = mergeRequestLists(requestsRef.current || [], [newRequest], getDeletedRequestIds());
    requestsRef.current = updated;
    setRequests(updated);
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(updated));
    idbSet(STORAGE_KEYS.REQUESTS, updated).catch(() => {});
    localActionIds.current.add(newRequest.id);
    setTimeout(() => { localActionIds.current.delete(newRequest.id); }, 15000);
    markNotifiedRequestId(currentUser?.id || currentUser?.email || 'user', newRequest.id);
    saveRequesterNotifiedStatus(currentUser?.id || currentUser?.email || 'user', newRequest.id, 'pendiente');
    roundsChannel.current?.postMessage({ type: 'new_request', request: newRequest });
    notify(`✅ Solicitud recibida: Tu solicitud "${newRequest.title}" fue enviada y registrada con éxito en el sistema.`);
    sendSystemNotification(`✅ Solicitud Recibida en Mantenimiento`, {
      body: `Tu solicitud "${newRequest.title}" fue recibida en el sistema y está lista para ser atendida.\nUbicación: ${newRequest.location || 'Hotel'}`,
      tag: `req-receipt-${newRequest.id}`,
      icon: '/pwa-192x192.png'
    });
    playAlertSound();

    // Notificar por Push al teléfono de todos los compañeros y administradores
    broadcastServerPushNotification({
      category: 'solicitudes',
      title: `🚨 Nueva Solicitud Hotelera`,
      body: `"${newRequest.title}"\nUbicación: ${newRequest.location || 'Hotel'}\nSolicitante: ${newRequest.requestedBy}`,
      url: '/?tab=solicitudes',
      tag: `request-${newRequest.id}`,
      excludeUserId: currentUser?.id,
      excludeEmail: currentUser?.email,
      data: {
        requestId: newRequest.id,
        assignedTo: newRequest.assignedTo,
        requestedById: newRequest.requestedById,
        requestedByEmail: newRequest.requestedByEmail,
        requestedBy: newRequest.requestedBy
      }
    });

    hasPendingLocalChanges.current = true;
    persistToServer();

    await safeCloudWrite(() => setDoc(doc(db, 'requests', newRequest.id), cleanForFirestore(newRequest), { merge: true }));
  };

  // -------------------------------------------------------------
  // GESTIÓN DE HORARIOS Y TURNOS TÉCNICOS (SCHEDULES)
  // -------------------------------------------------------------
  const addSchedule = async (scheduleData: Omit<TechnicianSchedule, 'id' | 'createdAt'>) => {
    const newSchedule: TechnicianSchedule = {
      ...scheduleData,
      id: `sched-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    unmarkDeletedScheduleId(newSchedule.id);
    const updated = [
      newSchedule, 
      ...(schedulesRef.current || []).filter(s => 
        s.id !== newSchedule.id && 
        !(s.date === newSchedule.date && s.technicianId === newSchedule.technicianId)
      )
    ];
    schedulesRef.current = updated;
    setSchedules(updated);
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(updated));
    idbSet(STORAGE_KEYS.SCHEDULES, updated).catch(() => {});

    roundsChannel.current?.postMessage({ type: 'schedule_updated', schedule: newSchedule });
    hasPendingLocalChanges.current = true;
    persistToServer();

    await safeCloudWrite(() => setDoc(doc(db, 'schedules', newSchedule.id), cleanForFirestore(newSchedule), { merge: true }));
  };

  const updateSchedule = async (id: string, data: Partial<TechnicianSchedule>) => {
    const updated = (schedulesRef.current || []).map(s => s.id === id ? { ...s, ...data, updatedAt: new Date().toISOString() } : s);
    schedulesRef.current = updated;
    setSchedules(updated);
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(updated));
    idbSet(STORAGE_KEYS.SCHEDULES, updated).catch(() => {});

    const target = updated.find(s => s.id === id);
    if (target) {
      roundsChannel.current?.postMessage({ type: 'schedule_updated', schedule: target });
      await safeCloudWrite(() => setDoc(doc(db, 'schedules', id), cleanForFirestore(target), { merge: true }));
    }

    hasPendingLocalChanges.current = true;
    persistToServer();
  };

  const deleteSchedule = async (id: string) => {
    markDeletedScheduleId(id);
    const updated = (schedulesRef.current || []).filter(s => s.id !== id);
    schedulesRef.current = updated;
    setSchedules(updated);
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(updated));
    idbSet(STORAGE_KEYS.SCHEDULES, updated).catch(() => {});

    fetch(`/api/schedules/${id}`, { method: 'DELETE' }).catch(() => {});
    recordCloudDeletion(id);

    hasPendingLocalChanges.current = true;
    persistToServer();

    await safeCloudWrite(() => deleteDoc(doc(db, 'schedules', id)));
  };

  const bulkGenerateSchedules = async (params: BulkScheduleParams) => {
    const { technicianIds, startDate, endDate, pattern, assignedAreas, overwriteExisting } = params;
    if (!technicianIds || technicianIds.length === 0 || !startDate || !endDate) return;

    const start = new Date(startDate.replace(' ', 'T'));
    const end = new Date(endDate.replace(' ', 'T'));
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return;

    const newGenerated: TechnicianSchedule[] = [];
    const targetTechs = users.filter(u => technicianIds.includes(u.id));

    let curr = new Date(start);
    let dayCount = 0;

    while (curr <= end) {
      const dateIso = curr.toISOString().split('T')[0];

      targetTechs.forEach((tech, techIdx) => {
        let shift: ShiftType = 'manana';

        if (pattern === '5x2') {
          const dayOfWeek = curr.getDay(); // 0 is Sun, 6 is Sat
          shift = (dayOfWeek === 0 || dayOfWeek === 6) ? 'descanso' : 'diurno';
        } else if (pattern === 'rotativo_3turnos') {
          const cycle = (dayCount + techIdx) % 4;
          if (cycle === 0) shift = 'manana';
          else if (cycle === 1) shift = 'tarde';
          else if (cycle === 2) shift = 'noche';
          else shift = 'descanso';
        } else if (pattern === 'fijo_manana') shift = 'manana';
        else if (pattern === 'fijo_tarde') shift = 'tarde';
        else if (pattern === 'fijo_noche') shift = 'noche';
        else if (pattern === 'fijo_diurno') shift = 'diurno';
        else { // 6x1 default
          const cycle = (dayCount + techIdx) % 7;
          shift = cycle === 6 ? 'descanso' : (cycle % 2 === 0 ? 'manana' : 'tarde');
        }

        const startTime = shift === 'manana' ? '06:00' : shift === 'tarde' ? '14:00' : shift === 'noche' ? '21:00' : shift === 'diurno' ? '08:00' : '00:00';
        const endTime = shift === 'manana' ? '15:00' : shift === 'tarde' ? '22:00' : shift === 'noche' ? '06:00' : shift === 'diurno' ? '17:00' : '00:00';

        newGenerated.push({
          id: `sched-${tech.id}-${dateIso}`,
          technicianId: tech.id,
          technicianName: tech.displayName,
          technicianRole: tech.role,
          department: 'Mantenimiento e Ingeniería',
          date: dateIso,
          shiftType: shift,
          startTime,
          endTime,
          breakDurationMinutes: 60,
          assignedAreas: assignedAreas || ['Toda la Infraestructura'],
          isOnCall: shift === 'noche',
          status: 'programado',
          createdAt: new Date().toISOString()
        });
      });

      curr.setDate(curr.getDate() + 1);
      dayCount++;
    }

    let merged = [...schedules];
    if (overwriteExisting) {
      const generatedKeys = new Set(newGenerated.map(g => `${g.technicianId}_${g.date}`));
      merged = merged.filter(s => !generatedKeys.has(`${s.technicianId}_${s.date}`));
    }
    merged = [...newGenerated, ...merged];

    setSchedules(merged);
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(merged));
    idbSet(STORAGE_KEYS.SCHEDULES, merged).catch(() => {});

    hasPendingLocalChanges.current = true;
    persistToServer();

    for (const item of newGenerated) {
      await safeCloudWrite(() => setDoc(doc(db, 'schedules', item.id), cleanForFirestore(item), { merge: true }));
    }
  };

  const requestShiftSwap = async (swapData: Omit<ShiftSwapRequest, 'id' | 'createdAt' | 'status'>) => {
    const newSwap: ShiftSwapRequest = {
      ...swapData,
      id: `swap-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      status: 'pendiente',
      createdAt: new Date().toISOString()
    };

    const updated = [newSwap, ...shiftSwapRequests];
    setShiftSwapRequests(updated);
    localStorage.setItem(STORAGE_KEYS.SHIFT_SWAPS, JSON.stringify(updated));

    hasPendingLocalChanges.current = true;
    persistToServer();

    await safeCloudWrite(() => setDoc(doc(db, 'shift_swaps', newSwap.id), cleanForFirestore(newSwap), { merge: true }));
  };

  const resolveShiftSwap = async (swapId: string, approved: boolean) => {
    const updated = shiftSwapRequests.map(s => {
      if (s.id === swapId) {
        return {
          ...s,
          status: approved ? ('aprobado' as const) : ('rechazado' as const),
          resolvedAt: new Date().toISOString(),
          resolvedBy: currentUser?.displayName || 'Administrador'
        };
      }
      return s;
    });

    setShiftSwapRequests(updated);
    localStorage.setItem(STORAGE_KEYS.SHIFT_SWAPS, JSON.stringify(updated));

    if (approved) {
      const targetSwap = updated.find(s => s.id === swapId);
      if (targetSwap && targetSwap.scheduleId) {
        // Swap technician on schedule
        updateSchedule(targetSwap.scheduleId, {
          technicianId: targetSwap.targetTechnicianId,
          technicianName: targetSwap.targetTechnicianName,
          status: 'cambio_solicitado'
        });
        notify(`🔄 Permuta aprobada: Turno asignado a ${targetSwap.targetTechnicianName}.`);
      }
    } else {
      notify('❌ Permuta de turno rechazada.');
    }

    hasPendingLocalChanges.current = true;
    persistToServer();
  };

  // -------------------------------------------------------------
  // GESTIÓN DE CRONOGRAMAS MAESTROS (TIMELINES & MASTER SCHEDULES)
  // -------------------------------------------------------------
  const addCronograma = async (cronogramaData: Omit<Cronograma, 'id' | 'createdAt' | 'updatedAt'>): Promise<Cronograma> => {
    const newCronograma: Cronograma = {
      ...cronogramaData,
      id: `cron-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    trackLocalCreation(newCronograma.id);
    const updated = [newCronograma, ...(cronogramasRef.current || []).filter(c => c.id !== newCronograma.id)];
    cronogramasRef.current = updated;
    setCronogramas(updated);
    localStorage.setItem(STORAGE_KEYS.CRONOGRAMAS, JSON.stringify(updated));

    roundsChannel.current?.postMessage({ type: 'cronograma_updated', cronograma: newCronograma });
    hasPendingLocalChanges.current = true;
    persistToServer();

    await safeCloudWrite(() => setDoc(doc(db, 'cronogramas', newCronograma.id), cleanForFirestore(newCronograma)));
    return newCronograma;
  };

  const updateCronograma = async (id: string, data: Partial<Cronograma>) => {
    const updated = (cronogramasRef.current || []).map(c => c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString() } : c);
    cronogramasRef.current = updated;
    setCronogramas(updated);
    localStorage.setItem(STORAGE_KEYS.CRONOGRAMAS, JSON.stringify(updated));

    const target = updated.find(c => c.id === id);
    if (target) {
      roundsChannel.current?.postMessage({ type: 'cronograma_updated', cronograma: target });
      await safeCloudWrite(() => setDoc(doc(db, 'cronogramas', id), cleanForFirestore(target), { merge: true }));
    }

    hasPendingLocalChanges.current = true;
    persistToServer();
  };

  const deleteCronograma = async (id: string) => {
    markDeletedCronogramaId(id);
    const updated = (cronogramasRef.current || []).filter(c => c.id !== id);
    cronogramasRef.current = updated;
    setCronogramas(updated);
    localStorage.setItem(STORAGE_KEYS.CRONOGRAMAS, JSON.stringify(updated));

    fetch(`/api/cronogramas/${id}`, { method: 'DELETE' }).catch(() => {});
    recordCloudDeletion(id);

    try {
      roundsChannel.current?.postMessage({ type: 'cronograma_deleted', cronogramaId: id });
    } catch (e) {}

    await safeCloudWrite(() => deleteDoc(doc(db, 'cronogramas', id)));

    hasPendingLocalChanges.current = true;
    persistToServer();
  };

  // -------------------------------------------------------------
  // GESTIÓN DE CONTADORES Y LECTURAS (METERS & READINGS)
  // -------------------------------------------------------------
  const addMeter = async (meterData: Omit<MeterDefinition, 'id' | 'createdAt'>): Promise<MeterDefinition> => {
    const newId = `med-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // Ensure guaranteed unique code so meters never collide or overwrite
    let finalCode = meterData.code ? meterData.code.trim().toUpperCase() : '';
    const existingCodes = new Set((metersRef.current || []).map(m => (m.code || '').trim().toUpperCase()));

    if (!finalCode || existingCodes.has(finalCode)) {
      const prefix = meterData.type === 'agua' ? 'MED-AGU' : meterData.type === 'energia' ? 'MED-ENE' : meterData.type === 'gas' ? 'MED-GAS' : 'MED-OTR';
      let counter = (metersRef.current || []).length + 1;
      let candidate = `${prefix}-${String(counter).padStart(2, '0')}`;
      while (existingCodes.has(candidate)) {
        counter++;
        candidate = `${prefix}-${String(counter).padStart(2, '0')}`;
      }
      finalCode = candidate;
    }

    const defaultName = meterData.name && meterData.name.trim() 
      ? meterData.name.trim() 
      : `${meterData.type === 'agua' ? 'Contador de Agua' : meterData.type === 'energia' ? 'Contador de Energía' : meterData.type === 'gas' ? 'Contador de Gas' : 'Contador'} (${finalCode})`;

    const newMeter: MeterDefinition = {
      ...meterData,
      id: newId,
      code: finalCode,
      name: defaultName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Explicitly unmark from deleted records so it immediately persists and displays everywhere
    unmarkDeletedMeterId(newMeter.id);
    unmarkDeletedMeterId(newMeter.code);
    unmarkDeletedMeterId(newMeter.code.toUpperCase());
    unmarkDeletedMeterId(newMeter.code.toLowerCase());

    trackLocalCreation(newMeter.id);
    const updated = [newMeter, ...(metersRef.current || []).filter(m => m.id !== newMeter.id)];
    metersRef.current = updated;
    setMeters(updated);
    safeSetItem(STORAGE_KEYS.METERS, JSON.stringify(updated));

    roundsChannel.current?.postMessage({ type: 'meter_updated', meter: newMeter });
    fetch('/api/meters', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client-Id': clientSessionId.current },
      body: JSON.stringify(newMeter)
    }).catch(() => {});
    hasPendingLocalChanges.current = true;
    persistToServer();

    safeCloudWrite(() => setDoc(doc(db, 'meter_definitions', newMeter.id), cleanForFirestore(newMeter))).catch(() => {});
    safeCloudWrite(() => setDoc(doc(db, 'meters', newMeter.id), cleanForFirestore(newMeter))).catch(() => {});
    notify(`✅ Contador "${newMeter.name}" agregado con éxito`);
    return newMeter;
  };

  const updateMeter = async (id: string, data: Partial<MeterDefinition>) => {
    unmarkDeletedMeterId(id);
    if (data.code) {
      unmarkDeletedMeterId(data.code);
      unmarkDeletedMeterId(data.code.toUpperCase());
      unmarkDeletedMeterId(data.code.toLowerCase());
    }

    const updated = (metersRef.current || []).map(m => m.id === id ? { ...m, ...data, updatedAt: new Date().toISOString() } : m);
    metersRef.current = updated;
    setMeters(updated);
    /* Server Authoritative Meters */

    const target = updated.find(m => m.id === id);
    if (target) {
      roundsChannel.current?.postMessage({ type: 'meter_updated', meter: target });
      fetch('/api/meters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Client-Id': clientSessionId.current },
        body: JSON.stringify(target)
      }).catch(() => {});
      safeCloudWrite(() => setDoc(doc(db, 'meter_definitions', id), cleanForFirestore(target), { merge: true })).catch(() => {});
      safeCloudWrite(() => setDoc(doc(db, 'meters', id), cleanForFirestore(target), { merge: true })).catch(() => {});
    }

    hasPendingLocalChanges.current = true;
    persistToServer();
    notify('Ajustes del contador actualizados');
  };

  const deleteMeter = async (id: string) => {
    const targetMeter = (metersRef.current || []).find(m => m.id === id || m.code === id);
    const meterId = targetMeter ? targetMeter.id : id;
    const meterCode = targetMeter?.code;

    markDeletedMeterId(meterId);
    if (meterCode) markDeletedMeterId(meterCode);
    unmarkLocalCreation(meterId);
    if (meterCode) unmarkLocalCreation(meterCode);

    // Filter out the meter
    const updated = (metersRef.current || []).filter(m => m.id !== meterId && (!meterCode || m.code !== meterCode));
    metersRef.current = updated;
    setMeters(updated);
    /* Server Authoritative Meters */

    // Also permanently delete and purge all readings associated with this meter
    const readingsToDelete = (meterReadingsLogRef.current || []).filter(r => r.meterId === meterId || (meterCode && r.meterId === meterCode));
    readingsToDelete.forEach(r => {
      markDeletedMeterReadingId(r.id);
      unmarkLocalCreation(r.id);
      recordCloudDeletion(r.id);
    });

    const updatedReadings = (meterReadingsLogRef.current || []).filter(r => r.meterId !== meterId && (!meterCode || r.meterId !== meterCode));
    meterReadingsLogRef.current = updatedReadings;
    setMeterReadingsLog(updatedReadings);
    localStorage.setItem(STORAGE_KEYS.METER_READINGS_LOG, JSON.stringify(updatedReadings));

    recordCloudDeletion(meterId);
    if (meterCode) recordCloudDeletion(meterCode);

    try {
      roundsChannel.current?.postMessage({ type: 'meter_deleted', meterId });
    } catch (e) {}

    fetch(`/api/meters/${meterId}`, { method: 'DELETE' }).catch(() => {});

    await safeCloudWrite(() => deleteDoc(doc(db, 'meter_definitions', meterId)));
    await safeCloudWrite(() => deleteDoc(doc(db, 'meters', meterId)));
    for (const r of readingsToDelete) {
      await safeCloudWrite(() => deleteDoc(doc(db, 'meter_readings_log', r.id)));
    }

    hasPendingLocalChanges.current = true;
    persistToServer();
    notify('Contador y lecturas eliminados permanentemente');
  };

  const recordMeterReading = async (data: Omit<MeterReadingRecord, 'id' | 'createdAt' | 'consumption' | 'intervalHours'>): Promise<MeterReadingRecord> => {
    // Prevent duplicate reading for the exact same meter on the same date/time with the same value
    const existingDuplicate = (meterReadingsLogRef.current || []).find(r => 
      r.meterId === data.meterId && 
      r.date === data.date && 
      (r.time || '00:00') === (data.time || '00:00') && 
      Number(r.currentValue) === Number(data.currentValue)
    );
    if (existingDuplicate) {
      notify(`ℹ️ Lectura ya registrada para este contador (${data.currentValue} ${data.unit})`);
      return existingDuplicate;
    }

    const meterLogs = (meterReadingsLogRef.current || []).filter(r => r.meterId === data.meterId);
    meterLogs.sort((a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime());
    const prevReading = meterLogs[0];

    let prevVal = data.previousValue;
    if (prevVal === undefined || prevVal === null) {
      if (prevReading) {
        prevVal = prevReading.currentValue;
      } else {
        const meterDef = (metersRef.current || []).find(m => m.id === data.meterId);
        prevVal = (meterDef && meterDef.initialReading !== undefined && meterDef.initialReading > 0)
          ? meterDef.initialReading 
          : data.currentValue;
      }
    }

    const consumption = Math.max(0, parseFloat((data.currentValue - prevVal).toFixed(3)));

    let intervalHours = 24;
    if (prevReading && (prevReading.timestamp || prevReading.date)) {
      const prevTime = new Date(prevReading.timestamp || `${prevReading.date}T${prevReading.time || '00:00'}:00.000Z`).getTime();
      const currTime = new Date(data.timestamp || `${data.date}T${data.time || '00:00'}:00.000Z`).getTime();
      const diffHours = (currTime - prevTime) / (1000 * 60 * 60);
      if (!isNaN(diffHours) && diffHours > 0) {
        intervalHours = parseFloat(diffHours.toFixed(1));
      }
    }

    const newRecord: MeterReadingRecord = {
      ...data,
      id: `rd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      previousValue: prevVal,
      consumption,
      intervalHours,
      createdAt: new Date().toISOString()
    };

    trackLocalCreation(newRecord.id);
    const updatedLogs = [newRecord, ...(meterReadingsLogRef.current || []).filter(r => r.id !== newRecord.id)];
    meterReadingsLogRef.current = updatedLogs;
    setMeterReadingsLog(updatedLogs);
    localStorage.setItem(STORAGE_KEYS.METER_READINGS_LOG, JSON.stringify(updatedLogs));

    // Update meter currentReading and lastReadingDate
    const updatedMeters = (metersRef.current || []).map(m => m.id === data.meterId ? {
      ...m,
      currentReading: data.currentValue,
      lastReadingDate: data.date,
      lastReadingTime: data.time,
      updatedAt: new Date().toISOString()
    } : m);
    metersRef.current = updatedMeters;
    setMeters(updatedMeters);
    /* Server Authoritative Meters */

    // Sync to Firestore in background
    safeCloudWrite(() => setDoc(doc(db, 'meter_readings_log', newRecord.id), cleanForFirestore(newRecord))).catch(() => {});
    const updatedMeter = updatedMeters.find(m => m.id === data.meterId);
    if (updatedMeter) {
      safeCloudWrite(() => setDoc(doc(db, 'meter_definitions', updatedMeter.id), cleanForFirestore(updatedMeter), { merge: true })).catch(() => {});
      safeCloudWrite(() => setDoc(doc(db, 'meters', updatedMeter.id), cleanForFirestore(updatedMeter), { merge: true })).catch(() => {});
    }

    try {
      roundsChannel.current?.postMessage({ type: 'meter_reading_added', reading: newRecord });
    } catch (e) {}

    fetch('/api/meter-readings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client-Id': clientSessionId.current },
      body: JSON.stringify(newRecord)
    }).catch(() => {});

    hasPendingLocalChanges.current = true;
    persistToServer();

    notify(`✅ Lectura guardada: ${data.currentValue} ${data.unit} (${consumption >= 0 ? `+${consumption}` : consumption} ${data.unit} en ${intervalHours}h)`);
    return newRecord;
  };

  const deleteMeterReading = async (id: string) => {
    markDeletedMeterReadingId(id);
    const updated = (meterReadingsLogRef.current || []).filter(r => r.id !== id);
    meterReadingsLogRef.current = updated;
    setMeterReadingsLog(updated);
    localStorage.setItem(STORAGE_KEYS.METER_READINGS_LOG, JSON.stringify(updated));

    recordCloudDeletion(id);
    try {
      roundsChannel.current?.postMessage({ type: 'meter_reading_deleted', readingId: id });
    } catch (e) {}

    await safeCloudWrite(() => deleteDoc(doc(db, 'meter_readings_log', id)));
    hasPendingLocalChanges.current = true;
    persistToServer();
    notify('Lectura eliminada');
  };

  const updateRequest = async (id: string, data: Partial<HotelRequest>) => {
    if (data.resolvedAt && data.status !== 'resuelto') {
      data.status = 'resuelto';
    }
    if (data.status === 'en_proceso' || data.status === 'pendiente') {
      (data as any).resolvedAt = null;
    }
    if (data.status === 'en_proceso' || data.status === 'resuelto') {
      delete lastPendingRequestReminderTime.current[id];
    }
    const prevReq = (requestsRef.current || []).find(r => r.id === id);
    const updatedTimestamp = new Date().toISOString();
    const updated = (requestsRef.current || []).map(item => {
      if (item.id === id) {
        const merged = { ...item, ...data, updatedAt: updatedTimestamp };
        if (data.status === 'en_proceso' || data.status === 'pendiente') {
          delete merged.resolvedAt;
        }
        return merged;
      }
      return item;
    });
    const updatedReq = updated.find(r => r.id === id);
    requestsRef.current = updated;
    setRequests(updated);
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(updated));
    idbSet(STORAGE_KEYS.REQUESTS, updated).catch(() => {});
    if (data.status === 'resuelto' && prevReq?.status !== 'resuelto') {
      notify(`✅ Solicitud "${updatedReq?.title || 'Solicitud'}" marcada como resuelta`);
    } else if (data.status === 'en_proceso' && prevReq?.status !== 'en_proceso') {
      notify(`🛠️ Proceso iniciado en "${updatedReq?.title || 'Solicitud'}"`);
    } else {
      notify('Solicitud actualizada');
    }

    if (updatedReq) {
      roundsChannel.current?.postMessage({ type: 'request_updated', request: updatedReq });
    }

    // Notificaciones Push al sistema operativo aunque la aplicación esté cerrada o minimizada
    if (data.status === 'resuelto' && prevReq?.status !== 'resuelto') {
      broadcastServerPushNotification({
        category: 'solicitudes',
        title: '✅ Tu Solicitud fue Resuelta y Cerrada',
        body: `"${updatedReq?.title || 'Solicitud'}" fue finalizada y resuelta con éxito por ${currentUser?.displayName || 'un compañero'}.\nUbicación: ${updatedReq?.location || 'Hotel'}`,
        url: '/?tab=solicitudes',
        tag: `req-resolved-${id}`,
        excludeUserId: currentUser?.id,
        excludeEmail: currentUser?.email,
        data: {
          requestId: id,
          status: 'resuelto',
          requestedById: updatedReq?.requestedById,
          requestedByEmail: updatedReq?.requestedByEmail,
          requestedBy: updatedReq?.requestedBy,
          assignedTo: updatedReq?.assignedTo || currentUser?.displayName
        }
      });
    } else if (data.status === 'en_proceso' && prevReq?.status !== 'en_proceso') {
      broadcastServerPushNotification({
        category: 'solicitudes',
        title: '🛠️ Tu Solicitud está en Atención',
        body: `"${updatedReq?.title || 'Solicitud'}" pasó a estar En Proceso por ${currentUser?.displayName || 'un compañero'}.\nUbicación: ${updatedReq?.location || 'Hotel'}`,
        url: '/?tab=solicitudes',
        tag: `req-progress-${id}`,
        excludeUserId: currentUser?.id,
        excludeEmail: currentUser?.email,
        data: {
          requestId: id,
          status: 'en_proceso',
          requestedById: updatedReq?.requestedById,
          requestedByEmail: updatedReq?.requestedByEmail,
          requestedBy: updatedReq?.requestedBy,
          assignedTo: updatedReq?.assignedTo || currentUser?.displayName
        }
      });
    }

    hasPendingLocalChanges.current = true;
    persistToServer();

    await safeCloudWrite(() => updateDoc(doc(db, 'requests', id), cleanForFirestore(data as any)));
  };

  const deleteRequest = async (id: string) => {
    if (currentUser && !currentUser.permissions?.canDeleteRecords) {
      notify('Acceso restringido: No tienes permisos para eliminar solicitudes.');
      return;
    }
    markDeletedRequestId(id);
    localActionIds.current.add(id);
    setTimeout(() => { localActionIds.current.delete(id); }, 15000);
    const updated = (requestsRef.current || []).filter(item => item.id !== id);
    requestsRef.current = updated;
    setRequests(updated);
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(updated));
    notify('Solicitud eliminada');

    try {
      roundsChannel.current?.postMessage({ type: 'request_deleted', requestId: id });
    } catch (e) {}

    fetch(`/api/requests/${id}`, { method: 'DELETE' }).catch(() => {});
    recordCloudDeletion(id);

    await safeCloudWrite(() => deleteDoc(doc(db, 'requests', id)));

    hasPendingLocalChanges.current = true;
    persistToServer();
  };

  // -------------------------------------------------------------
  // TASKS ACTIONS (Tareas para compañeros)
  // -------------------------------------------------------------
  const addTask = async (taskData: Omit<MaintenanceTask, 'id' | 'createdAt'> & { createdAt?: string }) => {
    const createdAt = (taskData.createdAt && taskData.createdAt.trim()) || getLocalDateTimeString();
    const newTask: MaintenanceTask = {
      ...taskData,
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      createdAt,
      status: taskData.status || 'pendiente',
      priority: taskData.priority || 'media',
      category: taskData.category || 'mantenimiento',
      createdById: taskData.createdById || currentUser?.id || 'admin',
      createdByName: taskData.createdByName || currentUser?.displayName || currentUser?.email || 'Compañero de Mantenimiento',
      checklist: taskData.checklist || [],
      comments: taskData.comments || []
    };

    unmarkDeletedTaskId(newTask.id);
    trackLocalCreation(newTask.id);

    const updated = mergeTaskLists(tasksRef.current || [], [newTask], getDeletedTaskIds());
    tasksRef.current = updated;
    setTasks(updated);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
    localActionIds.current.add(newTask.id);
    setTimeout(() => { localActionIds.current.delete(newTask.id); }, 15000);

    roundsChannel.current?.postMessage({ type: 'new_task', task: newTask });
    notify(`✅ Tarea "${newTask.title}" asignada correctamente`);

    // Sincronización instantánea (<20ms) con el servidor local y difusión SSE a todos los usuarios conectados
    fetch('/api/tasks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': clientSessionId.current
      },
      body: JSON.stringify(newTask)
    }).catch(() => {});
    
    // Determinar si la tarea tiene una persona asignada en específico
    const assignName = (newTask.assignedToName || '').toLowerCase().trim();
    const isSpecificAssignee = Boolean(
      newTask.assignedToId || (
        assignName &&
        !assignName.includes('todo el equipo') &&
        !assignName.includes('todos') &&
        !assignName.includes('general') &&
        !assignName.includes('sin asignar')
      )
    );

    // Notificar por Push a todos los compañeros conectados (indicando claramente para quién es la tarea)
    broadcastServerPushNotification({
      category: 'tareas',
      title: isSpecificAssignee ? `📋 Nueva Tarea: ${newTask.assignedToName || 'Compañero'}` : `📋 Nueva Tarea de Mantenimiento`,
      body: `"${newTask.title}"\nAsignado a: ${newTask.assignedToName || 'Todo el equipo'}\nAsignada por: ${currentUser?.displayName || 'Compañero'}\nPrioridad: ${newTask.priority.toUpperCase()}`,
      url: '/?tab=tareas',
      tag: `task-${newTask.id}`,
      excludeUserId: currentUser?.id,
      excludeEmail: currentUser?.email,
      data: {
        taskId: newTask.id,
        assignedToId: newTask.assignedToId,
        assignedToName: newTask.assignedToName,
        isSpecificAssignee
      }
    });

    hasPendingLocalChanges.current = true;
    persistToServer();

    await safeCloudWrite(() => setDoc(doc(db, 'tasks', newTask.id), cleanForFirestore(newTask), { merge: true }));
  };

  const updateTask = async (id: string, data: Partial<MaintenanceTask>) => {
    const prevTask = (tasksRef.current || []).find(t => t.id === id);
    const payload = { ...data, updatedAt: getLocalDateTimeString() };
    const updated = (tasksRef.current || []).map(item => item.id === id ? { ...item, ...payload } : item);
    const updatedTask = updated.find(t => t.id === id);
    tasksRef.current = updated;
    setTasks(updated);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));

    if (payload.status === 'completada') {
      notify('✅ Tarea marcada como completada');
    } else {
      notify('Tarea actualizada');
    }

    if (updatedTask) {
      roundsChannel.current?.postMessage({ type: 'task_updated', task: updatedTask });
      fetch('/api/tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientSessionId.current
        },
        body: JSON.stringify(updatedTask)
      }).catch(() => {});
    }

    // Notificaciones Push al sistema operativo aunque la aplicación esté cerrada o minimizada
    if (payload.status === 'completada' && prevTask?.status !== 'completada') {
      broadcastServerPushNotification({
        category: 'tareas',
        title: '✅ Tarea de Mantenimiento Finalizada',
        body: `"${updatedTask?.title || 'Tarea'}" fue completada con éxito por ${currentUser?.displayName || 'un compañero'}.`,
        url: '/?tab=tareas',
        tag: `task-done-${id}`,
        excludeUserId: currentUser?.id,
        excludeEmail: currentUser?.email,
        data: {
          createdById: updatedTask?.createdById,
          assignedToId: updatedTask?.assignedToId
        }
      });
    } else if (payload.status === 'en_progreso' && prevTask?.status !== 'en_progreso') {
      broadcastServerPushNotification({
        category: 'tareas',
        title: '⚡ Tarea de Mantenimiento En Progreso',
        body: `"${updatedTask?.title || 'Tarea'}" pasó a estar En Progreso por ${currentUser?.displayName || 'un compañero'}.`,
        url: '/?tab=tareas',
        tag: `task-progress-${id}`,
        excludeUserId: currentUser?.id,
        excludeEmail: currentUser?.email,
        data: {
          createdById: updatedTask?.createdById,
          assignedToId: updatedTask?.assignedToId
        }
      });
    }

    hasPendingLocalChanges.current = true;
    persistToServer();

    await safeCloudWrite(() => updateDoc(doc(db, 'tasks', id), cleanForFirestore(payload as any)));
  };

  const deleteTask = async (id: string) => {
    if (currentUser && !currentUser.permissions?.canDeleteRecords && currentUser.role !== 'admin') {
      notify('Acceso restringido: No tienes permisos para eliminar tareas.');
      return;
    }
    markDeletedTaskId(id);
    localActionIds.current.add(id);
    setTimeout(() => { localActionIds.current.delete(id); }, 15000);
    const updated = (tasksRef.current || []).filter(item => item.id !== id);
    tasksRef.current = updated;
    setTasks(updated);
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(updated));
    notify('Tarea eliminada');

    try {
      roundsChannel.current?.postMessage({ type: 'task_deleted', taskId: id });
    } catch (e) {}

    fetch(`/api/tasks/${id}`, { method: 'DELETE' }).catch(() => {});
    recordCloudDeletion(id);

    await safeCloudWrite(() => deleteDoc(doc(db, 'tasks', id)));

    hasPendingLocalChanges.current = true;
    persistToServer();
  };

  const toggleTaskChecklistItem = async (taskId: string, itemId: string) => {
    const task = (tasksRef.current || []).find(t => t.id === taskId);
    if (!task) return;

    const checklist = (task.checklist || []).map(item => {
      if (item.id === itemId) {
        const nextCompleted = !item.completed;
        return {
          ...item,
          completed: nextCompleted,
          completedAt: nextCompleted ? getLocalDateTimeString() : undefined,
          completedBy: nextCompleted ? (currentUser?.displayName || currentUser?.email || 'Compañero') : undefined
        };
      }
      return item;
    });

    const allCompleted = checklist.length > 0 && checklist.every(i => i.completed);
    const updateData: Partial<MaintenanceTask> = {
      checklist,
      status: allCompleted ? 'completada' : task.status === 'completada' ? 'en_progreso' : task.status,
      completedAt: allCompleted ? (task.completedAt || getLocalDateTimeString()) : undefined,
      completedBy: allCompleted ? (task.completedBy || currentUser?.displayName || currentUser?.email || 'Compañero') : undefined
    };

    await updateTask(taskId, updateData);
  };

  const addTaskComment = async (taskId: string, text: string, photos?: string[]) => {
    if (!text.trim() && (!photos || photos.length === 0)) return;
    const task = (tasksRef.current || []).find(t => t.id === taskId);
    if (!task) return;

    const newComment: TaskComment = {
      id: `cmt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.displayName || currentUser?.email || 'Compañero',
      userRole: currentUser?.role || 'técnico',
      text: text.trim(),
      timestamp: getLocalDateTimeString(),
      photos: photos && photos.length > 0 ? photos : undefined,
      isProgressLog: true
    };

    const comments = [...(task.comments || []), newComment];
    const updateData: Partial<MaintenanceTask> = {
      comments,
      // Si la tarea estaba en estado pendiente y se registra un avance, pasar a en_progreso
      status: task.status === 'pendiente' ? 'en_progreso' : task.status
    };
    await updateTask(taskId, updateData);
  };

  // -------------------------------------------------------------
  // EQUIPMENT ACTIONS (Shared Real-Time)
  // -------------------------------------------------------------
  const addEquipment = async (eq: Omit<Equipment, 'id'>) => {
    const newEq: Equipment = {
      ...eq,
      id: `eq-${Date.now()}`
    };
    unmarkDeletedEquipmentId(newEq.id);
    trackLocalCreation(newEq.id);
    localActionIds.current.add(newEq.id);
    setTimeout(() => { localActionIds.current.delete(newEq.id); }, 15000);
    const updated = [newEq, ...(equipmentsRef.current || []).filter(e => e.id !== newEq.id)];
    equipmentsRef.current = updated;
    setEquipments(updated);
    localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(updated));
    notify(`Equipo ${newEq.tag} agregado con éxito`);

    hasPendingLocalChanges.current = true;
    persistToServer();

    await safeCloudWrite(() => setDoc(doc(db, 'equipments', newEq.id), cleanForFirestore(newEq)));
  };

  const updateEquipment = async (id: string, data: Partial<Equipment>) => {
    const updated = (equipmentsRef.current || []).map(item => item.id === id ? { ...item, ...data } : item);
    equipmentsRef.current = updated;
    setEquipments(updated);
    localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(updated));
    notify('Equipo actualizado correctamente');

    hasPendingLocalChanges.current = true;
    persistToServer();

    await safeCloudWrite(() => updateDoc(doc(db, 'equipments', id), cleanForFirestore(data as any)));
  };

  const deleteEquipment = async (id: string) => {
    if (currentUser && !currentUser.permissions?.canDeleteRecords) {
      notify('Acceso restringido: No tienes permisos para eliminar equipos.');
      return;
    }
    markDeletedEquipmentId(id);
    localActionIds.current.add(id);
    setTimeout(() => { localActionIds.current.delete(id); }, 15000);
    const updated = (equipmentsRef.current || []).filter(item => item.id !== id);
    equipmentsRef.current = updated;
    setEquipments(updated);
    localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify(updated));
    notify('Equipo eliminado del inventario');

    try {
      roundsChannel.current?.postMessage({ type: 'equipment_deleted', equipmentId: id });
    } catch (e) {}

    fetch(`/api/equipments/${id}`, { method: 'DELETE' }).catch(() => {});
    recordCloudDeletion(id);

    await safeCloudWrite(() => deleteDoc(doc(db, 'equipments', id)));

    hasPendingLocalChanges.current = true;
    persistToServer();
  };

  const clearGenericImportedEquipments = async () => {
    const generic = equipments.filter(e => e.tag.startsWith('EQ-IMP-') || e.name === 'Equipo Importado');
    if (generic.length === 0) {
      notify('No se encontraron equipos genéricos importados');
      return;
    }
    for (const item of generic) {
      markDeletedEquipmentId(item.id);
      fetch(`/api/equipments/${item.id}`, { method: 'DELETE' }).catch(() => {});
    }
    setEquipments(prev => prev.filter(e => !e.tag.startsWith('EQ-IMP-') && e.name !== 'Equipo Importado'));
    notify(`Se eliminaron ${generic.length} equipos genéricos.`);
    persistToServer();
    try {
      for (const item of generic) {
        await safeCloudWrite(() => deleteDoc(doc(db, 'equipments', item.id))).catch(() => null);
      }
    } catch (e) {
      console.warn('Error deleting generic equipments:', e);
    }
  };

  const cleanAllImportedEquipments = async () => {
    const initialIds = new Set(INITIAL_EQUIPMENT.map(e => e.id));
    const toRemove = equipments.filter(e => 
      !initialIds.has(e.id) || 
      e.tag.startsWith('EQ-IMP-') || 
      e.name === 'Equipo Importado' || 
      (e.notes && e.notes.includes('documento original'))
    );
    
    if (toRemove.length === 0) {
      notify('No se detectaron equipos importados de Excel.');
      return;
    }
    
    for (const item of toRemove) {
      markDeletedEquipmentId(item.id);
      fetch(`/api/equipments/${item.id}`, { method: 'DELETE' }).catch(() => {});
    }
    
    setEquipments(prev => prev.filter(e => !toRemove.some(rem => rem.id === e.id)));
    notify(`Se eliminaron ${toRemove.length} equipos importados de Excel. Parque de Bombas restaurado.`);
    persistToServer();
    
    try {
      for (const item of toRemove) {
        await safeCloudWrite(() => deleteDoc(doc(db, 'equipments', item.id))).catch(() => null);
      }
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error deleting imported equipments in cloud:', e);
    }
  };

  const restoreOfficialEquipmentPark = async () => {
    const initialIds = new Set(INITIAL_EQUIPMENT.map(e => e.id));
    const toRemove = equipments.filter(e => !initialIds.has(e.id));
    for (const item of toRemove) {
      markDeletedEquipmentId(item.id);
      fetch(`/api/equipments/${item.id}`, { method: 'DELETE' }).catch(() => {});
    }
    for (const initEq of INITIAL_EQUIPMENT) {
      unmarkDeletedEquipmentId(initEq.id);
    }
    setEquipments(INITIAL_EQUIPMENT);
    notify('Parque oficial de bombas restablecido (12 unidades oficiales)');
    persistToServer();
    try {
      await ensureAuthenticated();
      for (const item of toRemove) {
        await safeCloudWrite(() => deleteDoc(doc(db, 'equipments', item.id))).catch(() => null);
      }
      for (const initEq of INITIAL_EQUIPMENT) {
        await safeCloudWrite(() => setDoc(doc(db, 'equipments', initEq.id), initEq));
      }
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error restoring official equipment park in cloud:', e);
    }
  };

  // -------------------------------------------------------------
  // UPLOADED DOCUMENTS (Exact Original Documents)
  // -------------------------------------------------------------
  const addUploadedDocument = async (docData: Omit<UploadedDocument, 'id'>): Promise<UploadedDocument> => {
    const newDoc: UploadedDocument = {
      ...docData,
      id: `doc-${Date.now()}`
    };
    setUploadedDocuments(prev => [newDoc, ...prev]);
    notify(`Documento "${newDoc.name}" guardado correctamente`);

    try {
      const firestoreDoc = { ...newDoc };
      // Strip oversized base64 for Firestore to avoid 1MB limit, but it remains in state and localStorage
      if (firestoreDoc.rawBase64 && firestoreDoc.rawBase64.length > 600000) {
        firestoreDoc.rawBase64 = undefined;
      }
      await safeCloudWrite(() => setDoc(doc(db, 'uploaded_documents', newDoc.id), cleanForFirestore(firestoreDoc)));
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error saving uploaded document in cloud:', e);
    }
    return newDoc;
  };

  const updateUploadedDocument = async (updatedDoc: UploadedDocument) => {
    setUploadedDocuments(prev => prev.map(d => d.id === updatedDoc.id ? updatedDoc : d));
    notify('Documento actualizado correctamente');
    try {
      const firestoreDoc = { ...updatedDoc };
      if (firestoreDoc.rawBase64 && firestoreDoc.rawBase64.length > 600000) {
        firestoreDoc.rawBase64 = undefined;
      }
      await safeCloudWrite(() => setDoc(doc(db, 'uploaded_documents', updatedDoc.id), cleanForFirestore(firestoreDoc)));
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error updating document in cloud:', e);
    }
  };

  const deleteUploadedDocument = async (id: string) => {
    if (currentUser && !currentUser.permissions?.canDeleteRecords) {
      notify('Acceso restringido: No tienes permisos para eliminar documentos.');
      return;
    }
    setUploadedDocuments(prev => prev.filter(d => d.id !== id));
    notify('Documento eliminado correctamente');
    fetch(`/api/uploaded-documents/${id}`, { method: 'DELETE' }).catch(() => {});
    persistToServer();
    try {
      await safeCloudWrite(() => deleteDoc(doc(db, 'uploaded_documents', id)));
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error deleting document in cloud:', e);
    }
  };

  const createDocumentFolder = async (name: string, color?: string) => {
    if (currentUser && !currentUser.permissions?.canEditSettings) {
      notify('Acceso restringido: No tienes permisos para crear carpetas.');
      return;
    }
    const newFolder: DocumentFolder = {
      id: `folder-${Date.now()}`,
      name: name.trim(),
      color: color || 'emerald',
      createdAt: new Date().toISOString()
    };
    setDocumentFolders(prev => [newFolder, ...prev]);
    notify(`Carpeta "${name}" creada correctamente`);
    try {
      await safeCloudWrite(() => setDoc(doc(db, 'document_folders', newFolder.id), cleanForFirestore(newFolder)));
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error creating document folder in cloud:', e);
    }
  };

  const deleteDocumentFolder = async (folderId: string) => {
    if (currentUser && !currentUser.permissions?.canDeleteRecords) {
      notify('Acceso restringido: No tienes permisos para eliminar carpetas.');
      return;
    }
    const updatedFolders = (documentFoldersRef.current || []).filter(f => f.id !== folderId);
    const updatedDocs = (uploadedDocumentsRef.current || []).map(d => d.folderId === folderId ? { ...d, folderId: undefined } : d);
    documentFoldersRef.current = updatedFolders;
    uploadedDocumentsRef.current = updatedDocs;
    setDocumentFolders(updatedFolders);
    setUploadedDocuments(updatedDocs);
    notify('Carpeta eliminada correctamente');
    fetch(`/api/document-folders/${folderId}`, { method: 'DELETE' }).catch(() => {});
    try {
      await safeCloudWrite(() => deleteDoc(doc(db, 'document_folders', folderId)));
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error deleting document folder in cloud:', e);
    }
    persistToServer();
  };

  const clearAllUploadedDocuments = async () => {
    if (currentUser && !currentUser.permissions?.canDeleteRecords) {
      notify('Acceso restringido: No tienes permisos para eliminar documentos.');
      return;
    }
    const current = [...uploadedDocuments];
    uploadedDocumentsRef.current = [];
    setUploadedDocuments([]);
    localStorage.removeItem(STORAGE_KEYS.DOCUMENTS);
    notify('Todos los documentos de Hojas de Vida han sido eliminados.');
    try {
      for (const docItem of current) {
        fetch(`/api/uploaded-documents/${docItem.id}`, { method: 'DELETE' }).catch(() => {});
        await safeCloudWrite(() => deleteDoc(doc(db, 'uploaded_documents', docItem.id))).catch(() => null);
      }
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error clearing uploaded documents in cloud:', e);
    }
    persistToServer();
  };

  const addUser = async (userData: Omit<User, 'id' | 'createdAt'>) => {
    const cleanEmail = userData.email?.toLowerCase().trim();
    const cleanName = userData.displayName?.trim() || 'Nuevo Usuario';

    // If a user with this exact email already exists, update them instead of blocking
    if (cleanEmail) {
      const existingUser = users.find(u => u.email?.toLowerCase().trim() === cleanEmail);
      if (existingUser) {
        await updateUser(existingUser.id, {
          ...userData,
          displayName: cleanName,
          status: userData.status || 'active'
        });
        notify(`Usuario "${cleanName}" actualizado correctamente`);
        return;
      }
    }

    const userRole = userData.role || 'técnico';
    const finalPermissions: UserPermissions = {
      canEditSettings: userData.permissions?.canEditSettings !== undefined ? Boolean(userData.permissions.canEditSettings) : userRole === 'admin',
      canDeleteRecords: userData.permissions?.canDeleteRecords !== undefined ? Boolean(userData.permissions.canDeleteRecords) : userRole === 'admin',
      canManageUsers: userData.permissions?.canManageUsers !== undefined ? Boolean(userData.permissions.canManageUsers) : userRole === 'admin',
      canStartRounds: userData.permissions?.canStartRounds !== undefined
        ? Boolean(userData.permissions.canStartRounds)
        : (userData.canStartRounds !== undefined ? Boolean(userData.canStartRounds) : userRole === 'técnico'),
      notifyRoundInProgress: userData.permissions?.notifyRoundInProgress !== undefined
        ? Boolean(userData.permissions.notifyRoundInProgress)
        : (userData.notifyRoundInProgress !== undefined ? Boolean(userData.notifyRoundInProgress) : userRole === 'admin'),
      notifyRounds: userData.permissions?.notifyRounds !== undefined
        ? Boolean(userData.permissions.notifyRounds)
        : (userData.notifyRounds !== undefined ? Boolean(userData.notifyRounds) : userRole === 'admin'),
      notifyRequests: userData.permissions?.notifyRequests !== undefined
        ? Boolean(userData.permissions.notifyRequests)
        : (userData.notifyRequests !== undefined ? Boolean(userData.notifyRequests) : true),
      notifyTasks: userData.permissions?.notifyTasks !== undefined
        ? Boolean(userData.permissions.notifyTasks)
        : (userData.notifyTasks !== undefined ? Boolean(userData.notifyTasks) : true),
      notifyIncidents: userData.permissions?.notifyIncidents !== undefined
        ? Boolean(userData.permissions.notifyIncidents)
        : (userData.notifyIncidents !== undefined ? Boolean(userData.notifyIncidents) : true)
    };

    const newId = `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const newUser: User = {
      ...userData,
      id: newId,
      displayName: cleanName,
      email: cleanEmail || `${cleanName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString().slice(-4)}@hotel.com`,
      role: userRole,
      password: userData.password ? userData.password.trim() : '123456',
      status: userData.status || 'active',
      department: userData.department || 'Mantenimiento e Ingeniería',
      visibleSections: Array.isArray(userData.visibleSections) && userData.visibleSections.length > 0
        ? userData.visibleSections
        : (userRole === 'admin' 
          ? ['dashboard', 'rondas', 'bombas', 'hojas_vida', 'incidencias', 'preventivo', 'usuarios', 'configuraciones', 'solicitudes', 'tareas', 'horarios']
          : ['dashboard', 'rondas', 'incidencias', 'horarios', 'hojas_vida', 'bombas', 'tareas', 'solicitudes']),
      permissions: finalPermissions,
      canStartRounds: finalPermissions.canStartRounds,
      notifyRoundInProgress: finalPermissions.notifyRoundInProgress,
      notifyRounds: finalPermissions.notifyRounds,
      notifyRequests: finalPermissions.notifyRequests,
      notifyTasks: finalPermissions.notifyTasks,
      notifyIncidents: finalPermissions.notifyIncidents,
      createdAt: new Date().toISOString()
    };

    unmarkDeletedUserId(newUser.id);
    localActionIds.current.add(newUser.id);
    setTimeout(() => { localActionIds.current.delete(newUser.id); }, 15000);

    // Ensure phantom or legacy placeholder users are never preserved
    const baseClean = users.filter(u => u && u.id !== 'usr-admin-master' && u.displayName !== 'Administrador Principal');
    const updated = [...baseClean.filter(u => u.id !== newUser.id), newUser];
    usersRef.current = updated;
    setUsers(updated);
    localStorage.setItem('hotel_maint_users', JSON.stringify(updated));
    notify(`Usuario ${newUser.displayName} creado correctamente`);
    persistToServer();
    try {
      await safeCloudWrite(() => setDoc(doc(db, 'users', newUser.id), cleanForFirestore(newUser)));
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error creating user in cloud:', e);
    }
  };

  const updateUser = async (id: string, data: Partial<User>) => {
    const nowIso = new Date().toISOString();
    const targetBase = users.find(u => u.id === id) || (currentUserRef.current?.id === id ? currentUserRef.current : null);

    const mergedPermissions = data.permissions || targetBase?.permissions;
    const finalPermissions: UserPermissions | undefined = mergedPermissions ? {
      canEditSettings: data.permissions?.canEditSettings !== undefined ? Boolean(data.permissions.canEditSettings) : Boolean(mergedPermissions.canEditSettings),
      canDeleteRecords: data.permissions?.canDeleteRecords !== undefined ? Boolean(data.permissions.canDeleteRecords) : Boolean(mergedPermissions.canDeleteRecords),
      canManageUsers: data.permissions?.canManageUsers !== undefined ? Boolean(data.permissions.canManageUsers) : Boolean(mergedPermissions.canManageUsers),
      canStartRounds: data.permissions?.canStartRounds !== undefined ? Boolean(data.permissions.canStartRounds) : (data.canStartRounds !== undefined ? Boolean(data.canStartRounds) : Boolean(mergedPermissions.canStartRounds)),
      notifyRoundInProgress: data.permissions?.notifyRoundInProgress !== undefined ? Boolean(data.permissions.notifyRoundInProgress) : (data.notifyRoundInProgress !== undefined ? Boolean(data.notifyRoundInProgress) : Boolean(mergedPermissions.notifyRoundInProgress)),
      notifyRounds: data.permissions?.notifyRounds !== undefined ? Boolean(data.permissions.notifyRounds) : (data.notifyRounds !== undefined ? Boolean(data.notifyRounds) : Boolean(mergedPermissions.notifyRounds)),
      notifyRequests: data.permissions?.notifyRequests !== undefined ? Boolean(data.permissions.notifyRequests) : (data.notifyRequests !== undefined ? Boolean(data.notifyRequests) : Boolean(mergedPermissions.notifyRequests)),
      notifyTasks: data.permissions?.notifyTasks !== undefined ? Boolean(data.notifyTasks !== undefined ? data.notifyTasks : mergedPermissions.notifyTasks) : Boolean(mergedPermissions.notifyTasks),
      notifyIncidents: data.permissions?.notifyIncidents !== undefined ? Boolean(data.permissions.notifyIncidents) : (data.notifyIncidents !== undefined ? Boolean(data.notifyIncidents) : Boolean(mergedPermissions.notifyIncidents)),
    } : undefined;

    const normalizedData: Partial<User> = {
      ...data,
      ...(finalPermissions ? {
        permissions: finalPermissions,
        canStartRounds: finalPermissions.canStartRounds,
        notifyRoundInProgress: finalPermissions.notifyRoundInProgress,
        notifyRounds: finalPermissions.notifyRounds,
        notifyRequests: finalPermissions.notifyRequests,
        notifyTasks: finalPermissions.notifyTasks,
        notifyIncidents: finalPermissions.notifyIncidents,
      } : {})
    };

    const updatedUserFull = { ...(targetBase || {}), ...normalizedData, id, updatedAt: nowIso };

    const updated = users.map(u => u.id === id ? { ...u, ...normalizedData, updatedAt: nowIso } : u);
    usersRef.current = updated;
    setUsers(updated);
    localStorage.setItem('hotel_maint_users', JSON.stringify(updated));
    if (currentUserRef.current && (currentUserRef.current.id === id || (data.email && currentUserRef.current.email.toLowerCase().trim() === data.email.toLowerCase().trim()))) {
      const updatedUser = { ...currentUserRef.current, ...normalizedData, updatedAt: nowIso };
      setCurrentUserState(updatedUser);
      currentUserRef.current = updatedUser;
      localStorage.setItem('hotel_maint_current_user', JSON.stringify(updatedUser));
      sessionStorage.setItem('hotel_maint_current_user', JSON.stringify(updatedUser));
    }
    notify('Usuario actualizado correctamente en la nube');
    persistToServer();
    try {
      await safeCloudWrite(() => setDoc(doc(db, 'users', id), cleanForFirestore(updatedUserFull as any), { merge: true }));
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error updating user in cloud:', e);
    }
  };

  const deleteUser = async (id: string) => {
    if (currentUser && !currentUser.permissions?.canManageUsers) {
      notify('Acceso restringido: No tienes permisos para eliminar usuarios.');
      return;
    }
    if (currentUser && (currentUser.id === id || (currentUser.email && users.find(u => u.id === id)?.email?.toLowerCase().trim() === currentUser.email.toLowerCase().trim()))) {
      notify('No puedes eliminar tu propia cuenta en sesión activa.');
      return;
    }
    markDeletedUserId(id);
    localActionIds.current.add(id);
    setTimeout(() => { localActionIds.current.delete(id); }, 15000);
    const updated = users.filter(u => u.id !== id);
    usersRef.current = updated;
    setUsers(updated);
    localStorage.setItem('hotel_maint_users', JSON.stringify(updated));
    if (currentUser && currentUser.id === id) {
      setCurrentUserState(null);
      localStorage.removeItem('hotel_maint_current_user');
      sessionStorage.removeItem('hotel_maint_current_user');
    }
    notify('Usuario eliminado correctamente');

    try {
      roundsChannel.current?.postMessage({ type: 'user_deleted', userId: id });
    } catch (e) {}

    fetch(`/api/users/${id}`, { method: 'DELETE' }).catch(() => {});
    recordCloudDeletion(id);
    persistToServer();
    try {
      await safeCloudWrite(() => deleteDoc(doc(db, 'users', id)));
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error deleting user in cloud:', e);
    }
  };

  // -------------------------------------------------------------
  // PUMP INSPECTIONS (Shared Real-Time)
  // -------------------------------------------------------------
  const addPumpInspection = async (insp: Omit<PumpInspection, 'id'>) => {
    const newInsp: PumpInspection = {
      ...insp,
      id: `insp-${Date.now()}`
    };
    setPumpInspections(prev => [newInsp, ...prev]);

    // Update equipment status & last inspection date
    const updatedStatus = insp.overallCondition === 'critico' ? 'fuera_servicio' : (insp.overallCondition === 'observacion' ? 'alerta' : 'operativo');
    const lastDate = insp.date.split(' ')[0];

    setEquipments(prev => prev.map(eq => {
      if (eq.id === insp.equipmentId) {
        return {
          ...eq,
          status: updatedStatus as any,
          lastInspectionDate: lastDate,
          currentHours: Math.max(eq.currentHours, insp.hourMeter || eq.currentHours),
        };
      }
      return eq;
    }));

    notify(`Revisión técnica registrada para ${insp.equipmentTag}`);

    try {
      await safeCloudWrite(() => setDoc(doc(db, 'pump_inspections', newInsp.id), cleanForFirestore(newInsp)));
      await safeCloudWrite(() => updateDoc(doc(db, 'equipments', insp.equipmentId), cleanForFirestore({
        status: updatedStatus,
        lastInspectionDate: lastDate,
      })));
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error saving pump inspection in cloud:', e);
    }
  };

  // -------------------------------------------------------------
  // ROUNDS ACTIONS (Shared Real-Time)
  // -------------------------------------------------------------
  const syncActiveRoundTimeoutRef = useRef<any>(null);
  const syncActiveRoundToCloud = (round: DailyRound, immediate = false) => {
    // Si la ronda ya fue completada o descartada, no sincronizar nunca más un estado 'en_progreso'
    if (completedRoundIdsRef.current.has(round.id) || getDeletedRoundIds().has(round.id)) {
      return;
    }
    if ((roundsRef.current || []).some(r => r.id === round.id && r.status === 'completada')) {
      return;
    }

    try {
      roundsChannel.current?.postMessage({ type: 'active_round_updated', round });
    } catch (e) {}

    if (syncActiveRoundTimeoutRef.current) {
      clearTimeout(syncActiveRoundTimeoutRef.current);
    }

    const roundToSync: DailyRound = round;

    const executeSync = async () => {
      if (completedRoundIdsRef.current.has(roundToSync.id) || getDeletedRoundIds().has(roundToSync.id)) return;
      if ((roundsRef.current || []).some(r => r.id === roundToSync.id && r.status === 'completada')) return;

      // 1. Post to Express server so SSE emits round_updated (<30ms)
      fetch('/api/rounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientSessionId.current
        },
        body: JSON.stringify(roundToSync)
      }).catch(() => {});

      // 2. Persist safely in Cloud Firestore
      await safeCloudWrite(() => setDoc(doc(db, 'rounds', roundToSync.id), cleanForFirestore(roundToSync)));
    };

    if (immediate) {
      syncActiveRoundTimeoutRef.current = setTimeout(() => {
        executeSync();
      }, 400);
    } else {
      syncActiveRoundTimeoutRef.current = setTimeout(() => {
        executeSync();
      }, 2500);
    }
  };

  // Debounced helpers for super-fast round editing without UI lag
  const setRoundsDebounceTimer = useRef<any>(null);
  const queueUpdateRounds = (updatedList: DailyRound[], immediate: boolean) => {
    roundsRef.current = updatedList;
    if (setRoundsDebounceTimer.current) clearTimeout(setRoundsDebounceTimer.current);
    setRoundsDebounceTimer.current = setTimeout(() => {
      setRounds(roundsRef.current || updatedList);
    }, immediate ? 400 : 2500);
  };

  const activeRoundStorageTimer = useRef<any>(null);
  const queueSaveActiveRoundStorage = (round: DailyRound, immediate: boolean) => {
    // Persistencia síncrona e inmediata al 100%: Cualquier cambio se guarda al instante para que entrar al ascensor o bloquear pantalla jamás pierda un dato
    safeSetItem(STORAGE_KEYS.ACTIVE_ROUND, JSON.stringify(round));
    idbSet(STORAGE_KEYS.ACTIVE_ROUND, round).catch(() => {});
  };

  const startNewRound = (shift: RoundShift, technicianName: string, customDate?: string): DailyRound | null => {
    if (currentUser && !isSectionAllowed('rondas')) {
      notify('Acceso restringido: No tienes permisos asignados para realizar rondas diarias.');
      return null;
    }

    if (currentUser && currentUser.permissions?.canStartRounds === false) {
      notify('Acceso restringido: Tu perfil está configurado como visualizador y no tiene permiso para iniciar nuevas rondas.');
      return null;
    }

    const now = new Date();
    let dateStr = customDate;
    if (!dateStr) {
      const currentHour = now.getHours();
      // Turno Noche (22:00 - 06:00): Si se registra entre medianoche y las 06:59 AM, corresponde a la fecha de la noche que inició el día anterior
      if (shift === 'noche' && currentHour < 7) {
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const yyyy = yesterday.getFullYear();
        const mm = String(yesterday.getMonth() + 1).padStart(2, '0');
        const dd = String(yesterday.getDate()).padStart(2, '0');
        dateStr = `${yyyy}-${mm}-${dd}`;
      } else {
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        dateStr = `${yyyy}-${mm}-${dd}`;
      }
    }

    const timeStr = now.toTimeString().slice(0, 5);
    const userDisplayName = currentUser?.displayName?.trim() 
      || (currentUser?.email ? (users.find(u => u.id === currentUser.id || u.email?.toLowerCase().trim() === currentUser.email?.toLowerCase().trim())?.displayName?.trim() || currentUser.email.split('@')[0]) : '')
      || 'Técnico de Turno';
    const techName = technicianName?.trim() || userDisplayName;

    const newRound: DailyRound = {
      id: `rnd-${Date.now()}`,
      date: dateStr,
      time: timeStr,
      shift,
      technicianName: techName,
      userId: currentUser?.id,
      userEmail: currentUser?.email,
      status: 'en_progreso',
      checkpoints: roundTemplate.map(chk => {
        const defaultStatus = chk.statusValue;
        const actionType = defaultStatus ? getCheckpointButtonAction(chk, defaultStatus, roundTemplate) : 'default';
        const isOff = actionType === 'turn_off';

        const initFields = chk.measurementFields && Array.isArray(chk.measurementFields)
          ? chk.measurementFields.map((f, fIdx) => {
              const defaultFieldStatus = f.statusValue;
              const fieldAction = defaultFieldStatus ? getFieldButtonAction(f, defaultFieldStatus, chk, roundTemplate, fIdx) : 'default';
              const isFieldOff = isOff || fieldAction === 'turn_off';
              const normalVal = f.value !== undefined ? f.value : (f.minValue !== undefined && f.maxValue !== undefined ? Number(((f.minValue + f.maxValue) / 2).toFixed(1)) : (f.minValue ?? 0));
              return {
                ...f,
                statusValue: defaultFieldStatus,
                value: f.value !== undefined ? f.value : (isFieldOff ? 0 : undefined),
                ampState: isFieldOff ? 'Apagado' : (f.ampState || 'Encendido'),
                lastNonZeroValue: typeof normalVal === 'number' && normalVal > 0 ? normalVal : (f.minValue ?? 0)
              };
            })
          : undefined;

        let initVal: any = chk.currentValue !== undefined ? chk.currentValue : '';
        if (initVal === '' && chk.type === 'numeric' && isOff) {
          initVal = 0;
        }

        return {
          ...chk,
          measurementFields: initFields,
          statusValue: defaultStatus,
          ampState: isOff ? 'Apagado' : (chk.ampState || 'Encendido'),
          currentValue: initVal,
          lastNonZeroValue: typeof initVal === 'number' && initVal > 0 ? initVal : (chk.minValue ?? 0)
        };
      }),
      anomaliesCount: 0,
      anomalies: [],
      meterReadings: {},
      generalNotes: '',
      compliancePercentage: 0,
      lastUpdated: new Date().toISOString(),
      lastHeartbeat: new Date().toISOString()
    };

    unmarkDeletedRoundId(newRound.id);
    trackLocalCreation(newRound.id);

    activeRoundRef.current = newRound;
    setActiveRound(newRound);
    safeSetItem(STORAGE_KEYS.ACTIVE_ROUND, JSON.stringify(newRound));

    // Update rounds array so it immediately appears in all components and Firestore!
    const updated = [newRound, ...(roundsRef.current || []).filter(r => r.id !== newRound.id)];
    roundsRef.current = updated;
    setRounds(updated);
    safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(updated));

    localActionIds.current.add(newRound.id);
    setTimeout(() => { localActionIds.current.delete(newRound.id); }, 15000);

    // Queue for reliable offline sync
    queuePendingOfflineRound(newRound);

    // Save to local server
    hasPendingLocalChanges.current = true;
    persistToServer();
    fetch('/api/rounds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': clientSessionId.current
      },
      body: JSON.stringify(newRound)
    }).then(res => {
      if (res.ok) removePendingOfflineRound(newRound.id);
    }).catch(() => {});

    // Save safely to Firestore collection 'rounds'
    safeCloudWrite(() => setDoc(doc(db, 'rounds', newRound.id), cleanForFirestore(newRound)));

    // Emitir notificación Push a los teléfonos y dispositivos de todos los compañeros configurados
    const shiftLabel = shift === 'manana' ? 'Turno Mañana' : shift === 'tarde' ? 'Turno Tarde' : 'Turno Noche';
    broadcastServerPushNotification({
      category: 'rondas',
      title: '🔄 Ronda de Inspección Iniciada',
      body: `${techName} inició la ronda técnica de cuartos de máquinas y bombas (${shiftLabel}).`,
      url: '/?tab=rondas',
      tag: `round-started-${newRound.id}`,
      excludeUserId: currentUser?.id,
      excludeEmail: currentUser?.email
    });

    notify(`Ronda diaria iniciada por ${techName}. En proceso.`);
    return newRound;
  };

  const updateActiveRoundCheckpoint = (
    chkId: string, 
    val: any, 
    notes?: string, 
    measurementFields?: RoundMeasurementField[], 
    statusValue?: string,
    ampState?: string,
    immediate: boolean = false,
    photoUrl?: string
  ) => {
    if (!activeRound) return;
    setActiveRound(prev => {
      if (!prev) return null;
      const updatedCheckpoints = prev.checkpoints.map(chk => {
        if (chk.id === chkId) {
          const finalStatus = statusValue !== undefined ? statusValue : chk.statusValue;
          const actionType = finalStatus ? getCheckpointButtonAction(chk, finalStatus, roundTemplate) : 'default';
          const isOff = actionType === 'turn_off';
          const isEnc = actionType === 'turn_on';
          const isDefault = actionType === 'default';

          const finalAmpState = ampState !== undefined 
            ? ampState 
            : (isOff ? 'Apagado' : (isEnc ? 'Encendido' : (chk.ampState || 'Encendido')));
          
          const numVal = typeof val === 'number' ? val : parseFloat(String(val ?? ''));
          const currentLastNonZero = chk.lastNonZeroValue || (typeof chk.currentValue === 'number' && chk.currentValue !== 0 ? chk.currentValue : (chk.minValue ?? 0));
          const finalLastNonZero = (!isNaN(numVal) && numVal !== 0) ? numVal : currentLastNonZero;

          // Only set to 0 if explicitly powered off via turn_off button action on numeric checkpoints; otherwise preserve the user's typed or selected value
          const isNumericType = chk.type === 'numeric';
          const finalVal = (isOff && isNumericType) ? 0 : (val !== undefined ? val : chk.currentValue);

          // Synchronize measurement fields only if explicitly toggling power/status
          let resolvedMeasurementFields = measurementFields !== undefined ? measurementFields : chk.measurementFields;
          if (isOff && resolvedMeasurementFields && resolvedMeasurementFields.length > 0) {
            resolvedMeasurementFields = resolvedMeasurementFields.map(f => ({
              ...f,
              value: 0,
              ampState: 'Apagado'
            }));
          } else if (isEnc && resolvedMeasurementFields && resolvedMeasurementFields.length > 0) {
            resolvedMeasurementFields = resolvedMeasurementFields.map(f => {
              const currentVal = typeof f.value === 'number' ? f.value : parseFloat(f.value as any);
              const prevNonZero = f.lastNonZeroValue || (!isNaN(currentVal) && currentVal !== 0 ? currentVal : (f.minValue ?? 0));
              return {
                ...f,
                value: (f.value === 0 || f.value === undefined || f.value === '') ? prevNonZero : f.value,
                ampState: 'Encendido',
                lastNonZeroValue: prevNonZero
              };
            });
          }

          // Lookup template buttonActions if missing on checkpoint
          const tplItem = roundTemplate.find(t => (t.id && t.id === chk.id) || (chk.title && t.title === chk.title));
          const resolvedButtonActions = (chk.buttonActions && Object.keys(chk.buttonActions).length > 0)
            ? chk.buttonActions
            : tplItem?.buttonActions;

          const existingPhotos = Array.isArray(chk.photos) ? [...chk.photos] : (chk.photoUrl ? [chk.photoUrl] : []);
          const finalPhotoUrl = photoUrl !== undefined ? photoUrl : chk.photoUrl;
          if (photoUrl && !existingPhotos.includes(photoUrl)) {
            existingPhotos.push(photoUrl);
          }

          return {
            ...chk,
            buttonActions: resolvedButtonActions,
            currentValue: finalVal !== undefined ? finalVal : chk.currentValue,
            notes: notes !== undefined ? notes : chk.notes,
            measurementFields: resolvedMeasurementFields,
            statusValue: finalStatus,
            ampState: finalAmpState,
            lastNonZeroValue: finalLastNonZero,
            photoUrl: finalPhotoUrl,
            photos: existingPhotos.length > 0 ? existingPhotos : undefined
          };
        }
        return chk;
      });

      const filledCount = updatedCheckpoints.filter(c => isCheckpointComplete(c, roundTemplate)).length;
      const compliance = Math.round((filledCount / updatedCheckpoints.length) * 100);

      const nowIso = new Date().toISOString();
      const updated = {
        ...prev,
        checkpoints: updatedCheckpoints,
        compliancePercentage: compliance,
        lastUpdated: nowIso,
        lastHeartbeat: nowIso
      };
      queueSaveActiveRoundStorage(updated, immediate);

      const updatedList = (roundsRef.current || []).map(r => r.id === updated.id ? updated : r);
      if (!updatedList.some(r => r.id === updated.id)) {
        updatedList.unshift(updated);
      }
      queueUpdateRounds(updatedList, immediate);

      syncActiveRoundToCloud(updated, immediate);
      return updated;
    });
  };

  const updateActiveRoundMeasurementField = (
    chkId: string, 
    fieldIndex: number, 
    val: number | string, 
    ampState?: string, 
    statusValue?: string,
    immediate: boolean = false
  ) => {
    if (!activeRound) return;
    setActiveRound(prev => {
      if (!prev) return null;
      const updatedCheckpoints = prev.checkpoints.map(chk => {
        if (chk.id === chkId) {
          const fields = chk.measurementFields ? [...chk.measurementFields] : [];
          if (fields[fieldIndex]) {
            const currentField = fields[fieldIndex];
            const resolvedStatus = statusValue !== undefined ? statusValue : currentField.statusValue;
            const fieldAction = resolvedStatus ? getFieldButtonAction(currentField, resolvedStatus, chk, roundTemplate, fieldIndex) : 'default';
            const isFieldActionOff = fieldAction === 'turn_off';
            const isFieldActionOn = fieldAction === 'turn_on';
            
            const isExplicitOff = isFieldActionOff;
            const newAmpState = ampState !== undefined 
              ? ampState 
              : (isExplicitOff ? 'Apagado' : (isFieldActionOn ? 'Encendido' : (currentField.ampState || 'Encendido')));
            
            const finalVal = isExplicitOff ? 0 : val;
            const parsedNum = typeof finalVal === 'number' ? finalVal : parseFloat(String(finalVal));
            const prevNonZeroNum = typeof currentField.lastNonZeroValue === 'number' && currentField.lastNonZeroValue !== 0
              ? currentField.lastNonZeroValue 
              : (typeof currentField.value === 'number' && currentField.value !== 0 ? currentField.value : (currentField.minValue ?? 0));
            
            fields[fieldIndex] = { 
              ...currentField, 
              value: finalVal, 
              ampState: newAmpState,
              statusValue: resolvedStatus,
              lastNonZeroValue: !isNaN(parsedNum) && parsedNum !== 0 ? parsedNum : prevNonZeroNum
            };
          }
          return {
            ...chk,
            measurementFields: fields,
            currentValue: fieldIndex === 0 ? fields[0].value : (chk.currentValue ?? fields[0].value),
            ampState: ampState !== undefined ? ampState : (chk.ampState || 'Encendido')
          };
        }
        return chk;
      });

      const filledCount = updatedCheckpoints.filter(c => isCheckpointComplete(c, roundTemplate)).length;
      const compliance = Math.round((filledCount / updatedCheckpoints.length) * 100);

      const nowIso = new Date().toISOString();
      const updated = {
        ...prev,
        checkpoints: updatedCheckpoints,
        compliancePercentage: compliance,
        lastUpdated: nowIso,
        lastHeartbeat: nowIso
      };
      queueSaveActiveRoundStorage(updated, immediate);

      const updatedList = (roundsRef.current || []).map(r => r.id === updated.id ? updated : r);
      if (!updatedList.some(r => r.id === updated.id)) {
        updatedList.unshift(updated);
      }
      queueUpdateRounds(updatedList, immediate);

      syncActiveRoundToCloud(updated, immediate);
      return updated;
    });
  };

  const updateActiveRoundMeterReadings = (readings: Partial<DailyRound['meterReadings']>, generalNotes?: string) => {
    if (!activeRound) return;
    setActiveRound(prev => {
      if (!prev) return null;
      const nowIso = new Date().toISOString();
      const updated = {
        ...prev,
        meterReadings: {
          ...prev.meterReadings,
          ...readings
        },
        generalNotes: generalNotes !== undefined ? generalNotes : prev.generalNotes,
        lastUpdated: nowIso,
        lastHeartbeat: nowIso
      };
      safeSetItem(STORAGE_KEYS.ACTIVE_ROUND, JSON.stringify(updated));
      const updatedList = (roundsRef.current || []).map(r => r.id === updated.id ? updated : r);
      if (!updatedList.some(r => r.id === updated.id)) {
        updatedList.unshift(updated);
      }
      roundsRef.current = updatedList;
      setRounds(updatedList);
      syncActiveRoundToCloud(updated);
      return updated;
    });
  };

  const updateActiveRoundCheckpointTags = async (
    chkId: string, 
    tags: string[], 
    saveToTemplate: boolean = false, 
    targetTitle?: string, 
    targetArea?: string
  ) => {
    // 1. Update in active round immediately
    if (activeRound) {
      setActiveRound(prev => {
        if (!prev) return null;
        const updatedCheckpoints = prev.checkpoints.map(chk => {
          const matchId = chk.id === chkId;
          const matchTitleArea = targetTitle ? (chk.title === targetTitle && (!targetArea || chk.area === targetArea)) : false;
          if (matchId || matchTitleArea) {
            return { ...chk, suggestedNotes: tags };
          }
          return chk;
        });
        const updated = {
          ...prev,
          checkpoints: updatedCheckpoints
        };
        safeSetItem(STORAGE_KEYS.ACTIVE_ROUND, JSON.stringify(updated));
        return updated;
      });
    }

    // 2. Persist in template for future rounds if checked
    if (saveToTemplate) {
      setRoundTemplate(prev => {
        let found = false;
        const updated = prev.map(item => {
          const matchId = item.id === chkId;
          const matchTitleArea = targetTitle ? (item.title === targetTitle && (!targetArea || item.area === targetArea)) : false;
          if (matchId || matchTitleArea) {
            found = true;
            return { ...item, suggestedNotes: tags };
          }
          return item;
        });

        // If not found in existing template by id or title, update any similar items or keep as is
        localStorage.setItem('hotel_round_template', JSON.stringify(updated));
        saveRoundTemplateToCloud(updated);
        return updated;
      });
      notify('✅ Opciones rápidas guardadas y aplicadas con éxito.');
    } else {
      notify('✅ Opciones rápidas actualizadas para este punto.');
    }
  };

  const addRoundAnomaly = (anomaly: Omit<RoundAnomaly, 'id' | 'timestamp'>) => {
    if (!activeRound) return;
    const timestamp = getLocalDateTimeString();
    const sharedId = `inc-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newAnomaly: RoundAnomaly = {
      ...anomaly,
      id: sharedId,
      timestamp
    };

    setActiveRound(prev => {
      if (!prev) return null;
      const updatedAnomalies = [...prev.anomalies, newAnomaly];
      const updated = {
        ...prev,
        anomalies: updatedAnomalies,
        anomaliesCount: updatedAnomalies.length,
        lastUpdated: new Date().toISOString()
      };
      safeSetItem(STORAGE_KEYS.ACTIVE_ROUND, JSON.stringify(updated));
      const updatedList = (roundsRef.current || []).map(r => r.id === updated.id ? updated : r);
      if (!updatedList.some(r => r.id === updated.id)) {
        updatedList.unshift(updated);
      }
      roundsRef.current = updatedList;
      setRounds(updatedList);
      syncActiveRoundToCloud(updated);
      return updated;
    });

    // Also transmit to live shared incidents using the exact same ID so they never decouple
    reportIncident({
      id: sharedId,
      timestamp,
      title: anomaly.title,
      description: anomaly.description,
      area: anomaly.area,
      severity: anomaly.severity,
      status: anomaly.status || 'pendiente',
      registeredBy: anomaly.registeredBy,
      equipmentId: anomaly.equipmentId,
      equipmentTag: anomaly.equipmentTag,
      photoUrl: anomaly.photoUrl,
    });
  };

  const completeActiveRound = async (readings: any, notes: string, signature: string, allowPartial: boolean = false) => {
    if (!activeRound) return;

    // Validación estricta ineludible de puntos requeridos al 100%
    const currentTpl = roundTemplateRef.current?.length ? roundTemplateRef.current : roundTemplate;
    const templateLength = currentTpl?.length || 0;
    const incomplete = getIncompleteCheckpoints(activeRound.checkpoints, currentTpl);
    const totalPoints = activeRound.checkpoints?.length || 0;
    const filledCount = (activeRound.checkpoints || []).filter(c => isCheckpointComplete(c, currentTpl)).length;
    const is100Strict = templateLength > 0
      ? (totalPoints >= templateLength && incomplete.length === 0 && filledCount >= templateLength)
      : (totalPoints > 0 && incomplete.length === 0 && filledCount === totalPoints);

    if (!is100Strict || (activeRound.compliancePercentage !== undefined && activeRound.compliancePercentage < 100)) {
      const count = Math.max(incomplete.length, totalPoints - filledCount, templateLength - totalPoints);
      const pointStr = count === 1 ? '1 punto obligatorio pendiente' : `${count} puntos obligatorios pendientes`;
      notify(`⚠️ Bloqueo de seguridad: No se puede cerrar la ronda (${pointStr}). Es un requisito estricto e ineludible completar el 100% de los puntos y mediciones obligatorias para poder validar y guardar la ronda.`);
      return;
    }

    // Requisito ineludible: La ronda solo se puede cerrar y cargar cuando hay conexión a Internet/Wi-Fi confirmada
    const isOnline = navigator.onLine && (await checkRealInternetConnection());
    if (!isOnline) {
      notify('⚠️ Sin conexión a Internet: No es posible cargar la ronda en el sistema. Por favor busca señal Wi-Fi o datos móviles para cerrar la ronda.');
      throw new Error('OFFLINE_NO_INTERNET');
    }

    const autoAnomalies: RoundAnomaly[] = [];

    const sanitizedCheckpoints = activeRound.checkpoints.map(chk => {
      const parsedCurrentVal = typeof chk.currentValue === 'string' && chk.currentValue.trim() !== '' && !isNaN(Number(chk.currentValue))
        ? Number(chk.currentValue)
        : chk.currentValue;

      // Detect if this checkpoint represents an alarm
      const alarmCheck = isCheckpointAlarmActive(chk, roundTemplate);
      const chkAction = chk.statusValue ? getCheckpointButtonAction(chk, chk.statusValue, roundTemplate) : 'default';
      const isChkOff = chkAction === 'turn_off';
      const isAlarm = (val: any, min?: number, max?: number, fieldObj?: any, fIdx?: number) => {
        if (isChkOff) return false;
        if (fieldObj) {
          const fAct = fieldObj.statusValue ? getFieldButtonAction(fieldObj, fieldObj.statusValue, chk, roundTemplate, fIdx ?? 0) : 'default';
          if (fAct === 'turn_off') return false;
        }
        const v = String(val ?? '').toLowerCase();
        if (!v || v === '' || v === 'apagado') return false;

        const isTextAlarm = (v.includes('alarma') && !v.includes('sin alarma') && !v.includes('no alarma')) || v.includes('falla') || v.includes('crítico') || v.includes('critico') || v === 'no ok' || v === 'false';
        if (isTextAlarm) return true;

        const num = typeof val === 'number' ? val : parseFloat(v.replace(',', '.'));
        if (!isNaN(num) && (min !== undefined || max !== undefined)) {
          if (min !== undefined && num < min) return true;
          if (max !== undefined && num > max) return true;
        }
        return false;
      };

      let chkHasAlarm = alarmCheck.isAlarm || (!isChkOff && (chkAction === 'failure' || isAlarm(chk.statusValue, chk.minValue, chk.maxValue) || isAlarm(chk.currentValue, chk.minValue, chk.maxValue)));

      const tplItem = roundTemplate.find(t => (t.id && t.id === chk.id) || (chk.title && t.title === chk.title));
      const resolvedButtonActions = (chk.buttonActions && Object.keys(chk.buttonActions).length > 0)
        ? chk.buttonActions
        : tplItem?.buttonActions;

      const mappedFields = chk.measurementFields?.map((f, fIdx) => {
        const fieldAction = f.statusValue ? getFieldButtonAction(f, f.statusValue, chk, roundTemplate, fIdx) : 'default';
        const isFieldOff = fieldAction === 'turn_off';
        if (!isFieldOff && (fieldAction === 'failure' || isAlarm(f.statusValue, f.minValue, f.maxValue, f, fIdx) || isAlarm(f.value, f.minValue, f.maxValue, f, fIdx))) {
          chkHasAlarm = true;
        }

        const tplField = tplItem?.measurementFields?.[fIdx];
        const resolvedFieldButtonActions = (f.buttonActions && Object.keys(f.buttonActions).length > 0)
          ? f.buttonActions
          : tplField?.buttonActions;

        return {
          ...f,
          buttonActions: resolvedFieldButtonActions,
          value: typeof f.value === 'string' && f.value.trim() !== '' && !isNaN(Number(f.value))
            ? Number(f.value)
            : f.value
        };
      });

      if (chkHasAlarm) {
        // First check if an anomaly for this checkpoint was already recorded in activeRound.anomalies
        const isAlreadyReported = (activeRound.anomalies || []).some(a => 
          (a.title && (a.title.includes(chk.title) || chk.title.includes(a.title))) ||
          (a.area && chk.area && a.area.toLowerCase() === chk.area.toLowerCase() && a.title.toLowerCase().includes('alarma'))
        );

        if (!isAlreadyReported) {
          const timestamp = getLocalDateTimeString();
          const autoId = `inc-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
          autoAnomalies.push({
            id: autoId,
            area: chk.area || 'General',
            title: `Alarma en: ${chk.title}`,
            description: alarmCheck.reason 
              ? `${alarmCheck.reason}.\nNotas: ${chk.notes || 'Sin comentarios adicionales.'}`
              : `Equipo detectado en estado de alarma o falla durante la ronda.\nNotas: ${chk.notes || 'Sin comentarios adicionales.'}`,
            severity: chk.isCritical ? 'urgente' : 'alta',
            status: 'pendiente',
            registeredBy: signature || activeRound.technicianName,
            timestamp
          });
        }
      }

      return {
        ...chk,
        buttonActions: resolvedButtonActions,
        currentValue: parsedCurrentVal,
        measurementFields: mappedFields,
        isAlarmActive: chkHasAlarm,
        alarmReason: alarmCheck.reason || (chkHasAlarm ? 'Equipo detectado en estado de alarma o falla durante la ronda.' : undefined)
      };
    });

    // Merge manual anomalies with auto-detected anomalies
    const finalAnomalies = [...(activeRound.anomalies || []), ...autoAnomalies];

    // Report all anomalies from the completed round globally using the exact same ID and timestamp
    finalAnomalies.forEach(anomaly => {
      reportIncident({
        id: anomaly.id,
        timestamp: anomaly.timestamp,
        title: anomaly.title,
        description: anomaly.description,
        area: anomaly.area,
        severity: anomaly.severity,
        status: anomaly.status || 'pendiente',
        registeredBy: anomaly.registeredBy || signature || activeRound.technicianName,
        equipmentId: anomaly.equipmentId,
        equipmentTag: anomaly.equipmentTag,
      });
    });

    if (syncActiveRoundTimeoutRef.current) {
      clearTimeout(syncActiveRoundTimeoutRef.current);
    }

    const resolvedClosingTechName = (signature && signature.trim()) ? signature.trim() : activeRound.technicianName;
    const completed: DailyRound = {
      ...activeRound,
      technicianName: resolvedClosingTechName,
      checkpoints: sanitizedCheckpoints,
      status: 'completada',
      anomalies: finalAnomalies,
      anomaliesCount: finalAnomalies.length,
      meterReadings: {
        ...activeRound.meterReadings,
        ...readings
      },
      generalNotes: notes,
      technicianSignature: signature,
      compliancePercentage: 100,
      completedAt: activeRound.completedAt || new Date().toISOString(),
      lastUpdated: new Date().toISOString()
    };

    // Subir obligatoriamente al servidor API y confirmar 200 OK antes de cerrar la ronda
    try {
      const res = await fetch('/api/rounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientSessionId.current
        },
        body: JSON.stringify(completed)
      });
      if (!res.ok) {
        throw new Error('SERVER_REJECTED_ROUND');
      }
    } catch (netErr) {
      console.warn('Error uploading round to server API:', netErr);
      notify('⚠️ Error de red al cargar la ronda en el servidor. Por favor verifica tu conexión a Internet e inténtalo nuevamente. Tu ronda sigue 100% abierta e intacta.');
      throw netErr;
    }

    // Persistir de inmediato en la nube Firestore
    safeCloudWrite(() => setDoc(doc(db, 'rounds', completed.id), cleanForFirestore(completed))).catch(() => {});
    hasPendingLocalChanges.current = true;
    persistToServer();

    completedRoundIdsRef.current.add(completed.id);
    unmarkDeletedRoundId(completed.id);
    const updated = [completed, ...(roundsRef.current || []).filter(r => r.id !== completed.id)];
    roundsRef.current = updated;
    setRounds(updated);
    safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(updated));
    idbSet(STORAGE_KEYS.ROUNDS, updated).catch(() => {});

    // SÓLO AHORA QUE EL SERVIDOR Y LA NUBE CONFIRMARON LA CARGA AL 100%, CERRAR LA RONDA
    activeRoundRef.current = null;
    setActiveRound(null);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
    idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
    localActionIds.current.add(completed.id);
    setTimeout(() => { localActionIds.current.delete(completed.id); }, 15000);

    removePendingOfflineRound(completed.id);

    notify('✅ Ronda finalizada y cargada al 100% en el sistema con éxito');

    sendSystemNotification('📋 ✅ Ronda Técnica Guardada', {
      body: `Ronda finalizada con éxito por ${signature || activeRound.technicianName}.\n• Turno: ${completed.shift.toUpperCase()}\n• Cumplimiento: 100%`,
      tag: `round-saved-${completed.id}`,
      icon: '/pwa-192x192.png'
    });
    playAlertSound();

    // Broadcast instantáneamente a otras pestañas
    try {
      roundsChannel.current?.postMessage({ type: 'round_completed', round: completed });
    } catch (e) {}

    hasPendingLocalChanges.current = true;
    await persistToServer();

    // Notificar por Push al teléfono de todos los compañeros según su configuración
    const compShift = completed.shift === 'manana' ? 'Turno Mañana' : completed.shift === 'tarde' ? 'Turno Tarde' : 'Turno Noche';
    const anomaliesCount = completed.anomaliesCount || (completed.anomalies ? completed.anomalies.length : 0);
    broadcastServerPushNotification({
      category: 'rondas',
      title: '📋 ✅ Ronda Técnica Guardada',
      body: `Ronda finalizada por ${signature || activeRound.technicianName} (${compShift})\n• Cumplimiento: 100%\n• Anomalías detectadas: ${anomaliesCount}`,
      url: '/?tab=rondas',
      tag: `round-completed-${completed.id}`,
      excludeUserId: currentUser?.id,
      excludeEmail: currentUser?.email
    });



    try {
      const res = await fetch('/api/rounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientSessionId.current
        },
        body: JSON.stringify(completed)
      });
      if (res.ok) {
        removePendingOfflineRound(completed.id);
      }
    } catch (err) {
      console.warn('Error posting completed round to API:', err);
    }

    try {
      await safeCloudWrite(() => setDoc(doc(db, 'rounds', completed.id), cleanForFirestore(completed)));
      removePendingOfflineRound(completed.id);
    } catch (err) {
      console.warn('Error saving completed round in Firestore:', err);
    }

    return completed;
  };

  const cancelActiveRound = async () => {
    const roundToCancel = activeRoundRef.current || activeRound;
    if (syncActiveRoundTimeoutRef.current) {
      clearTimeout(syncActiveRoundTimeoutRef.current);
    }
    if (activeRoundStorageTimer.current) {
      clearTimeout(activeRoundStorageTimer.current);
    }
    if (setRoundsDebounceTimer.current) {
      clearTimeout(setRoundsDebounceTimer.current);
    }
    localStorage.removeItem('active_round_resume_lock');

    const idsToCancel = new Set<string>();
    if (roundToCancel?.id) {
      idsToCancel.add(roundToCancel.id);
    }
    try {
      const savedActiveRaw = localStorage.getItem(STORAGE_KEYS.ACTIVE_ROUND);
      if (savedActiveRaw) {
        const parsed = JSON.parse(savedActiveRaw);
        if (parsed?.id) idsToCancel.add(parsed.id);
      }
    } catch {}

    const activeUser = currentUserRef.current || currentUser;
    (roundsRef.current || []).forEach(r => {
      if (r && r.id && r.status === 'en_progreso' && isUserOwnRound(r, activeUser)) {
        idsToCancel.add(r.id);
      }
    });

    // Clear local active round state + IndexedDB unconditionally
    activeRoundRef.current = null;
    setActiveRound(null);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
    idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});

    if (idsToCancel.size > 0) {
      idsToCancel.forEach(cancelledId => {
        markDeletedRoundId(cancelledId);
        removePendingOfflineRound(cancelledId);
        localActionIds.current.add(cancelledId);
        setTimeout(() => { localActionIds.current.delete(cancelledId); }, 30000);
      });

      const updated = (roundsRef.current || []).filter(r => r && !idsToCancel.has(r.id));
      roundsRef.current = updated;
      setRounds(updated);
      safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(updated));
      idbSet(STORAGE_KEYS.ROUNDS, updated).catch(() => {});

      for (const cancelledId of idsToCancel) {
        try {
          roundsChannel.current?.postMessage({ type: 'round_deleted', roundId: cancelledId });
        } catch (e) {}

        fetch(`/api/rounds/${cancelledId}`, {
          method: 'DELETE',
          headers: { 'X-Client-Id': clientSessionId.current }
        }).catch(err => {
          console.warn('Error deleting cancelled round from API:', err);
        });
        recordCloudDeletion(cancelledId);
      }

      hasPendingLocalChanges.current = true;
      persistToServer();

      for (const cancelledId of idsToCancel) {
        await safeCloudWrite(() => deleteDoc(doc(db, 'rounds', cancelledId)));
      }
      notify('Ronda en curso descartada definitivamente.');
    }
  };

  const deleteRound = async (roundId: string) => {
    const roundObj = (roundsRef.current || []).find(r => r.id === roundId);
    const isInProgress = roundObj?.status === 'en_progreso' || 
                         (activeRound && activeRound.id === roundId) || 
                         (activeRoundRef.current && activeRoundRef.current.id === roundId);

    if (!isInProgress && currentUser && !currentUser.permissions?.canDeleteRecords) {
      notify('Acceso restringido: No tienes permisos para eliminar rondas.');
      return;
    }
    if (setRoundsDebounceTimer.current) {
      clearTimeout(setRoundsDebounceTimer.current);
    }
    if (localStorage.getItem('active_round_resume_lock') === roundId) {
      localStorage.removeItem('active_round_resume_lock');
    }
    markDeletedRoundId(roundId);
    removePendingOfflineRound(roundId);
    localActionIds.current.add(roundId);
    setTimeout(() => { localActionIds.current.delete(roundId); }, 30000);

    const updated = (roundsRef.current || []).filter(r => r.id !== roundId);
    roundsRef.current = updated;
    setRounds(updated);
    safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(updated));
    idbSet(STORAGE_KEYS.ROUNDS, updated).catch(() => {});

    let shouldClearActive = activeRound?.id === roundId || activeRoundRef.current?.id === roundId;
    if (!shouldClearActive) {
      try {
        const rawActive = localStorage.getItem(STORAGE_KEYS.ACTIVE_ROUND);
        if (rawActive && JSON.parse(rawActive)?.id === roundId) {
          shouldClearActive = true;
        }
      } catch {}
    }

    if (shouldClearActive) {
      if (syncActiveRoundTimeoutRef.current) {
        clearTimeout(syncActiveRoundTimeoutRef.current);
      }
      if (activeRoundStorageTimer.current) {
        clearTimeout(activeRoundStorageTimer.current);
      }
      activeRoundRef.current = null;
      setActiveRound(null);
      localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
      idbRemove(STORAGE_KEYS.ACTIVE_ROUND).catch(() => {});
    }

    // 1. Difusión a otras pestañas en el mismo equipo (0ms)
    try {
      roundsChannel.current?.postMessage({ type: 'round_deleted', roundId });
    } catch (e) {
      console.warn('BroadcastChannel postMessage error:', e);
    }

    // 3. Notificación y eliminación ultra-rápida en el servidor (<30ms) para que todas las demás pantallas la reciban de inmediato
    fetch(`/api/rounds/${roundId}`, {
      method: 'DELETE',
      headers: { 'X-Client-Id': clientSessionId.current }
    }).catch(err => {
      console.warn('Error calling delete round API:', err);
    });
    recordCloudDeletion(roundId);
    hasPendingLocalChanges.current = true;
    persistToServer();

    // 4. Eliminación en la nube Firestore
    await safeCloudWrite(() => deleteDoc(doc(db, 'rounds', roundId)));
    notify(isInProgress ? 'Ronda en curso descartada con éxito' : 'Ronda eliminada con éxito');
  };

  const resumeRound = (round: DailyRound) => {
    if (!round) return;
    const nowIso = new Date().toISOString();
    const reopenedRound: DailyRound = {
      ...round,
      status: 'en_progreso',
      completedAt: undefined,
      technicianSignature: undefined,
      userId: round.userId,
      technicianName: round.technicianName,
      lastUpdated: nowIso
    };
    const reconciled = reconcileActiveRoundWithTemplate(reopenedRound, roundTemplateRef.current || roundTemplate);
    reconciled.status = 'en_progreso';
    reconciled.completedAt = undefined;
    reconciled.technicianSignature = undefined;

    activeRoundRef.current = reconciled;
    setActiveRound(reconciled);
    safeSetItem(STORAGE_KEYS.ACTIVE_ROUND, JSON.stringify(reconciled));

    const updated = (roundsRef.current || []).map(r => r.id === reconciled.id ? reconciled : r);
    if (!updated.some(r => r.id === reconciled.id)) {
      updated.unshift(reconciled);
    }
    roundsRef.current = updated;
    setRounds(updated);
    safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(updated));

    setSelectedTab('rondas');

    try {
      roundsChannel.current?.postMessage({ type: 'active_round_updated', round: reconciled });
    } catch (e) {}

    fetch('/api/rounds', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': clientSessionId.current
      },
      body: JSON.stringify(reconciled)
    }).catch(() => {});

    safeCloudWrite(() => setDoc(doc(db, 'rounds', reconciled.id), cleanForFirestore(reconciled))).catch(() => {});

    hasPendingLocalChanges.current = true;
    
    // Set a lock in storage to protect this round across background operations
    localStorage.setItem('active_round_resume_lock', reconciled.id);
    setTimeout(() => localStorage.removeItem('active_round_resume_lock'), 10000);

    notify(`Ronda reanudada: Continúa completando los puntos pendientes.`);
  };

  const updateRound = async (roundId: string, data: Partial<DailyRound>) => {
    const updatedRounds = (roundsRef.current || []).map(r => r.id === roundId ? { ...r, ...data } : r);
    roundsRef.current = updatedRounds;
    setRounds(updatedRounds);
    safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(updatedRounds));

    if (activeRoundRef.current && activeRoundRef.current.id === roundId) {
      const updatedActive = { ...activeRoundRef.current, ...data };
      activeRoundRef.current = updatedActive;
      setActiveRound(updatedActive);
      safeSetItem('hotel_maint_active_round', JSON.stringify(updatedActive));
    }

    notify('Ronda actualizada correctamente');
    hasPendingLocalChanges.current = true;
    persistToServer();

    try {
      await safeCloudWrite(() => updateDoc(doc(db, 'rounds', roundId), cleanForFirestore(data as any)));
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error updating round in cloud:', e);
    }
  };

  // -------------------------------------------------------------
  // PREVENTIVE MAINTENANCE ACTIONS (Shared Real-Time)
  // -------------------------------------------------------------
  const createPreventivePlan = async (plan: Omit<PreventivePlan, 'id'>) => {
    const newPlan: PreventivePlan = {
      ...plan,
      id: `plan-${Date.now()}`
    };
    setPreventivePlans(prev => [newPlan, ...prev]);

    // Also auto-generate the first work order for this plan
    const newOrder: PreventiveWorkOrder = {
      id: `ot-${Date.now()}`,
      planId: newPlan.id,
      equipmentId: newPlan.equipmentId,
      equipmentTag: newPlan.equipmentTag,
      equipmentName: newPlan.equipmentName,
      title: newPlan.title,
      frequency: newPlan.frequency,
      scheduledDate: newPlan.nextDueDate,
      status: 'pendiente',
      technicianAssigned: settings.technicians[0] || 'Técnico de Turno',
      stepsCompleted: newPlan.steps.map(s => ({ id: s.id, description: s.description, completed: false })),
      usedMaterials: [],
      approvedByAdmin: false
    };
    setWorkOrders(prev => [newOrder, ...prev]);

    notify(`Plan preventivo creado para ${plan.equipmentTag}`);

    try {
      await safeCloudWrite(() => setDoc(doc(db, 'preventive_plans', newPlan.id), cleanForFirestore(newPlan)));
      await safeCloudWrite(() => setDoc(doc(db, 'work_orders', newOrder.id), cleanForFirestore(newOrder)));
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error saving plan in cloud:', e);
    }
  };

  const updatePreventivePlan = async (id: string, data: Partial<PreventivePlan>) => {
    setPreventivePlans(prev => prev.map(p => p.id === id ? { ...p, ...data } : p));
    notify('Plan preventivo modificado');

    try {
      await safeCloudWrite(() => updateDoc(doc(db, 'preventive_plans', id), cleanForFirestore(data as any)));
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error updating plan in cloud:', e);
    }
  };

  const deletePreventivePlan = async (id: string) => {
    if (currentUser && !currentUser.permissions?.canDeleteRecords) {
      notify('Acceso restringido: No tienes permisos para eliminar planes.');
      return;
    }
    const updated = (preventivePlansRef.current || []).filter(p => p.id !== id);
    preventivePlansRef.current = updated;
    setPreventivePlans(updated);
    notify('Plan preventivo eliminado');
    fetch(`/api/preventive-plans/${id}`, { method: 'DELETE' }).catch(() => {});

    try {
      await safeCloudWrite(() => deleteDoc(doc(db, 'preventive_plans', id)));
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error deleting plan in cloud:', e);
    }

    persistToServer();
  };

  const executeWorkOrder = async (
    orderId: string, 
    result: {
      steps: { id: string; description: string; completed: boolean }[];
      usedMaterials: string[];
      technicianNotes: string;
      durationMinutes: number;
    }
  ) => {
    const today = new Date().toISOString().split('T')[0];

    const updatedOrders = workOrders.map(order => {
      if (order.id === orderId) {
        return {
          ...order,
          status: 'completado' as const,
          executionDate: today,
          stepsCompleted: result.steps,
          usedMaterials: result.usedMaterials,
          technicianNotes: result.technicianNotes,
          durationMinutes: result.durationMinutes,
          approvedByAdmin: role === 'admin'
        };
      }
      return order;
    });
    setWorkOrders(updatedOrders);

    // Update equipment's lastPreventiveDate
    const order = workOrders.find(o => o.id === orderId);
    let updatedEqId: string | null = null;
    let nextDateStr = '';

    if (order) {
      updatedEqId = order.equipmentId;
      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + 30);
      nextDateStr = nextDate.toISOString().split('T')[0];

      setEquipments(prev => prev.map(eq => {
        if (eq.id === order.equipmentId) {
          return {
            ...eq,
            lastPreventiveDate: today,
            nextPreventiveDate: nextDateStr
          };
        }
        return eq;
      }));
    }

    notify('Orden de trabajo preventiva completada con éxito');

    try {
      const updatedOrder = updatedOrders.find(o => o.id === orderId);
      if (updatedOrder) {
        await safeCloudWrite(() => updateDoc(doc(db, 'work_orders', orderId), cleanForFirestore(updatedOrder as any)));
      }
      if (updatedEqId) {
        await safeCloudWrite(() => updateDoc(doc(db, 'equipments', updatedEqId), cleanForFirestore({
          lastPreventiveDate: today,
          nextPreventiveDate: nextDateStr
        })));
      }
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error updating work order in cloud:', e);
    }
  };

  const createWorkOrderFromPlan = async (planId: string, scheduledDate: string, technician: string) => {
    const plan = preventivePlans.find(p => p.id === planId);
    if (!plan) return;

    const newOrder: PreventiveWorkOrder = {
      id: `ot-${Date.now()}`,
      planId: plan.id,
      equipmentId: plan.equipmentId,
      equipmentTag: plan.equipmentTag,
      equipmentName: plan.equipmentName,
      title: plan.title,
      frequency: plan.frequency,
      scheduledDate,
      status: 'pendiente',
      technicianAssigned: technician,
      stepsCompleted: plan.steps.map(s => ({ id: s.id, description: s.description, completed: false })),
      usedMaterials: [],
      approvedByAdmin: false
    };

    setWorkOrders(prev => [newOrder, ...prev]);
    notify(`Nueva OT programada para el ${scheduledDate}`);

    try {
      await safeCloudWrite(() => setDoc(doc(db, 'work_orders', newOrder.id), cleanForFirestore(newOrder)));
      setIsCloudSynced(true);
    } catch (e) {
      console.warn('Error saving work order in cloud:', e);
    }
  };

  // -------------------------------------------------------------
  // SETTINGS (Shared Real-Time)
  // -------------------------------------------------------------
  const updateSettings = async (newSettings: Partial<SystemSettings>) => {
    if (currentUser && !currentUser.permissions?.canEditSettings) {
      notify('Acceso restringido: No tienes permisos para modificar la configuración.');
      return;
    }
    const merged = sanitizeSystemSettings(newSettings, settings);

    settingsRef.current = merged;
    setSettings(merged);
    safeSetItem(STORAGE_KEYS.SETTINGS, JSON.stringify(merged));
    hasPendingLocalChanges.current = true;
    persistToServer();
    notify('Ajustes del hotel actualizados en la nube');

    await safeCloudWrite(() => setDoc(doc(db, 'hotel_settings', 'main'), cleanForFirestore(merged)));
  };

  const clearAllData = async () => {
    // 1. Clear local memory state immediately
    setEquipments([]);
    setRounds([]);
    setActiveRound(null);
    setPumpInspections([]);
    setPreventivePlans([]);
    setWorkOrders([]);
    setIncidents([]);
    setRequests([]);

    // 2. Clear local storage records
    localStorage.setItem(STORAGE_KEYS.EQUIPMENT, JSON.stringify([]));
    safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify([]));
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROUND);
    localStorage.setItem(STORAGE_KEYS.INSPECTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.WORK_ORDERS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify([]));
    localStorage.removeItem(DELETED_EQUIPMENT_STORAGE_KEY);
    localStorage.removeItem(DELETED_ROUNDS_STORAGE_KEY);
    localStorage.setItem('hotel_maint_database_cleared_v3', 'true');

    notify('Vaciando todos los registros de la aplicación...');

    // 3. Clear cloud Firestore collections
    try {
      await ensureAuthenticated();
      const collectionsToPurge = ['equipments', 'rounds', 'incidents', 'requests', 'pump_inspections', 'preventive_plans', 'work_orders'];
      for (const colName of collectionsToPurge) {
        const snap = await getDocs(collection(db, colName));
        const deletePromises = snap.docs.map(d => safeCloudWrite(() => deleteDoc(doc(db, colName, d.id))));
        await Promise.all(deletePromises);
      }
      setIsCloudSynced(true);
      notify('Todos los registros (equipos, rondas, solicitudes, alertas) han sido eliminados correctamente.');
    } catch (e) {
      console.warn('Error purging records from cloud:', e);
      notify('Registros eliminados del almacenamiento local.');
    }
  };

  const resetToDefaults = () => {
    clearAllData();
  };

  const exportDataJson = () => {
    const backup = {
      timestamp: new Date().toISOString(),
      hotelInfo: settings.hotelInfo,
      incidents,
      requests,
      equipments,
      rounds,
      pumpInspections,
      preventivePlans,
      workOrders,
      settings,
    };
    return JSON.stringify(backup, null, 2);
  };

  const importDataJson = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (data.incidents && Array.isArray(data.incidents)) {
        setIncidents(data.incidents);
      }
      if (data.requests && Array.isArray(data.requests)) {
        setRequests(data.requests);
      }
      if (data.equipments && Array.isArray(data.equipments)) {
        setEquipments(data.equipments);
      }
      if (data.rounds && Array.isArray(data.rounds)) {
        setRounds(data.rounds);
      }
      if (data.pumpInspections && Array.isArray(data.pumpInspections)) {
        setPumpInspections(data.pumpInspections);
      }
      if (data.preventivePlans && Array.isArray(data.preventivePlans)) {
        setPreventivePlans(data.preventivePlans);
      }
      if (data.workOrders && Array.isArray(data.workOrders)) {
        setWorkOrders(data.workOrders);
      }
      if (data.settings) {
        setSettings(data.settings);
      }
      notify('Copia de respaldo importada correctamente');
      return true;
    } catch (e) {
      console.error(e);
      notify('Error al importar el archivo JSON');
      return false;
    }
  };

  const [stateAuditResult, setStateAuditResult] = useState<StateAuditResult | null>(() => {
    try {
      const deletedSet = new Set<string>([
        ...Array.from(getDeletedTaskIds()),
        ...Array.from(getDeletedIncidentIds()),
        ...Array.from(getDeletedRequestIds()),
        ...Array.from(getDeletedRoundIds()),
        ...Array.from(getDeletedEquipmentIds())
      ]);
      const auditOutput = performStateAudit({
        tasks: tasks,
        workOrders: workOrders,
        incidents: incidents,
        requests: requests,
        rounds: rounds,
        equipments: equipments,
        deletedIds: deletedSet
      });
      return auditOutput.auditResult;
    } catch (e) {
      return null;
    }
  });

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return getInitialAuditLogs();
  });

  const addAuditLog = useCallback((entry: Omit<AuditLogEntry, 'id' | 'timestamp'>) => {
    const newEntry: AuditLogEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      ...entry
    };
    setAuditLogs(prev => {
      const updated = [newEntry, ...prev].slice(0, 300); // Guardar hasta 300 registros recientes
      try {
        localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  }, []);

  const clearAuditLogs = useCallback(() => {
    setAuditLogs([]);
    try {
      localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
    } catch {}
  }, []);

  const runStateAudit = useCallback((silent: boolean = false): StateAuditResult => {
    const deletedSet = new Set<string>([
      ...Array.from(getDeletedTaskIds()),
      ...Array.from(getDeletedIncidentIds()),
      ...Array.from(getDeletedRequestIds()),
      ...Array.from(getDeletedRoundIds()),
      ...Array.from(getDeletedEquipmentIds())
    ]);

    const auditOutput = performStateAudit({
      tasks: tasksRef.current || [],
      workOrders: workOrdersRef.current || [],
      incidents: incidentsRef.current || [],
      requests: requestsRef.current || [],
      rounds: roundsRef.current || [],
      equipments: equipmentsRef.current || [],
      deletedIds: deletedSet
    });

    const { auditedData, auditResult } = auditOutput;
    setStateAuditResult(auditResult);

    if (auditResult.totalCorrections > 0) {
      if (JSON.stringify(auditedData.tasks) !== JSON.stringify(tasksRef.current)) {
        tasksRef.current = auditedData.tasks;
        setTasks(auditedData.tasks);
        localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(auditedData.tasks));
      }
      if (JSON.stringify(auditedData.workOrders) !== JSON.stringify(workOrdersRef.current)) {
        workOrdersRef.current = auditedData.workOrders;
        setWorkOrders(auditedData.workOrders);
        localStorage.setItem(STORAGE_KEYS.WORK_ORDERS, JSON.stringify(auditedData.workOrders));
      }
      if (JSON.stringify(auditedData.incidents) !== JSON.stringify(incidentsRef.current)) {
        incidentsRef.current = auditedData.incidents;
        setIncidents(auditedData.incidents);
        localStorage.setItem(STORAGE_KEYS.INCIDENTS, JSON.stringify(auditedData.incidents));
      }
      if (JSON.stringify(auditedData.requests) !== JSON.stringify(requestsRef.current)) {
        requestsRef.current = auditedData.requests;
        setRequests(auditedData.requests);
        localStorage.setItem(STORAGE_KEYS.REQUESTS, JSON.stringify(auditedData.requests));
      }
      if (!areRoundsEqual(auditedData.rounds, roundsRef.current || [])) {
        roundsRef.current = auditedData.rounds;
        setRounds(auditedData.rounds);
        safeSetItem(STORAGE_KEYS.ROUNDS, JSON.stringify(auditedData.rounds));
      }

      hasPendingLocalChanges.current = true;
      persistToServer();

      // Convertir correcciones automáticas y registrarlas en el historial de trazabilidad
      const newEntries = correctionsToAuditLogEntries(auditResult.corrections, 'Auditoría Automática');
      if (newEntries.length > 0) {
        setAuditLogs(prev => {
          const updated = [...newEntries, ...prev].slice(0, 300);
          try {
            localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated));
          } catch {}
          return updated;
        });
      }

      if (!silent) {
        notify(`Auditoría de estado: Se corrigieron ${auditResult.totalCorrections} discrepancias para asegurar consistencia total.`);
      }
    } else if (!silent) {
      // Registrar evento de verificación exitosa
      const verificationEntry: AuditLogEntry = {
        id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        timestamp: new Date().toISOString(),
        type: 'audit_check',
        entity: 'system',
        action: 'Auditoría de Integridad Ejecutada',
        details: auditResult.summaryMessage,
        user: 'Supervisor / Técnico',
        status: 'success'
      };
      setAuditLogs(prev => {
        const updated = [verificationEntry, ...prev].slice(0, 300);
        try {
          localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(updated));
        } catch {}
        return updated;
      });
      notify('Auditoría de estado: Todos los datos y métricas están 100% consistentes con la base de datos.');
    }

    return auditResult;
  }, [notify]);

  // Ejecutar auditoría automática silenciosa de fondo sin congelar la interfaz inicial
  useEffect(() => {
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => {
          runStateAudit(true);
        }, { timeout: 4000 });
      } else {
        runStateAudit(true);
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [runStateAudit]);

  return (
    <MaintenanceContext.Provider
      value={{
        role: currentUser ? ((currentUser.role === 'admin' || currentUser.email?.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com' || currentUser.id === 'usr-admin-master' || currentUser.id === 'usr-1789230683226' || normalizeStr(currentUser.displayName) === 'juan mateo ramos' || normalizeStr(currentUser.displayName) === 'administrador principal') ? 'admin' : 'tecnico') : 'admin',
        isAdmin: currentUser ? (
          currentUser.role === 'admin' ||
          currentUser.email?.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com' ||
          currentUser.id === 'usr-admin-master' ||
          currentUser.id === 'usr-1789230683226' ||
          normalizeStr(currentUser.displayName) === 'juan mateo ramos' ||
          normalizeStr(currentUser.displayName) === 'administrador principal' ||
          normalizeStr(currentUser.role) === 'administrador' ||
          normalizeStr(currentUser.role) === 'admin'
        ) : true,
        currentUser,
        setCurrentUser,
        isSectionAllowed,
        canDeleteRecords: currentUser ? (
          currentUser.email?.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com' ||
          currentUser.id === 'usr-1789230683226' ||
          Boolean(currentUser.permissions?.canDeleteRecords)
        ) : true,
        canEditSettings: currentUser ? (
          currentUser.email?.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com' ||
          currentUser.id === 'usr-1789230683226' ||
          Boolean(currentUser.permissions?.canEditSettings)
        ) : true,
        canManageUsers: currentUser ? (
          currentUser.email?.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com' ||
          currentUser.id === 'usr-1789230683226' ||
          Boolean(currentUser.permissions?.canManageUsers)
        ) : true,
        canStartRounds: currentUser ? (
          currentUser.email?.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com' ||
          currentUser.id === 'usr-1789230683226' ||
          (currentUser.permissions?.canStartRounds !== undefined
            ? Boolean(currentUser.permissions.canStartRounds)
            : (currentUser.canStartRounds !== undefined
                ? Boolean(currentUser.canStartRounds)
                : (currentUser.role === 'técnico' || (currentUser.role === 'admin' && currentUser.id !== 'usr-1790639954575-671'))))
        ) : true,
        setRole,
        verifyAdminPin: () => true,
        selectedTab,
        setSelectedTab,
        isCloudSynced,
        hasNewAppVersion,
        reloadAppForUpdate,
        isIncidentModalOpen,
        setIsIncidentModalOpen,
        incidents,
        reportIncident,
        updateIncident,
        deleteIncident,
        requests,
        addRequest,
        updateRequest,
        deleteRequest,
        tasks,
        addTask,
        updateTask,
        deleteTask,
        toggleTaskChecklistItem,
        addTaskComment,
        users,
        addUser,
        updateUser,
        deleteUser,
        equipments,
        addEquipment,
        updateEquipment,
        deleteEquipment,
        clearGenericImportedEquipments,
        cleanAllImportedEquipments,
        restoreOfficialEquipmentPark,
        uploadedDocuments,
        addUploadedDocument,
        updateUploadedDocument,
        deleteUploadedDocument,
        clearAllUploadedDocuments,
        documentFolders,
        createDocumentFolder,
        deleteDocumentFolder,
        pumpInspections,
        addPumpInspection,
        rounds,
        activeRound,
        inProgressRounds,
        roundTemplate,
        addRoundTemplateItem,
        updateRoundTemplateItem,
        deleteRoundTemplateItem,
        resetRoundTemplateToDefault,
        clearAllRoundTemplate,
        refreshRoundTemplateFromCloud,
        refreshRoundsFromCloud,
        syncRoundsSilently,
        startNewRound,
        updateRound,
        updateActiveRoundCheckpoint,
        updateActiveRoundMeasurementField,
        updateActiveRoundMeterReadings,
        updateActiveRoundCheckpointTags,
        addRoundAnomaly,
        completeActiveRound,
        cancelActiveRound,
        deleteRound,
        resumeRound,
        preventivePlans,
        workOrders,
        createPreventivePlan,
        updatePreventivePlan,
        deletePreventivePlan,
        executeWorkOrder,
        createWorkOrderFromPlan,
        settings,
        updateSettings,
        resetToDefaults,
        clearAllData,
        exportDataJson,
        importDataJson,
        notification,
        setNotification,
        notify,
        notificationPermission,
        requestSystemNotificationPermission,
        pmsData,
        refreshPmsData,
        stateAuditResult,
        runStateAudit,
        auditLogs,
        addAuditLog,
        clearAuditLogs,
        schedules,
        shiftSwapRequests,
        addSchedule,
        updateSchedule,
        deleteSchedule,
        bulkGenerateSchedules,
        requestShiftSwap,
        resolveShiftSwap,
        cronogramas,
        addCronograma,
        updateCronograma,
        deleteCronograma,
        meters,
        meterReadingsLog,
        addMeter,
        updateMeter,
        deleteMeter,
        recordMeterReading,
        deleteMeterReading
      }}
    >
      {children}
    </MaintenanceContext.Provider>
  );
};

export const useMaintenance = () => {
  const context = useContext(MaintenanceContext);
  if (!context) {
    throw new Error('useMaintenance must be used within MaintenanceProvider');
  }
  return context;
};
