import Anthropic from "@anthropic-ai/sdk";
import { unstable_cache } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

interface BullsBearsResponse {
  bulls: string[];
  bears: string[];
}

const SYSTEM_PROMPT =
  "You are a senior equity analyst. When given a stock ticker, return ONLY a JSON object with this exact shape: { bulls: string[], bears: string[] } — each array containing exactly 4 concise one-sentence arguments. No markdown, no preamble.";

function cleanJsonResponse(raw: string): string {
  return raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function isBullsBearsResponse(value: unknown): value is BullsBearsResponse {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<BullsBearsResponse>;
  return (
    Array.isArray(candidate.bulls) &&
    Array.isArray(candidate.bears) &&
    candidate.bulls.length === 4 &&
    candidate.bears.length === 4 &&
    candidate.bulls.every((point) => typeof point === "string" && point.trim().length > 0) &&
    candidate.bears.every((point) => typeof point === "string" && point.trim().length > 0)
  );
}

const getBullsBearsForTicker = unstable_cache(
  async (ticker: string): Promise<BullsBearsResponse> => {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 900,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: ticker }],
    });

    const raw = message.content
      .filter((content) => content.type === "text")
      .map((content) => ("text" in content ? content.text : ""))
      .join("\n");

    const parsed: unknown = JSON.parse(cleanJsonResponse(raw));
    if (!isBullsBearsResponse(parsed)) {
      throw new Error("Invalid bulls/bears response shape");
    }

    return {
      bulls: parsed.bulls.map((point) => point.trim()),
      bears: parsed.bears.map((point) => point.trim()),
    };
  },
  ["bulls-bears"],
  { revalidate: 60 * 60 * 24 }
);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { ticker } = body as { ticker?: unknown };
    if (typeof ticker !== "string" || !ticker.trim()) {
      return NextResponse.json({ error: "ticker required" }, { status: 400 });
    }

    const normalizedTicker = ticker.trim().toUpperCase();
    const data = await getBullsBearsForTicker(normalizedTicker);

    return NextResponse.json(data);
  } catch (error) {
    console.error("Bulls/bears API error:", error);
    return NextResponse.json(
      { error: "Failed to generate bulls and bears" },
      { status: 500 }
    );
  }
}
