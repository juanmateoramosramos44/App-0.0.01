import express from "express";
import compression from "compression";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import webpush from "web-push";
import pg from "pg";
const { Pool } = pg;
import { HISTORICAL_ROUNDS } from "./src/data/historicalRounds.ts";

const CANONICAL_HISTORICAL_ROUND_IDS = new Set<string>();



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

process.on('uncaughtException', (err: any) => {
  // Prevent socket hangup / EPIPE crashes from stopping the server
  const msg = String(err?.message || err || '');
  if (msg.includes('EPIPE') || msg.includes('ECONNRESET') || msg.includes('ECANCELED')) {
    return;
  }
  console.warn('[Server] Guarded Uncaught Exception:', msg);
});

process.on('unhandledRejection', (reason: any) => {
  const msg = String(reason?.message || reason || '');
  if (msg.includes('EPIPE') || msg.includes('ECONNRESET') || msg.includes('ECANCELED')) {
    return;
  }
  console.warn('[Server] Guarded Unhandled Rejection:', msg);
});

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const DATA_FILE = path.join(process.cwd(), "data.json");
const SERVER_BUILD_TIME = Date.now();

app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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

// PostgreSQL Connection Pool (process.env.DATABASE_URL)
let pgPool: pg.Pool | null = null;
let pgAvailable = false;
const DATABASE_URL = process.env.DATABASE_URL || "";

if (DATABASE_URL) {
  try {
    const isSsl = DATABASE_URL.includes("sslmode=require");
    pgPool = new Pool({
      connectionString: DATABASE_URL,
      ssl: isSsl ? { rejectUnauthorized: false } : undefined,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000,
    });
    pgPool.on('error', (err) => {
      console.warn("[PostgreSQL Pool] Warning / connection event:", err.message);
    });
    console.log("[PostgreSQL] Pool initialized for Coolify / production database.");
  } catch (err) {
    console.warn("[PostgreSQL] Error creating database pool:", err);
  }
} else {
  console.log("[Server] DATABASE_URL not set in environment, operating with persistent local JSON store.");
}

const RECOVERED_CANONICAL_TASKS: any[] = [];

