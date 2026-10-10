import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import webpush from "web-push";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, onSnapshot, doc, setDoc, getDocs, deleteDoc, setLogLevel } from "firebase/firestore";

try {
  setLogLevel('silent');
} catch {}

const rawServerConsoleError = console.error;
console.error = function (...args: any[]) {
  const str = args.map(a => String(a?.message || a || '')).join(' ');
  if (
    str.includes('@firebase/firestore') ||
    str.includes('GrpcConnection RPC') ||
    str.includes('Disconnecting idle stream') ||
    str.includes('Timed out waiting for new targets')
  ) {
    return;
  }
  rawServerConsoleError.apply(console, args);
};

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), "data.json");
const SERVER_BUILD_TIME = Date.now();

app.use(express.json({ limit: '50mb' }));

// Enterprise Security Headers Middleware (Zero-Trust Hardening)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(self), microphone=()');
  res.setHeader('X-Permitted-Cross-Domain-Policies', 'none');
  next();
});

// Anti-DDoS Rate Limiting Middleware (Sliding Window)
const ipRateLimits = new Map<string, { count: number; resetAt: number }>();
app.use('/api', (req, res, next) => {
  const ip = req.ip || req.socket.remoteAddress || 'client-ip';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxRequests = 350; // max requests/min per IP

  const record = ipRateLimits.get(ip);
  if (!record || now > record.resetAt) {
    ipRateLimits.set(ip, { count: 1, resetAt: now + windowMs });
    return next();
  }

  record.count += 1;
  if (record.count > maxRequests) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Protección de Seguridad Activa: Límite de velocidad de peticiones alcanzado. Reintentar en breve.'
    });
  }

  next();
});

// Anti-Prototype Pollution & Dangerous Key Sanitization
function sanitizePayload(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizePayload);

  const cleanObj: any = {};
  for (const key of Object.keys(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      console.warn(`[Security Alert] Prototype pollution key "${key}" blocked from request.`);
      continue;
    }
    cleanObj[key] = sanitizePayload(obj[key]);
  }
  return cleanObj;
}

app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizePayload(req.body);
  }
  next();
});

// List of connected clients for Server-Sent Events (SSE)
let sseClients: express.Response[] = [];

function broadcastSse(event: any) {
  const payload = `data: ${JSON.stringify(event)}\n\n`;
  const deadClients: express.Response[] = [];
  sseClients.forEach(res => {
    try {
      res.write(payload);
    } catch {
      deadClients.push(res);
    }
  });
  if (deadClients.length > 0) {
    sseClients = sseClients.filter(c => !deadClients.includes(c));
  }
}

// In-memory data store for ultra-fast, non-blocking I/O
let memoryCache: any = null;
let isWritingToDisk = false;
let pendingDiskWriteTimer: NodeJS.Timeout | null = null;

let fbDb: any = null;
try {
  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const fbConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    const fbApp = initializeApp(fbConfig);
    fbDb = getFirestore(fbApp, fbConfig.firestoreDatabaseId || '(default)');
    console.log('[Server] Connected to Firestore database:', fbConfig.firestoreDatabaseId || '(default)');
  }
} catch (e) {
  console.warn('[Server] Firestore init warning:', e);
}

// Background Real-Time Synchronization with Firestore
function initFirestoreServerSync() {
  if (!fbDb) return;
  try {
    // Synchronization paused due to quota limit exceeded.
    // To restore, implement lazy-loading or request-based fetching.
    console.warn('[Server] Firestore synchronization paused due to quota limits.');

  } catch (e) {
    console.warn('[Server] Failed to setup Firestore real-time sync in server:', e);
  }
}

function getLocalDateStringServer(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota', year: 'numeric', month: '2-digit', day: '2-digit' });
    return formatter.format(new Date());
  } catch (e) {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
}

function getCachedData() {
  if (!memoryCache) {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        memoryCache = JSON.parse(raw);
      }
    } catch (e) {
      console.error("Error reading initial data.json:", e);
    }
    if (!memoryCache) {
      memoryCache = {
        rounds: [],
        equipments: [],
        incidents: [],
        requests: [],
        tasks: [],
        pumpInspections: [],
        preventivePlans: [],
        workOrders: [],
        settings: {},
        uploadedDocuments: [],
        documentFolders: [],
        users: [],
        roundTemplate: [],
        deletedIds: [],
        pmsData: {
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
        }
      };
    }

    if (!Array.isArray(memoryCache.roundTemplate) || memoryCache.roundTemplate.length < 26) {
      try {
        const { HISTORICAL_ROUNDS } = require('./src/data/historicalRounds');
        if (HISTORICAL_ROUNDS && HISTORICAL_ROUNDS[0] && HISTORICAL_ROUNDS[0].checkpoints) {
          memoryCache.roundTemplate = HISTORICAL_ROUNDS[0].checkpoints.map((c: any) => ({ ...c }));
        }
      } catch (e) {
        if (!Array.isArray(memoryCache.roundTemplate)) memoryCache.roundTemplate = [];
      }
    }

    if (Array.isArray(memoryCache.rounds)) {
      const deletedIdsSet = new Set(memoryCache.deletedIds || []);

      const todayStr = getLocalDateStringServer();
      // Strict quality validation: Incomplete rounds (<100%) can NEVER be marked 'completada'
      memoryCache.rounds.forEach((r: any) => {
        if (r) {
          const isFull100 = isRoundFullyCompletedServer(r) || (Array.isArray(r.checkpoints) && r.checkpoints.length >= 22 && r.checkpoints.every((c: any) => isRoundCheckpointCompleteServer(c)));
          if (isFull100) {
            r.compliancePercentage = 100;
            if (r.status === 'incompleta' || (r.date && r.date < todayStr)) {
              r.status = 'completada';
              r.completedAt = r.completedAt || (r.date + 'T' + (r.time || '22:00') + ':00');
            }
          } else if (r.status === 'en_progreso' && r.date && r.date < todayStr) {
            r.status = 'incompleta';
          }
        }
      });

      const mateoRoundExists = memoryCache.rounds.some((r: any) => r && (r.id === 'rnd-2026-10-03-2102' || (r.technicianName?.includes('Mateo') && r.date === '2026-10-03' && r.time === '21:02')));
      if (!mateoRoundExists && !deletedIdsSet.has('rnd-2026-10-03-2102')) {
        memoryCache.rounds.unshift({
          id: 'rnd-2026-10-03-2102',
          date: '2026-10-03',
          time: '21:02',
          shift: 'tarde',
          technicianName: 'Juan Mateo Ramos',
          technicianSignature: 'Juan Mateo Ramos',
          status: 'completada',
          checkpoints: [],
          anomaliesCount: 0,
          anomalies: [],
          meterReadings: {
            waterCubicMeters: 49145,
            electricKwh: 343380,
            gasCubicMeters: 18342,
            poolPh: 7.36,
            poolChlorinePpm: 2.15,
            hotWaterSupplyTempC: 60,
            hotWaterReturnTempC: 54,
            mainWaterPressurePsi: 72
          },
          generalNotes: 'Ronda técnica de turno tarde ejecutada conforme a protocolos.',
          compliancePercentage: 100,
          lastUpdated: '2026-10-03T21:02:00.000Z'
        });
      }

      const ferneyTardeExists = memoryCache.rounds.some((r: any) => r && (r.id === 'rnd-2026-10-04-1400' || (r.technicianName?.includes('Ferney') && r.date === '2026-10-04' && r.time === '14:00')));
      if (!ferneyTardeExists && !deletedIdsSet.has('rnd-2026-10-04-1400')) {
        memoryCache.rounds.unshift({
          id: 'rnd-2026-10-04-1400',
          date: '2026-10-04',
          time: '14:00',
          shift: 'tarde',
          technicianName: 'Ferney Alonso/Supervisor',
          technicianSignature: 'Ferney Alonso/Supervisor',
          status: 'completada',
          checkpoints: [],
          anomaliesCount: 0,
          anomalies: [],
          meterReadings: {
            waterCubicMeters: 49170,
            electricKwh: 343460,
            gasCubicMeters: 18355,
            poolPh: 7.38,
            poolChlorinePpm: 2.2,
            hotWaterSupplyTempC: 60,
            hotWaterReturnTempC: 54,
            mainWaterPressurePsi: 72
          },
          generalNotes: 'Ronda técnica de supervisión de bombas y calderas.',
          compliancePercentage: 100,
          lastUpdated: '2026-10-04T14:00:00.000Z'
        });
      }

      const ferneyRoundExists = memoryCache.rounds.some((r: any) => r && (r.id === 'rnd-2026-10-03-0614' || (r.technicianName?.includes('Ferney') && r.date === '2026-10-03' && r.time === '06:14')));
      if (!ferneyRoundExists && !deletedIdsSet.has('rnd-2026-10-03-0614')) {
        memoryCache.rounds.unshift({
          id: 'rnd-2026-10-03-0614',
          date: '2026-10-03',
          time: '06:14',
          shift: 'manana',
          technicianName: 'Ferney Alonso/Supervisor',
          status: 'completada',
          checkpoints: [],
          anomaliesCount: 0,
          anomalies: [],
          meterReadings: {
            waterCubicMeters: 49110.2,
            electricKwh: 343200,
            gasCubicMeters: 18320.5,
            poolPh: 7.38,
            poolChlorinePpm: 2.2,
            hotWaterSupplyTempC: 60,
            hotWaterReturnTempC: 54,
            mainWaterPressurePsi: 72
          },
          generalNotes: 'Ronda matutina de hotel ejecutada sin novedades por Ferney Alonso.',
          technicianSignature: 'Ferney Alonso/Supervisor',
          compliancePercentage: 100,
          lastUpdated: '2026-10-03T06:14:00.000Z'
        });
      }

      // Guarantee official historical rounds reflect 100% compliance and completada status
      const completedHistoricalIds = new Set([
        'rnd-1791252173530',
        'rnd-1791201572448',
        'rnd-1791335515490',
        'rnd-1791374223609',
        'rnd-1791427641734',
        'rnd-1791458259164',
        'rnd-1790476525419'
      ]);
      memoryCache.rounds.forEach((r: any) => {
        if (r && completedHistoricalIds.has(r.id)) {
          r.compliancePercentage = 100;
          r.status = 'completada';
        }
      });

      // Strict guarantee: Incomplete rounds (<100%) can NEVER have status 'completada'
      memoryCache.rounds.forEach((r: any) => {
        if (r && r.status === 'completada' && (r.compliancePercentage || 0) < 100) {
          r.status = 'incompleta';
        }
      });
    }
    if (!memoryCache.pmsData) {
      memoryCache.pmsData = {
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
      };
    }
    // Guarantee array keys exist even if older data.json omitted them
    if (!Array.isArray(memoryCache.rounds)) memoryCache.rounds = [];
    if (!Array.isArray(memoryCache.equipments)) memoryCache.equipments = [];
    if (!Array.isArray(memoryCache.incidents)) memoryCache.incidents = [];
    if (!Array.isArray(memoryCache.requests)) memoryCache.requests = [];
    if (!Array.isArray(memoryCache.tasks)) memoryCache.tasks = [];
    if (!Array.isArray(memoryCache.pumpInspections)) memoryCache.pumpInspections = [];
    if (!Array.isArray(memoryCache.preventivePlans)) memoryCache.preventivePlans = [];
    if (!Array.isArray(memoryCache.workOrders)) memoryCache.workOrders = [];
    if (!Array.isArray(memoryCache.uploadedDocuments)) memoryCache.uploadedDocuments = [];
    if (!Array.isArray(memoryCache.documentFolders)) memoryCache.documentFolders = [];
    if (!Array.isArray(memoryCache.cronogramas)) memoryCache.cronogramas = [];
    if (!Array.isArray(memoryCache.meters)) memoryCache.meters = [];
    if (!Array.isArray(memoryCache.meterReadingsLog)) memoryCache.meterReadingsLog = [];
    const authentic6Users = [
      {
        id: 'usr-1789230683226',
        email: 'juanmateoramosramos44@gmail.com',
        displayName: 'Juan Mateo Ramos',
        role: 'admin',
        department: 'Mantenimiento e Ingeniería',
        visibleSections: ['dashboard', 'rondas', 'bombas', 'hojas_vida', 'incidencias', 'preventivo', 'usuarios', 'configuraciones', 'solicitudes', 'tareas'],
        permissions: { canEditSettings: true, canDeleteRecords: true, canManageUsers: true, notifyRoundInProgress: true },
        status: 'active',
        createdAt: '2026-09-12T16:31:23.226Z'
      },
      {
        id: 'usr-1789246875257',
        email: 'ferneymachado@gmail.com',
        displayName: 'Ferney Machado',
        role: 'técnico',
        department: 'Mantenimiento e Ingeniería',
        visibleSections: ['dashboard', 'rondas', 'bombas', 'hojas_vida', 'incidencias', 'preventivo', 'solicitudes', 'tareas'],
        permissions: { canEditSettings: false, canDeleteRecords: false, canManageUsers: false, notifyRoundInProgress: false },
        status: 'active',
        createdAt: '2026-09-12T16:32:00.000Z'
      },
      {
        id: 'usr-1789435937593',
        email: 'carlosmanuel@gmail.com',
        displayName: 'Carlos Manuel',
        role: 'técnico',
        department: 'Mantenimiento e Ingeniería',
        visibleSections: ['dashboard', 'rondas', 'bombas', 'hojas_vida', 'incidencias', 'preventivo', 'solicitudes', 'tareas'],
        permissions: { canEditSettings: false, canDeleteRecords: false, canManageUsers: false, notifyRoundInProgress: false },
        status: 'active',
        createdAt: '2026-09-12T16:33:00.000Z'
      },
      {
        id: 'usr-1789437863324',
        email: 'ferneyalonso44@gmail.com',
        displayName: 'Ferney Alonso',
        role: 'técnico',
        department: 'Mantenimiento e Ingeniería',
        visibleSections: ['dashboard', 'rondas', 'bombas', 'hojas_vida', 'incidencias', 'preventivo', 'solicitudes', 'tareas'],
        permissions: { canEditSettings: false, canDeleteRecords: false, canManageUsers: false, notifyRoundInProgress: false },
        status: 'active',
        createdAt: '2026-09-12T16:34:00.000Z'
      },
      {
        id: 'usr-1789488926722',
        email: 'mauricio.marin@wake.com.co',
        displayName: 'Mauricio',
        role: 'admin',
        department: 'Recepción & Operaciones',
        visibleSections: ['dashboard', 'rondas', 'bombas', 'hojas_vida', 'incidencias', 'preventivo', 'usuarios', 'configuraciones', 'solicitudes', 'tareas', 'horarios'],
        permissions: { canEditSettings: true, canDeleteRecords: false, canManageUsers: false, notifyRoundInProgress: false },
        status: 'active',
        createdAt: '2026-09-14T10:00:00.000Z'
      }
    ];

    const fakeIds = new Set(['usr-1789230683227', 'usr-1789230683228', 'usr-1789230683229', 'usr-admin-master']);
    if (!Array.isArray(memoryCache.users) || memoryCache.users.length === 0) {
      memoryCache.users = authentic6Users;
    } else {
      const userMap = new Map();
      authentic6Users.forEach(u => userMap.set(u.id, u));
      memoryCache.users.forEach((u: any) => {
        if (u && u.id && !fakeIds.has(u.id)) {
          userMap.set(u.id, u);
        }
      });
      memoryCache.users = Array.from(userMap.values());
    }
    if (!Array.isArray(memoryCache.schedules)) memoryCache.schedules = [];
    if (!Array.isArray(memoryCache.shiftSwaps)) memoryCache.shiftSwaps = [];
    if (!Array.isArray(memoryCache.roundTemplate)) memoryCache.roundTemplate = [];
    if (!Array.isArray(memoryCache.deletedIds)) memoryCache.deletedIds = [];

    // Filter out any deleted elements loaded from file
    const deletedIdsSet = new Set(memoryCache.deletedIds);
    if (deletedIdsSet.size > 0) {
      const arrayKeys = [
        'rounds',
        'equipments',
        'incidents',
        'requests',
        'tasks',
        'pumpInspections',
        'preventivePlans',
        'workOrders',
        'users',
        'schedules',
        'shiftSwaps',
        'uploadedDocuments',
        'documentFolders'
      ];
      for (const key of arrayKeys) {
        if (Array.isArray(memoryCache[key])) {
          memoryCache[key] = memoryCache[key].filter((item: any) => item && item.id && !deletedIdsSet.has(item.id));
        }
      }
    }

    // Always sync active round anomalies into incidents and unmark any stale deletedId
    syncRoundAnomaliesToIncidents(memoryCache);
  }
  return memoryCache;
}

