/**
 * @format
 */

import {addServer, getServers} from '../src/utils/servers';
import {
  MIN_DESKTOP_APP_VERSION,
  QRCODE_SECRET,
} from '../src/constants/settings';

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
  };
});

describe('QR server validation (mouse/keyboard/clipboard client)', () => {
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
    const res = await addServer(`0.0.1,${QRCODE_SECRET},host,http://x`);
    expect(res.error).toBe(true);
    expect(res.errorTitle).toMatch(/update desktop app/i);
  });

  test('rejects wrong secret', async () => {
    const res = await addServer(
      `${MIN_DESKTOP_APP_VERSION},<wrong-secret>,host,http://x`,
    );
    expect(res.error).toBe(true);
    expect(res.errorTitle).toMatch(/Peyara Desktop App/);
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
