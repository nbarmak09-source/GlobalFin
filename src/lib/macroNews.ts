import type { RssFeed } from "@/lib/rssFeeds";
import { fetchRssArticles } from "@/lib/rssFeeds";
import type { NewsArticle } from "@/lib/types";

/** Diversified macro sources — no Yahoo Finance. */
export const MACRO_RSS_FEEDS: RssFeed[] = [
  {
    url: "https://fredblog.stlouisfed.org/feed/",
    source: "FRED Blog (St. Louis Fed)",
  },
  {
    url: "https://libertystreeteconomics.newyorkfed.org/rss.xml",
    source: "Liberty Street Economics (NY Fed)",
  },
  {
    url: "https://feeds.marketwatch.com/marketwatch/topstories/",
    source: "MarketWatch",
  },
  {
    url: "https://blogs.worldbank.org/rss",
    source: "World Bank Blogs",
  },
  {
    url: "https://feeds.bbci.co.uk/news/business/rss.xml",
    source: "BBC Business",
  },
  {
    url: "https://www.theguardian.com/us/business/rss",
    source: "The Guardian",
  },
];

export const MACRO_NEWS_TOPICS = [
  "overview",
  "inflation",
  "employment",
  "gdp",
  "rates",
  "currency",
  "commodities",
] as const;

export type MacroNewsTopic = (typeof MACRO_NEWS_TOPICS)[number];

const TOPIC_PATTERNS: Record<MacroNewsTopic, RegExp> = {
  overview:
    /\b(federal reserve|the fed|fomc|inflation|cpi|pce|gdp|economy|economic|employment|unemployment|labor market|interest rate|treasury|yield|recession|growth|monetary policy|central bank|consumer|producer)\b/i,
  inflation:
    /\b(inflation|cpi|pce|consumer price|price(s)?\s+(rise|pressure|growth)|deflation|stagflation|core inflation|price index|purchasing power)\b/i,
  /** Overridden by `matchesUsEmployment` — kept for typing only. */
  employment: /.^/,
  gdp:
    /\b(gdp|gross domestic|economic growth|recession|expansion|output|slowdown|bea|world bank|growth rate|contraction)\b/i,
  rates:
    /\b(interest rate|fed funds|treasury|yield(\s+curve)?|fomc|rate\s+(cut|hike)|bond[s]?|monetary policy|mortgage rate|powell|borrowing cost)\b/i,
  currency:
    /\b(dollar|dxy|\bfx\b|forex|yen|euro|yuan|renminbi|pound sterling|exchange rate|currency|currencies|fx market|emerging market)\b/i,
  commodities:
    /\b(oil|crude|opec|gold|silver|copper|commodit(y|ies)|natural gas|wheat|grain|energy price|metals|lithium)\b/i,
};

const FED_US_LABOR_SOURCES = new Set([
  "FRED Blog (St. Louis Fed)",
  "Liberty Street Economics (NY Fed)",
]);

