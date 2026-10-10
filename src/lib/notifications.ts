// Notification helper for push/system background alerts

let sharedAudioCtx: AudioContext | null = null;

export function initAudioUnlock() {
  if (typeof window === 'undefined') return;
  const unlock = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        if (!sharedAudioCtx) {
          sharedAudioCtx = new AudioContextClass();
        }
        if (sharedAudioCtx.state === 'suspended') {
          sharedAudioCtx.resume();
        }
      }
    } catch (e) {}
  };
  window.addEventListener('click', unlock, { passive: true });
  window.addEventListener('touchstart', unlock, { passive: true });
}

// Auto-initialize audio unlock on client
if (typeof window !== 'undefined') {
  initAudioUnlock();
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied';
  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      sendSystemNotification('🔔 Notificaciones Activadas', {
        body: 'Recibirás alertas en tiempo real de rondas, averías y tareas aunque la app esté en segundo plano.',
        icon: '/pwa-192x192.png',
        tag: 'welcome-notification'
      });
    }
    return permission;
  } catch (e) {
    console.warn('Error requesting notification permission:', e);
    return 'denied';
  }
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Registra o actualiza la suscripción Web Push en el servidor para que el dispositivo
 * reciba notificaciones push reales del sistema operativo aun con la app cerrada o pantalla apagada.
 */
export async function syncPushSubscriptionWithServer(user: any, forceRenew: boolean = false): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return false;
  }

  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    // 1. Asegurar registro del Service Worker y esperar que esté activo
    await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    const registration = await navigator.serviceWorker.ready;

    if (!registration || !registration.pushManager) {
      console.warn('PushManager unavailable on active service worker');
      return false;
    }

    // 2. Obtener la clave pública VAPID fija del servidor
    const keyRes = await fetch('/api/push/public-key');
    if (!keyRes.ok) return false;
    const { publicKey } = await keyRes.json();
    if (!publicKey) return false;

    const convertedKey = urlBase64ToUint8Array(publicKey);

    // 3. Obtener o renovar la suscripción en el navegador
    let subscription = await registration.pushManager.getSubscription();

    // Validar si la suscripción existente corresponde a la clave actual o si se fuerza renovación
    if (subscription) {
      try {
        const subKey = subscription.options?.applicationServerKey;
        let isKeyValid = true;
        if (subKey) {
          const subKeyArray = new Uint8Array(subKey);
          if (subKeyArray.length !== convertedKey.length) {
            isKeyValid = false;
          } else {
            for (let i = 0; i < subKeyArray.length; i++) {
              if (subKeyArray[i] !== convertedKey[i]) {
                isKeyValid = false;
                break;
              }
            }
          }
        }
        if (!isKeyValid || forceRenew) {
          console.log('🔄 Renovando suscripción Push para garantizar entrega en este dispositivo...');
          await subscription.unsubscribe();
          subscription = null;
        }
      } catch (errKey) {
        console.warn('Advertencia al verificar clave de suscripción:', errKey);
      }
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey
      });
    }

    if (subscription) {
      // 4. Guardar suscripción en el servidor para alertas cuando la app esté cerrada
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription: subscription.toJSON(),
          user: user ? {
            id: user.id,
            email: user.email,
            displayName: user.displayName,
            role: user.role,
            department: user.department,
            notifyRoundInProgress: user.permissions?.notifyRoundInProgress !== undefined 
              ? !!user.permissions.notifyRoundInProgress 
              : (user.notifyRoundInProgress !== undefined ? !!user.notifyRoundInProgress : true),
            notifyRounds: user.permissions?.notifyRounds !== undefined
              ? !!user.permissions.notifyRounds
              : (user.notifyRounds !== undefined ? !!user.notifyRounds : true),
            notifyRequests: user.permissions?.notifyRequests !== undefined
              ? !!user.permissions.notifyRequests
              : (user.notifyRequests !== undefined ? !!user.notifyRequests : true),
            notifyTasks: user.permissions?.notifyTasks !== undefined
              ? !!user.permissions.notifyTasks
              : (user.notifyTasks !== undefined ? !!user.notifyTasks : true),
            notifyIncidents: user.permissions?.notifyIncidents !== undefined
              ? !!user.permissions.notifyIncidents
              : (user.notifyIncidents !== undefined ? !!user.notifyIncidents : true),
            permissions: user.permissions
          } : null
        })
      });
      return res.ok;
    }
    return false;
  } catch (err) {
    console.warn('Push subscription sync notice:', err);
    return false;
  }
}

/**
 * Verifica si el dispositivo actual tiene una suscripción activa registrada en el servidor.
 */
