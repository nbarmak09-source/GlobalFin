"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  type PieLabelRenderProps,
} from "recharts";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { Download, GripVertical, X } from "lucide-react";
import ChartExportButton from "@/components/ChartExportButton";
import type { EnrichedPosition, QuoteSummaryData } from "@/lib/types";

const STORAGE_KEY = "gcm-stat-keys";

const DEFAULT_STAT_KEYS = [
  "marketCap",
  "revenueGrowth",
  "operatingMargin",
  "returnOnAssets",
  "totalEnterpriseValue",
  "dividendYield",
  "netProfitMargin",
  "forwardPE",
  "beta",
] as const;

const DONUT_COLORS = [
  "#C9A227",
  "#3b82f6",
  "#10b981",
  "#f97316",
  "#8b5cf6",
  "#ec4899",
  "#14b8a6",
] as const;

interface StatDef {
  key: string;
  label: string;
  /** Pull numeric value from summary for weighting; null skips position */
  getValue: (s: QuoteSummaryData | null) => number | null;
  format: "percentAsFraction" | "percentAlreadyPct" | "currency" | "ratio";
}

const STAT_REGISTRY: Record<string, StatDef> = {
  marketCap: {
    key: "marketCap",
    label: "Market Cap",
    getValue: (s) => (s && s.marketCap > 0 ? s.marketCap : null),
    format: "currency",
  },
  revenueGrowth: {
    key: "revenueGrowth",
    label: "Revenue Growth",
    getValue: (s) =>
      s != null && Number.isFinite(s.revenueGrowth) ? s.revenueGrowth : null,
    format: "percentAsFraction",
  },
  operatingMargin: {
    key: "operatingMargin",
    label: "Operating Margin",
    getValue: (s) =>
      s != null && Number.isFinite(s.operatingMargins)
        ? s.operatingMargins
        : null,
    format: "percentAsFraction",
  },
  returnOnAssets: {
    key: "returnOnAssets",
    label: "Return on Assets",
    getValue: (s) =>
      s != null && Number.isFinite(s.returnOnAssets) ? s.returnOnAssets : null,
    format: "percentAsFraction",
  },
  totalEnterpriseValue: {
    key: "totalEnterpriseValue",
    label: "Enterprise Value",
    getValue: (s) =>
      s != null && s.enterpriseValue > 0 ? s.enterpriseValue : null,
    format: "currency",
  },
  dividendYield: {
    key: "dividendYield",
    label: "Dividend Yield",
    getValue: (s) =>
      s != null && Number.isFinite(s.dividendYield) && s.dividendYield > 0
        ? s.dividendYield
        : null,
    format: "percentAsFraction",
  },
  netProfitMargin: {
    key: "netProfitMargin",
    label: "Net Profit Margin",
    getValue: (s) =>
      s != null && Number.isFinite(s.profitMargins) ? s.profitMargins : null,
    format: "percentAsFraction",
  },
  forwardPE: {
    key: "forwardPE",
    label: "Forward P/E",
    getValue: (s) =>
      s != null && Number.isFinite(s.forwardPE) && s.forwardPE > 0
        ? s.forwardPE
        : null,
    format: "ratio",
  },
  beta: {
    key: "beta",
    label: "Beta",
    getValue: (s) =>
      s != null && Number.isFinite(s.beta) && s.beta !== 0 ? s.beta : null,
    format: "ratio",
  },
};

/** Searchable stat metric rows (keys user can add). */
export const PORTFOLIO_STATS_SEARCHABLE = Object.values(STAT_REGISTRY).sort(
  (a, b) => a.label.localeCompare(b.label)
);

function loadStatKeys(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw?.trim()) return [...DEFAULT_STAT_KEYS];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [...DEFAULT_STAT_KEYS];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const entry of parsed) {
      if (typeof entry !== "string") continue;
      if (!STAT_REGISTRY[entry] || seen.has(entry)) continue;
      seen.add(entry);
      out.push(entry);
    }
    return out.length > 0 ? out : [...DEFAULT_STAT_KEYS];
  } catch {
    return [...DEFAULT_STAT_KEYS];
  }
}

