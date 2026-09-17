import { useState } from 'react';
import { AnalysisComponent } from '../types';

export function AdvancedData({ components, totalScore }: { components: AnalysisComponent[]; totalScore: number | null }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="panel">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 sm:px-5 py-3.5 text-sm font-medium text-text"
      >
        <span>ADVANCED DATA</span>
        <span className="text-muted">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="border-t border-border px-4 sm:px-5 py-4 space-y-4">
          <p className="text-xs text-muted leading-relaxed">
            Each factor below contributes a weighted number of points toward the total score. The total determines the
            signal: {'>'}= +15 is bullish, {'<'}= -15 is bearish, otherwise neutral. This is a transparent heuristic based
            on currently available data - not a guarantee of future performance.
          </p>
          <div className="space-y-3">
            {components.map((c) => (
              <div key={c.key} className="flex items-start justify-between gap-4 text-sm">
                <div className="min-w-0">
                  <div className="text-text font-medium">
                    {c.label} <span className="text-faint font-normal">· weight {(c.weight * 100).toFixed(0)}%</span>
                  </div>
                  <div className="text-xs text-muted mt-0.5">{c.available ? c.rawDetail : 'Not available for this stock right now.'}</div>
                </div>
                <div
                  className={`shrink-0 font-mono text-sm ${
                    !c.available ? 'text-faint' : c.contribution > 0 ? 'text-green' : c.contribution < 0 ? 'text-red' : 'text-muted'
                  }`}
                >
                  {c.available ? `${c.contribution > 0 ? '+' : ''}${c.contribution.toFixed(1)}` : '—'}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between border-t border-border pt-3 text-sm font-semibold">
            <span className="text-text">Total score</span>
            <span className="font-mono text-text">{totalScore !== null ? totalScore.toFixed(1) : '—'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
