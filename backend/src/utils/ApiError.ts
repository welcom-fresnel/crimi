/**
 * Classe personnalisée pour les erreurs API
 */

export class ApiError extends Error {
  public statusCode: number;
  public isOperational: boolean;
  public code?: string;

  constructor(statusCode: number, message: string, isOperational: boolean | string = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = typeof isOperational === 'boolean' ? isOperational : true;
    this.code = typeof isOperational === 'string' ? isOperational : undefined;

    // Maintenir la trace de la pile d'appels
    Error.captureStackTrace(this, this.constructor);
  }
}

