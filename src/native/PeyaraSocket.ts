import {NativeEventEmitter} from 'react-native';
import PeyaraSocket from '../../specs/NativePeyaraSocket';

// App-facing wrapper for the PeyaraSocket TurboModule (pinned-TLS
// transport). Android wraps OkHttp, iOS wraps URLSession; both pin the exact
// server certificate from the QR fingerprint and manage
// connect/reconnect/send. Status/message events arrive via NativeEventEmitter.

const emitter = new NativeEventEmitter(PeyaraSocket);

export type PinnedStatus =
  | 'connected'
  | 'disconnected'
  | 'unrecoverable'
  | 'pairing-rejected';

/** Pinned HTTPS verification: GET <baseUrl>/ must return JSON "peyara". */
export function verifyPinnedServer(
  fingerprintHex: string,
  baseUrl: string,
): Promise<string> {
  return PeyaraSocket.verify(fingerprintHex, baseUrl);
}

/**
 * Starts the managed pinned connection. The native layer sends the
 * {"type":"hello","pair":…} handshake first on open. Resolves once started;
 * connection progress (including reconnects) arrives via onPinnedStatus.
 */
export function connectPinned(
  fingerprintHex: string,
  baseUrl: string,
  pairCode: string,
): Promise<void> {
  return PeyaraSocket.connect(fingerprintHex, baseUrl, pairCode);
}

export function disconnectPinned(): void {
  PeyaraSocket.disconnect();
}

/** Fire-and-forget JSON send; the native side drops it while offline. */
export function sendPinnedMessage(message: object): void {
  PeyaraSocket.send(JSON.stringify(message));
}

/** Raw text frames from the server (parse + filter with parseServerMessage). */
export function onPinnedMessage(callback: (data: string) => void) {
  return emitter.addListener(
    'PeyaraSocketMessage',
    (event: {data?: unknown}) => {
      if (typeof event?.data === 'string') {
        callback(event.data);
      }
    },
  );
}

export function onPinnedStatus(callback: (status: PinnedStatus) => void) {
  return emitter.addListener(
    'PeyaraSocketStatus',
    (event: {status?: unknown}) => {
      const status = event?.status;
      if (
        status === 'connected' ||
        status === 'disconnected' ||
        status === 'unrecoverable' ||
        status === 'pairing-rejected'
      ) {
        callback(status);
      }
    },
  );
}
