// src/lib/mime.ts
function header(headers, name) {
  const lower = name.toLowerCase();
  return headers?.find((h) => h.name.toLowerCase() === lower)?.value ?? "";
}
function parsePerson(raw) {
  const value = raw.trim();
  const match = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const email = (match[2] ?? "").trim();
    const name = (match[1] ?? "").trim();
    return { name: name || email, email };
  }
  return { name: value, email: value };
}
function decodeBase64Url(data) {
  const base64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder("utf-8").decode(bytes);
}
function extractBody(payload) {
  const result = { html: null, text: null, attachments: [] };
  if (!payload) return result;
  const visit = (part) => {
    const mime = (part.mimeType ?? "").toLowerCase();
    const disposition = header(part.headers, "Content-Disposition").toLowerCase();
    const isAttachment = Boolean(part.filename) && (disposition.startsWith("attachment") || Boolean(part.body?.attachmentId));
    if (isAttachment) {
      result.attachments.push({
        filename: part.filename ?? "",
        mimeType: part.mimeType ?? "",
        size: part.body?.size ?? 0
      });
      return;
    }
    if (part.parts?.length) {
      part.parts.forEach(visit);
      return;
    }
    const data = part.body?.data;
    if (!data) return;
    if (mime === "text/html" && result.html === null) result.html = decodeBase64Url(data);
    else if (mime === "text/plain" && result.text === null) result.text = decodeBase64Url(data);
  };
  visit(payload);
  return result;
}

// src/lib/gmail.ts
var API = "https://gmail.googleapis.com/gmail/v1/users/me";
var AuthRequiredError = class extends Error {
  constructor(message = "auth_required") {
    super(message);
    this.name = "AuthRequiredError";
  }
};
var GmailApiError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "GmailApiError";
  }
  status;
};
async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
function gmailWebUrl(email, threadId) {
  const base = `https://mail.google.com/mail/?authuser=${encodeURIComponent(email)}`;
  return threadId ? `${base}#inbox/${threadId}` : base;
}
function toSummary(thread) {
  const messages = thread.messages ?? [];
  const first = messages[0];
  const last = messages[messages.length - 1];
  return {
    id: thread.id,
    from: parsePerson(header(last?.payload?.headers, "From")),
    subject: header(first?.payload?.headers, "Subject"),
    snippet: decodeEntities(last?.snippet ?? thread.snippet ?? ""),
    date: Number(last?.internalDate ?? 0),
    unread: messages.some((m) => m.labelIds?.includes("UNREAD")),
    messageCount: messages.length
  };
}
function toMessageDetail(message) {
  const headers = message.payload?.headers;
  const body = extractBody(message.payload);
  return {
    id: message.id,
    from: parsePerson(header(headers, "From")),
    to: header(headers, "To"),
    date: Number(message.internalDate ?? 0),
    snippet: decodeEntities(message.snippet ?? ""),
    unread: Boolean(message.labelIds?.includes("UNREAD")),
    html: body.html,
    text: body.text,
    attachments: body.attachments
  };
}
function decodeEntities(value) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, code) => {
    if (code[0] === "#") {
      const n = code[1]?.toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : match;
    }
    return named[code.toLowerCase()] ?? match;
  });
}
var GmailClient = class {
  constructor(getToken2) {
    this.getToken = getToken2;
  }
  getToken;
  async request(path, init = {}) {
    const send = async (forceRefresh) => {
      const token = await this.getToken(forceRefresh);
      return fetch(`${API}${path}`, {
        ...init,
        headers: { ...init.headers ?? {}, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      });
    };
    let response = await send(false);
    if (response.status === 401) response = await send(true);
    if (response.status === 401) throw new AuthRequiredError();
    if (!response.ok) throw new GmailApiError(response.status, `Gmail API ${response.status}`);
    if (response.status === 204) return void 0;
    return await response.json();
  }
  async getProfileEmail() {
    const profile = await this.request("/profile");
    return profile.emailAddress;
  }
  /** Nombre de conversations non lues dans la boîte de réception. */
  async getInboxUnread() {
    const label = await this.request("/labels/INBOX");
    return label.threadsUnread ?? 0;
  }
  /** Conversations de la boîte de réception ; seulement les non lues avec `unreadOnly`. */
  async listInboxThreads(max, unreadOnly = false) {
    const labels = unreadOnly ? "labelIds=INBOX&labelIds=UNREAD" : "labelIds=INBOX";
    const list = await this.request(`/threads?${labels}&maxResults=${max}`);
    const ids = (list.threads ?? []).map((t2) => t2.id);
    const query = "format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date";
    const threads = await mapLimit(ids, 5, (id) => this.request(`/threads/${id}?${query}`));
    return threads.map(toSummary);
  }
  /** Identifiants des derniers messages non lus de la boîte de réception. */
  async listUnreadMessageIds(max) {
    const list = await this.request(
      `/messages?labelIds=INBOX&labelIds=UNREAD&maxResults=${max}`
    );
    return (list.messages ?? []).map((m) => m.id);
  }
  async getMessageMeta(id) {
    const query = "format=metadata&metadataHeaders=From&metadataHeaders=Subject";
    const message = await this.request(`/messages/${id}?${query}`);
    const headers = message.payload?.headers;
    return {
      id: message.id,
      threadId: message.threadId,
      from: parsePerson(header(headers, "From")),
      subject: header(headers, "Subject"),
      snippet: decodeEntities(message.snippet ?? ""),
      date: Number(message.internalDate ?? 0)
    };
  }
  async getThread(id) {
    const thread = await this.request(`/threads/${id}?format=full`);
    const messages = (thread.messages ?? []).map(toMessageDetail);
    const firstHeaders = thread.messages?.[0]?.payload?.headers;
    return { id: thread.id, subject: header(firstHeaders, "Subject"), messages };
  }
  async modifyThread(id, addLabelIds, removeLabelIds) {
    await this.request(`/threads/${id}/modify`, {
      method: "POST",
      body: JSON.stringify({ addLabelIds, removeLabelIds })
    });
  }
  markRead(id) {
    return this.modifyThread(id, [], ["UNREAD"]);
  }
  markUnread(id) {
    return this.modifyThread(id, ["UNREAD"], []);
  }
  archive(id) {
    return this.modifyThread(id, [], ["INBOX"]);
  }
  spam(id) {
    return this.modifyThread(id, ["SPAM"], ["INBOX"]);
  }
  async trash(id) {
    await this.request(`/threads/${id}/trash`, { method: "POST" });
  }
};

// src/lib/storage.ts
var DEFAULT_SETTINGS = {
  clientId: "",
  language: "fr",
  pollMinutes: 1,
  maxThreads: 20,
  markReadOnOpen: true,
  alwaysShowImages: false,
  unreadOnly: true,
  notifications: true,
  notificationStyle: "tab",
  notificationSeconds: 8,
  notificationPosition: "top-right"
};
async function getSettings() {
  const { settings } = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...settings };
}
async function saveSettings(patch) {
  const next = { ...await getSettings(), ...patch };
  await chrome.storage.local.set({ settings: next });
  return next;
}
async function getAccounts() {
  const { accounts } = await chrome.storage.local.get("accounts");
  return accounts ?? [];
}
async function saveAccounts(accounts) {
  await chrome.storage.local.set({ accounts });
}
async function getAccountStates() {
  const { accountStates } = await chrome.storage.local.get("accountStates");
  return accountStates ?? {};
}
async function saveAccountStates(states) {
  await chrome.storage.local.set({ accountStates: states });
}
async function getTokens() {
  const { tokens } = await chrome.storage.session.get("tokens");
  return tokens ?? {};
}
async function setToken(email, entry) {
  const tokens = await getTokens();
  if (entry) tokens[email] = entry;
  else delete tokens[email];
  await chrome.storage.session.set({ tokens });
}
async function getSeen() {
  const { seen } = await chrome.storage.local.get("seen");
  return seen ?? {};
}
async function saveSeen(seen) {
  await chrome.storage.local.set({ seen });
}
async function getToasts() {
  const { toasts } = await chrome.storage.session.get("toasts");
  return toasts ?? [];
}
async function saveToasts(toasts) {
  await chrome.storage.session.set({ toasts });
}
function mergeToasts(queue, incoming) {
  const known = new Set(queue.map((t2) => t2.key));
  return [...incoming.filter((t2) => !known.has(t2.key)), ...queue].slice(0, 20);
}