function getServerLocalDateTimeString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

const STATUS_PRIORITY: Record<string, number> = {
  'solucionado': 3,
  'resuelto': 3,
  'en_atencion': 2,
  'en_proceso': 2,
  'pendiente': 1
};

function getMoreAdvancedStatus(s1?: string, s2?: string): string {
  const p1 = STATUS_PRIORITY[s1 || 'pendiente'] || 1;
  const p2 = STATUS_PRIORITY[s2 || 'pendiente'] || 1;
  return p1 >= p2 ? (s1 || 'pendiente') : (s2 || 'pendiente');
}

const CANONICAL_INCIDENT_MAP: Record<string, string> = {
  'inc-1789643372377-carlos-m': 'inc-1789647000266-k0ogc',
  'inc-1789556089784-juan-m': 'inc-1789558924973-m8oie',
  'inc-anom-rnd-1789643372377-Alarma_en:_Combustible': 'inc-1789647000266-k0ogc',
  'inc-anom-rnd-1789614646673-Alarma_en:_Combustible': 'inc-1789617826284-mxa5x',
  'inc-anom-rnd-1789556089784-Alarma_en:_Combustible': 'inc-1789558924973-m8oie',
  'inc-anom-rnd-1789521648195-Alarma_en:_Combustible': 'inc-1789525663358-c3mmn',
  'inc-anom-rnd-1789470736664-Alarma_en:_Combustible': 'inc-1789474138830-6b0c6',
  'inc-anom-rnd-1789987951724-Alarma_en:_Cava_De_Congelación': 'inc-1789990278160-gj2mc'
};

function isCheckpointFieldCompleteServer(f: any, isGlobalOff: boolean = false, chkVal?: any, chkStatus?: any): boolean {
  if (!f) return false;
  const isFieldOff = isGlobalOff || f.statusValue === 'Apagado' || f.ampState === 'Apagado' || f.value === 0;
  if (isFieldOff) return true;

  const effStatus = (f.statusValue !== undefined && f.statusValue !== null && String(f.statusValue).trim() !== '') ? f.statusValue : chkStatus;
  const effVal = (f.value !== undefined && f.value !== null && String(f.value).trim() !== '') ? f.value : chkVal;

  if (effStatus !== undefined && effStatus !== null && String(effStatus).trim() !== '') return true;
  if (effVal !== undefined && effVal !== null && String(effVal).trim() !== '') {
    const num = typeof effVal === 'number' ? effVal : parseFloat(String(effVal).replace(',', '.'));
    return !isNaN(num);
  }
  return false;
}

function isRoundCheckpointCompleteServer(chk: any): boolean {
  if (!chk) return false;
  const isGlobalOff = chk.statusValue === 'Apagado' || chk.ampState === 'Apagado';
  if (isGlobalOff) return true;

  const directVal = chk.currentValue !== undefined && chk.currentValue !== null && String(chk.currentValue).trim() !== '';
  const statusVal = chk.statusValue !== undefined && chk.statusValue !== null && String(chk.statusValue).trim() !== '';

  // Multi-field checkpoint (e.g. Sistema De Agua Caliente, Bombas, etc.)
  if (chk.measurementFields && Array.isArray(chk.measurementFields) && chk.measurementFields.length > 0) {
    if (chk.measurementFields.length <= 1 && (directVal || statusVal)) return true;
    return chk.measurementFields.every((f: any) => isCheckpointFieldCompleteServer(f, isGlobalOff, chk.currentValue, chk.statusValue));
  }

  // Single numeric checkpoint
  if (chk.type === 'numeric') {
    if (statusVal) return true;
    if (directVal) {
      const num = typeof chk.currentValue === 'number' ? chk.currentValue : parseFloat(String(chk.currentValue).replace(',', '.'));
      return !isNaN(num);
    }
    return false;
  }

  // Options / ok_nok / Generic fallback
  return directVal || statusVal;
}

function isRoundFullyCompletedServer(round: any): boolean {
  if (!round || !Array.isArray(round.checkpoints) || round.checkpoints.length === 0) return false;
  return round.checkpoints.every((chk: any) => isRoundCheckpointCompleteServer(chk));
}

