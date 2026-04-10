"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

export function useTour(autoStart = false) {
  const { data: session } = useSession();
  const tourRef = useRef<unknown>(null);

  async function startTour() {
    const Shepherd = (await import("shepherd.js")).default;
    await import("shepherd.js/dist/css/shepherd.css");

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: { enabled: true },
        classes: "gcm-tour-step",
        scrollTo: { behavior: "smooth", block: "center" },
        buttons: [
          {
            text: "Skip tour",
            action() {
              localStorage.setItem("gcm_tour_seen", "true");
              this.cancel();
            },
            classes: "gcm-tour-skip",
          },
          {
            text: "Next →",
            action() {
              this.next();
            },
            classes: "gcm-tour-next",
          },
        ],
      },
    });

    tour.addSteps([
      {
        id: "welcome",
        title: "Welcome to Global Capital Markets HQ",
        text: "This quick tour covers the main features. It takes about 2 minutes. You can skip at any time.",
        buttons: [
          {
            text: "Skip",
            action() {
              localStorage.setItem("gcm_tour_seen", "true");
              this.cancel();
            },
            classes: "gcm-tour-skip",
          },
          {
            text: "Start tour →",
            action() {
              this.next();
            },
            classes: "gcm-tour-next",
          },
        ],
      },
      {
        id: "dashboard",
        title: "Dashboard",
        text: "Your command centre. Live macro indicators, global indices, yield curve, currencies, and market news — all updated in real time from FRED and US Treasury data.",
        attachTo: { element: 'a[href="/"]', on: "bottom" },
      },
      {
        id: "supply-chain",
        title: "Supply Chain (unique to GCM HQ)",
        text: "Explore semiconductor and AI supply chain layers — from EDA software to foundries to end chips. See live prices, moat analysis, and dependency graphs. No other platform has this.",
        attachTo: { element: 'a[href="/supply-chain"]', on: "bottom" },
      },
      {
        id: "research",
        title: "Research",
        text: "Curated investing ideas, top analyst picks with buy/sell ratings, recent upgrades and downgrades, and live market news — all in one page.",
        attachTo: { element: 'a[href="/research"]', on: "bottom" },
      },
      {
        id: "stocks",
        title: "Stock Analysis",
        text: "Search any ticker for a full breakdown — overview, valuation checks, financials, DCF forecast, analyst targets, SEC filings, dividends, and insider transactions. Data sourced from Yahoo Finance, FMP, and SEC EDGAR.",
        attachTo: { element: 'a[href="/stocks"]', on: "bottom" },
      },
      {
        id: "models",
        title: "Financial Models",
        text: "Build professional DCF, Comparable Companies, and LBO models with live data pre-filled. Edit any assumption and export to Excel. This is analyst-grade tooling — free.",
        attachTo: { element: 'a[href="/models"]', on: "bottom" },
      },
      {
        id: "pitch",
        title: "AI Pitch Builder",
        text: "Generate a full investment memo for any stock — thesis, valuation, catalysts, risks, and recommendation — using Claude AI. Export to Word or Excel in one click.",
        attachTo: { element: 'a[href="/pitch"]', on: "bottom" },
      },
      {
        id: "portfolio",
        title: "Portfolio Tracker",
        text: "Track your holdings with live P&L, a performance chart, and full allocation breakdown by sector and geography. Add a watchlist to monitor stocks you're following.",
        attachTo: { element: 'a[href="/portfolio"]', on: "bottom" },
      },
      {
        id: "fixed-income",
        title: "Fixed Income",
        text: "Monitor the live US Treasury yield curve sourced directly from the US Treasury, credit spreads, sovereign yields, and money market rates.",
        attachTo: { element: 'a[href="/fixed-income"]', on: "bottom" },
      },
      {
        id: "alternatives",
        title: "Alternatives",
        text: "Commodities, REITs, housing data, and global macro — including World Bank GDP, inflation, and unemployment data across 8 major economies.",
        attachTo: { element: 'a[href="/alternatives"]', on: "bottom" },
      },
      {
        id: "alerts",
        title: "Price Alerts",
        text: "Set price targets on any stock and get notified when they're hit. You can also set sentiment alerts that trigger when Twitter/X sentiment turns majority bearish.",
        attachTo: { element: 'a[href="/alerts"]', on: "bottom" },
      },
      {
        id: "done",
        title: "You're ready",
        text: "That's the full platform. Start by searching a stock you know, or head to Research to find your first idea. You can relaunch this tour any time from the nav menu.",
        buttons: [
          {
            text: "Go to dashboard",
            action() {
              localStorage.setItem("gcm_tour_seen", "true");
              this.complete();
              window.location.href = "/";
            },
            classes: "gcm-tour-next",
          },
        ],
      },
    ]);

    tourRef.current = tour;
    tour.start();
  }

  useEffect(() => {
    if (!autoStart || !session) return;
    const seen = localStorage.getItem("gcm_tour_seen");
    if (!seen) {
      // Small delay so the dashboard has time to render
      // before the tour tries to attach to nav elements
      const timer = setTimeout(() => startTour(), 1200);
      return () => clearTimeout(timer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, autoStart]);

  return { startTour };
}
