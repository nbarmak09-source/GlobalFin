"use client"

import { useMemo, useState } from "react"
import { FileText, Search } from "lucide-react"
import type { FundLetter, FundLetterQ } from "@/lib/fundLetters"

const YEAR_OPTIONS = [2026, 2025, 2024, 2023, 2022] as const
const QUARTER_FILTER_OPTIONS: FundLetterQ[] = ["Q1", "Q2", "Q3", "Q4", "H1", "H2", "Annual"]

type YearFilter = "all" | (typeof YEAR_OPTIONS)[number]

export default function FundLettersArchiveClient({ letters }: { letters: FundLetter[] }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedYear, setSelectedYear] = useState<YearFilter>("all")
  const [selectedQuarter, setSelectedQuarter] = useState<FundLetterQ | "all">("all")

  const filteredLetters = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    return letters.filter((letter) => {
      if (q !== "" && !letter.fund.toLowerCase().includes(q) && !letter.manager.toLowerCase().includes(q)) {
        return false
      }
      if (selectedYear !== "all" && letter.year !== selectedYear) return false
      if (selectedQuarter !== "all" && letter.q !== selectedQuarter) return false
      return true
    })
  }, [letters, searchQuery, selectedYear, selectedQuarter])

  return (
    <div className="px-4 md:px-6 py-6 max-w-3xl mx-auto">
      <header className="text-center mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Fund Letters Archive</h1>
        <p className="text-[13px] text-muted mt-1 max-w-xl mx-auto">
          Curated quarterly letters from top hedge funds and investment firms
        </p>
      </header>

      <div className="w-full mb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name of fund or manager..."
            className="w-full rounded-xl border border-border bg-card pl-9 pr-4 py-2.5 text-[13px] text-foreground placeholder:text-muted outline-none focus:border-accent transition-colors"
            aria-label="Search funds and managers"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={selectedYear === "all" ? "all" : String(selectedYear)}
          onChange={(e) =>
            setSelectedYear(e.target.value === "all" ? "all" : (Number(e.target.value) as YearFilter))
          }
          className="w-40 bg-card border border-border rounded-lg px-3 py-2 text-[12px] text-foreground outline-none cursor-pointer"
          aria-label="Filter by year"
        >
          <option value="all">All Years</option>
          {YEAR_OPTIONS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={selectedQuarter}
          onChange={(e) =>
            setSelectedQuarter(e.target.value === "all" ? "all" : (e.target.value as FundLetterQ))
          }
          className="w-40 bg-card border border-border rounded-lg px-3 py-2 text-[12px] text-foreground outline-none cursor-pointer"
          aria-label="Filter by quarter"
        >
          <option value="all">All Quarters</option>
          {QUARTER_FILTER_OPTIONS.map((q) => (
            <option key={q} value={q}>
              {q}
            </option>
          ))}
        </select>
      </div>

      {filteredLetters.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2">
          <FileText className="h-8 w-8 opacity-20 text-foreground" aria-hidden />
          <p className="text-[12px] text-muted">No letters match your search</p>
        </div>
      ) : (
        <>
          <div className="md:hidden flex flex-col">
            {filteredLetters.map((letter, i) => (
              <div
                key={`${letter.fund}-${letter.quarter}-${letter.url}-${i}`}
                className="border border-border rounded-xl p-3 mb-2 flex flex-col gap-1"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-muted">
                    {letter.q} {letter.year}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent shrink-0">
                    {letter.strategy}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground break-words">{letter.fund}</p>
                <p className="text-xs text-muted break-words">{letter.manager}</p>
                <a
                  href={letter.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-accent mt-1"
                >
                  Read →
                </a>
              </div>
            ))}
          </div>

          <div className="hidden md:block rounded-xl border border-border overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-border bg-card/60">
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted font-mono whitespace-nowrap">
                    Period
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted">Fund</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted">Manager</th>
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted whitespace-nowrap">
                    Strategy
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted whitespace-nowrap">
                    &nbsp;
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLetters.map((letter, i) => (
                  <tr
                    key={`${letter.fund}-${letter.quarter}-${letter.url}-${i}`}
                    className="border-b border-border/50 last:border-b-0 hover:bg-card/40 transition-colors"
                  >
                    <td className="py-3 px-4 text-xs font-mono text-muted whitespace-nowrap align-top">
                      {letter.q} {letter.year}
                    </td>
                    <td className="py-3 px-4 font-medium text-foreground align-top">{letter.fund}</td>
                    <td className="py-3 px-4 text-muted align-top">{letter.manager}</td>
                    <td className="py-3 px-4 align-top">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent whitespace-nowrap">
                        {letter.strategy}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right align-top whitespace-nowrap">
                      <a
                        href={letter.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-accent hover:underline font-medium"
                      >
                        Read →
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
