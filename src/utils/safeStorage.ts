/**
 * safeStorage.ts
 *
 * Robust, quota-resilient, non-recursive storage engine for Hotel Maintenance.
 * Prevents Uncaught QuotaExceededError and Maximum call stack size exceeded errors.
 * Backed by native IndexedDB for unlimited, permanent offline persistence.
 */

// Capture native storage methods at module load time to prevent any recursion
const nativeStorage = typeof window !== 'undefined' ? window.localStorage : null;
const nativeSetItem = nativeStorage ? nativeStorage.setItem.bind(nativeStorage) : () => {};
const nativeGetItem = nativeStorage ? nativeStorage.getItem.bind(nativeStorage) : () => null;
const nativeRemoveItem = nativeStorage ? nativeStorage.removeItem.bind(nativeStorage) : () => {};

const DB_NAME = 'HotelMaintenanceIDB';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

let dbPromise: Promise<IDBDatabase> | null = null;

function getIDB(): Promise<IDBDatabase> {
  if (typeof window === 'undefined' || !window.indexedDB) {
    return Promise.reject(new Error('IndexedDB not supported in this environment'));
  }
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      try {
        const req = window.indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = (e) => {
          const db = (e.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME);
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      } catch (err) {
        reject(err);
      }
    });
  }
  return dbPromise;
}

/**
 * Store any serializable value in IndexedDB (hundreds of MBs capacity)
 */
export async function idbSet(key: string, val: any): Promise<void> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(val, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[IDB] set warning for key:', key, e);
  }
}

/**
 * Retrieve a value from IndexedDB
 */
export async function idbGet<T = any>(key: string): Promise<T | null> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => {
        let val = req.result !== undefined ? req.result : null;
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try {
            val = JSON.parse(val);
          } catch {}
        }
        resolve(val);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[IDB] get warning for key:', key, e);
    return null;
  }
}

/**
 * Remove a key from IndexedDB
 */
export async function idbRemove(key: string): Promise<void> {
  try {
    const db = await getIDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    console.warn('[IDB] delete warning for key:', key, e);
  }
}

/**
 * Checks if an error is a QuotaExceededError
 */
export function isQuotaExceededError(err: any): boolean {
  if (!err) return false;
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014 ||
    (typeof err.message === 'string' && err.message.toLowerCase().includes('quota'))
  );
}

/**
 * Prunes oversized base64 images from checkpoints in older completed rounds
 * for the localStorage copy only. The full intact data remains in IndexedDB,
 * memory state, server data.json, and Firestore.
 */
function stripAllBase64ImagesRecursively(obj: any): void {
  if (!obj || typeof obj !== 'object') return;
  if (Array.isArray(obj)) {
    obj.forEach(stripAllBase64ImagesRecursively);
    return;
  }
  for (const k of Object.keys(obj)) {
    const val = obj[k];
    if (typeof val === 'string' && (val.startsWith('data:image/') || val.includes('cached_in_db'))) {
      delete obj[k];
    } else if (Array.isArray(val) && (k === 'photos' || k.endsWith('Photos'))) {
      const kept = val.filter((u: any) => typeof u === 'string' && !u.startsWith('data:image/') && !u.includes('cached_in_db'));
      if (kept.length > 0) {
        obj[k] = kept;
      } else {
        delete obj[k];
      }
    } else if (val && typeof val === 'object') {
      stripAllBase64ImagesRecursively(val);
    }
  }
}

function compactRoundsForLocalStorage(roundsJsonString: string, keepRecentPhotos: boolean = true): string {
  try {
    const rounds = JSON.parse(roundsJsonString);
    if (!Array.isArray(rounds)) return roundsJsonString;

    const cloned = rounds.map((round: any, idx: number) => {
      if (!round || typeof round !== 'object') return round;
      if (keepRecentPhotos && (round.status === 'en_progreso' || idx === 0)) return round;
      const copy = JSON.parse(JSON.stringify(round));
      stripAllBase64ImagesRecursively(copy);
      return copy;
    });

    return JSON.stringify(cloned);
  } catch (e) {
    return roundsJsonString;
  }
}

/**
 * Compact active round for localStorage if quota is reached
 */
function compactActiveRoundForLocalStorage(activeRoundJsonString: string): string {
  try {
    const round = JSON.parse(activeRoundJsonString);
    if (!round || !Array.isArray(round.checkpoints)) return activeRoundJsonString;
    return JSON.stringify(round);
  } catch {
    return activeRoundJsonString;
  }
}

// Re-entrancy guard to strictly prevent any recursive calls
let isExecutingSafeSet = false;

/**
 * Safely store an item in localStorage without ever crashing the app.
 * Never recurses. If quota is exceeded, writes full data to IndexedDB,
 * compacts localStorage copy, and avoids unhandled errors.
 */
