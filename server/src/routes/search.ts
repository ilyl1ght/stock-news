import { Router } from 'express';
import { searchSymbolsCached } from '../providers/cachedAccess';
import { isValidSearchQuery } from '../utils/validate';
import { isFinnhubConfigured } from '../config';
import { searchLimiter } from '../utils/rateLimit';

export const searchRouter = Router();

searchRouter.get('/', searchLimiter, async (req, res) => {
  const q = req.query.q;
  if (!isFinnhubConfigured()) {
    return res.json({ results: [], unavailable: true });
  }
  if (!isValidSearchQuery(q)) {
    return res.json({ results: [] });
  }
  try {
    const results = await searchSymbolsCached(q.trim());
    res.json({ results });
  } catch {
    res.json({ results: [], unavailable: true });
  }
});
