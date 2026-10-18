import { describe, expect, it } from 'vitest';
import { decodeEntities, gmailWebUrl, toSummary } from '../src/lib/gmail';
import { parseAuthResponse } from '../src/lib/auth';

describe('toSummary', () => {
  it('résume une conversation : objet du premier message, expéditeur et date du dernier', () => {
    const summary = toSummary({
      id: 't1',
      messages: [
        {
          id: 'm1',
          threadId: 't1',
          labelIds: ['INBOX'],
          internalDate: '1000',
          snippet: 'premier',
          payload: { headers: [{ name: 'Subject', value: 'Souper vendredi' }, { name: 'From', value: 'Moi <moi@x.ca>' }] },
        },
        {
          id: 'm2',
          threadId: 't1',
          labelIds: ['INBOX', 'UNREAD'],
          internalDate: '2000',
          snippet: 'C&#39;est parfait &amp; merci',
          payload: { headers: [{ name: 'Subject', value: 'Re: Souper vendredi' }, { name: 'From', value: 'Luc Roy <luc@y.ca>' }] },
        },
      ],
    });
    expect(summary).toEqual({
      id: 't1',
      from: { name: 'Luc Roy', email: 'luc@y.ca' },
      subject: 'Souper vendredi',
      snippet: "C'est parfait & merci",
      date: 2000,
      unread: true,
      messageCount: 2,
    });
  });
});

describe('decodeEntities', () => {
  it('décode les entités numériques et nommées', () => {
    expect(decodeEntities('&lt;a&gt; &#233;t&#xE9; &nbsp;&inconnu;')).toBe('<a> été  &inconnu;');
  });
});

describe('gmailWebUrl', () => {
  it('ouvre le bon compte et la bonne conversation', () => {
    expect(gmailWebUrl('a+b@gmail.com', 'abc')).toBe('https://mail.google.com/mail/?authuser=a%2Bb%40gmail.com#inbox/abc');
  });
});

describe('parseAuthResponse', () => {
  const base = 'https://id.chromiumapp.org/';
  it('lit le jeton et sa durée', () => {
    const entry = parseAuthResponse(`${base}#access_token=tok&token_type=Bearer&expires_in=3599&state=s1`, 's1', 0);
    expect(entry).toEqual({ accessToken: 'tok', expiresAt: 3_599_000 });
  });
  it('refuse un state différent', () => {
    expect(() => parseAuthResponse(`${base}#access_token=tok&state=autre`, 's1')).toThrow('state_mismatch');
  });
  it('signale une annulation', () => {
    expect(() => parseAuthResponse(`${base}#error=access_denied&state=s1`, 's1')).toThrow(/access_denied/);
  });
  it("signale qu'une interaction est requise", () => {
    expect(() => parseAuthResponse(`${base}?error=interaction_required&state=s1`, 's1')).toThrow(/interaction_required/);
  });
});
