# Pre-launch checklist

Use this before publishing so the app is production-ready. Work through each section in order.

---

## 1. Environment and configuration

### Required environment variables (production)

Set these on your host (Vercel, Railway, etc.); never commit real values.

| Variable | Purpose | Notes |
|----------|---------|--------|
| `DATABASE_URL` | PostgreSQL connection | Use pooler URL; enable SSL in production |
| `NEXTAUTH_URL` | Canonical app URL | **Must be `https://yourdomain.com`** in production |
| `NEXTAUTH_SECRET` | Signing key for sessions | Generate: `openssl rand -base64 32` |
| `RESEND_API_KEY` | Verification emails | Without it, signup works but users won’t get verify emails |

### Optional (features degrade gracefully if missing)

| Variable | Purpose |
|----------|---------|
| `FRED_API_KEY` | Macro indicators on dashboard |
| `ANTHROPIC_API_KEY` | Chat, pitch generation |
| `EMAIL_FROM` | Sender for verification emails (default: Resend test domain) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GITHUB_ID` / `GITHUB_SECRET` | GitHub OAuth |

**Check:** Copy `.env.example` to `.env.local` (or host env), fill in production values, and confirm no secrets are in the repo.

---

## 2. Build and database

- [ ] **Build**  
  `npm run build`  
  Fix any TypeScript or build errors.

- [ ] **Migrations**  
  On the production DB (or a staging DB with same schema):  
  `npx prisma migrate deploy`  
  Ensure the DB user has no destructive privileges beyond what the app needs.

- [ ] **Seed (optional)**  
  If you use seeds, run them only once on a fresh DB; don’t re-seed production data.

---

## 3. Security (see SECURITY.md)

- [ ] `NEXTAUTH_SECRET` is set and strong in production.
- [ ] `NEXTAUTH_URL` is HTTPS in production.
- [ ] Host is configured to redirect HTTP → HTTPS (and HSTS if possible).
- [ ] Run `npm audit` and fix high/critical issues.
- [ ] Confirm `.env` and `.env.local` are in `.gitignore` and never committed.

---

## 4. Legal and disclaimers

- [ ] **Financial disclaimer**  
  The app shows market data and research tools. Add a clear disclaimer that it is not investment advice (e.g. in footer or research/chat areas). Example: *“Data and analysis are for informational purposes only and do not constitute financial advice.”*

- [ ] **Privacy and terms**  
  If you collect email, names, or portfolio data, consider:
  - A short **Privacy Policy** (what you collect, how you use it, retention).
  - **Terms of Service** if you want to set rules of use.
  - Links in the footer or sign-up flow.

- [ ] **Third-party data**  
  You use Yahoo Finance, FRED, Resend, etc. Their terms may require attribution or restrict commercial use; skim their terms if you’re publishing commercially.

---

## 5. User experience and errors

- [ ] **404**  
  Custom 404 exists (`src/app/not-found.tsx`). Click a few bad URLs to confirm.

- [ ] **Global error**  
  Root `error.tsx` exists so uncaught errors show a friendly message instead of a raw stack. Test by temporarily throwing in a page.

- [ ] **API failures**  
  When keys are missing (e.g. FRED, Anthropic), the app shows placeholders or clear messages rather than crashing. Spot-check dashboard and chat with keys unset.

- [ ] **Auth flow**  
  Test: Register → receive verification email → verify → sign in → add portfolio position → sign out → sign in again. Test password reset if you add it later.

---

## 6. Content and metadata

- [ ] **Metadata**  
  In `src/app/layout.tsx`: title and description are set. Update if the product name or tagline changes.

- [ ] **robots.txt**  
  Add `public/robots.txt` if you want to allow or disallow crawlers (e.g. allow all, or block `/api`).

- [ ] **Favicon**  
  Replace default favicon in `app/` or `public/` if you have a brand icon.

---

## 7. Monitoring and operations

- [ ] **Logging**  
  Ensure you don’t log passwords, tokens, or full request bodies. Use your host’s log aggregation (e.g. Vercel logs) and set log level appropriately.

- [ ] **Database backups**  
  Enable automated backups on your DB provider (e.g. Supabase). Know how to restore.

- [ ] **Health check (optional)**  
  A simple route (e.g. `/api/health` that returns 200 if the app is up, optionally checks DB) helps uptime monitors and load balancers.

---

## 8. Final smoke test

- [ ] Open the production URL in an incognito window.
- [ ] Register a new account, verify email, sign in.
- [ ] Add a position to the portfolio, add a watchlist item, open Research, use Chat (if Anthropic key is set).
- [ ] Sign out and sign back in.
- [ ] Test on a mobile browser (layout, login, key flows).
- [ ] Confirm email verification is required in production (unverified users cannot sign in).

---

## 9. Go live

- [ ] Point your domain to the host and configure SSL.
- [ ] Set production env vars and redeploy.
- [ ] Run through the smoke test again on the live URL.
- [ ] Announce or soft-launch; monitor logs and errors for the first 24–48 hours.

---

*For security-focused items, see [SECURITY.md](./SECURITY.md).*
