"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  ArrowDownRight,
  Cpu,
  HeartPulse,
  Landmark,
  ShoppingCart,
  ShoppingBag,
  Megaphone,
  Factory,
  Flame,
  Zap,
  Building2,
  Pickaxe,
  Layers,
} from "lucide-react";

interface ScreenerResult {
  symbol: string;
  sector: string;
  dayChangePct: number;
  pe: number;
  marketCap: number;
}

interface SectorStat {
  sector: string;
  avgChange: number;
  avgPE: number;
  count: number;
  totalCap: number;
}

const SECTOR_ICONS: Record<string, typeof Cpu> = {
  Technology: Cpu,
  Healthcare: HeartPulse,
  Financials: Landmark,
  "Consumer Cyclical": ShoppingCart,
  "Consumer Defensive": ShoppingBag,
  "Communication Services": Megaphone,
  Industrials: Factory,
  Energy: Flame,
  Utilities: Zap,
  "Real Estate": Building2,
  "Basic Materials": Pickaxe,
};

function fmtCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(1)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(0)}B`;
  return `$${n.toLocaleString()}`;
}

export default function SectorPerformance({
  data,
}: {
  data: ScreenerResult[];
}) {
  if (data.length === 0) return null;

  const byKey = new Map<string, ScreenerResult[]>();
  for (const d of data) {
    const key = d.sector || "Other";
    const arr = byKey.get(key) ?? [];
    arr.push(d);
    byKey.set(key, arr);
  }

  const sectors: SectorStat[] = [];
  for (const [sector, items] of byKey) {
    const avgChange =
      items.reduce((s, d) => s + d.dayChangePct, 0) / items.length;
    const peItems = items.filter((d) => d.pe > 0);
    const avgPE =
      peItems.length > 0
        ? peItems.reduce((s, d) => s + d.pe, 0) / peItems.length
        : 0;
    const totalCap = items.reduce((s, d) => s + d.marketCap, 0);
    sectors.push({ sector, avgChange, avgPE, count: items.length, totalCap });
  }

  sectors.sort((a, b) => b.totalCap - a.totalCap);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {sectors.map((s) => {
        const Icon = SECTOR_ICONS[s.sector] ?? Layers;
        return (
          <Link
            key={s.sector}
            href={`/screener?sector=${encodeURIComponent(s.sector)}`}
            className="group rounded-xl border border-border bg-card p-4 hover:bg-card-hover transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-accent/10 p-2">
                <Icon className="h-4 w-4 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors truncate">
                  {s.sector}
                </p>
                <p className="text-[10px] text-muted mt-0.5">
                  {s.count} companies &middot; {fmtCap(s.totalCap)}
                </p>
              </div>
              <div className="text-right shrink-0">
                <span
                  className={`flex items-center gap-0.5 text-sm font-mono font-semibold ${
                    s.avgChange >= 0 ? "text-green" : "text-red"
                  }`}
                >
                  {s.avgChange >= 0 ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {s.avgChange >= 0 ? "+" : ""}
                  {s.avgChange.toFixed(2)}%
                </span>
                {s.avgPE > 0 && (
                  <p className="text-[10px] text-muted mt-0.5">
                    P/E {s.avgPE.toFixed(1)}×
                  </p>
                )}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
