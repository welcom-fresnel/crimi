# 🔌 Documentation WebSocket - Synchronisation Temps Réel

## 📋 Vue d'ensemble

Le backend utilise **Socket.io** pour permettre la **synchronisation en temps réel** des données entre les différents postes de police. Lorsqu'un criminel est créé, modifié ou supprimé dans un poste, tous les autres postes connectés sont automatiquement notifiés.

---

## 🎯 Objectif

**Synchroniser automatiquement les données entre plusieurs commissariats/postes de police** sans rechargement manuel.

### ✅ Fonctionnalités temps réel

- ✅ Notification de création de criminel
- ✅ Notification de modification de criminel
- ✅ Notification de suppression de criminel
- ✅ Notification de modification des types de crimes
- ✅ Notifications génériques

### ❌ Hors scope

- ❌ Chat entre utilisateurs
- ❌ Géolocalisation
- ❌ Partage de fichiers en temps réel

---

## 🏗️ Architecture

```
┌─────────────────┐         ┌─────────────────┐
│   Poste A       │         │   Poste B       │
│   (Frontend)    │         │   (Frontend)    │
└────────┬────────┘         └────────┬────────┘
         │                           │
         │   WebSocket               │   WebSocket
         │   Connection              │   Connection
         │                           │
         └──────────┬────────────────┘
                    │
         ┌──────────▼──────────┐
         │   Backend Server    │
         │   (Express + Socket.io) │
         └──────────┬──────────┘
                    │
         ┌──────────▼──────────┐
         │   PostgreSQL DB     │
         └─────────────────────┘
```

### Flow de synchronisation

```
1. Agent du Poste A crée un criminel
   ↓
2. Backend enregistre en base de données
   ↓
3. Backend émet un événement Socket.io
   ↓
4. Tous les postes connectés (B, C, D...) reçoivent la notification
   ↓
5. Les frontends mettent à jour leur interface automatiquement
```

---

## 🔐 Authentification WebSocket

### Connexion avec JWT

Le client doit s'authentifier avec un **token JWT** lors de la connexion Socket.io.

