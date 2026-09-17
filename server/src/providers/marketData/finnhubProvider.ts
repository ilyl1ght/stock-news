import { config, isFinnhubConfigured } from '../../config';
import { CompanyProfile, Quote, SearchResult } from '../../types';
import { MarketDataProvider } from './types';
import { NewsProvider, RawNewsArticle } from '../news/types';
import { logger } from '../../utils/logger';
import { reportError, reportSuccess } from '../status';

const BASE_URL = 'https://finnhub.io/api/v1';
const PROVIDER_NAME = 'Finnhub';
const REQUEST_TIMEOUT_MS = 8000;

interface FinnhubQuoteResponse {
  c: number; // current price
  d: number | null; // change
  dp: number | null; // percent change
  h: number; // high
  l: number; // low
  o: number; // open
  pc: number; // previous close
  t: number; // timestamp
}

interface FinnhubSearchItem {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
}

interface FinnhubSearchResponse {
  count: number;
  result: FinnhubSearchItem[];
}

interface FinnhubProfileResponse {
  name?: string;
  ticker?: string;
  exchange?: string;
  finnhubIndustry?: string;
  logo?: string;
}

interface FinnhubNewsItem {
  id: number;
  category?: string;
  datetime: number;
  headline: string;
  image?: string;
  related?: string;
  source: string;
  summary: string;
  url: string;
}

async function finnhubFetch<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(BASE_URL + path);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set('token', config.finnhubApiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url.toString(), { signal: controller.signal });
    if (!res.ok) {
      if (res.status === 429) throw new Error('Finnhub rate limit exceeded');
      if (res.status === 401 || res.status === 403) throw new Error('Finnhub API key invalid or unauthorized');
      throw new Error(`Finnhub request failed with status ${res.status}`);
    }
    const data = (await res.json()) as T;
    reportSuccess(PROVIDER_NAME);
    return data;
  } finally {
    clearTimeout(timeout);
  }
}

function mapQuote(symbol: string, raw: FinnhubQuoteResponse): Quote | null {
  // Finnhub returns all-zero fields for an unknown/invalid symbol.
  if (raw.c === 0 && raw.pc === 0 && raw.h === 0 && raw.l === 0) return null;
  return {
    symbol,
    price: raw.c,
    change: raw.d ?? raw.c - raw.pc,
    changePercent: raw.dp ?? (raw.pc ? ((raw.c - raw.pc) / raw.pc) * 100 : 0),
    high: raw.h,
    low: raw.l,
    open: raw.o,
    previousClose: raw.pc,
    timestamp: raw.t || Math.floor(Date.now() / 1000),
  };
}

function mapNewsItem(item: FinnhubNewsItem, relatedSymbol?: string): RawNewsArticle {
  return {
    id: String(item.id ?? `${item.source}-${item.datetime}-${item.headline}`),
    headline: item.headline,
    summary: item.summary || '',
    source: item.source || 'Unknown',
    url: item.url,
    datetime: item.datetime,
    image: item.image || undefined,
    relatedSymbol,
  };
}

class FinnhubProvider implements MarketDataProvider, NewsProvider {
  readonly name = PROVIDER_NAME;

  isConfigured(): boolean {
    return isFinnhubConfigured();
  }

  async searchSymbols(query: string): Promise<SearchResult[]> {
    if (!this.isConfigured()) return [];
    try {
      const data = await finnhubFetch<FinnhubSearchResponse>('/search', { q: query });
      const upperQuery = query.trim().toUpperCase();
      const results = (data.result || [])
        .filter((item) => Boolean(item.symbol))
        .map<SearchResult>((item) => ({
          symbol: item.displaySymbol || item.symbol,
          name: item.description || item.displaySymbol || item.symbol,
          type: item.type,
        }));

      // Rank exact ticker matches first, then prefix matches, then the rest
      // (Finnhub's own relevance ordering), and drop obscure instrument
      // types that would confuse a casual search for a stock.
      const allowedTypes = new Set(['Common Stock', 'ETP', 'ETF', 'EQS', '']);
      const filtered = results.filter((r) => !r.type || allowedTypes.has(r.type) || r.symbol === upperQuery);

      filtered.sort((a, b) => {
        const aExact = a.symbol.toUpperCase() === upperQuery ? 0 : 1;
        const bExact = b.symbol.toUpperCase() === upperQuery ? 0 : 1;
        if (aExact !== bExact) return aExact - bExact;
        const aPrefix = a.symbol.toUpperCase().startsWith(upperQuery) ? 0 : 1;
        const bPrefix = b.symbol.toUpperCase().startsWith(upperQuery) ? 0 : 1;
        if (aPrefix !== bPrefix) return aPrefix - bPrefix;
        return 0;
      });

      return filtered.slice(0, 8);
    } catch (err) {
      reportError(PROVIDER_NAME, (err as Error).message);
      logger.warn(`Finnhub search failed for "${query}": ${(err as Error).message}`);
      return [];
    }
  }

  async getQuote(symbol: string): Promise<Quote | null> {
    if (!this.isConfigured()) return null;
    try {
      const data = await finnhubFetch<FinnhubQuoteResponse>('/quote', { symbol });
      return mapQuote(symbol, data);
    } catch (err) {
      reportError(PROVIDER_NAME, (err as Error).message);
      logger.warn(`Finnhub quote failed for "${symbol}": ${(err as Error).message}`);
      return null;
    }
  }

  async getProfile(symbol: string): Promise<CompanyProfile | null> {
    if (!this.isConfigured()) return null;
    try {
      const data = await finnhubFetch<FinnhubProfileResponse>('/stock/profile2', { symbol });
      if (!data.name) return null;
      return {
        symbol,
        name: data.name,
        exchange: data.exchange || 'Unknown',
        industry: data.finnhubIndustry,
        logo: data.logo,
      };
    } catch (err) {
      reportError(PROVIDER_NAME, (err as Error).message);
      logger.warn(`Finnhub profile failed for "${symbol}": ${(err as Error).message}`);
      return null;
    }
  }

  async getCompanyNews(symbol: string, fromDate: string, toDate: string): Promise<RawNewsArticle[]> {
    if (!this.isConfigured()) return [];
    try {
      const data = await finnhubFetch<FinnhubNewsItem[]>('/company-news', { symbol, from: fromDate, to: toDate });
      return (data || [])
        .filter((item) => item.headline && item.datetime)
        .map((item) => mapNewsItem(item, symbol));
    } catch (err) {
      reportError(PROVIDER_NAME, (err as Error).message);
      logger.warn(`Finnhub company news failed for "${symbol}": ${(err as Error).message}`);
      return [];
    }
  }

  async getGeneralNews(): Promise<RawNewsArticle[]> {
    if (!this.isConfigured()) return [];
    try {
      const data = await finnhubFetch<FinnhubNewsItem[]>('/news', { category: 'general' });
      return (data || []).filter((item) => item.headline && item.datetime).map((item) => mapNewsItem(item));
    } catch (err) {
      reportError(PROVIDER_NAME, (err as Error).message);
      logger.warn(`Finnhub general news failed: ${(err as Error).message}`);
      return [];
    }
  }
}

export const finnhubProvider = new FinnhubProvider();
