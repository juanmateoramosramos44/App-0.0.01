import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initSafeStorage } from './utils/safeStorage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

try {
  initSafeStorage();
} catch (e) {
  console.warn('initSafeStorage warning:', e);
}

// Sanitizar localStorage ante posibles datos corruptos que causen pantallas en blanco
try {
  ['hotel_maint_current_user', 'hotel_maint_users'].forEach(key => {
    const val = localStorage.getItem(key);
    if (val) {
      try {
        JSON.parse(val);
      } catch {
        localStorage.removeItem(key);
      }
    }
  });
} catch {}

// Limpieza de Service Workers y cachés obsoletas
if (typeof window !== 'undefined') {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (const registration of registrations) {
        registration.unregister().catch(() => {});
      }
    }).catch(() => {});
  }
  if ('caches' in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    }).catch(() => {});
  }
}

// Global fail-safe error handlers
window.addEventListener('error', (event) => {
  console.error('Global window error caught:', event.error);
  const root = document.getElementById('root');
  if (root) {
    root.innerHTML = `
      <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #070c18; color: white; padding: 20px; font-family: sans-serif; text-align: center;">
        <div style="background: #0f172a; border: 1px solid rgba(56,189,248,0.3); padding: 28px; border-radius: 20px; max-width: 420px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8);">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #f8fafc;">Mantenimiento Hotelero</h2>
          <p style="font-size: 13px; color: #94a3b8; margin-bottom: 20px;">La aplicación se ha recuperado de un error de carga.</p>
          <button onclick="localStorage.clear(); window.location.reload();" style="width: 100%; background: #0284c7; color: white; border: none; padding: 12px 16px; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 13px; transition: background 0.2s;">Reiniciar Aplicación</button>
        </div>
      </div>
    `;
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.warn('Global unhandled rejection:', event.reason);
});

const rootElement = document.getElementById('root');
if (rootElement) {
  try {
    createRoot(rootElement).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  } catch (err: any) {
    console.error('Fatal render error:', err);
    rootElement.innerHTML = `
      <div style="min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #070c18; color: white; padding: 20px; font-family: sans-serif; text-align: center;">
        <div style="background: #0f172a; border: 1px solid rgba(56,189,248,0.3); padding: 28px; border-radius: 20px; max-width: 420px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.8);">
          <h2 style="font-size: 18px; font-weight: bold; margin-bottom: 8px; color: #f8fafc;">Mantenimiento Hotelero</h2>
          <p style="font-size: 13px; color: #94a3b8; margin-bottom: 20px;">Pulsa el botón para iniciar la plataforma.</p>
          <button onclick="localStorage.clear(); window.location.reload();" style="width: 100%; background: #0284c7; color: white; border: none; padding: 12px 16px; border-radius: 12px; font-weight: bold; cursor: pointer; font-size: 13px;">Iniciar Aplicación</button>
        </div>
      </div>
    `;
  }
}
