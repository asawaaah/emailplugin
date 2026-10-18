// Lecture des messages renvoyés par l'API Gmail (format « full » ou « metadata »).
// Fonctions pures, couvertes par tests/mime.test.ts.

import type { Attachment, Person } from './types';

export interface GmailHeader {
  name: string;
  value: string;
}

export interface GmailPart {
  partId?: string;
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: { size?: number; data?: string; attachmentId?: string };
  parts?: GmailPart[];
}

export function header(headers: GmailHeader[] | undefined, name: string): string {
  const lower = name.toLowerCase();
  return headers?.find((h) => h.name.toLowerCase() === lower)?.value ?? '';
}

/** « Marie Tremblay <marie@exemple.ca> » → { name, email }. */
export function parsePerson(raw: string): Person {
  const value = raw.trim();
  const match = value.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/);
  if (match) {
    const email = (match[2] ?? '').trim();
    const name = (match[1] ?? '').trim();
    return { name: name || email, email };
  }
  return { name: value, email: value };
}

/** Décode le base64 « url-safe » de Gmail en texte UTF-8. */
export function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder('utf-8').decode(bytes);
}

export interface ExtractedBody {
  html: string | null;
  text: string | null;
  attachments: Attachment[];
}

/** Trouve le corps HTML et texte d'un message, et la liste des pièces jointes. */
export function extractBody(payload: GmailPart | undefined): ExtractedBody {
  const result: ExtractedBody = { html: null, text: null, attachments: [] };
  if (!payload) return result;

  const visit = (part: GmailPart): void => {
    const mime = (part.mimeType ?? '').toLowerCase();
    const disposition = header(part.headers, 'Content-Disposition').toLowerCase();
    const isAttachment = Boolean(part.filename) && (disposition.startsWith('attachment') || Boolean(part.body?.attachmentId));

    if (isAttachment) {
      result.attachments.push({
        filename: part.filename ?? '',
        mimeType: part.mimeType ?? '',
        size: part.body?.size ?? 0,
      });
      return;
    }
    if (part.parts?.length) {
      part.parts.forEach(visit);
      return;
    }
    const data = part.body?.data;
    if (!data) return;
    if (mime === 'text/html' && result.html === null) result.html = decodeBase64Url(data);
    else if (mime === 'text/plain' && result.text === null) result.text = decodeBase64Url(data);
  };

  visit(payload);
  return result;
}

const HTML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => HTML_ESCAPES[c] ?? c);
}

/** Texte brut → HTML lisible, liens cliquables. */
export function textToHtml(text: string): string {
  const escaped = escapeHtml(text);
  const linked = escaped.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, (url) => `<a href="${url}">${url}</a>`);
  return `<div style="white-space:pre-wrap;font-family:inherit">${linked}</div>`;
}

/** Vrai si le HTML charge des images ou des styles depuis Internet. */
export function hasRemoteContent(html: string): boolean {
  return /<img[^>]+src\s*=\s*["']?\s*(https?:)?\/\//i.test(html) ||
    /url\(\s*["']?\s*(https?:)?\/\//i.test(html) ||
    /\bbackground\s*=\s*["']?\s*(https?:)?\/\//i.test(html) ||
    /<link[^>]+href\s*=\s*["']?\s*(https?:)?\/\//i.test(html);
}

/**
 * Document complet à placer dans l'iframe isolé (srcdoc).
 * Les scripts ne s'exécutent jamais (sandbox sans allow-scripts) ; la règle CSP
 * bloque en plus tout chargement distant tant que l'utilisateur n'a pas choisi
 * d'afficher les images.
 */
export function buildEmailDocument(body: string, options: { showRemote: boolean }): string {
  const remote = options.showRemote ? ' https: http:' : '';
  const csp = [
    "default-src 'none'",
    `img-src data: cid:${remote}`,
    `style-src 'unsafe-inline'${remote}`,
    `font-src data:${remote}`,
  ].join('; ');
  const cleaned = body
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<meta[^>]+http-equiv[^>]*>/gi, '')
    .replace(/<base[^>]*>/gi, '');
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
