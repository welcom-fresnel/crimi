# Changements frontend

## F1 — Photos authentifiées

- Avant : les écrans construisaient des URL vers `/uploads/photos` et le navigateur chargeait les images sans l’en-tête JWT.
- Après : les photos sont chargées en blob par `criminalsAPI.getPhoto`, avec l’Authorization Axios, puis mises en cache en mémoire (100 objets URL maximum). Le détail et le PDF envoient `context=detail` pour l’audit. Le formulaire affiche un aperçu local de l’image sélectionnée.
- Adaptation : les photos sont maintenant rendues par `CriminalPhoto`; les URL stockées dans `Criminal.photo` servent uniquement à indiquer la présence d’une photo.

## F2 — Événements temps réel

- Avant : les gestionnaires attendaient le dossier complet et les journaux de console s’affichaient aussi en production.
- Après : les charges minimales utilisent `criminalId`, `caseNumber` et `by.username`; création et modification déclenchent un rafraîchissement différé de 1,5 seconde. Les événements complets gardent l’upsert local.
- Adaptation : après un événement minimal, le client recharge la requête courante pour obtenir les données. L’interface ne considère jamais l’événement Socket.io comme une autorisation.

## F3 — Session et changement obligatoire de mot de passe

- Avant : le frontend réutilisait le profil local pour les rôles et ignorait `mustChangePassword`.
- Après : le profil serveur est la source de la session, les permissions sont exposées par AuthContext et les routes protégées conduisent vers `/profile?forcePasswordChange=1` tant que le changement est requis. Login affiche un message neutre pour les erreurs, avec le message contractuel pour HTTP 429.
- Les formulaires imposent 12 caractères. Le validateur backend actuellement présent n’en impose que 6 : la règle frontend est donc plus stricte et le backend doit être aligné.
- Le jeton reste dans `localStorage` pour maintenir les sessions multi-onglets. Toute faille XSS sur l’origine peut exposer ce jeton; il faut conserver une politique stricte d’échappement et de dépendances.

## F4 — Journal d’audit

- Avant : le contexte téléchargeait 100 journaux pour tous les utilisateurs et HistoryPage paginait côté navigateur.
- Après : seuls les ADMIN chargent `/audit`, avec 50 entrées par page serveur; filtres d’action et d’entité, état vide, détails récursivement filtrés et vérification d’intégrité sont disponibles. L’historique personnel du profil ne déclenche plus de requête d’audit.
- Les filtres textuels et d’action s’appliquent à la page chargée; la pagination reste pilotée par les métadonnées serveur.
