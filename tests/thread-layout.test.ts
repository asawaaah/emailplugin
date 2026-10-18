import { describe, expect, it } from 'vitest';
import { layoutThread } from '../src/lib/thread-layout';

const thread = (...unread: boolean[]) => unread.map((u) => ({ unread: u }));

describe('layoutThread', () => {
  it('message seul : ouvert, sans regroupement', () => {
    expect(layoutThread(thread(false))).toEqual({ focusIndex: 0, expanded: [true], hidden: null });
  });
  it('tout est lu : on va au dernier message', () => {
    const layout = layoutThread(thread(false, false, false));
    expect(layout.focusIndex).toBe(2);
    expect(layout.expanded).toEqual([false, false, true]);
    expect(layout.hidden).toBeNull();
  });
  it('va au premier non lu et ouvre tous les non lus', () => {
    const layout = layoutThread(thread(false, false, true, true));
    expect(layout.focusIndex).toBe(2);
    expect(layout.expanded).toEqual([false, false, true, true]);
    expect(layout.hidden).toBeNull();
  });
  it('regroupe les anciens messages du milieu à partir de 4', () => {
    // 0 visible, 1-2 regroupés, 3 visible, 4-5 non lus
    expect(layoutThread(thread(false, false, false, false, true, true)).hidden).toEqual([1, 2]);
    // 10 anciens messages : 1 … 8 regroupés
    expect(layoutThread([...thread(...Array(10).fill(false)), { unread: true }]).hidden).toEqual([1, 8]);
  });
  it('ne regroupe pas avec 3 anciens messages ou moins', () => {
    expect(layoutThread(thread(false, false, false, true)).hidden).toBeNull();
  });
  it('conversation lue de 6 messages : regroupe 1 à 3, garde le 4e et le dernier', () => {
    const layout = layoutThread(thread(false, false, false, false, false, false));
    expect(layout.focusIndex).toBe(5);
    expect(layout.hidden).toEqual([1, 3]);
  });
});
