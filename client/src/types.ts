export interface Quote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

export interface CompanyProfile {
  symbol: string;
  name: string;
  exchange: string;
  industry?: string;
  logo?: string;
}

export interface SearchResult {
  symbol: string;
  name: string;
  exchange?: string;
  type?: string;
}

export interface Candle {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type NewsScope = 'company' | 'general';
export type SentimentLabel = 'positive' | 'neutral' | 'negative';

export interface Sentiment {
  label: SentimentLabel;
  score: number;
}

export interface NewsArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;
  image?: string;
  relatedSymbol?: string;
  scope: NewsScope;
  sentiment: Sentiment;
}

export type Signal = 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'NOT_ENOUGH_INFO';
export type Confidence = 'Low' | 'Moderate' | 'High';

export interface AnalysisComponent {
  key: string;
  label: string;
  available: boolean;
  rawDetail: string;
  contribution: number;
  weight: number;
}

export interface AnalysisResult {
  symbol: string;
  signal: Signal;
  score: number | null;
  confidence: Confidence | null;
  reasons: string[];
  advanced: {
    components: AnalysisComponent[];
    totalScore: number | null;
    bullishThreshold: number;
    bearishThreshold: number;
  };
  generatedAt: number;
  unavailable?: string | null;
}

export type AlertType = 'NEWS' | 'SIGNAL_CHANGE' | 'PRICE_MOVEMENT';

export interface WatchlistEvent {
  id: string;
  symbol: string;
  companyName?: string;
  type: AlertType;
  headline: string;
  detail: string;
  reasons: string[];
  createdAt: number;
  meta?: Record<string, unknown>;
  discordSent: boolean;
}

export interface DiscordAlertPreferences {
  enabled: boolean;
  newsAlerts: boolean;
  signalChangeAlerts: boolean;
  priceMovementAlerts: boolean;
  cooldownMinutes: number;
  priceMovementThresholdPercent: number;
}

export interface WatchedStock {
  symbol: string;
  name: string;
  exchange?: string;
}

export interface ProviderStatus {
  name: string;
  configured: boolean;
  ok: boolean;
  lastSuccessAt: number | null;
  lastErrorAt: number | null;
  lastErrorMessage: string | null;
}
