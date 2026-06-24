
export function deriveRoleFromEnv(userId) {
  if (!userId) return 'anonymous';
  const admins = splitIds(process.env.APP_ADMIN_USER_IDS);
  const managers = splitIds(process.env.APP_MANAGER_USER_IDS);
  const dispatchers = splitIds(process.env.APP_DISPATCHER_USER_IDS);
  const technicians = splitIds(process.env.APP_TECHNICIAN_USER_IDS);

  if (admins.includes(userId)) return 'admin';
  if (managers.includes(userId)) return 'manager';
  if (dispatchers.includes(userId)) return 'dispatcher';
  if (technicians.includes(userId)) return 'techniker';
  return 'dispatcher';
}

function splitIds(raw = '') {
  return raw.split(',').map((entry) => entry.trim()).filter(Boolean);
}

export function hasRole(viewer, ...roles) {
  return roles.includes(viewer?.role);
}

export function fail(statusCode, code, message, details = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  error.details = details;
  return error;
}

export function assertAuthenticated(viewer) {
  if (!viewer?.userId) throw fail(401, 'AUTH_REQUIRED', 'Nicht authentifiziert.');
}

export function assertRole(viewer, roles, message = 'Für diese Aktion fehlen Berechtigungen.') {
  assertAuthenticated(viewer);
  if (!roles.includes(viewer.role)) throw fail(403, 'ROLE_FORBIDDEN', message, { role: viewer.role, required: roles });
}


export function canSeeActivityEntry(viewer, entry) {
  if (!entry?.visibility || entry.visibility === 'all') return true;
  if (entry.visibility === 'office') return viewer?.role !== 'techniker';
  return entry.actor === viewer?.name || entry.handoffTo === viewer?.name;
}

export function canManageCustomers(viewer) {
  return hasRole(viewer, 'admin', 'manager', 'dispatcher');
}

export function canPlanServices(viewer) {
  return hasRole(viewer, 'admin', 'manager', 'dispatcher');
}

export function canEditTask(viewer, task) {
  if (hasRole(viewer, 'admin', 'manager', 'dispatcher')) return true;
  return viewer?.role === 'techniker' && task?.assignee === viewer.name;
}

export function canEditService(viewer, service) {
  if (hasRole(viewer, 'admin', 'manager', 'dispatcher')) return true;
  return viewer?.role === 'techniker' && service?.assignee === viewer.name;
}
