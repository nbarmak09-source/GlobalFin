import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export interface PitchScore {
  overall: number; // 0-100
  thesis: number;
  valuation: number;
  financials: number;
  catalysts: number;
  risks: number;
  recommendation: number;
  strengths: string[];
  weaknesses: string[];
  summary: string;
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { sections, symbol, companyName } = body as {
      sections: Record<string, string>;
      symbol: string;
      companyName: string;
    };

    if (!symbol || !sections) {
      return NextResponse.json({ error: "sections and symbol required" }, { status: 400 });
    }

    const sectionText = Object.entries(sections)
      .filter(([, v]) => v?.trim())
      .map(([k, v]) => `### ${k}\n${v}`)
      .join("\n\n");

    if (!sectionText.trim()) {
      return NextResponse.json({ error: "No pitch content to score" }, { status: 400 });
    }

    const prompt = `You are a senior equity research director reviewing a stock pitch for ${companyName} (${symbol}).

Score the following pitch on a scale of 0-100 for each dimension, then provide an overall score. Be honest and critical — a 70+ is genuinely good.

Scoring criteria:
- **thesis** (0-100): Is the core argument clear, differentiated, and well-supported? Does it go beyond consensus?
- **valuation** (0-100): Are specific multiples cited? Is there a clear fair value framework? Is the upside/downside quantified?
- **financials** (0-100): Are key metrics (revenue growth, margins, FCF) discussed with actual numbers? Are trends identified?
- **catalysts** (0-100): Are catalysts specific and actionable? Are timelines given? Are they truly non-consensus?
- **risks** (0-100): Are risks material and honestly assessed? Are mitigants realistic?
- **recommendation** (0-100): Is there a clear price target with methodology? Are monitoring criteria specified?

Return ONLY valid JSON in this exact format (no markdown, no explanation outside JSON):
{
  "overall": <number 0-100>,
  "thesis": <number 0-100>,
  "valuation": <number 0-100>,
  "financials": <number 0-100>,
  "catalysts": <number 0-100>,
  "risks": <number 0-100>,
  "recommendation": <number 0-100>,
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "summary": "<2-3 sentence overall assessment>"
}

PITCH TO EVALUATE:
${sectionText}`;

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = message.content[0].type === "text" ? message.content[0].text : "";
    // Strip any accidental markdown code fences
    const cleaned = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();

    let score: PitchScore;
    try {
      score = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to parse score response" }, { status: 500 });
    }

    return NextResponse.json(score);
  } catch (err) {
    console.error("Pitch score error:", err);
    return NextResponse.json({ error: "Failed to score pitch" }, { status: 500 });
  }
}
