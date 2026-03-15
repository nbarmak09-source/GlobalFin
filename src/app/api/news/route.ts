import { NextResponse } from "next/server";
import { getMarketNews } from "@/lib/yahoo";

export async function GET() {
  try {
    const news = await getMarketNews();
    return NextResponse.json(news);
  } catch (error) {
    console.error("News API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 }
    );
  }
}
