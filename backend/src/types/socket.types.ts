/**
 * Types TypeScript pour Socket.io
 * Gestion des événements temps réel entre postes de police
 */

import { Socket } from 'socket.io';
import { JwtPayload } from './index';

// ==================== TYPES D'ÉVÉNEMENTS ====================

/**
 * Types d'événements WebSocket
 */
export enum SocketEvent {
  // Connexion
  CONNECTION = 'connection',
  DISCONNECT = 'disconnect',
  AUTHENTICATE = 'authenticate',
  AUTHENTICATED = 'authenticated',
  
  // Criminels
  CRIMINAL_CREATED = 'criminal:created',
  CRIMINAL_UPDATED = 'criminal:updated',
  CRIMINAL_DELETED = 'criminal:deleted',
  
  // Types de crimes
  CRIME_TYPE_CREATED = 'crimeType:created',
  CRIME_TYPE_UPDATED = 'crimeType:updated',
  CRIME_TYPE_DELETED = 'crimeType:deleted',
  
  // Utilisateurs
  USER_CREATED = 'user:created',
  USER_UPDATED = 'user:updated',
  USER_DELETED = 'user:deleted',
  USER_STATUS_CHANGED = 'user:statusChanged',
  
  // Notifications
  NOTIFICATION = 'notification',
  
  // Erreurs
  ERROR = 'error',
}

// ==================== INTERFACES POUR LES ÉVÉNEMENTS ====================

/**
 * Interface pour Socket authentifié
 */
export interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
  userId?: string;
  postId?: string; // ID du poste de police
}

/**
 * Payload de notification générique
 */
export interface NotificationPayload {
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  userId?: string;
  username?: string;
}

/**
 * Payload pour création de criminel
 */
export interface CriminalCreatedPayload {
  criminal: any; // Données du criminel créé
  createdBy: {
    id: string;
    username: string;
    postId?: string;
  };
  timestamp: Date;
}

/**
 * Payload pour mise à jour de criminel
 */
export interface CriminalUpdatedPayload {
  criminal: any; // Données mises à jour
  changes?: {
    before: any;
    after: any;
  };
  updatedBy: {
    id: string;
    username: string;
    postId?: string;
  };
  timestamp: Date;
}

/**
 * Payload pour suppression de criminel
 */
export interface CriminalDeletedPayload {
  criminalId: string;
  caseNumber: string;
  deletedBy: {
    id: string;
    username: string;
    postId?: string;
  };
  timestamp: Date;
}

/**
 * Payload pour type de crime créé
 */
export interface CrimeTypeCreatedPayload {
  crimeType: any;
  createdBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

/**
 * Payload pour type de crime mis à jour
 */
export interface CrimeTypeUpdatedPayload {
  crimeType: any;
  updatedBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

/**
 * Payload pour type de crime supprimé
 */
export interface CrimeTypeDeletedPayload {
  crimeTypeId: string;
  name: string;
  deletedBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

/**
 * Payload pour utilisateur créé
 */
export interface UserCreatedPayload {
  user: any;
  createdBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

/**
 * Payload pour utilisateur mis à jour
 */
export interface UserUpdatedPayload {
  user: any;
  updatedBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

/**
 * Payload pour utilisateur supprimé
 */
export interface UserDeletedPayload {
  userId: string;
  username: string;
  deletedBy: {
    id: string;
    username: string;
  };
  timestamp: Date;
}

// ==================== INTERFACES DE CONFIGURATION ====================

/**
 * Options de configuration Socket.io
 */
export interface SocketConfig {
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  pingTimeout: number;
  pingInterval: number;
}

/**
 * Statistiques des connexions
 */
export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  connectedPosts: string[];
  connectedUsers: Array<{
    userId: string;
    username: string;
    postId?: string;
    connectedAt: Date;
  }>;
}