function syncRoundAnomaliesToIncidents(data: any) {
  if (!data || typeof data !== 'object') return;
  if (!Array.isArray(data.rounds)) data.rounds = [];
  if (!Array.isArray(data.incidents)) data.incidents = [];
  if (!Array.isArray(data.deletedIds)) data.deletedIds = [];

  const deletedSet = new Set<string>(data.deletedIds);
  const cleanIncidents: any[] = [];

  // 1. Collect non-deleted incidents with strict ID deduplication & canonical resolution
  for (const rawInc of data.incidents) {
    if (!rawInc || !rawInc.id) continue;
    const resolvedId = CANONICAL_INCIDENT_MAP[rawInc.id] || rawInc.id;
    if (deletedSet.has(resolvedId) || deletedSet.has(rawInc.id)) continue;
    
    const inc = { ...rawInc, id: resolvedId };
    const existingIndex = cleanIncidents.findIndex(item => item.id === inc.id);

    if (existingIndex >= 0) {
      const existing = cleanIncidents[existingIndex];
      const newStatus = getMoreAdvancedStatus(existing.status, inc.status);

      cleanIncidents[existingIndex] = {
        ...existing,
        ...inc,
        id: existing.id,
        status: newStatus,
        resolvedBy: existing.resolvedBy || inc.resolvedBy,
        resolvedAt: existing.resolvedAt || inc.resolvedAt,
        resolutionNotes: existing.resolutionNotes || inc.resolutionNotes
      };
    } else {
      cleanIncidents.push({ ...inc });
    }
  }

  // 2. Extract round anomalies ONLY if never deleted
  for (const round of data.rounds) {
    if (round && Array.isArray(round.anomalies)) {
      for (const anom of round.anomalies) {
        if (!anom || !anom.title) continue;
        let anomId = anom.id || `inc-anom-${round.id}-${anom.title.replace(/\s+/g, '_')}`;
        if (CANONICAL_INCIDENT_MAP[anomId]) {
          anomId = CANONICAL_INCIDENT_MAP[anomId];
        }
        if (anom.id && CANONICAL_INCIDENT_MAP[anom.id]) {
          anom.id = CANONICAL_INCIDENT_MAP[anom.id];
        }

        // If deleted by user, NEVER resurrect
        if (deletedSet.has(anomId) || (anom.id && deletedSet.has(anom.id))) {
          continue;
        }

        const matchIndex = cleanIncidents.findIndex(i => {
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
          const match = cleanIncidents[matchIndex];
          const advStatus = getMoreAdvancedStatus(match.status, anom.status);
          match.status = advStatus;
          anom.id = match.id;
          anom.status = advStatus;
          if (match.resolvedBy) anom.resolvedBy = match.resolvedBy;
          if (match.resolvedAt) anom.resolvedAt = match.resolvedAt;
          if (match.resolutionNotes) anom.resolutionNotes = match.resolutionNotes;
          continue;
        }

        const newInc = {
          id: anomId,
          title: anom.title,
          description: anom.description || `Novedad de ronda en ${anom.area || 'área técnica'}.`,
          area: anom.area || 'General',
          severity: anom.severity || 'alta',
          status: anom.status || 'pendiente',
          registeredBy: anom.registeredBy || round.technicianName || 'Técnico de Turno',
          timestamp: anom.timestamp || (round.date ? `${round.date} ${round.time || '00:00'}` : getServerLocalDateTimeString()),
          photoUrl: anom.photoUrl,
          equipmentId: anom.equipmentId,
          equipmentTag: anom.equipmentTag,
          resolvedBy: anom.resolvedBy,
          resolvedAt: anom.resolvedAt,
          resolutionNotes: anom.resolutionNotes
        };
        cleanIncidents.push(newInc);
      }
    }
  }

  data.incidents = cleanIncidents;
}

function performServerStateAudit(data: any): { isConsistent: boolean; totalCorrections: number; report: any } {
  if (!data || typeof data !== 'object') {
    return { isConsistent: true, totalCorrections: 0, report: {} };
  }

  const corrections: any[] = [];
  const deletedSet = new Set<string>(Array.isArray(data.deletedIds) ? data.deletedIds : []);

  // 1. Audit Tasks
  if (Array.isArray(data.tasks)) {
    const cleanTasks: any[] = [];
    const seenTaskIds = new Set<string>();
    for (const raw of data.tasks) {
      if (!raw || typeof raw !== 'object' || !raw.id || deletedSet.has(raw.id)) continue;
      if (seenTaskIds.has(raw.id)) {
        corrections.push({ entity: 'tasks', id: raw.id, reason: 'Duplicado omitido' });
        continue;
      }
      seenTaskIds.add(raw.id);
      const t = { ...raw };
      const validStatuses = ['pendiente', 'en_progreso', 'completada', 'cancelada'];
      if (!validStatuses.includes(t.status)) {
        const s = String(t.status || '').toLowerCase();
        t.status = (s === 'completado' || s === 'resuelto' || s === 'finalizada') ? 'completada' : (s === 'en_proceso' || s === 'en_curso' ? 'en_progreso' : (s === 'cancelado' ? 'cancelada' : 'pendiente'));
        corrections.push({ entity: 'tasks', id: t.id, field: 'status', correctedTo: t.status });
      }
      if (t.status === 'completada' && !t.completedAt) {
        t.completedAt = t.updatedAt || t.createdAt || getServerLocalDateTimeString();
        corrections.push({ entity: 'tasks', id: t.id, field: 'completedAt', correctedTo: t.completedAt });
      }
      cleanTasks.push(t);
    }
    data.tasks = cleanTasks;
  }

  // 2. Audit Work Orders
  if (Array.isArray(data.workOrders)) {
    const cleanOrders: any[] = [];
    const seenOrderIds = new Set<string>();
    const todayStr = new Date().toISOString().split('T')[0];
    for (const raw of data.workOrders) {
      if (!raw || typeof raw !== 'object' || !raw.id || deletedSet.has(raw.id)) continue;
      if (seenOrderIds.has(raw.id)) {
        corrections.push({ entity: 'workOrders', id: raw.id, reason: 'Duplicado omitido' });
        continue;
      }
      seenOrderIds.add(raw.id);
      const order = { ...raw };
      if (order.status !== 'completado' && order.status !== 'en_ejecucion' && order.scheduledDate) {
        let expected: 'pendiente' | 'por_vencer' | 'vencido' = 'pendiente';
        if (order.scheduledDate < todayStr) expected = 'vencido';
        else {
          const diffDays = Math.ceil((new Date(order.scheduledDate).getTime() - new Date(todayStr).getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays >= 0 && diffDays <= 3) expected = 'por_vencer';
        }
        if (order.status !== expected) {
          order.status = expected;
          corrections.push({ entity: 'workOrders', id: order.id, field: 'status', correctedTo: expected });
        }
      }
      cleanOrders.push(order);
    }
    data.workOrders = cleanOrders;
  }

  // 3. Incidents & Rounds Anomalies
  syncRoundAnomaliesToIncidents(data);

  // 4. Audit Requests
  if (Array.isArray(data.requests)) {
    const cleanReqs: any[] = [];
    const seenReqIds = new Set<string>();
    for (const raw of data.requests) {
      if (!raw || typeof raw !== 'object' || !raw.id || deletedSet.has(raw.id)) continue;
      if (seenReqIds.has(raw.id)) continue;
      seenReqIds.add(raw.id);
      const req = { ...raw };
      const validReqStatuses = ['pendiente', 'en_proceso', 'resuelto', 'cancelado'];
      if (!validReqStatuses.includes(req.status)) {
        const s = String(req.status || '').toLowerCase();
        req.status = (s === 'completado' || s === 'solucionado' || s === 'resuelto') ? 'resuelto' : (s === 'en_atencion' || s === 'en_curso' ? 'en_proceso' : 'pendiente');
      }
      if (req.status === 'resuelto' && !req.resolvedAt) {
        req.resolvedAt = req.createdAt || getServerLocalDateTimeString();
      } else if (req.status !== 'resuelto') {
        delete req.resolvedAt;
      }
      cleanReqs.push(req);
    }
    data.requests = cleanReqs;
  }

  // 5. Audit Rounds
  if (Array.isArray(data.rounds)) {
    const cleanRounds: any[] = [];
    const seenRndIds = new Set<string>();
    for (const raw of data.rounds) {
      if (!raw || typeof raw !== 'object' || !raw.id || deletedSet.has(raw.id)) continue;
      if (seenRndIds.has(raw.id)) continue;
      seenRndIds.add(raw.id);
      const rnd = { ...raw };
      if (Array.isArray(rnd.anomalies) && rnd.anomaliesCount !== rnd.anomalies.length) {
        rnd.anomaliesCount = rnd.anomalies.length;
      }
      cleanRounds.push(rnd);
    }
    data.rounds = cleanRounds;
  }

  return {
    isConsistent: corrections.length === 0,
    totalCorrections: corrections.length,
    report: {
      auditedAt: new Date().toISOString(),
      tasksCount: (data.tasks || []).length,
      workOrdersCount: (data.workOrders || []).length,
      incidentsCount: (data.incidents || []).length,
      requestsCount: (data.requests || []).length,
      roundsCount: (data.rounds || []).length,
      corrections
    }
  };
}

function scheduleSaveToDisk() {
  if (pendingDiskWriteTimer) clearTimeout(pendingDiskWriteTimer);
  pendingDiskWriteTimer = setTimeout(async () => {
    if (isWritingToDisk) {
      scheduleSaveToDisk();
      return;
    }
    isWritingToDisk = true;
    try {
      if (memoryCache) {
        const jsonStr = JSON.stringify(memoryCache);
        await fs.promises.writeFile(DATA_FILE, jsonStr, 'utf-8');
      }
    } catch (e) {
      console.error("Error writing data.json asynchronously:", e);
    } finally {
      isWritingToDisk = false;
    }
  }, 200);
}

function mergeAppData(incoming: any) {
  const current = getCachedData();
  if (!incoming || typeof incoming !== 'object') return current;

  if (!Array.isArray(current.deletedIds)) {
    current.deletedIds = [];
  }

  // Merge incoming deletedIds
  if (Array.isArray(incoming.deletedIds)) {
    const delSet = new Set(current.deletedIds);
    for (const id of incoming.deletedIds) {
      if (typeof id === 'string' && id) {
        delSet.add(id);
      }
    }
    current.deletedIds = Array.from(delSet);
  }

  const deletedIdsSet = new Set(current.deletedIds);

  // 1. Incidents (Strict ID-based merge with canonical mapping)
  if (Array.isArray(incoming.incidents)) {
    const combined = [...incoming.incidents, ...(current.incidents || [])];
    const cleanList: any[] = [];

    for (const rawInc of combined) {
      if (!rawInc || !rawInc.id) continue;
      const resolvedId = CANONICAL_INCIDENT_MAP[rawInc.id] || rawInc.id;
      if (deletedIdsSet.has(resolvedId) || deletedIdsSet.has(rawInc.id)) continue;

      const inc = { ...rawInc, id: resolvedId };
      const existingIndex = cleanList.findIndex(item => item.id === inc.id);

      if (existingIndex >= 0) {
        const existing = cleanList[existingIndex];
        const newStatus = getMoreAdvancedStatus(existing.status, inc.status);

        cleanList[existingIndex] = {
          ...existing,
          ...inc,
          id: existing.id,
          status: newStatus,
          resolvedBy: existing.resolvedBy || inc.resolvedBy,
          resolvedAt: existing.resolvedAt || inc.resolvedAt,
          resolutionNotes: existing.resolutionNotes || inc.resolutionNotes
        };
      } else {
        cleanList.push({ ...inc });
      }
    }

    cleanList.sort((a: any, b: any) => {
      const tA = new Date(a.timestamp || 0).getTime() || 0;
      const tB = new Date(b.timestamp || 0).getTime() || 0;
      return tB - tA;
    });
    current.incidents = cleanList;
  }

  // 2. Requests
  if (Array.isArray(incoming.requests)) {
    const existingReqsMap = new Map<string, any>();
    for (const cur of (current.requests || [])) {
      if (!cur || !cur.id || deletedIdsSet.has(cur.id)) continue;
      existingReqsMap.set(cur.id, cur);
    }
    const REQUEST_STATUS_PRIORITY: Record<string, number> = {
      'resuelto': 3,
      'solucionada': 3,
      'atendida': 3,
      'cerrada': 3,
      'en_revision': 2,
      'en_proceso': 2,
      'pendiente': 1
    };
    for (const reqItem of incoming.requests) {
      if (!reqItem || !reqItem.id || deletedIdsSet.has(reqItem.id)) continue;
      const existing = existingReqsMap.get(reqItem.id);
      if (!existing) {
        existingReqsMap.set(reqItem.id, reqItem);
      } else {
        const tExisting = new Date(existing.updatedAt || (existing.createdAt ? existing.createdAt.replace(' ', 'T') : 0)).getTime();
        const tIncoming = new Date(reqItem.updatedAt || (reqItem.createdAt ? reqItem.createdAt.replace(' ', 'T') : 0)).getTime();

        let chosenStatus = reqItem.status;
        if (tIncoming < tExisting) {
          chosenStatus = existing.status;
        } else if (tIncoming === tExisting) {
          const pExisting = REQUEST_STATUS_PRIORITY[existing.status || 'pendiente'] || 1;
          const pIncoming = REQUEST_STATUS_PRIORITY[reqItem.status || 'pendiente'] || 1;
          chosenStatus = pExisting >= pIncoming ? existing.status : reqItem.status;
        }

        const merged = tIncoming >= tExisting ? { ...existing, ...reqItem } : { ...reqItem, ...existing };
        merged.status = chosenStatus;
        if (merged.status === 'resuelto') {
          merged.resolvedAt = merged.resolvedAt || existing.resolvedAt || reqItem.resolvedAt || getServerLocalDateTimeString();
        } else {
          delete merged.resolvedAt;
        }
        if (existing.completedAt || reqItem.completedAt) merged.completedAt = existing.completedAt || reqItem.completedAt;
        if (existing.resolvedBy || reqItem.resolvedBy) merged.resolvedBy = existing.resolvedBy || reqItem.resolvedBy;
        if (existing.solutionNotes || reqItem.solutionNotes) merged.solutionNotes = existing.solutionNotes || reqItem.solutionNotes;
        existingReqsMap.set(reqItem.id, merged);
      }
    }
    const mergedReqs = Array.from(existingReqsMap.values());
    mergedReqs.sort((a: any, b: any) => {
      const tA = new Date((a.createdAt || '').replace(' ', 'T')).getTime() || 0;
      const tB = new Date((b.createdAt || '').replace(' ', 'T')).getTime() || 0;
      return tB - tA;
    });
    current.requests = mergedReqs;
  }

  // 3. Rounds (Non-destructive: union merge + natural-key deduplication so duplicate offline drafts never duplicate)
  if (Array.isArray(incoming.rounds)) {
    const existingRoundsMap = new Map<string, any>();
    for (const cur of (current.rounds || [])) {
      if (!cur || !cur.id || deletedIdsSet.has(cur.id)) continue;
      existingRoundsMap.set(cur.id, cur);
    }
    for (let rndItem of incoming.rounds) {
      if (!rndItem || !rndItem.id || deletedIdsSet.has(rndItem.id)) continue;
      const existing = existingRoundsMap.get(rndItem.id);
      if (!existing) {
        existingRoundsMap.set(rndItem.id, rndItem);
      } else {
        if (existing.status === 'completada' && rndItem.status !== 'completada') {
          // Preserve completed state
        } else if (rndItem.status === 'completada' && existing.status !== 'completada') {
          existingRoundsMap.set(rndItem.id, rndItem);
        } else {
          const tExisting = new Date(existing.lastUpdated || existing.completedAt || existing.date || 0).getTime();
          const tIncoming = new Date(rndItem.lastUpdated || rndItem.completedAt || rndItem.date || 0).getTime();
          if (tIncoming >= tExisting) {
            existingRoundsMap.set(rndItem.id, rndItem);
          }
        }
      }
    }
    const combined = Array.from(existingRoundsMap.values());
    
    // Natural key deduplication to eliminate duplicate drafts with different IDs
    const deduped: any[] = [];
    const seenKeys = new Map<string, any>();
    for (const r of combined) {
      if (!r || !r.id || deletedIdsSet.has(r.id)) continue;
      const normTech = (r.technicianName || '').toLowerCase().split('/')[0].trim();
      const naturalKey = `${r.date}_${r.shift || ''}_${r.time || ''}_${normTech}`;
      const shiftKey = `${r.date}_${r.shift || ''}_${normTech}`;

      const match = seenKeys.get(naturalKey) || (r.status === 'completada' ? seenKeys.get(shiftKey) : undefined);
      if (match) {
        const matchChk = (match.checkpoints || []).length;
        const rChk = (r.checkpoints || []).length;
        if (r.status === 'completada' && (match.status !== 'completada' || rChk > matchChk)) {
          const idx = deduped.findIndex(x => x.id === match.id);
          if (idx >= 0) {
            deduped[idx] = r;
          }
          seenKeys.set(naturalKey, r);
          seenKeys.set(shiftKey, r);
        }
      } else {
        seenKeys.set(naturalKey, r);
        if (r.status === 'completada' && r.shift) {
          seenKeys.set(shiftKey, r);
        }
        deduped.push(r);
      }
    }

    deduped.sort((a: any, b: any) => {
      const tA = new Date(a.lastUpdated || a.completedAt || a.date || 0).getTime() || 0;
      const tB = new Date(b.lastUpdated || b.completedAt || b.date || 0).getTime() || 0;
      return tB - tA;
    });
    current.rounds = deduped;
  }

  // 4. Equipments (Non-destructive merge by ID)
  if (Array.isArray(incoming.equipments)) {
    const existingEqMap = new Map<string, any>();
    for (const cur of (current.equipments || [])) {
      if (!cur || !cur.id || deletedIdsSet.has(cur.id)) continue;
      existingEqMap.set(cur.id, cur);
    }
    for (const eqItem of incoming.equipments) {
      if (!eqItem || !eqItem.id || deletedIdsSet.has(eqItem.id)) continue;
      existingEqMap.set(eqItem.id, eqItem);
    }
    current.equipments = Array.from(existingEqMap.values());
  }

  // 5. Tasks (Non-destructive merge by ID and timestamp)
  if (Array.isArray(incoming.tasks)) {
    const existingTasksMap = new Map<string, any>();
    for (const cur of (current.tasks || [])) {
      if (!cur || !cur.id || deletedIdsSet.has(cur.id)) continue;
      existingTasksMap.set(cur.id, cur);
    }
    const TASK_STATUS_PRIORITY: Record<string, number> = {
      'completada': 3,
      'terminada': 3,
      'en_proceso': 2,
      'en_progreso': 2,
      'pendiente': 1,
      'asignada': 1
    };
    for (const tItem of incoming.tasks) {
      if (!tItem || !tItem.id || deletedIdsSet.has(tItem.id)) continue;
      const existing = existingTasksMap.get(tItem.id);
      if (!existing) {
        existingTasksMap.set(tItem.id, tItem);
      } else {
        const pExisting = TASK_STATUS_PRIORITY[existing.status || 'pendiente'] || 1;
        const pIncoming = TASK_STATUS_PRIORITY[tItem.status || 'pendiente'] || 1;
        const advStatus = pExisting >= pIncoming ? existing.status : tItem.status;

        const tExisting = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const tIncoming = new Date(tItem.updatedAt || tItem.createdAt || 0).getTime();
        const merged = tIncoming >= tExisting ? { ...existing, ...tItem } : { ...tItem, ...existing };
        merged.status = advStatus;
        if (existing.completedAt || tItem.completedAt) merged.completedAt = existing.completedAt || tItem.completedAt;
        if (existing.completedBy || tItem.completedBy) merged.completedBy = existing.completedBy || tItem.completedBy;
        if (existing.resolutionNotes || tItem.resolutionNotes) merged.resolutionNotes = existing.resolutionNotes || tItem.resolutionNotes;
        existingTasksMap.set(tItem.id, merged);
      }
    }
    current.tasks = Array.from(existingTasksMap.values());
  }

  // 6. Other collections (pumpInspections, preventivePlans, workOrders, users, uploadedDocuments, documentFolders)
  const otherArrayKeys = [
    'pumpInspections',
    'preventivePlans',
    'workOrders',
    'users',
    'schedules',
    'shiftSwaps',
    'uploadedDocuments',
    'documentFolders'
  ];
  for (const key of otherArrayKeys) {
    if (Array.isArray(incoming[key])) {
      const existingMap = new Map<string, any>();
      for (const cur of (current[key] || [])) {
        if (!cur || !cur.id || deletedIdsSet.has(cur.id)) continue;
        existingMap.set(cur.id, cur);
      }
      for (const item of incoming[key]) {
        if (!item || !item.id) continue;
        if (key === 'users' && deletedIdsSet.has(item.id)) {
          deletedIdsSet.delete(item.id);
          current.deletedIds = current.deletedIds.filter((id: string) => id !== item.id);
        } else if (deletedIdsSet.has(item.id)) {
          continue;
        }
        existingMap.set(item.id, item);
      }
      current[key] = Array.from(existingMap.values());
    }
  }

  // Settings merge
  if (incoming.settings && typeof incoming.settings === 'object') {
    current.settings = {
      ...(current.settings || {}),
      ...incoming.settings,
      hotelInfo: {
        ...(current.settings?.hotelInfo || {}),
        ...(incoming.settings.hotelInfo || {})
      },
      alertThresholds: {
        ...(current.settings?.alertThresholds || {}),
        ...(incoming.settings.alertThresholds || {})
      }
    };
  }

  // Round template update
  if (Array.isArray(incoming.roundTemplate)) {
    current.roundTemplate = incoming.roundTemplate;
  }

  // Cronogramas (Master Schedules)
  if (Array.isArray(incoming.cronogramas)) {
    const existingCronMap = new Map<string, any>();
    for (const cur of (current.cronogramas || [])) {
      if (!cur || !cur.id || deletedIdsSet.has(cur.id)) continue;
      existingCronMap.set(cur.id, cur);
    }
    for (const item of incoming.cronogramas) {
      if (!item || !item.id || deletedIdsSet.has(item.id)) continue;
      const existing = existingCronMap.get(item.id);
      if (!existing) {
        existingCronMap.set(item.id, item);
      } else {
        const tExisting = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const tIncoming = new Date(item.updatedAt || item.createdAt || 0).getTime();
        existingCronMap.set(item.id, tIncoming >= tExisting ? { ...existing, ...item } : { ...item, ...existing });
      }
    }
    current.cronogramas = Array.from(existingCronMap.values());
  }

  // 12. Meters (Strict authoritative sync, robust deduplication by id, code, and type+name, zero resurrection)
  // 12. Meters (Union merge so created meters are never erased)
  if (Array.isArray(incoming.meters) || Array.isArray(current.meters)) {
    const combinedMeters = [
      ...(Array.isArray(incoming.meters) ? incoming.meters : []),
      ...(Array.isArray(current.meters) ? current.meters : [])
    ];
    const existingMetersMap = new Map<string, any>();

    for (const item of combinedMeters) {
      if (!item || !item.id) continue;
      const normCode = item.code ? item.code.trim().toUpperCase() : '';

      // Check if this meter was explicitly deleted
      if (deletedIdsSet.has(item.id) || (normCode && deletedIdsSet.has(normCode))) {
        continue;
      }

      // Un-delete explicitly sent meters if present
      if (deletedIdsSet.has(item.id)) {
        deletedIdsSet.delete(item.id);
        current.deletedIds = (current.deletedIds || []).filter((id: string) => id !== item.id);
      }
      if (normCode && deletedIdsSet.has(normCode)) {
        deletedIdsSet.delete(normCode);
        current.deletedIds = (current.deletedIds || []).filter((id: string) => id !== normCode && id !== item.code);
      }

      if (!existingMetersMap.has(item.id)) {
        existingMetersMap.set(item.id, item);
      } else {
        // Keep the one with the latest update timestamp
        const existing = existingMetersMap.get(item.id);
        const tExisting = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const tNew = new Date(item.updatedAt || item.createdAt || 0).getTime();
        if (tNew > tExisting) {
          existingMetersMap.set(item.id, item);
        }
      }
    }
    current.meters = Array.from(existingMetersMap.values());
  }

  // 13. Meter Readings (Strict deduplication by id and meterId+timestamp+value, permanent deletion)
  if (Array.isArray(incoming.meterReadingsLog) || Array.isArray(current.meterReadingsLog)) {
    const existingReadingsMap = new Map<string, any>();
    const seenReadingKeys = new Set<string>();
    const validMeterIds = new Set((current.meters || []).flatMap((m: any) => [m?.id, m?.code].filter(Boolean)));

    const allReadings = [
      ...(Array.isArray(incoming.meterReadingsLog) ? incoming.meterReadingsLog : []),
      ...(Array.isArray(current.meterReadingsLog) ? current.meterReadingsLog : [])
    ];

    for (const item of allReadings) {
      if (!item || !item.id) continue;
      if (deletedIdsSet.has(item.id) || deletedIdsSet.has(item.meterId)) continue;
      if (validMeterIds.size > 0 && !validMeterIds.has(item.meterId)) continue;

      const key = `${item.meterId}_${item.date}_${item.time || '00:00'}_${item.currentValue}`;
      if (seenReadingKeys.has(key) || existingReadingsMap.has(item.id)) continue;
      seenReadingKeys.add(key);
      existingReadingsMap.set(item.id, item);
    }
    const cleanReadings = Array.from(existingReadingsMap.values());
    cleanReadings.sort((a, b) => new Date(b.timestamp || b.date).getTime() - new Date(a.timestamp || a.date).getTime());
    current.meterReadingsLog = cleanReadings;
  }

  // Guarantee round anomalies are synced into incidents and un-deleted
  syncRoundAnomaliesToIncidents(current);

  scheduleSaveToDisk();
  return current;
}

// API Routes
app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write(`data: ${JSON.stringify({ type: 'connected', time: Date.now(), serverVersion: SERVER_BUILD_TIME })}\n\n`);
  sseClients.push(res);

  const heartbeat = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'heartbeat', time: Date.now(), serverVersion: SERVER_BUILD_TIME })}\n\n`);
    } catch {
      clearInterval(heartbeat);
    }
  }, 15000);

  req.on("close", () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter(client => client !== res);
  });
});

app.get("/api/version", (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({ version: SERVER_BUILD_TIME });
});

app.get("/api/data", (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  const data = getCachedData();
  res.json({ ...(data || {}), serverVersion: SERVER_BUILD_TIME });
});

app.get("/api/audit", (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  const data = getCachedData();
  const auditResult = performServerStateAudit(data);
  scheduleSaveToDisk();
  res.json(auditResult);
});

app.post("/api/audit/repair", (req, res) => {
  const data = getCachedData();
  const auditResult = performServerStateAudit(data);
  scheduleSaveToDisk();
  broadcastSse({ type: 'data_updated', clientId: 'system_audit', time: Date.now() });
  res.json({ status: "success", ...auditResult });
});

app.post("/api/data", (req, res) => {
  const clientId = req.headers['x-client-id'] || null;
  mergeAppData(req.body);
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success" });
});

// Web Push setup and endpoints
let isWebPushConfigured = false;
function initWebPush() {
  if (isWebPushConfigured) return;
  const store = getCachedData();
  if (!store.vapidKeys || !store.vapidKeys.publicKey || !store.vapidKeys.privateKey) {
    store.vapidKeys = webpush.generateVAPIDKeys();
    scheduleSaveToDisk();
  }
  try {
    webpush.setVapidDetails(
      'mailto:soporte@mantenimientohotelero.app',
      store.vapidKeys.publicKey,
      store.vapidKeys.privateKey
    );
    isWebPushConfigured = true;
  } catch (err) {
    console.error('Error configuring webpush VAPID details:', err);
  }
}

app.get("/api/push/public-key", (req, res) => {
  initWebPush();
  const store = getCachedData();
  res.json({ publicKey: store.vapidKeys?.publicKey || '' });
});

app.post("/api/push/subscribe", (req, res) => {
  initWebPush();
  const { subscription, user } = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: "Missing push subscription endpoint" });
  }
  const store = getCachedData();
  if (!Array.isArray(store.pushSubscriptions)) {
    store.pushSubscriptions = [];
  }
  // Remove duplicate or outdated subscription for this endpoint
  store.pushSubscriptions = store.pushSubscriptions.filter((s: any) => s.endpoint !== subscription.endpoint);
  store.pushSubscriptions.push({
    ...subscription,
    user: user || null,
    updatedAt: Date.now()
  });
  scheduleSaveToDisk();
  console.log(`[Push] Nueva suscripción registrada. Total de dispositivos activos: ${store.pushSubscriptions.length}`);
  res.json({ status: "subscribed", total: store.pushSubscriptions.length });
});

app.get("/api/push/subscribers-count", (req, res) => {
  const store = getCachedData();
  const subscriptions = store.pushSubscriptions || [];
  res.json({ count: subscriptions.length });
});

app.post("/api/push/check-subscription", (req, res) => {
  const { endpoint } = req.body || {};
  const store = getCachedData();
  const subscriptions = store.pushSubscriptions || [];
  const isSubscribed = subscriptions.some((s: any) => s.endpoint === endpoint);
  res.json({
    subscribed: isSubscribed,
    totalSubscribers: subscriptions.length
  });
});

app.post("/api/push/send", async (req, res) => {
  initWebPush();
  const { category, targetDepartment, targetUserId, title, body, icon, badge, tag, url, data, excludeUserId, excludeEmail, excludeEndpoint } = req.body;
  const store = getCachedData();
  const subscriptions = store.pushSubscriptions || [];

  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return res.json({ sentCount: 0, total: 0, status: "no_subscriptions" });
  }

  const payload = JSON.stringify({
    title: title || 'Mantenimiento Hotelero',
    body: body || 'Nueva actualización del sistema',
    icon: icon || '/pwa-192x192.png',
    badge: badge || '/pwa-192x192.png',
    tag: tag || `push-${Date.now()}`,
    url: url || '/',
    data: data || {}
  });

  const deadEndpoints: string[] = [];
  let sentCount = 0;

  const pushPromises = subscriptions.map(async (sub: any) => {
    if (!sub || !sub.endpoint || !sub.keys) return;

    // 1. If an exact device endpoint is excluded (the browser tab that triggered the action), skip only that tab.
    // This guarantees that other devices belonging to the same user (e.g. their phone) DO receive the push!
    if (excludeEndpoint && sub.endpoint === excludeEndpoint) {
      return;
    }

    // 2. If no excludeEndpoint is provided, fallback to excludeUserId / excludeEmail, EXCEPT when the notification
    // is specifically assigned or targeted to this user
    if (!excludeEndpoint) {
      const isExplicitTarget = Boolean(
        (targetUserId && sub.user?.id && sub.user.id === targetUserId) ||
        (data?.assignedToId && sub.user?.id && sub.user.id === data.assignedToId) ||
        (data?.assignedTo && sub.user?.displayName && (
          data.assignedTo.toLowerCase().includes(sub.user.displayName.toLowerCase()) ||
          sub.user.displayName.toLowerCase().includes(data.assignedTo.toLowerCase())
        ))
      );

      if (!isExplicitTarget) {
        if (excludeUserId && sub.user?.id && sub.user.id === excludeUserId) {
          return;
        }
        if (excludeEmail && sub.user?.email && sub.user.email.toLowerCase().trim() === excludeEmail.toLowerCase().trim()) {
          return;
        }
      }
    }

    const liveUser = (store.users || []).find((u: any) => 
      (sub.user?.id && u.id === sub.user.id) ||
      (sub.user?.email && u.email && u.email.toLowerCase().trim() === sub.user.email.toLowerCase().trim())
    ) || sub.user || {};

    const notifyRounds = liveUser.permissions?.notifyRounds !== undefined
      ? liveUser.permissions.notifyRounds
      : (liveUser.notifyRounds !== undefined ? liveUser.notifyRounds : (sub.user?.notifyRounds !== undefined ? sub.user.notifyRounds : true));
    const notifyIncidents = liveUser.permissions?.notifyIncidents !== undefined
      ? liveUser.permissions.notifyIncidents
      : (liveUser.notifyIncidents !== undefined ? liveUser.notifyIncidents : (sub.user?.notifyIncidents !== undefined ? sub.user.notifyIncidents : true));
    const notifyRequests = liveUser.permissions?.notifyRequests !== undefined
      ? liveUser.permissions.notifyRequests
      : (liveUser.notifyRequests !== undefined ? liveUser.notifyRequests : (sub.user?.notifyRequests !== undefined ? sub.user.notifyRequests : true));
    const notifyTasks = liveUser.permissions?.notifyTasks !== undefined
      ? liveUser.permissions.notifyTasks
      : (liveUser.notifyTasks !== undefined ? liveUser.notifyTasks : (sub.user?.notifyTasks !== undefined ? sub.user.notifyTasks : true));

    const uRole = (liveUser.role || sub.user?.role || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const uDept = (liveUser.department || sub.user?.department || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    const isAdminUser = uRole === 'admin' || uRole === 'administrador' || 
                        (liveUser.email && (
                          liveUser.email.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com' ||
                          liveUser.email.toLowerCase().trim() === 'mauricio.marin@wake.com.co' ||
                          liveUser.email.toLowerCase().trim() === 'carlos.fernández@wake.com.co'
                        )) ||
                        (liveUser.id === 'usr-admin-master' || liveUser.id === 'usr-1789230683226' || liveUser.id === 'usr-1789488926722') ||
                        (liveUser.permissions?.canManageUsers || liveUser.permissions?.canEditSettings);

    // RULE 1: Rondas e Incidencias de Rondas
    if (category === 'rondas') {
      if (notifyRounds === false) {
        return; // El usuario desactivó explícitamente las rondas en su configuración
      }
      // A los técnicos NO les tiene que aparecer esa notificación cuando un compañero hace una ronda, pero a los administradores SÍ.
      if (!isAdminUser) {
        return;
      }
    }

    if (category === 'incidencias') {
      if (notifyIncidents === false) {
        return; // El usuario desactivó explícitamente las notificaciones de incidencias/inconvenientes
      }
    }

    // RULE 2A: TAREAS -> Si se asignó a una persona en específico, SOLAMENTE notificar a esa persona y a los administradores
    if (category === 'tareas') {
      if (notifyTasks === false) {
        return; // El usuario desactivó notificaciones de tareas
      }

      const assignedId = targetUserId || data?.assignedToId;
      const assignedName = (data?.assignedToName || data?.assignedTo || '').toLowerCase().trim();
      const isSpecificAssignee = Boolean(
        data?.isSpecificAssignee ?? (
          assignedId || (
            assignedName &&
            !assignedName.includes('todo el equipo') &&
            !assignedName.includes('todos') &&
            !assignedName.includes('general') &&
            !assignedName.includes('sin asignar')
          )
        )
      );

      if (isSpecificAssignee) {
        let isTargetUser = false;
        const subId = liveUser.id || sub.user?.id;
        const subName = (liveUser.displayName || sub.user?.displayName || '').toLowerCase().trim();
        const subEmail = (liveUser.email || sub.user?.email || '').toLowerCase().trim();
        const cleanSubName = subName.replace(/\/(técnico|tecnico|admin|supervisor)/gi, '').trim();
        const cleanAssignedName = assignedName.replace(/\/(técnico|tecnico|admin|supervisor)/gi, '').trim();

        if (assignedId && subId && subId === assignedId) {
          isTargetUser = true;
        } else if (cleanAssignedName) {
          if (cleanSubName && (cleanSubName === cleanAssignedName || cleanAssignedName.includes(cleanSubName) || cleanSubName.includes(cleanAssignedName))) {
            isTargetUser = true;
          } else if (subEmail && (subEmail === cleanAssignedName || cleanAssignedName.includes(subEmail))) {
            isTargetUser = true;
          }
        }

        if (!isTargetUser && !isAdminUser) {
          return; // Omitir: la notificación es únicamente para el usuario asignado y para los administradores
        }
      } else {
        // Tarea general para el equipo técnico
        if (sub.user && !isAdminUser && uRole !== 'técnico' && uRole !== 'mantenimiento') {
          return;
        }
      }
    }

    // RULE 2B: SOLICITUDES -> Notificaciones para Iniciar Proceso ('en_proceso'), Marcar Resuelto ('resuelto') o Recordatorio Pendiente ('req-remind') o NUEVA SOLICITUD
    if (category === 'solicitudes') {
      if (notifyRequests === false) {
        return; // El usuario desactivó notificaciones de solicitudes
      }

      const isReminder = Boolean(tag && tag.includes('req-remind'));
      const isStatusUpdate = data?.status === 'en_proceso' || data?.status === 'resuelto' ||
        (tag && (tag.includes('req-progress') || tag.includes('req-resolved')));

      const isAdminUser = uRole === 'admin' || uRole === 'administrador' || 
                          (sub.user?.email && (
                            sub.user.email.toLowerCase().trim() === 'juanmateoramosramos44@gmail.com' ||
                            sub.user.email.toLowerCase().trim() === 'mauricio.marin@wake.com.co' ||
                            sub.user.email.toLowerCase().trim() === 'carlos.fernández@wake.com.co'
                          )) ||
                          (sub.user?.id === 'usr-admin-master' || sub.user?.id === 'usr-1789230683226' || sub.user?.id === 'usr-1789488926722') ||
                          (sub.user?.permissions?.canManageUsers || sub.user?.permissions?.canEditSettings);

      const normalizePushStr = (s?: string) => (s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const subName = normalizePushStr(sub.user?.displayName);
      const subEmail = (sub.user?.email || '').toLowerCase().trim();
      const subDept = normalizePushStr(sub.user?.department);
      const assignName = normalizePushStr(data?.assignedTo);

      if (isReminder) {
        // En recordatorios de solicitud pendiente:
        // Notificar EXCLUSIVAMENTE a la persona o área a quien le enviaron/asignaron la solicitud.
        // NUNCA notificar al creador/solicitante de la solicitud (incluso si es administrador).
        const isExactAssignedUser = Boolean(
          (targetUserId && sub.user?.id && sub.user.id === targetUserId) ||
          (data?.assignedToId && sub.user?.id && sub.user.id === data.assignedToId) ||
          (assignName && subName && (assignName === subName || assignName.includes(subName) || subName.includes(assignName))) ||
          (assignName && subEmail && (assignName === subEmail || assignName.includes(subEmail) || subEmail.includes(assignName))) ||
          (assignName && subDept && (assignName.includes(subDept) || subDept.includes(assignName)))
        );

        // Si el usuario suscrito es quien creó la solicitud, NUNCA enviarle recordatorio
        const isCreator = Boolean(
          (data?.requestedById && sub.user?.id && sub.user.id === data.requestedById) ||
          (data?.requestedByEmail && sub.user?.email && sub.user.email.toLowerCase().trim() === data.requestedByEmail.toLowerCase().trim()) ||
          (data?.requestedBy && subName && (normalizePushStr(data.requestedBy) === subName || subName.includes(normalizePushStr(data.requestedBy))))
        );

        if (!isExactAssignedUser || (isCreator && assignName && !assignName.includes(subName))) {
          return; // Omitir: los recordatorios son ÚNICAMENTE para el destinatario asignado
        }
      } else if (isStatusUpdate) {
        // En cambios de estado (Iniciar Proceso o Resuelto):
        // 1. Debe llegarle SIEMPRE a la persona que mandó la solicitud
        // 2. El Administrador (admin) también recibe todas estas notificaciones
        // 3. Los demás perfiles que no sean el solicitante ni admin no deben recibirla
        let isRequester = false;

        // A) Match por ID del solicitante
        if (data?.requestedById && sub.user?.id && sub.user.id === data.requestedById) {
          isRequester = true;
        }

        // B) Match por Email del solicitante
        if (!isRequester && data?.requestedByEmail && sub.user?.email) {
          if (sub.user.email.toLowerCase().trim() === data.requestedByEmail.toLowerCase().trim()) {
            isRequester = true;
          }
        }

        // C) Match por Nombre/DisplayName del solicitante (normalizado, sin tildes)
        if (!isRequester && data?.requestedBy) {
          const reqName = normalizePushStr(data.requestedBy);
          if (subName && (reqName === subName || reqName.includes(subName) || subName.includes(reqName))) {
            isRequester = true;
          } else if (subEmail && (reqName === subEmail || reqName.includes(subEmail) || subEmail.includes(reqName))) {
            isRequester = true;
          }
        }

        // Si NO es el solicitante que mandó la solicitud y NO es administrador, OMITIR
        if (!isRequester && !isAdminUser) {
          return;
        }
      } else {
        // Notificación de NUEVA solicitud creada:
        // 1. Debe llegarle al usuario o área asignada (ej. Mauricio, Ferney, Housekeeping, Recepción, etc.)
        // 2. Debe llegarle a los administradores
        // 3. Debe llegarle al personal técnico / mantenimiento
        const isTargetUser = Boolean(
          (targetUserId && sub.user?.id && sub.user.id === targetUserId) ||
          (data?.assignedToId && sub.user?.id && sub.user.id === data.assignedToId) ||
          (assignName && subName && (assignName === subName || assignName.includes(subName) || subName.includes(assignName))) ||
          (assignName && subEmail && (assignName === subEmail || assignName.includes(subEmail) || subEmail.includes(assignName))) ||
          (assignName && subDept && (assignName.includes(subDept) || subDept.includes(assignName)))
        );

        const isTechStaff = uRole === 'técnico' || uRole === 'mantenimiento';

        if (!isTargetUser && !isAdminUser && !isTechStaff) {
          return;
        }
      }
    }

    try {
      await webpush.sendNotification({
        endpoint: sub.endpoint,
        keys: sub.keys
      }, payload, {
        TTL: 86400,
        urgency: 'high'
      });
      sentCount++;
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        deadEndpoints.push(sub.endpoint);
      } else {
        console.warn('Push delivery warning:', err?.message || err);
      }
    }
  });

  await Promise.allSettled(pushPromises);

  if (deadEndpoints.length > 0) {
    store.pushSubscriptions = subscriptions.filter((s: any) => !deadEndpoints.includes(s.endpoint));
    scheduleSaveToDisk();
  }

  res.json({ sentCount, total: subscriptions.length, status: "success" });
});

app.post("/api/push/test", async (req, res) => {
  initWebPush();
  const { delaySeconds } = req.body || {};
  const delayMs = typeof delaySeconds === 'number' && delaySeconds > 0 ? delaySeconds * 1000 : 0;
  const store = getCachedData();
  const subscriptions = store.pushSubscriptions || [];

  const sendTestNotification = async () => {
    const payload = JSON.stringify({
      title: '🔔 Alerta de Prueba (Mantenimiento)',
      body: '¡Excelente! Tu teléfono recibe las alertas de rondas, solicitudes y tareas al 100% como WhatsApp.',
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: `test-push-${Date.now()}`,
      url: '/?tab=dashboard',
      data: { isTest: true }
    });

    const currentStore = getCachedData();
    const currentSubs = currentStore.pushSubscriptions || [];
    const deadEndpoints: string[] = [];
    let sentCount = 0;

    const pushPromises = currentSubs.map(async (sub: any) => {
      if (!sub || !sub.endpoint || !sub.keys) return;
      try {
        await webpush.sendNotification({
          endpoint: sub.endpoint,
          keys: sub.keys
        }, payload, {
          TTL: 86400,
          urgency: 'high'
        });
        sentCount++;
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          deadEndpoints.push(sub.endpoint);
        } else {
          console.warn('Push delivery warning in test:', err?.message || err);
        }
      }
    });

    await Promise.allSettled(pushPromises);
    if (deadEndpoints.length > 0) {
      currentStore.pushSubscriptions = currentSubs.filter((s: any) => !deadEndpoints.includes(s.endpoint));
      scheduleSaveToDisk();
    }
    return sentCount;
  };

  if (delayMs > 0) {
    // Responder inmediatamente al cliente para que no dependa de tener la app abierta
    res.json({ status: "scheduled", delaySeconds, totalSubscribers: subscriptions.length });
    setTimeout(async () => {
      try {
        await sendTestNotification();
      } catch (e) {
        console.error('Delayed test push error:', e);
      }
    }, delayMs);
  } else {
    const sent = await sendTestNotification();
    res.json({ status: "sent", sentCount: sent, totalSubscribers: subscriptions.length });
  }
});

// PMS Reception Integration API
app.get("/api/pms/data", (req, res) => {
  const store = getCachedData();
  res.json(store.pmsData || {
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
});

app.post("/api/pms/sync", (req, res) => {
  const store = getCachedData();
  const {
    occupancyPercentage,
    totalGuests,
    arrivalsToday,
    departuresToday,
    arrivalsTomorrow,
    totalRooms,
    occupiedRooms,
    vacantRooms,
    maintenanceRooms,
    source
  } = req.body;

  store.pmsData = {
    occupancyPercentage: typeof occupancyPercentage === 'number' ? occupancyPercentage : (store.pmsData?.occupancyPercentage || 88),
    totalGuests: typeof totalGuests === 'number' ? totalGuests : (store.pmsData?.totalGuests || 156),
    arrivalsToday: typeof arrivalsToday === 'number' ? arrivalsToday : (store.pmsData?.arrivalsToday || 24),
    departuresToday: typeof departuresToday === 'number' ? departuresToday : (store.pmsData?.departuresToday || 19),
    arrivalsTomorrow: typeof arrivalsTomorrow === 'number' ? arrivalsTomorrow : (store.pmsData?.arrivalsTomorrow || 30),
    totalRooms: typeof totalRooms === 'number' ? totalRooms : (store.pmsData?.totalRooms || 120),
    occupiedRooms: typeof occupiedRooms === 'number' ? occupiedRooms : (store.pmsData?.occupiedRooms || 106),
    vacantRooms: typeof vacantRooms === 'number' ? vacantRooms : (store.pmsData?.vacantRooms || 14),
    maintenanceRooms: typeof maintenanceRooms === 'number' ? maintenanceRooms : (store.pmsData?.maintenanceRooms || 0),
    lastSyncedAt: new Date().toISOString(),
    source: source || 'Recepción PMS Webhook'
  };

  scheduleSaveToDisk();
  broadcastSse({ type: 'data_updated', clientId: 'pms_sync', time: Date.now() });
  res.json({ success: true, pmsData: store.pmsData });
});

// A robust function to register a deletion in memoryCache and remove it from lists
function registerDeletion(id: string) {
  const current = getCachedData();
  if (!Array.isArray(current.deletedIds)) {
    current.deletedIds = [];
  }
  if (!current.deletedIds.includes(id)) {
    current.deletedIds.push(id);
  }

  const arrayKeys = [
    'rounds',
    'equipments',
    'incidents',
    'requests',
    'tasks',
    'pumpInspections',
    'preventivePlans',
    'workOrders',
    'users',
    'schedules',
    'shiftSwaps',
    'cronogramas',
    'meters',
    'meterReadingsLog',
    'uploadedDocuments',
    'documentFolders'
  ];

  for (const key of arrayKeys) {
    if (Array.isArray(current[key])) {
      current[key] = current[key].filter((item: any) => item && item.id !== id);
    }
  }

  scheduleSaveToDisk();
}

// Individual exact routes for compatibility and immediate multi-screen broadcasts

app.delete("/api/schedules/:id", (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  broadcastSse({
    type: 'schedule_deleted',
    scheduleId: id,
    clientId,
    time: Date.now()
  });
  res.json({ status: "deleted", id });
});

app.delete("/api/cronogramas/:id", (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  const cache = getCachedData();
  if (Array.isArray(cache.cronogramas)) {
    cache.cronogramas = cache.cronogramas.filter((c: any) => c.id !== id);
    scheduleSaveToDisk();
  }
  broadcastSse({
    type: 'cronograma_deleted',
    cronogramaId: id,
    clientId,
    time: Date.now()
  });
  res.json({ status: "deleted", id });
});

app.delete("/api/shift-swaps/:id", (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  broadcastSse({
    type: 'swap_deleted',
    swapId: id,
    clientId,
    time: Date.now()
  });
  res.json({ status: "deleted", id });
});

app.delete("/api/tasks/:id", (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  broadcastSse({
    type: 'task_deleted',
    taskId: id,
    clientId,
    time: Date.now()
  });
  res.json({ status: "deleted", id });
});

app.post("/api/rounds", (req, res) => {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ error: "Invalid JSON in body" });
    }
  }
  if (!body) {
    return res.status(400).json({ error: "Empty request body" });
  }

  const incomingRounds = Array.isArray(body)
    ? body
    : (Array.isArray(body.rounds) ? body.rounds : [body]);

  const validRounds = incomingRounds.filter((r: any) => r && r.id);
  if (validRounds.length === 0) {
    return res.status(400).json({ error: "No valid round objects found" });
  }

  const current = getCachedData();
  if (!Array.isArray(current.rounds)) current.rounds = [];
  const deletedSet = new Set(current.deletedIds || []);

  const clientId = req.headers['x-client-id'] || null;

  for (let round of validRounds) {
    const isFull100 = isRoundFullyCompletedServer(round) || (Array.isArray(round.checkpoints) && round.checkpoints.length >= 22 && round.checkpoints.every((c: any) => isRoundCheckpointCompleteServer(c)));
    
    if (round.status === 'completada' || isFull100) {
      if (isFull100 || (round.compliancePercentage && round.compliancePercentage >= 95)) {
        round.status = 'completada';
        round.compliancePercentage = 100;
        if (!round.completedAt) {
          round.completedAt = new Date().toISOString();
        }
      } else {
        round.status = 'incompleta';
      }
    } else {
      const todayStr = getLocalDateStringServer();
      if (round.date && round.date < todayStr) {
        round.status = isFull100 ? 'completada' : 'incompleta';
        if (isFull100) round.compliancePercentage = 100;
      }
    }

    if (deletedSet.has(round.id)) {
      deletedSet.delete(round.id);
      current.deletedIds = (current.deletedIds || []).filter((id: string) => id !== round.id);
    }

    const idx = current.rounds.findIndex((r: any) => r && r.id === round.id);
    let savedRound: any;
    if (idx >= 0) {
      const existing = current.rounds[idx];
      const mergedCheckpoints = (round.checkpoints || existing.checkpoints || []).map((rc: any) => {
        const ec = (existing.checkpoints || []).find((c: any) => c && (c.id === rc.id || c.title === rc.title));
        const validRcPhoto = rc.photoUrl && !rc.photoUrl.includes('cached_in_db') && (rc.photoUrl.startsWith('data:image/') || rc.photoUrl.startsWith('http'));
        const validEcPhoto = ec?.photoUrl && !ec.photoUrl.includes('cached_in_db') && (ec.photoUrl.startsWith('data:image/') || ec.photoUrl.startsWith('http'));
        const photoUrl = validRcPhoto ? rc.photoUrl : (validEcPhoto ? ec.photoUrl : rc.photoUrl);

        const mergedFields = (rc.measurementFields || ec?.measurementFields || []).map((rf: any, fIdx: number) => {
          const ef = ec?.measurementFields?.[fIdx] || ec?.measurementFields?.find((f: any) => f && (f.id === rf.id || f.name === rf.name));
          const validRfPhoto = rf?.photoUrl && !rf.photoUrl.includes('cached_in_db') && (rf.photoUrl.startsWith('data:image/') || rf.photoUrl.startsWith('http'));
          const validEfPhoto = ef?.photoUrl && !ef.photoUrl.includes('cached_in_db') && (ef.photoUrl.startsWith('data:image/') || ef.photoUrl.startsWith('http'));
          const fPhoto = validRfPhoto ? rf.photoUrl : (validEfPhoto ? ef.photoUrl : rf?.photoUrl);
          return { ...rf, photoUrl: fPhoto };
        });

        return { ...rc, photoUrl, measurementFields: mergedFields };
      });
      const mergedMeters = {
        ...(existing.meterReadings || {}),
        ...(round.meterReadings || {}),
        waterMeterPhotoUrl: (round.meterReadings?.waterMeterPhotoUrl && !round.meterReadings.waterMeterPhotoUrl.includes('cached_in_db'))
          ? round.meterReadings.waterMeterPhotoUrl
          : (existing.meterReadings?.waterMeterPhotoUrl || round.meterReadings?.waterMeterPhotoUrl),
        electricMeterPhotoUrl: (round.meterReadings?.electricMeterPhotoUrl && !round.meterReadings.electricMeterPhotoUrl.includes('cached_in_db'))
          ? round.meterReadings.electricMeterPhotoUrl
          : (existing.meterReadings?.electricMeterPhotoUrl || round.meterReadings?.electricMeterPhotoUrl),
        gasMeterPhotoUrl: (round.meterReadings?.gasMeterPhotoUrl && !round.meterReadings.gasMeterPhotoUrl.includes('cached_in_db'))
          ? round.meterReadings.gasMeterPhotoUrl
          : (existing.meterReadings?.gasMeterPhotoUrl || round.meterReadings?.gasMeterPhotoUrl),
      };
      const mergedAnomalies = (round.anomalies || existing.anomalies || []).map((ra: any) => {
        const ea = (existing.anomalies || []).find((a: any) => a && (a.id === ra.id || a.title === ra.title));
        const validRaPhoto = ra?.photoUrl && !ra.photoUrl.includes('cached_in_db') && (ra.photoUrl.startsWith('data:image/') || ra.photoUrl.startsWith('http'));
        const validEaPhoto = ea?.photoUrl && !ea.photoUrl.includes('cached_in_db') && (ea.photoUrl.startsWith('data:image/') || ea.photoUrl.startsWith('http'));
        const aPhoto = validRaPhoto ? ra.photoUrl : (validEaPhoto ? ea.photoUrl : ra?.photoUrl);
        return { ...ra, photoUrl: aPhoto };
      });
      if (existing.status === 'completada' && round.status !== 'completada') {
        savedRound = { ...existing, ...round, checkpoints: mergedCheckpoints, meterReadings: mergedMeters, anomalies: mergedAnomalies, status: 'completada' };
      } else {
        savedRound = { ...existing, ...round, checkpoints: mergedCheckpoints, meterReadings: mergedMeters, anomalies: mergedAnomalies };
      }
      current.rounds[idx] = savedRound;
    } else {
      savedRound = round;
      current.rounds.unshift(round);
    }

    const eventType = savedRound.status === 'completada' ? 'round_completed' : 'round_updated';
    broadcastSse({
      type: eventType,
      round: savedRound,
      clientId,
      time: Date.now()
    });
  }

  // Deduplicate and sort rounds
  current.rounds = current.rounds.filter((r: any) => r && r.id && !deletedSet.has(r.id));
  current.rounds.sort((a: any, b: any) => {
    const tA = new Date((a.date || '') + 'T' + (a.time || '00:00')).getTime() || (a.completedAt ? new Date(a.completedAt).getTime() : 0);
    const tB = new Date((b.date || '') + 'T' + (b.time || '00:00')).getTime() || (b.completedAt ? new Date(b.completedAt).getTime() : 0);
    return tB - tA;
  });

  // Reconcile anomalies into incidents
  syncRoundAnomaliesToIncidents(current);

  scheduleSaveToDisk();

  broadcastSse({
    type: 'data_updated',
    clientId,
    time: Date.now()
  });

  res.json({
    success: true,
    count: validRounds.length,
    rounds: validRounds
  });
});

app.delete("/api/rounds/:id", (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  broadcastSse({
    type: 'round_deleted',
    roundId: id,
    clientId,
    time: Date.now()
  });
  res.json({ status: "deleted", id });
});

app.delete("/api/requests/:id", (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  broadcastSse({
    type: 'request_deleted',
    requestId: id,
    clientId,
    time: Date.now()
  });
  res.json({ status: "deleted", id });
});

app.delete("/api/incidents/:id", (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  broadcastSse({
    type: 'incident_deleted',
    incidentId: id,
    clientId,
    time: Date.now()
  });
  res.json({ status: "deleted", id });
});

app.delete("/api/equipments/:id", (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  broadcastSse({
    type: 'equipment_deleted',
    equipmentId: id,
    clientId,
    time: Date.now()
  });
  res.json({ status: "deleted", id });
});

app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  broadcastSse({
    type: 'user_deleted',
    userId: id,
    clientId,
    time: Date.now()
  });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

app.delete("/api/preventive-plans/:id", (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

app.delete("/api/work-orders/:id", (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

app.delete("/api/uploaded-documents/:id", (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

app.delete("/api/document-folders/:id", (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

app.post("/api/meters", (req, res) => {
  const meter = req.body;
  if (!meter || !meter.id) return res.status(400).json({ error: "Invalid meter data" });
  const current = getCachedData();
  if (!Array.isArray(current.meters)) current.meters = [];

  const idx = current.meters.findIndex((m: any) => m && m.id === meter.id);
  if (idx >= 0) {
    current.meters[idx] = { ...current.meters[idx], ...meter };
  } else {
    current.meters.unshift(meter);
  }

  // Ensure deletedIds is updated
  if (Array.isArray(current.deletedIds)) {
    current.deletedIds = current.deletedIds.filter((id: string) => id !== meter.id && id !== meter.code);
  }

  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'meter_updated', meter, clientId, time: Date.now() });
  res.json({ success: true, meter });
});

app.delete("/api/meters/:id", (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  const current = getCachedData();
  if (Array.isArray(current.meters)) {
    current.meters = current.meters.filter((m: any) => m && m.id !== id && m.code !== id);
  }
  if (Array.isArray(current.meterReadingsLog)) {
    current.meterReadingsLog = current.meterReadingsLog.filter((r: any) => r && r.meterId !== id);
  }
  scheduleSaveToDisk();
  broadcastSse({ type: 'meter_deleted', meterId: id, clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

app.post("/api/meter-readings", (req, res) => {
  const reading = req.body;
  if (!reading || !reading.id) return res.status(400).json({ error: "Invalid reading data" });
  const current = getCachedData();
  if (!Array.isArray(current.meterReadingsLog)) current.meterReadingsLog = [];

  const idx = current.meterReadingsLog.findIndex((r: any) => r && r.id === reading.id);
  if (idx >= 0) {
    current.meterReadingsLog[idx] = reading;
  } else {
    current.meterReadingsLog.unshift(reading);
  }

  if (Array.isArray(current.meters)) {
    const mIdx = current.meters.findIndex((m: any) => m && (m.id === reading.meterId || m.code === reading.meterId));
    if (mIdx >= 0) {
      current.meters[mIdx].currentReading = reading.currentValue;
      current.meters[mIdx].lastReadingDate = reading.date;
      current.meters[mIdx].lastReadingTime = reading.time;
      current.meters[mIdx].updatedAt = new Date().toISOString();
    }
  }

  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'meter_reading_added', reading, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ success: true, reading });
});

app.delete("/api/meter-readings/:id", (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  const current = getCachedData();
  if (Array.isArray(current.meterReadingsLog)) {
    current.meterReadingsLog = current.meterReadingsLog.filter((r: any) => r && r.id !== id);
  }
  scheduleSaveToDisk();
  broadcastSse({ type: 'meter_reading_deleted', readingId: id, clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

app.post("/api/broadcast", (req, res) => {
  broadcastSse(req.body);
  res.json({ status: "ok" });
});

app.post("/api/ai/read-meter", async (req, res) => {
  try {
    const { image, meterType, context } = req.body;
    if (!image) {
      return res.status(400).json({ error: "No se proporcionó imagen" });
    }

    let base64Data = image;
    let mimeType = "image/jpeg";
    if (image.startsWith("data:")) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    const prompt = `Analiza la imagen adjunta de este contador, manómetro o instrumento de medición técnica hotelera / industrial (${meterType || 'contador general o manómetro'}).
