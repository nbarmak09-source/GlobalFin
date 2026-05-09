# Mobile screenshot review prompt

Copy everything below the line into your AI assistant (or human reviewer). Attach the bundle from **`npm run pack:mobile-review`** (a `.tar.gz` with PNGs + this file — no secrets, not `.zip`) or attach all files from `screenshots/` directly.

---

You are reviewing **mobile full-page screenshots** of a Next.js app captured at **iPhone 14 Pro** dimensions (Playwright device profile: viewport, mobile UA, touch, DPR). Each image filename maps to a route (e.g. `fixed-income-yield-curve.png` → `/fixed-income/yield-curve`, `portfolio-tab-watchlist.png` → `/portfolio?tab=watchlist`).

## Your job

1. **Inventory** – For each screenshot, note the route (infer from filename if needed) and whether the page looks **usable on mobile** or **broken / rough**.
2. **Issues** – List concrete problems with **severity** (blocker / major / minor / polish).
3. **Fixes** – For each issue, suggest **what to change** (layout, component, CSS, copy, empty state, loading) and **where** to look in a typical Next.js repo (e.g. page shell, shared layout, table → card conversion, `overflow`, `min-w-0`, sticky headers).

## What to check (mobile-first)

- **Layout:** horizontal scroll, clipped content, overlapping fixed/sticky bars, columns that should stack, tables wider than the viewport.
- **Touch:** buttons/links too small or too close; hit areas missing padding.
- **Typography:** illegible sizes, truncation without expand, huge headings vs tiny body.
- **Navigation:** bottom nav covered by content; drawer/modal cut off; safe-area not respected (notch/home indicator).
- **Visual hierarchy:** walls of text; missing section spacing; charts/legends unreadable.
- **States:** obvious loading spinners forever; empty states that look like errors; error messages not wrapped.
- **Consistency:** same pattern broken on one route only (regression candidate).
- **Accessibility hints from pixels only:** contrast that looks too low; control labels missing (only where visible).

## Output format

Use this structure:

```markdown
## Summary
- Routes OK: …
- Routes need work: …

## Issues (route → severity)
| Route | Screenshot file | Severity | Problem | Suggested fix |
|-------|-----------------|----------|---------|---------------|
| … | … | … | … | … |

## Quick wins
- …

## Follow-ups / needs runtime check
- … (things screenshots cannot prove: auth, API errors, interactions)
```

## Constraints

- Do **not** invent bugs you cannot see; say “unclear from screenshot” when needed.
- Prefer **actionable** fixes over generic advice (“use responsive design”).
- If the same bug appears on many pages, call it out **once** and say “likely shared layout/component.”

**Now analyze the attached screenshots and produce the review.**

---

## Optional: paste with your message

Short variant:

> I attached mobile (iPhone 14 Pro) full-page PNGs from our app; filenames match routes. Review for mobile UX bugs (overflow, touch targets, nav, typography, empty/error states). Output a table: route, file, severity, problem, suggested fix. Group recurring issues. Don’t invent issues you can’t see.
