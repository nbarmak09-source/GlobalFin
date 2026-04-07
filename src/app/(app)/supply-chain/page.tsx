import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import SupplyChainPage from "@/components/supply-chain/SupplyChainPage";

export const metadata: Metadata = {
  title: "Supply Chain | Global Capital Markets HQ",
  description:
    "Explore supply chain layers and AI ecosystem dependencies across key industries.",
};

function SupplyChainFallback() {
  return (
    <div className="flex items-center justify-center py-24 gap-2 text-muted">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Loading supply chain…</span>
    </div>
  );
}

export default function SupplyChainRoute() {
  return (
    <Suspense fallback={<SupplyChainFallback />}>
      <SupplyChainPage />
    </Suspense>
  );
}
