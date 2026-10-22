// public/sw.js
// Service Worker para instalación PWA en Teléfono y Computador, soporte Offline y Notificaciones Push

const CACHE_NAME = 'wake-maintenance-pwa-v9';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/favicon.ico',
  '/wake-bio-logo.jpg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => cache.add(url).catch(() => {}))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // No interceptar peticiones de la API, SSE, Vite HMR o Firestore en vivo
  if (
    url.includes('/api/') ||
    url.includes('firestore.googleapis.com') ||
    url.includes('googleapis.com') ||
    url.includes('/@vite/') ||
    url.includes('?v=') && url.includes('/node_modules/')
  ) {
    return;
  }

  // Network-first con respaldo en caché para navegación HTML y scripts/estilos
  if (
    event.request.mode === 'navigate' ||
    event.request.destination === 'document' ||
    event.request.destination === 'script' ||
    event.request.destination === 'style'
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone).catch(() => {});
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;
          if (event.request.mode === 'navigate') {
            const rootCached = await caches.match('/index.html') || await caches.match('/');
            if (rootCached) return rootCached;
          }
          return Response.error();
        })
    );
    return;
  }

  // Recursos estáticos (iconos, imágenes, fuentes): Network-first con caché de respaldo
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone).catch(() => {});
          });
        }
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

// Manejador del evento PUSH
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Wake Maintenance', body: event.data.text() };
    }
  }

  const title = data.title || 'Wake Maintenance';
  const options = {
    body: data.body || 'Nueva actualización del sistema',
    icon: data.icon || '/pwa-192x192.png',
    badge: data.badge || '/pwa-192x192.png',
    image: data.image || undefined,
    vibrate: [400, 120, 400, 120, 400],
    tag: data.tag || ('maint-push-' + Date.now()),
    data: data,
    renotify: true,
    requireInteraction: true,
    silent: false,
    dir: 'auto',
    lang: 'es',
    actions: [
      { action: 'open', title: '👀 Ver en la App' }
    ]
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Manejador del click en la notificación
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) ? event.notification.data.url : '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          if (client.navigate && targetUrl && targetUrl !== '/') {
            client.navigate(targetUrl).catch(() => {});
          }
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
