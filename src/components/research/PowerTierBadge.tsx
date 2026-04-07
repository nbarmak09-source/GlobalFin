"use client";

import type { PowerTier } from "@/lib/tiers";
import { POWER_TIER_LABELS, POWER_TIER_SHORT } from "@/lib/tiers";

const STYLES: Record<
  PowerTier,
  { className: string }
> = {
  lord: {
    className:
      "bg-[#1e3a8a] text-white border border-[#1e3a8a]",
  },
  vassal: {
    className:
      "bg-amber-500 text-neutral-900 border border-amber-600",
  },
  serf: {
    className:
      "bg-neutral-500/90 text-neutral-400 border border-neutral-600",
  },
};

interface PowerTierBadgeProps {
  tier: PowerTier;
  /** When true, show full tier name (e.g. Infrastructure Lords). */
  long?: boolean;
  className?: string;
}

export default function PowerTierBadge({
  tier,
  long = false,
  className = "",
}: PowerTierBadgeProps) {
  const { className: base } = STYLES[tier];
  const label = long ? POWER_TIER_LABELS[tier] : POWER_TIER_SHORT[tier];

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${base} ${className}`}
    >
      {label}
    </span>
  );
}
