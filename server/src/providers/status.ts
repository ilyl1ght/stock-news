import { ProviderStatus } from '../types';

// Tracks last success/error per named provider so the Settings > Data page
// can show real provider health instead of guessing.

const statuses = new Map<string, ProviderStatus>();

export function registerProvider(name: string, configured: boolean): void {
  statuses.set(name, {
    name,
    configured,
    ok: configured,
    lastSuccessAt: null,
    lastErrorAt: null,
    lastErrorMessage: null,
  });
}

export function reportSuccess(name: string): void {
  const s = statuses.get(name);
  if (!s) return;
  s.ok = true;
  s.lastSuccessAt = Date.now();
}

export function reportError(name: string, message: string): void {
  const s = statuses.get(name);
  if (!s) return;
  s.ok = false;
  s.lastErrorAt = Date.now();
  s.lastErrorMessage = message;
}

export function getAllStatuses(): ProviderStatus[] {
  return Array.from(statuses.values());
}
