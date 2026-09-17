import { CompanyProfile, Quote, SearchResult, Candle } from '../../types';

// Modular provider contracts. Swapping the data source later means writing a
// new class that implements these interfaces and changing the wiring in
// providers/index.ts - nothing else in the app needs to change.

export interface MarketDataProvider {
  readonly name: string;
  isConfigured(): boolean;
  searchSymbols(query: string): Promise<SearchResult[]>;
  getQuote(symbol: string): Promise<Quote | null>;
  getProfile(symbol: string): Promise<CompanyProfile | null>;
}

export interface ChartDataProvider {
  readonly name: string;
  isConfigured(): boolean;
  getDailyCandles(symbol: string, days: number): Promise<Candle[]>;
}
