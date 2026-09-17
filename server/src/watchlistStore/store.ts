import { readJson, writeJson } from '../utils/jsonStore';

// The backend's mirror of the browser's watchlist. There are no user
// accounts, so this app is designed for a single deployment (one Discord
// destination) - the frontend keeps the canonical copy in localStorage and
// pushes the current symbol list here on every change via
// POST /api/watchlist/sync. This mirror is what the background monitor and
// the Discord webhook treat as "the watchlist" for alerting purposes, which
// is what keeps monitoring in sync automatically as stocks are added or
// removed (see README for the full explanation of this design).

const FILE = 'watchlist.json';

interface StoredWatchlist {
  symbols: string[];
  updatedAt: number;
}

let state: StoredWatchlist | null = null;

function load(): StoredWatchlist {
  if (state === null) {
    state = readJson<StoredWatchlist>(FILE, { symbols: [], updatedAt: 0 });
  }
  return state;
}

export function getWatchlistSymbols(): string[] {
  return [...load().symbols];
}

export function setWatchlistSymbols(symbols: string[]): string[] {
  const s = load();
  s.symbols = Array.from(new Set(symbols));
  s.updatedAt = Date.now();
  writeJson(FILE, s);
  return [...s.symbols];
}
