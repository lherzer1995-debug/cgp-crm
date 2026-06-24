import type { AppRole } from '../data/app-store';

export interface RoleViewer {
  role: AppRole;
  name?: string;
  email?: string;
  userId?: string | null;
}

export function hasAnyRole(viewer: RoleViewer, roles: AppRole[]) {
  return roles.includes(viewer.role);
}

export function isPlanner(viewer: RoleViewer) {
  return hasAnyRole(viewer, ['admin', 'manager', 'dispatcher']);
}

export function isManagerial(viewer: RoleViewer) {
  return hasAnyRole(viewer, ['admin', 'manager']);
}

export function isFieldTechnician(viewer: RoleViewer) {
  return viewer.role === 'techniker';
}

export function canCreateCustomer(viewer: RoleViewer) {
  return isPlanner(viewer);
}

export function canCreateTask(viewer: RoleViewer) {
  return isPlanner(viewer);
}

export function canPlanService(viewer: RoleViewer) {
  return isPlanner(viewer);
}

export function canEditSettings(viewer: RoleViewer) {
  return isManagerial(viewer);
}

export function roleLabel(role: AppRole) {
  return {
    admin: 'Admin',
    manager: 'Serviceleitung',
    dispatcher: 'Disposition',
    techniker: 'Techniker',
    anonymous: 'Gast',
  }[role];
}

export function roleDescription(role: AppRole) {
  return {
    admin: 'volle Systemkontrolle, Richtlinien und Betriebsstatus',
    manager: 'Teamsteuerung, Qualität und operative Freigaben',
    dispatcher: 'Einsatzplanung, Triage und Koordination',
    techniker: 'eigene Einsätze, Rückmeldungen und Abschlussarbeit',
    anonymous: 'keine freigeschalteten Aktionen',
  }[role];
}

export function roleHomeLabel(role: AppRole) {
  return {
    admin: 'Systemlage',
    manager: 'Teamlage',
    dispatcher: 'Dispositionslage',
    techniker: 'Mein Arbeitstag',
    anonymous: 'Übersicht',
  }[role];
}

export function canSeeActivityEntry(viewer: RoleViewer, entry: { visibility?: 'all' | 'office' | 'assignee'; actor?: string; handoffTo?: string }) {
  if (!entry.visibility || entry.visibility === 'all') return true;
  if (entry.visibility === 'office') return !isFieldTechnician(viewer);
  return entry.actor === viewer.name || entry.handoffTo === viewer.name;
}

export function canAccessOps(viewer: RoleViewer) {
  return isManagerial(viewer);
}
