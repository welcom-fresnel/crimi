/**
 * Point d'entrée principal des routes
 */

import { Router } from 'express';
import authRoutes from './auth.routes';
import criminalRoutes from './criminal.routes';
import crimeTypeRoutes from './crimeType.routes';
import auditRoutes from './audit.routes';
import userRoutes from './user.routes';
import socketRoutes from './socket.routes';
import workflowRoutes from './workflow.routes';

const router = Router();

// Routes principales
router.use('/auth', authRoutes);
router.use('/criminals', criminalRoutes);
router.use('/crime-types', crimeTypeRoutes);
router.use('/audit', auditRoutes);
router.use('/users', userRoutes);
router.use('/socket', socketRoutes);
router.use('/workflow', workflowRoutes);

// Route de santé (health check)
router.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Securit Afrique Hub - Backend opérationnel',
    timestamp: new Date().toISOString(),
  });
});

export default router;

