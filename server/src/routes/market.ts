import { Router } from 'express';
import { getQuoteCached, getGeneralNewsCached } from '../providers/cachedAccess';
import { enrichArticles } from '../analysis/newsEnrichment';
import { isFinnhubConfigured } from '../config';

export const marketRouter = Router();

// Major indexes are tracked via their most liquid ETF proxies since
// Finnhub's free tier doesn't expose raw index quotes. The ETF's real price
// and % change are shown as-is (never rescaled to a fake index number) so
// nothing here is fabricated.
const INDEXES = [
  { label: 'S&P 500', ticker: 'SPY' },
  { label: 'Nasdaq 100', ticker: 'QQQ' },
  { label: 'Dow Jones', ticker: 'DIA' },
];

marketRouter.get('/overview', async (_req, res) => {
  if (!isFinnhubConfigured()) {
    return res.json({ indexes: [], news: [], unavailable: 'provider_not_configured' });
  }

  try {
    const [quotes, rawNews] = await Promise.all([
      Promise.all(INDEXES.map(async (idx) => ({ ...idx, quote: await getQuoteCached(idx.ticker) }))),
      getGeneralNewsCached(),
    ]);
    const news = enrichArticles(rawNews, 'general')
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 15);
    res.json({ indexes: quotes, news, unavailable: null });
  } catch {
    res.json({ indexes: [], news: [], unavailable: 'provider_error' });
  }
});
