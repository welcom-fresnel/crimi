import { ROLE_PERMISSIONS } from '../config/permissions';
import { prisma } from '../utils/prisma';
import { Prisma } from '@prisma/client';
import { auditService } from './audit.service';

type Permission = { resource: string; actions: string[] };

let cachedPermissions: Record<string, Permission[]> | null = null;
let cacheExpiresAt = 0;

export const invalidatePermissionsCache = (): void => {
  cachedPermissions = null;
  cacheExpiresAt = 0;
};

export const hasRolePermission = (roles: string[], resource: string, action: string): boolean => {
  if (!cachedPermissions || Date.now() >= cacheExpiresAt) {
    cachedPermissions = ROLE_PERMISSIONS as Record<string, Permission[]>;
    cacheExpiresAt = Date.now() + 60_000;
  }
  return roles.some((role) => cachedPermissions?.[role]?.some((permission) =>
    permission.resource === resource && permission.actions.includes(action)));
};

export const getMergedPermissions = (roles: string[]): Permission[] => {
  const merged = new Map<string, Set<string>>();
  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role] || []) {
      const actions = merged.get(permission.resource) || new Set<string>();
      permission.actions.forEach((action) => actions.add(action));
      merged.set(permission.resource, actions);
    }
  }
  return Array.from(merged, ([resource, actions]) => ({ resource, actions: Array.from(actions) }));
};

export const synchronizeRolePermissions = async (roleId: string, roleName: keyof typeof ROLE_PERMISSIONS, actorId: string): Promise<void> => {
  const permissions = ROLE_PERMISSIONS[roleName];
  await prisma.role.update({ where: { id: roleId }, data: { permissions: permissions as unknown as Prisma.InputJsonValue } });
  await auditService.createAuditLog({ userId: actorId, action: 'UPDATE', entity: 'ROLE', entityId: roleId, changes: { permissions } });
  invalidatePermissionsCache();
};
