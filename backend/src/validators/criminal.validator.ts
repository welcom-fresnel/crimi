/**
 * Validateurs pour les criminels
 */

import { body } from 'express-validator';

export const createCriminalValidator = [
  body('caseNumber')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Le numéro de dossier ne peut pas être vide'),
  
  body('firstName')
    .trim()
    .notEmpty()
    .withMessage('Le prénom est requis'),
  
  body('lastName')
    .trim()
    .notEmpty()
    .withMessage('Le nom est requis'),
  
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
  body('personSituation').optional().isIn(['UNKNOWN', 'AT_LARGE', 'IN_CUSTODY', 'RELEASED', 'DECEASED']).withMessage('Situation de la personne invalide'),
  body('offenseState').optional().isIn(['UNDER_INVESTIGATION', 'REFERRED', 'ADJUDICATED', 'CLOSED']).withMessage('État de l’infraction invalide'),
  
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

  body('crimes')
    .optional()
    .isArray({ min: 1 })
    .withMessage('La liste des crimes doit contenir au moins un élément'),
  
  body('crimes.*.crimeTypeId')
    .if(body('crimes').exists())
    .notEmpty()
    .withMessage('Le type de crime est requis')
    .isUUID()
    .withMessage('ID de type de crime invalide'),
  
  body('crimes.*.description')
    .if(body('crimes').exists())
    .trim()
    .notEmpty()
    .withMessage('La description est requise')
    .isLength({ min: 10 })
    .withMessage('La description du crime doit contenir au moins 10 caractères'),

  body().custom((_, { req }) => {
    const hasCrimesArray = Array.isArray(req.body.crimes) && req.body.crimes.length > 0;
    const hasLegacyCrime = Boolean(req.body.crimeTypeId && req.body.description);
    if (!hasCrimesArray && !hasLegacyCrime) {
      throw new Error('Au moins un crime est requis');
    }
    return true;
  }),
];

export const updateCriminalValidator = [
  body('personSituation').optional().isIn(['UNKNOWN', 'AT_LARGE', 'IN_CUSTODY', 'RELEASED', 'DECEASED']).withMessage('Situation de la personne invalide'),
  body('offenseState').optional().isIn(['UNDER_INVESTIGATION', 'REFERRED', 'ADJUDICATED', 'CLOSED']).withMessage('État de l’infraction invalide'),
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

export const createCrimeValidator = [
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
  
  body('status')
    .optional()
    .isIn(['ACTIVE', 'ARRESTED', 'RELEASED', 'DECEASED', 'UNKNOWN'])
    .withMessage('Statut invalide'),
  
  body('dangerLevel')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('Niveau de danger invalide'),
];

const evidenceCategoryValidator = (field: string) => body(field).optional().isIn(['WEAPON', 'DOCUMENT', 'DIGITAL', 'BIOLOGICAL', 'OTHER']).withMessage('La categorie de preuve est invalide');
const evidenceDateValidator = (field: string) => body(field).optional({ values: 'null' }).isISO8601().withMessage('La date de collecte doit être au format ISO8601');
export const updateEvidenceValidator = [
  body('title').optional().isString().withMessage('Le titre est invalide'),
  body('description').optional().isString().withMessage('La description est invalide'),
  evidenceCategoryValidator('category'), evidenceDateValidator('collectedAt'),
  body('collectedAtLocation').optional().isString().withMessage('Le lieu de collecte est invalide'),
];
export const createEvidenceValidator = [
  body('title').optional().isString().withMessage('Le titre est invalide'),
  body('description').optional().isString().withMessage('La description est invalide'),
  evidenceCategoryValidator('category'), evidenceDateValidator('collectedAt'),
  body('collectedAtLocation').optional().isString().withMessage('Le lieu de collecte est invalide'),
];

