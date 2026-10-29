/**
 * Routes d'authentification
 */

import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validation.middleware';
import { registerValidator, loginValidator, changePasswordValidator } from '../validators/auth.validator';
import rateLimit from 'express-rate-limit';
import { auditLog } from '../middlewares/audit.middleware';

const router = Router();
const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => res.status(429).json({ success: false, code: 'TOO_MANY_ATTEMPTS', message: 'Trop de tentatives. Réessayez plus tard.' }),
});

/**
 * @route   POST /api/auth/register
 * @desc    Inscription d'un nouvel utilisateur
 * @access  Private (ADMIN)
 */
router.post(
  '/register',
  authenticate,
  authorize('users', 'create'),
  validate(registerValidator),
  auditLog('CREATE', 'USER'),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Connexion d'un utilisateur
 * @access  Public
 */
router.post(
  '/login',
  loginRateLimit,
  validate(loginValidator),
  authController.login
);

/**
 * @route   POST /api/auth/logout
 * @desc    Déconnexion d'un utilisateur
 * @access  Private
 */
router.post(
  '/logout',
  authenticate,
  authController.logout
);

/**
 * @route   GET /api/auth/profile
 * @desc    Obtenir le profil de l'utilisateur connecté
 * @access  Private
 */
router.get(
  '/profile',
  authenticate,
  authController.getProfile
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Changer le mot de passe
 * @access  Private
 */
router.post(
  '/change-password',
  authenticate,
  validate(changePasswordValidator),
  authController.changePassword
);

export default router;

