# 🚀 Guide de Démarrage Rapide - Configuration Réseau Automatique

## 📋 Vue d'ensemble

Ce guide explique comment **démarrer l'application avec détection automatique d'IP**.

Au lieu de modifier manuellement les `.env` chaque fois que tu changes de réseau, **un script détecte automatiquement ton adresse IP** et configure tout !

---

## ⚡ Démarrage Rapide (30 secondes)

### 1️⃣ **Première utilisation**
```powershell
# Lance le script de configuration automatique
.\setup-network.ps1

# Lance frontend + backend
.\launch-app.ps1 -Setup
```

### 2️⃣ **Utilisation normale (après la première fois)**
```powershell
# Juste lancer l'app
.\launch-app.ps1
```

### 3️⃣ **Après changement de réseau**
```powershell
# Relancer la détection d'IP
.\launch-app.ps1 -Setup
```

---

## 🔍 Détail des Scripts

### `setup-network.ps1` - Configuration Automatique

**Qu'est-ce qu'il fait ?**
- 🔍 **Détecte** automatiquement ton adresse IP locale
- 📝 **Crée/Met à jour** les fichiers `.env`
- 🔥 **Configure** le pare-feu Windows (ports 5000 et 8080)
- 🗄️ **Vérifie** que PostgreSQL est démarré

**Résultat :**
```
✅ IP détectée    : 192.168.212.13
✅ backend .env   : Configuré avec CORS_ORIGIN=http://192.168.212.13:8080
✅ frontend .env  : Configuré avec VITE_API_URL=http://192.168.212.13:5000/api
✅ Pare-feu       : Ports 5000 et 8080 autorisés
✅ PostgreSQL     : Vérifié et démarré
```

**Utilisation :**
```powershell
.\setup-network.ps1
```

---

### `launch-app.ps1` - Lancement Global

**Qu'est-ce qu'il fait ?**
- 🔧 Démarre le **backend** (npm run dev)
- 🎨 Démarre le **frontend** (npm run dev)
- ✅ Affiche les **URLs d'accès** automatiquement
- 🌐 Permet d'accéder depuis **n'importe quel appareil du réseau**

**Options :**
```powershell
# Lancer avec configuration automatique (complet)
.\launch-app.ps1 -Setup

# Lancer normalement (utilise config existante)
.\launch-app.ps1

# Afficher l'aide
.\launch-app.ps1 -Help
```

**Résultat :**
```
✅ Backend démarré   : http://192.168.212.13:5000/api
✅ Frontend démarré  : http://192.168.212.13:8080
✅ WebSocket actif   : ws://192.168.212.13:5000
```

---

## 📱 Accéder à l'Application

### **Sur le même ordinateur (localhost)**
```
http://localhost:8080
```

### **Depuis un autre appareil sur le réseau**
```
http://192.168.212.13:8080
```
Remplacer `192.168.212.13` par l'IP affichée par le script.

---

## 🔄 Cas d'Usage

### **Cas 1 : Je change de réseau Wi-Fi**
```powershell
# Re-exécuter le setup pour détecter la nouvelle IP
.\launch-app.ps1 -Setup
```

### **Cas 2 : Je redémarre l'ordinateur**
```powershell
# Juste relancer l'app (config en cache)
.\launch-app.ps1
```

### **Cas 3 : Je veux utiliser IP manuelle au lieu d'auto-détection**
```powershell
# Éditer manuellement les fichiers .env
# backend\.env : CORS_ORIGIN=http://YOUR_IP:8080
# frontend\.env : VITE_API_URL=http://YOUR_IP:5000/api
```

### **Cas 4 : Multi-Postes de Police**

Pour 3 postes différents avec bases séparées :

**Poste A (Dakar) - Port 5000**
```powershell
$env:PORT = 5000
.\launch-app.ps1 -Setup
```

**Poste B (Abidjan) - Port 5001**
```powershell
# Modifier backend\.env
# PORT=5001
# CORS_ORIGIN=http://192.168.212.13:8081
.\launch-app.ps1
```

