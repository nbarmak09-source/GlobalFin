"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import type { RevenueLoopEntry } from "@/lib/revenueLoopTypes";
import { fmtBn } from "@/lib/formatBn";
import RevenueLoopSankey from "@/components/revenue-loop/RevenueLoopSankey";

interface Props {
  open: boolean;
  onClose: () => void;
  loops: RevenueLoopEntry[];
  title?: string;
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function RevenueLoopDrawer({
  open,
  onClose,
  loops,
  title = "Revenue loop",
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || loops.length === 0) return null;

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[60] bg-background/70 backdrop-blur-sm"
        aria-label="Close drawer"
        onClick={onClose}
      />
      <aside
        className="fixed top-0 right-0 z-[70] h-full w-full max-w-md border-l border-border bg-card shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="revenue-loop-drawer-title"
      >
        <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border shrink-0">
          <h2
            id="revenue-loop-drawer-title"
            className="text-base font-semibold text-foreground font-serif"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-foreground p-1 rounded-md hover:bg-card-hover"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {loops.map((entry) => (
            <article
              key={entry.id}
              className="space-y-4 pb-6 border-b border-border last:border-0 last:pb-0"
            >
              <p className="text-xs font-medium text-accent uppercase tracking-wide">
                {entry.investorLabel} → {entry.investeeLabel}
              </p>

              <div className="grid grid-cols-1 gap-3">
                <div className="rounded-lg border border-border bg-background/50 px-3 py-2.5">
                  <p className="text-[10px] text-muted uppercase tracking-wide mb-1">
                    Capital out (equity)
                  </p>
                  <p className="text-sm text-foreground">
                    <span className="font-mono text-base font-semibold">
                      {fmtBn(entry.capitalOutAmountBn)}
                    </span>
                    <span className="text-muted text-xs ml-2">
                      on {formatDate(entry.capitalOutDate)}
                    </span>
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-background/50 px-3 py-2.5">
                  <p className="text-[10px] text-muted uppercase tracking-wide mb-1">
                    Revenue in (cloud/API Δ, next 12 mo)
                  </p>
                  <p className="text-sm font-mono text-base font-semibold text-foreground">
                    {fmtBn(entry.cloudSpendDelta12mBn)}
                  </p>
                  <p className="text-[11px] text-muted mt-1">
                    Spend vs. prior run-rate up {entry.spendLiftPctVsPrior}% within{" "}
                    {entry.monthsToSpendLift} mo of investment (24-mo window).
                  </p>
                </div>

                <div className="rounded-lg border border-border bg-background/50 px-3 py-2.5">
                  <p className="text-[10px] text-muted uppercase tracking-wide mb-1">
                    Net organic revenue (estimate)
                  </p>
                  <p className="text-xs text-muted mb-2">
                    Total reported revenue minus inferred round-trip recycling (
                    {entry.investeeLabel} view).
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    <span>
                      Reported:{" "}
                      <span className="font-mono font-semibold text-foreground">
                        {fmtBn(entry.reportedRevenueBn)}
                      </span>
                    </span>
                    <span>
                      Inferred loop:{" "}
                      <span className="font-mono text-red-400">
                        −{fmtBn(entry.roundTripRevenueEstimateBn)}
                      </span>
                    </span>
                    <span>
                      Organic:{" "}
                      <span className="font-mono font-semibold text-green">
                        {fmtBn(entry.organicRevenueEstimateBn)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-[10px] text-muted uppercase tracking-wide mb-2">
                  Capital flow (Sankey)
                </p>
                <div className="rounded-lg border border-border overflow-hidden bg-background/30">
                  <RevenueLoopSankey entry={entry} />
                </div>
              </div>

              {entry.notes && (
                <p className="text-xs text-muted leading-relaxed">{entry.notes}</p>
              )}
            </article>
          ))}
        </div>
      </aside>
    </>
  );
}
