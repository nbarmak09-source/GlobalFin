import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getBalanceSheet,
  getIncomeStatement,
  getKeyMetrics,
} from "@/lib/fmp";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "0.0.0.0";
  }
  return request.headers.get("x-real-ip") ?? "0.0.0.0";
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { allowed } = await checkRateLimit(getClientIp(request), "default");
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const symbol = request.nextUrl.searchParams.get("symbol")?.trim();
  if (!symbol) {
    return NextResponse.json(
      { error: "Missing required query parameter: symbol" },
      { status: 400 }
    );
  }

  const [incomeStatement, balanceSheet, keyMetrics] = await Promise.all([
    getIncomeStatement(symbol),
    getBalanceSheet(symbol),
    getKeyMetrics(symbol),
  ]);

  return NextResponse.json({
    symbol: symbol.toUpperCase(),
    incomeStatement,
    balanceSheet,
    keyMetrics,
  });
}
