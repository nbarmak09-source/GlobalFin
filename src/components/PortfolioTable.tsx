"use client";

import { useState, Fragment, useMemo, useEffect } from "react";
import { Trash2, TrendingUp, TrendingDown, GripVertical, Pencil } from "lucide-react";
import PositionDetailPanel from "./PositionDetailPanel";
import type { EnrichedPosition } from "@/lib/types";
import MetricColumnPicker from "@/components/MetricColumnPicker";
import { useColumnPreferences } from "@/hooks/useColumnPreferences";
import { tableMetricLabel } from "@/lib/metrics";
import {
  metricCellThClass,
  renderPortfolioWatchlistMetricCell,
} from "@/components/PortfolioWatchlistMetricCells";
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
  onDelete: (id: string) => void;
  onReorder: (positions: EnrichedPosition[]) => void;
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

function formatLargeCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${formatCurrency(value)}`;
}

function SortableRow({
  pos,
  onDelete,
  onEdit,
  valuesVisible,
  isExpanded,
  onToggleExpand,
  dragDisabled,
  visibleKeys,
  chevronAnchorKey,
}: {
  pos: EnrichedPosition;
  onDelete: (id: string) => void;
  onEdit?: (position: EnrichedPosition) => void;
  valuesVisible: boolean;
  isExpanded: boolean;
  onToggleExpand: () => void;
  dragDisabled: boolean;
  visibleKeys: string[];
  chevronAnchorKey: string | undefined;
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
      className={`transition-colors ${!isExpanded ? "cursor-pointer" : ""}`}
      style={{
        ...style,
        borderBottom: "1px solid var(--color-border)",
        background: isExpanded ? "rgba(201,162,39,0.03)" : undefined,
      }}
      onMouseEnter={(e) => {
        if (!isExpanded) (e.currentTarget as HTMLElement).style.background = "rgba(201,162,39,0.04)";
      }}
      onMouseLeave={(e) => {
        if (!isExpanded) (e.currentTarget as HTMLElement).style.background = isExpanded ? "rgba(201,162,39,0.03)" : "";
      }}
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("button") || target.closest("a")) return;
        onToggleExpand();
      }}
    >
      <td className="px-2 py-3 w-8">
        {dragDisabled ? (
          <span
            className="inline-flex rounded p-1 cursor-not-allowed text-muted/40 opacity-50 touch-none"
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
            className="cursor-grab active:cursor-grabbing rounded p-1 text-muted hover:text-foreground hover:bg-card-hover transition-colors touch-none"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
      </td>
      {visibleKeys.map((metricKey) =>
        renderPortfolioWatchlistMetricCell(metricKey, { mode: "holdings", row: pos, valuesVisible }, {
          stocksHref,
          attachChevron: metricKey === chevronAnchorKey,
          isExpanded,
        })
      )}
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          {onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(pos);
              }}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-muted hover:text-accent hover:bg-accent/10 transition-colors"
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
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-lg text-muted hover:text-red hover:bg-red/10 transition-colors"
            title="Delete position"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function PortfolioTable({
  positions,
  onDelete,
  onReorder,
  valuesVisible = true,
  onEdit,
  loading = false,
}: PortfolioTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<HoldingsTableSortMode>("manual");
  const [visibleKeys, toggleKey, resetToDefault] = useColumnPreferences();

  const chevronAnchorKey =
    visibleKeys.find((k) => k === "ticker" || k === "name") ?? visibleKeys[0];

  const colCount = 1 + visibleKeys.length + 1;
  useEffect(() => {
    try {
      const v = localStorage.getItem(HOLDINGS_SORT_STORAGE_KEY);
      if (v === "sector" || v === "symbol" || v === "manual") {
        setSortMode(v);
      }
    } catch {
      /* ignore */
    }
  }, []);

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

  if (loading && positions.length === 0) {
    return (
      <div className="card overflow-hidden" style={{ padding: 0 }}>
        <div className="divider-gold" />
        <div className="table-fade-right">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(255,255,255,0.02)", borderBottom: "1px solid var(--color-border)" }}>
                  <th className="px-2 py-3 w-8"></th>
                  {visibleKeys.map((key) => (
                    <th key={key} className={`${metricCellThClass(key)} text-label`}>
                      {tableMetricLabel(key)}
                    </th>
                  ))}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3].map((i) => (
                  <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <td colSpan={colCount} className="px-4 py-3">
                      <div className="skeleton h-10 w-full" />
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
      <div className="text-center py-16 text-muted">
        <p className="text-lg mb-1">No positions yet</p>
        <p className="text-sm">
          Add your first stock position to start tracking your portfolio.
        </p>
      </div>
    );
  }

  const totalValue = displayPositions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalCost = displayPositions.reduce((sum, p) => sum + p.avgCost * p.shares, 0);
  const totalPL = totalValue - totalCost;
  const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  const totalDayChange = displayPositions.reduce((sum, p) => sum + p.dayChange * p.shares, 0);
  const startOfDayValue = totalValue - totalDayChange;
  const totalDayChangePercent =
    startOfDayValue !== 0 ? (totalDayChange / startOfDayValue) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="card-solid hover-lift p-4">
          <div className="text-label mb-1">Total Value</div>
          <div className="stat-value text-lg text-mono">
            {valuesVisible ? formatLargeCurrency(totalValue) : MASK}
          </div>
        </div>
        <div className="card-solid hover-lift p-4">
          <div className="text-label mb-1">Cost Basis</div>
          <div className="stat-value text-lg text-mono">
            {valuesVisible ? formatLargeCurrency(totalCost) : MASK}
          </div>
        </div>
        <div className="card-solid hover-lift p-4">
          <div className="text-label mb-1">Total P&L</div>
          <div
            className={`stat-value text-lg text-mono ${
              valuesVisible && totalPL >= 0 ? "stat-positive" : valuesVisible ? "stat-negative" : ""
            }`}
          >
            {valuesVisible ? `${totalPL >= 0 ? "+" : ""}$${formatCurrency(totalPL)}` : MASK}
          </div>
        </div>
        <div className="card-solid hover-lift p-4">
          <div className="text-label mb-1">Return %</div>
          <div
            className={`stat-value text-lg text-mono flex items-center gap-1 ${
              totalPLPercent >= 0 ? "stat-positive" : "stat-negative"
            }`}
          >
            {totalPLPercent >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {totalPLPercent >= 0 ? "+" : ""}
            {totalPLPercent.toFixed(2)}%
          </div>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="text-xs text-muted mb-1">1D %</div>
          <div
            className={`stat-value text-lg text-mono flex items-center gap-1 ${
              totalDayChangePercent >= 0 ? "stat-positive" : "stat-negative"
            }`}
          >
            {totalDayChangePercent >= 0 ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            {totalDayChangePercent >= 0 ? "+" : ""}
            {totalDayChangePercent.toFixed(2)}%
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm flex items-center gap-2" style={{ color: "var(--color-muted)" }}>
            Order
            <select
              value={sortMode}
              onChange={(e) =>
                setSortModePersist(e.target.value as HoldingsTableSortMode)
              }
              className="input"
              style={{ minHeight: "unset", height: 36, padding: "0 12px", fontSize: 13 }}
            >
              <option value="manual">Manual (drag)</option>
              <option value="sector">Sector A–Z</option>
              <option value="symbol">Symbol A–Z</option>
            </select>
          </label>
          <MetricColumnPicker
            visibleKeys={visibleKeys}
            toggleKey={toggleKey}
            resetToDefault={resetToDefault}
          />
        </div>
        {sortMode !== "manual" && (
          <p className="text-xs text-muted">
            Drag reorder is available when Order is Manual.
          </p>
        )}
      </div>

      <div className="card overflow-hidden" style={{ padding: 0 }}>
        {/* Gold accent line */}
        <div className="divider-gold" />
        <div className="table-fade-right">
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
              modifiers={[restrictToVerticalAxis]}
            >
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    background: "rgba(255,255,255,0.02)",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <th className="px-2 py-3 w-8"></th>
                  {visibleKeys.map((key) => (
                    <th key={key} className={`${metricCellThClass(key)} text-label`}>
                      {tableMetricLabel(key)}
                    </th>
                  ))}
                  <th className="px-4 py-3"></th>
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
                        valuesVisible={valuesVisible}
                        isExpanded={expandedId === pos.id}
                        onToggleExpand={() =>
                          setExpandedId((id) => (id === pos.id ? null : pos.id))
                        }
                        dragDisabled={dragDisabled}
                        visibleKeys={visibleKeys}
                        chevronAnchorKey={chevronAnchorKey}
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
              </tbody>
            </table>
          </DndContext>
          </div>
        </div>
      </div>
    </div>
  );
}
