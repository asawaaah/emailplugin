// Carte « Autres appareils » : exporter la configuration dans un fichier,
// l'importer sur un autre appareil, ou la laisser passer par la synchronisation
// du navigateur. Le fichier contient les clés du relais : il reste privé.

import { ConfigError, applyConfig, configFileName, currentConfig, parseConfig } from '../lib/config-transfer';
import { h } from '../lib/dom';
import { formatLongDate, t, type MessageKey } from '../lib/i18n';
import { send } from '../lib/messages';
import { saveSettings } from '../lib/storage';
import type { Settings } from '../lib/types';
import { card, status } from './fields';

const ERRORS: Record<string, MessageKey> = {
  too_large: 'importErrTooLarge',
  not_json: 'importErrInvalid',
  not_a_config: 'importErrInvalid',
  unsupported_version: 'importErrVersion',
  no_client_id: 'importErrNoClientId',
};

function download(text: string, name: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = h('a', { href: url, download: name });
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

async function importFile(file: File, settings: Settings, feedback: HTMLElement, rerender: () => Promise<void>): Promise<void> {
  if (file.size > 50_000) {
    feedback.textContent = t('importErrTooLarge');
    return;
  }
  let config;
  try {
    config = parseConfig(await file.text());
  } catch (error) {
    feedback.textContent = t(error instanceof ConfigError ? ERRORS[error.message] ?? 'importErrInvalid' : 'importErrInvalid');
    return;
  }
  // Appareil déjà configuré : on prévient avant de remplacer ses réglages.
  if (settings.clientId && !window.confirm(t('importConfirm', config.accounts.length))) return;
  await applyConfig(config);
  await send({ type: 'configImported' }).catch(() => undefined);
  await rerender();
  const next = document.getElementById('transfer-status');
  if (next) next.textContent = t('importDone', config.accounts.length);
}

export async function transferCard(settings: Settings, rerender: () => Promise<void>): Promise<HTMLElement> {
  const feedback = status();
  feedback.id = 'transfer-status';

  const exportButton = h('button', { type: 'button', class: 'outlined-button', id: 'export-config' }, t('exportConfig'));
  exportButton.disabled = !settings.clientId;
  exportButton.addEventListener('click', () => {
    void currentConfig().then((config) => {
      download(JSON.stringify(config, null, 2), configFileName());
      feedback.textContent = t('exportDone');
    });
  });

  const fileInput = h('input', { id: 'import-file', type: 'file', accept: '.json,application/json', hidden: true });
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (file) void importFile(file, settings, feedback, rerender);
  });
  const importButton = h('button', { type: 'button', class: settings.clientId ? 'outlined-button' : 'filled-button', id: 'import-config' }, t('importConfig'));
  importButton.addEventListener('click', () => fileInput.click());

  const sync = h('input', { id: 'sync-config', type: 'checkbox', checked: settings.syncConfig });
  sync.addEventListener('change', () => void saveSettings({ syncConfig: sync.checked }));

  const { importedFromSyncAt } = (await chrome.storage.local.get('importedFromSyncAt')) as { importedFromSyncAt?: number };

  return card(
    settings.clientId ? 'transferSection' : 'transferSectionFresh',
    h('p', { class: 'help' }, t(settings.clientId ? 'transferHelp' : 'transferHelpFresh')),
    h('div', { class: 'row' }, importButton, exportButton, fileInput),
    feedback,
    h('p', { class: 'help field-help transfer-warning' }, t('exportWarning')),
    h('div', { class: 'field check' }, sync, h('label', { for: 'sync-config' }, t('syncLabel'))),
    h('p', { class: 'help field-help' }, t('syncHelp')),
    importedFromSyncAt ? h('p', { class: 'help field-help' }, t('syncedFrom', formatLongDate(importedFromSyncAt))) : null,
  );
}
