import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './client';
import {
  AnalysisResult,
  Candle,
  CompanyProfile,
  DiscordAlertPreferences,
  NewsArticle,
  ProviderStatus,
  Quote,
  SearchResult,
  WatchlistEvent,
} from '../types';

interface StockResponse {
  symbol: string;
  quote: Quote | null;
  profile: CompanyProfile | null;
  unavailable: string | null;
}

interface CandlesResponse {
  symbol: string;
  range: string;
  candles: Candle[];
}

interface NewsResponse {
  articles: NewsArticle[];
  unavailable: string | null;
}

interface MarketIndex {
  label: string;
  ticker: string;
  quote: Quote | null;
}

interface MarketOverviewResponse {
  indexes: MarketIndex[];
  news: NewsArticle[];
  unavailable: string | null;
}

interface SettingsResponse {
  discordConfigured: boolean;
  discord: DiscordAlertPreferences;
}

interface StatusResponse {
  providers: ProviderStatus[];
  monitorIntervalMinutes: number;
  serverTime: number;
}

export function useSearch(query: string) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ['search', trimmed],
    queryFn: () => api.get<{ results: SearchResult[]; unavailable?: boolean }>(`/search?q=${encodeURIComponent(trimmed)}`),
    enabled: trimmed.length > 0,
    staleTime: 60_000,
  });
}

export function useStock(symbol: string | undefined) {
  return useQuery({
    queryKey: ['stock', symbol],
    queryFn: () => api.get<StockResponse>(`/stocks/${symbol}`),
    enabled: Boolean(symbol),
    refetchInterval: 45_000,
    staleTime: 20_000,
  });
}

export interface WatchlistBatchEntry extends StockResponse {
  analysis: AnalysisResult;
}

/**
 * One request covering the whole watchlist (quote + profile + analysis per
 * symbol) instead of 2×N separate requests - keeps a larger watchlist well
 * within the API rate limiter as it polls.
 */
export function useWatchlistBatch(symbols: string[]) {
  const symbolsKey = symbols.join(',');
  return useQuery({
    queryKey: ['watchlist-batch', symbolsKey],
    queryFn: () => api.get<{ results: WatchlistBatchEntry[] }>(`/stocks/batch?symbols=${encodeURIComponent(symbolsKey)}`),
    enabled: symbols.length > 0,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useCandles(symbol: string | undefined, range: string) {
  return useQuery({
    queryKey: ['candles', symbol, range],
    queryFn: () => api.get<CandlesResponse>(`/stocks/${symbol}/candles?range=${range}`),
    enabled: Boolean(symbol),
    staleTime: 5 * 60_000,
  });
}

export function useStockNews(symbol: string | undefined) {
  return useQuery({
    queryKey: ['stock-news', symbol],
    queryFn: () => api.get<NewsResponse>(`/stocks/${symbol}/news`),
    enabled: Boolean(symbol),
    refetchInterval: 2 * 60_000,
    staleTime: 60_000,
  });
}

export function useAnalysis(symbol: string | undefined) {
  return useQuery({
    queryKey: ['analysis', symbol],
    queryFn: () => api.get<AnalysisResult>(`/stocks/${symbol}/analysis`),
    enabled: Boolean(symbol),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useGeneralNews() {
  return useQuery({
    queryKey: ['news-general'],
    queryFn: () => api.get<NewsResponse>('/news/general'),
    refetchInterval: 2 * 60_000,
    staleTime: 60_000,
  });
}

export function useWatchlistNews(symbols: string[]) {
  const symbolsKey = symbols.join(',');
  return useQuery({
    queryKey: ['news-watchlist', symbolsKey],
    queryFn: () => api.get<NewsResponse>(`/news/watchlist?symbols=${encodeURIComponent(symbolsKey)}`),
    enabled: symbols.length > 0,
    refetchInterval: 2 * 60_000,
    staleTime: 60_000,
  });
}

export function useMarketOverview() {
  return useQuery({
    queryKey: ['market-overview'],
    queryFn: () => api.get<MarketOverviewResponse>('/market/overview'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useAlerts(symbols: string[]) {
  const symbolsKey = symbols.join(',');
  return useQuery({
    queryKey: ['alerts', symbolsKey],
    queryFn: () => api.get<{ events: WatchlistEvent[] }>(`/alerts${symbolsKey ? `?symbols=${encodeURIComponent(symbolsKey)}` : ''}`),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => api.get<SettingsResponse>('/settings'),
    staleTime: 10_000,
  });
}

export function useStatus() {
  return useQuery({
    queryKey: ['status'],
    queryFn: () => api.get<StatusResponse>('/status'),
    refetchInterval: 30_000,
    staleTime: 15_000,
  });
}

export function useSyncWatchlist() {
  return useMutation({
    mutationFn: (symbols: string[]) => api.post<{ symbols: string[] }>('/watchlist/sync', { symbols }),
  });
}

export function useSaveWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => api.post<SettingsResponse>('/settings/discord/webhook', { url }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['status'] });
    },
  });
}

export function useRemoveWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete<SettingsResponse>('/settings/discord/webhook'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
      qc.invalidateQueries({ queryKey: ['status'] });
    },
  });
}

export function useTestWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post<{ ok: boolean; error?: string }>('/settings/discord/test'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['status'] }),
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (partial: Partial<DiscordAlertPreferences>) => api.put<{ discord: DiscordAlertPreferences }>('/settings/discord/preferences', partial),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['settings'] }),
  });
}
