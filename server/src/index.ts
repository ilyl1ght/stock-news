import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config, isFinnhubConfigured } from './config';
import { logger } from './utils/logger';
import { generalLimiter } from './utils/rateLimit';
import { searchRouter } from './routes/search';
import { stocksRouter } from './routes/stocks';
import { newsRouter } from './routes/news';
import { marketRouter } from './routes/market';
import { watchlistRouter } from './routes/watchlist';
import { alertsRouter } from './routes/alerts';
import { settingsRouter } from './routes/settings';
import { statusRouter } from './routes/status';
import { startMonitor } from './alerts/monitor';

const app = express();

app.disable('x-powered-by');
app.use(
  cors({
    origin: config.corsOrigin || true,
  }),
);
app.use(express.json({ limit: '10kb' }));
app.use('/api', generalLimiter);

app.use('/api/search', searchRouter);
app.use('/api/stocks', stocksRouter);
app.use('/api/news', newsRouter);
app.use('/api/market', marketRouter);
app.use('/api/watchlist', watchlistRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/status', statusRouter);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found.' });
});

// Serve the built frontend (client/dist) if present, so a single Node
// process can serve both the API and the UI in production. In dev mode the
// frontend runs separately via the Vite dev server and this block is
// skipped (the folder won't exist yet).
if (fs.existsSync(config.clientDistDir)) {
  app.use(express.static(config.clientDistDir));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(config.clientDistDir, 'index.html'));
  });
} else {
  logger.warn('client/dist not found - run "npm run build -w client" to serve the frontend from this server.');
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { status?: number; statusCode?: number; type?: string }, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('Unhandled error', err);
  const status = err.status || err.statusCode || 500;
  const message = status === 413 ? 'Request is too large.' : status === 400 ? 'Invalid request.' : 'Something went wrong on our end. Please try again.';
  res.status(status).json({ error: message });
});

app.listen(config.port, () => {
  logger.info(`STOCK NEWS server listening on port ${config.port}`);
  logger.info(`Market data / news provider (Finnhub) configured: ${isFinnhubConfigured()}`);
  startMonitor();
});
