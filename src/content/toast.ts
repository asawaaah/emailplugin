// Bulle de notification affichée dans l'onglet ouvert, dans le coin de la page.
//
// Injecté à la demande par le service worker (chrome.scripting) dans l'onglet
// actif. Tout est dessiné dans un Shadow DOM fermé : le site visité ne peut ni
// lire l'aperçu du courriel ni modifier l'apparence de la bulle. Les styles
// passent par une feuille « construite » (adoptedStyleSheets), que la politique
// de sécurité (CSP) des sites ne bloque pas.

import { accountHue, h, icon } from '../lib/dom';
import { formatShortDate, setLanguage, t } from '../lib/i18n';
import type { Language, NotificationPosition, Toast } from '../lib/types';

export interface ToastTabOptions {
  seconds: number;
  position: NotificationPosition;
  language: Language;
  /** Rang de chaque compte, pour reprendre sa couleur. */
  ranks: Record<string, number>;
}

export type ToastTabMessage =
  | { type: 'renderToasts'; toasts: Toast[]; options: ToastTabOptions }
  | { type: 'clearToasts' };

const MAX_VISIBLE = 3;
const TICK_MS = 250;

const CSS = `
:host { all: initial; }
.stack {
  position: fixed;
  right: 16px;
  z-index: 2147483647;
  display: grid;
  gap: 8px;
  width: 360px;
  max-width: calc(100vw - 32px);
  font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  color: #1f1f1f;
  --bg: #ffffff;
  --muted: #5e5e5e;
  --soft: #e3e3e3;
  --hover: #f6f8fc;
  --tonal: #d3e3fd;
  --link: #0b57d0;
}
.stack.bottom-right { bottom: 16px; }
.stack.top-right { top: 16px; }
@media (prefers-color-scheme: dark) {
  .stack { color: #e3e3e3; --bg: #2b2d30; --muted: #b0b3b8; --soft: #44474a; --hover: #35373a; --tonal: #0842a0; --link: #a8c7fa; }
}
.card {
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  padding: 10px 10px 12px 14px;
  border-radius: 12px;
  background: var(--bg);
  border: 1px solid var(--soft);
  border-left: 4px solid hsl(var(--hue) 60% 45%);
  box-shadow: 0 6px 24px rgb(0 0 0 / .18), 0 1px 3px rgb(0 0 0 / .12);
  cursor: pointer;
}
.card.new { animation: enter .2s ease-out; }
.card:hover { background: var(--hover); }
.card:focus-visible, button:focus-visible { outline: 2px solid var(--link); outline-offset: 1px; }
.card.busy { opacity: .6; pointer-events: none; }
@keyframes enter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
.head { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.account {
  flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 600; color: hsl(var(--hue) 60% 38%);
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
@media (prefers-color-scheme: dark) { .account { color: hsl(var(--hue) 70% 72%); } }
.dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: hsl(var(--hue) 60% 45%); }
.time { flex: none; font-size: 12px; color: var(--muted); }
.close {
  display: grid; place-items: center; width: 28px; height: 28px; margin: -4px -4px -4px 0; padding: 0;
  border: 0; border-radius: 50%; background: transparent; color: var(--muted); cursor: pointer;
}
.close:hover { background: var(--soft); color: inherit; }
.from, .subject { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.from { font-weight: 700; }
.subject { font-weight: 500; }
.snippet {
  margin-top: 2px; color: var(--muted); font-size: 13px;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.actions { display: flex; flex-wrap: wrap; gap: 4px; margin: 10px 0 0 -4px; }
.actions button {
  min-height: 32px; padding: 0 12px; border: 0; border-radius: 999px;
  font: 500 13px/1 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; cursor: pointer;
  background: transparent; color: var(--link);
}
.actions button:hover { background: var(--soft); }
.actions button.primary { background: var(--tonal); color: inherit; }
.error:empty { display: none; }
.error { margin-top: 6px; font-size: 12px; color: #d93025; }
.progress { position: absolute; left: 0; right: 0; bottom: 0; height: 3px; background: var(--soft); }
.progress span {
  display: block; height: 100%; background: hsl(var(--hue) 60% 45%); transform-origin: left;
  animation: countdown linear forwards;
}
.stack.paused .progress span { animation-play-state: paused; }
@keyframes countdown { from { transform: scaleX(1); } to { transform: scaleX(0); } }
.footer {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 6px 6px 6px 12px; border-radius: 999px; background: var(--bg); border: 1px solid var(--soft);
  box-shadow: 0 2px 8px rgb(0 0 0 / .12); font-size: 13px; color: var(--muted);
}
.footer button { border: 0; background: transparent; color: var(--link); font: 500 13px/1 system-ui, sans-serif; padding: 8px 10px; border-radius: 999px; cursor: pointer; }
.footer button:hover { background: var(--soft); }
.icon { display: block; }
@media (prefers-reduced-motion: reduce) { .card.new { animation: none; } }
`;

