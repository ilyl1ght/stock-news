import { getQuoteCached, getCompanyNewsCached, getDailyCandlesCached } from '../providers/cachedAccess';
import { scoreSentiment } from './sentiment';
import { AnalysisComponent, AnalysisResult, Confidence, Signal } from '../types';
import { withCache, TTL } from '../utils/cache';

// The analysis engine: a transparent, weighted scoring system. Every
// component below is derived from real fetched data (news actually
// returned by the news provider, price data actually returned by the
// market-data provider) - nothing here is randomized or invented. Each
// component's weight and contribution is exposed via `advanced` so the
// "ADVANCED DATA" panel can show exactly how the signal was reached.

const WEIGHTS = {
  news: 0.4,
  momentum: 0.3,
  relativeStrength: 0.15,
  volume: 0.15,
};

const BULLISH_THRESHOLD = 15;
const BEARISH_THRESHOLD = -15;
const REASON_THRESHOLD = 6; // minimum |contribution| points for a component to earn a WHY bullet
const MARKET_PROXY_SYMBOL = 'SPY';

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function isoDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function notEnoughInfo(symbol: string, components: AnalysisComponent[] = []): AnalysisResult {
  return {
    symbol,
    signal: 'NOT_ENOUGH_INFO',
    score: null,
    confidence: null,
    reasons: [],
    advanced: {
      components,
      totalScore: null,
      bullishThreshold: BULLISH_THRESHOLD,
      bearishThreshold: BEARISH_THRESHOLD,
    },
    generatedAt: Date.now(),
  };
}

