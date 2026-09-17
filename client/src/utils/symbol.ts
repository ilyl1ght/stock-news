// Same constraint as the backend's validator. Used to sanitize any ticker
// before it's placed into a route path (defense in depth against malformed
// values ever reaching react-router's Link/navigate).
const SYMBOL_RE = /^[A-Z0-9.\-^]{1,10}$/;

export function isValidSymbol(raw: string | undefined | null): raw is string {
  if (!raw) return false;
  return SYMBOL_RE.test(raw.trim().toUpperCase());
}

export function normalizeSymbol(raw: string): string {
  return raw.trim().toUpperCase();
}
