// Configuration portable : tout ce qu'il faut pour installer l'extension sur un
// autre appareil (identifiant client Google, relais, clés, comptes, couleurs,
// préférences), dans un fichier à exporter puis importer, ou dans l'espace
// synchronisé du navigateur.
//
// Ce qui reste propre à chaque appareil n'y figure pas : jetons d'accès,
// sections repliées, courriels déjà notifiés, état du relais.
//
// L'import est vérifié strictement (fonctions pures, tests/config-transfer.test.ts) :
// seules les valeurs attendues, au bon format, sont reprises.

import { isHexColor } from './colors';
import { isPubsubTopic, normalizeRelayUrl } from './relay-keys';
import {
  DEFAULT_SETTINGS,
  MAX_THREADS_CHOICES,
  NOTIFICATION_SECONDS_CHOICES,
  POLL_CHOICES,
  getAccounts,
  getRelayKeys,
  getSettings,
  saveAccounts,
  saveRelayKeys,
} from './storage';
import type { Account, RelayKeys, Settings } from './types';

export const CONFIG_FORMAT = 'apercu-gmail-config';
export const CONFIG_VERSION = 1;

export interface PortableConfig {
  format: typeof CONFIG_FORMAT;
  version: typeof CONFIG_VERSION;
  exportedAt: number;
  settings: Settings;
  accounts: Array<{ email: string; color?: string }>;
  relayKeys: RelayKeys | null;
}

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

export function buildConfig(settings: Settings, accounts: Account[], relayKeys: RelayKeys | null, now = Date.now()): PortableConfig {
  return {
    format: CONFIG_FORMAT,
    version: CONFIG_VERSION,
    exportedAt: now,
    settings: { ...settings },
    accounts: accounts.map(({ email, color }) => (color ? { email, color } : { email })),
    relayKeys,
  };
}

/** Contenu comparable (sans la date), pour ne pas réécrire une configuration identique. */
export function configFingerprint(config: PortableConfig): string {
  return JSON.stringify({ ...config, exportedAt: 0 });
}

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}$/;
const CLIENT_ID = /^[\w.-]{1,200}\.apps\.googleusercontent\.com$/;
const B64URL = /^[A-Za-z0-9_-]+$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function oneOf<T>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

/** Réglages repris un par un ; une valeur invalide garde la valeur par défaut. */
function parseSettings(raw: unknown): Settings {
  const s = isRecord(raw) ? raw : {};
  const d = DEFAULT_SETTINGS;
  const clientId = typeof s.clientId === 'string' && CLIENT_ID.test(s.clientId.trim()) ? s.clientId.trim() : '';
  const relayUrl = typeof s.relayUrl === 'string' ? normalizeRelayUrl(s.relayUrl) ?? '' : '';
  const pubsubTopic = typeof s.pubsubTopic === 'string' && isPubsubTopic(s.pubsubTopic) ? s.pubsubTopic.trim() : '';
  return {
    clientId,
    language: oneOf(s.language, ['fr', 'en'] as const, d.language),
    pollMinutes: oneOf(s.pollMinutes, POLL_CHOICES, d.pollMinutes as (typeof POLL_CHOICES)[number]),
    maxThreads: oneOf(s.maxThreads, MAX_THREADS_CHOICES, d.maxThreads as (typeof MAX_THREADS_CHOICES)[number]),
    markReadOnOpen: bool(s.markReadOnOpen, d.markReadOnOpen),
    alwaysShowImages: bool(s.alwaysShowImages, d.alwaysShowImages),
    unreadOnly: bool(s.unreadOnly, d.unreadOnly),
    notifications: bool(s.notifications, d.notifications),
    notificationStyle: oneOf(s.notificationStyle, ['tab', 'window', 'system', 'both'] as const, d.notificationStyle),
    notificationSeconds: oneOf(s.notificationSeconds, NOTIFICATION_SECONDS_CHOICES, d.notificationSeconds as (typeof NOTIFICATION_SECONDS_CHOICES)[number]),
    notificationPosition: oneOf(s.notificationPosition, ['top-right', 'bottom-right'] as const, d.notificationPosition),
    // L'instantané ne s'active que si sa configuration est complète.
    instantPush: bool(s.instantPush, false) && Boolean(relayUrl && pubsubTopic),
    relayUrl,
    pubsubTopic,
    syncConfig: bool(s.syncConfig, d.syncConfig),
  };
}

