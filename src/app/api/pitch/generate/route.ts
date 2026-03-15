import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SECTION_PROMPTS: Record<string, string> = {
  thesis: `Write a compelling investment thesis (2-3 paragraphs) for this stock. Include the core bull/bear case, key value drivers, and what makes this a timely opportunity. Be specific with metrics.`,

  companyOverview: `Write a company overview (2-3 paragraphs) covering the business model, products/services, competitive positioning (moat), market opportunity, and where the company stands in its industry. Reference specific data.`,

  valuation: `Provide a valuation analysis (2-3 paragraphs). Discuss key multiples (P/E, P/B, EV/EBITDA, P/S, PEG), how they compare to peers and historical averages, and whether the stock appears undervalued or overvalued. Be specific with the numbers provided.`,

  financials: `Summarize financial highlights (2-3 paragraphs). Cover revenue trends, earnings growth, margins (gross, operating, profit), return metrics (ROE, ROA), cash flow, and balance sheet health. Flag any notable strengths or concerns.`,

  catalysts: `Identify 4-6 specific growth catalysts that could drive the stock higher. For each catalyst, explain what it is, why it matters, and the expected timeline. Consider product launches, market expansion, industry trends, regulatory changes, and macro factors.`,

  risks: `Identify 4-6 key risks to the investment thesis. For each risk, explain the nature of the risk, its potential impact on the stock, and any mitigating factors. Consider competitive threats, regulatory risks, financial risks, macro headwinds, and execution risk.`,

  recommendation: `Provide a final investment recommendation. Include: (1) a clear Buy/Hold/Sell rating, (2) a 12-month price target with justification, (3) key metrics to watch, and (4) what would change your recommendation. Reference the analyst consensus targets provided.`,

  full: `Write a comprehensive stock pitch with the following sections. Use markdown headers (##) for each section. Be data-driven, reference specific metrics from the data provided, and be balanced in your analysis.

## Investment Thesis
Core argument (2-3 paragraphs) with specific metrics.

## Company Overview
Business model, competitive position, market opportunity (2-3 paragraphs).

## Valuation Analysis
Key multiples, peer comparison, fair value (2-3 paragraphs).

## Financial Highlights
Revenue, earnings, margins, cash flow, balance sheet (2-3 paragraphs).

## Growth Catalysts
4-6 specific catalysts with timelines.

## Key Risks
4-6 risks with impact assessment and mitigants.

## Price Target & Recommendation
Buy/Hold/Sell, 12-month target, key metrics to watch.`,
};

