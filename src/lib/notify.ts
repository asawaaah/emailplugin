// Détection des nouveaux courriels pour les notifications (fonctions pures,
// couvertes par tests/notify.test.ts).

import type { MessageMeta, SeenState } from './types';

/** Nombre d'identifiants gardés par compte. */
const SEEN_LIMIT = 200;
/** Tolérance sur la date de réception (horloges, délais de Gmail). */
const RECENT_MARGIN_MS = 10 * 60 * 1000;
/** Au-delà, une seule notification résume les nouveaux courriels d'un compte. */
export const MAX_INDIVIDUAL = 3;

export interface Detection {
  /** Messages jamais vus, à examiner. */
  candidates: string[];
  next: SeenState;
}

/**
 * Compare les non lus actuels à ceux déjà vus. Au premier passage pour un
 * compte, rien n'est notifié : on mémorise seulement l'existant.
 */
export function detectNew(previous: SeenState | undefined, currentIds: string[], now: number): Detection {
  const next: SeenState = {
    ids: [...new Set([...currentIds, ...(previous?.ids ?? [])])].slice(0, SEEN_LIMIT),
    checkedAt: now,
  };
  if (!previous) return { candidates: [], next };
  const seen = new Set(previous.ids);
  return { candidates: currentIds.filter((id) => !seen.has(id)), next };
}

/**
 * Garde les messages reçus depuis la vérification précédente : un vieux
 * courriel remis en « non lu » ne déclenche pas de notification.
 */
export function keepRecent(messages: MessageMeta[], previousCheck: number): MessageMeta[] {
  return messages.filter((m) => m.date >= previousCheck - RECENT_MARGIN_MS);
}

/** Identifiant de notification : retrouve le compte et la conversation au clic. */
export function notificationId(email: string, threadId: string | null): string {
  return threadId ? `msg|${email}|${threadId}` : `sum|${email}|${Date.now()}`;
}

export function parseNotificationId(id: string): { email: string; threadId: string | null } | null {
  const [kind, email, rest] = id.split('|');
  if (!email || (kind !== 'msg' && kind !== 'sum')) return null;
  return { email, threadId: kind === 'msg' ? rest ?? null : null };
}
