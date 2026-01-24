/**
 * Instance Prisma Client
 */

import { PrismaClient } from '@prisma/client';

// Créer une instance unique de Prisma Client
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

// Gérer la fermeture propre de la connexion
process.on('beforeExit', async () => {
  await prisma.$disconnect();
});

