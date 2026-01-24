# 🔌 Guide d'Intégration WebSocket - Backend Complet

## ✅ Ce qui a été ajouté

Le backend dispose maintenant d'une **synchronisation temps réel complète** pour permettre aux différents postes de police de rester synchronisés automatiquement.

---

## 📦 Nouveaux fichiers créés

### Types
- ✅ `src/types/socket.types.ts` - Types TypeScript pour Socket.io

### Services
- ✅ `src/services/socket.service.ts` - Service Socket.io (gestion des événements)

### Controllers
- ✅ `src/controllers/socket.controller.ts` - Contrôleur pour les stats WebSocket

### Routes
- ✅ `src/routes/socket.routes.ts` - Routes API pour les statistiques

### Documentation
- ✅ `WEBSOCKET.md` - Documentation complète WebSocket

### Fichiers modifiés
- ✅ `package.json` - Socket.io ajouté aux dépendances
- ✅ `src/server.ts` - Socket.io intégré au serveur HTTP
- ✅ `src/controllers/criminal.controller.ts` - Émissions d'événements ajoutées
- ✅ `src/controllers/crimeType.controller.ts` - Émissions d'événements ajoutées
- ✅ `src/routes/index.ts` - Routes Socket ajoutées

---

## 🎯 Fonctionnement

### 1. Authentification WebSocket

Le client se connecte avec son **token JWT** :

```javascript
const socket = io('http://localhost:5000', {
  auth: { token: jwtToken },
  query: { postId: 'POSTE_A' }
});
```

Le serveur vérifie le token et authentifie l'utilisateur.

### 2. Événements automatiques

Lorsqu'un agent **crée/modifie/supprime** un criminel :

```
Agent Poste A → Crée un criminel
  ↓
Backend enregistre en BDD
  ↓
Backend émet l'événement 'criminal:created'
  ↓
Tous les postes connectés (B, C, D...) reçoivent l'événement
  ↓
Les interfaces se mettent à jour automatiquement
```

### 3. Notifications

Chaque action génère **2 événements** :

1. **Événement spécifique** (`criminal:created`)
   - Contient les données complètes
   - Pour mise à jour de l'interface

2. **Notification générique** (`notification`)
   - Contient un message formaté
   - Pour affichage toast/notification

---

## 🔧 Utilisation

### Backend (Déjà fait ✅)

Le backend émet automatiquement les événements lors des opérations CRUD :

```typescript
// Dans criminal.controller.ts
const payload: CriminalCreatedPayload = {
  criminal,
  createdBy: {
    id: req.user!.userId,
    username: req.user!.username,
    postId: req.body.postId,
  },
  timestamp: new Date(),
};

socketService.notifyCriminalCreated(payload);
```

**Aucune configuration supplémentaire n'est requise côté backend !**

### Frontend (À faire)

Pour intégrer dans votre frontend, suivez **[WEBSOCKET.md](./WEBSOCKET.md)**.

Résumé rapide :

```bash
# 1. Installer le client
npm install socket.io-client
```

```typescript
// 2. Créer un service
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: { token: getAuthToken() }
});

// 3. Écouter les événements
socket.on('criminal:created', (data) => {
  // Ajouter le criminel à la liste
});

socket.on('criminal:updated', (data) => {
  // Mettre à jour le criminel
});

socket.on('criminal:deleted', (data) => {
  // Retirer le criminel
});
```

---

## 📡 Événements disponibles

### Connexion
- `connection` - Connexion établie (serveur)
- `authenticated` - Authentification réussie (client)
- `disconnect` - Déconnexion

### Criminels
- `criminal:created` - Criminel créé
- `criminal:updated` - Criminel modifié
- `criminal:deleted` - Criminel supprimé

### Types de crimes
- `crimeType:created` - Type de crime créé
- `crimeType:updated` - Type de crime modifié
- `crimeType:deleted` - Type de crime supprimé

### Notifications
- `notification` - Notification générique

---

## 🧪 Test rapide

### 1. Démarrer le serveur

```bash
cd backend
npm install
npm run dev
```

Console affiche :
```
✅ Connexion à la base de données réussie
✅ Socket.io initialisé avec succès
🚀 Serveur démarré sur le port 5000
🔌 WebSocket: ws://localhost:5000
📡 Synchronisation temps réel activée
```

### 2. Tester avec HTML + JavaScript

Créer un fichier `test-socket.html` :

