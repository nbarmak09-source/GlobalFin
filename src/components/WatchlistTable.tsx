"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { GripVertical, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import PositionDetailPanel from "./PositionDetailPanel";
import type { EnrichedWatchlistItem, WatchlistGroup } from "@/lib/types";
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
const ACTIVE_WATCHLIST_GROUP_KEY = "active-watchlist-group-id";

const apiFetch = (input: string, init?: RequestInit) =>
  fetch(input, { ...init, credentials: "include" });

interface WatchlistTableProps {
  valuesVisible?: boolean;
  /** Increment to refetch rows (e.g. after adding from modal or Refresh). */
  refreshNonce?: number;
  /** Always reflects the selected list id after groups load (for callers that POST with groupId). */
  activeGroupIdRef?: MutableRefObject<string | null>;
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
      {visibleKeys.map((metricKey) => (
        <Fragment key={metricKey}>
          {renderPortfolioWatchlistMetricCell(
            metricKey,
            { mode: "watchlist", row: item },
            {
              stocksHref,
              attachChevron: metricKey === chevronAnchorKey,
              isExpanded,
            }
          )}
        </Fragment>
      ))}
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

function loadWatchlistSortMode(): HoldingsTableSortMode {
  try {
    const v = localStorage.getItem(WATCHLIST_SORT_STORAGE_KEY);
    if (v === "sector" || v === "symbol" || v === "manual") return v;
  } catch {
    /* ignore */
  }
  return "manual";
}

const ghostBtn =
  "inline-flex items-center gap-2 rounded-lg border border-border bg-transparent px-3 py-1.5 text-[12px] font-medium text-muted transition-colors hover:bg-card hover:text-foreground";

export default function WatchlistTable({
  valuesVisible: _valuesVisible,
  refreshNonce = 0,
  activeGroupIdRef,
}: WatchlistTableProps) {
  const [groups, setGroups] = useState<WatchlistGroup[]>([]);
  const [groupsLoading, setGroupsLoading] = useState(true);
  const [activeGroupId, setActiveGroupId] = useState<string | null>(null);
  const [items, setItems] = useState<EnrichedWatchlistItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [menuOpenGroupId, setMenuOpenGroupId] = useState<string | null>(null);
  const [deletePromptGroupId, setDeletePromptGroupId] = useState<string | null>(
    null
  );
  const [renameGroupId, setRenameGroupId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameCommittedRef = useRef(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<HoldingsTableSortMode>(
    loadWatchlistSortMode
  );
  const [visibleKeys, toggleKey, resetToDefault] = useColumnPreferences();

  useEffect(() => {
    if (activeGroupId && activeGroupIdRef) {
      activeGroupIdRef.current = activeGroupId;
    }
  }, [activeGroupId, activeGroupIdRef]);

  const loadGroups = useCallback(async () => {
    setGroupsLoading(true);
    try {
      const res = await apiFetch("/api/watchlist/groups");
      if (!res.ok) {
        setGroups([]);
        return [];
      }
      const data = (await res.json()) as WatchlistGroup[];
      setGroups(Array.isArray(data) ? data : []);
      return Array.isArray(data) ? data : [];
    } catch {
      setGroups([]);
      return [];
    } finally {
      setGroupsLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const data = await loadGroups();
      if (data.length === 0) return;
      let nextId: string | null = null;
      try {
        const saved =
          typeof window !== "undefined"
            ? localStorage.getItem(ACTIVE_WATCHLIST_GROUP_KEY)
            : null;
        const match = saved ? data.find((g) => g.id === saved) : null;
        nextId =
          match?.id ??
          activeGroupIdRef?.current ??
          data[0]?.id ??
          null;
      } catch {
        nextId = activeGroupIdRef?.current ?? data[0]?.id ?? null;
      }
      setActiveGroupId((prev) => {
        if (prev && data.some((g) => g.id === prev)) return prev;
        return nextId;
      });
    })();
  }, [activeGroupIdRef, loadGroups]);

  useEffect(() => {
    if (activeGroupId) {
      try {
        localStorage.setItem(ACTIVE_WATCHLIST_GROUP_KEY, activeGroupId);
      } catch {
        /* ignore */
      }
    }
  }, [activeGroupId]);

  const fetchItemsForGroup = useCallback(async () => {
    if (!activeGroupId) {
      setItems([]);
      setItemsLoading(false);
      return;
    }
    setItems([]);
    setItemsLoading(true);
    try {
      const qs = `?groupId=${encodeURIComponent(activeGroupId)}`;
      const res = await apiFetch(`/api/watchlist${qs}`);
      if (res.ok) {
        const data = (await res.json()) as EnrichedWatchlistItem[];
        setItems(Array.isArray(data) ? data : []);
      } else {
        setItems([]);
      }
    } catch {
      setItems([]);
    } finally {
      setItemsLoading(false);
    }
  }, [activeGroupId]);

  useEffect(() => {
    void fetchItemsForGroup();
  }, [fetchItemsForGroup, refreshNonce]);

  useEffect(() => {
    function closeMenu(ev: MouseEvent) {
      const t = ev.target as Node;
      if (
        !(t instanceof Element && t.closest?.("[data-wl-group-menu-root]"))
      ) {
        setMenuOpenGroupId(null);
      }
    }
    document.addEventListener("mousedown", closeMenu);
    return () => document.removeEventListener("mousedown", closeMenu);
  }, []);

  const renameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (renameGroupId) {
      requestAnimationFrame(() => {
        renameInputRef.current?.focus();
        renameInputRef.current?.select();
      });
    }
  }, [renameGroupId]);

