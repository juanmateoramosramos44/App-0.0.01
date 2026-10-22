import { useEffect, useState, useCallback } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

let sharedDeferredPrompt: BeforeInstallPromptEvent | null =
  typeof window !== 'undefined' ? (window as any).__deferredPwaPrompt || null : null;

const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    sharedDeferredPrompt = e as BeforeInstallPromptEvent;
    (window as any).__deferredPwaPrompt = sharedDeferredPrompt;
    notifyListeners();
  });

  window.addEventListener('pwa-install-ready', () => {
    if ((window as any).__deferredPwaPrompt) {
      sharedDeferredPrompt = (window as any).__deferredPwaPrompt;
      notifyListeners();
    }
  });

  window.addEventListener('appinstalled', () => {
    sharedDeferredPrompt = null;
    (window as any).__deferredPwaPrompt = null;
    notifyListeners();
  });
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(
    () => sharedDeferredPrompt || (typeof window !== 'undefined' ? (window as any).__deferredPwaPrompt || null : null)
  );
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: window-controls-overlay)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');
      setIsInstalled(standalone);
    };

    checkStandalone();

    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isAndroidDevice = /android/.test(userAgent);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);
    setIsDesktop(!isIOSDevice && !isAndroidDevice);

    const syncState = () => {
      setDeferredPrompt(sharedDeferredPrompt || (window as any).__deferredPwaPrompt || null);
      checkStandalone();
    };

    listeners.add(syncState);
    syncState();

    const mql = window.matchMedia('(display-mode: standalone)');
    const handleMql = () => checkStandalone();
    if (mql.addEventListener) {
      mql.addEventListener('change', handleMql);
    }

    return () => {
      listeners.delete(syncState);
      if (mql.removeEventListener) {
        mql.removeEventListener('change', handleMql);
      }
    };
  }, []);

  const install = useCallback(async () => {
    const promptEvent = sharedDeferredPrompt || (window as any).__deferredPwaPrompt || deferredPrompt;
    if (!promptEvent) return false;
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        sharedDeferredPrompt = null;
        (window as any).__deferredPwaPrompt = null;
        setDeferredPrompt(null);
        setIsInstalled(true);
        notifyListeners();
        return true;
      }
    } catch (e) {
      console.warn('PWA prompt error:', e);
    }
    return false;
  }, [deferredPrompt]);

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    isAndroid,
    isDesktop,
    isInIframe,
    install,
  };
}
