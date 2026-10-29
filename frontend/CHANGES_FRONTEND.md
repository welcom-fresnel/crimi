# Changements frontend

## F1 — Photos authentifiées

- Fichiers : `src/services/api.ts`, `src/hooks/useCriminalPhoto.ts`, `src/components/criminals/CriminalPhoto.tsx`, les composants liste/détail/formulaire/tableau de bord, `src/contexts/CriminalsContext.tsx`, `src/lib/criminal-pdf.ts`.
- Avant : les écrans construisaient des URL vers `/uploads/photos` et le navigateur chargeait les images sans l’en-tête JWT.
- Après : les photos sont chargées en blob par `criminalsAPI.getPhoto`, avec l’Authorization Axios, puis mises en cache en mémoire (100 objets URL maximum). Le détail et le PDF envoient `context=detail` pour l’audit. Le formulaire affiche un aperçu local de l’image sélectionnée.
- Adaptation : les photos sont maintenant rendues par `CriminalPhoto`; les URL stockées dans `Criminal.photo` servent uniquement à indiquer la présence d’une photo.

## F2 — Événements temps réel

- Fichiers : `src/services/socket.service.ts`, `src/contexts/CriminalsContext.tsx`.
- Avant : les gestionnaires attendaient le dossier complet et les journaux de console s’affichaient aussi en production.
- Après : les charges minimales utilisent `criminalId`, `caseNumber` et `by.username`; création et modification déclenchent un rafraîchissement différé de 1,5 seconde. Les événements complets gardent l’upsert local.
- Adaptation : après un événement minimal, le client recharge la requête courante pour obtenir les données. L’interface ne considère jamais l’événement Socket.io comme une autorisation.

## F3 — Session et changement obligatoire de mot de passe

- Fichiers : `src/services/api.ts`, `src/contexts/AuthContext.tsx`, `src/App.tsx`, `src/pages/ProfilePage.tsx`, `src/pages/Login.tsx`, `src/pages/AdminUsers.tsx`.
- Avant : le frontend réutilisait le profil local pour les rôles et ignorait `mustChangePassword`.
- Après : le profil serveur est la source de la session, les permissions sont exposées par AuthContext et les routes protégées conduisent vers `/profile?forcePasswordChange=1` tant que le changement est requis. Login affiche un message neutre pour les erreurs, avec le message contractuel pour HTTP 429.
- Les formulaires imposent 12 caractères. Le validateur backend actuellement présent n’en impose que 6 : la règle frontend est donc plus stricte et le backend doit être aligné.
- Le jeton reste dans `localStorage` pour maintenir les sessions multi-onglets. Toute faille XSS sur l’origine peut exposer ce jeton; il faut conserver une politique stricte d’échappement et de dépendances.

## F4 — Journal d’audit

- Fichiers : `src/contexts/CriminalsContext.tsx`, `src/pages/HistoryPage.tsx`, `src/services/api.ts`.
- Avant : le contexte téléchargeait 100 journaux pour tous les utilisateurs et HistoryPage paginait côté navigateur.
- Après : seuls les ADMIN chargent `/audit`, avec 50 entrées par page serveur; filtres d’action et d’entité, état vide, détails récursivement filtrés et vérification d’intégrité sont disponibles. L’historique personnel du profil ne déclenche plus de requête d’audit.
- Les filtres textuels et d’action s’appliquent à la page chargée; la pagination reste pilotée par les métadonnées serveur.

## F5 — Numéro du dossier

- Fichiers : `src/components/criminals/CriminalForm.tsx`, `src/contexts/CriminalsContext.tsx`, `src/services/api.ts`, `src/pages/CriminalDetail.tsx`.
- Avant : le frontend fabriquait un numéro aléatoire local et le transmettait au serveur.
- Après : le numéro n’est envoyé dans aucune écriture. Le toast et la fiche utilisent la valeur renvoyée par l’API.

## F6 — Formulaire et modifications partielles

- Fichiers : `src/components/criminals/CriminalForm.tsx`, nouveau `src/lib/criminal-diff.ts`, `src/contexts/CriminalsContext.tsx`, `src/services/api.ts`.
- Avant : l’alias reprenait le prénom, les dates et lieux d’arrestation alimentaient les faits, et les formulaires renvoyaient un objet complet avec une description de remplacement.
- Après : le formulaire sépare faits et arrestation, demande une description d’au moins 10 caractères à la création et ne transmet en modification que les différences normalisées. Les valeurs renseignées sont verrouillées pour les non ADMIN.
- En cas de refus backend lié aux champs verrouillés, l’interface donne une explication lisible.

