// Relais « Aperçu Gmail » pour Cloudflare Workers.
//
// 1. Gmail publie une alerte dans Google Pub/Sub à chaque changement de la
//    boîte de réception ; Pub/Sub la livre ici (POST /pubsub?token=…).
//    Ce jeton est dérivé de RELAY_SECRET (HMAC) et ne sert qu'à cette adresse :
//    l'adresse déclarée chez Google ne permet pas de gérer les inscriptions.
// 2. Le relais « sonne » chaque navigateur inscrit pour cette adresse, par un
//    Web Push SANS contenu : aucune donnée de courriel ne passe par ici.
// 3. L'extension se réveille et va vérifier Gmail elle-même.
//
// Une fausse alerte ne peut donc que déclencher une vérification de la boîte.
//
// Liaison et variables (Cloudflare › Worker › Settings) :
//   SUBSCRIPTIONS      espace KV (navigateurs inscrits par adresse)
//   RELAY_SECRET       clé partagée avec l'extension (secret)
//   VAPID_PUBLIC_KEY   clé publique Web Push (base64url)
//   VAPID_PRIVATE_JWK  clé privée Web Push, au format JWK (secret)
//   VAPID_SUBJECT      contact, par ex. mailto:vous@exemple.com
// Les clés sont générées par la page Réglages de l'extension.

const MAX_EMAILS = 10;
const MAX_SUBSCRIPTIONS_PER_EMAIL = 5;
const PUSH_HOSTS = [/\.googleapis\.com$/, /\.mozilla\.com$/, /\.windows\.com$/, /\.push\.apple\.com$/];
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}$/;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (request.method === 'GET' && url.pathname === '/') {
        return json({ ok: true, service: 'apercu-gmail-relay', vapidPublicKey: env.VAPID_PUBLIC_KEY ?? null, configured: isConfigured(env) });
      }
      if (!isConfigured(env)) return json({ error: 'not_configured' }, 503);

      if (request.method === 'POST' && url.pathname === '/pubsub') {
        if (!safeEqual(url.searchParams.get('token') ?? '', await pubsubToken(env.RELAY_SECRET))) return json({ error: 'forbidden' }, 403);
        const email = decodePubSub(await request.json().catch(() => null));
        if (email) await ringAll(env, email);
        // Toujours 204 : Pub/Sub ne doit pas relivrer une alerte déjà traitée.
        return new Response(null, { status: 204 });
      }

      if (!isAuthorized(request, env)) return json({ error: 'unauthorized' }, 401);
      const body = await request.json().catch(() => null);

      if (request.method === 'POST' && url.pathname === '/register') {
        const subscription = validSubscription(body?.subscription);
        const emails = validEmails(body?.emails);
        if (!subscription || !emails) return json({ error: 'bad_request' }, 400);
        await register(env, subscription, emails);
        return json({ ok: true, emails });
      }
      if (request.method === 'POST' && url.pathname === '/unregister') {
        const endpoint = validSubscription({ endpoint: body?.endpoint })?.endpoint;
        if (!endpoint) return json({ error: 'bad_request' }, 400);
        await register(env, { endpoint }, []);
        return json({ ok: true });
      }
      if (request.method === 'POST' && url.pathname === '/test') {
        const subscription = validSubscription(body?.subscription);
        if (!subscription) return json({ error: 'bad_request' }, 400);
        const response = await sendPush(env, subscription);
        return json({ ok: response.ok, status: response.status });
      }
      return json({ error: 'not_found' }, 404);
    } catch (error) {
      console.error('Erreur du relais', error instanceof Error ? error.name : 'inconnue');
      return json({ error: 'internal' }, 500);
    }
  },
};

// ---------- Vérifications ----------

function isConfigured(env) {
  return Boolean(env.SUBSCRIPTIONS && env.RELAY_SECRET && env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_JWK);
}

function isAuthorized(request, env) {
  const header = request.headers.get('Authorization') ?? '';
  return header.startsWith('Bearer ') && safeEqual(header.slice(7), env.RELAY_SECRET);
}

/** Comparaison à temps constant (ne révèle pas la clé caractère par caractère). */
export function safeEqual(a, b) {
  const x = new TextEncoder().encode(String(a));
  const y = new TextEncoder().encode(String(b ?? ''));
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] ?? 0) ^ (y[i] ?? 0);
  return diff === 0 && y.length > 0;
}

/**
 * Jeton de l'adresse de livraison Pub/Sub : HMAC-SHA256(RELAY_SECRET, "pubsub").
 * Calculé à l'identique par l'extension (src/lib/relay-keys.ts).
 */
export async function pubsubToken(secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(String(secret)), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return base64url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('pubsub')));
}

