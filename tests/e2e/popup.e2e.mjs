// Test de bout en bout : charge l'extension dans Chromium, remplace l'API Gmail
// par de fausses données et vérifie la liste, la lecture et les actions rapides.
// Usage : npm run build && npm run test:e2e   (captures dans test-results/)
import { chromium } from 'playwright-core';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const EXT = path.resolve('extension');
const OUT = path.resolve('test-results');
const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
await mkdir(OUT, { recursive: true });

const b64 = (s) => Buffer.from(s, 'utf-8').toString('base64url');
const now = Date.now();
const msg = (id, threadId, from, subject, snippet, minutesAgo, unread, body) => ({
  id, threadId, snippet, labelIds: unread ? ['INBOX', 'UNREAD'] : ['INBOX'],
  internalDate: String(now - minutesAgo * 60000),
  payload: {
    mimeType: 'multipart/alternative',
    headers: [{ name: 'From', value: from }, { name: 'Subject', value: subject }, { name: 'To', value: 'alice@gmail.com' }],
    parts: body ? [{ mimeType: 'text/html', body: { data: b64(body) } }] : [{ mimeType: 'text/plain', body: { data: b64(snippet) } }],
  },
});
const newsletter = `<table width="640" style="width:640px;background:#f4f4f4"><tr><td>
  <h1 style="color:#c00">Circulaire de la semaine</h1>
  <img src="https://pixel.exemple.com/track.gif" width="600" height="80" alt="bannière">
  <p>Rabais sur les pommes, le poulet et le fromage. <a href="https://exemple.com">Voir</a></p>
  <script>document.body.innerHTML = 'PIRATÉ'</script>
</td></tr></table>`;
const threads = {
  'alice@gmail.com': [
    { id: 't1', messages: [msg('m1', 't1', 'Marie Tremblay <marie@exemple.ca>', 'Souper vendredi ?', 'On se voit vers 18 h ? J’apporte le dessert.', 12, true)] },
    { id: 't2', messages: [msg('m2', 't2', 'Épicerie Metro <info@metro.ca>', 'Vos rabais de la semaine', 'Pommes, poulet et fromage en spécial', 300, true, newsletter)] },
    { id: 't3', messages: [
      msg('m3', 't3', 'Alice <alice@gmail.com>', 'Facture d’octobre', 'Voici la facture', 4000, false),
      msg('m4', 't3', 'Comptabilité <compta@exemple.ca>', 'Re: Facture d’octobre', 'Merci, c’est reçu &amp; payé.', 3000, false),
    ] },
  ],
  'bob.travail@gmail.com': [],
};
const calls = [];

const userDataDir = await mkdtemp(path.join(tmpdir(), 'apercu-gmail-'));
const context = await chromium.launchPersistentContext(userDataDir, {
  executablePath,
  headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  viewport: { width: 460, height: 580 },
  colorScheme: process.env.DARK ? 'dark' : 'light',
});

let [worker] = context.serviceWorkers();
if (!worker) worker = await context.waitForEvent('serviceworker');
const extensionId = new URL(worker.url()).host;
console.log('Identifiant de l’extension :', extensionId);

await context.route('https://gmail.googleapis.com/**', async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const token = req.headers().authorization?.replace('Bearer ', '') ?? '';
  const email = token.replace('tok-', '');
  const list = threads[email] ?? [];
  const p = url.pathname.replace('/gmail/v1/users/me', '');
  calls.push(`${req.method()} ${email} ${p}`);
  const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
  if (p === '/labels/INBOX') return json({ id: 'INBOX', threadsUnread: list.filter((t) => t.messages.some((m) => m.labelIds.includes('UNREAD'))).length });
  if (p === '/threads') return json({ threads: list.map((t) => ({ id: t.id })) });
  const m = p.match(/^\/threads\/(\w+)(\/(modify|trash))?$/);
  if (m) {
    const thread = list.find((t) => t.id === m[1]);
    if (m[3]) return json({ id: m[1] });
    return thread ? json(thread) : route.fulfill({ status: 404 });
  }
  return route.fulfill({ status: 404 });
});

