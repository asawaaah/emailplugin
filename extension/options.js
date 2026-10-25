// src/lib/colors.ts
var ACCOUNT_PALETTE = [
  { hex: "#1a73e8", label: "colorBlue" },
  { hex: "#188038", label: "colorGreen" },
  { hex: "#e8710a", label: "colorOrange" },
  { hex: "#9334e6", label: "colorPurple" },
  { hex: "#129eaf", label: "colorTeal" },
  { hex: "#d01884", label: "colorPink" },
  { hex: "#d93025", label: "colorRed" },
  { hex: "#f9ab00", label: "colorYellow" },
  { hex: "#8d6e63", label: "colorBrown" },
  { hex: "#5f6368", label: "colorGrey" }
];
var DEFAULT_COUNT = 6;
var HEX = /^#[0-9a-f]{6}$/i;
function isHexColor(value) {
  return typeof value === "string" && HEX.test(value);
}
function defaultAccountColor(rank) {
  const index = (rank % DEFAULT_COUNT + DEFAULT_COUNT) % DEFAULT_COUNT;
  return ACCOUNT_PALETTE[index]?.hex ?? "#1a73e8";
}
function accountColor(account, rank) {
  return isHexColor(account?.color) ? account.color.toLowerCase() : defaultAccountColor(rank);
}
function readableTextOn(hex) {
  if (!isHexColor(hex)) return "#ffffff";
  const channel = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return luminance > 0.36 ? "#1f1f1f" : "#ffffff";
}

// src/lib/dom.ts
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === void 0 || value === false) continue;
    if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === "class") {
      el.className = String(value);
    } else if (value === true) {
      el.setAttribute(key, "");
    } else {
      el.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child === null || child === void 0 || child === false) continue;
    el.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return el;
}
var PATHS = {
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  refresh: "M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
  archive: "M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z",
  delete: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  markUnread: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  markRead: "M21.99 8c0-.72-.37-1.35-.94-1.7L12 1 2.95 6.3C2.38 6.65 2 7.28 2 8v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2l-.01-10zM12 13L3.74 7.84 12 3l8.26 4.84L12 13z",
  openInNew: "M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z",
  spam: "M15.73 3H8.27L3 8.27v7.46L8.27 21h7.46L21 15.73V8.27L15.73 3zM12 17.3c-.72 0-1.3-.58-1.3-1.3 0-.72.58-1.3 1.3-1.3.72 0 1.3.58 1.3 1.3 0 .72-.58 1.3-1.3 1.3zm1-4.3h-2V7h2v6z",
  expandMore: "M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z",
  attach: "M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z",
  image: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z",
  warning: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  arrowUp: "M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z",
  arrowDown: "M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z",
  close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  mail: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"
};
var SVG_NS = "http://www.w3.org/2000/svg";
function icon(name, size = 20) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "icon");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", PATHS[name]);
  path.setAttribute("fill", "currentColor");
  svg.append(path);
  return svg;
}
function iconButton(name, label, onClick, extraClass = "") {
  const button = h("button", { type: "button", class: `icon-button ${extraClass}`.trim(), title: label, "aria-label": label }, icon(name));
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick(event);
  });
  return button;
}
function avatarHue(seed) {
  let hash = 0;
  for (const char of seed) hash = hash * 31 + char.charCodeAt(0) >>> 0;
  return hash % 360;
}
function avatar(name, seed, color) {
  const letter = (name.trim()[0] ?? "?").toUpperCase();
  const el = h("span", { class: "avatar", "aria-hidden": "true" }, letter);
  if (color && isHexColor(color)) {
    el.style.background = color;
    el.style.color = readableTextOn(color);
  } else {
    el.style.setProperty("--hue", String(avatarHue(seed)));
  }
  return el;
}