async function initPostgresSchema() {
  if (!pgPool) return;
  try {
    const client = await pgPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS rounds (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          date VARCHAR(50),
          shift VARCHAR(50),
          status VARCHAR(50),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS round_checkpoints (
          round_id VARCHAR(255) NOT NULL,
          checkpoint_index INTEGER NOT NULL,
          checkpoint_id VARCHAR(255) NOT NULL,
          title TEXT,
          area TEXT,
          status_value TEXT,
          current_value TEXT,
          is_alarm BOOLEAN DEFAULT FALSE,
          data JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (round_id, checkpoint_index)
        );
        CREATE TABLE IF NOT EXISTS round_photos (
          id VARCHAR(255) PRIMARY KEY,
          round_id VARCHAR(255) NOT NULL,
          source_type VARCHAR(50) NOT NULL,
          checkpoint_id VARCHAR(255),
          field_index INTEGER,
          data_url TEXT NOT NULL,
          size_bytes INTEGER,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_round_photos_round_id ON round_photos(round_id);
        CREATE TABLE IF NOT EXISTS equipments (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS incidents (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          status VARCHAR(50),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS requests (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          status VARCHAR(50),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS tasks (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          status VARCHAR(50),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS schedules (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          date VARCHAR(50),
          shift VARCHAR(50),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS shift_swaps (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          status VARCHAR(50),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS cronogramas (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS meters (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          code VARCHAR(100),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS meter_readings_log (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          meter_id VARCHAR(255),
          date VARCHAR(50),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS pump_inspections (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS preventive_plans (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS work_orders (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          status VARCHAR(50),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS uploaded_documents (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS document_folders (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          email VARCHAR(255),
          role VARCHAR(50),
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS app_data (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS settings (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS deleted_ids (
          id VARCHAR(255) PRIMARY KEY,
          deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS notifications_queue (
          id VARCHAR(255) PRIMARY KEY,
          category VARCHAR(50),
          title VARCHAR(255) NOT NULL,
          body TEXT NOT NULL,
          url VARCHAR(255),
          data JSONB,
          target_user_id VARCHAR(255),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS bitacora_tecnica (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      `);
      try {
        await client.query(`ALTER TABLE document_folders ADD COLUMN IF NOT EXISTS parent_folder_id TEXT;`);
      } catch (alterErr) {
        console.warn("[PostgreSQL] Notice ensuring parent_folder_id column:", (alterErr as any)?.message || alterErr);
      }
      pgAvailable = true;
      console.log("[PostgreSQL] All tables verified / created successfully.");
      await syncMemoryToPostgresIfEmpty(client);

      // Schema ready
    } finally {
      client.release();
    }
  } catch (err) {
    pgAvailable = false;
    console.warn("[PostgreSQL] Notice: PostgreSQL not reachable in this environment, operating with local JSON store.");
  }
}

function createEmptyMemoryStore() {
  return {
    rounds: [],
    equipments: [],
    incidents: [],
    requests: [],
    tasks: [],
    pumpInspections: [],
    preventivePlans: [],
    workOrders: [],
    schedules: [],
    shiftSwaps: [],
    cronogramas: [],
    bitacora: [],
    meters: [],
    meterReadingsLog: [],
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

function sanitizeCheckpointTemplateServer(chk: any) {
  if (!chk) return chk;
  const copy = { ...chk };
  delete copy.currentValue;
  delete copy.statusValue;
  delete copy.notes;
  delete copy.photoUrl;
  delete copy.photos;
  delete copy.anomalyId;
  delete copy.isAlarmActive;
  delete copy.alarmReason;
  if (Array.isArray(copy.measurementFields)) {
    copy.measurementFields = copy.measurementFields.map((f: any) => {
      const fCopy = { ...f };
      delete fCopy.value;
      delete fCopy.statusValue;
      delete fCopy.photoUrl;
      delete fCopy.photos;
      return fCopy;
    });
  }
  return copy;
}

function buildInitialSeedData() {
  let seed: any = null;
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      seed = JSON.parse(raw);
    }
  } catch (e) {
    console.warn("Notice reading data.json for initial seed:", e);
  }
  if (!seed || typeof seed !== 'object') {
    seed = createEmptyMemoryStore();
    seed.rounds = (HISTORICAL_ROUNDS || []).map((hr: any) => ({ ...hr, status: 'completada', compliancePercentage: 100 }));
    seed.users = [
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
  }
  if (!Array.isArray(seed.roundTemplate) || seed.roundTemplate.length < 26) {
    if (HISTORICAL_ROUNDS && HISTORICAL_ROUNDS[0] && HISTORICAL_ROUNDS[0].checkpoints) {
      seed.roundTemplate = HISTORICAL_ROUNDS[0].checkpoints.map(sanitizeCheckpointTemplateServer);
    }
  }
  return seed;
}

async function syncMemoryToPostgresIfEmpty(client: any) {
  try {
    const tablesToCheck = [
      'rounds', 'users', 'equipments', 'tasks', 'incidents', 'requests', 'meters',
      'meter_readings_log', 'schedules', 'shift_swaps', 'cronogramas', 'bitacora_tecnica',
      'pump_inspections', 'preventive_plans', 'work_orders',
      'uploaded_documents', 'document_folders', 'settings', 'app_data', 'deleted_ids'
    ];
    let totalExistingRecords = 0;
    for (const tbl of tablesToCheck) {
      try {
        const cRes = await client.query(`SELECT COUNT(*) as count FROM ${tbl}`);
        totalExistingRecords += parseInt(cRes.rows[0]?.count || '0', 10);
      } catch {}
    }

    if (totalExistingRecords === 0) {
      console.log('[PostgreSQL] Database is completely empty across all tables and deleted_ids. Seeding initial baseline data...');
      const seedData = buildInitialSeedData();
      await seedPostgresFromData(seedData, client);
      await loadPostgresIntoMemory(client);
      console.log('[PostgreSQL] Database baseline initialized without overwriting.');
    } else {
      console.log(`[PostgreSQL] Database has existing state (${totalExistingRecords} records/tombstones found). Loading into memory...`);
      await loadPostgresIntoMemory(client);
    }
  } catch (e) {
    console.warn('[PostgreSQL] Notice checking database initial state:', e);
  }
}

async function seedPostgresFromData(data: any, client: any) {
  if (!data || typeof data !== 'object') return;
  const collections: Array<{ name: string; items: any[] }> = [
    { name: 'rounds', items: Array.isArray(data.rounds) ? data.rounds : [] },
    { name: 'equipments', items: Array.isArray(data.equipments) ? data.equipments : [] },
    { name: 'incidents', items: Array.isArray(data.incidents) ? data.incidents : [] },
    { name: 'requests', items: Array.isArray(data.requests) ? data.requests : [] },
    { name: 'tasks', items: Array.isArray(data.tasks) ? data.tasks : [] },
    { name: 'schedules', items: Array.isArray(data.schedules) ? data.schedules : [] },
    { name: 'shift_swaps', items: Array.isArray(data.shiftSwaps) ? data.shiftSwaps : [] },
    { name: 'cronogramas', items: Array.isArray(data.cronogramas) ? data.cronogramas : [] },
    { name: 'bitacora_tecnica', items: Array.isArray(data.bitacora) ? data.bitacora : [] },
    { name: 'meters', items: Array.isArray(data.meters) ? data.meters : [] },
    { name: 'meter_readings_log', items: Array.isArray(data.meterReadingsLog) ? data.meterReadingsLog : [] },
    { name: 'pump_inspections', items: Array.isArray(data.pumpInspections) ? data.pumpInspections : [] },
    { name: 'preventive_plans', items: Array.isArray(data.preventivePlans) ? data.preventivePlans : [] },
    { name: 'work_orders', items: Array.isArray(data.workOrders) ? data.workOrders : [] },
    { name: 'uploaded_documents', items: Array.isArray(data.uploadedDocuments) ? data.uploadedDocuments : [] },
    { name: 'document_folders', items: Array.isArray(data.documentFolders) ? data.documentFolders : [] },
    { name: 'users', items: Array.isArray(data.users) ? data.users : [] }
  ];

  const delSet = new Set<string>(Array.isArray(data.deletedIds) ? data.deletedIds : []);
  for (const dId of delSet) {
    if (!dId) continue;
    try {
      await client.query(`INSERT INTO deleted_ids (id, deleted_at) VALUES ($1, CURRENT_TIMESTAMP) ON CONFLICT (id) DO NOTHING`, [dId]);
    } catch {}
  }

  for (const col of collections) {
    for (const item of col.items) {
      if (!item || !item.id || delSet.has(item.id)) continue;
      try {
        await client.query(
          `INSERT INTO ${col.name} (id, data, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (id) DO NOTHING`,
          [item.id, JSON.stringify(item)]
        );
      } catch (err) {}
    }
  }

  if (data.settings) {
    try {
      await client.query(
        `INSERT INTO settings (id, data, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (id) DO NOTHING`,
        ['app_settings', JSON.stringify(data.settings)]
      );
    } catch {}
  }

  if (Array.isArray(data.roundTemplate)) {
    try {
      await client.query(
        `INSERT INTO app_data (id, data, updated_at) VALUES ($1, $2, CURRENT_TIMESTAMP) ON CONFLICT (id) DO NOTHING`,
        ['round_template', JSON.stringify({ items: data.roundTemplate })]
      );
    } catch {}
  }
}

async function loadPostgresIntoMemory(client: any) {
  try {
    const tables = [
      { name: 'rounds', key: 'rounds' },
      { name: 'equipments', key: 'equipments' },
      { name: 'incidents', key: 'incidents' },
      { name: 'requests', key: 'requests' },
      { name: 'tasks', key: 'tasks' },
      { name: 'schedules', key: 'schedules' },
      { name: 'shift_swaps', key: 'shiftSwaps' },
      { name: 'cronogramas', key: 'cronogramas' },
      { name: 'bitacora_tecnica', key: 'bitacora' },
      { name: 'meters', key: 'meters' },
      { name: 'meter_readings_log', key: 'meterReadingsLog' },
      { name: 'pump_inspections', key: 'pumpInspections' },
      { name: 'preventive_plans', key: 'preventivePlans' },
      { name: 'work_orders', key: 'workOrders' },
      { name: 'uploaded_documents', key: 'uploadedDocuments' },
      { name: 'document_folders', key: 'documentFolders' },
      { name: 'users', key: 'users' }
    ];

    if (!memoryCache) memoryCache = createEmptyMemoryStore();

    const delQ = await client.query('SELECT id FROM deleted_ids');
    const deletedSet = new Set<string>((delQ.rows || []).map((r: any) => r.id).filter(Boolean));

    for (const t of tables) {
      const q = await client.query(`SELECT id, data FROM ${t.name}`);
      if (q.rows && q.rows.length > 0) {
        memoryCache[t.key] = q.rows
          .map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null)
          .filter((d: any) => d && d.id && !deletedSet.has(d.id));
        for (const item of memoryCache[t.key]) {
          deletedSet.delete(item.id);
        }
      } else {
        memoryCache[t.key] = [];
      }
    }
    memoryCache.deletedIds = Array.from(deletedSet);

    const setQ = await client.query('SELECT data FROM settings WHERE id = $1', ['app_settings']);
    if (setQ.rows.length > 0) {
      memoryCache.settings = setQ.rows[0].data;
    }

    const tplQ = await client.query('SELECT data FROM app_data WHERE id = $1', ['round_template']);
    if (tplQ.rows.length > 0 && Array.isArray(tplQ.rows[0].data?.items)) {
      memoryCache.roundTemplate = tplQ.rows[0].data.items;
    }
    const schedCfgQ = await client.query('SELECT data FROM app_data WHERE id = $1', ['schedule_config']);
    if (schedCfgQ.rows.length > 0 && schedCfgQ.rows[0].data) {
      if (!memoryCache.appData) memoryCache.appData = {};
      memoryCache.appData['schedule_config'] = schedCfgQ.rows[0].data;
    }
    syncRoundAnomaliesToIncidents(memoryCache);
    scheduleSaveToDisk();
    console.log('[PostgreSQL] Loaded authoritative records from PostgreSQL into memory cache.');
  } catch (e) {
    console.warn('[PostgreSQL] Warning loading postgres records into memory:', e);
  }
}

async function getAuthoritativeDeletedIdsSet(): Promise<Set<string>> {
  const current = getCachedData();
  const set = new Set<string>(Array.isArray(current.deletedIds) ? current.deletedIds : []);
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id FROM deleted_ids');
      for (const r of (q.rows || [])) {
        if (r && r.id) set.add(r.id);
      }
      current.deletedIds = Array.from(set);
    } catch {}
  }
  return set;
}

async function isIdDeletedInServer(id: string, extraCode?: string): Promise<boolean> {
  if (!id && !extraCode) return false;
  const candidates = [id, extraCode, extraCode ? extraCode.trim().toUpperCase() : ''].filter(Boolean) as string[];
  const current = getCachedData();
  const memDel = new Set<string>(Array.isArray(current.deletedIds) ? current.deletedIds : []);
  for (const c of candidates) {
    if (memDel.has(c)) return true;
  }
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id FROM deleted_ids WHERE id = ANY($1::text[]) LIMIT 1', [candidates]);
      if (q.rows && q.rows.length > 0) {
        if (!Array.isArray(current.deletedIds)) current.deletedIds = [];
        for (const r of q.rows) {
          if (r.id && !current.deletedIds.includes(r.id)) current.deletedIds.push(r.id);
        }
        return true;
      }
    } catch {}
  }
  return false;
}

function safeParseTs(val: any): number {
  if (!val) return 0;
  if (typeof val === 'number') return isFinite(val) ? val : 0;
  if (val instanceof Date) return isNaN(val.getTime()) ? 0 : val.getTime();
  const s = String(val).trim();
  if (!s) return 0;
  const isoLike = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(s) ? s.replace(' ', 'T') : s;
  const t = new Date(isoLike).getTime();
  return isNaN(t) ? 0 : t;
}

function monotonicUpdatedAt(existing: any, incomingUpdatedAt?: any): string {
  const prevTs = existing
    ? Math.max(
        safeParseTs(existing.updatedAt),
        safeParseTs(existing.lastUpdated),
        safeParseTs(existing.resolvedAt),
        safeParseTs(existing.createdAt)
      )
    : 0;
  const incTs = safeParseTs(incomingUpdatedAt);
  const nextTs = Math.max(Date.now(), prevTs + 1, incTs);
  return new Date(nextTs).toISOString();
}

function getCanonicalScheduleTechKeyServer(id?: string, name?: string): string {
  const cleanId = String(id || '').trim();
  const normName = String(name || '')
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
}

function findMatchingCheckpointIndexServer(
  list: any[],
  target: any,
  usedIndices?: Set<number>
): number {
  if (!Array.isArray(list) || !target) return -1;
  // Pass 1: exact checkpoint ID match
  if (target.id) {
    const idIdx = list.findIndex((c: any, idx: number) => c && c.id === target.id && (!usedIndices || !usedIndices.has(idx)));
    if (idIdx >= 0) return idIdx;
  }
  const targetTitle = String(target.title || '').trim().toLowerCase();
  const targetArea = String(target.area || '').trim().toLowerCase();
  if (!targetTitle) return -1;
  // Pass 2: exact title + area match (excluding already matched entries)
  if (targetArea) {
    const taIdx = list.findIndex(
      (c: any, idx: number) =>
        c &&
        (!usedIndices || !usedIndices.has(idx)) &&
        String(c.title || '').trim().toLowerCase() === targetTitle &&
        String(c.area || '').trim().toLowerCase() === targetArea
    );
    if (taIdx >= 0) return taIdx;
  }
  // Pass 3: title-only match (excluding already matched entries)
  return list.findIndex(
    (c: any, idx: number) =>
      c &&
      (!usedIndices || !usedIndices.has(idx)) &&
      String(c.title || '').trim().toLowerCase() === targetTitle
  );
}

async function pgUpsert(table: string, id: string, data: any, clearDeletion: boolean = false): Promise<boolean> {
  if (!pgPool) return true;
  const payloadJson = JSON.stringify(data);
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      if (!clearDeletion && table !== 'settings' && table !== 'app_data') {
        const delCheck = await pgPool.query('SELECT 1 FROM deleted_ids WHERE id = $1 LIMIT 1', [id]);
        if (delCheck.rows && delCheck.rows.length > 0) {
          return true;
        }
      }
      if (table === 'document_folders') {
        const parentFolderId = data && data.parentFolderId ? String(data.parentFolderId) : null;
        await pgPool.query(
          `INSERT INTO document_folders (id, data, parent_folder_id, updated_at) 
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP) 
           ON CONFLICT (id) 
           DO UPDATE SET data = EXCLUDED.data, parent_folder_id = EXCLUDED.parent_folder_id, updated_at = CURRENT_TIMESTAMP`,
          [id, payloadJson, parentFolderId]
        );
      } else {
        await pgPool.query(
          `INSERT INTO ${table} (id, data, updated_at) 
           VALUES ($1, $2, CURRENT_TIMESTAMP) 
           ON CONFLICT (id) 
           DO UPDATE SET data = EXCLUDED.data, updated_at = CURRENT_TIMESTAMP`,
          [id, payloadJson]
        );
      }
      if (clearDeletion) {
        await pgPool.query(`DELETE FROM deleted_ids WHERE id = $1`, [id]);
        if (memoryCache && Array.isArray(memoryCache.deletedIds)) {
          memoryCache.deletedIds = memoryCache.deletedIds.filter((dId: string) => dId !== id);
        }
      }
      return true;
    } catch (err) {
      if (attempt === 0) {
        await new Promise(resolve => setTimeout(resolve, 120));
        continue;
      }
      console.error(`[PostgreSQL] Upsert error on ${table}/${id}:`, (err as any)?.message || err);
      return false;
    }
  }
  return false;
}

async function pgDelete(table: string, id: string) {
  if (!pgPool) return;
  try {
    if (table === 'rounds') {
      await pgPool.query(`DELETE FROM round_checkpoints WHERE round_id = $1`, [id]);
      await pgPool.query(`DELETE FROM round_photos WHERE round_id = $1`, [id]);
    }
    await pgPool.query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    await pgPool.query(
      `INSERT INTO deleted_ids (id, deleted_at) VALUES ($1, CURRENT_TIMESTAMP) ON CONFLICT (id) DO NOTHING`,
      [id]
    );
  } catch (err) {
    console.warn(`[PostgreSQL] Notice on delete ${table}:`, (err as any)?.message || err);
  }
}

async function pgGet(table: string, id: string) {
  if (!pgPool) return null;
  try {
    const res = await pgPool.query(`SELECT data FROM ${table} WHERE id = $1`, [id]);
    return res.rows[0]?.data || null;
  } catch (err) {
    return null;
  }
}

async function pgGetAll(table: string) {
  if (!pgPool) return null;
  try {
    const res = await pgPool.query(`SELECT data FROM ${table}`);
    return res.rows.map(r => r.data);
  } catch (err) {
    console.warn(`[PostgreSQL] GetAll error on ${table}:`, err);
    return null;
  }
}

async function persistMemoryToPostgres(incoming: any) {
  if (!pgPool || !incoming || typeof incoming !== 'object') return;
  try {
    const deletedSet = await getAuthoritativeDeletedIdsSet();
    const mappings: Array<{ key: string; table: string }> = [
      { key: 'rounds', table: 'rounds' },
      { key: 'equipments', table: 'equipments' },
      { key: 'incidents', table: 'incidents' },
      { key: 'requests', table: 'requests' },
      { key: 'tasks', table: 'tasks' },
      { key: 'schedules', table: 'schedules' },
      { key: 'shiftSwaps', table: 'shift_swaps' },
      { key: 'cronogramas', table: 'cronogramas' },
      { key: 'bitacora', table: 'bitacora_tecnica' },
      { key: 'meters', table: 'meters' },
      { key: 'meterReadingsLog', table: 'meter_readings_log' },
      { key: 'pumpInspections', table: 'pump_inspections' },
      { key: 'preventivePlans', table: 'preventive_plans' },
      { key: 'workOrders', table: 'work_orders' },
      { key: 'uploadedDocuments', table: 'uploaded_documents' },
      { key: 'documentFolders', table: 'document_folders' },
      { key: 'users', table: 'users' }
    ];

    for (const m of mappings) {
      if (Array.isArray(incoming[m.key])) {
        for (const item of incoming[m.key]) {
          if (!item || !item.id || deletedSet.has(item.id)) continue;
          if (m.key === 'meters') {
            const normCode = item.code ? String(item.code).trim().toUpperCase() : '';
            if ((item.code && deletedSet.has(item.code)) || (normCode && deletedSet.has(normCode))) continue;
          }
          if (m.key === 'meterReadingsLog' && item.meterId && deletedSet.has(item.meterId)) continue;
          await pgUpsert(m.table, item.id, item, false);
        }
      }
    }

    if (incoming.settings) {
      await pgUpsert('settings', 'app_settings', incoming.settings, false);
    }
    if (Array.isArray(incoming.roundTemplate)) {
      await pgUpsert('app_data', 'round_template', { items: incoming.roundTemplate }, false);
    }
  } catch (err) {
    console.warn('[PostgreSQL] Async persist error:', err);
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
      memoryCache = pgPool ? createEmptyMemoryStore() : buildInitialSeedData();
    }

    if (!Array.isArray(memoryCache.roundTemplate) || memoryCache.roundTemplate.length === 0) {
      if (!pgPool && HISTORICAL_ROUNDS && HISTORICAL_ROUNDS[0] && HISTORICAL_ROUNDS[0].checkpoints) {
        memoryCache.roundTemplate = HISTORICAL_ROUNDS[0].checkpoints.map(sanitizeCheckpointTemplateServer);
      } else if (!Array.isArray(memoryCache.roundTemplate)) {
        memoryCache.roundTemplate = [];
      }
    } else {
      memoryCache.roundTemplate = memoryCache.roundTemplate.map(sanitizeCheckpointTemplateServer);
    }

    if (!memoryCache.pmsData) {
      memoryCache.pmsData = createEmptyMemoryStore().pmsData;
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
    if (!Array.isArray(memoryCache.bitacora)) memoryCache.bitacora = [];
    if (!Array.isArray(memoryCache.meters)) memoryCache.meters = [];
    if (!Array.isArray(memoryCache.meterReadingsLog)) memoryCache.meterReadingsLog = [];
    if (!Array.isArray(memoryCache.users)) memoryCache.users = [];
    if (!Array.isArray(memoryCache.schedules)) memoryCache.schedules = [];
    if (!Array.isArray(memoryCache.shiftSwaps)) memoryCache.shiftSwaps = [];
    if (!Array.isArray(memoryCache.deletedIds)) memoryCache.deletedIds = [];

    const fakeIds = new Set(['usr-1789230683227', 'usr-1789230683228', 'usr-1789230683229', 'usr-admin-master']);
    memoryCache.users = memoryCache.users.filter((u: any) => u && u.id && !fakeIds.has(u.id));

    // Filter out ALL deleted elements across ALL collections
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
        'cronogramas',
        'bitacora',
        'meters',
        'meterReadingsLog',
        'uploadedDocuments',
        'documentFolders'
      ];
      for (const key of arrayKeys) {
        if (Array.isArray(memoryCache[key])) {
          memoryCache[key] = memoryCache[key].filter((item: any) => {
            if (!item || !item.id || deletedIdsSet.has(item.id)) return false;
            if (key === 'meters') {
              const normCode = item.code ? String(item.code).trim().toUpperCase() : '';
              if ((item.code && deletedIdsSet.has(item.code)) || (normCode && deletedIdsSet.has(normCode))) return false;
            }
            if (key === 'meterReadingsLog' && item.meterId && deletedIdsSet.has(item.meterId)) return false;
            return true;
          });
        }
      }
    }

    syncRoundAnomaliesToIncidents(memoryCache);
    scheduleSaveToDisk();
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

function isValidPhotoUrlServer(u: any): boolean {
  return (
    typeof u === 'string' &&
    u.trim().length > 25 &&
    !u.includes('cached_in_db') &&
    (u.startsWith('data:image/') || u.startsWith('http://') || u.startsWith('https://'))
  );
}

function mergeUniquePhotosServer(...sources: Array<string[] | string | undefined | null>): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const src of sources) {
    if (Array.isArray(src)) {
      for (const item of src) {
        if (isValidPhotoUrlServer(item)) {
          const trimmed = item.trim();
          if (!seen.has(trimmed)) {
            seen.add(trimmed);
            result.push(trimmed);
          }
        }
      }
    } else if (isValidPhotoUrlServer(src)) {
      const trimmed = (src as string).trim();
      if (!seen.has(trimmed)) {
        seen.add(trimmed);
        result.push(trimmed);
      }
    }
  }
  return result;
}

function checkpointHasValidPhotoServer(chk: any): boolean {
  if (!chk) return false;
  if (isValidPhotoUrlServer(chk.photoUrl)) return true;
  if (Array.isArray(chk.photos) && chk.photos.some(isValidPhotoUrlServer)) return true;
  if (Array.isArray(chk.measurementFields)) {
    for (const f of chk.measurementFields) {
      if (isValidPhotoUrlServer(f?.photoUrl)) return true;
      if (Array.isArray(f?.photos) && f.photos.some(isValidPhotoUrlServer)) return true;
    }
  }
  return false;
}

function isRoundCheckpointCompleteServer(chk: any): boolean {
  if (!chk) return false;
  if (chk.photoRequired === true && !checkpointHasValidPhotoServer(chk)) {
    return false;
  }

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
      if (!raw || typeof raw !== 'object' || !raw.id) continue;
      if (deletedSet.has(raw.id)) continue;
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

  // Only server-registered deletions (via explicit DELETE endpoints) are authoritative
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
      if (!cur || !cur.id) continue;
      if (deletedIdsSet.has(cur.id)) continue;
      existingRoundsMap.set(cur.id, cur);
    }
    for (let rndItem of incoming.rounds) {
      if (!rndItem || !rndItem.id) continue;
      if (deletedIdsSet.has(rndItem.id)) continue;
      const existing = existingRoundsMap.get(rndItem.id);
      if (!existing) {
        existingRoundsMap.set(rndItem.id, rndItem);
      } else {
        const isExistingCompleted = existing.status === 'completada' || Boolean(existing.completedAt && existing.technicianSignature);
        const isIncomingCompleted = rndItem.status === 'completada' || Boolean(rndItem.completedAt && rndItem.technicianSignature);

        if (isExistingCompleted && !isIncomingCompleted) {
          // La ronda ya fue cerrada y completada: NINGÚN paquete rezagado en_progreso puede degradarla
          existingRoundsMap.set(rndItem.id, existing);
        } else if (isIncomingCompleted && !isExistingCompleted) {
          existingRoundsMap.set(rndItem.id, {
            ...existing,
            ...rndItem,
            status: 'completada',
            compliancePercentage: 100,
            completedAt: rndItem.completedAt || existing.completedAt || new Date().toISOString(),
            technicianSignature: rndItem.technicianSignature || existing.technicianSignature || rndItem.technicianName
          });
        } else if (isExistingCompleted && isIncomingCompleted) {
          const tExisting = new Date(existing.lastUpdated || existing.completedAt || 0).getTime();
          const tIncoming = new Date(rndItem.lastUpdated || rndItem.completedAt || 0).getTime();
          const primary = tIncoming > tExisting ? rndItem : existing;
          const secondary = primary === existing ? rndItem : existing;
          const mergedCheckpoints = (primary.checkpoints || []).map((pc: any, cIdx: number) => {
            const sc = (secondary.checkpoints || [])[cIdx] || (secondary.checkpoints || []).find((c: any) => c && (c.id === pc.id || c.title === pc.title));
            if (!sc) return pc;
            const mergedPhotos = mergeUniquePhotosServer(sc.photos, sc.photoUrl, pc.photos, pc.photoUrl);
            const photoUrl = mergedPhotos[mergedPhotos.length - 1] || pc.photoUrl || sc.photoUrl;
            const measurementFields = Array.isArray(pc.measurementFields)
              ? pc.measurementFields.map((pf: any, fIdx: number) => {
                  const sf = sc.measurementFields?.[fIdx] || sc.measurementFields?.find((f: any) => f && (f.id === pf.id || f.name === pf.name));
                  if (!sf) return pf;
                  const hasPfVal = pf.value !== undefined && pf.value !== null && String(pf.value).trim() !== '';
                  const hasSfVal = sf.value !== undefined && sf.value !== null && String(sf.value).trim() !== '';
                  const fPhotos = mergeUniquePhotosServer(sf.photos, sf.photoUrl, pf.photos, pf.photoUrl);
                  return {
                    ...pf,
                    value: hasPfVal ? pf.value : (hasSfVal ? sf.value : pf.value),
                    photos: fPhotos.length > 0 ? fPhotos : pf.photos,
                    photoUrl: fPhotos[fPhotos.length - 1] || pf.photoUrl || sf.photoUrl
                  };
                })
              : sc.measurementFields;
            return {
              ...pc,
              currentValue: pc.currentValue !== undefined && pc.currentValue !== '' ? pc.currentValue : sc.currentValue,
              photos: mergedPhotos.length > 0 ? mergedPhotos : pc.photos,
              photoUrl,
              photoRequired: pc.photoRequired ?? sc.photoRequired,
              measurementFields
            };
          });
          const mergedRootPhotos = mergeUniquePhotosServer(secondary.photos, primary.photos);
          const winner = {
            ...secondary,
            ...primary,
            photos: mergedRootPhotos.length > 0 ? mergedRootPhotos : (primary.photos || secondary.photos),
            checkpoints: mergedCheckpoints.length > 0 ? mergedCheckpoints : (primary.checkpoints || secondary.checkpoints)
          };
          existingRoundsMap.set(rndItem.id, {
            ...winner,
            status: 'completada',
            compliancePercentage: 100,
            completedAt: winner.completedAt || existing.completedAt || rndItem.completedAt || new Date().toISOString(),
            technicianSignature: winner.technicianSignature || existing.technicianSignature || rndItem.technicianSignature || winner.technicianName
          });
        } else {
          // Ambas versiones están en progreso o pendientes
          const tExisting = new Date(existing.lastUpdated || existing.completedAt || existing.date || 0).getTime();
          const tIncoming = new Date(rndItem.lastUpdated || rndItem.completedAt || rndItem.date || 0).getTime();
          if (tIncoming >= tExisting) {
            existingRoundsMap.set(rndItem.id, rndItem);
          }
        }
      }
    }
    const combined = Array.from(existingRoundsMap.values());
    
    // Non-destructive ID preservation (do not discard valid historical rounds, but respect deletions)
    const deduped: any[] = [];
    const seenIds = new Set<string>();
    for (const r of combined) {
      if (!r || !r.id || seenIds.has(r.id)) continue;
      if (deletedIdsSet.has(r.id)) continue;
      seenIds.add(r.id);
      deduped.push(r);
    }

    const getRoundChronoTime = (r: any): number => {
      const dateStr = String(r?.date || '').replace(/\//g, '-').trim();
      const [hRaw, mRaw] = String(r?.time || '00:00').trim().split(':');
      let h = parseInt(hRaw || '0', 10) || 0;
      const m = parseInt(mRaw || '0', 10) || 0;
      if ((r?.shift === 'tarde' || r?.shift === 'noche') && h < 12) h += 12;
      if (dateStr) {
        const t = new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      return new Date(r?.completedAt || r?.lastUpdated || 0).getTime() || 0;
    };

    deduped.sort((a: any, b: any) => getRoundChronoTime(b) - getRoundChronoTime(a));
    current.rounds = deduped;
  }

  // 4. Equipments (Timestamp-aware non-destructive merge by ID)
  if (Array.isArray(incoming.equipments)) {
    const existingEqMap = new Map<string, any>();
    for (const cur of (current.equipments || [])) {
      if (!cur || !cur.id || deletedIdsSet.has(cur.id)) continue;
      existingEqMap.set(cur.id, cur);
    }
    for (const eqItem of incoming.equipments) {
      if (!eqItem || !eqItem.id || deletedIdsSet.has(eqItem.id)) continue;
      const existing = existingEqMap.get(eqItem.id);
      if (!existing) {
        existingEqMap.set(eqItem.id, eqItem);
      } else {
        const tExisting = new Date(existing.updatedAt || existing.lastUpdated || existing.createdAt || 0).getTime() || 0;
        const tIncoming = new Date(eqItem.updatedAt || eqItem.lastUpdated || eqItem.createdAt || 0).getTime() || 0;
        existingEqMap.set(eqItem.id, tIncoming >= tExisting ? { ...existing, ...eqItem } : { ...eqItem, ...existing });
      }
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

        const tExisting = new Date((existing.updatedAt || existing.createdAt || '').replace(' ', 'T') || 0).getTime() || 0;
        const tIncoming = new Date((tItem.updatedAt || tItem.createdAt || '').replace(' ', 'T') || 0).getTime() || 0;
        let chosenStatus = tItem.status || existing.status || 'pendiente';
        if (tIncoming < tExisting) {
          chosenStatus = existing.status;
        } else if (tIncoming === tExisting) {
          chosenStatus = pExisting >= pIncoming ? existing.status : tItem.status;
        }

        const merged = tIncoming >= tExisting ? { ...existing, ...tItem } : { ...tItem, ...existing };
        merged.status = chosenStatus;
        if (chosenStatus === 'completada') {
          if (existing.completedAt || tItem.completedAt) merged.completedAt = tItem.completedAt || existing.completedAt;
          if (existing.completedBy || tItem.completedBy) merged.completedBy = tItem.completedBy || existing.completedBy;
        }
        if (existing.resolutionNotes || tItem.resolutionNotes) merged.resolutionNotes = tItem.resolutionNotes || existing.resolutionNotes;
        existingTasksMap.set(tItem.id, merged);
      }
    }
    const mergedTasks = Array.from(existingTasksMap.values());
    mergedTasks.sort((a: any, b: any) => {
      const tA = new Date((a.createdAt || '').replace(' ', 'T')).getTime() || 0;
      const tB = new Date((b.createdAt || '').replace(' ', 'T')).getTime() || 0;
      return tB - tA;
    });
    current.tasks = mergedTasks;
  }

  // 6. Other collections (Timestamp-safe merge so stale clients never revert newer PostgreSQL records)
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
        if (!item || !item.id || deletedIdsSet.has(item.id)) continue;
        const cleanItem: Record<string, any> = {};
        for (const k of Object.keys(item)) {
          if (item[k] !== undefined) cleanItem[k] = item[k];
        }
        const existing = existingMap.get(item.id);
        let chosen: any = cleanItem;
        if (existing) {
          const tExisting = Math.max(
            safeParseTs(existing.updatedAt),
            safeParseTs(existing.lastUpdated),
            safeParseTs(existing.resolvedAt),
            safeParseTs(existing.uploadDate),
            safeParseTs(existing.createdAt)
          );
          const tIncoming = Math.max(
            safeParseTs(cleanItem.updatedAt),
            safeParseTs(cleanItem.lastUpdated),
            safeParseTs(cleanItem.resolvedAt),
            safeParseTs(cleanItem.uploadDate),
            safeParseTs(cleanItem.createdAt)
          );
          chosen = tIncoming >= tExisting ? { ...existing, ...cleanItem } : { ...cleanItem, ...existing };
          if (key === 'uploadedDocuments' && !chosen.rawBase64 && (existing.rawBase64 || cleanItem.rawBase64)) {
            chosen.rawBase64 = cleanItem.rawBase64 || existing.rawBase64;
          }
        }
        if (key === 'users' && Array.isArray(chosen.visibleSections) && !chosen.visibleSections.includes('tareas')) {
          existingMap.set(item.id, { ...chosen, visibleSections: [...chosen.visibleSections, 'tareas'] });
        } else {
          existingMap.set(item.id, chosen);
        }
      }
      if (key === 'schedules') {
        const dedupByTechDate = new Map<string, any>();
        for (const s of existingMap.values()) {
          if (!s || !s.date) continue;
          const techKey = getCanonicalScheduleTechKeyServer(s.technicianId, s.technicianName);
          const tdKey = `${s.date}__${techKey}`;
          const prev = dedupByTechDate.get(tdKey);
          if (!prev) {
            dedupByTechDate.set(tdKey, s);
          } else {
            const tPrev = Math.max(safeParseTs(prev.updatedAt), safeParseTs(prev.createdAt));
            const tCur = Math.max(safeParseTs(s.updatedAt), safeParseTs(s.createdAt));
            if (tCur >= tPrev) dedupByTechDate.set(tdKey, s);
          }
        }
        current[key] = Array.from(dedupByTechDate.values());
      } else {
        current[key] = Array.from(existingMap.values());
      }
    }
  }

  // Settings merge
  if (incoming.settings && typeof incoming.settings === 'object') {
    const mergedHotelInfo = {
      ...(current.settings?.hotelInfo || {}),
      ...(incoming.settings.hotelInfo || {})
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
    current.settings = {
      ...(current.settings || {}),
      ...incoming.settings,
      hotelInfo: mergedHotelInfo,
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

  // Bitácora Técnica (Permanent union merge by ID)
  if (Array.isArray(incoming.bitacora)) {
    const existingBitMap = new Map<string, any>();
    for (const cur of (current.bitacora || [])) {
      if (!cur || !cur.id) continue;
      existingBitMap.set(cur.id, cur);
    }
    for (const item of incoming.bitacora) {
      if (!item || !item.id) continue;
      const existing = existingBitMap.get(item.id);
      if (!existing) {
        existingBitMap.set(item.id, item);
      } else {
        const tExisting = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        const tIncoming = new Date(item.updatedAt || item.createdAt || 0).getTime();
        const mergedPhotos = mergeUniquePhotosServer(existing.photos, existing.photoUrl, item.photos, item.photoUrl);
        const merged = tIncoming >= tExisting ? { ...existing, ...item } : { ...item, ...existing };
        if (mergedPhotos.length > 0) {
          merged.photos = mergedPhotos;
          merged.photoUrl = mergedPhotos[mergedPhotos.length - 1];
        }
        existingBitMap.set(item.id, merged);
      }
    }
    const mergedBit = Array.from(existingBitMap.values());
    mergedBit.sort((a: any, b: any) => new Date(b.createdAt || b.date || 0).getTime() - new Date(a.createdAt || a.date || 0).getTime());
    current.bitacora = mergedBit;
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
      if (deletedIdsSet.has(item.id) || (item.code && deletedIdsSet.has(item.code)) || (normCode && deletedIdsSet.has(normCode))) {
        continue;
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

app.get("/api/ping", (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({ pong: true, time: Date.now() });
});

app.get("/api/version", (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({ version: SERVER_BUILD_TIME });
});

app.get("/api/data", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  const data = getCachedData();

  if (pgPool) {
    try {
      const [
        qDeleted,
        qRounds,
        qIncidents,
        qRequests,
        qTasks,
        qMeters,
        qReadings,
        qUsers,
        qEquipments,
        qSchedules,
        qCronogramas,
        qShiftSwaps,
        qPreventivePlans,
        qWorkOrders,
        qPumpInspections,
        qUploadedDocuments,
        qDocumentFolders,
        qBitacora,
        qSettings,
        qTemplate,
        qScheduleConfig
      ] = await Promise.all([
        pgPool.query('SELECT id FROM deleted_ids').catch(() => null),
        pgPool.query('SELECT id, data FROM rounds ORDER BY updated_at DESC').catch(() => null),
        pgPool.query('SELECT id, data FROM incidents ORDER BY updated_at DESC').catch(() => null),
        pgPool.query('SELECT id, data FROM requests ORDER BY updated_at DESC').catch(() => null),
        pgPool.query('SELECT id, data FROM tasks ORDER BY updated_at DESC').catch(() => null),
        pgPool.query('SELECT id, data FROM meters ORDER BY updated_at DESC').catch(() => null),
        pgPool.query('SELECT id, data FROM meter_readings_log ORDER BY updated_at DESC').catch(() => null),
        pgPool.query('SELECT id, data FROM users ORDER BY updated_at DESC').catch(() => null),
        pgPool.query('SELECT id, data FROM equipments ORDER BY updated_at DESC').catch(() => null),
        pgPool.query('SELECT id, data FROM schedules ORDER BY updated_at DESC').catch(() => null),
        pgPool.query('SELECT id, data FROM cronogramas ORDER BY updated_at DESC').catch(() => null),
        pgPool.query('SELECT id, data FROM shift_swaps ORDER BY updated_at DESC').catch(() => null),
        pgPool.query('SELECT id, data FROM preventive_plans ORDER BY updated_at DESC').catch(() => null),
        pgPool.query('SELECT id, data FROM work_orders ORDER BY updated_at DESC').catch(() => null),
        pgPool.query('SELECT id, data FROM pump_inspections ORDER BY updated_at DESC').catch(() => null),
        pgPool.query('SELECT id, data FROM uploaded_documents ORDER BY updated_at DESC').catch(() => null),
        pgPool.query('SELECT id, data FROM document_folders ORDER BY updated_at DESC').catch(() => null),
        pgPool.query('SELECT id, data FROM bitacora_tecnica ORDER BY updated_at DESC').catch(() => null),
        pgPool.query('SELECT data FROM settings WHERE id = $1 LIMIT 1', ['app_settings']).catch(() => null),
        pgPool.query('SELECT data FROM app_data WHERE id = $1 LIMIT 1', ['round_template']).catch(() => null),
        pgPool.query('SELECT data FROM app_data WHERE id = $1 LIMIT 1', ['schedule_config']).catch(() => null)
      ] as any);

      const pgDeletedSet = new Set<string>((qDeleted?.rows || []).map((r: any) => r.id).filter(Boolean));
      const memoryDeleted = new Set<string>(data.deletedIds || []);
      const allDeleted = new Set<string>([...pgDeletedSet, ...memoryDeleted]);

      const mapPgRows = (qRes: any, filterMeterCode = false) =>
        (qRes && Array.isArray(qRes.rows))
          ? qRes.rows
              .map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null)
              .filter((r: any) => {
                if (!r || !r.id || allDeleted.has(r.id)) return false;
                if (filterMeterCode) {
                  const normCode = r.code ? String(r.code).trim().toUpperCase() : '';
                  if ((r.code && allDeleted.has(r.code)) || (normCode && allDeleted.has(normCode))) return false;
                }
                return true;
              })
          : null;

      const pgRounds = mapPgRows(qRounds);
      const pgIncidents = mapPgRows(qIncidents);
      const pgRequests = mapPgRows(qRequests);
      const pgTasks = mapPgRows(qTasks);
      const pgMeters = mapPgRows(qMeters, true);
      const pgReadingsRaw = mapPgRows(qReadings);
      const pgReadings = pgReadingsRaw ? pgReadingsRaw.filter((r: any) => !r.meterId || !allDeleted.has(r.meterId)) : null;
      const pgUsers = mapPgRows(qUsers);
      const pgEquipments = mapPgRows(qEquipments);
      const pgSchedules = mapPgRows(qSchedules);
      const pgCronogramas = mapPgRows(qCronogramas);
      const pgShiftSwaps = mapPgRows(qShiftSwaps);
      const pgPreventivePlans = mapPgRows(qPreventivePlans);
      const pgWorkOrders = mapPgRows(qWorkOrders);
      const pgPumpInspections = mapPgRows(qPumpInspections);
      const pgUploadedDocuments = mapPgRows(qUploadedDocuments);
      const pgDocumentFolders = mapPgRows(qDocumentFolders);
      const pgBitacora = (qBitacora && Array.isArray(qBitacora.rows))
        ? qBitacora.rows.map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null).filter(Boolean)
        : null;

      if (pgRounds) data.rounds = pgRounds;
      if (pgIncidents) data.incidents = pgIncidents;
      if (pgRequests) data.requests = pgRequests;
      if (pgTasks) data.tasks = pgTasks;
      if (pgMeters) data.meters = pgMeters;
      if (pgReadings) data.meterReadingsLog = pgReadings;
      if (pgUsers) data.users = pgUsers;
      if (pgEquipments) data.equipments = pgEquipments;
      if (pgSchedules) data.schedules = pgSchedules;
      if (pgCronogramas) data.cronogramas = pgCronogramas;
      if (pgShiftSwaps) data.shiftSwaps = pgShiftSwaps;
      if (pgPreventivePlans) data.preventivePlans = pgPreventivePlans;
      if (pgWorkOrders) data.workOrders = pgWorkOrders;
      if (pgPumpInspections) data.pumpInspections = pgPumpInspections;
      if (pgUploadedDocuments) data.uploadedDocuments = pgUploadedDocuments;
      if (pgDocumentFolders) data.documentFolders = pgDocumentFolders;
      if (pgBitacora) data.bitacora = pgBitacora;
      if (qSettings?.rows?.[0]?.data) data.settings = qSettings.rows[0].data;
      if (Array.isArray(qTemplate?.rows?.[0]?.data?.items)) data.roundTemplate = qTemplate.rows[0].data.items;
      if (qScheduleConfig?.rows?.[0]?.data) {
        if (!data.appData) data.appData = {};
        data.appData['schedule_config'] = qScheduleConfig.rows[0].data;
        data.scheduleConfig = qScheduleConfig.rows[0].data;
      }

      data.deletedIds = Array.from(allDeleted);
      scheduleSaveToDisk();
    } catch (e) {
      console.warn("[PostgreSQL] Notice syncing /api/data with DB:", (e as any)?.message || e);
    }
  }

  res.json({ ...(data || {}), serverVersion: SERVER_BUILD_TIME, serverTime: Date.now() });
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

app.post("/api/data", async (req, res) => {
  const clientId = req.headers['x-client-id'] || null;
  await getAuthoritativeDeletedIdsSet();
  const mergedSnapshot = mergeAppData(req.body);
  // Persist the timestamp-merged authoritative records (never raw stale client payload) for every key included in req.body
  const mergedForBody: Record<string, any> = {};
  if (req.body && typeof req.body === 'object') {
    for (const k of Object.keys(req.body)) {
      if (mergedSnapshot && mergedSnapshot[k] !== undefined) {
        mergedForBody[k] = mergedSnapshot[k];
      }
    }
  }
  await persistMemoryToPostgres(mergedForBody);
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

app.get("/api/notifications/pending", async (req, res) => {
  const { since } = req.query;
  const sinceMs = since ? (Number(since) || new Date(since as string).getTime()) : (Date.now() - 24 * 60 * 60 * 1000);
  const sinceDate = new Date(sinceMs);

  if (pgPool) {
    try {
      const q = await pgPool.query(
        `SELECT * FROM notifications_queue WHERE created_at > $1 ORDER BY created_at ASC`,
        [sinceDate]
      );
      if (q.rows.length > 0) {
        return res.json({
          notifications: q.rows.map((r: any) => ({
            id: r.id,
            category: r.category,
            title: r.title,
            body: r.body,
            url: r.url,
            data: r.data,
            targetUserId: r.target_user_id,
            createdAt: r.created_at
          }))
        });
      }
    } catch (e) {
      console.warn('[PostgreSQL] Error querying notifications_queue:', e);
    }
  }

  const store = getCachedData();
  const queue = store.notificationsQueue || [];
  const pending = queue.filter((n: any) => (n.timestamp || 0) > sinceMs);
  res.json({ notifications: pending });
});

app.post("/api/push/send", async (req, res) => {
  initWebPush();
  const { category, targetDepartment, targetUserId, title, body, icon, badge, tag, url, data, excludeUserId, excludeEmail, excludeEndpoint } = req.body;
  const store = getCachedData();

  // 1. Queue notification in persistent store and PostgreSQL notifications_queue (Offline-First)
  const notifId = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const notifItem = {
    id: notifId,
    category: category || 'general',
    title: title || 'Mantenimiento Hotelero',
    body: body || 'Nueva actualización del sistema',
    url: url || '/',
    data: data || {},
    targetUserId: targetUserId || null,
    timestamp: Date.now()
  };

  if (!store.notificationsQueue) store.notificationsQueue = [];
  store.notificationsQueue.push(notifItem);
  if (store.notificationsQueue.length > 200) {
    store.notificationsQueue = store.notificationsQueue.slice(-200);
  }

  if (pgPool) {
    pgPool.query(
      `INSERT INTO notifications_queue (id, category, title, body, url, data, target_user_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)`,
      [notifId, notifItem.category, notifItem.title, notifItem.body, notifItem.url, JSON.stringify(notifItem.data), notifItem.targetUserId]
    ).catch(() => {});
  }

  const subscriptions = store.pushSubscriptions || [];

  if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
    return res.json({ sentCount: 0, total: 0, status: "queued_no_push_subscribers", notificationId: notifId });
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

    // RULE 2A: TAREAS -> Notificar al usuario asignado específicamente, al creador, o al administrador
    if (category === 'tareas') {
      if (notifyTasks === false) {
        return; // El usuario desactivó notificaciones de tareas
      }

      const normalizePushStr = (s?: string) => (s || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
      const subName = normalizePushStr(liveUser.displayName || sub.user?.displayName);
      const subEmail = (liveUser.email || sub.user?.email || '').toLowerCase().trim();
      const assignName = normalizePushStr(data?.assignedToName || data?.assignedTo);
      const isSpecificAssignment = Boolean(
        data?.assignedToId || 
        (assignName && !assignName.includes('todo el equipo') && !assignName.includes('todos') && !assignName.includes('general') && !assignName.includes('sin asignar'))
      );

      if (isSpecificAssignment) {
        const isTargetUser = Boolean(
          (targetUserId && (sub.user?.id === targetUserId || liveUser.id === targetUserId)) ||
          (data?.assignedToId && (sub.user?.id === data.assignedToId || liveUser.id === data.assignedToId)) ||
          (assignName && subName && (assignName === subName || assignName.includes(subName) || subName.includes(assignName))) ||
          (assignName && subEmail && (assignName === subEmail || assignName.includes(subEmail) || subEmail.includes(assignName)))
        );

        const isCreator = Boolean(
          (data?.createdById && (sub.user?.id === data.createdById || liveUser.id === data.createdById)) ||
          (data?.createdByName && subName && (normalizePushStr(data.createdByName) === subName || subName.includes(normalizePushStr(data.createdByName))))
        );

        // Si la tarea está asignada específicamente a un usuario, omitir para otros técnicos que no sean el asignado, admin o creador
        if (!isTargetUser && !isAdminUser && !isCreator) {
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

function unregisterDeletion(id: string) {
  if (!id) return;
  const current = getCachedData();
  if (Array.isArray(current.deletedIds)) {
    current.deletedIds = current.deletedIds.filter((item: string) => item !== id);
  }
}

// A robust function to register a deletion in memoryCache and remove it from lists
function registerDeletion(id: string) {
  if (!id) return;
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

app.delete("/api/schedules/:id", async (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  const cache = getCachedData();
  if (Array.isArray(cache.schedules)) {
    cache.schedules = cache.schedules.filter((s: any) => s.id !== id);
  }
  await pgDelete('schedules', id);
  scheduleSaveToDisk();
  broadcastSse({
    type: 'schedule_deleted',
    scheduleId: id,
    clientId,
    time: Date.now()
  });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

app.delete("/api/cronogramas/:id", async (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  const cache = getCachedData();
  if (Array.isArray(cache.cronogramas)) {
    cache.cronogramas = cache.cronogramas.filter((c: any) => c.id !== id);
  }
  await pgDelete('cronogramas', id);
  scheduleSaveToDisk();
  broadcastSse({
    type: 'cronograma_deleted',
    cronogramaId: id,
    clientId,
    time: Date.now()
  });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

app.delete("/api/shift-swaps/:id", async (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  const cache = getCachedData();
  if (Array.isArray(cache.shiftSwaps)) {
    cache.shiftSwaps = cache.shiftSwaps.filter((s: any) => s.id !== id);
  }
  await pgDelete('shift_swaps', id);
  scheduleSaveToDisk();
  broadcastSse({
    type: 'swap_deleted',
    swapId: id,
    clientId,
    time: Date.now()
  });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

app.post("/api/tasks", async (req, res) => {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON" });
    }
  }
  if (!body) {
    return res.status(400).json({ error: "Empty body" });
  }

  const incomingTasks = Array.isArray(body)
    ? body
    : (Array.isArray(body.tasks) ? body.tasks : [body]);
  const validTasks = incomingTasks.filter((t: any) => t && t.id);
  if (validTasks.length === 0) {
    return res.status(400).json({ error: "No valid task objects found" });
  }

  const current = getCachedData();
  if (!Array.isArray(current.tasks)) current.tasks = [];
  const clientId = req.headers['x-client-id'] || null;
  const deletedSet = await getAuthoritativeDeletedIdsSet();

  const savedTasks: any[] = [];
  for (const task of validTasks) {
    if (deletedSet.has(task.id) && !task.forceRestore) {
      continue;
    }
    if (task.forceRestore) {
      unregisterDeletion(task.id);
      delete task.forceRestore;
    }
    const idx = current.tasks.findIndex((t: any) => t && t.id === task.id);
    let savedTask: any;
    if (idx >= 0) {
      savedTask = { ...current.tasks[idx], ...task };
      current.tasks[idx] = savedTask;
    } else {
      savedTask = { ...task };
      current.tasks.unshift(savedTask);
    }
    savedTasks.push(savedTask);
    await pgUpsert('tasks', savedTask.id, savedTask, true);
    broadcastSse({
      type: 'task_updated',
      task: savedTask,
      clientId,
      time: Date.now()
    });
  }

  scheduleSaveToDisk();
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", tasks: savedTasks });
});

app.delete("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  await pgDelete('tasks', id);
  scheduleSaveToDisk();
  broadcastSse({
    type: 'task_deleted',
    taskId: id,
    clientId,
    time: Date.now()
  });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

app.get("/api/rounds/in-progress", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");

  const deletedSet = await getAuthoritativeDeletedIdsSet();
  const filterInProgress = (list: any[]) =>
    (list || []).filter((r: any) =>
      r &&
      r.id &&
      !deletedSet.has(r.id) &&
      r.status === 'en_progreso' &&
      !(r.completedAt && r.technicianSignature)
    );

  if (pgPool) {
    try {
      const q = await pgPool.query(
        `SELECT id, data FROM rounds WHERE (data->>'status') = 'en_progreso' ORDER BY updated_at DESC`
      );
      const pgLive = (q.rows || [])
        .map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null)
        .filter(Boolean);
      return res.json(filterInProgress(pgLive));
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading in-progress rounds:", (e as any)?.message || e);
    }
  }

  const store = getCachedData();
  return res.json(filterInProgress(store.rounds || []));
});

app.get("/api/rounds/:id", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const { id } = req.params;
  if (await isIdDeletedInServer(id)) {
    return res.status(410).json({ error: "Deleted", id });
  }
  if (pgPool) {
    const pgRound = await pgGet('rounds', id);
    if (pgRound && typeof pgRound === 'object') {
      const store = getCachedData();
      if (!Array.isArray(store.rounds)) store.rounds = [];
      const idx = store.rounds.findIndex((r: any) => r && r.id === id);
      const normalized = { ...pgRound, id: pgRound.id || id };
      if (idx >= 0) store.rounds[idx] = normalized;
      else store.rounds.unshift(normalized);
      return res.json(normalized);
    }
  }
  const store = getCachedData();
  const found = (store.rounds || []).find((r: any) => r && r.id === id);
  if (!found) {
    return res.status(404).json({ error: "Not found", id });
  }
  return res.json(found);
});

app.post("/api/rounds/:id/checkpoint", async (req, res) => {
  const { id } = req.params;
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON in body" });
    }
  }
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: "Empty request body" });
  }
  if (await isIdDeletedInServer(id)) {
    return res.status(410).json({ error: "Deleted", id });
  }

  const current = getCachedData();
  if (!Array.isArray(current.rounds)) current.rounds = [];

  let idx = current.rounds.findIndex((r: any) => r && r.id === id);
  let existing = idx >= 0 ? current.rounds[idx] : null;
  if (!existing && pgPool) {
    const pgExisting = await pgGet('rounds', id);
    if (pgExisting && typeof pgExisting === 'object') {
      existing = { ...pgExisting, id: pgExisting.id || id };
      current.rounds.unshift(existing);
      idx = 0;
    }
  }

  const { roundMeta, checkpoint, meterReadings, anomalies, skipBroadcast } = body;
  const nowIso = new Date().toISOString();

  if (!existing) {
    existing = {
      ...(roundMeta && typeof roundMeta === 'object' ? roundMeta : {}),
      id,
      status: roundMeta?.status === 'completada' ? 'completada' : 'en_progreso',
      checkpoints: Array.isArray(roundMeta?.checkpoints) ? roundMeta.checkpoints : [],
      anomalies: Array.isArray(roundMeta?.anomalies) ? roundMeta.anomalies : [],
      meterReadings: roundMeta?.meterReadings && typeof roundMeta.meterReadings === 'object' ? roundMeta.meterReadings : {},
      lastUpdated: nowIso
    };
    current.rounds.unshift(existing);
    idx = 0;
  }

  const isExistingCompleted = existing.status === 'completada' || Boolean(existing.completedAt && existing.technicianSignature);
  let updatedCheckpoints = Array.isArray(existing.checkpoints) ? [...existing.checkpoints] : [];

  if (checkpoint && typeof checkpoint === 'object' && checkpoint.id) {
    const cIdx = findMatchingCheckpointIndexServer(updatedCheckpoints, checkpoint);
    const ec = cIdx >= 0 ? updatedCheckpoints[cIdx] : null;
    const mergedChkPhotos = mergeUniquePhotosServer(ec?.photos, ec?.photoUrl, checkpoint.photos, checkpoint.photoUrl);
    const photoUrl = mergedChkPhotos[mergedChkPhotos.length - 1] || checkpoint.photoUrl || ec?.photoUrl;

    const mergedFields = (checkpoint.measurementFields || ec?.measurementFields || []).map((rf: any, fIdx: number) => {
      const ef = ec?.measurementFields?.[fIdx] || ec?.measurementFields?.find((f: any) => f && (f.id === rf.id || f.name === rf.name));
      const mergedFieldPhotos = mergeUniquePhotosServer(ef?.photos, ef?.photoUrl, rf?.photos, rf?.photoUrl);
      const fPhoto = mergedFieldPhotos[mergedFieldPhotos.length - 1] || rf?.photoUrl || ef?.photoUrl;
      return {
        ...ef,
        ...rf,
        ...(mergedFieldPhotos.length > 0 ? { photos: mergedFieldPhotos } : {}),
        ...(fPhoto ? { photoUrl: fPhoto } : {})
      };
    });

    const mergedChk = {
      ...(ec || {}),
      ...checkpoint,
      photoRequired: checkpoint.photoRequired ?? ec?.photoRequired,
      ...(mergedChkPhotos.length > 0 ? { photos: mergedChkPhotos } : {}),
      ...(photoUrl ? { photoUrl } : {}),
      ...(mergedFields.length > 0 ? { measurementFields: mergedFields } : {})
    };

    if (cIdx >= 0) updatedCheckpoints[cIdx] = mergedChk;
    else updatedCheckpoints.push(mergedChk);
  }

  let updatedMeters = existing.meterReadings && typeof existing.meterReadings === 'object' ? { ...existing.meterReadings } : {};
  if (meterReadings && typeof meterReadings === 'object') {
    const mergedCustom: Record<string, any> = {
      ...(updatedMeters.customMeters || {}),
      ...(meterReadings.customMeters || {})
    };
    for (const cmKey of Object.keys(mergedCustom)) {
      const eCm = updatedMeters.customMeters?.[cmKey];
      const rCm = meterReadings.customMeters?.[cmKey];
      const cmPhotos = mergeUniquePhotosServer(eCm?.photos, eCm?.photoUrl, rCm?.photos, rCm?.photoUrl);
      mergedCustom[cmKey] = {
        ...(eCm || {}),
        ...(rCm || {}),
        ...(cmPhotos.length > 0 ? { photos: cmPhotos, photoUrl: cmPhotos[cmPhotos.length - 1] } : {})
      };
    }

    const wPhotos = mergeUniquePhotosServer(updatedMeters.waterMeterPhotos, updatedMeters.waterMeterPhotoUrl, meterReadings.waterMeterPhotos, meterReadings.waterMeterPhotoUrl);
    const ePhotos = mergeUniquePhotosServer(updatedMeters.electricMeterPhotos, updatedMeters.electricMeterPhotoUrl, meterReadings.electricMeterPhotos, meterReadings.electricMeterPhotoUrl);
    const gPhotos = mergeUniquePhotosServer(updatedMeters.gasMeterPhotos, updatedMeters.gasMeterPhotoUrl, meterReadings.gasMeterPhotos, meterReadings.gasMeterPhotoUrl);

    updatedMeters = {
      ...updatedMeters,
      ...meterReadings,
      customMeters: mergedCustom,
      ...(wPhotos.length > 0 ? { waterMeterPhotos: wPhotos, waterMeterPhotoUrl: wPhotos[wPhotos.length - 1] } : {}),
      ...(ePhotos.length > 0 ? { electricMeterPhotos: ePhotos, electricMeterPhotoUrl: ePhotos[ePhotos.length - 1] } : {}),
      ...(gPhotos.length > 0 ? { gasMeterPhotos: gPhotos, gasMeterPhotoUrl: gPhotos[gPhotos.length - 1] } : {})
    };
  }

  let updatedAnomalies = Array.isArray(existing.anomalies) ? [...existing.anomalies] : [];
  if (Array.isArray(anomalies) && anomalies.length > 0) {
    const anomMap = new Map<string, any>();
    for (const ea of updatedAnomalies) {
      if (ea && ea.id) anomMap.set(ea.id, ea);
    }
    for (const ra of anomalies) {
      if (!ra || !ra.id) continue;
      const ea = anomMap.get(ra.id);
      const mergedAPhotos = mergeUniquePhotosServer(ea?.photos, ea?.photoUrl, ra.photos, ra.photoUrl);
      anomMap.set(ra.id, {
        ...(ea || {}),
        ...ra,
        ...(mergedAPhotos.length > 0 ? { photos: mergedAPhotos, photoUrl: mergedAPhotos[mergedAPhotos.length - 1] } : {})
      });
    }
    updatedAnomalies = Array.from(anomMap.values());
  }

  const nextRound = {
    ...existing,
    ...(roundMeta && typeof roundMeta === 'object' ? {
      compliancePercentage: isExistingCompleted ? 100 : (roundMeta.compliancePercentage ?? existing.compliancePercentage),
      technicianName: isExistingCompleted ? existing.technicianName : (roundMeta.technicianName || existing.technicianName),
      lastHeartbeat: roundMeta.lastHeartbeat || nowIso
    } : {}),
    checkpoints: updatedCheckpoints,
    meterReadings: updatedMeters,
    anomalies: updatedAnomalies,
    anomaliesCount: updatedAnomalies.length,
    status: isExistingCompleted ? 'completada' : (existing.status || 'en_progreso'),
    lastUpdated: nowIso
  };

  current.rounds[idx] = nextRound;
  await pgUpsert('rounds', id, nextRound, false);
  scheduleSaveToDisk();

  const clientId = req.headers['x-client-id'] || null;
  if (!skipBroadcast) {
    broadcastSse({
      type: nextRound.status === 'completada' ? 'round_completed' : 'round_updated',
      round: nextRound,
      clientId,
      time: Date.now()
    });
  }

  res.json({ success: true, id, checkpointId: checkpoint?.id });
});

function mergeIncomingRoundWithExistingServer(roundInput: any, existing: any) {
  const round = { ...roundInput };
  const isFull100 =
    isRoundFullyCompletedServer(round) ||
    (Array.isArray(round.checkpoints) &&
      round.checkpoints.length >= 22 &&
      round.checkpoints.every((c: any) => isRoundCheckpointCompleteServer(c)));

  if (round.status === 'en_progreso') {
    // Mantener estrictamente en progreso mientras el técnico trabaja
  } else if (round.status === 'completada' || isFull100) {
    round.status = 'completada';
    round.compliancePercentage = 100;
    if (!round.completedAt) {
      round.completedAt = new Date().toISOString();
    }
  }

  delete round.preserveServerPhotos;
  delete round.forceRestore;

  if (!existing) {
    if (!round.meterReadings || typeof round.meterReadings !== 'object') {
      round.meterReadings = {};
    }
    return round;
  }

  const existingCheckpoints = Array.isArray(existing.checkpoints) ? existing.checkpoints : [];
  const usedExistingIndices = new Set<number>();
  const mergedCheckpoints = (round.checkpoints || existingCheckpoints || []).map((rc: any) => {
    const matchIdx = findMatchingCheckpointIndexServer(existingCheckpoints, rc, usedExistingIndices);
    if (matchIdx >= 0) usedExistingIndices.add(matchIdx);
    const ec = matchIdx >= 0 ? existingCheckpoints[matchIdx] : null;
    const mergedChkPhotos = mergeUniquePhotosServer(ec?.photos, ec?.photoUrl, rc.photos, rc.photoUrl);
    const photoUrl = mergedChkPhotos[mergedChkPhotos.length - 1] || rc.photoUrl || ec?.photoUrl;

    const mergedFields = (rc.measurementFields || ec?.measurementFields || []).map((rf: any, fIdx: number) => {
      const ef =
        ec?.measurementFields?.[fIdx] ||
        ec?.measurementFields?.find((f: any) => f && (f.id === rf.id || f.name === rf.name));
      const mergedFieldPhotos = mergeUniquePhotosServer(ef?.photos, ef?.photoUrl, rf?.photos, rf?.photoUrl);
      const fPhoto = mergedFieldPhotos[mergedFieldPhotos.length - 1] || rf?.photoUrl || ef?.photoUrl;
      return {
        ...rf,
        ...(mergedFieldPhotos.length > 0 ? { photos: mergedFieldPhotos } : {}),
        ...(fPhoto ? { photoUrl: fPhoto } : {})
      };
    });

    return {
      ...rc,
      photoRequired: rc.photoRequired ?? ec?.photoRequired,
      ...(mergedChkPhotos.length > 0 ? { photos: mergedChkPhotos } : {}),
      ...(photoUrl ? { photoUrl } : {}),
      measurementFields: mergedFields
    };
  });

  const mergedCustomMeters: Record<string, any> = {
    ...(existing.meterReadings?.customMeters || {}),
    ...(round.meterReadings?.customMeters || {})
  };
  for (const cmKey of Object.keys(mergedCustomMeters)) {
    const eCm = existing.meterReadings?.customMeters?.[cmKey];
    const rCm = round.meterReadings?.customMeters?.[cmKey];
    const cmPhotos = mergeUniquePhotosServer(eCm?.photos, eCm?.photoUrl, rCm?.photos, rCm?.photoUrl);
    mergedCustomMeters[cmKey] = {
      ...(eCm || {}),
      ...(rCm || {}),
      ...(cmPhotos.length > 0 ? { photos: cmPhotos, photoUrl: cmPhotos[cmPhotos.length - 1] } : {})
    };
  }

  const mergedMeters = {
    ...(existing.meterReadings || {}),
    ...(round.meterReadings || {}),
    customMeters: mergedCustomMeters,
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
    const mergedAnomPhotos = mergeUniquePhotosServer(ea?.photos, ea?.photoUrl, ra?.photos, ra?.photoUrl);
    const aPhoto = mergedAnomPhotos[mergedAnomPhotos.length - 1] || ra?.photoUrl || ea?.photoUrl;
    return {
      ...ra,
      ...(mergedAnomPhotos.length > 0 ? { photos: mergedAnomPhotos } : {}),
      ...(aPhoto ? { photoUrl: aPhoto } : {})
    };
  });

  const mergedRoundPhotos = mergeUniquePhotosServer(existing.photos, round.photos);

  const isExistingCompleted = existing.status === 'completada' || Boolean(existing.completedAt && existing.technicianSignature);
  const isIncomingCompleted = round.status === 'completada' || Boolean(round.completedAt && round.technicianSignature);

  if (isExistingCompleted && !isIncomingCompleted) {
    return {
      ...existing,
      checkpoints: mergedCheckpoints,
      meterReadings: mergedMeters,
      anomalies: mergedAnomalies,
      ...(mergedRoundPhotos.length > 0 ? { photos: mergedRoundPhotos } : {}),
      status: 'completada',
      compliancePercentage: 100,
      completedAt: existing.completedAt || new Date().toISOString(),
      technicianSignature: existing.technicianSignature || existing.technicianName
    };
  }
  if (isIncomingCompleted) {
    return {
      ...existing,
      ...round,
      checkpoints: mergedCheckpoints,
      meterReadings: mergedMeters,
      anomalies: mergedAnomalies,
      ...(mergedRoundPhotos.length > 0 ? { photos: mergedRoundPhotos } : {}),
      status: 'completada',
      compliancePercentage: 100,
      completedAt: round.completedAt || existing.completedAt || new Date().toISOString(),
      technicianSignature: round.technicianSignature || existing.technicianSignature || round.technicianName
    };
  }
  if (round.status === 'en_progreso') {
    return {
      ...existing,
      ...round,
      checkpoints: mergedCheckpoints,
      meterReadings: mergedMeters,
      anomalies: mergedAnomalies,
      ...(mergedRoundPhotos.length > 0 ? { photos: mergedRoundPhotos } : {}),
      status: 'en_progreso',
      completedAt: undefined,
      technicianSignature: round.technicianSignature || existing.technicianSignature || undefined
    };
  }
  return {
    ...existing,
    ...round,
    checkpoints: mergedCheckpoints,
    meterReadings: mergedMeters,
    anomalies: mergedAnomalies,
    ...(mergedRoundPhotos.length > 0 ? { photos: mergedRoundPhotos } : {})
  };
}

function collectRoundPhotosForBulkInsert(roundId: string, round: any) {
  const rows: Array<{
    id: string;
    roundId: string;
    sourceType: string;
    checkpointId: string | null;
    fieldIndex: number | null;
    dataUrl: string;
    sizeBytes: number;
  }> = [];
  const seenUrls = new Set<string>();

  const pushPhoto = (
    suffix: string,
    sourceType: string,
    url: any,
    checkpointId: string | null = null,
    fieldIndex: number | null = null
  ) => {
    if (typeof url !== 'string') return;
    const trimmed = url.trim();
    if (trimmed.length < 25 || trimmed.includes('cached_in_db')) return;
    const dedupKey = `${sourceType}::${checkpointId || ''}::${fieldIndex ?? ''}::${trimmed}`;
    if (seenUrls.has(dedupKey)) return;
    seenUrls.add(dedupKey);
    rows.push({
      id: `${roundId}::${suffix}`,
      roundId,
      sourceType,
      checkpointId,
      fieldIndex,
      dataUrl: trimmed,
      sizeBytes: Buffer.byteLength(trimmed, 'utf8')
    });
  };

  if (Array.isArray(round.checkpoints)) {
    round.checkpoints.forEach((chk: any, cIdx: number) => {
      if (!chk) return;
      const chkId = String(chk.id || `chk_${cIdx}`);
      const chkPhotos = mergeUniquePhotosServer(chk.photos, chk.photoUrl);
      chkPhotos.forEach((u, pIdx) => pushPhoto(`chk_${cIdx}_${pIdx}`, 'checkpoint', u, chkId, null));
      if (Array.isArray(chk.measurementFields)) {
        chk.measurementFields.forEach((f: any, fIdx: number) => {
          if (!f) return;
          const fPhotos = mergeUniquePhotosServer(f.photos, f.photoUrl);
          fPhotos.forEach((u, pIdx) => pushPhoto(`fld_${cIdx}_${fIdx}_${pIdx}`, 'field', u, chkId, fIdx));
        });
      }
    });
  }

  const mr = round.meterReadings;
  if (mr && typeof mr === 'object') {
    mergeUniquePhotosServer(mr.waterMeterPhotos, mr.waterMeterPhotoUrl).forEach((u, pIdx) =>
      pushPhoto(`mtr_water_${pIdx}`, 'meter_water', u, 'meter_water', null)
    );
    mergeUniquePhotosServer(mr.electricMeterPhotos, mr.electricMeterPhotoUrl).forEach((u, pIdx) =>
      pushPhoto(`mtr_electric_${pIdx}`, 'meter_electric', u, 'meter_electric', null)
    );
    mergeUniquePhotosServer(mr.gasMeterPhotos, mr.gasMeterPhotoUrl).forEach((u, pIdx) =>
      pushPhoto(`mtr_gas_${pIdx}`, 'meter_gas', u, 'meter_gas', null)
    );
    if (mr.customMeters && typeof mr.customMeters === 'object') {
      Object.entries(mr.customMeters).forEach(([cmKey, cmVal]: [string, any]) => {
        if (!cmVal) return;
        mergeUniquePhotosServer(cmVal.photos, cmVal.photoUrl).forEach((u, pIdx) =>
          pushPhoto(`mtr_custom_${cmKey}_${pIdx}`, 'meter_custom', u, `meter_${cmKey}`, null)
        );
      });
    }
  }

  if (Array.isArray(round.anomalies)) {
    round.anomalies.forEach((a: any, aIdx: number) => {
      if (!a) return;
      mergeUniquePhotosServer(a.photos, a.photoUrl).forEach((u, pIdx) =>
        pushPhoto(`anom_${aIdx}_${pIdx}`, 'anomaly', u, String(a.id || `anom_${aIdx}`), null)
      );
    });
  }

  if (Array.isArray(round.photos)) {
    mergeUniquePhotosServer(round.photos).forEach((u, pIdx) =>
      pushPhoto(`root_${pIdx}`, 'round_root', u, null, null)
    );
  }

  return rows;
}

async function saveRoundTransactionally(
  incomingRound: any,
  memoryExisting: any,
  deletedSet: Set<string>,
  requireStrictCheckpoints: boolean = false
): Promise<{
  skippedDeleted?: boolean;
  savedRound?: any;
  savedCheckpointsCount: number;
  savedPhotosCount: number;
}> {
  if (!incomingRound || typeof incomingRound !== 'object' || !incomingRound.id) {
    throw new Error('Datos de ronda inválidos o sin identificador.');
  }

  const roundId = String(incomingRound.id).trim();
  const forceRestore = Boolean(incomingRound.forceRestore);

  if (deletedSet.has(roundId) && !forceRestore) {
    return { skippedDeleted: true, savedCheckpointsCount: 0, savedPhotosCount: 0 };
  }

  if (requireStrictCheckpoints) {
    if (!Array.isArray(incomingRound.checkpoints) || incomingRound.checkpoints.length === 0) {
      throw new Error('La ronda debe contener la lista completa de puntos de control.');
    }
  }

  if (!pgPool) {
    const savedRound = mergeIncomingRoundWithExistingServer(incomingRound, memoryExisting);
    return {
      savedRound,
      savedCheckpointsCount: Array.isArray(savedRound.checkpoints) ? savedRound.checkpoints.length : 0,
      savedPhotosCount: collectRoundPhotosForBulkInsert(roundId, savedRound).length
    };
  }

  const client = await pgPool.connect();
  try {
    await client.query('BEGIN');

    if (!forceRestore) {
      const delRes = await client.query('SELECT 1 FROM deleted_ids WHERE id = $1 LIMIT 1', [roundId]);
      if (delRes.rows && delRes.rows.length > 0) {
        await client.query('ROLLBACK');
        return { skippedDeleted: true, savedCheckpointsCount: 0, savedPhotosCount: 0 };
      }
    } else {
      await client.query('DELETE FROM deleted_ids WHERE id = $1', [roundId]);
      deletedSet.delete(roundId);
      unregisterDeletion(roundId);
    }

    // Bloqueo de fila para fusionar fotos existentes en servidor sin sobreescrituras parciales
    const existingRes = await client.query('SELECT data FROM rounds WHERE id = $1 FOR UPDATE', [roundId]);
    const authoritativeExisting = existingRes.rows[0]?.data || memoryExisting || null;
    const savedRound = mergeIncomingRoundWithExistingServer(incomingRound, authoritativeExisting);
    const checkpoints = Array.isArray(savedRound.checkpoints) ? savedRound.checkpoints : [];

    if (requireStrictCheckpoints && checkpoints.length === 0) {
      throw new Error('Integridad fallida: arreglo de puntos vacío en la transacción.');
    }

    // 1. Insertar o actualizar cabecera y documento JSONB maestro de la ronda
    await client.query(
      `INSERT INTO rounds (id, data, date, shift, status, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (id) DO UPDATE SET
         data = EXCLUDED.data,
         date = EXCLUDED.date,
         shift = EXCLUDED.shift,
         status = EXCLUDED.status,
         updated_at = CURRENT_TIMESTAMP`,
      [
        roundId,
        JSON.stringify(savedRound),
        savedRound.date ? String(savedRound.date) : null,
        savedRound.shift ? String(savedRound.shift) : null,
        savedRound.status ? String(savedRound.status) : null
      ]
    );

    // 2. Bulk Insert parametrizado multi-fila para los 26 puntos de control en UNA sola consulta SQL
    let savedCheckpointsCount = 0;
    if (checkpoints.length > 0) {
      const chkValues: any[] = [];
      const chkPlaceholders: string[] = [];

      checkpoints.forEach((chk: any, idx: number) => {
        const base = idx * 9;
        chkPlaceholders.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8}, $${base + 9}, CURRENT_TIMESTAMP)`
        );
        chkValues.push(
          roundId,
          idx,
          String(chk?.id || `chk_${idx}`),
          chk?.title ? String(chk.title) : null,
          chk?.area ? String(chk.area) : null,
          chk?.statusValue !== undefined && chk?.statusValue !== null ? String(chk.statusValue) : null,
          chk?.currentValue !== undefined && chk?.currentValue !== null ? String(chk.currentValue) : null,
          Boolean(chk?.isAlarmActive),
          JSON.stringify(chk || {})
        );
      });

      const bulkChkResult = await client.query(
        `INSERT INTO round_checkpoints
           (round_id, checkpoint_index, checkpoint_id, title, area, status_value, current_value, is_alarm, data, updated_at)
         VALUES ${chkPlaceholders.join(', ')}
         ON CONFLICT (round_id, checkpoint_index) DO UPDATE SET
           checkpoint_id = EXCLUDED.checkpoint_id,
           title = EXCLUDED.title,
           area = EXCLUDED.area,
           status_value = EXCLUDED.status_value,
           current_value = EXCLUDED.current_value,
           is_alarm = EXCLUDED.is_alarm,
           data = EXCLUDED.data,
           updated_at = CURRENT_TIMESTAMP`,
        chkValues
      );
      savedCheckpointsCount = checkpoints.length;

      if ((bulkChkResult.rowCount || 0) < checkpoints.length) {
        throw new Error(`Solo se confirmaron ${bulkChkResult.rowCount || 0} de ${checkpoints.length} puntos en PostgreSQL.`);
      }

      await client.query(
        'DELETE FROM round_checkpoints WHERE round_id = $1 AND checkpoint_index >= $2',
        [roundId, checkpoints.length]
      );
    }

    // 3. Bulk Insert parametrizado multi-fila para todas las fotografías comprimidas de la ronda
    const photoRows = collectRoundPhotosForBulkInsert(roundId, savedRound);
    await client.query('DELETE FROM round_photos WHERE round_id = $1', [roundId]);
    if (photoRows.length > 0) {
      const photoValues: any[] = [];
      const photoPlaceholders: string[] = [];
      photoRows.forEach((p, idx) => {
        const base = idx * 7;
        photoPlaceholders.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, CURRENT_TIMESTAMP)`
        );
        photoValues.push(
          p.id,
          p.roundId,
          p.sourceType,
          p.checkpointId,
          p.fieldIndex,
          p.dataUrl,
          p.sizeBytes
        );
      });

      await client.query(
        `INSERT INTO round_photos
           (id, round_id, source_type, checkpoint_id, field_index, data_url, size_bytes, updated_at)
         VALUES ${photoPlaceholders.join(', ')}
         ON CONFLICT (id) DO UPDATE SET
           data_url = EXCLUDED.data_url,
           size_bytes = EXCLUDED.size_bytes,
           updated_at = CURRENT_TIMESTAMP`,
        photoValues
      );
    }

    // 4. Persistir anomalías detectadas en la tabla incidents dentro de la misma transacción
    if (savedRound.status === 'completada' && Array.isArray(savedRound.anomalies) && savedRound.anomalies.length > 0) {
      for (const anom of savedRound.anomalies) {
        if (!anom || !anom.id || deletedSet.has(anom.id)) continue;
        const incObj = {
          id: anom.id,
          timestamp: anom.timestamp || new Date().toISOString(),
          title: anom.title || 'Anomalía detectada en ronda',
          description: anom.description || '',
          area: anom.area || 'General',
          severity: anom.severity || 'alta',
          status: anom.status || 'pendiente',
          registeredBy: anom.registeredBy || savedRound.technicianName || 'Técnico',
          equipmentId: anom.equipmentId,
          equipmentTag: anom.equipmentTag,
          photoUrl: anom.photoUrl,
          photos: anom.photos,
          roundId
        };
        await client.query(
          `INSERT INTO incidents (id, data, status, updated_at)
           VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
           ON CONFLICT (id) DO UPDATE SET
             data = EXCLUDED.data,
             status = EXCLUDED.status,
             updated_at = CURRENT_TIMESTAMP`,
          [incObj.id, JSON.stringify(incObj), String(incObj.status)]
        );
      }
    }

    await client.query('COMMIT');
    return {
      savedRound,
      savedCheckpointsCount,
      savedPhotosCount: photoRows.length
    };
  } catch (txErr) {
    await client.query('ROLLBACK').catch(() => {});
    throw txErr;
  } finally {
    client.release();
  }
}

function sortRoundsDescendingInPlace(roundsList: any[]) {
  roundsList.sort((a: any, b: any) => {
    const getT = (r: any) => {
      const dateStr = String(r?.date || '').replace(/\//g, '-').trim();
      const [hRaw, mRaw] = String(r?.time || '00:00').trim().split(':');
      let h = parseInt(hRaw || '0', 10) || 0;
      const m = parseInt(mRaw || '0', 10) || 0;
      if ((r?.shift === 'tarde' || r?.shift === 'noche') && h < 12) h += 12;
      if (dateStr) {
        const t = new Date(`${dateStr}T${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`).getTime();
        if (!isNaN(t) && t > 0) return t;
      }
      return new Date(r?.completedAt || r?.lastUpdated || 0).getTime() || 0;
    };
    return getT(b) - getT(a);
  });
}

// Endpoint Atómico Dedicado: Guarda cabecera + 26 puntos + lecturas + fotos en 1 sola transacción PostgreSQL TODO-O-NADA
app.post("/api/rounds/atomic", async (req, res) => {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: "Invalid JSON in body", rolledBack: true });
    }
  }
  const roundPayload = body?.round && body.round.id ? body.round : body;
  if (!roundPayload || !roundPayload.id || !Array.isArray(roundPayload.checkpoints) || roundPayload.checkpoints.length === 0) {
    return res.status(400).json({
      error: "Se requiere la ronda con su arreglo completo de puntos de control.",
      rolledBack: true
    });
  }

  const current = getCachedData();
  if (!Array.isArray(current.rounds)) current.rounds = [];
  const deletedSet = await getAuthoritativeDeletedIdsSet();
  const clientId = req.headers['x-client-id'] || null;

  try {
    const existingCacheRound = current.rounds.find((r: any) => r && r.id === roundPayload.id) || null;
    const txResult = await saveRoundTransactionally(roundPayload, existingCacheRound, deletedSet, true);

    if (txResult.skippedDeleted) {
      return res.status(410).json({ error: "La ronda fue eliminada previamente.", id: roundPayload.id, rolledBack: true });
    }

    const savedRound = txResult.savedRound;
    const idx = current.rounds.findIndex((r: any) => r && r.id === savedRound.id);
    if (idx >= 0) {
      current.rounds[idx] = savedRound;
    } else {
      current.rounds.unshift(savedRound);
    }

    current.rounds = current.rounds.filter((r: any) => r && r.id && !deletedSet.has(r.id));
    sortRoundsDescendingInPlace(current.rounds);
    syncRoundAnomaliesToIncidents(current);
    scheduleSaveToDisk();

    broadcastSse({
      type: savedRound.status === 'completada' ? 'round_completed' : 'round_updated',
      round: savedRound,
      clientId,
      time: Date.now()
    });
    broadcastSse({
      type: 'data_updated',
      clientId,
      time: Date.now()
    });

    return res.status(200).json({
      status: 'ok',
      success: true,
      savedCheckpointsCount: txResult.savedCheckpointsCount,
      savedPhotosCount: txResult.savedPhotosCount,
      round: savedRound
    });
  } catch (err: any) {
    console.error(`[PostgreSQL ATOMIC ROLLBACK] Error guardando ronda ${roundPayload.id}:`, err?.message || err);
    return res.status(500).json({
      status: 'error',
      success: false,
      rolledBack: true,
      error: err?.message || 'Error en transacción PostgreSQL. Se ejecutó ROLLBACK sin guardar datos parciales.'
    });
  }
});

app.post("/api/rounds", async (req, res) => {
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
  const deletedSet = await getAuthoritativeDeletedIdsSet();
  const clientId = req.headers['x-client-id'] || null;
  const savedRoundsList: any[] = [];

  try {
    for (const round of validRounds) {
      const existingCacheRound = current.rounds.find((r: any) => r && r.id === round.id) || null;
      const isStrict = round.status === 'completada';
      const txResult = await saveRoundTransactionally(round, existingCacheRound, deletedSet, isStrict);
      if (txResult.skippedDeleted || !txResult.savedRound) continue;

      const savedRound = txResult.savedRound;
      const idx = current.rounds.findIndex((r: any) => r && r.id === savedRound.id);
      if (idx >= 0) {
        current.rounds[idx] = savedRound;
      } else {
        current.rounds.unshift(savedRound);
      }
      savedRoundsList.push(savedRound);

      const eventType = savedRound.status === 'completada' ? 'round_completed' : 'round_updated';
      broadcastSse({
        type: eventType,
        round: savedRound,
        clientId,
        time: Date.now()
      });
    }

    current.rounds = current.rounds.filter((r: any) => r && r.id && !deletedSet.has(r.id));
    sortRoundsDescendingInPlace(current.rounds);
    syncRoundAnomaliesToIncidents(current);
    scheduleSaveToDisk();

    if (savedRoundsList.some((r: any) => r?.status === 'completada' || (r?.anomalies && r.anomalies.length > 0))) {
      broadcastSse({
        type: 'data_updated',
        clientId,
        time: Date.now()
      });
    }

    res.json({
      success: true,
      count: savedRoundsList.length,
      rounds: savedRoundsList
    });
  } catch (err: any) {
    console.error('[PostgreSQL ROLLBACK] Error en POST /api/rounds:', err?.message || err);
    res.status(500).json({
      success: false,
      rolledBack: true,
      error: err?.message || 'Error guardando ronda en PostgreSQL (ROLLBACK ejecutado).'
    });
  }
});

app.put("/api/rounds/:id", async (req, res) => {
  const { id } = req.params;
  if (await isIdDeletedInServer(id)) {
    return res.status(410).json({ error: "Deleted", id });
  }
  const updates = { ...req.body, id };
  const current = getCachedData();
  if (!Array.isArray(current.rounds)) current.rounds = [];
  const idx = current.rounds.findIndex((r: any) => r && r.id === id);
  let savedRound: any;
  if (idx >= 0) {
    savedRound = { ...current.rounds[idx], ...updates };
    current.rounds[idx] = savedRound;
  } else {
    savedRound = updates;
    current.rounds.unshift(savedRound);
  }
  await pgUpsert('rounds', id, savedRound, false);
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'round_updated', round: savedRound, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ success: true, round: savedRound });
});

app.delete("/api/rounds/:id", async (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  await pgDelete('rounds', id);
  scheduleSaveToDisk();
  broadcastSse({
    type: 'round_deleted',
    roundId: id,
    clientId,
    time: Date.now()
  });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

app.delete("/api/requests/:id", async (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  await pgDelete('requests', id);
  scheduleSaveToDisk();
  broadcastSse({
    type: 'request_deleted',
    requestId: id,
    clientId,
    time: Date.now()
  });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

app.delete("/api/incidents/:id", async (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  const cache = getCachedData();
  if (Array.isArray(cache.rounds)) {
    for (let i = 0; i < cache.rounds.length; i++) {
      const r = cache.rounds[i];
      if (r && Array.isArray(r.anomalies) && r.anomalies.length > 0) {
        const nextAnomalies = r.anomalies.filter((a: any) => {
          if (!a) return false;
          const anomId = a.id || `inc-anom-${r.id}-${String(a.title || '').replace(/\s+/g, '_')}`;
          const canonicalId = CANONICAL_INCIDENT_MAP[anomId] || anomId;
          return a.id !== id && anomId !== id && canonicalId !== id;
        });
        if (nextAnomalies.length !== r.anomalies.length) {
          cache.rounds[i] = { ...r, anomalies: nextAnomalies, anomaliesCount: nextAnomalies.length };
          await pgUpsert('rounds', r.id, cache.rounds[i], false);
        }
      }
    }
  }
  await pgDelete('incidents', id);
  scheduleSaveToDisk();
  broadcastSse({
    type: 'incident_deleted',
    incidentId: id,
    clientId,
    time: Date.now()
  });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

app.put("/api/equipments/:id", async (req, res) => {
  const { id } = req.params;
  if (await isIdDeletedInServer(id)) {
    return res.status(410).json({ error: "Deleted", id });
  }
  const store = getCachedData();
  if (!Array.isArray(store.equipments)) store.equipments = [];
  const idx = store.equipments.findIndex((e: any) => e.id === id);
  const item = idx >= 0 ? { ...store.equipments[idx], ...req.body, id } : { ...req.body, id };
  if (idx >= 0) store.equipments[idx] = item;
  else store.equipments.push(item);
  await pgUpsert('equipments', id, item, false);
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'equipment_updated', equipment: item, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", equipment: item });
});

app.delete("/api/equipments/:id", async (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  await pgDelete('equipments', id);
  scheduleSaveToDisk();
  broadcastSse({
    type: 'equipment_deleted',
    equipmentId: id,
    clientId,
    time: Date.now()
  });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);

  const store = getCachedData();
  if (Array.isArray(store.users)) {
    store.users = store.users.filter((u: any) => u.id !== id);
  }

  if (pgPool) {
    try {
      await pgPool.query('DELETE FROM users WHERE id = $1', [id]);
      await pgPool.query(
        'INSERT INTO deleted_ids (id, deleted_at) VALUES ($1, CURRENT_TIMESTAMP) ON CONFLICT (id) DO NOTHING',
        [id]
      );
      console.log(`[PostgreSQL] User ${id} deleted from PostgreSQL users table.`);
    } catch (e) {
      console.warn("[PostgreSQL] Error deleting user from DB:", e);
    }
  }

  scheduleSaveToDisk();
  broadcastSse({
    type: 'user_deleted',
    userId: id,
    clientId,
    time: Date.now()
  });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

// Preventive Plans
app.get("/api/preventive-plans", async (_req, res) => {
  const store = getCachedData();
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id, data FROM preventive_plans ORDER BY updated_at DESC');
      const pgPlans = (q.rows || []).map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null).filter(Boolean);
      store.preventivePlans = pgPlans;
      return res.json(pgPlans);
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading preventive plans from DB:", (e as any)?.message || e);
    }
  }
  res.json(store.preventivePlans || []);
});
app.post("/api/preventive-plans", async (req, res) => {
  const item = req.body;
  if (!item || !item.id) return res.status(400).json({ error: "Invalid preventive plan" });
  if (await isIdDeletedInServer(item.id) && !item.forceRestore) {
    return res.status(410).json({ error: "Deleted", id: item.id });
  }
  const store = getCachedData();
  if (!Array.isArray(store.preventivePlans)) store.preventivePlans = [];
  const idx = store.preventivePlans.findIndex((p: any) => p.id === item.id);
  if (idx >= 0) store.preventivePlans[idx] = { ...store.preventivePlans[idx], ...item };
  else store.preventivePlans.push(item);
  await pgUpsert('preventive_plans', item.id, item, Boolean(item.forceRestore));
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'preventive_plan_updated', plan: item, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", plan: item });
});
app.put("/api/preventive-plans/:id", async (req, res) => {
  const { id } = req.params;
  if (await isIdDeletedInServer(id)) return res.status(410).json({ error: "Deleted", id });
  const item = { ...req.body, id };
  const store = getCachedData();
  if (!Array.isArray(store.preventivePlans)) store.preventivePlans = [];
  const idx = store.preventivePlans.findIndex((p: any) => p.id === id);
  if (idx >= 0) store.preventivePlans[idx] = { ...store.preventivePlans[idx], ...item };
  else store.preventivePlans.push(item);
  await pgUpsert('preventive_plans', id, item, false);
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'preventive_plan_updated', plan: item, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", plan: item });
});
app.delete("/api/preventive-plans/:id", async (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  await pgDelete('preventive_plans', id);
  scheduleSaveToDisk();
  broadcastSse({ type: 'preventive_plan_deleted', planId: id, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

// Work Orders
app.get("/api/work-orders", async (_req, res) => {
  const store = getCachedData();
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id, data FROM work_orders ORDER BY updated_at DESC');
      const pgOrders = (q.rows || []).map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null).filter(Boolean);
      store.workOrders = pgOrders;
      return res.json(pgOrders);
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading work orders from DB:", (e as any)?.message || e);
    }
  }
  res.json(store.workOrders || []);
});
app.post("/api/work-orders", async (req, res) => {
  const item = req.body;
  if (!item || !item.id) return res.status(400).json({ error: "Invalid work order" });
  if (await isIdDeletedInServer(item.id) && !item.forceRestore) {
    return res.status(410).json({ error: "Deleted", id: item.id });
  }
  const store = getCachedData();
  if (!Array.isArray(store.workOrders)) store.workOrders = [];
  const idx = store.workOrders.findIndex((w: any) => w.id === item.id);
  if (idx >= 0) store.workOrders[idx] = { ...store.workOrders[idx], ...item };
  else store.workOrders.push(item);
  await pgUpsert('work_orders', item.id, item, Boolean(item.forceRestore));
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'work_order_updated', workOrder: item, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", workOrder: item });
});
app.put("/api/work-orders/:id", async (req, res) => {
  const { id } = req.params;
  if (await isIdDeletedInServer(id)) return res.status(410).json({ error: "Deleted", id });
  const item = { ...req.body, id };
  const store = getCachedData();
  if (!Array.isArray(store.workOrders)) store.workOrders = [];
  const idx = store.workOrders.findIndex((w: any) => w.id === id);
  if (idx >= 0) store.workOrders[idx] = { ...store.workOrders[idx], ...item };
  else store.workOrders.push(item);
  await pgUpsert('work_orders', id, item, false);
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'work_order_updated', workOrder: item, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", workOrder: item });
});
app.delete("/api/work-orders/:id", async (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  await pgDelete('work_orders', id);
  scheduleSaveToDisk();
  broadcastSse({ type: 'work_order_deleted', workOrderId: id, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

// Pump Inspections
app.get("/api/pump-inspections", async (_req, res) => {
  const store = getCachedData();
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id, data FROM pump_inspections ORDER BY updated_at DESC');
      const pgInsp = (q.rows || []).map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null).filter(Boolean);
      store.pumpInspections = pgInsp;
      return res.json(pgInsp);
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading pump inspections from DB:", (e as any)?.message || e);
    }
  }
  res.json(store.pumpInspections || []);
});
app.post("/api/pump-inspections", async (req, res) => {
  const item = req.body;
  if (!item || !item.id) return res.status(400).json({ error: "Invalid pump inspection" });
  if (await isIdDeletedInServer(item.id) && !item.forceRestore) {
    return res.status(410).json({ error: "Deleted", id: item.id });
  }
  const store = getCachedData();
  if (!Array.isArray(store.pumpInspections)) store.pumpInspections = [];
  const idx = store.pumpInspections.findIndex((p: any) => p.id === item.id);
  if (idx >= 0) store.pumpInspections[idx] = { ...store.pumpInspections[idx], ...item };
  else store.pumpInspections.push(item);
  await pgUpsert('pump_inspections', item.id, item, Boolean(item.forceRestore));
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'pump_inspection_updated', inspection: item, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", inspection: item });
});
app.put("/api/pump-inspections/:id", async (req, res) => {
  const { id } = req.params;
  if (await isIdDeletedInServer(id)) return res.status(410).json({ error: "Deleted", id });
  const item = { ...req.body, id };
  const store = getCachedData();
  if (!Array.isArray(store.pumpInspections)) store.pumpInspections = [];
  const idx = store.pumpInspections.findIndex((p: any) => p.id === id);
  if (idx >= 0) store.pumpInspections[idx] = { ...store.pumpInspections[idx], ...item };
  else store.pumpInspections.push(item);
  await pgUpsert('pump_inspections', id, item, false);
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'pump_inspection_updated', inspection: item, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", inspection: item });
});
app.delete("/api/pump-inspections/:id", async (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  await pgDelete('pump_inspections', id);
  scheduleSaveToDisk();
  broadcastSse({ type: 'pump_inspection_deleted', inspectionId: id, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

// Shift Swaps
app.get("/api/shift-swaps", async (_req, res) => {
  const store = getCachedData();
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id, data FROM shift_swaps ORDER BY updated_at DESC');
      const pgSwaps = (q.rows || []).map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null).filter(Boolean);
      store.shiftSwaps = pgSwaps;
      return res.json(pgSwaps);
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading shift swaps from DB:", (e as any)?.message || e);
    }
  }
  res.json(store.shiftSwaps || []);
});
app.post("/api/shift-swaps", async (req, res) => {
  const item = req.body;
  if (!item || !item.id) return res.status(400).json({ error: "Invalid swap data" });
  if (await isIdDeletedInServer(item.id) && !item.forceRestore) {
    return res.status(410).json({ error: "Deleted", id: item.id });
  }
  const store = getCachedData();
  if (!Array.isArray(store.shiftSwaps)) store.shiftSwaps = [];
  const idx = store.shiftSwaps.findIndex((s: any) => s.id === item.id);
  const existing = idx >= 0 ? store.shiftSwaps[idx] : null;
  const savedSwap = { ...(existing || {}), ...item, updatedAt: monotonicUpdatedAt(existing, item.updatedAt) };
  if (idx >= 0) store.shiftSwaps[idx] = savedSwap;
  else store.shiftSwaps.push(savedSwap);
  const pgOk = await pgUpsert('shift_swaps', savedSwap.id, savedSwap, Boolean(item.forceRestore));
  if (pgPool && !pgOk) return res.status(503).json({ error: "PostgreSQL save failed" });
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'swap_updated', swap: savedSwap, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", swap: savedSwap });
});
app.put("/api/shift-swaps/:id", async (req, res) => {
  const { id } = req.params;
  if (await isIdDeletedInServer(id)) return res.status(410).json({ error: "Deleted", id });
  const store = getCachedData();
  if (!Array.isArray(store.shiftSwaps)) store.shiftSwaps = [];
  const idx = store.shiftSwaps.findIndex((s: any) => s.id === id);
  const existing = idx >= 0 ? store.shiftSwaps[idx] : null;
  const savedSwap = { ...(existing || {}), ...(req.body || {}), id, updatedAt: monotonicUpdatedAt(existing, req.body?.updatedAt) };
  if (idx >= 0) store.shiftSwaps[idx] = savedSwap;
  else store.shiftSwaps.push(savedSwap);
  const pgOk = await pgUpsert('shift_swaps', id, savedSwap, false);
  if (pgPool && !pgOk) return res.status(503).json({ error: "PostgreSQL save failed" });
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'swap_updated', swap: savedSwap, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", swap: savedSwap });
});

// Uploaded Documents
app.get("/api/uploaded-documents", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const store = getCachedData();
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id, data FROM uploaded_documents ORDER BY updated_at DESC');
      const pgDocs = (q.rows || []).map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null).filter(Boolean);
      store.uploadedDocuments = pgDocs;
      return res.json(pgDocs);
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading uploaded documents from DB:", (e as any)?.message || e);
    }
  }
  res.json(store.uploadedDocuments || []);
});
app.get("/api/uploaded-documents/:id/download", async (req, res) => {
  const { id } = req.params;
  const store = getCachedData();
  let doc: any = null;
  if (pgPool) {
    try {
      doc = await pgGet('uploaded_documents', id);
    } catch {}
  }
  if (!doc && Array.isArray(store.uploadedDocuments)) {
    doc = store.uploadedDocuments.find((d: any) => d && d.id === id);
  }
  if (!doc) return res.status(404).json({ error: "Document not found" });
  if (!doc.rawBase64) return res.status(404).json({ error: "Original binary not stored for this document" });

  const cleanBase64 = String(doc.rawBase64).includes(',') ? String(doc.rawBase64).split(',')[1] : String(doc.rawBase64);
  const buffer = Buffer.from(cleanBase64, 'base64');
  const rawName = String(doc.name || `documento_${id}.xlsx`).replace(/[^\w.\-\s()áéíóúÁÉÍÓÚñÑ]/g, '_');
  const fileName = rawName.toLowerCase().endsWith('.xlsx') || rawName.toLowerCase().endsWith('.xls') || rawName.toLowerCase().endsWith('.csv') || rawName.toLowerCase().endsWith('.pdf')
    ? rawName
    : `${rawName}.xlsx`;
  const mime = doc.type === 'pdf'
    ? 'application/pdf'
    : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Content-Type", mime);
  res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`);
  res.send(buffer);
});
app.post("/api/uploaded-documents", async (req, res) => {
  const item = req.body;
  if (!item || !item.id) return res.status(400).json({ error: "Invalid document data" });
  if (await isIdDeletedInServer(item.id) && !item.forceRestore) {
    return res.status(410).json({ error: "Deleted", id: item.id });
  }
  const store = getCachedData();
  if (!Array.isArray(store.uploadedDocuments)) store.uploadedDocuments = [];
  const cleanItem: Record<string, any> = {};
  for (const k of Object.keys(item)) {
    if (item[k] !== undefined) cleanItem[k] = item[k];
  }

  const idx = store.uploadedDocuments.findIndex((d: any) => d.id === item.id);
  const existing = idx >= 0 ? store.uploadedDocuments[idx] : (pgPool ? await pgGet('uploaded_documents', item.id) : null);
  const savedDoc = {
    ...(existing || {}),
    ...cleanItem,
    id: item.id,
    updatedAt: monotonicUpdatedAt(existing, cleanItem.updatedAt)
  };
  if (!savedDoc.rawBase64 && existing?.rawBase64) {
    savedDoc.rawBase64 = existing.rawBase64;
  }

  const pgOk = await pgUpsert('uploaded_documents', savedDoc.id, savedDoc, Boolean(item.forceRestore));
  if (pgPool && !pgOk) {
    return res.status(503).json({ error: "PostgreSQL save failed for uploaded document" });
  }

  if (idx >= 0) store.uploadedDocuments[idx] = savedDoc;
  else store.uploadedDocuments.unshift(savedDoc);

  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'uploaded_document_updated', document: savedDoc, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", document: savedDoc });
});
app.delete("/api/uploaded-documents/:id", async (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  await pgDelete('uploaded_documents', id);
  scheduleSaveToDisk();
  broadcastSse({ type: 'uploaded_document_deleted', documentId: id, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

// Document Folders
app.get("/api/document-folders", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const store = getCachedData();
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id, data FROM document_folders ORDER BY updated_at DESC');
      const pgFolders = (q.rows || []).map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null).filter(Boolean);
      store.documentFolders = pgFolders;
      return res.json(pgFolders);
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading document folders from DB:", (e as any)?.message || e);
    }
  }
  res.json(store.documentFolders || []);
});
function wouldCreateFolderCycleServer(folders: any[], folderId: string, candidateParentId: string | null | undefined): boolean {
  if (!candidateParentId) return false;
  if (candidateParentId === folderId) return true;
  const byId = new Map<string, any>();
  for (const f of folders) {
    if (f && f.id) byId.set(f.id, f);
  }
  let curr: string | null | undefined = candidateParentId;
  const visited = new Set<string>([folderId]);
  while (curr) {
    if (visited.has(curr)) return true;
    visited.add(curr);
    const parentObj = byId.get(curr);
    curr = parentObj?.parentFolderId || null;
  }
  return false;
}

app.post("/api/document-folders", async (req, res) => {
  const item = req.body;
  if (!item || !item.id) return res.status(400).json({ error: "Invalid folder data" });
  if (await isIdDeletedInServer(item.id) && !item.forceRestore) {
    return res.status(410).json({ error: "Deleted", id: item.id });
  }
  const store = getCachedData();
  if (!Array.isArray(store.documentFolders)) store.documentFolders = [];
  const idx = store.documentFolders.findIndex((f: any) => f.id === item.id);
  const existing = idx >= 0 ? store.documentFolders[idx] : (pgPool ? await pgGet('document_folders', item.id) : null);
  const cleanItem: Record<string, any> = {};
  for (const k of Object.keys(item)) {
    if (item[k] !== undefined) cleanItem[k] = item[k];
  }
  const nextParentId = cleanItem.parentFolderId === '' ? null : (cleanItem.parentFolderId ?? existing?.parentFolderId ?? null);
  if (wouldCreateFolderCycleServer(store.documentFolders, item.id, nextParentId)) {
    return res.status(400).json({ error: "Invalid parentFolderId cycle" });
  }
  const savedFolder = {
    ...(existing || {}),
    ...cleanItem,
    parentFolderId: nextParentId,
    id: item.id,
    updatedAt: monotonicUpdatedAt(existing, cleanItem.updatedAt)
  };
  const pgOk = await pgUpsert('document_folders', savedFolder.id, savedFolder, Boolean(item.forceRestore));
  if (pgPool && !pgOk) {
    return res.status(503).json({ error: "PostgreSQL save failed for folder" });
  }
  if (idx >= 0) store.documentFolders[idx] = savedFolder;
  else store.documentFolders.unshift(savedFolder);
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'document_folder_updated', folder: savedFolder, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", folder: savedFolder });
});
app.put("/api/document-folders/:id", async (req, res) => {
  const { id } = req.params;
  if (await isIdDeletedInServer(id)) return res.status(410).json({ error: "Deleted", id });
  const store = getCachedData();
  if (!Array.isArray(store.documentFolders)) store.documentFolders = [];
  const idx = store.documentFolders.findIndex((f: any) => f && f.id === id);
  const existing = idx >= 0 ? store.documentFolders[idx] : (pgPool ? await pgGet('document_folders', id) : null);
  const hasParentUpdate = req.body && Object.prototype.hasOwnProperty.call(req.body, 'parentFolderId');
  const nextParentId = hasParentUpdate
    ? (req.body.parentFolderId ? String(req.body.parentFolderId) : null)
    : (existing?.parentFolderId ?? null);
  if (wouldCreateFolderCycleServer(store.documentFolders, id, nextParentId)) {
    return res.status(400).json({ error: "Invalid parentFolderId cycle" });
  }
  const savedFolder = {
    ...(existing || {}),
    ...(req.body || {}),
    parentFolderId: nextParentId,
    id,
    updatedAt: monotonicUpdatedAt(existing, req.body?.updatedAt)
  };
  const pgOk = await pgUpsert('document_folders', id, savedFolder, false);
  if (pgPool && !pgOk) {
    return res.status(503).json({ error: "PostgreSQL save failed for folder" });
  }
  if (idx >= 0) store.documentFolders[idx] = savedFolder;
  else store.documentFolders.unshift(savedFolder);
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'document_folder_updated', folder: savedFolder, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", folder: savedFolder });
});
app.delete("/api/document-folders/:id", async (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  const store = getCachedData();
  const deletedFolder = (store.documentFolders || []).find((f: any) => f && f.id === id) || (pgPool ? await pgGet('document_folders', id) : null);
  const fallbackParentId: string | null = deletedFolder?.parentFolderId || null;

  registerDeletion(id);

  // Reassign direct child subfolders to the deleted folder's parent (preserving hierarchy without deleting child folders)
  if (Array.isArray(store.documentFolders)) {
    for (let i = 0; i < store.documentFolders.length; i++) {
      const f = store.documentFolders[i];
      if (f && f.id !== id && f.parentFolderId === id) {
        const updatedChild = {
          ...f,
          parentFolderId: fallbackParentId,
          updatedAt: monotonicUpdatedAt(f)
        };
        store.documentFolders[i] = updatedChild;
        await pgUpsert('document_folders', updatedChild.id, updatedChild, false);
        broadcastSse({ type: 'document_folder_updated', folder: updatedChild, clientId, time: Date.now() });
      }
    }
  }

  // Reassign documents inside deleted folder to fallbackParentId (or root if top-level)
  if (Array.isArray(store.uploadedDocuments)) {
    for (let i = 0; i < store.uploadedDocuments.length; i++) {
      const docItem = store.uploadedDocuments[i];
      if (docItem && docItem.folderId === id) {
        const updatedDoc = { ...docItem, updatedAt: monotonicUpdatedAt(docItem) };
        if (fallbackParentId) {
          updatedDoc.folderId = fallbackParentId;
        } else {
          delete updatedDoc.folderId;
        }
        store.uploadedDocuments[i] = updatedDoc;
        await pgUpsert('uploaded_documents', updatedDoc.id, updatedDoc, false);
      }
    }
  }
  await pgDelete('document_folders', id);
  scheduleSaveToDisk();
  broadcastSse({ type: 'document_folder_deleted', folderId: id, fallbackParentId, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id, fallbackParentId });
});

// Meters & Meter Readings
app.get("/api/meters", async (_req, res) => {
  const store = getCachedData();
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id, data FROM meters ORDER BY updated_at DESC');
      const pgMeters = (q.rows || []).map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null).filter(Boolean);
      store.meters = pgMeters;
      return res.json(pgMeters);
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading meters from DB:", (e as any)?.message || e);
    }
  }
  const deletedSet = new Set(store.deletedIds || []);
  res.json((store.meters || []).filter((m: any) => m && m.id && !deletedSet.has(m.id) && (!m.code || !deletedSet.has(m.code))));
});
app.post("/api/meters", async (req, res) => {
  const meter = req.body;
  if (!meter || !meter.id) return res.status(400).json({ error: "Invalid meter data" });
  if (await isIdDeletedInServer(meter.id) && !meter.forceRestore) {
    return res.status(410).json({ error: "Deleted", id: meter.id });
  }
  const current = getCachedData();
  if (!Array.isArray(current.meters)) current.meters = [];

  const idx = current.meters.findIndex((m: any) => m && m.id === meter.id);
  if (idx >= 0) {
    current.meters[idx] = { ...current.meters[idx], ...meter };
  } else {
    current.meters.unshift(meter);
  }

  // Only allow clearing code tombstone when creating/updating a meter with a non-deleted ID
  if (meter.code) {
    const normCode = String(meter.code).trim().toUpperCase();
    unregisterDeletion(meter.code);
    unregisterDeletion(normCode);
    if (pgPool) {
      await pgPool.query('DELETE FROM deleted_ids WHERE id = ANY($1::text[])', [[meter.code, normCode]]).catch(() => {});
    }
  }

  await pgUpsert('meters', meter.id, meter, Boolean(meter.forceRestore));
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'meter_updated', meter, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ success: true, meter });
});

app.put("/api/meters/:id", async (req, res) => {
  const { id } = req.params;
  if (await isIdDeletedInServer(id)) return res.status(410).json({ error: "Deleted", id });
  const meter = { ...req.body, id };
  const current = getCachedData();
  if (!Array.isArray(current.meters)) current.meters = [];
  const idx = current.meters.findIndex((m: any) => m && (m.id === id || m.code === id));
  if (idx >= 0) current.meters[idx] = { ...current.meters[idx], ...meter };
  else current.meters.unshift(meter);
  await pgUpsert('meters', id, meter, false);
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'meter_updated', meter, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ success: true, meter });
});

app.delete("/api/meters/:id", async (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  const current = getCachedData();
  const targetMeter = (current.meters || []).find((m: any) => m && (m.id === id || m.code === id));
  const meterIdsToDelete = new Set<string>([id]);
  if (targetMeter?.id) meterIdsToDelete.add(targetMeter.id);
  if (targetMeter?.code) {
    meterIdsToDelete.add(targetMeter.code);
    meterIdsToDelete.add(String(targetMeter.code).trim().toUpperCase());
  }

  for (const mDelId of meterIdsToDelete) {
    registerDeletion(mDelId);
  }

  if (Array.isArray(current.meters)) {
    current.meters = current.meters.filter((m: any) => m && !meterIdsToDelete.has(m.id) && (!m.code || !meterIdsToDelete.has(m.code)));
  }

  const deletedReadingIds = new Set<string>();
  if (Array.isArray(current.meterReadingsLog)) {
    current.meterReadingsLog = current.meterReadingsLog.filter((r: any) => {
      if (!r) return false;
      if (r.meterId && meterIdsToDelete.has(r.meterId)) {
        if (r.id) {
          deletedReadingIds.add(r.id);
          registerDeletion(r.id);
        }
        return false;
      }
      return true;
    });
  }

  if (pgPool) {
    try {
      const mRows = await pgPool.query('SELECT id, data FROM meters');
      for (const row of (mRows.rows || [])) {
        const mData = row?.data;
        const mCode = mData?.code ? String(mData.code).trim() : '';
        if (row.id === id || mCode === id || (mCode && meterIdsToDelete.has(mCode.toUpperCase()))) {
          meterIdsToDelete.add(row.id);
          if (mCode) {
            meterIdsToDelete.add(mCode);
            meterIdsToDelete.add(mCode.toUpperCase());
          }
        }
      }
      const rRows = await pgPool.query('SELECT id, data FROM meter_readings_log');
      for (const row of (rRows.rows || [])) {
        const rMeterId = row?.data?.meterId;
        if (rMeterId && meterIdsToDelete.has(rMeterId)) {
          deletedReadingIds.add(row.id);
          registerDeletion(row.id);
        }
      }
      for (const mDelId of meterIdsToDelete) {
        await pgDelete('meters', mDelId);
      }
      for (const rDelId of deletedReadingIds) {
        await pgDelete('meter_readings_log', rDelId);
      }
    } catch (e) {
      console.warn('[PostgreSQL] Notice cascading meter delete:', (e as any)?.message || e);
    }
  } else {
    await pgDelete('meters', id);
  }

  scheduleSaveToDisk();
  broadcastSse({ type: 'meter_deleted', meterId: id, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

app.get("/api/meter-readings", async (_req, res) => {
  const store = getCachedData();
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id, data FROM meter_readings_log ORDER BY updated_at DESC');
      const pgReadings = (q.rows || []).map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null).filter(Boolean);
      store.meterReadingsLog = pgReadings;
      return res.json(pgReadings);
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading meter readings from DB:", (e as any)?.message || e);
    }
  }
  const deletedSet = new Set(store.deletedIds || []);
  res.json((store.meterReadingsLog || []).filter((r: any) => r && r.id && !deletedSet.has(r.id)));
});

app.post("/api/meter-readings", async (req, res) => {
  const reading = req.body;
  if (!reading || !reading.id) return res.status(400).json({ error: "Invalid reading data" });
  if (await isIdDeletedInServer(reading.id, reading.meterId) && !reading.forceRestore) {
    return res.status(410).json({ error: "Deleted", id: reading.id });
  }
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
    if (mIdx >= 0 && !(await isIdDeletedInServer(current.meters[mIdx].id))) {
      current.meters[mIdx].currentReading = reading.currentValue;
      current.meters[mIdx].lastReadingDate = reading.date;
      current.meters[mIdx].lastReadingTime = reading.time;
      current.meters[mIdx].updatedAt = new Date().toISOString();
      await pgUpsert('meters', current.meters[mIdx].id, current.meters[mIdx], false);
    }
  }

  await pgUpsert('meter_readings_log', reading.id, reading, Boolean(reading.forceRestore));
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'meter_reading_added', reading, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ success: true, reading });
});

app.delete("/api/meter-readings/:id", async (req, res) => {
  const { id } = req.params;
  const clientId = req.headers['x-client-id'] || null;
  registerDeletion(id);
  const current = getCachedData();
  if (Array.isArray(current.meterReadingsLog)) {
    current.meterReadingsLog = current.meterReadingsLog.filter((r: any) => r && r.id !== id);
  }
  await pgDelete('meter_readings_log', id);
  scheduleSaveToDisk();
  broadcastSse({ type: 'meter_reading_deleted', readingId: id, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "deleted", id });
});

// Bitácora Técnica (Permanent PostgreSQL Operational Logbook)
app.get("/api/bitacora", async (_req, res) => {
  const store = getCachedData();
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id, data FROM bitacora_tecnica ORDER BY updated_at DESC');
      const pgBitacora = (q.rows || [])
        .map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null)
        .filter(Boolean);
      store.bitacora = pgBitacora;
      return res.json(pgBitacora);
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading bitacora_tecnica from DB:", (e as any)?.message || e);
    }
  }
  res.json(store.bitacora || []);
});

app.post("/api/bitacora", async (req, res) => {
  const item = req.body;
  if (!item || !item.id) return res.status(400).json({ error: "Invalid bitacora entry" });
  const store = getCachedData();
  if (!Array.isArray(store.bitacora)) store.bitacora = [];

  const photos = mergeUniquePhotosServer(item.photos, item.photoUrl);
  const entry = {
    ...item,
    ...(photos.length > 0 ? { photos, photoUrl: photos[photos.length - 1] } : {}),
    createdAt: item.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const idx = store.bitacora.findIndex((b: any) => b && b.id === entry.id);
  if (idx >= 0) {
    const existing = store.bitacora[idx];
    const mergedPhotos = mergeUniquePhotosServer(existing.photos, existing.photoUrl, entry.photos, entry.photoUrl);
    store.bitacora[idx] = {
      ...existing,
      ...entry,
      ...(mergedPhotos.length > 0 ? { photos: mergedPhotos, photoUrl: mergedPhotos[mergedPhotos.length - 1] } : {})
    };
  } else {
    store.bitacora.unshift(entry);
  }

  const savedEntry = idx >= 0 ? store.bitacora[idx] : entry;
  await pgUpsert('bitacora_tecnica', savedEntry.id, savedEntry, false);
  scheduleSaveToDisk();

  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'bitacora_updated', entry: savedEntry, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ success: true, entry: savedEntry });
});

app.put("/api/bitacora/:id", async (req, res) => {
  const { id } = req.params;
  const store = getCachedData();
  if (!Array.isArray(store.bitacora)) store.bitacora = [];

  const idx = store.bitacora.findIndex((b: any) => b && b.id === id);
  const existing = idx >= 0 ? store.bitacora[idx] : {};
  const mergedPhotos = mergeUniquePhotosServer(existing.photos, existing.photoUrl, req.body?.photos, req.body?.photoUrl);
  const updatedEntry = {
    ...existing,
    ...req.body,
    id,
    ...(mergedPhotos.length > 0 ? { photos: mergedPhotos, photoUrl: mergedPhotos[mergedPhotos.length - 1] } : {}),
    updatedAt: new Date().toISOString()
  };

  if (idx >= 0) store.bitacora[idx] = updatedEntry;
  else store.bitacora.unshift(updatedEntry);

  await pgUpsert('bitacora_tecnica', id, updatedEntry, false);
  scheduleSaveToDisk();

  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'bitacora_updated', entry: updatedEntry, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ success: true, entry: updatedEntry });
});

// Generic entity CRUD endpoints
// 1. Rounds
app.get("/api/rounds", async (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const store = getCachedData();
  const deletedSet = await getAuthoritativeDeletedIdsSet();
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id, data FROM rounds ORDER BY updated_at DESC');
      const pgRounds = (q.rows || [])
        .map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null)
        .filter((r: any) => r && r.id && !deletedSet.has(r.id));
      store.rounds = pgRounds;
      return res.json(pgRounds);
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading rounds from DB:", (e as any)?.message || e);
    }
  }
  res.json((store.rounds || []).filter((r: any) => r && r.id && !deletedSet.has(r.id)));
});

// 2. Incidents
app.get("/api/incidents", async (_req, res) => {
  const store = getCachedData();
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id, data FROM incidents ORDER BY updated_at DESC');
      const pgInc = (q.rows || []).map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null).filter(Boolean);
      store.incidents = pgInc;
      return res.json(pgInc);
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading incidents from DB:", (e as any)?.message || e);
    }
  }
  const deletedSet = new Set(store.deletedIds || []);
  res.json((store.incidents || []).filter((i: any) => i && i.id && !deletedSet.has(i.id)));
});
app.post("/api/incidents", async (req, res) => {
  const inc = req.body;
  if (!inc || !inc.id) return res.status(400).json({ error: "Invalid incident data" });
  if (await isIdDeletedInServer(inc.id) && !inc.forceRestore) {
    return res.status(410).json({ error: "Deleted", id: inc.id });
  }
  const store = getCachedData();
  if (!Array.isArray(store.incidents)) store.incidents = [];
  const idx = store.incidents.findIndex((i: any) => i.id === inc.id);
  if (idx >= 0) store.incidents[idx] = { ...store.incidents[idx], ...inc };
  else store.incidents.unshift(inc);
  await pgUpsert('incidents', inc.id, inc, Boolean(inc.forceRestore));
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'incident_updated', incident: inc, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", incident: inc });
});
app.put("/api/incidents/:id", async (req, res) => {
  const { id } = req.params;
  if (await isIdDeletedInServer(id)) return res.status(410).json({ error: "Deleted", id });
  const store = getCachedData();
  if (!Array.isArray(store.incidents)) store.incidents = [];
  const idx = store.incidents.findIndex((i: any) => i.id === id);
  const inc = idx >= 0 ? { ...store.incidents[idx], ...req.body, id } : { ...req.body, id };
  if (idx >= 0) store.incidents[idx] = inc;
  else store.incidents.unshift(inc);
  await pgUpsert('incidents', id, inc, false);
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'incident_updated', incident: inc, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", incident: inc });
});

