"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Info } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OwnershipType = "landlord" | "tenant" | "partial";

export interface ComputeReserveEntry {
  id: string;
  label: string;
  gpuClusterSizeK: number;
  gpuNote: string;
  powerCapacityMw: number;
  ownershipType: OwnershipType;
  notes: string;
}

interface ComputeReservesData {
  schema: string;
  description: string;
  companies: ComputeReserveEntry[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const OWNERSHIP_META: Record<
  OwnershipType,
  { label: string; bg: string; text: string; border: string }
> = {
  landlord: {
    label: "Landlord",
    bg: "#10b98120",
    text: "#10b981",
    border: "#10b98155",
  },
  tenant: {
    label: "Tenant",
    bg: "#c9a22720",
    text: "#c9a227",
    border: "#c9a22755",
  },
  partial: {
    label: "Partial",
    bg: "#3b82f620",
    text: "#3b82f6",
    border: "#3b82f655",
  },
};

const BAR_COLORS: Record<OwnershipType, string> = {
  landlord: "#10b981",
  tenant: "#c9a227",
  partial: "#3b82f6",
};

const MW_TOOLTIP_TEXT =
  "Power capacity is a proxy for long-run training throughput and latency floor";

// ── Sub-components ────────────────────────────────────────────────────────────

function OwnershipBadge({ type }: { type: OwnershipType }) {
  const m = OWNERSHIP_META[type];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold tracking-wide"
      style={{ background: m.bg, color: m.text, border: `1px solid ${m.border}` }}
    >
      {m.label}
    </span>
  );
}

function InfoTooltip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        aria-label="More info"
        className="text-muted hover:text-foreground transition-colors"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <span
          className="absolute z-20 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 rounded-lg border border-border bg-card shadow-lg px-2.5 py-2 text-[11px] text-muted leading-relaxed pointer-events-none"
          role="tooltip"
        >
          {text}
        </span>
      )}
    </span>
  );
}

interface StatCardProps {
  label: React.ReactNode;
  value: React.ReactNode;
  sub?: React.ReactNode;
}

function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2.5 flex flex-col gap-1 min-w-0">
      <p className="text-[10px] font-medium text-muted uppercase tracking-wide flex items-center gap-1">
        {label}
      </p>
      <p className="text-lg font-semibold font-mono text-foreground leading-none">
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted leading-tight">{sub}</p>}
    </div>
  );
}

// ── Custom Recharts tooltip ────────────────────────────────────────────────────

function CustomBarTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: ComputeReserveEntry }[];
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="rounded-lg border border-border bg-card shadow-lg px-3 py-2 space-y-1 text-xs">
      <p className="font-semibold text-foreground">{d.label}</p>
      <p className="text-muted">{d.gpuNote}</p>
      <OwnershipBadge type={d.ownershipType} />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export interface ComputeReservePanelProps {
  /**
   * When set, shows the three stat-cards for that company.
   * When null/undefined, shows only the full ranking chart.
   */
  companyId?: string | null;
  /**
   * Called when the user clicks a bar in the ranking chart.
   * Receives the company ID of the clicked entry.
   */
  onNavigate?: (companyId: string) => void;
  /** When true, renders the ranking chart below the stat-cards. Defaults to true. */
  showRanking?: boolean;
}

export default function ComputeReservePanel({
  companyId,
  onNavigate,
  showRanking = true,
}: ComputeReservePanelProps) {
  const [data, setData] = useState<ComputeReserveEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/compute-reserves.json")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<ComputeReservesData>;
      })
      .then((json) => setData(json.companies))
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load")
      );
  }, []);

  if (error) {
    return (
      <p className="text-xs text-red-500 py-2">
        Compute reserve data unavailable: {error}
      </p>
    );
  }

  if (!data) {
    return (
      <div className="space-y-2 animate-pulse">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-14 rounded-lg bg-border/30"
          />
        ))}
      </div>
    );
  }

  const company = companyId ? data.find((c) => c.id === companyId) : null;

  // Ranking — sorted descending by GPU count
  const ranked = [...data].sort((a, b) => b.gpuClusterSizeK - a.gpuClusterSizeK);

  return (
    <div className="flex flex-col gap-4 min-w-0">
      {/* ── Stat cards for the selected company ── */}
      {company && (
        <div className="flex flex-col gap-3">
          <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
            Compute Reserve
          </p>
          <div className="grid grid-cols-1 gap-2">
            {/* GPU cluster size */}
            <StatCard
              label="GPU Cluster (H100-equiv)"
              value={
                <>
                  {company.gpuClusterSizeK.toLocaleString()}
                  <span className="text-sm font-normal text-muted ml-1">k units</span>
                </>
              }
              sub={company.gpuNote}
            />

            {/* Power capacity */}
            <StatCard
              label={
                <>
                  Data Center Power
                  <InfoTooltip text={MW_TOOLTIP_TEXT} />
                </>
              }
              value={
                <>
                  {company.powerCapacityMw.toLocaleString()}
                  <span className="text-sm font-normal text-muted ml-1">MW</span>
                </>
              }
            />

            {/* Ownership type */}
            <div className="rounded-lg border border-border bg-card px-3 py-2.5 flex flex-col gap-1.5">
              <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
                Ownership Type
              </p>
              <OwnershipBadge type={company.ownershipType} />
              {company.notes && (
                <p className="text-[11px] text-muted leading-tight">
                  {company.notes}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Ranking bar chart ── */}
      {showRanking && (
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-medium text-muted uppercase tracking-wide">
            GPU Ranking — All Companies
          </p>
          <p className="text-[10px] text-muted">
            Click a bar to view that company&apos;s detail
          </p>
          <div style={{ width: "100%", height: ranked.length * 36 + 20 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={ranked}
                layout="vertical"
                margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
                onClick={(state: unknown) => {
                  const s = state as {
                    activePayload?: { payload: ComputeReserveEntry }[];
                  };
                  if (s?.activePayload?.[0] && onNavigate) {
                    onNavigate(s.activePayload[0].payload.id);
                  }
                }}
              >
                <XAxis
                  type="number"
                  dataKey="gpuClusterSizeK"
                  tick={{ fill: "#8b949e", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${v}k`}
                />
                <YAxis
                  type="category"
                  dataKey="label"
                  width={110}
                  tick={{ fill: "#8b949e", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  content={<CustomBarTooltip />}
                  cursor={{ fill: "#ffffff08" }}
                />
                <Bar
                  dataKey="gpuClusterSizeK"
                  radius={[0, 3, 3, 0]}
                  cursor={onNavigate ? "pointer" : "default"}
                >
                  {ranked.map((entry) => (
                    <Cell
                      key={entry.id}
                      fill={BAR_COLORS[entry.ownershipType]}
                      fillOpacity={
                        companyId
                          ? entry.id === companyId
                            ? 1
                            : 0.35
                          : 0.85
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}
