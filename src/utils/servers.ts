import {
  QRCODE_SECRET,
  SERVER_KEY,
  MIN_DESKTOP_APP_VERSION,
} from '../constants/settings';
import {getValueFor, setValueFor} from './storage';
import {gte} from 'semver';
import {verifyPinnedServer} from '../native/PeyaraSocket';
import {fpPreview, plog, plogError} from './logger';

export function getServers(): string[] {
  const servers = getValueFor(SERVER_KEY);
  if (servers) {
    try {
      const parsedServers = JSON.parse(servers);
      if (!Array.isArray(parsedServers)) {
        throw new Error('bad store');
      }
      return parsedServers;
    } catch {
      setValueFor(SERVER_KEY, JSON.stringify([]));
      return [];
    }
  }
  // initialize store
  setValueFor(SERVER_KEY, JSON.stringify([]));
  return [];
}

export async function addServer(qrCodeValue: string): Promise<{
  error: boolean;
  errorTitle: string;
}> {
  const errorObject = {
    error: false,
    errorTitle: '',
  };

  if (!qrCodeValue) {
    errorObject.error = true;
    errorObject.errorTitle = 'No data found';
    return errorObject;
  }

  // v2 QR format (TLS-pinned):
  // <version>,<peyara>,<host>,sha256:<fingerprint>,<https-url>,...
  const fields = qrCodeValue.split(',');
  if (fields.length < 5) {
    errorObject.error = true;
    errorObject.errorTitle = 'QRCode seems to be invalid';
    return errorObject;
  }

  const [appVersion, secret, hostName, ...rest] = fields;
  plog(
    'QR',
    `addServer fields=${fields.length} version=${appVersion} host=${hostName}`,
  );

  // The desktop app must be at least the minimum supported version.
  try {
    if (!gte(appVersion, MIN_DESKTOP_APP_VERSION)) {
      plogError(
        'QR',
        `outdated desktop app version: ${appVersion} (min ${MIN_DESKTOP_APP_VERSION})`,
      );
      errorObject.error = true;
      errorObject.errorTitle =
        'Please update desktop app to the latest version and try again';
      return errorObject;
    }
  } catch {
    plogError('QR', `unparseable version: ${appVersion}`);
    errorObject.error = true;
    errorObject.errorTitle = 'QRCode seems to be invalid';
    return errorObject;
  }

  if (secret !== QRCODE_SECRET) {
    plogError('QR', 'magic secret mismatch');
    errorObject.error = true;
    errorObject.errorTitle =
      'Make sure to scan the QRcode shown only on Peyara Desktop App';
    return errorObject;
  }

  const fingerprintField = rest.find(f =>
    f.trim().toLowerCase().startsWith('sha256:'),
  );
  const fingerprint = fingerprintField
    ? fingerprintField.trim().slice('sha256:'.length).toLowerCase()
    : '';
  const fingerprintValid = /^[0-9a-f]{64}$/.test(fingerprint);
  plog(
    'QR',
    `fingerprint present=${!!fingerprintField} valid=${fingerprintValid} preview=${fpPreview(fingerprint)}`,
  );
  if (!fingerprintValid) {
    errorObject.error = true;
    errorObject.errorTitle =
      'QRCode is missing a valid certificate fingerprint. Please scan the QR code again';
    return errorObject;
  }

  const pairField = rest.find(f =>
    f.trim().toLowerCase().startsWith('pair:'),
  );
  const pair = pairField
    ? pairField.trim().slice('pair:'.length).toLowerCase()
    : '';
  const pairValid = /^[0-9a-f]{8}$/.test(pair);
  plog('QR', `pairing code present=${!!pairField} valid=${pairValid}`);
  if (!pairValid) {
    errorObject.error = true;
    errorObject.errorTitle =
      'QRCode is missing a valid pairing code. Please scan the QR code again';
    return errorObject;
  }

  const urls = rest
    .map(f => f.trim().replace(/\/+$/, ''))
    .filter(f => f.toLowerCase().startsWith('https://'));
  plog('QR', `candidate urls=${urls.length}`);
  if (urls.length === 0) {
    errorObject.error = true;
    errorObject.errorTitle = 'QRCode seems to be invalid';
    return errorObject;
  }

  return pairWithCandidates({host: hostName, fingerprint, pair, urls});
}

