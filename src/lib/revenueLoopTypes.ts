/** USD billions, one decimal in UI */
export interface RevenueLoopEntry {
  id: string;
  investorId: string;
  investeeId: string;
  investorLabel: string;
  investeeLabel: string;
  roundTripDetected: boolean;
  capitalOutDate: string;
  capitalOutAmountBn: number;
  monthsToSpendLift: number;
  spendLiftPctVsPrior: number;
  /** Cloud/API spend delta over the 12 months after lift begins (Revenue In proxy). */
  cloudSpendDelta12mBn: number;
  reportedRevenueBn: number;
  roundTripRevenueEstimateBn: number;
  organicRevenueEstimateBn: number;
  /** Estimated organic cloud segment revenue for the BigTech investor (same units, for investor-side views). */
  investorSegmentOrganicBn: number;
  notes: string;
}

export interface RevenueLoopsFile {
  schema: string;
  description: string;
  loops: RevenueLoopEntry[];
}
