import { prisma } from "./prisma";
import type { PortfolioPosition, UserPortfolio, WatchlistItem } from "./types";

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

/** Creates "Main Portfolio" if none exist and attaches orphan positions. */
export async function ensureDefaultPortfolio(
  userId: string
): Promise<{ id: string; name: string }> {
  const first = await prisma.portfolio.findFirst({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });
  if (first) {
    await prisma.position.updateMany({
      where: { userId, portfolioId: null },
      data: { portfolioId: first.id },
    });
    return { id: first.id, name: first.name };
  }
  const portfolio = await prisma.portfolio.create({
    data: {
      userId,
      name: "Main Portfolio",
      sortOrder: 0,
    },
  });
  await prisma.position.updateMany({
    where: { userId },
    data: { portfolioId: portfolio.id },
  });
  return { id: portfolio.id, name: portfolio.name };
}

export async function assertPortfolioOwnership(
  userId: string,
  portfolioId: string
): Promise<boolean> {
  const p = await prisma.portfolio.findFirst({
    where: { id: portfolioId, userId },
  });
  return !!p;
}

export async function getPortfolios(userId: string): Promise<UserPortfolio[]> {
  const rows = await prisma.portfolio.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
    include: {
      _count: { select: { positions: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.name,
    description: r.description,
    sortOrder: r.sortOrder,
    createdAt: r.createdAt.toISOString(),
    positionCount: r._count.positions,
  }));
}

export async function createPortfolio(
  userId: string,
  data: { name: string; description?: string | null }
): Promise<UserPortfolio> {
  const maxOrder = await prisma.portfolio.aggregate({
    where: { userId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;
  const row = await prisma.portfolio.create({
    data: {
      userId,
      name: data.name.trim(),
      description: data.description?.trim() || null,
      sortOrder,
    },
    include: { _count: { select: { positions: true } } },
  });
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    positionCount: row._count.positions,
  };
}

export async function updatePortfolio(
  userId: string,
  id: string,
  updates: { name?: string; description?: string | null }
): Promise<UserPortfolio | null> {
  const existing = await prisma.portfolio.findFirst({
    where: { id, userId },
  });
  if (!existing) return null;
  const row = await prisma.portfolio.update({
    where: { id },
    data: {
      ...(updates.name !== undefined && { name: updates.name.trim() }),
      ...(updates.description !== undefined && {
        description: updates.description?.trim() || null,
      }),
    },
    include: { _count: { select: { positions: true } } },
  });
  return {
    id: row.id,
    userId: row.userId,
    name: row.name,
    description: row.description,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt.toISOString(),
    positionCount: row._count.positions,
  };
}

export async function reorderPortfolios(
  userId: string,
  orderedIds: string[]
): Promise<void> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.portfolio.updateMany({
        where: { id, userId },
        data: { sortOrder: index },
      })
    )
  );
}

export async function deletePortfolio(
  userId: string,
  id: string
): Promise<boolean> {
  const count = await prisma.portfolio.count({ where: { userId } });
  if (count <= 1) {
    return false;
  }
  const deleted = await prisma.portfolio.deleteMany({
    where: { id, userId },
  });
  return deleted.count > 0;
}

export async function getPositions(
  userId: string,
  portfolioId: string
): Promise<PortfolioPosition[]> {
  const rows = await prisma.position.findMany({
    where: { userId, portfolioId },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(toPosition);
}

/** All positions across every portfolio (e.g. calendar aggregates). */
export async function getAllPositionsForUser(
  userId: string
): Promise<PortfolioPosition[]> {
  const rows = await prisma.position.findMany({
    where: { userId },
    orderBy: { sortOrder: "asc" },
  });
  return rows.map(toPosition);
}

export async function addPosition(
  userId: string,
  portfolioId: string,
  position: Omit<PortfolioPosition, "id">
): Promise<PortfolioPosition> {
  const maxOrder = await prisma.position.aggregate({
    where: { userId, portfolioId },
    _max: { sortOrder: true },
  });
  const sortOrder = (maxOrder._max.sortOrder ?? -1) + 1;

  const row = await prisma.position.create({
    data: {
      userId,
      portfolioId,
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
  portfolioId: string,
  id: string,
  updates: Partial<Omit<PortfolioPosition, "id">>
): Promise<PortfolioPosition[]> {
  await prisma.position.updateMany({
    where: { id, userId, portfolioId },
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
  return getPositions(userId, portfolioId);
}

export async function deletePosition(
  userId: string,
  portfolioId: string,
  id: string
): Promise<PortfolioPosition[]> {
  await prisma.position.deleteMany({
    where: { id, userId, portfolioId },
  });
  return getPositions(userId, portfolioId);
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
  portfolioId: string,
  orderedIds: string[]
): Promise<PortfolioPosition[]> {
  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.position.updateMany({
        where: { id, userId, portfolioId },
        data: { sortOrder: index },
      })
    )
  );
  return getPositions(userId, portfolioId);
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
