"use client";

import type React from "react";
import { useState } from "react";
import { Download, Loader2 } from "lucide-react";

import { useChartExport } from "@/hooks/useChartExport";

interface ChartExportButtonProps {
  chartRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  title: string;
}

export default function ChartExportButton({
  chartRef,
  filename,
  title,
}: ChartExportButtonProps) {
  const { exportChart } = useChartExport(chartRef, filename, title);
  const [exporting, setExporting] = useState(false);
  const [exported, setExported] = useState(false);

  async function handleClick() {
    setExporting(true);
    setExported(false);

    try {
      const didExport = await exportChart();
      if (didExport) {
        setExported(true);
        window.setTimeout(() => setExported(false), 1400);
      }
    } finally {
      setExporting(false);
    }
  }

  return (
    <div
      className="absolute right-2 top-2 z-10 flex items-center gap-2"
      data-chart-export-ignore
    >
      {exported && (
        <span className="rounded-md border border-border bg-card px-2 py-1 text-[11px] font-medium text-accent shadow-lg shadow-black/20">
          Exported!
        </span>
      )}
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={exporting}
        title={`Export ${title} as PNG`}
        aria-label={`Export ${title} as PNG`}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-card/90 text-muted shadow-lg shadow-black/20 transition-colors hover:bg-card-hover hover:text-foreground disabled:opacity-50"
      >
        {exporting ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Download className="h-3.5 w-3.5" />
        )}
      </button>
    </div>
  );
}
