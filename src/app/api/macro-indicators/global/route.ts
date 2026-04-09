import { NextRequest, NextResponse } from "next/server";
import {
  getGdpGrowth,
  getInflation,
  getUnemployment,
  isValidWorldBankCountry,
} from "@/lib/worldbank";

export const revalidate = 86400;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("country")?.trim() ?? "US";
  const country = raw.toUpperCase();

  if (!isValidWorldBankCountry(country)) {
    return NextResponse.json(
      {
        error: "Invalid country",
        allowed: [
          "US",
          "GB",
          "EU",
          "CN",
          "JP",
          "IN",
          "BR",
          "WLD",
        ],
      },
      { status: 400 }
    );
  }

  try {
    const [gdpGrowth, inflation, unemployment] = await Promise.all([
      getGdpGrowth(country),
      getInflation(country),
      getUnemployment(country),
    ]);

    return NextResponse.json(
      {
        country,
        gdpGrowth,
        inflation,
        unemployment,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=86400",
        },
      }
    );
  } catch (e) {
    console.error("[macro-indicators/global]", e);
    return NextResponse.json(
      { error: "Failed to fetch World Bank data" },
      { status: 500 }
    );
  }
}