#### Option 1 : Via le handshake auth

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'VOTRE_JWT_TOKEN'
  }
});
```

#### Option 2 : Via les headers

```javascript
const socket = io('http://localhost:5000', {
  extraHeaders: {
    Authorization: 'Bearer VOTRE_JWT_TOKEN'
  }
});
```

#### Option 3 : Avec ID de poste

```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'VOTRE_JWT_TOKEN'
  },
  query: {
    postId: 'POSTE_123' // ID du commissariat/poste
  }
});
```

---

## 📡 Événements WebSocket

### Événements de connexion

#### `connection`
Émis automatiquement lors de la connexion (côté serveur uniquement).

#### `authenticated`
Reçu par le client après authentification réussie.

**Payload :**
```typescript
{
  success: true,
  message: 'Connexion établie',
  userId: 'user-id',
  username: 'admin',
  postId: 'POSTE_123' // Si fourni
}
```

**Exemple côté client :**
```javascript
socket.on('authenticated', (data) => {
  console.log('Connecté au serveur:', data);
});
```

#### `disconnect`
Émis lors de la déconnexion.

```javascript
socket.on('disconnect', (reason) => {
  console.log('Déconnecté:', reason);
});
```

#### `error`
Émis en cas d'erreur d'authentification.

```javascript
socket.on('error', (error) => {
  console.error('Erreur Socket.io:', error);
});
```

---

### Événements Criminels

#### `criminal:created`
Émis lorsqu'un criminel est créé dans n'importe quel poste.

**Payload :**
```typescript
{
  criminal: {
    id: 'criminal-id',
    caseNumber: 'CR-2024-003',
    firstName: 'John',
    lastName: 'Doe',
    crimeType: { ... },
    status: 'ACTIVE',
    // ... autres champs
  },
  createdBy: {
    id: 'user-id',
    username: 'agent1',
    postId: 'POSTE_A'
  },
  timestamp: '2024-01-09T10:30:00.000Z'
}
```

**Exemple d'utilisation :**
```javascript
socket.on('criminal:created', (data) => {
  console.log(`Nouveau criminel créé par ${data.createdBy.username}`);
  
  // Ajouter le criminel à la liste locale
  addCriminalToList(data.criminal);
  
  // Afficher une notification
  showNotification('info', 'Nouveau criminel enregistré', 
    `Dossier ${data.criminal.caseNumber} créé`);
});
```

#### `criminal:updated`
Émis lorsqu'un criminel est modifié.

**Payload :**
```typescript
{
  criminal: { ... }, // Données mises à jour
  changes: {
    before: { ... }, // Données avant modification
    after: { ... }   // Données après modification
  },
  updatedBy: {
    id: 'user-id',
    username: 'agent2',
    postId: 'POSTE_B'
  },
  timestamp: '2024-01-09T10:35:00.000Z'
}
```

**Exemple d'utilisation :**
```javascript
socket.on('criminal:updated', (data) => {
  console.log(`Criminel mis à jour par ${data.updatedBy.username}`);
  
  // Mettre à jour le criminel dans la liste locale
  updateCriminalInList(data.criminal);
  
  // Afficher notification
  showNotification('warning', 'Dossier mis à jour', 
    `Le dossier ${data.criminal.caseNumber} a été modifié`);
});
```

#### `criminal:deleted`
Émis lorsqu'un criminel est supprimé.

**Payload :**
```typescript
{
  criminalId: 'criminal-id',
  caseNumber: 'CR-2024-003',
  deletedBy: {
    id: 'user-id',
    username: 'admin',
    postId: 'POSTE_A'
  },
  timestamp: '2024-01-09T10:40:00.000Z'
}
```

**Exemple d'utilisation :**
```javascript
socket.on('criminal:deleted', (data) => {
  console.log(`Criminel supprimé par ${data.deletedBy.username}`);
  
  // Retirer le criminel de la liste locale
  removeCriminalFromList(data.criminalId);
  
  // Afficher notification
  showNotification('error', 'Dossier supprimé', 
    `Le dossier ${data.caseNumber} a été supprimé`);
});
```

---

### Événements Types de Crimes

#### `crimeType:created`
Nouveau type de crime créé.

```typescript
{
  crimeType: {
    id: 'crime-type-id',
    name: 'Cybercriminalité',
    code: 'CYBER002',
    severity: 'HIGH'
  },
  createdBy: { ... },
  timestamp: '2024-01-09T...'
}
```

#### `crimeType:updated`
Type de crime modifié.

#### `crimeType:deleted`
Type de crime supprimé.

---

### Événement Notification

#### `notification`
Notification générique pour informer l'utilisateur.

**Payload :**
```typescript
{
  type: 'info' | 'success' | 'warning' | 'error',
  title: 'Titre de la notification',
  message: 'Message détaillé',
  data: { ... }, // Données supplémentaires
  timestamp: '2024-01-09T...',
  userId: 'user-id',
  username: 'agent1'
}
```

**Exemple d'utilisation :**
```javascript
socket.on('notification', (notification) => {
  const { type, title, message } = notification;
  
  // Afficher avec votre système de notifications
  showToast(type, title, message);
});
```

---

## 💻 Exemple d'intégration Frontend

### React + Socket.io Client

#### 1. Installation

```bash
npm install socket.io-client
```

#### 2. Service Socket.io

```typescript
// services/socketService.ts
import { io, Socket } from 'socket.io-client';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string, postId?: string) {
    this.socket = io('http://localhost:5000', {
      auth: { token },
      query: { postId },
    });

    this.socket.on('authenticated', (data) => {
      console.log('✅ Connecté au serveur:', data);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Erreur de connexion:', error.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }

  // Écouter les criminels créés
  onCriminalCreated(callback: (data: any) => void) {
    this.socket?.on('criminal:created', callback);
  }

  // Écouter les criminels mis à jour
  onCriminalUpdated(callback: (data: any) => void) {
    this.socket?.on('criminal:updated', callback);
  }

  // Écouter les criminels supprimés
  onCriminalDeleted(callback: (data: any) => void) {
    this.socket?.on('criminal:deleted', callback);
  }

  // Écouter les notifications
  onNotification(callback: (notification: any) => void) {
    this.socket?.on('notification', callback);
  }

  // Retirer tous les listeners
  removeAllListeners() {
    this.socket?.removeAllListeners();
  }
}

export const socketService = new SocketService();
```

#### 3. Hook React personnalisé

```typescript
// hooks/useSocket.ts
import { useEffect } from 'react';
import { socketService } from '../services/socketService';
import { useAuth } from './useAuth'; // Votre hook d'auth

export const useSocket = () => {
  const { token, user } = useAuth();

  useEffect(() => {
    if (token) {
      // Connexion avec le token JWT
      socketService.connect(token, user?.postId);

      return () => {
        socketService.disconnect();
      };
    }
  }, [token, user]);

  return socketService;
};
```

#### 4. Utilisation dans un composant

```typescript
// components/CriminalsList.tsx
import React, { useEffect, useState } from 'react';
import { useSocket } from '../hooks/useSocket';
import { showToast } from '../utils/toast';

export const CriminalsList: React.FC = () => {
  const [criminals, setCriminals] = useState([]);
  const socket = useSocket();

  useEffect(() => {
    // Charger la liste initiale
    loadCriminals();

    // Écouter les événements temps réel
    socket.onCriminalCreated((data) => {
      console.log('Nouveau criminel:', data.criminal);
      
      // Ajouter à la liste
      setCriminals(prev => [data.criminal, ...prev]);
      
      // Notification
      showToast('info', 'Nouveau criminel', 
        `Dossier ${data.criminal.caseNumber} créé par ${data.createdBy.username}`);
    });

    socket.onCriminalUpdated((data) => {
      console.log('Criminel mis à jour:', data.criminal);
      
      // Mettre à jour dans la liste
      setCriminals(prev => 
        prev.map(c => c.id === data.criminal.id ? data.criminal : c)
      );
      
      showToast('warning', 'Dossier mis à jour', 
        `${data.criminal.caseNumber} modifié`);
    });

    socket.onCriminalDeleted((data) => {
      console.log('Criminel supprimé:', data.criminalId);
      
      // Retirer de la liste
      setCriminals(prev => 
        prev.filter(c => c.id !== data.criminalId)
      );
      
      showToast('error', 'Dossier supprimé', 
        `${data.caseNumber} supprimé`);
    });

    // Cleanup
    return () => {
      socket.removeAllListeners();
    };
  }, [socket]);

  return (
    <div>
      {/* Votre interface */}
      {criminals.map(criminal => (
        <CriminalCard key={criminal.id} criminal={criminal} />
      ))}
    </div>
  );
};
```

---

## 🧪 Tester WebSocket

### Avec Socket.io Client (JavaScript)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Test Socket.io</title>
  <script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
</head>
<body>
  <h1>Test WebSocket</h1>
  <div id="status">Déconnecté</div>
  <div id="events"></div>

  <script>
    const token = 'VOTRE_JWT_TOKEN'; // Obtenu via /api/auth/login

    const socket = io('http://localhost:5000', {
      auth: { token },
      query: { postId: 'POSTE_TEST' }
    });

    socket.on('authenticated', (data) => {
      document.getElementById('status').textContent = 'Connecté: ' + data.username;
      console.log('Authentifié:', data);
    });

    socket.on('criminal:created', (data) => {
      console.log('Criminel créé:', data);
      const div = document.getElementById('events');
      div.innerHTML += `<p>✅ Criminel créé: ${data.criminal.caseNumber}</p>`;
    });

    socket.on('criminal:updated', (data) => {
      console.log('Criminel mis à jour:', data);
      const div = document.getElementById('events');
      div.innerHTML += `<p>⚠️ Criminel mis à jour: ${data.criminal.caseNumber}</p>`;
    });

    socket.on('criminal:deleted', (data) => {
      console.log('Criminel supprimé:', data);
      const div = document.getElementById('events');
      div.innerHTML += `<p>❌ Criminel supprimé: ${data.caseNumber}</p>`;
    });

    socket.on('notification', (notification) => {
      console.log('Notification:', notification);
      const div = document.getElementById('events');
      div.innerHTML += `<p>📢 ${notification.title}: ${notification.message}</p>`;
    });

    socket.on('connect_error', (error) => {
      console.error('Erreur:', error.message);
      document.getElementById('status').textContent = 'Erreur: ' + error.message;
    });
  </script>
</body>
</html>
```

---

## 📊 API REST pour WebSocket

### Obtenir les statistiques des connexions

```
GET /api/socket/stats
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "totalConnections": 5,
    "activeConnections": 5,
    "connectedPosts": ["POSTE_A", "POSTE_B", "POSTE_C"],
    "connectedUsers": [
      {
        "userId": "user-1",
        "username": "agent1",
        "postId": "POSTE_A",
        "connectedAt": "2024-01-09T10:00:00.000Z"
      }
    ]
  }
}
```

### Obtenir le nombre de clients connectés

```
GET /api/socket/connected-count
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "connectedClients": 5
  }
}
```

### Vérifier si un utilisateur est connecté

```
GET /api/socket/user/:userId/status
Authorization: Bearer <token>
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "userId": "user-123",
    "isConnected": true
  }
}
```

---

## 🔧 Configuration

### Variables d'environnement

Aucune variable supplémentaire n'est requise. Socket.io utilise les mêmes configurations que le serveur :

```env
CORS_ORIGIN=http://localhost:3000  # Origine autorisée pour CORS
JWT_SECRET=votre_secret_jwt        # Pour l'authentification
```

### Options Socket.io (dans le code)

```typescript
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: config.corsOrigin,
    credentials: true,
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60000,    // 60 secondes
  pingInterval: 25000,   // 25 secondes
});
```

---

## 🐛 Résolution de problèmes

### Problème : "Token d'authentification manquant"

**Cause :** Le token JWT n'est pas fourni lors de la connexion.

**Solution :**
```javascript
const socket = io('http://localhost:5000', {
  auth: {
    token: 'VOTRE_TOKEN_ICI' // ✅
  }
});
```

### Problème : "Token invalide"

**Cause :** Le token JWT est expiré ou invalide.

**Solution :** Reconnectez-vous via `/api/auth/login` pour obtenir un nouveau token.

### Problème : CORS error

**Cause :** L'origine du client n'est pas autorisée.

**Solution :** Vérifiez `CORS_ORIGIN` dans `.env` :
```env
CORS_ORIGIN=http://localhost:3000
```

### Problème : Pas de notifications reçues

**Cause :** Les listeners ne sont pas configurés correctement.

**Solution :** Vérifiez que vous écoutez les bons événements :
```javascript
socket.on('criminal:created', (data) => {
  console.log('Événement reçu:', data);
});
```

---

## 📚 Ressources

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Socket.io Client API](https://socket.io/docs/v4/client-api/)
- [JWT Authentication](https://jwt.io/)

---

## ✅ Checklist d'intégration

- [ ] Installer `socket.io-client` dans le frontend
- [ ] Créer un service Socket.io
- [ ] Se connecter avec le token JWT
- [ ] Écouter les événements `criminal:created`, `criminal:updated`, `criminal:deleted`
- [ ] Mettre à jour l'interface en temps réel
- [ ] Afficher des notifications à l'utilisateur
- [ ] Gérer la reconnexion automatique
- [ ] Tester avec plusieurs clients simultanés

---

**Votre système de synchronisation temps réel est prêt ! 🚀**

