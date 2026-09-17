import { Router } from 'express';
import { getQuoteCached, getProfileCached, getDailyCandlesCached, getCompanyNewsCached } from '../providers/cachedAccess';
import { analyzeStockCached } from '../analysis/engine';
import { enrichArticles } from '../analysis/newsEnrichment';
import { isValidSymbol, normalizeSymbol, sanitizeSymbolList } from '../utils/validate';
import { isFinnhubConfigured } from '../config';
import { getAllStatuses } from '../providers';
import { AnalysisResult, CompanyProfile, Quote } from '../types';

export const stocksRouter = Router();

const RANGE_TO_DAYS: Record<string, number> = {
  '1W': 7,
  '1M': 22,
  '3M': 66,
  '6M': 132,
  '1Y': 260,
};

const FALLBACK_ANALYSIS: Omit<AnalysisResult, 'symbol'> = {
  signal: 'NOT_ENOUGH_INFO',
  score: null,
  confidence: null,
  reasons: [],
  advanced: { components: [], totalScore: null, bullishThreshold: 15, bearishThreshold: -15 },
  generatedAt: Date.now(),
};

function requireSymbol(req: { params: { symbol?: string } }, res: import('express').Response): string | null {
  const raw = req.params.symbol || '';
  if (!isValidSymbol(raw)) {
    res.status(400).json({ error: 'Invalid stock symbol.' });
    return null;
  }
  return normalizeSymbol(raw);
}

function finnhubIsHealthy(): boolean {
  const status = getAllStatuses().find((s) => s.name === 'Finnhub');
  return status ? status.ok : true;
}

interface StockSummary {
  symbol: string;
  quote: Quote | null;
  profile: CompanyProfile | null;
  unavailable: string | null;
}

async function getStockSummary(symbol: string): Promise<StockSummary> {
  if (!isFinnhubConfigured()) {
    return { symbol, quote: null, profile: null, unavailable: 'provider_not_configured' };
  }
  const [quote, profile] = await Promise.all([getQuoteCached(symbol), getProfileCached(symbol)]);
  if (!quote) {
    const unavailable = finnhubIsHealthy() ? 'not_found' : 'provider_error';
    return { symbol, quote: null, profile: profile || null, unavailable };
  }
  return { symbol, quote, profile: profile || null, unavailable: null };
}

async function getAnalysisOrFallback(symbol: string): Promise<AnalysisResult & { unavailable: string | null }> {
  if (!isFinnhubConfigured()) {
    return { symbol, ...FALLBACK_ANALYSIS, generatedAt: Date.now(), unavailable: 'provider_not_configured' };
  }
  try {
    const result = await analyzeStockCached(symbol);
    return { ...result, unavailable: null };
  } catch {
    return { symbol, ...FALLBACK_ANALYSIS, generatedAt: Date.now(), unavailable: 'provider_error' };
  }
}

// Batch endpoint for the watchlist view: fetching quote + profile + analysis
// for N symbols in one request (instead of 2N separate requests from the
// browser) keeps polling a reasonably sized watchlist well within both our
// own rate limiter and Finnhub's free-tier limit. Must be registered before
// "/:symbol" or Express would treat "batch" as a ticker.
stocksRouter.get('/batch', async (req, res) => {
  const rawSymbols = typeof req.query.symbols === 'string' ? req.query.symbols.split(',') : [];
  const symbols = sanitizeSymbolList(rawSymbols, 50);
  if (symbols.length === 0) return res.json({ results: [] });

  const results = await Promise.all(
    symbols.map(async (symbol) => {
      const [summary, analysis] = await Promise.all([getStockSummary(symbol), getAnalysisOrFallback(symbol)]);
      return { ...summary, analysis };
    }),
  );
  res.json({ results });
});

stocksRouter.get('/:symbol', async (req, res) => {
  const symbol = requireSymbol(req, res);
  if (!symbol) return;
  res.json(await getStockSummary(symbol));
});

stocksRouter.get('/:symbol/candles', async (req, res) => {
  const symbol = requireSymbol(req, res);
  if (!symbol) return;

  const range = typeof req.query.range === 'string' && RANGE_TO_DAYS[req.query.range] ? req.query.range : '3M';
  const days = RANGE_TO_DAYS[range];

  try {
    const candles = await getDailyCandlesCached(symbol, days);
    res.json({ symbol, range, candles });
  } catch {
    res.json({ symbol, range, candles: [] });
  }
});

stocksRouter.get('/:symbol/news', async (req, res) => {
  const symbol = requireSymbol(req, res);
  if (!symbol) return;

  if (!isFinnhubConfigured()) {
    return res.json({ symbol, articles: [], unavailable: 'provider_not_configured' });
  }

  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const raw = await getCompanyNewsCached(symbol, fmt(from), fmt(to));
    const articles = enrichArticles(raw, 'company').sort((a, b) => b.datetime - a.datetime);
    res.json({ symbol, articles, unavailable: null });
  } catch {
    res.json({ symbol, articles: [], unavailable: 'provider_error' });
  }
});

stocksRouter.get('/:symbol/analysis', async (req, res) => {
  const symbol = requireSymbol(req, res);
  if (!symbol) return;
  res.json(await getAnalysisOrFallback(symbol));
});
