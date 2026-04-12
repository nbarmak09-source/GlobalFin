"use client";

import { useState, Fragment } from "react";
import Link from "next/link";
import { Trash2, TrendingUp, TrendingDown, GripVertical, ChevronDown, Pencil } from "lucide-react";
import PositionDetailPanel from "./PositionDetailPanel";
import type { EnrichedPosition } from "@/lib/types";
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

const MASK = "••••";

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
}: {
  pos: EnrichedPosition;
  onDelete: (id: string) => void;
  onEdit?: (position: EnrichedPosition) => void;
  valuesVisible: boolean;
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
  } = useSortable({ id: pos.id });

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
              {pos.symbol}
            </Link>
            <Link
              href={stocksHref}
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-muted hover:text-accent hover:underline block truncate"
            >
              {pos.name}
            </Link>
          </div>
          <ChevronDown
            className={`h-4 w-4 text-muted transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
          />
        </div>
      </td>
      <td className="px-4 py-3 font-mono">{pos.shares}</td>
      <td className="px-4 py-3 text-right font-mono">
        ${formatCurrency(pos.avgCost)}
      </td>
      <td className="px-4 py-3 text-right font-mono">
        ${formatCurrency(pos.currentPrice)}
      </td>
      <td className="px-4 py-3 text-right font-mono">
        {valuesVisible ? `$${formatCurrency(pos.marketValue)}` : MASK}
      </td>
      <td className="px-4 py-3 text-right">
        <span
          className={`font-mono ${
            pos.dayChange >= 0 ? "text-green" : "text-red"
          }`}
        >
          {pos.dayChange >= 0 ? "+" : ""}
          {pos.dayChange.toFixed(2)} ({pos.dayChangePercent >= 0 ? "+" : ""}
          {pos.dayChangePercent.toFixed(2)}%)
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div
          className={`font-mono font-medium ${
            pos.totalPL >= 0 ? "text-green" : "text-red"
          }`}
        >
          {`${pos.totalPL >= 0 ? "+" : ""}$${formatCurrency(Math.abs(pos.totalPL))}`}
        </div>
        <div
          className={`text-xs font-mono ${
            pos.totalPLPercent >= 0 ? "text-green" : "text-red"
          }`}
        >
          {`${pos.totalPLPercent >= 0 ? "+" : ""}${pos.totalPLPercent.toFixed(2)}%`}
        </div>
      </td>
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
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
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted uppercase tracking-wider">
                <th className="px-2 py-3 w-8"></th>
                <th className="px-4 py-3">Symbol</th>
                <th className="px-4 py-3">Shares</th>
                <th className="px-4 py-3 text-right">Avg Cost</th>
                <th className="px-4 py-3 text-right">Current</th>
                <th className="px-4 py-3 text-right">Mkt Value</th>
                <th className="px-4 py-3 text-right">Day Chg</th>
                <th className="px-4 py-3 text-right">Total P&L</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {[1, 2, 3].map((i) => (
                <tr key={i} className="border-b border-border/50">
                  <td colSpan={9} className="px-4 py-3">
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

  const totalValue = positions.reduce((sum, p) => sum + p.marketValue, 0);
  const totalCost = positions.reduce((sum, p) => sum + p.avgCost * p.shares, 0);
  const totalPL = totalValue - totalCost;
  const totalPLPercent = totalCost > 0 ? (totalPL / totalCost) * 100 : 0;
  const totalDayChange = positions.reduce((sum, p) => sum + p.dayChange * p.shares, 0);
  const startOfDayValue = totalValue - totalDayChange;
  const totalDayChangePercent =
    startOfDayValue !== 0 ? (totalDayChange / startOfDayValue) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="text-xs text-muted mb-1">Total Value</div>
          <div className="text-lg font-bold font-mono">
            {valuesVisible ? formatLargeCurrency(totalValue) : MASK}
          </div>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="text-xs text-muted mb-1">Cost Basis</div>
          <div className="text-lg font-bold font-mono">
            {valuesVisible ? formatLargeCurrency(totalCost) : MASK}
          </div>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="text-xs text-muted mb-1">Total P&L</div>
          <div
            className={`text-lg font-bold font-mono ${
              valuesVisible && totalPL >= 0 ? "text-green" : valuesVisible ? "text-red" : "text-muted"
            }`}
          >
            {valuesVisible ? `${totalPL >= 0 ? "+" : ""}$${formatCurrency(totalPL)}` : MASK}
          </div>
        </div>
        <div className="rounded-xl bg-card border border-border p-4">
          <div className="text-xs text-muted mb-1">Return %</div>
          <div
            className={`text-lg font-bold font-mono flex items-center gap-1 ${
              totalPLPercent >= 0 ? "text-green" : "text-red"
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
            className={`text-lg font-bold font-mono flex items-center gap-1 ${
              totalDayChangePercent >= 0 ? "text-green" : "text-red"
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
                  <th className="px-4 py-3">Shares</th>
                  <th className="px-4 py-3 text-right">Avg Cost</th>
                  <th className="px-4 py-3 text-right">Current</th>
                  <th className="px-4 py-3 text-right">Mkt Value</th>
                  <th className="px-4 py-3 text-right">Day Chg</th>
                  <th className="px-4 py-3 text-right">Total P&L</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                <SortableContext
                  items={positions.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {positions.map((pos) => (
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
                      />
                      {expandedId === pos.id && (
                        <tr>
                          <td colSpan={9} className="p-0 align-top">
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
  );
}
