/**
 * Configuration centrale de l'application
 */

import dotenv from 'dotenv';

dotenv.config();

export const config = {
  // Configuration serveur
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Configuration JWT
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key-change-this',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  
  // Configuration CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  
  // Configuration base de données
  databaseUrl: process.env.DATABASE_URL,
  
  // Pagination par défaut
  defaultPageSize: 10,
  maxPageSize: 100,
};

// Validation de la configuration
export const validateConfig = (): void => {
  const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    throw new Error(
      `Variables d'environnement manquantes: ${missingVars.join(', ')}\n` +
      'Veuillez créer un fichier .env basé sur .env.example'
    );
  }
};

