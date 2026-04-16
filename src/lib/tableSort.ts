/** Portfolio / watchlist row ordering (persisted in localStorage on the client). */
export type HoldingsTableSortMode = "manual" | "sector" | "symbol";

export function sortHoldingsRows<T extends { symbol: string; sector?: string }>(
  items: T[],
  mode: HoldingsTableSortMode
): T[] {
  if (mode === "manual") return items;
  const copy = [...items];
  if (mode === "sector") {
    copy.sort((a, b) => {
      const sa = (a.sector || "").trim().toLowerCase() || "\uffff";
      const sb = (b.sector || "").trim().toLowerCase() || "\uffff";
      const c = sa.localeCompare(sb);
      if (c !== 0) return c;
      return a.symbol.localeCompare(b.symbol);
    });
  } else {
    copy.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }
  return copy;
}
