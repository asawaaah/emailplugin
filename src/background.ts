// Service worker : vérifie les non lus de chaque compte à intervalle régulier,
// met à jour le badge de l'icône et gère la connexion Google.

import { AuthError, addAccount, getToken, removeAccount } from './lib/auth';
import { AuthRequiredError, GmailClient, gmailWebUrl } from './lib/gmail';
import { setLanguage, t } from './lib/i18n';
import type { ErrorCode, Request, Response } from './lib/messages';
import { MAX_INDIVIDUAL, detectNew, keepRecent, notificationId, parseNotificationId } from './lib/notify';
import {
  getAccountStates,
  getAccounts,
  getSeen,
  getSettings,
  getToasts,
  mergeToasts,
  saveAccountStates,
  saveSeen,
  saveToasts,
} from './lib/storage';
import { cornerBounds, workArea } from './lib/toast-window';
import type { AccountState, MessageMeta, SeenState, Settings, Toast } from './lib/types';

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

const ICON = 'icons/icon-128.png';

function notifyMessage(email: string, message: MessageMeta): void {
  chrome.notifications.create(notificationId(email, message.threadId), {
    type: 'basic',
    iconUrl: ICON,
    title: message.subject || t('noSubject'),
    message: message.snippet,
    // Compte qui a reçu le courriel et expéditeur, sous le titre.
    contextMessage: `${email} · ${t('notifFrom', message.from.name)}`,
    buttons: [{ title: t('markRead') }, { title: t('archive') }],
    priority: 1,
  });
}

function notifySummary(email: string, messages: MessageMeta[]): void {
  const latest = messages[0];
  chrome.notifications.create(notificationId(email, null), {
    type: 'basic',
    iconUrl: ICON,
    title: t('notifManyTitle', messages.length),
    message: latest ? t('notifManyMessage', `${latest.from.name} — ${latest.subject || t('noSubject')}`) : '',
    contextMessage: email,
    priority: 1,
  });
}

// ---------- Fenêtre de notification dessinée par l'extension ----------

/** Hauteur de départ ; la fenêtre s'ajuste ensuite à son contenu. */
const TOAST_START_HEIGHT = 190;

function toToast(email: string, message: MessageMeta): Toast {
  return {
    key: `${email}|${message.id}`,
    email,
    threadId: message.threadId,
    from: message.from,
    subject: message.subject,
    snippet: message.snippet,
    date: message.date,
  };
}

async function getToastWindowIdRaw(): Promise<number | null> {
  const { toastWindowId } = await chrome.storage.session.get('toastWindowId');
  return typeof toastWindowId === 'number' ? toastWindowId : null;
}

/** Fenêtre de notification encore ouverte, ou null. */
async function getToastWindowId(): Promise<number | null> {
  const id = await getToastWindowIdRaw();
  if (id === null) return null;
  return chrome.windows.get(id).then(() => id, () => null);
}

// Toutes les modifications de la file passent ici, l'une après l'autre : deux
// comptes qui reçoivent un courriel en même temps ne s'écrasent pas.
let toastChain: Promise<unknown> = Promise.resolve();
function serialized<T>(task: () => Promise<T>): Promise<T> {
  const run = toastChain.then(task);
  toastChain = run.catch(() => undefined);
  return run;
}

/** Ajoute des courriels à la fenêtre de notification, et l'ouvre au besoin. */
function showToasts(items: Toast[], settings: Settings): Promise<void> {
  if (!items.length) return Promise.resolve();
  return serialized(async () => {
    await saveToasts(mergeToasts(await getToasts(), items));
    if (await getToastWindowId()) return; // la fenêtre ouverte se met à jour seule
    const bounds = cornerBounds(await workArea(), settings.notificationPosition, TOAST_START_HEIGHT);
    const created = await chrome.windows.create({ url: 'notify.html', type: 'popup', focused: false, ...bounds });
    await chrome.storage.session.set({ toastWindowId: created?.id ?? null });
  });
}

function dismissToasts(keys: string[]): Promise<void> {
  const remove = new Set(keys);
  return serialized(async () => saveToasts((await getToasts()).filter((toast) => !remove.has(toast.key))));
}

chrome.windows.onRemoved.addListener((windowId) => {
  void serialized(async () => {
    if ((await getToastWindowIdRaw()) !== windowId) return;
    await chrome.storage.session.set({ toastWindowId: null });
    await saveToasts([]); // fenêtre fermée : on oublie les courriels qu'elle montrait
  });
});

/** Ouvre une conversation dans Gmail, dans la fenêtre du navigateur. */
async function openInGmail(email: string, threadId: string | null): Promise<void> {
  const url = gmailWebUrl(email, threadId ?? undefined);
  const browser = await chrome.windows.getLastFocused({ windowTypes: ['normal'] }).catch(() => null);
  if (browser?.id === undefined) {
    await chrome.windows.create({ url, focused: true });
    return;
  }
  await chrome.tabs.create({ url, windowId: browser.id, active: true });
  await chrome.windows.update(browser.id, { focused: true });
}

