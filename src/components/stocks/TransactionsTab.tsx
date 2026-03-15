"use client";

import type { QuoteSummaryData } from "@/lib/types";
import { ArrowUpRight, ArrowDownRight, Users } from "lucide-react";

function formatShares(val: number): string {
  if (Math.abs(val) >= 1e6) return `${(val / 1e6).toFixed(2)}M`;
  if (Math.abs(val) >= 1e3) return `${(val / 1e3).toFixed(1)}K`;
  return val.toLocaleString();
}

function formatCurrency(val: number | undefined): string {
  if (val == null || val === 0) return "—";
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

export default function TransactionsTab({
  data,
}: {
  data: QuoteSummaryData;
}) {
  const nspa = data.netSharePurchaseActivity;
  const transactions = data.insiderTransactions;

  if (transactions.length === 0 && !nspa) {
    return (
      <div className="text-center py-16 text-muted">
        <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg mb-1">No Insider Transaction Data</p>
        <p className="text-sm">
          No recent insider trading activity found for this stock.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {nspa && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-xl bg-card border border-border p-4 text-center">
            <ArrowUpRight className="h-5 w-5 mx-auto text-green mb-2" />
            <div className="text-xs text-muted mb-1">Buy Transactions</div>
            <div className="text-lg font-bold font-mono text-green">
              {nspa.buyInfoCount}
            </div>
            <div className="text-xs text-muted">
              {formatShares(nspa.buyInfoShares)} shares
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border p-4 text-center">
            <ArrowDownRight className="h-5 w-5 mx-auto text-red mb-2" />
            <div className="text-xs text-muted mb-1">Sell Transactions</div>
            <div className="text-lg font-bold font-mono text-red">
              {nspa.sellInfoCount}
            </div>
            <div className="text-xs text-muted">
              {formatShares(nspa.sellInfoShares)} shares
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border p-4 text-center">
            <div className="text-xs text-muted mb-1 mt-7">Net Activity</div>
            <div
              className={`text-lg font-bold font-mono ${
                nspa.netInfoShares >= 0 ? "text-green" : "text-red"
              }`}
            >
              {nspa.netInfoShares >= 0 ? "+" : ""}
              {formatShares(nspa.netInfoShares)}
            </div>
            <div className="text-xs text-muted">
              {nspa.netInfoCount} transactions
            </div>
          </div>

          <div className="rounded-xl bg-card border border-border p-4 text-center">
            <div className="text-xs text-muted mb-1 mt-7">Total Insider Shares</div>
            <div className="text-lg font-bold font-mono">
              {formatShares(nspa.totalInsiderShares)}
            </div>
          </div>
        </div>
      )}

      {transactions.length > 0 && (
        <div className="rounded-xl bg-card border border-border overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
              Recent Insider Transactions
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
                  <th className="text-left py-2.5 px-4">Date</th>
                  <th className="text-left py-2.5 px-4">Insider</th>
                  <th className="text-left py-2.5 px-4">Relation</th>
                  <th className="text-left py-2.5 px-4">Transaction</th>
                  <th className="text-right py-2.5 px-4">Shares</th>
                  <th className="text-right py-2.5 px-4">Value</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t, idx) => {
                  const isBuy =
                    t.transactionText?.toLowerCase().includes("purchase") ||
                    t.transactionText?.toLowerCase().includes("buy") ||
                    t.shares > 0;
                  return (
                    <tr
                      key={idx}
                      className="border-b border-border/50 hover:bg-card-hover transition-colors"
                    >
                      <td className="py-2.5 px-4 text-muted">{t.startDate}</td>
                      <td className="py-2.5 px-4 font-medium">
                        {t.filerName}
                      </td>
                      <td className="py-2.5 px-4 text-muted text-xs">
                        {t.filerRelation}
                      </td>
                      <td className="py-2.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            isBuy
                              ? "bg-green/10 text-green"
                              : "bg-red/10 text-red"
                          }`}
                        >
                          {t.transactionText || (isBuy ? "Purchase" : "Sale")}
                        </span>
                      </td>
                      <td
                        className={`py-2.5 px-4 text-right font-mono ${
                          t.shares > 0 ? "text-green" : "text-red"
                        }`}
                      >
                        {t.shares > 0 ? "+" : ""}
                        {formatShares(t.shares)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono">
                        {formatCurrency(t.value)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
