/**
 * Contrôleur d'authentification
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { authService } from '../services/auth.service';
import { auditService } from '../services/audit.service';
import { prisma } from '../utils/prisma';
import bcrypt from 'bcryptjs';
import { getMergedPermissions } from '../services/permission.service';

class AuthController {
  /**
   * Inscription d'un nouvel utilisateur
   */
  async register(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const user = await authService.register(req.body);
      
      res.status(201).json({
        success: true,
        message: 'Utilisateur créé avec succès',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Connexion d'un utilisateur
   */
  async login(req: AuthRequest, res: Response, next: NextFunction) {
    let authenticated = false;
    try {
      const result = await authService.login(req.body);
      authenticated = true;
      
      // Enregistrer l'audit de connexion
      if (result.user.id) {
        await auditService.createAuditLog({
          userId: result.user.id,
          action: 'LOGIN',
          entity: 'USER',
          entityId: result.user.id,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Connexion réussie',
        data: result,
      });
    } catch (error) {
      if (authenticated) { next(error); return; }
      const username = req.body?.username;
      const user = username ? await (prisma.user as any).findUnique({ where: { username }, select: { id: true, password: true, isActive: true, lockedUntil: true } }) : null;
      const validPassword = user ? await bcrypt.compare(req.body.password || '', user.password) : false;
      const reason = !user ? 'Utilisateur inconnu' : user.lockedUntil && user.lockedUntil > new Date() ? 'Compte temporairement verrouillé' : !user.isActive ? 'Compte désactivé' : !validPassword ? 'Mot de passe incorrect' : 'Échec de connexion';
      try {
        await auditService.createAuditLog({ userId: user?.id, action: 'LOGIN', entity: 'USER', entityId: user?.id, changes: { result: 'Échec', reason }, ipAddress: req.ip, userAgent: req.headers['user-agent'] });
      } catch (auditError) { next(auditError); return; }
      next(error);
    }
  }

  /**
   * Déconnexion d'un utilisateur
   */
  async logout(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      if (req.user) {
        await auditService.createAuditLog({
          userId: req.user.userId,
          action: 'LOGOUT',
          entity: 'USER',
          entityId: req.user.userId,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers['user-agent'],
        });
      }
      
      res.status(200).json({
        success: true,
        message: 'Déconnexion réussie',
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir le profil de l'utilisateur connecté
   */
  async getProfile(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Non authentifié',
        });
        return;
      }

      // Récupérer les informations complètes de l'utilisateur
      const { prisma } = require('../utils/prisma');
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          username: true,
          email: true,
          isActive: true,
          mustChangePassword: true,
          createdAt: true,
          profile: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      const roles = (user?.userRoles || []).map((userRole: any) => userRole.role.name);
      
      res.status(200).json({
        success: true,
        data: {
          ...user,
          mustChangePassword: Boolean(user?.mustChangePassword),
          permissions: getMergedPermissions(roles),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Changer le mot de passe
   */
  async changePassword(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const { oldPassword, newPassword } = req.body;
      
      if (!userId) {
        res.status(401).json({
          success: false,
          message: 'Non authentifié',
        });
        return;
      }

      const result = await authService.changePassword(userId, oldPassword, newPassword);
      
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();