export interface PairingInput {
  host: string;
  fingerprint: string;
  pair: string;
  urls: string[];
}

export interface PairingResult {
  error: boolean;
  errorTitle: string;
}

// Tries candidate urls in order: the first one passing certificate pinning +
// discovery verification wins and is saved (url, host, fingerprint and
// pairing code — they always rotate together). Plain fetch can't do the
// pinning, so the native module performs the pinned GET / check.
export async function pairWithCandidates(
  input: PairingInput,
): Promise<PairingResult> {
  const {host, fingerprint, pair, urls} = input;
  let serverEntry: string | null = null;
  for (const url of urls) {
    try {
      plog('TLS', `verifying ${url} fp=${fpPreview(fingerprint)}`);
      await verifyPinnedServer(fingerprint, url);
      plog('TLS', `verified ${url}`);
      serverEntry =
        url +
        QRCODE_SECRET +
        host +
        QRCODE_SECRET +
        fingerprint +
        QRCODE_SECRET +
        pair;
      break;
    } catch (err) {
      plogError(
        'TLS',
        `verify failed ${url}: ${err instanceof Error ? err.message : String(err)}`,
      );
      // try next url
    }
  }
  if (!serverEntry) {
    plogError('TLS', 'no candidate url passed verification');
    return {
      error: true,
      errorTitle:
        "Couldn't connect to server. Make sure this phone and the PC are on the same WiFi network",
    };
  }
  plog('QR', `server saved host=${host} url=${urlPartOf(serverEntry)}`);
  const servers = getValueFor(SERVER_KEY);
  if (servers) {
    try {
      const serversArray: string[] = JSON.parse(servers);
      serversArray.unshift(serverEntry);
      setValueFor(SERVER_KEY, JSON.stringify(serversArray));
    } catch {
      setValueFor(SERVER_KEY, JSON.stringify([]));
      return {error: true, errorTitle: "Couldn't save the server url"};
    }
  } else {
    // initialize store with server value
    setValueFor(SERVER_KEY, JSON.stringify([serverEntry]));
  }
  return {error: false, errorTitle: ''};
}

function urlPartOf(serverEntry: string): string {
  return serverEntry.split(QRCODE_SECRET)[0];
}

// Manual pairing (no camera): same flow as a QR scan but with typed-in
// values. The desktop shows the URL, the fingerprint (with Copy button)
// and the pairing code on screen.
export async function pairManually(input: {
  host?: string;
  url: string;
  fingerprint: string;
  pair: string;
}): Promise<PairingResult> {
  const host = (input.host ?? '').trim() || 'Manual';
  const url = input.url.trim().replace(/\/+$/, '');
  const fingerprint = input.fingerprint.trim().toLowerCase();
  const pair = input.pair.trim().toLowerCase();
  if (!url.toLowerCase().startsWith('https://')) {
    return {error: true, errorTitle: 'Server URL must start with https://'};
  }
  if (!/^[0-9a-f]{64}$/.test(fingerprint)) {
    return {
      error: true,
      errorTitle: 'Fingerprint must be 64 hex characters',
    };
  }
  if (!/^[0-9a-f]{8}$/.test(pair)) {
    return {error: true, errorTitle: 'Pairing code must be 8 hex characters'};
  }
  plog('QR', `manual pairing host=${host} url=${url}`);
  return pairWithCandidates({host, fingerprint, pair, urls: [url]});
}

export function setServers(serversArray: string[]): void {
  setValueFor(SERVER_KEY, JSON.stringify(serversArray));
}
