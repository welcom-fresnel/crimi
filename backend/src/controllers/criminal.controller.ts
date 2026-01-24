/**
 * Contrôleur de gestion des criminels avec notifications temps réel
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { criminalService } from '../services/criminal.service';
import { socketService } from '../services/socket.service';
import { CriminalCreatedPayload, CriminalUpdatedPayload, CriminalDeletedPayload } from '../types/socket.types';

class CriminalController {
  /**
   * Créer un nouveau criminel
   */
  async createCriminal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const createdById = req.user!.userId;
      const criminal = await criminalService.createCriminal(req.body, createdById);
      
      // Notification temps réel à tous les postes
      const payload: CriminalCreatedPayload = {
        criminal,
        createdBy: {
          id: req.user!.userId,
          username: req.user!.username,
          postId: req.body.postId, // ID du poste (optionnel)
        },
        timestamp: new Date(),
      };
      
      socketService.notifyCriminalCreated(payload);
      
      res.status(201).json({
        success: true,
        message: 'Criminel créé avec succès',
        data: criminal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir tous les criminels
   */
  async getAllCriminals(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      
      const result = await criminalService.getAllCriminals(page, limit);
      
      res.status(200).json({
        success: true,
        data: result.criminals,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir un criminel par ID
   */
  async getCriminalById(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const criminal = await criminalService.getCriminalById(id);
      
      res.status(200).json({
        success: true,
        data: criminal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mettre à jour un criminel
   */
  async updateCriminal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updatedById = req.user!.userId;
      
      // Récupérer les données originales (si disponibles via middleware)
      const originalData = (req as any).originalData;
      
      const criminal = await criminalService.updateCriminal(id, req.body, updatedById);
      
      // Notification temps réel à tous les postes
      const payload: CriminalUpdatedPayload = {
        criminal,
        changes: originalData ? {
          before: originalData,
          after: criminal,
        } : undefined,
        updatedBy: {
          id: req.user!.userId,
          username: req.user!.username,
          postId: req.body.postId,
        },
        timestamp: new Date(),
      };
      
      socketService.notifyCriminalUpdated(payload);
      
      res.status(200).json({
        success: true,
        message: 'Criminel mis à jour avec succès',
        data: criminal,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Supprimer un criminel
   */
  async deleteCriminal(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      
      // Récupérer les données avant suppression (si disponibles via middleware)
      const originalData = (req as any).originalData;
      
      const result = await criminalService.deleteCriminal(id);
      
      // Notification temps réel à tous les postes
      if (originalData) {
        const payload: CriminalDeletedPayload = {
          criminalId: id,
          caseNumber: originalData.caseNumber,
          deletedBy: {
            id: req.user!.userId,
            username: req.user!.username,
            postId: req.body?.postId,
          },
          timestamp: new Date(),
        };
        
        socketService.notifyCriminalDeleted(payload);
      }
      
      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Rechercher des criminels
   */
  async searchCriminals(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const searchParams = {
        name: req.query.name as string,
        caseNumber: req.query.caseNumber as string,
        crimeTypeId: req.query.crimeTypeId as string,
        status: req.query.status as any,
        dangerLevel: req.query.dangerLevel as any,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };
      
      const result = await criminalService.searchCriminals(searchParams);
      
      res.status(200).json({
        success: true,
        data: result.criminals,
        pagination: result.pagination,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const criminalController = new CriminalController();

