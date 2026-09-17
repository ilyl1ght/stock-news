# STOCK NEWS

A clean, dark, real-data stock market news and analysis dashboard. No login, no
accounts — open the site, click **ENTER**, and start tracking stocks. Your
watchlist lives in your browser; the server watches it for you and can post
alerts to a Discord channel automatically.

- Real market data and news (no fabricated prices, articles, or signals)
- A transparent, explainable BULLISH / NEUTRAL / BEARISH analysis engine
- A personal, local watchlist (no accounts) that drives everything else
- Watchlist-only Discord alerts, with the webhook URL kept server-side only

---

## 1. How it's built

```
stock-news/
  client/    React + TypeScript + Vite + Tailwind (the UI)
  server/    Node + Express + TypeScript (the API, providers, analysis,
             storage, background monitor, Discord integration)
```

In production, the **server serves the built client** from `client/dist`, so
the whole app runs as a single Node process on a single port. In development,
Vite runs its own dev server and proxies `/api` requests to the backend.

Backend modules are kept intentionally separate so any piece can be swapped
without touching the rest:

| Module | Responsibility |
|---|---|
| `server/src/providers/` | Market data, charts, and news - one interface per capability, one implementation per provider |
| `server/src/analysis/` | Sentiment scoring + the weighted signal engine |
| `server/src/watchlistStore/` | The backend's mirror of the browser's watchlist |
| `server/src/alerts/` | Event history, deduplication, the background monitor, Discord sending |
| `server/src/settingsStore/` | Discord webhook URL + alert preferences (server-side only) |
| `server/src/routes/` | The HTTP API the frontend talks to |

## 2. Install

Requires Node.js 18.18+ and npm.

```bash
git clone <this repo>
cd stock-news
npm install
cp .env.example .env
```

`npm install` at the root installs both `client/` and `server/` dependencies
via npm workspaces - you don't need to run it separately in each folder.

## 3. Configure environment variables

All configuration lives in a single `.env` file at the project root (copied
from `.env.example`). Nothing here is ever sent to the browser.

| Variable | Required | Description |
|---|---|---|
| `PORT` | no (default `8080`) | Port the Node server listens on |
| `FINNHUB_API_KEY` | recommended | Powers stock search, quotes, company profiles, and news. Free key: https://finnhub.io/register (no credit card) |
| `DISCORD_WEBHOOK_URL` | no | Default Discord webhook. You can also paste this into the Settings page instead - see below |
| `MONITOR_INTERVAL_MINUTES` | no (default `5`) | How often the server checks watchlist stocks for new alerts |
| `CORS_ORIGIN` | no | Restrict the API to one origin in production. Leave blank for same-origin (the normal setup once the server serves the built client) |

**Without `FINNHUB_API_KEY` configured**, the app still runs - search, quotes,
news, and analysis all show a friendly "Market data temporarily unavailable"
instead of throwing errors or making anything up. The price chart (via Stooq,
see below) works even without a key.

## 4. Run it locally

```bash
npm run dev
```

This starts the backend (`http://localhost:8080`) and the Vite dev server
(`http://localhost:5173`) together. Open `http://localhost:5173` - it proxies
`/api/*` to the backend automatically.

To run a production-style build locally:

```bash
npm run build   # builds client/dist, then compiles server to server/dist
npm start       # node server/dist/index.js - serves the API + built UI on PORT
```

## 5. Data providers

The app uses two free, independent data sources behind a small provider
interface (`server/src/providers/`), so either can be swapped later without
touching routes, the analysis engine, or the UI:

- **Finnhub** (`FINNHUB_API_KEY`) - symbol search, live quotes, company
  profiles, company-specific news, and general market news. Free tier: 60
  requests/minute, no credit card. Register at https://finnhub.io/register.
- **Stooq** (no key needed) - historical daily price/volume data that powers
  the price chart and the volume-trend part of the analysis engine. Stooq has
  no authentication and no key to configure.

Both the market-data page (Settings → DATA) and every API response expose a
provider's health honestly: if a provider isn't configured or a request
fails, the UI shows *"Market data temporarily unavailable"* rather than
inventing numbers. An unrecognized ticker shows *"No matching stock found"*
instead.

