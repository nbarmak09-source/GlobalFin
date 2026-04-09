"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import {
  Trash2,
  TrendingUp,
  TrendingDown,
  GripVertical,
  ChevronDown,
} from "lucide-react";
import PositionDetailPanel from "./PositionDetailPanel";
import type { EnrichedWatchlistItem } from "@/lib/types";
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

interface WatchlistTableProps {
  items: EnrichedWatchlistItem[];
  onRemove: (id: string) => void;
  onReorder: (items: EnrichedWatchlistItem[]) => void;
  valuesVisible?: boolean;
  loading?: boolean;
}

function formatCurrency(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatMarketCap(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
  return `$${formatCurrency(value)}`;
}

function SortableRow({
  item,
  onRemove,
  isExpanded,
  onToggleExpand,
}: {
  item: EnrichedWatchlistItem;
  onRemove: (id: string) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

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
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing rounded p-1 text-muted hover:text-foreground hover:bg-card-hover transition-colors touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="min-w-0">
            <Link
              href={stocksHref}
              onClick={(e) => e.stopPropagation()}
              className="font-semibold text-accent hover:underline block truncate"
            >
              {item.symbol}
            </Link>
            <Link
              href={stocksHref}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-muted hover:text-accent hover:underline block truncate"
            >
              {item.name}
            </Link>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
            aria-hidden
          />
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono">
        ${formatCurrency(item.currentPrice)}
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-1">
          {item.dayChange >= 0 ? (
            <TrendingUp className="h-3.5 w-3.5 text-green" />
          ) : (
            <TrendingDown className="h-3.5 w-3.5 text-red" />
          )}
          <span
            className={`font-mono ${
              item.dayChange >= 0 ? "text-green" : "text-red"
            }`}
          >
            {item.dayChange >= 0 ? "+" : ""}
            {item.dayChange.toFixed(2)} ({item.dayChangePercent >= 0 ? "+" : ""}
            {item.dayChangePercent.toFixed(2)}%)
          </span>
        </div>
      </td>
      <td className="px-4 py-3 text-right font-mono">
        ${formatCurrency(item.fiftyTwoWeekHigh)}
      </td>
      <td className="px-4 py-3 text-right font-mono">
        ${formatCurrency(item.fiftyTwoWeekLow)}
      </td>
      <td className="px-4 py-3 text-right font-mono text-muted">
        {formatMarketCap(item.marketCap)}
      </td>
      <td className="px-4 py-3">
        <button
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
  loading = false,
}: WatchlistTableProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
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
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Day Change</th>
                <th className="px-4 py-3 text-right">52W High</th>
                <th className="px-4 py-3 text-right">52W Low</th>
                <th className="px-4 py-3 text-right">Mkt Cap</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-border/50">
                  <td colSpan={8} className="px-4 py-3">
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
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Day Change</th>
                <th className="px-4 py-3 text-right">52W High</th>
                <th className="px-4 py-3 text-right">52W Low</th>
                <th className="px-4 py-3 text-right">Mkt Cap</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              <SortableContext
                items={items.map((w) => w.id)}
                strategy={verticalListSortingStrategy}
              >
                {items.map((item) => (
                  <Fragment key={item.id}>
                    <SortableRow
                      item={item}
                      onRemove={onRemove}
                      isExpanded={expandedId === item.id}
                      onToggleExpand={() =>
                        setExpandedId((id) => (id === item.id ? null : item.id))
                      }
                    />
                    {expandedId === item.id && (
                      <tr>
                        <td colSpan={8} className="p-0 align-top">
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
  );
}
