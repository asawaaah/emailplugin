// Réglages des notifications instantanées : clés du relais, adresse du relais
// Cloudflare, sujet Pub/Sub, activation et test.

import { h } from '../lib/dom';
import { formatLongDate, t, type MessageKey } from '../lib/i18n';
import { send } from '../lib/messages';
import { generateRelayKeys, isPubsubTopic, normalizeRelayUrl, pubsubEndpoint } from '../lib/relay-keys';
import { getPushStatus, getRelayKeys, saveRelayKeys, saveSettings } from '../lib/storage';
import type { PushErrorCode, PushStatus, Settings } from '../lib/types';
import { card, copyField, status, textField } from './fields';

const ERROR_KEYS: Record<PushErrorCode, MessageKey> = {
  missing_config: 'pushErrMissingConfig',
  relay_unreachable: 'pushErrRelayUnreachable',
  relay_auth: 'pushErrRelayAuth',
  push_unavailable: 'pushErrPushUnavailable',
  watch_failed: 'pushErrWatchFailed',
  no_accounts: 'pushErrNoAccounts',
};

function describe(state: PushStatus): string {
  if (state.state === 'active') return t('pushActive');
  if (state.state === 'error' && state.code) return t(ERROR_KEYS[state.code]);
  return t('pushOff');
}

function statusBlock(state: PushStatus): HTMLElement {
  const lines = [h('p', { class: `push-state ${state.state}` }, describe(state))];
  if (state.state === 'error' && state.detail) lines.push(h('p', { class: 'help field-help mono' }, state.detail));
  if (state.lastPushAt) lines.push(h('p', { class: 'help field-help' }, t('pushLast', formatLongDate(state.lastPushAt))));
  return h('div', { id: 'push-status', role: 'status', 'aria-live': 'polite' }, ...lines);
}

function step(titleKey: MessageKey, ...children: Array<Node | null>): HTMLElement {
  return h('div', { class: 'push-step' }, h('h3', {}, t(titleKey)), ...children.filter((c): c is Node => c !== null));
}

export async function instantPushCard(settings: Settings, rerender: () => Promise<void>): Promise<HTMLElement> {
  const keys = await getRelayKeys();
  const pushStatus = await getPushStatus();

  // Étape 1 : clés
  const generate = h('button', { type: 'button', class: keys ? 'outlined-button' : 'filled-button' }, t(keys ? 'pushRegenerateKeys' : 'pushGenerateKeys'));
  generate.addEventListener('click', () => {
    if (keys && !window.confirm(t('pushRegenerateConfirm'))) return;
    void generateRelayKeys().then(saveRelayKeys).then(rerender);
  });
  const keyFields = keys
    ? [
        copyField('relay-secret', 'RELAY_SECRET', keys.secret),
        copyField('vapid-public', 'VAPID_PUBLIC_KEY', keys.vapidPublicKey),
        copyField('vapid-private', 'VAPID_PRIVATE_JWK', keys.vapidPrivateJwk, t('pushKeysHint')),
      ]
    : [];

  // Étape 2 : relais et Pub/Sub
  const relay = textField('relay-url', t('pushRelayUrl'), settings.relayUrl, 'https://apercu-gmail-relay.<compte>.workers.dev');
  const topic = textField('pubsub-topic', t('pushTopic'), settings.pubsubTopic, 'projects/mon-projet/topics/gmail-push');
  const saveFeedback = status();
  const save = h('button', { type: 'button', class: 'filled-button' }, t('save'));
  save.addEventListener('click', () => {
    const relayUrl = normalizeRelayUrl(relay.input.value);
    const pubsubTopic = topic.input.value.trim();
    if (!relayUrl) {
      saveFeedback.textContent = t('pushInvalidUrl');
      return;
    }
    if (!isPubsubTopic(pubsubTopic)) {
      saveFeedback.textContent = t('pushInvalidTopic');
      return;
    }
    void saveSettings({ relayUrl, pubsubTopic }).then(rerender);
  });
  const relayUrl = normalizeRelayUrl(settings.relayUrl);
  const endpoint = keys && relayUrl
    ? copyField('pubsub-endpoint', t('pushEndpoint'), await pubsubEndpoint(relayUrl, keys.secret), t('pushEndpointHint'))
    : null;

  // Étape 3 : activation
  const actionFeedback = status();
  const toggle = h('button', { type: 'button', class: settings.instantPush ? 'outlined-button' : 'filled-button' }, t(settings.instantPush ? 'pushDisable' : 'pushEnable'));
  toggle.addEventListener('click', () => {
    toggle.disabled = true;
    actionFeedback.textContent = t('pushWorking');
    void send({ type: settings.instantPush ? 'disablePush' : 'enablePush' }).finally(rerender);
  });
  const test = h('button', { type: 'button', class: 'outlined-button' }, t('pushTest'));
  test.addEventListener('click', () => {
    test.disabled = true;
    actionFeedback.textContent = t('pushTesting');
    const started = Date.now();
    void send<{ received: boolean }>({ type: 'testPush' })
      .then(({ received }) => {
        actionFeedback.textContent = received ? t('pushTestOk', ((Date.now() - started) / 1000).toFixed(1)) : t('pushTestFail');
      })
      .catch(() => {
        actionFeedback.textContent = t('pushTestFail');
      })
      .finally(() => {
        test.disabled = false;
      });
  });

  return card(
    'pushSection',
    h('p', { class: 'help' }, t('pushHelp')),
    step('pushStep1', h('div', { class: 'row' }, generate), ...keyFields),
    step('pushStep2', relay.field, topic.field, h('div', { class: 'row push-save' }, save), saveFeedback, endpoint),
    step(
      'pushStep3',
      statusBlock(pushStatus),
      h('div', { class: 'row' }, toggle, settings.instantPush ? test : null),
      actionFeedback,
      h('p', { class: 'help field-help' }, t('pushBraveHint')),
    ),
  );
}

// Mise à jour de l'état affiché quand le service worker le change (alerte reçue…).
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.pushStatus) return;
  const current = document.getElementById('push-status');
  const next = changes.pushStatus.newValue as PushStatus | undefined;
  if (current && next) current.replaceWith(statusBlock(next));
});