function persistStatKeys(keys: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
  } catch {
    /* ignore */
  }
}

function fmtCurrency(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: n >= 1e9 ? 2 : 0,
    minimumFractionDigits: 0,
  });
}

function fmtStatValue(def: StatDef, weighted: number): string {
  switch (def.format) {
    case "percentAsFraction":
      return `${(weighted * 100).toFixed(2)}%`;
    case "percentAlreadyPct":
      return `${weighted.toFixed(2)}%`;
    case "currency":
      return fmtCurrency(weighted);
    case "ratio":
      return weighted.toFixed(2);
    default:
      return String(weighted);
  }
}

function DonutLabel(props: PieLabelRenderProps) {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent, name } = props;
  if (
    cx == null ||
    cy == null ||
    midAngle == null ||
    innerRadius == null ||
    outerRadius == null ||
    percent == null ||
    percent <= 0.04
  ) {
    return null;
  }
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.52;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const label =
    name != null && name !== ""
      ? `${String(name)} ${(percent * 100).toFixed(1)}%`
      : `${(percent * 100).toFixed(1)}%`;
  return (
    <text
      x={x}
      y={y}
      textAnchor="middle"
      dominantBaseline="central"
      fill="currentColor"
      className="text-foreground"
      style={{ fontSize: 11 }}
    >
      {label}
    </text>
  );
}

function SortableStatRow({
  statKey,
  label,
  valueDisplay,
  onRemove,
}: {
  statKey: string;
  label: string;
  valueDisplay: string;
  onRemove: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: statKey });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 border-b border-border/50 py-1.5"
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing rounded p-1 text-muted hover:text-foreground touch-none shrink-0"
        aria-label="Reorder stat"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="min-w-0 flex-1 text-[12px] text-muted truncate">
        {label}
      </span>
      <span className="text-[13px] font-medium text-foreground tabular-nums shrink-0">
        {valueDisplay}
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full p-1 text-muted hover:text-foreground hover:bg-card transition-colors shrink-0"
        aria-label={`Remove ${label}`}
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

interface PortfolioStatsProps {
  positions: EnrichedPosition[];
}