// 3. Requests
app.get("/api/requests", async (_req, res) => {
  const store = getCachedData();
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id, data FROM requests ORDER BY updated_at DESC');
      const pgReq = (q.rows || []).map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null).filter(Boolean);
      store.requests = pgReq;
      return res.json(pgReq);
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading requests from DB:", (e as any)?.message || e);
    }
  }
  const deletedSet = new Set(store.deletedIds || []);
  res.json((store.requests || []).filter((r: any) => r && r.id && !deletedSet.has(r.id)));
});
app.post("/api/requests", async (req, res) => {
  const item = req.body;
  if (!item || !item.id) return res.status(400).json({ error: "Invalid request data" });
  if (await isIdDeletedInServer(item.id) && !item.forceRestore) {
    return res.status(410).json({ error: "Deleted", id: item.id });
  }
  const store = getCachedData();
  if (!Array.isArray(store.requests)) store.requests = [];
  const idx = store.requests.findIndex((r: any) => r.id === item.id);
  const existing = idx >= 0 ? store.requests[idx] : null;
  const savedReq = { ...(existing || {}), ...item, updatedAt: monotonicUpdatedAt(existing, item.updatedAt) };
  if (idx >= 0) store.requests[idx] = savedReq;
  else store.requests.unshift(savedReq);
  const pgOk = await pgUpsert('requests', savedReq.id, savedReq, Boolean(item.forceRestore));
  if (pgPool && !pgOk) return res.status(503).json({ error: "PostgreSQL save failed" });
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'request_updated', request: savedReq, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", request: savedReq });
});
app.put("/api/requests/:id", async (req, res) => {
  const { id } = req.params;
  if (await isIdDeletedInServer(id)) return res.status(410).json({ error: "Deleted", id });
  const store = getCachedData();
  if (!Array.isArray(store.requests)) store.requests = [];
  const idx = store.requests.findIndex((r: any) => r.id === id);
  const existing = idx >= 0 ? store.requests[idx] : null;
  const item = { ...(existing || {}), ...req.body, id, updatedAt: monotonicUpdatedAt(existing, req.body?.updatedAt) };
  if (idx >= 0) store.requests[idx] = item;
  else store.requests.unshift(item);
  const pgOk = await pgUpsert('requests', id, item, false);
  if (pgPool && !pgOk) return res.status(503).json({ error: "PostgreSQL save failed" });
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'request_updated', request: item, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", request: item });
});

