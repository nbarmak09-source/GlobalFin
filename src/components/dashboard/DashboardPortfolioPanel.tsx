"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Eye, EyeOff, Lock } from "lucide-react";
import type { EnrichedPosition, EnrichedWatchlistItem } from "@/lib/types";
import { fmtBn } from "@/lib/formatBn";

const MASK = "••••";

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

function RangeBar({
  low,
  high,
  current,
}: {
  low: number;
  high: number;
  current: number;
}) {
  const range = high - low;
  const pct = range > 0 ? Math.min(Math.max(((current - low) / range) * 100, 0), 100) : 50;
  return (
    <div className="relative h-1.5 w-16 rounded-full bg-border">
      <div
        className="absolute left-0 top-0 h-full rounded-full bg-accent/60"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function SkeletonRows() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <tbody>
          {[1, 2, 3].map((i) => (
            <tr key={i} className="border-b border-border/50">
              <td colSpan={5} className="px-0 py-2.5">
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
  "text-[10px] uppercase tracking-wider text-muted font-medium border-b border-border bg-transparent py-2 text-left";

type PortfolioFetchStatus = "idle" | "loading" | "success" | "error";

export default function DashboardPortfolioPanel() {
  const { status } = useSession();
  const router = useRouter();

  const [positions, setPositions] = useState<EnrichedPosition[]>([]);
  const [watchlist, setWatchlist] = useState<EnrichedWatchlistItem[]>([]);
  const [fetchStatus, setFetchStatus] = useState<PortfolioFetchStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<"holdings" | "watchlist">("holdings");
  const [valuesVisible, setValuesVisible] = useState(loadValuesVisible);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;

    void (async () => {
      setFetchStatus("loading");
      setError(null);
      try {
        const [portfolioData, watchlistData] = await Promise.all([
          fetch("/api/portfolio").then((r) => r.json()),
          fetch("/api/watchlist").then((r) => r.json()),
        ]);
        if (cancelled) return;
        setPositions(Array.isArray(portfolioData) ? portfolioData : portfolioData?.positions ?? []);
        setWatchlist(Array.isArray(watchlistData) ? watchlistData : watchlistData?.items ?? []);
        setFetchStatus("success");
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
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Toggle pills */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setActiveView("holdings")}
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
            onClick={() => setActiveView("watchlist")}
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
              href="/portfolio"
              className="text-[11px] text-accent hover:underline transition-colors duration-150"
            >
              View full watchlist →
            </Link>
          )}
        </div>
      </div>

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
      {loading && <SkeletonRows />}

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
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={`${thClass} pr-4`}>Ticker</th>
                    <th className={`${thClass} px-2 text-right`}>Price</th>
                    <th className={`${thClass} px-2 text-right`}>Day %</th>
                    <th className={`${thClass} px-2 text-right`}>P&amp;L %</th>
                    <th className={`${thClass} pl-2 text-right`}>Mkt Value</th>
                  </tr>
                </thead>
                <tbody>
                  {displayPositions.map((pos) => (
                    <tr
                      key={pos.id}
                      className="border-b border-border/50 last:border-0 hover:bg-card/40 cursor-pointer transition-colors duration-150"
                      onClick={() => router.push(`/analysis?symbol=${encodeURIComponent(pos.symbol)}`)}
                    >
                      <td className="py-2.5 pr-4">
                        <div className="font-semibold text-[12px] text-foreground">{pos.symbol}</div>
                        <div className="text-[10px] text-muted truncate max-w-[140px]">
                          {pos.name.length > 18 ? pos.name.slice(0, 18) + "…" : pos.name}
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono text-[12px] text-foreground">
                        ${formatPrice(pos.currentPrice)}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <ChangePill value={pos.dayChangePercent} />
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <ChangePill value={pos.totalPLPercent} />
                      </td>
                      <td className="pl-2 py-2.5 text-right font-mono text-[12px] text-muted">
                        {valuesVisible ? `$${formatPrice(pos.marketValue)}` : MASK}
                      </td>
                    </tr>
                  ))}
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
              <table className="w-full">
                <thead>
                  <tr>
                    <th className={`${thClass} pr-4`}>Ticker</th>
                    <th className={`${thClass} px-2 text-right`}>Price</th>
                    <th className={`${thClass} px-2 text-right`}>Day %</th>
                    <th className={`${thClass} px-2`}>52W Range</th>
                    <th className={`${thClass} pl-2 text-right`}>Mkt Cap</th>
                  </tr>
                </thead>
                <tbody>
                  {displayWatchlist.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-border/50 last:border-0 hover:bg-card/40 cursor-pointer transition-colors duration-150"
                      onClick={() => router.push(`/analysis?symbol=${encodeURIComponent(item.symbol)}`)}
                    >
                      <td className="py-2.5 pr-4">
                        <div className="font-semibold text-[12px] text-foreground">{item.symbol}</div>
                        <div className="text-[10px] text-muted truncate max-w-[140px]">{item.name}</div>
                      </td>
                      <td className="px-2 py-2.5 text-right font-mono text-[12px] text-foreground">
                        ${formatPrice(item.currentPrice)}
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <ChangePill value={item.dayChangePercent} />
                      </td>
                      <td className="px-2 py-2.5">
                        <RangeBar
                          low={item.fiftyTwoWeekLow}
                          high={item.fiftyTwoWeekHigh}
                          current={item.currentPrice}
                        />
                      </td>
                      <td className="pl-2 py-2.5 text-right text-[11px] text-muted">
                        {fmtBn(item.marketCap / 1e9)}
                      </td>
                    </tr>
                  ))}
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
