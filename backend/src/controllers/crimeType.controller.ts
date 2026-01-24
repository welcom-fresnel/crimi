/**
 * Contrôleur de gestion des types de crimes avec notifications temps réel
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { crimeTypeService } from '../services/crimeType.service';
import { socketService } from '../services/socket.service';
import { CrimeTypeCreatedPayload, CrimeTypeUpdatedPayload, CrimeTypeDeletedPayload } from '../types/socket.types';

class CrimeTypeController {
  /**
   * Créer un nouveau type de crime
   */
  async createCrimeType(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const crimeType = await crimeTypeService.createCrimeType(req.body);
      
      // Notification temps réel
      const payload: CrimeTypeCreatedPayload = {
        crimeType,
        createdBy: {
          id: req.user!.userId,
          username: req.user!.username,
        },
        timestamp: new Date(),
      };
      
      socketService.notifyCrimeTypeCreated(payload);
      
      res.status(201).json({
        success: true,
        message: 'Type de crime créé avec succès',
        data: crimeType,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir tous les types de crimes
   */
  async getAllCrimeTypes(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const crimeTypes = await crimeTypeService.getAllCrimeTypes();
      
      res.status(200).json({
        success: true,
        data: crimeTypes,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir un type de crime par ID
   */
  async getCrimeTypeById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const crimeType = await crimeTypeService.getCrimeTypeById(id);
      
      res.status(200).json({
        success: true,
        data: crimeType,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mettre à jour un type de crime
   */
  async updateCrimeType(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const crimeType = await crimeTypeService.updateCrimeType(id, req.body);
      
      // Notification temps réel
      const payload: CrimeTypeUpdatedPayload = {
        crimeType,
        updatedBy: {
          id: req.user!.userId,
          username: req.user!.username,
        },
        timestamp: new Date(),
      };
      
      socketService.notifyCrimeTypeUpdated(payload);
      
      res.status(200).json({
        success: true,
        message: 'Type de crime mis à jour avec succès',
        data: crimeType,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Supprimer un type de crime
   */
  async deleteCrimeType(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      // Récupérer les données avant suppression
      const originalData = (req as any).originalData;
      
      const result = await crimeTypeService.deleteCrimeType(id);
      
      // Notification temps réel
      if (originalData) {
        const payload: CrimeTypeDeletedPayload = {
          crimeTypeId: id,
          name: originalData.name,
          deletedBy: {
            id: req.user!.userId,
            username: req.user!.username,
          },
          timestamp: new Date(),
        };
        
        socketService.notifyCrimeTypeDeleted(payload);
      }
      
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const crimeTypeController = new CrimeTypeController();

