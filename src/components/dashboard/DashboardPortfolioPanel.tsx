"use client";

import { Fragment, useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { ChevronDown, Eye, EyeOff, Lock } from "lucide-react";
import type {
  EnrichedPosition,
  EnrichedWatchlistItem,
  WatchlistGroup,
} from "@/lib/types";
import { fmtBn } from "@/lib/formatBn";
import TradingViewChart from "@/components/TradingViewChart";

const MASK = "••••";

const ACTIVE_WATCHLIST_GROUP_KEY = "active-watchlist-group-id";

const HOLDINGS_COL_COUNT_MOBILE = 6;
const HOLDINGS_COL_COUNT_MD = 7;

function subscribeMdBreakpoint(cb: () => void): () => void {
  const mq = window.matchMedia("(min-width: 768px)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}

function holdingsExpandedColSpanMdUp(): boolean {
  return window.matchMedia("(min-width: 768px)").matches;
}

/**
 * Holdings table hides “Mkt Value” below md (`hidden md:table-cell`), so the live
 * column count is 6 on small viewports vs 7 on md+. An expanded chart row must
 * use that colspan or the table grid/column anchors break — including sticky ticker cells.
 */
function useHoldingsExpandedColSpan(): number {
  return useSyncExternalStore(
    subscribeMdBreakpoint,
    () => (holdingsExpandedColSpanMdUp() ? HOLDINGS_COL_COUNT_MD : HOLDINGS_COL_COUNT_MOBILE),
    () => HOLDINGS_COL_COUNT_MOBILE
  );
}

function loadValuesVisible(): boolean {
  try {
    const stored = localStorage.getItem("portfolio-values-visible");
    if (stored !== null) return stored !== "false";
  } catch {
    /* ignore */
  }
  return true;
}

function formatPrice(n: number): string {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function RangeCell({ low, high }: { low: number; high: number }) {
  const ok = low > 0 && high > 0 && high >= low;
  return (
    <span className="text-[10px] font-mono text-muted leading-tight whitespace-nowrap tabular-nums">
      {ok ? `$${formatPrice(low)}–$${formatPrice(high)}` : "—"}
    </span>
  );
}

/** Compact dollar for small range labels (matches Yahoo session endpoints). */
function formatSessionEndpoint(n: number): string {
  return `$${formatPrice(n)}`;
}

/**
 * Shows where **regular market price** sits between Yahoo’s **regular session** day low and high.
 * Uses the same fields as `/api/portfolio`: `regularMarketPrice` vs day low/high (not extended-hours highs/lows).
 */
function DayRangeIndicator({
  low,
  high,
  price,
  dayChangePercent,
}: {
  low: number;
  high: number;
  price: number;
  dayChangePercent: number;
}) {
  const ok =
    Number.isFinite(low) &&
    Number.isFinite(high) &&
    Number.isFinite(price) &&
    low > 0 &&
    high >= low;

  if (!ok) {
    return (
      <div className="opacity-80 w-[7.25rem] shrink-0 flex justify-center mx-auto min-h-[2.25rem] items-center" aria-hidden>
        <span className="text-[10px] text-muted">—</span>
      </div>
    );
  }

  const span = high === low ? 1 : high - low;
  const rawPct = ((price - low) / span) * 100;
  const clamped = rawPct < 0 || rawPct > 100;
  const pctThrough = high === low ? 50 : Math.min(100, Math.max(0, rawPct));
  const markerClass = dayChangePercent >= 0 ? "bg-green" : "bg-red";

  const tip =
    `Regular session (Yahoo): low ${formatSessionEndpoint(low)}, high ${formatSessionEndpoint(high)}; last regular price ${formatSessionEndpoint(price)}.${clamped ? " Marker pinned to bar end because price is outside that range." : ""}`;

  return (
    <div
      className="opacity-95 w-[7.25rem] shrink-0 flex flex-col justify-center gap-0.5 mx-auto py-0.5"
      role="img"
      title={tip}
      aria-label={`Regular session range ${formatSessionEndpoint(low)} to ${formatSessionEndpoint(high)}; price about ${Math.round(pctThrough)}% from low toward high${clamped ? "; pinned to end of bar" : ""}`}
    >
      <div className="flex justify-between gap-1 text-[9px] font-mono text-muted tabular-nums leading-none px-px">
        <span className="truncate min-w-0">{formatSessionEndpoint(low)}</span>
        <span className="truncate min-w-0 text-right">{formatSessionEndpoint(high)}</span>
      </div>
      <div className="relative h-1.5 w-full rounded-full bg-gradient-to-r from-red/20 via-muted/40 to-green/20 overflow-visible">
        <div
          className={`absolute top-1/2 z-[1] -translate-x-1/2 -translate-y-1/2 w-[3px] h-3.5 rounded-[2px] shadow-sm ring-1 ring-background ${markerClass}`}
          style={{ left: `${pctThrough}%` }}
        />
      </div>
    </div>
  );
}

function ChangePill({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
        positive ? "bg-green/10 text-green" : "bg-red/10 text-red"
      }`}
    >
      {formatPercent(value)}
    </span>
  );
}

function SkeletonRows({ colSpan }: { colSpan: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody>
          {[1, 2, 3].map((i) => (
            <tr key={i} className="border-b border-border/50">
              <td colSpan={colSpan} className="px-0 py-2.5">
                <div className="skeleton h-8 w-full rounded-lg" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const thClass =
  "text-[10px] uppercase tracking-wider text-muted font-medium border-b border-border bg-transparent py-2";

type PortfolioFetchStatus = "idle" | "loading" | "success" | "error";

export default function DashboardPortfolioPanel() {
  const { status } = useSession();
  const router = useRouter();

  const [positions, setPositions] = useState<EnrichedPosition[]>([]);
  const [watchlist, setWatchlist] = useState<EnrichedWatchlistItem[]>([]);
  const [wlGroups, setWlGroups] = useState<WatchlistGroup[]>([]);
  const [activeWlGroupId, setActiveWlGroupId] = useState<string | null>(null);
  const [fetchStatus, setFetchStatus] = useState<PortfolioFetchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"holdings" | "watchlist">("holdings");
  const [valuesVisible, setValuesVisible] = useState(loadValuesVisible);
  const [expandedChartKey, setExpandedChartKey] = useState<string | null>(null);
  const holdingsExpandedChartColSpan = useHoldingsExpandedColSpan();

  function setActiveViewAndCollapseChart(next: "holdings" | "watchlist") {
    setExpandedChartKey(null);
    setActiveView(next);
  }

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    void (async () => {
      setFetchStatus("loading");
      setError(null);
      try {
        const portfolioRes = await fetch("/api/portfolio", { credentials: "include" });
        const portfolioJson = await portfolioRes.json().catch(() => null);
        if (cancelled) return;
        const portfolioData = portfolioJson?.positions ?? portfolioJson ?? [];
        setPositions(Array.isArray(portfolioData) ? portfolioData : []);

        let groupsParsed: WatchlistGroup[] = [];
        let groupsAvailable = false;
        try {
          const groupsRes = await fetch("/api/watchlist/groups", { credentials: "include" });
          if (groupsRes.ok) {
            const raw = await groupsRes.json().catch(() => []);
            groupsParsed = Array.isArray(raw) ? raw : [];
            groupsAvailable = true;
          }
        } catch {
          /* fall back to flat /api/watchlist */
        }

        if (cancelled) return;

        if (groupsAvailable) {
          setWlGroups(groupsParsed);

          let nextGid: string | null = null;
          try {
            const saved = localStorage.getItem(ACTIVE_WATCHLIST_GROUP_KEY);
            const match = saved ? groupsParsed.find((g) => g.id === saved) : null;
            nextGid = match?.id ?? groupsParsed[0]?.id ?? null;
          } catch {
            nextGid = groupsParsed[0]?.id ?? null;
          }

          setActiveWlGroupId((prev) =>
            prev && groupsParsed.some((g) => g.id === prev) ? prev : nextGid
          );

          if (nextGid) {
            try {
              localStorage.setItem(ACTIVE_WATCHLIST_GROUP_KEY, nextGid);
            } catch {
              /* ignore */
            }
          }
        } else {
          setWlGroups([]);
          setActiveWlGroupId(null);
          try {
            const wlRes = await fetch("/api/watchlist", { credentials: "include" });
            if (!cancelled && wlRes.ok) {
              const watchlistRaw = await wlRes.json().catch(() => []);
              const arr = Array.isArray(watchlistRaw)
                ? watchlistRaw
                : watchlistRaw?.items ?? [];
              setWatchlist(arr);
            } else if (!cancelled) {
              setWatchlist([]);
            }
          } catch {
            if (!cancelled) setWatchlist([]);
          }
        }

        if (!cancelled) setFetchStatus("success");
      } catch {
        if (!cancelled) {
          setError("Couldn't load data — try refreshing.");
          setFetchStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (status !== "authenticated") return;

    let cancelled = false;

    void (async () => {
      if (!activeWlGroupId) {
        if (wlGroups.length === 0) {
          return;
        }
        setWatchlist([]);
        return;
      }

      try {
        const wlRes = await fetch(
          `/api/watchlist?groupId=${encodeURIComponent(activeWlGroupId)}`,
          { credentials: "include" }
        );
        const watchlistRaw = wlRes.ok ? await wlRes.json().catch(() => []) : [];

        try {
          localStorage.setItem(ACTIVE_WATCHLIST_GROUP_KEY, activeWlGroupId);
        } catch {
          /* ignore */
        }

        if (!cancelled) {
          const arr = Array.isArray(watchlistRaw)
            ? watchlistRaw
            : watchlistRaw?.items ?? [];
          setWatchlist(arr);
        }
      } catch {
        if (!cancelled) setWatchlist([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [status, activeWlGroupId, wlGroups.length]);

  function toggleValuesVisible() {
    const next = !valuesVisible;
    setValuesVisible(next);
    try {
      localStorage.setItem("portfolio-values-visible", String(next));
    } catch {
      /* ignore */
    }
  }

  const loading =
    status === "loading" ||
    (status === "authenticated" &&
      (fetchStatus === "idle" || fetchStatus === "loading"));

  if (status === "unauthenticated") {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
        <Lock className="h-8 w-8 text-muted opacity-40" />
        <p className="text-sm text-muted">Sign in to see your portfolio</p>
        <Link
          href="/login"
          className="btn-primary rounded-lg px-4 py-2 text-sm font-medium"
        >
          Sign in
        </Link>
      </div>
    );
  }

  // Summary stats for holdings
  const totalValue = positions.reduce((s, p) => s + p.marketValue, 0);
  const totalCost = positions.reduce((s, p) => s + p.avgCost * p.shares, 0);
  const totalPL = totalValue - totalCost;
  const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  const totalDayChange = positions.reduce((s, p) => s + p.dayChange * p.shares, 0);
  const startOfDayValue = totalValue - totalDayChange;
  const totalDayChangePercent = startOfDayValue !== 0 ? (totalDayChange / startOfDayValue) * 100 : 0;

  const displayPositions = positions.slice(0, 10);
  const displayWatchlist = watchlist.slice(0, 10);

  return (
    <div className="min-w-0 overflow-hidden space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Toggle pills */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveViewAndCollapseChart("holdings")}
            className={`cursor-pointer rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-150 ${
              activeView === "holdings"
                ? "border border-accent/20 bg-accent/10 text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            Holdings
          </button>
          <button
            type="button"
            onClick={() => setActiveViewAndCollapseChart("watchlist")}
            className={`cursor-pointer rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-150 ${
              activeView === "watchlist"
                ? "border border-accent/20 bg-accent/10 text-accent"
                : "text-muted hover:text-foreground"
            }`}
          >
            Watchlist
          </button>
        </div>

        {/* Right cluster */}
        <div className="flex items-center gap-2">
          {activeView === "holdings" && (
            <button
              type="button"
              onClick={toggleValuesVisible}
              className="cursor-pointer rounded-md p-1 text-muted transition-colors hover:text-foreground"
              title={valuesVisible ? "Hide values" : "Show values"}
            >
              {valuesVisible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
            </button>
          )}
          {activeView === "holdings" ? (
            <Link
              href="/portfolio"
              className="text-[11px] text-accent hover:underline transition-colors duration-150"
            >
              View full portfolio →
            </Link>
          ) : (
            <Link
              href="/portfolio?tab=watchlist"
              className="text-[11px] text-accent hover:underline transition-colors duration-150"
            >
              View full watchlist →
            </Link>
          )}
        </div>
      </div>

      {fetchStatus === "success" &&
        activeView === "watchlist" &&
        wlGroups.length > 1 && (
          <div className="flex flex-wrap items-center gap-1">
            {wlGroups.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setExpandedChartKey(null);
                  setActiveWlGroupId(g.id);
                }}
                className={`cursor-pointer rounded-full px-3 py-1 text-[12px] font-medium transition-colors duration-150 ${
                  activeWlGroupId === g.id
                    ? "border border-accent/20 bg-accent/10 text-accent"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {g.name}
              </button>
            ))}
          </div>
        )}

      {/* Summary bar — holdings only */}
      {activeView === "holdings" && !loading && positions.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-muted">Total Value</span>
            <span className="text-[13px] font-semibold font-mono text-foreground">
              {valuesVisible ? `$${formatPrice(totalValue)}` : MASK}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-muted">Total P&amp;L</span>
            <span
              className={`text-[13px] font-semibold font-mono ${totalPL >= 0 ? "text-green" : "text-red"}`}
            >
              {valuesVisible
                ? `${totalPL >= 0 ? "+" : ""}$${formatPrice(Math.abs(totalPL))} (${formatPercent(totalPLPercent)})`
                : MASK}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] uppercase tracking-wider text-muted">Day Change</span>
            <span
              className={`text-[13px] font-semibold font-mono ${totalDayChangePercent >= 0 ? "text-green" : "text-red"}`}
            >
              {valuesVisible ? formatPercent(totalDayChangePercent) : MASK}
            </span>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && <SkeletonRows colSpan={7} />}

      {/* Error */}
      {!loading && error && (
        <p className="text-sm text-muted py-4">{error}</p>
      )}

      {/* Holdings table */}
      {!loading && !error && activeView === "holdings" && (
        <>
          {positions.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center opacity-20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10 text-muted">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.85a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25v-4.85M12 3v12m0 0-3.75-3.75M12 15l3.75-3.75" />
                </svg>
              </div>
              <p className="text-sm text-muted mb-1">No positions yet</p>
              <Link href="/portfolio" className="text-[12px] text-accent hover:underline">
                Add your first position →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className={`${thClass} sticky left-0 z-10 bg-background min-w-[100px] text-left pr-4`}>Ticker</th>
                    <th
                      className={`${thClass} w-[7.25rem] text-center px-0`}
                      title="Regular session low / high (Yahoo). Marker = regular market price within that range."
                    >
                      <span className="sr-only">Day range</span>
                    </th>
                    <th className={`${thClass} w-20 text-right tabular-nums px-2`}>Price</th>
                    <th className={`${thClass} w-20 text-right px-2`}>Day %</th>
                    <th className={`${thClass} w-20 text-right px-2`}>P&amp;L %</th>
                    <th className={`${thClass} hidden md:table-cell w-24 text-right tabular-nums pl-2`}>
                      Mkt Value
                    </th>
                    <th className={`${thClass} w-9 px-0 text-center`} aria-label="Chart" />
                  </tr>
                </thead>
                <tbody>
                  {displayPositions.map((pos) => {
                    const chartKey = `h:${pos.id}`;
                    const chartOpen = expandedChartKey === chartKey;
                    return (
                      <Fragment key={pos.id}>
                        <tr
                          className="border-b border-border/50 last:border-0 group hover:bg-card/40 cursor-pointer transition-colors duration-150"
                          onClick={() => router.push(`/analysis?symbol=${encodeURIComponent(pos.symbol)}`)}
                        >
                          <td className="sticky left-0 z-10 bg-background group-hover:bg-card/40 min-w-[100px] py-2.5 pr-4 align-top transition-colors duration-150">
                            <div className="font-semibold text-[12px] text-foreground">{pos.symbol}</div>
                            <div className="text-[10px] text-muted truncate max-w-[160px]">
                              {pos.name.length > 18 ? pos.name.slice(0, 18) + "…" : pos.name}
                            </div>
                          </td>
                          <td className="w-[7.25rem] text-center align-middle py-2.5 px-0">
                            <DayRangeIndicator
                              low={pos.regularMarketDayLow}
                              high={pos.regularMarketDayHigh}
                              price={pos.currentPrice}
                              dayChangePercent={pos.dayChangePercent}
                            />
                          </td>
                          <td className="w-20 px-2 py-2.5 text-right font-mono text-[12px] text-foreground align-top tabular-nums">
                            ${formatPrice(pos.currentPrice)}
                          </td>
                          <td className="w-20 px-2 py-2.5 text-right align-top">
                            <ChangePill value={pos.dayChangePercent} />
                          </td>
                          <td className="w-20 px-2 py-2.5 text-right align-top">
                            <ChangePill value={pos.totalPLPercent} />
                          </td>
                          <td className="hidden md:table-cell w-24 pl-2 py-2.5 text-right font-mono text-[12px] text-muted align-top tabular-nums">
                            {valuesVisible ? `$${formatPrice(pos.marketValue)}` : MASK}
                          </td>
                          <td className="w-9 py-2.5 text-center align-top">
                            <button
                              type="button"
                              className="cursor-pointer rounded-md p-1 text-muted transition-colors hover:bg-card-hover hover:text-accent"
                              aria-expanded={chartOpen}
                              aria-label={chartOpen ? "Hide TradingView chart" : "Show TradingView chart"}
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedChartKey((k) => (k === chartKey ? null : chartKey));
                              }}
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${chartOpen ? "rotate-180" : ""}`}
                              />
                            </button>
                          </td>
                        </tr>
                        {chartOpen && (
                          <tr className="border-b border-border/50 bg-card/20">
                            <td colSpan={holdingsExpandedChartColSpan} className="p-0 px-1 py-3">
                              <div onClick={(e) => e.stopPropagation()} className="min-w-0">
                                <TradingViewChart
                                  symbol={pos.symbol}
                                  height={260}
                                  yahooExchange={pos.exchange}
                                  yahooExchangeName={pos.exchangeName}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              {positions.length > 10 && (
                <div className="mt-2 text-right">
                  <Link href="/portfolio" className="text-[11px] text-accent hover:underline">
                    Show all {positions.length} positions →
                  </Link>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Watchlist table */}
      {!loading && !error && activeView === "watchlist" && (
        <>
          {watchlist.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center opacity-20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-10 w-10 text-muted">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 0 1 0 3.75H5.625a1.875 1.875 0 0 1 0-3.75Z" />
                </svg>
              </div>
              <p className="text-sm text-muted mb-1">Your watchlist is empty</p>
              <Link href="/analysis" className="text-[12px] text-accent hover:underline">
                Browse stocks →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-separate border-spacing-0">
                <thead>
                  <tr>
                    <th className={`${thClass} sticky left-0 z-10 bg-background min-w-[100px] pr-4 text-left`}>Ticker</th>
                    <th className={`${thClass} px-2 text-right`}>Day range</th>
                    <th className={`${thClass} px-2 text-right`}>52W</th>
                    <th className={`${thClass} px-2 text-right`}>Price</th>
                    <th className={`${thClass} px-2 text-right`}>Day %</th>
                    <th className={`${thClass} pl-2 text-right`}>Mkt Cap</th>
                    <th className={`${thClass} w-9 px-0 text-center`} aria-label="Chart" />
                  </tr>
                </thead>
                <tbody>
                  {displayWatchlist.map((item) => {
                    const chartKey = `w:${item.id}`;
                    const chartOpen = expandedChartKey === chartKey;
                    return (
                      <Fragment key={item.id}>
                        <tr
                          className="border-b border-border/50 last:border-0 group hover:bg-card/40 cursor-pointer transition-colors duration-150"
                          onClick={() => router.push(`/analysis?symbol=${encodeURIComponent(item.symbol)}`)}
                        >
                          <td className="sticky left-0 z-10 bg-background group-hover:bg-card/40 min-w-[100px] py-2.5 pr-4 transition-colors duration-150">
                            <div className="font-semibold text-[12px] text-foreground">{item.symbol}</div>
                            <div className="text-[10px] text-muted truncate max-w-[160px]">{item.name}</div>
                          </td>
                          <td className="px-2 py-2.5 text-right align-top">
                            <RangeCell low={item.regularMarketDayLow} high={item.regularMarketDayHigh} />
                          </td>
                          <td className="px-2 py-2.5 text-right align-top">
                            <RangeCell low={item.fiftyTwoWeekLow} high={item.fiftyTwoWeekHigh} />
                          </td>
                          <td className="px-2 py-2.5 text-right font-mono text-[12px] text-foreground align-top">
                            ${formatPrice(item.currentPrice)}
                          </td>
                          <td className="px-2 py-2.5 text-right align-top">
                            <ChangePill value={item.dayChangePercent} />
                          </td>
                          <td className="pl-2 py-2.5 text-right text-[11px] text-muted align-top">
                            {fmtBn(item.marketCap / 1e9)}
                          </td>
                          <td className="w-9 py-2.5 text-center align-top">
                            <button
                              type="button"
                              className="cursor-pointer rounded-md p-1 text-muted transition-colors hover:bg-card-hover hover:text-accent"
                              aria-expanded={chartOpen}
                              aria-label={chartOpen ? "Hide TradingView chart" : "Show TradingView chart"}
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedChartKey((k) => (k === chartKey ? null : chartKey));
                              }}
                            >
                              <ChevronDown
                                className={`h-4 w-4 transition-transform duration-200 ${chartOpen ? "rotate-180" : ""}`}
                              />
                            </button>
                          </td>
                        </tr>
                        {chartOpen && (
                          <tr className="border-b border-border/50 bg-card/20">
                            <td colSpan={7} className="p-0 px-1 py-3">
                              <div onClick={(e) => e.stopPropagation()} className="min-w-0">
                                <TradingViewChart
                                  symbol={item.symbol}
                                  height={260}
                                  yahooExchange={item.exchange}
                                  yahooExchangeName={item.exchangeName}
                                />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
              {watchlist.length > 10 && (
                <div className="mt-2 text-right">
                  <Link href="/portfolio" className="text-[11px] text-accent hover:underline">
                    Show all {watchlist.length} →
                  </Link>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
