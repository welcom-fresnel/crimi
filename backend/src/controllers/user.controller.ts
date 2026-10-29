/**
 * Contrôleur de gestion des utilisateurs
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { userService } from '../services/user.service';
import { config } from '../config';

class UserController {
  /**
   * Obtenir les roles disponibles
   */
  async getRoles(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const roles = await userService.getRoles();

      res.status(200).json({
        success: true,
        data: roles,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir tous les utilisateurs
   */
  async getAllUsers(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(config.maxPageSize, Math.max(1, parseInt(req.query.limit as string) || config.defaultPageSize));
      
      const result = await userService.getAllUsers(page, limit);
      
      res.status(200).json({
        success: true,
        data: result.users,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir un utilisateur par ID
   */
  async getUserById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await userService.getUserById(id);
      
      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mettre à jour un utilisateur
   */
  async updateUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await userService.updateUser(id, req.body, req.user!.userId, req.user!.roles);
      
      res.status(200).json({
        success: true,
        message: 'Utilisateur mis à jour avec succès',
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Activer/Désactiver un utilisateur
   */
  async toggleUserStatus(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await userService.toggleUserStatus(id, req.user!.userId, req.user!.roles);
      
      res.status(200).json({
        success: true,
        message: `Utilisateur ${user.isActive ? 'activé' : 'désactivé'} avec succès`,
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Supprimer un utilisateur
   */
  async deleteUser(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await userService.deleteUser(id, req.user!.userId, req.user!.roles);
      
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const userController = new UserController();

