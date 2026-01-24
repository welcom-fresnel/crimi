/**
 * Configuration des permissions par rôle
 */

import { RolePermissions } from '../types';

// Définition des permissions par rôle
export const ROLE_PERMISSIONS: RolePermissions = {
  ADMIN: [
    { resource: 'criminals', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'crime_types', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'roles', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'audit_logs', actions: ['read'] },
  ],
  AGENT: [
    { resource: 'criminals', actions: ['create', 'read', 'update'] },
    { resource: 'crime_types', actions: ['read'] },
    { resource: 'users', actions: ['read'] },
  ],
  VIEWER: [
    { resource: 'criminals', actions: ['read'] },
    { resource: 'crime_types', actions: ['read'] },
  ],
};

// Fonction pour vérifier si un rôle a une permission
export const hasPermission = (
  roles: string[],
  resource: string,
  action: string
): boolean => {
  return roles.some(role => {
    const permissions = ROLE_PERMISSIONS[role];
    if (!permissions) return false;
    
    return permissions.some(
      permission =>
        permission.resource === resource &&
        permission.actions.includes(action)
    );
  });
};