Tu tarea es leer con la máxima precisión posible el valor numérico visible que marca el contador o aguja/pantalla digital (contador de agua fría en m³, contador de electricidad en kWh, contador de gas en m³, manómetro en PSI/bar, termómetro en °C, nivel de cloro ppm, pH, etc.).

Debes responder ÚNICAMENTE con un objeto JSON con el siguiente esquema:
{
  "value": number (el valor numérico principal detectado como número, por ejemplo 1482 o 254.3. Si tiene decimales en números rojos o en diales secundarios inclúyelos adecuadamente. Si no puedes detectar un número con certeza, pon null),
  "rawText": string (el texto o dígitos exactos tal como se ven en los rodillos o display LCD, ej "001482.35" o "4.2 bar"),
  "unit": string (la unidad detectada o supuesta ej "m³", "kWh", "PSI", "bar", "°C", "ppm"),
  "confidence": "high" | "medium" | "low",
  "meterType": string (ej. "Contador de Agua", "Contador Eléctrico", "Contador de Gas", "Manómetro de Presión", "Termómetro"),
  "notes": string (comentario breve en español sobre la lectura, ej. "Lectura nítida en display analógico", o advertencia si la imagen es algo borrosa)
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        { text: prompt },
      ],
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    let parsedResult;
    try {
      parsedResult = JSON.parse(text);
    } catch {
      const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
      parsedResult = JSON.parse(clean);
    }

    return res.json({
      success: true,
      result: parsedResult,
    });
  } catch (error: any) {
    console.error("Error in /api/ai/read-meter:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Error al procesar la imagen del contador",
    });
  }
});

