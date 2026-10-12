import {createMMKV} from 'react-native-mmkv';

export const storage = createMMKV();

export function setValueFor(key: string, value: string): void {
  storage.set(key, value);
}

export function getValueFor(key: string): string | undefined {
  return storage.getString(key);
}

export function setBooleanValueFor(key: string, value: boolean): void {
  storage.set(key, value);
}

export function getBooleanValueFor(key: string): boolean | undefined {
  return storage.getBoolean(key);
}
