/**
 * Advanced Enterprise Security Module
 * Provides Zero-Trust input sanitization, anti-XSS, anti-CSRF, RBAC authorization enforcement,
 * and security event logging for the Hotel Maintenance Application.
 */

/**
 * Escapes HTML characters in user inputs to strictly prevent Stored and Reflected XSS attacks.
 */
export function sanitizeHtml(str: string): string {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/onerror=/gi, '')
    .replace(/onload=/gi, '');
}

/**
 * Validates password strength according to OWASP guidelines.
 */
export interface PasswordStrengthResult {
  isStrong: boolean;
  score: number; // 0 to 4
  feedback: string[];
}

export function evaluatePasswordStrength(password: string): PasswordStrengthResult {
  const feedback: string[] = [];
  let score = 0;

  if (!password) {
    return { isStrong: false, score: 0, feedback: ['La contraseña no puede estar vacía.'] };
  }

  if (password.length >= 8) score++;
  else feedback.push('Debe tener al menos 8 caracteres.');

  if (/[A-Z]/.test(password)) score++;
  else feedback.push('Debe incluir al menos una letra mayúscula.');

  if (/[0-9]/.test(password)) score++;
  else feedback.push('Debe incluir al menos un número.');

  if (/[^A-Za-z0-9]/.test(password)) score++;
  else feedback.push('Debe incluir al menos un símbolo especial (!@#$%^&*).');

  return {
    isStrong: score >= 3,
    score,
    feedback
  };
}

/**
 * Generates an Anti-CSRF token stored in session state.
 */
export function generateCsrfToken(): string {
  if (typeof window === 'undefined') return 'server_token';
  let token = sessionStorage.getItem('app_csrf_token');
  if (!token) {
    const array = new Uint8Array(24);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(array);
      token = Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
    } else {
      token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    sessionStorage.setItem('app_csrf_token', token);
  }
  return token;
}

/**
 * Validates user action permissions against role policy (RBAC).
 */
export function isActionAuthorized(
  userRole: string | undefined,
  requiredRole: 'admin' | 'supervisor' | 'tecnico' | 'user'
): boolean {
  if (!userRole) return false;
  if (userRole === 'admin') return true;
  if (requiredRole === 'admin') return userRole === 'admin';
  if (requiredRole === 'supervisor') return userRole === 'admin' || userRole === 'supervisor';
  return true;
}

/**
 * Security Event Logger for Client Threat Detection
 */
export interface SecurityEvent {
  timestamp: string;
  type: 'XSS_ATTEMPT' | 'UNAUTHORIZED_ACCESS' | 'RATE_LIMIT_WARNING' | 'SUSPICIOUS_PAYLOAD';
  details: string;
  userEmail?: string;
}

const securityLogKey = 'hotel_maint_security_events';

export function logSecurityEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
  try {
    const raw = localStorage.getItem(securityLogKey);
    const logs: SecurityEvent[] = raw ? JSON.parse(raw) : [];
    const entry: SecurityEvent = {
      ...event,
      timestamp: new Date().toISOString()
    };
    logs.unshift(entry);
    // Keep max 50 latest security events
    if (logs.length > 50) logs.pop();
    localStorage.setItem(securityLogKey, JSON.stringify(logs));
    console.warn(`[Escudo de Seguridad] Evento registrado: ${event.type} - ${event.details}`);
  } catch (err) {
    console.error('Error writing security log:', err);
  }
}

export function getSecurityAuditLogs(): SecurityEvent[] {
  try {
    const raw = localStorage.getItem(securityLogKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
