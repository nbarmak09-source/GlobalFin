"use client"

import { useEffect, useState, useRef, use } from "react"
import { useRouter } from "next/navigation"
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import ChartExportButton from "@/components/ChartExportButton"
import { InvestorAvatar } from "@/components/research/InvestorAvatar"
import type { InvestorDetailResponse, Holding } from "@/app/api/super-investors/[slug]/route"

// ─── Constants ────────────────────────────────────────────────────────────────

const PIE_COLORS = [
  "#C9A227",
  "#3b82f6",
  "#10b981",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#6366f1",
  "#84cc16",
]

// ─── Formatting helpers ────────────────────────────────────────────────────────

function fmtValue(v: number): string {
  if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`
  if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`
  if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `$${(v / 1e3).toFixed(1)}K`
  return `$${v.toFixed(0)}`
}

function fmtShares(v: number): string {
  if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`
  if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`
  return v.toLocaleString()
}

function fmtQuarter(dateStr: string): string {
  if (!dateStr) return "—"
  const [year, month] = dateStr.split("-").map(Number)
  if (!year || !month) return dateStr
  const q = Math.ceil(month / 3)
  return `Q${q} ${year}`
}

function fmtDate(dateStr: string): string {
  if (!dateStr) return "—"
  const d = new Date(dateStr + "T00:00:00")
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-card/60 ${className}`} />
}

function DetailSkeleton() {
  return (
    <div className="px-4 md:px-6 py-6 max-w-4xl mx-auto space-y-6">
      {/* Hero */}
      <div className="flex flex-col items-center gap-2">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
      {/* Tabs */}
      <div className="flex justify-center gap-2">
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
      </div>
      {/* Stats */}
      <div className="flex gap-6">
        <div className="flex-1 space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-52 w-52 rounded-full" />
        </div>
      </div>
      {/* Table rows */}
      <div className="space-y-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  )
}

// ─── Pie label ────────────────────────────────────────────────────────────────

interface PieLabelProps {
  cx?: number
  cy?: number
  midAngle?: number
  outerRadius?: number
  name?: string
  percent?: number
}

function PieLabel({ cx = 0, cy = 0, midAngle = 0, outerRadius = 0, name = "", percent = 0 }: PieLabelProps) {
  if (percent < 0.03) return null
  const RADIAN = Math.PI / 180
  const r = outerRadius + 20
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  const shortName = name.length > 14 ? name.slice(0, 14) + "…" : name
  return (
    <text
      x={x}
      y={y}
      fill="var(--color-muted)"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      style={{ fontSize: "10px", fontFamily: "var(--font-body)" }}
    >
      {shortName} {(percent * 100).toFixed(1)}%
    </text>
  )
}

// ─── Main component ────────────────────────────────────────────────────────────

type PageParams = { slug: string }

export default function SuperInvestorDetailPage({
  params,
}: {
  params: Promise<PageParams>
}) {
  const { slug } = use(params)
  const router = useRouter()
  const [data, setData] = useState<InvestorDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<"holdings" | "companies">("holdings")
  const chartRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/super-investors/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json() as Promise<InvestorDetailResponse>
      })
      .then((d) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) return <DetailSkeleton />

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3">
        <p className="text-[14px] text-foreground font-medium">Failed to load holdings</p>
        <p className="text-[12px] text-muted">{error ?? "No data available"}</p>
      </div>
    )
  }

  const { investor, filingDate, totalValue, positionCount, topHoldings, allHoldings, industryBreakdown } = data

  const top10Pct = topHoldings.reduce((s, h) => s + h.percentPortfolio, 0)

  const pieData = topHoldings.map((h) => ({
    name: h.name.split(" ").slice(0, 3).join(" "),
    value: h.value,
    pct: h.percentPortfolio,
  }))

  return (
    <div className="px-4 md:px-6 py-6 max-w-4xl mx-auto">
      {/* Hero */}
      <div className="flex flex-col items-center gap-2 mb-6">
        <InvestorAvatar
          name={investor.name}
          imageUrl={investor.imageUrl}
          alt={investor.name}
          sizeClass="h-20 w-20"
          initialsClassName="text-sm font-semibold uppercase tracking-tight text-muted"
        />
        <h1 className="text-xl font-semibold text-foreground">{investor.name}</h1>
        <p className="text-[13px] text-muted">{investor.fund}</p>
      </div>

      {/* Tabs */}
      <div className="flex justify-center gap-2 mb-5">
        {(["holdings", "companies"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-5 py-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
              activeTab === tab
                ? "bg-accent/15 text-accent border border-accent/30"
                : "text-muted border border-border hover:text-foreground hover:border-border/80"
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === "companies" ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2">
          <p className="text-[14px] font-medium text-foreground">Companies tab</p>
          <p className="text-[12px] text-muted">Coming soon — detailed company analysis per position.</p>
        </div>
      ) : (
        <>
          {/* Filing date */}
          <p className="text-[12px] text-muted text-center mb-5">
            Holdings as of {fmtQuarter(filingDate)} ({fmtDate(filingDate)})
          </p>

          {/* Stats + donut row */}
          <div className="flex flex-col md:flex-row gap-6 mb-8">
            {/* Left: stats */}
            <div className="flex-1 min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-muted font-medium mb-2">
                Basic Stats
              </p>
              <div className="space-y-0">
                <StatRow label="Market Value" value={fmtValue(totalValue)} />
                <StatRow label="No. of Positions" value={String(positionCount)} />
                <StatRow label="Top 10 (%)" value={`${top10Pct.toFixed(1)}%`} />
              </div>

              <p className="text-[11px] uppercase tracking-wider text-muted font-medium mt-5 mb-2">
                Industry Breakdown
              </p>
              {industryBreakdown.length === 0 ? (
                <p className="text-[12px] text-muted italic">
                  Not available from FMP for this filer.
                </p>
              ) : (
                <div className="space-y-0">
                  {industryBreakdown.slice(0, 8).map((row) => (
                    <StatRow
                      key={row.industry}
                      label={row.industry}
                      value={`${row.pct.toFixed(1)}%`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right: donut chart */}
            <div className="flex-1 min-w-0 flex flex-col gap-2">
              <p className="text-[11px] uppercase tracking-wider text-muted font-medium">
                Market Value
              </p>
              <div className="relative" ref={chartRef}>
                <ChartExportButton
                  chartRef={chartRef}
                  filename={`${slug}-portfolio-donut`}
                  title="Portfolio Allocation"
                />
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      dataKey="value"
                      label={(props: PieLabelProps) => (
                        <PieLabel {...props} />
                      )}
                      labelLine={false}
                    >
                      {pieData.map((_, idx) => (
                        <Cell
                          key={idx}
                          fill={PIE_COLORS[idx % PIE_COLORS.length]}
                          stroke="transparent"
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => [fmtValue(typeof value === "number" ? value : 0), "Value"]}
                      contentStyle={{
                        background: "var(--color-surface-alt)",
                        border: "1px solid var(--color-border)",
                        borderRadius: "8px",
                        fontSize: "12px",
                        color: "var(--color-text)",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Holdings table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted">
                    Ticker / CUSIP
                  </th>
                  <th className="py-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted hidden md:table-cell">
                    Company
                  </th>
                  <th className="py-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted text-right">
                    Mkt Value
                  </th>
                  <th className="py-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted text-right">
                    % Portfolio
                  </th>
                  <th className="py-2 px-3 text-[10px] font-medium uppercase tracking-wider text-muted text-right">
                    Shares
                  </th>
                </tr>
              </thead>
              <tbody>
                {allHoldings.map((h, idx) => (
                  <HoldingRow
                    key={`${h.cusip}-${idx}`}
                    holding={h}
                    onNavigate={(name) => router.push(`/analysis?symbol=${encodeURIComponent(name)}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center border-b border-border/50 py-1.5 text-[12px]">
      <span className="text-muted truncate mr-4">{label}</span>
      <span className="text-foreground font-mono tabular-nums shrink-0">{value}</span>
    </div>
  )
}

