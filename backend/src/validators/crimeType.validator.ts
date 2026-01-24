/**
 * Validateurs pour les types de crimes
 */

import { body } from 'express-validator';

export const createCrimeTypeValidator = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Le nom est requis')
    .isLength({ min: 3 })
    .withMessage('Le nom doit contenir au moins 3 caractères'),
  
  body('code')
    .trim()
    .notEmpty()
    .withMessage('Le code est requis')
    .isLength({ min: 2, max: 20 })
    .withMessage('Le code doit contenir entre 2 et 20 caractères')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Le code ne doit contenir que des majuscules et des chiffres'),
  
  body('severity')
    .notEmpty()
    .withMessage('La gravité est requise')
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('Gravité invalide'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La description ne peut pas dépasser 500 caractères'),
];

export const updateCrimeTypeValidator = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le nom ne peut pas être vide')
    .isLength({ min: 3 })
    .withMessage('Le nom doit contenir au moins 3 caractères'),
  
  body('code')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le code ne peut pas être vide')
    .isLength({ min: 2, max: 20 })
    .withMessage('Le code doit contenir entre 2 et 20 caractères')
    .matches(/^[A-Z0-9]+$/)
    .withMessage('Le code ne doit contenir que des majuscules et des chiffres'),
  
  body('severity')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('Gravité invalide'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('La description ne peut pas dépasser 500 caractères'),
];

