// src/lib/colors.ts
var ACCOUNT_PALETTE = [
  { hex: "#1a73e8", label: "colorBlue" },
  { hex: "#188038", label: "colorGreen" },
  { hex: "#e8710a", label: "colorOrange" },
  { hex: "#9334e6", label: "colorPurple" },
  { hex: "#129eaf", label: "colorTeal" },
  { hex: "#d01884", label: "colorPink" },
  { hex: "#d93025", label: "colorRed" },
  { hex: "#f9ab00", label: "colorYellow" },
  { hex: "#8d6e63", label: "colorBrown" },
  { hex: "#5f6368", label: "colorGrey" }
];
var DEFAULT_COUNT = 6;
var HEX = /^#[0-9a-f]{6}$/i;
function isHexColor(value) {
  return typeof value === "string" && HEX.test(value);
}
function defaultAccountColor(rank) {
  const index = (rank % DEFAULT_COUNT + DEFAULT_COUNT) % DEFAULT_COUNT;
  return ACCOUNT_PALETTE[index]?.hex ?? "#1a73e8";
}
function accountColor(account, rank) {
  return isHexColor(account?.color) ? account.color.toLowerCase() : defaultAccountColor(rank);
}
function readableTextOn(hex) {
  if (!isHexColor(hex)) return "#ffffff";
  const channel = (i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
  return luminance > 0.36 ? "#1f1f1f" : "#ffffff";
}

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
  arrowUp: "M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z",
  arrowDown: "M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z",
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
function avatar(name, seed, color) {
  const letter = (name.trim()[0] ?? "?").toUpperCase();
  const el = h("span", { class: "avatar", "aria-hidden": "true" }, letter);
  if (color && isHexColor(color)) {
    el.style.background = color;
    el.style.color = readableTextOn(color);
  } else {
    el.style.setProperty("--hue", String(avatarHue(seed)));
  }
  return el;
}

// src/lib/mime.ts
function header(headers, name) {
  const lower = name.toLowerCase();
  return headers?.find((h2) => h2.name.toLowerCase() === lower)?.value ?? "";
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
var HTML_ESCAPES = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};
function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}
function textToHtml(text) {
  const escaped = escapeHtml(text);
  const linked = escaped.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, (url) => `<a href="${url}">${url}</a>`);
  return `<div style="white-space:pre-wrap;font-family:inherit">${linked}</div>`;
}
function hasRemoteContent(html) {
  return /<img[^>]+src\s*=\s*["']?\s*(https?:)?\/\//i.test(html) || /url\(\s*["']?\s*(https?:)?\/\//i.test(html) || /\bbackground\s*=\s*["']?\s*(https?:)?\/\//i.test(html) || /<link[^>]+href\s*=\s*["']?\s*(https?:)?\/\//i.test(html);
}
function buildEmailDocument(body, options) {
  const remote = options.showRemote ? " https: http:" : "";
  const csp = [
    "default-src 'none'",
    `img-src data: cid:${remote}`,
    `style-src 'unsafe-inline'${remote}`,
    `font-src data:${remote}`
  ].join("; ");
  const cleaned = body.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<meta[^>]+http-equiv[^>]*>/gi, "").replace(/<base[^>]*>/gi, "");
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<base target="_blank">
<style>
  html, body { margin: 0; padding: 0; background: #fff; color: #202124; }
  body { padding: 8px 10px; font: 14px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap: anywhere; }
  img { max-width: 100%; height: auto; }
  pre { white-space: pre-wrap; }
  blockquote { margin: 0 0 0 8px; padding-left: 8px; border-left: 2px solid #dadce0; color: #5f6368; }
</style></head><body>${cleaned}</body></html>`;
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
  constructor(getToken) {
    this.getToken = getToken;
  }
  getToken;
  async request(path, init2 = {}) {
    const send2 = async (forceRefresh) => {
      const token = await this.getToken(forceRefresh);
      return fetch(`${API}${path}`, {
        ...init2,
        headers: { ...init2.headers ?? {}, Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
      });
    };
    let response = await send2(false);
    if (response.status === 401) response = await send2(true);
    if (response.status === 401) throw new AuthRequiredError();
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      throw new GmailApiError(response.status, body?.error?.message ? `Gmail API ${response.status} : ${body.error.message}` : `Gmail API ${response.status}`);
    }
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
  /**
   * Demande à Gmail d'alerter le sujet Pub/Sub à chaque changement de la boîte
   * de réception. Valable 7 jours : à renouveler.
   */
  async watch(topicName) {
    const result = await this.request("/watch", {
      method: "POST",
      body: JSON.stringify({ topicName, labelIds: ["INBOX"], labelFilterBehavior: "INCLUDE" })
    });
    return { historyId: result.historyId, expiration: Number(result.expiration) };
  }
  async stopWatch() {
    await this.request("/stop", { method: "POST" });
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
  olderMessages: "{0} messages pr\xE9c\xE9dents",
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
  orderHelp: "L\u2019ordre de cette liste est celui du popup. Utilisez les fl\xE8ches pour le changer, et la pastille pour choisir la couleur du compte.",
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
  colorOf: "Couleur de {0}",
  customColor: "Personnalis\xE9e",
  colorBlue: "Bleu",
  colorGreen: "Vert",
  colorOrange: "Orange",
  colorPurple: "Violet",
  colorTeal: "Sarcelle",
  colorPink: "Rose",
  colorRed: "Rouge",
  colorYellow: "Jaune",
  colorBrown: "Brun",
  colorGrey: "Gris",
  pushSection: "Notifications instantan\xE9es",
  pushHelp: "Avec un petit relais gratuit sur Cloudflare, Gmail pr\xE9vient l\u2019extension d\xE8s qu\u2019un courriel arrive, au lieu d\u2019attendre la v\xE9rification r\xE9guli\xE8re. Le relais ne re\xE7oit qu\u2019un signal, jamais vos courriels. Guide pas \xE0 pas : README, section \xAB Notifications instantan\xE9es \xBB.",
  pushStep1: "1. Cl\xE9s du relais",
  pushGenerateKeys: "G\xE9n\xE9rer les cl\xE9s",
  pushRegenerateKeys: "R\xE9g\xE9n\xE9rer les cl\xE9s",
  pushRegenerateConfirm: "De nouvelles cl\xE9s remplaceront les actuelles : il faudra les recopier dans Cloudflare et mettre \xE0 jour l\u2019abonnement Pub/Sub. Continuer ?",
  pushKeysHint: "\xC0 coller dans Cloudflare (Worker \u203A Settings \u203A Variables and Secrets, type \xAB Secret \xBB). Ne les partagez pas.",
  pushStep2: "2. Relais et Pub/Sub",
  pushRelayUrl: "Adresse du relais Cloudflare",
  pushTopic: "Sujet Pub/Sub (Google Cloud)",
  pushInvalidUrl: "Adresse invalide : elle doit commencer par https://",
  pushInvalidTopic: "Sujet invalide : il doit avoir la forme projects/<projet>/topics/<sujet>.",
  pushEndpoint: "Adresse de livraison \xE0 d\xE9clarer dans l\u2019abonnement Pub/Sub",
  pushEndpointHint: "Google Cloud \u203A Pub/Sub \u203A Abonnements \u203A Cr\xE9er : type \xAB Push \xBB, point de terminaison = cette adresse.",
  pushStep3: "3. Activation",
  pushEnable: "Activer les notifications instantan\xE9es",
  pushDisable: "D\xE9sactiver",
  pushWorking: "Un instant\u2026",
  pushTest: "Tester le relais",
  pushTesting: "Test en cours (15 s au plus)\u2026",
  pushTestOk: "Le relais fonctionne : alerte re\xE7ue en {0} s.",
  pushTestFail: "Aucune alerte re\xE7ue. V\xE9rifiez la messagerie push de Brave et les variables du relais.",
  pushOff: "D\xE9sactiv\xE9es : l\u2019extension v\xE9rifie Gmail \xE0 intervalle r\xE9gulier.",
  pushActive: "Actives : Gmail pr\xE9vient l\u2019extension d\xE8s qu\u2019un courriel arrive.",
  pushLast: "Derni\xE8re alerte re\xE7ue : {0}",
  pushErrMissingConfig: "Configuration incompl\xE8te : g\xE9n\xE9rez les cl\xE9s, puis enregistrez l\u2019adresse du relais et le sujet Pub/Sub.",
  pushErrRelayUnreachable: "Relais injoignable : v\xE9rifiez l\u2019adresse du Worker Cloudflare et qu\u2019il est d\xE9ploy\xE9.",
  pushErrRelayAuth: "Le relais refuse les cl\xE9s : v\xE9rifiez RELAY_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_JWK et l\u2019espace KV SUBSCRIPTIONS dans Cloudflare.",
  pushErrPushUnavailable: "Le navigateur refuse les alertes push. Dans Brave : brave://settings/privacy \u203A \xAB Utiliser les services Google pour la messagerie push \xBB, puis red\xE9marrez Brave.",
  pushErrWatchFailed: "Gmail refuse de pr\xE9venir le sujet Pub/Sub : v\xE9rifiez le nom du sujet et que gmail-api-push@system.gserviceaccount.com a le r\xF4le \xAB Diffuseur Pub/Sub \xBB (Pub/Sub Publisher) sur ce sujet.",
  pushErrNoAccounts: "Ajoutez d\u2019abord un compte Gmail.",
  pushBraveHint: "Brave : activez \xAB Utiliser les services Google pour la messagerie push \xBB dans brave://settings/privacy.",
  transferSectionFresh: "D\xE9j\xE0 configur\xE9 sur un autre appareil ?",
  transferSection: "Autres appareils",
  transferHelpFresh: "Importez le fichier de configuration export\xE9 depuis votre autre appareil : identifiant Google, comptes, couleurs, r\xE9glages et notifications instantan\xE9es sont repris d\u2019un coup. Sinon, suivez les \xE9tapes ci-dessous.",
  transferHelp: "Pour installer l\u2019extension ailleurs sans tout refaire : exportez la configuration, puis importez le fichier sur l\u2019autre appareil.",
  exportConfig: "Exporter la configuration",
  importConfig: "Importer une configuration",
  exportDone: "Fichier enregistr\xE9 dans vos t\xE9l\xE9chargements.",
  exportWarning: "Ce fichier contient les cl\xE9s de votre relais : gardez-le pour vous (jamais sur GitHub ni dans un courriel public) et supprimez-le apr\xE8s l\u2019import. Il ne contient ni mot de passe ni courriel.",
  importConfirm: "Remplacer les r\xE9glages de cet appareil par ceux du fichier ({0} compte(s)) ?",
  importDone: "Configuration import\xE9e ({0} compte(s)). Si un compte demande une reconnexion, cliquez sur \xAB Se reconnecter \xBB dans l\u2019extension.",
  importErrInvalid: "Ce fichier n\u2019est pas une configuration Aper\xE7u Gmail.",
  importErrTooLarge: "Fichier trop volumineux pour \xEAtre une configuration.",
  importErrVersion: "Configuration cr\xE9\xE9e par une version plus r\xE9cente : mettez d\u2019abord l\u2019extension \xE0 jour.",
  importErrNoClientId: "La configuration ne contient pas d\u2019identifiant client Google valide.",
  syncLabel: "Partager la configuration avec mes autres navigateurs synchronis\xE9s",
  syncHelp: "Si la synchronisation du navigateur inclut les extensions, un nouvel appareil reprend la configuration tout seul. Sinon, utilisez le fichier.",
  syncedFrom: "Configuration reprise de la synchronisation le {0}.",
  privacyNote: "Vos courriels ne quittent jamais votre navigateur : l\u2019extension parle directement \xE0 Google. Le relais facultatif des notifications instantan\xE9es ne re\xE7oit qu\u2019un signal, jamais vos courriels."
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
  olderMessages: "{0} earlier messages",
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
  orderHelp: "The order of this list is the order in the popup. Use the arrows to change it, and the dot to pick the account\u2019s color.",
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
  colorOf: "Color of {0}",
  customColor: "Custom",
  colorBlue: "Blue",
  colorGreen: "Green",
  colorOrange: "Orange",
  colorPurple: "Purple",
  colorTeal: "Teal",
  colorPink: "Pink",
  colorRed: "Red",
  colorYellow: "Yellow",
  colorBrown: "Brown",
  colorGrey: "Grey",
  pushSection: "Instant notifications",
  pushHelp: "With a small free relay on Cloudflare, Gmail alerts the extension as soon as a message arrives, instead of waiting for the regular check. The relay only receives a signal, never your messages. Step-by-step guide: README, \u201CInstant notifications\u201D section.",
  pushStep1: "1. Relay keys",
  pushGenerateKeys: "Generate keys",
  pushRegenerateKeys: "Regenerate keys",
  pushRegenerateConfirm: "New keys will replace the current ones: you will need to copy them into Cloudflare again and update the Pub/Sub subscription. Continue?",
  pushKeysHint: "Paste into Cloudflare (Worker \u203A Settings \u203A Variables and Secrets, type \u201CSecret\u201D). Do not share them.",
  pushStep2: "2. Relay and Pub/Sub",
  pushRelayUrl: "Cloudflare relay address",
  pushTopic: "Pub/Sub topic (Google Cloud)",
  pushInvalidUrl: "Invalid address: it must start with https://",
  pushInvalidTopic: "Invalid topic: it must look like projects/<project>/topics/<topic>.",
  pushEndpoint: "Delivery address to declare in the Pub/Sub subscription",
  pushEndpointHint: "Google Cloud \u203A Pub/Sub \u203A Subscriptions \u203A Create: type \u201CPush\u201D, endpoint = this address.",
  pushStep3: "3. Activation",
  pushEnable: "Turn on instant notifications",
  pushDisable: "Turn off",
  pushWorking: "One moment\u2026",
  pushTest: "Test the relay",
  pushTesting: "Testing (15 s at most)\u2026",
  pushTestOk: "The relay works: alert received in {0} s.",
  pushTestFail: "No alert received. Check Brave\u2019s push messaging and the relay variables.",
  pushOff: "Off: the extension checks Gmail at regular intervals.",
  pushActive: "On: Gmail alerts the extension as soon as a message arrives.",
  pushLast: "Last alert received: {0}",
  pushErrMissingConfig: "Incomplete setup: generate the keys, then save the relay address and the Pub/Sub topic.",
  pushErrRelayUnreachable: "Relay unreachable: check the Cloudflare Worker address and that it is deployed.",
  pushErrRelayAuth: "The relay rejects the keys: check RELAY_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_JWK and the SUBSCRIPTIONS KV namespace in Cloudflare.",
  pushErrPushUnavailable: "The browser refuses push alerts. In Brave: brave://settings/privacy \u203A \u201CUse Google services for push messaging\u201D, then restart Brave.",
  pushErrWatchFailed: "Gmail refuses to alert the Pub/Sub topic: check the topic name and that gmail-api-push@system.gserviceaccount.com has the \u201CPub/Sub Publisher\u201D role on it.",
  pushErrNoAccounts: "Add a Gmail account first.",
  pushBraveHint: "Brave: turn on \u201CUse Google services for push messaging\u201D in brave://settings/privacy.",
  transferSectionFresh: "Already set up on another device?",
  transferSection: "Other devices",
  transferHelpFresh: "Import the configuration file exported from your other device: Google client ID, accounts, colors, settings and instant notifications are restored at once. Otherwise, follow the steps below.",
  transferHelp: "To install the extension elsewhere without redoing everything: export the configuration, then import the file on the other device.",
  exportConfig: "Export configuration",
  importConfig: "Import a configuration",
  exportDone: "File saved to your downloads.",
  exportWarning: "This file contains your relay keys: keep it to yourself (never on GitHub or in a public email) and delete it after importing. It contains no password and no email.",
  importConfirm: "Replace this device\u2019s settings with those from the file ({0} account(s))?",
  importDone: "Configuration imported ({0} account(s)). If an account asks to sign in again, click \u201CSign in again\u201D in the extension.",
  importErrInvalid: "This file is not a Gmail Preview configuration.",
  importErrTooLarge: "File too large to be a configuration.",
  importErrVersion: "Configuration created by a newer version: update the extension first.",
  importErrNoClientId: "The configuration has no valid Google client ID.",
  syncLabel: "Share the configuration with my other synced browsers",
  syncHelp: "If browser sync includes extensions, a new device picks up the configuration by itself. Otherwise, use the file.",
  syncedFrom: "Configuration restored from sync on {0}.",
  privacyNote: "Your messages never leave your browser: the extension talks directly to Google. The optional instant-notification relay only receives a signal, never your messages."
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
function unreadLabel(count) {
  if (count === 0) return t("noUnread");
  if (count === 1) return t("oneUnread");
  return t("unreadCount", count);
}
var locales = { fr: "fr-CA", en: "en-CA" };
function formatShortDate(timestamp, now = Date.now()) {
  const date = new Date(timestamp);
  const today = new Date(now);
  const locale = locales[current];
  if (date.toDateString() === today.toDateString()) {
    return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(date);
  }
  if (date.getFullYear() === today.getFullYear()) {
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short" }).format(date);
  }
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(date);
}
function formatLongDate(timestamp) {
  return new Intl.DateTimeFormat(locales[current], { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp));
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

// src/lib/thread-layout.ts
var GROUP_FROM = 4;
function layoutThread(messages) {
  const last = messages.length - 1;
  const firstUnread = messages.findIndex((m) => m.unread);
  const focusIndex = firstUnread >= 0 ? firstUnread : Math.max(0, last);
  const expanded = messages.map((m, i) => m.unread || i === last);
  const hidden = focusIndex >= GROUP_FROM ? [1, focusIndex - 2] : null;
  return { focusIndex, expanded, hidden };
}

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
  notificationPosition: "top-right",
  instantPush: false,
  relayUrl: "",
  pubsubTopic: "",
  syncConfig: true
};
async function getSettings() {
  const { settings: settings2 } = await chrome.storage.local.get("settings");
  return { ...DEFAULT_SETTINGS, ...settings2 };
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
async function getAccountStates() {
  const { accountStates } = await chrome.storage.local.get("accountStates");
  return accountStates ?? {};
}
async function getCollapsed() {
  const { collapsed } = await chrome.storage.local.get("collapsed");
  return collapsed ?? [];
}
async function setCollapsed(email, isCollapsed) {
  const current2 = new Set(await getCollapsed());
  if (isCollapsed) current2.add(email);
  else current2.delete(email);
  await chrome.storage.local.set({ collapsed: [...current2] });
}

// src/popup/popup.ts
var settings;
var sections = /* @__PURE__ */ new Map();
var clients = /* @__PURE__ */ new Map();
var app = document.getElementById("app");
var listView = h("main", { class: "list-view" });
var detailView = h("main", { class: "detail-view", hidden: true });
var toastEl = h("div", { class: "toast", role: "status", "aria-live": "polite", hidden: true });
function clientFor(email) {
  let client = clients.get(email);
  if (!client) {
    client = new GmailClient((forceRefresh) => send({ type: "getToken", email, forceRefresh }));
    clients.set(email, client);
  }
  return client;
}
function isAuthError(error) {
  return error instanceof RemoteError && (error.code === "auth_required" || error.code === "mismatch") || error instanceof Error && error.name === "AuthRequiredError";
}
var toastTimer;
function toast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toastEl.hidden = true;
  }, 3e3);
}
function openTab(url) {
  void chrome.tabs.create({ url });
  window.close();
}
function refreshBadge() {
  send({ type: "refresh" }).catch(() => void 0);
}
function renderHeader() {
  return h(
    "header",
    { class: "app-header" },
    h("img", { class: "app-logo", src: "icons/icon-32.png", width: 22, height: 22, alt: "" }),
    h("h1", { class: "app-title" }, t("appName")),
    renderFilter(),
    iconButton("refresh", t("refresh"), () => void loadAll()),
    iconButton("add", t("addAccount"), () => void addAccount()),
    iconButton("settings", t("settings"), () => {
      void chrome.runtime.openOptionsPage();
      window.close();
    })
  );
}
function renderFilter() {
  const choice = (unreadOnly, label) => {
    const button = h("button", { type: "button", class: "segment", "aria-pressed": String(settings.unreadOnly === unreadOnly) }, label);
    button.addEventListener("click", () => {
      if (settings.unreadOnly === unreadOnly) return;
      settings.unreadOnly = unreadOnly;
      void saveSettings({ unreadOnly });
      for (const el of button.parentElement?.querySelectorAll(".segment") ?? []) {
        el.setAttribute("aria-pressed", String(el === button));
      }
      showList();
      void loadAll();
    });
    return button;
  };
  return h("div", { class: "segmented", role: "group", "aria-label": t("filterLabel") }, choice(true, t("filterUnread")), choice(false, t("filterAll")));
}
async function addAccount() {
  if (!settings.clientId) {
    void chrome.runtime.openOptionsPage();
    window.close();
    return;
  }
  toast(t("addAccountHint"));
  try {
    await send({ type: "addAccount" });
    await init();
  } catch (error) {
    if (error instanceof RemoteError && error.code !== "canceled") toast(t("authFailed", error.message));
  }
}
function emptyState(title, text, actionLabel, action) {
  return h(
    "div",
    { class: "empty-state" },
    h("span", { class: "empty-icon" }, icon("mail", 40)),
    h("h2", {}, title),
    h("p", {}, text),
    h("button", { type: "button", class: "filled-button", onclick: action }, actionLabel)
  );
}
function renderSection(section) {
  const unreadText = section.unread === null ? "" : unreadLabel(section.unread);
  const toggle = h(
    "button",
    {
      type: "button",
      class: "section-toggle",
      "aria-expanded": String(!section.collapsed),
      title: t(section.collapsed ? "expand" : "collapse", section.email)
    },
    h("span", { class: "chevron" }, icon("expandMore")),
    avatar(section.email, section.email, section.color),
    h(
      "span",
      { class: "section-title" },
      h("span", { class: "section-email" }, section.email),
      h("span", { class: `section-unread ${section.unread ? "has-unread" : ""}` }, unreadText)
    )
  );
  toggle.addEventListener("click", () => void toggleSection(section));
  const header2 = h(
    "div",
    { class: "section-header" },
    toggle,
    iconButton("openInNew", t("openGmail"), () => openTab(gmailWebUrl(section.email)))
  );
  section.el.classList.toggle("collapsed", section.collapsed);
  if (section.collapsed) {
    section.el.replaceChildren(header2);
    return;
  }
  let body;
  switch (section.status) {
    case "loading":
      body = h("div", { class: "skeletons", "aria-label": t("loading") }, ...Array.from({ length: 3 }, () => h("div", { class: "skeleton" })));
      break;
    case "reauth":
      body = h(
        "div",
        { class: "section-message warning" },
        icon("warning"),
        h("span", {}, t("reauthNeeded")),
        h("button", { type: "button", class: "text-button", onclick: (() => void reconnect(section.email)) }, t("reconnect"))
      );
      break;
    case "error":
      body = h(
        "div",
        { class: "section-message" },
        h("span", {}, t("loadError")),
        h("button", { type: "button", class: "text-button", onclick: (() => void loadAccount(section.email)) }, t("retry"))
      );
      break;
    case "ok":
      body = section.threads.length ? h("ul", { class: "thread-list" }, ...section.threads.map((thread) => renderThreadRow(section, thread))) : h("p", { class: "section-message muted" }, t(settings.unreadOnly ? "noUnreadMail" : "inboxEmpty"));
      break;
  }
  section.el.replaceChildren(header2, body);
}
function renderThreadRow(section, thread) {
  const open = () => void openThread(section, thread);
  const count = thread.messageCount > 1 ? h("span", { class: "thread-count" }, String(thread.messageCount)) : null;
  const row = h(
    "li",
    {
      class: `thread ${thread.unread ? "unread" : ""}`,
      tabindex: 0,
      role: "button",
      "aria-label": `${thread.from.name} \u2014 ${thread.subject || t("noSubject")}`
    },
    h(
      "div",
      { class: "thread-top" },
      h("span", { class: "thread-from" }, h("span", { class: "thread-name" }, thread.from.name), count),
      h("span", { class: "thread-date" }, formatShortDate(thread.date))
    ),
    h("div", { class: "thread-subject" }, thread.subject || t("noSubject")),
    thread.snippet ? h("div", { class: "thread-snippet" }, thread.snippet) : "",
    h(
      "div",
      { class: "thread-actions" },
      iconButton("archive", t("archive"), () => void runAction(section, thread, "archive")),
      iconButton("delete", t("delete"), () => void runAction(section, thread, "trash")),
      thread.unread ? iconButton("markRead", t("markRead"), () => void runAction(section, thread, "markRead")) : iconButton("markUnread", t("markUnread"), () => void runAction(section, thread, "markUnread"))
    )
  );
  row.addEventListener("click", open);
  row.addEventListener("keydown", (event) => {
    if (event.target === row && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      open();
    }
  });
  return row;
}
async function loadAccount(email) {
  const section = sections.get(email);
  if (!section) return;
  section.status = "loading";
  renderSection(section);
  const client = clientFor(email);
  try {
    const [threads, unread] = await Promise.all([
      section.collapsed ? Promise.resolve([]) : client.listInboxThreads(settings.maxThreads, settings.unreadOnly),
      client.getInboxUnread()
    ]);
    section.threads = threads;
    section.unread = unread;
    section.status = "ok";
  } catch (error) {
    section.status = isAuthError(error) ? "reauth" : "error";
  }
  renderSection(section);
}
async function toggleSection(section) {
  section.collapsed = !section.collapsed;
  await setCollapsed(section.email, section.collapsed);
  if (section.collapsed || section.status !== "ok") renderSection(section);
  if (!section.collapsed) await loadAccount(section.email);
}
async function reconnect(email) {
  toast(t("addAccountHint"));
  try {
    await send({ type: "getToken", email, interactive: true });
    await loadAccount(email);
    refreshBadge();
  } catch (error) {
    if (error instanceof RemoteError && error.code !== "canceled") toast(t("authFailed", error.message));
  }
}
async function loadAll() {
  await Promise.all([...sections.keys()].map(loadAccount));
  refreshBadge();
}
function applyLocally(section, thread, action, keepRow = false) {
  const index = section.threads.indexOf(thread);
  const wasUnread = thread.unread;
  const unreadBefore = section.unread;
  const isLabelChange = action === "markRead" || action === "markUnread";
  const removesRow = !isLabelChange || action === "markRead" && settings.unreadOnly && !keepRow;
  thread.unread = action === "markUnread" ? true : action === "markRead" ? false : wasUnread;
  if (removesRow && index >= 0) section.threads.splice(index, 1);
  let delta = 0;
  if (action === "markUnread") delta = wasUnread ? 0 : 1;
  else if (wasUnread) delta = -1;
  if (section.unread !== null) section.unread = Math.max(0, section.unread + delta);
  renderSection(section);
  return () => {
    thread.unread = wasUnread;
    section.unread = unreadBefore;
    if (removesRow && index >= 0) section.threads.splice(index, 0, thread);
    renderSection(section);
  };
}
async function runAction(section, thread, action) {
  const undo = applyLocally(section, thread, action);
  try {
    await clientFor(section.email)[action](thread.id);
    if (action === "archive") toast(t("archived"));
    else if (action === "trash") toast(t("deleted"));
    else if (action === "spam") toast(t("spammed"));
    refreshBadge();
    return true;
  } catch (error) {
    undo();
    if (isAuthError(error)) {
      section.status = "reauth";
      renderSection(section);
    }
    toast(t("actionError"));
    return false;
  }
}
function showList() {
  detailView.hidden = true;
  detailView.replaceChildren();
  listView.hidden = false;
}
function fitFrame(frame) {
  const doc = frame.contentDocument;
  if (!doc?.documentElement) return;
  const root = doc.documentElement;
  root.style.zoom = "1";
  const available = frame.clientWidth;
  const contentWidth = root.scrollWidth;
  const zoom = contentWidth > available + 1 ? available / contentWidth : 1;
  root.style.zoom = String(zoom);
  frame.style.height = `${Math.ceil(root.getBoundingClientRect().height) + 4}px`;
}
function renderBody(message) {
  const container = h("div", { class: "message-body" });
  const source = message.html ?? (message.text ? textToHtml(message.text) : "");
  const remote = hasRemoteContent(source);
  const draw = (showRemote) => {
    const frame = h("iframe", {
      class: "message-frame",
      // Pas de allow-scripts : aucun script du courriel ne s'exécute.
      sandbox: "allow-same-origin allow-popups allow-popups-to-escape-sandbox",
      title: message.from.name
    });
    frame.srcdoc = buildEmailDocument(source, { showRemote });
    frame.addEventListener("load", () => {
      fitFrame(frame);
      const doc = frame.contentDocument;
      if (doc?.body) new ResizeObserver(() => fitFrame(frame)).observe(doc.body);
    });
    const banner = remote && !showRemote ? h(
      "div",
      { class: "images-banner" },
      icon("image", 18),
      h("span", {}, t("imagesHidden")),
      h("button", { type: "button", class: "text-button", onclick: (() => draw(true)) }, t("showImages"))
    ) : null;
    container.replaceChildren(...banner ? [banner, frame] : [frame]);
  };
  draw(settings.alwaysShowImages);
  return container;
}
function renderMessage(message, expanded) {
  const article = h("article", { class: `message ${expanded ? "expanded" : "collapsed"}` });
  const headerEl = h(
    "button",
    { type: "button", class: "message-header", "aria-expanded": String(expanded) },
    avatar(message.from.name, message.from.email),
    h(
      "span",
      { class: "message-meta" },
      h("span", { class: "message-from" }, message.from.name, message.from.email !== message.from.name ? h("span", { class: "message-email" }, ` <${message.from.email}>`) : null),
      h("span", { class: "message-sub" }, expanded ? t("toLabel", message.to) : message.snippet)
    ),
    h("span", { class: "message-date" }, expanded ? formatLongDate(message.date) : formatShortDate(message.date))
  );
  const fill = (isExpanded) => {
    article.className = `message ${isExpanded ? "expanded" : "collapsed"}${message.unread ? " unread" : ""}`;
    headerEl.setAttribute("aria-expanded", String(isExpanded));
    const sub = headerEl.querySelector(".message-sub");
    if (sub) sub.textContent = isExpanded ? t("toLabel", message.to) : message.snippet;
    const date = headerEl.querySelector(".message-date");
    if (date) date.textContent = isExpanded ? formatLongDate(message.date) : formatShortDate(message.date);
    article.replaceChildren(headerEl);
    if (isExpanded) {
      article.append(renderBody(message));
      if (message.attachments.length) {
        article.append(
          h(
            "div",
            { class: "attachments" },
            h("span", { class: "attachments-title" }, icon("attach", 16), t("attachments")),
            h("ul", {}, ...message.attachments.map((a) => h("li", {}, a.filename)))
          )
        );
      }
    }
  };
  headerEl.addEventListener("click", () => fill(!article.classList.contains("expanded")));
  fill(expanded);
  return article;
}
function scrollToMessage(toolbar, target) {
  if (!target) return;
  const top = target.getBoundingClientRect().top - detailView.getBoundingClientRect().top + detailView.scrollTop;
  if (top > detailView.clientHeight * 0.4) detailView.scrollTop = top - toolbar.offsetHeight - 8;
}
async function openThread(section, thread) {
  const client = clientFor(section.email);
  const leave = async (action) => {
    showList();
    await runAction(section, thread, action);
  };
  const toolbar = h(
    "div",
    { class: "detail-toolbar" },
    iconButton("back", t("back"), showList),
    h("span", { class: "spacer" }),
    iconButton("archive", t("archive"), () => void leave("archive")),
    iconButton("delete", t("delete"), () => void leave("trash")),
    iconButton("spam", t("spam"), () => void leave("spam")),
    iconButton("markUnread", t("markUnread"), () => void leave("markUnread")),
    iconButton("openInNew", t("openGmail"), () => openTab(gmailWebUrl(section.email, thread.id)))
  );
  const content = h("div", { class: "detail-content" }, h("div", { class: "skeletons" }, h("div", { class: "skeleton" }), h("div", { class: "skeleton tall" })));
  detailView.replaceChildren(toolbar, content);
  listView.hidden = true;
  detailView.hidden = false;
  detailView.scrollTop = 0;
  try {
    const detail = await client.getThread(thread.id);
    const layout = layoutThread(detail.messages);
    const rendered = detail.messages.map((m, i) => renderMessage(m, layout.expanded[i] ?? false));
    const children = [...rendered];
    if (layout.hidden) {
      const [start, end] = layout.hidden;
      const count = end - start + 1;
      const group = h(
        "button",
        { type: "button", class: "older-messages", "aria-label": t("olderMessages", count) },
        h("span", { class: "older-count" }, String(count)),
        h("span", {}, t("olderMessages", count))
      );
      group.addEventListener("click", () => group.replaceWith(...rendered.slice(start, end + 1)));
      children.splice(start, count, group);
    }
    content.replaceChildren(
      h("h2", { class: "detail-subject" }, detail.subject || t("noSubject")),
      h("p", { class: "detail-account" }, section.email),
      ...children
    );
    scrollToMessage(toolbar, rendered[layout.focusIndex]);
    if (thread.unread && settings.markReadOnOpen) {
      applyLocally(section, thread, "markRead", true);
      client.markRead(thread.id).then(refreshBadge, () => void 0);
    }
  } catch (error) {
    content.replaceChildren(
      h(
        "div",
        { class: "section-message" },
        h("span", {}, t("loadError")),
        h("button", { type: "button", class: "text-button", onclick: (() => void openThread(section, thread)) }, t("retry"))
      )
    );
    if (isAuthError(error)) {
      section.status = "reauth";
      renderSection(section);
    }
  }
}
async function init() {
  settings = await getSettings();
  setLanguage(settings.language);
  document.title = t("appName");
  const accounts = await getAccounts();
  const states = await getAccountStates();
  const collapsed = new Set(await getCollapsed());
  sections.clear();
  listView.replaceChildren();
  showList();
  app.replaceChildren(renderHeader(), listView, detailView, toastEl);
  if (!settings.clientId) {
    listView.append(emptyState(t("setupTitle"), t("setupText"), t("openSettings"), () => {
      void chrome.runtime.openOptionsPage();
      window.close();
    }));
    return;
  }
  if (!accounts.length) {
    listView.append(emptyState(t("welcomeTitle"), t("welcomeText"), t("addAccount"), () => void addAccount()));
    return;
  }
  for (const [rank, account] of accounts.entries()) {
    const { email } = account;
    const el = h("section", { class: "account-section", "aria-label": email });
    const section = {
      email,
      status: "loading",
      threads: [],
      unread: states[email]?.unread ?? null,
      collapsed: collapsed.has(email),
      color: accountColor(account, rank),
      el
    };
    sections.set(email, section);
    listView.append(el);
    renderSection(section);
  }
  await loadAll();
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !detailView.hidden) {
    event.preventDefault();
    showList();
  }
});
void init();
