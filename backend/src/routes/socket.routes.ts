/**
 * Routes pour les statistiques Socket.io
 */

import { Router } from 'express';
import { socketController } from '../controllers/socket.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

/**
 * @route   GET /api/socket/stats
 * @desc    Obtenir les statistiques des connexions WebSocket
 * @access  Private (ADMIN)
 */
router.get(
  '/stats',
  authorize('audit_logs', 'read'), // Réutiliser la permission audit pour les admins
  socketController.getConnectionStats
);

/**
 * @route   GET /api/socket/connected-count
 * @desc    Obtenir le nombre de clients connectés
 * @access  Private
 */
router.get(
  '/connected-count',
  socketController.getConnectedCount
);

/**
 * @route   GET /api/socket/user/:userId/status
 * @desc    Vérifier si un utilisateur est connecté
 * @access  Private (ADMIN, AGENT)
 */
router.get(
  '/user/:userId/status',
  authorize('users', 'read'),
  socketController.checkUserConnection
);

export default router;

