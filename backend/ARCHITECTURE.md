# Architecture du Backend - Securit Afrique Hub

## 🏛️ Vue d'ensemble de l'architecture

Le backend est construit selon une architecture **modulaire en couches** qui sépare clairement les responsabilités :

```
┌─────────────────────────────────────────────┐
│           CLIENT (Frontend/API)             │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│              ROUTES LAYER                   │
│  • Définition des endpoints                 │
│  • Mapping des requêtes HTTP                │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           MIDDLEWARES LAYER                 │
│  • Authentification (JWT)                   │
│  • Autorisation (RBAC)                      │
│  • Validation des données                   │
│  • Audit automatique                        │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│          CONTROLLERS LAYER                  │
│  • Gestion des requêtes/réponses            │
│  • Orchestration des services               │
│  • Formatage des réponses                   │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│           SERVICES LAYER                    │
│  • Logique métier                           │
│  • Règles de validation métier              │
│  • Orchestration des données                │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│         DATABASE ACCESS (Prisma)            │
│  • ORM Prisma                               │
│  • Requêtes SQL optimisées                  │
│  • Gestion des transactions                 │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│            POSTGRESQL DATABASE              │
└─────────────────────────────────────────────┘
```

## 📁 Structure détaillée des dossiers

### `/src/config/`
**Rôle** : Configuration centralisée de l'application

- `index.ts` : Configuration générale (port, JWT, CORS, etc.)
- `permissions.ts` : Définition des permissions par rôle (RBAC)

**Principe** : Toute la configuration est centralisée ici pour faciliter la maintenance et les modifications.

### `/src/types/`
**Rôle** : Définitions TypeScript

- Interfaces pour les requêtes (DTOs)
- Types pour les réponses API
- Types pour le système d'audit
- Énumérations (Status, Severity, etc.)

**Principe** : Le typage fort améliore la sécurité du code et l'expérience développeur.

### `/src/middlewares/`
**Rôle** : Logique transversale appliquée aux routes

#### `auth.middleware.ts`
- `authenticate()` : Vérifie le token JWT
- `authorize(resource, action)` : Vérifie les permissions basées sur les rôles

#### `audit.middleware.ts`
- `auditLog(action, entity)` : Enregistre automatiquement les actions
- `saveOriginalData()` : Sauvegarde les données avant modification

#### `error.middleware.ts`
- `errorHandler()` : Gestion centralisée des erreurs
- `notFoundHandler()` : Gestion des routes inexistantes

#### `validation.middleware.ts`
- `validate()` : Exécute les validations express-validator

