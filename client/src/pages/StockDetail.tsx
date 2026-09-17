import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAnalysis, useCandles, useStock, useStockNews } from '../api/hooks';
import { useWatchlist } from '../context/WatchlistContext';
import { isValidSymbol, normalizeSymbol } from '../utils/symbol';
import { SignalBadge } from '../components/SignalBadge';
import { PriceChart } from '../components/PriceChart';
import { AdvancedData } from '../components/AdvancedData';
import { NewsArticleCard } from '../components/NewsArticleCard';
import { Loading } from '../components/Loading';
import { unavailableMessage } from '../components/ErrorState';

const RANGES = ['1W', '1M', '3M', '6M', '1Y'] as const;

const SIGNAL_BULLET_COLOR: Record<string, string> = {
  BULLISH: 'bg-green',
  BEARISH: 'bg-red',
  NEUTRAL: 'bg-gray',
  NOT_ENOUGH_INFO: 'bg-gray',
};

export function StockDetail() {
  const params = useParams<{ symbol: string }>();
  const rawSymbol = params.symbol || '';
  const symbol = isValidSymbol(rawSymbol) ? normalizeSymbol(rawSymbol) : null;
  const [range, setRange] = useState<(typeof RANGES)[number]>('3M');
  const { isWatched, addStock, removeStock } = useWatchlist();

  const stockQuery = useStock(symbol || undefined);
  const analysisQuery = useAnalysis(symbol || undefined);
  const newsQuery = useStockNews(symbol || undefined);
  const candlesQuery = useCandles(symbol || undefined, range);

  useEffect(() => {
    if (symbol) document.title = `${symbol} · STOCK NEWS`;
    return () => {
      document.title = 'STOCK NEWS';
    };
  }, [symbol]);

  if (!symbol) {
    return (
      <div>
        <BackLink />
        <div className="panel px-6 py-14 text-center text-sm text-muted mt-4">No matching stock found.</div>
      </div>
    );
  }

  const quote = stockQuery.data?.quote;
  const profile = stockQuery.data?.profile;
  const watched = isWatched(symbol);
  const positive = (quote?.changePercent ?? 0) >= 0;

  return (
    <div>
      <BackLink />

      {stockQuery.isLoading ? (
        <Loading />
      ) : stockQuery.data?.unavailable ? (
        <div className="panel px-6 py-14 text-center text-sm text-muted mt-4">{unavailableMessage(stockQuery.data.unavailable)}</div>
      ) : (
        <>
          <div className="mt-4 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-text">{profile?.name || symbol}</h1>
              <div className="text-sm text-muted mt-1">
                {symbol} · {profile?.exchange || 'Unknown exchange'}
              </div>
            </div>
            <button
              type="button"
              onClick={() => (watched ? removeStock(symbol) : addStock({ symbol, name: profile?.name || symbol }))}
              className={watched ? 'btn-secondary' : 'btn-primary'}
            >
              {watched ? 'REMOVE FROM WATCHLIST' : '+ ADD TO WATCHLIST'}
            </button>
          </div>

          {quote && (
            <div className="mt-5 flex items-baseline gap-3">
              <span className="text-4xl font-bold text-text">${quote.price.toFixed(2)}</span>
              <span className={`text-base font-medium ${positive ? 'text-green' : 'text-red'}`}>
                {positive ? '+' : ''}
                {quote.changePercent.toFixed(2)}% today
              </span>
            </div>
          )}

          <div className="mt-6 flex gap-1.5">
            {RANGES.map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`text-xs font-medium px-2.5 py-1.5 rounded-sm transition-colors ${
                  range === r ? 'bg-panelhover text-text' : 'text-muted hover:text-text'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="mt-2">
            {candlesQuery.isLoading ? <Loading label="Loading chart…" /> : <PriceChart candles={candlesQuery.data?.candles || []} />}
          </div>

          <SignalSection analysis={analysisQuery.data} isLoading={analysisQuery.isLoading} />

          {analysisQuery.data && !analysisQuery.isLoading && (
            <div className="mt-4">
              <AdvancedData components={analysisQuery.data.advanced.components} totalScore={analysisQuery.data.advanced.totalScore} />
            </div>
          )}

          <div className="mt-8">
            <h2 className="text-lg font-semibold text-text mb-3">Recent News</h2>
            {newsQuery.isLoading ? (
              <Loading />
            ) : newsQuery.isError ? (
              <div className="panel px-6 py-10 text-center text-sm text-muted">News could not be loaded. Please try again.</div>
            ) : newsQuery.data?.unavailable ? (
              <div className="panel px-6 py-10 text-center text-sm text-muted">{unavailableMessage(newsQuery.data.unavailable)}</div>
            ) : newsQuery.data && newsQuery.data.articles.length > 0 ? (
              <div className="panel divide-y divide-border">
                {newsQuery.data.articles.map((a) => (
                  <NewsArticleCard key={a.id} article={a} showTicker={false} />
                ))}
              </div>
            ) : (
              <div className="panel px-6 py-10 text-center text-sm text-muted">No recent news found for {symbol}.</div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/app" className="text-xs font-semibold tracking-wide text-muted hover:text-text transition-colors">
      ← WATCHLIST
    </Link>
  );
}

function SignalSection({ analysis, isLoading }: { analysis: ReturnType<typeof useAnalysis>['data']; isLoading: boolean }) {
  return (
    <div className="panel mt-8 p-5 sm:p-6">
      <div className="text-xs font-semibold tracking-wide text-muted mb-2">CURRENT SIGNAL</div>
      {isLoading || !analysis ? (
        <Loading label="Analyzing…" />
      ) : (
        <>
          <SignalBadge signal={analysis.signal} size="lg" />
          {analysis.confidence && (
            <div className="text-xs text-muted mt-3">
              CONFIDENCE <span className="text-text font-medium">{analysis.confidence}</span>
              <span className="text-faint"> · reflects how much reliable data is available, not a probability of future returns</span>
            </div>
          )}

          <div className="mt-6">
            <div className="text-xs font-semibold tracking-wide text-muted mb-3">WHY?</div>
            {analysis.signal === 'NOT_ENOUGH_INFO' || analysis.reasons.length === 0 ? (
              <p className="text-sm text-muted">
                Not enough reliable information is currently available to generate a signal for this stock.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {analysis.reasons.map((reason, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-text">
                    <span className={`mt-1.5 h-1.5 w-1.5 rounded-full shrink-0 ${SIGNAL_BULLET_COLOR[analysis.signal]}`} />
                    {reason}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
