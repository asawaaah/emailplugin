// Position de la fenêtre de notification : coin de l'écran où se trouve le
// navigateur (ou l'écran principal), en bas ou en haut à droite.

import type { NotificationPosition } from './types';

export const TOAST_WIDTH = 400;
const MARGIN = 12;

interface Area {
  left: number;
  top: number;
  width: number;
  height: number;
}

export type Bounds = Area;

/** Calcul pur, couvert par les tests. */
export function cornerBounds(area: Area, position: NotificationPosition, height: number, width = TOAST_WIDTH): Bounds {
  const left = Math.round(area.left + area.width - width - MARGIN);
  const top = position === 'top-right'
    ? Math.round(area.top + MARGIN)
    : Math.round(area.top + area.height - height - MARGIN);
  return { left, top, width, height };
}

/** Zone utile (sans la barre des tâches) de l'écran du navigateur. */
export async function workArea(): Promise<Area> {
  const fallback: Area = { left: 0, top: 0, width: 1280, height: 800 };
  try {
    const displays = await chrome.system.display.getInfo();
    let display = displays.find((d) => d.isPrimary) ?? displays[0];
    const browser = await chrome.windows.getLastFocused({ windowTypes: ['normal'] }).catch(() => null);
    if (browser?.left !== undefined && browser.top !== undefined && browser.width && browser.height) {
      const cx = browser.left + browser.width / 2;
      const cy = browser.top + browser.height / 2;
      display = displays.find((d) =>
        cx >= d.bounds.left && cx < d.bounds.left + d.bounds.width && cy >= d.bounds.top && cy < d.bounds.top + d.bounds.height,
      ) ?? display;
    }
    return display?.workArea ?? fallback;
  } catch {
    return fallback;
  }
}