**Principe** : Les middlewares sont réutilisables et suivent le principe DRY (Don't Repeat Yourself).

### `/src/validators/`
**Rôle** : Validation des données entrantes

Chaque validator définit les règles de validation pour :
- Champs requis
- Formats (email, UUID, etc.)
- Longueurs min/max
- Valeurs autorisées (énumérations)

**Principe** : Validation au plus tôt pour éviter les données invalides dans le système.

### `/src/routes/`
**Rôle** : Définition des endpoints API

Structure d'une route typique :
```typescript
router.post(
  '/path',
  authenticate,                    // 1. Authentification
  authorize('resource', 'action'), // 2. Autorisation
  validate(validators),            // 3. Validation
  auditLog('ACTION', 'ENTITY'),   // 4. Audit
  controller.method                // 5. Contrôleur
);
```

**Principe** : Chaque route passe par une chaîne de middlewares avant d'atteindre le contrôleur.

### `/src/controllers/`
**Rôle** : Gestion des requêtes HTTP

Les contrôleurs :
1. Extraient les données de la requête
2. Appellent les services appropriés
3. Formatent et renvoient la réponse
4. Gèrent les erreurs avec `try/catch` et `next(error)`

**Principe** : Les contrôleurs sont fins et délèguent la logique métier aux services.

### `/src/services/`
**Rôle** : Logique métier de l'application

Les services :
- Contiennent toute la logique métier
- Interagissent avec la base de données (Prisma)
- Lancent des `ApiError` en cas de problème
- Sont réutilisables par plusieurs contrôleurs

**Principe** : La logique métier est séparée de la logique HTTP pour faciliter les tests et la réutilisation.

### `/src/utils/`
**Rôle** : Utilitaires et helpers

- `ApiError.ts` : Classe d'erreur personnalisée
- `prisma.ts` : Instance singleton de Prisma Client

**Principe** : Code utilitaire réutilisable dans toute l'application.

## 🔐 Système d'authentification et d'autorisation

### Authentification (JWT)

1. **Login** :
   ```
   User → Login → Validate credentials → Generate JWT → Return token
   ```

2. **Protected routes** :
   ```
   Request → Extract token → Verify JWT → Attach user to req → Continue
   ```

### Autorisation (RBAC - Role-Based Access Control)

Le système utilise un contrôle d'accès basé sur les rôles :

```typescript
ADMIN: {
  criminals: [create, read, update, delete],
  users: [create, read, update, delete],
  crime_types: [create, read, update, delete],
  audit_logs: [read]
}

AGENT: {
  criminals: [create, read, update],
  crime_types: [read],
  users: [read]
}

VIEWER: {
  criminals: [read],
  crime_types: [read]
}
```

Le middleware `authorize(resource, action)` vérifie si l'utilisateur a la permission requise.

## 📊 Système d'audit

### Fonctionnement

Le système d'audit est **automatique** et **transparent** :

1. Le middleware `auditLog()` intercepte la réponse
2. Si la requête réussit (status 2xx), il enregistre :
   - Utilisateur qui a effectué l'action
   - Action (CREATE, UPDATE, DELETE)
   - Entité concernée (CRIMINAL, USER, etc.)
   - Changements (avant/après)
   - Métadonnées (IP, User-Agent, timestamp)

### Exemple de flow d'audit

```
POST /api/criminals
  ↓
authenticate → authorize → validate
  ↓
saveOriginalData (si UPDATE/DELETE)
  ↓
controller.create()
  ↓
service.create() → database.insert()
  ↓
auditLog middleware → enregistre l'audit
  ↓
Response 201 Created
```

## 🗄️ Gestion de la base de données

### Prisma ORM

Avantages :
- Type-safe : TypeScript généré automatiquement
- Migrations versionnées
- Requêtes optimisées
- Relations gérées automatiquement

### Patterns utilisés

1. **Include** : Charger les relations
   ```typescript
   include: { crimeType: true, createdBy: true }
   ```

2. **Select** : Sélectionner les champs (éviter le mot de passe)
   ```typescript
   select: { id: true, username: true, email: true }
   ```

3. **Pagination** : Limit et skip
   ```typescript
   take: limit, skip: (page - 1) * limit
   ```

4. **Transactions** : Pour les opérations complexes
   ```typescript
   await prisma.$transaction([...])
   ```

## 🚀 Flow complet d'une requête

### Exemple : Créer un criminel

```
1. CLIENT
   POST /api/criminals
   Headers: { Authorization: "Bearer <token>" }
   Body: { caseNumber, firstName, ... }
   
2. ROUTE LAYER
   router.post('/', ...)
   
3. MIDDLEWARE: authenticate
   - Extrait le token
   - Vérifie la validité
   - Attache req.user
   
4. MIDDLEWARE: authorize('criminals', 'create')
   - Vérifie les permissions de l'utilisateur
   
5. MIDDLEWARE: validate(createCriminalValidator)
   - Valide les données
   - Retourne 400 si invalide
   
6. MIDDLEWARE: auditLog('CREATE', 'CRIMINAL')
   - Configure l'audit (s'exécute après la réponse)
   
7. CONTROLLER: criminalController.createCriminal
   - Extrait req.body et req.user.userId
   - Appelle le service
   
8. SERVICE: criminalService.createCriminal
   - Vérifie si le caseNumber existe
   - Vérifie si le crimeType existe
   - Crée le criminel dans la DB
   - Retourne le criminel créé
   
9. CONTROLLER
   - Formate la réponse
   - res.status(201).json({ success: true, ... })
   
10. MIDDLEWARE: auditLog (après la réponse)
    - Enregistre l'audit dans la DB
    
11. CLIENT
    Reçoit la réponse 201 avec le criminel créé
```

## 🛡️ Gestion des erreurs

### Hiérarchie des erreurs

```
Error
  └─ ApiError (custom)
       ├─ 400 Bad Request
       ├─ 401 Unauthorized
       ├─ 403 Forbidden
       ├─ 404 Not Found
       ├─ 409 Conflict
       └─ 500 Internal Server Error
```

### Flow de gestion des erreurs

```
Service throws ApiError
  ↓
Controller catch → next(error)
  ↓
errorHandler middleware
  ↓
Format error response
  ↓
Send to client
```

## 📦 Dépendances principales

### Production
- **express** : Framework web
- **@prisma/client** : ORM
- **jsonwebtoken** : Authentification JWT
- **bcryptjs** : Hashage des mots de passe
- **express-validator** : Validation des données
- **helmet** : Sécurité HTTP headers
- **cors** : Cross-Origin Resource Sharing
- **morgan** : Logger HTTP

### Développement
- **typescript** : Langage
- **prisma** : CLI Prisma
- **ts-node** : Exécution TypeScript
- **nodemon** : Auto-reload en dev

## 🔄 Cycle de développement

### Ajout d'une nouvelle fonctionnalité

1. **Modèle** : Ajouter dans `prisma/schema.prisma`
2. **Migration** : `npm run prisma:migrate`
3. **Types** : Ajouter dans `src/types/index.ts`
4. **Service** : Créer la logique métier
5. **Controller** : Créer les handlers HTTP
6. **Validators** : Définir les validations
7. **Routes** : Ajouter les endpoints
8. **Tests** : Tester avec Postman/Insomnia

## 🧪 Bonnes pratiques appliquées

### Code
- ✅ Architecture en couches
- ✅ Séparation des préoccupations
- ✅ DRY (Don't Repeat Yourself)
- ✅ SOLID principles
- ✅ Type safety avec TypeScript

### Sécurité
- ✅ JWT pour l'authentification
- ✅ RBAC pour l'autorisation
- ✅ Hashage des mots de passe
- ✅ Validation des données
- ✅ Audit automatique
- ✅ Protection CORS
- ✅ Helmet pour les headers

### Performance
- ✅ Pagination des résultats
- ✅ Sélection des champs nécessaires
- ✅ Index sur les champs recherchés
- ✅ Connection pooling (Prisma)

### Maintenabilité
- ✅ Code commenté en français
- ✅ Structure claire et organisée
- ✅ Configuration centralisée
- ✅ Gestion centralisée des erreurs
- ✅ Documentation complète

## 📚 Ressources et documentation

- [Express.js](https://expressjs.com/)
- [Prisma](https://www.prisma.io/docs)
- [TypeScript](https://www.typescriptlang.org/)
- [JWT](https://jwt.io/)
- [PostgreSQL](https://www.postgresql.org/docs/)

---

**Architecture conçue pour être scalable, maintenable et sécurisée** 🚀

