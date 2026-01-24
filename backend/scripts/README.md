# 📜 Scripts d'automatisation

Ce dossier contient des scripts pour faciliter la gestion des postes de police.

## 📋 Scripts disponibles

### `start-poste.sh` (Linux/Mac)

Script de démarrage automatique pour un poste de police.

**Usage :**
```bash
./start-poste.sh [POSTE_NAME] [BACKEND_PORT] [FRONTEND_PORT]
```

**Exemples :**
```bash
# Poste A (ports par défaut: 5000, 8080)
./start-poste.sh POSTE_A

# Poste B (ports personnalisés)
./start-poste.sh POSTE_B 5001 8081

# Poste C
./start-poste.sh POSTE_C 5002 8082
```

**Fonctionnalités :**
- Vérifie la configuration
- Démarre le backend
- Démarre le frontend
- Affiche les URLs et PIDs
- Gère l'arrêt propre (Ctrl+C)

---

### `start-poste.bat` (Windows)

Version Windows du script de démarrage.

**Usage :**
```batch
start-poste.bat [POSTE_NAME] [BACKEND_PORT] [FRONTEND_PORT]
```

**Exemples :**
```batch
REM Poste A
start-poste.bat POSTE_A

REM Poste B
start-poste.bat POSTE_B 5001 8081
```

**Fonctionnalités :**
- Ouvre des fenêtres séparées pour backend et frontend
- Facile à arrêter (fermer les fenêtres)

---

### `check-config.sh` (Linux/Mac)

Script de vérification de la configuration.

**Usage :**
```bash
cd backend
./scripts/check-config.sh
```

**Vérifications :**
- ✅ Existence du fichier `.env`
- ✅ Variables d'environnement requises
- ✅ Connexion à la base de données
- ✅ Port disponible
- ✅ Prisma installé et configuré
- ⚠️ Valeurs par défaut (avertissements)

**Sortie :**
```
✅ Configuration valide !
```

ou

```
❌ Configuration invalide: 2 erreur(s), 1 avertissement(s)
```

---

## 🔧 Installation

### Linux/Mac

```bash
# Rendre les scripts exécutables
chmod +x backend/scripts/*.sh
```

### Windows

Les scripts `.bat` sont directement exécutables.

---

## 📝 Notes

- Les scripts doivent être exécutés à la **racine du projet** (où se trouvent les dossiers `backend/` et `frontend/`)
- Les logs sont sauvegardés dans le dossier `logs/` (créé automatiquement)
- Pour arrêter les serveurs lancés par les scripts :
  - **Linux/Mac** : Ctrl+C dans le terminal
  - **Windows** : Fermer les fenêtres "Backend" et "Frontend"

---

## 🐛 Dépannage

### Le script ne s'exécute pas

**Linux/Mac :**
```bash
chmod +x backend/scripts/start-poste.sh
```

**Windows :**
Assurez-vous d'utiliser `start-poste.bat` (pas `.sh`)

### Erreur "Ce script doit être exécuté à la racine du projet"

Assurez-vous que vous êtes dans le dossier qui contient `backend/` et `frontend/` :
```bash
ls backend frontend  # Doit afficher les dossiers
```

### Le port est déjà utilisé

Changez le port dans le fichier `.env` du backend ou utilisez un autre port :
```bash
./start-poste.sh POSTE_B 5002 8082
```

