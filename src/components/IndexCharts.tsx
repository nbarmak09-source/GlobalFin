"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

const INDICES = [
  { symbol: "^GSPC", label: "S&P 500 (US)" },
  { symbol: "000001.SS", label: "SSE Composite (China)" },
  { symbol: "^N225", label: "Nikkei 225 (Japan)" },
  { symbol: "^FTSE", label: "FTSE 100 (UK)" },
  { symbol: "^GSPTSE", label: "S&P/TSX (Canada)" },
];

const PERIODS = ["1D", "5D", "1M", "6M", "YTD", "1Y", "5Y"] as const;
type Period = (typeof PERIODS)[number];

const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  JPY: "¥",
  GBP: "£",
  CNY: "CN¥",
  CAD: "C$",
};

interface HistPoint {
  time: string | number;
  close: number;
  closeUSD?: number;
}

interface ChartData {
  symbol: string;
  label: string;
  points: HistPoint[];
  currency: string;
  fxRate: number;
}

function MiniChart({ data }: { data: ChartData }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    point: HistPoint;
  } | null>(null);

  const { points, label, currency, fxRate } = data;
  const curSym = CURRENCY_SYMBOLS[currency] || currency + " ";
  const isUSD = currency === "USD";

  if (points.length < 2) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-muted">
        No data available
      </div>
    );
  }

  const W = 400;
  const H = 180;
  const PAD = { top: 12, right: 12, bottom: 28, left: 54 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const closes = points.map((p) => p.close);
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const yPad = range * 0.08;
  const yMin = min - yPad;
  const yMax = max + yPad;

  const xScale = (i: number) => PAD.left + (i / (points.length - 1)) * plotW;
  const yScale = (v: number) =>
    PAD.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const chartPts = points.map((p, i) => ({ x: xScale(i), y: yScale(p.close) }));
  const line = chartPts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const areaPath = `${line} L${chartPts[chartPts.length - 1].x},${PAD.top + plotH} L${chartPts[0].x},${PAD.top + plotH} Z`;

  const first = points[0].close;
  const last = points[points.length - 1].close;
  const diff = last - first;
  const pctChange = (diff / first) * 100;
  const isUp = diff >= 0;
  const lineColor = isUp ? "var(--green)" : "var(--red)";

  const yTicks: number[] = [];
  const rawStep = range / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const step =
    rawStep < 1.5 * magnitude
      ? magnitude
      : rawStep < 3.5 * magnitude
        ? 2.5 * magnitude
        : 5 * magnitude;
  for (
    let v = Math.ceil(yMin / step) * step;
    v <= yMax;
    v += step
  ) {
    yTicks.push(Math.round(v * 100) / 100);
  }
  if (yTicks.length > 6) {
    const keep = yTicks.filter((_, i) => i % 2 === 0);
    yTicks.length = 0;
    yTicks.push(...keep);
  }

  const labelInterval = Math.max(1, Math.floor(points.length / 5));
  const xLabels = points
    .map((p, i) => ({ i, p }))
    .filter((_, idx) => idx % labelInterval === 0 || idx === points.length - 1);

  function formatTime(t: string | number): string {
    if (typeof t === "number") {
      const d = new Date(t * 1000);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const d = new Date(t);
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  }

  function formatTooltipTime(t: string | number): string {
    if (typeof t === "number") {
      const d = new Date(t * 1000);
      return d.toLocaleString([], {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return new Date(t).toLocaleDateString([], {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatYLabel(v: number): string {
    if (v >= 10000) return `${(v / 1000).toFixed(1)}k`;
    if (v >= 1000) return `${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`;
    return v.toFixed(v < 10 ? 2 : 0);
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * W;
    let closest = 0;
    let closestDist = Infinity;
    chartPts.forEach((p, i) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    if (closestDist < 30) {
      setTooltip({
        x: chartPts[closest].x,
        y: chartPts[closest].y,
        point: points[closest],
      });
    } else {
      setTooltip(null);
    }
  }

  const tooltipH = isUSD ? 28 : 42;

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-semibold">{label}</span>
        <span
          className={`inline-flex items-center gap-1 text-xs font-mono font-medium ${
            isUp ? "text-green" : "text-red"
          }`}
        >
          {isUp ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {isUp ? "+" : ""}
          {pctChange.toFixed(2)}%
        </span>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
      >
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={yScale(v)}
              y2={yScale(v)}
              stroke="var(--border)"
              strokeWidth={0.5}
            />
            <text
              x={PAD.left - 6}
              y={yScale(v) + 3}
              textAnchor="end"
              className="fill-muted"
              fontSize={9}
              fontFamily="var(--font-mono-pro), monospace"
            >
              {formatYLabel(v)}
            </text>
          </g>
        ))}

        {xLabels.map(({ i, p }) => (
          <text
            key={i}
            x={xScale(i)}
            y={PAD.top + plotH + 14}
            textAnchor="middle"
            className="fill-muted"
            fontSize={8}
          >
            {formatTime(p.time)}
          </text>
        ))}

        <defs>
          <linearGradient
            id={`idx-grad-${data.symbol}`}
            x1="0"
            y1="0"
            x2="0"
            y2="1"
          >
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.18} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <path d={areaPath} fill={`url(#idx-grad-${data.symbol})`} />
        <path
          d={line}
          fill="none"
          stroke={lineColor}
          strokeWidth={1.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {tooltip && (
          <>
            <line
              x1={tooltip.x}
              x2={tooltip.x}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--muted)"
              strokeWidth={0.5}
              strokeDasharray="3,3"
            />
            <circle cx={tooltip.x} cy={tooltip.y} r={4} fill={lineColor} />
            <rect
              x={Math.min(tooltip.x + 8, W - 160)}
              y={Math.max(tooltip.y - tooltipH - 4, PAD.top)}
              width={150}
              height={tooltipH}
              rx={4}
              fill="var(--card)"
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={Math.min(tooltip.x + 14, W - 154)}
              y={Math.max(tooltip.y - tooltipH + 10, PAD.top + 14)}
              className="fill-foreground"
              fontSize={10}
              fontFamily="var(--font-mono-pro), monospace"
            >
              {formatTooltipTime(tooltip.point.time)}: {curSym}{tooltip.point.close.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </text>
            {!isUSD && (
              <text
                x={Math.min(tooltip.x + 14, W - 154)}
                y={Math.max(tooltip.y - tooltipH + 24, PAD.top + 28)}
                className="fill-muted"
                fontSize={9}
                fontFamily="var(--font-mono-pro), monospace"
              >
                ${(tooltip.point.closeUSD ?? tooltip.point.close * fxRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
              </text>
            )}
          </>
        )}
      </svg>
    </div>
  );
}

export default function IndexCharts() {
  const [period, setPeriod] = useState<Period>("1M");
  const [charts, setCharts] = useState<Map<string, ChartData>>(new Map());
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async (p: Period) => {
    setLoading(true);
    const results = new Map<string, ChartData>();
    await Promise.all(
      INDICES.map(async (idx) => {
        try {
          const res = await fetch(
            `/api/stocks?action=history&symbol=${encodeURIComponent(idx.symbol)}&period=${p}`,
            { credentials: "include" }
          );
          if (res.ok) {
            const json = await res.json();
            results.set(idx.symbol, {
              symbol: idx.symbol,
              label: idx.label,
              points: json.points,
              currency: json.currency,
              fxRate: json.fxRate,
            });
          }
        } catch {
          // skip failed fetches
        }
      })
    );
    setCharts(results);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchAll(period);
  }, [period, fetchAll]);

  return (
    <section className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card-hover/30">
        <h2 className="text-sm font-semibold">Index price history</h2>
        <div className="flex gap-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                period === p
                  ? "bg-accent/20 text-accent"
                  : "text-muted hover:text-foreground hover:bg-card-hover"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>
      <div className="p-5">
        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {INDICES.map((idx) => (
              <div key={idx.symbol} className="space-y-2">
                <div className="h-4 bg-border rounded w-1/3 animate-pulse" />
                <div className="h-40 bg-border rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {INDICES.map((idx) => {
              const data = charts.get(idx.symbol);
              if (!data) return null;
              return (
                <div
                  key={idx.symbol}
                  className="rounded-lg border border-border/50 p-4 bg-card-hover/20"
                >
                  <MiniChart data={data} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
