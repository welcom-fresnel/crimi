/**
 * Middleware de gestion centralisée des erreurs
 */

import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';
import { config } from '../config';

/**
 * Middleware pour gérer les erreurs
 */
export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error('Erreur capturée:', err);
  
  // Si c'est une ApiError personnalisée
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
      error: config.nodeEnv === 'development' ? err.stack : undefined,
    });
    return;
  }
  
  // Erreur Prisma
  if (err.name === 'PrismaClientKnownRequestError') {
    handlePrismaError(err, res);
    return;
  }
  
  // Erreur de validation
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      message: 'Erreur de validation',
      error: err.message,
    });
    return;
  }

  // Erreur de upload (multer)
  if (err.name === 'MulterError') {
    res.status(400).json({
      success: false,
      message: 'Erreur lors de l upload du fichier',
      error: err.message,
    });
    return;
  }

  if (err.message === 'Le fichier doit etre une image') {
    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }
  
  // Erreur générique
  res.status(500).json({
    success: false,
    message: 'Erreur interne du serveur',
    error: config.nodeEnv === 'development' ? err.message : undefined,
  });
};

/**
 * Gestionnaire spécifique pour les erreurs Prisma
 */
const handlePrismaError = (err: any, res: Response): void => {
  switch (err.code) {
    case 'P2002':
      // Violation de contrainte unique
      res.status(409).json({
        success: false,
        message: 'Cette ressource existe déjà',
        error: `Champ en double: ${err.meta?.target || 'inconnu'}`,
      });
      break;
      
    case 'P2025':
      // Enregistrement non trouvé
      res.status(404).json({
        success: false,
        message: 'Ressource non trouvée',
      });
      break;
      
    case 'P2003':
      // Violation de clé étrangère
      res.status(400).json({
        success: false,
        message: 'Référence invalide',
        error: 'La ressource référencée n\'existe pas',
      });
      break;
      
    default:
      res.status(500).json({
        success: false,
        message: 'Erreur de base de données',
        error: config.nodeEnv === 'development' ? err.message : undefined,
      });
  }
};

/**
 * Middleware pour gérer les routes non trouvées
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  res.status(404).json({
    success: false,
    message: `Route non trouvée: ${req.method} ${req.url}`,
  });
};

