/**
 * Contrôleur pour les statistiques Socket.io
 */

import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { socketService } from '../services/socket.service';

class SocketController {
  /**
   * Obtenir les statistiques des connexions
   */
  async getConnectionStats(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const stats = socketService.getConnectionStats();
      
      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Vérifier si un utilisateur est connecté
   */
  async checkUserConnection(req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const { userId } = req.params;
      const isConnected = socketService.isUserConnected(userId);
      
      res.status(200).json({
        success: true,
        data: {
          userId,
          isConnected,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Obtenir le nombre de clients connectés
   */
  async getConnectedCount(_req: AuthRequest, res: Response, next: NextFunction) {
    try {
      const count = socketService.getConnectedClientsCount();
      
      res.status(200).json({
        success: true,
        data: {
          connectedClients: count,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const socketController = new SocketController();

