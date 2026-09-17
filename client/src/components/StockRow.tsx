import { Link } from 'react-router-dom';
import { Quote, Signal } from '../types';
import { SignalBadge } from './SignalBadge';
import { InlineLoading } from './Loading';
import { isValidSymbol } from '../utils/symbol';

interface StockRowProps {
  symbol: string;
  name: string;
  quote: Quote | null | undefined;
  signal: Signal | null | undefined;
  loading?: boolean;
  unavailable?: string | null;
  onRemove: () => void;
}

export function StockRow({ symbol, name, quote, signal, loading, unavailable, onRemove }: StockRowProps) {
  const positive = (quote?.changePercent ?? 0) >= 0;
  const target = isValidSymbol(symbol) ? `/app/stock/${symbol}` : '/app';

  return (
    <div className="px-4 sm:px-5 py-4">
      <div className="flex items-center justify-between gap-4">
        <Link to={target} className="min-w-0 flex-1 flex items-baseline gap-2.5">
          <span className="text-sm font-semibold text-text shrink-0">{symbol}</span>
          <span className="text-sm text-muted truncate">{name}</span>
        </Link>
        <button
          type="button"
          aria-label={`Remove ${symbol} from watchlist`}
          onClick={onRemove}
          className="text-faint hover:text-red transition-colors text-lg leading-none px-1 shrink-0"
        >
          ×
        </button>
      </div>

      <div className="flex items-center justify-between gap-4 mt-2.5">
        {loading ? (
          <InlineLoading />
        ) : unavailable ? (
          <span className="text-xs text-faint">Unavailable</span>
        ) : quote ? (
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-text">${quote.price.toFixed(2)}</span>
            <span className={`text-xs font-medium ${positive ? 'text-green' : 'text-red'}`}>
              {positive ? '+' : ''}
              {quote.changePercent.toFixed(2)}%
            </span>
          </div>
        ) : (
          <span className="text-xs text-faint">—</span>
        )}

        {signal && <SignalBadge signal={signal} size="sm" />}
      </div>
    </div>
  );
}
