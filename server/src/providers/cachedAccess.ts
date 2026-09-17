import { marketData, newsProvider, chartData } from './index';
import { withCache, TTL } from '../utils/cache';
import { CompanyProfile, Quote, SearchResult, Candle } from '../types';
import { RawNewsArticle } from './news/types';

// Cached access layer. Routes AND the analysis engine both go through these
// functions so a quote/news/candle fetch that just happened for one purpose
// (e.g. rendering the stock detail page) is reused by the other (e.g. the
// analysis engine) instead of hitting the provider twice.

export function searchSymbolsCached(query: string): Promise<SearchResult[]> {
  const key = `search:${query.trim().toLowerCase()}`;
  return withCache(key, TTL.SEARCH, () => marketData.searchSymbols(query));
}

export function getQuoteCached(symbol: string): Promise<Quote | null> {
  const key = `quote:${symbol}`;
  return withCache(key, TTL.QUOTE, () => marketData.getQuote(symbol));
}

export function getProfileCached(symbol: string): Promise<CompanyProfile | null> {
  const key = `profile:${symbol}`;
  return withCache(key, TTL.PROFILE, () => marketData.getProfile(symbol));
}

export function getCompanyNewsCached(symbol: string, fromDate: string, toDate: string): Promise<RawNewsArticle[]> {
  const key = `company-news:${symbol}:${fromDate}:${toDate}`;
  return withCache(key, TTL.COMPANY_NEWS, () => newsProvider.getCompanyNews(symbol, fromDate, toDate));
}

export function getGeneralNewsCached(): Promise<RawNewsArticle[]> {
  return withCache('general-news', TTL.GENERAL_NEWS, () => newsProvider.getGeneralNews());
}

export function getDailyCandlesCached(symbol: string, days: number): Promise<Candle[]> {
  const key = `candles:${symbol}:${days}`;
  return withCache(key, TTL.CANDLES, () => chartData.getDailyCandles(symbol, days));
}
