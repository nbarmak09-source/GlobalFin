"use client";

import { Trash2, TrendingUp, TrendingDown, GripVertical } from "lucide-react";
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
}: {
  item: EnrichedWatchlistItem;
  onRemove: (id: string) => void;
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

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className="border-b border-border/50 hover:bg-card-hover transition-colors bg-card"
    >
      <td className="px-2 py-3 w-8">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing rounded p-1 text-muted hover:text-foreground hover:bg-card-hover transition-colors touch-none"
        >
          <GripVertical className="h-4 w-4" />
        </button>
      </td>
      <td className="px-4 py-3">
        <div className="font-semibold text-accent">{item.symbol}</div>
        <div className="text-xs text-muted">{item.name}</div>
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
          onClick={() => onRemove(item.id)}
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
}: WatchlistTableProps) {
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
                  <SortableRow
                    key={item.id}
                    item={item}
                    onRemove={onRemove}
                  />
                ))}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>
    </div>
  );
}
