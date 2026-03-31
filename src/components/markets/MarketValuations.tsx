"use client";

interface ScreenerResult {
  symbol: string;
  marketCap: number;
  pe: number;
  forwardPE: number;
  dividendYield: number;
  revenueGrowth: number;
  priceToBook: number;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

function fmtCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  return `$${n.toLocaleString()}`;
}

export default function MarketValuations({
  data,
}: {
  data: ScreenerResult[];
}) {
  if (data.length === 0) return null;

  const totalCap = data.reduce((s, d) => s + d.marketCap, 0);

  const peValues = data.filter((d) => d.pe > 0).map((d) => d.pe);
  const pbValues = data.filter((d) => d.priceToBook > 0).map((d) => d.priceToBook);

  const medianPE = peValues.length > 0 ? median(peValues) : 0;
  const medianPB = pbValues.length > 0 ? median(pbValues) : 0;

  const divYields = data.filter((d) => d.dividendYield > 0).map((d) => d.dividendYield);
  const avgDivYield =
    divYields.length > 0
      ? divYields.reduce((s, v) => s + v, 0) / divYields.length
      : 0;

  const growths = data.filter((d) => d.revenueGrowth !== 0).map((d) => d.revenueGrowth);
  const avgGrowth =
    growths.length > 0
      ? growths.reduce((s, v) => s + v, 0) / growths.length
      : 0;

  const stats = [
    { label: "Total market cap", value: fmtCap(totalCap), sub: `${data.length} companies` },
    { label: "Median P/E", value: medianPE > 0 ? `${medianPE.toFixed(1)}×` : "—" },
    { label: "Median P/B", value: medianPB > 0 ? `${medianPB.toFixed(2)}×` : "—" },
    { label: "Avg dividend yield", value: avgDivYield > 0 ? `${avgDivYield.toFixed(2)}%` : "—" },
    { label: "Avg revenue growth", value: `${avgGrowth >= 0 ? "+" : ""}${avgGrowth.toFixed(1)}%` },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl border border-border bg-card p-4"
        >
          <p className="text-[10px] text-muted uppercase tracking-wider mb-1">
            {s.label}
          </p>
          <p className="text-lg font-bold font-mono tabular-nums">{s.value}</p>
          {s.sub && <p className="text-[10px] text-muted mt-0.5">{s.sub}</p>}
        </div>
      ))}
    </div>
  );
}
