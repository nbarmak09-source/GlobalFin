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
        className="w-full max-w-[400px] rounded-2xl border border-[#2d333b] p-8 shadow-2xl"
        style={{ background: "#13161d" }}
      >
        <div className="flex justify-center">
          <div
            className="flex h-[52px] w-[52px] items-center justify-center rounded-full"
            style={{ background: "rgba(34,197,94,0.12)" }}
          >
            <Check className="h-7 w-7 text-emerald-400" strokeWidth={2.5} />
          </div>
        </div>

        <h2
          id="tour-complete-title"
          className="mt-5 text-center font-serif text-xl font-semibold text-[#e8e6e1]"
        >
          You&apos;re ready to go.
        </h2>
        <p className="mt-2 text-center text-sm leading-relaxed text-[#8b949e]">
          You&apos;ve seen the key features. Start with a stock you know, or head to Research to find
          your first idea.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <Link
            href="/stocks"
            onClick={onDone}
            className="rounded-xl border border-[#2d333b] px-3 py-3 text-center text-xs font-medium text-[#e8e6e1] transition-colors hover:bg-[#1c2128]"
            style={{ background: "#1c2128" }}
          >
            Search a ticker →
          </Link>
          <Link
            href="/research"
            onClick={onDone}
            className="rounded-xl border border-[#2d333b] px-3 py-3 text-center text-xs font-medium text-[#e8e6e1] transition-colors hover:bg-[#252b33]"
            style={{ background: "#1c2128" }}
          >
            Research page →
          </Link>
          <Link
            href="/models"
            onClick={onDone}
            className="rounded-xl border border-[#2d333b] px-3 py-3 text-center text-xs font-medium text-[#e8e6e1] transition-colors hover:bg-[#252b33]"
            style={{ background: "#1c2128" }}
          >
            Tools → Models
          </Link>
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("gcm_tour_seen");
              openWelcome();
            }}
            className="rounded-xl border border-[#2d333b] px-3 py-3 text-center text-xs font-medium text-[#e8e6e1] transition-colors hover:bg-[#252b33]"
            style={{ background: "#1c2128" }}
          >
            Menu → Take a tour
          </button>
        </div>

        <button
          type="button"
          onClick={() => {
            onDone();
            router.push("/");
          }}
          className="mt-6 w-full rounded-lg py-3 text-sm font-semibold text-[#0c0e14] transition-opacity hover:opacity-95"
          style={{ background: "#c9a227" }}
        >
          Go to dashboard
        </button>
      </div>
    </div>
  );
}