/** Affiche les nouveaux courriels selon le style choisi dans les réglages. */
async function announce(email: string, messages: MessageMeta[], settings: Settings): Promise<void> {
  if (settings.notificationStyle !== 'system') {
    await showToasts(messages.map((m) => toToast(email, m)), settings);
  }
  if (settings.notificationStyle !== 'window') {
    if (messages.length > MAX_INDIVIDUAL) notifySummary(email, messages);
    else messages.forEach((m) => notifyMessage(email, m));
  }
}

/** Repère les nouveaux non lus d'un compte et affiche les notifications. */
async function checkNewMessages(
  email: string,
  client: GmailClient,
  settings: Settings,
  previous: SeenState | undefined,
): Promise<SeenState> {
  const now = Date.now();
  const ids = await client.listUnreadMessageIds(20);
  const { candidates, next } = detectNew(previous, ids, now);
  if (!settings.notifications || !candidates.length || !previous) return next;

  const metas = await Promise.all(candidates.slice(0, 10).map((id) => client.getMessageMeta(id)));
  const fresh = keepRecent(metas, previous.checkedAt).sort((a, b) => b.date - a.date);
  await announce(email, fresh, settings);
  return next;
}

let polling: Promise<void> | null = null;

/** Vérifie tous les comptes (une seule vérification à la fois). */
function pollAll(): Promise<void> {
  if (!polling) {
    polling = (async () => {
      const accounts = await getAccounts();
      const previous = await getAccountStates();
      const settings = await getSettings();
      setLanguage(settings.language);
      const seen = await getSeen();
      const nextSeen: Record<string, SeenState> = {};
      const results = await Promise.all(
        accounts.map(async ({ email }): Promise<AccountState> => {
          const client = new GmailClient((forceRefresh) => getToken(email, { forceRefresh }));
          try {
            const unread = await client.getInboxUnread();
            try {
              nextSeen[email] = await checkNewMessages(email, client, settings, seen[email]);
            } catch {
              // Sans gravité : on réessaiera à la prochaine vérification.
              if (seen[email]) nextSeen[email] = seen[email];
            }
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
      // Garde l'état des comptes non vérifiés cette fois-ci (reconnexion requise).
      for (const { email } of accounts) if (!nextSeen[email] && seen[email]) nextSeen[email] = seen[email];
      await saveSeen(nextSeen);
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
    case 'testNotification': {
      const settings = await getSettings();
      setLanguage(settings.language);
      const email = (await getAccounts())[0]?.email ?? 'exemple@gmail.com';
      if (settings.notificationStyle !== 'system') {
        await showToasts([{
          key: `test|${Date.now()}`,
          email,
          threadId: null,
          from: { name: t('appName'), email: '' },
          subject: t('notifTestTitle'),
          snippet: t('notifTestMessage'),
          date: Date.now(),
        }], settings);
      }
      if (settings.notificationStyle !== 'window') {
        chrome.notifications.create(`test|${Date.now()}`, {
          type: 'basic',
          iconUrl: ICON,
          title: t('notifTestTitle'),
          message: t('notifTestMessage'),
          contextMessage: email,
        });
      }
      return null;
    }
    case 'threadAction': {
      const client = new GmailClient((forceRefresh) => getToken(request.email, { forceRefresh }));
      if (request.action === 'markRead') await client.markRead(request.threadId);
      else await client.archive(request.threadId);
      void pollAll();
      return null;
    }
    case 'dismissToasts':
      await dismissToasts(request.keys);
      return null;
    case 'openThread':
      await openInGmail(request.email, request.threadId);
      return null;
    case 'placeToastWindow': {
      // Demandé par la fenêtre de notification quand sa hauteur change.
      const settings = await getSettings();
      const bounds = cornerBounds(await workArea(), settings.notificationPosition, request.height);
      await chrome.windows.update(request.windowId, bounds);
      return null;
    }
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

// ---------- Clics sur les notifications ----------

chrome.notifications.onClicked.addListener((id) => {
  const target = parseNotificationId(id);
  chrome.notifications.clear(id);
  if (target) void openInGmail(target.email, target.threadId);
});

chrome.notifications.onButtonClicked.addListener((id, buttonIndex) => {
  const target = parseNotificationId(id);
  chrome.notifications.clear(id);
  if (!target?.threadId) return;
  const { email, threadId } = target;
  const client = new GmailClient((forceRefresh) => getToken(email, { forceRefresh }));
  const action = buttonIndex === 0 ? client.markRead(threadId) : client.archive(threadId);
  action.then(pollAll, (error: unknown) => console.warn('Action depuis la notification impossible', error instanceof Error ? error.name : error));
});