Responses are cached briefly in memory (30s for quotes, up to a day for
company profiles, etc. - see `server/src/utils/cache.ts`) so normal use and
the background monitor stay well inside free-tier rate limits.

## 6. The analysis engine (how BULLISH / NEUTRAL / BEARISH is decided)

`server/src/analysis/engine.ts` computes a transparent, weighted score in the
range -100..+100 from up to four real, independently-fetched signals:

| Component | Weight | Based on |
|---|---|---|
| Recent news sentiment | 40% | Up to 8 company news articles from the last 4 days, scored by a keyword-based sentiment lexicon (`server/src/analysis/sentiment.ts`) |
| Price momentum | 30% | Today's % price change |
| Relative market strength | 15% | Today's % change vs. the S&P 500 (SPY) as a market proxy |
| Volume trend | 15% | Recent trading volume vs. its own baseline, amplifying today's price direction when volume is notably elevated |

A component that couldn't be fetched (e.g. no recent news) simply contributes
nothing and is marked "not available" - it never gets a made-up value. The
total score maps to a signal (≥ +15 BULLISH, ≤ -15 BEARISH, otherwise
NEUTRAL), and each contributing factor becomes one of the plain-English "WHY"
bullets on the stock detail page. The full weighted breakdown is always
available under **ADVANCED DATA ▼**. If none of the components could be
computed (e.g. the stock has no price data), the app shows **NOT ENOUGH
INFORMATION** instead of guessing.

This is a heuristic over real, currently-available information - it is never
presented as a prediction or a guarantee of future price movement.

## 7. How the watchlist works (and why there's a sync step)

There are no accounts, by design. The watchlist is stored in the browser via
`localStorage` (`client/src/context/WatchlistContext.tsx`) and persists across
visits on that device - it is never shared with other visitors.

The Discord webhook, however, runs **server-side** and has to know which
symbols are currently on the watchlist so it never mentions a stock you're
not tracking. Since there's no account system to look the watchlist up by,
the browser pushes its current symbol list to the server on every change:

```
Browser localStorage (source of truth for the UI)
        │  every add/remove, and once on load
        ▼
POST /api/watchlist/sync  →  server/src/watchlistStore  (a lightweight mirror)
        │
        ▼
Background monitor reads this mirror to decide what to check and alert on
```

**This means STOCK NEWS is designed for a single deployment per Discord
destination** (one instance = one watchlist mirror = one set of Discord
alerts) - which matches "I will provide a Discord webhook URL" in the brief.
It is not a multi-tenant SaaS with per-visitor Discord routing. If you open
the site from two different browsers, the last one to sync wins for Discord
alert purposes, even though each browser keeps its own local watchlist for
display. For personal or small-team use (the intended use case here) this is
the simplest correct design; a multi-user version would need real accounts,
which the brief explicitly rules out.

## 8. How monitoring and Discord alerts work

Every `MONITOR_INTERVAL_MINUTES` (default 5), `server/src/alerts/monitor.ts`
walks the current watchlist mirror and, for each symbol:

1. Runs the analysis engine and compares the signal to the last known one →
   if it changed (e.g. NEUTRAL → BULLISH), records a **SIGNAL_CHANGE** event.
2. Checks today's % price change against the configured threshold (default
   3%) → records a **PRICE_MOVEMENT** event at most once per day/direction.
3. Fetches recent company news and picks the single most notable *new*
   article (by sentiment strength) that hasn't been seen before → records a
   **NEWS** event. Neutral or already-seen articles never trigger anything.

Every event is saved to the Alerts page regardless of Discord settings. Separately,
for each event, the server checks: is Discord enabled, is this alert type
enabled in Settings, has the per-symbol/per-type cooldown (default 30 min)
elapsed, and is a webhook actually configured? Only if all of that holds does
it POST a Discord embed. Duplicate news is prevented by tracking seen
article IDs per symbol; duplicate price/signal alerts are prevented with
per-symbol dedupe keys - see `server/src/alerts/eventStore.ts`.

