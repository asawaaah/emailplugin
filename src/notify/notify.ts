// Petite fenêtre séparée (style « window ») : les cartes de notification dans
// une fenêtre du navigateur placée au coin de l'écran.

import { send } from '../lib/messages';
import { startToastView } from '../lib/toast-view';

const app = document.getElementById('app') as HTMLElement;

async function init(): Promise<void> {
  const windowId = (await chrome.windows.getCurrent()).id;
  await startToastView(app, {
    resize(height) {
      if (windowId === undefined) return;
      const frame = window.outerHeight - window.innerHeight; // barre de titre de la fenêtre
      void send({ type: 'placeToastWindow', windowId, height: height + frame }).catch(() => undefined);
    },
    empty() {
      window.close();
    },
    active: () => true,
  });
}

void init();
