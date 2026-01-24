# 🚀 Démarrage Rapide Multi-Postes

## 📋 Résumé en 5 étapes

### 1. Préparer le nouveau poste

```bash
# Créer un nouveau dossier
mkdir securit-afrique-hub-poste-b
cd securit-afrique-hub-poste-b

# Copier les fichiers (ou cloner depuis Git)
cp -r ../securit-afrique-hub-main/backend .
cp -r ../securit-afrique-hub-main/frontend .
```

### 2. Configurer le backend

```bash
cd backend

# Installer les dépendances
npm install

# Créer le fichier .env
cp .env.example .env
# Éditer .env avec:
# - PORT=5001 (unique)
# - CORS_ORIGIN=http://localhost:8081
# - DATABASE_URL=postgresql://... (même base)
# - JWT_SECRET=... (même secret)
# - POST_ID=POSTE_B (unique)

# Générer Prisma
npm run prisma:generate
```

### 3. Configurer le frontend

```bash
cd ../frontend

# Installer les dépendances
npm install

# Créer le fichier .env
echo "VITE_API_URL=http://localhost:5001" > .env
echo "VITE_WS_URL=http://localhost:5001" >> .env
echo "VITE_POST_ID=POSTE_B" >> .env
```

### 4. Démarrer les serveurs

**Option A : Script automatique (Linux/Mac)**
```bash
cd ..
chmod +x backend/scripts/start-poste.sh
./backend/scripts/start-poste.sh POSTE_B 5001 8081
```

**Option B : Script automatique (Windows)**
```batch
cd ..
backend\scripts\start-poste.bat POSTE_B 5001 8081
```

**Option C : Manuel**
```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 5. Vérifier

1. Backend : http://localhost:5001/api/health
2. Frontend : http://localhost:8081
3. Se connecter avec un compte utilisateur
4. Tester la synchronisation avec un autre poste

---

## 🔍 Vérification de la configuration

```bash
cd backend
chmod +x scripts/check-config.sh
./scripts/check-config.sh
```

---

## 📝 Configuration minimale .env

```env
# Backend
PORT=5001
NODE_ENV=production
JWT_SECRET=meme-secret-que-les-autres-postes
JWT_EXPIRES_IN=24h
CORS_ORIGIN=http://localhost:8081
DATABASE_URL=postgresql://user:pass@localhost:5432/securit_afrique_hub
POST_ID=POSTE_B
POST_NAME=Commissariat B

# Frontend
VITE_API_URL=http://localhost:5001
VITE_WS_URL=http://localhost:5001
VITE_POST_ID=POSTE_B
```

---

## ⚠️ Points importants

1. **PORT backend** : Unique pour chaque poste (5000, 5001, 5002...)
2. **PORT frontend** : Unique pour chaque poste (8080, 8081, 8082...)
3. **DATABASE_URL** : **MÊME base** pour tous les postes
4. **JWT_SECRET** : **MÊME secret** pour tous les postes
5. **POST_ID** : Unique pour chaque poste

---

## 📚 Documentation complète

Voir `GUIDE_MULTI_POSTES.md` pour la documentation détaillée.

