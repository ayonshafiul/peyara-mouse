import {
  SETTINGS_INVERTED_SCROLL_KEY,
  SETTINGS_KEEP_AWAKE_KEY,
  SETTINGS_POINTER_ACCELERATION_KEY,
  SETTINGS_TOUCHPAD_RESPONSE_RATE,
  DEFAULT_TOUCHPAD_RESPONSE_RATE,
} from '../constants/settings';
import {
  setBooleanValueFor,
  getBooleanValueFor,
  getValueFor,
} from './storage';

export function initializeDefaultSettings(): void {
  const invertedScrollSettings = getInvertedScrollSettings();
  if (typeof invertedScrollSettings !== 'boolean') {
    setBooleanValueFor(SETTINGS_INVERTED_SCROLL_KEY, false);
  }
  const keepAwakeSettings = getKeepAwakeSettings();
  if (typeof keepAwakeSettings !== 'boolean') {
    setBooleanValueFor(SETTINGS_KEEP_AWAKE_KEY, true);
  }
  if (typeof getBooleanValueFor(SETTINGS_POINTER_ACCELERATION_KEY) !== 'boolean') {
    setBooleanValueFor(SETTINGS_POINTER_ACCELERATION_KEY, false);
  }
}

export function getInvertedScrollSettings(): boolean | undefined {
  return getBooleanValueFor(SETTINGS_INVERTED_SCROLL_KEY);
}

export function getKeepAwakeSettings(): boolean | undefined {
  return getBooleanValueFor(SETTINGS_KEEP_AWAKE_KEY);
}

/** Pointer acceleration is opt-in: off unless enabled in Settings. */
export function getPointerAccelerationSettings(): boolean {
  return getBooleanValueFor(SETTINGS_POINTER_ACCELERATION_KEY) ?? false;
}

export function getResponseRateSettings(): number {
  const raw = getValueFor(SETTINGS_TOUCHPAD_RESPONSE_RATE);
  const parsed = raw != null ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_TOUCHPAD_RESPONSE_RATE;
}
