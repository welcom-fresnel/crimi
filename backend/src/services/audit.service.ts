/**
 * Service de gestion des journaux d'audit
 */

import { prisma } from '../utils/prisma';
import { Prisma } from '@prisma/client';
import { AuditLogData } from '../types';

class AuditService {
  /**
   * Créer un journal d'audit
   */
  async createAuditLog(data: AuditLogData) {
    const auditLog = await prisma.auditLog.create({
      data: {
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        changes: data.changes ? (data.changes as Prisma.InputJsonValue) : Prisma.JsonNull,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    });

    return auditLog;
  }

  /**
   * Obtenir tous les journaux d'audit avec pagination
   */
  async getAllAuditLogs(page = 1, limit = 10, filters?: {
    userId?: string;
    entity?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const skip = (page - 1) * limit;
    
    // Construire les conditions de filtrage
    const where: any = {};

    if (filters?.userId) {
      where.userId = filters.userId;
    }

    if (filters?.entity) {
      where.entity = filters.entity;
    }

    if (filters?.action) {
      where.action = filters.action;
    }

    if (filters?.startDate || filters?.endDate) {
      where.timestamp = {};
      
      if (filters.startDate) {
        where.timestamp.gte = filters.startDate;
      }
      
      if (filters.endDate) {
        where.timestamp.lte = filters.endDate;
      }
    }

    const [auditLogs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              username: true,
              profile: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
        },
        orderBy: {
          timestamp: 'desc',
        },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      auditLogs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Obtenir un journal d'audit par ID
   */
  async getAuditLogById(id: string) {
    const auditLog = await prisma.auditLog.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            username: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                service: true,
              },
            },
          },
        },
      },
    });

    return auditLog;
  }

  /**
   * Obtenir l'historique d'audit d'une entité spécifique
   */
  async getEntityAuditHistory(entity: string, entityId: string) {
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        entity,
        entityId,
      },
      include: {
        user: {
          select: {
            username: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    return auditLogs;
  }
}

export const auditService = new AuditService();