// 4. Tasks
app.get("/api/tasks", async (_req, res) => {
  const store = getCachedData();
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id, data FROM tasks ORDER BY updated_at DESC');
      const pgTasks = (q.rows || []).map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null).filter(Boolean);
      store.tasks = pgTasks;
      return res.json(pgTasks);
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading tasks from DB:", (e as any)?.message || e);
    }
  }
  const deletedSet = new Set(store.deletedIds || []);
  res.json((store.tasks || []).filter((t: any) => t && t.id && !deletedSet.has(t.id)));
});
app.put("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  if (await isIdDeletedInServer(id)) return res.status(410).json({ error: "Deleted", id });
  const store = getCachedData();
  if (!Array.isArray(store.tasks)) store.tasks = [];
  const idx = store.tasks.findIndex((t: any) => t.id === id);
  const existing = idx >= 0 ? store.tasks[idx] : null;
  const item = { ...(existing || {}), ...req.body, id, updatedAt: monotonicUpdatedAt(existing, req.body?.updatedAt) };
  if (idx >= 0) store.tasks[idx] = item;
  else store.tasks.unshift(item);
  const pgOk = await pgUpsert('tasks', id, item, false);
  if (pgPool && !pgOk) return res.status(503).json({ error: "PostgreSQL save failed" });
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'task_updated', task: item, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", task: item });
});

