/**
 * Routes de gestion des criminels
 */

import { Router } from 'express';
import { criminalController } from '../controllers/criminal.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditLog, saveOriginalData } from '../middlewares/audit.middleware';
import { validate } from '../middlewares/validation.middleware';
import { createCriminalValidator, updateCriminalValidator } from '../validators/criminal.validator';
import { criminalService } from '../services/criminal.service';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

/**
 * @route   GET /api/criminals/search
 * @desc    Rechercher des criminels
 * @access  Private (ADMIN, AGENT, VIEWER)
 */
router.get(
  '/search',
  authorize('criminals', 'read'),
  criminalController.searchCriminals
);

/**
 * @route   POST /api/criminals
 * @desc    Créer un nouveau criminel
 * @access  Private (ADMIN, AGENT)
 */
router.post(
  '/',
  authorize('criminals', 'create'),
  validate(createCriminalValidator),
  auditLog('CREATE', 'CRIMINAL'),
  criminalController.createCriminal
);

/**
 * @route   GET /api/criminals
 * @desc    Obtenir tous les criminels
 * @access  Private (ADMIN, AGENT, VIEWER)
 */
router.get(
  '/',
  authorize('criminals', 'read'),
  criminalController.getAllCriminals
);

/**
 * @route   GET /api/criminals/:id
 * @desc    Obtenir un criminel par ID
 * @access  Private (ADMIN, AGENT, VIEWER)
 */
router.get(
  '/:id',
  authorize('criminals', 'read'),
  criminalController.getCriminalById
);

/**
 * @route   PUT /api/criminals/:id
 * @desc    Mettre à jour un criminel
 * @access  Private (ADMIN, AGENT)
 */
router.put(
  '/:id',
  authorize('criminals', 'update'),
  validate(updateCriminalValidator),
  saveOriginalData('CRIMINAL', (id: string) => criminalService.getCriminalById(id)),
  auditLog('UPDATE', 'CRIMINAL'),
  criminalController.updateCriminal
);

/**
 * @route   DELETE /api/criminals/:id
 * @desc    Supprimer un criminel
 * @access  Private (ADMIN)
 */
router.delete(
  '/:id',
  authorize('criminals', 'delete'),
  saveOriginalData('CRIMINAL', (id: string) => criminalService.getCriminalById(id)),
  auditLog('DELETE', 'CRIMINAL'),
  criminalController.deleteCriminal
);

export default router;

