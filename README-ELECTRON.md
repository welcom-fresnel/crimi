Guide rapide pour générer l'installateur Windows (.exe)

Prérequis:
- Node.js & npm installés sur la machine

Étapes:

1. À la racine du repo, installer les dépendances de l'enveloppe Electron:

```powershell
cd D:\autre\crimi\securit-afrique-hub-main
npm install
```

2. Construire backend et frontend (compile TypeScript et bundle Vite):

```powershell
npm run build:all
```

3. Générer l'installateur Windows (NSIS):

```powershell
npm run dist
```

Remarques importantes:
- Le backend requiert une base de données PostgreSQL et des variables d'environnement (DATABASE_URL, JWT_SECRET). Vous devez fournir un fichier `backend/.env` valide avant de lancer l'application empaquetée.
- Pendant le packaging, les dossiers `frontend/dist` et `backend/dist` sont inclus.
