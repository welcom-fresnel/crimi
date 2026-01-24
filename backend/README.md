# Backend - Securit Afrique Hub

Backend de l'application de gestion centralisée des criminels destinée aux services de sécurité d'Afrique.

## 📋 Table des matières

- [Technologies](#technologies)
- [Architecture](#architecture)
- [Installation](#installation)
- [Configuration](#configuration)
- [Utilisation](#utilisation)
- [Multi-Postes de Police](#multi-postes-de-police) 🆕
- [API Endpoints](#api-endpoints)
- [Modèles de données](#modèles-de-données)
- [Système d'audit](#système-daudit)
- [Sécurité](#sécurité)

## 🚀 Technologies

- **Node.js** avec **TypeScript**
- **Express** - Framework web
- **PostgreSQL** - Base de données
- **Prisma** - ORM
- **JWT** - Authentification
- **Socket.io** - Synchronisation temps réel
- **bcryptjs** - Hashage des mots de passe
- **express-validator** - Validation des données

## 🏗️ Architecture

Le projet suit une architecture modulaire et organisée :

```
backend/
├── prisma/
│   ├── schema.prisma       # Schéma de la base de données
│   └── seed.ts             # Données initiales
├── src/
│   ├── config/             # Configuration de l'application
│   │   ├── index.ts
│   │   └── permissions.ts
│   ├── controllers/        # Contrôleurs (logique des routes)
│   │   ├── auth.controller.ts
│   │   ├── criminal.controller.ts
│   │   ├── crimeType.controller.ts
│   │   ├── audit.controller.ts
│   │   └── user.controller.ts
│   ├── middlewares/        # Middlewares personnalisés
│   │   ├── auth.middleware.ts
│   │   ├── audit.middleware.ts
│   │   ├── error.middleware.ts
│   │   └── validation.middleware.ts
│   ├── routes/             # Définition des routes
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── criminal.routes.ts
│   │   ├── crimeType.routes.ts
│   │   ├── audit.routes.ts
│   │   └── user.routes.ts
│   ├── services/           # Logique métier
│   │   ├── auth.service.ts
│   │   ├── criminal.service.ts
│   │   ├── crimeType.service.ts
│   │   ├── audit.service.ts
│   │   └── user.service.ts
│   ├── types/              # Types TypeScript
│   │   └── index.ts
│   ├── utils/              # Utilitaires
│   │   ├── ApiError.ts
│   │   └── prisma.ts
│   ├── validators/         # Validateurs de données
│   │   ├── auth.validator.ts
│   │   ├── criminal.validator.ts
│   │   └── crimeType.validator.ts
│   └── server.ts           # Point d'entrée du serveur
├── .env.example            # Exemple de configuration
├── .gitignore
├── package.json
├── tsconfig.json
└── README.md
```

## 📦 Installation

### Prérequis

- Node.js (v18 ou supérieur)
- PostgreSQL (v14 ou supérieur)
- npm ou yarn

### Étapes d'installation

1. **Cloner le repository et naviguer vers le dossier backend**

```bash
cd backend
```

2. **Installer les dépendances**

```bash
npm install
```

3. **Configurer les variables d'environnement**

Créer un fichier `.env` à la racine du dossier backend :

```bash
cp .env.example .env
```

Éditer le fichier `.env` avec vos configurations :

```env
DATABASE_URL="postgresql://username:password@localhost:5432/securit_afrique_db?schema=public"
PORT=5000
NODE_ENV=development
JWT_SECRET=votre_secret_jwt_tres_securise_a_changer
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:3000
```

4. **Créer la base de données PostgreSQL**

```sql
CREATE DATABASE securit_afrique_db;
```

5. **Générer le client Prisma et exécuter les migrations**

```bash
npm run prisma:generate
npm run prisma:migrate
```

6. **Seed de la base de données (données initiales)**

```bash
npm run prisma:seed
```

## 🔧 Configuration

Les fichiers de configuration se trouvent dans `src/config/` :

- **index.ts** : Configuration générale de l'application
- **permissions.ts** : Définition des permissions par rôle

### Rôles et Permissions

Le système utilise 3 rôles prédéfinis :

- **ADMIN** : Accès complet à toutes les ressources
- **AGENT** : Peut créer, lire et modifier les criminels
- **VIEWER** : Lecture seule des criminels et types de crimes

## 🚀 Utilisation

### Démarrage en mode développement

```bash
npm run dev
```

### Build de production

```bash
npm run build
```

### Démarrage en production

```bash
npm start
```

### Autres commandes utiles

```bash
# Ouvrir Prisma Studio (interface graphique pour la BDD)
npm run prisma:studio

# Créer une nouvelle migration
npx prisma migrate dev --name nom_de_la_migration

# Réinitialiser la base de données
npx prisma migrate reset
```

## 🏢 Multi-Postes de Police

Le système est conçu pour fonctionner avec **plusieurs postes de police** qui partagent une **base de données centralisée** et se synchronisent en **temps réel** via WebSocket.

### Documentation complète

📚 **[Guide Multi-Postes complet](GUIDE_MULTI_POSTES.md)** - Guide détaillé pour ajouter et configurer plusieurs postes

🚀 **[Démarrage rapide](QUICK_START_MULTI_POSTES.md)** - Guide rapide en 5 étapes

### Points clés

- ✅ **Base de données unique** : Tous les postes partagent la même base PostgreSQL
- ✅ **Serveurs indépendants** : Chaque poste a son propre backend (ports différents)
- ✅ **Synchronisation temps réel** : Les modifications sont propagées automatiquement via WebSocket
- ✅ **Configuration simple** : Ajouter un nouveau poste en quelques minutes

### Configuration minimale

**Backend (.env) :**
```env
PORT=5001                    # Port unique pour ce poste
DATABASE_URL=postgresql://... # MÊME base pour tous les postes
JWT_SECRET=...               # MÊME secret pour tous les postes
CORS_ORIGIN=http://localhost:8081
POST_ID=POSTE_B              # Identifiant unique
```

**Frontend (.env) :**
```env
VITE_API_URL=http://localhost:5001
VITE_WS_URL=http://localhost:5001
VITE_POST_ID=POSTE_B
```

### Scripts disponibles

- `scripts/start-poste.sh` - Démarrage automatique (Linux/Mac)
- `scripts/start-poste.bat` - Démarrage automatique (Windows)
- `scripts/check-config.sh` - Vérification de la configuration

Voir [scripts/README.md](scripts/README.md) pour plus d'informations.

## 📡 API Endpoints

### Authentification

```
POST   /api/auth/register        - Inscription (création de compte)
POST   /api/auth/login           - Connexion
POST   /api/auth/logout          - Déconnexion
GET    /api/auth/profile         - Obtenir le profil de l'utilisateur connecté
POST   /api/auth/change-password - Changer le mot de passe
```

### Criminels

```
POST   /api/criminals            - Créer un criminel
GET    /api/criminals            - Lister tous les criminels (pagination)
GET    /api/criminals/:id        - Obtenir un criminel par ID
PUT    /api/criminals/:id        - Modifier un criminel
DELETE /api/criminals/:id        - Supprimer un criminel
GET    /api/criminals/search     - Rechercher des criminels
```

### Types de crimes

```
POST   /api/crime-types          - Créer un type de crime
GET    /api/crime-types          - Lister tous les types de crimes
GET    /api/crime-types/:id      - Obtenir un type de crime par ID
PUT    /api/crime-types/:id      - Modifier un type de crime
DELETE /api/crime-types/:id      - Supprimer un type de crime
```

### Utilisateurs

```
GET    /api/users                - Lister tous les utilisateurs
GET    /api/users/:id            - Obtenir un utilisateur par ID
PUT    /api/users/:id            - Modifier un utilisateur
PATCH  /api/users/:id/toggle-status - Activer/Désactiver un utilisateur
DELETE /api/users/:id            - Supprimer un utilisateur
```

### Audit

```
GET    /api/audit                - Lister tous les logs d'audit
GET    /api/audit/:id            - Obtenir un log d'audit par ID
GET    /api/audit/:entity/:entityId - Historique d'audit d'une entité
```

### Santé

```
GET    /                         - Page d'accueil
GET    /api/health               - Vérifier l'état de l'API
```

## 🗄️ Modèles de données

### Principales entités

- **User** : Utilisateurs du système (agents de sécurité)
- **Profile** : Profils des utilisateurs
- **Role** : Rôles et permissions
- **UserRole** : Liaison utilisateurs-rôles
- **Criminal** : Criminels enregistrés
- **CrimeType** : Types de crimes
- **AuditLog** : Journaux d'audit

Consultez `prisma/schema.prisma` pour le schéma complet.

## 📊 Système d'audit

Le système d'audit enregistre automatiquement :

- Les **actions** : CREATE, UPDATE, DELETE, LOGIN, LOGOUT
- L'**utilisateur** qui a effectué l'action
- L'**entité** concernée (CRIMINAL, USER, CRIME_TYPE, etc.)
- Les **changements** (avant/après)
- **Métadonnées** : IP, User-Agent, timestamp

Toutes les opérations sensibles sont auditées automatiquement via des middlewares.

## 🔐 Sécurité

### Mesures de sécurité implémentées

1. **Authentification JWT** avec tokens sécurisés
2. **Hashage des mots de passe** avec bcryptjs
3. **Validation des données** avec express-validator
4. **Contrôle d'accès basé sur les rôles** (RBAC)
5. **Protection CORS** configurée
6. **Helmet** pour les headers de sécurité HTTP
7. **Audit automatique** de toutes les actions sensibles
8. **Gestion centralisée des erreurs**

### Bonnes pratiques

- Ne jamais commit le fichier `.env`
- Changer le `JWT_SECRET` en production
- Utiliser HTTPS en production
- Limiter les tentatives de connexion
- Logs détaillés des erreurs

## 🔌 WebSocket - Synchronisation Temps Réel

Le backend intègre **Socket.io** pour synchroniser automatiquement les données entre les différents postes de police en temps réel.

### Événements temps réel

- ✅ **criminal:created** - Notification de création de criminel
- ✅ **criminal:updated** - Notification de modification de criminel
- ✅ **criminal:deleted** - Notification de suppression de criminel
- ✅ **crimeType:created/updated/deleted** - Modifications des types de crimes
- ✅ **notification** - Notifications génériques

### Exemple de connexion

```javascript
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: 'VOTRE_JWT_TOKEN'
  },
  query: {
    postId: 'POSTE_A' // ID du commissariat
  }
});

socket.on('criminal:created', (data) => {
  console.log('Nouveau criminel:', data.criminal);
  // Mettre à jour l'interface
});
```

### Documentation complète

Consultez **[WEBSOCKET.md](./WEBSOCKET.md)** pour :
- Guide d'intégration frontend
- Liste complète des événements
- Exemples de code React/Vue/Angular
- Résolution de problèmes

## 📝 Comptes de test

Après avoir exécuté le seed, vous pouvez vous connecter avec :

**Administrateur :**
- Email : `admin@securit-afrique.com`
- Mot de passe : `admin123`

**Agent :**
- Email : `agent@securit-afrique.com`
- Mot de passe : `admin123`

**⚠️ Important** : Changez ces mots de passe en production !

## 🧪 Tests

Pour tester l'API, vous pouvez utiliser :

- **Postman** ou **Insomnia** pour les requêtes HTTP
- **Thunder Client** (extension VS Code)
- **curl** en ligne de commande

## 📄 Licence

Ce projet est un projet académique développé pour les besoins des services de sécurité.

## 👥 Support

Pour toute question ou problème, veuillez contacter l'équipe de développement.

---

**Développé avec ❤️ pour Securit Afrique Hub**

