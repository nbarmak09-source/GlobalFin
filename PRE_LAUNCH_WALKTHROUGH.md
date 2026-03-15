# Pre-launch walkthrough (step by step)

Work through these steps in order. Each section matches [PRE_LAUNCH.md](./PRE_LAUNCH.md).

---

## Step 1 — Environment and configuration

**Goal:** Have all required env vars ready for production; never commit secrets.

### 1.1 Required variables (you must set these in production)

| Variable | Where to get it | Production value |
|----------|----------------|------------------|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string (Session mode pooler, port 5432) | `postgres://postgres.[ref]:[password]@[region].pooler.supabase.com:5432/postgres` |
| `NEXTAUTH_URL` | Your live app URL | `https://yourdomain.com` (must be HTTPS in prod) |
| `NEXTAUTH_SECRET` | Generate locally | Run: `openssl rand -base64 32` and paste the output |
| `RESEND_API_KEY` | [resend.com](https://resend.com) → API Keys | `re_...` (so verification emails work) |

**Action:** Create a list (in a password manager or secure note) with these four names and the values you’ll use in production. Do not put the values in the repo.

### 1.2 Optional variables (features work without them, but degraded)

- `FRED_API_KEY` — [fred.stlouisfed.org](https://fred.stlouisfed.org/docs/api/api_key.html) — macro indicators on dashboard.
- `ANTHROPIC_API_KEY` — [console.anthropic.com](https://console.anthropic.com) — chat and pitch generation.
- `EMAIL_FROM` — Your verified sender in Resend (e.g. `noreply@yourdomain.com`).
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — Google OAuth.
- `GITHUB_ID` / `GITHUB_SECRET` — GitHub OAuth.

**Action:** Decide which optional features you want at launch and get those keys.

### 1.3 Confirm secrets are not in the repo

- [ ] `.env` and `.env.local` are in `.gitignore` (they are: `.env*` with `!.env.example`).
- [ ] You have never committed a file that contains real `DATABASE_URL`, `NEXTAUTH_SECRET`, or API keys.
- [ ] If you use a host (Vercel, Railway, etc.), you will set these in the host’s **Environment variables** UI, not in code.

**You’re done with Step 1 when:** You have a list of env vars and values (or a plan to add them in the host UI) and you’ve confirmed no secrets are in the repo.

---

## Step 2 — Build and database

**Goal:** App builds cleanly and the production DB has the correct schema.

### 2.1 Build

Run in the project root:

```bash
npm run build
```

- [ ] Build completes with **exit code 0** (no TypeScript or build errors).

If it fails, fix the reported errors and run `npm run build` again.

### 2.2 Migrations on production DB

Use the **same** `DATABASE_URL` you will use in production (or a staging DB with the same schema).

```bash
npx prisma migrate deploy
```

- [ ] Command runs without errors.
- [ ] Your DB user does not have unnecessary privileges (e.g. no DROP on production).

### 2.3 Seed (optional)

Only if you have a seed script and want initial data (e.g. for staging):

```bash
npx prisma db seed
```

Run once per environment; do not re-seed production with test data.

**You’re done with Step 2 when:** `npm run build` passes and `prisma migrate deploy` has been run on the target DB.

---

## Step 3 — Security

**Goal:** Production auth and HTTPS are correct; no high/critical audit issues left unaddressed.

### 3.1 Auth and URL

- [ ] `NEXTAUTH_SECRET` is set in production and is long and random (e.g. from `openssl rand -base64 32`).
- [ ] `NEXTAUTH_URL` in production is `https://yourdomain.com` (no trailing slash, HTTPS).
- [ ] Your host redirects HTTP → HTTPS (and uses HSTS if available).

### 3.2 Audit

Run:

```bash
npm audit
```

- [ ] Review the report. Run `npm audit fix` for fixes that don’t require major upgrades.
- [ ] For “fix available via `npm audit fix --force`”: only run that if you’re willing to accept breaking changes (e.g. Prisma major version). Otherwise note the vulnerability and plan an upgrade later.
- [ ] `xlsx` has known issues with no fix; avoid parsing untrusted uploads with it. For export-only use, risk is lower.

### 3.3 Gitignore

- [ ] `.env` and `.env.local` are in `.gitignore` and have never been committed (already verified in Step 1).

**You’re done with Step 3 when:** NEXTAUTH_SECRET and NEXTAUTH_URL are correct for production, HTTPS is enforced, and you’ve run `npm audit` and applied fixes you’re comfortable with.

---

## Step 4 — Legal and disclaimers

**Goal:** Users see a financial disclaimer and, if you collect data, know about privacy/terms.

### 4.1 Financial disclaimer

- [ ] A short disclaimer is visible (e.g. in the footer): *“Data and analysis are for informational purposes only and do not constitute financial, investment, or legal advice.”*  
  *(Already added in the layout footer.)*

### 4.2 Privacy and terms

- [ ] If you collect email, names, or portfolio data, add a **Privacy Policy** (what you collect, how you use it, retention).
- [ ] If you want rules of use, add **Terms of Service**.
- [ ] Link to them in the footer or in the sign-up flow.

### 4.3 Third-party data

- [ ] You’ve skimmed terms for Yahoo Finance, FRED, Resend (and any other APIs) if you’re publishing commercially.

**You’re done with Step 4 when:** Disclaimer is in place and, if needed, privacy/terms are linked.

---

## Step 5 — User experience and errors

**Goal:** 404 and runtime errors show friendly pages; auth flow works end-to-end.

### 5.1 404 and global error

- [ ] Open a non-existent URL (e.g. `http://localhost:3000/bad-page`). You should see the custom 404 with “Dashboard” and “Research” links.
- [ ] Root `error.tsx` exists (`src/app/error.tsx`). Uncaught errors show “Something went wrong” with “Try again” and “Dashboard” instead of a raw stack trace.

### 5.2 API failures

- [ ] With `FRED_API_KEY` unset, the dashboard still loads; macro section shows placeholders or a clear message.
- [ ] With `ANTHROPIC_API_KEY` unset, chat shows an error message instead of crashing.

### 5.3 Auth flow (full test)

- [ ] Register a new account (use a real email you can access).
- [ ] Receive the verification email and click the link.
- [ ] Sign in with the same email/password.
- [ ] Add a position to the portfolio, add a watchlist item.
- [ ] Sign out, then sign in again.
- [ ] In production, confirm that **unverified** users cannot sign in (email verification required).

**You’re done with Step 5 when:** 404 and error pages look correct, and the full auth + portfolio flow works.

---

## Step 6 — Content and metadata

**Goal:** Title, description, and crawler behavior match how you want the app to be seen.

### 6.1 Metadata

- [ ] In `src/app/layout.tsx`, `metadata.title` and `metadata.description` match your product (e.g. “Global Capital Markets HQ” and a one-line description).

### 6.2 robots.txt

- [ ] `public/robots.txt` exists. It allows crawlers by default; optionally disallow `/api/` if you don’t want API paths indexed.

### 6.3 Favicon

- [ ] Replace the default favicon with your brand icon if you have one (in `app/` or `public/`).

**You’re done with Step 6 when:** Metadata and robots.txt are set and favicon is updated (or intentionally left default).

---

## Step 7 — Monitoring and operations

**Goal:** You’re not logging secrets, DB is backed up, and optionally you have a health check.

### 7.1 Logging

- [ ] No code logs passwords, tokens, or full request bodies. Use your host’s logs (e.g. Vercel) for errors and access.

### 7.2 Database backups

- [ ] Automated backups are enabled on your DB provider (e.g. Supabase). You know how to restore.

### 7.3 Health check (optional)

- [ ] If you want uptime monitoring, add a route (e.g. `/api/health`) that returns 200 when the app is up; optionally check DB connectivity.

**You’re done with Step 7 when:** Logging and backups are in place and, if desired, a health endpoint exists.

---

## Step 8 — Final smoke test

**Goal:** One full pass on the **production** URL before you call it launched.

- [ ] Open the production URL in an **incognito** window.
- [ ] Register → verify email → sign in.
- [ ] Add a portfolio position, add a watchlist item, open Research, try Chat (if Anthropic is set).
- [ ] Sign out and sign in again.
- [ ] Test on a mobile browser (layout, login, main flows).
- [ ] Confirm unverified users cannot sign in in production.

**You’re done with Step 8 when:** All of the above work on the live URL.

---

## Step 9 — Go live

- [ ] Domain points to your host; SSL is configured.
- [ ] All production env vars are set on the host and you’ve redeployed.
- [ ] You’ve run the Step 8 smoke test again on the live URL.
- [ ] You’re ready to announce or soft-launch and will watch logs/errors for 24–48 hours.

---

**Quick reference**

- Full checklist: [PRE_LAUNCH.md](./PRE_LAUNCH.md)
- Security details: [SECURITY.md](./SECURITY.md)
