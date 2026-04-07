"use client";

import { useEffect, useState } from "react";
import { Building2, Trees, Flame, Newspaper, BarChart3, Home } from "lucide-react";
import CommodityCharts from "@/components/CommodityCharts";
import NewsCard from "@/components/NewsCard";
import type { NewsArticle } from "@/lib/types";

type AssetRow = { symbol: string; name: string; price: number; changePercent: number };
type RedfinHousingSummary = {
  medianSalePrice: number;
  medianSalePriceYoY: number;
  homesSold: number;
  homesSoldYoY: number;
  homesForSale: number;
  homesForSaleYoY: number;
  mortgage30yRate: number;
  mortgage30yRateYoYDelta: number;
  topMetrosFastestGrowing?: { metro: string; salePriceYoY: number }[];
  migrationInbound?: { metro: string; netInflow: number }[];
  migrationOutbound?: { metro: string; netOutflow: number }[];
};

type Tab = "overview" | "commodities" | "real-estate";

const TABS: { id: Tab; label: string; icon: typeof Flame }[] = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "commodities", label: "Commodities", icon: Flame },
  { id: "real-estate", label: "Real Estate", icon: Home },
];

export default function AlternativesPage() {
  const [tab, setTab] = useState<Tab>("overview");
  const [reits, setReits] = useState<AssetRow[]>([]);
  const [housing, setHousing] = useState<AssetRow[]>([]);
  const [commodities, setCommodities] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [redfin, setRedfin] = useState<RedfinHousingSummary | null>(null);
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [a, b, c, d] = await Promise.all([
          fetch("/api/alternatives/reits"),
          fetch("/api/alternatives/housing"),
          fetch("/api/alternatives/commodities"),
          fetch("/api/housing/redfin"),
        ]);
        const reitsJson = await a.json();
        const housingJson = await b.json();
        const commoditiesJson = await c.json();
        const redfinJson = await d.json();
        setReits(reitsJson.rows ?? []);
        setHousing(housingJson.rows ?? []);
        setCommodities(commoditiesJson.rows ?? []);
        setRedfin(redfinJson ?? null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    async function fetchNews() {
      setNewsLoading(true);
      try {
        const res = await fetch("/api/alternatives/news", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setNews(data);
        }
      } catch {
        // silently fail
      } finally {
        setNewsLoading(false);
      }
    }
    fetchNews();
  }, []);

  const goldRow = commodities.find((c) => c.symbol === "GC=F");
  const oilRow = commodities.find((c) => c.symbol === "CL=F");

  return (
    <div className="space-y-8 min-w-0">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif mb-1">
            Alternatives
          </h1>
          <p className="text-sm text-muted">
            Real assets dashboard: listed real estate, housing beta, and key commodities.
          </p>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              tab === id
                ? "border-accent text-accent"
                : "border-transparent text-muted hover:text-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {loading && (
        <p className="text-xs text-muted">
          Loading REITs, housing proxies, and commodity curves…
        </p>
      )}

      {/* ── Overview tab ── */}
      {tab === "overview" && (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Gold"
              value={goldRow ? `$${goldRow.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "—"}
              change={goldRow?.changePercent}
            />
            <StatCard
              label="WTI Crude"
              value={oilRow ? `$${oilRow.price.toFixed(2)}` : "—"}
              change={oilRow?.changePercent}
            />
            <StatCard
              label="Homes Sold (Monthly)"
              value={redfin ? redfin.homesSold.toLocaleString() : "—"}
              change={redfin?.homesSoldYoY}
              changeSuffix="% YoY"
            />
            <StatCard
              label="Median Home Price"
              value={redfin ? `$${redfin.medianSalePrice.toLocaleString()}` : "—"}
              change={redfin?.medianSalePriceYoY}
              changeSuffix="% YoY"
            />
          </section>

          <section aria-label="Alternatives news" className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Newspaper className="h-5 w-5 text-accent" />
              Commodities &amp; Real Estate News
            </h2>
            {newsLoading ? (
              <div className="grid gap-3 md:grid-cols-2">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-24 rounded-xl bg-card border border-border animate-pulse"
                  />
                ))}
              </div>
            ) : news.length === 0 ? (
              <p className="text-sm text-muted">No articles available right now.</p>
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {news.map((article, i) => (
                  <NewsCard key={i} article={article} />
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ── Commodities tab ── */}
      {tab === "commodities" && (
        <>
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold flex items-center gap-2">
                <Flame className="h-4 w-4 text-accent" />
                Commodities
              </h2>
              <span className="text-xs text-muted">Key macro commodities</span>
            </div>
            <div className="space-y-2 text-sm">
              {commodities.map((r) => (
                <div
                  key={r.symbol}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{r.name}</span>
                    <span className="text-xs text-muted">{r.symbol}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm">
                      {r.price.toFixed(2)}
                    </div>
                    <div
                      className={`text-xs font-mono ${
                        r.changePercent >= 0 ? "text-green" : "text-red"
                      }`}
                    >
                      {r.changePercent >= 0 ? "+" : ""}
                      {r.changePercent.toFixed(2)}%
                    </div>
                  </div>
                </div>
              ))}
              {!commodities.length && !loading && (
                <div className="text-xs text-muted">
                  No commodity data available right now.
                </div>
              )}
            </div>
          </section>

          <CommodityCharts />
        </>
      )}

      {/* ── Real Estate tab ── */}
      {tab === "real-estate" && (
        <>
          {redfin && (
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-sm font-semibold">
                    U.S. Housing Market (Redfin)
                  </h2>
                  <p className="text-xs text-muted">
                    Median prices, inventory, and mortgage rate snapshot.
                  </p>
                </div>
                <span className="text-[11px] text-muted">
                  Source: Redfin, Jan 2026
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-4 text-sm">
                <div>
                  <div className="text-xs text-muted mb-0.5">Median sale price</div>
                  <div className="font-mono text-sm">
                    ${redfin.medianSalePrice.toLocaleString()}
                  </div>
                  <div
                    className={`text-[11px] font-mono ${
                      redfin.medianSalePriceYoY >= 0 ? "text-green" : "text-red"
                    }`}
                  >
                    {redfin.medianSalePriceYoY >= 0 ? "+" : ""}
                    {redfin.medianSalePriceYoY.toFixed(1)}% YoY
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted mb-0.5">Homes sold (monthly)</div>
                  <div className="font-mono text-sm">
                    {redfin.homesSold.toLocaleString()}
                  </div>
                  <div
                    className={`text-[11px] font-mono ${
                      redfin.homesSoldYoY >= 0 ? "text-green" : "text-red"
                    }`}
                  >
                    {redfin.homesSoldYoY >= 0 ? "+" : ""}
                    {redfin.homesSoldYoY.toFixed(1)}% YoY
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted mb-0.5">Homes for sale</div>
                  <div className="font-mono text-sm">
                    {redfin.homesForSale.toLocaleString()}
                  </div>
                  <div
                    className={`text-[11px] font-mono ${
                      redfin.homesForSaleYoY >= 0 ? "text-green" : "text-red"
                    }`}
                  >
                    {redfin.homesForSaleYoY >= 0 ? "+" : ""}
                    {redfin.homesForSaleYoY.toFixed(1)}% YoY
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted mb-0.5">
                    Avg 30-yr fixed mortgage
                  </div>
                  <div className="font-mono text-sm">
                    {redfin.mortgage30yRate.toFixed(1)}%
                  </div>
                  <div
                    className={`text-[11px] font-mono ${
                      redfin.mortgage30yRateYoYDelta <= 0 ? "text-green" : "text-red"
                    }`}
                  >
                    {redfin.mortgage30yRateYoYDelta >= 0 ? "+" : ""}
                    {redfin.mortgage30yRateYoYDelta.toFixed(2)} pts YoY
                  </div>
                </div>
              </div>
            </section>
          )}

          <section className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-accent" />
                  REITs
                </h2>
                <span className="text-xs text-muted">Listed real estate</span>
              </div>
              <div className="space-y-2 text-sm">
                {reits.map((r) => (
                  <div
                    key={r.symbol}
                    className="flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs text-muted">{r.symbol}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">
                        {r.price.toFixed(2)}
                      </div>
                      <div
                        className={`text-xs font-mono ${
                          r.changePercent >= 0 ? "text-green" : "text-red"
                        }`}
                      >
                        {r.changePercent >= 0 ? "+" : ""}
                        {r.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
                {!reits.length && !loading && (
                  <div className="text-xs text-muted">
                    No REIT data available right now.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Trees className="h-4 w-4 text-accent" />
                  Housing market proxies
                </h2>
                <span className="text-xs text-muted">Homebuilders &amp; related</span>
              </div>
              <div className="space-y-2 text-sm">
                {housing.map((r) => (
                  <div
                    key={r.symbol}
                    className="flex items-center justify-between"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{r.name}</span>
                      <span className="text-xs text-muted">{r.symbol}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm">
                        {r.price.toFixed(2)}
                      </div>
                      <div
                        className={`text-xs font-mono ${
                          r.changePercent >= 0 ? "text-green" : "text-red"
                        }`}
                      >
                        {r.changePercent >= 0 ? "+" : ""}
                        {r.changePercent.toFixed(2)}%
                      </div>
                    </div>
                  </div>
                ))}
                {!housing.length && !loading && (
                  <div className="text-xs text-muted">
                    No housing-market data available right now.
                  </div>
                )}
              </div>
            </div>
          </section>

          {redfin?.topMetrosFastestGrowing && (
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">
                  Top 10 U.S. metros by fastest growing sale price
                </h2>
                <span className="text-[11px] text-muted">Redfin Compete data</span>
              </div>
              <div className="overflow-x-auto text-sm">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="text-xs text-muted border-b border-border">
                      <th className="py-1.5 pr-3 text-left font-medium w-10">#</th>
                      <th className="py-1.5 pr-3 text-left font-medium">Metro</th>
                      <th className="py-1.5 text-right font-medium">Sale price YoY</th>
                    </tr>
                  </thead>
                  <tbody>
                    {redfin.topMetrosFastestGrowing.map((row, idx) => (
                      <tr
                        key={row.metro}
                        className="border-b border-border/60 last:border-0"
                      >
                        <td className="py-1.5 pr-3 text-xs text-muted">{idx + 1}</td>
                        <td className="py-1.5 pr-3">
                          <span className="text-sm">{row.metro}</span>
                        </td>
                        <td className="py-1.5 text-right font-mono text-sm text-green">
                          +{row.salePriceYoY.toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {redfin?.migrationInbound && redfin?.migrationOutbound && (
            <section className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold">U.S. migration heat map</h2>
                <span className="text-[11px] text-muted">
                  Based on Redfin search migration
                </span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 text-sm">
                <div>
                  <div className="text-xs text-muted mb-1">
                    Top inbound metros (net inflow)
                  </div>
                  <div className="space-y-1.5">
                    {redfin.migrationInbound.map((row) => {
                      const max = redfin.migrationInbound?.[0]?.netInflow ?? 1;
                      const width = Math.max((row.netInflow / max) * 100, 8);
                      return (
                        <div key={row.metro} className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span>{row.metro}</span>
                              <span className="font-mono text-[11px] text-green">
                                +{row.netInflow.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-card-hover overflow-hidden">
                              <div
                                className="h-full rounded-full bg-green/60"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted mb-1">
                    Top outbound metros (net outflow)
                  </div>
                  <div className="space-y-1.5">
                    {redfin.migrationOutbound.map((row) => {
                      const max = redfin.migrationOutbound?.[0]?.netOutflow ?? 1;
                      const width = Math.max((row.netOutflow / max) * 100, 8);
                      return (
                        <div key={row.metro} className="flex items-center gap-2">
                          <div className="flex-1">
                            <div className="flex justify-between text-xs mb-0.5">
                              <span>{row.metro}</span>
                              <span className="font-mono text-[11px] text-red">
                                -{row.netOutflow.toLocaleString()}
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-card-hover overflow-hidden">
                              <div
                                className="h-full rounded-full bg-red/60"
                                style={{ width: `${width}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  change,
  changeSuffix = "%",
  invertColor = false,
}: {
  label: string;
  value: string;
  change?: number;
  changeSuffix?: string;
  invertColor?: boolean;
}) {
  const isPositive = change !== undefined && change >= 0;
  const colorClass =
    change === undefined
      ? "text-muted"
      : invertColor
        ? isPositive
          ? "text-red"
          : "text-green"
        : isPositive
          ? "text-green"
          : "text-red";

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="text-xs text-muted mb-1">{label}</div>
      <div className="text-xl font-bold font-mono">{value}</div>
      {change !== undefined && (
        <div className={`text-xs font-mono mt-1 ${colorClass}`}>
          {isPositive ? "+" : ""}
          {changeSuffix === "% YoY"
            ? `${change.toFixed(1)}${changeSuffix}`
            : changeSuffix === " pts YoY"
              ? `${change.toFixed(2)}${changeSuffix}`
              : `${change.toFixed(2)}${changeSuffix}`}
        </div>
      )}
    </div>
  );
}
