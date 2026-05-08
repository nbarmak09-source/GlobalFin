"use client";

import { Calculator, Wand2, Boxes, BarChart3, Briefcase, FileText } from "lucide-react";
import { GlobalFinBrand } from "@/components/Logo";

type Props = {
  onStart: () => void;
  onSkip: () => void;
};

const FEATURES = [
  { icon: Calculator, label: "DCF · LBO · Comps models" },
  { icon: Wand2, label: "AI pitch builder" },
  { icon: Boxes, label: "Supply chain maps" },
  { icon: BarChart3, label: "Live macro data" },
  { icon: Briefcase, label: "Portfolio tracker" },
  { icon: FileText, label: "SEC filings AI" },
];

export default function WelcomeModal({ onStart, onSkip }: Props) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="gcm-welcome-title"
    >
      <div className="pointer-events-none absolute inset-0 flex justify-center pt-[12vh]">
        <div
          className="h-48 w-[min(520px,90vw)] rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(ellipse at center, var(--ring) 0%, transparent 70%)",
          }}
        />
      </div>

      <div
        className="relative w-full max-w-[520px] rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="p-8">
          <div className="mb-6 flex flex-col items-center gap-2">
            <GlobalFinBrand variant="welcome" />
          </div>

          <h1
            id="gcm-welcome-title"
            className="text-heading text-2xl font-semibold leading-tight sm:text-[1.65rem]"
            style={{ color: "var(--color-text)" }}
          >
            Welcome to your analyst workstation.
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            You now have access to live market data, financial models, AI research tools, and supply
            chain intelligence — all in one platform. This 2-minute tour covers the essentials.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-xl bg-card-hover px-3 py-3"
              >
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent/15"
                >
                  <Icon className="h-5 w-5 text-accent" strokeWidth={1.75} />
                </div>
                <span className="text-xs font-medium leading-snug text-foreground">{label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-card-hover px-8 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted">About 2 minutes</p>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onSkip}
              className="rounded-lg border border-border bg-transparent px-4 py-2.5 text-sm font-medium text-muted transition-colors duration-200 hover:border-muted hover:text-foreground cursor-pointer"
            >
              Skip for now
            </button>
            <button
              type="button"
              onClick={onStart}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-background transition-all duration-200 hover:bg-accent-hover hover:shadow-[0_0_20px_rgba(201,162,39,0.25)] cursor-pointer"
            >
              Start tour
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
