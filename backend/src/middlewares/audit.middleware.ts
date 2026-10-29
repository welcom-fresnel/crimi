/**
 * Middleware pour l'audit automatique des actions
 */

import { Response, NextFunction } from 'express';
import { AuthRequest, AuditAction, EntityType } from '../types';
import { auditService } from '../services/audit.service';

const sensitiveFields = new Set(['password', 'token', 'secret', 'fingerprint', 'photo', 'lastknownaddress', 'phonenumber']);
const sanitizeData = (data: any): any => {
  if (Array.isArray(data)) return data.map(sanitizeData);
  if (!data || typeof data !== 'object') return data;
  return Object.fromEntries(Object.entries(data).map(([key, value]) => [key, sensitiveFields.has(key.toLowerCase()) ? '[MASQUÉ]' : sanitizeData(value)]));
};

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
      res.json = (async function (body: any): Promise<Response> {
        try {
        // Si la requête a réussi (status 2xx), enregistrer l'audit
        if (res.statusCode >= 200 && res.statusCode < 300 && req.user) {
          // Extraire l'ID de l'entité depuis différentes sources
          const entityId =
            req.params.evidenceId ||
            body?.data?.id ||
            req.params.id ||
            body?.id;
          
          // Préparer les changements pour l'audit
          let changes: any = null;
          
          if (action === 'CREATE' && body?.data) {
            changes = { id: body?.data?.id, fields: Object.keys(req.body || {}) };
          } else if (action === 'UPDATE' && req.body) {
            changes = { 
              before: sanitizeData((req as any).originalData || {}),
              after: sanitizeData(req.body) 
            };
          } else if (action === 'DELETE' && (req as any).originalData) {
            changes = { before: sanitizeData((req as any).originalData) };
          }
          
          // L'audit est confirmé avant l'envoi de la réponse HTTP.
          await auditService.createAuditLog({
            userId: req.user.userId,
            action,
            entity,
            entityId,
            changes,
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
          });
        }
        
        return originalJson(body);
        } catch (error) {
          next(error);
          return res;
        }
      }) as unknown as Response['json'];
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware pour sauvegarder les données originales avant modification/suppression
 */
export const saveOriginalData = (_entity: EntityType, getDataFn: (id: string) => Promise<unknown>, paramName = 'id') => {
  return async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const entityId = req.params[paramName];
      
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

