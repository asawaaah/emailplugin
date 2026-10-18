// Disposition d'une conversation à l'ouverture, comme dans Gmail (fonction
// pure, couverte par tests/thread-layout.test.ts) :
// - on va directement au premier message non lu (sinon au dernier message) ;
// - les messages non lus et le dernier sont ouverts, les autres repliés ;
// - au-delà de 3 anciens messages lus, ceux du milieu sont regroupés dans une
//   ligne « N messages précédents » ; le premier (le contexte) et celui juste
//   avant le message visé restent visibles.

export interface ThreadLayout {
  /** Message vers lequel défiler à l'ouverture. */
  focusIndex: number;
  /** Message ouvert (true) ou replié (false), dans l'ordre. */
  expanded: boolean[];
  /** Messages regroupés [début, fin] inclus, ou null. */
  hidden: [number, number] | null;
}

/** Nombre d'anciens messages à partir duquel on regroupe ceux du milieu. */
const GROUP_FROM = 4;

export function layoutThread(messages: ReadonlyArray<{ unread: boolean }>): ThreadLayout {
  const last = messages.length - 1;
  const firstUnread = messages.findIndex((m) => m.unread);
  const focusIndex = firstUnread >= 0 ? firstUnread : Math.max(0, last);
  const expanded = messages.map((m, i) => m.unread || i === last);
  // Avant le message visé, tout est déjà lu : 0 … focusIndex - 1.
  const hidden: [number, number] | null = focusIndex >= GROUP_FROM ? [1, focusIndex - 2] : null;
  return { focusIndex, expanded, hidden };
}
