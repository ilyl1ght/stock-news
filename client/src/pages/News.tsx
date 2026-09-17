import { useState } from 'react';
import { useGeneralNews, useWatchlistNews } from '../api/hooks';
import { useWatchlist } from '../context/WatchlistContext';
import { NewsArticleCard } from '../components/NewsArticleCard';
import { Loading } from '../components/Loading';
import { unavailableMessage } from '../components/ErrorState';
import { NewsArticle, SentimentLabel } from '../types';

type FilterValue = 'all' | 'watchlist' | SentimentLabel;

const FILTERS: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'ALL' },
  { value: 'watchlist', label: 'WATCHLIST' },
  { value: 'positive', label: 'POSITIVE' },
  { value: 'neutral', label: 'NEUTRAL' },
  { value: 'negative', label: 'NEGATIVE' },
];

function bySentiment(articles: NewsArticle[], filter: FilterValue): NewsArticle[] {
  if (filter === 'positive' || filter === 'neutral' || filter === 'negative') {
    return articles.filter((a) => a.sentiment.label === filter);
  }
  return articles;
}

export function News() {
  const [filter, setFilter] = useState<FilterValue>('all');
  const { symbols } = useWatchlist();
  const watchlistQuery = useWatchlistNews(symbols);
  const generalQuery = useGeneralNews();

  const showGeneral = filter !== 'watchlist';
  const watchlistArticles = bySentiment(watchlistQuery.data?.articles || [], filter);
  const generalArticles = bySentiment(generalQuery.data?.articles || [], filter);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text mb-1">News</h1>
        <p className="text-sm text-muted">The latest market news, watchlist stories first.</p>
      </div>

      <div className="flex gap-1.5 flex-wrap mb-8">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-sm transition-colors ${
              filter === f.value ? 'bg-panelhover text-text' : 'text-muted hover:text-text'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <section className="mb-8">
        <h2 className="text-xs font-semibold tracking-wide text-muted mb-3">WATCHLIST NEWS</h2>
        {symbols.length === 0 ? (
          <div className="panel px-6 py-8 text-center text-sm text-muted">Add stocks to your watchlist to see personalized news here.</div>
        ) : watchlistQuery.isLoading ? (
          <Loading />
        ) : watchlistQuery.isError ? (
          <div className="panel px-6 py-8 text-center text-sm text-muted">News could not be loaded. Please try again.</div>
        ) : watchlistQuery.data?.unavailable ? (
          <div className="panel px-6 py-8 text-center text-sm text-muted">{unavailableMessage(watchlistQuery.data.unavailable)}</div>
        ) : watchlistArticles.length > 0 ? (
          <div className="panel divide-y divide-border">
            {watchlistArticles.map((a) => (
              <NewsArticleCard key={`${a.id}-${a.relatedSymbol}`} article={a} />
            ))}
          </div>
        ) : (
          <div className="panel px-6 py-8 text-center text-sm text-muted">No matching watchlist news right now.</div>
        )}
      </section>

      {showGeneral && (
        <section>
          <h2 className="text-xs font-semibold tracking-wide text-muted mb-3">GENERAL MARKET NEWS</h2>
          {generalQuery.isLoading ? (
            <Loading />
          ) : generalQuery.isError ? (
            <div className="panel px-6 py-8 text-center text-sm text-muted">News could not be loaded. Please try again.</div>
          ) : generalQuery.data?.unavailable ? (
            <div className="panel px-6 py-8 text-center text-sm text-muted">{unavailableMessage(generalQuery.data.unavailable)}</div>
          ) : generalArticles.length > 0 ? (
            <div className="panel divide-y divide-border">
              {generalArticles.map((a) => (
                <NewsArticleCard key={a.id} article={a} showTicker={false} />
              ))}
            </div>
          ) : (
            <div className="panel px-6 py-8 text-center text-sm text-muted">No matching market news right now.</div>
          )}
        </section>
      )}
    </div>
  );
}