// src/lib/i18n.ts
var fr = {
  appName: "Aper\xE7u Gmail",
  refresh: "Actualiser",
  addAccount: "Ajouter un compte Gmail",
  settings: "R\xE9glages",
  back: "Retour",
  openGmail: "Ouvrir dans Gmail",
  archive: "Archiver",
  delete: "Supprimer",
  spam: "Signaler comme spam",
  markRead: "Marquer comme lu",
  markUnread: "Marquer comme non lu",
  noSubject: "(sans objet)",
  inboxEmpty: "Bo\xEEte de r\xE9ception vide. Bravo !",
  loading: "Chargement\u2026",
  unreadCount: "{0} non lus",
  oneUnread: "1 non lu",
  noUnread: "Aucun non lu",
  reauthNeeded: "Reconnexion requise",
  reconnect: "Se reconnecter",
  loadError: "Impossible de charger les courriels.",
  retry: "R\xE9essayer",
  actionError: "L\u2019action a \xE9chou\xE9. R\xE9essayez.",
  welcomeTitle: "Bienvenue !",
  welcomeText: "Ajoutez un compte Gmail pour voir vos courriels ici.",
  setupTitle: "Configuration requise",
  setupText: "Collez l\u2019identifiant client Google dans les r\xE9glages pour commencer.",
  openSettings: "Ouvrir les r\xE9glages",
  addAccountHint: "Une fen\xEAtre Google va s\u2019ouvrir. Rouvrez ensuite l\u2019extension.",
  imagesHidden: "Images masqu\xE9es pour prot\xE9ger votre vie priv\xE9e.",
  showImages: "Afficher les images",
  attachments: "Pi\xE8ces jointes",
  messagesInThread: "{0} messages",
  toLabel: "\xC0 : {0}",
  archived: "Conversation archiv\xE9e",
  deleted: "Conversation supprim\xE9e",
  spammed: "Signal\xE9e comme spam",
  filterUnread: "Non lus",
  filterAll: "Tous",
  filterLabel: "Conversations affich\xE9es",
  noUnreadMail: "Aucun courriel non lu.",
  collapse: "Replier {0}",
  expand: "D\xE9plier {0}",
  notifFrom: "De : {0}",
  notifManyTitle: "{0} nouveaux courriels",
  notifManyMessage: "Dernier : {0}",
  notifTestTitle: "Notification de test",
  notifTestMessage: "Les notifications d\u2019Aper\xE7u Gmail fonctionnent.",
  toastTitle: "Nouveaux courriels \u2014 Aper\xE7u Gmail",
  toastOpen: "Ouvrir",
  toastMoreOne: "+1 autre courriel",
  toastMore: "+{0} autres courriels",
  dismiss: "Fermer",
  dismissAll: "Tout fermer",
  justNow: "\xE0 l\u2019instant",
  minutesAgo: "il y a {0} min",
  olderMessages: "{0} messages pr\xE9c\xE9dents",
  // Page d'options
  optionsTitle: "R\xE9glages \u2014 Aper\xE7u Gmail",
  googleSection: "Connexion Google",
  googleHelp: "Collez l\u2019identifiant client OAuth de votre projet Google Cloud (type \xAB Application Web \xBB). Le guide pas \xE0 pas est dans le fichier README du projet.",
  clientIdLabel: "Identifiant client",
  redirectLabel: "URI de redirection autoris\xE9e \xE0 d\xE9clarer dans Google Cloud",
  extensionIdLabel: "Identifiant de l\u2019extension",
  copy: "Copier",
  copied: "Copi\xE9",
  save: "Enregistrer",
  saved: "Enregistr\xE9",
  accountsSection: "Comptes",
  noAccounts: "Aucun compte pour l\u2019instant.",
  remove: "Retirer",
  removeConfirm: "Retirer le compte {0} de l\u2019extension ?",
  addingAccount: "Connexion en cours\u2026",
  accountAdded: "Compte {0} ajout\xE9.",
  accountExists: "Ce compte est d\xE9j\xE0 ajout\xE9.",
  clientIdMissing: "Enregistrez d\u2019abord l\u2019identifiant client.",
  authCanceled: "Connexion annul\xE9e.",
  authFailed: "La connexion a \xE9chou\xE9 : {0}",
  prefsSection: "Pr\xE9f\xE9rences",
  languageLabel: "Langue",
  pollLabel: "V\xE9rifier les nouveaux courriels toutes les",
  minutes: "{0} min",
  maxThreadsLabel: "Conversations affich\xE9es par compte",
  markReadLabel: "Marquer comme lu \xE0 l\u2019ouverture",
  showImagesLabel: "Toujours afficher les images (peut permettre le pistage)",
  orderHelp: "L\u2019ordre de cette liste est celui du popup. Utilisez les fl\xE8ches pour le changer, et la pastille pour choisir la couleur du compte.",
  moveUp: "Monter {0}",
  moveDown: "Descendre {0}",
  unreadOnlyLabel: "N\u2019afficher que les courriels non lus (par d\xE9faut)",
  notificationsLabel: "Notification \xE0 chaque nouveau courriel (compte, objet et aper\xE7u)",
  notifTest: "Tester la notification",
  notifHelp: "Notification du syst\xE8me absente ? Autorisez les notifications de Google Chrome dans les r\xE9glages de votre syst\xE8me (Windows : Param\xE8tres \u203A Notifications ; Mac : R\xE9glages Syst\xE8me \u203A Notifications).",
  notifStyleLabel: "Type de notification",
  notifStyleTab: "Bulle dans l\u2019onglet ouvert (recommand\xE9)",
  notifStyleWindow: "Petite fen\xEAtre s\xE9par\xE9e",
  notifStyleSystem: "Notification du syst\xE8me",
  notifStyleBoth: "Bulle + notification du syst\xE8me",
  notifStyleHelp: "Sur les pages internes du navigateur (nouvel onglet, r\xE9glages, boutique), la bulle est remplac\xE9e par la notification du syst\xE8me.",
  notifDurationLabel: "Dur\xE9e d\u2019affichage",
  secondsShort: "{0} s",
  untilClosed: "Jusqu\u2019\xE0 fermeture",
  notifPositionLabel: "Position",
  positionBottomRight: "En bas \xE0 droite",
  positionTopRight: "En haut \xE0 droite",
  colorOf: "Couleur de {0}",
  customColor: "Personnalis\xE9e",
  colorBlue: "Bleu",
  colorGreen: "Vert",
  colorOrange: "Orange",
  colorPurple: "Violet",
  colorTeal: "Sarcelle",
  colorPink: "Rose",
  colorRed: "Rouge",
  colorYellow: "Jaune",
  colorBrown: "Brun",
  colorGrey: "Gris",
  pushSection: "Notifications instantan\xE9es",
  pushHelp: "Avec un petit relais gratuit sur Cloudflare, Gmail pr\xE9vient l\u2019extension d\xE8s qu\u2019un courriel arrive, au lieu d\u2019attendre la v\xE9rification r\xE9guli\xE8re. Le relais ne re\xE7oit qu\u2019un signal, jamais vos courriels. Guide pas \xE0 pas : README, section \xAB Notifications instantan\xE9es \xBB.",
  pushStep1: "1. Cl\xE9s du relais",
  pushGenerateKeys: "G\xE9n\xE9rer les cl\xE9s",
  pushRegenerateKeys: "R\xE9g\xE9n\xE9rer les cl\xE9s",
  pushRegenerateConfirm: "De nouvelles cl\xE9s remplaceront les actuelles : il faudra les recopier dans Cloudflare et mettre \xE0 jour l\u2019abonnement Pub/Sub. Continuer ?",
  pushKeysHint: "\xC0 coller dans Cloudflare (Worker \u203A Settings \u203A Variables and Secrets, type \xAB Secret \xBB). Ne les partagez pas.",
  pushStep2: "2. Relais et Pub/Sub",
  pushRelayUrl: "Adresse du relais Cloudflare",
  pushTopic: "Sujet Pub/Sub (Google Cloud)",
  pushInvalidUrl: "Adresse invalide : elle doit commencer par https://",
  pushInvalidTopic: "Sujet invalide : il doit avoir la forme projects/<projet>/topics/<sujet>.",
  pushEndpoint: "Adresse de livraison \xE0 d\xE9clarer dans l\u2019abonnement Pub/Sub",
  pushEndpointHint: "Google Cloud \u203A Pub/Sub \u203A Abonnements \u203A Cr\xE9er : type \xAB Push \xBB, point de terminaison = cette adresse.",
  pushStep3: "3. Activation",
  pushEnable: "Activer les notifications instantan\xE9es",
  pushDisable: "D\xE9sactiver",
  pushWorking: "Un instant\u2026",
  pushTest: "Tester le relais",
  pushTesting: "Test en cours (15 s au plus)\u2026",
  pushTestOk: "Le relais fonctionne : alerte re\xE7ue en {0} s.",
  pushTestFail: "Aucune alerte re\xE7ue. V\xE9rifiez la messagerie push de Brave et les variables du relais.",
  pushOff: "D\xE9sactiv\xE9es : l\u2019extension v\xE9rifie Gmail \xE0 intervalle r\xE9gulier.",
  pushActive: "Actives : Gmail pr\xE9vient l\u2019extension d\xE8s qu\u2019un courriel arrive.",
  pushLast: "Derni\xE8re alerte re\xE7ue : {0}",
  pushErrMissingConfig: "Configuration incompl\xE8te : g\xE9n\xE9rez les cl\xE9s, puis enregistrez l\u2019adresse du relais et le sujet Pub/Sub.",
  pushErrRelayUnreachable: "Relais injoignable : v\xE9rifiez l\u2019adresse du Worker Cloudflare et qu\u2019il est d\xE9ploy\xE9.",
  pushErrRelayAuth: "Le relais refuse les cl\xE9s : v\xE9rifiez RELAY_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_JWK et l\u2019espace KV SUBSCRIPTIONS dans Cloudflare.",
  pushErrPushUnavailable: "Le navigateur refuse les alertes push. Dans Brave : brave://settings/privacy \u203A \xAB Utiliser les services Google pour la messagerie push \xBB, puis red\xE9marrez Brave.",
  pushErrWatchFailed: "Gmail refuse de pr\xE9venir le sujet Pub/Sub : v\xE9rifiez le nom du sujet et que gmail-api-push@system.gserviceaccount.com a le r\xF4le \xAB Diffuseur Pub/Sub \xBB (Pub/Sub Publisher) sur ce sujet.",
  pushErrNoAccounts: "Ajoutez d\u2019abord un compte Gmail.",
  pushBraveHint: "Brave : activez \xAB Utiliser les services Google pour la messagerie push \xBB dans brave://settings/privacy.",
  privacyNote: "Vos courriels ne quittent jamais votre navigateur : l\u2019extension parle directement \xE0 Google. Le relais facultatif des notifications instantan\xE9es ne re\xE7oit qu\u2019un signal, jamais vos courriels."
};
var en = {
  appName: "Gmail Preview",
  refresh: "Refresh",
  addAccount: "Add a Gmail account",
  settings: "Settings",
  back: "Back",
  openGmail: "Open in Gmail",
  archive: "Archive",
  delete: "Delete",
  spam: "Report spam",
  markRead: "Mark as read",
  markUnread: "Mark as unread",
  noSubject: "(no subject)",
  inboxEmpty: "Inbox empty. Well done!",
  loading: "Loading\u2026",
  unreadCount: "{0} unread",
  oneUnread: "1 unread",
  noUnread: "No unread",
  reauthNeeded: "Sign-in required",
  reconnect: "Sign in again",
  loadError: "Could not load messages.",
  retry: "Retry",
  actionError: "The action failed. Please try again.",
  welcomeTitle: "Welcome!",
  welcomeText: "Add a Gmail account to see your messages here.",
  setupTitle: "Setup required",
  setupText: "Paste your Google client ID in the settings to get started.",
  openSettings: "Open settings",
  addAccountHint: "A Google window will open. Then reopen the extension.",
  imagesHidden: "Images hidden to protect your privacy.",
  showImages: "Show images",
  attachments: "Attachments",
  messagesInThread: "{0} messages",
  toLabel: "To: {0}",
  archived: "Conversation archived",
  deleted: "Conversation deleted",
  spammed: "Reported as spam",
  filterUnread: "Unread",
  filterAll: "All",
  filterLabel: "Conversations shown",
  noUnreadMail: "No unread messages.",
  collapse: "Collapse {0}",
  expand: "Expand {0}",
  notifFrom: "From: {0}",
  notifManyTitle: "{0} new messages",
  notifManyMessage: "Latest: {0}",
  notifTestTitle: "Test notification",
  notifTestMessage: "Gmail Preview notifications are working.",
  toastTitle: "New messages \u2014 Gmail Preview",
  toastOpen: "Open",
  toastMoreOne: "+1 more message",
  toastMore: "+{0} more messages",
  dismiss: "Close",
  dismissAll: "Close all",
  justNow: "just now",
  minutesAgo: "{0} min ago",
  olderMessages: "{0} earlier messages",
  optionsTitle: "Settings \u2014 Gmail Preview",
  googleSection: "Google sign-in",
  googleHelp: "Paste the OAuth client ID of your Google Cloud project (type \u201CWeb application\u201D). The step-by-step guide is in the project README.",
  clientIdLabel: "Client ID",
  redirectLabel: "Authorized redirect URI to declare in Google Cloud",
  extensionIdLabel: "Extension ID",
  copy: "Copy",
  copied: "Copied",
  save: "Save",
  saved: "Saved",
  accountsSection: "Accounts",
  noAccounts: "No accounts yet.",
  remove: "Remove",
  removeConfirm: "Remove the account {0} from the extension?",
  addingAccount: "Signing in\u2026",
  accountAdded: "Account {0} added.",
  accountExists: "This account is already added.",
  clientIdMissing: "Save the client ID first.",
  authCanceled: "Sign-in canceled.",
  authFailed: "Sign-in failed: {0}",
  prefsSection: "Preferences",
  languageLabel: "Language",
  pollLabel: "Check for new messages every",
  minutes: "{0} min",
  maxThreadsLabel: "Conversations shown per account",
  markReadLabel: "Mark as read when opened",
  showImagesLabel: "Always show images (may allow tracking)",
  orderHelp: "The order of this list is the order in the popup. Use the arrows to change it, and the dot to pick the account\u2019s color.",
  moveUp: "Move {0} up",
  moveDown: "Move {0} down",
  unreadOnlyLabel: "Show unread messages only (default)",
  notificationsLabel: "Notify me of each new message (account, subject and preview)",
  notifTest: "Test notification",
  notifHelp: "No system notification? Allow Google Chrome notifications in your system settings (Windows: Settings \u203A Notifications; Mac: System Settings \u203A Notifications).",
  notifStyleLabel: "Notification type",
  notifStyleTab: "Bubble in the open tab (recommended)",
  notifStyleWindow: "Small separate window",
  notifStyleSystem: "System notification",
  notifStyleBoth: "Bubble + system notification",
  notifStyleHelp: "On the browser\u2019s internal pages (new tab, settings, store), the bubble is replaced by the system notification.",
  notifDurationLabel: "Display time",
  secondsShort: "{0} s",
  untilClosed: "Until closed",
  notifPositionLabel: "Position",
  positionBottomRight: "Bottom right",
  positionTopRight: "Top right",
  colorOf: "Color of {0}",
  customColor: "Custom",
  colorBlue: "Blue",
  colorGreen: "Green",
  colorOrange: "Orange",
  colorPurple: "Purple",
  colorTeal: "Teal",
  colorPink: "Pink",
  colorRed: "Red",
  colorYellow: "Yellow",
  colorBrown: "Brown",
  colorGrey: "Grey",
  pushSection: "Instant notifications",
  pushHelp: "With a small free relay on Cloudflare, Gmail alerts the extension as soon as a message arrives, instead of waiting for the regular check. The relay only receives a signal, never your messages. Step-by-step guide: README, \u201CInstant notifications\u201D section.",
  pushStep1: "1. Relay keys",
  pushGenerateKeys: "Generate keys",
  pushRegenerateKeys: "Regenerate keys",
  pushRegenerateConfirm: "New keys will replace the current ones: you will need to copy them into Cloudflare again and update the Pub/Sub subscription. Continue?",
  pushKeysHint: "Paste into Cloudflare (Worker \u203A Settings \u203A Variables and Secrets, type \u201CSecret\u201D). Do not share them.",
  pushStep2: "2. Relay and Pub/Sub",
  pushRelayUrl: "Cloudflare relay address",
  pushTopic: "Pub/Sub topic (Google Cloud)",
  pushInvalidUrl: "Invalid address: it must start with https://",
  pushInvalidTopic: "Invalid topic: it must look like projects/<project>/topics/<topic>.",
  pushEndpoint: "Delivery address to declare in the Pub/Sub subscription",
  pushEndpointHint: "Google Cloud \u203A Pub/Sub \u203A Subscriptions \u203A Create: type \u201CPush\u201D, endpoint = this address.",
  pushStep3: "3. Activation",
  pushEnable: "Turn on instant notifications",
  pushDisable: "Turn off",
  pushWorking: "One moment\u2026",
  pushTest: "Test the relay",
  pushTesting: "Testing (15 s at most)\u2026",
  pushTestOk: "The relay works: alert received in {0} s.",
  pushTestFail: "No alert received. Check Brave\u2019s push messaging and the relay variables.",
  pushOff: "Off: the extension checks Gmail at regular intervals.",
  pushActive: "On: Gmail alerts the extension as soon as a message arrives.",
  pushLast: "Last alert received: {0}",
  pushErrMissingConfig: "Incomplete setup: generate the keys, then save the relay address and the Pub/Sub topic.",
  pushErrRelayUnreachable: "Relay unreachable: check the Cloudflare Worker address and that it is deployed.",
  pushErrRelayAuth: "The relay rejects the keys: check RELAY_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_JWK and the SUBSCRIPTIONS KV namespace in Cloudflare.",
  pushErrPushUnavailable: "The browser refuses push alerts. In Brave: brave://settings/privacy \u203A \u201CUse Google services for push messaging\u201D, then restart Brave.",
  pushErrWatchFailed: "Gmail refuses to alert the Pub/Sub topic: check the topic name and that gmail-api-push@system.gserviceaccount.com has the \u201CPub/Sub Publisher\u201D role on it.",
  pushErrNoAccounts: "Add a Gmail account first.",
  pushBraveHint: "Brave: turn on \u201CUse Google services for push messaging\u201D in brave://settings/privacy.",
  privacyNote: "Your messages never leave your browser: the extension talks directly to Google. The optional instant-notification relay only receives a signal, never your messages."
};
var dictionaries = { fr, en };
var current = "fr";
function setLanguage(language) {
  current = language;
  if (typeof document !== "undefined") document.documentElement.lang = language;
}
function t(key, ...subs) {
  const template = dictionaries[current][key] ?? fr[key];
  return subs.reduce((text, sub, i) => text.replaceAll(`{${i}}`, String(sub)), template);
}
var locales = { fr: "fr-CA", en: "en-CA" };
function formatLongDate(timestamp) {
  return new Intl.DateTimeFormat(locales[current], { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp));
}

