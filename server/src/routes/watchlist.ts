import { Router } from 'express';
import { setWatchlistSymbols } from '../watchlistStore/store';
import { sanitizeSymbolList } from '../utils/validate';

export const watchlistRouter = Router();

// The browser's localStorage watchlist is the canonical copy for the UI.
// This endpoint just mirrors it server-side so the background monitor and
// the Discord webhook know which symbols to watch - see watchlistStore for
// the full explanation.
watchlistRouter.post('/sync', (req, res) => {
  const symbols = sanitizeSymbolList(req.body?.symbols);
  const stored = setWatchlistSymbols(symbols);
  res.json({ symbols: stored });
});
