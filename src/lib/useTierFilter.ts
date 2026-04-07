"use client";

import { useCallback, useMemo, useState } from "react";
import type { PowerTier, TierCompany } from "@/lib/tiers";
import { POWER_TIER_IDS } from "@/lib/tiers";

export interface UseTierFilterResult {
  /** Currently included tiers (multi-select). */
  selectedTiers: Set<PowerTier>;
  toggleTier: (tier: PowerTier) => void;
  setSelectedTiers: (next: Set<PowerTier>) => void;
  selectAllTiers: () => void;
  clearTiers: () => void;
  /** Companies whose tier is in `selectedTiers`. */
  filteredCompanies: TierCompany[];
  isTierSelected: (tier: PowerTier) => boolean;
}

/**
 * Multi-select filter for the AI company list (Lords / Vassals / Serfs).
 * Defaults to all tiers selected.
 */
export function useTierFilter(companies: TierCompany[]): UseTierFilterResult {
  const [selectedTiers, setSelectedTiers] = useState<Set<PowerTier>>(
    () => new Set(POWER_TIER_IDS)
  );

  const toggleTier = useCallback((tier: PowerTier) => {
    setSelectedTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
  }, []);

  const selectAllTiers = useCallback(() => {
    setSelectedTiers(new Set(POWER_TIER_IDS));
  }, []);

  const clearTiers = useCallback(() => {
    setSelectedTiers(new Set());
  }, []);

  const filteredCompanies = useMemo(
    () => companies.filter((c) => selectedTiers.has(c.tier)),
    [companies, selectedTiers]
  );

  const isTierSelected = useCallback(
    (tier: PowerTier) => selectedTiers.has(tier),
    [selectedTiers]
  );

  return {
    selectedTiers,
    toggleTier,
    setSelectedTiers,
    selectAllTiers,
    clearTiers,
    filteredCompanies,
    isTierSelected,
  };
}