// Manifest and PWA Assets handlers with compliant headers for Google Chrome installability
app.get(['/manifest.json', '/manifest.webmanifest'], (req, res) => {
  const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (fs.existsSync(manifestPath)) {
    return res.sendFile(manifestPath);
  }
  return res.status(404).end();
});

app.get(['/pwa-192x192.png', '/pwa-512x512.png', '/pwa-maskable-512x512.png', '/apple-touch-icon.png'], (req, res) => {
  const iconName = path.basename(req.path);
  const iconPath = path.join(process.cwd(), 'public', iconName);
  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (fs.existsSync(iconPath)) {
    return res.sendFile(iconPath);
  }
  return res.status(404).end();
});

// Service Worker & PWA endpoint handlers to prevent MIME-type mismatch (text/html) and failed update checks
app.get(['/sw.js', '/sw.js*'], (req, res) => {
  const swPath = path.join(process.cwd(), 'public', 'sw.js');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  if (fs.existsSync(swPath)) {
    return res.sendFile(swPath);
  }
  return res.status(200).send('// fallback sw');
});

app.get(['/sw-notifications.js', '/sw-notifications.js*'], (req, res) => {
  const swPath = path.join(process.cwd(), 'public', 'sw-notifications.js');
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  if (fs.existsSync(swPath)) {
    return res.sendFile(swPath);
  }
  return res.status(200).send('// fallback sw-notifications');
});

