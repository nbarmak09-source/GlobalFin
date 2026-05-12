export interface TourStep {
  id: string;
  tag: string;
  title: string;
  icon: string; // lucide icon name as string
  description: string;
  bullets: string[];
  highlight?: string;
  attachTo?: string; // CSS selector to spotlight in the sidebar
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
    attachTo: 'a[href="/dashboard"]',
  },
  {
    id: "macro",
    tag: "Global economics",
    title: "Macro — Deep-dive economic data",
    icon: "Globe",
    description:
      "Six dedicated macro sections covering every major economic driver — from central bank rates to commodity prices.",
    bullets: [
      "Interest Rates: Fed funds rate, central bank decisions, and global rate comparisons",
      "Inflation: CPI, PCE, and producer price trends across major economies",
      "GDP & Growth: quarterly GDP, growth rates, and global economic comparisons",
      "Employment: payrolls, unemployment rate, and labour market health indicators",
      "Currency: DXY, major FX crosses, and purchasing power comparisons",
      "Commodities: oil, gold, and agricultural commodity price trends",
    ],
    highlight:
      "Macro awareness separates generalist analysts from sector specialists. Every interview will test whether you can connect rates, growth, and valuations.",
    attachTo: 'a[href="/macro"]',
  },
  {
    id: "equities",
    tag: "Market intelligence",
    title: "Equities — Live market dashboard",
    icon: "TrendingUp",
    description:
      "Track the full equity market from global indices to sector rotation, deal flow, earnings, and breaking news — all in one hub.",
    bullets: [
      "Market Overview: live global indices and market breadth snapshot",
      "Sector Performance: which sectors are leading and lagging today",
      "Deal Flow: IPOs, secondary offerings, and M&A activity",
      "Earnings Calendar: upcoming results and historical earnings surprises",
      "News: breaking market news across all covered equities",
    ],
    attachTo: 'a[href="/equities"]',
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
      "Corporate Bonds: investment-grade and high-yield issuance and pricing",
      "Credit spreads by rating category (IG vs HY)",
      "Sovereign yields for major government bond markets",
    ],
    highlight:
      "The yield curve is one of the most reliable leading indicators of recession. Know how to read it — it comes up in every macro interview.",
    attachTo: 'a[href="/fixed-income"]',
  },
  {
    id: "alternatives",
    tag: "Beyond equities",
    title: "Alternatives — Private markets & real assets",
    icon: "Layers",
    description:
      "Track private equity performance, real estate valuations, crypto markets, and commodity prices beyond traditional equities.",
    bullets: [
      "Private Equity: fund benchmarks, vintage returns, and key PE firm activity",
      "Real Estate: REIT performance, cap rate trends, and property market indicators",
      "Crypto: live prices, market cap, and on-chain data for major digital assets",
      "Commodities: spot prices, futures curves, and supply/demand drivers",
    ],
    attachTo: 'a[href="/alternatives"]',
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
      "Suppliers view: drill into any company's upstream and downstream dependencies",
      "Disruptions tracker: live supply-chain risk events and trade flow shifts",
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
      "Curated investing ideas, top analyst picks sorted by conviction, fund letters from top managers, and super-investor 13F filings.",
    bullets: [
      "Discover: preset investing ideas — Undervalued, High Growth, Dividend Powerhouses, Mega Cap, Defensive",
      "Top analyst picks with supply chain tier badges — see which picks are structural monopolies",
      "Fund Letters: read original letters from Buffett, Ackman, Einhorn, and dozens of other top managers",
      "Super Investors: browse 13F filings to see exactly what Berkshire, Pershing Square, and others hold",
      "Recent upgrades & downgrades from Goldman, Morgan Stanley, Barclays, and others",
    ],
    attachTo: 'a[href="/research"]',
  },
  {
    id: "analysis",
    tag: "Single stock analysis",
    title: "Stock Analysis — 9-tab deep dive",
    icon: "CandlestickChart",
    description:
      "Search any ticker for a complete breakdown across 9 tabs. Data from Yahoo Finance, FMP, and SEC EDGAR.",
    bullets: [
      "Overview: live TradingView chart, key stats, and upcoming earnings date",
      "Bulls & Bears: structured bull and bear case with supporting data points",
      "Valuation: price vs analyst consensus fair value, six automated checks",
      "Financials: revenue trends, EPS surprises, and balance sheet health",
      "Forecast: analyst targets, recommendation breakdown, EPS & revenue estimates",
      "Compare: side-by-side peer comparison across key metrics",
      "Solvency & SEC Filings: debt ratios and direct links to every 10-K, 10-Q, 8-K on EDGAR",
    ],
    highlight:
      "Every financial data point links back to its original source — Yahoo Finance, FMP, or SEC EDGAR.",
    attachTo: 'a[href="/analysis"]',
  },
  {
    id: "charting",
    tag: "Technical analysis",
    title: "Charting — Advanced price charts",
    icon: "BarChart3",
    description:
      "Professional-grade interactive charts with full technical indicator support for any listed security.",
    bullets: [
      "Multi-timeframe charts from intraday to decade-long views",
      "Technical indicators: moving averages, RSI, MACD, Bollinger Bands, and more",
      "Draw trend lines, support/resistance, and annotate directly on the chart",
      "Compare multiple tickers on the same chart to spot relative performance",
    ],
    attachTo: 'a[href="/charting"]',
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
    attachTo: 'a[href="/models"]',
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
      "Extract risk factors, guidance, and key management commentary in seconds",
      "Useful for comparing tone and language shifts across multiple quarters",
    ],
    attachTo: 'a[href="/models"]',
  },
  {
    id: "portfolio",
    tag: "Personal tracking",
    title: "Portfolio — Holdings, performance, and allocation",
    icon: "Briefcase",
    description:
      "Track your real or paper portfolio with live P&L, full allocation breakdown, risk metrics, and a watchlist.",
    bullets: [
      "Privacy masking hides your figures when you're on screen — click the eye icon to reveal",
      "Performance chart with 1D, 5D, 1M, 1Y, 5Y timeframes",
      "Allocation analytics by sector and geography",
      "Risk tab: portfolio beta, volatility, and drawdown metrics",
      "Watchlist for stocks you're tracking but don't yet own",
    ],
    attachTo: 'a[href="/portfolio"]',
  },
  {
    id: "alerts",
    tag: "Stay informed",
    title: "Price Alerts — Never miss a move",
    icon: "Bell",
    description:
      "Set price targets on any stock and get notified the moment they are crossed — above or below.",
    bullets: [
      "Above or below price target alerts — set the exact level you want to be notified at",
      "Optional thesis note on each alert so you remember why you set it",
      "Active and triggered alerts tracked separately so you can review what fired",
    ],
    attachTo: 'a[href="/alerts"]',
  },
];
