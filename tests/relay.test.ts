import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import relay, { base64url, decodePubSub, safeEqual, validEmails, validSubscription, vapidJwt } from '../relay/worker.js';

/** Espace KV en mémoire, comme celui de Cloudflare. */
class MemoryKV {
  data = new Map<string, string>();
  async get(key: string, type?: string) {
    const value = this.data.get(key);
    if (value === undefined) return null;
    return type === 'json' ? JSON.parse(value) : value;
  }
  async put(key: string, value: string) {
    this.data.set(key, value);
  }
  async delete(key: string) {
    this.data.delete(key);
  }
}

const SECRET = 'cle-secrete-de-test-1234567890';
const ENDPOINT = 'https://fcm.googleapis.com/fcm/send/abc123';
let env: Record<string, unknown>;
let publicKey: CryptoKey;
let kv: MemoryKV;

beforeAll(async () => {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  publicKey = pair.publicKey;
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const raw = await crypto.subtle.exportKey('raw', pair.publicKey);
  env = { RELAY_SECRET: SECRET, VAPID_PUBLIC_KEY: base64url(raw), VAPID_PRIVATE_JWK: JSON.stringify(jwk), VAPID_SUBJECT: 'mailto:test@exemple.ca' };
});

beforeEach(() => {
  kv = new MemoryKV();
  env.SUBSCRIPTIONS = kv;
  vi.restoreAllMocks();
});

const call = (path: string, init: RequestInit = {}) => relay.fetch(new Request(`https://relay.exemple.workers.dev${path}`, init), env);
const authed = (path: string, body: unknown) =>
  call(path, { method: 'POST', headers: { Authorization: `Bearer ${SECRET}` }, body: JSON.stringify(body) });
const pubsub = (email: string, secret = SECRET) =>
  call(`/pubsub?secret=${encodeURIComponent(secret)}`, {
    method: 'POST',
    body: JSON.stringify({ message: { data: btoa(JSON.stringify({ emailAddress: email, historyId: 123 })) } }),
  });

describe('relais Cloudflare', () => {
  it('répond à la vérification de santé avec sa clé publique', async () => {
    const response = await call('/');
    expect(await response.json()).toMatchObject({ ok: true, service: 'apercu-gmail-relay', configured: true });
  });

  it('refuse les inscriptions sans la clé', async () => {
    const response = await call('/register', { method: 'POST', body: '{}', headers: { Authorization: 'Bearer mauvaise' } });
    expect(response.status).toBe(401);
  });

  it('refuse une alerte Pub/Sub sans la clé', async () => {
    expect((await pubsub('alice@gmail.com', 'mauvaise')).status).toBe(403);
  });

  it('sonne le navigateur inscrit, sans contenu, avec un jeton VAPID valide', async () => {
    await authed('/register', { emails: ['Alice@Gmail.com'], subscription: { endpoint: ENDPOINT } });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 201 }));
    expect((await pubsub('alice@gmail.com')).status).toBe(204);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ENDPOINT);
    expect((init.body as Uint8Array).byteLength).toBe(0);
    const auth = (init.headers as Record<string, string>).Authorization;
    const [, token, key] = (auth ?? '').match(/^vapid t=([^,]+), k=(.+)$/) ?? [];
    expect(key).toBe(env.VAPID_PUBLIC_KEY);
    const [header, payload, signature] = (token ?? '').split('.');
    const decode = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
    const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey, decode(signature ?? ''), new TextEncoder().encode(`${header}.${payload}`));
    expect(valid).toBe(true);
    expect(JSON.parse(new TextDecoder().decode(decode(payload ?? '')))).toMatchObject({ aud: 'https://fcm.googleapis.com', sub: 'mailto:test@exemple.ca' });
  });

  it('ne sonne personne pour une adresse non inscrite', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    expect((await pubsub('inconnu@gmail.com')).status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('oublie un navigateur désinscrit (410)', async () => {
    await authed('/register', { emails: ['alice@gmail.com'], subscription: { endpoint: ENDPOINT } });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 410 }));
    await pubsub('alice@gmail.com');
    expect(kv.data.has('email:alice@gmail.com')).toBe(false);
  });

  it('une nouvelle inscription remplace la liste des adresses', async () => {
    await authed('/register', { emails: ['alice@gmail.com', 'bob@gmail.com'], subscription: { endpoint: ENDPOINT } });
    await authed('/register', { emails: ['bob@gmail.com'], subscription: { endpoint: ENDPOINT } });
    expect(kv.data.has('email:alice@gmail.com')).toBe(false);
    expect(JSON.parse(kv.data.get('email:bob@gmail.com') ?? '[]')).toEqual([{ endpoint: ENDPOINT }]);
    await authed('/unregister', { endpoint: ENDPOINT });
    expect(kv.data.size).toBe(0);
  });

  it('refuse d’envoyer ailleurs qu’à un service de push connu', async () => {
    const response = await authed('/register', { emails: ['alice@gmail.com'], subscription: { endpoint: 'https://site-malveillant.exemple/x' } });
    expect(response.status).toBe(400);
  });
});

describe('fonctions du relais', () => {
  it('valide les abonnements', () => {
    expect(validSubscription({ endpoint: ENDPOINT })).toEqual({ endpoint: ENDPOINT });
    expect(validSubscription({ endpoint: 'http://fcm.googleapis.com/x' })).toBeNull();
    expect(validSubscription({ endpoint: 'https://fcm.googleapis.com.exemple.ru/x' })).toBeNull();
    expect(validSubscription(null)).toBeNull();
  });
  it('valide les adresses', () => {
    expect(validEmails(['A@b.ca', 'a@b.ca'])).toEqual(['a@b.ca']);
    expect(validEmails(['pas une adresse'])).toBeNull();
    expect(validEmails(Array(11).fill('a@b.ca'))).toBeNull();
  });
  it('lit l’adresse d’une alerte Gmail', () => {
    expect(decodePubSub({ message: { data: btoa('{"emailAddress":"Alice@Gmail.com","historyId":1}') } })).toBe('alice@gmail.com');
    expect(decodePubSub({ message: { data: 'pas du base64 !' } })).toBeNull();
    expect(decodePubSub(null)).toBeNull();
  });
  it('compare les clés sans fuite', () => {
    expect(safeEqual('abc', 'abc')).toBe(true);
    expect(safeEqual('abd', 'abc')).toBe(false);
    expect(safeEqual('', '')).toBe(false);
  });
  it('produit un jeton qui expire dans 12 h', async () => {
    const token = await vapidJwt(env, 'https://fcm.googleapis.com', 0);
    const payload = JSON.parse(atob((token.split('.')[1] ?? '').replace(/-/g, '+').replace(/_/g, '/')));
    expect(payload.exp).toBe(12 * 3600);
  });
});
