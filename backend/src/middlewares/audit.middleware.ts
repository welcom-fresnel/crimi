/**
 * Middleware pour l'audit automatique des actions
 */

import { Response, NextFunction } from 'express';
import { AuthRequest, AuditAction, EntityType } from '../types';
import { auditService } from '../services/audit.service';

/**
 * Middleware pour enregistrer les actions dans le journal d'audit
 * @param action - Type d'action effectuée
 * @param entity - Type d'entité concernée
 */
export const auditLog = (action: AuditAction, entity: EntityType) => {
  return async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Sauvegarder la méthode res.json originale
      const originalJson = res.json.bind(res);
      
      // Surcharger res.json pour capturer la réponse
      res.json = function (body: any): Response {
        // Si la requête a réussi (status 2xx), enregistrer l'audit
        if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
          // Extraire l'ID de l'entité depuis différentes sources
          const entityId = 
            req.params.id || 
            body?.data?.id || 
            body?.id;
          
          // Préparer les changements pour l'audit
          let changes: any = null;
          
          if (action === 'CREATE' && body?.data) {
            changes = { after: sanitizeData(body.data) };
          } else if (action === 'UPDATE' && req.body) {
            changes = { 
              before: sanitizeData((req as any).originalData || {}),
              after: sanitizeData(req.body) 
            };
          } else if (action === 'DELETE' && (req as any).originalData) {
            changes = { before: sanitizeData((req as any).originalData) };
          }
          
          // Enregistrer l'audit de manière asynchrone (ne pas bloquer la réponse)
          auditService.createAuditLog({
            userId: req.user.userId,
            action,
            entity,
            entityId,
            changes,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
          }).catch(error => {
            console.error('Erreur lors de l\'enregistrement de l\'audit:', error);
          });
        }
        
        return originalJson(body);
      };
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware pour sauvegarder les données originales avant modification/suppression
 */
export const saveOriginalData = (_entity: EntityType, getDataFn: Function) => {
  return async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const entityId = req.params.id;
      
      if (entityId) {
        const originalData = await getDataFn(entityId);
        (req as any).originalData = originalData;
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Fonction utilitaire pour sanitizer les données sensibles avant l'audit
 */
const sanitizeData = (data: any): any => {
  if (!data) return null;
  
  const sanitized = { ...data };
  
  // Supprimer les champs sensibles
  const sensitiveFields = ['password', 'token', 'secret'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
};

