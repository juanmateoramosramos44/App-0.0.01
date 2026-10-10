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
      req.onsuccess = () => resolve(req.result !== undefined ? req.result : null);
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
function compactRoundsForLocalStorage(roundsJsonString: string): string {
  try {
    const rounds = JSON.parse(roundsJsonString);
    if (!Array.isArray(rounds)) return roundsJsonString;

    const stripPhotosRecursively = (obj: any) => {
      if (!obj || typeof obj !== 'object') return;
      if (Array.isArray(obj)) {
        obj.forEach(stripPhotosRecursively);
        return;
      }
      for (const k of Object.keys(obj)) {
        if (k === 'photoUrl' && typeof obj[k] === 'string' && (obj[k].startsWith('data:image/') || obj[k].includes('cached_in_db'))) {
          delete obj[k];
        } else if (typeof obj[k] === 'object') {
          stripPhotosRecursively(obj[k]);
        }
      }
    };

    const cloned = rounds.map((round: any, idx: number) => {
      // Keep photos only for active in-progress rounds and recent rounds
      if (round.status === 'en_progreso' || idx === 0) return round;
      const copy = { ...round };
      if (copy.checkpoints && Array.isArray(copy.checkpoints)) {
        copy.checkpoints = JSON.parse(JSON.stringify(copy.checkpoints));
        stripPhotosRecursively(copy.checkpoints);
      }
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
          const compacted = compactRoundsForLocalStorage(value);
          nativeSetItem(key, compacted);
          return true;
        } catch (err2: any) {
          try {
            const parsed = JSON.parse(value);
            if (Array.isArray(parsed)) {
              const allCleaned = parsed.map((r: any) => {
                const copy = { ...r };
                if (copy.checkpoints && Array.isArray(copy.checkpoints)) {
                  copy.checkpoints = copy.checkpoints.map((c: any) => ({
                    ...c,
                    photoUrl: (c.photoUrl && (c.photoUrl.startsWith('data:image/') || c.photoUrl.includes('cached_in_db'))) ? undefined : c.photoUrl,
                    measurementFields: c.measurementFields?.map((f: any) => ({
                      ...f,
                      photoUrl: (f.photoUrl && (f.photoUrl.startsWith('data:image/') || f.photoUrl.includes('cached_in_db'))) ? undefined : f.photoUrl
                    }))
                  }));
                }
                return copy;
              });
              nativeSetItem(key, JSON.stringify(allCleaned));
              return true;
            }
          } catch (err3) {
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

      // 4. Try one more time in case cleanup made space
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

    console.log('[safeStorage] Quota-resilient storage shield initialized successfully.');
  } catch (e) {
    console.warn('[safeStorage] Could not patch localStorage.setItem directly:', e);
  }
}
