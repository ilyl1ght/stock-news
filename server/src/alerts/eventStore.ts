import { randomUUID } from 'crypto';
import { readJson, writeJson } from '../utils/jsonStore';
import { AlertType, Signal, WatchlistEvent } from '../types';

// Stores the alert/event history (what the Alerts page shows and what gets
// sent to Discord) plus per-symbol bookkeeping used purely for duplicate
// prevention and cooldowns: which article IDs have already been seen, what
// the last known signal was (to detect a change), the last date a price
// movement alert fired, and when Discord last sent each alert type.

const EVENTS_FILE = 'events.json';
const MONITOR_STATE_FILE = 'monitor-state.json';
const MAX_EVENTS = 300;
const MAX_SEEN_ARTICLES_PER_SYMBOL = 100;

interface SymbolMonitorState {
  seenArticleIds: string[];
  lastSignal: Signal | null;
  lastPriceAlertKey: string | null;
  lastDiscordSentAt: Partial<Record<AlertType, number>>;
}

type MonitorStateFile = Record<string, SymbolMonitorState>;

let events: WatchlistEvent[] | null = null;
let monitorState: MonitorStateFile | null = null;

function loadEvents(): WatchlistEvent[] {
  if (events === null) events = readJson<WatchlistEvent[]>(EVENTS_FILE, []);
  return events;
}

function loadMonitorState(): MonitorStateFile {
  if (monitorState === null) monitorState = readJson<MonitorStateFile>(MONITOR_STATE_FILE, {});
  return monitorState;
}

function persistEvents(): void {
  if (events) writeJson(EVENTS_FILE, events);
}

function persistMonitorState(): void {
  if (monitorState) writeJson(MONITOR_STATE_FILE, monitorState);
}

function symbolState(symbol: string): SymbolMonitorState {
  const ms = loadMonitorState();
  if (!ms[symbol]) {
    ms[symbol] = { seenArticleIds: [], lastSignal: null, lastPriceAlertKey: null, lastDiscordSentAt: {} };
  }
  return ms[symbol];
}

export function addEvent(input: Omit<WatchlistEvent, 'id' | 'createdAt' | 'discordSent'>): WatchlistEvent {
  const list = loadEvents();
  const event: WatchlistEvent = {
    ...input,
    id: randomUUID(),
    createdAt: Date.now(),
    discordSent: false,
  };
  list.unshift(event);
  if (list.length > MAX_EVENTS) list.length = MAX_EVENTS;
  persistEvents();
  return event;
}

export function markEventDiscordSent(id: string): void {
  const list = loadEvents();
  const event = list.find((e) => e.id === id);
  if (event) {
    event.discordSent = true;
    persistEvents();
  }
}

export function getEvents(symbols?: string[]): WatchlistEvent[] {
  const list = loadEvents();
  const filtered = symbols ? list.filter((e) => symbols.includes(e.symbol)) : list;
  return [...filtered].sort((a, b) => b.createdAt - a.createdAt);
}

export function hasSeenArticle(symbol: string, articleId: string): boolean {
  return symbolState(symbol).seenArticleIds.includes(articleId);
}

export function markArticleSeen(symbol: string, articleId: string): void {
  const s = symbolState(symbol);
  if (!s.seenArticleIds.includes(articleId)) {
    s.seenArticleIds.push(articleId);
    if (s.seenArticleIds.length > MAX_SEEN_ARTICLES_PER_SYMBOL) {
      s.seenArticleIds.splice(0, s.seenArticleIds.length - MAX_SEEN_ARTICLES_PER_SYMBOL);
    }
    persistMonitorState();
  }
}

export function getLastSignal(symbol: string): Signal | null {
  return symbolState(symbol).lastSignal;
}

export function setLastSignal(symbol: string, signal: Signal): void {
  symbolState(symbol).lastSignal = signal;
  persistMonitorState();
}

export function getLastPriceAlertKey(symbol: string): string | null {
  return symbolState(symbol).lastPriceAlertKey;
}

export function setLastPriceAlertKey(symbol: string, key: string): void {
  symbolState(symbol).lastPriceAlertKey = key;
  persistMonitorState();
}

/** True if enough time has passed since the last Discord send of this type for this symbol. */
export function canSendDiscord(symbol: string, type: AlertType, cooldownMinutes: number): boolean {
  const last = symbolState(symbol).lastDiscordSentAt[type];
  if (!last) return true;
  return Date.now() - last >= cooldownMinutes * 60_000;
}

export function recordDiscordSent(symbol: string, type: AlertType): void {
  symbolState(symbol).lastDiscordSentAt[type] = Date.now();
  persistMonitorState();
}

/** Drops bookkeeping for symbols no longer on the watchlist so removed stocks don't linger. */
export function pruneMonitorState(activeSymbols: string[]): void {
  const ms = loadMonitorState();
  let changed = false;
  for (const symbol of Object.keys(ms)) {
    if (!activeSymbols.includes(symbol)) {
      delete ms[symbol];
      changed = true;
    }
  }
  if (changed) persistMonitorState();
}
