import Anthropic from "@anthropic-ai/sdk";

import type { QuoteSummaryData } from "./types";

export type FilingFormType = "10-K" | "10-Q";

export interface FilingSummaryRequestMeta {
  companyName?: string;
  symbol?: string;
  cik?: string;
  filingType: FilingFormType;
  period?: string;
}

export interface FilingSummarySection {
  title: string;
  content: string;
}

export interface FilingSummary {
  meta: FilingSummaryRequestMeta;
  highLevelSummary: string;
  keyRisks: string;
  businessOverview: string;
  financialHighlights: string;
  outlook: string;
  liquidityAndCapitalStructure: string;
}

const MAX_CHARS = 80_000;

function trimFilingText(text: string): string {
  if (text.length <= MAX_CHARS) return text;
  return text.slice(0, MAX_CHARS);
}

function buildSystemPrompt(meta: FilingSummaryRequestMeta): string {
  const parts: string[] = [
    "You are an expert equity research analyst.",
    "Summarize the following SEC filing (10-K or 10-Q) for an experienced but busy investor.",
    "Focus on material information, not boilerplate. Be objective and concise.",
    "Use clear markdown with headings and bullet points.",
    "Do NOT invent numbers that are not in the text.",
  ];

  const ctx: string[] = [];
  if (meta.companyName) ctx.push(`Company: ${meta.companyName}`);
  if (meta.symbol) ctx.push(`Ticker: ${meta.symbol}`);
  if (meta.cik) ctx.push(`CIK: ${meta.cik}`);
  ctx.push(`Filing type: ${meta.filingType}`);
  if (meta.period) ctx.push(`Period: ${meta.period}`);

  parts.push("");
  parts.push("Context:");
  parts.push(ctx.join(" | "));

  return parts.join("\n");
}

function buildUserPrompt(filingText: string): string {
  return [
    "Here is the raw text of the SEC filing.",
    "",
    "TASK:",
    "- First, provide a short executive summary (4–7 bullet points).",
    "- Then provide the following sections, clearly separated with markdown headings:",
    "  1. Business Overview",
    "  2. Financial Highlights",
    "  3. Liquidity & Capital Structure",
    "  4. Key Risks",
    "  5. Outlook & Guidance",
    "",
    "For each section, focus on what changed versus prior periods, management commentary, and any red flags.",
    "",
    "FILING TEXT:",
    trimFilingText(filingText),
  ].join("\n");
}

export async function summarizeFilingText(params: {
  filingText: string;
  meta: FilingSummaryRequestMeta;
  quoteSummary?: QuoteSummaryData | null;
}): Promise<FilingSummary> {
  const { filingText, meta } = params;

  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const system = buildSystemPrompt(meta);
  const user = buildUserPrompt(filingText);

  const resp = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system,
    messages: [
      {
        role: "user",
        content: user,
      },
    ],
  });

  const content = resp.content
    .filter((c) => c.type === "text")
    .map((c) => ("text" in c ? c.text : ""))
    .join("\n");

  const metaHeader = `Company: ${meta.companyName ?? meta.symbol ?? "N/A"} | Filing: ${
    meta.filingType
  }${meta.period ? ` | Period: ${meta.period}` : ""}`;

  const full = `# Filing Summary\n\n${metaHeader}\n\n${content}`.trim();

  return {
    meta,
    highLevelSummary: full,
    keyRisks: "",
    businessOverview: "",
    financialHighlights: "",
    outlook: "",
    liquidityAndCapitalStructure: "",
  };
}