// 5. Schedules
app.get("/api/schedules", async (_req, res) => {
  const store = getCachedData();
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id, data FROM schedules ORDER BY updated_at DESC');
      const pgSched = (q.rows || []).map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null).filter(Boolean);
      store.schedules = pgSched;
      return res.json(pgSched);
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading schedules from DB:", (e as any)?.message || e);
    }
  }
  const deletedSet = new Set(store.deletedIds || []);
  res.json((store.schedules || []).filter((s: any) => s && s.id && !deletedSet.has(s.id)));
});
app.post("/api/schedules", async (req, res) => {
  const items = Array.isArray(req.body) ? req.body : [req.body];
  const store = getCachedData();
  if (!Array.isArray(store.schedules)) store.schedules = [];
  const deletedSet = await getAuthoritativeDeletedIdsSet();
  const savedItems: any[] = [];
  const replacedConflictIds: string[] = [];
  const clientId = req.headers['x-client-id'] || null;

  for (const rawItem of items) {
    if (!rawItem || !rawItem.id || (deletedSet.has(rawItem.id) && !rawItem.forceRestore)) continue;
    const cleanIncoming: Record<string, any> = {};
    for (const k of Object.keys(rawItem)) {
      if (rawItem[k] !== undefined && k !== 'forceRestore') cleanIncoming[k] = rawItem[k];
    }

    const idx = store.schedules.findIndex((s: any) => s.id === cleanIncoming.id);
    const existingById = idx >= 0 ? store.schedules[idx] : (pgPool ? await pgGet('schedules', cleanIncoming.id) : null);

    // Detect conflicting legacy/alternate-ID shifts for the same (date + canonicalTechKey) so old shifts NEVER resurface
    const incomingTechKey = getCanonicalScheduleTechKeyServer(cleanIncoming.technicianId, cleanIncoming.technicianName);
    const conflictingDuplicates = cleanIncoming.date
      ? store.schedules.filter(
          (s: any) =>
            s &&
            s.id !== cleanIncoming.id &&
            s.date === cleanIncoming.date &&
            getCanonicalScheduleTechKeyServer(s.technicianId, s.technicianName) === incomingTechKey
        )
      : [];

    let newestConflict: any = existingById;
    for (const c of conflictingDuplicates) {
      if (!newestConflict || safeParseTs(c.updatedAt) > safeParseTs(newestConflict.updatedAt)) {
        newestConflict = c;
      }
      replacedConflictIds.push(c.id);
      registerDeletion(c.id);
      await pgDelete('schedules', c.id);
    }
    if (conflictingDuplicates.length > 0) {
      const conflictIdSet = new Set(conflictingDuplicates.map((c: any) => c.id));
      store.schedules = store.schedules.filter((s: any) => s && !conflictIdSet.has(s.id));
    }

    const savedItem = {
      ...(existingById || {}),
      ...cleanIncoming,
      updatedAt: monotonicUpdatedAt(newestConflict, cleanIncoming.updatedAt)
    };

    const pgOk = await pgUpsert('schedules', savedItem.id, savedItem, Boolean(rawItem.forceRestore));
    if (pgPool && !pgOk) {
      return res.status(503).json({ error: "PostgreSQL save failed for schedule" });
    }

    const curIdx = store.schedules.findIndex((s: any) => s.id === savedItem.id);
    if (curIdx >= 0) store.schedules[curIdx] = savedItem;
    else store.schedules.push(savedItem);

    savedItems.push(savedItem);
  }
  scheduleSaveToDisk();
  for (const rId of replacedConflictIds) {
    broadcastSse({ type: 'schedule_deleted', scheduleId: rId, clientId, time: Date.now() });
  }
  if (savedItems.length > 0) {
    broadcastSse({ type: 'schedule_updated', schedules: savedItems, schedule: savedItems[0], clientId, time: Date.now() });
  }
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", count: savedItems.length, schedules: savedItems });
});
app.put("/api/schedules/:id", async (req, res) => {
  const { id } = req.params;
  if (await isIdDeletedInServer(id)) return res.status(410).json({ error: "Deleted", id });
  const store = getCachedData();
  if (!Array.isArray(store.schedules)) store.schedules = [];
  const idx = store.schedules.findIndex((s: any) => s.id === id);
  const existing = idx >= 0 ? store.schedules[idx] : (pgPool ? await pgGet('schedules', id) : null);
  const item = {
    ...(existing || {}),
    ...(req.body || {}),
    id,
    updatedAt: monotonicUpdatedAt(existing, req.body?.updatedAt)
  };

  // Deduplicate same canonical technician + date if any alternate ID exists
  const techKey = getCanonicalScheduleTechKeyServer(item.technicianId, item.technicianName);
  const replacedConflictIds: string[] = [];
  if (item.date) {
    const conflicts = store.schedules.filter(
      (s: any) =>
        s &&
        s.id !== id &&
        s.date === item.date &&
        getCanonicalScheduleTechKeyServer(s.technicianId, s.technicianName) === techKey
    );
    for (const c of conflicts) {
      replacedConflictIds.push(c.id);
      registerDeletion(c.id);
      await pgDelete('schedules', c.id);
    }
    if (conflicts.length > 0) {
      const cSet = new Set(replacedConflictIds);
      store.schedules = store.schedules.filter((s: any) => s && !cSet.has(s.id));
    }
  }

  const pgOk = await pgUpsert('schedules', id, item, false);
  if (pgPool && !pgOk) return res.status(503).json({ error: "PostgreSQL save failed for schedule" });

  const curIdx = store.schedules.findIndex((s: any) => s.id === id);
  if (curIdx >= 0) store.schedules[curIdx] = item;
  else store.schedules.push(item);

  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  for (const rId of replacedConflictIds) {
    broadcastSse({ type: 'schedule_deleted', scheduleId: rId, clientId, time: Date.now() });
  }
  broadcastSse({ type: 'schedule_updated', schedules: [item], schedule: item, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", schedule: item });
});

// 6. Equipments
app.get("/api/equipments", async (_req, res) => {
  const store = getCachedData();
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id, data FROM equipments ORDER BY updated_at DESC');
      const pgEq = (q.rows || []).map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null).filter(Boolean);
      store.equipments = pgEq;
      return res.json(pgEq);
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading equipments from DB:", (e as any)?.message || e);
    }
  }
  const deletedSet = new Set(store.deletedIds || []);
  res.json((store.equipments || []).filter((e: any) => e && e.id && !deletedSet.has(e.id)));
});
app.post("/api/equipments", async (req, res) => {
  const item = req.body;
  if (!item || !item.id) return res.status(400).json({ error: "Invalid equipment data" });
  if (await isIdDeletedInServer(item.id) && !item.forceRestore) {
    return res.status(410).json({ error: "Deleted", id: item.id });
  }
  const store = getCachedData();
  if (!Array.isArray(store.equipments)) store.equipments = [];
  const idx = store.equipments.findIndex((e: any) => e.id === item.id);
  if (idx >= 0) store.equipments[idx] = { ...store.equipments[idx], ...item };
  else store.equipments.push(item);
  await pgUpsert('equipments', item.id, item, Boolean(item.forceRestore));
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'equipment_updated', equipment: item, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", equipment: item });
});

