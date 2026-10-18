import { describe, expect, it } from 'vitest';
import { detectNew, keepRecent, notificationId, parseNotificationId } from '../src/lib/notify';
import { moveAccount } from '../src/lib/storage';
import type { MessageMeta } from '../src/lib/types';

const meta = (id: string, date: number): MessageMeta => ({
  id,
  threadId: `t-${id}`,
  from: { name: 'Marie', email: 'marie@exemple.ca' },
  subject: 'Objet',
  snippet: 'Aperçu',
  date,
});

describe('detectNew', () => {
  it('ne notifie rien au premier passage, mais mémorise les non lus existants', () => {
    const { candidates, next } = detectNew(undefined, ['a', 'b'], 1000);
    expect(candidates).toEqual([]);
    expect(next).toEqual({ ids: ['a', 'b'], checkedAt: 1000 });
  });
  it('repère seulement les messages jamais vus', () => {
    const { candidates, next } = detectNew({ ids: ['a', 'b'], checkedAt: 1000 }, ['c', 'a'], 2000);
    expect(candidates).toEqual(['c']);
    expect(next.ids).toEqual(['c', 'a', 'b']);
    expect(next.checkedAt).toBe(2000);
  });
  it('ne renotifie pas un message lu puis redevenu non lu', () => {
    const first = detectNew({ ids: ['a'], checkedAt: 0 }, [], 1000);
    expect(detectNew(first.next, ['a'], 2000).candidates).toEqual([]);
  });
  it('limite la mémoire à 200 identifiants', () => {
    const ids = Array.from({ length: 250 }, (_, i) => `m${i}`);
    expect(detectNew({ ids, checkedAt: 0 }, ['new'], 1).next.ids).toHaveLength(200);
  });
});

describe('keepRecent', () => {
  it('écarte un vieux courriel remis en non lu', () => {
    const lastCheck = 100 * 60_000;
    const kept = keepRecent([meta('new', lastCheck + 1000), meta('old', 0), meta('borderline', lastCheck - 5 * 60_000)], lastCheck);
    expect(kept.map((m) => m.id)).toEqual(['new', 'borderline']);
  });
});

describe('identifiants de notification', () => {
  it('retrouvent le compte et la conversation', () => {
    expect(parseNotificationId(notificationId('alice@gmail.com', 't1'))).toEqual({ email: 'alice@gmail.com', threadId: 't1' });
    expect(parseNotificationId(notificationId('alice@gmail.com', null))).toEqual({ email: 'alice@gmail.com', threadId: null });
    expect(parseNotificationId('test|123')).toBeNull();
  });
});

describe('moveAccount', () => {
  it('échange un compte avec son voisin', () => {
    expect(moveAccount(['a', 'b', 'c'], 2, -1)).toEqual(['a', 'c', 'b']);
    expect(moveAccount(['a', 'b', 'c'], 0, 1)).toEqual(['b', 'a', 'c']);
  });
  it('ne bouge pas au-delà des bords', () => {
    expect(moveAccount(['a', 'b'], 0, -1)).toEqual(['a', 'b']);
    expect(moveAccount(['a', 'b'], 1, 1)).toEqual(['a', 'b']);
  });
});
