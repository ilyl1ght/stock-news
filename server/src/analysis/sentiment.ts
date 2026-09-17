import { Sentiment, SentimentLabel } from '../types';

// Lightweight, transparent keyword-based sentiment scoring for financial
// news headlines/summaries. This intentionally is NOT a black-box ML model:
// every word that moves the score is listed right here, which is what makes
// the analysis engine's output explainable. It scores real article text -
// it never invents a sentiment for an article that doesn't exist.

const POSITIVE_TERMS = [
  'surge', 'surges', 'surged', 'soar', 'soars', 'soared', 'jump', 'jumps', 'jumped',
  'gain', 'gains', 'gained', 'rally', 'rallies', 'rallied', 'climb', 'climbs', 'climbed',
  'rise', 'rises', 'risen', 'rising', 'beat', 'beats', 'beating', 'outperform', 'outperforms',
  'upgrade', 'upgrades', 'upgraded', 'record', 'records', 'strong', 'stronger', 'strength',
  'growth', 'grows', 'grew', 'growing', 'profit', 'profits', 'profitable', 'expand', 'expands',
  'expanded', 'expansion', 'buyback', 'buybacks', 'partnership', 'breakthrough', 'approval',
  'approved', 'positive', 'higher', 'optimism', 'optimistic', 'bullish', 'exceeds', 'exceeded',
  'exceeding', 'boost', 'boosts', 'boosted', 'raises', 'raised', 'raise guidance', 'best',
  'win', 'wins', 'won', 'winning', 'success', 'successful', 'milestone', 'innovation',
  'demand', 'accelerate', 'accelerates', 'accelerated', 'top', 'tops', 'topped', 'surpass',
  'surpasses', 'surpassed', 'robust', 'upbeat', 'recovery', 'recovers', 'recovered',
];

const NEGATIVE_TERMS = [
  'plunge', 'plunges', 'plunged', 'drop', 'drops', 'dropped', 'fall', 'falls', 'fell', 'falling',
  'decline', 'declines', 'declined', 'miss', 'misses', 'missed', 'underperform', 'underperforms',
  'downgrade', 'downgrades', 'downgraded', 'weak', 'weaker', 'weakness', 'recall', 'recalls',
  'recalled', 'lawsuit', 'lawsuits', 'investigation', 'investigated', 'probe', 'bearish',
  'loss', 'losses', 'losing', 'cut', 'cuts', 'cutting', 'layoff', 'layoffs', 'bankruptcy',
  'delay', 'delays', 'delayed', 'negative', 'lower', 'sinks', 'sank', 'sink', 'slump', 'slumps',
  'slumped', 'warn', 'warns', 'warning', 'fraud', 'resign', 'resigns', 'resignation', 'resigned',
  'crash', 'crashes', 'crashed', 'slide', 'slides', 'slid', 'sliding', 'tumble', 'tumbles',
  'tumbled', 'concern', 'concerns', 'risk', 'risks', 'risky', 'shortfall', 'default', 'defaults',
  'scandal', 'penalty', 'penalties', 'fine', 'fined', 'strike', 'strikes', 'disruption',
  'shortage', 'shortages', 'volatility', 'volatile', 'plummet', 'plummets', 'plummeted',
  'downturn', 'recession', 'sued', 'sues', 'suing', 'halt', 'halted', 'halts', 'worst',
];

const POSITIVE_SET = new Set(POSITIVE_TERMS);
const NEGATIVE_SET = new Set(NEGATIVE_TERMS);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

/** Scores a single block of text in isolation, returning a -1..1 score. */
function scoreText(text: string): { score: number; hits: number } {
  const tokens = tokenize(text);
  if (tokens.length === 0) return { score: 0, hits: 0 };
  let positive = 0;
  let negative = 0;
  for (const token of tokens) {
    if (POSITIVE_SET.has(token)) positive++;
    else if (NEGATIVE_SET.has(token)) negative++;
  }
  const hits = positive + negative;
  if (hits === 0) return { score: 0, hits: 0 };
  const raw = (positive - negative) / hits;
  // Dampen by how sparse the hits are relative to article length so a single
  // stray word in a long, otherwise-neutral article doesn't swing hard.
  const density = Math.min(1, hits / 6);
  return { score: raw * (0.5 + 0.5 * density), hits };
}

export function scoreSentiment(headline: string, summary = ''): Sentiment {
  const headlineResult = scoreText(headline);
  const summaryResult = scoreText(summary);

  let score: number;
  if (headlineResult.hits === 0 && summaryResult.hits === 0) {
    score = 0;
  } else {
    // Headline carries more weight than the summary body.
    const totalWeight = headlineResult.hits > 0 ? 0.65 : 0;
    const summaryWeight = summaryResult.hits > 0 ? (headlineResult.hits > 0 ? 0.35 : 1) : 0;
    const denom = totalWeight + summaryWeight || 1;
    score = (headlineResult.score * totalWeight + summaryResult.score * summaryWeight) / denom;
  }
  score = Math.max(-1, Math.min(1, score));

  let label: SentimentLabel = 'neutral';
  if (score > 0.15) label = 'positive';
  else if (score < -0.15) label = 'negative';

  return { label, score: Math.round(score * 100) / 100 };
}
