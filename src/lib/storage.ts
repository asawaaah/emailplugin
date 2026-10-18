// Accès au stockage de l'extension.
// - Comptes, réglages et compteurs : chrome.storage.local (gardés au redémarrage).
// - Jetons d'accès : chrome.storage.session (en mémoire seulement, effacés à la
//   fermeture de Chrome ; ils sont renouvelés en silence au besoin).

import type { Account, AccountState, SeenState, Settings, TokenEntry } from './types';

export const DEFAULT_SETTINGS: Settings = {
  clientId: '',
  language: 'fr',
  pollMinutes: 1,
  maxThreads: 20,
  markReadOnOpen: true,
  alwaysShowImages: false,
  unreadOnly: true,
  notifications: true,
};

export const POLL_CHOICES = [1, 2, 5, 10, 15] as const;
export const MAX_THREADS_CHOICES = [10, 20, 30, 50] as const;

export async function getSettings(): Promise<Settings> {
  const { settings } = await chrome.storage.local.get('settings');
  return { ...DEFAULT_SETTINGS, ...(settings as Partial<Settings> | undefined) };
}

export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  const next = { ...(await getSettings()), ...patch };
  await chrome.storage.local.set({ settings: next });
  return next;
}

export async function getAccounts(): Promise<Account[]> {
  const { accounts } = await chrome.storage.local.get('accounts');
  return (accounts as Account[] | undefined) ?? [];
}

export async function saveAccounts(accounts: Account[]): Promise<void> {
  await chrome.storage.local.set({ accounts });
}

export async function getAccountStates(): Promise<Record<string, AccountState>> {
  const { accountStates } = await chrome.storage.local.get('accountStates');
  return (accountStates as Record<string, AccountState> | undefined) ?? {};
}

export async function saveAccountStates(states: Record<string, AccountState>): Promise<void> {
  await chrome.storage.local.set({ accountStates: states });
}

export async function getTokens(): Promise<Record<string, TokenEntry>> {
  const { tokens } = await chrome.storage.session.get('tokens');
  return (tokens as Record<string, TokenEntry> | undefined) ?? {};
}

export async function setToken(email: string, entry: TokenEntry | null): Promise<void> {
  const tokens = await getTokens();
  if (entry) tokens[email] = entry;
  else delete tokens[email];
  await chrome.storage.session.set({ tokens });
}

/** Comptes repliés dans le popup. */
export async function getCollapsed(): Promise<string[]> {
  const { collapsed } = await chrome.storage.local.get('collapsed');
  return (collapsed as string[] | undefined) ?? [];
}

export async function setCollapsed(email: string, isCollapsed: boolean): Promise<void> {
  const current = new Set(await getCollapsed());
  if (isCollapsed) current.add(email);
  else current.delete(email);
  await chrome.storage.local.set({ collapsed: [...current] });
}

export async function getSeen(): Promise<Record<string, SeenState>> {
  const { seen } = await chrome.storage.local.get('seen');
  return (seen as Record<string, SeenState> | undefined) ?? {};
}

export async function saveSeen(seen: Record<string, SeenState>): Promise<void> {
  await chrome.storage.local.set({ seen });
}

/** Déplace un compte d'un cran vers le haut (-1) ou le bas (+1). */
export function moveAccount<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (index < 0 || index >= list.length || target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target] as T, next[index] as T];
  return next;
}
