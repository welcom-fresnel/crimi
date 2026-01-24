/**
 * Contrôleur d'authentification
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { authService } from '../services/auth.service';
import { auditService } from '../services/audit.service';

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
    try {
      const result = await authService.login(req.body);
      
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
          createdAt: true,
          profile: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
      
      res.status(200).json({
        success: true,
        data: user,
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

