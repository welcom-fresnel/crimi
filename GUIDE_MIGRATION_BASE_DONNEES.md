# 🔄 Guide Complet : Migration Base de Données PostgreSQL
## Scénario 1 : Déplacement vers un autre serveur Windows

---

## 📋 Table des matières

1. [Vue d'ensemble de la migration](#vue-densemble-de-la-migration)
2. [Prérequis](#prérequis)
3. [Étape 1 : Sauvegarde de la base actuelle](#étape-1--sauvegarde-de-la-base-actuelle)
4. [Étape 2 : Préparation du nouveau serveur](#étape-2--préparation-du-nouveau-serveur)
5. [Étape 3 : Transfert des données](#étape-3--transfert-des-données)
6. [Étape 4 : Installation PostgreSQL sur nouveau serveur](#étape-4--installation-postgresql-sur-nouveau-serveur)
7. [Étape 5 : Configuration PostgreSQL](#étape-5--configuration-postgresql)
8. [Étape 6 : Restauration des données](#étape-6--restauration-des-données)
9. [Étape 7 : Mise à jour des configurations des postes](#étape-7--mise-à-jour-des-configurations-des-postes)
10. [Étape 8 : Tests et validation](#étape-8--tests-et-validation)
11. [Checklist post-migration](#checklist-post-migration)
12. [Dépannage](#dépannage)

---

## 🎯 Vue d'ensemble de la migration

### Architecture avant migration
```
🏢 POSTE ACTUEL (192.168.212.13)
├── PostgreSQL Server 18
├── Base: securit_afrique_db
├── └── Données: Criminels, Users, Logs...
└── Postes de police connectés
    ├── Poste A (192.168.212.x)
    ├── Poste B (192.168.212.x)
    └── Poste C (192.168.212.x)
```

### Architecture après migration
```
🖥️ ANCIEN SERVEUR (192.168.212.13)
└── [Arrêté après migration]

🆕 NOUVEAU SERVEUR (NOUVELLE_IP)
├── PostgreSQL Server 18
├── Base: securit_afrique_db
├── └── Données: Toutes les données migrées
└── Postes de police reconnectés
    ├── Poste A → DATABASE_URL=postgresql://...@NOUVELLE_IP...
    ├── Poste B → DATABASE_URL=postgresql://...@NOUVELLE_IP...
    └── Poste C → DATABASE_URL=postgresql://...@NOUVELLE_IP...
```

---

## 📦 Prérequis

### Matériel nécessaire
- ✅ **Nouveau serveur Windows** (Windows 10/11 ou Server 2019+)
- ✅ **Espace disque suffisant** (au moins 2x la taille actuelle de la base)
- ✅ **Connexion réseau** entre anciens et nouveaux postes
- ✅ **Droits administrateur** sur les deux serveurs

### Logiciels nécessaires
- ✅ **PostgreSQL 18** (même version que l'actuel)
- ✅ **PowerShell** (pour les scripts)
- ✅ **Éditeur de texte** (VS Code, Notepad++)

### Informations à collecter
- 📝 **IP du nouveau serveur** (ex: 192.168.212.50)
- 📝 **Mot de passe PostgreSQL actuel**
- 📝 **Nombre de postes de police à migrer**
- 📝 **Liste des fichiers `.env` à modifier**

---

## 💾 Étape 1 : Sauvegarde de la base actuelle

### 1.1. Vérifier l'état actuel
```cmd
# Ouvrir PowerShell en administrateur sur l'ancien serveur (192.168.212.13)

# Vérifier que PostgreSQL est démarré
Get-Service postgresql-x64-18

# Vérifier la taille de la base
cd "C:\Program Files\PostgreSQL\18\bin"
psql -U postgres -d securit_afrique_db -c "SELECT pg_size_pretty(pg_database_size('securit_afrique_db'));"
```

### 1.2. Créer le répertoire de sauvegarde
```cmd
# Créer un dossier de sauvegarde
mkdir C:\migration_backup
cd C:\migration_backup
```

### 1.3. Sauvegarder la base de données
```cmd
# Sauvegarde complète (format SQL)
cd "C:\Program Files\PostgreSQL\18\bin"
pg_dump.exe -U postgres -h localhost -d securit_afrique_db -f C:\migration_backup\securit_afrique_db_backup.sql

# Alternative : Sauvegarde compressée (plus rapide)
pg_dump.exe -U postgres -h localhost -d securit_afrique_db -Fc -f C:\migration_backup\securit_afrique_db_backup.dump
```

### 1.4. Sauvegarder les fichiers de configuration
```cmd
# Copier les fichiers de configuration PostgreSQL
copy "C:\Program Files\PostgreSQL\18\data\postgresql.conf" C:\migration_backup\
copy "C:\Program Files\PostgreSQL\18\data\pg_hba.conf" C:\migration_backup\
copy "C:\Program Files\PostgreSQL\18\data\pg_ident.conf" C:\migration_backup\
```

### 1.5. Vérifier la sauvegarde
```cmd
# Vérifier la taille du fichier de sauvegarde
dir C:\migration_backup\

# Vérifier que le fichier SQL n'est pas vide
Get-Content C:\migration_backup\securit_afrique_db_backup.sql | Select-Object -First 5
```

### 1.6. Créer un fichier d'information
```cmd
# Créer un fichier avec les informations de migration
echo "Migration Securit Afrique Hub" > C:\migration_backup\migration_info.txt
echo "Date: $(Get-Date)" >> C:\migration_backup\migration_info.txt
echo "Ancienne IP: 192.168.212.13" >> C:\migration_backup\migration_info.txt
echo "Nouvelle IP: [À REMPLIR]" >> C:\migration_backup\migration_info.txt
echo "Taille base: $(Get-ChildItem C:\migration_backup\securit_afrique_db_backup.sql).Length" >> C:\migration_backup\migration_info.txt
```

---

## 🆕 Étape 2 : Préparation du nouveau serveur

### 2.1. Configuration réseau
```cmd
# Sur le nouveau serveur, vérifier l'IP
ipconfig

# Noter l'adresse IPv4 (ex: 192.168.212.50)
```

### 2.2. Créer les répertoires nécessaires
```cmd
# Créer le répertoire pour recevoir la sauvegarde
mkdir C:\migration_incoming
mkdir C:\migration_logs
```

### 2.3. Désactiver temporairement l'antivirus
```cmd
# Optionnel : Si l'antivirus bloque les transferts
# À réactiver après la migration !
```

---

## 📤 Étape 3 : Transfert des données

### 3.1. Méthode 1 : Via partage réseau (recommandé)

#### Sur l'ancien serveur :
```cmd
# Créer un partage réseau
net share migration_backup=C:\migration_backup /grant:Everyone,FULL

# Noter le chemin du partage
# \\192.168.212.13\migration_backup
```

#### Sur le nouveau serveur :
```cmd
# Copier les fichiers via le partage
copy \\192.168.212.13\migration_backup\* C:\migration_incoming\

# Vérifier la copie
dir C:\migration_incoming\
```

### 3.2. Méthode 2 : Via clé USB

1. **Copier sur clé USB** (depuis l'ancien serveur) :
   ```cmd
   copy C:\migration_backup\* E:\migration_backup\
   ```

2. **Copier depuis clé USB** (sur le nouveau serveur) :
   ```cmd
   copy E:\migration_backup\* C:\migration_incoming\
   ```

### 3.3. Méthode 3 : Via PowerShell (si les deux serveurs se voient)
```cmd
# Sur le nouveau serveur
Invoke-WebRequest -Uri http://192.168.212.13/securit_afrique_db_backup.sql -OutFile C:\migration_incoming\securit_afrique_db_backup.sql
```

### 3.4. Vérifier l'intégrité des fichiers
```cmd
# Comparer les tailles des fichiers
dir C:\migration_incoming\

# Calculer le hash pour vérifier l'intégrité
Get-FileHash C:\migration_incoming\securit_afrique_db_backup.sql
```

---

## 📥 Étape 4 : Installation PostgreSQL sur nouveau serveur

### 4.1. Télécharger PostgreSQL 18
- Site officiel : https://www.enterprisedb.com/downloads/postgres-postgresql-downloads
- Version : PostgreSQL 18 pour Windows x86-64

### 4.2. Installation
1. **Lancer l'installateur** en tant qu'administrateur
2. **Choisir les composants** :
   - ✅ PostgreSQL Server
   - ✅ pgAdmin 4
   - ✅ Stack Builder
   - ✅ Command Line Tools
3. **Directory** : `C:\Program Files\PostgreSQL\18`
4. **Data Directory** : `C:\Program Files\PostgreSQL\18\data`
5. **Password** : Utiliser le **même mot de passe** que l'ancien serveur
6. **Port** : `5432` (garder le port par défaut)
7. **Locale** : `French, France` ou `Default locale`

### 4.3. Vérifier l'installation
```cmd
# Vérifier le service PostgreSQL
Get-Service postgresql-x64-18

# Vérifier que PostgreSQL écoute
netstat -an | findstr 5432
```

---

## ⚙️ Étape 5 : Configuration PostgreSQL

### 5.1. Arrêter PostgreSQL
```cmd
net stop postgresql-x64-18
```

### 5.2. Restaurer les configurations
```cmd
# Copier les fichiers de configuration de l'ancien serveur
copy C:\migration_incoming\postgresql.conf "C:\Program Files\PostgreSQL\18\data\"
copy C:\migration_incoming\pg_hba.conf "C:\Program Files\PostgreSQL\18\data\"
copy C:\migration_incoming\pg_ident.conf "C:\Program Files\PostgreSQL\18\data\"
```

### 5.3. Mettre à jour pg_hba.conf pour le nouveau réseau
Ouvrir `C:\Program Files\PostgreSQL\18\data\pg_hba.conf` et ajouter :
```conf
# Ajouter les lignes pour autoriser les postes de police
host    all             all             192.168.212.0/24        md5
host    all             all             127.0.0.1/32            md5
host    all             all             ::1/128                 md5
```

### 5.4. Vérifier postgresql.conf
Ouvrir `C:\Program Files\PostgreSQL\18\data\postgresql.conf` et vérifier :
```conf
# Doit être décommenté et mis à '*'
listen_addresses = '*'

# Port correct
port = 5432
```

### 5.5. Redémarrer PostgreSQL
```cmd
net start postgresql-x64-18

# Vérifier que ça démarre sans erreur
Get-Service postgresql-x64-18
```

---

## 🔄 Étape 6 : Restauration des données

### 6.1. Créer la base de données vide
```cmd
cd "C:\Program Files\PostgreSQL\18\bin"

# Se connecter à PostgreSQL
psql -U postgres -h localhost

# Dans psql, créer la base
CREATE DATABASE securit_afrique_db;
\q
```

### 6.2. Restaurer les données (méthode SQL)
```cmd
# Si vous avez un fichier .sql
psql -U postgres -h localhost -d securit_afrique_db < C:\migration_incoming\securit_afrique_db_backup.sql
```

### 6.3. Alternative : Restaurer avec pg_restore (si fichier .dump)
```cmd
# Si vous avez un fichier compressé .dump
pg_restore.exe -U postgres -h localhost -d securit_afrique_db C:\migration_incoming\securit_afrique_db_backup.dump
```

### 6.4. Vérifier la restauration
```cmd
# Vérifier que les tables ont été créées
psql -U postgres -d securit_afrique_db -c "\dt"

# Vérifier le nombre d'enregistrements
psql -U postgres -d securit_afrique_db -c "SELECT COUNT(*) FROM criminals;"
psql -U postgres -d securit_afrique_db -c "SELECT COUNT(*) FROM users;"
psql -U postgres -d securit_afrique_db -c "SELECT COUNT(*) FROM audit_logs;"
```

### 6.5. Vérifier la taille de la base
```cmd
psql -U postgres -d securit_afrique_db -c "SELECT pg_size_pretty(pg_database_size('securit_afrique_db'));"
```

---

## 🖥️ Étape 7 : Mise à jour des configurations des postes

### 7.1. Identifier tous les postes à mettre à jour
Liste des postes de police avec leurs IP :
- 🏢 Poste A : 192.168.212.x → Port backend 5000
- 🏢 Poste B : 192.168.212.x → Port backend 5001  
- 🏢 Poste C : 192.168.212.x → Port backend 5002

### 7.2. Mettre à jour chaque fichier .env

Pour chaque poste, modifier le fichier `backend\.env` :

**Ancienne configuration :**
```env
DATABASE_URL=postgresql://postgres:password@192.168.212.13:5432/securit_afrique_db
```

**Nouvelle configuration :**
```env
DATABASE_URL=postgresql://postgres:password@NOUVELLE_IP:5432/securit_afrique_db
```

### 7.3. Script de mise à jour automatique (optionnel)
Créer un script `update_database_url.ps1` :
```powershell
# Paramètres
$oldIP = "192.168.212.13"
$newIP = "192.168.212.50"  # Remplacer par la nouvelle IP

# Parcourir tous les dossiers de postes
$postes = @("poste-a", "poste-b", "poste-c")

foreach ($poste in $postes) {
    $envFile = "$poste\backend\.env"
    if (Test-Path $envFile) {
        (Get-Content $envFile) -replace $oldIP, $newIP | Set-Content $envFile
        Write-Host "✅ $poste mis à jour"
    }
}
```

---

## 🧪 Étape 8 : Tests et validation

### 8.1. Test de connexion depuis le nouveau serveur
```cmd
# Test local
psql -U postgres -h localhost -d securit_afrique_db -c "SELECT 1;"

# Test avec la nouvelle IP
psql -U postgres -h 192.168.212.50 -d securit_afrique_db -c "SELECT 1;"
```

### 8.2. Test depuis un poste de police
Sur chaque poste de police :
```cmd
# Test de connexion à la nouvelle base
psql -U postgres -h 192.168.212.50 -d securit_afrique_db -c "SELECT 1;"
```

### 8.3. Démarrer les backends
Pour chaque poste :
```cmd
cd backend
npm run dev
```

### 8.4. Test de l'API
```cmd
# Vérifier que chaque backend répond
curl http://localhost:5000/api/health
curl http://localhost:5001/api/health
curl http://localhost:5002/api/health
```

### 8.5. Test fonctionnel complet
1. **Se connecter** sur chaque poste
2. **Créer un criminel** depuis le Poste A
3. **Vérifier** qu'il apparaît sur les Postes B et C
4. **Modifier** le criminel depuis le Poste B
5. **Vérifier** la mise à jour sur les autres postes

---

## ✅ Checklist post-migration

### 📊 Validation des données
- [ ] **Nombre de criminels** identique à avant migration
- [ ] **Nombre d'utilisateurs** identique à avant migration
- [ ] **Nombre de logs d'audit** identique à avant migration
- [ ] **Types de crimes** présents et corrects

### 🔧 Configuration réseau
- [ ] **PostgreSQL écoute** sur `0.0.0.0:5432`
- [ ] **Pare-feu configuré** pour autoriser le port 5432
- [ ] **pg_hba.conf** autorise les bonnes plages d'IP
- [ ] **Tous les postes** peuvent se connecter à la nouvelle IP

### 🖥️ Applications
- [ ] **Tous les backends** démarrés sans erreur
- [ ] **Tous les frontends** connectés à leurs backends
- [ ] **Synchronisation WebSocket** fonctionne entre postes
- [ ] **Authentification** fonctionne sur tous les postes

### 📝 Documentation
- [ ] **Mettre à jour** la documentation avec la nouvelle IP
- [ ] **Informer** les utilisateurs du changement
- [ ] **Archiver** l'ancien serveur (ne pas le supprimer tout de suite)

---

## 🚨 Dépannage

### Problème : PostgreSQL ne démarre pas
**Symptôme :** `Get-Service postgresql-x64-18` montre `Stopped`

**Solutions :**
```cmd
# Vérifier les logs PostgreSQL
Get-Content "C:\Program Files\PostgreSQL\18\data\log\*.log" | Select-Object -Last 20

# Vérifier les permissions sur les fichiers
icacls "C:\Program Files\PostgreSQL\18\data"

# Réparer les permissions
takeown /f "C:\Program Files\PostgreSQL\18\data" /r /d y
icacls "C:\Program Files\PostgreSQL\18\data" /grant "NT SERVICE\postgresql-x64-18:(OI)(CI)F" /t
```

### Problème : Connexion refusée depuis les postes
**Symptôme :** `Test-NetConnection` échoue

**Solutions :**
```cmd
# Vérifier que PostgreSQL écoute sur toutes les interfaces
netstat -an | findstr 5432

# Devrait montrer : TCP    0.0.0.0:5432

# Si ça montre 127.0.0.1:5432, modifier postgresql.conf
# listen_addresses = '*'

# Configurer le pare-feu
New-NetFirewallRule -DisplayName "PostgreSQL" -Direction Inbound -Protocol TCP -LocalPort 5432 -Action Allow
```

### Problème : Erreur d'authentification
**Symptôme :** `FATAL: password authentication failed`

**Solutions :**
```cmd
# Réinitialiser le mot de passe postgres
psql -U postgres
ALTER USER postgres PASSWORD 'nouveau_mot_de_passe';
\q

# Mettre à jour tous les fichiers .env avec le nouveau mot de passe
```

### Problème : Données manquantes après restauration
**Symptôme :** `SELECT COUNT(*)` donne des nombres différents

**Solutions :**
```cmd
# Vérifier que la restauration s'est bien terminée
Get-Content C:\migration_logs\restore.log

# Refaire la restauration si nécessaire
DROP DATABASE securit_afrique_db;
CREATE DATABASE securit_afrique_db;
psql -U postgres -d securit_afrique_db < C:\migration_incoming\securit_afrique_db_backup.sql
```

---

## 📋 Procédure de rollback (en cas de problème)

Si la nouvelle configuration ne fonctionne pas :

### 1. Revenir à l'ancien serveur
```cmd
# Sur l'ancien serveur (192.168.212.13)
net start postgresql-x64-18
```

### 2. Restaurer les anciennes configurations
```cmd
# Sur chaque poste, restaurer l'ancien DATABASE_URL
DATABASE_URL=postgresql://postgres:password@192.168.212.13:5432/securit_afrique_db
```

### 3. Redémarrer les applications
```cmd
# Sur chaque poste
cd backend
npm run dev
```

---

## 🎉 Conclusion

Félicitations ! Tu as migré avec succès ta base de données PostgreSQL vers un nouveau serveur.

### Points clés à retenir :
- ✅ **Sauvegarde complète** avant toute migration
- ✅ **Tests approfondis** après chaque étape
- ✅ **Documentation mise à jour** avec les nouvelles IPs
- ✅ **Ancien serveur conservé** pendant quelques jours

### Prochaines étapes recommandées :
1. **Surveiller** les performances pendant 48h
2. **Planifier** des sauvegardes automatiques sur le nouveau serveur
3. **Documenter** la procédure pour les futures migrations
4. **Former** les administrateurs sur la nouvelle architecture

---

**Pour toute question ou problème, n'hésite pas à consulter les logs PostgreSQL :**
```cmd
Get-Content "C:\Program Files\PostgreSQL\18\data\log\postgresql-*.log" | Select-Object -Last 50
```

**Bonne migration !** 🚀

---

## Mise a jour applicative (2026-02-27)

Les versions recentes du logiciel ajoutent de nouvelles donnees metier:
- table `evidences` (pieces a conviction avec images)
- table `arrestations` (details d'interpellation)
- statut criminel `RELEASED` (libere)

Apres restauration d'un dump SQL ancien, executer aussi les migrations Prisma:

```cmd
cd backend
npx prisma migrate deploy
npx prisma generate
```

Verifications recommandees:

```cmd
psql -U postgres -d securit_afrique_db -c "\\dt evidences"
psql -U postgres -d securit_afrique_db -c "\\dt arrestations"
psql -U postgres -d securit_afrique_db -c "SELECT status, COUNT(*) FROM criminals GROUP BY status ORDER BY status;"
```

Important:
- la suppression de criminel est desactivee dans l'API (politique de conservation des dossiers)
- privilegier les changements de statut (`ARRESTED`, `ACTIVE`, `RELEASED`, `DECEASED`, `UNKNOWN`)
