"use client";

import { useState, useMemo, useCallback } from "react";
import type { QuoteSummaryData } from "@/lib/types";
import SymbolSearch from "@/components/SymbolSearch";
import { Download, X, Plus, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";

interface CompsModelProps {
  data: QuoteSummaryData;
  symbol: string;
}

interface PeerData {
  symbol: string;
  name: string;
  loading: boolean;
  data: QuoteSummaryData | null;
}

const METRICS: {
  key: keyof QuoteSummaryData;
  label: string;
  format: "large" | "multiple" | "percent";
}[] = [
  { key: "marketCap", label: "Market Cap", format: "large" },
  { key: "enterpriseValue", label: "EV", format: "large" },
  { key: "trailingPE", label: "P/E (TTM)", format: "multiple" },
  { key: "forwardPE", label: "P/E (Fwd)", format: "multiple" },
  { key: "enterpriseToEbitda", label: "EV/EBITDA", format: "multiple" },
  { key: "enterpriseToRevenue", label: "EV/Rev", format: "multiple" },
  { key: "priceToBook", label: "P/B", format: "multiple" },
  { key: "pegRatio", label: "PEG", format: "multiple" },
  { key: "revenueGrowth", label: "Rev Growth", format: "percent" },
  { key: "ebitdaMargins", label: "EBITDA Mgn", format: "percent" },
  { key: "profitMargins", label: "Net Mgn", format: "percent" },
];

const VALUATION_METHODS: {
  label: string;
  multipleKey: keyof QuoteSummaryData;
  fundamentalKey: keyof QuoteSummaryData;
  method: "perShare" | "enterprise";
}[] = [
  {
    label: "P/E (TTM)",
    multipleKey: "trailingPE",
    fundamentalKey: "trailingEps",
    method: "perShare",
  },
  {
    label: "P/E (Fwd)",
    multipleKey: "forwardPE",
    fundamentalKey: "forwardEps",
    method: "perShare",
  },
  {
    label: "EV/EBITDA",
    multipleKey: "enterpriseToEbitda",
    fundamentalKey: "ebitda",
    method: "enterprise",
  },
  {
    label: "EV/Revenue",
    multipleKey: "enterpriseToRevenue",
    fundamentalKey: "totalRevenue",
    method: "enterprise",
  },
];

function fmtLarge(n: number): string {
  if (!n || isNaN(n)) return "—";
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  return `${sign}$${abs.toLocaleString()}`;
}

function fmtMultiple(n: number): string {
  if (!n || isNaN(n) || !isFinite(n)) return "—";
  return n.toFixed(1) + "x";
}

function fmtPercent(n: number): string {
  if (n == null || isNaN(n)) return "—";
  return (n * 100).toFixed(1) + "%";
}

function fmtValue(
  value: number,
  format: "large" | "multiple" | "percent",
): string {
  if (format === "large") return fmtLarge(value);
  if (format === "multiple") return fmtMultiple(value);
  return fmtPercent(value);
}

function calcMedian(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export default function CompsModel({ data, symbol }: CompsModelProps) {
  const [peers, setPeers] = useState<PeerData[]>([]);
  const [showSearch, setShowSearch] = useState(false);

  const addPeer = useCallback(
    async (sym: string, name: string) => {
      const upper = sym.toUpperCase();
      if (upper === symbol.toUpperCase()) return;
      if (peers.some((p) => p.symbol === upper)) return;

      setPeers((prev) => [
        ...prev,
        { symbol: upper, name, loading: true, data: null },
      ]);
      setShowSearch(false);

      try {
        const res = await fetch(
          `/api/stocks?action=summary&symbol=${encodeURIComponent(sym)}`,
        );
        if (res.ok) {
          const peerData: QuoteSummaryData = await res.json();
          setPeers((prev) =>
            prev.map((p) =>
              p.symbol === upper
                ? {
                    ...p,
                    loading: false,
                    data: peerData,
                    name: peerData.shortName || name,
                  }
                : p,
            ),
          );
        } else {
          setPeers((prev) =>
            prev.map((p) =>
              p.symbol === upper ? { ...p, loading: false } : p,
            ),
          );
        }
      } catch {
        setPeers((prev) =>
          prev.map((p) =>
            p.symbol === upper ? { ...p, loading: false } : p,
          ),
        );
      }
    },
    [symbol, peers],
  );

  const removePeer = useCallback((sym: string) => {
    setPeers((prev) => prev.filter((p) => p.symbol !== sym));
  }, []);

  const stats = useMemo(() => {
    const peerDataList = peers.filter((p) => p.data).map((p) => p.data!);
    if (peerDataList.length === 0) return null;

    const result: Record<
      string,
      { mean: number; median: number; high: number; low: number }
    > = {};

    for (const metric of METRICS) {
      const values = peerDataList
        .map((d) => d[metric.key] as number)
        .filter((v) => v != null && !isNaN(v) && isFinite(v) && v > 0);

      if (values.length === 0) {
        result[metric.key] = { mean: NaN, median: NaN, high: NaN, low: NaN };
        continue;
      }

      result[metric.key] = {
        mean: values.reduce((s, v) => s + v, 0) / values.length,
        median: calcMedian(values),
        high: Math.max(...values),
        low: Math.min(...values),
      };
    }
    return result;
  }, [peers]);

  const impliedValuations = useMemo(() => {
    if (!stats) return [];
    const netDebt = (data.totalDebt || 0) - (data.totalCash || 0);
    const sharesOut = data.sharesOutstanding || 1;

    return VALUATION_METHODS.map((vm) => {
      const peerMedian = stats[vm.multipleKey]?.median;
      const peerMean = stats[vm.multipleKey]?.mean;
      const fundamental = data[vm.fundamentalKey] as number;

      if (
        !peerMedian ||
        !peerMean ||
        !fundamental ||
        isNaN(peerMedian) ||
        isNaN(fundamental)
      ) {
        return {
          label: vm.label,
          medianPrice: NaN,
          meanPrice: NaN,
          peerMedian: NaN,
          peerMean: NaN,
        };
      }

      if (vm.method === "perShare") {
        return {
          label: vm.label,
          medianPrice: fundamental * peerMedian,
          meanPrice: fundamental * peerMean,
          peerMedian,
          peerMean,
        };
      }

      const evMedian = fundamental * peerMedian;
      const evMean = fundamental * peerMean;
      return {
        label: vm.label,
        medianPrice: (evMedian - netDebt) / sharesOut,
        meanPrice: (evMean - netDebt) / sharesOut,
        peerMedian,
        peerMean,
      };
    });
  }, [stats, data]);

  function exportToExcel() {
    const wb = XLSX.utils.book_new();

    const headers = ["Company", "Symbol", ...METRICS.map((m) => m.label)];
    const rows: (string | number)[][] = [
      [
        data.shortName || symbol,
        symbol,
        ...METRICS.map((m) => fmtValue(data[m.key] as number, m.format)),
      ],
      ...peers
        .filter((p) => p.data)
        .map((p) => [
          p.name,
          p.symbol,
          ...METRICS.map((m) =>
            fmtValue(p.data![m.key] as number, m.format),
          ),
        ]),
    ];

    if (stats) {
      rows.push([]);
      rows.push([
        "Mean",
        "",
        ...METRICS.map((m) => fmtValue(stats[m.key]?.mean, m.format)),
      ]);
      rows.push([
        "Median",
        "",
        ...METRICS.map((m) => fmtValue(stats[m.key]?.median, m.format)),
      ]);
      rows.push([
        "High",
        "",
        ...METRICS.map((m) => fmtValue(stats[m.key]?.high, m.format)),
      ]);
      rows.push([
        "Low",
        "",
        ...METRICS.map((m) => fmtValue(stats[m.key]?.low, m.format)),
      ]);
    }

    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet([headers, ...rows]),
      "Comps Table",
    );

    const validImplied = impliedValuations.filter(
      (iv) => !isNaN(iv.medianPrice) || !isNaN(iv.meanPrice),
    );
    if (validImplied.length > 0) {
      const valHeaders = [
        "Methodology",
        "Peer Median",
        "Peer Mean",
        "Implied (Median)",
        "Implied (Mean)",
      ];
      const valRows = validImplied.map((iv) => [
        iv.label,
        isNaN(iv.peerMedian) ? "—" : iv.peerMedian.toFixed(1) + "x",
        isNaN(iv.peerMean) ? "—" : iv.peerMean.toFixed(1) + "x",
        isNaN(iv.medianPrice) ? "—" : "$" + iv.medianPrice.toFixed(2),
        isNaN(iv.meanPrice) ? "—" : "$" + iv.meanPrice.toFixed(2),
      ]);
      valRows.push([]);
      valRows.push([
        "Current Price",
        "",
        "",
        "$" + data.regularMarketPrice.toFixed(2),
        "",
      ]);
      XLSX.utils.book_append_sheet(
        wb,
        XLSX.utils.aoa_to_sheet([valHeaders, ...valRows]),
        "Implied Valuation",
      );
    }

    XLSX.writeFile(wb, `${symbol}_Comps_Model.xlsx`);
  }

  const loadedPeers = peers.filter((p) => p.data);
  const hasStats = loadedPeers.length > 0 && stats;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-sm font-medium hover:bg-card-hover transition-colors"
          >
            <Plus className="h-4 w-4" />
            Add Peer
          </button>
          {peers.some((p) => p.loading) && (
            <Loader2 className="h-4 w-4 animate-spin text-accent" />
          )}
        </div>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 transition-colors"
        >
          <Download className="h-4 w-4" />
          Export to Excel
        </button>
      </div>

      {showSearch && (
        <div className="max-w-md">
          <SymbolSearch
            onSelect={addPeer}
            placeholder="Search for a comparable company…"
          />
        </div>
      )}

      {/* Peer chips */}
      {peers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {peers.map((p) => (
            <span
              key={p.symbol}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card border border-border text-sm"
            >
              <span className="font-medium text-accent">{p.symbol}</span>
              <span className="text-muted truncate max-w-[120px]">
                {p.name}
              </span>
              {p.loading && (
                <Loader2 className="h-3 w-3 animate-spin text-muted" />
              )}
              <button
                onClick={() => removePeer(p.symbol)}
                className="text-muted hover:text-foreground ml-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Comps Table */}
      <section className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-3 border-b border-border bg-card-hover">
          <h3 className="text-sm font-semibold">Comparable Companies</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted border-b border-border">
                <th className="px-4 py-2 font-medium sticky left-0 bg-card z-10 min-w-[150px]">
                  Company
                </th>
                {METRICS.map((m) => (
                  <th
                    key={m.key}
                    className="px-3 py-2 font-medium text-right whitespace-nowrap"
                  >
                    {m.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* Target company */}
              <tr className="border-b border-border bg-accent/5">
                <td className="px-4 py-2 font-semibold sticky left-0 bg-accent/5 z-10">
                  <div>{data.shortName || symbol}</div>
                  <div className="text-xs text-accent">{symbol} (target)</div>
                </td>
                {METRICS.map((m) => (
                  <td
                    key={m.key}
                    className="px-3 py-2 text-right tabular-nums font-medium"
                  >
                    {fmtValue(data[m.key] as number, m.format)}
                  </td>
                ))}
              </tr>

              {/* Peers */}
              {peers.map((p) => (
                <tr
                  key={p.symbol}
                  className="border-b border-border/50 hover:bg-card-hover transition-colors"
                >
                  <td className="px-4 py-2 sticky left-0 bg-card z-10">
                    <div className="font-medium">{p.name}</div>
                    <div className="text-xs text-muted">{p.symbol}</div>
                  </td>
                  {p.loading ? (
                    <td
                      colSpan={METRICS.length}
                      className="px-4 py-2 text-center text-muted"
                    >
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                      Loading…
                    </td>
                  ) : p.data ? (
                    METRICS.map((m) => (
                      <td
                        key={m.key}
                        className="px-3 py-2 text-right tabular-nums"
                      >
                        {fmtValue(p.data![m.key] as number, m.format)}
                      </td>
                    ))
                  ) : (
                    <td
                      colSpan={METRICS.length}
                      className="px-4 py-2 text-center text-muted"
                    >
                      Data unavailable
                    </td>
                  )}
                </tr>
              ))}

              {/* Summary stats */}
              {hasStats && (
                <>
                  {(
                    [
                      { label: "Mean", stat: "mean", highlight: false },
                      { label: "Median", stat: "median", highlight: true },
                      { label: "High", stat: "high", highlight: false },
                      { label: "Low", stat: "low", highlight: false },
                    ] as const
                  ).map(({ label, stat, highlight }) => (
                    <tr
                      key={stat}
                      className={`${stat === "mean" ? "border-t-2 border-border" : "border-b border-border/30"} ${highlight ? "bg-accent/5" : ""}`}
                    >
                      <td
                        className={`px-4 py-2 font-semibold text-muted sticky left-0 z-10 ${highlight ? "bg-accent/5" : "bg-card"}`}
                      >
                        {label}
                      </td>
                      {METRICS.map((m) => (
                        <td
                          key={m.key}
                          className={`px-3 py-2 text-right tabular-nums ${highlight ? "font-semibold" : ""}`}
                        >
                          {fmtValue(
                            stats![m.key]?.[stat] as number,
                            m.format,
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Empty state */}
      {peers.length === 0 && (
        <div className="text-center py-12 text-muted">
          <p className="text-sm mb-1">
            Add comparable companies to build your comps table.
          </p>
          <p className="text-xs">
            Click &quot;Add Peer&quot; above to search for companies in the same
            sector or industry.
          </p>
        </div>
      )}

      {/* Implied Valuation + Football Field */}
      {hasStats && impliedValuations.some((iv) => !isNaN(iv.medianPrice)) && (
        <section className="grid md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-card-hover">
              <h3 className="text-sm font-semibold">Implied Valuation</h3>
            </div>
            <div className="p-4 space-y-3">
              {impliedValuations.map((iv) => {
                if (isNaN(iv.medianPrice) && isNaN(iv.meanPrice)) return null;
                const price = !isNaN(iv.medianPrice)
                  ? iv.medianPrice
                  : iv.meanPrice;
                const upside =
                  ((price - data.regularMarketPrice) /
                    data.regularMarketPrice) *
                  100;
                return (
                  <div
                    key={iv.label}
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium">{iv.label}</p>
                      <p className="text-xs text-muted">
                        Peer median:{" "}
                        {isNaN(iv.peerMedian)
                          ? "—"
                          : iv.peerMedian.toFixed(1) + "x"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        ${price.toFixed(2)}
                      </p>
                      <p
                        className={`text-xs ${upside >= 0 ? "text-green-500" : "text-red-500"}`}
                      >
                        {upside >= 0 ? "+" : ""}
                        {upside.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-border flex justify-between text-sm">
                <span className="text-muted">Current Price</span>
                <span className="font-semibold tabular-nums">
                  ${data.regularMarketPrice.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Football field chart */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-5 py-3 border-b border-border bg-card-hover">
              <h3 className="text-sm font-semibold">Valuation Range</h3>
            </div>
            <div className="p-4 space-y-4">
              {(() => {
                const validPrices = impliedValuations
                  .filter(
                    (iv) => !isNaN(iv.medianPrice) || !isNaN(iv.meanPrice),
                  )
                  .flatMap((iv) =>
                    [iv.medianPrice, iv.meanPrice].filter((v) => !isNaN(v)),
                  );
                if (validPrices.length === 0)
                  return (
                    <p className="text-sm text-muted">Not enough data</p>
                  );

                const allPrices = [...validPrices, data.regularMarketPrice];
                const minP = Math.min(...allPrices) * 0.85;
                const maxP = Math.max(...allPrices) * 1.15;
                const range = maxP - minP;

                return (
                  <>
                    {impliedValuations.map((iv) => {
                      if (isNaN(iv.medianPrice) && isNaN(iv.meanPrice))
                        return null;
                      const prices = [iv.medianPrice, iv.meanPrice].filter(
                        (v) => !isNaN(v),
                      );
                      const lo = Math.min(...prices);
                      const hi = Math.max(...prices);
                      const leftPct = ((lo - minP) / range) * 100;
                      const widthPct = Math.max(
                        ((hi - lo) / range) * 100,
                        1.5,
                      );

                      return (
                        <div key={iv.label} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="font-medium">{iv.label}</span>
                            <span className="text-muted tabular-nums">
                              ${lo.toFixed(0)} — ${hi.toFixed(0)}
                            </span>
                          </div>
                          <div className="relative h-5 rounded-full bg-card-hover overflow-hidden">
                            <div
                              className="absolute top-0 bottom-0 rounded-full bg-accent/40"
                              style={{
                                left: `${leftPct}%`,
                                width: `${widthPct}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-3 border-t border-border">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium">Current Price</span>
                        <span className="tabular-nums font-semibold">
                          ${data.regularMarketPrice.toFixed(2)}
                        </span>
                      </div>
                      <div className="relative h-5 rounded-full bg-card-hover overflow-hidden">
                        <div
                          className="absolute top-0 bottom-0 w-0.5 bg-foreground"
                          style={{
                            left: `${((data.regularMarketPrice - minP) / range) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
