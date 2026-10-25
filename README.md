# Aperçu Gmail

Extension Chrome pour voir et trier ses courriels Gmail d'un clic, à la manière de *Checker Plus for Gmail*.

- **Badge** sur l'icône : nombre de conversations non lues, tous comptes confondus (vérifié chaque minute par défaut).
- **Non lus seulement** par défaut ; bascule « Non lus / Tous » en haut de la fenêtre.
- **Plusieurs comptes Gmail**, chacun dans sa section, **repliable** d'un clic, dans l'**ordre** et la **couleur** de votre choix (flèches et pastille de couleur dans les Réglages : 10 couleurs proposées ou une couleur personnalisée).
- Chaque conversation sur 4 lignes : **expéditeur** et date, **objet**, puis **2 lignes d'aperçu**.
- À l'ouverture d'une conversation, la lecture va **directement au premier message non lu** (repéré par un liseré) ; les anciens messages lus du milieu sont regroupés dans une ligne « N messages précédents », à déplier d'un clic.
- **Notifications** à chaque nouveau courriel, dans une **bulle en haut à droite de l'onglet ouvert**, quel que soit le site : compte qui l'a reçu (avec sa couleur), expéditeur, objet et aperçu ; boutons « Ouvrir », « Marquer comme lu » et « Archiver ». Les bulles s'empilent, suivent l'onglet affiché et se ferment seules (durée réglable, en pause au survol ou quand le navigateur n'est pas au premier plan). Autres styles au choix : petite fenêtre séparée, notification du système, ou bulle + système.
- Fenêtre de **800 × 600 px**, le maximum permis par Chrome pour une extension.
- **Lecture** d'une conversation directement dans la fenêtre, images distantes masquées par défaut (protection contre le pistage).
- **Actions rapides** : archiver, supprimer, signaler comme spam, marquer comme lu ou non lu, ouvrir dans Gmail.
- Interface en **français** (par défaut) et en **anglais**, thèmes clair et sombre.
- Aucun serveur : l'extension parle directement à l'API Gmail de Google. Vos courriels ne passent par aucun autre service.
- **Notifications instantanées** en option, avec un petit relais gratuit sur Cloudflare (voir plus bas) ; sinon, vérification chaque minute.

## Installation (une seule fois, environ 15 minutes)

### 1. Google Cloud : obtenir l'« ID client »

L'extension a besoin de son propre identifiant Google pour lire Gmail. C'est gratuit et il n'y a rien à payer ni à faire valider.

#### 1.1 Projet et API Gmail

1. Ouvrir <https://console.cloud.google.com/projectcreate>, nommer le projet `Apercu Gmail`, puis **Créer**.
2. Activer l'API Gmail : <https://console.cloud.google.com/apis/library/gmail.googleapis.com>, puis **Activer**. Vérifier que le projet `Apercu Gmail` est bien sélectionné en haut de la page.

#### 1.2 Assistant « Créer des identifiants »

Après l'activation, Google propose **Créer des identifiants**. Sinon : menu ☰, **API et services**, **Identifiants**, **+ Créer des identifiants**, **Aidez-moi à choisir**.

**Écran « Type d'identifiants »**

- API : **Gmail API**.
- Données consultées : **Données utilisateur** (*User data*). L'extension lit *vos* courriels, en votre nom, après votre connexion. « Données d'application » sert aux serveurs (compte de service) et ne fonctionne pas avec un compte Gmail personnel.
- **Suivant**.

**Écran « Écran de consentement OAuth »**

- Nom de l'application : `Aperçu Gmail`.
- Adresse e-mail d'assistance : votre adresse.
- Logo : rien.
- Coordonnées du développeur : votre adresse.
- **Enregistrer et continuer**.

> Si Google affiche plutôt « Google Auth Platform n'est pas encore configuré », cliquer **Commencer**. Remplir le nom et l'adresse, choisir l'audience **Externe**, remettre votre adresse, accepter les conditions, puis **Créer**. Revenir ensuite à **Identifiants**, **+ Créer des identifiants**, **ID client OAuth**, et passer directement à l'écran « ID client OAuth » ci-dessous. Le champ d'application se déclare alors dans le menu **Accès aux données** (même manipulation que l'écran suivant).

**Écran « Champs d'application »** (*Scopes*)

- **Ajouter ou supprimer des champs d'application**.
- Tout en bas du panneau, dans **Ajouter manuellement des champs d'application**, coller :
  ```
  https://www.googleapis.com/auth/gmail.modify
  ```
- **Ajouter au tableau**, puis **Mettre à jour**. La ligne apparaît dans « Vos champs d'application restreints » : c'est normal.
- **Enregistrer et continuer**.

**Écran « ID client OAuth »**

