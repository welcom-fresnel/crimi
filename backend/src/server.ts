/**
 * Fichier principal du serveur Express avec Socket.io
 */

import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config, validateConfig } from './config';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import routes from './routes';
import { prisma } from './utils/prisma';
import { socketService } from './services/socket.service';

// Valider la configuration
try {
  validateConfig();
} catch (error) {
  console.error('Erreur de configuration:', error);
  process.exit(1);
}

// Créer l'application Express
const app: Application = express();

// Créer le serveur HTTP (nécessaire pour Socket.io)
const httpServer = createServer(app);

// ==================== MIDDLEWARES GLOBAUX ====================

// Sécurité avec Helmet
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.corsOrigin,
    credentials: true,
  })
);

// Body parser
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger HTTP
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ==================== ROUTES ====================

// Route de bienvenue
app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Bienvenue sur l\'API Securit Afrique Hub',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Routes API
app.use('/api', routes);

// ==================== GESTION DES ERREURS ====================

// Route non trouvée
app.use(notFoundHandler);

// Gestionnaire d'erreurs global
app.use(errorHandler);

// ==================== DÉMARRAGE DU SERVEUR ====================

const PORT = Number(config.port);

const startServer = async () => {
  try {
    // Vérifier la connexion à la base de données
    await prisma.$connect();
    console.log('✅ Connexion à la base de données réussie');

    // Initialiser Socket.io
    socketService.initialize(httpServer);

    // Démarrer le serveur HTTP (avec Express et Socket.io)
    httpServer.listen(PORT, '0.0.0.0', () => {
      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log(`🚀 Serveur démarré sur le port ${PORT}`);
      console.log(`🌍 Mode: ${config.nodeEnv}`);
      console.log(`📍 URL: http://localhost:${PORT}`);
      console.log(`🌐 Réseau: http://0.0.0.0:${PORT}`);
      console.log(`🔗 API: http://localhost:${PORT}/api/health`);
      console.log(`🔌 WebSocket: ws://localhost:${PORT}`);
      console.log(`📡 Synchronisation temps réel activée`);
      console.log('═══════════════════════════════════════════════════');
      console.log('');
    });
  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
};

// Gérer l'arrêt gracieux
process.on('SIGINT', async () => {
  console.log('\n⏳ Arrêt du serveur en cours...');
  await prisma.$disconnect();
  console.log('✅ Connexion à la base de données fermée');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n⏳ Arrêt du serveur en cours...');
  await prisma.$disconnect();
  console.log('✅ Connexion à la base de données fermée');
  process.exit(0);
});

// Démarrer le serveur
startServer();

export default app;