function HoldingRow({
  holding,
  onNavigate,
}: {
  holding: Holding
  onNavigate: (name: string) => void
}) {
  const shortName = holding.name.slice(0, 24)

  return (
    <tr
      className="border-b border-border/50 last:border-0 hover:bg-card/40 cursor-pointer transition-colors"
      onClick={() => onNavigate(holding.name)}
    >
      {/* Ticker / CUSIP */}
      <td className="py-3 px-3">
        <span className="font-semibold text-[12px] text-foreground">{shortName}</span>
      </td>

      {/* Company (hidden on mobile) */}
      <td className="py-3 px-3 hidden md:table-cell max-w-[180px]">
        <span className="block truncate text-[12px] text-muted">{holding.name}</span>
      </td>

      {/* Mkt Value */}
      <td className="py-3 px-3 text-right">
        <span className="text-[12px] font-mono text-foreground tabular-nums">
          {fmtValue(holding.value)}
        </span>
      </td>

      {/* % Portfolio */}
      <td className="py-3 px-3 text-right">
        <span className="inline-block rounded px-1.5 py-0.5 text-[11px] bg-accent/10 text-accent tabular-nums">
          {holding.percentPortfolio.toFixed(2)}%
        </span>
      </td>

      {/* Shares */}
      <td className="py-3 px-3 text-right">
        <span className="text-[12px] font-mono text-muted tabular-nums">
          {fmtShares(holding.shares)}
        </span>
      </td>
    </tr>
  )
}
