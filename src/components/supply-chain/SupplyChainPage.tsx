"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Cpu, Flame } from "lucide-react";
import SemiconductorView from "@/components/supply-chain/SemiconductorView";
import OilGasView from "@/components/supply-chain/OilGasView";

interface Industry {
  id: string;
  label: string;
  icon: React.ReactNode;
  disabled?: boolean;
}

const INDUSTRIES: Industry[] = [
  {
    id: "semiconductors",
    label: "Semiconductors",
    icon: <Cpu className="h-4 w-4" />,
  },
  {
    id: "oil-gas",
    label: "Oil & Gas",
    icon: <Flame className="h-4 w-4" />,
  },
];

function parseIndustry(raw: string | null): string {
  if (raw && INDUSTRIES.some((i) => i.id === raw && !i.disabled)) return raw;
  return "semiconductors";
}

export default function SupplyChainPage({
  defaultIndustry,
}: {
  /** Used when there is no `?industry=` query (e.g. sidebar sub-routes). */
  defaultIndustry?: string;
} = {}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const fromQuery = searchParams.get("industry");
  const activeIndustry = parseIndustry(fromQuery ?? defaultIndustry ?? null);

  function setIndustry(id: string) {
    router.replace(`/supply-chain?industry=${id}`, { scroll: false });
  }

  return (
    <div className="space-y-5 min-w-0">
      <header>
        <h1 className="text-xl sm:text-2xl font-bold font-serif mb-1">Supply Chain</h1>
        <p className="text-sm text-muted max-w-3xl">
          Explore supply chain layers, ecosystem dependencies, and capital
          relationships across key industries.
        </p>
      </header>

      {/* Industry tab bar */}
      <div className="flex items-center gap-1 rounded-lg bg-card border border-border p-0.5 w-fit flex-wrap">
        {INDUSTRIES.map((ind) => (
          <button
            key={ind.id}
            type="button"
            disabled={ind.disabled}
            onClick={() => !ind.disabled && setIndustry(ind.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              activeIndustry === ind.id
                ? "bg-accent text-white"
                : "text-muted hover:text-foreground"
            }`}
          >
            {ind.icon}
            {ind.label}
          </button>
        ))}
      </div>

      {/* Industry content */}
      {activeIndustry === "semiconductors" && <SemiconductorView />}
      {activeIndustry === "oil-gas" && <OilGasView />}
    </div>
  );
}
