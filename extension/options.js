// src/lib/dom.ts
function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === void 0 || value === false) continue;
    if (key.startsWith("on") && typeof value === "function") {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === "class") {
      el.className = String(value);
    } else if (value === true) {
      el.setAttribute(key, "");
    } else {
      el.setAttribute(key, String(value));
    }
  }
  for (const child of children) {
    if (child === null || child === void 0 || child === false) continue;
    el.append(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return el;
}
var PATHS = {
  back: "M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z",
  refresh: "M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z",
  add: "M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z",
  settings: "M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.488.488 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z",
  archive: "M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z",
  delete: "M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z",
  markUnread: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z",
  markRead: "M21.99 8c0-.72-.37-1.35-.94-1.7L12 1 2.95 6.3C2.38 6.65 2 7.28 2 8v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2l-.01-10zM12 13L3.74 7.84 12 3l8.26 4.84L12 13z",
  openInNew: "M19 19H5V5h7V3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z",
  spam: "M15.73 3H8.27L3 8.27v7.46L8.27 21h7.46L21 15.73V8.27L15.73 3zM12 17.3c-.72 0-1.3-.58-1.3-1.3 0-.72.58-1.3 1.3-1.3.72 0 1.3.58 1.3 1.3 0 .72-.58 1.3-1.3 1.3zm1-4.3h-2V7h2v6z",
  expandMore: "M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6z",
  attach: "M16.5 6v11.5c0 2.21-1.79 4-4 4s-4-1.79-4-4V5a2.5 2.5 0 0 1 5 0v10.5c0 .55-.45 1-1 1s-1-.45-1-1V6H10v9.5a2.5 2.5 0 0 0 5 0V5c0-2.21-1.79-4-4-4S7 2.79 7 5v12.5c0 3.04 2.46 5.5 5.5 5.5s5.5-2.46 5.5-5.5V6h-1.5z",
  image: "M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z",
  warning: "M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z",
  close: "M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z",
  mail: "M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 14H4V8l8 5 8-5v10zm-8-7L4 6h16l-8 5z"
};
var SVG_NS = "http://www.w3.org/2000/svg";
function icon(name, size = 20) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "icon");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", PATHS[name]);
  path.setAttribute("fill", "currentColor");
  svg.append(path);
  return svg;
}
function iconButton(name, label, onClick, extraClass = "") {
  const button = h("button", { type: "button", class: `icon-button ${extraClass}`.trim(), title: label, "aria-label": label }, icon(name));
  button.addEventListener("click", (event) => {
    event.stopPropagation();
    onClick(event);
  });
  return button;
}
function avatarHue(seed) {
  let hash = 0;
  for (const char of seed) hash = hash * 31 + char.charCodeAt(0) >>> 0;
  return hash % 360;
}
function avatar(name, seed) {
  const letter = (name.trim()[0] ?? "?").toUpperCase();
  const el = h("span", { class: "avatar", "aria-hidden": "true" }, letter);
  el.style.setProperty("--hue", String(avatarHue(seed)));
  return el;
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

// src/lib/messages.ts
var RemoteError = class extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "RemoteError";
  }
  code;
};
async function send(request) {
  const response = await chrome.runtime.sendMessage(request);
  if (!response) throw new RemoteError("failed", "no_response");
  if (!response.ok) throw new RemoteError(response.code, response.message);
  return response.data;
}

// src/lib/storage.ts
var DEFAULT_SETTINGS = {
  clientId: "",
  language: "fr",
  pollMinutes: 1,
  maxThreads: 20,
  markReadOnOpen: true,
  alwaysShowImages: false
};
var POLL_CHOICES = [1, 2, 5, 10, 15];
var MAX_THREADS_CHOICES = [10, 20, 30, 50];
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

