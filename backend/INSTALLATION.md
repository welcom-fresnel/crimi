# 📋 Guide d'installation complet

## 🎯 Vue d'ensemble

Ce guide vous accompagne pas à pas dans l'installation et la configuration du backend de l'application Securit Afrique Hub.

## 📦 Fichiers du projet

Le backend est maintenant complet avec :

### Configuration
- ✅ `package.json` - Dépendances et scripts
- ✅ `tsconfig.json` - Configuration TypeScript
- ✅ `.env.example` - Exemple de configuration
- ✅ `.gitignore` - Fichiers à ignorer
- ✅ `nodemon.json` - Configuration nodemon

### Prisma
- ✅ `prisma/schema.prisma` - Schéma de la base de données
- ✅ `prisma/seed.ts` - Script de seed

### Code source (`src/`)

#### Configuration
- ✅ `config/index.ts` - Configuration de l'app
- ✅ `config/permissions.ts` - Permissions RBAC

#### Types
- ✅ `types/index.ts` - Types TypeScript

#### Middlewares
- ✅ `middlewares/auth.middleware.ts` - Authentification/Autorisation
- ✅ `middlewares/audit.middleware.ts` - Audit automatique
- ✅ `middlewares/error.middleware.ts` - Gestion des erreurs
- ✅ `middlewares/validation.middleware.ts` - Validation

#### Services
- ✅ `services/auth.service.ts` - Service d'authentification
- ✅ `services/criminal.service.ts` - Service des criminels
- ✅ `services/crimeType.service.ts` - Service des types de crimes
- ✅ `services/audit.service.ts` - Service d'audit
- ✅ `services/user.service.ts` - Service des utilisateurs

#### Controllers
- ✅ `controllers/auth.controller.ts` - Contrôleur auth
- ✅ `controllers/criminal.controller.ts` - Contrôleur criminels
- ✅ `controllers/crimeType.controller.ts` - Contrôleur types de crimes
- ✅ `controllers/audit.controller.ts` - Contrôleur audit
- ✅ `controllers/user.controller.ts` - Contrôleur utilisateurs

#### Validators
- ✅ `validators/auth.validator.ts` - Validateurs auth
- ✅ `validators/criminal.validator.ts` - Validateurs criminels
- ✅ `validators/crimeType.validator.ts` - Validateurs types de crimes

#### Routes
- ✅ `routes/index.ts` - Routes principales
- ✅ `routes/auth.routes.ts` - Routes auth
- ✅ `routes/criminal.routes.ts` - Routes criminels
- ✅ `routes/crimeType.routes.ts` - Routes types de crimes
- ✅ `routes/audit.routes.ts` - Routes audit
- ✅ `routes/user.routes.ts` - Routes utilisateurs

#### Utils
- ✅ `utils/ApiError.ts` - Classe d'erreur personnalisée
- ✅ `utils/prisma.ts` - Client Prisma

#### Serveur
- ✅ `server.ts` - Point d'entrée principal

### Documentation
- ✅ `README.md` - Documentation complète
- ✅ `ARCHITECTURE.md` - Architecture détaillée
- ✅ `QUICK_START.md` - Démarrage rapide
- ✅ `INSTALLATION.md` - Ce fichier

## 🚀 Installation étape par étape

### Étape 1 : Prérequis

Installez les outils nécessaires :

#### Windows
```powershell
# Node.js - Téléchargez depuis https://nodejs.org/
# PostgreSQL - Téléchargez depuis https://www.postgresql.org/download/windows/
```

#### Linux (Ubuntu/Debian)
```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL
sudo apt-get install postgresql postgresql-contrib
```

#### macOS
```bash
# Homebrew
brew install node
brew install postgresql@14
```

### Étape 2 : Vérifier les installations

```bash
node --version    # doit afficher v18.x ou supérieur
npm --version     # doit afficher 9.x ou supérieur
psql --version    # doit afficher PostgreSQL 14.x ou supérieur
```

### Étape 3 : Cloner et installer les dépendances

```bash
# Naviguer vers le dossier backend
cd backend

# Installer les dépendances
npm install
```

**Temps estimé :** 2-3 minutes

### Étape 4 : Configurer PostgreSQL

#### Démarrer PostgreSQL

**Windows :**
```powershell
# PostgreSQL démarre automatiquement après l'installation
# Ou utilisez pgAdmin 4
```

**Linux :**
```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**macOS :**
```bash
brew services start postgresql@14
```

#### Créer la base de données

```bash
# Se connecter à PostgreSQL
psql -U postgres

CREATE ROLE securit_admin WITH LOGIN PASSWORD 'crimi123';
CREATE DATABASE securit_afrique_db OWNER securit_admin;
\q

### Étape 5 : Configurer les variables d'environnement

#### Créer le fichier .env

```bash
cp .env.example .env
```

#### Éditer le fichier .env

Ouvrez `.env` dans votre éditeur et modifiez :

```env
# IMPORTANT : Remplacez par vos identifiants PostgreSQL
DATABASE_URL="postgresql://postgres:VOTRE_MOT_DE_PASSE@localhost:5432/securit_afrique_db?schema=public"

# Configuration du serveur
PORT=5000
NODE_ENV=development

# IMPORTANT : Changez ce secret en production !
JWT_SECRET=votre_secret_jwt_tres_securise_minimum_32_caracteres
JWT_EXPIRES_IN=24h

# URL du frontend (à adapter selon votre configuration)
CORS_ORIGIN=http://localhost:3000
```

