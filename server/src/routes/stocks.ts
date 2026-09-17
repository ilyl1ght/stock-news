import { Router } from 'express';
import { getQuoteCached, getProfileCached, getDailyCandlesCached, getCompanyNewsCached } from '../providers/cachedAccess';
import { analyzeStock } from '../analysis/engine';
import { enrichArticles } from '../analysis/newsEnrichment';
import { isValidSymbol, normalizeSymbol } from '../utils/validate';
import { isFinnhubConfigured } from '../config';
import { getAllStatuses } from '../providers';

export const stocksRouter = Router();

const RANGE_TO_DAYS: Record<string, number> = {
  '1W': 7,
  '1M': 22,
  '3M': 66,
  '6M': 132,
  '1Y': 260,
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

stocksRouter.get('/:symbol', async (req, res) => {
  const symbol = requireSymbol(req, res);
  if (!symbol) return;

  if (!isFinnhubConfigured()) {
    return res.json({ symbol, quote: null, profile: null, unavailable: 'provider_not_configured' });
  }

  const [quote, profile] = await Promise.all([getQuoteCached(symbol), getProfileCached(symbol)]);

  if (!quote) {
    const unavailable = finnhubIsHealthy() ? 'not_found' : 'provider_error';
    return res.json({ symbol, quote: null, profile: profile || null, unavailable });
  }

  res.json({ symbol, quote, profile: profile || null, unavailable: null });
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

  if (!isFinnhubConfigured()) {
    return res.json({
      symbol,
      signal: 'NOT_ENOUGH_INFO',
      score: null,
      confidence: null,
      reasons: [],
      advanced: { components: [], totalScore: null, bullishThreshold: 15, bearishThreshold: -15 },
      generatedAt: Date.now(),
      unavailable: 'provider_not_configured',
    });
  }

  try {
    const result = await analyzeStock(symbol);
    res.json({ ...result, unavailable: null });
  } catch {
    res.status(200).json({
      symbol,
      signal: 'NOT_ENOUGH_INFO',
      score: null,
      confidence: null,
      reasons: [],
      advanced: { components: [], totalScore: null, bullishThreshold: 15, bearishThreshold: -15 },
      generatedAt: Date.now(),
      unavailable: 'provider_error',
    });
  }
});
