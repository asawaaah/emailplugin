import { describe, expect, it } from 'vitest';
import { fromBase64url, generateRelayKeys, isPubsubTopic, normalizeRelayUrl, pubsubEndpoint, pubsubToken } from '../src/lib/relay-keys';
import { pubsubToken as relayPubsubToken, vapidJwt } from '../relay/worker.js';

describe('clés du relais', () => {
  it('génère une clé partagée et une paire VAPID utilisables par le relais', async () => {
    const keys = await generateRelayKeys();
    expect(keys.secret).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const publicRaw = fromBase64url(keys.vapidPublicKey);
    expect(publicRaw).toHaveLength(65); // point P-256 non compressé, attendu par pushManager.subscribe

    // Le relais signe avec la clé privée ; la clé publique de l'extension vérifie.
    const token = await vapidJwt({ VAPID_PRIVATE_JWK: keys.vapidPrivateJwk }, 'https://fcm.googleapis.com');
    const [header, payload, signature] = token.split('.');
    const publicKey = await crypto.subtle.importKey('raw', publicRaw, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify(
      { name: 'ECDSA', hash: 'SHA-256' },
      publicKey,
      fromBase64url(signature ?? ''),
      new TextEncoder().encode(`${header}.${payload}`),
    );
    expect(valid).toBe(true);
  });

  it('normalise l’adresse du relais (https seulement)', () => {
    expect(normalizeRelayUrl(' https://apercu.exemple.workers.dev/ ')).toBe('https://apercu.exemple.workers.dev');
    expect(normalizeRelayUrl('http://apercu.exemple.workers.dev')).toBeNull();
    expect(normalizeRelayUrl('pas une adresse')).toBeNull();
  });

  it('construit l’adresse de livraison Pub/Sub avec un jeton dérivé, identique côté relais', async () => {
    const secret = 'cle-du-relais';
    const token = await pubsubToken(secret);
    expect(token).toBe(await relayPubsubToken(secret));
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const endpoint = await pubsubEndpoint('https://r.workers.dev', secret);
    expect(endpoint).toBe(`https://r.workers.dev/pubsub?token=${token}`);
    expect(endpoint).not.toContain(secret);
  });

  it('reconnaît un sujet Pub/Sub', () => {
    expect(isPubsubTopic('projects/apercu-gmail-123/topics/gmail-push')).toBe(true);
    expect(isPubsubTopic('gmail-push')).toBe(false);
    expect(isPubsubTopic('projects/X/topics/gmail-push')).toBe(false);
  });
});
