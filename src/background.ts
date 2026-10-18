// Service worker : vérifie les non lus de chaque compte à intervalle régulier,
// met à jour le badge de l'icône et gère la connexion Google.

import { AuthError, addAccount, getToken, removeAccount } from './lib/auth';
import { AuthRequiredError, GmailClient } from './lib/gmail';
import { setLanguage, t } from './lib/i18n';
import type { ErrorCode, Request, Response } from './lib/messages';
import { getAccountStates, getAccounts, getSettings, saveAccountStates } from './lib/storage';
import type { AccountState } from './lib/types';

const ALARM = 'poll';
const BADGE_RED = '#d93025';
const BADGE_ORANGE = '#e37400';

async function scheduleAlarm(): Promise<void> {
  const { pollMinutes } = await getSettings();
  await chrome.alarms.clear(ALARM);
  await chrome.alarms.create(ALARM, { periodInMinutes: pollMinutes, delayInMinutes: pollMinutes });
}

function badgeText(count: number): string {
  if (count <= 0) return '';
  return count > 999 ? '999+' : String(count);
}

async function updateBadge(states: AccountState[]): Promise<void> {
  const settings = await getSettings();
  setLanguage(settings.language);
  const total = states.reduce((sum, s) => sum + (s.status === 'ok' ? s.unread ?? 0 : 0), 0);
  const needsAttention = states.some((s) => s.status !== 'ok');

  let text = badgeText(total);
  if (!text && needsAttention) text = '!';
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: needsAttention ? BADGE_ORANGE : BADGE_RED });
  await chrome.action.setBadgeTextColor({ color: '#ffffff' });

  const lines = states.map((s) =>
    s.status === 'ok' ? `${s.email} : ${s.unread ?? 0}` : `${s.email} : ${t('reauthNeeded')}`,
  );
  await chrome.action.setTitle({ title: [t('appName'), ...lines].join('\n') });
}

let polling: Promise<void> | null = null;

/** Vérifie tous les comptes (une seule vérification à la fois). */
function pollAll(): Promise<void> {
  if (!polling) {
    polling = (async () => {
      const accounts = await getAccounts();
      const previous = await getAccountStates();
      const results = await Promise.all(
        accounts.map(async ({ email }): Promise<AccountState> => {
          const client = new GmailClient((forceRefresh) => getToken(email, { forceRefresh }));
          try {
            const unread = await client.getInboxUnread();
            return { email, unread, status: 'ok', checkedAt: Date.now() };
          } catch (error) {
            const reauth = error instanceof AuthRequiredError || error instanceof AuthError;
            console.warn('Vérification impossible pour un compte', error instanceof Error ? error.name : error);
            return {
              email,
              unread: previous[email]?.unread ?? null,
              status: reauth ? 'reauth' : 'error',
              checkedAt: Date.now(),
            };
          }
        }),
      );
      await saveAccountStates(Object.fromEntries(results.map((s) => [s.email, s])));
      await updateBadge(results);
    })().finally(() => {
      polling = null;
    });
  }
  return polling;
}

function toErrorResponse(error: unknown): Response<never> {
  let code: ErrorCode = 'failed';
  if (error instanceof AuthRequiredError) code = 'auth_required';
  else if (error instanceof AuthError) code = error.code;
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, code, message };
}

async function handle(request: Request): Promise<unknown> {
  switch (request.type) {
    case 'getToken':
      return getToken(request.email, { interactive: request.interactive, forceRefresh: request.forceRefresh });
    case 'addAccount': {
      const result = await addAccount();
      await pollAll();
      return result;
    }
    case 'removeAccount':
      await removeAccount(request.email);
      await pollAll();
      return null;
    case 'refresh':
      await pollAll();
      return null;
  }
}

chrome.runtime.onMessage.addListener((request: Request, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;
  handle(request).then(
    (data) => sendResponse({ ok: true, data } satisfies Response),
    (error: unknown) => sendResponse(toErrorResponse(error)),
  );
  return true; // réponse asynchrone
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) void pollAll();
});

chrome.runtime.onInstalled.addListener((details) => {
  void scheduleAlarm().then(pollAll);
  if (details.reason === 'install') void chrome.runtime.openOptionsPage();
});

chrome.runtime.onStartup.addListener(() => {
  void scheduleAlarm().then(pollAll);
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !changes.settings) return;
  const before = changes.settings.oldValue as { pollMinutes?: number; language?: string } | undefined;
  const after = changes.settings.newValue as { pollMinutes?: number; language?: string } | undefined;
  if (before?.pollMinutes !== after?.pollMinutes) void scheduleAlarm();
  if (before?.language !== after?.language) void getAccountStates().then((s) => updateBadge(Object.values(s)));
});
