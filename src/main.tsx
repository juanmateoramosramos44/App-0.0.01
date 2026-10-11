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
  ['hotel_maint_current_user', 'hotel_maint_users', 'hotel_maint_settings'].forEach(key => {
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

// Global fail-safe logging without destroying the React root DOM
window.addEventListener('error', (event) => {
  console.warn('Global window error intercepted:', event.error || event.message);
});

window.addEventListener('unhandledrejection', (event) => {
  console.warn('Global unhandled rejection intercepted:', event.reason);
});

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <ErrorBoundary sectionTitle="la Aplicación">
        <App />
      </ErrorBoundary>
    </StrictMode>,
  );
}
