import {
  QRCODE_SECRET,
  SERVER_REST_RESPONSE,
  SERVER_KEY,
  MIN_DESKTOP_APP_VERSION,
} from '../constants/settings';
import {getValueFor, setValueFor} from './storage';
import {gte} from 'semver';

export function getServers(): string[] {
  const servers = getValueFor(SERVER_KEY);
  if (servers) {
    try {
      const parsedServers = JSON.parse(servers);
      if (!Array.isArray(parsedServers)) {
        throw new Error('bad store');
      }
      // TEMP-TEST-HARNESS-REMOVE-ME: seed stub server for on-device testing
      if (__DEV__ && parsedServers.length === 0) {
        return [`http://127.0.0.1:51337${QRCODE_SECRET}StubPC`];
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

function sleep(time: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve();
    }, time);
  });
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

  const qrCodeServers = qrCodeValue.split(',');
  if (!(qrCodeServers.length > 2)) {
    errorObject.error = true;
    errorObject.errorTitle = 'QRCode seems to be invalid';
    return errorObject;
  }

  const appVersion = qrCodeServers[0]; // first index should be app version
  try {
    if (!gte(appVersion, MIN_DESKTOP_APP_VERSION)) {
      errorObject.error = true;
      errorObject.errorTitle =
        'Please update desktop app to the latest version and try again';
      return errorObject;
    }
  } catch {
    errorObject.error = true;
    errorObject.errorTitle = 'QRCode seems to be invalid';
    return errorObject;
  }

  const secret = qrCodeServers[1];
  if (secret !== QRCODE_SECRET) {
    errorObject.error = true;
    errorObject.errorTitle =
      'Make sure to scan the QRcode shown only on Peyara Desktop App';
    return errorObject;
  }

  const hostName = qrCodeServers[2];
  let serverEntry: string | null = null;
  // try all possible servers to see which works
  for (let i = 3; i < qrCodeServers.length; i++) {
    const url = qrCodeServers[i];
    try {
      const result = await Promise.race([fetch(url), sleep(1000)]); // wait 1s to see if the server works
      if (!result) {
        continue;
      }
      const resultJson = await (result as Response).json();
      if (resultJson === SERVER_REST_RESPONSE) {
        serverEntry = url + QRCODE_SECRET + hostName;
        break;
      }
    } catch {
      // try next url
    }
  }
  if (!serverEntry) {
    errorObject.error = true;
    errorObject.errorTitle = "Couldn't connect to server";
    return errorObject;
  }
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