// Prépare deux comptes connectés (jetons factices valides 1 h).
await worker.evaluate(async () => {
  const expiresAt = Date.now() + 3600_000;
  await chrome.storage.local.set({
    settings: { clientId: 'test.apps.googleusercontent.com', language: 'fr', pollMinutes: 1, maxThreads: 20, markReadOnOpen: true, alwaysShowImages: false },
    accounts: [{ email: 'alice@gmail.com', addedAt: 1 }, { email: 'bob.travail@gmail.com', addedAt: 2 }],
  });
  await chrome.storage.session.set({ tokens: {
    'alice@gmail.com': { accessToken: 'tok-alice@gmail.com', expiresAt },
    'bob.travail@gmail.com': { accessToken: 'tok-bob.travail@gmail.com', expiresAt },
  } });
});

const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
await page.goto(`chrome-extension://${extensionId}/popup.html`);
await page.waitForSelector('.thread');
const suffix = process.env.DARK ? '-dark' : '';
await page.screenshot({ path: `${OUT}/1-liste${suffix}.png` });

assert.equal(await page.locator('.thread').count(), 3);
assert.equal(await page.locator('.thread.unread').count(), 2);
assert.match(await page.locator('.account-section').first().innerText(), /2 non lus/);
assert.match(await page.locator('.account-section').nth(1).innerText(), /Boîte de réception vide/);

// Actions au survol
await page.locator('.thread').nth(0).hover();
await page.screenshot({ path: `${OUT}/2-survol${suffix}.png` });

// Lecture de l'infolettre : images bloquées, script inactif, réduite à la largeur
await page.locator('.thread').nth(1).click();
await page.waitForSelector('.message-frame');
await page.waitForTimeout(300);
const frame = page.frameLocator('.message-frame');
assert.match(await frame.locator('body').innerText(), /Circulaire de la semaine/);
assert.doesNotMatch(await frame.locator('body').innerText(), /PIRATÉ/);
assert.equal(await page.locator('.images-banner').count(), 1);
await page.screenshot({ path: `${OUT}/3-lecture${suffix}.png` });
assert.ok(calls.some((c) => c === 'POST alice@gmail.com /threads/t2/modify'), 'marqué comme lu à l’ouverture');

await page.getByRole('button', { name: 'Afficher les images' }).click();
await page.waitForTimeout(200);
assert.equal(await page.locator('.images-banner').count(), 0);

// Archiver depuis la lecture : retour à la liste, conversation retirée
await page.locator('.detail-toolbar').getByRole('button', { name: 'Archiver' }).click();
await page.waitForSelector('.list-view:not([hidden])');
assert.equal(await page.locator('.thread').count(), 2);
assert.ok(calls.some((c) => c === 'POST alice@gmail.com /threads/t2/modify'));
await page.screenshot({ path: `${OUT}/4-apres-archivage${suffix}.png` });

// Supprimer depuis la liste
await page.locator('.thread').nth(1).hover();
await page.locator('.thread').nth(1).getByRole('button', { name: 'Supprimer' }).click();
await page.waitForTimeout(200);
assert.equal(await page.locator('.thread').count(), 1);
assert.ok(calls.includes('POST alice@gmail.com /threads/t3/trash'));

// Conversation à plusieurs messages
threads['alice@gmail.com'] = threads['alice@gmail.com'];
await page.goto(`chrome-extension://${extensionId}/popup.html`);
await page.waitForSelector('.thread');
await page.locator('.thread', { hasText: 'Facture' }).click();
await page.waitForSelector('.message.expanded');
assert.equal(await page.locator('.message').count(), 2);
assert.equal(await page.locator('.message.expanded').count(), 1);
await page.screenshot({ path: `${OUT}/5-conversation${suffix}.png` });

// Page d'options
const options = await context.newPage();
await options.setViewportSize({ width: 900, height: 900 });
await options.goto(`chrome-extension://${extensionId}/options.html`);
await options.waitForSelector('.account-list li');
assert.equal(await options.locator('.account-list li').count(), 2);
assert.equal(await options.locator('#redirect-uri').inputValue(), `https://${extensionId}.chromiumapp.org/`);
await options.screenshot({ path: `${OUT}/6-options${suffix}.png`, fullPage: true });

// Anglais
await options.selectOption('#language', 'en');
await options.waitForSelector('text=Accounts');
await page.goto(`chrome-extension://${extensionId}/popup.html`);
await page.waitForSelector('.thread');
assert.match(await page.locator('.account-section').first().innerText(), /unread/);

assert.deepEqual(errors, [], 'aucune erreur JavaScript');
await context.close();
console.log(`OK : ${calls.length} appels à l’API simulée. Captures dans ${OUT}`);
