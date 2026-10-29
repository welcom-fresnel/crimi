/**
 * Middleware d'authentification JWT
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JwtPayload } from '../types';
import { config } from '../config';
import { ApiError } from '../utils/ApiError';
import { prisma } from '../utils/prisma';
import { hasRolePermission } from '../services/permission.service';
import { auditService } from '../services/audit.service';

/**
 * Middleware pour vérifier le token JWT
 */
export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Récupérer le token depuis le header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new ApiError(401, 'Token d\'authentification manquant');
    }
    
    const token = authHeader.substring(7); // Retirer "Bearer "
    
    // Vérifier et décoder le token
    const decoded = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] }) as JwtPayload;
    
    // Vérifier si l'utilisateur existe et est actif
    const user = await (prisma.user as any).findUnique({
      where: { id: decoded.userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
    
    if (!user || !user.isActive) {
      throw new ApiError(401, 'Utilisateur non autorisé');
    }
    
    // Attacher les informations de l'utilisateur à la requête
    req.user = {
      userId: user.id,
      username: user.username,
      email: user.email,
      roles: user.userRoles.map((ur: any) => ur.role.name),
      mustChangePassword: user.mustChangePassword,
    };

    const allowedDuringPasswordChange = ['/api/auth/change-password', '/api/auth/profile', '/api/auth/logout'];
    if (user.mustChangePassword && !allowedDuringPasswordChange.some((route) => req.originalUrl.split('?')[0] === route)) {
      throw new ApiError(403, 'Vous devez modifier votre mot de passe avant de continuer', 'PASSWORD_CHANGE_REQUIRED');
    }
    
    next();
  } catch (error) {
    let deniedError: unknown = error;
    if (error instanceof jwt.TokenExpiredError) {
      deniedError = new ApiError(401, 'Token expiré');
    } else if (error instanceof jwt.JsonWebTokenError) {
      deniedError = new ApiError(401, 'Token invalide');
    }
    if (deniedError instanceof ApiError && (deniedError.statusCode === 401 || deniedError.statusCode === 403)) {
      try { await auditDenied(req, deniedError); } catch (auditError) { next(auditError); return; }
    }
    next(deniedError);
  }
};
/**
 * Middleware pour vérifier les permissions basées sur les rôles
 * @param resource - Ressource à accéder (ex: 'criminals')
 * @param action - Action à effectuer (ex: 'create', 'read', 'update', 'delete')
 */
export const authorize = (resource: string, action: string) => {
  return async (
    req: AuthRequest,
    _res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!req.user) {
        throw new ApiError(401, 'Utilisateur non authentifié');
      }
      
      const { roles } = req.user;
      // Vérifier les permissions
      const hasPermission = hasRolePermission(roles, resource, action);
      
      if (!hasPermission) {
        throw new ApiError(
          403,
          `Vous n'avez pas la permission d'effectuer cette action`
        );
      }
      
      next();
    } catch (error) {
      if (error instanceof ApiError && (error.statusCode === 401 || error.statusCode === 403)) {
        try { await auditDenied(req, error); } catch (auditError) { next(auditError); return; }
      }
      next(error);
    }
  };
};

const auditDenied = async (req: AuthRequest, error: ApiError) => auditService.createAuditLog({
  userId: req.user?.userId,
  action: 'DENIED', entity: 'USER', entityId: req.user?.userId,
  changes: { status: error.statusCode, reason: error.message },
  ipAddress: req.ip || req.connection.remoteAddress, userAgent: req.headers['user-agent'],
});