```html
<!DOCTYPE html>
<html>
<head>
  <script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
</head>
<body>
  <h1>Test WebSocket</h1>
  <div id="status">Déconnecté</div>
  <div id="events"></div>

  <script>
    // 1. Se connecter d'abord via /api/auth/login pour obtenir un token
    const token = prompt('Entrez votre JWT token:');

    const socket = io('http://localhost:5000', {
      auth: { token }
    });

    socket.on('authenticated', (data) => {
      document.getElementById('status').innerText = 
        `Connecté: ${data.username}`;
    });

    socket.on('criminal:created', (data) => {
      document.getElementById('events').innerHTML += 
        `<p>✅ Nouveau criminel: ${data.criminal.caseNumber}</p>`;
    });

    socket.on('notification', (notif) => {
      document.getElementById('events').innerHTML += 
        `<p>📢 ${notif.title}: ${notif.message}</p>`;
    });
  </script>
</body>
</html>
```

### 3. Tester la synchronisation

1. Ouvrir 2 onglets avec le fichier HTML
2. Se connecter avec différents utilisateurs
3. Créer un criminel via API (Postman/Insomnia)
4. Observer la notification apparaître dans les 2 onglets ✅

---

## 📊 API Stats WebSocket

### Obtenir les statistiques

```bash
curl http://localhost:5000/api/socket/stats \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "totalConnections": 3,
    "activeConnections": 3,
    "connectedPosts": ["POSTE_A", "POSTE_B"],
    "connectedUsers": [
      {
        "userId": "user-1",
        "username": "agent1",
        "postId": "POSTE_A",
        "connectedAt": "2024-01-09T..."
      }
    ]
  }
}
```

---

## 🎓 Prochaines étapes

### Pour le frontend

1. **Lire la documentation** : `WEBSOCKET.md`
2. **Installer socket.io-client** : `npm install socket.io-client`
3. **Créer un service Socket** (voir exemples dans WEBSOCKET.md)
4. **Écouter les événements** dans vos composants
5. **Afficher des notifications** à l'utilisateur

### Exemple React

```typescript
// hooks/useRealtimeSync.ts
import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { useCriminals } from './useCriminals';

export const useRealtimeSync = () => {
  const socket = useSocket();
  const { addCriminal, updateCriminal, removeCriminal } = useCriminals();

  useEffect(() => {
    socket.onCriminalCreated((data) => {
      addCriminal(data.criminal);
      showNotification('Nouveau criminel', data.criminal.caseNumber);
    });

    socket.onCriminalUpdated((data) => {
      updateCriminal(data.criminal);
    });

    socket.onCriminalDeleted((data) => {
      removeCriminal(data.criminalId);
    });

    return () => {
      socket.removeAllListeners();
    };
  }, [socket]);
};
```

---

## 🔐 Sécurité

### ✅ Implémenté

- Authentification JWT obligatoire
- Vérification du token à chaque connexion
- Rooms par poste (isolation des événements)
- Émission ciblée (pas de broadcast à soi-même)

### Bonnes pratiques

- Ne jamais exposer le token dans les logs
- Utiliser HTTPS en production
- Configurer CORS correctement
- Limiter le nombre de connexions par utilisateur (à implémenter si besoin)

---

## 🐛 Troubleshooting

### Problème : "Token d'authentification manquant"

**Solution :** Vérifiez que vous passez le token :
```javascript
socket = io(url, { auth: { token: 'YOUR_TOKEN' } });
```

### Problème : Pas de notifications reçues

**Causes possibles :**
1. Listener pas configuré
2. Token expiré
3. CORS bloqué

**Solution :**
```javascript
// Vérifier la connexion
socket.on('connect', () => console.log('Connecté'));
socket.on('authenticated', (data) => console.log('Auth OK:', data));
socket.on('connect_error', (err) => console.error('Erreur:', err));
```

---

## 📚 Documentation

- **[WEBSOCKET.md](./WEBSOCKET.md)** - Documentation complète
- **[README.md](./README.md)** - Documentation générale
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Architecture backend

---

## ✅ Checklist

### Backend (Fait ✅)
- [x] Socket.io installé et configuré
- [x] Authentification JWT pour WebSocket
- [x] Émission d'événements dans les contrôleurs
- [x] Service Socket centralisé
- [x] Routes API pour les stats
- [x] Documentation complète

### Frontend (À faire)
- [ ] Installer socket.io-client
- [ ] Créer un service Socket
- [ ] Se connecter avec le token JWT
- [ ] Écouter les événements
- [ ] Mettre à jour l'UI en temps réel
- [ ] Afficher des notifications
- [ ] Gérer la reconnexion

---

**Le backend est 100% prêt pour la synchronisation temps réel ! 🎉**

Il ne vous reste plus qu'à intégrer Socket.io dans votre frontend en suivant les exemples de la documentation.

**Questions ?** Consultez [WEBSOCKET.md](./WEBSOCKET.md) pour des guides détaillés et des exemples de code.

