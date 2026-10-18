// Fenêtre ouverte par un clic sur l'icône : liste des conversations de chaque
// compte, lecture d'une conversation et actions rapides.

import { accountColor } from '../lib/colors';
import { avatar, h, icon, iconButton } from '../lib/dom';
import { GmailClient, gmailWebUrl } from '../lib/gmail';
import { formatLongDate, formatShortDate, setLanguage, t, unreadLabel } from '../lib/i18n';
import { RemoteError, send } from '../lib/messages';
import { buildEmailDocument, hasRemoteContent, textToHtml } from '../lib/mime';
import { getAccountStates, getAccounts, getCollapsed, getSettings, saveSettings, setCollapsed } from '../lib/storage';
import type { MessageDetail, Settings, ThreadSummary } from '../lib/types';

type SectionStatus = 'loading' | 'ok' | 'error' | 'reauth';

interface Section {
  email: string;
  status: SectionStatus;
  threads: ThreadSummary[];
  unread: number | null;
  collapsed: boolean;
  /** Couleur du compte (choisie dans les Réglages, sinon selon son rang). */
  color: string;
  el: HTMLElement;
}

type QuickAction = 'archive' | 'trash' | 'spam' | 'markRead' | 'markUnread';

let settings: Settings;
const sections = new Map<string, Section>();
const clients = new Map<string, GmailClient>();

const app = document.getElementById('app') as HTMLElement;
const listView = h('main', { class: 'list-view' });
const detailView = h('main', { class: 'detail-view', hidden: true });
const toastEl = h('div', { class: 'toast', role: 'status', 'aria-live': 'polite', hidden: true });

function clientFor(email: string): GmailClient {
  let client = clients.get(email);
  if (!client) {
    client = new GmailClient((forceRefresh) => send<string>({ type: 'getToken', email, forceRefresh }));
    clients.set(email, client);
  }
  return client;
}

function isAuthError(error: unknown): boolean {
  return (error instanceof RemoteError && (error.code === 'auth_required' || error.code === 'mismatch')) ||
    (error instanceof Error && error.name === 'AuthRequiredError');
}

let toastTimer: number | undefined;
function toast(message: string): void {
  toastEl.textContent = message;
  toastEl.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.hidden = true;
  }, 3000);
}

function openTab(url: string): void {
  void chrome.tabs.create({ url });
  window.close();
}

function refreshBadge(): void {
  send({ type: 'refresh' }).catch(() => undefined);
}

// ---------- En-tête ----------

function renderHeader(): HTMLElement {
  return h(
    'header',
    { class: 'app-header' },
    h('span', { class: 'app-logo' }, icon('mail', 22)),
    h('h1', { class: 'app-title' }, t('appName')),
    renderFilter(),
    iconButton('refresh', t('refresh'), () => void loadAll()),
    iconButton('add', t('addAccount'), () => void addAccount()),
    iconButton('settings', t('settings'), () => {
      void chrome.runtime.openOptionsPage();
      window.close();
    }),
  );
}

/** Bascule « Non lus / Tous », mémorisée dans les réglages. */
function renderFilter(): HTMLElement {
  const choice = (unreadOnly: boolean, label: string): HTMLButtonElement => {
    const button = h('button', { type: 'button', class: 'segment', 'aria-pressed': String(settings.unreadOnly === unreadOnly) }, label);
    button.addEventListener('click', () => {
      if (settings.unreadOnly === unreadOnly) return;
      settings.unreadOnly = unreadOnly;
      void saveSettings({ unreadOnly });
      for (const el of button.parentElement?.querySelectorAll('.segment') ?? []) {
        el.setAttribute('aria-pressed', String(el === button));
      }
      showList();
      void loadAll();
    });
    return button;
  };
  return h('div', { class: 'segmented', role: 'group', 'aria-label': t('filterLabel') }, choice(true, t('filterUnread')), choice(false, t('filterAll')));
}

