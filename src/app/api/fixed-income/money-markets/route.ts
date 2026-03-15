import { NextResponse } from "next/server";
import { getQuote } from "@/lib/yahoo";

export async function GET() {
  const [tbill3m, tbill5y] = await Promise.all([
    getQuote("^IRX"),
    getQuote("^FVX"),
  ]);

  const sofrProxy = tbill3m?.regularMarketPrice ?? 0;
  const cpProxy = tbill5y?.regularMarketPrice ?? 0;

  return NextResponse.json({
    asOf: new Date().toISOString(),
    rows: [
      { name: "SOFR Proxy (3M T-Bill)", value: sofrProxy, unit: "%" },
      { name: "Commercial Paper Proxy (5Y)", value: cpProxy, unit: "%" },
    ],
  });
}