// src/options/fields.ts
function card(titleKey, ...children) {
  return h("section", { class: "card" }, h("h2", {}, t(titleKey)), ...children.filter((c) => c !== null));
}
function status() {
  return h("p", { class: "status", role: "status", "aria-live": "polite" });
}
function copyField(id, label, value, hint) {
  const input = h("input", { id, type: "text", readonly: true, value, class: "mono" });
  const button = h("button", { type: "button", class: "outlined-button" }, t("copy"));
  button.addEventListener("click", () => {
    void navigator.clipboard.writeText(value).then(() => {
      button.textContent = t("copied");
      window.setTimeout(() => button.textContent = t("copy"), 1500);
    });
  });
  return h(
    "div",
    { class: "field" },
    h("label", { for: id }, label),
    h("div", { class: "row" }, input, button),
    hint ? h("p", { class: "help field-help" }, hint) : null
  );
}
function textField(id, label, value, placeholder) {
  const input = h("input", { id, type: "text", value, placeholder, class: "mono", spellcheck: "false", autocomplete: "off" });
  return { field: h("div", { class: "field" }, h("label", { for: id }, label), h("div", { class: "row" }, input)), input };
}

// src/lib/messages.ts
var RemoteError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "RemoteError";
  }
  code;
};
async function send(request) {
  const response = await chrome.runtime.sendMessage(request);
  if (!response) throw new RemoteError("failed", "no_response");
  if (!response.ok) throw new RemoteError(response.code, response.message);
  return response.data;
}

