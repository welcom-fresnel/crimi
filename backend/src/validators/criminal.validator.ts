/**
 * Validateurs pour les criminels
 */

import { body } from 'express-validator';

export const createCriminalValidator = [
  body('caseNumber')
    .trim()
    .notEmpty()
    .withMessage('Le numéro de dossier est requis'),
  
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('Le prénom est requis'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Le nom est requis'),
  
  body('crimeTypeId')
    .notEmpty()
    .withMessage('Le type de crime est requis')
    .isUUID()
    .withMessage('ID de type de crime invalide'),
  
  body('description')
    .trim()
    .notEmpty()
    .withMessage('La description est requise')
    .isLength({ min: 10 })
    .withMessage('La description doit contenir au moins 10 caractères'),
  
  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER'])
    .withMessage('Genre invalide'),
  
  body('status')
    .optional()
    .isIn(['ACTIVE', 'ARRESTED', 'RELEASED', 'DECEASED', 'UNKNOWN'])
    .withMessage('Statut invalide'),
  
  body('dangerLevel')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('Niveau de danger invalide'),

  body('arrestation')
    .optional()
    .isObject()
    .withMessage('Les informations d arrestation sont invalides'),
];

export const updateCriminalValidator = [
  body('firstName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le prénom ne peut pas être vide'),
  
  body('lastName')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le nom ne peut pas être vide'),
  
  body('crimeTypeId')
    .optional()
    .isUUID()
    .withMessage('ID de type de crime invalide'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10 })
    .withMessage('La description doit contenir au moins 10 caractères'),
  
  body('gender')
    .optional()
    .isIn(['MALE', 'FEMALE', 'OTHER'])
    .withMessage('Genre invalide'),
  
  body('status')
    .optional()
    .isIn(['ACTIVE', 'ARRESTED', 'RELEASED', 'DECEASED', 'UNKNOWN'])
    .withMessage('Statut invalide'),
  
  body('dangerLevel')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('Niveau de danger invalide'),

  body('arrestation')
    .optional()
    .isObject()
    .withMessage('Les informations d arrestation sont invalides'),
];

