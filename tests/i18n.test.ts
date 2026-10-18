import { afterEach, describe, expect, it } from 'vitest';
import { formatShortDate, setLanguage, t, unreadLabel } from '../src/lib/i18n';

afterEach(() => setLanguage('fr'));

describe('i18n', () => {
  it('parle français par défaut et remplace les paramètres', () => {
    expect(t('unreadCount', 5)).toBe('5 non lus');
    expect(unreadLabel(1)).toBe('1 non lu');
    expect(unreadLabel(0)).toBe('Aucun non lu');
  });
  it('passe en anglais', () => {
    setLanguage('en');
    expect(t('archive')).toBe('Archive');
    expect(unreadLabel(3)).toBe('3 unread');
  });
  it("affiche l'heure aujourd'hui et la date sinon", () => {
    const now = new Date(2026, 9, 18, 15, 0).getTime();
    expect(formatShortDate(new Date(2026, 9, 18, 9, 5).getTime(), now)).toMatch(/9\s?h\s?05/);
    expect(formatShortDate(new Date(2026, 2, 3).getTime(), now)).toMatch(/3 mars/);
    expect(formatShortDate(new Date(2024, 2, 3).getTime(), now)).toMatch(/2024/);
  });
});
