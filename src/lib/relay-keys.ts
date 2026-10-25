// Clés du relais, générées dans la page Réglages (WebCrypto) :
// - une clé partagée (RELAY_SECRET) entre l'extension et le relais ;
// - une paire de clés Web Push (VAPID) : la publique sert à abonner le
//   navigateur, la privée permet au relais de le « sonner ».
// La clé privée VAPID ne permet que d'envoyer un coup de sonnette sans contenu.

import type { RelayKeys } from './types';

export function base64url(bytes: ArrayBuffer | Uint8Array): string {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const b of array) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64 + '='.repeat((4 - (base64.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function generateRelayKeys(): Promise<RelayKeys> {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const raw = await crypto.subtle.exportKey('raw', pair.publicKey);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  return {
    secret: base64url(crypto.getRandomValues(new Uint8Array(32))),
    vapidPublicKey: base64url(raw),
    vapidPrivateJwk: JSON.stringify({ kty: jwk.kty, crv: jwk.crv, d: jwk.d, x: jwk.x, y: jwk.y }),
  };
}

/** Adresse https du relais, sans « / » final ; null si invalide. */
export function normalizeRelayUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

/** Adresse de livraison à déclarer dans l'abonnement Pub/Sub. */
export function pubsubEndpoint(relayUrl: string, secret: string): string {
  return `${relayUrl}/pubsub?secret=${encodeURIComponent(secret)}`;
}

/** projects/<projet>/topics/<sujet> */
export function isPubsubTopic(value: string): boolean {
  return /^projects\/[a-z][a-z0-9-]{4,28}[a-z0-9]\/topics\/[A-Za-z][\w.~+%-]{2,254}$/.test(value.trim());
}
