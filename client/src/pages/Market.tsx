import { useMarketOverview } from '../api/hooks';
import { NewsArticleCard } from '../components/NewsArticleCard';
import { Loading } from '../components/Loading';

export function Market() {
  const { data, isLoading, isError } = useMarketOverview();

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-text mb-1">Market</h1>
        <p className="text-sm text-muted">A quick read on the broader market.</p>
      </div>

      {isLoading ? (
        <Loading />
      ) : isError ? (
        <div className="panel px-6 py-10 text-center text-sm text-muted">News could not be loaded. Please try again.</div>
      ) : data?.unavailable ? (
        <div className="panel px-6 py-10 text-center text-sm text-muted">Market data temporarily unavailable.</div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
            {data?.indexes.map((idx) => {
              const positive = (idx.quote?.changePercent ?? 0) >= 0;
              return (
                <div key={idx.ticker} className="panel p-5">
                  <div className="text-xs font-semibold tracking-wide text-muted">{idx.label.toUpperCase()}</div>
                  <div className="text-xs text-faint mt-0.5">{idx.ticker}</div>
                  {idx.quote ? (
                    <>
                      <div className="text-2xl font-bold text-text mt-3">${idx.quote.price.toFixed(2)}</div>
                      <div className={`text-sm font-medium mt-1 ${positive ? 'text-green' : 'text-red'}`}>
                        {positive ? '+' : ''}
                        {idx.quote.changePercent.toFixed(2)}%
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-faint mt-3">Unavailable</div>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-faint mb-8">Indexes are tracked via their most liquid ETF (SPY, QQQ, DIA) since real-time raw index data isn't available.</p>

          <section>
            <h2 className="text-xs font-semibold tracking-wide text-muted mb-3">IMPORTANT MARKET NEWS</h2>
            {data && data.news.length > 0 ? (
              <div className="panel divide-y divide-border">
                {data.news.map((a) => (
                  <NewsArticleCard key={a.id} article={a} showTicker={false} />
                ))}
              </div>
            ) : (
              <div className="panel px-6 py-8 text-center text-sm text-muted">No market news available right now.</div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
