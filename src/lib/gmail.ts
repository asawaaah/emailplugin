// Client minimal de l'API Gmail (REST), partagé par le service worker et le popup.

import { extractBody, header, parsePerson, type GmailPart } from './mime';
import type { MessageDetail, MessageMeta, ThreadDetail, ThreadSummary } from './types';

const API = 'https://gmail.googleapis.com/gmail/v1/users/me';

/** Fournit un jeton d'accès valide ; `forceRefresh` après un refus 401. */
export type TokenProvider = (forceRefresh: boolean) => Promise<string>;

export class AuthRequiredError extends Error {
  constructor(message = 'auth_required') {
    super(message);
    this.name = 'AuthRequiredError';
  }
}

export class GmailApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'GmailApiError';
  }
}

interface GmailMessage {
  id: string;
  threadId: string;
  labelIds?: string[];
  snippet?: string;
  internalDate?: string;
  payload?: GmailPart;
}

interface GmailThread {
  id: string;
  snippet?: string;
  messages?: GmailMessage[];
}

/** Exécute `fn` sur chaque élément, `limit` à la fois (quota de l'API). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index] as T);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

export function gmailWebUrl(email: string, threadId?: string): string {
  const base = `https://mail.google.com/mail/?authuser=${encodeURIComponent(email)}`;
  return threadId ? `${base}#inbox/${threadId}` : base;
}

export function toSummary(thread: GmailThread): ThreadSummary {
  const messages = thread.messages ?? [];
  const first = messages[0];
  const last = messages[messages.length - 1];
  return {
    id: thread.id,
    from: parsePerson(header(last?.payload?.headers, 'From')),
    subject: header(first?.payload?.headers, 'Subject'),
    snippet: decodeEntities(last?.snippet ?? thread.snippet ?? ''),
    date: Number(last?.internalDate ?? 0),
    unread: messages.some((m) => m.labelIds?.includes('UNREAD')),
    messageCount: messages.length,
  };
}

function toMessageDetail(message: GmailMessage): MessageDetail {
  const headers = message.payload?.headers;
  const body = extractBody(message.payload);
  return {
    id: message.id,
    from: parsePerson(header(headers, 'From')),
    to: header(headers, 'To'),
    date: Number(message.internalDate ?? 0),
    snippet: decodeEntities(message.snippet ?? ''),
    unread: Boolean(message.labelIds?.includes('UNREAD')),
    html: body.html,
    text: body.text,
    attachments: body.attachments,
  };
}

/** Les extraits de Gmail contiennent des entités HTML (&#39;, &amp;…). */
export function decodeEntities(value: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code: string) => {
    if (code[0] === '#') {
      const n = code[1]?.toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return named[code.toLowerCase()] ?? match;
  });
}

export class GmailClient {
  constructor(private readonly getToken: TokenProvider) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const send = async (forceRefresh: boolean): Promise<Response> => {
      const token = await this.getToken(forceRefresh);
      return fetch(`${API}${path}`, {
        ...init,
        headers: { ...(init.headers ?? {}), Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
    };
    let response = await send(false);
    if (response.status === 401) response = await send(true);
    if (response.status === 401) throw new AuthRequiredError();
    if (!response.ok) {
      // Message d'erreur de Google (jamais de contenu de courriel), utile pour le relais.
      const body = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
      throw new GmailApiError(response.status, body?.error?.message ? `Gmail API ${response.status} : ${body.error.message}` : `Gmail API ${response.status}`);
    }
    if (response.status === 204) return undefined as T;
    return (await response.json()) as T;
  }

  async getProfileEmail(): Promise<string> {
    const profile = await this.request<{ emailAddress: string }>('/profile');
    return profile.emailAddress;
  }

  /** Nombre de conversations non lues dans la boîte de réception. */
  async getInboxUnread(): Promise<number> {
    const label = await this.request<{ threadsUnread?: number }>('/labels/INBOX');
    return label.threadsUnread ?? 0;
  }

  /** Conversations de la boîte de réception ; seulement les non lues avec `unreadOnly`. */
  async listInboxThreads(max: number, unreadOnly = false): Promise<ThreadSummary[]> {
    const labels = unreadOnly ? 'labelIds=INBOX&labelIds=UNREAD' : 'labelIds=INBOX';
    const list = await this.request<{ threads?: Array<{ id: string }> }>(`/threads?${labels}&maxResults=${max}`);
    const ids = (list.threads ?? []).map((t) => t.id);
    const query = 'format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date';
    const threads = await mapLimit(ids, 5, (id) => this.request<GmailThread>(`/threads/${id}?${query}`));
    return threads.map(toSummary);
  }

  /** Identifiants des derniers messages non lus de la boîte de réception. */
  async listUnreadMessageIds(max: number): Promise<string[]> {
    const list = await this.request<{ messages?: Array<{ id: string }> }>(
      `/messages?labelIds=INBOX&labelIds=UNREAD&maxResults=${max}`,
    );
    return (list.messages ?? []).map((m) => m.id);
  }

  async getMessageMeta(id: string): Promise<MessageMeta> {
    const query = 'format=metadata&metadataHeaders=From&metadataHeaders=Subject';
    const message = await this.request<GmailMessage>(`/messages/${id}?${query}`);
    const headers = message.payload?.headers;
    return {
      id: message.id,
      threadId: message.threadId,
      from: parsePerson(header(headers, 'From')),
      subject: header(headers, 'Subject'),
      snippet: decodeEntities(message.snippet ?? ''),
      date: Number(message.internalDate ?? 0),
    };
  }

  /**
   * Demande à Gmail d'alerter le sujet Pub/Sub à chaque changement de la boîte
   * de réception. Valable 7 jours : à renouveler.
   */
  async watch(topicName: string): Promise<{ historyId: string; expiration: number }> {
    const result = await this.request<{ historyId: string; expiration: string }>('/watch', {
      method: 'POST',
      body: JSON.stringify({ topicName, labelIds: ['INBOX'], labelFilterBehavior: 'INCLUDE' }),
    });
    return { historyId: result.historyId, expiration: Number(result.expiration) };
  }

  async stopWatch(): Promise<void> {
    await this.request('/stop', { method: 'POST' });
  }

  async getThread(id: string): Promise<ThreadDetail> {
    const thread = await this.request<GmailThread>(`/threads/${id}?format=full`);
    const messages = (thread.messages ?? []).map(toMessageDetail);
    const firstHeaders = thread.messages?.[0]?.payload?.headers;
    return { id: thread.id, subject: header(firstHeaders, 'Subject'), messages };
  }

  async modifyThread(id: string, addLabelIds: string[], removeLabelIds: string[]): Promise<void> {
    await this.request(`/threads/${id}/modify`, {
      method: 'POST',
      body: JSON.stringify({ addLabelIds, removeLabelIds }),
    });
  }

  markRead(id: string): Promise<void> {
    return this.modifyThread(id, [], ['UNREAD']);
  }

  markUnread(id: string): Promise<void> {
    return this.modifyThread(id, ['UNREAD'], []);
  }

  archive(id: string): Promise<void> {
    return this.modifyThread(id, [], ['INBOX']);
  }

  spam(id: string): Promise<void> {
    return this.modifyThread(id, ['SPAM'], ['INBOX']);
  }

  async trash(id: string): Promise<void> {
    await this.request(`/threads/${id}/trash`, { method: 'POST' });
  }
}
