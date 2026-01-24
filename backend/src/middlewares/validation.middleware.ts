/**
 * Middleware de validation des données
 */

import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

/**
 * Middleware pour valider les données avec express-validator
 */
export const validate = (validations: ValidationChain[]) => {
  return async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Exécuter toutes les validations
    await Promise.all(validations.map(validation => validation.run(req)));
    
    // Vérifier les erreurs de validation
    const errors = validationResult(req);
    
    if (!errors.isEmpty()) {
      const errorMessages = errors.array().map(err => ({
        field: err.type === 'field' ? err.path : 'unknown',
        message: err.msg,
      }));
      
      res.status(400).json({
        success: false,
        message: 'Erreur de validation',
        errors: errorMessages,
      });
      return;
    }
    
    next();
  };
};

