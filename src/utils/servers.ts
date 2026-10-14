import {QRCODE_SECRET, SERVER_KEY} from '../constants/settings';
import {getValueFor, setValueFor} from './storage';
import {major} from 'semver';
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

  // Protocol v2 requires the same major version as the desktop server.
  let desktopMajor: number | null = null;
  try {
    desktopMajor = major(appVersion);
  } catch {
    desktopMajor = null;
  }
  if (desktopMajor === null) {
    plogError('QR', `unparseable version: ${appVersion}`);
    errorObject.error = true;
    errorObject.errorTitle = 'QRCode seems to be invalid';
    return errorObject;
  }
  if (desktopMajor !== 2) {
    plogError('QR', `unsupported major version: ${desktopMajor}`);
    errorObject.error = true;
    errorObject.errorTitle =
      'Please update desktop app to the latest version and try again';
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

  const urls = rest
    .map(f => f.trim().replace(/\/+$/, ''))
    .filter(f => f.toLowerCase().startsWith('https://'));
  plog('QR', `candidate urls=${urls.length}`);
  if (urls.length === 0) {
    errorObject.error = true;
    errorObject.errorTitle = 'QRCode seems to be invalid';
    return errorObject;
  }

  // Try all candidate urls: the first one passing certificate pinning +
  // discovery verification wins. Plain fetch can't do the pinning, so the
  // native module performs the pinned GET / check.
  let serverEntry: string | null = null;
  for (const url of urls) {
    try {
      plog('QR', `verifying ${url} fp=${fpPreview(fingerprint)}`);
      await verifyPinnedServer(fingerprint, url);
      plog('QR', `verified ${url}`);
      serverEntry =
        url + QRCODE_SECRET + hostName + QRCODE_SECRET + fingerprint;
      break;
    } catch (err) {
      plogError(
        'QR',
        `verify failed ${url}: ${err instanceof Error ? err.message : String(err)}`,
      );
      // try next url
    }
  }
  if (!serverEntry) {
    plogError('QR', 'no candidate url passed verification');
    errorObject.error = true;
    errorObject.errorTitle =
      "Couldn't connect to server. Make sure this phone and the PC are on the same WiFi network";
    return errorObject;
  }
  plog('QR', `server saved host=${hostName} url=${serverEntry.split(QRCODE_SECRET)[0]}`);
  const servers = getValueFor(SERVER_KEY);
  if (servers) {
    try {
      const serversArray: string[] = JSON.parse(servers);
      serversArray.unshift(serverEntry);
      setValueFor(SERVER_KEY, JSON.stringify(serversArray));
    } catch {
      setValueFor(SERVER_KEY, JSON.stringify([]));
      errorObject.error = true;
      errorObject.errorTitle = "Couldn't save the server url";
      return errorObject;
    }
  } else {
    // initialize store with server value
    setValueFor(SERVER_KEY, JSON.stringify([serverEntry]));
  }
  return {error: false, errorTitle: ''};
}

export function setServers(serversArray: string[]): void {
  setValueFor(SERVER_KEY, JSON.stringify(serversArray));
}
