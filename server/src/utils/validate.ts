// Input validation helpers. Keep external input tightly constrained before it
// reaches provider URLs or the filesystem.

const SYMBOL_RE = /^[A-Z0-9.\-^]{1,10}$/;

export function isValidSymbol(raw: string): boolean {
  if (typeof raw !== 'string') return false;
  return SYMBOL_RE.test(raw.trim().toUpperCase());
}

export function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase();
}

export function isValidSearchQuery(raw: unknown): raw is string {
  return typeof raw === 'string' && raw.trim().length > 0 && raw.trim().length <= 60;
}

const DISCORD_WEBHOOK_RE = /^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\/\d+\/[\w-]+$/;

export function isValidDiscordWebhookUrl(raw: unknown): raw is string {
  return typeof raw === 'string' && DISCORD_WEBHOOK_RE.test(raw.trim());
}

export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = typeof value === 'number' ? value : parseInt(String(value), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function sanitizeSymbolList(raw: unknown, maxItems = 100): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const sym = normalizeSymbol(item);
    if (isValidSymbol(sym) && !out.includes(sym)) out.push(sym);
    if (out.length >= maxItems) break;
  }
  return out;
}
