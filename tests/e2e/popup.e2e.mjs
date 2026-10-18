// Test de bout en bout : charge l'extension dans Chromium, remplace l'API Gmail
// par une fausse boîte de réception (qui réagit aux actions) et vérifie la
// liste, le filtre, le repli des comptes, leur classement, la lecture, les
// actions rapides et les notifications.
// Usage : npm run build && npm run test:e2e   (captures dans test-results/)
import { chromium } from 'playwright-core';
import { mkdtemp, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

// Laisse Playwright intercepter aussi les requêtes du service worker.
process.env.PW_EXPERIMENTAL_SERVICE_WORKER_NETWORK_EVENTS = '1';

const EXT = path.resolve('extension');
const OUT = path.resolve('test-results');
const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';
const suffix = process.env.DARK ? '-dark' : '';
await mkdir(OUT, { recursive: true });

const b64 = (s) => Buffer.from(s, 'utf-8').toString('base64url');
const now = Date.now();
const msg = (id, threadId, from, subject, snippet, minutesAgo, unread, body) => ({
  id, threadId, snippet, labelIds: unread ? ['INBOX', 'UNREAD'] : ['INBOX'],
  internalDate: String(Date.now() - minutesAgo * 60000),
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
const mailbox = {
  'alice@gmail.com': [
    { id: 't1', messages: [msg('m1', 't1', 'Marie Tremblay <marie@exemple.ca>', 'Souper vendredi ?', 'On se voit vers 18 h ? J’apporte le dessert.', 12, true)] },
    { id: 't2', messages: [msg('m2', 't2', 'Épicerie Metro <info@metro.ca>', 'Vos rabais de la semaine', 'Pommes, poulet et fromage en spécial', 300, true, newsletter)] },
    { id: 't3', messages: [
      msg('m3', 't3', 'Alice <alice@gmail.com>', 'Facture d’octobre', 'Voici la facture', 4000, false),
      msg('m4', 't3', 'Comptabilité <compta@exemple.ca>', 'Re: Facture d’octobre', 'Merci, c’est reçu et payé.', 3000, false),
    ] },
  ],
  'bob.travail@gmail.com': [
    { id: 'b1', messages: [msg('n1', 'b1', 'Julie Gagnon <julie@client.ca>', 'Réunion de lundi', 'Je confirme la réunion de lundi à 10 h.', 45, true)] },
  ],
};
const calls = [];
const isUnread = (t) => t.messages.some((m) => m.labelIds.includes('UNREAD'));

const userDataDir = await mkdtemp(path.join(tmpdir(), 'apercu-gmail-'));
const context = await chromium.launchPersistentContext(userDataDir, {
  executablePath,
  headless: true,
  args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`],
  viewport: { width: 800, height: 600 },
  colorScheme: process.env.DARK ? 'dark' : 'light',
  serviceWorkers: 'allow',
});

let [worker] = context.serviceWorkers();
if (!worker) worker = await context.waitForEvent('serviceworker');
const extensionId = new URL(worker.url()).host;
console.log('Identifiant de l’extension :', extensionId);

await context.route('https://gmail.googleapis.com/**', async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const email = (req.headers().authorization ?? '').replace('Bearer tok-', '');
  const list = mailbox[email] ?? [];
  const p = url.pathname.replace('/gmail/v1/users/me', '');
  const labels = url.searchParams.getAll('labelIds');
  calls.push(`${req.method()} ${email} ${p}`);
  const json = (body) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });

  if (p === '/labels/INBOX') return json({ id: 'INBOX', threadsUnread: list.filter(isUnread).length });
  if (p === '/threads') {
    const threads = labels.includes('UNREAD') ? list.filter(isUnread) : list;
    return json({ threads: threads.map((t) => ({ id: t.id })) });
  }
  if (p === '/messages') {
    const messages = list.flatMap((t) => t.messages).filter((m) => m.labelIds.includes('UNREAD'));
    return json({ messages: messages.map((m) => ({ id: m.id, threadId: m.threadId })) });
  }
  const mm = p.match(/^\/messages\/(\w+)$/);
  if (mm) {
    const message = list.flatMap((t) => t.messages).find((m) => m.id === mm[1]);
    return message ? json(message) : route.fulfill({ status: 404 });
  }
  const m = p.match(/^\/threads\/(\w+)(\/(modify|trash))?$/);
  if (m) {
    const index = list.findIndex((t) => t.id === m[1]);
    const thread = list[index];
    if (!thread) return route.fulfill({ status: 404 });
    if (m[3] === 'trash') list.splice(index, 1);
    if (m[3] === 'modify') {
      const { addLabelIds = [], removeLabelIds = [] } = JSON.parse(req.postData() ?? '{}');
      for (const message of thread.messages) {
        message.labelIds = [...new Set([...message.labelIds, ...addLabelIds])].filter((l) => !removeLabelIds.includes(l));
      }
      if (removeLabelIds.includes('INBOX')) list.splice(index, 1);
    }
    return json(thread);
  }
  return route.fulfill({ status: 404 });
});

// Deux comptes connectés (jetons factices valides 1 h). Les notifications
// créées sont enregistrées pour être vérifiées.
await worker.evaluate(async () => {
  globalThis.__notifications = [];
  chrome.notifications.create = (id, options) => {
    globalThis.__notifications.push({ id, ...options });
    return Promise.resolve(id);
  };
  const expiresAt = Date.now() + 3600_000;
  await chrome.storage.local.set({
    settings: { clientId: 'test.apps.googleusercontent.com', language: 'fr' },
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
const popupUrl = `chrome-extension://${extensionId}/popup.html`;
const sections = page.locator('.account-section');
const threadsOf = (i) => sections.nth(i).locator('.thread');

// 1. Par défaut : seulement les non lus
await page.goto(popupUrl);
await page.waitForSelector('.thread');
assert.equal(await threadsOf(0).count(), 2, 'alice : 2 non lus');
assert.equal(await threadsOf(1).count(), 1, 'bob : 1 non lu');
assert.equal(await page.getByRole('button', { name: 'Non lus', exact: true }).getAttribute('aria-pressed'), 'true');
await page.screenshot({ path: `${OUT}/1-non-lus${suffix}.png` });

await threadsOf(0).nth(0).hover();
await page.screenshot({ path: `${OUT}/2-survol${suffix}.png` });

// 2. Lecture de l'infolettre : marquée comme lue mais gardée dans la liste au retour
await threadsOf(0).nth(1).click();
await page.waitForSelector('.message-frame');
await page.waitForTimeout(300);
const frame = page.frameLocator('.message-frame');
assert.match(await frame.locator('body').innerText(), /Circulaire de la semaine/);
assert.doesNotMatch(await frame.locator('body').innerText(), /PIRATÉ/);
assert.equal(await page.locator('.images-banner').count(), 1);
await page.screenshot({ path: `${OUT}/3-lecture${suffix}.png` });
assert.ok(calls.includes('POST alice@gmail.com /threads/t2/modify'), 'marqué comme lu à l’ouverture');
await page.keyboard.press('Escape');
await page.waitForSelector('.list-view:not([hidden])');
assert.equal(await threadsOf(0).count(), 2);
assert.equal(await sections.nth(0).locator('.thread.unread').count(), 1);

// 3. « Marquer comme lu » depuis la liste : disparaît de la vue « Non lus »
await threadsOf(0).nth(0).hover();
await threadsOf(0).nth(0).getByRole('button', { name: 'Marquer comme lu' }).click();
await page.waitForTimeout(150);
assert.equal(await threadsOf(0).count(), 1);
assert.match(await sections.nth(0).innerText(), /Aucun non lu/);

// 4. Vue « Tous » : 3 conversations, choix mémorisé
await page.getByRole('button', { name: 'Tous', exact: true }).click();
await page.waitForFunction(() => document.querySelectorAll('.account-section:first-child .thread').length === 3);
await page.screenshot({ path: `${OUT}/4-tous${suffix}.png` });
await page.goto(popupUrl);
await page.waitForSelector('.thread');
assert.equal(await page.getByRole('button', { name: 'Tous', exact: true }).getAttribute('aria-pressed'), 'true');
assert.equal(await threadsOf(0).count(), 3);

// 5. Archiver depuis la lecture et supprimer depuis la liste
await threadsOf(0).filter({ hasText: 'rabais' }).click();
await page.waitForSelector('.message-frame');
await page.locator('.detail-toolbar').getByRole('button', { name: 'Archiver' }).click();
await page.waitForSelector('.list-view:not([hidden])');
assert.equal(await threadsOf(0).count(), 2);
await threadsOf(0).nth(0).hover();
await threadsOf(0).nth(0).getByRole('button', { name: 'Supprimer' }).click();
await page.waitForTimeout(150);
assert.equal(await threadsOf(0).count(), 1);
assert.ok(calls.includes('POST alice@gmail.com /threads/t1/trash'));

// 6. Conversation à plusieurs messages
await threadsOf(0).filter({ hasText: 'Facture' }).click();
await page.waitForSelector('.message.expanded');
assert.equal(await page.locator('.message').count(), 2);
assert.equal(await page.locator('.message.expanded').count(), 1);
await page.screenshot({ path: `${OUT}/5-conversation${suffix}.png` });
await page.keyboard.press('Escape');

// 7. Replier un compte : liste masquée, état mémorisé, nombre de non lus visible
await sections.nth(0).locator('.section-toggle').click();
await page.waitForTimeout(100);
assert.equal(await threadsOf(0).count(), 0);
assert.equal(await sections.nth(0).locator('.section-toggle').getAttribute('aria-expanded'), 'false');
await page.screenshot({ path: `${OUT}/6-replie${suffix}.png` });
await page.goto(popupUrl);
await page.waitForSelector('.thread');
assert.equal(await threadsOf(0).count(), 0, 'reste replié à la réouverture');
await sections.nth(0).locator('.section-toggle').click();
await page.waitForFunction(() => document.querySelectorAll('.account-section:first-child .thread').length > 0);

// 8. Classement des comptes dans les réglages
const options = await context.newPage();
await options.setViewportSize({ width: 900, height: 1100 });
await options.goto(`chrome-extension://${extensionId}/options.html`);
await options.waitForSelector('.account-list li');
assert.equal(await options.locator('#redirect-uri').inputValue(), `https://${extensionId}.chromiumapp.org/`);
await options.getByRole('button', { name: 'Monter bob.travail@gmail.com' }).click();
await options.waitForFunction(() => document.querySelector('.account-list li .account-email')?.textContent === 'bob.travail@gmail.com');
await options.screenshot({ path: `${OUT}/7-options${suffix}.png`, fullPage: true });
await page.goto(popupUrl);
await page.waitForSelector('.account-section');
assert.equal(await sections.nth(0).getAttribute('aria-label'), 'bob.travail@gmail.com', 'bob passe en premier');

// 9. Notifications : rien au premier passage, puis une bulle dans l'onglet ouvert
const refresh = () => page.evaluate(() => chrome.runtime.sendMessage({ type: 'refresh' }));
const setSettings = (patch) => worker.evaluate(async (p) => {
  const { settings } = await chrome.storage.local.get('settings');
  await chrome.storage.local.set({ settings: { ...settings, ...p } });
}, patch);
const systemCount = async () => (await worker.evaluate(() => globalThis.__notifications)).length;

// Faux sites web, avec une politique de sécurité très stricte (la bulle doit s'afficher quand même).
await context.route('https://site.exemple/**', (route) => route.fulfill({
  status: 200,
  contentType: 'text/html; charset=utf-8',
  headers: { 'Content-Security-Policy': "default-src 'none'; style-src 'none'; script-src 'none'" },
  body: `<!doctype html><html><body style="margin:0;font:16px sans-serif">
    <header style="background:#24292f;color:#fff;padding:16px 24px;font-size:20px">Un site quelconque — ${new URL(route.request().url()).pathname}</header>
    <main style="padding:24px;line-height:1.6">${'<p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>'.repeat(8)}</main>
  </body></html>`,
}));

// La bulle est un cadre de l'extension (bubble.html) posé dans la page.
function bubbleFrame(p) {
  return p.frames().find((f) => f.url().includes('/bubble.html') && !f.isDetached());
}
async function bubble(p) {
  const frame = bubbleFrame(p);
  if (!frame) return null;
  try {
    const cards = await frame.locator('.toast-card').count();
    if (!cards) return null;
    return { text: (await frame.locator('#app').innerText()).replace(/\s+/g, ' '), cards };
  } catch {
    return null;
  }
}
async function clickInBubble(p, cardText, buttonText) {
  const frame = bubbleFrame(p);
  const scope = cardText ? frame.locator('.toast-card', { hasText: cardText }) : frame.locator('.toast-footer');
  await scope.getByRole('button', { name: buttonText, exact: true }).click();
}
const waitFor = async (check, label, timeout = 8000) => {
  const start = Date.now();
  for (;;) {
    if (await check()) return;
    if (Date.now() - start > timeout) throw new Error(`délai dépassé : ${label}`);
    await new Promise((r) => setTimeout(r, 150));
  }
};

await refresh();
assert.equal(await systemCount(), 0, 'rien pour les courriels déjà là');

const site = await context.newPage();
site.on('pageerror', (e) => errors.push(`site: ${e.message}`));
await site.goto('https://site.exemple/article');
await site.bringToFront();
assert.equal(await bubble(site), null);

// Sécurité : un script exécuté dans un site ne peut rien obtenir du service worker.
const siteTabId = await worker.evaluate(async () => (await chrome.tabs.query({ url: 'https://site.exemple/*' }))[0]?.id);
const [{ result: stolen }] = await worker.evaluate((tabId) => chrome.scripting.executeScript({
  target: { tabId },
  func: () => chrome.runtime.sendMessage({ type: 'getToken', email: 'alice@gmail.com' }).then((r) => JSON.stringify(r ?? null), (e) => `refus: ${e.message}`),
}), siteTabId);
assert.ok(!String(stolen).includes('tok-'), `aucun jeton pour un script de page (${stolen})`);

mailbox['alice@gmail.com'].unshift({
  id: 't9',
  messages: [msg('m9', 't9', 'Hydro-Québec <factures@hydro.qc.ca>', 'Votre facture est prête', 'Montant à payer : 84,12 $. Échéance le 3 novembre.', 0, true)],
});
await refresh();
await waitFor(async () => (await bubble(site))?.cards === 1, 'bulle affichée dans l’onglet');
const first = await bubble(site);
for (const expected of ['alice@gmail.com', 'Hydro-Québec', 'Votre facture est prête', 'Montant à payer : 84,12 $']) {
  assert.ok(first.text.includes(expected), `la bulle affiche « ${expected} »`);
}
assert.equal(await systemCount(), 0, 'pas de notification du système quand la bulle s’affiche');
// Sécurité : le contenu des courriels n'entre jamais dans la page du site.
assert.equal(await site.evaluate(() => document.documentElement.outerHTML.includes('Hydro')), false, 'rien dans la page du site');
assert.equal(await site.evaluate(() => document.querySelector('apercu-gmail-bubble')?.shadowRoot ?? null), null, 'cadre caché au site');
await site.screenshot({ path: `${OUT}/8-bulle-onglet${suffix}.png` });

// Deux autres courriels, sur les deux comptes : les bulles s'empilent
mailbox['bob.travail@gmail.com'].unshift({
  id: 'b9',
  messages: [msg('n9', 'b9', 'Julie Gagnon <julie@client.ca>', 'Contrat signé', 'Bonne nouvelle : le client a signé ce matin, je t’envoie le PDF.', 0, true)],
});
mailbox['alice@gmail.com'].unshift({
  id: 't8',
  messages: [msg('m8', 't8', 'Marie Tremblay <marie@exemple.ca>', 'Photos du souper', 'Voici les photos de vendredi, on remet ça bientôt !', 0, true)],
});
await refresh();
await waitFor(async () => (await bubble(site))?.cards === 3, 'trois bulles empilées');
await site.waitForTimeout(300);
await site.screenshot({ path: `${OUT}/9-bulles-empilees${suffix}.png` });
await refresh();
assert.equal((await bubble(site)).cards, 3, 'pas de doublon');

// « Marquer comme lu » dans la bulle : appel à Gmail, bulle retirée
await clickInBubble(site, 'Hydro-Québec', 'Marquer comme lu');
await waitFor(async () => (await bubble(site))?.cards === 2, 'bulle retirée après action');
assert.ok(calls.includes('POST alice@gmail.com /threads/t9/modify'));

// La bulle suit l'onglet affiché
const site2 = await context.newPage();
await site2.goto('https://site.exemple/autre-page');
await site2.bringToFront();
await waitFor(async () => (await bubble(site2))?.cards === 2, 'la bulle passe au nouvel onglet');
await waitFor(async () => (await bubble(site)) === null, 'et quitte l’ancien');

// Page interne du navigateur : repli sur la notification du système
const internal = await context.newPage();
await internal.goto('chrome://version');
await internal.bringToFront();
await internal.waitForTimeout(300);
mailbox['bob.travail@gmail.com'].unshift({
  id: 'b8',
  messages: [msg('n8', 'b8', 'Service client <aide@boutique.ca>', 'Commande expédiée', 'Votre colis arrivera jeudi.', 0, true)],
});
await refresh();
await waitFor(async () => (await systemCount()) === 1, 'notification du système sur une page interne');
const fallback = (await worker.evaluate(() => globalThis.__notifications))[0];
assert.equal(fallback.title, 'Commande expédiée');
assert.equal(fallback.contextMessage, 'bob.travail@gmail.com · De : Service client');
await internal.close();

// « Tout fermer », puis fermeture automatique après la durée choisie
await site2.bringToFront();
await waitFor(async () => (await bubble(site2))?.cards === 2, 'bulles de retour sur l’onglet');
await clickInBubble(site2, null, 'Tout fermer');
await waitFor(async () => (await bubble(site2)) === null, 'tout fermé');
await setSettings({ notificationSeconds: 5 });
await page.evaluate(() => chrome.runtime.sendMessage({ type: 'testNotification' }));
await waitFor(async () => (await bubble(site2))?.text.includes('Notification de test'), 'bulle de test');
// Souris sur la bulle : le compte à rebours s'arrête ; il reprend quand elle s'éloigne.
await site2.mouse.move(600, 60); // bulle en haut à droite
await site2.waitForTimeout(5500);
assert.ok((await bubble(site2))?.text.includes('Notification de test'), 'en pause pendant le survol');
await site2.mouse.move(20, 20);
await waitFor(async () => (await bubble(site2)) === null, 'fermeture automatique', 10_000);

// Style « Petite fenêtre séparée » : toujours disponible
await setSettings({ notificationStyle: 'window' });
const windowPromise = context.waitForEvent('page', { predicate: (p) => p.url().endsWith('/notify.html'), timeout: 10_000 });
await page.evaluate(() => chrome.runtime.sendMessage({ type: 'testNotification' }));
const toastPage = await windowPromise;
await toastPage.waitForSelector('.toast-card');
await toastPage.waitForEvent('close', { timeout: 10_000 });

// Style « Notification du système »
await setSettings({ notificationStyle: 'system' });
mailbox['alice@gmail.com'].unshift({
  id: 't7',
  messages: [msg('m7', 't7', 'Banque <alertes@banque.ca>', 'Dépôt reçu', 'Un dépôt de 1 250,00 $ a été effectué dans votre compte.', 0, true)],
});
await refresh();
await waitFor(async () => (await systemCount()) === 2, 'notification du système');
const last = (await worker.evaluate(() => globalThis.__notifications))[1];
assert.equal(last.title, 'Dépôt reçu');
assert.equal(last.contextMessage, 'alice@gmail.com · De : Banque');
assert.equal(last.id, 'msg|alice@gmail.com|t7');
assert.equal(await bubble(site2), null);

// 10. Anglais
await options.selectOption('#language', 'en');
await options.waitForSelector('text=Accounts');
await page.goto(popupUrl);
await page.waitForSelector('.account-section');
assert.ok(await page.getByRole('button', { name: 'Unread', exact: true }).isVisible());

assert.deepEqual(errors, [], 'aucune erreur JavaScript');
await context.close();
console.log(`OK : ${calls.length} appels à l’API simulée. Captures dans ${OUT}`);
