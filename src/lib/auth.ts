// Connexion Google, plusieurs comptes (service worker seulement).
//
// Chaque compte se connecte une fois dans une fenêtre Google (chrome.identity.
// launchWebAuthFlow). Le jeton d'accès obtenu dure environ 1 heure ; il est
// ensuite renouvelé en silence (prompt=none + login_hint), tant que le compte
// reste connecté à Google dans Chrome. Aucun serveur ni secret n'est nécessaire.

import { AuthRequiredError, GmailClient } from './gmail';
import { getAccounts, getSettings, getTokens, saveAccounts, setToken } from './storage';
import type { TokenEntry } from './types';

const AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const REVOKE_ENDPOINT = 'https://oauth2.googleapis.com/revoke';
/** Lecture, libellés (lu, archivé, spam) et corbeille. Jamais de suppression définitive. */
const SCOPES = ['https://www.googleapis.com/auth/gmail.modify'];
/** Marge avant expiration pour renouveler le jeton. */
const EXPIRY_MARGIN_MS = 2 * 60 * 1000;

export class AuthError extends Error {
  constructor(public readonly code: 'no_client_id' | 'canceled' | 'mismatch' | 'failed', message?: string) {
    super(message ?? code);
    this.name = 'AuthError';
  }
}

export function redirectUri(): string {
  return chrome.identity.getRedirectURL();
}

function buildAuthUrl(clientId: string, state: string, options: { loginHint?: string; prompt?: string }): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: 'token',
    scope: SCOPES.join(' '),
    include_granted_scopes: 'true',
    state,
  });
  if (options.loginHint) params.set('login_hint', options.loginHint);
  if (options.prompt) params.set('prompt', options.prompt);
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/** Lit le jeton dans l'adresse de retour (#access_token=…&expires_in=…). */
export function parseAuthResponse(responseUrl: string, expectedState: string, now = Date.now()): TokenEntry {
  const url = new URL(responseUrl);
  const params = new URLSearchParams(url.hash.slice(1) || url.search.slice(1));
  const error = params.get('error');
  if (error) throw new AuthError(error === 'access_denied' ? 'canceled' : 'failed', error);
  if (params.get('state') !== expectedState) throw new AuthError('failed', 'state_mismatch');
  const accessToken = params.get('access_token');
  if (!accessToken) throw new AuthError('failed', 'no_token');
  const expiresIn = Number(params.get('expires_in') ?? '3600');
  return { accessToken, expiresAt: now + expiresIn * 1000 };
}

async function runFlow(options: { loginHint?: string; interactive: boolean }): Promise<TokenEntry> {
  const { clientId } = await getSettings();
  if (!clientId) throw new AuthError('no_client_id');
  const state = crypto.randomUUID();
  const url = buildAuthUrl(clientId, state, {
    loginHint: options.loginHint,
    // Silencieux : aucune fenêtre ; interactif avec un compte connu : choix direct ;
    // nouvel ajout : sélecteur de compte Google.
    prompt: options.interactive ? (options.loginHint ? undefined : 'select_account') : 'none',
  });
  let responseUrl: string | undefined;
  try {
    responseUrl = await chrome.identity.launchWebAuthFlow({
      url,
      interactive: options.interactive,
      abortOnLoadForNonInteractive: false,
      timeoutMsForNonInteractive: 8000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (options.interactive && /cancel|closed|did not approve/i.test(message)) throw new AuthError('canceled', message);
    throw new AuthError('failed', message);
  }
  if (!responseUrl) throw new AuthError('canceled');
  return parseAuthResponse(responseUrl, state);
}

async function emailForToken(accessToken: string): Promise<string> {
  const client = new GmailClient(async () => accessToken);
  return (await client.getProfileEmail()).toLowerCase();
}

/** Ouvre la fenêtre Google, ajoute le compte choisi et renvoie son adresse. */
export async function addAccount(): Promise<{ email: string; existed: boolean }> {
  const token = await runFlow({ interactive: true });
  const email = await emailForToken(token.accessToken);
  await setToken(email, token);
  const accounts = await getAccounts();
  const existed = accounts.some((a) => a.email === email);
  if (!existed) await saveAccounts([...accounts, { email, addedAt: Date.now() }]);
  return { email, existed };
}

export async function removeAccount(email: string): Promise<void> {
  const tokens = await getTokens();
  const token = tokens[email];
  if (token) {
    // Révoque l'accès chez Google ; sans gravité si cela échoue (jeton déjà expiré).
    fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(token.accessToken)}`, { method: 'POST' }).catch(() => undefined);
  }
  await setToken(email, null);
  await saveAccounts((await getAccounts()).filter((a) => a.email !== email));
}

const inFlight = new Map<string, Promise<string>>();

/**
 * Jeton valide pour `email`. Renouvelle en silence au besoin ; avec
 * `interactive`, ouvre la fenêtre Google si le renouvellement silencieux échoue.
 * Lève AuthRequiredError si une reconnexion manuelle est nécessaire.
 */
export async function getToken(email: string, options: { interactive?: boolean; forceRefresh?: boolean } = {}): Promise<string> {
  if (!options.forceRefresh) {
    const cached = (await getTokens())[email];
    if (cached && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return cached.accessToken;
  }
  const key = `${email}|${options.interactive ? 'i' : 's'}`;
  const pending = inFlight.get(key);
  if (pending) return pending;

  const refresh = (async () => {
    let token: TokenEntry;
    try {
      token = await runFlow({ loginHint: email, interactive: false });
    } catch (error) {
      if (error instanceof AuthError && error.code === 'no_client_id') throw error;
      if (!options.interactive) throw new AuthRequiredError();
      token = await runFlow({ loginHint: email, interactive: true });
    }
    // Vérifie que Google a bien renvoyé un jeton pour ce compte-là.
    const actual = await emailForToken(token.accessToken);
    if (actual !== email) throw new AuthError('mismatch', actual);
    await setToken(email, token);
    return token.accessToken;
  })();

  inFlight.set(key, refresh);
  try {
    return await refresh;
  } finally {
    inFlight.delete(key);
  }
}