- Type d'application : **Application Web**, et non « Extension Chrome ». Le type « Extension Chrome » ne gère qu'un seul compte, celui du profil Chrome.
- Nom : `Aperçu Gmail`.
- Origines JavaScript autorisées : laisser vide.
- **URI de redirection autorisés**, **+ Ajouter un URI**, coller exactement (avec `https://` et la barre `/` finale) :
  ```
  https://icpofmgbmnhgejjklblpnnloenedaffp.chromiumapp.org/
  ```
- **Créer**.

**Écran « Vos identifiants »**

- Copier l'**ID client**, qui se termine par `.apps.googleusercontent.com`, et le garder sous la main.
- Le code secret et le fichier JSON ne servent pas : ne rien télécharger. **OK**.

#### 1.3 Ajouter vos adresses comme « utilisateurs test » (obligatoire)

Sans cette étape, Google refuse la connexion avec « Erreur 403 : access_denied ».

1. Menu ☰, **API et services**, **Écran de consentement OAuth**. Selon la version de la console, c'est **Google Auth Platform**, menu **Audience**.
2. Le statut de publication doit être **En test**. Ne pas cliquer « Publier l'application ».
3. Section **Utilisateurs test**, **+ Add users** : ajouter **chaque adresse Gmail** à afficher dans l'extension, puis **Enregistrer**.

#### Vérification

- [ ] API Gmail activée sur le projet `Apercu Gmail`.
- [ ] Champ d'application `gmail.modify` déclaré.
- [ ] ID client de type **Application Web**, avec l'URI de redirection ci-dessus.
- [ ] Toutes vos adresses Gmail dans **Utilisateurs test**, statut **En test**.

### 2. Charger l'extension dans Chrome

