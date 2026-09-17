import { Router } from 'express';
import { getGeneralNewsCached, getCompanyNewsCached } from '../providers/cachedAccess';
import { enrichArticles } from '../analysis/newsEnrichment';
import { isFinnhubConfigured } from '../config';
import { sanitizeSymbolList } from '../utils/validate';

export const newsRouter = Router();

newsRouter.get('/general', async (_req, res) => {
  if (!isFinnhubConfigured()) {
    return res.json({ articles: [], unavailable: 'provider_not_configured' });
  }
  try {
    const raw = await getGeneralNewsCached();
    const articles = enrichArticles(raw, 'general')
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 40);
    res.json({ articles, unavailable: null });
  } catch {
    res.json({ articles: [], unavailable: 'provider_error' });
  }
});

newsRouter.get('/watchlist', async (req, res) => {
  if (!isFinnhubConfigured()) {
    return res.json({ articles: [], unavailable: 'provider_not_configured' });
  }
  const rawSymbols = typeof req.query.symbols === 'string' ? req.query.symbols.split(',') : [];
  const symbols = sanitizeSymbolList(rawSymbols, 30);
  if (symbols.length === 0) {
    return res.json({ articles: [], unavailable: null });
  }

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 4);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const perSymbol = await Promise.all(
      symbols.map(async (symbol) => {
        const raw = await getCompanyNewsCached(symbol, fmt(from), fmt(to));
        return enrichArticles(raw, 'company');
      }),
    );
    const articles = perSymbol
      .flat()
      .sort((a, b) => b.datetime - a.datetime)
      .slice(0, 60);
    res.json({ articles, unavailable: null });
  } catch {
    res.json({ articles: [], unavailable: 'provider_error' });
  }
});
