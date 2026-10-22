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

// Disparo y captura automática del evento de instalación PWA (beforeinstallprompt) para descargar al teléfono
if (typeof window !== 'undefined') {
  let hasAutoPrompted = false;

  const isStandalone = () => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  };

  const triggerAutoPrompt = async (promptEvt: any) => {
    if (hasAutoPrompted || isStandalone()) return;
    try {
      if (promptEvt && typeof promptEvt.prompt === 'function') {
        hasAutoPrompted = true;
        await promptEvt.prompt();
      }
    } catch (err) {
      console.warn('Auto install prompt warning:', err);
    }
  };

  window.addEventListener('beforeinstallprompt', (e) => {
    (window as any).__deferredPwaPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-install-ready'));

    if (!isStandalone()) {
      // Disparo automático después de que cargue la interfaz
      setTimeout(() => {
        triggerAutoPrompt((window as any).__deferredPwaPrompt || e);
      }, 1000);

      // Si el navegador móvil exige interacción previa para mostrar el modal nativo, se lanza en el primer toque
      const onUserTouch = () => {
        triggerAutoPrompt((window as any).__deferredPwaPrompt || e);
        window.removeEventListener('touchstart', onUserTouch);
        window.removeEventListener('click', onUserTouch);
      };
      window.addEventListener('touchstart', onUserTouch, { passive: true, once: true });
      window.addEventListener('click', onUserTouch, { once: true });
    }
  });

  window.addEventListener('appinstalled', () => {
    (window as any).__deferredPwaPrompt = null;
  });

  if ('serviceWorker' in navigator) {
    const registerSW = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          registration.update().catch(() => {});
        })
        .catch((err) => {
          console.warn('SW registration info:', err);
        });
    };

    if (document.readyState === 'complete') {
      registerSW();
    } else {
      window.addEventListener('load', registerSW);
    }
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
