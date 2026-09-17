import { readJson, writeJson } from '../utils/jsonStore';
import { config } from '../config';
import { DiscordAlertPreferences } from '../types';
import { clampInt } from '../utils/validate';

// Server-side settings, including the Discord webhook URL. This URL is
// NEVER returned to the frontend once saved - only a "configured: true/false"
// boolean is exposed via getPublicView(). It is persisted to a gitignored
// JSON file on disk (server/data/settings.json), seeded from the
// DISCORD_WEBHOOK_URL env var the first time the app runs if present.

const FILE = 'settings.json';

interface StoredSettings {
  discordWebhookUrl: string | null;
  discord: DiscordAlertPreferences;
}

function defaultSettings(): StoredSettings {
  const envUrl = config.discordWebhookUrlEnv || null;
  return {
    discordWebhookUrl: envUrl,
    discord: {
      enabled: Boolean(envUrl),
      newsAlerts: true,
      signalChangeAlerts: true,
      priceMovementAlerts: true,
      cooldownMinutes: 30,
      priceMovementThresholdPercent: 3,
    },
  };
}

let state: StoredSettings | null = null;

function load(): StoredSettings {
  if (state === null) {
    state = readJson<StoredSettings>(FILE, defaultSettings());
  }
  return state;
}

function persist(): void {
  if (state) writeJson(FILE, state);
}

export function getDiscordWebhookUrl(): string | null {
  return load().discordWebhookUrl;
}

export function setDiscordWebhookUrl(url: string | null): void {
  const s = load();
  s.discordWebhookUrl = url;
  if (url && !s.discord.enabled) s.discord.enabled = true;
  if (!url) s.discord.enabled = false;
  persist();
}

export function getDiscordPreferences(): DiscordAlertPreferences {
  return { ...load().discord };
}

export function updateDiscordPreferences(partial: Partial<DiscordAlertPreferences>): DiscordAlertPreferences {
  const s = load();
  if (typeof partial.enabled === 'boolean') s.discord.enabled = partial.enabled && Boolean(s.discordWebhookUrl);
  if (typeof partial.newsAlerts === 'boolean') s.discord.newsAlerts = partial.newsAlerts;
  if (typeof partial.signalChangeAlerts === 'boolean') s.discord.signalChangeAlerts = partial.signalChangeAlerts;
  if (typeof partial.priceMovementAlerts === 'boolean') s.discord.priceMovementAlerts = partial.priceMovementAlerts;
  if (partial.cooldownMinutes !== undefined) s.discord.cooldownMinutes = clampInt(partial.cooldownMinutes, 1, 1440, s.discord.cooldownMinutes);
  if (partial.priceMovementThresholdPercent !== undefined) {
    s.discord.priceMovementThresholdPercent = clampInt(partial.priceMovementThresholdPercent, 1, 50, s.discord.priceMovementThresholdPercent);
  }
  persist();
  return { ...s.discord };
}

export function getPublicSettingsView() {
  const s = load();
  return {
    discordConfigured: Boolean(s.discordWebhookUrl),
    discord: { ...s.discord },
  };
}