## F7 — Droits d’interface

- Fichiers : nouveau `src/hooks/usePermissions.ts`, `src/App.tsx`, `src/components/layout/AppSidebar.tsx`, composants criminels, `src/pages/CriminalDetail.tsx`.
- Avant : plusieurs contrôles d’écriture dépendaient directement du rôle.
- Après : le hook `usePermissions` lit les permissions calculées par le serveur, masque les commandes sans permission et bloque les routes de création/modification dans l’interface. Le serveur reste l’autorité d’accès.

## F8 — Pagination, recherche et tableau de bord

- Fichiers : `src/contexts/CriminalsContext.tsx`, `src/pages/CriminalsList.tsx`, `src/pages/SearchPage.tsx`, nouveau `src/hooks/useCriminalSearch.ts`, `src/pages/Dashboard.tsx`, `src/services/api.ts`.
- Avant : la liste chargeait 100 dossiers puis filtrait et paginait côté navigateur; la recherche modifiait la liste partagée.
- Après : la liste utilise 9 dossiers par page en cartes et 10 en tableau; les filtres et la recherche autonome utilisent l’API paginée. Le tableau de bord charge ses compteurs via `/criminals/stats` et ses cinq dossiers récents séparément.

## F9 — Export PDF tracé

- Fichiers : `src/pages/CriminalDetail.tsx`, `src/services/api.ts`, `src/lib/criminal-pdf.ts`.
- Avant : le PDF pouvait être créé sans journaliser l’intention d’export.
- Après : une entrée d’export est demandée avant la création du PDF. Une panne bloque l’export; un 404 de route conserve la compatibilité avec un backend antérieur. Le PDF indique l’auteur et l’heure de génération.

## F10 — Hygiène et tests

- Fichiers : `src/data/mockData.ts` (supprimé), `src/types/index.ts`, `src/services/api.ts`, `src/components/ErrorBoundary.tsx`, `src/services/socket.service.ts`, `src/contexts/AuthContext.tsx`, `src/contexts/CriminalsContext.tsx`, `.env.example`, `.gitignore`, `package.json`, `package-lock.json`, `vite.config.ts`, les fichiers `*.test.ts(x)`, nouveau `src/lib/debounced-refresh.ts`.
- Avant : les données fictives et types hérités restaient dans le bundle source; un commentaire API était mal encodé; `.env` était suivi par Git et l’exemple d’environnement contenait une IP privée; aucun script de tests ciblé n’existait.
- Après : les exports inutilisés sont supprimés, les erreurs de dossier ne sont pas écrites en console sous forme d’objets, `.env` est ignoré et retiré de l’index sans effacer la copie locale, l’exemple utilise localhost et commente chaque variable. Vitest couvre la normalisation des modifications, les photos, les permissions, l’intercepteur d’authentification et le debounce temps réel.

### Endpoints backend requis

- `GET /api/criminals/:id/photo` : réponse binaire, Authorization requis; `?context=detail` pour auditer la consultation du détail.
- `GET /api/criminals/stats` : `{ total, byStatus }`.
- `POST /api/criminals/:id/export-log` : `{ format: 'pdf', purpose }`, réponse `204`.
- `GET /api/audit?page=&limit=` : données paginées avec `pagination`.
- `GET /api/audit/verify` : résultat de vérification de chaîne.

### Risques et écarts observés

- Le jeton reste dans `localStorage` pour le partage multi-onglets; une faille XSS sur l’origine peut l’exposer.
- L’endpoint photo renvoie un flux binaire sans enveloppe JSON; `export-log` renvoie `204` sans enveloppe. Les deux sont traités comme des exceptions explicites à l’enveloppe JSON usuelle.
- Vérification du backend présent dans le workspace : les cinq endpoints sont déclarés; les stats renvoient `data.total/byStatus`, l’audit paginé renvoie `data` et `pagination`, `audit/verify` renvoie son résultat dans `data`, photo est authentifiée et répond en binaire, et export-log valide `format` et `purpose` avant `204`. Aucun écart de forme n’a été constaté pour ces contrats. La règle UI de 12 caractères reste plus stricte que le validateur backend actuellement à 6.
