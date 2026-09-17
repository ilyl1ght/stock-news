import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { WatchedStock } from '../types';
import { useSyncWatchlist } from '../api/hooks';
import { normalizeSymbol } from '../utils/symbol';

const STORAGE_KEY = 'stocknews_watchlist_v1';

function loadFromStorage(): WatchedStock[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is WatchedStock => item && typeof item.symbol === 'string' && typeof item.name === 'string');
  } catch {
    return [];
  }
}

function saveToStorage(stocks: WatchedStock[]): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stocks));
  } catch {
    // localStorage unavailable (private browsing, quota, etc.) - the app
    // still works for the current session, it just won't persist.
  }
}

interface WatchlistContextValue {
  stocks: WatchedStock[];
  symbols: string[];
  isWatched: (symbol: string) => boolean;
  addStock: (stock: WatchedStock) => void;
  removeStock: (symbol: string) => void;
  isReady: boolean;
}

const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [stocks, setStocks] = useState<WatchedStock[]>([]);
  const [isReady, setIsReady] = useState(false);
  const syncMutation = useSyncWatchlist();

  useEffect(() => {
    const loaded = loadFromStorage();
    setStocks(loaded);
    setIsReady(true);
    // Push the watchlist we just loaded to the backend so the monitor /
    // Discord alerts are in sync even if the server restarted.
    syncMutation.mutate(loaded.map((s) => s.symbol));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addStock = useCallback(
    (stock: WatchedStock) => {
      const symbol = normalizeSymbol(stock.symbol);
      if (stocks.some((s) => s.symbol === symbol)) return;
      const next = [...stocks, { ...stock, symbol }];
      setStocks(next);
      saveToStorage(next);
      syncMutation.mutate(next.map((s) => s.symbol));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stocks],
  );

  const removeStock = useCallback(
    (symbol: string) => {
      const target = normalizeSymbol(symbol);
      const next = stocks.filter((s) => s.symbol !== target);
      setStocks(next);
      saveToStorage(next);
      syncMutation.mutate(next.map((s) => s.symbol));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [stocks],
  );

  const symbols = useMemo(() => stocks.map((s) => s.symbol), [stocks]);
  const isWatched = useCallback((symbol: string) => symbols.includes(normalizeSymbol(symbol)), [symbols]);

  const value = useMemo(
    () => ({ stocks, symbols, isWatched, addStock, removeStock, isReady }),
    [stocks, symbols, isWatched, addStock, removeStock, isReady],
  );

  return <WatchlistContext.Provider value={value}>{children}</WatchlistContext.Provider>;
}

export function useWatchlist(): WatchlistContextValue {
  const ctx = useContext(WatchlistContext);
  if (!ctx) throw new Error('useWatchlist must be used within WatchlistProvider');
  return ctx;
}
