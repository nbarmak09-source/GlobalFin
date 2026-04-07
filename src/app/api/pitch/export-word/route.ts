import { NextRequest, NextResponse } from "next/server";
import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  PageBreak,
  NumberFormat,
} from "docx";

const SECTION_META = [
  { key: "thesis", label: "Investment Thesis" },
  { key: "companyOverview", label: "Company Overview" },
  { key: "valuation", label: "Valuation Analysis" },
  { key: "financials", label: "Financial Highlights" },
  { key: "catalysts", label: "Growth Catalysts" },
  { key: "risks", label: "Key Risks" },
  { key: "recommendation", label: "Price Target & Recommendation" },
] as const;

function pct(v?: number) {
  return v != null ? `${(v * 100).toFixed(1)}%` : "N/A";
}
function bn(v?: number) {
  return v != null ? `$${(v / 1e9).toFixed(2)}B` : "N/A";
}
function fmt(v?: number, dec = 2) {
  return v != null ? v.toFixed(dec) : "N/A";
}
function usd(v?: number) {
  return v != null ? `$${v.toFixed(2)}` : "N/A";
}

/** Strip markdown syntax for plain text rendering in Word */
function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .trim();
}

/**
 * Convert a markdown section into Word Paragraphs.
 * Handles: ### headings, **bold**, bullet lists (-/*)
 */
function markdownToParagraphs(text: string): Paragraph[] {
  if (!text.trim()) return [];
  const paras: Paragraph[] = [];
  const lines = text.split("\n");

  for (const raw of lines) {
    const line = raw;

    // Heading lines
    if (/^#{1,6}\s/.test(line)) {
      const content = line.replace(/^#{1,6}\s+/, "");
      paras.push(
        new Paragraph({
          text: stripMarkdown(content),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 160, after: 80 },
        })
      );
      continue;
    }

    // Bullet list lines
    if (/^[-*+]\s/.test(line)) {
      const content = line.replace(/^[-*+]\s+/, "");
      const runs = buildInlineRuns(content);
      paras.push(
        new Paragraph({
          children: runs,
          bullet: { level: 0 },
          spacing: { after: 60 },
        })
      );
      continue;
    }

    // Numbered list lines
    if (/^\d+\.\s/.test(line)) {
      const content = line.replace(/^\d+\.\s+/, "");
      const runs = buildInlineRuns(content);
      paras.push(
        new Paragraph({
          children: runs,
          numbering: { reference: "default-numbering", level: 0 },
          spacing: { after: 60 },
        })
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      paras.push(new Paragraph({ text: "", spacing: { after: 60 } }));
      continue;
    }

    // Normal paragraph with inline formatting
    paras.push(
      new Paragraph({
        children: buildInlineRuns(line),
        spacing: { after: 100 },
      })
    );
  }

  return paras;
}

/** Split a markdown inline string into TextRun objects handling **bold** and *italic* */
function buildInlineRuns(text: string): TextRun[] {
  const runs: TextRun[] = [];
  // tokenize on **bold**, *italic*, or plain text
  const regex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    // plain text before this token
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: text.slice(lastIndex, match.index), size: 22 }));
    }
    const token = match[0];
    if (token.startsWith("**")) {
      runs.push(new TextRun({ text: token.slice(2, -2), bold: true, size: 22 }));
    } else {
      runs.push(new TextRun({ text: token.slice(1, -1), italics: true, size: 22 }));
    }
    lastIndex = match.index + token.length;
  }
  if (lastIndex < text.length) {
    runs.push(new TextRun({ text: text.slice(lastIndex), size: 22 }));
  }
  return runs.length > 0 ? runs : [new TextRun({ text, size: 22 })];
}

function metricRow(label: string, value: string): TableRow {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true, size: 20 })] })],
        width: { size: 45, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: "F5F5F5" },
      }),
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: value, size: 20 })] })],
        width: { size: 55, type: WidthType.PERCENTAGE },
      }),
    ],
  });
}

