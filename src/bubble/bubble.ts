// Bulle de notification (style « tab ») : cadre de l'extension posé dans le
// coin de l'onglet ouvert par le script toast-content.js.
//
// La page web ne voit que le cadre, jamais son contenu : les courriels sont lus
// ici, dans une page de l'extension (processus séparé). Ce cadre étant
// chargeable par n'importe quel site (web_accessible_resources), il ne montre
// rien sans le jeton à usage unique créé par le service worker pour cet onglet.

import { startToastView } from '../lib/toast-view';

const app = document.getElementById('app') as HTMLElement;

async function init(): Promise<void> {
  const token = location.hash.slice(1);
  const [{ bubbleToken, toastTabId }, tab, browser] = await Promise.all([
    chrome.storage.session.get(['bubbleToken', 'toastTabId']),
    chrome.tabs.getCurrent(),
    chrome.windows.getCurrent(),
  ]);
  if (!token || token !== bubbleToken || tab?.id === undefined || tab.id !== toastTabId) return;
  const tabId = tab.id;

  // Le navigateur est-il au premier plan ? (document.hasFocus() vaut toujours
  // false dans un cadre qui n'a pas reçu de clic.)
  let browserFocused = browser.focused;
  chrome.windows.onFocusChanged.addListener((windowId) => {
    browserFocused = windowId === browser.id;
  });

  // Bulle déplacée vers un autre onglet : ce cadre ne doit plus rien montrer.
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'session' && changes.bubbleToken && changes.bubbleToken.newValue !== token) app.replaceChildren();
  });

  const view = await startToastView(app, {
    resize(height) {
      void chrome.tabs.sendMessage(tabId, { type: 'resizeBubble', height }).catch(() => undefined);
    },
    empty() {
      void chrome.tabs.sendMessage(tabId, { type: 'clearToasts' }).catch(() => undefined);
    },
    active: () => browserFocused && document.visibilityState === 'visible',
  });

  // La page signale que la souris bouge hors du cadre (seul message accepté
  // d'elle : il ne peut que relancer le compte à rebours).
  window.addEventListener('message', (event) => {
    if (event.source === window.parent && (event.data as { type?: string } | null)?.type === 'apercu-gmail-pointer-out') view.pointerLeft();
  });
}

void init();
