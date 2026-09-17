import { FormEvent, useState } from 'react';
import {
  useRemoveWebhook,
  useSaveWebhook,
  useSettings,
  useStatus,
  useTestWebhook,
  useUpdatePreferences,
} from '../api/hooks';
import { Toggle } from '../components/Toggle';
import { formatRelativeTime } from '../utils/time';
import { ApiError } from '../api/client';

function PrefRow({ label, description, checked, onChange, disabled }: { label: string; description: string; checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div>
        <div className="text-sm text-text">{label}</div>
        <div className="text-xs text-muted mt-0.5">{description}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}

export function Settings() {
  const { data: settings } = useSettings();
  const { data: status } = useStatus();
  const saveWebhook = useSaveWebhook();
  const removeWebhook = useRemoveWebhook();
  const testWebhook = useTestWebhook();
  const updatePrefs = useUpdatePreferences();

  const [webhookInput, setWebhookInput] = useState('');
  const [saveMessage, setSaveMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [testResult, setTestResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const discord = settings?.discord;
  const configured = Boolean(settings?.discordConfigured);

  async function handleSaveWebhook(e: FormEvent) {
    e.preventDefault();
    if (!webhookInput.trim()) return;
    setSaveMessage(null);
    try {
      await saveWebhook.mutateAsync(webhookInput.trim());
      setWebhookInput('');
      setSaveMessage({ text: 'Webhook saved.' });
    } catch (err) {
      setSaveMessage({ text: err instanceof ApiError ? err.message : 'Failed to save webhook.', error: true });
    }
  }

  async function handleTest() {
    setTestResult(null);
    const result = await testWebhook.mutateAsync();
    setTestResult(result);
  }

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-text mb-1">Settings</h1>
        <p className="text-sm text-muted">Configure Discord alerts and check data provider health.</p>
      </div>

      <section className="mb-10">
        <h2 className="text-xs font-semibold tracking-wide text-muted mb-3">DISCORD</h2>
        <div className="panel p-5 sm:p-6">
          <label className="text-xs font-medium text-muted" htmlFor="webhook-url">
            DISCORD WEBHOOK URL
          </label>
          <form onSubmit={handleSaveWebhook} className="flex flex-col sm:flex-row gap-2 mt-2">
            <input
              id="webhook-url"
              type="text"
              className="input"
              value={webhookInput}
              onChange={(e) => setWebhookInput(e.target.value)}
              placeholder={configured ? 'Configured — paste a new URL to replace it' : 'https://discord.com/api/webhooks/...'}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" className="btn-primary shrink-0" disabled={saveWebhook.isPending || !webhookInput.trim()}>
              SAVE
            </button>
          </form>
          <div className="flex items-center gap-3 mt-3 text-xs">
            <span className={`inline-flex items-center gap-1.5 ${configured ? 'text-green' : 'text-faint'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${configured ? 'bg-green' : 'bg-faint'}`} />
              {configured ? 'Configured' : 'Not configured'}
            </span>
            {configured && (
              <button type="button" onClick={() => removeWebhook.mutate()} className="text-faint hover:text-red transition-colors underline">
                Remove
              </button>
            )}
          </div>
          {saveMessage && <p className={`text-xs mt-2 ${saveMessage.error ? 'text-red' : 'text-muted'}`}>{saveMessage.text}</p>}

          <div className="flex items-center justify-between gap-4 border-t border-border mt-5 pt-5">
            <div>
              <div className="text-sm text-text">Test Webhook</div>
              <div className="text-xs text-muted mt-0.5">Sends a sample message to confirm the connection works.</div>
            </div>
            <button type="button" onClick={handleTest} className="btn-secondary shrink-0" disabled={!configured || testWebhook.isPending}>
              {testWebhook.isPending ? 'SENDING…' : 'TEST WEBHOOK'}
            </button>
          </div>
          {testResult && (
            <p className={`text-xs mt-2 ${testResult.ok ? 'text-green' : 'text-red'}`}>
              {testResult.ok ? 'Test message sent — check your Discord channel.' : testResult.error || 'Discord webhook connection failed.'}
            </p>
          )}

          <div className="border-t border-border mt-5 pt-5">
            <PrefRow
              label="Enable Discord Alerts"
              description="Master switch for all watchlist alerts sent to Discord."
              checked={Boolean(discord?.enabled)}
              disabled={!configured}
              onChange={() => discord && updatePrefs.mutate({ enabled: !discord.enabled })}
            />
          </div>

          <div className="border-t border-border mt-1 pt-1 divide-y divide-border">
            <PrefRow
              label="New important news"
              description="Alert when a notable new article appears for a watchlist stock."
              checked={Boolean(discord?.newsAlerts)}
              disabled={!configured}
              onChange={() => discord && updatePrefs.mutate({ newsAlerts: !discord.newsAlerts })}
            />
            <PrefRow
              label="Signal changes"
              description="Alert when a watchlist stock's signal changes (e.g. NEUTRAL → BULLISH)."
              checked={Boolean(discord?.signalChangeAlerts)}
              disabled={!configured}
              onChange={() => discord && updatePrefs.mutate({ signalChangeAlerts: !discord.signalChangeAlerts })}
            />
            <PrefRow
              label="Significant price movements"
              description="Alert when a watchlist stock moves beyond the threshold below."
              checked={Boolean(discord?.priceMovementAlerts)}
              disabled={!configured}
              onChange={() => discord && updatePrefs.mutate({ priceMovementAlerts: !discord.priceMovementAlerts })}
            />
          </div>

          <div className="border-t border-border mt-1 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted" htmlFor="cooldown">
                Cooldown between repeat alerts (minutes)
              </label>
              <input
                id="cooldown"
                type="number"
                min={1}
                max={1440}
                className="input mt-1.5"
                defaultValue={discord?.cooldownMinutes ?? 30}
                key={`cooldown-${discord?.cooldownMinutes}`}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (Number.isFinite(val)) updatePrefs.mutate({ cooldownMinutes: val });
                }}
              />
            </div>
            <div>
              <label className="text-xs text-muted" htmlFor="threshold">
                Price move alert threshold (%)
              </label>
              <input
                id="threshold"
                type="number"
                min={1}
                max={50}
                className="input mt-1.5"
                defaultValue={discord?.priceMovementThresholdPercent ?? 3}
                key={`threshold-${discord?.priceMovementThresholdPercent}`}
                onBlur={(e) => {
                  const val = Number(e.target.value);
                  if (Number.isFinite(val)) updatePrefs.mutate({ priceMovementThresholdPercent: val });
                }}
              />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xs font-semibold tracking-wide text-muted mb-3">DATA</h2>
        <div className="panel divide-y divide-border">
          {(status?.providers || []).map((p) => (
            <div key={p.name} className="flex items-center justify-between gap-4 px-5 py-4">
              <div>
                <div className="text-sm font-medium text-text">{p.name}</div>
                <div className="text-xs text-muted mt-0.5">
                  {!p.configured ? 'Not configured' : p.ok ? 'Operating normally' : 'Experiencing issues'}
                </div>
              </div>
              <div className="text-right text-xs text-faint">
                {p.lastSuccessAt ? `Updated ${formatRelativeTime(Math.floor(p.lastSuccessAt / 1000))}` : 'No successful update yet'}
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between gap-4 px-5 py-4">
            <div className="text-sm text-text">Watchlist monitoring interval</div>
            <div className="text-xs text-faint">Every {status?.monitorIntervalMinutes ?? '—'} min</div>
          </div>
        </div>
      </section>
    </div>
  );
}
