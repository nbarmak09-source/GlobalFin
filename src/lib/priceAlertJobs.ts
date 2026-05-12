import type { Prisma } from "@prisma/client";
import { sendPriceAlertTriggeredEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { getMultipleQuotes } from "@/lib/yahoo";

export type ProcessPriceAlertsResult = {
  scanned: number;
  newlyTriggered: number;
  emailsSent: number;
  emailFailures: number;
};

type AlertWithUser = {
  id: string;
  userId: string;
  symbol: string;
  companyName: string;
  targetPrice: number;
  direction: string;
  note: string | null;
  user: {
    email: string | null;
    emailVerified: Date | null;
    priceAlertEmails: boolean;
  };
};

/**
 * Loads non-triggered alerts (optionally for one user), fetches quotes, atomically
 * marks crossed alerts as triggered, and optionally emails verified users who opted in.
 */
export async function processPendingPriceAlerts(
  scope: { userId: string } | { all: true },
  options: { sendEmail: boolean },
): Promise<ProcessPriceAlertsResult> {
  const where: Prisma.AlertWhereInput = { triggered: false };
  if ("userId" in scope) {
    where.userId = scope.userId;
  }

  const pending = (await prisma.alert.findMany({
    where,
    include: {
      user: {
        select: {
          email: true,
          emailVerified: true,
          priceAlertEmails: true,
        },
      },
    },
  })) as AlertWithUser[];

  if (pending.length === 0) {
    return { scanned: 0, newlyTriggered: 0, emailsSent: 0, emailFailures: 0 };
  }

  const symbols = [...new Set(pending.map((a) => a.symbol))];
  const quotes = await getMultipleQuotes(symbols);
  const priceMap = new Map(
    quotes.map((q) => [q.symbol, q.regularMarketPrice as number | null]),
  );

  let newlyTriggered = 0;
  let emailsSent = 0;
  let emailFailures = 0;

  for (const alert of pending) {
    const currentPrice = priceMap.get(alert.symbol);
    if (currentPrice == null || !Number.isFinite(currentPrice)) continue;

    const shouldTrigger =
      alert.direction === "above"
        ? currentPrice >= alert.targetPrice
        : currentPrice <= alert.targetPrice;
    if (!shouldTrigger) continue;

    const flip = await prisma.alert.updateMany({
      where: { id: alert.id, userId: alert.userId, triggered: false },
      data: { triggered: true, triggeredAt: new Date() },
    });

    if (flip.count === 0) continue;
    newlyTriggered += 1;

    if (!options.sendEmail) continue;

    const u = alert.user;
    if (!u.priceAlertEmails || !u.email || !u.emailVerified) continue;

    const { ok } = await sendPriceAlertTriggeredEmail({
      to: u.email,
      symbol: alert.symbol,
      companyName: alert.companyName,
      direction: alert.direction,
      targetPrice: alert.targetPrice,
      currentPrice,
      note: alert.note,
    });
    if (ok) emailsSent += 1;
    else emailFailures += 1;
  }

  return {
    scanned: pending.length,
    newlyTriggered,
    emailsSent,
    emailFailures,
  };
}
