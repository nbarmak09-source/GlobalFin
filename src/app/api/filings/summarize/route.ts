import { NextRequest, NextResponse } from "next/server";

import { fetchEdgarFilingText } from "@/lib/edgar";
import { summarizeFilingText } from "@/lib/filingSummary";

type FilingFormType = "10-K" | "10-Q";

interface SummarizeRequestBody {
  source?:
    | {
        kind: "edgar";
        symbol: string;
        formType: FilingFormType;
        year?: number;
        quarter?: 1 | 2 | 3 | 4;
      }
    | {
        kind: "text";
        text: string;
        filingType: FilingFormType;
        symbol?: string;
        companyName?: string;
        cik?: string;
        period?: string;
      };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as
      | SummarizeRequestBody
      | null;

    if (!body || typeof body !== "object" || !body.source) {
      return NextResponse.json(
        { error: "Missing or invalid source" },
        { status: 400 },
      );
    }

    const { source } = body;

    if (source.kind === "edgar") {
      if (!source.symbol || !source.formType) {
        return NextResponse.json(
          { error: "symbol and formType are required for EDGAR source" },
          { status: 400 },
        );
      }

      const { meta, text } = await fetchEdgarFilingText({
        symbol: source.symbol,
        formType: source.formType,
        year: source.year,
        quarter: source.quarter,
      });

      const summary = await summarizeFilingText({
        filingText: text,
        meta: {
          companyName: meta.companyName,
          symbol: meta.symbol,
          cik: meta.cik,
          filingType: source.formType,
          period: meta.filingDate,
        },
      });

      return NextResponse.json(summary);
    }

    if (source.kind === "text") {
      if (!source.text || !source.filingType) {
        return NextResponse.json(
          { error: "text and filingType are required for text source" },
          { status: 400 },
        );
      }

      const summary = await summarizeFilingText({
        filingText: source.text,
        meta: {
          companyName: source.companyName,
          symbol: source.symbol,
          cik: source.cik,
          filingType: source.filingType,
          period: source.period,
        },
      });

      return NextResponse.json(summary);
    }

    return NextResponse.json(
      { error: "Unsupported source kind" },
      { status: 400 },
    );
  } catch (error) {
    console.error("filings/summarize error:", error);
    return NextResponse.json(
      { error: "Failed to summarize filing" },
      { status: 500 },
    );
  }
}

