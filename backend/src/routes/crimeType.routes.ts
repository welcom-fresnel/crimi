/**
 * Routes de gestion des types de crimes
 */

import { Router } from 'express';
import { crimeTypeController } from '../controllers/crimeType.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { auditLog, saveOriginalData } from '../middlewares/audit.middleware';
import { validate } from '../middlewares/validation.middleware';
import { createCrimeTypeValidator, updateCrimeTypeValidator } from '../validators/crimeType.validator';
import { crimeTypeService } from '../services/crimeType.service';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

/**
 * @route   POST /api/crime-types
 * @desc    Créer un nouveau type de crime
 * @access  Private (ADMIN)
 */
router.post(
  '/',
  authorize('crime_types', 'create'),
  validate(createCrimeTypeValidator),
  auditLog('CREATE', 'CRIME_TYPE'),
  crimeTypeController.createCrimeType
);

/**
 * @route   GET /api/crime-types
 * @desc    Obtenir tous les types de crimes
 * @access  Private (ADMIN, AGENT, VIEWER)
 */
router.get(
  '/',
  authorize('crime_types', 'read'),
  crimeTypeController.getAllCrimeTypes
);

/**
 * @route   GET /api/crime-types/:id
 * @desc    Obtenir un type de crime par ID
 * @access  Private (ADMIN, AGENT, VIEWER)
 */
router.get(
  '/:id',
  authorize('crime_types', 'read'),
  crimeTypeController.getCrimeTypeById
);

/**
 * @route   PUT /api/crime-types/:id
 * @desc    Mettre à jour un type de crime
 * @access  Private (ADMIN)
 */
router.put(
  '/:id',
  authorize('crime_types', 'update'),
  validate(updateCrimeTypeValidator),
  saveOriginalData('CRIME_TYPE', (id: string) => crimeTypeService.getCrimeTypeById(id)),
  auditLog('UPDATE', 'CRIME_TYPE'),
  crimeTypeController.updateCrimeType
);

/**
 * @route   DELETE /api/crime-types/:id
 * @desc    Supprimer un type de crime
 * @access  Private (ADMIN)
 */
router.delete(
  '/:id',
  authorize('crime_types', 'delete'),
  saveOriginalData('CRIME_TYPE', (id: string) => crimeTypeService.getCrimeTypeById(id)),
  auditLog('DELETE', 'CRIME_TYPE'),
  crimeTypeController.deleteCrimeType
);

export default router;

