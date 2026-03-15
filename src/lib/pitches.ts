import { prisma } from "./prisma";
import type { StockPitch, PitchSections } from "./types";

function toStockPitch(row: {
  id: string;
  symbol: string;
  companyName: string;
  createdAt: Date;
  updatedAt: Date;
  thesis: string;
  companyOverview: string;
  valuation: string;
  financials: string;
  catalysts: string;
  risks: string;
  recommendation: string;
}): StockPitch {
  return {
    id: row.id,
    symbol: row.symbol,
    companyName: row.companyName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    sections: {
      thesis: row.thesis,
      companyOverview: row.companyOverview,
      valuation: row.valuation,
      financials: row.financials,
      catalysts: row.catalysts,
      risks: row.risks,
      recommendation: row.recommendation,
    },
  };
}

export async function getPitches(userId: string): Promise<StockPitch[]> {
  const rows = await prisma.pitch.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
  return rows.map(toStockPitch);
}

export async function getPitch(
  userId: string,
  id: string
): Promise<StockPitch | null> {
  const row = await prisma.pitch.findFirst({
    where: { id, userId },
  });
  return row ? toStockPitch(row) : null;
}

export async function savePitch(
  userId: string,
  pitch: StockPitch
): Promise<StockPitch> {
  const sections = pitch.sections;
  const data = {
    userId,
    symbol: pitch.symbol,
    companyName: pitch.companyName,
    thesis: sections.thesis,
    companyOverview: sections.companyOverview,
    valuation: sections.valuation,
    financials: sections.financials,
    catalysts: sections.catalysts,
    risks: sections.risks,
    recommendation: sections.recommendation,
  };

  const row = await prisma.pitch.upsert({
    where: { id: pitch.id },
    create: {
      id: pitch.id,
      ...data,
    },
    update: data,
  });
  return toStockPitch(row);
}

export async function deletePitch(
  userId: string,
  id: string
): Promise<StockPitch[]> {
  await prisma.pitch.deleteMany({
    where: { id, userId },
  });
  return getPitches(userId);
}
