// Tagged logging for connection debugging. Dev builds only — all output
// is stripped in production (release) builds. Watch it with
// `yarn logs:android` (logcat).
//
// Privacy: never log secrets. The QR certificate fingerprint must only ever
// be logged through fpPreview(), which reveals just the first 8 chars.

export function fpPreview(
  fingerprint: string | null | undefined,
): string {
  if (!fingerprint) {
    return '(missing)';
  }
  return `${fingerprint.slice(0, 8)}…(${fingerprint.length} chars)`;
}

export function plog(scope: string, message: string, ...args: unknown[]): void {
  if (!__DEV__) {
    return;
  }
  if (args.length > 0) {
    console.log(`[Peyara][${scope}] ${message}`, ...args);
  } else {
    console.log(`[Peyara][${scope}] ${message}`);
  }
}

export function plogError(
  scope: string,
  message: string,
  ...args: unknown[]
): void {
  if (!__DEV__) {
    return;
  }
  if (args.length > 0) {
    console.error(`[Peyara][${scope}] ${message}`, ...args);
  } else {
    console.error(`[Peyara][${scope}] ${message}`);
  }
}
