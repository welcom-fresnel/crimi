/** Service de journalisation et de vérification de la chaîne d'audit. */
import { createHash } from 'crypto';
import { prisma } from '../utils/prisma';
import { Prisma } from '@prisma/client';
import { AuditLogData } from '../types';

const canonicalize = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a < b ? -1 : a > b ? 1 : 0).map(([key, item]) => [key, canonicalize(item)]));
  }
  return value;
};

const entryContent = (entry: AuditLogData, timestamp: Date) => canonicalize({
  userId: entry.userId ?? null, action: entry.action, entity: entry.entity, entityId: entry.entityId ?? null,
  changes: entry.changes ?? null, ipAddress: entry.ipAddress ?? null, userAgent: entry.userAgent ?? null,
  timestamp: timestamp.toISOString(),
});

class AuditService {
  async createAuditLog(data: AuditLogData) {
    return prisma.$transaction(async (tx) => {
      // pg_advisory_xact_lock renvoie void; retourner un booléen évite que Prisma tente de désérialiser ce type.
      await tx.$queryRaw<Array<{ locked: boolean }>>`SELECT pg_advisory_xact_lock(621984732) IS NULL AS locked`;
      const previous: any = await (tx as any).auditLog.findFirst({ where: { hash: { not: null } }, orderBy: [{ timestamp: 'desc' }, { id: 'desc' }] });
      const now = new Date();
      const timestamp = previous && now <= previous.timestamp ? new Date(previous.timestamp.getTime() + 1) : now;
      const previousHash = previous?.hash ?? null;
      const hash = createHash('sha256').update(`${previousHash ?? ''}${JSON.stringify(entryContent(data, timestamp))}`).digest('hex');
      return (tx as any).auditLog.create({ data: {
        userId: data.userId ?? null, action: data.action, entity: data.entity, entityId: data.entityId,
        changes: data.changes ? (canonicalize(data.changes) as Prisma.InputJsonValue) : Prisma.JsonNull,
        ipAddress: data.ipAddress, userAgent: data.userAgent, timestamp, previousHash, hash,
      } });
    });
  }

  async verifyChain() {
    const entries: any[] = await (prisma.auditLog as any).findMany({ where: { hash: { not: null } }, orderBy: [{ timestamp: 'asc' }, { id: 'asc' }] });
    const legacyEntries = await prisma.auditLog.count({ where: { hash: null } } as any);
    let previousHash: string | null = null;
    for (const entry of entries) {
      const content = entryContent({ userId: entry.userId ?? undefined, action: entry.action as AuditLogData['action'], entity: entry.entity as AuditLogData['entity'], entityId: entry.entityId ?? undefined, changes: entry.changes as Record<string, any> | undefined, ipAddress: entry.ipAddress ?? undefined, userAgent: entry.userAgent ?? undefined }, entry.timestamp);
      const expected = createHash('sha256').update(`${previousHash ?? ''}${JSON.stringify(content)}`).digest('hex');
      if (entry.previousHash !== previousHash || entry.hash !== expected) return { valid: false, firstInvalid: entry };
      previousHash = entry.hash;
    }
    return { valid: true, firstInvalid: null, entriesChecked: entries.length, legacyEntriesIgnored: legacyEntries };
  }

  async getAllAuditLogs(page = 1, limit = 10, filters?: { userId?: string; entity?: string; action?: string; startDate?: Date; endDate?: Date }) {
    const skip = (page - 1) * limit;
    const where: Prisma.AuditLogWhereInput = {};
    if (filters?.userId) where.userId = filters.userId;
    if (filters?.entity) where.entity = filters.entity;
    if (filters?.action) where.action = filters.action;
    if (filters?.startDate || filters?.endDate) where.timestamp = { gte: filters.startDate, lte: filters.endDate };
    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, skip, take: limit, include: { user: { select: { username: true, profile: { select: { firstName: true, lastName: true } } } } }, orderBy: { timestamp: 'desc' } }),
      prisma.auditLog.count({ where }),
    ]);
    return { auditLogs, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }
  async getUserAuditLogs(userId: string, page = 1, limit = 50) { return this.getAllAuditLogs(page, limit, { userId }); }
  async getAuditLogById(id: string) { return prisma.auditLog.findUnique({ where: { id }, include: { user: { select: { username: true, email: true, profile: true } } } }); }
  async getEntityAuditHistory(entity: string, entityId: string) { return prisma.auditLog.findMany({ where: { entity, entityId }, include: { user: { select: { username: true, profile: true } } }, orderBy: { timestamp: 'desc' } }); }
}
export const auditService = new AuditService();
