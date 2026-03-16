import { NextRequest, NextResponse } from "next/server";

import { summarizeFilingText } from "@/lib/filingSummary";

type FilingFormType = "10-K" | "10-Q";

function bufferToString(buffer: ArrayBuffer): string {
  return new TextDecoder("utf-8").decode(buffer);
}

async function extractTextFromFile(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "txt") {
    return bufferToString(arrayBuffer);
  }

  if (ext === "html" || ext === "htm") {
    const raw = bufferToString(arrayBuffer);
    return raw
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/\s+/g, " ")
      .trim();
  }

  // Basic fallback: treat as text
  return bufferToString(arrayBuffer);
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "Expected multipart/form-data" },
        { status: 400 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const filingType = formData.get("filingType");
    const symbol = formData.get("symbol")?.toString() || undefined;
    const companyName = formData.get("companyName")?.toString() || undefined;
    const period = formData.get("period")?.toString() || undefined;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "file is required" },
        { status: 400 },
      );
    }

    if (typeof filingType !== "string" || !["10-K", "10-Q"].includes(filingType)) {
      return NextResponse.json(
        { error: "filingType must be '10-K' or '10-Q'" },
        { status: 400 },
      );
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 10 MB)" },
        { status: 400 },
      );
    }

    const text = await extractTextFromFile(file);

    const summary = await summarizeFilingText({
      filingText: text,
      meta: {
        filingType: filingType as FilingFormType,
        companyName,
        symbol,
        period,
      },
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("filings/upload error:", error);
    return NextResponse.json(
      { error: "Failed to process uploaded filing" },
      { status: 500 },
    );
  }
}

