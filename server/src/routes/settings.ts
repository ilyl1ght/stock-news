import { Router } from 'express';
import {
  getPublicSettingsView,
  setDiscordWebhookUrl,
  updateDiscordPreferences,
} from '../settingsStore/store';
import { sendTestMessage } from '../alerts/discord';
import { isValidDiscordWebhookUrl } from '../utils/validate';
import { webhookTestLimiter } from '../utils/rateLimit';

export const settingsRouter = Router();

// IMPORTANT: none of these handlers ever echo the webhook URL back to the
// client. getPublicSettingsView() only exposes a boolean "configured" flag.

settingsRouter.get('/', (_req, res) => {
  res.json(getPublicSettingsView());
});

settingsRouter.post('/discord/webhook', (req, res) => {
  const url = req.body?.url;
  if (typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'A webhook URL is required.' });
  }
  if (!isValidDiscordWebhookUrl(url.trim())) {
    return res.status(400).json({ error: 'That does not look like a valid Discord webhook URL.' });
  }
  setDiscordWebhookUrl(url.trim());
  res.json(getPublicSettingsView());
});

settingsRouter.delete('/discord/webhook', (_req, res) => {
  setDiscordWebhookUrl(null);
  res.json(getPublicSettingsView());
});

settingsRouter.post('/discord/test', webhookTestLimiter, async (_req, res) => {
  const result = await sendTestMessage();
  if (!result.ok) {
    return res.status(200).json({ ok: false, error: result.error || 'Discord webhook connection failed.' });
  }
  res.json({ ok: true });
});

settingsRouter.put('/discord/preferences', (req, res) => {
  const body = req.body || {};
  const partial: Record<string, unknown> = {};
  for (const key of [
    'enabled',
    'newsAlerts',
    'signalChangeAlerts',
    'priceMovementAlerts',
    'cooldownMinutes',
    'priceMovementThresholdPercent',
  ]) {
    if (key in body) partial[key] = body[key];
  }
  const updated = updateDiscordPreferences(partial);
  res.json({ discord: updated });
});
