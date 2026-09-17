// Small in-memory TTL cache. Keeps repeated requests (from the UI polling and
// the background monitor) from hammering third-party APIs, per the
// "use caching, don't hammer providers" requirement.

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function cacheSet<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/** Fetch-or-compute with caching. Errors are not cached. */
export async function withCache<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
  const cached = cacheGet<T>(key);
  if (cached !== undefined) return cached;
  const value = await fn();
  cacheSet(key, value, ttlMs);
  return value;
}

export const TTL = {
  QUOTE: 30_000,
  SEARCH: 5 * 60_000,
  PROFILE: 24 * 60 * 60_000,
  COMPANY_NEWS: 2 * 60_000,
  GENERAL_NEWS: 2 * 60_000,
  CANDLES: 60 * 60_000,
  ANALYSIS: 60_000,
};
