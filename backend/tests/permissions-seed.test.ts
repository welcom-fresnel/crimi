import { afterAll, describe, expect, it } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { ROLE_PERMISSIONS } from '../src/config/permissions';

const prisma = new PrismaClient();

afterAll(async () => prisma.$disconnect());

describe('permissions du seed', () => {
  it('conserve en base les permissions définies dans ROLE_PERMISSIONS', async () => {
    for (const [name, permissions] of Object.entries(ROLE_PERMISSIONS)) {
      const role = await prisma.role.findUnique({ where: { name }, select: { permissions: true } });
      expect(role, `Le rôle ${name} doit exister; exécutez le seed`).not.toBeNull();
      expect(role!.permissions).toEqual(permissions);
    }
  });
});