function buildStockContext(data: Record<string, unknown>): string {
  const d = data;
  return `
COMPANY: ${d.longName} (${d.symbol})
Sector: ${d.sector} | Industry: ${d.industry}
Description: ${d.longBusinessSummary}
Employees: ${d.fullTimeEmployees?.toLocaleString() ?? "N/A"}
HQ: ${d.city}, ${d.state}, ${d.country}

PRICE DATA:
Current Price: $${d.regularMarketPrice}
Day Change: ${d.regularMarketChange} (${d.regularMarketChangePercent}%)
52-Week Range: $${d.fiftyTwoWeekLow} - $${d.fiftyTwoWeekHigh}
Market Cap: $${((d.marketCap as number) / 1e9)?.toFixed(2) ?? "N/A"}B
Volume: ${d.regularMarketVolume?.toLocaleString() ?? "N/A"}
Beta: ${d.beta}

VALUATION:
Trailing P/E: ${d.trailingPE} | Forward P/E: ${d.forwardPE}
PEG Ratio: ${d.pegRatio}
Price/Book: ${d.priceToBook} | Price/Sales: ${d.priceToSalesTrailing12Months}
EV: $${((d.enterpriseValue as number) / 1e9)?.toFixed(2) ?? "N/A"}B
EV/Revenue: ${d.enterpriseToRevenue} | EV/EBITDA: ${d.enterpriseToEbitda}

FINANCIALS:
Revenue: $${((d.totalRevenue as number) / 1e9)?.toFixed(2) ?? "N/A"}B
Revenue/Share: $${d.revenuePerShare}
Revenue Growth: ${((d.revenueGrowth as number) * 100)?.toFixed(1) ?? "N/A"}%
Earnings Growth: ${((d.earningsGrowth as number) * 100)?.toFixed(1) ?? "N/A"}%
Gross Margin: ${((d.grossMargins as number) * 100)?.toFixed(1) ?? "N/A"}%
Operating Margin: ${((d.operatingMargins as number) * 100)?.toFixed(1) ?? "N/A"}%
Profit Margin: ${((d.profitMargins as number) * 100)?.toFixed(1) ?? "N/A"}%
EBITDA Margin: ${((d.ebitdaMargins as number) * 100)?.toFixed(1) ?? "N/A"}%
ROE: ${((d.returnOnEquity as number) * 100)?.toFixed(1) ?? "N/A"}%
ROA: ${((d.returnOnAssets as number) * 100)?.toFixed(1) ?? "N/A"}%
EPS (Trailing): $${d.trailingEps} | EPS (Forward): $${d.forwardEps}

BALANCE SHEET & CASH FLOW:
Total Debt: $${((d.totalDebt as number) / 1e9)?.toFixed(2) ?? "N/A"}B
Total Cash: $${((d.totalCash as number) / 1e9)?.toFixed(2) ?? "N/A"}B
Debt/Equity: ${d.debtToEquity}
Current Ratio: ${d.currentRatio} | Quick Ratio: ${d.quickRatio}
Free Cash Flow: $${((d.freeCashflow as number) / 1e9)?.toFixed(2) ?? "N/A"}B
Operating Cash Flow: $${((d.operatingCashflow as number) / 1e9)?.toFixed(2) ?? "N/A"}B

DIVIDENDS:
Dividend Yield: ${((d.dividendYield as number) * 100)?.toFixed(2) ?? "N/A"}%
Payout Ratio: ${((d.payoutRatio as number) * 100)?.toFixed(1) ?? "N/A"}%
Ex-Dividend Date: ${d.exDividendDate ?? "N/A"}

OWNERSHIP:
Insider Ownership: ${((d.heldPercentInsiders as number) * 100)?.toFixed(1) ?? "N/A"}%
Institutional Ownership: ${((d.heldPercentInstitutions as number) * 100)?.toFixed(1) ?? "N/A"}%
Shares Short: ${(d.sharesShort as number)?.toLocaleString() ?? "N/A"} (Short Ratio: ${d.shortRatio})

ANALYST CONSENSUS:
Price Targets: Low $${d.targetLowPrice} | Mean $${d.targetMeanPrice} | Median $${d.targetMedianPrice} | High $${d.targetHighPrice}
Recommendation: ${d.recommendationKey} (${d.recommendationMean}/5)
# Analysts: ${d.numberOfAnalystOpinions}
Next Earnings: ${d.earningsDate ?? "N/A"}
`.trim();
}

const VALID_SECTIONS = new Set(Object.keys(SECTION_PROMPTS));
const MAX_EXISTING_CONTENT_LENGTH = 50_000;

function isValidStockData(value: unknown): value is Record<string, unknown> {
  if (value == null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const d = value as Record<string, unknown>;
  return typeof d.symbol === "string" && d.symbol.trim().length > 0 && d.symbol.length <= 10;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (body == null || typeof body !== "object") {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { section, stockData, existingContent } = body;

    if (!section || typeof section !== "string") {
      return new Response(
        JSON.stringify({ error: "section is required and must be a string" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!VALID_SECTIONS.has(section)) {
      return new Response(
        JSON.stringify({ error: "Invalid section", validSections: Array.from(VALID_SECTIONS) }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!isValidStockData(stockData)) {
      return new Response(
        JSON.stringify({ error: "stockData is required and must be an object with a non-empty symbol (max 10 chars)" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const existingStr =
      existingContent != null && typeof existingContent === "string"
        ? existingContent.slice(0, MAX_EXISTING_CONTENT_LENGTH)
        : undefined;

    const stockContext = buildStockContext(stockData);

    let userMessage = `Here is the comprehensive stock data:\n\n${stockContext}\n\n${SECTION_PROMPTS[section]}`;
    if (existingStr) {
      userMessage += `\n\nHere is the current draft for reference (improve upon it):\n${existingStr}`;
    }

    const client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });

    const stream = await client.messages.stream({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4096,
      system: `You are an expert equity research analyst writing professional stock pitches. Write in a clear, authoritative, data-driven style. Use specific numbers from the data provided. Format with markdown. Do NOT include any preamble or meta-commentary — just write the section content directly.`,
      messages: [{ role: "user", content: userMessage }],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(
                encoder.encode(
                  `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
                )
              );
            }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: "Stream error" })}\n\n`
            )
          );
          controller.close();
          console.error("Pitch stream error:", error);
        }
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Pitch generate error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate pitch content" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
