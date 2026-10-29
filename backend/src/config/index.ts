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
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  socketFullPayload: process.env.SOCKET_FULL_PAYLOAD === 'true',
  
  // Configuration CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:8080',
  
  // Configuration base de données
  databaseUrl: process.env.DATABASE_URL,
  
  // Pagination par défaut
  defaultPageSize: 10,
  maxPageSize: 100,
};

export const getCorsOrigins = (): string[] => {
  const configuredOrigins = config.corsOrigin
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  // Always allow common local dev frontends in addition to configured network IPs.
  const defaultDevOrigins = ['http://localhost:8080', 'http://127.0.0.1:8080'];

  return Array.from(new Set([...defaultDevOrigins, ...configuredOrigins]));
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
  if (config.jwtSecret.length < 32) throw new Error('JWT_SECRET doit contenir au moins 32 caractères');
  if (config.nodeEnv === 'production' && /change|secret_key|securit_afrique_jwt_secret_key_2024_change_in_production/i.test(config.jwtSecret)) {
    throw new Error('JWT_SECRET doit être remplacé par une clé aléatoire en production');
  }
};

