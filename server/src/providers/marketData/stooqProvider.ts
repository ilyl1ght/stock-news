import { Candle } from '../../types';
import { ChartDataProvider } from './types';
import { logger } from '../../utils/logger';
import { reportError, reportSuccess, registerProvider } from '../status';

// Stooq publishes free historical daily OHLCV data over a simple CSV
// endpoint with no API key required. It powers the price chart so charting
// keeps working even when no market-data API key has been configured yet.
const PROVIDER_NAME = 'Stooq (charts)';
const REQUEST_TIMEOUT_MS = 8000;

registerProvider(PROVIDER_NAME, true);

function toStooqSymbol(symbol: string): string {
  return `${symbol.trim().toLowerCase().replace(/\./g, '-')}.us`;
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function parseCsv(csv: string): Candle[] {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return [];
  const header = lines[0].toLowerCase();
  if (!header.startsWith('date,')) return []; // Stooq returns "No data" as plain text for unknown symbols
  const candles: Candle[] = [];
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',');
    if (parts.length < 6) continue;
    const [date, open, high, low, close, volume] = parts;
    const o = parseFloat(open);
    const h = parseFloat(high);
    const l = parseFloat(low);
    const c = parseFloat(close);
    const v = parseFloat(volume);
    if (![o, h, l, c].every(Number.isFinite)) continue;
    candles.push({ date, open: o, high: h, low: l, close: c, volume: Number.isFinite(v) ? v : 0 });
  }
  return candles;
}

class StooqProvider implements ChartDataProvider {
  readonly name = PROVIDER_NAME;

  isConfigured(): boolean {
    return true; // no key required
  }

  async getDailyCandles(symbol: string, days: number): Promise<Candle[]> {
    const to = new Date();
    const from = new Date();
    // Pad requested trading days into calendar days (weekends/holidays) plus
    // a little extra so the volume-trend calculation always has a baseline.
    from.setDate(from.getDate() - Math.ceil(days * 1.8) - 15);

    const url = new URL('https://stooq.com/q/d/l/');
    url.searchParams.set('s', toStooqSymbol(symbol));
    url.searchParams.set('d1', formatDate(from));
    url.searchParams.set('d2', formatDate(to));
    url.searchParams.set('i', 'd');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url.toString(), { signal: controller.signal });
      if (!res.ok) throw new Error(`Stooq request failed with status ${res.status}`);
      const text = await res.text();
      const candles = parseCsv(text);
      reportSuccess(PROVIDER_NAME);
      return candles.slice(-days);
    } catch (err) {
      reportError(PROVIDER_NAME, (err as Error).message);
      logger.warn(`Stooq candles failed for "${symbol}": ${(err as Error).message}`);
      return [];
    } finally {
      clearTimeout(timeout);
    }
  }
}

export const stooqProvider = new StooqProvider();
