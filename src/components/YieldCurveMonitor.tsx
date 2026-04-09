"use client";

import { useEffect, useState, useRef } from "react";
import { LineChart, TrendingUp, TrendingDown } from "lucide-react";

interface YieldCurveTenor {
  label: string;
  years: number;
  yield: number;
  change?: number;
  changePercent?: number;
}

interface YieldCurveResponse {
  tenors: YieldCurveTenor[];
  asOf: string;
  source?: string;
  sourceUrl?: string;
}

interface HistoryPoint {
  date: string;
  close: number;
}

interface HistoryResponse {
  symbol: string;
  name: string;
  points: HistoryPoint[];
}

function getQuarterLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} '${String(d.getFullYear()).slice(2)}`;
}

function sampleQuarterlyPoints(points: HistoryPoint[]): HistoryPoint[] {
  if (points.length === 0) return [];
  const buckets = new Map<string, HistoryPoint>();
  for (const p of points) {
    const label = getQuarterLabel(p.date);
    buckets.set(label, p);
  }
  const entries = Array.from(buckets.values());
  return entries.slice(-8);
}

function TenYearHistoryChart({ points }: { points: HistoryPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    point: HistoryPoint;
    label: string;
  } | null>(null);

  const quarterly = sampleQuarterlyPoints(points);
  if (quarterly.length < 2) return null;

  const W = 480;
  const H = 260;
  const PAD = { top: 24, right: 24, bottom: 44, left: 48 };
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;

  const closes = quarterly.map((p) => p.close);
  const yMin = Math.floor(Math.min(...closes) * 4) / 4 - 0.25;
  const yMax = Math.ceil(Math.max(...closes) * 4) / 4 + 0.25;

  const xScale = (i: number) =>
    PAD.left + (i / (quarterly.length - 1)) * plotW;
  const yScale = (v: number) =>
    PAD.top + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const chartPoints = quarterly.map((p, i) => ({
    x: xScale(i),
    y: yScale(p.close),
  }));
  const line = chartPoints
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const areaPath = `${line} L${chartPoints[chartPoints.length - 1].x},${PAD.top + plotH} L${chartPoints[0].x},${PAD.top + plotH} Z`;

  const yTicks: number[] = [];
  for (let v = yMin; v <= yMax + 0.01; v += 0.5) {
    yTicks.push(Math.round(v * 100) / 100);
  }

  const first = quarterly[0].close;
  const last = quarterly[quarterly.length - 1].close;
  const diff = last - first;
  const isUp = diff >= 0;

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mouseX = ((e.clientX - rect.left) / rect.width) * W;
    let closest = 0;
    let closestDist = Infinity;
    chartPoints.forEach((p, i) => {
      const dist = Math.abs(p.x - mouseX);
      if (dist < closestDist) {
        closestDist = dist;
        closest = i;
      }
    });
    if (closestDist < 40) {
      setTooltip({
        x: chartPoints[closest].x,
        y: chartPoints[closest].y,
        point: quarterly[closest],
        label: getQuarterLabel(quarterly[closest].date),
      });
    } else {
      setTooltip(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted font-medium">
          Last 8 quarters
        </span>
        <span
          className={`inline-flex items-center gap-1 text-xs font-mono font-medium ${
            isUp ? "text-red" : "text-green"
          }`}
        >
          {isUp ? (
            <TrendingUp className="h-3 w-3" />
          ) : (
            <TrendingDown className="h-3 w-3" />
          )}
          {isUp ? "+" : ""}
          {diff.toFixed(2)}% ({((diff / first) * 100).toFixed(1)}%)
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
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={0.5}
            />
            <text
              x={PAD.left - 8}
              y={yScale(v) + 3}
              textAnchor="end"
              className="fill-muted"
              fontSize={10}
              fontFamily="var(--font-mono-pro), monospace"
            >
              {v.toFixed(1)}%
            </text>
          </g>
        ))}

        {quarterly.map((p, i) => (
          <text
            key={p.date}
            x={xScale(i)}
            y={PAD.top + plotH + 16}
            textAnchor="middle"
            className="fill-muted"
            fontSize={9}
          >
            {getQuarterLabel(p.date)}
          </text>
        ))}

        <defs>
          <linearGradient id="hist-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.2} />
            <stop
              offset="100%"
              stopColor="var(--accent)"
              stopOpacity={0.02}
            />
          </linearGradient>
        </defs>
        <path d={areaPath} fill="url(#hist-gradient)" />
        <path
          d={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {chartPoints.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={3.5}
            fill="var(--card)"
            stroke="var(--accent)"
            strokeWidth={1.5}
          />
        ))}

        {tooltip && (
          <>
            <line
              x1={tooltip.x}
              x2={tooltip.x}
              y1={PAD.top}
              y2={PAD.top + plotH}
              stroke="var(--accent)"
              strokeWidth={0.5}
              strokeDasharray="3,3"
            />
            <circle
              cx={tooltip.x}
              cy={tooltip.y}
              r={5}
              fill="var(--accent)"
            />
            <rect
              x={Math.min(tooltip.x + 8, W - 120)}
              y={tooltip.y - 30}
              width={110}
              height={26}
              rx={4}
              fill="var(--card)"
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={Math.min(tooltip.x + 14, W - 114)}
              y={tooltip.y - 13}
              className="fill-foreground"
              fontSize={11}
              fontFamily="var(--font-mono-pro), monospace"
            >
              {tooltip.label}: {tooltip.point.close.toFixed(2)}%
            </text>
          </>
        )}
      </svg>
    </div>
  );
}