async function addAccount(): Promise<void> {
  if (!settings.clientId) {
    void chrome.runtime.openOptionsPage();
    window.close();
    return;
  }
  toast(t('addAccountHint'));
  try {
    await send({ type: 'addAccount' });
    await init();
  } catch (error) {
    if (error instanceof RemoteError && error.code !== 'canceled') toast(t('authFailed', error.message));
  }
}

// ---------- États vides ----------

function emptyState(title: string, text: string, actionLabel: string, action: () => void): HTMLElement {
  return h(
    'div',
    { class: 'empty-state' },
    h('span', { class: 'empty-icon' }, icon('mail', 40)),
    h('h2', {}, title),
    h('p', {}, text),
    h('button', { type: 'button', class: 'filled-button', onclick: action as EventListener }, actionLabel),
  );
}

// ---------- Liste ----------

function renderSection(section: Section): void {
  const unreadText = section.unread === null ? '' : unreadLabel(section.unread);
  const toggle = h(
    'button',
    {
      type: 'button',
      class: 'section-toggle',
      'aria-expanded': String(!section.collapsed),
      title: t(section.collapsed ? 'expand' : 'collapse', section.email),
    },
    h('span', { class: 'chevron' }, icon('expandMore')),
    avatar(section.email, section.email, section.color),
    h(
      'span',
      { class: 'section-title' },
      h('span', { class: 'section-email' }, section.email),
      h('span', { class: `section-unread ${section.unread ? 'has-unread' : ''}` }, unreadText),
    ),
  );
  toggle.addEventListener('click', () => void toggleSection(section));
  const header = h(
    'div',
    { class: 'section-header' },
    toggle,
    iconButton('openInNew', t('openGmail'), () => openTab(gmailWebUrl(section.email))),
  );
  section.el.classList.toggle('collapsed', section.collapsed);

  if (section.collapsed) {
    section.el.replaceChildren(header);
    return;
  }

  let body: HTMLElement;
  switch (section.status) {
    case 'loading':
      body = h('div', { class: 'skeletons', 'aria-label': t('loading') }, ...Array.from({ length: 3 }, () => h('div', { class: 'skeleton' })));
      break;
    case 'reauth':
      body = h(
        'div',
        { class: 'section-message warning' },
        icon('warning'),
        h('span', {}, t('reauthNeeded')),
        h('button', { type: 'button', class: 'text-button', onclick: (() => void reconnect(section.email)) as EventListener }, t('reconnect')),
      );
      break;
    case 'error':
      body = h(
        'div',
        { class: 'section-message' },
        h('span', {}, t('loadError')),
        h('button', { type: 'button', class: 'text-button', onclick: (() => void loadAccount(section.email)) as EventListener }, t('retry')),
      );
      break;
    case 'ok':
      body = section.threads.length
        ? h('ul', { class: 'thread-list' }, ...section.threads.map((thread) => renderThreadRow(section, thread)))
        : h('p', { class: 'section-message muted' }, t(settings.unreadOnly ? 'noUnreadMail' : 'inboxEmpty'));
      break;
  }

  section.el.replaceChildren(header, body);
}

