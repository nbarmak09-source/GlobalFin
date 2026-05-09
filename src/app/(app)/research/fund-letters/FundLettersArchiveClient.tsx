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
        <ul className="border-t border-border/50">
          {filteredLetters.map((letter, i) => (
            <li
              key={`${letter.fund}-${letter.quarter}-${letter.url}-${i}`}
              className="border-b border-border/50 last:border-b-0"
            >
              <div className="px-2 py-3.5 flex items-center gap-4 hover:bg-card/40 transition-colors">
                <span
                  className="bg-accent/10 text-accent border border-accent/20 rounded-md px-2 py-0.5 text-[10px] font-semibold w-20 text-center shrink-0 leading-tight"
                  title={letter.quarter}
                >
                  {letter.quarter}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium text-foreground truncate">{letter.fund}</div>
                  <div className="text-[11px] text-muted truncate">{letter.manager}</div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-muted border border-border/50 rounded px-1.5 py-0.5 whitespace-nowrap">
                    {letter.strategy}
                  </span>
                  <span className="text-[11px] text-muted w-10 text-right tabular-nums">{letter.year}</span>
                  <a
                    href={letter.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-accent hover:underline font-medium whitespace-nowrap"
                  >
                    Read →
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
