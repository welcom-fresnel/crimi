# Journal des changements backend

Les chemins des routes existantes et l’enveloppe `{ success, message, data }` restent inchangés. Les nouvelles routes sont additives. Les erreurs métier ajoutées sont en français. Les choix de workflow métier non précisés sont conservateurs : seul un ADMIN tranche une demande, et l’auteur ne peut pas approuver sa propre demande.

## Lot A — corrections immédiates

| Point | Fichiers | Avant | Après |
|---|---|---|---|
| A1 | `src/middlewares/audit.middleware.ts`, `src/routes/criminal.routes.ts` | L’audit d’une preuve PUT cherchait le dossier via `params.id` et échouait en 404. | `saveOriginalData` reçoit un nom de paramètre configurable ; la route utilise `evidenceId`, et conserve `before/after`. |
| A2 | `src/services/criminal.service.ts` | Des opérations sur des preuves restaient possibles pour un dossier supprimé logiquement. | `assertCriminalActive` est appliqué aux mutations, lectures et téléchargements de preuves et aux mises à jour de dossier. |
| A3 | `src/services/criminal.service.ts` | La suppression logique effaçait des fichiers et le contrôle de chemin utilisait un préfixe trop large. | Les fichiers judiciaires sont conservés ; les anciennes photos remplacées sont archivées sous `uploads/archive/photos/` ; le contrôle exige `uploadsRoot + path.sep`. |
| A4 | `src/server.ts`, `src/routes/criminal.routes.ts`, `src/controllers/criminal.controller.ts` | Les photos étaient publiées par `express.static`. | La photo est servie sur `/api/criminals/:id/photo` avec authentification et `Cache-Control: private, no-store`. Depuis AB1, l’URL n’accepte plus de jeton et l’audit VIEW est limité à `?context=detail`. |
| A5 | `src/services/criminal.service.ts`, `src/validators/criminal.validator.ts`, `src/routes/user.routes.ts` | L’update ADMIN pouvait transmettre des propriétés arbitraires à Prisma ; plusieurs bodies n’étaient pas validés. | Les écritures de Criminal utilisent une liste blanche ; des validations couvrent les preuves et les mises à jour d’utilisateur. |
| A6 | `src/middlewares/auth.middleware.ts`, `src/config/index.ts`, `.env.example` | Secret JWT par défaut, vérification d’algorithme permissive et erreur d’expiration masquée. | Secret obligatoire d’au moins 32 caractères, HS256 explicite, expiration correctement distinguée ; exemple neutre et expiration par défaut de 8 h. |
| A7 | `src/routes/auth.routes.ts`, `src/services/auth.service.ts`, `src/controllers/auth.controller.ts`, `prisma/seed.ts`, `package.json` | Pas de limiteur de login ; réponses différentes et mot de passe admin connu en dur. | Limite de 10 tentatives/15 min/IP ; même 401 ; LOGIN/LOGOUT audités ; seed via `SEED_ADMIN_PASSWORD` ou secret aléatoire affiché une fois. |
| A8 | `src/controllers/criminal.controller.ts`, `src/controllers/user.controller.ts`, `src/services/criminal.service.ts` | Pagination non bornée, collision concurrente non traduite, recherche de nom trop stricte. | Page/limite bornées, conflit de numéro traduit en 409, tous les termes du nom doivent correspondre. Les filtres recherchent les champs portés par Criminal OU ceux des crimes pour préserver la recherche des dossiers existants. |

## Lot B — durcissement

