import { Candle } from '../types';

interface PriceChartProps {
  candles: Candle[];
  height?: number;
}

const WIDTH = 600;

export function PriceChart({ candles, height = 220 }: PriceChartProps) {
  if (!candles || candles.length === 0) {
    return (
      <div className="panel flex items-center justify-center text-sm text-muted" style={{ height }}>
        Chart data unavailable.
      </div>
    );
  }

  const marginY = 14;
  const closes = candles.map((c) => c.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const n = candles.length;

  const points = candles.map((c, i) => {
    const x = n === 1 ? WIDTH / 2 : (i / (n - 1)) * WIDTH;
    const y = marginY + (1 - (c.close - min) / range) * (height - marginY * 2);
    return [x, y] as const;
  });

  const linePath = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L${WIDTH},${height} L0,${height} Z`;

  const positive = closes[closes.length - 1] >= closes[0];
  const stroke = positive ? '#3fb950' : '#f85149';
  const fill = positive ? 'rgba(63,185,80,0.08)' : 'rgba(248,81,73,0.08)';

  return (
    <div className="panel p-4 sm:p-5">
      <svg viewBox={`0 0 ${WIDTH} ${height}`} width="100%" height={height} preserveAspectRatio="none">
        <path d={areaPath} fill={fill} stroke="none" />
        <path d={linePath} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
      <div className="flex justify-between text-xs text-faint mt-2">
        <span>{candles[0].date}</span>
        <span>{candles[candles.length - 1].date}</span>
      </div>
    </div>
  );
}