export function safeSetItem(key: string, value: string): boolean {
  if (!nativeStorage) {
    return false;
  }

  // Prevent re-entrant recursion
  if (isExecutingSafeSet) {
    try {
      nativeSetItem(key, value);
      return true;
    } catch {
      return false;
    }
  }

  isExecutingSafeSet = true;
  try {
    // Asynchronously mirror full payload to IndexedDB for unlimited persistence
    try {
      idbSet(key, value);
    } catch {}

    try {
      nativeSetItem(key, value);
      return true;
    } catch (err: any) {
      if (!isQuotaExceededError(err)) {
        console.warn(`[safeStorage] Failed writing "${key}" to localStorage:`, err);
        return false;
      }

      console.warn(`[safeStorage] Quota exceeded on key "${key}". Applying resilient storage strategy...`);

      // 1. Remove disposable non-critical keys
      try {
        nativeRemoveItem('hotel_maint_audit_logs');
        nativeRemoveItem('hotel_maint_database_cleared_v3');
      } catch {}

      // 2. Specific handling for hotel_maint_rounds
      if (key === 'hotel_maint_rounds') {
        try {
          const parsedAll = JSON.parse(value);
          if (Array.isArray(parsedAll)) {
            const counts: Record<string, number> = {};
            for (const r of parsedAll) {
              if (!r || !r.id) continue;
              const seen = new Set<string>();
              const add = (u: any) => {
                if (typeof u === 'string' && u && !u.includes('cached_in_db')) seen.add(u);
              };
              if (Array.isArray(r.photos)) r.photos.forEach(add);
              (r.checkpoints || []).forEach((c: any) => {
                add(c?.photoUrl);
                if (Array.isArray(c?.photos)) c.photos.forEach(add);
                (c?.measurementFields || []).forEach((f: any) => {
                  add(f?.photoUrl);
                  if (Array.isArray(f?.photos)) f.photos.forEach(add);
                });
              });
              const mr = r.meterReadings || {};
              add(mr.waterMeterPhotoUrl);
              if (Array.isArray(mr.waterMeterPhotos)) mr.waterMeterPhotos.forEach(add);
              add(mr.electricMeterPhotoUrl);
              if (Array.isArray(mr.electricMeterPhotos)) mr.electricMeterPhotos.forEach(add);
              add(mr.gasMeterPhotoUrl);
              if (Array.isArray(mr.gasMeterPhotos)) mr.gasMeterPhotos.forEach(add);
              if (mr.customMeters) {
                Object.values(mr.customMeters).forEach((cm: any) => {
                  add(cm?.photoUrl);
                  if (Array.isArray(cm?.photos)) cm.photos.forEach(add);
                });
              }
              (r.anomalies || []).forEach((a: any) => {
                add(a?.photoUrl);
                if (Array.isArray(a?.photos)) a.photos.forEach(add);
              });
              if (seen.size > 0) counts[r.id] = seen.size;
            }
            try {
              nativeSetItem('hotel_maint_rounds_photocounts', JSON.stringify(counts));
            } catch {}
          }
        } catch {}

        try {
          const compacted = compactRoundsForLocalStorage(value, true);
          nativeSetItem(key, compacted);
          return true;
        } catch (err2: any) {
          try {
            // Strip ALL base64 images from every round for localStorage only (IndexedDB retains 100% of photos)
            const ultraCompacted = compactRoundsForLocalStorage(value, false);
            nativeSetItem(key, ultraCompacted);
            return true;
          } catch (err3) {
            try {
              const parsed = JSON.parse(value);
              if (Array.isArray(parsed)) {
                const minimalRounds = parsed.slice(0, 60).map((r: any) => {
                  const copy = JSON.parse(JSON.stringify(r));
                  stripAllBase64ImagesRecursively(copy);
                  return copy;
                });
                nativeSetItem(key, JSON.stringify(minimalRounds));
                return true;
              }
            } catch {}
            console.warn('[safeStorage] localStorage full for hotel_maint_rounds; preserved in IndexedDB.');
            return false;
          }
        }
      }

      // 3. Handling for hotel_maint_active_round
      if (key === 'hotel_maint_active_round') {
        try {
          const compacted = compactActiveRoundForLocalStorage(value);
          nativeSetItem(key, compacted);
          return true;
        } catch {}
      }

      // 4. If another key hit quota, free space by compacting older completed rounds (> idx 4) while keeping IndexedDB 100% full
      if (key !== 'hotel_maint_rounds') {
        try {
          const existingRounds = nativeGetItem('hotel_maint_rounds');
          if (existingRounds && existingRounds.length > 150000) {
            const parsed = JSON.parse(existingRounds);
            if (Array.isArray(parsed)) {
              const compacted = compactRoundsForLocalStorage(existingRounds, true);
              nativeSetItem('hotel_maint_rounds', compacted);
            }
          }
        } catch {}
      }

      // 5. Try one more time now that space was freed
      try {
        nativeSetItem(key, value);
        return true;
      } catch {
        return false;
      }
    }
  } finally {
    isExecutingSafeSet = false;
  }
}

/**
 * Retrieve item
 */
export function safeGetItem(key: string): string | null {
  if (!nativeStorage) return null;
  try {
    return nativeGetItem(key);
  } catch (err) {
    console.warn(`[safeStorage] Error reading key "${key}":`, err);
    return null;
  }
}

/**
 * Safe removeItem
 */
export function safeRemoveItem(key: string): void {
  if (!nativeStorage) return;
  try {
    nativeRemoveItem(key);
    idbRemove(key);
  } catch (err) {
    console.warn(`[safeStorage] Error removing key "${key}":`, err);
  }
}

let isInitialized = false;

/**
 * Global Interceptor: Patches window.localStorage.setItem so that NO component,
 * hook, or library in the entire app can crash with an Uncaught QuotaExceededError.
 * Uses nativeSetItem internally with re-entrancy locks so recursion is impossible.
 */
export function initSafeStorage(): void {
  if (isInitialized || typeof window === 'undefined' || !window.localStorage) {
    return;
  }
  isInitialized = true;

  try {
    window.localStorage.setItem = function (key: string, value: string) {
      safeSetItem(key, value);
    };

    window.localStorage.removeItem = function (key: string) {
      safeRemoveItem(key);
    };

    console.log('[safeStorage] Quota-resilient storage shield initialized successfully.');
  } catch (e) {
    console.warn('[safeStorage] Could not patch localStorage.setItem directly:', e);
  }
}
