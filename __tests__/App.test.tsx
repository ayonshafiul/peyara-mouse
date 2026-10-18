/**
 * @format
 */

import {addServer, getServers, pairManually} from '../src/utils/servers';
import {MIN_DESKTOP_APP_VERSION, QRCODE_SECRET} from '../src/constants/settings';
import {major} from 'semver';

jest.mock('../src/utils/storage', () => {
  const store: Record<string, string> = {};
  return {
    storage: {},
    setValueFor: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    getValueFor: jest.fn((key: string) => store[key]),
    setBooleanValueFor: jest.fn(),
    getBooleanValueFor: jest.fn(),
    __clearStore: jest.fn(() => {
      for (const key of Object.keys(store)) {
        delete store[key];
      }
    }),
  };
});

jest.mock('../src/native/PeyaraSocket', () => ({
  __esModule: true,
  verifyPinnedServer: jest.fn(),
  connectPinned: jest.fn(),
  disconnectPinned: jest.fn(),
  sendPinnedMessage: jest.fn(),
  onPinnedMessage: jest.fn(),
  onPinnedStatus: jest.fn(),
}));

const TEST_FP = 'ab'.repeat(32); // 64 hex chars
const TEST_PAIR = 'ab12cd34'; // 8 hex chars
const validQR = (extra = '') =>
  `${MIN_DESKTOP_APP_VERSION},${QRCODE_SECRET},shafiul-pc,sha256:${TEST_FP},pair:${TEST_PAIR},https://192.168.1.5:1313/${extra}`;
const newerMajorQR = (extra = '') =>
  `${major(MIN_DESKTOP_APP_VERSION) + 1}.0.0,${QRCODE_SECRET},shafiul-pc,sha256:${TEST_FP},pair:${TEST_PAIR},https://192.168.1.5:1313/${extra}`;

