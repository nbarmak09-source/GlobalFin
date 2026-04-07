"use client";

import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

const DiscoverTab = dynamic(
  () => import("@/components/research/DiscoverTab"),
  {
    loading: () => <PanelFallback />,
    ssr: true,
  }
);

function PanelFallback() {
  return (
    <div className="flex items-center justify-center py-20 gap-2 text-muted">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Loading…</span>
    </div>
  );
}

export default function ResearchPageClient() {
  return (
    <div className="space-y-6 min-w-0">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold font-serif mb-1">Research</h1>
        <p className="text-sm text-muted">
          Investing ideas, top analyst picks, upgrades &amp; downgrades, and
          market news.
        </p>
      </header>

      <DiscoverTab />
    </div>
  );
}
