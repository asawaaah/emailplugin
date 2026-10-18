// Fenêtre de notification dessinée par l'extension : une carte par nouveau
// courriel (compte destinataire, expéditeur, objet, aperçu) avec actions
// rapides. Se ferme seule quand toutes les cartes ont expiré ou été fermées.

import { accountHue, h, iconButton } from '../lib/dom';
import { formatShortDate, setLanguage, t } from '../lib/i18n';
import { send } from '../lib/messages';
import { getAccounts, getSettings, getToasts } from '../lib/storage';
import type { Settings, Toast } from '../lib/types';

const MAX_VISIBLE = 3;

const app = document.getElementById('app') as HTMLElement;
let settings: Settings;
let toasts: Toast[] = [];
let windowId: number | undefined;
let lastHeight = 0;
/** Échéance de fermeture de chaque carte affichée (ms). */
const deadlines = new Map<string, number>();
let pausedAt: number | null = null;
/** Rang de chaque compte, pour reprendre sa couleur du popup. */
let ranks = new Map<string, number>();

function relativeTime(date: number): string {
  const minutes = Math.floor((Date.now() - date) / 60000);
  if (minutes < 1) return t('justNow');
  if (minutes < 60) return t('minutesAgo', minutes);
  return formatShortDate(date);
}

async function dismiss(keys: string[]): Promise<void> {
  const remove = new Set(keys);
  keys.forEach((k) => deadlines.delete(k));
  toasts = toasts.filter((toast) => !remove.has(toast.key));
  render();
  // Le service worker tient la file : il évite d'écraser un courriel arrivé entre-temps.
  await send({ type: 'dismissToasts', keys }).catch(() => undefined);
}

async function act(toast: Toast, card: HTMLElement, action: 'open' | 'markRead' | 'archive'): Promise<void> {
  card.classList.add('busy');
  try {
    if (action === 'open') await send({ type: 'openThread', email: toast.email, threadId: toast.threadId });
    else if (toast.threadId) await send({ type: 'threadAction', email: toast.email, threadId: toast.threadId, action });
    await dismiss([toast.key]);
  } catch {
    card.classList.remove('busy');
    const error = card.querySelector('.toast-error');
    if (error) error.textContent = t('actionError');
  }
}

function renderCard(toast: Toast): HTMLElement {
  const card = h('article', { class: 'toast-card', tabindex: 0, 'aria-label': `${toast.email} — ${toast.subject || t('noSubject')}` });
  card.style.setProperty('--hue', String(accountHue(ranks.get(toast.email) ?? 0)));

  const actions = toast.threadId
    ? h(
        'div',
        { class: 'toast-actions' },
        h('button', { type: 'button', class: 'tonal-button', onclick: ((e: Event) => { e.stopPropagation(); void act(toast, card, 'open'); }) as EventListener }, t('toastOpen')),
        h('button', { type: 'button', class: 'text-button', onclick: ((e: Event) => { e.stopPropagation(); void act(toast, card, 'markRead'); }) as EventListener }, t('markRead')),
        h('button', { type: 'button', class: 'text-button', onclick: ((e: Event) => { e.stopPropagation(); void act(toast, card, 'archive'); }) as EventListener }, t('archive')),
      )
    : null;

  const deadline = deadlines.get(toast.key);
  let progress: HTMLElement | null = null;
  if (deadline !== undefined && settings.notificationSeconds > 0) {
    const total = settings.notificationSeconds * 1000;
    const elapsed = Math.max(0, total - (deadline - (pausedAt ?? Date.now())));
    progress = h('div', { class: 'toast-progress' }, h('span', {}));
    const bar = progress.firstElementChild as HTMLElement;
    bar.style.animationDuration = `${total}ms`;
    bar.style.animationDelay = `-${elapsed}ms`;
  }

  card.append(
    h(
      'div',
      { class: 'toast-head' },
      h('span', { class: 'toast-account' }, h('span', { class: 'account-dot', 'aria-hidden': 'true' }), toast.email),
      h('span', { class: 'toast-time' }, relativeTime(toast.date)),
      iconButton('close', t('dismiss'), () => void dismiss([toast.key]), 'small'),
    ),
    h('div', { class: 'toast-from' }, toast.from.name),
    h('div', { class: 'toast-subject' }, toast.subject || t('noSubject')),
    toast.snippet ? h('div', { class: 'toast-snippet' }, toast.snippet) : '',
    actions ?? '',
    h('div', { class: 'toast-error', role: 'alert' }),
    progress ?? '',
  );
  if (toast.threadId) {
    card.addEventListener('click', () => void act(toast, card, 'open'));
    card.addEventListener('keydown', (event) => {
      if (event.target === card && event.key === 'Enter') void act(toast, card, 'open');
    });
  }
  return card;
}

/** Ajuste la hauteur de la fenêtre à son contenu (le service worker la replace dans le coin). */
function resize(): void {
  if (windowId === undefined) return;
  const frame = window.outerHeight - window.innerHeight; // barre de titre de la fenêtre
  const height = Math.ceil(app.getBoundingClientRect().height) + frame;
  if (Math.abs(height - lastHeight) < 3) return;
  lastHeight = height;
  void send({ type: 'placeToastWindow', windowId, height }).catch(() => undefined);
}

function render(): void {
  if (!toasts.length) {
    window.close();
    return;
  }
  const visible = toasts.slice(0, MAX_VISIBLE);
  if (settings.notificationSeconds > 0) {
    const now = pausedAt ?? Date.now();
    for (const toast of visible) if (!deadlines.has(toast.key)) deadlines.set(toast.key, now + settings.notificationSeconds * 1000);
  }
  const hidden = toasts.length - visible.length;
  const footer = h(
    'div',
    { class: 'toast-footer' },
    h('span', {}, hidden > 0 ? (hidden === 1 ? t('toastMoreOne') : t('toastMore', hidden)) : ''),
    toasts.length > 1
      ? h('button', { type: 'button', class: 'text-button', onclick: (() => void dismiss(toasts.map((x) => x.key))) as EventListener }, t('dismissAll'))
      : '',
  );
  app.replaceChildren(...visible.map(renderCard), ...(hidden > 0 || toasts.length > 1 ? [footer] : []));
  requestAnimationFrame(resize);
}

function tick(): void {
  if (pausedAt !== null || settings.notificationSeconds <= 0) return;
  const now = Date.now();
  const expired = [...deadlines.entries()].filter(([, deadline]) => deadline <= now).map(([key]) => key);
  if (expired.length) void dismiss(expired);
}

// Survol : le temps s'arrête, pour laisser le temps de lire.
document.addEventListener('mouseenter', () => {
  pausedAt = Date.now();
  document.body.classList.add('paused');
});
document.addEventListener('mouseleave', () => {
  if (pausedAt !== null) {
    const pause = Date.now() - pausedAt;
    for (const [key, deadline] of deadlines) deadlines.set(key, deadline + pause);
  }
  pausedAt = null;
  document.body.classList.remove('paused');
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'session' || !changes.toasts) return;
  toasts = (changes.toasts.newValue as Toast[] | undefined) ?? [];
  for (const key of deadlines.keys()) if (!toasts.some((x) => x.key === key)) deadlines.delete(key);
  render();
});

async function init(): Promise<void> {
  settings = await getSettings();
  setLanguage(settings.language);
  document.title = t('toastTitle');
  windowId = (await chrome.windows.getCurrent()).id;
  ranks = new Map((await getAccounts()).map((a, i) => [a.email, i]));
  toasts = await getToasts();
  render();
  window.setInterval(tick, 250);
}

void init();
