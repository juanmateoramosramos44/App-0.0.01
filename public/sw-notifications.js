// public/sw-notifications.js
// Service Worker para Notificaciones Push del Sistema Operativo en Segundo Plano
// Permite recibir alertas instantáneas (rondas, solicitudes, tareas) con la app cerrada o pantalla apagada.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Manejador del evento PUSH (cuando el servidor envía una notificación web push)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Mantenimiento Hotelero', body: event.data.text() };
    }
  }

  const title = data.title || 'Mantenimiento Hotelero & Bombas';
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
      // 1. Si ya hay una ventana o pestaña abierta, enfocarla y navegar a la pestaña solicitada
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if ('focus' in client) {
          if (client.navigate && targetUrl && targetUrl !== '/') {
            client.navigate(targetUrl).catch(() => {});
          }
          return client.focus();
        }
      }
      // 2. Si la app estaba completamente cerrada, abrir una nueva ventana con la URL correspondiente
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Sincronización periódica en segundo plano
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'maint-sync') {
    event.waitUntil(Promise.resolve());
  }
});
