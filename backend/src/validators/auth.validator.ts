/**
 * Validateurs pour l'authentification
 */

import { body } from 'express-validator';

export const registerValidator = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 50 })
    .withMessage('Le nom d\'utilisateur doit contenir entre 3 et 50 caractères'),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email invalide')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Le mot de passe doit contenir au moins 6 caractères'),
  
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('Le prénom est requis'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Le nom est requis'),
  
  body('roleIds')
    .isArray({ min: 1 })
    .withMessage('Au moins un rôle est requis'),
];

export const loginValidator = [
  body('username')
    .trim()
    .notEmpty()
    .withMessage('Le nom d\'utilisateur est requis'),
  
  body('password')
    .notEmpty()
    .withMessage('Le mot de passe est requis'),
];

export const changePasswordValidator = [
  body('oldPassword')
    .notEmpty()
    .withMessage('L\'ancien mot de passe est requis'),
  
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères'),
];