**⚠️ Points d'attention :**
- Remplacez `VOTRE_MOT_DE_PASSE` par le mot de passe PostgreSQL
- Changez `JWT_SECRET` par une chaîne aléatoire sécurisée
- Le `CORS_ORIGIN` doit correspondre à l'URL de votre frontend

### Étape 6 : Initialiser la base de données

```bash
# Générer le client Prisma (crée les types TypeScript)
npm run prisma:generate

# Créer les tables (exécuter les migrations)
npm run prisma:migrate

# Insérer les données initiales (rôles, utilisateurs de test, etc.)
npm run prisma:seed
```

**Résultat attendu :**

```
🌱 Début du seed de la base de données...

📝 Création des rôles...
✅ Rôles créés avec succès

👤 Création des utilisateurs...
✅ Utilisateurs créés avec succès

🔍 Création des types de crimes...
✅ Types de crimes créés avec succès

👮 Création d'exemples de criminels...
✅ Exemples de criminels créés avec succès

═══════════════════════════════════════════════════
✅ Seed terminé avec succès!
═══════════════════════════════════════════════════

📋 Comptes de test:
   Admin:
     Email: admin@securit-afrique.com
     Mot de passe: admin123
   Agent:
     Email: agent@securit-afrique.com
     Mot de passe: admin123
```

### Étape 7 : Démarrer le serveur

```bash
# Mode développement (avec auto-reload)
npm run dev
```

**Résultat attendu :**

```
✅ Connexion à la base de données réussie

═══════════════════════════════════════════════════
🚀 Serveur démarré sur le port 5000
🌍 Mode: development
📍 URL: http://localhost:5000
🔗 API: http://localhost:5000/api/health
═══════════════════════════════════════════════════
```

### Étape 8 : Vérifier que tout fonctionne

#### Test 1 : Health check

Ouvrez votre navigateur : `http://localhost:5000/api/health`

Ou en ligne de commande :
```bash
curl http://localhost:5000/api/health
```

**Réponse attendue :**
```json
{
  "success": true,
  "message": "API Securit Afrique Hub - Backend opérationnel",
  "timestamp": "2024-01-09T..."
}
```

#### Test 2 : Login

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
```

**Vous devez recevoir un token JWT** ✅

## 🎉 Installation terminée !

Votre backend est maintenant prêt à l'emploi.

## 🔧 Commandes utiles

```bash
# Développement
npm run dev              # Démarrer en mode dev (auto-reload)
npm run build            # Compiler TypeScript
npm start                # Démarrer en mode production

# Base de données
npm run prisma:studio    # Interface graphique pour la DB
npm run prisma:generate  # Générer le client Prisma
npm run prisma:migrate   # Exécuter les migrations
npm run prisma:seed      # Réexécuter le seed

# Utilitaires
npx prisma migrate reset # Réinitialiser complètement la DB
npx prisma db push       # Synchroniser le schéma (dev uniquement)
```

## 🐛 Résolution de problèmes

### Problème 1 : Erreur de connexion PostgreSQL

**Symptôme :**
```
Error: Can't reach database server at `localhost:5432`
```

**Solutions :**
1. Vérifiez que PostgreSQL est démarré
2. Vérifiez le `DATABASE_URL` dans `.env`
3. Testez la connexion : `psql -U postgres -d securit_afrique_db`

### Problème 2 : Port déjà utilisé

**Symptôme :**
```
Error: Port 5000 is already in use
```

**Solutions :**
1. Changez le port dans `.env` (ex: `PORT=5001`)
2. Ou arrêtez le processus : 
   - Windows: `netstat -ano | findstr :5000` puis `taskkill /PID <PID> /F`
   - Linux/Mac: `lsof -i :5000` puis `kill -9 <PID>`

### Problème 3 : Erreur Prisma "Table doesn't exist"

**Symptôme :**
```
Error: The table `public.User` does not exist
```

**Solution :**
```bash
npm run prisma:migrate
```

### Problème 4 : Variables d'environnement manquantes

**Symptôme :**
```
Variables d'environnement manquantes: JWT_SECRET, DATABASE_URL
```

**Solution :**
1. Vérifiez que le fichier `.env` existe
2. Vérifiez que toutes les variables sont définies
3. Redémarrez le serveur

## 📊 Vérifier l'installation

### Checklist

- [ ] PostgreSQL installé et démarré
- [ ] Base de données `securit_afrique_db` créée
- [ ] Dépendances Node.js installées (`node_modules/`)
- [ ] Fichier `.env` créé et configuré
- [ ] Migrations Prisma exécutées
- [ ] Seed exécuté avec succès
- [ ] Serveur démarre sans erreur
- [ ] Health check répond correctement
- [ ] Login fonctionne et retourne un token

Si tous les points sont cochés : **✅ Installation réussie !**

## 🎓 Prochaines étapes

1. **Consultez la documentation** : Lisez `README.md` et `ARCHITECTURE.md`
2. **Testez l'API** : Utilisez Postman ou Insomnia (voir `QUICK_START.md`)
3. **Explorez la DB** : Lancez `npm run prisma:studio`
4. **Développez** : Commencez à créer vos propres fonctionnalités !

## 📚 Documentation

- [README.md](./README.md) - Documentation complète du projet
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture détaillée
- [QUICK_START.md](./QUICK_START.md) - Guide de démarrage rapide
- [Prisma Documentation](https://www.prisma.io/docs)
- [Express Documentation](https://expressjs.com/)

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifiez les logs du serveur dans la console
2. Consultez la section "Résolution de problèmes" ci-dessus
3. Vérifiez que toutes les étapes ont été suivies
4. Contactez l'équipe de développement

---

**Développé avec ❤️ pour Securit Afrique Hub**

**Bon développement ! 🚀**

