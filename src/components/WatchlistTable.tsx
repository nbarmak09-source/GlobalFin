"use client";

import { useState, Fragment, useMemo, useEffect } from "react";
import { Trash2, GripVertical } from "lucide-react";
import PositionDetailPanel from "./PositionDetailPanel";
import type { EnrichedWatchlistItem } from "@/lib/types";
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

const WATCHLIST_SORT_STORAGE_KEY = "portfolio-watchlist-sort";

interface WatchlistTableProps {
  items: EnrichedWatchlistItem[];
  onRemove: (id: string) => void;
  onReorder: (items: EnrichedWatchlistItem[]) => void;
  valuesVisible?: boolean;
  loading?: boolean;
}

function SortableRow({
  item,
  onRemove,
  isExpanded,
  onToggleExpand,
  dragDisabled,
  visibleKeys,
  chevronAnchorKey,
}: {
  item: EnrichedWatchlistItem;
  onRemove: (id: string) => void;
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
  } = useSortable({ id: item.id, disabled: dragDisabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
    position: "relative" as const,
  };

  const stocksHref = `/stocks?symbol=${encodeURIComponent(item.symbol)}`;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-border/50 transition-colors bg-card ${!isExpanded ? "hover:bg-card-hover cursor-pointer" : ""}`}
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
        renderPortfolioWatchlistMetricCell(
          metricKey,
          { mode: "watchlist", row: item },
          { stocksHref, attachChevron: metricKey === chevronAnchorKey, isExpanded }
        )
      )}
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(item.id);
          }}
          className="rounded-lg p-1.5 text-muted hover:text-red hover:bg-red/10 transition-colors"
          title="Remove from watchlist"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </td>
    </tr>
  );
}

export default function WatchlistTable({
  items,
  onRemove,
  onReorder,
  valuesVisible: _valuesVisible = true,
  loading = false,
}: WatchlistTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<HoldingsTableSortMode>("manual");
  const [visibleKeys, toggleKey, resetToDefault] = useColumnPreferences();

  const chevronAnchorKey =
    visibleKeys.find((k) => k === "ticker" || k === "name") ?? visibleKeys[0];

  const colCount = 1 + visibleKeys.length + 1;

  useEffect(() => {
    try {
      const v = localStorage.getItem(WATCHLIST_SORT_STORAGE_KEY);
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
      localStorage.setItem(WATCHLIST_SORT_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }

  const displayItems = useMemo(
    () => sortHoldingsRows(items, sortMode),
    [items, sortMode]
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
      const oldIndex = items.findIndex((w) => w.id === active.id);
      const newIndex = items.findIndex((w) => w.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex);
      onReorder(reordered);
    }
  }

  if (loading && items.length === 0) {
    return (
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wider">
                <th className="px-2 py-3 w-8"></th>
                {visibleKeys.map((key) => (
                  <th
                    key={key}
                    className={`${metricCellThClass(key)} text-xs uppercase tracking-wider`}
                  >
                    {tableMetricLabel(key)}
                  </th>
                ))}
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-border/50">
                  <td colSpan={colCount} className="px-4 py-3">
                    <div className="h-12 w-full rounded-lg bg-card animate-pulse" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-muted">
        <p className="text-lg mb-1">Watchlist is empty</p>
        <p className="text-sm">
          Add stocks to your watchlist to track them without holding a position.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-muted flex items-center gap-2">
            Order
            <select
              value={sortMode}
              onChange={(e) =>
                setSortModePersist(e.target.value as HoldingsTableSortMode)
              }
              className="rounded-lg border border-border bg-card px-2 py-1.5 text-sm text-foreground"
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

      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis]}
          >
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wider">
                  <th className="px-2 py-3 w-8"></th>
                  {visibleKeys.map((key) => (
                    <th
                      key={key}
                      className={`${metricCellThClass(key)} text-xs uppercase tracking-wider`}
                    >
                      {tableMetricLabel(key)}
                    </th>
                  ))}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                <SortableContext
                  items={displayItems.map((w) => w.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {displayItems.map((item) => (
                    <Fragment key={item.id}>
                      <SortableRow
                        item={item}
                        onRemove={onRemove}
                        isExpanded={expandedId === item.id}
                        onToggleExpand={() =>
                          setExpandedId((id) => (id === item.id ? null : item.id))
                        }
                        dragDisabled={dragDisabled}
                        visibleKeys={visibleKeys}
                        chevronAnchorKey={chevronAnchorKey}
                      />
                      {expandedId === item.id && (
                        <tr>
                          <td colSpan={colCount} className="p-0 align-top">
                            <PositionDetailPanel
                              symbol={item.symbol}
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
  );
}