// src/lib/relay-keys.ts
function base64url(bytes) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of array) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
async function generateRelayKeys() {
  const pair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, ["sign", "verify"]);
  const raw = await crypto.subtle.exportKey("raw", pair.publicKey);
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  return {
    secret: base64url(crypto.getRandomValues(new Uint8Array(32))),
    vapidPublicKey: base64url(raw),
    vapidPrivateJwk: JSON.stringify({ kty: jwk.kty, crv: jwk.crv, d: jwk.d, x: jwk.x, y: jwk.y })
  };
}
function normalizeRelayUrl(value) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return null;
    return url.origin;
  } catch {
    return null;
  }
}
async function pubsubToken(secret) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return base64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode("pubsub")));
}
async function pubsubEndpoint(relayUrl, secret) {
  return `${relayUrl}/pubsub?token=${await pubsubToken(secret)}`;
}
function isPubsubTopic(value) {
  return /^projects\/[a-z][a-z0-9-]{4,28}[a-z0-9]\/topics\/[A-Za-z][\w.~+%-]{2,254}$/.test(value.trim());
}

// src/lib/storage.ts
var DEFAULT_SETTINGS = {
  clientId: "",
  language: "fr",
  pollMinutes: 1,
  maxThreads: 20,
  markReadOnOpen: true,
  alwaysShowImages: false,
  unreadOnly: true,
  notifications: true,
  notificationStyle: "tab",
  notificationSeconds: 8,
  notificationPosition: "top-right",
  instantPush: false,
  relayUrl: "",
  pubsubTopic: ""
};
var NOTIFICATION_SECONDS_CHOICES = [5, 8, 15, 30, 0];
var POLL_CHOICES = [1, 2, 5, 10, 15];
var MAX_THREADS_CHOICES = [10, 20, 30, 50];
async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...settings };
}
async function saveSettings(patch) {
  const next = { ...await getSettings(), ...patch };
  await chrome.storage.local.set({ settings: next });
  return next;
}
async function getAccounts() {
  const { accounts } = await chrome.storage.local.get("accounts");
  return accounts ?? [];
}
async function saveAccounts(accounts) {
  await chrome.storage.local.set({ accounts });
}
function moveAccount(list, index, direction) {
  const target = index + direction;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
async function setAccountColor(email, color) {
  const accounts = await getAccounts();
  await saveAccounts(accounts.map((a) => {
    if (a.email !== email) return a;
    const { color: _previous, ...rest } = a;
    return color ? { ...rest, color } : rest;
  }));
}
async function getRelayKeys() {
  const { relayKeys } = await chrome.storage.local.get("relayKeys");
  return relayKeys ?? null;
}
async function saveRelayKeys(keys) {
  await chrome.storage.local.set({ relayKeys: keys });
}
async function getPushStatus() {
  const { pushStatus } = await chrome.storage.local.get("pushStatus");
  return pushStatus ?? { state: "off" };
}

// src/options/instant-push.ts
var ERROR_KEYS = {
  missing_config: "pushErrMissingConfig",
  relay_unreachable: "pushErrRelayUnreachable",
  relay_auth: "pushErrRelayAuth",
  push_unavailable: "pushErrPushUnavailable",
  watch_failed: "pushErrWatchFailed",
  no_accounts: "pushErrNoAccounts"
};
function describe(state) {
  if (state.state === "active") return t("pushActive");
  if (state.state === "error" && state.code) return t(ERROR_KEYS[state.code]);
  return t("pushOff");
}
function statusBlock(state) {
  const lines = [h("p", { class: `push-state ${state.state}` }, describe(state))];
  if (state.state === "error" && state.detail) lines.push(h("p", { class: "help field-help mono" }, state.detail));
  if (state.lastPushAt) lines.push(h("p", { class: "help field-help" }, t("pushLast", formatLongDate(state.lastPushAt))));
  return h("div", { id: "push-status", role: "status", "aria-live": "polite" }, ...lines);
}
function step(titleKey, ...children) {
  return h("div", { class: "push-step" }, h("h3", {}, t(titleKey)), ...children.filter((c) => c !== null));
}
async function instantPushCard(settings, rerender) {
  const keys = await getRelayKeys();
  const pushStatus = await getPushStatus();
  const generate = h("button", { type: "button", class: keys ? "outlined-button" : "filled-button" }, t(keys ? "pushRegenerateKeys" : "pushGenerateKeys"));
  generate.addEventListener("click", () => {
    if (keys && !window.confirm(t("pushRegenerateConfirm"))) return;
    void generateRelayKeys().then(saveRelayKeys).then(rerender);
  });
  const keyFields = keys ? [
    copyField("relay-secret", "RELAY_SECRET", keys.secret),
    copyField("vapid-public", "VAPID_PUBLIC_KEY", keys.vapidPublicKey),
    copyField("vapid-private", "VAPID_PRIVATE_JWK", keys.vapidPrivateJwk, t("pushKeysHint"))
  ] : [];
  const relay = textField("relay-url", t("pushRelayUrl"), settings.relayUrl, "https://apercu-gmail-relay.<compte>.workers.dev");
  const topic = textField("pubsub-topic", t("pushTopic"), settings.pubsubTopic, "projects/mon-projet/topics/gmail-push");
  const saveFeedback = status();
  const save = h("button", { type: "button", class: "filled-button" }, t("save"));
  save.addEventListener("click", () => {
    const relayUrl2 = normalizeRelayUrl(relay.input.value);
    const pubsubTopic = topic.input.value.trim();
    if (!relayUrl2) {
      saveFeedback.textContent = t("pushInvalidUrl");
      return;
    }
    if (!isPubsubTopic(pubsubTopic)) {
      saveFeedback.textContent = t("pushInvalidTopic");
      return;
    }
    void saveSettings({ relayUrl: relayUrl2, pubsubTopic }).then(rerender);
  });
  const relayUrl = normalizeRelayUrl(settings.relayUrl);
  const endpoint = keys && relayUrl ? copyField("pubsub-endpoint", t("pushEndpoint"), await pubsubEndpoint(relayUrl, keys.secret), t("pushEndpointHint")) : null;
  const actionFeedback = status();
  const toggle = h("button", { type: "button", class: settings.instantPush ? "outlined-button" : "filled-button" }, t(settings.instantPush ? "pushDisable" : "pushEnable"));
  toggle.addEventListener("click", () => {
    toggle.disabled = true;
    actionFeedback.textContent = t("pushWorking");
    void send({ type: settings.instantPush ? "disablePush" : "enablePush" }).finally(rerender);
  });
  const test = h("button", { type: "button", class: "outlined-button" }, t("pushTest"));
  test.addEventListener("click", () => {
    test.disabled = true;
    actionFeedback.textContent = t("pushTesting");
    const started = Date.now();
    void send({ type: "testPush" }).then(({ received }) => {
      actionFeedback.textContent = received ? t("pushTestOk", ((Date.now() - started) / 1e3).toFixed(1)) : t("pushTestFail");
    }).catch(() => {
      actionFeedback.textContent = t("pushTestFail");
    }).finally(() => {
      test.disabled = false;
    });
  });
  return card(
    "pushSection",
    h("p", { class: "help" }, t("pushHelp")),
    step("pushStep1", h("div", { class: "row" }, generate), ...keyFields),
    step("pushStep2", relay.field, topic.field, h("div", { class: "row push-save" }, save), saveFeedback, endpoint),
    step(
      "pushStep3",
      statusBlock(pushStatus),
      h("div", { class: "row" }, toggle, settings.instantPush ? test : null),
      actionFeedback,
      h("p", { class: "help field-help" }, t("pushBraveHint"))
    )
  );
}
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.pushStatus) return;
  const current2 = document.getElementById("push-status");
  const next = changes.pushStatus.newValue;
  if (current2 && next) current2.replaceWith(statusBlock(next));
});

