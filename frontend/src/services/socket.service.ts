import { io, Socket } from 'socket.io-client';

const resolveSocketUrl = () => {
  const configured = import.meta.env.VITE_WS_URL as string | undefined;
  if (configured && configured.trim().length > 0) {
    return configured;
  }

  const backendIp = import.meta.env.VITE_BACKEND_IP as string | undefined;
  const host = backendIp || window.location.hostname || '127.0.0.1';
  return `http://${host}:5000`;
};

const SOCKET_URL = resolveSocketUrl();

type SocketListener = (...args: unknown[]) => void;

interface CriminalSocketPayload {
  criminal?: Record<string, unknown>;
  criminalId?: string;
  caseNumber?: string;
  by?: { id: string; username: string };
  timestamp?: string;
}

interface NotificationPayload {
  type?: 'error' | 'warning' | 'success' | 'info';
  title?: string;
  message?: string;
}

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, SocketListener[]> = new Map();

  // Connexion au serveur WebSocket
  connect(token: string, postId?: string) {
    if (this.socket?.connected) {
      if (import.meta.env.DEV) console.log('🔌 Socket déjà connecté');
      return;
    }

    // Si un socket existe mais n'est pas connecté, le nettoyer
    if (this.socket && !this.socket.connected) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    if (import.meta.env.DEV) console.log('🔌 Connexion au WebSocket...');

    this.socket = io(SOCKET_URL, {
      auth: { token },
      query: { postId },
    });

    // Événement : Authentification réussie
    this.socket.on('authenticated', (data) => {
      if (import.meta.env.DEV) console.log('✅ Connecté au WebSocket:', data);
      // Ne pas reconnecter si déjà connecté
    });

    // Événement : Erreur de connexion
    this.socket.on('connect_error', (error) => {
      if (import.meta.env.DEV) console.error('❌ Erreur WebSocket:', error.message);
    });

    // Événement : Déconnexion
    this.socket.on('disconnect', (reason) => {
      if (import.meta.env.DEV) console.log('📡 Déconnecté:', reason);
    });

    // Réattacher les listeners enregistrés
    this.listeners.forEach((callbacks, event) => {
      callbacks.forEach((callback) => {
        this.socket?.on(event, callback);
      });
    });
  }

  // Déconnexion
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      if (import.meta.env.DEV) console.log('🔌 Déconnecté du WebSocket');
    }
  }

  // Écouter un événement
  on(event: string, callback: SocketListener) {
    // Sauvegarder le listener
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    const callbacks = this.listeners.get(event);
    if (callbacks?.includes(callback)) return;
    callbacks?.push(callback);

    // Attacher au socket si connecté
    if (this.socket) {
      this.socket.on(event, callback);
    }
  }

  // Retirer un listener
  off(event: string, callback?: SocketListener) {
    if (callback) {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
      this.socket?.off(event, callback);
    } else {
      this.listeners.delete(event);
      this.socket?.off(event);
    }
  }

  // Retirer tous les listeners
  removeAllListeners() {
    this.listeners.clear();
    this.socket?.removeAllListeners();
  }

  // Vérifier si connecté
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  // ==================== MÉTHODES PRATIQUES ====================

  // Écouter les criminels créés
  onCriminalCreated(callback: (data: CriminalSocketPayload) => void) {
    this.on('criminal:created', callback);
  }

  // Écouter les criminels mis à jour
  onCriminalUpdated(callback: (data: CriminalSocketPayload) => void) {
    this.on('criminal:updated', callback);
  }

  // Écouter les criminels supprimés
  onCriminalDeleted(callback: (data: CriminalSocketPayload) => void) {
    this.on('criminal:deleted', callback);
  }

  // Écouter les notifications
  onNotification(callback: (data: NotificationPayload) => void) {
    this.on('notification', callback);
  }
}

// Export d'une instance unique (Singleton)
export const socketService = new SocketService();

