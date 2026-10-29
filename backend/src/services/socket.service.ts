/**
 * Service de gestion Socket.io
 * Gère les connexions temps réel et la synchronisation entre postes
 */

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config, getCorsOrigins } from '../config';
import { 
  AuthenticatedSocket, 
  SocketEvent, 
  NotificationPayload,
  CriminalCreatedPayload,
  CriminalUpdatedPayload,
  CriminalDeletedPayload,
  CrimeTypeCreatedPayload,
  CrimeTypeUpdatedPayload,
  CrimeTypeDeletedPayload,
  ConnectionStats
} from '../types/socket.types';
import { JwtPayload } from '../types';


class SocketService {
  private io: SocketIOServer | null = null;
  private connectedClients: Map<string, AuthenticatedSocket> = new Map();

  /**
   * Initialiser Socket.io avec le serveur HTTP
   */
  initialize(httpServer: HTTPServer): SocketIOServer {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: getCorsOrigins(),
        credentials: true,
        methods: ['GET', 'POST'],
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.setupMiddlewares();
    this.setupEventHandlers();

    console.log('✅ Socket.io initialisé avec succès');
    return this.io;
  }

  /**
   * Configurer les middlewares Socket.io
   */
  private setupMiddlewares(): void {
    if (!this.io) return;

    // Middleware d'authentification
    this.io.use((socket: Socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization;

        if (!token) {
          return next(new Error('Token d\'authentification manquant'));
        }

        // Retirer "Bearer " si présent
        const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;

        // Vérifier le token
        const decoded = jwt.verify(cleanToken, config.jwtSecret, { algorithms: ['HS256'] }) as JwtPayload;

        // Attacher les informations utilisateur au socket
        (socket as AuthenticatedSocket).user = decoded;
        (socket as AuthenticatedSocket).userId = decoded.userId;
        (socket as AuthenticatedSocket).postId = socket.handshake.query.postId as string;

        next();
      } catch (error) {
        console.error('Erreur d\'authentification Socket.io:', error);
        next(new Error('Token invalide'));
      }
    });
  }

  /**
   * Configurer les gestionnaires d'événements
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on(SocketEvent.CONNECTION, (socket: Socket) => {
      const authSocket = socket as AuthenticatedSocket;
      
      console.log(`📡 Nouveau client connecté: ${authSocket.user?.username} (${authSocket.id})`);

      // Stocker le client
      if (authSocket.userId) {
        this.connectedClients.set(authSocket.userId, authSocket);
      }

      // Rejoindre une room par poste de police (si fourni)
      if (authSocket.postId) {
        authSocket.join(`post:${authSocket.postId}`);
        console.log(`🏢 Client ${authSocket.user?.username} a rejoint le poste ${authSocket.postId}`);
      }

      // Rejoindre une room globale
      authSocket.join('all-posts');

      // Envoyer confirmation d'authentification
      authSocket.emit(SocketEvent.AUTHENTICATED, {
        success: true,
        message: 'Connexion établie',
        userId: authSocket.userId,
        username: authSocket.user?.username,
        postId: authSocket.postId,
      });

      // Gérer la déconnexion
      authSocket.on(SocketEvent.DISCONNECT, () => {
        console.log(`📡 Client déconnecté: ${authSocket.user?.username} (${authSocket.id})`);
        
        if (authSocket.userId) {
          this.connectedClients.delete(authSocket.userId);
        }
      });

      // Gérer les erreurs
      authSocket.on('error', (error) => {
        console.error(`❌ Erreur Socket.io pour ${authSocket.user?.username}:`, error);
      });
    });
  }

  /**
   * Obtenir l'instance Socket.io
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }

  /**
   * Émettre un événement à tous les clients
   */
  emitToAll(event: SocketEvent, payload: any): void {
    if (!this.io) {
      console.warn('⚠️ Socket.io non initialisé');
      return;
    }

    this.io.to('all-posts').emit(event, payload);
  }

  /**
   * Émettre un événement à tous sauf l'émetteur
   */
  emitToAllExcept(userId: string, event: SocketEvent, payload: any): void {
    if (!this.io) return;

    const socket = this.connectedClients.get(userId);
    if (socket) {
      socket.broadcast.to('all-posts').emit(event, payload);
    } else {
      this.emitToAll(event, payload);
    }
  }

  /**
   * Émettre un événement à un poste spécifique
   */
  emitToPost(postId: string, event: SocketEvent, payload: any): void {
    if (!this.io) return;

    this.io.to(`post:${postId}`).emit(event, payload);
  }

  /**
   * Émettre un événement à un utilisateur spécifique
   */
  emitToUser(userId: string, event: SocketEvent, payload: any): void {
    const socket = this.connectedClients.get(userId);
    if (socket) {
      socket.emit(event, payload);
    }
  }

  // ==================== ÉVÉNEMENTS CRIMINELS ====================

  /**
   * Notifier la création d'un criminel
   */
  notifyCriminalCreated(payload: CriminalCreatedPayload): void {
    console.log(`📢 Notification: Criminel créé par ${payload.createdBy.username}`);
    
    const eventPayload = config.socketFullPayload ? payload : {
      criminalId: payload.criminal.id, caseNumber: payload.criminal.caseNumber,
      by: { id: payload.createdBy.id, username: payload.createdBy.username }, timestamp: payload.timestamp,
    };
    this.emitToAllExcept(payload.createdBy.id, SocketEvent.CRIMINAL_CREATED, eventPayload);
    
    // Notification générique
    const notification: NotificationPayload = {
      type: 'info',
      title: 'Nouveau criminel enregistré',
      message: `Un nouveau dossier criminel a été créé par ${payload.createdBy.username}`,
      data: config.socketFullPayload ? payload.criminal : { id: payload.criminal.id, caseNumber: payload.criminal.caseNumber },
      timestamp: new Date(),
      userId: payload.createdBy.id,
      username: payload.createdBy.username,
    };
    
    this.emitToAllExcept(payload.createdBy.id, SocketEvent.NOTIFICATION, notification);
  }

  /**
   * Notifier la mise à jour d'un criminel
   */
  notifyCriminalUpdated(payload: CriminalUpdatedPayload): void {
    console.log(`📢 Notification: Criminel mis à jour par ${payload.updatedBy.username}`);
    
    const eventPayload = config.socketFullPayload ? payload : {
      criminalId: payload.criminal.id, caseNumber: payload.criminal.caseNumber,
      by: { id: payload.updatedBy.id, username: payload.updatedBy.username }, timestamp: payload.timestamp,
    };
    this.emitToAllExcept(payload.updatedBy.id, SocketEvent.CRIMINAL_UPDATED, eventPayload);
    
    const notification: NotificationPayload = {
      type: 'warning',
      title: 'Dossier criminel mis à jour',
      message: `Le dossier ${payload.criminal.caseNumber} a été modifié par ${payload.updatedBy.username}`,
      data: config.socketFullPayload ? payload.criminal : { id: payload.criminal.id, caseNumber: payload.criminal.caseNumber },
      timestamp: new Date(),
      userId: payload.updatedBy.id,
      username: payload.updatedBy.username,
    };
    
    this.emitToAllExcept(payload.updatedBy.id, SocketEvent.NOTIFICATION, notification);
  }

  /**
   * Notifier la suppression d'un criminel
   */
  notifyCriminalDeleted(payload: CriminalDeletedPayload): void {
    console.log(`📢 Notification: Criminel supprimé par ${payload.deletedBy.username}`);
    
    const eventPayload = config.socketFullPayload ? payload : {
      criminalId: payload.criminalId, caseNumber: payload.caseNumber,
      by: { id: payload.deletedBy.id, username: payload.deletedBy.username }, timestamp: payload.timestamp,
    };
    this.emitToAllExcept(payload.deletedBy.id, SocketEvent.CRIMINAL_DELETED, eventPayload);
    
    const notification: NotificationPayload = {
      type: 'error',
      title: 'Dossier criminel supprimé',
      message: `Le dossier ${payload.caseNumber} a été supprimé par ${payload.deletedBy.username}`,
      data: { criminalId: payload.criminalId, caseNumber: payload.caseNumber },
      timestamp: new Date(),
      userId: payload.deletedBy.id,
      username: payload.deletedBy.username,
    };
    
    this.emitToAllExcept(payload.deletedBy.id, SocketEvent.NOTIFICATION, notification);
  }

  // ==================== ÉVÉNEMENTS TYPES DE CRIMES ====================

  /**
   * Notifier la création d'un type de crime
   */
  notifyCrimeTypeCreated(payload: CrimeTypeCreatedPayload): void {
    console.log(`📢 Notification: Type de crime créé par ${payload.createdBy.username}`);
    this.emitToAllExcept(payload.createdBy.id, SocketEvent.CRIME_TYPE_CREATED, payload);
  }

  /**
   * Notifier la mise à jour d'un type de crime
   */
  notifyCrimeTypeUpdated(payload: CrimeTypeUpdatedPayload): void {
    console.log(`📢 Notification: Type de crime mis à jour par ${payload.updatedBy.username}`);
    this.emitToAllExcept(payload.updatedBy.id, SocketEvent.CRIME_TYPE_UPDATED, payload);
  }

  /**
   * Notifier la suppression d'un type de crime
   */
  notifyCrimeTypeDeleted(payload: CrimeTypeDeletedPayload): void {
    console.log(`📢 Notification: Type de crime supprimé par ${payload.deletedBy.username}`);
    this.emitToAllExcept(payload.deletedBy.id, SocketEvent.CRIME_TYPE_DELETED, payload);
  }

  // ==================== STATISTIQUES ====================

  /**
   * Obtenir les statistiques de connexion
   */
  getConnectionStats(): ConnectionStats {
    const connectedUsers = Array.from(this.connectedClients.values()).map(socket => ({
      userId: socket.userId || '',
      username: socket.user?.username || 'Unknown',
      postId: socket.postId,
      connectedAt: new Date(),
    }));

    const uniquePosts = new Set(
      connectedUsers
        .filter(u => u.postId)
        .map(u => u.postId as string)
    );

    return {
      totalConnections: this.connectedClients.size,
      activeConnections: this.connectedClients.size,
      connectedPosts: Array.from(uniquePosts),
      connectedUsers,
    };
  }

  /**
   * Vérifier si un utilisateur est connecté
   */
  isUserConnected(userId: string): boolean {
    return this.connectedClients.has(userId);
  }

  /**
   * Obtenir le nombre de clients connectés
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}

// Export d'une instance unique (Singleton)
export const socketService = new SocketService();

