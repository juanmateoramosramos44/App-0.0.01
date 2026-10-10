import { useState, useEffect } from 'react';

export interface DeviceInfo {
  isMobile: boolean;        // true si es teléfono o pantalla móvil (< 768px)
  isPhone: boolean;         // true si es pantalla angosta de smartphone (< 640px)
  isTablet: boolean;        // true si es tablet (>= 640px y < 1024px)
  isDesktop: boolean;       // true si es computador / pantalla amplia (>= 1024px)
  isTouchDevice: boolean;   // true si tiene pantalla táctil
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  deviceType: 'mobile' | 'tablet' | 'desktop';
}

function getInitialDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isPhone: false,
      isTablet: false,
      isDesktop: true,
      isTouchDevice: false,
      screenWidth: 1200,
      screenHeight: 800,
      orientation: 'landscape',
      deviceType: 'desktop'
    };
  }

  const width = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth || 1024;
  const height = window.innerHeight || document.documentElement.clientHeight || document.body.clientHeight || 768;
  const userAgent = navigator.userAgent || '';
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  const isPhone = width < 640 || (isMobileUA && width < 768);
  const isTablet = (width >= 640 && width < 1024) || (/iPad|tablet/i.test(userAgent) && width < 1024);
  const isMobile = width < 768 || (isMobileUA && width < 1024);
  const isDesktop = !isMobile;

  return {
    isMobile,
    isPhone,
    isTablet,
    isDesktop,
    isTouchDevice: isTouch,
    screenWidth: width,
    screenHeight: height,
    orientation: width > height ? 'landscape' : 'portrait',
    deviceType: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop'
  };
}

export function useDeviceDetection(): DeviceInfo {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(getInitialDeviceInfo);

  useEffect(() => {
    const updateDevice = () => {
      setDeviceInfo(getInitialDeviceInfo());
    };

    updateDevice();

    window.addEventListener('resize', updateDevice);
    window.addEventListener('orientationchange', updateDevice);

    return () => {
      window.removeEventListener('resize', updateDevice);
      window.removeEventListener('orientationchange', updateDevice);
    };
  }, []);

  return deviceInfo;
}