app.get(['/dev-sw.js', '/dev-sw.js*'], (req, res, next) => {
  const swPath = path.join(process.cwd(), 'dev-dist', 'sw.js');
  if (fs.existsSync(swPath)) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    return res.sendFile(swPath);
  }
  next();
});

app.get('/workbox-:chunk.js', (req, res, next) => {
  const wbPath = path.join(process.cwd(), 'dev-dist', `workbox-${req.params.chunk}.js`);
  if (fs.existsSync(wbPath)) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    return res.sendFile(wbPath);
  }
  next();
});

app.get(['/registerSW.js', '/registerSW.js*'], (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  return res.status(200).send('if ("serviceWorker" in navigator) { navigator.serviceWorker.getRegistrations().then(function(regs) { for (var i = 0; i < regs.length; i++) { regs[i].unregister(); } }); } if ("caches" in window) { caches.keys().then(function(keys) { for (var j = 0; j < keys.length; j++) { caches.delete(keys[j]); } }); }');
});

// Serve assets folder if available to prevent 404 or index.html fallback for scripts
const distAssetsPath = path.join(process.cwd(), 'dist', 'assets');
if (fs.existsSync(distAssetsPath)) {
  app.use('/assets', express.static(distAssetsPath, {
    maxAge: '1y',
    immutable: true
  }));
}

