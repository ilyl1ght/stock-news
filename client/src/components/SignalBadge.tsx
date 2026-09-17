import { Signal } from '../types';

const LABELS: Record<Signal, string> = {
  BULLISH: 'BULLISH',
  NEUTRAL: 'NEUTRAL',
  BEARISH: 'BEARISH',
  NOT_ENOUGH_INFO: 'NOT ENOUGH INFORMATION',
};

const CLASSES: Record<Signal, string> = {
  BULLISH: 'badge-bullish',
  NEUTRAL: 'badge-neutral',
  BEARISH: 'badge-bearish',
  NOT_ENOUGH_INFO: 'badge-neutral',
};

export function SignalBadge({ signal, size = 'md' }: { signal: Signal; size?: 'sm' | 'md' | 'lg' }) {
  const sizeClass = size === 'lg' ? 'text-base px-3 py-1' : size === 'sm' ? 'text-[11px] px-1.5 py-0.5' : '';
  return <span className={`${CLASSES[signal]} ${sizeClass}`}>{LABELS[signal]}</span>;
}

export function signalDotColor(signal: Signal): string {
  if (signal === 'BULLISH') return 'bg-green';
  if (signal === 'BEARISH') return 'bg-red';
  return 'bg-gray';
}
