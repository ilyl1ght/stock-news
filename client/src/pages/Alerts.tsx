import { useAlerts } from '../api/hooks';
import { useWatchlist } from '../context/WatchlistContext';
import { Loading } from '../components/Loading';
import { formatRelativeTime } from '../utils/time';
import { AlertType, WatchlistEvent } from '../types';

const TYPE_LABELS: Record<AlertType, string> = {
  NEWS: 'NEWS',
  SIGNAL_CHANGE: 'SIGNAL CHANGE',
  PRICE_MOVEMENT: 'PRICE MOVE',
};

function AlertRow({ event }: { event: WatchlistEvent }) {
  return (
    <div className="px-4 sm:px-5 py-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-text">{event.symbol}</span>
          {event.companyName && <span className="text-xs text-muted">{event.companyName}</span>}
          <span className="badge-neutral">{TYPE_LABELS[event.type]}</span>
        </div>
        <span className="text-xs text-faint">{formatRelativeTime(Math.floor(event.createdAt / 1000))}</span>
      </div>
      <div className="text-sm text-text font-medium mt-2">{event.headline}</div>
      {event.detail && event.detail !== event.headline && <div className="text-sm text-muted mt-1">{event.detail}</div>}
      {event.reasons.length > 0 && (
        <ul className="mt-2 space-y-1">
          {event.reasons.map((r, i) => (
            <li key={i} className="text-xs text-faint">
              • {r}
            </li>
          ))}
        </ul>
      )}
      {event.discordSent && <div className="text-xs text-faint mt-2">Sent to Discord</div>}
    </div>
  );
}

export function Alerts() {
  const { symbols } = useWatchlist();
  const { data, isLoading } = useAlerts(symbols);
  const events = data?.events || [];

  return (
    <div>
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-text mb-1">Alerts</h1>
        <p className="text-sm text-muted">Meaningful events detected for your watchlist stocks.</p>
      </div>

      {symbols.length === 0 ? (
        <div className="panel px-6 py-14 text-center text-sm text-muted">Add stocks to your watchlist to start receiving alerts.</div>
      ) : isLoading ? (
        <Loading />
      ) : events.length === 0 ? (
        <div className="panel px-6 py-14 text-center text-sm text-muted">
          No alerts yet. Alerts appear here as new relevant news, signal changes, or significant price moves are detected.
        </div>
      ) : (
        <div className="panel divide-y divide-border">
          {events.map((event) => (
            <AlertRow key={event.id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
