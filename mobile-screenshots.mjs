// Mobile full-page screenshots using Playwright's iPhone 14 Pro profile
// (viewport, UA, touch, deviceScaleFactor — not just a narrow desktop window).
//
// First time: npm run playwright:install
// Then: npm run dev (another terminal), then: npm run screenshots:mobile
// Deployed preview: PLAYWRIGHT_BASE_URL=https://globalfin.vercel.app npm run screenshots:mobile
//
// If `browserType.launch` says the executable is missing, ensure you run via
// npm scripts (they unset PLAYWRIGHT_BROWSERS_PATH so Chromium isn't stuck on a
// stale sandbox path from the IDE).

import fs from "node:fs";
import path from "node:path";
import { chromium, devices } from "playwright";

const BASE =
  process.env.PLAYWRIGHT_BASE_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:3000";

/** Main surfaces + representative subsections (see Sidebar / Navbar). */
const PAGES = [
  "/",
  "/dashboard",
  "/charting",
  "/macro",
  "/macro/interest-rates",
  "/macro/inflation",
  "/equities",
  "/equities/indices",
  "/equities/sectors",
  "/equities/deal-flow",
  "/equities/earnings",
  "/fixed-income",
  "/fixed-income/yield-curve",
  "/fixed-income/government",
  "/alternatives",
  "/alternatives/real-estate",
  "/supply-chain",
  "/supply-chain/trade",
  "/research",
  "/research/fund-letters",
  "/research/super-investors",
  "/portfolio",
  "/portfolio?tab=watchlist",
  "/portfolio/performance",
  "/portfolio/allocation",
  "/portfolio/risk",
  "/analysis",
  "/analysis?tab=valuation",
  "/screener",
  "/stocks",
  "/allocation",
  "/alerts",
  "/calendar",
  "/models",
  "/models/dcf",
  "/models/comps",
  "/filings",
  "/pitch",
  "/investing",
  "/account",
];

const delayMs = (ms) => new Promise((r) => setTimeout(r, ms));

function routeToFile(route) {
  if (route === "/") return "home.png";
  const slug = route
    .replace(/^\//, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "page"}.png`;
}

const outDir = path.join(process.cwd(), "screenshots");
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  ...devices["iPhone 14 Pro"],
});

for (const route of PAGES) {
  const page = await context.newPage();
  try {
    await page.goto(`${BASE}${route}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    await delayMs(2000);
    const file = path.join(outDir, routeToFile(route));
    await page.screenshot({ path: file, fullPage: true });
    console.log(`✓ ${route} → ${path.relative(process.cwd(), file)}`);
  } finally {
    await page.close();
  }
}

await context.close();
await browser.close();
