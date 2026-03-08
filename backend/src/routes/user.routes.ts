/**
 * Routes de gestion des utilisateurs
 */

import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditLog, saveOriginalData } from '../middlewares/audit.middleware';
import { userService } from '../services/user.service';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

router.get(
  '/roles',
  authorize('users', 'read'),
  userController.getRoles
);

/**
 * @route   GET /api/users
 * @desc    Obtenir tous les utilisateurs
 * @access  Private (ADMIN, AGENT)
 */
router.get(
  '/',
  authorize('users', 'read'),
  userController.getAllUsers
);

/**
 * @route   GET /api/users/:id
 * @desc    Obtenir un utilisateur par ID
 * @access  Private (ADMIN, AGENT)
 */
router.get(
  '/:id',
  authorize('users', 'read'),
  userController.getUserById
);

/**
 * @route   PUT /api/users/:id
 * @desc    Mettre à jour un utilisateur
 * @access  Private (ADMIN)
 */
router.put(
  '/:id',
  authorize('users', 'update'),
  saveOriginalData('USER', (id: string) => userService.getUserById(id)),
  auditLog('UPDATE', 'USER'),
  userController.updateUser
);

/**
 * @route   PATCH /api/users/:id/toggle-status
 * @desc    Activer/Désactiver un utilisateur
 * @access  Private (ADMIN)
 */
router.patch(
  '/:id/toggle-status',
  authorize('users', 'update'),
  saveOriginalData('USER', (id: string) => userService.getUserById(id)),
  auditLog('UPDATE', 'USER'),
  userController.toggleUserStatus
);

/**
 * @route   DELETE /api/users/:id
 * @desc    Supprimer un utilisateur
 * @access  Private (ADMIN)
 */
router.delete(
  '/:id',
  authorize('users', 'delete'),
  saveOriginalData('USER', (id: string) => userService.getUserById(id)),
  auditLog('DELETE', 'USER'),
  userController.deleteUser
);

export default router;

