import { getWatchlistSymbols } from '../watchlistStore/store';
import { analyzeStockCached } from '../analysis/engine';
import { getCompanyNewsCached, getProfileCached, getQuoteCached } from '../providers/cachedAccess';
import { scoreSentiment } from '../analysis/sentiment';
import {
  addEvent,
  canSendDiscord,
  getLastPriceAlertKey,
  getLastSignal,
  hasSeenArticle,
  markArticleSeen,
  markEventDiscordSent,
  pruneMonitorState,
  recordDiscordSent,
  setLastPriceAlertKey,
  setLastSignal,
} from './eventStore';
import { getDiscordPreferences } from '../settingsStore/store';
import { sendDiscordAlert } from './discord';
import { AlertType, WatchlistEvent } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config';

const NEWS_LOOKBACK_DAYS = 2;
const SENTIMENT_ALERT_THRESHOLD = 0.15; // matches the 'positive'/'negative' label cutoff in sentiment.ts

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
function daysAgoIso(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

async function maybeSendDiscord(event: WatchlistEvent, type: AlertType): Promise<void> {
  const prefs = getDiscordPreferences();
  if (!prefs.enabled) return;
  const typeEnabled =
    (type === 'NEWS' && prefs.newsAlerts) ||
    (type === 'SIGNAL_CHANGE' && prefs.signalChangeAlerts) ||
    (type === 'PRICE_MOVEMENT' && prefs.priceMovementAlerts);
  if (!typeEnabled) return;
  if (!canSendDiscord(event.symbol, type, prefs.cooldownMinutes)) return;

  const sent = await sendDiscordAlert(event);
  if (sent) {
    markEventDiscordSent(event.id);
    recordDiscordSent(event.symbol, type);
  }
}

async function checkSignalChange(symbol: string, companyName: string | undefined): Promise<void> {
  const analysis = await analyzeStockCached(symbol);
  if (analysis.signal === 'NOT_ENOUGH_INFO') return;

  const previous = getLastSignal(symbol);
  if (previous === null) {
    // First observation of this symbol: establish a baseline, don't alert.
    setLastSignal(symbol, analysis.signal);
    return;
  }
  if (previous !== analysis.signal) {
    setLastSignal(symbol, analysis.signal);
    const event = addEvent({
      symbol,
      companyName,
      type: 'SIGNAL_CHANGE',
      headline: `Signal changed from ${previous} to ${analysis.signal}`,
      detail: `${symbol}'s current signal moved from ${previous} to ${analysis.signal} based on newly available information.`,
      reasons: analysis.reasons,
      meta: { fromSignal: previous, toSignal: analysis.signal, score: analysis.score },
    });
    await maybeSendDiscord(event, 'SIGNAL_CHANGE');
  }
}

async function checkPriceMovement(symbol: string, companyName: string | undefined): Promise<void> {
  const prefs = getDiscordPreferences();
  const quote = await getQuoteCached(symbol);
  if (!quote) return;

  const threshold = prefs.priceMovementThresholdPercent;
  if (Math.abs(quote.changePercent) < threshold) return;

  const direction = quote.changePercent >= 0 ? 'up' : 'down';
  const key = `${todayIso()}:${direction}`;
  if (getLastPriceAlertKey(symbol) === key) return; // already alerted for this day/direction

  setLastPriceAlertKey(symbol, key);
  const event = addEvent({
    symbol,
    companyName,
    type: 'PRICE_MOVEMENT',
    headline: 'Large price movement detected',
    detail: `${symbol} has moved ${quote.changePercent >= 0 ? '+' : ''}${quote.changePercent.toFixed(2)}% today, crossing the ${threshold}% alert threshold.`,
    reasons: [`Price change of ${quote.changePercent.toFixed(2)}% exceeds the configured ${threshold}% significant-movement threshold.`],
    meta: { changePercent: quote.changePercent, price: quote.price },
  });
  await maybeSendDiscord(event, 'PRICE_MOVEMENT');
}

async function checkNews(symbol: string, companyName: string | undefined): Promise<void> {
  const articles = await getCompanyNewsCached(symbol, daysAgoIso(NEWS_LOOKBACK_DAYS), todayIso());
  const unseen = articles.filter((a) => !hasSeenArticle(symbol, a.id));
  if (unseen.length === 0) return;

  let best: { article: (typeof unseen)[number]; score: number; label: string } | null = null;
  for (const article of unseen) {
    markArticleSeen(symbol, article.id);
    const sentiment = scoreSentiment(article.headline, article.summary);
    if (Math.abs(sentiment.score) >= SENTIMENT_ALERT_THRESHOLD) {
      if (!best || Math.abs(sentiment.score) > Math.abs(best.score)) {
        best = { article, score: sentiment.score, label: sentiment.label };
      }
    }
  }
  // Only the single most notable new article triggers an alert per cycle,
  // even if several unseen articles came in - this keeps alerts meaningful
  // instead of bursty.
  if (!best) return;

  const event = addEvent({
    symbol,
    companyName,
    type: 'NEWS',
    headline: 'New relevant news detected',
    detail: best.article.headline,
    reasons: [`This article's tone reads as ${best.label}, which is notable enough to surface.`],
    meta: {
      articleHeadline: best.article.headline,
      articleUrl: best.article.url,
      articleSource: best.article.source,
      articleDatetime: best.article.datetime,
      sentimentLabel: best.label,
    },
  });
  await maybeSendDiscord(event, 'NEWS');
}

async function checkSymbol(symbol: string): Promise<void> {
  try {
    const profile = await getProfileCached(symbol);
    const companyName = profile?.name;
    await checkSignalChange(symbol, companyName);
    await checkPriceMovement(symbol, companyName);
    await checkNews(symbol, companyName);
  } catch (err) {
    logger.error(`Monitor cycle failed for ${symbol}`, err);
  }
}

let isRunning = false;

export async function runMonitorCycle(): Promise<void> {
  if (isRunning) {
    logger.warn('Monitor cycle already running, skipping this tick');
    return;
  }
  isRunning = true;
  try {
    const symbols = getWatchlistSymbols();
    pruneMonitorState(symbols);
    if (symbols.length === 0) return;

    logger.info(`Monitor cycle checking ${symbols.length} watchlist symbol(s): ${symbols.join(', ')}`);
    for (const symbol of symbols) {
      await checkSymbol(symbol);
      // Small gap between symbols to stay well under provider rate limits.
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  } finally {
    isRunning = false;
  }
}

let intervalHandle: ReturnType<typeof setInterval> | null = null;

export function startMonitor(): void {
  if (intervalHandle) return;
  const intervalMs = Math.max(1, config.monitorIntervalMinutes) * 60_000;
  logger.info(`Starting watchlist monitor (every ${config.monitorIntervalMinutes} minute(s))`);
  // Run once shortly after boot, then on the configured interval.
  setTimeout(() => void runMonitorCycle(), 10_000);
  intervalHandle = setInterval(() => void runMonitorCycle(), intervalMs);
}

export function stopMonitor(): void {
  if (intervalHandle) {
    clearInterval(intervalHandle);
    intervalHandle = null;
  }
}
