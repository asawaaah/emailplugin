// Couleurs des comptes : palette proposée dans les Réglages, couleur par défaut
// selon le rang, couleur de texte lisible sur chaque teinte. Fonctions pures,
// couvertes par tests/colors.test.ts.

import type { MessageKey } from './i18n';

export interface PaletteColor {
  hex: string;
  /** Nom affiché (infobulle, lecteurs d'écran). */
  label: MessageKey;
}

/** Les six premières servent de couleurs par défaut, dans l'ordre du classement. */
export const ACCOUNT_PALETTE: readonly PaletteColor[] = [
  { hex: '#1a73e8', label: 'colorBlue' },
  { hex: '#188038', label: 'colorGreen' },
  { hex: '#e8710a', label: 'colorOrange' },
  { hex: '#9334e6', label: 'colorPurple' },
  { hex: '#129eaf', label: 'colorTeal' },
  { hex: '#d01884', label: 'colorPink' },
  { hex: '#d93025', label: 'colorRed' },
  { hex: '#f9ab00', label: 'colorYellow' },
  { hex: '#8d6e63', label: 'colorBrown' },
  { hex: '#5f6368', label: 'colorGrey' },
];

const DEFAULT_COUNT = 6;
const HEX = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && HEX.test(value);
}

export function defaultAccountColor(rank: number): string {
  const index = ((rank % DEFAULT_COUNT) + DEFAULT_COUNT) % DEFAULT_COUNT;
  return ACCOUNT_PALETTE[index]?.hex ?? '#1a73e8';
}

/** Couleur choisie par l'utilisateur si elle est valide, sinon celle du rang. */
export function accountColor(account: { color?: string } | undefined, rank: number): string {
  return isHexColor(account?.color) ? account.color.toLowerCase() : defaultAccountColor(rank);
}

/** Adresse → couleur, pour tous les comptes. */
export function accountColors(accounts: ReadonlyArray<{ email: string; color?: string }>): Map<string, string> {
  return new Map(accounts.map((a, rank) => [a.email, accountColor(a, rank)]));
}

/** Texte foncé sur une couleur claire (jaune), blanc sinon. */
export function readableTextOn(hex: string): '#ffffff' | '#1f1f1f' {
  if (!isHexColor(hex)) return '#ffffff';
  const channel = (i: number): number => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  // Seuil où le contraste avec le blanc et avec le texte foncé s'équilibre.
  return luminance > 0.36 ? '#1f1f1f' : '#ffffff';
}
