import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import ResearchPageClient from "@/components/research/ResearchPageClient";

export const metadata: Metadata = {
  title: "Research | Capital Markets Hub",
  description:
    "Discover investing ideas, top analyst picks, upgrades and downgrades, and market news.",
};

function ResearchFallback() {
  return (
    <div className="flex items-center justify-center py-24 gap-2 text-muted">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Loading research…</span>
    </div>
  );
}

export default function ResearchPage() {
  return (
    <Suspense fallback={<ResearchFallback />}>
      <ResearchPageClient />
    </Suspense>
  );
}
