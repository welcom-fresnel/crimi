import { afterAll, describe, expect, it } from 'vitest';
import { auditService } from '../src/services/audit.service';
import { prisma } from '../src/utils/prisma';

describe('chaîne d’audit B2', () => {
  afterAll(async () => prisma.$disconnect());

  it('détecte une chaîne valide puis une entrée altérée', async () => {
    const entry = await auditService.createAuditLog({
      action: 'VIEW',
      entity: 'CRIMINAL',
      entityId: `test-${Date.now()}`,
      changes: { criteria: { page: 1 }, resultCount: 0 },
    });
    expect((await auditService.verifyChain()).valid).toBe(true);

    try {
      await prisma.auditLog.update({ where: { id: entry.id }, data: { changes: { tampered: true } } });
      const result = await auditService.verifyChain();
      expect(result.valid).toBe(false);
      expect(result.firstInvalid?.id).toBe(entry.id);
    } finally {
      // La base de test reste réutilisable après la vérification d’altération.
      await prisma.auditLog.update({ where: { id: entry.id }, data: { changes: entry.changes as any } });
    }
  });
});