export default function PortfolioStats({ positions }: PortfolioStatsProps) {
  const [statKeys, setStatKeys] = useState<string[]>(() => [...DEFAULT_STAT_KEYS]);
  const [query, setQuery] = useState("");
  const [summaries, setSummaries] = useState<
    Record<string, QuoteSummaryData | null>
  >({});
  const [loading, setLoading] = useState(false);

  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setStatKeys(loadStatKeys());
  }, []);

  const fetchSummaries = useCallback(async () => {
    if (positions.length === 0) {
      setSummaries({});
      return;
    }
    setLoading(true);
    try {
      const entries = await Promise.all(
        positions.map(async (p) => {
          try {
            const res = await fetch(
              `/api/stocks?action=summary&symbol=${encodeURIComponent(p.symbol)}`,
              { credentials: "include" }
            );
            if (!res.ok) return [p.symbol, null] as const;
            const data = (await res.json()) as QuoteSummaryData;
            return [p.symbol, data] as const;
          } catch {
            return [p.symbol, null] as const;
          }
        })
      );
      setSummaries(Object.fromEntries(entries));
    } finally {
      setLoading(false);
    }
  }, [positions]);

  useEffect(() => {
    void fetchSummaries();
  }, [fetchSummaries]);

  const totalMv = useMemo(
    () => positions.reduce((s, p) => s + (p.marketValue > 0 ? p.marketValue : 0), 0),
    [positions]
  );

  const pieData = useMemo(() => {
    if (totalMv <= 0) return [];
    return positions
      .filter((p) => p.marketValue > 0)
      .map((p) => ({
        name: p.symbol,
        value: p.marketValue,
      }));
  }, [positions, totalMv]);

  const filteredSearch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PORTFOLIO_STATS_SEARCHABLE;
    return PORTFOLIO_STATS_SEARCHABLE.filter(
      (s) =>
        s.label.toLowerCase().includes(q) || s.key.toLowerCase().includes(q)
    );
  }, [query]);

  function addStatKey(key: string) {
    if (!STAT_REGISTRY[key]) return;
    setStatKeys((prev) => {
      if (prev.includes(key)) return prev;
      const next = [...prev, key];
      persistStatKeys(next);
      return next;
    });
    setQuery("");
  }

  function removeStatKey(key: string) {
    setStatKeys((prev) => {
      const next = prev.filter((k) => k !== key);
      persistStatKeys(next);
      return next;
    });
  }

  function weightedValue(statKey: string): number | null {
    const def = STAT_REGISTRY[statKey];
    if (!def || totalMv <= 0) return null;
    let sum = 0;
    let covered = 0;
    for (const p of positions) {
      const w = p.marketValue;
      if (w <= 0) continue;
      const s = summaries[p.symbol] ?? null;
      const v = def.getValue(s);
      if (v == null || !Number.isFinite(v)) continue;
      sum += v * w;
      covered += w;
    }
    if (covered <= 0) return null;
    return sum / covered;
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStatKeys((prev) => {
      const oldIndex = prev.indexOf(String(active.id));
      const newIndex = prev.indexOf(String(over.id));
      if (oldIndex < 0 || newIndex < 0) return prev;
      const next = arrayMove(prev, oldIndex, newIndex);
      persistStatKeys(next);
      return next;
    });
  }

  const ghostBtn =
    "inline-flex items-center gap-2 rounded-lg border border-border bg-transparent px-3 py-1.5 text-[12px] text-muted transition-colors hover:bg-card hover:text-foreground";

  if (positions.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 min-w-0">
      <div className="grid gap-4 lg:grid-cols-2 lg:items-start">
        <div className="relative flex flex-col gap-3 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="relative flex-1 min-w-0">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Select & search metrics..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[12px] text-foreground placeholder:text-muted outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                aria-label="Search statistics to add"
              />
              {query.trim() && filteredSearch.length > 0 && (
                <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg">
                  {filteredSearch.map((s) => (
                    <li key={s.key}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-[12px] text-foreground hover:bg-card-hover transition-colors"
                        onClick={() => addStatKey(s.key)}
                      >
                        {s.label}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* TODO: portfolio stats CSV/PDF export */}
            <button
              type="button"
              className={ghostBtn}
              title="Export coming soon"
              onClick={() => {
                /* TODO: portfolio stats export */
              }}
            >
              <Download className="h-4 w-4" />
              Download
            </button>
          </div>

          {loading && (
            <p className="text-[12px] text-muted">Loading fundamentals…</p>
          )}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <SortableContext
              items={statKeys}
              strategy={verticalListSortingStrategy}
            >
              <div className="min-w-0">
                {statKeys.map((key) => {
                  const def = STAT_REGISTRY[key];
                  if (!def) return null;
                  const w = weightedValue(key);
                  const display =
                    w != null && Number.isFinite(w)
                      ? fmtStatValue(def, w)
                      : "—";
                  return (
                    <SortableStatRow
                      key={key}
                      statKey={key}
                      label={def.label}
                      valueDisplay={display}
                      onRemove={() => removeStatKey(key)}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        </div>

        <div className="flex flex-col gap-3 min-w-0">
          <h3 className="text-[11px] uppercase tracking-wider text-muted">
            Portfolio Holdings
          </h3>
          <div
            ref={chartRef}
            className="relative flex min-h-[220px] w-full min-w-0 items-center justify-center rounded-xl border border-border bg-card/40 px-2 py-4 [&_.recharts-layer]:outline-none"
          >
            <ChartExportButton
              chartRef={chartRef}
              filename="portfolio-holdings-allocation"
              title="Portfolio Holdings"
            />
            {pieData.length === 0 ? (
              <p className="text-[12px] text-muted">No allocation data</p>
            ) : (
              <ResponsiveContainer width="100%" height={220} minWidth={0}>
                <RechartsPieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={2}
                    label={DonutLabel}
                    labelLine={false}
                    isAnimationActive={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell
                        key={`slice-${index}`}
                        fill={DONUT_COLORS[index % DONUT_COLORS.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                </RechartsPieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
