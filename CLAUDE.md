# CLAUDE.md

Extension Chrome « Aperçu Gmail » (Manifest V3) : badge des non lus, lecture et actions rapides sur plusieurs comptes Gmail. Usage personnel pour l'instant (application Google Cloud en mode test).

- **Langue** : répondre et documenter en français ; code et noms en anglais. Interface FR par défaut, EN en second (`src/lib/i18n.ts`, mettre les deux à jour ensemble).
- **Profil** : le porteur lit le code sans coder au quotidien ; expliquer les choix simplement, avancer par petites étapes vérifiables.
- **Avant chaque commit** : `npm run check` puis `npm run test:e2e` ; `extension/` (build) est versionné et doit être reconstruit.
- **Sécurité** : le corps des courriels ne s'affiche que dans l'iframe isolé (`buildEmailDocument`, sandbox sans `allow-scripts`), jamais via `innerHTML` dans les pages de l'extension. Images distantes bloquées par défaut. Aucune donnée de courriel ni adresse dans les journaux. Jetons dans `chrome.storage.session` seulement.
- **Connexion** : toujours dans le service worker (le popup se ferme quand la fenêtre Google prend le focus). Portée unique `gmail.modify` ; jamais de suppression définitive.
- **Identifiant de l'extension** fixé par la clé du manifest : `icpofmgbmnhgejjklblpnnloenedaffp` (URI de redirection déclarée chez Google). Ne pas changer la clé.
