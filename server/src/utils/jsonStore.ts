import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { logger } from './logger';

// Minimal, dependency-free JSON file persistence. Writes are synchronous and
// atomic (write to a temp file, then rename) which is more than sufficient
// for the small, infrequently-written state this app keeps (settings,
// watchlist mirror, alert/event history, dedupe bookkeeping).

function ensureDataDir(): void {
  if (!fs.existsSync(config.dataDir)) {
    fs.mkdirSync(config.dataDir, { recursive: true });
  }
}

export function readJson<T>(fileName: string, defaultValue: T): T {
  ensureDataDir();
  const filePath = path.join(config.dataDir, fileName);
  try {
    if (!fs.existsSync(filePath)) return defaultValue;
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.trim()) return defaultValue;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.error(`Failed to read ${fileName}, using default`, err);
    return defaultValue;
  }
}

export function writeJson<T>(fileName: string, value: T): void {
  ensureDataDir();
  const filePath = path.join(config.dataDir, fileName);
  const tmpPath = `${filePath}.tmp`;
  try {
    fs.writeFileSync(tmpPath, JSON.stringify(value, null, 2), 'utf-8');
    fs.renameSync(tmpPath, filePath);
  } catch (err) {
    logger.error(`Failed to write ${fileName}`, err);
  }
}