1. Sur <https://github.com/asawaaah/emailplugin>, choisir la branche `claude/chrome-gmail-plugin-9l08oh` dans le sélecteur de branche (en haut à gauche), puis **Code**, **Download ZIP**. Décompresser le fichier.
2. Ouvrir `chrome://extensions` (à taper dans la barre d'adresse) et activer le **Mode développeur** (en haut à droite).
3. **Charger l'extension non empaquetée** et choisir le dossier **`extension`**, à l'intérieur du dossier décompressé (celui qui contient `manifest.json`).
4. Vérifier que l'identifiant affiché sous « Aperçu Gmail » est bien `icpofmgbmnhgejjklblpnnloenedaffp`.
5. Épingler l'icône : pièce de casse-tête dans la barre de Chrome, puis épingle à côté d'« Aperçu Gmail ».

Garder le dossier décompressé au même endroit : Chrome charge l'extension depuis ce dossier.

### 3. Connecter vos comptes

1. La page **Réglages** s'ouvre à l'installation (sinon : clic droit sur l'icône, puis **Options**).
2. Coller l'ID client, puis **Enregistrer**.
3. **Ajouter un compte Gmail**, puis choisir le compte dans la fenêtre Google.
4. « Google n'a pas validé cette application » : c'est votre propre application. Cliquer **Continuer**.
5. Écran des autorisations : si une **case à cocher** apparaît à côté de l'accès à Gmail, **la cocher**, puis **Continuer**.
6. Le compte apparaît dans la liste. Recommencer pour chaque compte.

### En cas de problème

| Message | Cause | Solution |
|---|---|---|
| Erreur 400 : `redirect_uri_mismatch` | URI de redirection différente | Recopier l'URI exacte (avec `https://` et le `/` final) dans l'ID client ; vérifier l'identifiant de l'extension dans `chrome://extensions`. Les changements peuvent prendre quelques minutes chez Google. |
| Erreur 403 : `access_denied` | Adresse absente des utilisateurs test | Étape 1.3. |
| Erreur 401 : `invalid_client` | ID client mal collé | Recoller l'ID client complet dans les Réglages. |
| « La connexion a échoué : Gmail API 403 » | Case Gmail non cochée, ou API Gmail non activée | Réactiver l'API (étape 1.1), retirer le compte, puis le rajouter en cochant la case. |
| « Configuration requise » dans la fenêtre | ID client pas encore enregistré | Réglages, coller l'ID client, **Enregistrer**. |

## Bon à savoir

- **Reconnexion** : l'accès se renouvelle seul tant que le compte reste connecté à Google dans Chrome. Si Google le demande (en mode test, cela peut arriver environ chaque semaine), le badge devient orange avec un `!` et la fenêtre affiche **Se reconnecter**.
- **Supprimer** met la conversation à la corbeille de Gmail (récupérable 30 jours), jamais de suppression définitive.
- **Mise à jour** : télécharger la nouvelle version, **remplacer le contenu** du dossier `extension` déjà chargé par celui du nouveau, puis cliquer sur la flèche de rechargement de l'extension dans `chrome://extensions`. Les comptes et réglages sont conservés. Ne pas cliquer « Supprimer » sur l'extension : cela efface comptes et réglages.
- **Notifications** : la première vérification après l'ajout d'un compte ne notifie rien (les courriels déjà présents ne sont pas annoncés). **Tester la notification** dans les Réglages montre le résultat tout de suite. Type, durée d'affichage et position (en haut ou en bas à droite) se règlent au même endroit.
  - La bulle est dessinée dans la page, isolée du site (le site ne peut ni la lire ni la modifier). C'est pour cela que l'extension demande l'accès à tous les sites ; elle ne s'en sert que pour afficher la bulle.
  - Sur les pages internes du navigateur (nouvel onglet, `brave://…`, réglages, boutique d'extensions), aucune extension ne peut dessiner : la notification du système prend le relais.
  - Si le navigateur n'est pas au premier plan, la bulle attend votre retour avant de lancer son compte à rebours. Pour être alerté pendant que vous êtes dans une autre application, choisir « Bulle + notification du système ».
- **Retirer un compte** depuis les Réglages révoque aussi l'accès chez Google.

## Notifications instantanées (facultatif)

Par défaut, l'extension vérifie Gmail chaque minute. Avec ce réglage, **Gmail la prévient dès qu'un courriel arrive** (quelques secondes), comme Checker Plus.

```text
Gmail ──alerte──▶ Google Pub/Sub ──▶ relais Cloudflare ──coup de sonnette──▶ Brave ──▶ l'extension vérifie Gmail
```

- Le relais ne reçoit que **l'adresse du compte** et un numéro de version de la boîte, **jamais le contenu des courriels**. Le coup de sonnette envoyé à Brave est vide.
- Une fausse alerte ne pourrait que déclencher une vérification de votre boîte.
- La vérification chaque minute continue en parallèle : si le relais tombe, rien n'est perdu.

**Coûts** : rien à payer pour un usage personnel. Cloudflare Workers est gratuit jusqu'à 100 000 requêtes par jour et Pub/Sub jusqu'à 10 Go par mois (une alerte pèse environ 1 Ko). Google peut toutefois exiger d'**associer un compte de facturation** (carte de crédit) au projet pour activer Pub/Sub : créez alors une **alerte de budget à 1 $** (étape C.1).

Prévoir environ 30 minutes. Gardez la page **Réglages** de l'extension ouverte dans un onglet : vous y ferez des allers-retours.

### A. Extension : générer les clés

Réglages › **Notifications instantanées** › **1. Clés du relais** › **Générer les clés**. Trois valeurs apparaissent : `RELAY_SECRET`, `VAPID_PUBLIC_KEY` et `VAPID_PRIVATE_JWK`, chacune avec un bouton **Copier**.

### B. Cloudflare : déployer le relais

1. Tableau de bord Cloudflare › **Workers & Pages** › **Créer** (*Create*) › **Créer un Worker** (*Hello World*). Nom : `apercu-gmail-relay`, puis **Déployer**.
2. **Modifier le code** (*Edit code*) : remplacer tout le contenu par celui du fichier [`relay/worker.js`](relay/worker.js) de ce dépôt, puis **Déployer**.
3. Espace de stockage : **Storage & Databases › KV › Créer** (*Create*), nom `apercu-gmail-relay`.
4. Retour au Worker › **Settings › Bindings › Add** › **KV namespace** : nom de variable `SUBSCRIPTIONS`, espace `apercu-gmail-relay`. Enregistrer.
5. Worker › **Settings › Variables and Secrets › Add**, une ligne par valeur :
   | Nom | Type | Valeur |
   |---|---|---|
   | `RELAY_SECRET` | Secret | copiée depuis l'extension |
   | `VAPID_PUBLIC_KEY` | Secret | copiée depuis l'extension |
   | `VAPID_PRIVATE_JWK` | Secret | copiée depuis l'extension |
   | `VAPID_SUBJECT` | Text | `mailto:` suivi de votre adresse, par ex. `mailto:moi@gmail.com` |

   Puis **Deploy**.
6. Copier l'adresse du Worker (`https://apercu-gmail-relay.<votre-sous-domaine>.workers.dev`) et l'ouvrir dans un onglet : la page doit afficher `"service":"apercu-gmail-relay"` et `"configured":true`.

> En ligne de commande : `relay/wrangler.toml` permet aussi `npx wrangler deploy` (instructions dans le fichier).

### C. Google Cloud : le canal d'alertes Gmail

Toujours dans le projet **Apercu Gmail** (celui de l'ID client).

1. Activer Pub/Sub : <https://console.cloud.google.com/apis/library/pubsub.googleapis.com> › **Activer**. Si Google demande un compte de facturation, l'associer, puis créer une alerte : **Facturation › Budgets et alertes › Créer un budget**, montant **1 $**.
2. Créer le sujet : <https://console.cloud.google.com/cloudpubsub/topic/list> › **Créer un sujet**. ID du sujet : `gmail-push` ; **décocher** « Ajouter un abonnement par défaut » ; **Créer**.
3. Copier le **nom complet** du sujet, de la forme `projects/<id-du-projet>/topics/gmail-push`.
4. Autoriser Gmail à publier dans ce sujet. Sans cette autorisation, Gmail ne peut pas envoyer ses alertes.
   1. Ouvrir la liste des sujets : <https://console.cloud.google.com/cloudpubsub/topic/list> (projet **Apercu Gmail** sélectionné en haut).
   2. **Cocher la case** à gauche du sujet `gmail-push` (sans cliquer sur son nom).
   3. Un panneau s'ouvre à droite, onglet **Autorisations**. S'il n'apparaît pas, cliquer **Afficher le panneau d'informations** en haut à droite.
   4. **Ajouter un compte principal**.
   5. Champ **Nouveaux comptes principaux** : coller `gmail-api-push@system.gserviceaccount.com`.
   6. Champ **Sélectionner un rôle** : taper `Pub/Sub` dans le filtre, puis choisir **Diffuseur Pub/Sub** (*Pub/Sub Publisher* en anglais). Pas « Éditeur Pub/Sub », ni « Éditeur ».
   7. **Enregistrer**. Le panneau affiche alors le rôle **Diffuseur Pub/Sub** avec ce compte.

   > Autre chemin, si le panneau reste introuvable : menu ☰ › **IAM et administration** › **IAM** › **Accorder l'accès**, même compte et même rôle. L'autorisation vaut alors pour tous les sujets du projet, ce qui suffit pour un usage personnel.

### D. Extension : relais et sujet

Réglages › **2. Relais et Pub/Sub** : coller l'adresse du Worker (B.6) et le nom du sujet (C.3), puis **Enregistrer**. Une **adresse de livraison** apparaît, avec un bouton **Copier**.

### E. Google Cloud : relier le sujet au relais

<https://console.cloud.google.com/cloudpubsub/subscription/list> › **Créer un abonnement** :
- ID de l'abonnement : `gmail-push-relay`
- Sujet : `gmail-push`
- Type de distribution : **Push**
- Point de terminaison : l'**adresse de livraison** copiée à l'étape D
- Laisser le reste par défaut, puis **Créer**.

### F. Brave : autoriser la messagerie push

`brave://settings/privacy` › activer **« Utiliser les services Google pour la messagerie push »**, puis **redémarrer Brave**. Sans ce réglage, Brave refuse les coups de sonnette (Chrome n'a rien à régler).

### G. Activer et tester

Réglages › **3. Activation** › **Activer les notifications instantanées**. L'état passe au vert, puis **Tester le relais** doit afficher « Le relais fonctionne ». Envoyez-vous un courriel : la bulle doit apparaître en quelques secondes.

L'abonnement de Gmail aux alertes dure 7 jours : l'extension le renouvelle seule toutes les 12 heures, et à chaque ajout ou retrait de compte.

### En cas de problème (notifications instantanées)

| Message dans les Réglages | Solution |
|---|---|
| Relais injoignable | Vérifier l'adresse du Worker (B.6) et qu'il est déployé. |
| Le relais refuse les clés | Vérifier les 3 secrets et la liaison KV `SUBSCRIPTIONS` (B.4, B.5), puis redéployer. Si les clés ont été régénérées, les recopier dans Cloudflare. |
| Le navigateur refuse les alertes push | Étape F, puis redémarrer Brave. |
| Gmail refuse de prévenir le sujet Pub/Sub | Vérifier le nom complet du sujet (C.3) et l'autorisation de `gmail-api-push@system.gserviceaccount.com` avec le rôle **Diffuseur Pub/Sub** (C.4). |
| Test : aucune alerte reçue | Étape F ; vérifier aussi `VAPID_PUBLIC_KEY` dans Cloudflare. |
| Actif, mais pas de bulle à l'arrivée d'un courriel | Vérifier l'abonnement Pub/Sub (étape E) : type Push et adresse de livraison exacte. Google Cloud › Pub/Sub › Abonnements affiche les livraisons en erreur. |

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
src/lib/push.ts      notifications instantanées (Web Push, abonnement Gmail users.watch)
relay/worker.js      relais Cloudflare (Pub/Sub → Web Push sans contenu)
tests/               tests Vitest et test de bout en bout
```

La clé publique du `manifest.json` fixe l'identifiant de l'extension (et donc l'URI de redirection déclarée chez Google). Ne pas la modifier.