// src/lib/auth.ts
var AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
var REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";
var SCOPES = ["https://www.googleapis.com/auth/gmail.modify"];
var EXPIRY_MARGIN_MS = 2 * 60 * 1e3;
var AuthError = class extends Error {
  constructor(code, message) {
    super(message ?? code);
    this.code = code;
    this.name = "AuthError";
  }
  code;
};
function redirectUri() {
  return chrome.identity.getRedirectURL();
}
function buildAuthUrl(clientId, state, options) {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri(),
    response_type: "token",
    scope: SCOPES.join(" "),
    include_granted_scopes: "true",
    state
  });
  if (options.loginHint) params.set("login_hint", options.loginHint);
  if (options.prompt) params.set("prompt", options.prompt);
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}
function parseAuthResponse(responseUrl, expectedState, now = Date.now()) {
  const url = new URL(responseUrl);
  const params = new URLSearchParams(url.hash.slice(1) || url.search.slice(1));
  const error = params.get("error");
  if (error) throw new AuthError(error === "access_denied" ? "canceled" : "failed", error);
  if (params.get("state") !== expectedState) throw new AuthError("failed", "state_mismatch");
  const accessToken = params.get("access_token");
  if (!accessToken) throw new AuthError("failed", "no_token");
  const expiresIn = Number(params.get("expires_in") ?? "3600");
  return { accessToken, expiresAt: now + expiresIn * 1e3 };
}
async function runFlow(options) {
  const { clientId } = await getSettings();
  if (!clientId) throw new AuthError("no_client_id");
  const state = crypto.randomUUID();
  const url = buildAuthUrl(clientId, state, {
    loginHint: options.loginHint,
    // Silencieux : aucune fenêtre ; interactif avec un compte connu : choix direct ;
    // nouvel ajout : sélecteur de compte Google.
    prompt: options.interactive ? options.loginHint ? void 0 : "select_account" : "none"
  });
  let responseUrl;
  try {
    responseUrl = await chrome.identity.launchWebAuthFlow({
      url,
      interactive: options.interactive,
      abortOnLoadForNonInteractive: false,
      timeoutMsForNonInteractive: 8e3
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (options.interactive && /cancel|closed|did not approve/i.test(message)) throw new AuthError("canceled", message);
    throw new AuthError("failed", message);
  }
  if (!responseUrl) throw new AuthError("canceled");
  return parseAuthResponse(responseUrl, state);
}
async function emailForToken(accessToken) {
  const client = new GmailClient(async () => accessToken);
  return (await client.getProfileEmail()).toLowerCase();
}
async function addAccount() {
  const token = await runFlow({ interactive: true });
  const email = await emailForToken(token.accessToken);
  await setToken(email, token);
  const accounts = await getAccounts();
  const existed = accounts.some((a) => a.email === email);
  if (!existed) await saveAccounts([...accounts, { email, addedAt: Date.now() }]);
  return { email, existed };
}
async function removeAccount(email) {
  const tokens = await getTokens();
  const token = tokens[email];
  if (token) {
    fetch(`${REVOKE_ENDPOINT}?token=${encodeURIComponent(token.accessToken)}`, { method: "POST" }).catch(() => void 0);
  }
  await setToken(email, null);
  await saveAccounts((await getAccounts()).filter((a) => a.email !== email));
}
var inFlight = /* @__PURE__ */ new Map();
async function getToken(email, options = {}) {
  if (!options.forceRefresh) {
    const cached = (await getTokens())[email];
    if (cached && cached.expiresAt - EXPIRY_MARGIN_MS > Date.now()) return cached.accessToken;
  }
  const key = `${email}|${options.interactive ? "i" : "s"}`;
  const pending = inFlight.get(key);
  if (pending) return pending;
  const refresh = (async () => {
    let token;
    try {
      token = await runFlow({ loginHint: email, interactive: false });
    } catch (error) {
      if (error instanceof AuthError && error.code === "no_client_id") throw error;
      if (!options.interactive) throw new AuthRequiredError();
      token = await runFlow({ loginHint: email, interactive: true });
    }
    const actual = await emailForToken(token.accessToken);
    if (actual !== email) throw new AuthError("mismatch", actual);
    await setToken(email, token);
    return token.accessToken;
  })();
  inFlight.set(key, refresh);
  try {
    return await refresh;
  } finally {
    inFlight.delete(key);
  }
}

// src/lib/i18n.ts
var fr = {
  appName: "Aper\xE7u Gmail",
  refresh: "Actualiser",
  addAccount: "Ajouter un compte Gmail",
  settings: "R\xE9glages",
  back: "Retour",
  openGmail: "Ouvrir dans Gmail",
  archive: "Archiver",
  delete: "Supprimer",
  spam: "Signaler comme spam",
  markRead: "Marquer comme lu",
  markUnread: "Marquer comme non lu",
  noSubject: "(sans objet)",
  inboxEmpty: "Bo\xEEte de r\xE9ception vide. Bravo !",
  loading: "Chargement\u2026",
  unreadCount: "{0} non lus",
  oneUnread: "1 non lu",
  noUnread: "Aucun non lu",
  reauthNeeded: "Reconnexion requise",
  reconnect: "Se reconnecter",
  loadError: "Impossible de charger les courriels.",
  retry: "R\xE9essayer",
  actionError: "L\u2019action a \xE9chou\xE9. R\xE9essayez.",
  welcomeTitle: "Bienvenue !",
  welcomeText: "Ajoutez un compte Gmail pour voir vos courriels ici.",
  setupTitle: "Configuration requise",
  setupText: "Collez l\u2019identifiant client Google dans les r\xE9glages pour commencer.",
  openSettings: "Ouvrir les r\xE9glages",
  addAccountHint: "Une fen\xEAtre Google va s\u2019ouvrir. Rouvrez ensuite l\u2019extension.",
  imagesHidden: "Images masqu\xE9es pour prot\xE9ger votre vie priv\xE9e.",
  showImages: "Afficher les images",
  attachments: "Pi\xE8ces jointes",
  messagesInThread: "{0} messages",
  toLabel: "\xC0 : {0}",
  archived: "Conversation archiv\xE9e",
  deleted: "Conversation supprim\xE9e",
  spammed: "Signal\xE9e comme spam",
  filterUnread: "Non lus",
  filterAll: "Tous",
  filterLabel: "Conversations affich\xE9es",
  noUnreadMail: "Aucun courriel non lu.",
  collapse: "Replier {0}",
  expand: "D\xE9plier {0}",
  notifFrom: "De : {0}",
  notifManyTitle: "{0} nouveaux courriels",
  notifManyMessage: "Dernier : {0}",
  notifTestTitle: "Notification de test",
  notifTestMessage: "Les notifications d\u2019Aper\xE7u Gmail fonctionnent.",
  toastTitle: "Nouveaux courriels \u2014 Aper\xE7u Gmail",
  toastOpen: "Ouvrir",
  toastMoreOne: "+1 autre courriel",
  toastMore: "+{0} autres courriels",
  dismiss: "Fermer",
  dismissAll: "Tout fermer",
  justNow: "\xE0 l\u2019instant",
  minutesAgo: "il y a {0} min",
  // Page d'options
  optionsTitle: "R\xE9glages \u2014 Aper\xE7u Gmail",
  googleSection: "Connexion Google",
  googleHelp: "Collez l\u2019identifiant client OAuth de votre projet Google Cloud (type \xAB Application Web \xBB). Le guide pas \xE0 pas est dans le fichier README du projet.",
  clientIdLabel: "Identifiant client",
  redirectLabel: "URI de redirection autoris\xE9e \xE0 d\xE9clarer dans Google Cloud",
  extensionIdLabel: "Identifiant de l\u2019extension",
  copy: "Copier",
  copied: "Copi\xE9",
  save: "Enregistrer",
  saved: "Enregistr\xE9",
  accountsSection: "Comptes",
  noAccounts: "Aucun compte pour l\u2019instant.",
  remove: "Retirer",
  removeConfirm: "Retirer le compte {0} de l\u2019extension ?",
  addingAccount: "Connexion en cours\u2026",
  accountAdded: "Compte {0} ajout\xE9.",
  accountExists: "Ce compte est d\xE9j\xE0 ajout\xE9.",
  clientIdMissing: "Enregistrez d\u2019abord l\u2019identifiant client.",
  authCanceled: "Connexion annul\xE9e.",
  authFailed: "La connexion a \xE9chou\xE9 : {0}",
  prefsSection: "Pr\xE9f\xE9rences",
  languageLabel: "Langue",
  pollLabel: "V\xE9rifier les nouveaux courriels toutes les",
  minutes: "{0} min",
  maxThreadsLabel: "Conversations affich\xE9es par compte",
  markReadLabel: "Marquer comme lu \xE0 l\u2019ouverture",
  showImagesLabel: "Toujours afficher les images (peut permettre le pistage)",
  orderHelp: "L\u2019ordre de cette liste est celui du popup. Utilisez les fl\xE8ches pour le changer.",
  moveUp: "Monter {0}",
  moveDown: "Descendre {0}",
  unreadOnlyLabel: "N\u2019afficher que les courriels non lus (par d\xE9faut)",
  notificationsLabel: "Notification \xE0 chaque nouveau courriel (compte, objet et aper\xE7u)",
  notifTest: "Tester la notification",
  notifHelp: "Notification du syst\xE8me absente ? Autorisez les notifications de Google Chrome dans les r\xE9glages de votre syst\xE8me (Windows : Param\xE8tres \u203A Notifications ; Mac : R\xE9glages Syst\xE8me \u203A Notifications).",
  notifStyleLabel: "Type de notification",
  notifStyleTab: "Bulle dans l\u2019onglet ouvert (recommand\xE9)",
  notifStyleWindow: "Petite fen\xEAtre s\xE9par\xE9e",
  notifStyleSystem: "Notification du syst\xE8me",
  notifStyleBoth: "Bulle + notification du syst\xE8me",
  notifStyleHelp: "Sur les pages internes du navigateur (nouvel onglet, r\xE9glages, boutique), la bulle est remplac\xE9e par la notification du syst\xE8me.",
  notifDurationLabel: "Dur\xE9e d\u2019affichage",
  secondsShort: "{0} s",
  untilClosed: "Jusqu\u2019\xE0 fermeture",
  notifPositionLabel: "Position",
  positionBottomRight: "En bas \xE0 droite",
  positionTopRight: "En haut \xE0 droite",
  privacyNote: "Vos courriels ne quittent jamais votre navigateur : l\u2019extension parle directement \xE0 Google, sans serveur interm\xE9diaire."
};
var en = {
  appName: "Gmail Preview",
  refresh: "Refresh",
  addAccount: "Add a Gmail account",
  settings: "Settings",
  back: "Back",
  openGmail: "Open in Gmail",
  archive: "Archive",
  delete: "Delete",
  spam: "Report spam",
  markRead: "Mark as read",
  markUnread: "Mark as unread",
  noSubject: "(no subject)",
  inboxEmpty: "Inbox empty. Well done!",
  loading: "Loading\u2026",
  unreadCount: "{0} unread",
  oneUnread: "1 unread",
  noUnread: "No unread",
  reauthNeeded: "Sign-in required",
  reconnect: "Sign in again",
  loadError: "Could not load messages.",
  retry: "Retry",
  actionError: "The action failed. Please try again.",
  welcomeTitle: "Welcome!",
  welcomeText: "Add a Gmail account to see your messages here.",
  setupTitle: "Setup required",
  setupText: "Paste your Google client ID in the settings to get started.",
  openSettings: "Open settings",
  addAccountHint: "A Google window will open. Then reopen the extension.",
  imagesHidden: "Images hidden to protect your privacy.",
  showImages: "Show images",
  attachments: "Attachments",
  messagesInThread: "{0} messages",
  toLabel: "To: {0}",
  archived: "Conversation archived",
  deleted: "Conversation deleted",
  spammed: "Reported as spam",
  filterUnread: "Unread",
  filterAll: "All",
  filterLabel: "Conversations shown",
  noUnreadMail: "No unread messages.",
  collapse: "Collapse {0}",
  expand: "Expand {0}",
  notifFrom: "From: {0}",
  notifManyTitle: "{0} new messages",
  notifManyMessage: "Latest: {0}",
  notifTestTitle: "Test notification",
  notifTestMessage: "Gmail Preview notifications are working.",
  toastTitle: "New messages \u2014 Gmail Preview",
  toastOpen: "Open",
  toastMoreOne: "+1 more message",
  toastMore: "+{0} more messages",
  dismiss: "Close",
  dismissAll: "Close all",
  justNow: "just now",
  minutesAgo: "{0} min ago",
  optionsTitle: "Settings \u2014 Gmail Preview",
  googleSection: "Google sign-in",
  googleHelp: "Paste the OAuth client ID of your Google Cloud project (type \u201CWeb application\u201D). The step-by-step guide is in the project README.",
  clientIdLabel: "Client ID",
  redirectLabel: "Authorized redirect URI to declare in Google Cloud",
  extensionIdLabel: "Extension ID",
  copy: "Copy",
  copied: "Copied",
  save: "Save",
  saved: "Saved",
  accountsSection: "Accounts",
  noAccounts: "No accounts yet.",
  remove: "Remove",
  removeConfirm: "Remove the account {0} from the extension?",
  addingAccount: "Signing in\u2026",
  accountAdded: "Account {0} added.",
  accountExists: "This account is already added.",
  clientIdMissing: "Save the client ID first.",
  authCanceled: "Sign-in canceled.",
  authFailed: "Sign-in failed: {0}",
  prefsSection: "Preferences",
  languageLabel: "Language",
  pollLabel: "Check for new messages every",
  minutes: "{0} min",
  maxThreadsLabel: "Conversations shown per account",
  markReadLabel: "Mark as read when opened",
  showImagesLabel: "Always show images (may allow tracking)",
  orderHelp: "The order of this list is the order in the popup. Use the arrows to change it.",
  moveUp: "Move {0} up",
  moveDown: "Move {0} down",
  unreadOnlyLabel: "Show unread messages only (default)",
  notificationsLabel: "Notify me of each new message (account, subject and preview)",
  notifTest: "Test notification",
  notifHelp: "No system notification? Allow Google Chrome notifications in your system settings (Windows: Settings \u203A Notifications; Mac: System Settings \u203A Notifications).",
  notifStyleLabel: "Notification type",
  notifStyleTab: "Bubble in the open tab (recommended)",
  notifStyleWindow: "Small separate window",
  notifStyleSystem: "System notification",
  notifStyleBoth: "Bubble + system notification",
  notifStyleHelp: "On the browser\u2019s internal pages (new tab, settings, store), the bubble is replaced by the system notification.",
  notifDurationLabel: "Display time",
  secondsShort: "{0} s",
  untilClosed: "Until closed",
  notifPositionLabel: "Position",
  positionBottomRight: "Bottom right",
  positionTopRight: "Top right",
  privacyNote: "Your messages never leave your browser: the extension talks directly to Google, with no server in between."
};
var dictionaries = { fr, en };
var current = "fr";
function setLanguage(language) {
  current = language;
  if (typeof document !== "undefined") document.documentElement.lang = language;
}
function t(key, ...subs) {
  const template = dictionaries[current][key] ?? fr[key];
  return subs.reduce((text, sub, i) => text.replaceAll(`{${i}}`, String(sub)), template);
}

// src/lib/notify.ts
var SEEN_LIMIT = 200;
var RECENT_MARGIN_MS = 10 * 60 * 1e3;
var MAX_INDIVIDUAL = 3;
function detectNew(previous, currentIds, now) {
  const next = {
    ids: [.../* @__PURE__ */ new Set([...currentIds, ...previous?.ids ?? []])].slice(0, SEEN_LIMIT),
    checkedAt: now
  };
  if (!previous) return { candidates: [], next };
  const seen = new Set(previous.ids);
  return { candidates: currentIds.filter((id) => !seen.has(id)), next };
}
function keepRecent(messages, previousCheck) {
  return messages.filter((m) => m.date >= previousCheck - RECENT_MARGIN_MS);
}
function notificationId(email, threadId) {
  return threadId ? `msg|${email}|${threadId}` : `sum|${email}|${Date.now()}`;
}
function parseNotificationId(id) {
  const [kind, email, rest] = id.split("|");
  if (!email || kind !== "msg" && kind !== "sum") return null;
  return { email, threadId: kind === "msg" ? rest ?? null : null };
}

// src/lib/toast-window.ts
var TOAST_WIDTH = 400;
var MARGIN = 12;
function cornerBounds(area, position, height, width = TOAST_WIDTH) {
  const left = Math.round(area.left + area.width - width - MARGIN);
  const top = position === "top-right" ? Math.round(area.top + MARGIN) : Math.round(area.top + area.height - height - MARGIN);
  return { left, top, width, height };
}
async function workArea() {
  const fallback = { left: 0, top: 0, width: 1280, height: 800 };
  try {
    const displays = await chrome.system.display.getInfo();
    let display = displays.find((d) => d.isPrimary) ?? displays[0];
    const browser = await chrome.windows.getLastFocused({ windowTypes: ["normal"] }).catch(() => null);
    if (browser?.left !== void 0 && browser.top !== void 0 && browser.width && browser.height) {
      const cx = browser.left + browser.width / 2;
      const cy = browser.top + browser.height / 2;
      display = displays.find(
        (d) => cx >= d.bounds.left && cx < d.bounds.left + d.bounds.width && cy >= d.bounds.top && cy < d.bounds.top + d.bounds.height
      ) ?? display;
    }
    return display?.workArea ?? fallback;
  } catch {
    return fallback;
  }
}

// src/background.ts
var ALARM = "poll";
var BADGE_RED = "#d93025";
var BADGE_ORANGE = "#e37400";
async function scheduleAlarm() {
  const { pollMinutes } = await getSettings();
  await chrome.alarms.clear(ALARM);
  await chrome.alarms.create(ALARM, { periodInMinutes: pollMinutes, delayInMinutes: pollMinutes });
}
function badgeText(count) {
  if (count <= 0) return "";
  return count > 999 ? "999+" : String(count);
}
async function updateBadge(states) {
  const settings = await getSettings();
  setLanguage(settings.language);
  const total = states.reduce((sum, s) => sum + (s.status === "ok" ? s.unread ?? 0 : 0), 0);
  const needsAttention = states.some((s) => s.status !== "ok");
  let text = badgeText(total);
  if (!text && needsAttention) text = "!";
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color: needsAttention ? BADGE_ORANGE : BADGE_RED });
  await chrome.action.setBadgeTextColor({ color: "#ffffff" });
  const lines = states.map(
    (s) => s.status === "ok" ? `${s.email} : ${s.unread ?? 0}` : `${s.email} : ${t("reauthNeeded")}`
  );
  await chrome.action.setTitle({ title: [t("appName"), ...lines].join("\n") });
}
var ICON = "icons/icon-128.png";
function notifyMessage(email, message) {
  chrome.notifications.create(notificationId(email, message.threadId), {
    type: "basic",
    iconUrl: ICON,
    title: message.subject || t("noSubject"),
    message: message.snippet,
    // Compte qui a reçu le courriel et expéditeur, sous le titre.
    contextMessage: `${email} \xB7 ${t("notifFrom", message.from.name)}`,
    buttons: [{ title: t("markRead") }, { title: t("archive") }],
    priority: 1
  });
}
function notifySummary(email, messages) {
  const latest = messages[0];
  chrome.notifications.create(notificationId(email, null), {
    type: "basic",
    iconUrl: ICON,
    title: t("notifManyTitle", messages.length),
    message: latest ? t("notifManyMessage", `${latest.from.name} \u2014 ${latest.subject || t("noSubject")}`) : "",
    contextMessage: email,
    priority: 1
  });
}
var TOAST_START_HEIGHT = 190;
function toToast(email, message) {
  return {
    key: `${email}|${message.id}`,
    email,
    threadId: message.threadId,
    from: message.from,
    subject: message.subject,
    snippet: message.snippet,
    date: message.date
  };
}
async function getToastWindowIdRaw() {
  const { toastWindowId } = await chrome.storage.session.get("toastWindowId");
  return typeof toastWindowId === "number" ? toastWindowId : null;
}
async function getToastWindowId() {
  const id = await getToastWindowIdRaw();
  if (id === null) return null;
  return chrome.windows.get(id).then(() => id, () => null);
}
var toastChain = Promise.resolve();
function serialized(task) {
  const run = toastChain.then(task);
  toastChain = run.catch(() => void 0);
  return run;
}
function showToasts(items, settings) {
  if (!items.length) return Promise.resolve();
  return serialized(async () => {
    await saveToasts(mergeToasts(await getToasts(), items));
    if (await getToastWindowId()) return;
    const bounds = cornerBounds(await workArea(), settings.notificationPosition, TOAST_START_HEIGHT);
    const created = await chrome.windows.create({ url: "notify.html", type: "popup", focused: false, ...bounds });
    await chrome.storage.session.set({ toastWindowId: created?.id ?? null });
  });
}
function dismissToasts(keys) {
  const remove = new Set(keys);
  return serialized(async () => {
    await saveToasts((await getToasts()).filter((toast) => !remove.has(toast.key)));
    if (await getToastTabId() !== null) await pushToTab(await getSettings());
  });
}
var TOAST_MAX_AGE_MS = 15 * 60 * 1e3;
async function getToastTabId() {
  const { toastTabId } = await chrome.storage.session.get("toastTabId");
  return typeof toastTabId === "number" ? toastTabId : null;
}
async function setToastTabId(id) {
  await chrome.storage.session.set({ toastTabId: id });
}
async function activeTab() {
  const browser = await chrome.windows.getLastFocused({ windowTypes: ["normal"], populate: true }).catch(() => void 0);
  return browser?.tabs?.find((tab) => tab.active);
}
function sendToTab(tabId, message) {
  return chrome.tabs.sendMessage(tabId, message);
}
async function pushToTab(settings) {
  const all = await getToasts();
  const queue = all.filter((toast) => Date.now() - toast.date < TOAST_MAX_AGE_MS);
  if (queue.length !== all.length) await saveToasts(queue);
  const previous = await getToastTabId();
  const tab = await activeTab();
  const target = tab?.id;
  if (previous !== null && (previous !== target || !queue.length)) {
    await sendToTab(previous, { type: "clearToasts" }).catch(() => void 0);
  }
  if (!queue.length) {
    await setToastTabId(null);
    return true;
  }
  if (target === void 0) {
    await setToastTabId(null);
    return false;
  }
  const accounts = await getAccounts();
  const options = {
    seconds: settings.notificationSeconds,
    position: settings.notificationPosition,
    language: settings.language,
    ranks: Object.fromEntries(accounts.map((a, i) => [a.email, i]))
  };
  try {
    await chrome.scripting.executeScript({ target: { tabId: target }, files: ["toast-content.js"] });
    await sendToTab(target, { type: "renderToasts", toasts: queue, options });
    await setToastTabId(target);
    return true;
  } catch {
    await setToastTabId(null);
    return false;
  }
}
function showInTab(items, settings) {
  if (!items.length) return Promise.resolve(true);
  return serialized(async () => {
    await saveToasts(mergeToasts(await getToasts(), items));
    const shown = await pushToTab(settings);
    if (!shown) {
      const keys = new Set(items.map((x) => x.key));
      await saveToasts((await getToasts()).filter((x) => !keys.has(x.key)));
    }
    return shown;
  });
}
function followActiveTab() {
  void serialized(async () => {
    if (!(await getToasts()).length) return;
    const settings = await getSettings();
    if (settings.notificationStyle === "tab" || settings.notificationStyle === "both") await pushToTab(settings);
  });
}
chrome.tabs.onActivated.addListener(followActiveTab);
chrome.windows.onFocusChanged.addListener((windowId) => {
  if (windowId !== chrome.windows.WINDOW_ID_NONE) followActiveTab();
});
chrome.tabs.onUpdated.addListener((_tabId, info, tab) => {
  if (info.status === "complete" && tab.active) followActiveTab();
});
chrome.windows.onRemoved.addListener((windowId) => {
  void serialized(async () => {
    if (await getToastWindowIdRaw() !== windowId) return;
    await chrome.storage.session.set({ toastWindowId: null });
    await saveToasts([]);
  });
});
async function openInGmail(email, threadId) {
  const url = gmailWebUrl(email, threadId ?? void 0);
  const browser = await chrome.windows.getLastFocused({ windowTypes: ["normal"] }).catch(() => null);
  if (browser?.id === void 0) {
    await chrome.windows.create({ url, focused: true });
    return;
  }
  await chrome.tabs.create({ url, windowId: browser.id, active: true });
  await chrome.windows.update(browser.id, { focused: true });
}
async function deliver(toasts, settings, systemNotify) {
  const style = settings.notificationStyle;
  if (style === "window") await showToasts(toasts, settings);
  if (style === "tab" || style === "both") {
    const shown = await showInTab(toasts, settings);
    if (!shown && style === "tab") systemNotify();
  }
  if (style === "system" || style === "both") systemNotify();
}
async function announce(email, messages, settings) {
  await deliver(messages.map((m) => toToast(email, m)), settings, () => {
    if (messages.length > MAX_INDIVIDUAL) notifySummary(email, messages);
    else messages.forEach((m) => notifyMessage(email, m));
  });
}
async function checkNewMessages(email, client, settings, previous) {
  const now = Date.now();
  const ids = await client.listUnreadMessageIds(20);
  const { candidates, next } = detectNew(previous, ids, now);
  if (!settings.notifications || !candidates.length || !previous) return next;
  const metas = await Promise.all(candidates.slice(0, 10).map((id) => client.getMessageMeta(id)));
  const fresh = keepRecent(metas, previous.checkedAt).sort((a, b) => b.date - a.date);
  await announce(email, fresh, settings);
  return next;
}
var polling = null;
function pollAll() {
  if (!polling) {
    polling = (async () => {
      const accounts = await getAccounts();
      const previous = await getAccountStates();
      const settings = await getSettings();
      setLanguage(settings.language);
      const seen = await getSeen();
      const nextSeen = {};
      const results = await Promise.all(
        accounts.map(async ({ email }) => {
          const client = new GmailClient((forceRefresh) => getToken(email, { forceRefresh }));
          try {
            const unread = await client.getInboxUnread();
            try {
              nextSeen[email] = await checkNewMessages(email, client, settings, seen[email]);
            } catch {
              if (seen[email]) nextSeen[email] = seen[email];
            }
            return { email, unread, status: "ok", checkedAt: Date.now() };
          } catch (error) {
            const reauth = error instanceof AuthRequiredError || error instanceof AuthError;
            console.warn("V\xE9rification impossible pour un compte", error instanceof Error ? error.name : error);
            return {
              email,
              unread: previous[email]?.unread ?? null,
              status: reauth ? "reauth" : "error",
              checkedAt: Date.now()
            };
          }
        })
      );
      await saveAccountStates(Object.fromEntries(results.map((s) => [s.email, s])));
      for (const { email } of accounts) if (!nextSeen[email] && seen[email]) nextSeen[email] = seen[email];
      await saveSeen(nextSeen);
      await updateBadge(results);
    })().finally(() => {
      polling = null;
    });
  }
  return polling;
}
function toErrorResponse(error) {
  let code = "failed";
  if (error instanceof AuthRequiredError) code = "auth_required";
  else if (error instanceof AuthError) code = error.code;
  const message = error instanceof Error ? error.message : String(error);
  return { ok: false, code, message };
}
async function handle(request) {
  switch (request.type) {
    case "getToken":
      return getToken(request.email, { interactive: request.interactive, forceRefresh: request.forceRefresh });
    case "addAccount": {
      const result = await addAccount();
      await pollAll();
      return result;
    }
    case "removeAccount":
      await removeAccount(request.email);
      await pollAll();
      return null;
    case "refresh":
      await pollAll();
      return null;
    case "testNotification": {
      const settings = await getSettings();
      setLanguage(settings.language);
      const email = (await getAccounts())[0]?.email ?? "exemple@gmail.com";
      const test = {
        key: `test|${Date.now()}`,
        email,
        threadId: null,
        from: { name: t("appName"), email: "" },
        subject: t("notifTestTitle"),
        snippet: t("notifTestMessage"),
        date: Date.now()
      };
      await deliver([test], settings, () => {
        chrome.notifications.create(test.key, {
          type: "basic",
          iconUrl: ICON,
          title: t("notifTestTitle"),
          message: t("notifTestMessage"),
          contextMessage: email
        });
      });
      return null;
    }
    case "threadAction": {
      const client = new GmailClient((forceRefresh) => getToken(request.email, { forceRefresh }));
      if (request.action === "markRead") await client.markRead(request.threadId);
      else await client.archive(request.threadId);
      void pollAll();
      return null;
    }
    case "dismissToasts":
      await dismissToasts(request.keys);
      return null;
    case "openThread":
      await openInGmail(request.email, request.threadId);
      return null;
    case "placeToastWindow": {
      const settings = await getSettings();
      const bounds = cornerBounds(await workArea(), settings.notificationPosition, request.height);
      await chrome.windows.update(request.windowId, bounds);
      return null;
    }
  }
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id) return false;
  handle(request).then(
    (data) => sendResponse({ ok: true, data }),
    (error) => sendResponse(toErrorResponse(error))
  );
  return true;
});
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM) void pollAll();
});
async function migrate() {
  const { migrations } = await chrome.storage.local.get("migrations");
  const done = new Set(migrations ?? []);
  if (!done.has("notif-tab")) {
    const settings = await getSettings();
    if (settings.notificationStyle === "window") await saveSettings({ notificationStyle: "tab" });
    done.add("notif-tab");
  }
  if (!done.has("notif-top-right")) {
    const settings = await getSettings();
    if (settings.notificationPosition === "bottom-right") await saveSettings({ notificationPosition: "top-right" });
    done.add("notif-top-right");
  }
  await chrome.storage.local.set({ migrations: [...done] });
}
chrome.runtime.onInstalled.addListener((details) => {
  void migrate().then(scheduleAlarm).then(pollAll);
  if (details.reason === "install") void chrome.runtime.openOptionsPage();
});
chrome.runtime.onStartup.addListener(() => {
  void scheduleAlarm().then(pollAll);
});
chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes.settings) return;
  const before = changes.settings.oldValue;
  const after = changes.settings.newValue;
  if (before?.pollMinutes !== after?.pollMinutes) void scheduleAlarm();
  if (before?.language !== after?.language) void getAccountStates().then((s) => updateBadge(Object.values(s)));
});
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
  action.then(pollAll, (error) => console.warn("Action depuis la notification impossible", error instanceof Error ? error.name : error));
});
