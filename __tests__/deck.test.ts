jest.mock('react-native-mmkv', () => {
  const store = new Map<string, string>();
  return {
    createMMKV: () => ({
      set: (k: string, v: string | number | boolean) => {
        store.set(k, String(v));
      },
      getString: (k: string) => store.get(k),
      getBoolean: () => undefined,
      getAllKeys: () => [...store.keys()],
      remove: (k: string) => {
        store.delete(k);
      },
    }),
  };
});

import {
  applyOrderMap,
  buildActionMessage,
  loadSelectedActions,
  matchSlug,
  saveSelectedActions,
  selectionKeyForSlug,
  slugify,
} from '../src/utils/deck';
import type {AppsJson} from '../src/types/deck';

const apps: AppsJson = {
  version: 1,
  apps: [
    {
      slug: 'google-chrome',
      label: 'Chrome',
      match: ['Google Chrome', 'chrome.exe', 'com.google.Chrome'],
    },
  ],
};

describe('deck utils', () => {
  test('slugify matches server rules', () => {
    expect(slugify('After Effects')).toBe('after-effects');
    expect(slugify('Google Chrome!!!')).toBe('google-chrome');
    expect(slugify('')).toBe('');
  });

  test('matchSlug uses alias map case-insensitively', () => {
    expect(matchSlug('Google Chrome', apps)).toBe('google-chrome');
    expect(matchSlug('CHROME.EXE', apps)).toBe('google-chrome');
    expect(matchSlug('Photoshop', apps)).toBe('photoshop');
    expect(matchSlug('', apps)).toBe('unknown');
  });

  test('applyOrderMap persists only index order', () => {
    const actions = [
      {id: 'a', label: 'A', key: 'a'},
      {id: 'b', label: 'B', key: 'b'},
      {id: 'c', label: 'C', key: 'c'},
    ];
    const ordered = applyOrderMap(actions, {c: 0, a: 1, b: 2});
    expect(ordered.map(x => x.id)).toEqual(['c', 'a', 'b']);
  });

  test('applyOrderMap appends new ids and drops stale ones', () => {
    const actions = [
      {id: 'a', label: 'A', key: 'a'},
      {id: 'new', label: 'New', key: 'n'},
    ];
    const ordered = applyOrderMap(actions, {a: 1, stale: 0});
    expect(ordered.map(x => x.id)).toEqual(['a', 'new']);
  });

  test('selection round-trips full action objects in order', () => {
    const actions = [
      {id: 'b', label: 'B', key: 'b'},
      {id: 'a', label: 'A', key: 'a', modifiers: ['ctrl']},
    ];
    saveSelectedActions('sel-roundtrip', actions);
    expect(loadSelectedActions('sel-roundtrip')).toEqual(actions);
  });

  test('loadSelectedActions returns null when absent and filters invalid entries', () => {
    expect(loadSelectedActions('sel-absent')).toBeNull();
    const {setValueFor} = require('../src/utils/storage');
    setValueFor(
      selectionKeyForSlug('sel-invalid'),
      JSON.stringify([
        {id: 'ok', label: 'Ok', key: 'o'},
        {id: 'bad-no-key', label: 'Bad'},
        null,
        'nope',
      ]),
    );
    expect(loadSelectedActions('sel-invalid')).toEqual([
      {id: 'ok', label: 'Ok', key: 'o'},
    ]);
  });
  test('buildActionMessage defaults modifiers/timing', () => {
    expect(buildActionMessage({id: 'x', label: 'X', key: 't'})).toEqual({
      type: 'action',
      actionId: 'x',
      key: 't',
      modifiers: [],
      pressDurationMs: 0,
      pressCount: 1,
    });
  });
});
