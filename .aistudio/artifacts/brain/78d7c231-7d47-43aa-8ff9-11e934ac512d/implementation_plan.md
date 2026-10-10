# Plan - Fix Blank Screen on Login

## Problem Analysis
When the user logs in, the application transitions from `LoginView` to `AppContent` inside `App.tsx`. During or immediately after authentication state restoration (`MaintenanceContext`), a synchronous exception or unhandled promise rejection occurs (likely related to user storage parsing, permissions, or initial tabs selection), causing React to fail rendering and resulting in a blank white screen without hitting the error boundary.

## Proposed Changes

### 1. Robust Error Boundary around Login and AppContent in `App.tsx`
- Wrap the entire authentication flow and main application view in a dedicated try/catch and fallback error boundary UI inside `App.tsx`.
- Ensure that if `currentUser` is set or cleared, any state initialization failure catches the error cleanly and presents a recovery button (e.g. "Reiniciar sesión / Limpiar caché") instead of a blank screen.

### 2. Safeguard User Session & Permissions in `MaintenanceContext.tsx`
- Add rigorous try/catch blocks around `currentUser` retrieval from `localStorage` and `sessionStorage`.
- Fallback safely to default admin or null if user data is corrupted or malformed.
- Ensure `selectedTab` defaults to a valid allowed section without throwing exceptions when permissions are evaluated on login.

### 3. Verify & Test
- Run `compile_applet` and `lint_applet` to guarantee clean TypeScript build.
- Test login flow resilience.
