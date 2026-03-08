# Pack Synchronisation Multi-Postes (Police)

Date: 2026-03-08  
Projet: `securit-afrique-hub-main`

Ce pack te donne la procedure complete pour:
- synchroniser les postes de police,
- utiliser `setup-network.bat` et `launch-app.bat` correctement,
- preparer un packaging `.exe`,
- deployer la base de donnees centralisee.

---

## 1) Architecture recommandee (production)

- 1 serveur central:
  - PostgreSQL (base unique partagee)
  - Backend API + WebSocket
- N postes de police:
  - Frontend (navigateur ou app desktop/electron)
  - Connexion reseau vers serveur central

Important:
- Les postes ne doivent pas avoir chacun leur base locale si tu veux une vraie synchro temps reel.
- Tous les postes pointent vers la meme IP backend centrale.

---

## 2) Scripts obligatoires

### `setup-network.bat`
Utilise-le pour generer automatiquement:
- `backend/.env`
- `frontend/.env`
avec la bonne IP reseau.

Quand l'executer:
- premiere installation,
- changement de reseau (Wi-Fi/LAN),
- changement IP serveur.

### `launch-app.bat`
Utilise-le pour demarrer backend + frontend.

Nouveaute:
- le script detecte un changement d'IP et propose automatiquement de lancer `setup-network.bat`.

### `check-sync.bat`
Nouveau script de verification:
- teste connectivite TCP vers backend,
- teste endpoint `.../api/health`.

Commande:
```bat
check-sync.bat
```

---

## 3) Procedure standard par poste

1. Ouvrir `CMD` dans la racine du projet.
2. Executer:
```bat
setup-network.bat
```
3. Verifier la connectivite:
```bat
check-sync.bat
```
4. Demarrer:
```bat
launch-app.bat
```
5. Ouvrir l'interface:
- sur la machine locale: `http://localhost:8080`
- depuis un autre poste: `http://<IP_DU_SERVEUR_FRONT>:8080`

---

## 4) Deploiement base de donnees centralisee

Sur le serveur PostgreSQL:

1. `postgresql.conf`
- `listen_addresses = '*'` (ou IP serveur specifique)

2. `pg_hba.conf`
- autoriser le sous-reseau des postes (exemple):
```conf
host    all    all    192.168.154.0/24    scram-sha-256
```

3. Pare-feu serveur
- ouvrir TCP `5432` (DB) pour sous-reseau interne uniquement,
- ouvrir TCP `5000` (backend API/WebSocket).

4. Base et migration
```bat
cd backend
npx prisma migrate deploy
npm run prisma:generate
```

5. Sauvegarde
- configurer backup quotidien (`pg_dump`) + retention.

---

## 5) Backend en service Windows (recommande)

Plutot que convertir backend en `.exe`, utilise un service Windows:
- plus stable avec Prisma,
- plus simple a maintenir.

Option simple:
- utiliser NSSM pour lancer:
```bat
node d:\autre\crimi\securit-afrique-hub-main\backend\dist\server.js
```

Avant:
```bat
cd backend
npm ci
npm run build
```

---

## 6) Frontend en `.exe` (desktop)

Approche recommandee:
- Electron + electron-builder.

Flux:
1. Build frontend:
```bat
cd frontend
npm ci
npm run build
```
2. Emballer via Electron en `.exe` (setup installateur).
3. L'app desktop lit `frontend/.env` (ou un fichier config externe) pour l'IP backend.

Note:
- garde `setup-network.bat` pour regenerer la config IP lors des changements reseau.

---

## 7) Checklist de synchro multi-postes

- [ ] serveur PostgreSQL accessible depuis les postes
- [ ] backend central demarre et accessible sur `http://IP_SERVEUR:5000/api/health`
- [ ] `setup-network.bat` execute sur chaque poste
- [ ] `check-sync.bat` passe en succes sur chaque poste
- [ ] frontend connecte avec login valide
- [ ] creation/modification d'un dossier visible sur un autre poste (test temps reel)

---

## 8) Runbook changement de reseau

Sur chaque poste:
1. `setup-network.bat`
2. `check-sync.bat`
3. `launch-app.bat`

Si echec:
- verifier pare-feu,
- verifier IP backend dans `frontend/.env`,
- verifier backend actif (`/api/health`).

---

## 9) Point important securite

- n'expose pas PostgreSQL directement sur Internet.
- limiter l'acces DB au reseau interne/VPN.
- utiliser mots de passe forts + rotation.
- sauvegardes chiffrees + test de restauration mensuel.