function parseAccounts(raw: unknown): PortableConfig['accounts'] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const accounts: PortableConfig['accounts'] = [];
  for (const item of raw.slice(0, 20)) {
    if (!isRecord(item) || typeof item.email !== 'string') continue;
    const email = item.email.trim().toLowerCase();
    if (!EMAIL.test(email) || seen.has(email)) continue;
    seen.add(email);
    accounts.push(isHexColor(item.color) ? { email, color: item.color.toLowerCase() } : { email });
  }
  return accounts;
}

function parseRelayKeys(raw: unknown): RelayKeys | null {
  if (!isRecord(raw)) return null;
  const { secret, vapidPublicKey, vapidPrivateJwk } = raw;
  if (typeof secret !== 'string' || secret.length < 32 || secret.length > 128 || !B64URL.test(secret)) return null;
  if (typeof vapidPublicKey !== 'string' || vapidPublicKey.length !== 87 || !B64URL.test(vapidPublicKey)) return null;
  if (typeof vapidPrivateJwk !== 'string' || vapidPrivateJwk.length > 1000) return null;
  try {
    const jwk = JSON.parse(vapidPrivateJwk) as Record<string, unknown>;
    const fields = ['d', 'x', 'y'].every((k) => typeof jwk[k] === 'string' && B64URL.test(jwk[k] as string));
    if (jwk.kty !== 'EC' || jwk.crv !== 'P-256' || !fields) return null;
    return { secret, vapidPublicKey, vapidPrivateJwk: JSON.stringify({ kty: 'EC', crv: 'P-256', d: jwk.d, x: jwk.x, y: jwk.y }) };
  } catch {
    return null;
  }
}

/** Lit une configuration (texte d'un fichier, ou objet de l'espace synchronisé). */
export function parseConfig(input: string | unknown): PortableConfig {
  let raw: unknown = input;
  if (typeof input === 'string') {
    if (input.length > 50_000) throw new ConfigError('too_large');
    try {
      raw = JSON.parse(input);
    } catch {
      throw new ConfigError('not_json');
    }
  }
  if (!isRecord(raw) || raw.format !== CONFIG_FORMAT) throw new ConfigError('not_a_config');
  if (raw.version !== CONFIG_VERSION) throw new ConfigError('unsupported_version');
  const settings = parseSettings(raw.settings);
  if (!settings.clientId) throw new ConfigError('no_client_id');
  return {
    format: CONFIG_FORMAT,
    version: CONFIG_VERSION,
    exportedAt: typeof raw.exportedAt === 'number' ? raw.exportedAt : 0,
    settings,
    accounts: parseAccounts(raw.accounts),
    relayKeys: parseRelayKeys(raw.relayKeys),
  };
}

/**
 * Comptes après import : ceux de la configuration d'abord (dans leur ordre, avec
 * leur couleur), puis ceux déjà présents sur cet appareil et absents du fichier.
 */
export function mergeAccounts(current: Account[], imported: PortableConfig['accounts'], now = Date.now()): Account[] {
  const byEmail = new Map(current.map((a) => [a.email, a]));
  const merged: Account[] = imported.map(({ email, color }) => {
    const existing = byEmail.get(email);
    const base: Account = { email, addedAt: existing?.addedAt ?? now };
    return color ? { ...base, color } : base;
  });
  const importedEmails = new Set(imported.map((a) => a.email));
  for (const account of current) if (!importedEmails.has(account.email)) merged.push(account);
  return merged;
}

/** Nom du fichier exporté. */
export function configFileName(now = new Date()): string {
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `apercu-gmail-config-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

// ---------- Lecture et écriture (navigateur) ----------

/** Configuration actuelle de cet appareil. */
export async function currentConfig(): Promise<PortableConfig> {
  return buildConfig(await getSettings(), await getAccounts(), await getRelayKeys());
}

/** Applique une configuration importée sur cet appareil. */
export async function applyConfig(config: PortableConfig): Promise<void> {
  await chrome.storage.local.set({ settings: config.settings });
  await saveAccounts(mergeAccounts(await getAccounts(), config.accounts));
  if (config.relayKeys) await saveRelayKeys(config.relayKeys);
}
