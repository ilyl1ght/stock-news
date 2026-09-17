import { getDiscordWebhookUrl } from '../settingsStore/store';
import { WatchlistEvent, Signal } from '../types';
import { logger } from '../utils/logger';
import { isValidDiscordWebhookUrl } from '../utils/validate';

// Sends STOCK NEWS alerts to Discord as clean embeds via a webhook URL only.
// No bot token, no OAuth, no Discord login - just a POST to the webhook the
// user pasted into Settings (or set via DISCORD_WEBHOOK_URL). The URL is
// read from settingsStore (server-side only) and never touches the
// frontend.

const REQUEST_TIMEOUT_MS = 8000;

let lastSuccessAt: number | null = null;
let lastErrorAt: number | null = null;
let lastErrorMessage: string | null = null;

function signalVisuals(signal: Signal | 'POSITIVE' | 'NEGATIVE'): { emoji: string; color: number } {
  if (signal === 'BULLISH' || signal === 'POSITIVE') return { emoji: '🟢', color: 0x3fb950 };
  if (signal === 'BEARISH' || signal === 'NEGATIVE') return { emoji: '🔴', color: 0xf85149 };
  return { emoji: '⚪', color: 0x8b8b93 };
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function formatTime(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

function getMeta(event: WatchlistEvent): Record<string, unknown> {
  return event.meta || {};
}

export function buildAlertEmbed(event: WatchlistEvent) {
  const companyLabel = event.companyName ? `${event.symbol} — ${event.companyName}` : event.symbol;
  const meta = getMeta(event);
  const fields: DiscordEmbedField[] = [];
  let description: string;
  let color = 0x8b8b93;

  if (event.type === 'SIGNAL_CHANGE') {
    const from = typeof meta.fromSignal === 'string' ? meta.fromSignal : 'NEUTRAL';
    const to = typeof meta.toSignal === 'string' ? meta.toSignal : 'NEUTRAL';
    const visuals = signalVisuals(to as Signal);
    color = visuals.color;
    description = `${visuals.emoji} **${from} → ${to}**\n${event.detail}`;
  } else if (event.type === 'PRICE_MOVEMENT') {
    const pct = typeof meta.changePercent === 'number' ? meta.changePercent : 0;
    color = pct >= 0 ? 0x3fb950 : 0xf85149;
    description = event.detail;
    fields.push({ name: 'MARKET MOVE', value: `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`, inline: true });
  } else {
    const label = typeof meta.sentimentLabel === 'string' ? meta.sentimentLabel : 'neutral';
    const visuals = signalVisuals(label === 'positive' ? 'POSITIVE' : label === 'negative' ? 'NEGATIVE' : 'NEUTRAL');
    color = visuals.color;
    description = event.detail;
    if (typeof meta.articleHeadline === 'string') fields.push({ name: 'LATEST NEWS', value: truncate(meta.articleHeadline, 200) });
  }

  if (event.reasons.length) {
    fields.push({ name: 'WHY', value: event.reasons.map((r) => `• ${r}`).join('\n') });
  }
  if (typeof meta.articleSource === 'string') fields.push({ name: 'SOURCE', value: meta.articleSource, inline: true });
  if (typeof meta.articleDatetime === 'number') fields.push({ name: 'TIME', value: formatTime(meta.articleDatetime), inline: true });

  return {
    embeds: [
      {
        title: 'STOCK NEWS ALERT',
        description: `**${companyLabel}**\n${description}`,
        color,
        fields,
        footer: { text: 'STOCK NEWS · watchlist alert' },
        timestamp: new Date(event.createdAt).toISOString(),
        url: typeof meta.articleUrl === 'string' ? meta.articleUrl : undefined,
      },
    ],
  };
}

async function postToWebhook(url: string, body: unknown): Promise<{ ok: boolean; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (res.status === 429) {
      const retryData = await res.json().catch(() => ({}));
      const retryAfter = typeof retryData?.retry_after === 'number' ? retryData.retry_after : 1;
      logger.warn(`Discord rate limited, retry after ${retryAfter}s`);
      return { ok: false, error: 'Discord rate limit reached, will retry later' };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { ok: false, error: `Discord webhook responded with status ${res.status}${text ? `: ${text.slice(0, 200)}` : ''}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendDiscordAlert(event: WatchlistEvent): Promise<boolean> {
  const url = getDiscordWebhookUrl();
  if (!url || !isValidDiscordWebhookUrl(url)) return false;

  const payload = buildAlertEmbed(event);
  const result = await postToWebhook(url, payload);
  if (result.ok) {
    lastSuccessAt = Date.now();
    lastErrorAt = null;
    lastErrorMessage = null;
    return true;
  }
  lastErrorAt = Date.now();
  lastErrorMessage = result.error || 'Unknown error';
  logger.warn(`Discord send failed: ${lastErrorMessage}`);
  return false;
}

export async function sendTestMessage(): Promise<{ ok: boolean; error?: string }> {
  const url = getDiscordWebhookUrl();
  if (!url) return { ok: false, error: 'No Discord webhook URL is configured.' };
  if (!isValidDiscordWebhookUrl(url)) return { ok: false, error: 'The stored webhook URL does not look like a valid Discord webhook URL.' };

  const result = await postToWebhook(url, {
    embeds: [
      {
        title: 'STOCK NEWS',
        description: 'This is a test message from STOCK NEWS. Your Discord webhook is connected correctly.',
        color: 0x8b8b93,
        footer: { text: 'STOCK NEWS · test message' },
        timestamp: new Date().toISOString(),
      },
    ],
  });

  if (result.ok) {
    lastSuccessAt = Date.now();
    lastErrorAt = null;
    lastErrorMessage = null;
  } else {
    lastErrorAt = Date.now();
    lastErrorMessage = result.error || 'Unknown error';
  }
  return result;
}

export function getDiscordStatus() {
  const url = getDiscordWebhookUrl();
  return {
    name: 'Discord Webhook',
    configured: Boolean(url),
    ok: lastErrorAt === null || (lastSuccessAt !== null && lastSuccessAt > lastErrorAt),
    lastSuccessAt,
    lastErrorAt,
    lastErrorMessage,
  };
}
