import { finnhubProvider } from './marketData/finnhubProvider';
import { stooqProvider } from './marketData/stooqProvider';
import { registerProvider } from './status';
import { isFinnhubConfigured } from '../config';

// Single place that decides which concrete implementation backs each
// capability. To swap a provider later (e.g. move off Finnhub), implement
// the MarketDataProvider/NewsProvider/ChartDataProvider interface and change
// the exports below - nothing else in the app references Finnhub or Stooq
// directly.

registerProvider(finnhubProvider.name, isFinnhubConfigured());

export const marketData = finnhubProvider;
export const newsProvider = finnhubProvider;
export const chartData = stooqProvider;

export { getAllStatuses } from './status';
