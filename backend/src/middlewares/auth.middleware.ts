/**
 * Middleware d'authentification JWT
 */

import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AuthRequest, JwtPayload } from '../types';
import { config } from '../config';
import { ApiError } from '../utils/ApiError';
import { prisma } from '../utils/prisma';

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
    const decoded = jwt.verify(token, config.jwtSecret) as JwtPayload;
    
    // Vérifier si l'utilisateur existe et est actif
    const user = await prisma.user.findUnique({
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
      roles: user.userRoles.map(ur => ur.role.name),
    };
    
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new ApiError(401, 'Token invalide'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new ApiError(401, 'Token expiré'));
    } else {
      next(error);
    }
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
      const hasPermission = await checkPermission(roles, resource, action);
      
      if (!hasPermission) {
        throw new ApiError(
          403,
          `Vous n'avez pas la permission d'effectuer cette action`
        );
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Fonction utilitaire pour vérifier les permissions
 */
const checkPermission = async (
  roles: string[],
  resource: string,
  action: string
): Promise<boolean> => {
  // Récupérer les rôles avec leurs permissions
  const rolesWithPermissions = await prisma.role.findMany({
    where: {
      name: {
        in: roles,
      },
    },
  });
  
  // Vérifier si au moins un rôle a la permission
  return rolesWithPermissions.some(role => {
    const permissions = role.permissions as any[];
    return permissions.some(
      (permission: any) =>
        permission.resource === resource &&
        permission.actions.includes(action)
    );
  });
};

