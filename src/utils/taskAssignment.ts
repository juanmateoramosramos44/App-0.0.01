import type { MaintenanceTask, User } from '../types';

/**
 * Determina si el usuario tiene rol de Administrador o permisos de administración global
 */
export const isTaskAdmin = (user?: User | null): boolean => {
  if (!user) return false;
  const email = (user.email || '').toLowerCase().trim();
  return (
    user.role === 'admin' ||
    email === 'juanmateoramosramos44@gmail.com' ||
    user.id === 'usr-1789230683226'
  );
};

/**
 * Normaliza nombres eliminando tildes, sufijos de rol y caracteres especiales
 */
export const normalizeTechName = (name?: string | null): string => {
  if (!name) return '';
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\/(técnico|tecnico|admin|supervisor|mantenimiento|personal|sastra|cocina|ayb|housekeeping)/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
};

/**
 * Verifica si una tarea está asignada específicamente al usuario indicado
 */
export const isTaskAssignedToUser = (task: MaintenanceTask, user?: User | null): boolean => {
  if (!task || !user) return false;

  // 1. Coincidencia directa por ID de usuario
  if (task.assignedToId && (task.assignedToId === user.id || task.assignedToId === user.email)) {
    return true;
  }

  // 2. Si la tarea fue asignada a "Todo el equipo" / "General" / "Todos"
  const assignedRaw = (task.assignedToName || '').toLowerCase().trim();
  if (
    assignedRaw === 'todos' ||
    assignedRaw === 'todo el equipo' ||
    assignedRaw.includes('todo el equipo') ||
    assignedRaw === 'general'
  ) {
    return true;
  }

  // 3. Coincidencia por nombre normalizado
  const taskNameNorm = normalizeTechName(task.assignedToName);
  const userNameNorm = normalizeTechName(user.displayName || user.name);

  if (taskNameNorm && userNameNorm) {
    if (taskNameNorm === userNameNorm) return true;

    const taskWords = taskNameNorm.split(' ').filter(w => w.length > 2);
    const userWords = userNameNorm.split(' ').filter(w => w.length > 2);

    if (taskWords.length > 0 && userWords.length > 0) {
      if (taskNameNorm.includes(userNameNorm) || userNameNorm.includes(taskNameNorm)) {
        // En nombres compuestos (e.g. "Ferney Machado" vs "Ferney Alonso"), garantizar que no coincida solo el primer nombre
        if (taskWords.length >= 2 && userWords.length >= 2) {
          const matchCount = taskWords.filter(tw => userWords.includes(tw)).length;
          return matchCount >= 2;
        }
        return true;
      }
    }
  }

  // 4. Si assignedToId contiene el nombre del usuario
  if (task.assignedToId && userNameNorm) {
    const assignedIdNorm = normalizeTechName(task.assignedToId);
    if (assignedIdNorm === userNameNorm) return true;
  }

  return false;
};

/**
 * Determina si la tarea debe ser visible para el usuario en el módulo de tareas
 * - El Administrador ve todas las tareas por igual.
 * - Los demás usuarios solo ven las tareas asignadas específicamente a ellos (o creadas por ellos).
 */
export const isTaskVisibleToUser = (task: MaintenanceTask, user?: User | null): boolean => {
  if (!task) return false;
  if (!user) return false;
  if (isTaskAdmin(user)) return true;

  const isAssigned = isTaskAssignedToUser(task, user);
  const isCreator = Boolean(
    (task.createdById && task.createdById === user.id) ||
    (user.displayName && (task.createdByName || '').toLowerCase().trim() === user.displayName.toLowerCase().trim())
  );

  return isAssigned || isCreator;
};
