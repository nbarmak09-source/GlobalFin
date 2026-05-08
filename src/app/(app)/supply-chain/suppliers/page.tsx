import type { Metadata } from "next";
import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import SupplyChainPage from "@/components/supply-chain/SupplyChainPage";

export const metadata: Metadata = {
  title: "Supply chain — Suppliers | Capital Markets Hub",
  description: "Semiconductor supplier ecosystem and dependency map.",
};

function Fallback() {
  return (
    <div className="flex items-center justify-center py-24 gap-2 text-muted">
      <Loader2 className="h-5 w-5 animate-spin" />
      <span className="text-sm">Loading supply chain…</span>
    </div>
  );
}

export default function SupplyChainSuppliersPage() {
  return (
    <Suspense fallback={<Fallback />}>
      <SupplyChainPage defaultIndustry="semiconductors" />
    </Suspense>
  );
}