export async function checkPushSubscriptionStatus(): Promise<{ subscribed: boolean; totalSubscribers: number }> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return { subscribed: false, totalSubscribers: 0 };
  }
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration || !registration.pushManager) {
      return { subscribed: false, totalSubscribers: 0 };
    }
    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      return { subscribed: false, totalSubscribers: 0 };
    }
    const res = await fetch('/api/push/check-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: subscription.endpoint })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.warn('Error checking push subscription status:', e);
  }
  return { subscribed: false, totalSubscribers: 0 };
}

/**
 * Dispara una notificación de prueba instantánea en el dispositivo y programa
 * una segunda notificación desde el servidor en N segundos para probar con la app cerrada.
 */
export async function sendTestPushNotification(user: any, delaySeconds: number = 8): Promise<{ direct: boolean; serverScheduled: boolean }> {
  // 1. Asegurar suscripción push actualizada
  await syncPushSubscriptionWithServer(user);

  // 2. Disparar notificación directa del sistema INMEDIATA en el dispositivo
  await sendSystemNotification('🔔 Notificación de Prueba Inmediata', {
    body: '¡Sonido y vibración confirmados! Ahora sal de la app o bloquea el teléfono para la prueba en segundo plano.',
    tag: `test-instant-${Date.now()}`
  });

  // 3. Solicitar al servidor que envíe un Push en los segundos seleccionados para probar con la app cerrada o bloqueada
  let serverScheduled = false;
  try {
    const res = await fetch('/api/push/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        delaySeconds,
        user: user ? { id: user.id, displayName: user.displayName } : null
      })
    });
    serverScheduled = res.ok;
  } catch (e) {
    console.warn('Test push server error:', e);
  }

  return { direct: true, serverScheduled };
}

/**
 * Envía una notificación Push al servidor para que la transmita a los teléfonos
 * y equipos de todos los compañeros según sus permisos y configuración.
 */
export async function broadcastServerPushNotification(payload: {
  category: 'rondas' | 'incidencias' | 'solicitudes' | 'tareas';
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  excludeUserId?: string;
  excludeEmail?: string;
  targetUserId?: string;
  targetDepartment?: string;
  data?: any;
}) {
  try {
    let excludeEndpoint: string | undefined;
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg && reg.pushManager) {
          const sub = await reg.pushManager.getSubscription();
          if (sub && sub.endpoint) {
            excludeEndpoint = sub.endpoint;
          }
        }
      } catch (e) {}
    }

    await fetch('/api/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        excludeEndpoint
      })
    });
  } catch (err) {
    console.warn('Error broadcasting server push notification:', err);
  }
}

export function playAlertSound() {
  // 1. Play synthesize chime via Web Audio (works even if remote audio files fail)
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      if (!sharedAudioCtx) {
        sharedAudioCtx = new AudioContextClass();
      }
      if (sharedAudioCtx.state === 'suspended') {
        sharedAudioCtx.resume().catch(() => {});
      }
      const ctx = sharedAudioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    }
  } catch (err) {}

  // 2. Play remote sound file as supplementary audio
  try {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2354/2354-500.wav');
    audio.volume = 0.9;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {});
    }
  } catch (e) {}
}

export async function sendSystemNotification(title: string, options?: NotificationOptions & { data?: any }) {
  // Always trigger audio and haptic vibration feedback
  playAlertSound();
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([300, 100, 300, 100, 300]);
    } catch (e) {}
  }

  if (!isNotificationSupported()) return;

  if (Notification.permission === 'granted') {
    const defaultOptions: any = {
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      vibrate: [300, 100, 300, 100, 300],
      requireInteraction: true,
      renotify: true,
      dir: 'auto',
      lang: 'es',
      silent: false,
      tag: options?.tag || `maint-notify-${Date.now()}`,
      ...options
    };

    let shown = false;

    // 1. Try Service Worker first with getRegistration or register
    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
      try {
        let registration = await navigator.serviceWorker.getRegistration();
        if (!registration) {
          registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        }
        if (!registration && navigator.serviceWorker.ready) {
          registration = await Promise.race([
            navigator.serviceWorker.ready,
            new Promise<ServiceWorkerRegistration | undefined>((resolve) => setTimeout(() => resolve(undefined), 1500))
          ]);
        }

        if (registration && typeof registration.showNotification === 'function') {
          await registration.showNotification(title, defaultOptions);
          shown = true;
        }
      } catch (e) {
        console.warn('SW showNotification error:', e);
      }
    }

    // 2. Fallback to window Notification constructor (desktop browsers or when SW is busy)
    if (!shown) {
      try {
        const notif = new Notification(title, defaultOptions);
        notif.onclick = () => {
          try {
            window.focus();
            notif.close();
          } catch {}
        };
      } catch (e) {
        // Expected on some mobile browsers where Notification constructor is disabled
      }
    }
  }
}
