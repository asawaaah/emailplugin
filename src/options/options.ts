// Page de réglages : identifiant client Google, comptes, préférences.

import { h, iconButton, avatar } from '../lib/dom';
import { setLanguage, t, type MessageKey } from '../lib/i18n';
import { RemoteError, send } from '../lib/messages';
import { MAX_THREADS_CHOICES, POLL_CHOICES, getAccounts, getSettings, saveSettings } from '../lib/storage';
import type { Language, Settings } from '../lib/types';

const app = document.getElementById('app') as HTMLElement;

function card(titleKey: MessageKey, ...children: Array<Node | null>): HTMLElement {
  return h('section', { class: 'card' }, h('h2', {}, t(titleKey)), ...children.filter((c): c is Node => c !== null));
}

function status(): HTMLElement {
  return h('p', { class: 'status', role: 'status', 'aria-live': 'polite' });
}

function copyField(id: string, label: string, value: string): HTMLElement {
  const input = h('input', { id, type: 'text', readonly: true, value, class: 'mono' });
  const button = h('button', { type: 'button', class: 'outlined-button' }, t('copy'));
  button.addEventListener('click', () => {
    void navigator.clipboard.writeText(value).then(() => {
      button.textContent = t('copied');
      window.setTimeout(() => (button.textContent = t('copy')), 1500);
    });
  });
  return h('div', { class: 'field' }, h('label', { for: id }, label), h('div', { class: 'row' }, input, button));
}

function googleCard(settings: Settings): HTMLElement {
  const input = h('input', {
    id: 'client-id',
    type: 'text',
    value: settings.clientId,
    placeholder: '1234567890-abc.apps.googleusercontent.com',
    class: 'mono',
    spellcheck: 'false',
    autocomplete: 'off',
  });
  const feedback = status();
  const save = h('button', { type: 'button', class: 'filled-button' }, t('save'));
  save.addEventListener('click', () => {
    void saveSettings({ clientId: input.value.trim() }).then(() => {
      feedback.textContent = t('saved');
      void render();
    });
  });
  return card(
    'googleSection',
    h('p', { class: 'help' }, t('googleHelp')),
    h('div', { class: 'field' }, h('label', { for: 'client-id' }, t('clientIdLabel')), h('div', { class: 'row' }, input, save)),
    feedback,
    copyField('redirect-uri', t('redirectLabel'), chrome.identity.getRedirectURL()),
    copyField('extension-id', t('extensionIdLabel'), chrome.runtime.id),
  );
}

async function accountsCard(settings: Settings): Promise<HTMLElement> {
  const accounts = await getAccounts();
  const feedback = status();
  const list = accounts.length
    ? h(
        'ul',
        { class: 'account-list' },
        ...accounts.map(({ email }) =>
          h(
            'li',
            {},
            avatar(email, email),
            h('span', { class: 'account-email' }, email),
            iconButton('close', t('remove'), () => {
              if (!window.confirm(t('removeConfirm', email))) return;
              void send({ type: 'removeAccount', email }).then(render);
            }),
          ),
        ),
      )
    : h('p', { class: 'help' }, t('noAccounts'));

  const add = h('button', { type: 'button', class: 'filled-button' }, t('addAccount'));
  add.addEventListener('click', () => {
    if (!settings.clientId) {
      feedback.textContent = t('clientIdMissing');
      return;
    }
    add.disabled = true;
    feedback.textContent = t('addingAccount');
    send<{ email: string; existed: boolean }>({ type: 'addAccount' })
      .then(async ({ email, existed }) => {
        await render();
        const next = document.querySelector('#accounts-status');
        if (next) next.textContent = existed ? t('accountExists') : t('accountAdded', email);
      })
      .catch((error: unknown) => {
        add.disabled = false;
        if (error instanceof RemoteError && error.code === 'canceled') feedback.textContent = t('authCanceled');
        else feedback.textContent = t('authFailed', error instanceof Error ? error.message : String(error));
      });
  });
  feedback.id = 'accounts-status';
  return card('accountsSection', list, h('div', { class: 'row' }, add), feedback);
}

function select<T extends string | number>(id: string, label: string, value: T, choices: ReadonlyArray<{ value: T; label: string }>, onChange: (value: T) => void): HTMLElement {
  const el = h('select', { id }, ...choices.map((c) => h('option', { value: String(c.value), selected: c.value === value }, c.label)));
  el.addEventListener('change', () => {
    const choice = choices.find((c) => String(c.value) === el.value);
    if (choice) onChange(choice.value);
  });
  return h('div', { class: 'field inline' }, h('label', { for: id }, label), el);
}

function checkbox(id: string, label: string, checked: boolean, onChange: (checked: boolean) => void): HTMLElement {
  const input = h('input', { id, type: 'checkbox', checked });
  input.addEventListener('change', () => onChange(input.checked));
  return h('div', { class: 'field check' }, input, h('label', { for: id }, label));
}

function prefsCard(settings: Settings): HTMLElement {
  return card(
    'prefsSection',
    select<Language>('language', t('languageLabel'), settings.language, [
      { value: 'fr', label: 'Français' },
      { value: 'en', label: 'English' },
    ], (language) => void saveSettings({ language }).then(render)),
    select<number>('poll', t('pollLabel'), settings.pollMinutes, POLL_CHOICES.map((m) => ({ value: m, label: t('minutes', m) })), (pollMinutes) => void saveSettings({ pollMinutes })),
    select<number>('max-threads', t('maxThreadsLabel'), settings.maxThreads, MAX_THREADS_CHOICES.map((n) => ({ value: n, label: String(n) })), (maxThreads) => void saveSettings({ maxThreads })),
    checkbox('mark-read', t('markReadLabel'), settings.markReadOnOpen, (markReadOnOpen) => void saveSettings({ markReadOnOpen })),
    checkbox('show-images', t('showImagesLabel'), settings.alwaysShowImages, (alwaysShowImages) => void saveSettings({ alwaysShowImages })),
  );
}

async function render(): Promise<void> {
  const settings = await getSettings();
  setLanguage(settings.language);
  document.title = t('optionsTitle');
  app.replaceChildren(
    h('header', { class: 'page-header' }, h('h1', {}, t('optionsTitle'))),
    googleCard(settings),
    await accountsCard(settings),
    prefsCard(settings),
    h('p', { class: 'help privacy' }, t('privacyNote')),
  );
}

void render();