export default function YieldCurveMonitor() {
  const [data, setData] = useState<YieldCurveResponse | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [treasuryAttribution, setTreasuryAttribution] = useState<{
    href: string;
  } | null>(null);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      setTreasuryAttribution(null);
      try {
        const [treasuryRes, histRes] = await Promise.all([
          fetch("/api/fixed-income/treasury-curve"),
          fetch("/api/yield-curve/history", { credentials: "include" }),
        ]);

        let curveJson: YieldCurveResponse | null = null;

        if (treasuryRes.ok) {
          const treasuryJson: YieldCurveResponse & { error?: string } =
            await treasuryRes.json();
          if (
            !treasuryJson.error &&
            treasuryJson.tenors &&
            treasuryJson.tenors.length > 0
          ) {
            curveJson = {
              tenors: treasuryJson.tenors,
              asOf: treasuryJson.asOf,
            };
            if (
              treasuryJson.source === "US Treasury" &&
              treasuryJson.sourceUrl
            ) {
              setTreasuryAttribution({ href: treasuryJson.sourceUrl });
            }
          }
        }

        if (!curveJson) {
          const curveRes = await fetch("/api/yield-curve?country=US", {
            credentials: "include",
          });
          if (!curveRes.ok) throw new Error("Failed to load");
          curveJson = await curveRes.json();
        }

        setData(curveJson);
        if (histRes.ok) {
          const histJson: HistoryResponse = await histRes.json();
          setHistory(histJson);
        }
      } catch {
        setError("Data temporarily unavailable");
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg bg-card overflow-hidden w-full" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
        <div className="px-5 py-4 space-y-4">
          <div className="h-4 bg-border rounded w-1/3 animate-pulse" />
          <div className="h-24 bg-border rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data || data.tenors.length === 0) {
    return (
      <div className="rounded-lg bg-card p-6 text-center text-sm text-muted w-full" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
        {error || "No yield curve data available"}
      </div>
    );
  }

  const { tenors, asOf } = data;

  return (
    <div className="rounded-lg bg-card overflow-hidden w-full" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
      {/* Panel header */}
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-2" style={{ borderLeft: "2px solid var(--accent)", paddingLeft: "10px" }}>
          <LineChart className="h-3.5 w-3.5 text-accent" />
          <span className="text-[13px] font-[500] uppercase tracking-[0.05em] text-muted">
            US Treasury Yield Curve
          </span>
        </div>
        <span className="text-[11px] font-[400] text-muted" style={{ opacity: 0.7 }}>
          {new Date(asOf).toLocaleTimeString()}
        </span>
      </div>
      {/* 65% chart / 35% table layout */}
      <div className="flex flex-col md:flex-row" style={{ minHeight: "200px" }}>
        <div className="p-4 md:p-5" style={{ flex: "0 0 65%" }}>
          <h4 className="text-[11px] font-[400] text-muted uppercase tracking-wide mb-3" style={{ opacity: 0.7 }}>
            10Y Treasury yield — Quarterly
          </h4>
          {history && history.points.length > 0 ? (
            <TenYearHistoryChart points={history.points} />
          ) : (
            <div className="h-40 flex items-center justify-center text-[11px] text-muted">
              Historical data unavailable
            </div>
          )}
        </div>
        <div
          className="p-4 md:p-5"
          style={{ flex: "0 0 35%", borderTop: "1px solid rgba(255,255,255,0.08)", borderLeft: "1px solid rgba(255,255,255,0.08)" }}
        >
          <h4 className="text-[11px] font-[400] text-muted uppercase tracking-wide mb-3" style={{ opacity: 0.7 }}>
            Current curve
          </h4>
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                <th className="text-left py-2 text-[13px] font-[400] text-muted">Tenor</th>
                <th className="text-right py-2 text-[13px] font-[400] text-muted font-mono">
                  Yield
                </th>
              </tr>
            </thead>
            <tbody>
              {tenors.map((t, i) => (
                <tr
                  key={t.label}
                  style={{
                    backgroundColor: i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.04)",
                  }}
                >
                  <td className="py-1.5 text-[13px] font-[400]">{t.label}</td>
                  <td className="py-1.5 text-right font-mono text-[13px] font-[400]">
                    {t.yield.toFixed(2)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {treasuryAttribution && (
            <p className="mt-3 text-[11px] text-muted" style={{ opacity: 0.85 }}>
              <span style={{ opacity: 0.75 }}>Source: </span>
              <a
                href={treasuryAttribution.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent hover:underline"
              >
                US Treasury
              </a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
