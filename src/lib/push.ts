// Notifications instantanées (service worker seulement).
//
// Chaîne : Gmail → Google Pub/Sub → relais Cloudflare → Web Push (sans
// contenu) → ce service worker, qui vérifie aussitôt Gmail comme lors de la
// vérification régulière. Le relais ne voit jamais le contenu des courriels.
//
// Mise en place : abonnement Web Push du navigateur, inscription auprès du
// relais (adresses des comptes), puis abonnement Gmail (users.watch) de chaque
// compte, valable 7 jours et renouvelé toutes les 12 heures.

import { getToken } from './auth';
import { AuthRequiredError, GmailClient } from './gmail';
import { fromBase64url, isPubsubTopic, normalizeRelayUrl } from './relay-keys';
import { getAccounts, getPushStatus, getRelayKeys, getSettings, updatePushStatus } from './storage';
import type { PushErrorCode, PushStatus, RelayKeys } from './types';

export class PushSetupError extends Error {
  constructor(public readonly code: PushErrorCode, detail = '') {
    super(detail || code);
    this.name = 'PushSetupError';
  }
}

interface RelayConfig {
  url: string;
  topic: string;
  keys: RelayKeys;
}

const registration = (globalThis as unknown as { registration: ServiceWorkerRegistration }).registration;

async function config(): Promise<RelayConfig> {
  const settings = await getSettings();
  const keys = await getRelayKeys();
  const url = normalizeRelayUrl(settings.relayUrl);
  if (!keys || !url || !isPubsubTopic(settings.pubsubTopic)) throw new PushSetupError('missing_config');
  return { url, topic: settings.pubsubTopic.trim(), keys };
}

async function relayCall(cfg: RelayConfig, path: string, body: unknown): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${cfg.url}${path}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${cfg.keys.secret}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (error) {
    throw new PushSetupError('relay_unreachable', error instanceof Error ? error.message : '');
  }
  if (response.status === 401) throw new PushSetupError('relay_auth');
  if (!response.ok) throw new PushSetupError('relay_unreachable', `HTTP ${response.status}`);
  return response;
}

/** Vérifie que l'adresse est bien un relais Aperçu Gmail configuré. */
async function checkRelay(cfg: RelayConfig): Promise<void> {
  type RelayInfo = { service?: string; configured?: boolean; vapidPublicKey?: string };
  let info: RelayInfo;
  try {
    const response = await fetch(`${cfg.url}/`, { signal: AbortSignal.timeout(10_000) });
    info = (await response.json()) as RelayInfo;
  } catch (error) {
    throw new PushSetupError('relay_unreachable', error instanceof Error ? error.message : '');
  }
  if (info.service !== 'apercu-gmail-relay') throw new PushSetupError('relay_unreachable', 'not_a_relay');
  if (!info.configured) throw new PushSetupError('relay_auth', 'relay_not_configured');
  if (info.vapidPublicKey !== cfg.keys.vapidPublicKey) throw new PushSetupError('relay_auth', 'vapid_mismatch');
}

function sameKey(a: ArrayBuffer | null | undefined, b: Uint8Array): boolean {
  if (!a) return false;
  const x = new Uint8Array(a);
  return x.length === b.length && x.every((v, i) => v === b[i]);
}

/** Abonnement Web Push du navigateur, (re)créé si la clé du relais a changé. */
async function ensureSubscription(cfg: RelayConfig): Promise<PushSubscription> {
  const key = fromBase64url(cfg.keys.vapidPublicKey);
  try {
    const existing = await registration.pushManager.getSubscription();
    if (existing && sameKey(existing.options.applicationServerKey, key)) return existing;
    await existing?.unsubscribe();
    return await registration.pushManager.subscribe({ userVisibleOnly: false, applicationServerKey: key });
  } catch (error) {
    // Brave : « Utiliser les services Google pour la messagerie push » désactivé.
    throw new PushSetupError('push_unavailable', error instanceof Error ? error.message : '');
  }
}

