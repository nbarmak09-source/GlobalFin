"use client";

import { Fragment, useEffect, useMemo, useState, type ReactNode } from "react";
import { GripVertical, Pencil, Trash2 } from "lucide-react";
import PositionDetailPanel from "./PositionDetailPanel";
import type { EnrichedPosition } from "@/lib/types";
import { tableMetricLabel } from "@/lib/metrics";
import {
  metricCellThClass,
  renderPortfolioWatchlistMetricCell,
  formatUsdScaled,
  formatUsdFull,
  formatFundamentalDisplay,
  type NumberScale,
} from "@/components/PortfolioWatchlistMetricCells";
import { getMetric } from "@/lib/metrics";
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
import {
  sortHoldingsRows,
  type HoldingsTableSortMode,
} from "@/lib/tableSort";

const MASK = "••••";

const HOLDINGS_SORT_STORAGE_KEY = "portfolio-holdings-sort";

interface PortfolioTableProps {
  positions: EnrichedPosition[];
  visibleKeys: string[];
  numberScale: NumberScale;
  onDelete: (id: string) => void;
  onReorder: (positions: EnrichedPosition[]) => void;
  onUpdatePosition?: (
    position: EnrichedPosition,
    updates: Partial<Pick<EnrichedPosition, "shares" | "avgCost">>
  ) => Promise<void>;
  valuesVisible?: boolean;
  onEdit?: (position: EnrichedPosition) => void;
  loading?: boolean;
}

function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function EditableNumberCell({
  value,
  prefix = "",
  ariaLabel,
  onCommit,
}: {
  value: number;
  prefix?: string;
  ariaLabel: string;
  onCommit: (next: number) => Promise<void>;
}) {
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!saving) setDraft(String(value));
  }, [saving, value]);

  async function commit() {
    const next = Number(draft);
    if (!Number.isFinite(next) || next <= 0) {
      setDraft(String(value));
      return;
    }
    if (Math.abs(next - value) < 0.000001) {
      setDraft(String(value));
      return;
    }
    setSaving(true);
    try {
      await onCommit(next);
    } catch {
      setDraft(String(value));
    } finally {
      setSaving(false);
    }
  }

  return (
    <td className="px-4 py-2 text-right font-mono">
      <div className="flex items-center justify-end gap-1">
        {prefix ? <span className="text-muted">{prefix}</span> : null}
        <input
          type="number"
          step="any"
          min="0"
          value={draft}
          disabled={saving}
          aria-label={ariaLabel}
          onClick={(e) => e.stopPropagation()}
          onFocus={(e) => e.currentTarget.select()}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={() => void commit()}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setDraft(String(value));
              e.currentTarget.blur();
            }
          }}
          className="h-8 w-24 rounded-md border border-transparent bg-background/50 px-2 text-right text-[13px] text-foreground outline-none transition-colors hover:border-border focus:border-accent focus:bg-background disabled:opacity-60"
        />
      </div>
    </td>
  );
}