// 7. Users (Direct PostgreSQL queries with DATABASE_URL)
app.get("/api/users", async (_req, res) => {
  const store = getCachedData();
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id, data FROM users ORDER BY updated_at DESC');
      const pgUsers = (q.rows || []).map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null).filter(Boolean);
      store.users = pgUsers;
      return res.json(pgUsers);
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading users from DB:", (e as any)?.message || e);
    }
  }
  const deletedSet = new Set(store.deletedIds || []);
  res.json((store.users || []).filter((u: any) => u && u.id && !deletedSet.has(u.id)));
});

// Live auth session profile endpoint (supports query or headers for zero-logout live updates)
app.get("/api/auth/me", async (req, res) => {
  const idQuery = (req.query.id as string) || (req.headers['x-user-id'] as string) || '';
  const emailQuery = (req.query.email as string) || (req.headers['x-user-email'] as string) || '';

  if (!idQuery && !emailQuery) {
    return res.status(400).json({ error: "id or email required" });
  }

  if (pgPool) {
    try {
      const q = await pgPool.query(
        `SELECT data FROM users WHERE id = $1 OR (email IS NOT NULL AND LOWER(email) = LOWER($2)) LIMIT 1`,
        [idQuery || '', emailQuery || '']
      );
      if (q && q.rows && q.rows.length > 0 && q.rows[0].data) {
        return res.json({ status: "success", user: q.rows[0].data });
      }
    } catch (e) {
      console.warn("[PostgreSQL] Error in /api/auth/me:", (e as any)?.message || e);
    }
  }

  const store = getCachedData();
  const found = (store.users || []).find((u: any) =>
    (idQuery && u.id === idQuery) ||
    (emailQuery && u.email && String(u.email).toLowerCase().trim() === String(emailQuery).toLowerCase().trim())
  );

  if (found) {
    return res.json({ status: "success", user: found });
  }
  return res.status(404).json({ error: "User not found" });
});

