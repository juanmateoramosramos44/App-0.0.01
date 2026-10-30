# Actualización del Módulo de Horarios: Plantillas de Turno

## 1. Cambios Solicitados
- En el modal de asignación y edición de horarios ("Plantilla de Turno:"):
  1. Agregar **Vacaciones** (🏖️, 00:00 - 00:00).
  2. Agregar **Stay** (🏨, 00:00 - 00:00).
  3. Agregar **Cumpleaños** (🎂, 00:00 - 00:00).
  4. Quitar la opción **Intermedio** (Turno Intermedio duplicado).
  5. Conservar intactas las demás opciones: Mañana, Tarde, Noche, Jornada Intermedia (diurno), Horario Supervisor, Día de Descanso / Franco y Horario Personalizado.

## 2. Modificaciones Implementadas
- `src/types/index.ts`:
  - Se extendió el tipo `ShiftType` con `'vacaciones' | 'stay' | 'cumpleanos'`.
- `src/components/horarios/TechnicianSchedulesView.tsx`:
  - Se actualizaron las tarjetas visuales de selección rápida en `SHIFT_PRESETS`:
    - Incorporadas las tarjetas interactivas de **Vacaciones**, **Stay** y **Cumpleaños**.
    - Eliminada la tarjeta duplicada de **Intermedio**.
  - Se implementó `getShiftPreset` con soporte seguro de compatibilidad regresiva para horarios existentes.
  - Se actualizaron los cálculos de horas trabajadas y visualización en las matrices de cuadrícula y tarjetas.
- `src/utils/scheduleExportUtils.ts`:
  - Se configuraron los estilos, colores e insignias de exportación en PDF y Excel para **Vacaciones** (`VAC`), **Stay** (`STAY`) y **Cumpleaños** (`CUMP`).

## 3. Preservación Total
- Todos los 83 registros de rondas, inventarios, mantenimientos, usuarios y los 323 horarios guardados en la base de datos se mantienen 100% íntegros y protegidos.