function renderThreadRow(section: Section, thread: ThreadSummary): HTMLElement {
  const open = (): void => void openThread(section, thread);
  const count = thread.messageCount > 1 ? h('span', { class: 'thread-count' }, String(thread.messageCount)) : null;
  const row = h(
    'li',
    {
      class: `thread ${thread.unread ? 'unread' : ''}`,
      tabindex: 0,
      role: 'button',
      'aria-label': `${thread.from.name} — ${thread.subject || t('noSubject')}`,
    },
    h(
      'div',
      { class: 'thread-top' },
      h('span', { class: 'thread-from' }, h('span', { class: 'thread-name' }, thread.from.name), count),
      h('span', { class: 'thread-date' }, formatShortDate(thread.date)),
    ),
    h('div', { class: 'thread-subject' }, thread.subject || t('noSubject')),
    thread.snippet ? h('div', { class: 'thread-snippet' }, thread.snippet) : '',
    h(
      'div',
      { class: 'thread-actions' },
      iconButton('archive', t('archive'), () => void runAction(section, thread, 'archive')),
      iconButton('delete', t('delete'), () => void runAction(section, thread, 'trash')),
      thread.unread
        ? iconButton('markRead', t('markRead'), () => void runAction(section, thread, 'markRead'))
        : iconButton('markUnread', t('markUnread'), () => void runAction(section, thread, 'markUnread')),
    ),
  );
  row.addEventListener('click', open);
  row.addEventListener('keydown', (event) => {
    if (event.target === row && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      open();
    }
  });
  return row;
}

async function loadAccount(email: string): Promise<void> {
  const section = sections.get(email);
  if (!section) return;
  section.status = 'loading';
  renderSection(section);
  const client = clientFor(email);
  try {
    // Une section repliée n'a besoin que du nombre de non lus.
    const [threads, unread] = await Promise.all([
      section.collapsed ? Promise.resolve([]) : client.listInboxThreads(settings.maxThreads, settings.unreadOnly),
      client.getInboxUnread(),
    ]);
    section.threads = threads;
    section.unread = unread;
    section.status = 'ok';
  } catch (error) {
    section.status = isAuthError(error) ? 'reauth' : 'error';
  }
  renderSection(section);
}

async function toggleSection(section: Section): Promise<void> {
  section.collapsed = !section.collapsed;
  await setCollapsed(section.email, section.collapsed);
  if (section.collapsed || section.status !== 'ok') renderSection(section);
  if (!section.collapsed) await loadAccount(section.email);
}

async function reconnect(email: string): Promise<void> {
  toast(t('addAccountHint'));
  try {
    await send({ type: 'getToken', email, interactive: true });
    await loadAccount(email);
    refreshBadge();
  } catch (error) {
    if (error instanceof RemoteError && error.code !== 'canceled') toast(t('authFailed', error.message));
  }
}

async function loadAll(): Promise<void> {
  await Promise.all([...sections.keys()].map(loadAccount));
  refreshBadge();
}

// ---------- Actions rapides ----------

/**
 * Applique l'action à l'écran avant la réponse de Gmail ; renvoie de quoi
 * l'annuler en cas d'échec. `keepRow` garde la ligne visible (conversation
 * ouverte puis marquée comme lue dans la vue « Non lus »).
 */
function applyLocally(section: Section, thread: ThreadSummary, action: QuickAction, keepRow = false): () => void {
  const index = section.threads.indexOf(thread);
  const wasUnread = thread.unread;
  const unreadBefore = section.unread;
  const isLabelChange = action === 'markRead' || action === 'markUnread';
  const removesRow = !isLabelChange || (action === 'markRead' && settings.unreadOnly && !keepRow);
  thread.unread = action === 'markUnread' ? true : action === 'markRead' ? false : wasUnread;
  if (removesRow && index >= 0) section.threads.splice(index, 1);
  let delta = 0;
  if (action === 'markUnread') delta = wasUnread ? 0 : 1;
  else if (wasUnread) delta = -1; // lu, archivé, supprimé ou spam : un non lu de moins
  if (section.unread !== null) section.unread = Math.max(0, section.unread + delta);
  renderSection(section);
  return () => {
    thread.unread = wasUnread;
    section.unread = unreadBefore;
    if (removesRow && index >= 0) section.threads.splice(index, 0, thread);
    renderSection(section);
  };
}