app.get("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: "id required" });

  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT data FROM users WHERE id = $1 LIMIT 1', [id]);
      if (q && q.rows && q.rows.length > 0 && q.rows[0].data) {
        return res.json({ status: "success", user: q.rows[0].data });
      }
    } catch (e) {
      console.warn("[PostgreSQL] Error in GET /api/users/:id:", (e as any)?.message || e);
    }
  }

  const store = getCachedData();
  const found = (store.users || []).find((u: any) => u && u.id === id);
  if (found) {
    return res.json({ status: "success", user: found });
  }
  return res.status(404).json({ error: "User not found" });
});

app.post("/api/users", async (req, res) => {
  const item = req.body;
  if (!item || (!item.id && !item.email)) return res.status(400).json({ error: "Invalid user data" });
  if (!item.id) {
    item.id = `usr-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  }
  if (await isIdDeletedInServer(item.id) && !item.forceRestore) {
    return res.status(410).json({ error: "Deleted", id: item.id });
  }
  const nowIso = new Date().toISOString();
  if (!item.createdAt) item.createdAt = nowIso;
  item.updatedAt = nowIso;

  const store = getCachedData();
  if (!Array.isArray(store.users)) store.users = [];
  const idx = store.users.findIndex((u: any) => u.id === item.id || (u.email && item.email && u.email.toLowerCase().trim() === item.email.toLowerCase().trim()));
  if (idx >= 0) {
    store.users[idx] = { ...store.users[idx], ...item };
  } else {
    store.users.push(item);
  }

  // Direct SQL execution on PostgreSQL
  if (pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO users (id, data, email, role, updated_at) 
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
         ON CONFLICT (id) 
         DO UPDATE SET data = EXCLUDED.data, email = EXCLUDED.email, role = EXCLUDED.role, updated_at = CURRENT_TIMESTAMP`,
        [item.id, JSON.stringify(item), item.email ? String(item.email).toLowerCase().trim() : null, item.role || 'técnico']
      );
      if (item.forceRestore) {
        await pgPool.query('DELETE FROM deleted_ids WHERE id = $1', [item.id]);
      }
      console.log(`[PostgreSQL] User ${item.id} (${item.displayName}) created/saved in DB.`);
    } catch (pgErr) {
      console.warn("[PostgreSQL] Error executing INSERT on users table:", (pgErr as any)?.message || pgErr);
    }
  }

  if (item.forceRestore) {
    unregisterDeletion(item.id);
    delete item.forceRestore;
  }
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'user_created', user: item, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", user: item });
});

