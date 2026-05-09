export interface TourStep {
  id: string;
  tag: string; // small label above title e.g. "Navigation"
  title: string;
  icon: string; // lucide icon name as string
  description: string;
  bullets: string[];
  highlight?: string; // optional gold tip box text
  attachTo?: string; // CSS selector to highlight in nav
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: "dashboard",
    tag: "Start here",
    title: "Dashboard — Your market command centre",
    icon: "LayoutDashboard",
    description:
      "The Dashboard gives you an instant read on the global macro environment before markets open every day.",
    bullets: [
      "Live US macro indicators from FRED: Fed Funds Rate, CPI, unemployment, GDP, ISM, consumer sentiment",
      "World Bank global macro — compare GDP, inflation, and unemployment across 8 major economies",
      "Live global indices, FX rates, and US Treasury yield curve updated daily from official government sources",
    ],
    highlight:
      "Start your morning routine here. Professional analysts check macro before touching any single stock.",
    attachTo: 'a[href="/"]',
  },
  {
    id: "supply-chain",
    tag: "Unique to GlobalFin",
    title: "Supply Chain — Industrial dependency maps",
    icon: "Boxes",
    description:
      "Map the bottlenecks, moats, and competitive dynamics of key technology supply chains. No other free platform offers this.",
    bullets: [
      "Six-layer semiconductor map with live prices and moat badges: MONOPOLY, DUOPOLY, OLIGOPOLY",
      "AI ecosystem map — see which companies are Infrastructure Lords vs dependent Vassals",
      "Bottleneck heat bar shows which layers are most critical to the entire chain",
    ],
    highlight:
      "Interview tip — explaining TSMC's EUV monopoly or ASML's position in L2 is a strong differentiator in tech IB interviews.",
    attachTo: 'a[href="/supply-chain"]',
  },
  {
    id: "research",
    tag: "Idea generation",
    title: "Research — Your daily briefing",
    icon: "Search",
    description:
      "Curated investing ideas, top analyst picks sorted by conviction, and live upgrades & downgrades from major banks.",
    bullets: [
      "Preset investing ideas: Undervalued, High Growth, Dividend Powerhouses, Mega Cap, Defensive",
      "Top analyst picks with supply chain tier badges — see which picks are structural monopolies",
      "Recent upgrades & downgrades from Goldman, Morgan Stanley, Barclays, and others",
    ],
    attachTo: 'a[href="/research"]',
  },
  {
    id: "stocks",
    tag: "Single stock analysis",
    title: "Stock Analysis — 10-tab deep dive",
    icon: "CandlestickChart",
    description:
      "Search any ticker for a complete breakdown across 10 tabs. Data from Yahoo Finance, FMP, and SEC EDGAR.",
    bullets: [
      "Overview: live TradingView chart, key stats, upcoming earnings date",
      "Valuation: price vs analyst consensus fair value, six automated checks",
      "Financials: health checks, revenue trends, EPS surprises, balance sheet",
      "Forecast: analyst targets, recommendation breakdown, EPS & revenue estimates",
      "SEC Filings: direct links to every 10-K, 10-Q, 8-K, Form 4 on EDGAR",
    ],
    highlight:
      "Every financial data point links back to its original source — Yahoo Finance, FMP, or SEC EDGAR.",
    attachTo: 'a[href="/stocks"]',
  },
  {
    id: "models",
    tag: "Analyst-grade tools",
    title: "Financial Models — DCF, Comps, and LBO",
    icon: "Calculator",
    description:
      "Professional valuation models pre-filled with live data. Edit any assumption. Export to Excel.",
    bullets: [
      "DCF: 5-year FCF projection with editable WACC, margins, CapEx, terminal value",
      "Comps: build a peer group table — EV/EBITDA, P/E, EV/Revenue, margins auto-populated",
      "LBO: structure a leveraged buyout with full debt waterfall and IRR/MOIC output",
    ],
    highlight:
      "The LBO model is the most tested skill in PE and IB interviews. Practise with real company data, not textbook examples.",
    attachTo: 'a[href="/models"]',
  },
  {
    id: "pitch",
    tag: "AI-powered",
    title: "Pitch Builder — Full investment memos",
    icon: "Wand2",
    description:
      "Generate a complete investment memo for any stock using Claude AI — thesis, valuation, catalysts, risks, and recommendation.",
    bullets: [
      "Choose pitch type: Growth, Value, Special Situations, or Short thesis",
      "Generate section by section or all at once — every section is fully editable",
      "Export to Word or Excel in one click",
    ],
    highlight:
      "Use the Pitch Builder to generate a first draft, then rewrite it in your own words. The process teaches you the structure professionals use.",
    attachTo: 'a[href="/pitch"]',
  },
  {
    id: "filings",
    tag: "AI-powered",
    title: "Filings AI — Summarise any 10-K or 10-Q",
    icon: "FileText",
    description:
      "Upload any SEC filing PDF and get an AI summary covering key developments, risk factors, financial highlights, and management commentary.",
    bullets: [
      "Rapidly process earnings reports during busy results seasons",
      "Useful for comparing management commentary across multiple quarters",
    ],
    attachTo: 'a[href="/filings"]',
  },
  {
    id: "portfolio",
    tag: "Personal tracking",
    title: "Portfolio — Holdings and watchlist",
    icon: "Briefcase",
    description:
      "Track your real or paper portfolio with live P&L, a performance chart, and full allocation breakdown.",
    bullets: [
      "Privacy masking hides your figures when you're on screen — click the eye icon to reveal",
      "Performance chart with 1D, 5D, 1M, 1Y, 5Y timeframes",
      "Watchlist for stocks you're tracking but don't yet own",
      "Allocation breakdown by sector and geography",
    ],
    attachTo: 'a[href="/portfolio"]',
  },
  {
    id: "screener",
    tag: "Idea generation",
    title: "Stock Screener — Filter by fundamentals",
    icon: "Filter",
    description:
      "Filter 50 large-cap S&P 500 stocks by P/E, dividend yield, beta, revenue growth, and market cap.",
    bullets: [
      "Preset filters: Undervalued, Growth, Dividends, Strong Balance Sheet, Mega-Cap, Defensive",
      "Buy/Strong Buy analyst rating badges per row",
      "Add any screened stock to your watchlist directly from the table",
    ],
    attachTo: 'a[href="/screener"]',
  },
  {
    id: "fixed-income",
    tag: "Fixed income",
    title: "Fixed Income — Rates and credit",
    icon: "LineChart",
    description:
      "The live US Treasury yield curve, credit spreads, sovereign yields, and money market rates.",
    bullets: [
      "Yield curve sourced directly from the US Treasury — the authoritative source",
      "Credit spreads by rating category (IG vs HY)",
      "Sovereign yields for major government bond markets",
    ],
    highlight:
      "The yield curve is one of the most reliable leading indicators of recession. Know how to read it — it comes up in every macro interview.",
    attachTo: 'a[href="/fixed-income"]',
  },
  {
    id: "alerts",
    tag: "Stay informed",
    title: "Price Alerts — Never miss a move",
    icon: "Bell",
    description:
      "Set price targets on any stock and get notified when they're crossed. Also supports sentiment alerts.",
    bullets: [
      "Above or below price target alerts with optional thesis notes",
      "Sentiment alerts — trigger when Twitter/X sentiment turns majority bearish",
      "Earnings calendar to plan your research around key reporting dates",
    ],
    attachTo: 'a[href="/alerts"]',
  },
];
