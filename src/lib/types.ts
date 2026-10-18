// Types partagés par le service worker, le popup et la page d'options.

export type Language = 'fr' | 'en';

export interface Settings {
  /** Identifiant client OAuth (type « Application Web ») du projet Google Cloud. */
  clientId: string;
  language: Language;
  /** Fréquence de vérification des non lus, en minutes. */
  pollMinutes: number;
  /** Nombre de conversations affichées par compte dans le popup. */
  maxThreads: number;
  /** Marquer une conversation comme lue quand on l'ouvre dans le popup. */
  markReadOnOpen: boolean;
  /** Afficher les images distantes sans demander (elles peuvent servir au pistage). */
  alwaysShowImages: boolean;
  /** N'afficher que les conversations non lues dans le popup. */
  unreadOnly: boolean;
  /** Notification à chaque nouveau courriel. */
  notifications: boolean;
  /** Bulle dans l'onglet ouvert, petite fenêtre, notification du système, ou bulle + système. */
  notificationStyle: NotificationStyle;
  /** Durée d'affichage de la fenêtre, en secondes (0 : jusqu'à fermeture). */
  notificationSeconds: number;
  notificationPosition: NotificationPosition;
}

/** 'both' : bulle dans l'onglet et notification du système. */
export type NotificationStyle = 'tab' | 'window' | 'system' | 'both';
export type NotificationPosition = 'bottom-right' | 'top-right';

/** Courriel affiché dans la fenêtre de notification. */
export interface Toast {
  /** Clé unique : compte et message. */
  key: string;
  email: string;
  /** Conversation à ouvrir ; null pour la notification de test. */
  threadId: string | null;
  from: Person;
  subject: string;
  snippet: string;
  date: number;
}

export interface Account {
  email: string;
  addedAt: number;
  /** Couleur choisie dans les Réglages (#rrggbb) ; sinon celle de son rang. */
  color?: string;
}

export interface TokenEntry {
  accessToken: string;
  /** Horodatage (ms) d'expiration du jeton. */
  expiresAt: number;
}

export type AccountStatus = 'ok' | 'reauth' | 'error';

export interface AccountState {
  email: string;
  unread: number | null;
  status: AccountStatus;
  checkedAt: number;
}

export interface Person {
  name: string;
  email: string;
}

export interface ThreadSummary {
  id: string;
  from: Person;
  subject: string;
  snippet: string;
  /** Date du dernier message (ms). */
  date: number;
  unread: boolean;
  messageCount: number;
}

export interface Attachment {
  filename: string;
  mimeType: string;
  size: number;
}

export interface MessageDetail {
  id: string;
  from: Person;
  to: string;
  date: number;
  snippet: string;
  unread: boolean;
  html: string | null;
  text: string | null;
  attachments: Attachment[];
}

/** En-tête d'un message, pour les notifications. */
export interface MessageMeta {
  id: string;
  threadId: string;
  from: Person;
  subject: string;
  snippet: string;
  date: number;
}

/** Messages non lus déjà vus par compte, pour ne notifier que les nouveaux. */
export interface SeenState {
  ids: string[];
  /** Dernière vérification réussie (ms). */
  checkedAt: number;
}

export interface ThreadDetail {
  id: string;
  subject: string;
  messages: MessageDetail[];
}