function SortableRow({
  pos,
  onDelete,
  onEdit,
  onUpdatePosition,
  valuesVisible,
  isExpanded,
  onToggleExpand,
  dragDisabled,
  visibleKeys,
  chevronAnchorKey,
  numberScale,
  totalPortfolioValue,
}: {
  pos: EnrichedPosition;
  onDelete: (id: string) => void;
  onEdit?: (position: EnrichedPosition) => void;
  onUpdatePosition?: (
    position: EnrichedPosition,
    updates: Partial<Pick<EnrichedPosition, "shares" | "avgCost">>
  ) => Promise<void>;
  valuesVisible: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  dragDisabled: boolean;
  visibleKeys: string[];
  chevronAnchorKey: string | undefined;
  numberScale: NumberScale;
  totalPortfolioValue: number;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pos.id, disabled: dragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: "relative" as const,
  };

  const stocksHref = `/stocks?symbol=${encodeURIComponent(pos.symbol)}`;

  return (
    <tr
      ref={setNodeRef}
      className={`border-b border-border transition-colors ${!isExpanded ? "cursor-pointer hover:bg-card-hover" : ""}`}
      style={{
        ...style,
        background: isExpanded ? "rgba(201,162,39,0.03)" : undefined,
      }}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("button") || target.closest("a")) return;
        onToggleExpand();
      }}
    >
      <td className="sticky left-0 z-20 w-8 border-r border-border/80 bg-card px-2 py-2">
        {dragDisabled ? (
          <span
            className="inline-flex cursor-not-allowed rounded p-1 text-muted/40 opacity-50 touch-none"
            title="Switch to Manual order to drag rows"
          >
            <GripVertical className="h-4 w-4" />
          </span>
        ) : (
          <button
            type="button"
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            title="Drag to reorder"
            className="cursor-grab touch-none rounded p-1 text-muted transition-colors hover:bg-card-hover hover:text-foreground active:cursor-grabbing"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </td>
      {visibleKeys.map((metricKey, i) => {
        if (metricKey === "shares" && onUpdatePosition) {
          return (
            <EditableNumberCell
              key={metricKey}
              value={pos.shares}
              ariaLabel={`Edit shares for ${pos.symbol}`}
              onCommit={(shares) => onUpdatePosition(pos, { shares })}
            />
          );
        }
        if (metricKey === "avgCost" && onUpdatePosition) {
          return (
            <EditableNumberCell
              key={metricKey}
              value={pos.avgCost}
              prefix="$"
              ariaLabel={`Edit average cost for ${pos.symbol}`}
              onCommit={(avgCost) => onUpdatePosition(pos, { avgCost })}
            />
          );
        }
        return (
          <Fragment key={metricKey}>
            {renderPortfolioWatchlistMetricCell(
              metricKey,
              { mode: "holdings", row: pos, valuesVisible },
              {
                stocksHref,
                attachChevron: metricKey === chevronAnchorKey,
                isExpanded,
                numberScale,
                totalPortfolioValue,
                tdClassName: i === 0
                  ? "sticky left-8 z-20 min-w-[120px] border-r border-border/80 bg-card hover:bg-card-hover"
                  : undefined,
              }
            )}
          </Fragment>
        );
      })}
      <td className="px-3 py-2">
        <div className="flex items-center gap-0.5">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(pos);
              }}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-accent/10 hover:text-accent"
              title="Edit position"
            >
              <Pencil className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(pos.id);
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-red/10 hover:text-red"
            title="Delete position"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

function weightedByMarketValue(
  rows: EnrichedPosition[],
  pick: (p: EnrichedPosition) => number | null | undefined,
  include?: (v: number) => boolean
): number | null {
  let num = 0;
  let den = 0;
  for (const p of rows) {
    const w = p.marketValue;
    if (w <= 0) continue;
    const v = pick(p);
    if (v == null || !Number.isFinite(v)) continue;
    if (include && !include(v)) continue;
    num += v * w;
    den += w;
  }
  return den > 0 ? num / den : null;
}

function loadHoldingsSortMode(): HoldingsTableSortMode {
  try {
    const v = localStorage.getItem(HOLDINGS_SORT_STORAGE_KEY);
    if (v === "sector" || v === "symbol" || v === "manual") return v;
  } catch {
    /* ignore */
  }
  return "manual";
}