  async function persistRename(saveId?: string | null, nextNameRaw?: string) {
    const id = saveId ?? renameGroupId;
    if (!id || nextNameRaw === undefined) {
      setRenameGroupId(null);
      return;
    }
    renameCommittedRef.current = true;
    const prev = groups.find((g) => g.id === id)?.name ?? "";
    if ((nextNameRaw.trim() || "New List") === (prev.trim() || "New List")) {
      setRenameGroupId(null);
      return;
    }
    const res = await apiFetch(`/api/watchlist/groups/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nextNameRaw }),
    });
    if (res.ok) {
      const updated = (await res.json()) as WatchlistGroup;
      setGroups((g) =>
        g
          .map((row) =>
            row.id === updated.id
              ? { ...row, name: updated.name }
              : row
          )
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );
    }
    setRenameGroupId(null);
  }

  async function deleteGroupConfirmed(id: string) {
    setDeletePromptGroupId(null);
    setMenuOpenGroupId(null);
    const res = await apiFetch(`/api/watchlist/groups/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) return;

    const wasActive = activeGroupId === id;
    const data = await loadGroups();
    if (wasActive) {
      setActiveGroupId(data[0]?.id ?? null);
    }
  }

  async function createNewGroup() {
    const res = await apiFetch("/api/watchlist/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "" }),
    });
    if (!res.ok) return;
    const created = (await res.json()) as WatchlistGroup;
    setGroups((prev) =>
      [...prev.filter((g) => g.id !== created.id), created].sort(
        (a, b) => a.sortOrder - b.sortOrder
      )
    );
    setActiveGroupId(created.id);
    setRenameDraft(created.name);
    renameCommittedRef.current = false;
    setRenameGroupId(created.id);
  }

  async function removeItem(id: string) {
    const res = await apiFetch(`/api/watchlist?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) return;
    void fetchItemsForGroup();
    await loadGroups();
  }

  async function reorderRows(reordered: EnrichedWatchlistItem[]) {
    if (!activeGroupId) return;
    setItems(reordered);
    const qs = `?groupId=${encodeURIComponent(activeGroupId)}`;
    await apiFetch(`/api/watchlist${qs}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderedIds: reordered.map((w) => w.id),
      }),
    });
  }

  useEffect(() => {
    function onKey(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        if (renameGroupId && !renameCommittedRef.current) {
          renameCommittedRef.current = true;
          setRenameGroupId(null);
          setRenameDraft("");
          return;
        }
        setDeletePromptGroupId(null);
        setMenuOpenGroupId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [renameGroupId]);

  const chevronAnchorKey =
    visibleKeys.find((k) => k === "ticker" || k === "name") ?? visibleKeys[0];

  const colCount = 1 + visibleKeys.length + 1;

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
    if (dragDisabled || !activeGroupId) return;
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((w) => w.id === active.id);
      const newIndex = items.findIndex((w) => w.id === over.id);
      const reordered = arrayMove(items, oldIndex, newIndex);
      void reorderRows(reordered);
    }
  }

  const loading = groupsLoading || (itemsLoading && items.length === 0);

  const groupPillInactive =
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors border border-border text-muted hover:text-foreground";
  const groupPillActive =
    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors bg-accent text-background";

  function GroupPill({ g }: { g: WatchlistGroup }) {
    const isEditing = renameGroupId === g.id;
    const isActive = activeGroupId === g.id;

    return (
      <div
        className="group/pill relative"
        data-wl-group-menu-root
        onContextMenu={(ev) => {
          ev.preventDefault();
          setMenuOpenGroupId(g.id);
          setRenameDraft(g.name);
        }}
      >
        {isEditing ? (
          <input
            ref={renameInputRef}
            value={renameDraft}
            onChange={(e) => setRenameDraft(e.target.value)}
            className={`${groupPillActive} w-max min-w-[6rem] max-w-[14rem] border-0 bg-accent text-background outline-none focus:ring-2 focus:ring-background/40`}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                renameCommittedRef.current = true;
                void persistRename(g.id, renameDraft);
              }
              if (e.key === "Escape") {
                renameCommittedRef.current = true;
                setRenameGroupId(null);
              }
            }}
            onBlur={() => {
              if (renameCommittedRef.current) {
                renameCommittedRef.current = false;
                return;
              }
              void persistRename(g.id, renameDraft);
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setActiveGroupId(g.id)}
            onDoubleClick={(e) => {
              e.stopPropagation();
              renameCommittedRef.current = false;
              setRenameDraft(g.name);
              setRenameGroupId(g.id);
            }}
            className={isActive ? groupPillActive : groupPillInactive}
          >
            {g.name}
          </button>
        )}
        {!isEditing && (
          <button
            type="button"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 rounded p-1 text-muted opacity-0 hover:text-foreground group-hover/pill:opacity-100"
            aria-label="List actions"
            onClick={(ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              setRenameDraft(g.name);
              setMenuOpenGroupId(menuOpenGroupId === g.id ? null : g.id);
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        )}
        {menuOpenGroupId === g.id && !isEditing && (
          <div
            role="menu"
            className="absolute left-0 top-full z-40 mt-1 min-w-[9rem] rounded-lg border border-border bg-card py-1 text-sm shadow-lg"
          >
            <button
              type="button"
              role="menuitem"
              className="block w-full px-3 py-1.5 text-left hover:bg-card-hover"
              onClick={(e) => {
                e.preventDefault();
                setMenuOpenGroupId(null);
                renameCommittedRef.current = false;
                setRenameDraft(g.name);
                setRenameGroupId(g.id);
              }}
            >
              Rename
            </button>
            {groups.length > 1 ? (
              <button
                type="button"
                role="menuitem"
                className="block w-full px-3 py-1.5 text-left text-red hover:bg-red/10"
                onClick={(e) => {
                  e.preventDefault();
                  setMenuOpenGroupId(null);
                  setDeletePromptGroupId(g.id);
                }}
              >
                Delete
              </button>
            ) : null}
          </div>
        )}
        {deletePromptGroupId === g.id ? (
          <div className="absolute left-0 top-full z-50 mt-1 w-[15rem] rounded-lg border border-border bg-card p-3 text-[12px] shadow-xl">
            <p className="text-foreground/90 mb-3">
              Delete this list? Items will move to ungrouped.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={`${ghostBtn} py-1 px-2 text-[11px]`}
                onClick={() => setDeletePromptGroupId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-lg border border-red/60 bg-red/10 px-2 py-1 text-[11px] font-medium text-red hover:bg-red/20"
                onClick={() => void deleteGroupConfirmed(g.id)}
              >
                Delete
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {groupsLoading ? (
          <div className="h-10 w-48 animate-pulse rounded-lg border border-border bg-card" />
        ) : groups.length <= 4 ? (
          <div className="flex flex-wrap items-center gap-1 rounded-lg border border-border bg-card/50 p-1">
            {groups.map((g) => (
              <GroupPill key={g.id} g={g} />
            ))}
          </div>
        ) : (
          <select
            value={activeGroupId ?? ""}
            onChange={(e) => setActiveGroupId(e.target.value || null)}
            className="min-w-[12rem] rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
        <button type="button" onClick={() => void createNewGroup()} className={ghostBtn}>
          <Plus className="h-4 w-4" />
          New List
        </button>
      </div>

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

      {(loading || itemsLoading) && items.length === 0 ? (
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
      ) : null}

      {!itemsLoading && !loading && items.length === 0 ? (
      <div className="text-center py-16 text-muted">
        <p className="text-lg mb-1">Watchlist is empty</p>
        <p className="text-sm">
          Add stocks to your watchlist to track them without holding a position.
        </p>
      </div>
      ) : null}

      {items.length > 0 ? (
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
                        onRemove={(id) => void removeItem(id)}
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
      ) : null}
    </div>
  );
}
