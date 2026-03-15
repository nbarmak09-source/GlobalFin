import { prisma } from "./prisma";

export interface AlertRecord {
  id: string;
  symbol: string;
  companyName: string;
  targetPrice: number;
  direction: string;
  note: string | null;
  triggered: boolean;
  triggeredAt: string | null;
  createdAt: string;
}

function toAlert(row: {
  id: string;
  symbol: string;
  companyName: string;
  targetPrice: number;
  direction: string;
  note: string | null;
  triggered: boolean;
  triggeredAt: Date | null;
  createdAt: Date;
}): AlertRecord {
  return {
    id: row.id,
    symbol: row.symbol,
    companyName: row.companyName,
    targetPrice: row.targetPrice,
    direction: row.direction,
    note: row.note,
    triggered: row.triggered,
    triggeredAt: row.triggeredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function getAlerts(userId: string): Promise<AlertRecord[]> {
  const rows = await prisma.alert.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toAlert);
}

export async function createAlert(
  userId: string,
  data: {
    symbol: string;
    companyName: string;
    targetPrice: number;
    direction: string;
    note?: string;
  }
): Promise<AlertRecord> {
  const row = await prisma.alert.create({
    data: {
      userId,
      symbol: data.symbol,
      companyName: data.companyName,
      targetPrice: data.targetPrice,
      direction: data.direction,
      note: data.note ?? null,
    },
  });
  return toAlert(row);
}

export async function deleteAlert(
  userId: string,
  id: string
): Promise<void> {
  await prisma.alert.deleteMany({
    where: { id, userId },
  });
}

export async function markTriggered(
  userId: string,
  id: string
): Promise<void> {
  await prisma.alert.updateMany({
    where: { id, userId },
    data: { triggered: true, triggeredAt: new Date() },
  });
}

export async function resetAlert(
  userId: string,
  id: string
): Promise<void> {
  await prisma.alert.updateMany({
    where: { id, userId },
    data: { triggered: false, triggeredAt: null },
  });
}
