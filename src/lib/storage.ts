// Accès au stockage de l'extension.
// - Comptes, réglages et compteurs : chrome.storage.local (gardés au redémarrage).
// - Jetons d'accès : chrome.storage.session (en mémoire seulement, effacés à la
//   fermeture de Chrome ; ils sont renouvelés en silence au besoin).

import type { Account, AccountState, PushStatus, RelayKeys, SeenState, Settings, Toast, TokenEntry } from './types';

export const DEFAULT_SETTINGS: Settings = {
  clientId: '',
  language: 'fr',
  pollMinutes: 1,
  maxThreads: 20,
  markReadOnOpen: true,
  alwaysShowImages: false,
  unreadOnly: true,
  notifications: true,
  notificationStyle: 'tab',
  notificationSeconds: 8,
  notificationPosition: 'top-right',
  instantPush: false,
  relayUrl: '',
  pubsubTopic: '',
  syncConfig: false,
};

export const NOTIFICATION_SECONDS_CHOICES = [5, 8, 15, 30, 0] as const;

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

/** File des courriels à montrer dans la fenêtre de notification (mémoire seulement). */
export async function getToasts(): Promise<Toast[]> {
  const { toasts } = await chrome.storage.session.get('toasts');
  return (toasts as Toast[] | undefined) ?? [];
}

export async function saveToasts(toasts: Toast[]): Promise<void> {
  await chrome.storage.session.set({ toasts });
}

/** Ajoute des courriels en tête de file, sans doublon, 20 au plus. */
export function mergeToasts(queue: Toast[], incoming: Toast[]): Toast[] {
  const known = new Set(queue.map((t) => t.key));
  return [...incoming.filter((t) => !known.has(t.key)), ...queue].slice(0, 20);
}

/** Change la couleur d'un compte (null : revenir à la couleur par défaut). */
export async function setAccountColor(email: string, color: string | null): Promise<void> {
  const accounts = await getAccounts();
  await saveAccounts(accounts.map((a) => {
    if (a.email !== email) return a;
    const { color: _previous, ...rest } = a;
    return color ? { ...rest, color } : rest;
  }));
}

export async function getRelayKeys(): Promise<RelayKeys | null> {
  const { relayKeys } = await chrome.storage.local.get('relayKeys');
  return (relayKeys as RelayKeys | undefined) ?? null;
}

export async function saveRelayKeys(keys: RelayKeys): Promise<void> {
  await chrome.storage.local.set({ relayKeys: keys });
}

export async function getPushStatus(): Promise<PushStatus> {
  const { pushStatus } = await chrome.storage.local.get('pushStatus');
  return (pushStatus as PushStatus | undefined) ?? { state: 'off' };
}

export async function updatePushStatus(patch: Partial<PushStatus>): Promise<PushStatus> {
  const next = { ...(await getPushStatus()), ...patch };
  await chrome.storage.local.set({ pushStatus: next });
  return next;
}