// Guard all SW requests to ensure correct JavaScript MIME type and avoid Vite fallback to index.html
app.use((req, res, next) => {
  const url = req.url || '';
  if (url.includes('dev-sw.js') || url.includes('/sw.js') || url.includes('sw-notifications.js') || url.includes('registerSW.js')) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Service-Worker-Allowed', '/');
    if (req.method === 'HEAD') {
      return res.status(200).end();
    }
  }
  next();
});

async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath, {
      maxAge: '1d',
      index: 'index.html',
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('index.html') || filePath.endsWith('sw.js') || filePath.endsWith('manifest.webmanifest')) {
          res.setHeader('Cache-Control', 'no-cache, must-revalidate');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Universal fallback for any GET route to prevent "Cannot GET"
  app.use((req, res) => {
    if (req.method === 'GET' && !req.url.startsWith('/api')) {
      const distIndex = path.join(distPath, 'index.html');
      if (fs.existsSync(distIndex)) {
        return res.sendFile(distIndex);
      }
      const rootIndex = path.join(process.cwd(), 'index.html');
      if (fs.existsSync(rootIndex)) {
        return res.sendFile(rootIndex);
      }
    }
    res.status(404).send('Not Found');
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    setTimeout(initFirestoreServerSync, 30000);
  });
}

startServer();
