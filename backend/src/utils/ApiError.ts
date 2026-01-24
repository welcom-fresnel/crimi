/**
 * Classe personnalisée pour les erreurs API
 */

export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Maintenir la trace de la pile d'appels
    Error.captureStackTrace(this, this.constructor);
  }
}