| Point | Fichiers | Avant | Après |
|---|---|---|---|
| B1 | `src/config/permissions.ts`, `src/services/permission.service.ts`, `prisma/seed.ts`, `src/services/user.service.ts`, `tests/permissions-seed.test.ts` | Les permissions JSON du rôle faisaient autorité au runtime. | `ROLE_PERMISSIONS` est la référence runtime et seed ; cache 60 secondes invalidé après modification d’un rôle. `npm test` vérifie la parité base/constante. |
| B2 | `src/services/audit.service.ts`, `src/middlewares/audit.middleware.ts`, `src/middlewares/auth.middleware.ts`, `src/controllers/audit.controller.ts`, `src/routes/audit.routes.ts`, migration audit | Audit incomplet, asynchrone sur actions critiques, masquage superficiel et aucune détection de falsification. | Traces VIEW et DENIED ; audit attendu avant réponse pour actions critiques ; masquage récursif ; chaîne SHA-256 ordonnée par verrou PostgreSQL et endpoint ADMIN de vérification. La chaîne commence après migration ; les anciens journaux sans hash sont rapportés comme historiques. La migration commente le `REVOKE` à appliquer par l’exploitant. |
| B3 | `src/controllers/criminal.controller.ts`, `src/services/socket.service.ts`, `.env.example` | Le VIEWER recevait des données sensibles et Socket.io diffusait le dossier complet. | Sérialisation VIEWER réduite ; payload socket minimal par défaut. Le frontend recharge le dossier après `CRIMINAL_CREATED`/`CRIMINAL_UPDATED`. `SOCKET_FULL_PAYLOAD=true` réactive les payloads complets. |
| B4 | `src/routes/criminal.routes.ts`, `prisma/schema.prisma`, migration preuves, `package.json` | Le type du téléversement se basait sur le MIME déclaré et le nom client. | Vérification des octets, nom UUID et extension validée, suppression des temporaires rejetés, SHA-256 des preuves ; point de branchement antivirus commenté. |
| B5 | `src/services/user.service.ts` | Suppression utilisateur sans contrôle complet des liens et du dernier administrateur. | Refus 409 si des données liées existent ; protection contre auto-suppression/désactivation et contre la suppression/désactivation du dernier ADMIN actif. |
| B6 | `prisma/schema.prisma`, `prisma/seed.ts`, `src/services/auth.service.ts`, `src/middlewares/auth.middleware.ts`, migration verrouillage | Aucun compteur ni verrouillage ; compte initial sans changement de mot de passe obligatoire. | Verrou de 15 min après cinq échecs, remise à zéro après succès ; le compte admin de seed impose le changement et les autres routes renvoient `PASSWORD_CHANGE_REQUIRED`. |

## Lot C — modèle procédural

| Point | Fichiers | Avant | Après |
|---|---|---|---|
| C | `prisma/schema.prisma`, `prisma/migrations/20261029103000_case_workflow/migration.sql`, `src/routes/workflow.routes.ts`, `src/routes/index.ts`, `src/validators/criminal.validator.ts`, `src/services/criminal.service.ts`, `src/types/index.ts` | Criminal n’avait qu’un champ de situation `status` et aucun modèle de procédure ou de validation. | Ajout de `personSituation` et `offenseState`, ainsi que `Procedure`, `Decision`, `Peine`, `Validation`, `DossierVersion`, `Demande` et `ResultatPublie`. Le parcours `/api/workflow` permet brouillon, soumission, approbation/rejet par un autre ADMIN et publication après approbation. Les champs historiques `crimeTypeId`, `description`, `crimeDate`, `status` et `dangerLevel` ne sont ni supprimés ni utilisés dans ce workflow. |

## Lot A-bis — contrat frontend

