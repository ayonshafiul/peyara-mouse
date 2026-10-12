import {
  SETTINGS_INVERTED_SCROLL_KEY,
  SETTINGS_KEEP_AWAKE_KEY,
  SETTINGS_ONBOARDING_SHOW_EVERYTIME,
  SETTINGS_ONBOARDING_SHOW_FIRST_TIME,
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
  const onboardingEveryTimeSettings = getShowOnBoardingSettingsEverytime();
  if (typeof onboardingEveryTimeSettings !== 'boolean') {
    setBooleanValueFor(SETTINGS_ONBOARDING_SHOW_EVERYTIME, false);
  }
  const onboardingFirstTimeSettings = getShowOnBoardingSettingsFirstTime();
  if (typeof onboardingFirstTimeSettings !== 'boolean') {
    setBooleanValueFor(SETTINGS_ONBOARDING_SHOW_FIRST_TIME, true);
  }
}

export function getInvertedScrollSettings(): boolean | undefined {
  return getBooleanValueFor(SETTINGS_INVERTED_SCROLL_KEY);
}

export function getKeepAwakeSettings(): boolean | undefined {
  return getBooleanValueFor(SETTINGS_KEEP_AWAKE_KEY);
}

export function getResponseRateSettings(): number {
  const raw = getValueFor(SETTINGS_TOUCHPAD_RESPONSE_RATE);
  const parsed = raw != null ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : DEFAULT_TOUCHPAD_RESPONSE_RATE;
}

export function getShowOnBoardingSettingsEverytime(): boolean | undefined {
  return getBooleanValueFor(SETTINGS_ONBOARDING_SHOW_EVERYTIME);
}

export function getShowOnBoardingSettingsFirstTime(): boolean | undefined {
  return getBooleanValueFor(SETTINGS_ONBOARDING_SHOW_FIRST_TIME);
}