const handleUpdateUserRoute = async (req: express.Request, res: express.Response) => {
  const { id } = req.params;
  const updates = req.body;
  if (!id) return res.status(400).json({ error: "User ID is required" });
  if (await isIdDeletedInServer(id)) return res.status(410).json({ error: "Deleted", id });

  const store = getCachedData();
  if (!Array.isArray(store.users)) store.users = [];
  const existingIdx = store.users.findIndex((u: any) => u.id === id);
  const nowIso = new Date().toISOString();

  let finalUser: any;
  if (existingIdx >= 0) {
    finalUser = {
      ...store.users[existingIdx],
      ...updates,
      id, // Preserve ID
      updatedAt: nowIso
    };
    store.users[existingIdx] = finalUser;
  } else {
    finalUser = {
      ...updates,
      id,
      createdAt: updates.createdAt || nowIso,
      updatedAt: nowIso
    };
    store.users.push(finalUser);
  }

  // Direct SQL execution on PostgreSQL (UPDATE WHERE id = $1, with UPSERT fallback)
  if (pgPool) {
    try {
      const updateResult = await pgPool.query(
        `UPDATE users 
         SET data = $1, email = $2, role = $3, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $4`,
        [JSON.stringify(finalUser), finalUser.email ? String(finalUser.email).toLowerCase().trim() : null, finalUser.role || 'técnico', id]
      );

      if (updateResult.rowCount === 0) {
        await pgPool.query(
          `INSERT INTO users (id, data, email, role, updated_at) 
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) 
           ON CONFLICT (id) 
           DO UPDATE SET data = EXCLUDED.data, email = EXCLUDED.email, role = EXCLUDED.role, updated_at = CURRENT_TIMESTAMP`,
          [id, JSON.stringify(finalUser), finalUser.email ? String(finalUser.email).toLowerCase().trim() : null, finalUser.role || 'técnico']
        );
      }
      console.log(`[PostgreSQL] User ${id} (${finalUser.displayName}) updated in DB successfully.`);
    } catch (pgErr) {
      console.warn("[PostgreSQL] Error executing UPDATE on users table:", (pgErr as any)?.message || pgErr);
    }
  }

  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'user_updated', user: finalUser, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", user: finalUser });
};

app.put("/api/users/:id", handleUpdateUserRoute);
app.patch("/api/users/:id", handleUpdateUserRoute);

// 8. Cronogramas
app.get("/api/cronogramas", async (_req, res) => {
  const store = getCachedData();
  if (pgPool) {
    try {
      const q = await pgPool.query('SELECT id, data FROM cronogramas ORDER BY updated_at DESC');
      const pgCron = (q.rows || []).map((r: any) => (r && r.data && typeof r.data === 'object') ? { ...r.data, id: r.data.id || r.id } : null).filter(Boolean);
      store.cronogramas = pgCron;
      return res.json(pgCron);
    } catch (e) {
      console.warn("[PostgreSQL] Notice loading cronogramas from DB:", (e as any)?.message || e);
    }
  }
  res.json(store.cronogramas || []);
});
app.post("/api/cronogramas", async (req, res) => {
  const item = req.body;
  if (!item || !item.id) return res.status(400).json({ error: "Invalid cronograma data" });
  if (await isIdDeletedInServer(item.id) && !item.forceRestore) {
    return res.status(410).json({ error: "Deleted", id: item.id });
  }
  const store = getCachedData();
  if (!Array.isArray(store.cronogramas)) store.cronogramas = [];
  const idx = store.cronogramas.findIndex((c: any) => c.id === item.id);
  if (idx >= 0) store.cronogramas[idx] = { ...store.cronogramas[idx], ...item };
  else store.cronogramas.push(item);
  await pgUpsert('cronogramas', item.id, item, Boolean(item.forceRestore));
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'cronograma_updated', cronograma: item, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", cronograma: item });
});
app.put("/api/cronogramas/:id", async (req, res) => {
  const { id } = req.params;
  if (await isIdDeletedInServer(id)) return res.status(410).json({ error: "Deleted", id });
  const store = getCachedData();
  if (!Array.isArray(store.cronogramas)) store.cronogramas = [];
  const idx = store.cronogramas.findIndex((c: any) => c.id === id);
  const item = idx >= 0 ? { ...store.cronogramas[idx], ...req.body, id } : { ...req.body, id };
  if (idx >= 0) store.cronogramas[idx] = item;
  else store.cronogramas.push(item);
  await pgUpsert('cronogramas', id, item, false);
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'cronograma_updated', cronograma: item, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", cronograma: item });
});

// 9. App Data & Singletons (schedule_config, app_version, round_template)
app.get("/api/app-data/:id", async (req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  const { id } = req.params;
  const store = getCachedData();
  if (!store.appData) store.appData = {};
  if (pgPool) {
    const dbData = await pgGet('app_data', id);
    if (dbData) {
      store.appData[id] = dbData;
      return res.json(dbData);
    }
  }
  if (store.appData[id]) {
    return res.json(store.appData[id]);
  }
  res.json({});
});
app.post("/api/app-data/:id", async (req, res) => {
  const { id } = req.params;
  const payload = req.body || {};
  const store = getCachedData();
  if (!store.appData) store.appData = {};
  let existing = store.appData[id];
  if (!existing && pgPool) {
    existing = await pgGet('app_data', id);
  }
  const mergedAppData = {
    ...(existing || {}),
    ...payload,
    updatedAt: monotonicUpdatedAt(existing, payload?.updatedAt)
  };
  const pgOk = await pgUpsert('app_data', id, mergedAppData);
  if (pgPool && !pgOk) {
    return res.status(503).json({ error: "PostgreSQL save failed for app_data" });
  }
  store.appData[id] = mergedAppData;
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'app_data_updated', id, data: mergedAppData, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", data: mergedAppData });
});

// 10. Settings
app.get("/api/settings", (_req, res) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  const store = getCachedData();
  res.json(store.settings || {});
});
app.post("/api/settings", async (req, res) => {
  const store = getCachedData();
  store.settings = { ...(store.settings || {}), ...req.body };
  await pgUpsert('settings', 'app_settings', store.settings);
  scheduleSaveToDisk();
  const clientId = req.headers['x-client-id'] || null;
  broadcastSse({ type: 'settings_updated', settings: store.settings, clientId, time: Date.now() });
  broadcastSse({ type: 'data_updated', clientId, time: Date.now() });
  res.json({ status: "success", settings: store.settings });
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
app.use('/assets', (req, res, next) => {
  const distAssetsPath = path.join(process.cwd(), 'dist', 'assets');
  if (fs.existsSync(distAssetsPath)) {
    return express.static(distAssetsPath, {
      maxAge: '1y',
      immutable: true
    })(req, res, next);
  }
  next();
});

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
  await initPostgresSchema();
  const distPath = path.join(process.cwd(), 'dist');

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);

    // Universal HTML handler in development using Vite HTML transformation
    app.get('*', async (req, res, next) => {
      if (req.url.startsWith('/api')) return next();
      try {
        const rootIndex = path.join(process.cwd(), 'index.html');
        if (fs.existsSync(rootIndex)) {
          let template = fs.readFileSync(rootIndex, 'utf-8');
          template = await vite.transformIndexHtml(req.originalUrl, template);
          return res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        }
      } catch (e: any) {
        vite.ssrFixStacktrace(e);
        return next(e);
      }
      next();
    });
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
    app.get('*', (req, res, next) => {
      if (req.url.startsWith('/api')) return next();
      const distIndex = path.join(distPath, 'index.html');
      if (fs.existsSync(distIndex)) {
        return res.sendFile(distIndex);
      }
      next();
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

  // Global Express error handler to prevent 502/500 proxy crash
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server Internal Error]:', err?.message || err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Server Error', message: 'Solicitud procesada con advertencia interna' });
    }
  });

  const httpServer = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('[Server] System operational and synchronized with PostgreSQL/Storage.');
  });
  httpServer.setTimeout(120000);
  httpServer.keepAliveTimeout = 65000;
  httpServer.headersTimeout = 70000;
}

startServer();
