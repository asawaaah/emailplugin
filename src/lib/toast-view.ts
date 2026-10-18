// Affichage des cartes de notification (un nouveau courriel par carte), commun
// à la bulle dans l'onglet (bubble.html, cadre de l'extension) et à la petite
// fenêtre séparée (notify.html). Ces deux pages appartiennent à l'extension :
// le contenu des courriels n'entre jamais dans les pages web visitées.

import { accountHue, h, iconButton } from './dom';
import { formatShortDate, setLanguage, t } from './i18n';
import { send } from './messages';
import { getAccounts, getSettings, getToasts } from './storage';
import type { Settings, Toast } from './types';

const MAX_VISIBLE = 3;
const TICK_MS = 250;

export interface ToastViewHost {
  /** Hauteur du contenu changée (px). */
  resize(height: number): void;
  /** Plus aucune carte à afficher. */
  empty(): void;
  /** Le compte à rebours peut-il tourner (page visible, navigateur au premier plan) ? */
  active(): boolean;
}

export interface ToastView {
  /** Signal extérieur : la souris n'est plus sur les cartes (la bulle dans un cadre). */
  pointerLeft(): void;
}

export async function startToastView(app: HTMLElement, host: ToastViewHost): Promise<ToastView> {
  const settings: Settings = await getSettings();
  setLanguage(settings.language);
  document.title = t('toastTitle');
  const ranks = new Map((await getAccounts()).map((a, i) => [a.email, i]));
  let toasts: Toast[] = await getToasts();
  /** Échéance de fermeture de chaque carte affichée (ms). */
  const deadlines = new Map<string, number>();
  /** Cartes déjà dessinées : seules les nouvelles s'animent à l'apparition. */
  const shown = new Set<string>();
  let lastHeight = 0;
  let lastTick = Date.now();
  // Survol suivi par les événements de la souris : une carte fermée sous la souris
  // ne laisse pas de survol fantôme, et la sortie du cadre est signalée de l'extérieur.
  let hovered = false;
  document.documentElement.addEventListener('mouseover', () => {
    hovered = true;
  });
  document.documentElement.addEventListener('mouseout', (event) => {
    if (!event.relatedTarget) hovered = false;
  });
  // En bas à droite, la carte la plus récente se place près du coin.
  const newestLast = settings.notificationPosition === 'bottom-right';

  const relativeTime = (date: number): string => {
    const minutes = Math.floor((Date.now() - date) / 60000);
    if (minutes < 1) return t('justNow');
    if (minutes < 60) return t('minutesAgo', minutes);
    return formatShortDate(date);
  };

  const dismiss = (keys: string[]): void => {
    const remove = new Set(keys);
    keys.forEach((k) => deadlines.delete(k));
    toasts = toasts.filter((toast) => !remove.has(toast.key));
    render();
    // Le service worker tient la file : il évite d'écraser un courriel arrivé entre-temps.
    void send({ type: 'dismissToasts', keys }).catch(() => undefined);
  };

  const act = async (toast: Toast, card: HTMLElement, action: 'open' | 'markRead' | 'archive'): Promise<void> => {
    card.classList.add('busy');
    try {
      if (action === 'open') await send({ type: 'openThread', email: toast.email, threadId: toast.threadId });
      else if (toast.threadId) await send({ type: 'threadAction', email: toast.email, threadId: toast.threadId, action });
      dismiss([toast.key]);
    } catch {
      card.classList.remove('busy');
      const error = card.querySelector('.toast-error');
      if (error) error.textContent = t('actionError');
    }
  };

  const actionButton = (label: string, className: string, onClick: () => void): HTMLButtonElement => {
    const button = h('button', { type: 'button', class: className }, label);
    button.addEventListener('click', (event) => {
      event.stopPropagation();
      onClick();
    });
    return button;
  };

  const renderCard = (toast: Toast): HTMLElement => {
    const card = h('article', {
      class: shown.has(toast.key) ? 'toast-card' : 'toast-card new',
      tabindex: 0,
      'aria-label': `${toast.email} — ${toast.subject || t('noSubject')}`,
    });
    card.style.setProperty('--hue', String(accountHue(ranks.get(toast.email) ?? 0)));

    const deadline = deadlines.get(toast.key);
    let progress: HTMLElement | null = null;
    if (deadline !== undefined && settings.notificationSeconds > 0) {
      const total = settings.notificationSeconds * 1000;
      const remaining = Math.max(0, deadline - Date.now());
      const bar = h('span', {});
      bar.style.animationDuration = `${total}ms`;
      bar.style.animationDelay = `-${total - remaining}ms`;
      progress = h('div', { class: 'toast-progress' }, bar);
    }

    card.append(
      h(
        'div',
        { class: 'toast-head' },
        h('span', { class: 'toast-account' }, h('span', { class: 'account-dot', 'aria-hidden': 'true' }), toast.email),
        h('span', { class: 'toast-time' }, relativeTime(toast.date)),
        iconButton('close', t('dismiss'), () => dismiss([toast.key]), 'small'),
      ),
      h('div', { class: 'toast-from' }, toast.from.name),
      h('div', { class: 'toast-subject' }, toast.subject || t('noSubject')),
      toast.snippet ? h('div', { class: 'toast-snippet' }, toast.snippet) : '',
      toast.threadId
        ? h(
            'div',
            { class: 'toast-actions' },
            actionButton(t('toastOpen'), 'tonal-button', () => void act(toast, card, 'open')),
            actionButton(t('markRead'), 'text-button', () => void act(toast, card, 'markRead')),
            actionButton(t('archive'), 'text-button', () => void act(toast, card, 'archive')),
          )
        : '',
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
  };

  const measure = (): void => {
    const height = Math.ceil(app.getBoundingClientRect().height);
    if (Math.abs(height - lastHeight) < 2) return;
    lastHeight = height;
    host.resize(height);
  };

  function render(): void {
    if (!toasts.length) {
      app.replaceChildren();
      host.empty();
      return;
    }
    const visible = toasts.slice(0, MAX_VISIBLE);
    if (settings.notificationSeconds > 0) {
      for (const toast of visible) if (!deadlines.has(toast.key)) deadlines.set(toast.key, Date.now() + settings.notificationSeconds * 1000);
    }
    const hidden = toasts.length - visible.length;
    const cards = visible.map(renderCard);
    visible.forEach((toast) => shown.add(toast.key));
    if (newestLast) cards.reverse();
    const footer = toasts.length > 1
      ? h(
          'div',
          { class: 'toast-footer' },
          h('span', {}, hidden > 0 ? (hidden === 1 ? t('toastMoreOne') : t('toastMore', hidden)) : ''),
          actionButton(t('dismissAll'), 'text-button', () => dismiss(toasts.map((x) => x.key))),
        )
      : null;
    const items: HTMLElement[] = footer ? (newestLast ? [footer, ...cards] : [...cards, footer]) : cards;
    app.replaceChildren(...items);
    // Mesure immédiate : un cadre encore caché ne reçoit pas d'images d'animation
    // (requestAnimationFrame y est suspendu par le navigateur).
    measure();
  }

  function tick(): void {
    const now = Date.now();
    const running = toasts.length > 0 && !hovered && host.active();
    document.body.classList.toggle('paused', !running);
    if (!running || settings.notificationSeconds <= 0) {
      for (const [key, deadline] of deadlines) deadlines.set(key, deadline + (now - lastTick));
    } else {
      const expired = [...deadlines.entries()].filter(([, deadline]) => deadline <= now).map(([key]) => key);
      if (expired.length) dismiss(expired);
    }
    lastTick = now;
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'session' || !changes.toasts) return;
    toasts = (changes.toasts.newValue as Toast[] | undefined) ?? [];
    for (const key of deadlines.keys()) if (!toasts.some((x) => x.key === key)) deadlines.delete(key);
    render();
  });

  render();
  window.setInterval(tick, TICK_MS);
  return {
    pointerLeft() {
      hovered = false;
    },
  };
}
