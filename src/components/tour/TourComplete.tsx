"use client";

import Link from "next/link";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTour } from "@/lib/useTour";

type Props = {
  onDone: () => void;
};

export default function TourComplete({ onDone }: Props) {
  const router = useRouter();
  const { openWelcome } = useTour();

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center px-4"
      style={{
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(4px)",
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-complete-title"
    >
      <div
        className="w-full max-w-[400px] rounded-2xl border border-border bg-card p-8 shadow-2xl"
      >
        <div className="flex justify-center">
          <div
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full bg-emerald-500/12"
          >
            <Check className="h-7 w-7 text-emerald-400" strokeWidth={2.5} />
          </div>
        </div>

        <h2
          id="tour-complete-title"
          className="mt-5 text-center font-serif text-xl font-semibold text-foreground"
        >
          You&apos;re ready to go.
        </h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-muted">
          You&apos;ve seen the key features. Start with a stock you know, or head to Research to find
          your first idea.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Link
            href="/analysis"
            onClick={onDone}
            className="rounded-xl border border-border bg-card-hover px-3 py-3 text-center text-xs font-medium text-foreground transition-colors duration-200 hover:bg-border cursor-pointer"
          >
            Analyse a stock
          </Link>
          <Link
            href="/research"
            onClick={onDone}
            className="rounded-xl border border-border bg-card-hover px-3 py-3 text-center text-xs font-medium text-foreground transition-colors duration-200 hover:bg-border cursor-pointer"
          >
            Research ideas
          </Link>
          <Link
            href="/models"
            onClick={onDone}
            className="rounded-xl border border-border bg-card-hover px-3 py-3 text-center text-xs font-medium text-foreground transition-colors duration-200 hover:bg-border cursor-pointer"
          >
            Build a model
          </Link>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("gcm_tour_seen");
              openWelcome();
            }}
            className="rounded-xl border border-border bg-card-hover px-3 py-3 text-center text-xs font-medium text-foreground transition-colors duration-200 hover:bg-border cursor-pointer"
          >
            Restart tour
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onDone();
            router.push("/");
          }}
          className="mt-6 w-full rounded-lg bg-accent py-3 text-sm font-semibold text-background transition-all duration-200 hover:bg-accent-hover hover:shadow-[0_0_20px_rgba(201,162,39,0.25)] cursor-pointer"
        >
          Go to dashboard
        </button>
      </div>
    </div>
  );
}
