import 'dotenv/config';
import path from 'path';

function intFromEnv(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  port: intFromEnv('PORT', 8080),
  finnhubApiKey: process.env.FINNHUB_API_KEY?.trim() || '',
  discordWebhookUrlEnv: process.env.DISCORD_WEBHOOK_URL?.trim() || '',
  monitorIntervalMinutes: intFromEnv('MONITOR_INTERVAL_MINUTES', 5),
  corsOrigin: process.env.CORS_ORIGIN?.trim() || '',
  dataDir: path.resolve(__dirname, '..', 'data'),
  clientDistDir: path.resolve(__dirname, '..', '..', 'client', 'dist'),
};

export const isFinnhubConfigured = () => config.finnhubApiKey.length > 0;
