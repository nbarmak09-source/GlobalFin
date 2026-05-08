import { NextRequest, NextResponse } from "next/server";
import { collectMacroNews, isMacroNewsTopic } from "@/lib/macroNews";

export async function GET(request: NextRequest) {
  const topic = request.nextUrl.searchParams.get("topic") ?? "overview";

  if (!isMacroNewsTopic(topic)) {
    return NextResponse.json(
      { error: "Invalid topic", valid: "overview | inflation | employment | gdp | rates | currency | commodities" },
      { status: 400 }
    );
  }

  try {
    const articles = await collectMacroNews(topic);
    return NextResponse.json(articles);
  } catch (e) {
    console.error("[macro-news]", e);
    return NextResponse.json([], { status: 200 });
  }
}