/** Strong US labor-market or official-stats cues (levels, reports, claims). */
const US_LABOR_CONTEXT =
  /\b(u\.s\.?|usa\b|united states|america['’]s|american(s)?\s+(jobs?|workers?|workforce|employment|unemployment|economy|companies|firms|labor))\b|\b\bu\.s\.\s+(jobs?|labor|payroll|employment|unemployment|economy|workforce)\b|\bnon[- ]farm|nonfarm\b|\bnfp\b|\bjolts\b|\b(initial|jobless|continuing)\s+claims\b|\bbureau\s+of\s+labor\b|\bbls\b.*\b(jobs?|employment|unemployment|payroll)\b|\bus\s+(payrolls?|hiring|layoffs)\b|\bstateside\b|\bdomestic\s+(hiring|jobs?|employment)\b/i;

/**
 * Large-scale hiring, new facilities, or project-linked job counts (still US-skewed via
 * guardian US / marketwatch / “american” in loose pass).
 */
const US_PROJECT_JOB_CREATION =
  /\b(create|creates|creating|created|adds?|adding|added|bring(?:s|ing)?|plan(?:s|ned|ning)?\s+to)\b[\s\S]{0,55}\b(jobs?|workers?|positions?|roles?|staff|hiring|workforce)\b|\b(jobs?|workers?|hiring|workforce|positions?)\b[\s\S]{0,70}\b(plant|factory|facility|foundry|mill|campus|headquarters|\bhq\b|expansion|greenfield|investment\s+of|semiconductor|chip\s|battery|electric\s+vehicle|\bev\s|data\s+center|megaproject|manufacturing\s+(site|hub)|supply\s+chain\s+hub)\b|\b\d[\d,]{0,8}\+?\s*(new\s+)?jobs\b|\bthousands?\s+of\s+jobs\b|\b(tens|hundreds)\s+of\s+thousands\s+of\s+jobs\b|\bmajor\s+(employer|hiring\s+push)\b|\bfactory\s+(jobs?|announcement|opening)\b/i;

/** Core employment / labor content (any geography before US filter). */
const EMPLOYMENT_CORE =
  /\b(employment|unemployment|underemployment|jobs?\s+(report|data|growth|loss|cuts?)|payrolls?|labor market|\blabor\b|workforce|work[- ]?stoppage|to\s+hire|hiring|hires?|hired|layoffs?|jobless|redundan\w*|jolts|nfp|non[- ]farm|wages?|wage\s+growth|hourly\s+earnings|gig\s+work|union|strik(e|ing)|worker\s+shortage|openings?\b|\bquit\s+rate\b)\b/i;

const NON_US_GEO_HINT =
  /\b(eurozone|european\s+union|\beu\b(?!\s+invest)|united kingdom|\buk\b|britain|germany|france|italy|spain|japan\s+economy|\btokyo\b(?!\s+drift)|china['’]s\s+(workers|jobs)|india['’]s\s+(workers|jobs)|latin\s+america|sub-saharan|middle\s+east(?!\s+oil\s+jobs)|brexit)\b/i;

function matchesUsEmployment(a: NewsArticle): boolean {
  const t = `${a.title} ${a.summary}`;
  const tLower = t.toLowerCase();

  if (!EMPLOYMENT_CORE.test(tLower)) return false;

  if (a.source === "World Bank Blogs" && !US_LABOR_CONTEXT.test(tLower)) {
    return false;
  }

  if (US_LABOR_CONTEXT.test(tLower) || US_PROJECT_JOB_CREATION.test(tLower)) {
    return true;
  }

  if (FED_US_LABOR_SOURCES.has(a.source)) {
    if (NON_US_GEO_HINT.test(tLower)) return false;
    return true;
  }

  if (
    a.source === "MarketWatch" ||
    a.source === "The Guardian"
  ) {
    return (
      US_PROJECT_JOB_CREATION.test(tLower) ||
      /\b(us|u\.s\.|american|wall street|silicon valley|nasdaq|dow|s&p|federal\s+reserve|congress|white house)\b/i.test(
        tLower
      )
    );
  }

  if (a.source === "BBC Business") {
    return (
      US_LABOR_CONTEXT.test(tLower) ||
      (/\bu\.s\.|united states|american\s+jobs/i.test(t) &&
        EMPLOYMENT_CORE.test(tLower))
    );
  }

  return false;
}

const PRIORITY_SOURCES = new Set([
  "FRED Blog (St. Louis Fed)",
  "Liberty Street Economics (NY Fed)",
  "World Bank Blogs",
]);

const TOPIC_LOOSE: Partial<Record<MacroNewsTopic, RegExp>> = {
  commodities:
    /\b(energy|trade|supply chain|farm|crop|mining|metal|shipping|middle east|opec|inflation)\b/i,
  currency:
    /\b(trade|export|import|central bank|asia|europe|emerging|investor|forex|stocks|bond)\b/i,
  /** Second pass: US state / region names near labor words (still vetted by `matchesUsEmployment`). */
  employment:
    /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington(?!\s+post)|west virginia|wisconsin|wyoming|appalachia|rust belt|sun belt|midwest)\b.{0,96}\b(jobs?|hiring|unemployment|labor|payroll|workers?|factory|plant)\b|\b(jobs?|hiring|unemployment|labor|payroll|factory|plant)\b.{0,96}\b(alabama|california|texas|ohio|michigan|arizona|georgia|florida|tennessee|south carolina|north carolina|indiana|wisconsin)\b/i,
};

function textBlob(a: NewsArticle): string {
  return `${a.title} ${a.summary}`.toLowerCase();
}

function matchesTopic(a: NewsArticle, topic: MacroNewsTopic): boolean {
  if (topic === "employment") return matchesUsEmployment(a);
  return TOPIC_PATTERNS[topic].test(textBlob(a));
}

export async function collectMacroNews(
  topic: MacroNewsTopic
): Promise<NewsArticle[]> {
  const raw = await fetchRssArticles(MACRO_RSS_FEEDS);

  let picked = raw.filter((a) => matchesTopic(a, topic));

  if (picked.length < 8) {
    const loose = TOPIC_LOOSE[topic];
    if (loose) {
      const seen = new Set(picked.map((a) => a.link));
      const more = raw.filter(
        (a) =>
          !seen.has(a.link) &&
          loose.test(textBlob(a)) &&
          matchesTopic(a, topic)
      );
      picked = [...picked, ...more];
    }
  }

  if (picked.length < 8) {
    const seen = new Set(picked.map((a) => a.link));
    const backfill = raw.filter(
      (a) => !seen.has(a.link) && PRIORITY_SOURCES.has(a.source)
    );
    const vetted =
      topic === "employment"
        ? backfill.filter((a) => matchesUsEmployment(a))
        : backfill;
    picked = [...picked, ...vetted];
  }

  if (picked.length < 6 && topic !== "employment") {
    const seen = new Set(picked.map((a) => a.link));
    const rest = raw.filter((a) => !seen.has(a.link));
    picked = [...picked, ...rest];
  }

  if (picked.length < 6 && topic === "employment") {
    const seen = new Set(picked.map((a) => a.link));
    const more = raw.filter(
      (a) =>
        !seen.has(a.link) &&
        EMPLOYMENT_CORE.test(textBlob(a)) &&
        matchesUsEmployment(a)
    );
    picked = [...picked, ...more];
  }

  const dedup = new Map<string, NewsArticle>();
  for (const a of picked) {
    if (!a.link || !a.title) continue;
    if (!dedup.has(a.link)) dedup.set(a.link, a);
  }

  return Array.from(dedup.values())
    .sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
    )
    .slice(0, 18);
}

export function isMacroNewsTopic(s: string): s is MacroNewsTopic {
  return (MACRO_NEWS_TOPICS as readonly string[]).includes(s);
}
