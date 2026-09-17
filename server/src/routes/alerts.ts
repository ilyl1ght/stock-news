import { Router } from 'express';
import { getEvents } from '../alerts/eventStore';
import { sanitizeSymbolList } from '../utils/validate';

export const alertsRouter = Router();

alertsRouter.get('/', (req, res) => {
  const rawSymbols = typeof req.query.symbols === 'string' ? req.query.symbols.split(',') : [];
  const symbols = sanitizeSymbolList(rawSymbols, 100);
  const events = getEvents(symbols.length > 0 ? symbols : undefined).slice(0, 100);
  res.json({ events });
});
