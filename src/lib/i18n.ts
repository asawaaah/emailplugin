// Textes de l'interface, en français (langue par défaut) et en anglais.
// La langue se choisit dans la page d'options.

import type { Language } from './types';

const fr = {
  appName: 'Aperçu Gmail',
  refresh: 'Actualiser',
  addAccount: 'Ajouter un compte Gmail',
  settings: 'Réglages',
  back: 'Retour',
  openGmail: 'Ouvrir dans Gmail',
  archive: 'Archiver',
  delete: 'Supprimer',
  spam: 'Signaler comme spam',
  markRead: 'Marquer comme lu',
  markUnread: 'Marquer comme non lu',
  noSubject: '(sans objet)',
  inboxEmpty: 'Boîte de réception vide. Bravo !',
  loading: 'Chargement…',
  unreadCount: '{0} non lus',
  oneUnread: '1 non lu',
  noUnread: 'Aucun non lu',
  reauthNeeded: 'Reconnexion requise',
  reconnect: 'Se reconnecter',
  loadError: 'Impossible de charger les courriels.',
  retry: 'Réessayer',
  actionError: 'L’action a échoué. Réessayez.',
  welcomeTitle: 'Bienvenue !',
  welcomeText: 'Ajoutez un compte Gmail pour voir vos courriels ici.',
  setupTitle: 'Configuration requise',
  setupText: 'Collez l’identifiant client Google dans les réglages pour commencer.',
  openSettings: 'Ouvrir les réglages',
  addAccountHint: 'Une fenêtre Google va s’ouvrir. Rouvrez ensuite l’extension.',
  imagesHidden: 'Images masquées pour protéger votre vie privée.',
  showImages: 'Afficher les images',
  attachments: 'Pièces jointes',
  messagesInThread: '{0} messages',
  toLabel: 'À : {0}',
  archived: 'Conversation archivée',
  deleted: 'Conversation supprimée',
  spammed: 'Signalée comme spam',
  filterUnread: 'Non lus',
  filterAll: 'Tous',
  filterLabel: 'Conversations affichées',
  noUnreadMail: 'Aucun courriel non lu.',
  collapse: 'Replier {0}',
  expand: 'Déplier {0}',
  notifFrom: 'De : {0}',
  notifManyTitle: '{0} nouveaux courriels',
  notifManyMessage: 'Dernier : {0}',
  notifTestTitle: 'Notification de test',
  notifTestMessage: 'Les notifications d’Aperçu Gmail fonctionnent.',
  toastTitle: 'Nouveaux courriels — Aperçu Gmail',
  toastOpen: 'Ouvrir',
  toastMoreOne: '+1 autre courriel',
  toastMore: '+{0} autres courriels',
  dismiss: 'Fermer',
  dismissAll: 'Tout fermer',
  justNow: 'à l’instant',
  minutesAgo: 'il y a {0} min',
  olderMessages: '{0} messages précédents',
  // Page d'options
  optionsTitle: 'Réglages — Aperçu Gmail',
  googleSection: 'Connexion Google',
  googleHelp: 'Collez l’identifiant client OAuth de votre projet Google Cloud (type « Application Web »). Le guide pas à pas est dans le fichier README du projet.',
  clientIdLabel: 'Identifiant client',
  redirectLabel: 'URI de redirection autorisée à déclarer dans Google Cloud',
  extensionIdLabel: 'Identifiant de l’extension',
  copy: 'Copier',
  copied: 'Copié',
  save: 'Enregistrer',
  saved: 'Enregistré',
  accountsSection: 'Comptes',
  noAccounts: 'Aucun compte pour l’instant.',
  remove: 'Retirer',
  removeConfirm: 'Retirer le compte {0} de l’extension ?',
  addingAccount: 'Connexion en cours…',
  accountAdded: 'Compte {0} ajouté.',
  accountExists: 'Ce compte est déjà ajouté.',
  clientIdMissing: 'Enregistrez d’abord l’identifiant client.',
  authCanceled: 'Connexion annulée.',
  authFailed: 'La connexion a échoué : {0}',
  prefsSection: 'Préférences',
  languageLabel: 'Langue',
  pollLabel: 'Vérifier les nouveaux courriels toutes les',
  minutes: '{0} min',
  maxThreadsLabel: 'Conversations affichées par compte',
  markReadLabel: 'Marquer comme lu à l’ouverture',
  showImagesLabel: 'Toujours afficher les images (peut permettre le pistage)',
  orderHelp: 'L’ordre de cette liste est celui du popup. Utilisez les flèches pour le changer, et la pastille pour choisir la couleur du compte.',
  moveUp: 'Monter {0}',
  moveDown: 'Descendre {0}',
  unreadOnlyLabel: 'N’afficher que les courriels non lus (par défaut)',
  notificationsLabel: 'Notification à chaque nouveau courriel (compte, objet et aperçu)',
  notifTest: 'Tester la notification',
  notifHelp: 'Notification du système absente ? Autorisez les notifications de Google Chrome dans les réglages de votre système (Windows : Paramètres › Notifications ; Mac : Réglages Système › Notifications).',
  notifStyleLabel: 'Type de notification',
  notifStyleTab: 'Bulle dans l’onglet ouvert (recommandé)',
  notifStyleWindow: 'Petite fenêtre séparée',
  notifStyleSystem: 'Notification du système',
  notifStyleBoth: 'Bulle + notification du système',
  notifStyleHelp: 'Sur les pages internes du navigateur (nouvel onglet, réglages, boutique), la bulle est remplacée par la notification du système.',
  notifDurationLabel: 'Durée d’affichage',
  secondsShort: '{0} s',
  untilClosed: 'Jusqu’à fermeture',
  notifPositionLabel: 'Position',
  positionBottomRight: 'En bas à droite',
  positionTopRight: 'En haut à droite',
  colorOf: 'Couleur de {0}',
  customColor: 'Personnalisée',
  colorBlue: 'Bleu',
  colorGreen: 'Vert',
  colorOrange: 'Orange',
  colorPurple: 'Violet',
  colorTeal: 'Sarcelle',
  colorPink: 'Rose',
  colorRed: 'Rouge',
  colorYellow: 'Jaune',
  colorBrown: 'Brun',
  colorGrey: 'Gris',
  privacyNote: 'Vos courriels ne quittent jamais votre navigateur : l’extension parle directement à Google, sans serveur intermédiaire.',
} as const;