| Point | Fichiers | Avant | Après |
|---|---|---|---|
| AB1 | `src/routes/criminal.routes.ts`, `src/controllers/criminal.controller.ts` | Photo-token en query permis et VIEW audité sur chaque vignette. | Seul l’en-tête Authorization est accepté ; la route photo-token est supprimée ; audit uniquement avec `context=detail`, cache `private, no-store`. |
| AB2 | `src/types/index.ts`, `src/validators/criminal.validator.ts`, `src/services/criminal.service.ts`, nouvelle migration de séquence | Le client devait fournir le numéro de dossier. | `caseNumber` est facultatif ; le serveur prend un numéro `AAAA-NNNNNN` via la séquence PostgreSQL dans la transaction. Les numéros fournis gardent le contrôle d’unicité et le 409. |
| AB3 | `src/services/criminal.service.ts` | Une valeur identique sur un champ déjà renseigné était refusée. | Les chaînes sont trimées et les dates comparées au jour ; les valeurs identiques sont ignorées, y compris pour l’arrestation. |
| AB4 | `src/services/auth.service.ts`, `src/controllers/auth.controller.ts`, `src/middlewares/auth.middleware.ts`, `src/middlewares/error.middleware.ts`, `src/routes/auth.routes.ts`, `src/services/permission.service.ts` | Login/profile ne fournissaient pas les permissions fusionnées ; verrou et limiteur avaient des réponses différentes. | Login et profil ajoutent `mustChangePassword` et les permissions fusionnées. Verrou et limiteur renvoient le même 429 `TOO_MANY_ATTEMPTS`; accès restreint renvoie le 403 `PASSWORD_CHANGE_REQUIRED`. |
| AB5 | `src/services/socket.service.ts` | Les événements criminal utilisaient des formes différentes et pouvaient contenir le dossier entier. | Avec payload complet désactivé, created/updated/deleted ne contiennent que `criminalId`, `caseNumber`, `by` et `timestamp`. |
| AB6 | `src/routes/criminal.routes.ts`, `src/controllers/criminal.controller.ts`, `src/controllers/audit.controller.ts` | Pas de stats, de trace d’export dédiée et pagination d’audit non bornée. | Ajout de `/criminals/stats` et `/criminals/:id/export-log`; GET audit borne page/limit à 100 et renvoie la pagination. |

## Migrations ajoutées

- `20261029100000_audit_chain`
- `20261029101000_evidence_file_hashes`
- `20261029102000_user_login_lock`
- `20261029103000_case_workflow`
- `20261029104000_criminal_case_number_sequence`

Aucune migration existante n’est modifiée. Lancer `npx prisma migrate deploy` sur chaque base avant de démarrer le serveur.

## Variables d’environnement

- `SEED_ADMIN_PASSWORD` : mot de passe initial facultatif ; génération aléatoire si absent, au moins 12 caractères en production.
- `SOCKET_FULL_PAYLOAD` : désactivé par défaut ; `true` demande l’ancien payload socket complet.
- `DATABASE_URL_TEST` : URL d’une base PostgreSQL dédiée aux tests. `npm test` refuse l’URL de production/dev, applique les migrations, lance le seed, puis Vitest.
- `JWT_SECRET` : obligatoire et d’au moins 32 caractères ; générer avec `openssl rand -base64 48`.

## Adaptations frontend

- Pour afficher une photo, utiliser `fetch` avec l’en-tête `Authorization`, puis créer une URL blob pour l’image. Ajouter `?context=detail` uniquement lors de l’ouverture du détail ; ne pas l’ajouter aux vignettes des listes.
- Après `CRIMINAL_CREATED` ou `CRIMINAL_UPDATED`, recharger le dossier depuis l’API lorsque `SOCKET_FULL_PAYLOAD=false` (valeur par défaut).
- Après connexion initiale, lire `mustChangePassword` et `permissions` dans la réponse. Si le compte doit changer son mot de passe ou reçoit `PASSWORD_CHANGE_REQUIRED`, afficher le changement avant les autres écrans ; profil et déconnexion restent accessibles. Traiter le 429 `TOO_MANY_ATTEMPTS` de la même façon, qu’il provienne du limiteur IP ou du verrou de compte.
- À la création d’un dossier, `caseNumber` peut être omis ; utiliser celui retourné par l’API. Le format généré est `AAAA-NNNNNN`.
- Écouter les payloads `criminal:created`, `criminal:updated` et `criminal:deleted` avec `criminalId`, `caseNumber`, `by` et `timestamp` lorsque le payload complet est désactivé.
- Le formulaire de dossier peut maintenant saisir `personSituation` et `offenseState`. Les formulaires et vues métier doivent migrer leur lecture fonctionnelle depuis l’ancien `status` vers ces champs, sans attendre leur suppression.
