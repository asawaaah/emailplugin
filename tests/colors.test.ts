import { describe, expect, it } from 'vitest';
import { ACCOUNT_PALETTE, accountColor, accountColors, defaultAccountColor, readableTextOn } from '../src/lib/colors';

describe('couleurs des comptes', () => {
  it('donne une couleur par défaut selon le rang, en boucle sur les six premières', () => {
    expect(defaultAccountColor(0)).toBe('#1a73e8');
    expect(defaultAccountColor(1)).toBe('#188038');
    expect(defaultAccountColor(6)).toBe('#1a73e8');
  });
  it('garde la couleur choisie si elle est valide', () => {
    expect(accountColor({ color: '#AB12CD' }, 0)).toBe('#ab12cd');
    expect(accountColor({ color: 'red; background:url(x)' }, 1)).toBe('#188038');
    expect(accountColor(undefined, 2)).toBe('#e8710a');
  });
  it('associe chaque adresse à sa couleur', () => {
    const colors = accountColors([{ email: 'a@gmail.com' }, { email: 'b@gmail.com', color: '#d93025' }]);
    expect(colors.get('a@gmail.com')).toBe('#1a73e8');
    expect(colors.get('b@gmail.com')).toBe('#d93025');
  });
  it('choisit un texte lisible sur chaque couleur', () => {
    expect(readableTextOn('#f9ab00')).toBe('#1f1f1f'); // jaune
    expect(readableTextOn('#1a73e8')).toBe('#ffffff'); // bleu
    expect(readableTextOn('#ffffff')).toBe('#1f1f1f');
    expect(readableTextOn('#000000')).toBe('#ffffff');
  });
  it('propose dix couleurs distinctes', () => {
    expect(new Set(ACCOUNT_PALETTE.map((c) => c.hex)).size).toBe(10);
  });
});