export type MessageKey = keyof typeof fr;

const en: Record<MessageKey, string> = {
  appName: 'Gmail Preview',
  refresh: 'Refresh',
  addAccount: 'Add a Gmail account',
  settings: 'Settings',
  back: 'Back',
  openGmail: 'Open in Gmail',
  archive: 'Archive',
  delete: 'Delete',
  spam: 'Report spam',
  markRead: 'Mark as read',
  markUnread: 'Mark as unread',
  noSubject: '(no subject)',
  inboxEmpty: 'Inbox empty. Well done!',
  loading: 'Loading…',
  unreadCount: '{0} unread',
  oneUnread: '1 unread',
  noUnread: 'No unread',
  reauthNeeded: 'Sign-in required',
  reconnect: 'Sign in again',
  loadError: 'Could not load messages.',
  retry: 'Retry',
  actionError: 'The action failed. Please try again.',
  welcomeTitle: 'Welcome!',
  welcomeText: 'Add a Gmail account to see your messages here.',
  setupTitle: 'Setup required',
  setupText: 'Paste your Google client ID in the settings to get started.',
  openSettings: 'Open settings',
  addAccountHint: 'A Google window will open. Then reopen the extension.',
  imagesHidden: 'Images hidden to protect your privacy.',
  showImages: 'Show images',
  attachments: 'Attachments',
  messagesInThread: '{0} messages',
  toLabel: 'To: {0}',
  archived: 'Conversation archived',
  deleted: 'Conversation deleted',
  spammed: 'Reported as spam',
  filterUnread: 'Unread',
  filterAll: 'All',
  filterLabel: 'Conversations shown',
  noUnreadMail: 'No unread messages.',
  collapse: 'Collapse {0}',
  expand: 'Expand {0}',
  notifFrom: 'From: {0}',
  notifManyTitle: '{0} new messages',
  notifManyMessage: 'Latest: {0}',
  notifTestTitle: 'Test notification',
  notifTestMessage: 'Gmail Preview notifications are working.',
  toastTitle: 'New messages — Gmail Preview',
  toastOpen: 'Open',
  toastMoreOne: '+1 more message',
  toastMore: '+{0} more messages',
  dismiss: 'Close',
  dismissAll: 'Close all',
  justNow: 'just now',
  minutesAgo: '{0} min ago',
  olderMessages: '{0} earlier messages',
  optionsTitle: 'Settings — Gmail Preview',
  googleSection: 'Google sign-in',
  googleHelp: 'Paste the OAuth client ID of your Google Cloud project (type “Web application”). The step-by-step guide is in the project README.',
  clientIdLabel: 'Client ID',
  redirectLabel: 'Authorized redirect URI to declare in Google Cloud',
  extensionIdLabel: 'Extension ID',
  copy: 'Copy',
  copied: 'Copied',
  save: 'Save',
  saved: 'Saved',
  accountsSection: 'Accounts',
  noAccounts: 'No accounts yet.',
  remove: 'Remove',
  removeConfirm: 'Remove the account {0} from the extension?',
  addingAccount: 'Signing in…',
  accountAdded: 'Account {0} added.',
  accountExists: 'This account is already added.',
  clientIdMissing: 'Save the client ID first.',
  authCanceled: 'Sign-in canceled.',
  authFailed: 'Sign-in failed: {0}',
  prefsSection: 'Preferences',
  languageLabel: 'Language',
  pollLabel: 'Check for new messages every',
  minutes: '{0} min',
  maxThreadsLabel: 'Conversations shown per account',
  markReadLabel: 'Mark as read when opened',
  showImagesLabel: 'Always show images (may allow tracking)',
  orderHelp: 'The order of this list is the order in the popup. Use the arrows to change it, and the dot to pick the account’s color.',
  moveUp: 'Move {0} up',
  moveDown: 'Move {0} down',
  unreadOnlyLabel: 'Show unread messages only (default)',
  notificationsLabel: 'Notify me of each new message (account, subject and preview)',
  notifTest: 'Test notification',
  notifHelp: 'No system notification? Allow Google Chrome notifications in your system settings (Windows: Settings › Notifications; Mac: System Settings › Notifications).',
  notifStyleLabel: 'Notification type',
  notifStyleTab: 'Bubble in the open tab (recommended)',
  notifStyleWindow: 'Small separate window',
  notifStyleSystem: 'System notification',
  notifStyleBoth: 'Bubble + system notification',
  notifStyleHelp: 'On the browser’s internal pages (new tab, settings, store), the bubble is replaced by the system notification.',
  notifDurationLabel: 'Display time',
  secondsShort: '{0} s',
  untilClosed: 'Until closed',
  notifPositionLabel: 'Position',
  positionBottomRight: 'Bottom right',
  positionTopRight: 'Top right',
  colorOf: 'Color of {0}',
  customColor: 'Custom',
  colorBlue: 'Blue',
  colorGreen: 'Green',
  colorOrange: 'Orange',
  colorPurple: 'Purple',
  colorTeal: 'Teal',
  colorPink: 'Pink',
  colorRed: 'Red',
  colorYellow: 'Yellow',
  colorBrown: 'Brown',
  colorGrey: 'Grey',
  privacyNote: 'Your messages never leave your browser: the extension talks directly to Google, with no server in between.',
};

const dictionaries: Record<Language, Record<MessageKey, string>> = { fr, en };

let current: Language = 'fr';

export function setLanguage(language: Language): void {
  current = language;
  if (typeof document !== 'undefined') document.documentElement.lang = language;
}

export function getLanguage(): Language {
  return current;
}

export function t(key: MessageKey, ...subs: Array<string | number>): string {
  const template = dictionaries[current][key] ?? fr[key];
  return subs.reduce<string>((text, sub, i) => text.replaceAll(`{${i}}`, String(sub)), template);
}

export function unreadLabel(count: number): string {
  if (count === 0) return t('noUnread');
  if (count === 1) return t('oneUnread');
  return t('unreadCount', count);
}

const locales: Record<Language, string> = { fr: 'fr-CA', en: 'en-CA' };

/** Aujourd'hui : l'heure ; cette année : jour et mois ; sinon la date complète. */
export function formatShortDate(timestamp: number, now = Date.now()): string {
  const date = new Date(timestamp);
  const today = new Date(now);
  const locale = locales[current];
  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
  }
  if (date.getFullYear() === today.getFullYear()) {
    return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(date);
  }
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}

export function formatLongDate(timestamp: number): string {
  return new Intl.DateTimeFormat(locales[current], { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(timestamp));
}
