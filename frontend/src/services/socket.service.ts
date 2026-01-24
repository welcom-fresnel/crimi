import { io, Socket } from 'socket.io-client';

const SOCKET_URL = 'http://localhost:5000';

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Function[]> = new Map();

  // Connexion au serveur WebSocket
  connect(token: string, postId?: string) {
    if (this.socket?.connected) {
      console.log('🔌 Socket déjà connecté');
      return;
    }

    // Si un socket existe mais n'est pas connecté, le nettoyer
    if (this.socket && !this.socket.connected) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }

    console.log('🔌 Connexion au WebSocket...');

    this.socket = io(SOCKET_URL, {
      auth: { token },
      query: { postId },
    });

    // Événement : Authentification réussie
    this.socket.on('authenticated', (data) => {
      console.log('✅ Connecté au WebSocket:', data);
      // Ne pas reconnecter si déjà connecté
    });

    // Événement : Erreur de connexion
    this.socket.on('connect_error', (error) => {
      console.error('❌ Erreur WebSocket:', error.message);
    });

    // Événement : Déconnexion
    this.socket.on('disconnect', (reason) => {
      console.log('📡 Déconnecté:', reason);
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
      console.log('🔌 Déconnecté du WebSocket');
    }
  }

  // Écouter un événement
  on(event: string, callback: Function) {
    // Sauvegarder le listener
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)?.push(callback);

    // Attacher au socket si connecté
    if (this.socket) {
      this.socket.on(event, callback as any);
    }
  }

  // Retirer un listener
  off(event: string, callback?: Function) {
    if (callback) {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
      this.socket?.off(event, callback as any);
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
  onCriminalCreated(callback: (data: any) => void) {
    this.on('criminal:created', callback);
  }

  // Écouter les criminels mis à jour
  onCriminalUpdated(callback: (data: any) => void) {
    this.on('criminal:updated', callback);
  }

  // Écouter les criminels supprimés
  onCriminalDeleted(callback: (data: any) => void) {
    this.on('criminal:deleted', callback);
  }

  // Écouter les notifications
  onNotification(callback: (data: any) => void) {
    this.on('notification', callback);
  }
}

// Export d'une instance unique (Singleton)
export const socketService = new SocketService();

