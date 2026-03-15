import { prisma } from "./prisma";
import type { PortfolioPosition, WatchlistItem } from "./types";

function toPosition(row: {
  id: string;
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
  purchaseDate: string | null;
}): PortfolioPosition {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    shares: row.shares,
    avgCost: row.avgCost,
    ...(row.purchaseDate && { purchaseDate: row.purchaseDate }),
  };
}

function toWatchlistItem(row: {
  id: string;
  symbol: string;
  name: string;
  addedAt: Date;
}): WatchlistItem {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    addedAt: row.addedAt.toISOString(),
  };
}

export async function getPositions(userId: string): Promise<PortfolioPosition[]> {
  const rows = await prisma.position.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(toPosition);
}

export async function addPosition(
  userId: string,
  position: Omit<PortfolioPosition, "id">
): Promise<PortfolioPosition> {
  const maxOrder = await prisma.position.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const row = await prisma.position.create({
    data: {
      userId,
      symbol: position.symbol,
      name: position.name,
      shares: position.shares,
      avgCost: position.avgCost,
      purchaseDate: position.purchaseDate ?? null,
      sortOrder,
    },
  });
  return toPosition(row);
}

export async function updatePosition(
  userId: string,
  id: string,
  updates: Partial<Omit<PortfolioPosition, "id">>
): Promise<PortfolioPosition[]> {
  await prisma.position.updateMany({
    where: { id, userId },
    data: {
      ...(updates.symbol != null && { symbol: updates.symbol }),
      ...(updates.name != null && { name: updates.name }),
      ...(updates.shares != null && { shares: updates.shares }),
      ...(updates.avgCost != null && { avgCost: updates.avgCost }),
      ...(updates.purchaseDate !== undefined && {
        purchaseDate: updates.purchaseDate ?? null,
      }),
    },
  });
  return getPositions(userId);
}

export async function deletePosition(
  userId: string,
  id: string
): Promise<PortfolioPosition[]> {
  await prisma.position.deleteMany({
    where: { id, userId },
  });
  return getPositions(userId);
}

export async function getWatchlist(
  userId: string
): Promise<WatchlistItem[]> {
  const rows = await prisma.watchlistItem.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(toWatchlistItem);
}

export async function addToWatchlist(
  userId: string,
  item: Omit<WatchlistItem, "id" | "addedAt">
): Promise<WatchlistItem> {
  const existing = await prisma.watchlistItem.findFirst({
    where: { userId, symbol: item.symbol },
  });
  if (existing) return toWatchlistItem(existing);

  const maxOrder = await prisma.watchlistItem.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const row = await prisma.watchlistItem.create({
    data: {
      userId,
      symbol: item.symbol,
      name: item.name,
      sortOrder,
    },
  });
  return toWatchlistItem(row);
}

export async function removeFromWatchlist(
  userId: string,
  id: string
): Promise<WatchlistItem[]> {
  await prisma.watchlistItem.deleteMany({
    where: { id, userId },
  });
  return getWatchlist(userId);
}

export async function reorderPositions(
  userId: string,
  orderedIds: string[]
): Promise<PortfolioPosition[]> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.position.updateMany({
        where: { id, userId },
        data: { sortOrder: index },
      })
    )
  );
  return getPositions(userId);
}

export async function reorderWatchlist(
  userId: string,
  orderedIds: string[]
): Promise<WatchlistItem[]> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.watchlistItem.updateMany({
        where: { id, userId },
        data: { sortOrder: index },
      })
    )
  );
  return getWatchlist(userId);
}