export default function PortfolioTable({
  positions,
  visibleKeys,
  numberScale,
  onDelete,
  onReorder,
  onUpdatePosition,
  valuesVisible = true,
  onEdit,
  loading = false,
}: PortfolioTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<HoldingsTableSortMode>(
    loadHoldingsSortMode
  );

  const chevronAnchorKey =
    visibleKeys.find((k) => k === "ticker" || k === "name") ?? visibleKeys[0];

  const colCount = 1 + visibleKeys.length + 1;

  function setSortModePersist(next: HoldingsTableSortMode) {
    setSortMode(next);
    try {
      localStorage.setItem(HOLDINGS_SORT_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const displayPositions = useMemo(
    () => sortHoldingsRows(positions, sortMode),
    [positions, sortMode]
  );

  const dragDisabled = sortMode !== "manual";

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    if (dragDisabled) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = positions.findIndex((p) => p.id === active.id);
      const newIndex = positions.findIndex((p) => p.id === over.id);
      const reordered = arrayMove(positions, oldIndex, newIndex);
      onReorder(reordered);
    }
  }

  const headerTh =
    "relative z-0 border-b border-border bg-card px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-muted";
  /** Drag + first sticky columns: higher z-index + edge so horizontal scroll labels sit cleanly underneath */
  const headerThStickyHandle =
    "sticky left-0 z-30 border-b border-border border-r border-border/80 bg-card w-8 px-2 py-2 text-[10px] font-medium uppercase tracking-wider text-muted";
  const stickyFirstColHeader =
    "sticky left-8 z-30 border-r border-border/80 bg-card min-w-[120px]";

  if (loading && positions.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="table-fade-right">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead>
                <tr>
                  <th className={headerThStickyHandle} />
                  {visibleKeys.map((key, i) => (
                    <th key={key} className={`${metricCellThClass(key)} ${headerTh}${i === 0 ? ` ${stickyFirstColHeader}` : ""}`}>
                      {tableMetricLabel(key)}
                    </th>
                  ))}
                  <th className={`${headerTh} px-4`} />
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((i) => (
                  <tr key={i} className="border-b border-border">
                    <td colSpan={colCount} className="px-4 py-2">
                      <div className="skeleton h-8 w-full rounded-lg" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (positions.length === 0) {
    return (
      <div className="py-16 text-center text-muted">
        <p className="mb-1 text-lg">No positions yet</p>
        <p className="text-sm">
          Add your first stock position to start tracking your portfolio.
        </p>
      </div>
    );
  }

  const totalValue = displayPositions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalCost = displayPositions.reduce(
    (sum, p) => sum + p.avgCost * p.shares,
    0
  );
  const totalShares = displayPositions.reduce((sum, p) => sum + p.shares, 0);
  const totalPL = totalValue - totalCost;
  const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  const totalDayChange = displayPositions.reduce(
    (sum, p) => sum + p.dayChange * p.shares,
    0
  );
  const startOfDayValue = totalValue - totalDayChange;
  const totalDayChangePercent =
    startOfDayValue !== 0 ? (totalDayChange / startOfDayValue) * 100 : 0;

  const wMarketCap = weightedByMarketValue(
    displayPositions,
    (p) => (p.marketCap > 0 ? p.marketCap : null),
    (v) => v > 0
  );
  const wPe = weightedByMarketValue(
    displayPositions,
    (p) => (p.pe > 0 ? p.pe : null),
    (v) => v > 0
  );
  const wYtd = weightedByMarketValue(displayPositions, (p) =>
    p.ytdReturn != null && Number.isFinite(p.ytdReturn) ? p.ytdReturn : null
  );

  function totalCell(metricKey: string, isFirst = false): ReactNode {
    const firstColClass = isFirst
      ? " sticky left-8 z-20 min-w-[120px] border-r border-border/80 bg-card"
      : "";
    switch (metricKey) {
      case "ticker":
        return (
          <td className={`${metricCellThClass(metricKey)} font-medium text-[13px] text-foreground${firstColClass}`}>
            Total Position
          </td>
        );
      case "name":
      case "sector":
      case "volume":
      case "price":
      case "week52High":
      case "week52Low":
        return (
          <td className={`${metricCellThClass(metricKey)}${firstColClass}`}>
            <span className="text-muted">—</span>
          </td>
        );
      case "shares":
        return (
          <td className="px-4 py-2 text-right font-mono font-medium text-[13px] text-foreground">
            {totalShares.toLocaleString()}
          </td>
        );
      case "avgCost":
        return (
          <td className="px-4 py-2 text-right font-mono font-medium text-[13px] text-foreground">
            {totalShares > 0 ? `$${formatCurrency(totalCost / totalShares)}` : "—"}
          </td>
        );
      case "marketValue":
        return (
          <td className="px-4 py-2 text-right font-mono font-medium text-[13px] text-foreground">
            {valuesVisible ? formatUsdFull(totalValue) : MASK}
          </td>
        );
      case "totalPL":
        return (
          <td className="px-4 py-2 text-right font-medium text-[13px]">
            <div
              className={`font-mono ${
                totalPL >= 0 ? "text-green" : "text-red"
              }`}
            >
              {`${totalPL >= 0 ? "+" : ""}$${formatCurrency(Math.abs(totalPL))}`}
            </div>
            <div
              className={`font-mono text-xs ${
                totalPLPercent >= 0 ? "text-green" : "text-red"
              }`}
            >
              {`${totalPLPercent >= 0 ? "+" : ""}${totalPLPercent.toFixed(2)}%`}
            </div>
          </td>
        );
      case "change":
        return (
          <td className="px-4 py-2 text-right font-mono font-medium text-[13px] text-foreground">
            {`${totalDayChange >= 0 ? "+" : ""}${totalDayChange.toFixed(2)}`}
          </td>
        );
      case "changePercent":
        return (
          <td
            className={`px-4 py-2 text-right font-mono font-medium text-[13px] ${
              totalDayChangePercent >= 0 ? "text-green" : "text-red"
            }`}
          >
            {`${totalDayChangePercent >= 0 ? "+" : ""}${totalDayChangePercent.toFixed(2)}%`}
          </td>
        );
      case "totalPLPercent":
        return (
          <td
            className={`px-4 py-2 text-right font-mono font-medium text-[13px] ${
              totalPLPercent >= 0 ? "text-green" : "text-red"
            }`}
          >
            {`${totalPLPercent >= 0 ? "+" : ""}${totalPLPercent.toFixed(2)}%`}
          </td>
        );
      case "percentPortfolio":
        return (
          <td className="px-4 py-2 text-right font-mono font-medium text-[13px] text-foreground">
            {totalValue > 0 ? "100.00%" : "—"}
          </td>
        );
      case "marketCap":
        return (
          <td className="px-4 py-2 text-right font-mono font-medium text-[13px] text-foreground">
            {wMarketCap != null ? formatUsdScaled(wMarketCap, numberScale) : "—"}
          </td>
        );
      case "pe":
        return (
          <td className="px-4 py-2 text-right font-mono font-medium text-[13px] text-foreground">
            {wPe != null ? wPe.toFixed(2) : "—"}
          </td>
        );
      case "ytdReturn":
        return (
          <td className="px-4 py-2 text-right font-mono font-medium text-[13px]">
            {wYtd != null ? (
              <span className={wYtd >= 0 ? "text-green" : "text-red"}>
                {`${wYtd >= 0 ? "+" : ""}${wYtd.toFixed(2)}%`}
              </span>
            ) : (
              <span className="text-muted">—</span>
            )}
          </td>
        );
      default: {
        const metric = getMetric(metricKey);
        if (metric) {
          const w = weightedByMarketValue(displayPositions, (p) => {
            const val = p.fundamentals?.[metricKey];
            return val != null && Number.isFinite(val) ? val : null;
          });
          if (w == null) {
            return (
              <td className={metricCellThClass(metricKey)}>
                <span className="text-muted">—</span>
              </td>
            );
          }
          return (
            <td
              className={`${metricCellThClass(metricKey)} font-mono font-medium text-[13px] text-foreground`}
            >
              {formatFundamentalDisplay(metricKey, metric, w, numberScale)}
            </td>
          );
        }
        return (
          <td className={metricCellThClass(metricKey)}>
            <span className="text-muted">—</span>
          </td>
        );
      }
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-sm text-muted">
          Order
          <select
            value={sortMode}
            onChange={(e) =>
              setSortModePersist(e.target.value as HoldingsTableSortMode)
            }
            className="input rounded-lg border border-border bg-card px-2 py-1.5 text-[13px] text-foreground"
            style={{ minHeight: 36 }}
          >
            <option value="manual">Manual (drag)</option>
            <option value="sector">Sector A–Z</option>
            <option value="symbol">Symbol A–Z</option>
          </select>
        </label>
        {sortMode !== "manual" && (
          <p className="text-xs text-muted">
            Drag reorder is available when Order is Manual.
          </p>
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="table-fade-right">
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
              <table className="w-full border-separate border-spacing-0 text-sm">
                <thead>
                  <tr>
                    <th className={headerThStickyHandle} />
                    {visibleKeys.map((key, i) => (
                      <th
                        key={key}
                        className={`${metricCellThClass(key)} ${headerTh}${i === 0 ? ` ${stickyFirstColHeader}` : ""}`}
                      >
                        {tableMetricLabel(key)}
                      </th>
                    ))}
                    <th className={`${headerTh} px-4`} />
                  </tr>
                </thead>
                <tbody>
                  <SortableContext
                    items={displayPositions.map((p) => p.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {displayPositions.map((pos) => (
                      <Fragment key={pos.id}>
                        <SortableRow
                          pos={pos}
                          onDelete={onDelete}
                          onEdit={onEdit}
                          onUpdatePosition={onUpdatePosition}
                          valuesVisible={valuesVisible}
                          isExpanded={expandedId === pos.id}
                          onToggleExpand={() =>
                            setExpandedId((id) =>
                              id === pos.id ? null : pos.id
                            )
                          }
                          dragDisabled={dragDisabled}
                          visibleKeys={visibleKeys}
                          chevronAnchorKey={chevronAnchorKey}
                          numberScale={numberScale}
                          totalPortfolioValue={totalValue}
                        />
                        {expandedId === pos.id && (
                          <tr>
                            <td colSpan={colCount} className="p-0 align-top">
                              <PositionDetailPanel
                                symbol={pos.symbol}
                                onClose={() => setExpandedId(null)}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </SortableContext>
                  <tr className="border-t border-border bg-card/60">
                    <td className="sticky left-0 z-20 w-8 border-r border-border/80 bg-card px-2 py-2" />
                    {visibleKeys.map((key, i) => (
                      <Fragment key={`total-${key}`}>{totalCell(key, i === 0)}</Fragment>
                    ))}
                    <td className="px-4 py-2" />
                  </tr>
                </tbody>
              </table>
            </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
}
