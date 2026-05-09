/**
 * DEMO ONLY — Delete folder: src/app/demo-saas/
 * Open: /demo-saas
 */
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  Layers,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

const primary = "#0F172A";
const secondary = "#334155";
const cta = "#0369A1";
const muted = "#64748B";

export default function DemoSaasPage() {
  return (
    <div className="motion-safe:scroll-smooth">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow-md focus:outline focus:outline-2 focus:outline-offset-2 focus:outline-[#0369A1]"
      >
        Skip to content
      </a>

      {/* Remove hint */}
      <p className="border-b border-slate-200/80 bg-slate-100/80 px-4 py-2 text-center text-xs text-slate-600">
        Demo only — to remove: delete{" "}
        <code className="rounded bg-white/80 px-1 py-0.5 font-mono text-[11px] text-slate-800">
          src/app/demo-saas
        </code>
      </p>

      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-[#F8FAFC]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/demo-saas"
            className="flex items-center gap-2 text-lg font-semibold tracking-tight transition-opacity duration-200 hover:opacity-80"
            style={{ color: primary }}
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-xl shadow-sm ring-1 ring-slate-200/80"
              style={{ background: `linear-gradient(145deg, ${cta}, #0c4a6e)` }}
              aria-hidden
            >
              <Sparkles className="h-5 w-5 text-white" strokeWidth={1.75} />
            </span>
            Flowline
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-medium md:flex">
            <a
              href="#product"
              className="cursor-pointer transition-colors duration-200 hover:text-sky-700"
              style={{ color: secondary }}
            >
              Product
            </a>
            <a
              href="#features"
              className="cursor-pointer transition-colors duration-200 hover:text-sky-700"
              style={{ color: secondary }}
            >
              Features
            </a>
            <a
              href="#pricing"
              className="cursor-pointer transition-colors duration-200 hover:text-sky-700"
              style={{ color: secondary }}
            >
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="hidden cursor-pointer rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 hover:bg-slate-100 sm:inline-block"
              style={{ color: secondary }}
            >
              Log in
            </Link>
            <a
              href="#cta"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 motion-reduce:transition-none"
              style={{ backgroundColor: cta }}
            >
              Start free trial
              <ArrowRight className="h-4 w-4" aria-hidden />
            </a>
          </div>
        </div>
      </header>

      <main id="main">
        {/* Hero */}
        <section className="relative overflow-hidden px-4 pb-16 pt-12 sm:px-6 sm:pb-24 sm:pt-16">
          <div
            className="pointer-events-none absolute inset-0 -z-10 opacity-40"
            aria-hidden
          >
            <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-sky-200/50 blur-3xl motion-reduce:blur-none" />
            <div className="absolute -right-24 bottom-0 h-72 w-72 rounded-full bg-indigo-200/40 blur-3xl motion-reduce:blur-none" />
          </div>
          <div className="mx-auto max-w-6xl">
            <p
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-slate-200/90 bg-white/80 px-3 py-1 text-xs font-medium shadow-sm"
              style={{ color: secondary }}
            >
              <Zap className="h-3.5 w-3.5 text-amber-500" aria-hidden />
              New — Workflow automation for growing teams
            </p>
            <h1
              className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.1]"
              style={{ color: primary }}
            >
              Ship faster with clarity your whole team can see
            </h1>
            <p
              className="mt-5 max-w-2xl text-lg leading-relaxed sm:text-xl"
              style={{ color: muted }}
            >
              Flowline connects your roadmap, analytics, and customer feedback in
              one calm workspace — so decisions stay visible and momentum stays
              high.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <a
                href="#cta"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-3 text-base font-semibold text-white shadow-lg shadow-sky-900/15 transition-all duration-200 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 motion-reduce:transition-none"
                style={{ backgroundColor: cta }}
              >
                Start free trial
                <ArrowRight className="h-5 w-5" aria-hidden />
              </a>
              <a
                href="#product"
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-base font-semibold shadow-sm transition-all duration-200 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400 motion-reduce:transition-none"
                style={{ color: primary }}
              >
                Watch overview
              </a>
            </div>
            <p className="mt-4 text-sm" style={{ color: muted }}>
              No credit card · 14-day trial · SOC2-ready infrastructure
            </p>
          </div>
        </section>

        {/* Product mockup — center */}
        <section
          id="product"
          className="border-y border-slate-200/80 bg-white/60 px-4 py-16 sm:px-6"
        >
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center">
              <h2
                className="text-2xl font-bold tracking-tight sm:text-3xl"
                style={{ color: primary }}
              >
                Your command center, without the noise
              </h2>
              <p className="mt-3 text-base sm:text-lg" style={{ color: muted }}>
                A focused surface for priorities, health metrics, and what
                shipped this week.
              </p>
            </div>
            <div className="mt-12 flex justify-center">
              <div
                className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_22px_60px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5 transition-shadow duration-300 hover:shadow-[0_28px_70px_-12px_rgba(15,23,42,0.22)] motion-reduce:transition-none"
                role="img"
                aria-label="Product interface mockup"
              >
                <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                  <div className="flex gap-1.5" aria-hidden>
                    <span className="h-3 w-3 rounded-full bg-red-400/90" />
                    <span className="h-3 w-3 rounded-full bg-amber-400/90" />
                    <span className="h-3 w-3 rounded-full bg-emerald-400/90" />
                  </div>
                  <span
                    className="ml-2 flex-1 truncate text-center text-xs font-medium text-slate-500"
                    style={{ fontFamily: "ui-monospace, monospace" }}
                  >
                    app.flowline.demo / workspace
                  </span>
                </div>
                <div className="grid gap-0 md:grid-cols-[220px_1fr]">
                  <aside className="hidden border-r border-slate-100 bg-slate-50/50 p-4 md:block">
                    <div className="space-y-2 text-xs font-medium text-slate-500">
                      <div className="rounded-lg bg-white px-3 py-2 text-sky-800 shadow-sm ring-1 ring-sky-100">
                        Overview
                      </div>
                      <div className="rounded-lg px-3 py-2 hover:bg-white/80">
                        Roadmap
                      </div>
                      <div className="rounded-lg px-3 py-2 hover:bg-white/80">
                        Insights
                      </div>
                      <div className="rounded-lg px-3 py-2 hover:bg-white/80">
                        Team
                      </div>
                    </div>
                  </aside>
                  <div className="p-4 sm:p-6">
                    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p
                          className="text-xs font-semibold uppercase tracking-wide text-slate-500"
                        >
                          This week
                        </p>
                        <p
                          className="text-lg font-semibold text-slate-900"
                        >
                          Release health
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <span className="rounded-md bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-800 ring-1 ring-emerald-100">
                          On track
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          v2.4
                        </span>
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm">
                        <BarChart3
                          className="h-5 w-5 text-sky-600"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
                          94%
                        </p>
                        <p className="text-xs text-slate-500">Sprint completion</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm">
                        <Layers
                          className="h-5 w-5 text-indigo-600"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
                          12
                        </p>
                        <p className="text-xs text-slate-500">Active initiatives</p>
                      </div>
                      <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 shadow-sm">
                        <Shield
                          className="h-5 w-5 text-amber-600"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                        <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">
                          0
                        </p>
                        <p className="text-xs text-slate-500">Critical risks</p>
                      </div>
                    </div>
                    <div className="mt-4 h-28 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 ring-1 ring-slate-100/80">
                      <div className="flex h-full items-end gap-1 px-3 pb-3 pt-6">
                        {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-t-md bg-sky-500/85 motion-safe:transition-all motion-safe:duration-300 hover:bg-sky-600"
                            style={{ height: `${h}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="px-4 py-16 sm:px-6 sm:py-24">
          <div className="mx-auto max-w-6xl">
            <h2
              className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
              style={{ color: primary }}
            >
              Built for teams that outgrew spreadsheets
            </h2>
            <p
              className="mx-auto mt-3 max-w-2xl text-center text-base sm:text-lg"
              style={{ color: muted }}
            >
              Opinionated defaults, flexible workflows, and guardrails that keep
              everyone aligned.
            </p>
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  title: "Unified roadmap",
                  body: "Connect goals to shipping work so priorities never drift in silence.",
                  icon: Layers,
                },
                {
                  title: "Signals you can trust",
                  body: "Roll up usage, NPS, and revenue context next to every initiative.",
                  icon: BarChart3,
                },
                {
                  title: "Permissions that scale",
                  body: "Workspace roles, audit trails, and SSO when you are ready.",
                  icon: Shield,
                },
              ].map(({ title, body, icon: Icon }) => (
                <li
                  key={title}
                  className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_8px_30px_-12px_rgba(15,23,42,0.12)] transition-shadow duration-300 hover:shadow-[0_14px_40px_-12px_rgba(15,23,42,0.16)] motion-reduce:transition-none"
                >
                  <span
                    className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-sky-50 text-sky-800 ring-1 ring-sky-100/80"
                    aria-hidden
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </span>
                  <h3
                    className="mt-4 text-lg font-semibold"
                    style={{ color: primary }}
                  >
                    {title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: muted }}>
                    {body}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Comparison / pricing */}
        <section
          id="pricing"
          className="border-t border-slate-200/80 bg-white/70 px-4 py-16 sm:px-6 sm:py-20"
        >
          <div className="mx-auto max-w-4xl">
            <h2
              className="text-center text-2xl font-bold tracking-tight sm:text-3xl"
              style={{ color: primary }}
            >
              Simple plans
            </h2>
            <p
              className="mx-auto mt-3 max-w-xl text-center text-base"
              style={{ color: muted }}
            >
              Demo numbers — swap for your real tiers when you ship for real.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-[#F8FAFC] p-6 sm:p-8">
                <p className="text-sm font-semibold text-slate-600">Starter</p>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tabular-nums text-slate-900">
                    $29
                  </span>
                  <span className="text-slate-500">/ seat / mo</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm" style={{ color: secondary }}>
                  {[
                    "Up to 15 teammates",
                    "Core integrations",
                    "Email support",
                  ].map((t) => (
                    <li key={t} className="flex gap-2">
                      <Check
                        className="h-5 w-5 shrink-0 text-emerald-600"
                        strokeWidth={2}
                        aria-hidden
                      />
                      {t}
                    </li>
                  ))}
                </ul>
                <a
                  href="#cta"
                  className="mt-8 flex w-full cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white py-3 text-sm font-semibold text-slate-900 transition-colors duration-200 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
                >
                  Choose Starter
                </a>
              </div>
              <div
                className="relative rounded-2xl border-2 p-6 shadow-xl shadow-sky-900/10 sm:p-8"
                style={{ borderColor: cta, background: "linear-gradient(180deg, #fff 0%, #f0f9ff 100%)" }}
              >
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-sky-700 px-3 py-0.5 text-xs font-semibold text-white">
                  Most popular
                </span>
                <p className="text-sm font-semibold text-sky-900">Growth</p>
                <p className="mt-2 flex items-baseline gap-1">
                  <span className="text-4xl font-bold tabular-nums text-slate-900">
                    $79
                  </span>
                  <span className="text-slate-500">/ seat / mo</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm" style={{ color: secondary }}>
                  {[
                    "Everything in Starter",
                    "Advanced analytics",
                    "SSO + SCIM",
                    "Priority support",
                  ].map((t) => (
                    <li key={t} className="flex gap-2">
                      <Check
                        className="h-5 w-5 shrink-0 text-emerald-600"
                        strokeWidth={2}
                        aria-hidden
                      />
                      {t}
                    </li>
                  ))}
                </ul>
                <a
                  href="#cta"
                  className="mt-8 flex w-full cursor-pointer items-center justify-center rounded-xl py-3 text-sm font-semibold text-white transition-all duration-200 hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                  style={{ backgroundColor: cta }}
                >
                  Start free trial
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section
          id="cta"
          className="px-4 pb-20 pt-4 sm:px-6 sm:pb-28"
        >
          <div className="mx-auto max-w-4xl rounded-3xl bg-[#0F172A] px-6 py-12 text-center shadow-2xl shadow-slate-900/25 sm:px-10 sm:py-14">
            <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Ready to try Flowline?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-base text-slate-300">
              This is a throwaway demo page. Your real app can live here later.
            </p>
            <a
              href="#main"
              className="mt-8 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-semibold text-[#0F172A] shadow-lg transition-all duration-200 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              Back to top
              <ArrowRight className="h-5 w-5" aria-hidden />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white/80 px-4 py-10 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 sm:flex-row">
          <p className="text-sm" style={{ color: muted }}>
            © {new Date().getFullYear()} Flowline Demo — not a real product
          </p>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium">
            <a
              href="#features"
              className="cursor-pointer transition-colors duration-200 hover:text-sky-800"
              style={{ color: secondary }}
            >
              Privacy
            </a>
            <a
              href="#pricing"
              className="cursor-pointer transition-colors duration-200 hover:text-sky-800"
              style={{ color: secondary }}
            >
              Terms
            </a>
            <Link
              href="/"
              className="cursor-pointer text-sky-800 underline-offset-4 transition-colors duration-200 hover:underline"
            >
              Back to GlobalFin
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
