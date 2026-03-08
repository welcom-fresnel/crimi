/**
 * Contrôleur de gestion des journaux d'audit
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { auditService } from '../services/audit.service';

class AuditController {
  /**
   * Obtenir les journaux d'audit de l'utilisateur connecte
   */
  async getMyAuditLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const userId = req.user!.userId;

      const result = await auditService.getUserAuditLogs(userId, page, limit);

      res.status(200).json({
        success: true,
        data: result.auditLogs,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir tous les journaux d'audit
   */
  async getAllAuditLogs(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const filters = {
        userId: req.query.userId as string,
        entity: req.query.entity as string,
        action: req.query.action as string,
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
      };
      
      const result = await auditService.getAllAuditLogs(page, limit, filters);
      
      res.status(200).json({
        success: true,
        data: result.auditLogs,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir un journal d'audit par ID
   */
  async getAuditLogById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const auditLog = await auditService.getAuditLogById(id);
      
      res.status(200).json({
        success: true,
        data: auditLog,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir l'historique d'audit d'une entité
   */
  async getEntityAuditHistory(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { entity, entityId } = req.params;
      const auditLogs = await auditService.getEntityAuditHistory(entity, entityId);
      
      res.status(200).json({
        success: true,
        data: auditLogs,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const auditController = new AuditController();

