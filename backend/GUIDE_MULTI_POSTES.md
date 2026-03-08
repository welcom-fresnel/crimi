# 🏢 Guide Complet : Configuration Multi-Postes de Police

## 📋 Table des matières

1. [Architecture du système](#architecture-du-système)
2. [Ajouter un nouveau poste de police](#ajouter-un-nouveau-poste-de-police)
3. [Configuration de la base de données](#configuration-de-la-base-de-données)
4. [Procédure de démarrage](#procédure-de-démarrage)
5. [Gestion des mises à jour](#gestion-des-mises-à-jour)
6. [Synchronisation temps réel](#synchronisation-temps-réel)
7. [Dépannage](#dépannage)
8. [Préparation du point d'exécution](#préparation-du-point-dexécution)

---

## 🏗️ Architecture du système

### Vue d'ensemble

Le système **Securit Afrique Hub** est conçu pour fonctionner avec **plusieurs postes de police** qui partagent une **même base de données centralisée** et se synchronisent en **temps réel** via WebSocket.

```
┌─────────────────────────────────────────────────────────────┐
│                    BASE DE DONNÉES CENTRALE                  │
│                    (PostgreSQL)                              │
│                    - Tous les criminels                      │
│                    - Tous les utilisateurs                   │
│                    - Tous les logs d'audit                   │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│  SERVEUR     │ │  SERVEUR     │ │  SERVEUR     │
│  BACKEND     │ │  BACKEND     │ │  BACKEND     │
│  (Poste A)   │ │  (Poste B)   │ │  (Poste C)   │
│              │ │              │ │              │
│  Port 5000   │ │  Port 5001   │ │  Port 5002   │
└───────┬──────┘ └──────┬───────┘ └──────┬───────┘
        │               │               │
┌───────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
│  FRONTEND    │ │  FRONTEND    │ │  FRONTEND    │
│  (Poste A)   │ │  (Poste B)   │ │  (Poste C)   │
│              │ │              │ │              │
│  Port 8080   │ │  Port 8081   │ │  Port 8082   │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Principe de fonctionnement

1. **Base de données unique** : Tous les postes partagent la même base PostgreSQL
2. **Serveurs backend indépendants** : Chaque poste a son propre serveur backend (ports différents)
3. **Synchronisation WebSocket** : Les modifications sont propagées en temps réel à tous les postes connectés
4. **Frontend indépendant** : Chaque poste a son propre frontend (ports différents)

---

## ➕ Ajouter un nouveau poste de police

### Étape 1 : Préparer l'environnement

#### 1.1. Créer un nouveau dossier pour le poste

```bash
# Exemple : Poste de Police de Dakar Plateau
mkdir securit-afrique-hub-poste-dakar-plateau
cd securit-afrique-hub-poste-dakar-plateau
```

#### 1.2. Copier les fichiers du projet

**Option A : Cloner depuis Git (recommandé)**
```bash
git clone <URL_DU_REPO> .
```

**Option B : Copier manuellement**
```bash
# Copier tout le dossier backend
cp -r ../securit-afrique-hub-main/backend .
cp -r ../securit-afrique-hub-main/frontend .
```

---

### Étape 2 : Configurer le backend

#### 2.1. Installer les dépendances

```bash
cd backend
npm install
```

#### 2.2. Créer le fichier `.env`

Créez un fichier `.env` dans le dossier `backend/` avec le contenu suivant :

```env
# ============================================
# CONFIGURATION POSTE DE POLICE - DAKAR PLATEAU
# ============================================

# Port du serveur backend (UNIQUE pour chaque poste)
PORT=5001

# Environnement
NODE_ENV=production

# Configuration JWT (MÊME SECRET pour tous les postes)
JWT_SECRET=votre-secret-jwt-super-securise-changez-moi
JWT_EXPIRES_IN=24h

# Configuration CORS (URL du frontend de CE poste)
CORS_ORIGIN=http://localhost:8081

# ============================================
# BASE DE DONNÉES (MÊME BASE pour tous les postes)
# ============================================
# ⚠️ IMPORTANT : Remplacer localhost par l'IP réelle du serveur central
DATABASE_URL=postgresql://username:password@IP_DU_SERVEUR_CENTRAL:5432/securit_afrique_hub

# Exemples selon votre architecture :
# Option 1 : Serveur dédié dans le cloud
# DATABASE_URL=postgresql://admin:password@db.votre-entreprise.com:5432/securit_afrique_hub

# Option 2 : Serveur local dans un commissariat central
# DATABASE_URL=postgresql://postgres:password@192.168.1.100:5432/securit_afrique_hub

# Option 3 : Base de données managée (AWS RDS, ElephantSQL, etc.)
# DATABASE_URL=postgresql://user:pass@elephantsql.com:5432/securit_afrique_hub

# ============================================
# IDENTIFIANT DU POSTE (UNIQUE)
# ============================================
POST_ID=POSTE_DAKAR_PLATEAU
POST_NAME=Commissariat de Dakar Plateau
```

**⚠️ IMPORTANT :**
- `PORT` : Doit être **unique** pour chaque poste (5000, 5001, 5002, etc.)
- `CORS_ORIGIN` : Doit correspondre à l'URL du frontend de **ce poste**
- `DATABASE_URL` : **Même base de données centralisée** pour tous les postes (remplacer localhost par l'IP du serveur central)
- `JWT_SECRET` : **Même secret** pour tous les postes (sinon les tokens ne fonctionneront pas)
- `POST_ID` : Identifiant **unique** pour ce poste (utilisé dans WebSocket)

#### 2.3. Vérifier la connexion à la base de données centralisée

**⚠️ IMPORTANT :** La base de données doit déjà exister sur le serveur central !

```bash
# Vérifier la connexion depuis le nouveau poste
psql -U username -h IP_DU_SERVEUR_CENTRAL -d securit_afrique_hub -c "SELECT 1;"

# 🎯 COMMENT TROUVER VOTRE USERNAME POSTGRESQL :

# Option 1 : Username par défaut (le plus courant)
psql -U postgres -h IP_DU_SERVEUR_CENTRAL -d securit_afrique_hub -c "SELECT 1;"

# Option 2 : Vérifier les utilisateurs existants sur le serveur central
# Connectez-vous d'abord au serveur central, puis :
psql -U postgres -c "\du"

# Option 3 : Username Windows (si PostgreSQL installé avec Windows)
psql -U Administrateur -h IP_DU_SERVEUR_CENTRAL -d securit_afrique_hub -c "SELECT 1;"
psql -U votre_nom_windows -h IP_DU_SERVEUR_CENTRAL -d securit_afrique_hub -c "SELECT 1;"

# Option 4 : Username de votre application (si configuré)
psql -U securit_afrique_user -h IP_DU_SERVEUR_CENTRAL -d securit_afrique_hub -c "SELECT 1;"

# Si la connexion échoue, vérifiez :
# 1. L'IP du serveur central est correcte
# 2. Le serveur PostgreSQL accepte les connexions distantes
# 3. Les identifiants sont corrects
# 4. Le mot de passe (vous serez invité à le taper)
```

#### 2.4. Initialiser la base de données (SEULEMENT le premier poste)

```bash
# ⚠️ À n'exécuter que sur le PREMIER poste installé !
# Les autres postes n'ont besoin que de se connecter

# Générer le client Prisma
npm run prisma:generate

# Appliquer les migrations (uniquement sur le premier poste)
npm run prisma:migrate

# Charger les données initiales (uniquement sur le premier poste)
npm run prisma:seed
```

**🚨 TRÈS IMPORTANT :**
- `prisma:migrate` et `prisma:seed` : **UNIQUEMENT** sur le **premier poste**
- Postes suivants : **SEULEMENT** `prisma:generate`
- Si vous relancez le seed sur un poste existant, vous dupliquerez les données !

---

### Étape 3 : Configurer le frontend

#### 3.1. Installer les dépendances

```bash
cd ../frontend
npm install
```

#### 3.2. Créer le fichier `.env`

Créez un fichier `.env` dans le dossier `frontend/` :

```env
# URL du backend de CE poste
VITE_API_URL=http://localhost:5001
VITE_WS_URL=http://localhost:5001

# ID du poste (doit correspondre au POST_ID du backend)
VITE_POST_ID=POSTE_DAKAR_PLATEAU
```

#### 3.3. Modifier `vite.config.ts` (si nécessaire)

Si vous voulez changer le port du frontend :

```typescript
export default defineConfig({
  server: {
    port: 8081, // Port unique pour ce poste
  },
  // ...
});
```

---

### Étape 4 : Créer les utilisateurs pour ce poste

#### 4.1. Via l'interface admin (recommandé)

1. Connectez-vous avec un compte **ADMIN** existant
2. Allez dans **Gestion des utilisateurs**
3. Créez les nouveaux utilisateurs pour ce poste

#### 4.2. Via le script de seed (modifier `prisma/seed.ts`)

Ajoutez les utilisateurs dans le fichier `backend/prisma/seed.ts` :

```typescript
// Exemple : Ajouter un agent pour le poste de Dakar Plateau
const agentDakarPlateau = await prisma.user.create({
  data: {
    username: 'agent_dakar_plateau',
    email: 'agent.dakar@police.sn',
    password: hashedPassword,
    profile: {
      create: {
        firstName: 'Mamadou',
        lastName: 'Diallo',
        service: 'Police Nationale',
        grade: 'Brigadier',
      },
    },
    userRoles: {
      create: {
        role: {
          connect: { name: 'AGENT' },
        },
      },
    },
  },
});
```

Puis relancez le seed (⚠️ seulement si c'est la première installation) :

```bash
npm run prisma:seed
```

---

## 🗄️ Configuration de la base de données

### Structure partagée

Tous les postes partagent les **mêmes tables** :

- ✅ `users` - Tous les utilisateurs (tous postes confondus)
- ✅ `criminals` - Tous les criminels (tous postes confondus)
- ✅ `crime_types` - Types de crimes (partagés)
- ✅ `audit_logs` - Tous les logs (tous postes confondus)
- ✅ `roles` - Rôles système (partagés)

### Identification des postes

Le système identifie les postes via :
1. **`POST_ID`** dans le fichier `.env` du backend
2. **`postId`** dans la connexion WebSocket
3. **`createdBy.postId`** dans les logs d'audit (optionnel, à implémenter)

### Bonnes pratiques

1. **Un seul serveur backend par poste** : Ne lancez pas plusieurs instances du backend sur le même poste
2. **Même JWT_SECRET** : Tous les postes doivent utiliser le **même secret JWT**
3. **Backup régulier** : Faites des sauvegardes régulières de la base de données
4. **Monitoring** : Surveillez les connexions WebSocket et les performances

---

## 🚀 Procédure de démarrage

### Démarrage du backend

#### 1. Vérifier la configuration

```bash
cd backend

# Vérifier que le fichier .env existe
cat .env

# Vérifier la connexion à la base de données
npm run prisma:studio
# Si Prisma Studio s'ouvre, la connexion fonctionne
```

#### 2. Démarrer le serveur

**Mode développement (avec auto-reload) :**
```bash
npm run dev
```

**Mode production :**
```bash
npm run build
npm start
```

**Avec PM2 (recommandé pour la production) :**
```bash
# Installer PM2 globalement
npm install -g pm2

# Démarrer le serveur
pm2 start npm --name "backend-poste-dakar" -- start

# Voir les logs
pm2 logs backend-poste-dakar

# Redémarrer
pm2 restart backend-poste-dakar

# Arrêter
pm2 stop backend-poste-dakar
```

#### 3. Vérifier que le serveur fonctionne

Ouvrez votre navigateur et allez sur :
- `http://localhost:5001/api/health` (remplacez 5001 par votre port)

Vous devriez voir :
```json
{
  "success": true,
  "message": "Serveur opérationnel",
  "timestamp": "2024-01-09T10:30:00.000Z"
}
```

---

### Démarrage du frontend

#### 1. Vérifier la configuration

```bash
cd frontend

# Vérifier que le fichier .env existe
cat .env
```

#### 2. Démarrer le serveur de développement

```bash
npm run dev
```

Le frontend devrait démarrer sur `http://localhost:8081` (ou le port configuré).

#### 3. Vérifier la connexion

1. Ouvrez `http://localhost:8081`
2. Connectez-vous avec un compte utilisateur
3. Vérifiez que le dashboard s'affiche
4. Vérifiez dans la console du navigateur que le WebSocket est connecté :
   ```
   ✅ Connecté au WebSocket: { success: true, ... }
   ```

---

### Ordre de démarrage recommandé

1. **Base de données** : Vérifier que PostgreSQL est démarré
2. **Backend** : Démarrer le serveur backend
3. **Frontend** : Démarrer le serveur frontend
4. **Vérification** : Tester la connexion et la synchronisation

---

## 🔄 Gestion des mises à jour

### Scénario 1 : Mise à jour du code (nouvelles fonctionnalités)

#### Étape 1 : Arrêter les serveurs

```bash
# Backend
cd backend
# Si avec PM2
pm2 stop backend-poste-dakar
# Sinon, Ctrl+C dans le terminal

# Frontend
cd frontend
# Ctrl+C dans le terminal
```

#### Étape 2 : Récupérer les nouvelles modifications

```bash
# Si vous utilisez Git
git pull origin main

# Sinon, copier les nouveaux fichiers manuellement
```

#### Étape 3 : Mettre à jour les dépendances

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

#### Étape 4 : Mettre à jour la base de données (si nécessaire)

**Si de nouvelles migrations Prisma existent :**

```bash
cd backend

# Générer le client Prisma
npm run prisma:generate

# Appliquer les migrations
npm run prisma:migrate
```

**⚠️ IMPORTANT :**
- Appliquez les migrations sur **un seul poste** (le premier)
- Les autres postes n'ont besoin que de `prisma:generate`

#### Étape 5 : Redémarrer les serveurs

```bash
# Backend
cd backend
npm run build  # Si en production
npm start      # Ou npm run dev

# Frontend
cd frontend
npm run dev    # Ou npm run build puis serveur de production
```

#### Étape 6 : Vérifier que tout fonctionne

1. Vérifier l'API : `http://localhost:5001/api/health`
2. Vérifier le frontend : `http://localhost:8081`
3. Tester une fonctionnalité (créer un criminel, etc.)
4. Vérifier la synchronisation avec les autres postes

---

### Scénario 2 : Mise à jour de la configuration (.env)

#### Étape 1 : Modifier le fichier `.env`

```bash
cd backend
nano .env  # Ou votre éditeur préféré
```

#### Étape 2 : Redémarrer le serveur

```bash
# Si avec PM2
pm2 restart backend-poste-dakar

# Sinon, arrêter (Ctrl+C) et redémarrer
npm start
```

**⚠️ IMPORTANT :**
- Les modifications de `.env` nécessitent un **redémarrage complet**
- Ne modifiez pas `JWT_SECRET` si d'autres postes sont actifs (casserait les sessions)

---

### Scénario 3 : Mise à jour de la base de données (ajout de données)

#### Ajout de nouveaux types de crimes

**Via l'interface admin :**
1. Connectez-vous en tant qu'ADMIN
2. Allez dans **Types de crimes**
3. Ajoutez le nouveau type

**Via SQL direct :**
```sql
INSERT INTO crime_types (id, name, code, severity, description)
VALUES (
  gen_random_uuid(),
  'Vol à main armée',
  'VOL_ARM001',
  'HIGH',
  'Vol commis avec une arme'
);
```

**⚠️ IMPORTANT :**
- Les modifications de la base sont **immédiatement visibles** par tous les postes
- Pas besoin de redémarrer les serveurs

---

### Scénario 4 : Mise à jour critique (bug fix urgent)

#### Procédure rapide

1. **Arrêter tous les postes** (coordonner avec les autres postes)
2. **Appliquer la correction** (code ou base de données)
3. **Redémarrer tous les postes** dans l'ordre :
   - Poste principal (celui qui gère les migrations)
   - Autres postes

#### Communication

- **Alerter les autres postes** avant une mise à jour critique
- **Documenter** les changements dans un fichier `CHANGELOG.md`
- **Tester** sur un poste de test avant de déployer en production

---

## 🔌 Synchronisation temps réel

### Comment ça fonctionne

1. **Un agent du Poste A crée un criminel**
   ```
   Poste A → Backend A → Base de données
                        ↓
                   WebSocket émet
                        ↓
   Poste B ← Backend B ← WebSocket reçoit
   Poste C ← Backend C ← WebSocket reçoit
   ```

2. **Tous les postes connectés reçoivent l'événement**
   - `criminal:created` : Nouveau criminel
   - `criminal:updated` : Criminel modifié
   - `criminal:deleted` : Criminel supprimé

3. **Les interfaces se mettent à jour automatiquement**

### Vérifier la synchronisation

#### Test manuel

1. **Ouvrir deux navigateurs** (ou deux postes différents)
2. **Se connecter** sur chaque navigateur avec des comptes différents
3. **Créer un criminel** dans le navigateur 1
4. **Vérifier** que le criminel apparaît automatiquement dans le navigateur 2

#### Vérifier les connexions WebSocket

**Côté backend (logs) :**
```
📡 Nouveau client connecté: agent1 (socket-id)
🏢 Client agent1 a rejoint le poste POSTE_DAKAR_PLATEAU
✨ Nouveau criminel créé: { caseNumber: 'CR-2024-001', ... }
📢 Émission de l'événement 'criminal:created' à 3 clients
```

**Côté frontend (console navigateur) :**
```
🔌 Connexion au WebSocket...
✅ Connecté au WebSocket: { success: true, postId: 'POSTE_DAKAR_PLATEAU' }
🆕 Nouveau criminel reçu: { caseNumber: 'CR-2024-001', ... }
```

### Problèmes de synchronisation

#### Le WebSocket ne se connecte pas

**Vérifications :**
1. Le backend est-il démarré ?
2. Le port WebSocket est-il correct dans le frontend ?
3. Le token JWT est-il valide ?
4. Le CORS est-il bien configuré ?

**Solution :**
```bash
# Vérifier les logs du backend
pm2 logs backend-poste-dakar

# Vérifier la console du navigateur
# Ouvrir DevTools → Console
```

#### Les événements ne sont pas reçus

**Vérifications :**
1. Le WebSocket est-il connecté ?
2. Les listeners sont-ils bien configurés dans le frontend ?
3. Y a-t-il des erreurs dans la console ?

**Solution :**
```javascript
// Dans la console du navigateur
socketService.isConnected()  // Devrait retourner true
```

---

## 🔧 Dépannage

### Problème : Le backend ne démarre pas

**Erreur : `Variables d'environnement manquantes`**

```bash
# Vérifier que le fichier .env existe
ls -la backend/.env

# Vérifier le contenu
cat backend/.env
```

**Erreur : `Authentication failed against database`**

```bash
# Vérifier les credentials PostgreSQL
psql -U username -d securit_afrique_hub

# Vérifier la DATABASE_URL dans .env
echo $DATABASE_URL
```

**Erreur : `Port already in use`**

```bash
# Trouver le processus qui utilise le port
lsof -i :5001  # Linux/Mac
netstat -ano | findstr :5001  # Windows

# Tuer le processus ou changer le port dans .env
```

---

### Problème : Le frontend ne se connecte pas au backend

**Erreur : `CORS policy`**

```bash
# Vérifier CORS_ORIGIN dans backend/.env
# Doit correspondre à l'URL du frontend
CORS_ORIGIN=http://localhost:8081
```

**Erreur : `Network Error`**

```bash
# Vérifier que le backend est démarré
curl http://localhost:5001/api/health

# Vérifier VITE_API_URL dans frontend/.env
VITE_API_URL=http://localhost:5001
```

---

### Problème : La synchronisation ne fonctionne pas

**Vérifications :**

1. **Les deux postes sont-ils connectés ?**
   ```bash
   # Backend Poste A
   curl http://localhost:5000/api/socket/stats
   
   # Backend Poste B
   curl http://localhost:5001/api/socket/stats
   ```

2. **Les WebSockets sont-ils actifs ?**
   - Vérifier les logs backend
   - Vérifier la console navigateur

3. **Les tokens JWT sont-ils valides ?**
   - Vérifier que `JWT_SECRET` est le même sur tous les postes

---

## 📊 Préparation du point d'exécution

### Checklist avant la présentation

#### 1. Documentation

- [ ] Ce guide est à jour
- [ ] `README.md` est à jour
- [ ] `ARCHITECTURE.md` est à jour
- [ ] `INSTALLATION.md` est à jour

#### 2. Configuration

- [ ] Tous les fichiers `.env` sont configurés
- [ ] Les ports sont uniques pour chaque poste
- [ ] La base de données est accessible
- [ ] Les secrets JWT sont identiques

#### 3. Tests

- [ ] Le backend démarre sans erreur
- [ ] Le frontend démarre sans erreur
- [ ] La connexion à la base de données fonctionne
- [ ] L'authentification fonctionne
- [ ] La création de criminels fonctionne
- [ ] La synchronisation WebSocket fonctionne entre 2+ postes

#### 4. Démonstration

**Scénario de démo recommandé :**

1. **Démarrer 2 postes** (Poste A et Poste B)
2. **Se connecter** sur chaque poste avec des comptes différents
3. **Créer un criminel** dans le Poste A
4. **Montrer** que le criminel apparaît automatiquement dans le Poste B
5. **Modifier le criminel** dans le Poste B
6. **Montrer** que la modification apparaît dans le Poste A
7. **Afficher les logs d'audit** pour montrer la traçabilité

#### 5. Scripts de démarrage rapide

Créez des scripts pour faciliter le démarrage :

**`start-poste-a.sh` (Linux/Mac) :**
```bash
#!/bin/bash
echo "🚀 Démarrage du Poste A..."

# Backend
cd backend
npm start &
BACKEND_PID=$!

# Frontend
cd ../frontend
npm run dev &
FRONTEND_PID=$!

echo "✅ Poste A démarré (Backend PID: $BACKEND_PID, Frontend PID: $FRONTEND_PID)"
echo "📍 Backend: http://localhost:5000"
echo "📍 Frontend: http://localhost:8080"
```

**`start-poste-a.bat` (Windows) :**
```batch
@echo off
echo 🚀 Démarrage du Poste A...

start cmd /k "cd backend && npm start"
start cmd /k "cd frontend && npm run dev"

echo ✅ Poste A démarré
echo 📍 Backend: http://localhost:5000
echo 📍 Frontend: http://localhost:8080
pause
```

#### 6. Diagrammes pour la présentation

Créez des diagrammes pour expliquer :
- Architecture globale
- Flux de synchronisation
- Schéma de la base de données
- Flux d'authentification

---

### Points à présenter lors du point d'exécution

1. **Architecture** : Expliquer le système multi-postes
2. **Base de données centralisée** : Montrer que tous les postes partagent la même base
3. **Synchronisation temps réel** : Démonstration live avec 2 postes
4. **Sécurité** : Authentification JWT, RBAC, audit logs
5. **Scalabilité** : Facile d'ajouter de nouveaux postes
6. **Maintenance** : Procédures de mise à jour documentées

---

## 📝 Résumé des commandes essentielles

### Backend

```bash
# Installation
npm install

# Configuration
cp .env.example .env
# Éditer .env avec les bonnes valeurs

# Base de données
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed  # Seulement la première fois

# Démarrage
npm run dev          # Développement
npm start            # Production
```

### Frontend

```bash
# Installation
npm install

# Configuration
cp .env.example .env
# Éditer .env avec les bonnes valeurs

# Démarrage
npm run dev          # Développement
npm run build        # Production
```

### Base de données

```bash
# Connexion
psql -U username -d securit_afrique_hub

# Vérification
SELECT COUNT(*) FROM criminals;
SELECT COUNT(*) FROM users;
```

---

## 🎯 Conclusion

Ce guide vous permet de :
- ✅ Ajouter facilement de nouveaux postes de police
- ✅ Configurer chaque poste correctement
- ✅ Gérer les mises à jour sans interruption
- ✅ Dépanner les problèmes courants
- ✅ Préparer une démonstration professionnelle

**Pour toute question ou problème, consultez :**
- `README.md` : Vue d'ensemble du projet
- `INSTALLATION.md` : Guide d'installation détaillé
- `WEBSOCKET.md` : Documentation WebSocket complète
- `ARCHITECTURE.md` : Architecture technique détaillée

---

**Dernière mise à jour :** 2024-01-09  
**Version :** 1.0.0


---

## Mise a jour critique (2026-02-27) - A appliquer en priorite

Ce bloc corrige les points devenus faux ou incomplets dans le guide initial.

### 1) URL frontend -> backend

Utiliser:
- `VITE_API_URL=http://<IP_BACKEND>:<PORT_BACKEND>/api`
- `VITE_WS_URL=http://<IP_BACKEND>:<PORT_BACKEND>`

Exemple:
```env
VITE_API_URL=http://192.168.1.100:5001/api
VITE_WS_URL=http://192.168.1.100:5001
```

Important: `VITE_API_URL` doit contenir `/api`.

### 2) Nom de base de donnees

Le projet courant utilise `securit_afrique_db`.

Exemple recommande:
```env
DATABASE_URL=postgresql://postgres:<mot_de_passe>@<IP_SERVEUR_DB>:5432/securit_afrique_db?schema=public
```

### 3) Migrations Prisma en multi-postes

- Poste principal (ou serveur central):
  - `npm run prisma:migrate`
  - `npm run prisma:generate`
- Postes secondaires:
  - `npm run prisma:generate`

Ne pas relancer `prisma:seed` sur les postes secondaires.

### 4) Suppression de criminel

La suppression de dossier criminel est desactivee dans l'API actuelle.

Donc:
- la route `DELETE /api/criminals/:id` n'est plus exposee,
- l'evenement WebSocket `criminal:deleted` n'est plus un flux metier actif.

### 5) Nouvelles structures de donnees

La base inclut maintenant:
- `arrestations` (1 fiche max par criminel),
- `evidences` (0..N pieces a conviction par criminel).

Le guide de deploiement doit verifier que les migrations correspondantes sont appliquees.

### 6) Statuts criminels

Statuts metier actuels:
- `ACTIVE`, `ARRESTED`, `RELEASED`, `DECEASED`, `UNKNOWN`

`RELEASED` (libere) est desormais distinct de `UNKNOWN`.

### 7) Endpoint socket stats

`GET /api/socket/stats` est protege (auth + permission).
Un `curl` sans token renverra une erreur 401/403.

### 8) Ports en multi-postes

- Postes sur des machines differentes: vous pouvez garder `5000/8080` sur chaque machine.
- Plusieurs postes sur la meme machine: ports obligatoirement differents (`5000/8080`, `5001/8081`, etc.).

---

## Exemple .env valide (poste secondaire)

### backend/.env
```env
PORT=5001
NODE_ENV=development
JWT_SECRET=securit_afrique_jwt_secret_key_2024_change_in_production
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://192.168.1.100:8081
BACKEND_IP=192.168.1.100
DATABASE_URL=postgresql://postgres:<mot_de_passe>@192.168.1.10:5432/securit_afrique_db?schema=public
POST_ID=POSTE_DAKAR_PLATEAU
POST_NAME=Commissariat de Dakar Plateau
```

### frontend/.env
```env
VITE_API_URL=http://192.168.1.100:5001/api
VITE_WS_URL=http://192.168.1.100:5001
VITE_BACKEND_IP=192.168.1.100
VITE_POST_ID=POSTE_DAKAR_PLATEAU
```
