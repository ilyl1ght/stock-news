import { useWatchlist } from '../context/WatchlistContext';
import { useWatchlistAnalyses, useWatchlistQuotes } from '../api/hooks';
import { SearchBar } from '../components/SearchBar';
import { StockRow } from '../components/StockRow';

export function Watchlist() {
  const { stocks, symbols, removeStock, isReady } = useWatchlist();
  const quotesQuery = useWatchlistQuotes(symbols);
  const analysesQuery = useWatchlistAnalyses(symbols);

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
            {stocks.map((stock, i) => {
              const quoteEntry = quotesQuery.data?.[i];
              const analysisEntry = analysesQuery.data?.[i];
              return (
                <StockRow
                  key={stock.symbol}
                  symbol={stock.symbol}
                  name={stock.name}
                  quote={quoteEntry?.quote}
                  signal={analysisEntry?.signal}
                  loading={quotesQuery.isLoading || analysesQuery.isLoading}
                  unavailable={quoteEntry?.unavailable}
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