declare global {
  interface Window {
    __apercuGmailToasts?: boolean;
  }
}

function setup(): void {
  const host = document.createElement('apercu-gmail-toasts');
  const root = host.attachShadow({ mode: 'closed' });
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(CSS);
  root.adoptedStyleSheets = [sheet];
  const stack = h('div', { class: 'stack bottom-right', role: 'region', 'aria-live': 'polite' });
  root.append(stack);

  let toasts: Toast[] = [];
  let options: ToastTabOptions = { seconds: 8, position: 'bottom-right', language: 'fr', ranks: {} };
  const deadlines = new Map<string, number>();
  /** Bulles déjà dessinées : seules les nouvelles s'animent à l'apparition. */
  const shown = new Set<string>();
  let lastTick = Date.now();
  let timer: number | undefined;

  /**
   * Le compte à rebours ne tourne que si la page est visible, au premier plan et
   * non survolée. Le survol est lu en direct (:hover) : une bulle fermée sous la
   * souris ne laisse pas de « survol » fantôme qui bloquerait les suivantes.
   */
  const isRunning = (): boolean =>
    host.isConnected && !stack.matches(':hover') && document.visibilityState === 'visible' && document.hasFocus();

  const send = (message: unknown): Promise<unknown> => chrome.runtime.sendMessage(message);

  const dismiss = (keys: string[]): void => {
    const remove = new Set(keys);
    keys.forEach((k) => deadlines.delete(k));
    toasts = toasts.filter((x) => !remove.has(x.key));
    render();
    void send({ type: 'dismissToasts', keys }).catch(() => undefined);
  };

  const act = async (toast: Toast, card: HTMLElement, action: 'open' | 'markRead' | 'archive'): Promise<void> => {
    card.classList.add('busy');
    try {
      const response = (action === 'open'
        ? await send({ type: 'openThread', email: toast.email, threadId: toast.threadId })
        : await send({ type: 'threadAction', email: toast.email, threadId: toast.threadId, action })) as { ok?: boolean } | undefined;
      if (!response?.ok) throw new Error('failed');
      dismiss([toast.key]);
    } catch {
      card.classList.remove('busy');
      const error = card.querySelector('.error');
      if (error) error.textContent = t('actionError');
    }
  };

  const relativeTime = (date: number): string => {
    const minutes = Math.floor((Date.now() - date) / 60000);
    if (minutes < 1) return t('justNow');
    if (minutes < 60) return t('minutesAgo', minutes);
    return formatShortDate(date);
  };

  const button = (label: string, onClick: () => void, primary = false): HTMLButtonElement => {
    const el = h('button', { type: 'button', class: primary ? 'primary' : '' }, label);
    el.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });
    return el;
  };

  const renderCard = (toast: Toast): HTMLElement => {
    const card = h('article', { class: shown.has(toast.key) ? 'card' : 'card new', tabindex: 0, 'aria-label': `${toast.email} — ${toast.subject || t('noSubject')}` });
    card.style.setProperty('--hue', String(accountHue(options.ranks[toast.email] ?? 0)));
    const close = h('button', { type: 'button', class: 'close', title: t('dismiss'), 'aria-label': t('dismiss') }, icon('close', 18));
    close.addEventListener('click', (event) => {
      event.stopPropagation();
      dismiss([toast.key]);
    });
    card.append(
      h('div', { class: 'head' }, h('span', { class: 'account' }, h('span', { class: 'dot' }), toast.email), h('span', { class: 'time' }, relativeTime(toast.date)), close),
      h('div', { class: 'from' }, toast.from.name),
      h('div', { class: 'subject' }, toast.subject || t('noSubject')),
      toast.snippet ? h('div', { class: 'snippet' }, toast.snippet) : '',
      toast.threadId
        ? h(
            'div',
            { class: 'actions' },
            button(t('toastOpen'), () => void act(toast, card, 'open'), true),
            button(t('markRead'), () => void act(toast, card, 'markRead')),
            button(t('archive'), () => void act(toast, card, 'archive')),
          )
        : '',
      h('div', { class: 'error', role: 'alert' }),
    );
    const deadline = deadlines.get(toast.key);
    if (deadline !== undefined && options.seconds > 0) {
      const total = options.seconds * 1000;
      const remaining = Math.max(0, deadline - Date.now());
      const bar = h('span', {});
      bar.style.animationDuration = `${total}ms`;
      bar.style.animationDelay = `-${total - remaining}ms`;
      card.append(h('div', { class: 'progress' }, bar));
    }
    if (toast.threadId) {
      card.addEventListener('click', () => void act(toast, card, 'open'));
      card.addEventListener('keydown', (event) => {
        if (event.target === card && event.key === 'Enter') void act(toast, card, 'open');
      });
    }
    return card;
  };

  const render = (): void => {
    if (!toasts.length) {
      host.remove();
      window.clearInterval(timer);
      timer = undefined;
      return;
    }
    setLanguage(options.language);
    stack.className = `stack ${options.position}${isRunning() ? '' : ' paused'}`;
    const visible = toasts.slice(0, MAX_VISIBLE);
    if (options.seconds > 0) {
      for (const toast of visible) if (!deadlines.has(toast.key)) deadlines.set(toast.key, Date.now() + options.seconds * 1000);
    }
    const hidden = toasts.length - visible.length;
    const cards = visible.map(renderCard);
    visible.forEach((toast) => shown.add(toast.key));
    // En haut à droite, le plus récent en haut ; en bas à droite, le plus récent en bas (près du coin).
    if (options.position === 'bottom-right') cards.reverse();
    const footer = toasts.length > 1
      ? h(
          'div',
          { class: 'footer' },
          h('span', {}, hidden > 0 ? (hidden === 1 ? t('toastMoreOne') : t('toastMore', hidden)) : ''),
          button(t('dismissAll'), () => dismiss(toasts.map((x) => x.key))),
        )
      : null;
    const items: HTMLElement[] = footer ? (options.position === 'bottom-right' ? [footer, ...cards] : [...cards, footer]) : cards;
    stack.replaceChildren(...items);
    if (!host.isConnected) document.documentElement.append(host);
    if (timer === undefined) {
      lastTick = Date.now();
      timer = window.setInterval(tick, TICK_MS);
    }
  };

  function tick(): void {
    const now = Date.now();
    const running = isRunning();
    stack.classList.toggle('paused', !running);
    if (!running || options.seconds <= 0) {
      // En pause : on repousse les échéances du temps écoulé.
      for (const [key, deadline] of deadlines) deadlines.set(key, deadline + (now - lastTick));
    } else {
      const expired = [...deadlines.entries()].filter(([, deadline]) => deadline <= now).map(([key]) => key);
      if (expired.length) dismiss(expired);
    }
    lastTick = now;
  }

  stack.addEventListener('mouseenter', () => stack.classList.add('paused'));

  chrome.runtime.onMessage.addListener((message: ToastTabMessage) => {
    if (message.type === 'renderToasts') {
      options = message.options;
      toasts = message.toasts;
      for (const key of deadlines.keys()) if (!toasts.some((x) => x.key === key)) deadlines.delete(key);
      render();
    } else if (message.type === 'clearToasts') {
      toasts = [];
      deadlines.clear();
      render();
    }
    return false;
  });
}

// Le service worker peut injecter ce fichier plusieurs fois : une seule installation.
if (!window.__apercuGmailToasts) {
  window.__apercuGmailToasts = true;
  setup();
}