describe('QR server validation (pinned-TLS client)', () => {
  beforeEach(() => {
    require('../src/utils/storage').__clearStore();
  });

  test('rejects empty QR data', async () => {
    const res = await addServer('');
    expect(res.error).toBe(true);
    expect(res.errorTitle).toBe('No data found');
  });

  test('rejects malformed QR data', async () => {
    const res = await addServer('not,a-valid-qr');
    expect(res.error).toBe(true);
  });

  test('rejects outdated desktop app version', async () => {
    const res = await addServer(
      `1.9.9,${QRCODE_SECRET},host,sha256:${TEST_FP},https://x`,
    );
    expect(res.error).toBe(true);
    expect(res.errorTitle).toMatch(/update desktop app/i);
  });

  test('rejects wrong secret', async () => {
    const res = await addServer(
      `${MIN_DESKTOP_APP_VERSION},<wrong-secret>,host,sha256:${TEST_FP},https://x`,
    );
    expect(res.error).toBe(true);
    expect(res.errorTitle).toMatch(/Peyara Desktop App/);
  });

  test('rejects missing fingerprint', async () => {
    const res = await addServer(
      `${MIN_DESKTOP_APP_VERSION},${QRCODE_SECRET},host,extra-field,https://x`,
    );
    expect(res.error).toBe(true);
    expect(res.errorTitle).toMatch(/fingerprint/i);
  });

  test('rejects malformed fingerprint', async () => {
    const res = await addServer(
      `${MIN_DESKTOP_APP_VERSION},${QRCODE_SECRET},host,sha256:xyz,https://x`,
    );
    expect(res.error).toBe(true);
    expect(res.errorTitle).toMatch(/fingerprint/i);
  });

  test('rejects missing pairing code', async () => {
    const res = await addServer(
      `${MIN_DESKTOP_APP_VERSION},${QRCODE_SECRET},host,sha256:${TEST_FP},https://x`,
    );
    expect(res.error).toBe(true);
    expect(res.errorTitle).toMatch(/pairing code/i);
  });

  test('rejects malformed pairing code', async () => {
    const res = await addServer(
      `${MIN_DESKTOP_APP_VERSION},${QRCODE_SECRET},host,sha256:${TEST_FP},pair:xyz,https://x`,
    );
    expect(res.error).toBe(true);
    expect(res.errorTitle).toMatch(/pairing code/i);
  });

  test('accepts newer versions above the floor (no major pin)', async () => {
    const {verifyPinnedServer} = require('../src/native/PeyaraSocket');
    verifyPinnedServer.mockResolvedValue('"peyara"');
    const res = await addServer(newerMajorQR());
    expect(res.error).toBe(false);
  });

  test('accepts valid QR after pinned verification', async () => {
    const {verifyPinnedServer} = require('../src/native/PeyaraSocket');
    verifyPinnedServer.mockResolvedValue('"peyara"');
    const res = await addServer(validQR());
    expect(res.error).toBe(false);
    expect(verifyPinnedServer).toHaveBeenCalledWith(
      TEST_FP,
      'https://192.168.1.5:1313',
    );
    const servers = getServers();
    expect(servers.length).toBe(1);
    expect(servers[0]).toContain(TEST_FP);
  });

  test('fails when no candidate url verifies', async () => {
    const {verifyPinnedServer} = require('../src/native/PeyaraSocket');
    verifyPinnedServer.mockRejectedValue(new Error('pin mismatch'));
    const res = await addServer(validQR(',https://192.168.1.6:1313/'));
    expect(res.error).toBe(true);
    expect(res.errorTitle).toMatch(/Couldn't connect/);
  });

  test('manual pairing validates fields locally', async () => {
    const badFp = await pairManually({
      url: 'https://192.168.1.5:1313',
      fingerprint: 'xyz',
      pair: TEST_PAIR,
    });
    expect(badFp.error).toBe(true);
    expect(badFp.errorTitle).toMatch(/Fingerprint/);

    const badPair = await pairManually({
      url: 'https://192.168.1.5:1313',
      fingerprint: TEST_FP,
      pair: 'xyz',
    });
    expect(badPair.error).toBe(true);
    expect(badPair.errorTitle).toMatch(/Pairing code/);

    const badUrl = await pairManually({
      url: 'http://192.168.1.5:1313',
      fingerprint: TEST_FP,
      pair: TEST_PAIR,
    });
    expect(badUrl.error).toBe(true);
    expect(badUrl.errorTitle).toMatch(/https/);
  });

  test('manual pairing saves after pinned verification', async () => {
    const {verifyPinnedServer} = require('../src/native/PeyaraSocket');
    verifyPinnedServer.mockResolvedValue('"peyara"');
    const res = await pairManually({
      host: 'manual-pc',
      url: 'https://192.168.1.5:1313/',
      fingerprint: TEST_FP.toUpperCase(),
      pair: TEST_PAIR.toUpperCase(),
    });
    expect(res.error).toBe(false);
    expect(verifyPinnedServer).toHaveBeenCalledWith(
      TEST_FP,
      'https://192.168.1.5:1313',
    );
    const servers = getServers();
    expect(servers.length).toBe(1);
    expect(servers[0]).toContain(TEST_FP);
    expect(servers[0]).toContain(TEST_PAIR);
  });

jest.mock('react-native-notify-kit', () => ({
  __esModule: true,
  default: {
    createChannel: jest.fn(),
    requestPermission: jest.fn(),
    displayNotification: jest.fn(),
    cancelAllNotifications: jest.fn(),
  },
  AndroidColor: {RED: 'red'},
  AuthorizationStatus: {AUTHORIZED: 1},
}));

  test('getServers initializes to empty list', () => {
    expect(getServers()).toEqual([]);
  });
});

describe('notification actions (connected state)', () => {
  const {
    getMediaKeyForAction,
    showConnectedNotification,
    CONNECTED_CHANNEL_ID,
  } = require('../src/utils/notifications');
  const notifee = require('react-native-notify-kit').default;

  test('maps play/mute actions to media keys', () => {
    expect(getMediaKeyForAction('play')).toBe('audio_play');
    expect(getMediaKeyForAction('mute')).toBe('audio_mute');
    expect(getMediaKeyForAction('unknown')).toBeNull();
    expect(getMediaKeyForAction(undefined)).toBeNull();
  });

  test('connected notification uses media channel with actions', async () => {
    await showConnectedNotification();
    expect(notifee.createChannel).toHaveBeenCalledWith(
      expect.objectContaining({id: CONNECTED_CHANNEL_ID}),
    );
    expect(notifee.displayNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Peyara Remote Mouse',
        android: expect.objectContaining({
          channelId: CONNECTED_CHANNEL_ID,
          actions: expect.arrayContaining([
            expect.objectContaining({
              pressAction: expect.objectContaining({id: 'play'}),
            }),
            expect.objectContaining({
              pressAction: expect.objectContaining({id: 'mute'}),
            }),
          ]),
        }),
      }),
    );
  });
});
