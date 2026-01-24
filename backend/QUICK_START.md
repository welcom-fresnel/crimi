# 🚀 Guide de démarrage rapide

Ce guide vous permettra de démarrer le backend en quelques minutes.

## ⚡ Installation rapide

### 1. Prérequis

Assurez-vous d'avoir installé :
- Node.js (v18+)
- PostgreSQL (v14+)
- npm ou yarn

### 2. Installation

```bash
# Naviguer vers le dossier backend
cd backend

# Installer les dépendances
npm install
```

### 3. Configuration de la base de données

**Créer la base de données PostgreSQL :**

```sql
CREATE DATABASE securit_afrique_db;
```

**Configurer les variables d'environnement :**

Créer un fichier `.env` :

```bash
cp .env.example .env
```

Éditer `.env` :

```env
DATABASE_URL="postgresql://username:password@localhost:5432/securit_afrique_db?schema=public"
PORT=5000
NODE_ENV=development
JWT_SECRET=changez_ce_secret_en_production
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:3000
```

⚠️ **Remplacez `username` et `password` par vos identifiants PostgreSQL !**

### 4. Initialiser la base de données

```bash
# Générer le client Prisma
npm run prisma:generate

# Exécuter les migrations
npm run prisma:migrate

# Insérer les données initiales
npm run prisma:seed
```

### 5. Démarrer le serveur

```bash
# Mode développement (avec auto-reload)
npm run dev
```

Le serveur démarre sur `http://localhost:5000` 🎉

## ✅ Vérification

### Tester l'API

Ouvrez votre navigateur ou utilisez curl :

```bash
curl http://localhost:5000/api/health
```

Réponse attendue :
```json
{
  "success": true,
  "message": "API Securit Afrique Hub - Backend opérationnel",
  "timestamp": "2024-01-09T10:30:00.000Z"
}
```

## 🔐 Comptes de test

Après le seed, vous avez deux comptes disponibles :

### Compte Administrateur
```
Email: admin@securit-afrique.com
Mot de passe: admin123
Rôle: ADMIN
```

### Compte Agent
```
Email: agent@securit-afrique.com
Mot de passe: admin123
Rôle: AGENT
```

## 📡 Tester l'authentification

### 1. Login

**Requête :**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Réponse :**
```json
{
  "success": true,
  "message": "Connexion réussie",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "...",
      "username": "admin",
      "email": "admin@securit-afrique.com",
      "roles": ["ADMIN"],
      "profile": {
        "firstName": "Super",
        "lastName": "Administrateur"
      }
    }
  }
}
```

### 2. Utiliser le token

Copiez le token et utilisez-le dans le header `Authorization` :

```bash
curl -X GET http://localhost:5000/api/criminals \
  -H "Authorization: Bearer VOTRE_TOKEN_ICI"
```

## 🛠️ Commandes utiles

```bash
# Démarrer en mode développement
npm run dev

# Build pour la production
npm run build

# Démarrer en production
npm start

# Ouvrir Prisma Studio (interface graphique DB)
npm run prisma:studio

# Créer une migration
npx prisma migrate dev --name nom_migration

# Réinitialiser la DB
npx prisma migrate reset
```

## 🧪 Tester avec Postman/Insomnia

### Import de collection (exemple pour Postman)

Créez une nouvelle collection avec ces endpoints :

**Base URL :** `http://localhost:5000/api`

**Headers globaux :**
```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Endpoints principaux :**

```
POST   /auth/login
POST   /auth/register
GET    /auth/profile

GET    /criminals
POST   /criminals
GET    /criminals/:id
PUT    /criminals/:id
DELETE /criminals/:id
GET    /criminals/search?name=...

GET    /crime-types
POST   /crime-types
GET    /crime-types/:id
PUT    /crime-types/:id
DELETE /crime-types/:id

GET    /users
GET    /users/:id
PUT    /users/:id
DELETE /users/:id

GET    /audit
GET    /audit/:id
```

## 📊 Exemples de requêtes

### Créer un criminel

```bash
curl -X POST http://localhost:5000/api/criminals \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer VOTRE_TOKEN" \
  -d '{
    "caseNumber": "CR-2024-003",
    "firstName": "John",
    "lastName": "Doe",
    "crimeTypeId": "ID_DU_TYPE_DE_CRIME",
    "description": "Description détaillée du crime commis par le suspect",
    "status": "ACTIVE",
    "dangerLevel": "MEDIUM"
  }'
```

### Rechercher des criminels

```bash
curl -X GET "http://localhost:5000/api/criminals/search?name=John&status=ACTIVE" \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

### Lister les types de crimes

```bash
curl -X GET http://localhost:5000/api/crime-types \
  -H "Authorization: Bearer VOTRE_TOKEN"
```

## 🐛 Dépannage

### Erreur de connexion à la base de données

```
Error: Can't reach database server
```

**Solution :**
- Vérifiez que PostgreSQL est démarré
- Vérifiez le `DATABASE_URL` dans `.env`
- Vérifiez que la base de données existe

### Erreur "JWT_SECRET is not defined"

**Solution :**
- Assurez-vous que le fichier `.env` existe
- Vérifiez que `JWT_SECRET` est défini dans `.env`

### Port déjà utilisé

```
Error: Port 5000 is already in use
```

**Solution :**
- Changez le port dans `.env`
- Ou arrêtez le processus qui utilise le port 5000

## 📖 Documentation complète

Pour plus d'informations :
- [README.md](./README.md) - Documentation complète
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture détaillée
- [Prisma Schema](./prisma/schema.prisma) - Modèles de données

## 🆘 Support

En cas de problème :
1. Vérifiez les logs du serveur dans la console
2. Consultez la documentation complète
3. Vérifiez que toutes les étapes ont été suivies

---

**Bon développement ! 🚀**

