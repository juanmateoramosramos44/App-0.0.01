import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  doc, 
  getDocFromServer,
  setLogLevel
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Silence Firestore internal SDK logging to prevent noisy backoff delay errors on quota exhaustion
try {
  setLogLevel('silent');
} catch {}

// Initialize Firebase App
export const firebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Firestore with custom database ID if present and enable offline persistence
let dbInstance;
try {
  // Use initializeFirestore to enable persistent offline caching (important for preserving unsaved templates across reloads)
  dbInstance = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
  }, firebaseConfig.firestoreDatabaseId);
} catch (e) {
  // Fallback if initializeFirestore fails (e.g. already initialized)
  dbInstance = firebaseConfig.firestoreDatabaseId 
    ? getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId)
    : getFirestore(firebaseApp);
}
export const db = dbInstance;

// Initialize Firebase Auth
export const auth = getAuth(firebaseApp);

// Quota management: If Firestore write quota is exceeded, gracefully throttle writes to prevent backoff delay storms
let quotaExceededUntil = 0;
const QUOTA_STORAGE_KEY = 'firestore_quota_exceeded_until';

try {
  const saved = typeof localStorage !== 'undefined' 
    ? localStorage.getItem(QUOTA_STORAGE_KEY) 
    : (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(QUOTA_STORAGE_KEY) : null);
  if (saved) {
    const val = Number(saved);
    if (val > Date.now()) {
      quotaExceededUntil = val;
    }
  }
} catch {}

export function isFirestoreQuotaExceeded(): boolean {
  return Date.now() < quotaExceededUntil;
}

export function markFirestoreQuotaExceeded(durationMs: number = 60 * 60 * 1000) {
  quotaExceededUntil = Date.now() + durationMs;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(QUOTA_STORAGE_KEY, String(quotaExceededUntil));
    }
  } catch {}
}

// Global protection: Intercept and suppress Firestore quota exhaustion console spam and unhandled promise rejections
if (typeof window !== 'undefined') {
  // Intercept unhandledrejection
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = String(reason?.message || reason || '');
    if (
      reason?.code === 'resource-exhausted' ||
      msg.includes('Quota limit exceeded') ||
      msg.includes('resource-exhausted') ||
      msg.includes('Free daily write units') ||
      msg.includes('Free daily read units')
    ) {
      markFirestoreQuotaExceeded();
      event.preventDefault();
    }
  });

  const isQuotaLog = (args: any[]): boolean => {
    const firstStr = String(args[0] || '');
    const fullStr = args.map(a => String(a?.message || a || '')).join(' ');
    return (
      firstStr.includes('@firebase/firestore') ||
      fullStr.includes('resource-exhausted') ||
      fullStr.includes('Quota limit exceeded') ||
      fullStr.includes('Free daily write units') ||
      fullStr.includes('Free daily read units') ||
      fullStr.includes('Using maximum backoff delay') ||
      fullStr.includes('GrpcConnection RPC') ||
      fullStr.includes('Disconnecting idle stream') ||
      fullStr.includes('Timed out waiting for new targets')
    );
  };

  // Intercept console.error and console.warn to filter out Firestore SDK internal retry/backoff messages
  const rawConsoleError = console.error;
  console.error = function (...args: any[]) {
    if (isQuotaLog(args)) {
      markFirestoreQuotaExceeded();
      return;
    }
    rawConsoleError.apply(console, args);
  };

  const rawConsoleWarn = console.warn;
  console.warn = function (...args: any[]) {
    if (isQuotaLog(args)) {
      markFirestoreQuotaExceeded();
      return;
    }
    rawConsoleWarn.apply(console, args);
  };
}

export async function safeFirestoreWrite<T>(writeFn: () => Promise<T>): Promise<T | null> {
  if (isFirestoreQuotaExceeded()) {
    return null;
  }
  try {
    return await writeFn();
  } catch (err: any) {
    const msg = String(err?.message || '');
    if (err?.code === 'resource-exhausted' || msg.includes('Quota limit exceeded') || msg.includes('quota')) {
      markFirestoreQuotaExceeded();
    }
    console.warn('Firestore write warning:', err);
    return null;
  }
}

// Clean objects before writing to Firestore so undefined fields never cause Firestore rejection errors
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return null as any;
  }
  if (Array.isArray(data)) {
    return data
      .filter(item => item !== undefined)
      .map(item => cleanForFirestore(item)) as any;
  }
  if (typeof data === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

// Guarantee auth status check and sign in anonymously if needed
let authInitPromise: Promise<User | null> | null = null;

export const ensureAuthenticated = async (): Promise<User | null> => {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  if (!authInitPromise) {
    authInitPromise = new Promise<User | null>((resolve) => {
      let resolved = false;
      const unsub = onAuthStateChanged(auth, async (user) => {
        if (user) {
          if (!resolved) {
            resolved = true;
            unsub();
            resolve(user);
          }
        } else {
          try {
            const cred = await signInAnonymously(auth);
            if (!resolved) {
              resolved = true;
              unsub();
              resolve(cred.user);
            }
          } catch (err) {
            console.warn('Anonymous sign-in error:', err);
            if (!resolved) {
              resolved = true;
              unsub();
              resolve(null);
            }
          }
        }
      });

      // 5-second fallback for slow mobile networks
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          unsub();
          resolve(auth.currentUser || null);
        }
      }, 5000);
    }).then(user => {
      if (!user && !auth.currentUser) {
        authInitPromise = null; // Reset so next attempt can retry
      }
      return user || auth.currentUser || null;
    });
  }
  return authInitPromise;
};

// Immediate background trigger
ensureAuthenticated().catch(() => null);

// Test connection on boot as mandated by Firebase skill
export async function testFirestoreConnection() {
  if (isFirestoreQuotaExceeded()) {
    return;
  }
  try {
    // Wait for auth to be ready
    await ensureAuthenticated();
    
    // Non-blocking, soft-fail ping test
    const pingPromise = getDocFromServer(doc(db, 'hotel_settings', 'connection_test'));
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 4000));
    
    await Promise.race([pingPromise, timeoutPromise]);
    console.log('Firebase backend reachable.');
  } catch (error: any) {
    const msg = String(error?.message || '');
    if (error?.code === 'resource-exhausted' || msg.includes('Quota limit exceeded')) {
      markFirestoreQuotaExceeded();
    }
    console.debug('Firestore backend not immediately reachable (expected during startup or quota limit).');
  }
}

// Trigger connection test on boot
testFirestoreConnection().catch(() => {});
