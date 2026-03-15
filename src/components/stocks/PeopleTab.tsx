"use client";

import type { QuoteSummaryData } from "@/lib/types";
import { User } from "lucide-react";

function formatPay(val: number | undefined): string {
  if (val == null || val === 0) return "—";
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(0)}K`;
  return `$${val.toLocaleString()}`;
}

export default function PeopleTab({ data }: { data: QuoteSummaryData }) {
  const officers = data.companyOfficers;

  if (officers.length === 0) {
    return (
      <div className="text-center py-16 text-muted">
        <User className="h-12 w-12 mx-auto mb-4 opacity-30" />
        <p className="text-lg mb-1">No People Data</p>
        <p className="text-sm">
          Executive information is not available for this company.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl bg-card border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Key Executives
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-xs text-muted uppercase tracking-wider">
                <th className="text-left py-2.5 px-4">Name</th>
                <th className="text-left py-2.5 px-4">Title</th>
                <th className="text-right py-2.5 px-4">Age</th>
                <th className="text-right py-2.5 px-4">Total Pay</th>
                <th className="text-right py-2.5 px-4">Exercised Value</th>
                <th className="text-right py-2.5 px-4">Unexercised Value</th>
              </tr>
            </thead>
            <tbody>
              {officers.map((officer, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border/50 hover:bg-card-hover transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-accent" />
                      </div>
                      <span className="font-medium">{officer.name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-muted">{officer.title}</td>
                  <td className="py-3 px-4 text-right font-mono">
                    {officer.age || "—"}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {formatPay(officer.totalPay)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {formatPay(officer.exercisedValue)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono">
                    {formatPay(officer.unexercisedValue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <div className="text-xs text-muted mb-1">Total Executives</div>
          <div className="text-2xl font-bold font-mono">{officers.length}</div>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <div className="text-xs text-muted mb-1">Avg Age</div>
          <div className="text-2xl font-bold font-mono">
            {officers.filter((o) => o.age).length > 0
              ? Math.round(
                  officers
                    .filter((o) => o.age)
                    .reduce((sum, o) => sum + (o.age || 0), 0) /
                    officers.filter((o) => o.age).length
                )
              : "—"}
          </div>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <div className="text-xs text-muted mb-1">Insider Ownership</div>
          <div className="text-2xl font-bold font-mono">
            {data.heldPercentInsiders
              ? `${(data.heldPercentInsiders * 100).toFixed(2)}%`
              : "N/A"}
          </div>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <div className="text-xs text-muted mb-1">Institutional</div>
          <div className="text-2xl font-bold font-mono">
            {data.heldPercentInstitutions
              ? `${(data.heldPercentInstitutions * 100).toFixed(2)}%`
              : "N/A"}
          </div>
        </div>
      </div>
    </div>
  );
}
