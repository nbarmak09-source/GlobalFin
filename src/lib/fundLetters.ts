// TODO: replace static data with a CMS or DB-backed endpoint

export type FundLetterQ = "Q1" | "Q2" | "Q3" | "Q4" | "Annual" | "H1" | "H2"

export type FundLetterStrategy = "Value" | "Long/Short" | "Event-Driven" | "Credit" | "Growth"

export interface FundLetter {
  fund: string
  manager: string
  quarter: string
  year: number
  q: FundLetterQ
  strategy: FundLetterStrategy
  url: string
}

export const FUND_LETTERS: FundLetter[] = [
  // ── BERKSHIRE HATHAWAY (Warren Buffett) ─────────────────────
  {
    fund: "Berkshire Hathaway",
    manager: "Warren Buffett",
    quarter: "Annual 2024",
    year: 2024,
    q: "Annual",
    strategy: "Value",
    url: "https://www.berkshirehathaway.com/2024ar/2024ar.pdf",
  },
  {
    fund: "Berkshire Hathaway",
    manager: "Warren Buffett",
    quarter: "Annual 2023",
    year: 2023,
    q: "Annual",
    strategy: "Value",
    url: "https://www.berkshirehathaway.com/2023ar/2023ar.pdf",
  },
  {
    fund: "Berkshire Hathaway",
    manager: "Warren Buffett",
    quarter: "Annual 2022",
    year: 2022,
    q: "Annual",
    strategy: "Value",
    url: "https://www.berkshirehathaway.com/2022ar/2022ar.pdf",
  },

  // ── PERSHING SQUARE (Bill Ackman) — verified assets + legacy annual ──
  {
    fund: "Pershing Square Holdings",
    manager: "Bill Ackman",
    quarter: "Annual 2025",
    year: 2025,
    q: "Annual",
    strategy: "Event-Driven",
    url: "https://assets.pershingsquareholdings.com/wp-content/uploads/2026/02/18175039/Pershing-Square-Holdings-Ltd.-2025-Annual-Report.pdf",
  },
  {
    fund: "Pershing Square Holdings",
    manager: "Bill Ackman",
    quarter: "H1 2025",
    year: 2025,
    q: "H1",
    strategy: "Event-Driven",
    url: "https://assets.pershingsquareholdings.com/wp-content/uploads/2025/08/20192925/Pershing-Square-Holdings-Ltd.-June-2025-Interim.pdf",
  },
  {
    fund: "Pershing Square Holdings",
    manager: "Bill Ackman",
    quarter: "Annual 2024",
    year: 2024,
    q: "Annual",
    strategy: "Event-Driven",
    url: "https://assets.pershingsquareholdings.com/2025/03/14183709/Pershing-Square-Holdings-Ltd.-2024-Annual-Report-1.pdf",
  },
  {
    fund: "Pershing Square Holdings",
    manager: "Bill Ackman",
    quarter: "Annual 2023",
    year: 2023,
    q: "Annual",
    strategy: "Event-Driven",
    url: "https://www.pershingsquareholdings.com/media/2023/03/PSH-2022-Annual-Report.pdf",
  },

  // ── THIRD POINT (Dan Loeb) ──────────────────────────────────
  {
    fund: "Third Point",
    manager: "Dan Loeb",
    quarter: "Q4 2025",
    year: 2025,
    q: "Q4",
    strategy: "Event-Driven",
    url: "https://assets-malibu-life.s3.us-west-2.amazonaws.com/system/uploads/fae/file/asset/1689/Third_Point_Q4_2025_Investor_Letter_TPIL.pdf",
  },
  {
    fund: "Third Point",
    manager: "Dan Loeb",
    quarter: "Q4 2024",
    year: 2024,
    q: "Q4",
    strategy: "Event-Driven",
    url: "https://assets.thirdpointlimited.com/f/166217/x/4b18f84f6d/tpil-q4-2024-investor-letter_05022025_final.pdf",
  },
  {
    fund: "Third Point",
    manager: "Dan Loeb",
    quarter: "Q3 2024",
    year: 2024,
    q: "Q3",
    strategy: "Event-Driven",
    url: "https://www.thirdpoint.com/letters/2024-q3.pdf",
  },
  {
    fund: "Third Point",
    manager: "Dan Loeb",
    quarter: "Q2 2024",
    year: 2024,
    q: "Q2",
    strategy: "Event-Driven",
    url: "https://www.thirdpoint.com/letters/2024-q2.pdf",
  },
  {
    fund: "Third Point",
    manager: "Dan Loeb",
    quarter: "Q1 2024",
    year: 2024,
    q: "Q1",
    strategy: "Event-Driven",
    url: "https://www.thirdpoint.com/letters/2024-q1.pdf",
  },

  // ── SEQUOIA FUND (Ruane Cunniff) ───────────────────────────
  {
    fund: "Sequoia Fund",
    manager: "Ruane Cunniff",
    quarter: "Q3 2025",
    year: 2025,
    q: "Q3",
    strategy: "Growth",
    url: "https://www.sequoiafund.com/wp-content/uploads/2025/10/Sequoia-Fund-Q3-2025-Letter.pdf",
  },
  {
    fund: "Sequoia Fund",
    manager: "Ruane Cunniff",
    quarter: "Q2 2024",
    year: 2024,
    q: "Q2",
    strategy: "Growth",
    url: "https://www.sequoiafund.com/wp-content/uploads/2024/07/Q2-2024-Sequoia-Fund-Letter.pdf",
  },
  {
    fund: "Sequoia Fund",
    manager: "Ruane Cunniff",
    quarter: "Annual 2023",
    year: 2023,
    q: "Annual",
    strategy: "Growth",
    url: "https://www.sequoiafund.com/wp-content/uploads/2024/02/Year-End-2023-Sequoia-Fund-Letter.pdf",
  },
  {
    fund: "Sequoia Fund",
    manager: "Ruane, Cunniff & Goldfarb",
    quarter: "Annual 2023 · Report",
    year: 2023,
    q: "Annual",
    strategy: "Growth",
    url: "https://www.sequoiafund.com/reports/SequoiaFund_AnnualReport2023.pdf",
  },

  // ── GREENHAVEN ROAD (Scott Miller) ─────────────────────────
  {
    fund: "Greenhaven Road Capital",
    manager: "Scott Miller",
    quarter: "Q4 2024",
    year: 2024,
    q: "Q4",
    strategy: "Long/Short",
    url: "https://static1.squarespace.com/static/5498841ce4b0311b8ddc012b/t/67c1bf36804ffe58f087a896/1740750647415/Greenhaven+Road+-+2024+Q4+FINAL.pdf",
  },

  // ── GREENLIGHT CAPITAL (David Einhorn) ─────────────────────
  {
    fund: "Greenlight Capital",
    manager: "David Einhorn",
    quarter: "Q4 2025",
    year: 2025,
    q: "Q4",
    strategy: "Long/Short",
    url: "https://www.buysidedigest.com/letters/greenlight-capital-2025-q4/",
  },
  {
    fund: "Greenlight Capital",
    manager: "David Einhorn",
    quarter: "Q3 2024",
    year: 2024,
    q: "Q3",
    strategy: "Long/Short",
    url: "https://www.greenlightcapital.com/letters",
  },
  {
    fund: "Greenlight Capital",
    manager: "David Einhorn",
    quarter: "Q2 2024",
    year: 2024,
    q: "Q2",
    strategy: "Long/Short",
    url: "https://www.greenlightcapital.com/letters",
  },

  // ── GOTHAM ASSET MANAGEMENT (Joel Greenblatt) ───────────────
  {
    fund: "Gotham Asset Management",
    manager: "Joel Greenblatt",
    quarter: "Q4 2024",
    year: 2024,
    q: "Q4",
    strategy: "Value",
    url: "https://www.gothamfunds.com/insights",
  },

  // ── AKRE CAPITAL (Chuck Akre) ───────────────────────────────
  {
    fund: "Akre Capital",
    manager: "Chuck Akre",
    quarter: "Q3 2024",
    year: 2024,
    q: "Q3",
    strategy: "Growth",
    url: "https://www.akrecompounding.com/insights",
  },
  {
    fund: "Akre Capital",
    manager: "Chuck Akre",
    quarter: "Q2 2024",
    year: 2024,
    q: "Q2",
    strategy: "Growth",
    url: "https://www.akrecompounding.com/insights",
  },

  // ── GIVERNY CAPITAL (François Rochon) ───────────────────────
  {
    fund: "Giverny Capital",
    manager: "François Rochon",
    quarter: "Annual 2024",
    year: 2024,
    q: "Annual",
    strategy: "Growth",
    url: "https://www.givernycapital.com/en/letters",
  },
  {
    fund: "Giverny Capital",
    manager: "François Rochon",
    quarter: "Annual 2023",
    year: 2023,
    q: "Annual",
    strategy: "Growth",
    url: "https://www.givernycapital.com/en/letters",
  },

  // ── SEMPER AUGUSTUS (Chris Bloomstran) ─────────────────────
  {
    fund: "Semper Augustus",
    manager: "Chris Bloomstran",
    quarter: "Annual 2024",
    year: 2024,
    q: "Annual",
    strategy: "Value",
    url: "https://www.semperaugustus.com/letters",
  },
  {
    fund: "Semper Augustus",
    manager: "Chris Bloomstran",
    quarter: "Annual 2023",
    year: 2023,
    q: "Annual",
    strategy: "Value",
    url: "https://www.semperaugustus.com/letters",
  },

  // ── ROWAN STREET CAPITAL (Alex Kopco) ──────────────────────
  {
    fund: "Rowan Street Capital",
    manager: "Alex Kopco",
    quarter: "Q4 2024",
    year: 2024,
    q: "Q4",
    strategy: "Value",
    url: "https://www.rowanstreetcapital.com/letters",
  },

  // ── VOSS CAPITAL (Travis Cocke) ────────────────────────────
  {
    fund: "Voss Capital",
    manager: "Travis Cocke",
    quarter: "Q3 2024",
    year: 2024,
    q: "Q3",
    strategy: "Long/Short",
    url: "https://www.vosscapital.com/letters",
  },

  // ── JDP CAPITAL (Jeremy Deal) ───────────────────────────────
  {
    fund: "JDP Capital",
    manager: "Jeremy Deal",
    quarter: "Annual 2024",
    year: 2024,
    q: "Annual",
    strategy: "Value",
    url: "https://www.jdpcapitalmanagement.com/letters",
  },

  // ── SPRUCE POINT CAPITAL (Ben Axler) ───────────────────────
  {
    fund: "Spruce Point Capital",
    manager: "Ben Axler",
    quarter: "Q4 2024",
    year: 2024,
    q: "Q4",
    strategy: "Event-Driven",
    url: "https://www.sprucepointcap.com/research",
  },

  // ── BAUPOST GROUP (Seth Klarman) ───────────────────────────
  {
    fund: "Baupost Group",
    manager: "Seth Klarman",
    quarter: "Annual 2023",
    year: 2023,
    q: "Annual",
    strategy: "Value",
    url: "https://www.baupost.com",
  },

  // ── OAKTREE CAPITAL (Howard Marks) ─────────────────────────
  {
    fund: "Oaktree Capital",
    manager: "Howard Marks",
    quarter: "Q4 2024",
    year: 2024,
    q: "Q4",
    strategy: "Credit",
    url: "https://www.oaktreecapital.com/insights/memos",
  },
  {
    fund: "Oaktree Capital",
    manager: "Howard Marks",
    quarter: "Q3 2024",
    year: 2024,
    q: "Q3",
    strategy: "Credit",
    url: "https://www.oaktreecapital.com/insights/memos",
  },

  // ── MARKEL CORPORATION (Tom Gayner) ─────────────────────────
  {
    fund: "Markel Corporation",
    manager: "Tom Gayner",
    quarter: "Annual 2024",
    year: 2024,
    q: "Annual",
    strategy: "Value",
    url: "https://www.markel.com/investors",
  },
]
