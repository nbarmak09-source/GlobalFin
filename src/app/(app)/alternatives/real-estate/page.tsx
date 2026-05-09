"use client";

import { useEffect, useState } from "react";
import { Building2, Home, Trees } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

type AssetRow = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
};

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

export default function AlternativesRealEstatePage() {
  const [reits, setReits] = useState<AssetRow[]>([]);
  const [housing, setHousing] = useState<AssetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [redfin, setRedfin] = useState<RedfinHousingSummary | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(false);
      try {
        const [a, b, d] = await Promise.all([
          fetch("/api/alternatives/reits"),
          fetch("/api/alternatives/housing"),
          fetch("/api/housing/redfin"),
        ]);
        if (!a.ok) throw new Error(`REITs HTTP ${a.status}`);
        if (!b.ok) throw new Error(`Housing HTTP ${b.status}`);
        if (!d.ok) throw new Error(`Redfin HTTP ${d.status}`);
        const reitsJson = await a.json();
        const housingJson = await b.json();
        const redfinJson = await d.json();
        const { rows: reitsRows = [] } = reitsJson ?? {};
        const { rows: housingRows = [] } = housingJson ?? {};
        setReits(Array.isArray(reitsRows) ? reitsRows : []);
        setHousing(Array.isArray(housingRows) ? housingRows : []);
        setRedfin(
          redfinJson && typeof redfinJson === "object" && !Array.isArray(redfinJson)
            ? (redfinJson as RedfinHousingSummary)
            : null
        );
      } catch (err) {
        console.error("Alternatives fetch failed:", err);
        setError(true);
        setReits([]);
        setHousing([]);
        setRedfin(null);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-muted text-sm">Alternative asset data unavailable.</p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="btn-secondary"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-w-0">
      <PageHeader
        title="Real estate"
        subtitle="Listed REITs, housing betas, and Redfin resale market context."
        action={
          <div className="inline-flex items-center gap-2 rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent shrink-0">
            <Home className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Real assets</span>
          </div>
        }
      />

      {loading && (
        <p className="text-xs text-muted">Loading REITs, housing proxies, and Redfin…</p>
      )}

      {redfin && (
        <section className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-semibold">U.S. Housing Market (Redfin)</h2>
              <p className="text-xs text-muted">
                Median prices, inventory, and mortgage rate snapshot.
              </p>
            </div>
            <span className="text-[11px] text-muted">Source: Redfin, Jan 2026</span>
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
              <div className="text-xs text-muted mb-0.5">Avg 30-yr fixed mortgage</div>
              <div className="font-mono text-sm">{redfin.mortgage30yRate.toFixed(1)}%</div>
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
            {(reits ?? []).map((r) => (
              <div
                key={r.symbol}
                className="flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-muted">{r.symbol}</span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">{r.price.toFixed(2)}</div>
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
              <div className="text-xs text-muted">No REIT data available right now.</div>
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
            {(housing ?? []).map((r) => (
              <div
                key={r.symbol}
                className="flex items-center justify-between"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{r.name}</span>
                  <span className="text-xs text-muted">{r.symbol}</span>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm">{r.price.toFixed(2)}</div>
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
                {(redfin?.topMetrosFastestGrowing ?? []).map((row, idx) => (
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
            <span className="text-[11px] text-muted">Based on Redfin search migration</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2 text-sm">
            <div>
              <div className="text-xs text-muted mb-1">Top inbound metros (net inflow)</div>
              <div className="space-y-1.5">
                {(redfin?.migrationInbound ?? []).map((row) => {
                  const max = (redfin?.migrationInbound ?? [])[0]?.netInflow ?? 1;
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
              <div className="text-xs text-muted mb-1">Top outbound metros (net outflow)</div>
              <div className="space-y-1.5">
                {(redfin?.migrationOutbound ?? []).map((row) => {
                  const max = (redfin?.migrationOutbound ?? [])[0]?.netOutflow ?? 1;
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
    </div>
  );
}
