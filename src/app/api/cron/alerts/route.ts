import { NextRequest, NextResponse } from "next/server";
import { processPendingPriceAlerts } from "@/lib/priceAlertJobs";

/**
 * Vercel Cron invokes this route with GET and `Authorization: Bearer <CRON_SECRET>`.
 * Set `CRON_SECRET` in the project environment (must match Vercel’s cron auth).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    console.error("[cron/alerts] CRON_SECRET is not set");
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }

  const authHeader = request.headers.get("authorization");
  const bearer =
    authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : null;
  if (bearer !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await processPendingPriceAlerts({ all: true }, { sendEmail: true });
    return NextResponse.json(result);
  } catch (e) {
    console.error("[cron/alerts]", e);
    return NextResponse.json({ error: "Alert sweep failed" }, { status: 500 });
  }
}