Because the monitor only ever iterates the current watchlist mirror, adding a
stock starts monitoring it automatically on the next cycle, and removing a
stock stops all future alerts about it immediately - there's no separate
Discord configuration step per stock.

## 9. Setting up the Discord webhook

1. In Discord: **Server Settings → Integrations → Webhooks → New Webhook**,
   then **Copy Webhook URL**.
2. In STOCK NEWS, go to **Settings → Discord**, paste the URL, and click
   **Save**. (Or set `DISCORD_WEBHOOK_URL` in `.env` before starting the
   server.)
3. Click **Test Webhook** to confirm it's connected.
4. Toggle **Enable Discord Alerts** on, and choose which alert types you want
   (new news, signal changes, price movements), plus a cooldown and a price
   movement threshold.

The webhook URL is **never** sent to the browser: it's written straight to
the server's local settings file on save, and every API response only ever
reports a `configured: true/false` boolean - never the URL itself. See
`server/src/routes/settings.ts` and `server/src/settingsStore/store.ts`.

## 10. Deploying publicly

STOCK NEWS is a normal, always-on Node server (the background monitor needs a
long-running process, not a serverless function that sleeps between
requests). Any Node host works: a small VPS, Render, Railway, Fly.io, etc.

1. Set `FINNHUB_API_KEY` (and optionally `DISCORD_WEBHOOK_URL`,
   `MONITOR_INTERVAL_MINUTES`) as environment variables on the host.
2. Build: `npm install && npm run build`.
3. Start: `npm start` (runs `node server/dist/index.js`), which serves both
   the API and the built frontend on `PORT`.
4. Point your domain at that port (directly, or behind a reverse proxy like
   nginx/Caddy for TLS).
5. The `server/data/` directory holds the small JSON files that back the
   watchlist mirror, settings, and alert history - make sure it's on
   persistent storage (not wiped on every deploy) if you want alert history
   and Discord settings to survive restarts. It's created automatically.
6. If you're behind a reverse proxy (Render, Railway, Fly.io, nginx, etc. -
   true for most hosts), every visitor's request arrives from the proxy's
   internal address, so Express's default `req.ip` can't tell them apart and
   the built-in rate limiter (`server/src/utils/rateLimit.ts`) ends up
   sharing one bucket across all visitors instead of one per real client.
   This is a usability nuance, not a security hole - it just makes the
   limiter more conservative than intended. To restore accurate per-visitor
   limits, add `app.set('trust proxy', 1)` in `server/src/index.ts` (or the
   correct hop count for your setup) - only do this when you know the
   request really passes through a trusted proxy, since trusting it
   blindly lets a client fake its own IP via the `X-Forwarded-For` header.

## 11. Known limitations (by design)

- **Indexes are ETF proxies.** Finnhub's free tier doesn't expose raw S&P
  500/Nasdaq/Dow index quotes, so the Market page tracks them via their most
  liquid ETFs (SPY, QQQ, DIA) and shows the ETF's real price/% change as-is -
  never rescaled into a fabricated index number.
- **Sentiment is keyword-based, not ML.** `analysis/sentiment.ts` scores real
  headlines/summaries against an explicit positive/negative finance-term
  lexicon. It's intentionally simple so the "WHY" behind a signal is always
  explainable, at the cost of missing subtler phrasing.
- **Single watchlist mirror per deployment**, as explained in section 7.

## 12. Testing this yourself

- `npm run typecheck` - strict TypeScript across both client and server.
- `npm run build` - production build of both.
- With no `FINNHUB_API_KEY` set, every page should still load and show
  friendly "temporarily unavailable" messaging instead of errors - this is
  worth checking first since it exercises every failure path at once.
- With a real key set, walk the flow end to end: search a ticker → add to
  watchlist → open its detail page (chart, signal, WHY, news) → News page →
  Market page → Settings (save + test a Discord webhook) → Alerts page after
  the monitor's first cycle (~10s after boot, then every
  `MONITOR_INTERVAL_MINUTES`).
