import { useMemo } from 'react';
import { useWatchlist } from '../context/WatchlistContext';
import { useWatchlistBatch, WatchlistBatchEntry } from '../api/hooks';
import { SearchBar } from '../components/SearchBar';
import { StockRow } from '../components/StockRow';

export function Watchlist() {
  const { stocks, symbols, removeStock, isReady } = useWatchlist();
  const batchQuery = useWatchlistBatch(symbols);

  const bySymbol = useMemo(() => {
    const map = new Map<string, WatchlistBatchEntry>();
    for (const entry of batchQuery.data?.results || []) map.set(entry.symbol, entry);
    return map;
  }, [batchQuery.data]);

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-text mb-1">Watchlist</h1>
        <p className="text-sm text-muted">Track the stocks you care about. Search to add more.</p>
      </div>

      <SearchBar variant="hero" />

      <div className="mt-8">
        {!isReady ? null : stocks.length === 0 ? (
          <div className="panel px-6 py-14 text-center">
            <p className="text-sm text-muted">Your watchlist is empty.</p>
            <p className="text-sm text-faint mt-1">Search for a stock above and add it to get started.</p>
          </div>
        ) : (
          <div className="panel divide-y divide-border">
            {stocks.map((stock) => {
              const entry = bySymbol.get(stock.symbol);
              return (
                <StockRow
                  key={stock.symbol}
                  symbol={stock.symbol}
                  name={stock.name}
                  quote={entry?.quote}
                  signal={entry?.analysis?.signal}
                  loading={batchQuery.isLoading}
                  unavailable={entry?.unavailable}
                  onRemove={() => removeStock(stock.symbol)}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
