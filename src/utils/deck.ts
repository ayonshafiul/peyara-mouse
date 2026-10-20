import {getValueFor, setValueFor, storage} from './storage';
import type {AppsJson, DeckAction} from '../types/deck';

export const DECK_REPO_BASE =
  'https://raw.githubusercontent.com/ayonshafiul/peyara-actions/refs/heads/main';

const APPS_CACHE_KEY = 'deck:cache:apps.json';
const DECK_CACHE_PREFIX = 'deck:cache:deck:';
const ORDER_PREFIX = 'deck:order:';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

interface CacheEnvelope<T> {
  fetchedAt: number;
  data: T;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function matchSlug(appName: string, apps: AppsJson | null): string {
  if (!appName) {
    return 'unknown';
  }
  const lowered = appName.toLowerCase();
  if (apps) {
    for (const entry of apps.apps ?? []) {
      for (const candidate of entry.match ?? []) {
        if (candidate.toLowerCase() === lowered) {
          return entry.slug;
        }
      }
    }
  }
  const slug = slugify(appName);
  return slug || 'unknown';
}

export function orderKeyForSlug(slug: string): string {
  return `${ORDER_PREFIX}${slug}`;
}

function readCache<T>(key: string): T | null {
  try {
    const raw = getValueFor(key);
    if (!raw) {
      return null;
    }
    const envelope = JSON.parse(raw) as CacheEnvelope<T>;
    if (
      typeof envelope.fetchedAt !== 'number' ||
      Date.now() - envelope.fetchedAt > CACHE_TTL_MS
    ) {
      return null;
    }
    return envelope.data;
  } catch {
    return null;
  }
}

function writeCache<T>(key: string, data: T): void {
  try {
    const envelope: CacheEnvelope<T> = {fetchedAt: Date.now(), data};
    setValueFor(key, JSON.stringify(envelope));
  } catch {
    // best-effort cache
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`GET ${url} -> ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function fetchAppsJson(): Promise<AppsJson | null> {
  const cached = readCache<AppsJson>(APPS_CACHE_KEY);
  if (cached) {
    return cached;
  }
  try {
    const data = await fetchJson<AppsJson>(`${DECK_REPO_BASE}/apps.json`);
    if (data && Array.isArray(data.apps)) {
      writeCache(APPS_CACHE_KEY, data);
      return data;
    }
    return cached;
  } catch {
    return cached;
  }
}

export async function fetchDeckActions(
  slug: string,
  os: string,
): Promise<DeckAction[] | null> {
  if (!slug || slug === 'unknown') {
    return null;
  }
  const normalizedOs = os.toLowerCase();
  const cacheKey = `${DECK_CACHE_PREFIX}${slug}_${normalizedOs}`;
  const cached = readCache<DeckAction[]>(cacheKey);
  // Return stale cache immediately only if fetch fails; otherwise refresh.
  try {
    const data = await fetchJson<DeckAction[]>(
      `${DECK_REPO_BASE}/apps/${slug}_${normalizedOs}.json`,
    );
    if (Array.isArray(data)) {
      writeCache(cacheKey, data);
      return data;
    }
    return cached;
  } catch {
    return cached;
  }
}

export function loadOrderMap(slug: string): Record<string, number> {
  try {
    const raw = getValueFor(orderKeyForSlug(slug));
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, number>;
    if (parsed && typeof parsed === 'object') {
      return parsed;
    }
    return {};
  } catch {
    return {};
  }
}

export function saveOrderMap(
  slug: string,
  order: Record<string, number>,
): void {
  try {
    setValueFor(orderKeyForSlug(slug), JSON.stringify(order));
  } catch {
    // best-effort persist
  }
}

/** Persist only id -> position after a reorder. */
export function persistActionOrder(slug: string, ordered: DeckAction[]): void {
  const order: Record<string, number> = {};
  ordered.forEach((action, index) => {
    order[action.id] = index;
  });
  saveOrderMap(slug, order);
}

/**
 * Apply a persisted id->position map. Unknown ids keep preset order at the
 * end; ids missing from the preset are dropped.
 */
export function applyOrderMap(
  actions: DeckAction[],
  order: Record<string, number>,
): DeckAction[] {
  if (!actions.length || Object.keys(order).length === 0) {
    return actions;
  }
  const byId = new Map(actions.map(a => [a.id, a]));
  const known = actions
    .filter(a => typeof order[a.id] === 'number')
    .sort((a, b) => (order[a.id] ?? 0) - (order[b.id] ?? 0));
  const unranked = actions.filter(a => typeof order[a.id] !== 'number');
  const merged = [...known, ...unranked];
  // Guard against stale ids in the map that no longer exist.
  if (merged.length !== byId.size) {
    return actions;
  }
  return merged;
}

export function buildActionMessage(action: DeckAction): object {
  return {
    type: 'action',
    actionId: action.id,
    key: action.key,
    modifiers: action.modifiers ?? [],
    pressDurationMs: action.pressDurationMs ?? 0,
    pressCount: action.pressCount ?? 1,
    ...(action.code ? {code: action.code} : {}),
  };
}

export function clearDeckCachesForTests(): void {
  try {
    const keys = storage.getAllKeys();
    for (const key of keys) {
      if (
        key === APPS_CACHE_KEY ||
        key.startsWith(DECK_CACHE_PREFIX) ||
        key.startsWith(ORDER_PREFIX)
      ) {
        storage.remove(key);
      }
    }
  } catch {
    // ignore in non-mmkv test env
  }
}