Pour une **base de données partagée**, voir [GUIDE_MULTI_POSTES.md](./backend/GUIDE_MULTI_POSTES.md)

---

## ⚙️ Configuration Manuelle (si besoin)

### **Si les scripts ne fonctionnent pas**

#### Backend `.env`
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/securit_afrique_db"
PORT=5000
NODE_ENV=development
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://YOUR_IP:8080
BACKEND_IP=YOUR_IP
```

#### Frontend `.env`
```env
VITE_API_URL=http://YOUR_IP:5000/api
VITE_WS_URL=http://YOUR_IP:5000
VITE_BACKEND_IP=YOUR_IP
VITE_POST_ID=POSTE_PRINCIPAL
```

Puis lancer manuellement :
```powershell
# Terminal 1
cd backend
npm run dev

# Terminal 2
cd frontend
npm run dev
```

---

## 🔥 Pare-Feu Windows

Les scripts gèrent automatiquement le pare-feu, mais si tu dois le faire manuellement :

```powershell
# Autoriser port 5000 (backend)
New-NetFirewallRule -DisplayName "Backend Port 5000" `
  -Direction Inbound -Protocol TCP -LocalPort 5000 -Action Allow

# Autoriser port 8080 (frontend)
New-NetFirewallRule -DisplayName "Frontend Port 8080" `
  -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow

# Vérifier les règles
Get-NetFirewallRule -DisplayName "*Port*"
```

---

## 🐛 Dépannage

### **Backend ne démarre pas**
```powershell
# Vérifier PostgreSQL
Get-Service postgresql-x64-18

# Vérifier le port 5000
netstat -ano | findstr :5000

# Tester la connexion à la DB
psql -U postgres -d securit_afrique_db -c "SELECT 1;"
```

### **Frontend ne se connecte pas au backend**
```powershell
# Vérifier l'IP dans frontend\.env
# Doit correspondre à l'IP du backend

# Tester la connexion au backend
curl http://192.168.212.13:5000/api/health
```

### **Pare-feu bloque les ports**
```powershell
# Vérifier les règles
Get-NetFirewallRule -DisplayName "*5000*"
Get-NetFirewallRule -DisplayName "*8080*"

# Si manquantes, exécuter setup-network.ps1
.\setup-network.ps1
```

### **IP détectée incorrecte**
```powershell
# Vérifier l'IP réelle
ipconfig | findstr "IPv4"

# Si incorrecte, éditer manuellement les .env
```

---

## 📚 Documentation Complète

- **[ARCHITECTURE.md](./backend/ARCHITECTURE.md)** - Architecture détaillée
- **[GUIDE_MULTI_POSTES.md](./backend/GUIDE_MULTI_POSTES.md)** - Configuration multi-postes
- **[WEBSOCKET.md](./backend/WEBSOCKET.md)** - Synchronisation temps réel
- **[GUIDE_MIGRATION_BASE_DONNEES.md](./GUIDE_MIGRATION_BASE_DONNEES.md)** - Migration DB

---

## 🎉 C'est tout !

Maintenant tu peux :
✅ Démarrer l'app en **une seule commande**  
✅ **Accéder depuis n'importe quel appareil** du réseau  
✅ **Changer de réseau** sans reconfigurer  
✅ **Multi-Postes** sans problèmes de configuration  

**Bonne utilisation !** 🚀

---

## Notes metier et securite (2026-02-27)

Nouveautes prises en charge:
- Fiche arrestation detaillee dans le dossier criminel
- Pieces a conviction (description + images)
- Statut `RELEASED` (libere)

Regle metier importante:
- la suppression de criminel n'est plus disponible dans l'interface ni dans l'API
- pour corriger un dossier, utiliser `Modifier` et/ou changer le statut

Apres mise a jour du code backend:

```powershell
cd backend
npx prisma migrate dev
npm run prisma:generate
npm run dev
```
