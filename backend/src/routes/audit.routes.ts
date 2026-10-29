/**
 * Routes de gestion des journaux d'audit
 */

import { Router } from 'express';
import { auditController } from '../controllers/audit.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';

const router = Router();

// Toutes les routes nécessitent une authentification
router.use(authenticate);

router.get('/verify', authorize('audit_logs', 'read'), auditController.verifyChain);

/**
 * @route   GET /api/audit
 * @desc    Obtenir tous les journaux d'audit
 * @access  Private (ADMIN)
 */
router.get(
  '/',
  authorize('audit_logs', 'read'),
  auditController.getAllAuditLogs
);

router.get(
  '/me',
  auditController.getMyAuditLogs
);

/**
 * @route   GET /api/audit/:id
 * @desc    Obtenir un journal d'audit par ID
 * @access  Private (ADMIN)
 */
router.get(
  '/:id',
  authorize('audit_logs', 'read'),
  auditController.getAuditLogById
);

/**
 * @route   GET /api/audit/:entity/:entityId
 * @desc    Obtenir l'historique d'audit d'une entité
 * @access  Private (ADMIN)
 */
router.get(
  '/:entity/:entityId',
  authorize('audit_logs', 'read'),
  auditController.getEntityAuditHistory
);

export default router;

