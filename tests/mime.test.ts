import { describe, expect, it } from 'vitest';
import { buildEmailDocument, decodeBase64Url, extractBody, hasRemoteContent, parsePerson, textToHtml } from '../src/lib/mime';

const b64 = (text: string): string =>
  btoa(String.fromCharCode(...new TextEncoder().encode(text))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

describe('parsePerson', () => {
  it('lit un nom et une adresse', () => {
    expect(parsePerson('Marie Tremblay <marie@exemple.ca>')).toEqual({ name: 'Marie Tremblay', email: 'marie@exemple.ca' });
  });
  it('enlève les guillemets', () => {
    expect(parsePerson('"Tremblay, Marie" <marie@exemple.ca>')).toEqual({ name: 'Tremblay, Marie', email: 'marie@exemple.ca' });
  });
  it('accepte une adresse seule', () => {
    expect(parsePerson('marie@exemple.ca')).toEqual({ name: 'marie@exemple.ca', email: 'marie@exemple.ca' });
    expect(parsePerson('<marie@exemple.ca>')).toEqual({ name: 'marie@exemple.ca', email: 'marie@exemple.ca' });
  });
});

describe('decodeBase64Url', () => {
  it('décode les accents et les émojis', () => {
    expect(decodeBase64Url(b64('Café à Montréal ☕ — été'))).toBe('Café à Montréal ☕ — été');
  });
});

describe('extractBody', () => {
  it('préfère le HTML et garde le texte, en ignorant les pièces jointes', () => {
    const body = extractBody({
      mimeType: 'multipart/mixed',
      parts: [
        {
          mimeType: 'multipart/alternative',
          parts: [
            { mimeType: 'text/plain', body: { data: b64('Bonjour') } },
            { mimeType: 'text/html', body: { data: b64('<p>Bonjour</p>') } },
          ],
        },
        {
          mimeType: 'application/pdf',
          filename: 'facture.pdf',
          headers: [{ name: 'Content-Disposition', value: 'attachment; filename="facture.pdf"' }],
          body: { attachmentId: 'abc', size: 1234 },
        },
      ],
    });
    expect(body.html).toBe('<p>Bonjour</p>');
    expect(body.text).toBe('Bonjour');
    expect(body.attachments).toEqual([{ filename: 'facture.pdf', mimeType: 'application/pdf', size: 1234 }]);
  });
  it('lit un message simple sans parties', () => {
    expect(extractBody({ mimeType: 'text/plain', body: { data: b64('Salut') } }).text).toBe('Salut');
  });
});

describe('textToHtml', () => {
  it('échappe le HTML et rend les liens cliquables', () => {
    const html = textToHtml('<b>Voir</b> https://exemple.ca/page.');
    expect(html).toContain('&lt;b&gt;Voir&lt;/b&gt;');
    expect(html).toContain('<a href="https://exemple.ca/page">https://exemple.ca/page</a>.');
  });
});

describe('hasRemoteContent', () => {
  it('repère les images distantes', () => {
    expect(hasRemoteContent('<img src="https://pixel.exemple/t.gif">')).toBe(true);
    expect(hasRemoteContent('<div style="background:url(//cdn.exemple/a.png)">')).toBe(true);
    expect(hasRemoteContent('<img src="data:image/png;base64,AAAA">')).toBe(false);
    expect(hasRemoteContent('<p>Rien</p>')).toBe(false);
  });
});

describe('buildEmailDocument', () => {
  it('retire les scripts et bloque le contenu distant par défaut', () => {
    const doc = buildEmailDocument('<p>Hi</p><script>alert(1)</script><meta http-equiv="refresh" content="0;url=x">', { showRemote: false });
    expect(doc).not.toContain('alert(1)');
    expect(doc).not.toContain('http-equiv="refresh"');
    expect(doc).toContain("img-src data: cid:;");
    expect(doc).toContain('<base target="_blank">');
  });
  it('autorise les images quand on le demande', () => {
    expect(buildEmailDocument('<p>Hi</p>', { showRemote: true })).toContain('img-src data: cid: https: http:');
  });
});
