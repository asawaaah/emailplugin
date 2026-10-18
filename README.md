# Aperçu Gmail

Extension Chrome pour voir et trier ses courriels Gmail d'un clic, à la manière de *Checker Plus for Gmail*.

- **Badge** sur l'icône : nombre de conversations non lues, tous comptes confondus (vérifié chaque minute par défaut).
- **Plusieurs comptes Gmail**, chacun dans sa section.
- **Lecture** d'une conversation directement dans la fenêtre, images distantes masquées par défaut (protection contre le pistage).
- **Actions rapides** : archiver, supprimer, signaler comme spam, marquer comme lu ou non lu, ouvrir dans Gmail.
- Interface en **français** (par défaut) et en **anglais**, thèmes clair et sombre.
- Aucun serveur : l'extension parle directement à l'API Gmail de Google. Vos courriels ne passent par aucun autre service.

## Installation (une seule fois, environ 15 minutes)

### 1. Créer le projet Google Cloud

L'extension a besoin de son propre « identifiant client » Google pour lire Gmail. C'est gratuit.

1. Ouvrir <https://console.cloud.google.com/projectcreate>, nommer le projet `Apercu Gmail`, puis **Créer**.
2. Activer l'API Gmail : <https://console.cloud.google.com/apis/library/gmail.googleapis.com>, puis **Activer** (vérifier que le projet `Apercu Gmail` est bien sélectionné en haut de la page).
3. Configurer l'écran de connexion : <https://console.cloud.google.com/auth/overview>, puis **Commencer** :
   - Nom de l'application : `Aperçu Gmail` ; adresse d'assistance : votre adresse.
   - Audience : **Externe**.
   - Coordonnées : votre adresse. Accepter les conditions, puis **Créer**.
4. Ajouter vos comptes comme testeurs : menu **Audience**, section **Utilisateurs test**, puis **Add users** : ajouter **chaque adresse Gmail** que vous voulez voir dans l'extension. Enregistrer.
5. Déclarer l'accès à Gmail : menu **Accès aux données** (*Data access*), puis **Ajouter ou supprimer des champs d'application**. Coller `https://www.googleapis.com/auth/gmail.modify` dans « Ajouter manuellement », puis **Ajouter au tableau**, **Mettre à jour** et **Enregistrer**.
6. Créer l'identifiant client : menu **Clients**, puis **Créer un client** :
   - Type d'application : **Application Web** (et non « Extension Chrome »).
   - Nom : `Aperçu Gmail`.
   - **URI de redirection autorisés**, **Ajouter un URI** :
     ```
     https://icpofmgbmnhgejjklblpnnloenedaffp.chromiumapp.org/
     ```
   - **Créer**, puis copier l'**ID client** (il se termine par `.apps.googleusercontent.com`).

> L'application reste en mode « test » : c'est normal et suffisant pour un usage personnel. Aucune vérification par Google n'est nécessaire.

### 2. Charger l'extension dans Chrome

1. Récupérer ce dépôt : sur GitHub, bouton **Code** puis **Download ZIP**, et décompresser le fichier ; ou `git clone`.
2. Ouvrir `chrome://extensions`, activer le **Mode développeur** (en haut à droite).
3. **Charger l'extension non empaquetée** et choisir le dossier **`extension`** du dépôt.
4. Vérifier que l'identifiant affiché est bien `icpofmgbmnhgejjklblpnnloenedaffp`.
5. Épingler l'icône : pièce de casse-tête dans la barre de Chrome, puis épingle à côté d'« Aperçu Gmail ».

### 3. Connecter vos comptes

1. La page **Réglages** s'ouvre à l'installation (sinon : clic droit sur l'icône, puis **Options**).
2. Coller l'ID client, puis **Enregistrer**.
3. **Ajouter un compte Gmail** : choisir le compte dans la fenêtre Google. Google affiche « Google n'a pas validé cette application » : c'est votre propre application, cliquer **Continuer**, puis autoriser l'accès.
4. Recommencer pour chaque compte.

## Bon à savoir

- **Reconnexion** : l'accès se renouvelle seul tant que le compte reste connecté à Google dans Chrome. Si Google le demande (en mode test, cela peut arriver environ chaque semaine), le badge devient orange avec un `!` et la fenêtre affiche **Se reconnecter**.
- **Supprimer** met la conversation à la corbeille de Gmail (récupérable 30 jours), jamais de suppression définitive.
- **Mise à jour** : après avoir récupéré une nouvelle version, cliquer sur la flèche de rechargement de l'extension dans `chrome://extensions`.
- **Retirer un compte** depuis les Réglages révoque aussi l'accès chez Google.

## Développement

```bash
npm install
npm run check        # vérification des types, tests unitaires, build
npm run test:e2e     # test de bout en bout dans Chromium (API Gmail simulée), captures dans test-results/
npm run watch        # reconstruit extension/ à chaque modification
```

Le dossier `extension/` est le résultat du build : il est versionné pour pouvoir charger l'extension sans installer Node.js. Toujours lancer `npm run build` avant de commiter.

Structure :

```text
static/              manifest, pages HTML, styles, icônes, noms traduits (_locales)
src/background.ts    service worker : badge, vérification périodique, connexion Google
src/popup/           fenêtre de l'icône : liste, lecture, actions rapides
src/options/         page de réglages
src/lib/auth.ts      connexion Google multi-comptes (launchWebAuthFlow, renouvellement silencieux)
src/lib/gmail.ts     client de l'API Gmail
src/lib/mime.ts      lecture des messages (corps, pièces jointes), document isolé de l'iframe
src/lib/i18n.ts      textes FR et EN
tests/               tests Vitest et test de bout en bout
```

La clé publique du `manifest.json` fixe l'identifiant de l'extension (et donc l'URI de redirection déclarée chez Google). Ne pas la modifier.