// src/options/options.ts
var app = document.getElementById("app");
function googleCard(settings) {
  const input = h("input", {
    id: "client-id",
    type: "text",
    value: settings.clientId,
    placeholder: "1234567890-abc.apps.googleusercontent.com",
    class: "mono",
    spellcheck: "false",
    autocomplete: "off"
  });
  const feedback = status();
  const save = h("button", { type: "button", class: "filled-button" }, t("save"));
  save.addEventListener("click", () => {
    void saveSettings({ clientId: input.value.trim() }).then(() => {
      feedback.textContent = t("saved");
      void render();
    });
  });
  return card(
    "googleSection",
    h("p", { class: "help" }, t("googleHelp")),
    h("div", { class: "field" }, h("label", { for: "client-id" }, t("clientIdLabel")), h("div", { class: "row" }, input, save)),
    feedback,
    copyField("redirect-uri", t("redirectLabel"), chrome.identity.getRedirectURL()),
    copyField("extension-id", t("extensionIdLabel"), chrome.runtime.id)
  );
}
function reorderButton(name, label, index, direction, total) {
  const button = iconButton(name, label, () => {
    void getAccounts().then((accounts) => saveAccounts(moveAccount(accounts, index, direction))).then(render).then(() => {
      const buttons = document.querySelectorAll(`.account-list li:nth-child(${index + direction + 1}) .icon-button`);
      buttons[direction === -1 ? 0 : 1]?.focus();
    });
  });
  const target = index + direction;
  if (target < 0 || target >= total) {
    button.disabled = true;
    button.classList.add("invisible");
  }
  return button;
}
var openPalette = null;
function colorButton(email, color) {
  const button = h("button", {
    type: "button",
    class: "color-button",
    title: t("colorOf", email),
    "aria-label": t("colorOf", email),
    "aria-expanded": String(openPalette === email)
  });
  button.style.setProperty("--swatch", color);
  button.addEventListener("click", () => {
    openPalette = openPalette === email ? null : email;
    void render().then(() => document.querySelector('.palette .swatch[aria-pressed="true"], .palette .swatch')?.focus());
  });
  return button;
}
function palette(email, current2) {
  const choose = (hex) => {
    openPalette = null;
    void setAccountColor(email, hex).then(render);
  };
  const swatches = ACCOUNT_PALETTE.map(({ hex, label }) => {
    const swatch = h("button", { type: "button", class: "swatch", title: t(label), "aria-label": t(label), "aria-pressed": String(hex === current2) });
    swatch.style.setProperty("--swatch", hex);
    swatch.addEventListener("click", () => choose(hex));
    return swatch;
  });
  const customId = `custom-${email}`;
  const custom = h("input", { id: customId, type: "color", value: current2, class: "custom-color" });
  custom.addEventListener("change", () => choose(custom.value));
  return h(
    "div",
    { class: "palette", role: "group", "aria-label": t("colorOf", email) },
    ...swatches,
    h("label", { class: "custom-label", for: customId }, custom, t("customColor"))
  );
}
async function accountsCard(settings) {
  const accounts = await getAccounts();
  const feedback = status();
  const list = accounts.length ? h(
    "ul",
    { class: "account-list" },
    ...accounts.map((account, index) => {
      const { email } = account;
      const color = accountColor(account, index);
      return h(
        "li",
        {},
        h(
          "div",
          { class: "account-row" },
          h("span", { class: "account-rank" }, String(index + 1)),
          avatar(email, email, color),
          h("span", { class: "account-email" }, email),
          colorButton(email, color),
          reorderButton("arrowUp", t("moveUp", email), index, -1, accounts.length),
          reorderButton("arrowDown", t("moveDown", email), index, 1, accounts.length),
          iconButton("close", t("remove"), () => {
            if (!window.confirm(t("removeConfirm", email))) return;
            void send({ type: "removeAccount", email }).then(render);
          })
        ),
        openPalette === email ? palette(email, color) : null
      );
    })
  ) : h("p", { class: "help" }, t("noAccounts"));
  const add = h("button", { type: "button", class: "filled-button" }, t("addAccount"));
  add.addEventListener("click", () => {
    if (!settings.clientId) {
      feedback.textContent = t("clientIdMissing");
      return;
    }
    add.disabled = true;
    feedback.textContent = t("addingAccount");
    send({ type: "addAccount" }).then(async ({ email, existed }) => {
      await render();
      const next = document.querySelector("#accounts-status");
      if (next) next.textContent = existed ? t("accountExists") : t("accountAdded", email);
    }).catch((error) => {
      add.disabled = false;
      if (error instanceof RemoteError && error.code === "canceled") feedback.textContent = t("authCanceled");
      else feedback.textContent = t("authFailed", error instanceof Error ? error.message : String(error));
    });
  });
  feedback.id = "accounts-status";
  const help = accounts.length > 1 ? h("p", { class: "help" }, t("orderHelp")) : null;
  return card("accountsSection", help, list, h("div", { class: "row" }, add), feedback);
}
function select(id, label, value, choices, onChange) {
  const el = h("select", { id }, ...choices.map((c) => h("option", { value: String(c.value), selected: c.value === value }, c.label)));
  el.addEventListener("change", () => {
    const choice = choices.find((c) => String(c.value) === el.value);
    if (choice) onChange(choice.value);
  });
  return h("div", { class: "field inline" }, h("label", { for: id }, label), el);
}
function checkbox(id, label, checked, onChange) {
  const input = h("input", { id, type: "checkbox", checked });
  input.addEventListener("change", () => onChange(input.checked));
  return h("div", { class: "field check" }, input, h("label", { for: id }, label));
}
function notificationTest() {
  const button = h("button", { type: "button", class: "outlined-button" }, t("notifTest"));
  button.addEventListener("click", () => void send({ type: "testNotification" }));
  return h("div", { class: "field notif-test" }, button, h("p", { class: "help" }, t("notifHelp")));
}
function prefsCard(settings) {
  return card(
    "prefsSection",
    select("language", t("languageLabel"), settings.language, [
      { value: "fr", label: "Fran\xE7ais" },
      { value: "en", label: "English" }
    ], (language) => void saveSettings({ language }).then(render)),
    select("poll", t("pollLabel"), settings.pollMinutes, POLL_CHOICES.map((m) => ({ value: m, label: t("minutes", m) })), (pollMinutes) => void saveSettings({ pollMinutes })),
    select("max-threads", t("maxThreadsLabel"), settings.maxThreads, MAX_THREADS_CHOICES.map((n) => ({ value: n, label: String(n) })), (maxThreads) => void saveSettings({ maxThreads })),
    checkbox("unread-only", t("unreadOnlyLabel"), settings.unreadOnly, (unreadOnly) => void saveSettings({ unreadOnly })),
    checkbox("mark-read", t("markReadLabel"), settings.markReadOnOpen, (markReadOnOpen) => void saveSettings({ markReadOnOpen })),
    checkbox("show-images", t("showImagesLabel"), settings.alwaysShowImages, (alwaysShowImages) => void saveSettings({ alwaysShowImages })),
    checkbox("notifications", t("notificationsLabel"), settings.notifications, (notifications) => void saveSettings({ notifications })),
    select("notif-style", t("notifStyleLabel"), settings.notificationStyle, [
      { value: "tab", label: t("notifStyleTab") },
      { value: "window", label: t("notifStyleWindow") },
      { value: "system", label: t("notifStyleSystem") },
      { value: "both", label: t("notifStyleBoth") }
    ], (notificationStyle) => void saveSettings({ notificationStyle })),
    h("p", { class: "help field-help" }, t("notifStyleHelp")),
    select("notif-seconds", t("notifDurationLabel"), settings.notificationSeconds, NOTIFICATION_SECONDS_CHOICES.map((n) => ({
      value: n,
      label: n === 0 ? t("untilClosed") : t("secondsShort", n)
    })), (notificationSeconds) => void saveSettings({ notificationSeconds })),
    select("notif-position", t("notifPositionLabel"), settings.notificationPosition, [
      { value: "top-right", label: t("positionTopRight") },
      { value: "bottom-right", label: t("positionBottomRight") }
    ], (notificationPosition) => void saveSettings({ notificationPosition })),
    notificationTest()
  );
}
async function render() {
  const settings = await getSettings();
  setLanguage(settings.language);
  document.title = t("optionsTitle");
  app.replaceChildren(
    h("header", { class: "page-header" }, h("h1", {}, t("optionsTitle"))),
    googleCard(settings),
    await accountsCard(settings),
    prefsCard(settings),
    await instantPushCard(settings, render),
    h("p", { class: "help privacy" }, t("privacyNote"))
  );
}
void render();
