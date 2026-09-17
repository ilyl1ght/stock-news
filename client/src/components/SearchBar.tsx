import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../api/hooks';
import { useWatchlist } from '../context/WatchlistContext';
import { useDebouncedValue } from '../utils/useDebounce';
import { isValidSymbol } from '../utils/symbol';
import { InlineLoading } from './Loading';

interface SearchBarProps {
  variant?: 'hero' | 'nav';
  onNavigate?: () => void;
  fullWidth?: boolean;
}

export function SearchBar({ variant = 'hero', onNavigate, fullWidth }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const debounced = useDebouncedValue(query, 300);
  const { data, isFetching } = useSearch(debounced);
  const { isWatched, addStock, removeStock } = useWatchlist();
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = data?.results || [];
  const showDropdown = open && query.trim().length > 0;

  function goToStock(symbol: string) {
    if (!isValidSymbol(symbol)) return;
    setOpen(false);
    setQuery('');
    navigate(`/app/stock/${symbol}`);
    onNavigate?.();
  }

  const isHero = variant === 'hero';

  return (
    <div ref={containerRef} className={`relative ${isHero || fullWidth ? 'w-full' : 'w-64'}`}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search stocks…"
        aria-label="Search stocks by ticker or company name"
        className={isHero ? 'input text-base py-3.5' : 'input text-sm py-2'}
      />
      {isFetching && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          <InlineLoading />
        </span>
      )}

      {showDropdown && (
        <div className="absolute z-20 mt-2 w-full max-h-80 overflow-y-auto panel shadow-xl">
          {data?.unavailable && (
            <div className="px-4 py-3 text-sm text-muted">Market data temporarily unavailable.</div>
          )}
          {!data?.unavailable && !isFetching && results.length === 0 && (
            <div className="px-4 py-3 text-sm text-muted">No matching stock found.</div>
          )}
          {results.map((r) => {
            const watched = isWatched(r.symbol);
            return (
              <div
                key={r.symbol}
                onClick={() => goToStock(r.symbol)}
                className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-panelhover cursor-pointer transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-text truncate">{r.name}</div>
                  <div className="text-xs text-muted">{r.symbol}</div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (watched) removeStock(r.symbol);
                    else addStock({ symbol: r.symbol, name: r.name });
                  }}
                  className={watched ? 'btn-secondary text-xs py-1.5 px-2.5 shrink-0' : 'btn-primary text-xs py-1.5 px-2.5 shrink-0'}
                >
                  {watched ? 'REMOVE' : '+ ADD TO WATCHLIST'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