interface StockData {
  symbol: string;
  longName?: string;
  shortName?: string;
  sector?: string;
  industry?: string;
  regularMarketPrice?: number;
  marketCap?: number;
  totalRevenue?: number;
  revenueGrowth?: number;
  grossMargins?: number;
  operatingMargins?: number;
  profitMargins?: number;
  ebitdaMargins?: number;
  returnOnEquity?: number;
  returnOnAssets?: number;
  trailingEps?: number;
  forwardEps?: number;
  trailingPE?: number;
  forwardPE?: number;
  pegRatio?: number;
  priceToBook?: number;
  priceToSalesTrailing12Months?: number;
  enterpriseValue?: number;
  enterpriseToRevenue?: number;
  enterpriseToEbitda?: number;
  totalDebt?: number;
  totalCash?: number;
  debtToEquity?: number;
  currentRatio?: number;
  freeCashflow?: number;
  operatingCashflow?: number;
  beta?: number;
  dividendYield?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  targetLowPrice?: number;
  targetMeanPrice?: number;
  targetHighPrice?: number;
  recommendationKey?: string;
  numberOfAnalystOpinions?: number;
  heldPercentInsiders?: number;
  heldPercentInstitutions?: number;
  earningsGrowth?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid body" }, { status: 400 });
    }

    const { stockData, sections } = body as {
      stockData: StockData;
      sections: Record<string, string>;
    };

    if (!stockData?.symbol) {
      return NextResponse.json({ error: "stockData required" }, { status: 400 });
    }

    const companyName = stockData.longName ?? stockData.shortName ?? stockData.symbol;
    const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

    const docChildren: (Paragraph | Table)[] = [];

    // ── Cover Page ─────────────────────────────────────────────────────────
    docChildren.push(
      new Paragraph({
        children: [new TextRun({ text: companyName, bold: true, size: 56, color: "1A1A2E" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 2400, after: 240 },
      }),
      new Paragraph({
        children: [new TextRun({ text: `(${stockData.symbol})`, size: 36, color: "555555" })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 480 },
      }),
      new Paragraph({
        children: [new TextRun({ text: "INVESTMENT PITCH", bold: true, size: 28, color: "C47A1E", allCaps: true })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 240 },
        border: {
          top: { style: BorderStyle.SINGLE, size: 8, color: "C47A1E" },
          bottom: { style: BorderStyle.SINGLE, size: 8, color: "C47A1E" },
        },
      }),
      new Paragraph({
        children: [new TextRun({ text: today, size: 22, color: "888888" })],
        alignment: AlignmentType.CENTER,
        spacing: { before: 480, after: 240 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `${stockData.sector ?? ""} · ${stockData.industry ?? ""}`, size: 22, color: "888888" }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 3600 },
      }),
      // Page break after cover
      new Paragraph({ children: [new PageBreak()] }),
    );

    // ── Quick Stats Table ──────────────────────────────────────────────────
    docChildren.push(
      new Paragraph({
        text: "Key Statistics",
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 400, after: 200 },
      }),
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Metric", bold: true, size: 20 })] })],
                shading: { type: ShadingType.CLEAR, fill: "1A1A2E" },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Value", bold: true, size: 20, color: "FFFFFF" })] })],
                shading: { type: ShadingType.CLEAR, fill: "1A1A2E" },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Metric", bold: true, size: 20, color: "FFFFFF" })] })],
                shading: { type: ShadingType.CLEAR, fill: "1A1A2E" },
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Value", bold: true, size: 20, color: "FFFFFF" })] })],
                shading: { type: ShadingType.CLEAR, fill: "1A1A2E" },
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Price", bold: true, size: 20 })] })], shading: { type: ShadingType.CLEAR, fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: usd(stockData.regularMarketPrice), size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Market Cap", bold: true, size: 20 })] })], shading: { type: ShadingType.CLEAR, fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: bn(stockData.marketCap), size: 20 })] })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Trailing P/E", bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(stockData.trailingPE), size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Forward P/E", bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(stockData.forwardPE), size: 20 })] })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "EV/EBITDA", bold: true, size: 20 })] })], shading: { type: ShadingType.CLEAR, fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(stockData.enterpriseToEbitda), size: 20 })] })], shading: { type: ShadingType.CLEAR, fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Revenue", bold: true, size: 20 })] })], shading: { type: ShadingType.CLEAR, fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: bn(stockData.totalRevenue), size: 20 })] })], shading: { type: ShadingType.CLEAR, fill: "F5F5F5" } }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Gross Margin", bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: pct(stockData.grossMargins), size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Op. Margin", bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: pct(stockData.operatingMargins), size: 20 })] })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "52W High", bold: true, size: 20 })] })], shading: { type: ShadingType.CLEAR, fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: usd(stockData.fiftyTwoWeekHigh), size: 20 })] })], shading: { type: ShadingType.CLEAR, fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "52W Low", bold: true, size: 20 })] })], shading: { type: ShadingType.CLEAR, fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: usd(stockData.fiftyTwoWeekLow), size: 20 })] })], shading: { type: ShadingType.CLEAR, fill: "F5F5F5" } }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Beta", bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: fmt(stockData.beta), size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Div Yield", bold: true, size: 20 })] })] }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: pct(stockData.dividendYield), size: 20 })] })] }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Analyst Target (Mean)", bold: true, size: 20 })] })], shading: { type: ShadingType.CLEAR, fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: usd(stockData.targetMeanPrice), size: 20 })] })], shading: { type: ShadingType.CLEAR, fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Recommendation", bold: true, size: 20 })] })], shading: { type: ShadingType.CLEAR, fill: "F5F5F5" } }),
              new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: stockData.recommendationKey?.toUpperCase() ?? "N/A", size: 20 })] })], shading: { type: ShadingType.CLEAR, fill: "F5F5F5" } }),
            ],
          }),
        ],
      }),
      new Paragraph({ text: "", spacing: { after: 400 } }),
    );

    void metricRow;

    // ── Pitch Sections ─────────────────────────────────────────────────────
    for (const { key, label } of SECTION_META) {
      const content = sections[key] ?? "";
      if (!content.trim()) continue;

      docChildren.push(
        new Paragraph({
          text: label,
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 480, after: 200 },
          border: {
            bottom: { style: BorderStyle.SINGLE, size: 6, color: "C47A1E" },
          },
        }),
        ...markdownToParagraphs(content),
      );
    }

    // ── Disclaimer ─────────────────────────────────────────────────────────
    docChildren.push(
      new Paragraph({ children: [new PageBreak()] }),
      new Paragraph({
        text: "Disclaimer",
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 400, after: 160 },
      }),
      new Paragraph({
        children: [
          new TextRun({
            text: "This document is generated using AI-assisted analysis and live market data for informational purposes only. It does not constitute investment advice or a solicitation to buy or sell any security. Past performance is not indicative of future results. All projections and estimates involve risk and uncertainty. Investors should conduct their own due diligence and consult a licensed financial advisor before making any investment decisions.",
            size: 18,
            color: "888888",
            italics: true,
          }),
        ],
        spacing: { after: 200 },
      }),
      new Paragraph({
        children: [
          new TextRun({ text: `Generated: ${today}`, size: 18, color: "AAAAAA" }),
        ],
      }),
    );

    const doc = new Document({
      numbering: {
        config: [
          {
            reference: "default-numbering",
            levels: [
              {
                level: 0,
                format: NumberFormat.DECIMAL,
                text: "%1.",
                alignment: AlignmentType.LEFT,
              },
            ],
          },
        ],
      },
      styles: {
        paragraphStyles: [
          {
            id: "Normal",
            name: "Normal",
            run: { font: "Calibri", size: 22 },
          },
          {
            id: "Heading1",
            name: "Heading 1",
            run: { font: "Calibri", size: 28, bold: true, color: "1A1A2E" },
            paragraph: { spacing: { before: 480, after: 200 } },
          },
          {
            id: "Heading2",
            name: "Heading 2",
            run: { font: "Calibri", size: 24, bold: true, color: "333333" },
            paragraph: { spacing: { before: 320, after: 160 } },
          },
          {
            id: "Heading3",
            name: "Heading 3",
            run: { font: "Calibri", size: 22, bold: true, color: "555555" },
            paragraph: { spacing: { before: 200, after: 100 } },
          },
        ],
      },
      sections: [
        {
          properties: {
            page: {
              margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 },
            },
          },
          children: docChildren,
        },
      ],
    });

    const nodeBuffer = await Packer.toBuffer(doc);
    const buffer = nodeBuffer.buffer.slice(nodeBuffer.byteOffset, nodeBuffer.byteOffset + nodeBuffer.byteLength) as ArrayBuffer;
    const filename = `${stockData.symbol}_pitch_${new Date().toISOString().slice(0, 10)}.docx`;

    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("Word export error:", err);
    return NextResponse.json({ error: "Failed to generate Word document" }, { status: 500 });
  }
}
