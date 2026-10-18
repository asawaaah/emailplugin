// Script injecté dans l'onglet actif pour y poser la bulle de notification.
//
// Il ne reçoit aucun contenu de courriel : il place seulement, dans le coin de
// la page, un cadre (iframe) qui appartient à l'extension (bubble.html). Le
// cadre est rangé dans un Shadow DOM fermé : le site ne peut pas lire son
// adresse (qui contient le jeton d'accès de la bulle). Ce script n'envoie aucun
// message au service worker.

import type { NotificationPosition } from '../lib/types';

export type ToastTabMessage =
  | { type: 'mountBubble'; src: string; position: NotificationPosition }
  | { type: 'resizeBubble'; height: number }
  | { type: 'clearToasts' };

declare global {
  interface Window {
    __apercuGmailBubble?: boolean;
  }
}

const WIDTH = 376; // 360 px de carte + 8 px de marge de chaque côté pour les ombres

function setup(): void {
  let host: HTMLElement | null = null;
  let frame: HTMLIFrameElement | null = null;
  let lastPointerSignal = 0;

  // La souris bouge sur la page, donc hors du cadre : on le prévient (au plus
  // toutes les 200 ms) pour qu'il relance son compte à rebours.
  const onPointerMove = (): void => {
    const now = Date.now();
    if (!frame?.contentWindow || now - lastPointerSignal < 200) return;
    lastPointerSignal = now;
    frame.contentWindow.postMessage({ type: 'apercu-gmail-pointer-out' }, new URL(frame.src).origin);
  };

  const mount = (src: string, position: NotificationPosition): void => {
    if (!host || !frame) {
      host = document.createElement('apercu-gmail-bubble');
      const root = host.attachShadow({ mode: 'closed' });
      frame = document.createElement('iframe');
      frame.title = 'Aperçu Gmail';
      // Invisible jusqu'à ce que le cadre annonce sa hauteur (pas de flash vide).
      frame.style.height = '0px';
      frame.style.visibility = 'hidden';
      root.append(frame);
    }
    // Styles posés par script : la CSP des sites ne les bloque pas.
    Object.assign(frame.style, {
      position: 'fixed',
      right: '8px',
      top: position === 'top-right' ? '8px' : 'auto',
      bottom: position === 'bottom-right' ? '8px' : 'auto',
      width: `${WIDTH}px`,
      maxWidth: 'calc(100vw - 16px)',
      border: '0',
      margin: '0',
      padding: '0',
      background: 'transparent',
      colorScheme: 'normal',
      zIndex: '2147483647',
    });
    if (frame.src !== src) frame.src = src;
    if (!host.isConnected) {
      document.documentElement.append(host);
      document.addEventListener('mousemove', onPointerMove, { passive: true });
    }
  };

  const clear = (): void => {
    document.removeEventListener('mousemove', onPointerMove);
    host?.remove();
    host = null;
    frame = null;
  };

  chrome.runtime.onMessage.addListener((message: ToastTabMessage, sender) => {
    if (sender.id !== chrome.runtime.id) return false;
    if (message.type === 'mountBubble') {
      mount(message.src, message.position);
    } else if (message.type === 'resizeBubble' && frame) {
      frame.style.height = `${Math.max(0, Math.min(message.height, window.innerHeight - 16))}px`;
      frame.style.visibility = 'visible';
    } else if (message.type === 'clearToasts') {
      clear();
    }
    return false;
  });
}

// Le service worker peut injecter ce fichier plusieurs fois : une seule installation.
if (!window.__apercuGmailBubble) {
  window.__apercuGmailBubble = true;
  setup();
}
