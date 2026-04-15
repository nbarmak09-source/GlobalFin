export const RECENT_STOCKS_KEY = "gcm-recent-stocks";

export type RecentStockEntry = { symbol: string; name: string };

const MAX = 5;

export function readRecentStocks(): RecentStockEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_STOCKS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((x) => {
        if (!x || typeof x !== "object") return null;
        const s = (x as { symbol?: string; name?: string }).symbol;
        const n = (x as { symbol?: string; name?: string }).name;
        if (typeof s !== "string" || !s.trim()) return null;
        const sym = s.trim().toUpperCase();
        return { symbol: sym, name: typeof n === "string" && n.trim() ? n.trim() : sym };
      })
      .filter((x): x is RecentStockEntry => x !== null)
      .slice(0, MAX);
  } catch {
    return [];
  }
}

/** Most recent first; dedupes by symbol. */
export function pushRecentStock(symbol: string, name: string): RecentStockEntry[] {
  const sym = symbol.trim().toUpperCase();
  const nm = name.trim() || sym;
  const prev = readRecentStocks().filter((x) => x.symbol !== sym);
  const next = [{ symbol: sym, name: nm }, ...prev].slice(0, MAX);
  try {
    localStorage.setItem(RECENT_STOCKS_KEY, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
  return next;
}
