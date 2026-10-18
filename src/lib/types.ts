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
}

export interface Account {
  email: string;
  addedAt: number;
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

export interface ThreadDetail {
  id: string;
  subject: string;
  messages: MessageDetail[];
}