async function runAction(section: Section, thread: ThreadSummary, action: QuickAction): Promise<boolean> {
  const undo = applyLocally(section, thread, action);
  try {
    await clientFor(section.email)[action](thread.id);
    if (action === 'archive') toast(t('archived'));
    else if (action === 'trash') toast(t('deleted'));
    else if (action === 'spam') toast(t('spammed'));
    refreshBadge();
    return true;
  } catch (error) {
    undo();
    if (isAuthError(error)) {
      section.status = 'reauth';
      renderSection(section);
    }
    toast(t('actionError'));
    return false;
  }
}

// ---------- Lecture d'une conversation ----------

function showList(): void {
  detailView.hidden = true;
  detailView.replaceChildren();
  listView.hidden = false;
}

/** Ajuste la hauteur de l'iframe à son contenu et réduit les courriels trop larges. */
function fitFrame(frame: HTMLIFrameElement): void {
  const doc = frame.contentDocument;
  if (!doc?.documentElement) return;
  const root = doc.documentElement;
  root.style.zoom = '1';
  const available = frame.clientWidth;
  const contentWidth = root.scrollWidth;
  const zoom = contentWidth > available + 1 ? available / contentWidth : 1;
  root.style.zoom = String(zoom);
  // La hauteur mesurée tient déjà compte du zoom.
  frame.style.height = `${Math.ceil(root.getBoundingClientRect().height) + 4}px`;
}

function renderBody(message: MessageDetail): HTMLElement {
  const container = h('div', { class: 'message-body' });
  const source = message.html ?? (message.text ? textToHtml(message.text) : '');
  const remote = hasRemoteContent(source);

  const draw = (showRemote: boolean): void => {
    const frame = h('iframe', {
      class: 'message-frame',
      // Pas de allow-scripts : aucun script du courriel ne s'exécute.
      sandbox: 'allow-same-origin allow-popups allow-popups-to-escape-sandbox',
      title: message.from.name,
    });
    frame.srcdoc = buildEmailDocument(source, { showRemote });
    frame.addEventListener('load', () => {
      fitFrame(frame);
      const doc = frame.contentDocument;
      if (doc?.body) new ResizeObserver(() => fitFrame(frame)).observe(doc.body);
    });
    const banner: HTMLElement | null = remote && !showRemote
      ? h(
          'div',
          { class: 'images-banner' },
          icon('image', 18),
          h('span', {}, t('imagesHidden')),
          h('button', { type: 'button', class: 'text-button', onclick: (() => draw(true)) as EventListener }, t('showImages')),
        )
      : null;
    container.replaceChildren(...(banner ? [banner, frame] : [frame]));
  };

  draw(settings.alwaysShowImages);
  return container;
}

function renderMessage(message: MessageDetail, expanded: boolean): HTMLElement {
  const article = h('article', { class: `message ${expanded ? 'expanded' : 'collapsed'}` });
  const headerEl = h(
    'button',
    { type: 'button', class: 'message-header', 'aria-expanded': String(expanded) },
    avatar(message.from.name, message.from.email),
    h(
      'span',
      { class: 'message-meta' },
      h('span', { class: 'message-from' }, message.from.name, message.from.email !== message.from.name ? h('span', { class: 'message-email' }, ` <${message.from.email}>`) : null),
      h('span', { class: 'message-sub' }, expanded ? t('toLabel', message.to) : message.snippet),
    ),
    h('span', { class: 'message-date' }, expanded ? formatLongDate(message.date) : formatShortDate(message.date)),
  );
  const fill = (isExpanded: boolean): void => {
    article.className = `message ${isExpanded ? 'expanded' : 'collapsed'}`;
    headerEl.setAttribute('aria-expanded', String(isExpanded));
    const sub = headerEl.querySelector('.message-sub');
    if (sub) sub.textContent = isExpanded ? t('toLabel', message.to) : message.snippet;
    const date = headerEl.querySelector('.message-date');
    if (date) date.textContent = isExpanded ? formatLongDate(message.date) : formatShortDate(message.date);
    article.replaceChildren(headerEl);
    if (isExpanded) {
      article.append(renderBody(message));
      if (message.attachments.length) {
        article.append(
          h(
            'div',
            { class: 'attachments' },
            h('span', { class: 'attachments-title' }, icon('attach', 16), t('attachments')),
            h('ul', {}, ...message.attachments.map((a) => h('li', {}, a.filename))),
          ),
        );
      }
    }
  };
  headerEl.addEventListener('click', () => fill(!article.classList.contains('expanded')));
  fill(expanded);
  return article;
}

