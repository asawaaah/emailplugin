import { describe, expect, it } from 'vitest';
import { CONFIG_FORMAT, ConfigError, buildConfig, configFileName, configFingerprint, mergeAccounts, parseConfig } from '../src/lib/config-transfer';
import { generateRelayKeys } from '../src/lib/relay-keys';
import { DEFAULT_SETTINGS } from '../src/lib/storage';
import type { Settings } from '../src/lib/types';

const CLIENT_ID = '1234567890-abc.apps.googleusercontent.com';

const settings: Settings = {
  ...DEFAULT_SETTINGS,
  clientId: CLIENT_ID,
  language: 'en',
  instantPush: true,
  relayUrl: 'https://apercu-gmail-relay.exemple.workers.dev',
  pubsubTopic: 'projects/mon-projet/topics/gmail-push',
};

function errorCode(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (error instanceof ConfigError) return error.message;
    throw error;
  }
  return 'no error';
}

describe('transfert de configuration', () => {
  it('relit à l’identique une configuration exportée', async () => {
    const keys = await generateRelayKeys();
    const accounts = [
      { email: 'alice@gmail.com', addedAt: 1, color: '#1a73e8' },
      { email: 'bob@gmail.com', addedAt: 2 },
    ];
    const config = buildConfig(settings, accounts, keys, 42);
    const parsed = parseConfig(JSON.stringify(config));
    expect(parsed).toEqual(config);
    expect(parsed.accounts).toEqual([{ email: 'alice@gmail.com', color: '#1a73e8' }, { email: 'bob@gmail.com' }]);
    expect(configFingerprint(buildConfig(settings, accounts, keys, 99))).toBe(configFingerprint(config));
  });

  it('refuse ce qui n’est pas une configuration valide', () => {
    expect(errorCode(() => parseConfig('pas du json'))).toBe('not_json');
    expect(errorCode(() => parseConfig('{"format":"autre"}'))).toBe('not_a_config');
    expect(errorCode(() => parseConfig(JSON.stringify({ format: CONFIG_FORMAT, version: 2 })))).toBe('unsupported_version');
    expect(errorCode(() => parseConfig(JSON.stringify({ format: CONFIG_FORMAT, version: 1, settings: { clientId: 'n’importe quoi' } })))).toBe('no_client_id');
    expect(errorCode(() => parseConfig('x'.repeat(60_000)))).toBe('too_large');
  });

  it('ne reprend que les valeurs attendues, au bon format', () => {
    const parsed = parseConfig({
      format: CONFIG_FORMAT,
      version: 1,
      settings: {
        clientId: ` ${CLIENT_ID} `,
        language: 'de',
        pollMinutes: 7,
        unreadOnly: false,
        notificationStyle: 'popup',
        instantPush: true, // sans relais ni sujet : refusé
        relayUrl: 'javascript:alert(1)',
        injected: 'ignoré',
      },
      accounts: [
        { email: 'ALICE@gmail.com', color: 'red' },
        { email: 'alice@gmail.com' },
        { email: 'pas une adresse' },
        'texte',
      ],
      relayKeys: { secret: 'court', vapidPublicKey: 'x', vapidPrivateJwk: '{}' },
    });
    expect(parsed.settings).toEqual({ ...DEFAULT_SETTINGS, clientId: CLIENT_ID, unreadOnly: false });
    expect(parsed.settings).not.toHaveProperty('injected');
    expect(parsed.accounts).toEqual([{ email: 'alice@gmail.com' }]);
    expect(parsed.relayKeys).toBeNull();
  });

  it('ne garde que les champs utiles de la clé privée', async () => {
    const keys = await generateRelayKeys();
    const jwk = { ...(JSON.parse(keys.vapidPrivateJwk) as object), ext: true, extra: 'x' };
    const parsed = parseConfig(buildConfig(settings, [], { ...keys, vapidPrivateJwk: JSON.stringify(jwk) }));
    expect(Object.keys(JSON.parse(parsed.relayKeys?.vapidPrivateJwk ?? '{}') as object)).toEqual(['kty', 'crv', 'd', 'x', 'y']);
  });

  it('fusionne les comptes : ceux du fichier d’abord, les autres ensuite', () => {
    const current = [
      { email: 'bob@gmail.com', addedAt: 5, color: '#000000' },
      { email: 'carole@gmail.com', addedAt: 6 },
    ];
    const merged = mergeAccounts(current, [{ email: 'alice@gmail.com', color: '#1a73e8' }, { email: 'bob@gmail.com' }], 100);
    expect(merged).toEqual([
      { email: 'alice@gmail.com', addedAt: 100, color: '#1a73e8' },
      { email: 'bob@gmail.com', addedAt: 5 },
      { email: 'carole@gmail.com', addedAt: 6 },
    ]);
  });

  it('nomme le fichier avec la date du jour', () => {
    expect(configFileName(new Date(2026, 0, 5))).toBe('apercu-gmail-config-2026-01-05.json');
  });
});