/** Abonnement Web Push acceptable : adresse https d'un service de push connu. */
export function validSubscription(value) {
  if (!value || typeof value.endpoint !== 'string' || value.endpoint.length > 1000) return null;
  try {
    const url = new URL(value.endpoint);
    if (url.protocol !== 'https:' || !PUSH_HOSTS.some((host) => host.test(url.hostname))) return null;
    return { endpoint: url.toString() };
  } catch {
    return null;
  }
}

export function validEmails(value) {
  if (!Array.isArray(value) || value.length > MAX_EMAILS) return null;
  const emails = [...new Set(value.map((e) => String(e).trim().toLowerCase()))];
  return emails.every((e) => EMAIL.test(e)) ? emails : null;
}

/** Alerte Pub/Sub de Gmail : { message: { data: base64({ emailAddress, historyId }) } }. */
export function decodePubSub(body) {
  try {
    const data = JSON.parse(atob(body?.message?.data ?? ''));
    const email = String(data.emailAddress ?? '').trim().toLowerCase();
    return EMAIL.test(email) ? email : null;
  } catch {
    return null;
  }
}

// ---------- Inscriptions (KV) ----------
// email:<adresse> → [{ endpoint }]     navigateurs à sonner pour une adresse
// endpoint:<sha256> → [adresses]       adresses inscrites par un navigateur

async function hash(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function readList(env, key) {
  return (await env.SUBSCRIPTIONS.get(key, 'json')) ?? [];
}

/** Inscrit un navigateur pour exactement ces adresses (et le retire des autres). */
async function register(env, subscription, emails) {
  const indexKey = `endpoint:${await hash(subscription.endpoint)}`;
  const previous = await readList(env, indexKey);
  for (const email of previous) {
    if (emails.includes(email)) continue;
    const kept = (await readList(env, `email:${email}`)).filter((s) => s.endpoint !== subscription.endpoint);
    await writeOrDelete(env, `email:${email}`, kept);
  }
  for (const email of emails) {
    const list = (await readList(env, `email:${email}`)).filter((s) => s.endpoint !== subscription.endpoint);
    list.unshift({ endpoint: subscription.endpoint });
    await env.SUBSCRIPTIONS.put(`email:${email}`, JSON.stringify(list.slice(0, MAX_SUBSCRIPTIONS_PER_EMAIL)));
  }
  await writeOrDelete(env, indexKey, emails);
}

async function writeOrDelete(env, key, list) {
  if (list.length) await env.SUBSCRIPTIONS.put(key, JSON.stringify(list));
  else await env.SUBSCRIPTIONS.delete(key);
}

async function ringAll(env, email) {
  const list = await readList(env, `email:${email}`);
  const results = await Promise.all(list.map((s) => sendPush(env, s).catch(() => null)));
  // Navigateur désinscrit (404, 410) : on l'oublie.
  const gone = list.filter((_, i) => results[i] && (results[i].status === 404 || results[i].status === 410));
  if (gone.length) {
    await writeOrDelete(env, `email:${email}`, list.filter((s) => !gone.includes(s)));
  }
}

// ---------- Web Push (VAPID, sans contenu) ----------

export function base64url(bytes) {
  const array = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = '';
  for (const b of array) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

let cachedKey = null;
async function signingKey(env) {
  if (!cachedKey || cachedKey.jwk !== env.VAPID_PRIVATE_JWK) {
    const jwk = JSON.parse(env.VAPID_PRIVATE_JWK);
    const key = await crypto.subtle.importKey(
      'jwk',
      { kty: jwk.kty, crv: jwk.crv, d: jwk.d, x: jwk.x, y: jwk.y },
      { name: 'ECDSA', namedCurve: 'P-256' },
      false,
      ['sign'],
    );
    cachedKey = { jwk: env.VAPID_PRIVATE_JWK, key };
  }
  return cachedKey.key;
}

/** Jeton VAPID (JWT ES256) pour le service de push de l'abonnement. */
export async function vapidJwt(env, audience, now = Date.now()) {
  const encode = (value) => base64url(new TextEncoder().encode(JSON.stringify(value)));
  const unsigned = `${encode({ typ: 'JWT', alg: 'ES256' })}.${encode({
    aud: audience,
    exp: Math.floor(now / 1000) + 12 * 3600,
    sub: env.VAPID_SUBJECT || 'mailto:apercu-gmail@example.com',
  })}`;
  const signature = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await signingKey(env), new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64url(signature)}`;
}

export async function sendPush(env, subscription) {
  const endpoint = new URL(subscription.endpoint);
  const jwt = await vapidJwt(env, `${endpoint.protocol}//${endpoint.host}`);
  return fetch(subscription.endpoint, {
    method: 'POST',
    // Corps vide (Content-Length: 0) : un coup de sonnette sans contenu, donc sans chiffrement.
    body: new Uint8Array(0),
    headers: {
      TTL: '120',
      Urgency: 'high',
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
    },
  });
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}