async function openThread(section: Section, thread: ThreadSummary): Promise<void> {
  const client = clientFor(section.email);
  const leave = async (action: QuickAction): Promise<void> => {
    showList();
    await runAction(section, thread, action);
  };

  const toolbar = h(
    'div',
    { class: 'detail-toolbar' },
    iconButton('back', t('back'), showList),
    h('span', { class: 'spacer' }),
    iconButton('archive', t('archive'), () => void leave('archive')),
    iconButton('delete', t('delete'), () => void leave('trash')),
    iconButton('spam', t('spam'), () => void leave('spam')),
    iconButton('markUnread', t('markUnread'), () => void leave('markUnread')),
    iconButton('openInNew', t('openGmail'), () => openTab(gmailWebUrl(section.email, thread.id))),
  );
  const content = h('div', { class: 'detail-content' }, h('div', { class: 'skeletons' }, h('div', { class: 'skeleton' }), h('div', { class: 'skeleton tall' })));
  detailView.replaceChildren(toolbar, content);
  listView.hidden = true;
  detailView.hidden = false;
  detailView.scrollTop = 0;

  try {
    const detail = await client.getThread(thread.id);
    const lastIndex = detail.messages.length - 1;
    content.replaceChildren(
      h('h2', { class: 'detail-subject' }, detail.subject || t('noSubject')),
      h('p', { class: 'detail-account' }, section.email),
      ...detail.messages.map((m, i) => renderMessage(m, i === lastIndex || m.unread)),
    );
    if (thread.unread && settings.markReadOnOpen) {
      applyLocally(section, thread, 'markRead', true);
      client.markRead(thread.id).then(refreshBadge, () => undefined);
    }
  } catch (error) {
    content.replaceChildren(
      h(
        'div',
        { class: 'section-message' },
        h('span', {}, t('loadError')),
        h('button', { type: 'button', class: 'text-button', onclick: (() => void openThread(section, thread)) as EventListener }, t('retry')),
      ),
    );
    if (isAuthError(error)) {
      section.status = 'reauth';
      renderSection(section);
    }
  }
}

// ---------- Démarrage ----------

async function init(): Promise<void> {
  settings = await getSettings();
  setLanguage(settings.language);
  document.title = t('appName');
  const accounts = await getAccounts();
  const states = await getAccountStates();
  const collapsed = new Set(await getCollapsed());

  sections.clear();
  listView.replaceChildren();
  showList();
  app.replaceChildren(renderHeader(), listView, detailView, toastEl);

  if (!settings.clientId) {
    listView.append(emptyState(t('setupTitle'), t('setupText'), t('openSettings'), () => {
      void chrome.runtime.openOptionsPage();
      window.close();
    }));
    return;
  }
  if (!accounts.length) {
    listView.append(emptyState(t('welcomeTitle'), t('welcomeText'), t('addAccount'), () => void addAccount()));
    return;
  }

  for (const [rank, account] of accounts.entries()) {
    const { email } = account;
    const el = h('section', { class: 'account-section', 'aria-label': email });
    const section: Section = {
      email,
      status: 'loading',
      threads: [],
      unread: states[email]?.unread ?? null,
      collapsed: collapsed.has(email),
      color: accountColor(account, rank),
      el,
    };
    sections.set(email, section);
    listView.append(el);
    renderSection(section);
  }
  await loadAll();
}

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !detailView.hidden) {
    event.preventDefault();
    showList();
  }
});

void init();