export async function analyzeStock(symbol: string): Promise<AnalysisResult> {
  const today = isoDateNDaysAgo(0);
  const fourDaysAgo = isoDateNDaysAgo(4);
  const isMarketProxy = symbol === MARKET_PROXY_SYMBOL;

  const [quote, rawNews, candles, marketQuote] = await Promise.all([
    getQuoteCached(symbol),
    getCompanyNewsCached(symbol, fourDaysAgo, today),
    getDailyCandlesCached(symbol, 20),
    isMarketProxy ? Promise.resolve(null) : getQuoteCached(MARKET_PROXY_SYMBOL),
  ]);

  if (!quote) {
    return notEnoughInfo(symbol);
  }

  const components: AnalysisComponent[] = [];

  // --- News sentiment ---------------------------------------------------
  const recentArticles = rawNews
    .slice()
    .sort((a, b) => b.datetime - a.datetime)
    .slice(0, 8)
    .map((a) => ({ ...a, sentiment: scoreSentiment(a.headline, a.summary) }));

  let newsContribution = 0;
  const newsAvailable = recentArticles.length > 0;
  let newsDetail = 'No recent company news available.';
  if (newsAvailable) {
    const avg = recentArticles.reduce((s, a) => s + a.sentiment.score, 0) / recentArticles.length;
    const positiveCount = recentArticles.filter((a) => a.sentiment.label === 'positive').length;
    const negativeCount = recentArticles.filter((a) => a.sentiment.label === 'negative').length;
    const neutralCount = recentArticles.length - positiveCount - negativeCount;
    newsContribution = clamp(avg, -1, 1) * 100 * WEIGHTS.news;
    newsDetail = `${recentArticles.length} recent article(s) analyzed: ${positiveCount} positive, ${neutralCount} neutral, ${negativeCount} negative (avg sentiment ${avg.toFixed(2)}).`;
  }
  components.push({
    key: 'news',
    label: 'Recent News Sentiment',
    available: newsAvailable,
    rawDetail: newsDetail,
    contribution: Math.round(newsContribution * 10) / 10,
    weight: WEIGHTS.news,
  });

  // --- Price momentum -----------------------------------------------------
  const dp = quote.changePercent;
  const momentumContribution = clamp(dp / 5, -1, 1) * 100 * WEIGHTS.momentum;
  components.push({
    key: 'momentum',
    label: 'Price Momentum',
    available: true,
    rawDetail: `Price is ${dp >= 0 ? 'up' : 'down'} ${Math.abs(dp).toFixed(2)}% today.`,
    contribution: Math.round(momentumContribution * 10) / 10,
    weight: WEIGHTS.momentum,
  });

  // --- Relative market strength ------------------------------------------
  let relContribution = 0;
  const relAvailable = !isMarketProxy && marketQuote != null;
  let relDetail = 'Broader market comparison unavailable.';
  if (relAvailable && marketQuote) {
    const rel = dp - marketQuote.changePercent;
    relContribution = clamp(rel / 4, -1, 1) * 100 * WEIGHTS.relativeStrength;
    relDetail = `${symbol} is ${rel >= 0 ? 'outperforming' : 'underperforming'} the broader market (S&P 500 proxy) by ${Math.abs(rel).toFixed(2)}% today.`;
  } else if (isMarketProxy) {
    relDetail = 'This symbol is itself used as the broad-market comparison.';
  }
  components.push({
    key: 'relativeStrength',
    label: 'Relative Market Strength',
    available: relAvailable,
    rawDetail: relDetail,
    contribution: Math.round(relContribution * 10) / 10,
    weight: WEIGHTS.relativeStrength,
  });

  // --- Volume trend (amplifies today's price direction when elevated) ----
  let volContribution = 0;
  let volAvailable = false;
  let volDetail = 'Not enough recent trading history to gauge volume.';
  if (candles.length >= 10) {
    const sorted = candles.slice().sort((a, b) => a.date.localeCompare(b.date));
    const last = sorted.slice(-3);
    const priorPool = sorted.slice(-10, -3);
    const baselineAvg = priorPool.length ? priorPool.reduce((s, c) => s + c.volume, 0) / priorPool.length : 0;
    if (last.length > 0 && baselineAvg > 0) {
      volAvailable = true;
      const recentAvg = last.reduce((s, c) => s + c.volume, 0) / last.length;
      const changePct = ((recentAvg - baselineAvg) / baselineAvg) * 100;
      const elevation = clamp(changePct / 50, 0, 1); // 0 at/below baseline, 1 at +50% or more
      const directionSign = dp === 0 ? 0 : Math.sign(dp);
      volContribution = directionSign * elevation * 100 * WEIGHTS.volume;
      volDetail =
        elevation > 0.15
          ? `Trading volume is running about ${Math.abs(changePct).toFixed(0)}% ${changePct >= 0 ? 'above' : 'below'} its recent baseline.`
          : 'Trading volume is close to its recent baseline.';
    }
  }
  components.push({
    key: 'volume',
    label: 'Volume Trend',
    available: volAvailable,
    rawDetail: volDetail,
    contribution: Math.round(volContribution * 10) / 10,
    weight: WEIGHTS.volume,
  });

  const availableComponents = components.filter((c) => c.available);
  if (availableComponents.length === 0) {
    return notEnoughInfo(symbol, components);
  }

  const totalScore = clamp(components.reduce((s, c) => s + c.contribution, 0), -100, 100);

  let signal: Signal = 'NEUTRAL';
  if (totalScore >= BULLISH_THRESHOLD) signal = 'BULLISH';
  else if (totalScore <= BEARISH_THRESHOLD) signal = 'BEARISH';

  // --- Confidence: reflects how much real data went in, not a probability --
  let confidence: Confidence = 'Moderate';
  if (availableComponents.length <= 2 || Math.abs(totalScore) < 10) {
    confidence = 'Low';
  } else if (Math.abs(totalScore) >= 40 && availableComponents.length >= 3) {
    confidence = 'High';
  }

  // --- WHY reasons, in plain English --------------------------------------
  const reasons: string[] = [];
  const newsComp = components[0];
  if (newsComp.available && Math.abs(newsComp.contribution) >= REASON_THRESHOLD) {
    reasons.push(newsComp.contribution > 0 ? 'Recent company news is trending positive' : 'Recent company news is trending negative');
  }
  if (Math.abs(dp) >= 0.5) {
    reasons.push(dp > 0 ? `Price is up ${dp.toFixed(2)}% today` : `Price is down ${Math.abs(dp).toFixed(2)}% today`);
  }
  const relComp = components[2];
  if (relComp.available && Math.abs(relComp.contribution) >= REASON_THRESHOLD) {
    reasons.push(relComp.contribution > 0 ? 'Outperforming the broader market today' : 'Underperforming the broader market today');
  }
  const volComp = components[3];
  if (volComp.available && Math.abs(volComp.contribution) >= REASON_THRESHOLD) {
    reasons.push(volComp.contribution > 0 ? 'Trading activity has increased, reinforcing the move' : 'Trading activity has increased amid the decline');
  }

  const positiveCount = components.filter((c) => c.available && c.contribution >= REASON_THRESHOLD).length;
  const negativeCount = components.filter((c) => c.available && c.contribution <= -REASON_THRESHOLD).length;
  if (signal === 'NEUTRAL' && positiveCount > 0 && negativeCount > 0) {
    reasons.unshift('Signals are mixed - positive and negative information are roughly offsetting.');
  }
  if (reasons.length === 0) {
    reasons.push('Available information is limited or largely flat right now.');
  }

  return {
    symbol,
    signal,
    score: Math.round(totalScore * 10) / 10,
    confidence,
    reasons,
    advanced: {
      components,
      totalScore: Math.round(totalScore * 10) / 10,
      bullishThreshold: BULLISH_THRESHOLD,
      bearishThreshold: BEARISH_THRESHOLD,
    },
    generatedAt: Date.now(),
  };
}

/**
 * Same as analyzeStock, but shares one result across every caller within
 * the TTL window (the per-symbol API route, the watchlist batch endpoint,
 * and the background monitor all ask "what's the current analysis?"
 * independently and often within moments of each other).
 */
export function analyzeStockCached(symbol: string): Promise<AnalysisResult> {
  return withCache(`analysis:${symbol}`, TTL.ANALYSIS, () => analyzeStock(symbol));
}