/** Abonne chaque compte aux alertes Gmail ; renvoie la fin d'abonnement la plus proche. */
async function watchAll(cfg: RelayConfig): Promise<number> {
  const accounts = await getAccounts();
  if (!accounts.length) throw new PushSetupError('no_accounts');
  const failures: string[] = [];
  let until = Number.POSITIVE_INFINITY;
  for (const { email } of accounts) {
    const client = new GmailClient((forceRefresh) => getToken(email, { forceRefresh }));
    try {
      const { expiration } = await client.watch(cfg.topic);
      until = Math.min(until, expiration);
    } catch (error) {
      if (error instanceof AuthRequiredError) continue; // reconnexion requise : réessayé au prochain renouvellement
      failures.push(`${email} : ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  if (failures.length === accounts.length) throw new PushSetupError('watch_failed', failures.join(' ; '));
  return Number.isFinite(until) ? until : Date.now();
}

async function setup(): Promise<PushStatus> {
  const cfg = await config();
  await checkRelay(cfg);
  const subscription = await ensureSubscription(cfg);
  const emails = (await getAccounts()).map((a) => a.email);
  await relayCall(cfg, '/register', { emails, subscription: { endpoint: subscription.endpoint } });
  const watchedUntil = await watchAll(cfg);
  return updatePushStatus({ state: 'active', code: undefined, detail: undefined, watchedUntil });
}

async function recordError(error: unknown): Promise<PushStatus> {
  if (error instanceof PushSetupError) return updatePushStatus({ state: 'error', code: error.code, detail: error.message === error.code ? undefined : error.message });
  return updatePushStatus({ state: 'error', code: 'relay_unreachable', detail: error instanceof Error ? error.message : String(error) });
}

/** Active (ou réactive) les notifications instantanées. */
export async function enableInstantPush(): Promise<PushStatus> {
  try {
    return await setup();
  } catch (error) {
    return recordError(error);
  }
}

/** Renouvellement (toutes les 12 h, au démarrage, après un ajout ou retrait de compte). */
export async function renewInstantPush(): Promise<void> {
  const settings = await getSettings();
  if (!settings.instantPush) return;
  await enableInstantPush();
}

export async function disableInstantPush(): Promise<PushStatus> {
  const cfg = await config().catch(() => null);
  for (const { email } of await getAccounts()) {
    await new GmailClient((forceRefresh) => getToken(email, { forceRefresh })).stopWatch().catch(() => undefined);
  }
  const subscription = await registration.pushManager.getSubscription().catch(() => null);
  if (cfg && subscription) await relayCall(cfg, '/unregister', { endpoint: subscription.endpoint }).catch(() => undefined);
  await subscription?.unsubscribe().catch(() => undefined);
  return updatePushStatus({ state: 'off', code: undefined, detail: undefined, watchedUntil: undefined });
}

/** Arrête les alertes Gmail d'un compte avant son retrait. */
export async function stopWatching(email: string): Promise<void> {
  if (!(await getSettings()).instantPush) return;
  await new GmailClient((forceRefresh) => getToken(email, { forceRefresh })).stopWatch().catch(() => undefined);
}

// ---------- Réception et test ----------

let testWaiter: ((received: boolean) => void) | null = null;

/** Appelé à chaque coup de sonnette du relais. */
export async function notePushReceived(): Promise<void> {
  testWaiter?.(true);
  testWaiter = null;
  await updatePushStatus({ lastPushAt: Date.now() });
}

/** Demande au relais de sonner ce navigateur et attend le coup de sonnette (15 s au plus). */
export async function testInstantPush(): Promise<{ received: boolean; status: PushStatus }> {
  try {
    const cfg = await config();
    await checkRelay(cfg);
    const subscription = await ensureSubscription(cfg);
    const received = new Promise<boolean>((resolve) => {
      testWaiter = resolve;
      setTimeout(() => resolve(false), 15_000);
    });
    await relayCall(cfg, '/test', { subscription: { endpoint: subscription.endpoint } });
    return { received: await received, status: await getPushStatus() };
  } catch (error) {
    return { received: false, status: await recordError(error) };
  }
}