// src/options/options.ts
var app = document.getElementById("app");
function card(titleKey, ...children) {
  return h("section", { class: "card" }, h("h2", {}, t(titleKey)), ...children.filter((c) => c !== null));
}
function status() {
  return h("p", { class: "status", role: "status", "aria-live": "polite" });
}
function copyField(id, label, value) {
  const input = h("input", { id, type: "text", readonly: true, value, class: "mono" });
  const button = h("button", { type: "button", class: "outlined-button" }, t("copy"));
  button.addEventListener("click", () => {
    void navigator.clipboard.writeText(value).then(() => {
      button.textContent = t("copied");
      window.setTimeout(() => button.textContent = t("copy"), 1500);
    });
  });
  return h("div", { class: "field" }, h("label", { for: id }, label), h("div", { class: "row" }, input, button));
}
function googleCard(settings) {
  const input = h("input", {
    id: "client-id",
    type: "text",
    value: settings.clientId,
    placeholder: "1234567890-abc.apps.googleusercontent.com",
    class: "mono",
    spellcheck: "false",
    autocomplete: "off"
  });
  const feedback = status();
  const save = h("button", { type: "button", class: "filled-button" }, t("save"));
  save.addEventListener("click", () => {
    void saveSettings({ clientId: input.value.trim() }).then(() => {
      feedback.textContent = t("saved");
      void render();
    });
  });
  return card(
    "googleSection",
    h("p", { class: "help" }, t("googleHelp")),
    h("div", { class: "field" }, h("label", { for: "client-id" }, t("clientIdLabel")), h("div", { class: "row" }, input, save)),
    feedback,
    copyField("redirect-uri", t("redirectLabel"), chrome.identity.getRedirectURL()),
    copyField("extension-id", t("extensionIdLabel"), chrome.runtime.id)
  );
}
async function accountsCard(settings) {
  const accounts = await getAccounts();
  const feedback = status();
  const list = accounts.length ? h(
    "ul",
    { class: "account-list" },
    ...accounts.map(
      ({ email }) => h(
        "li",
        {},
        avatar(email, email),
        h("span", { class: "account-email" }, email),
        iconButton("close", t("remove"), () => {
          if (!window.confirm(t("removeConfirm", email))) return;
          void send({ type: "removeAccount", email }).then(render);
        })
      )
    )
  ) : h("p", { class: "help" }, t("noAccounts"));
  const add = h("button", { type: "button", class: "filled-button" }, t("addAccount"));
  add.addEventListener("click", () => {
    if (!settings.clientId) {
      feedback.textContent = t("clientIdMissing");
      return;
    }
    add.disabled = true;
    feedback.textContent = t("addingAccount");
    send({ type: "addAccount" }).then(async ({ email, existed }) => {
      await render();
      const next = document.querySelector("#accounts-status");
      if (next) next.textContent = existed ? t("accountExists") : t("accountAdded", email);
    }).catch((error) => {
      add.disabled = false;
      if (error instanceof RemoteError && error.code === "canceled") feedback.textContent = t("authCanceled");
      else feedback.textContent = t("authFailed", error instanceof Error ? error.message : String(error));
    });
  });
  feedback.id = "accounts-status";
  return card("accountsSection", list, h("div", { class: "row" }, add), feedback);
}
function select(id, label, value, choices, onChange) {
  const el = h("select", { id }, ...choices.map((c) => h("option", { value: String(c.value), selected: c.value === value }, c.label)));
  el.addEventListener("change", () => {
    const choice = choices.find((c) => String(c.value) === el.value);
    if (choice) onChange(choice.value);
  });
  return h("div", { class: "field inline" }, h("label", { for: id }, label), el);
}
function checkbox(id, label, checked, onChange) {
  const input = h("input", { id, type: "checkbox", checked });
  input.addEventListener("change", () => onChange(input.checked));
  return h("div", { class: "field check" }, input, h("label", { for: id }, label));
}
function prefsCard(settings) {
  return card(
    "prefsSection",
    select("language", t("languageLabel"), settings.language, [
      { value: "fr", label: "Fran\xE7ais" },
      { value: "en", label: "English" }
    ], (language) => void saveSettings({ language }).then(render)),
    select("poll", t("pollLabel"), settings.pollMinutes, POLL_CHOICES.map((m) => ({ value: m, label: t("minutes", m) })), (pollMinutes) => void saveSettings({ pollMinutes })),
    select("max-threads", t("maxThreadsLabel"), settings.maxThreads, MAX_THREADS_CHOICES.map((n) => ({ value: n, label: String(n) })), (maxThreads) => void saveSettings({ maxThreads })),
    checkbox("mark-read", t("markReadLabel"), settings.markReadOnOpen, (markReadOnOpen) => void saveSettings({ markReadOnOpen })),
    checkbox("show-images", t("showImagesLabel"), settings.alwaysShowImages, (alwaysShowImages) => void saveSettings({ alwaysShowImages }))
  );
}
async function render() {
  const settings = await getSettings();
  setLanguage(settings.language);
  document.title = t("optionsTitle");
  app.replaceChildren(
    h("header", { class: "page-header" }, h("h1", {}, t("optionsTitle"))),
    googleCard(settings),
    await accountsCard(settings),
    prefsCard(settings),
    h("p", { class: "help privacy" }, t("privacyNote"))
  );
}
void render();
