# Vercel setup guide

Get your Capital Markets app deployed on Vercel and wired to your database and auth.

---

## 1. Prerequisites

- Code in a **Git** repo (GitHub, GitLab, or Bitbucket).
- A **Supabase** (or other PostgreSQL) project for production.
- Your `.env` values ready (see Step 4) — **do not** commit `.env` to the repo.

---

## 2. Create the Vercel project

1. Go to [vercel.com](https://vercel.com) and sign in (GitHub is easiest if your repo is on GitHub).
2. Click **Add New…** → **Project**.
3. **Import** your Git repository (e.g. `your-username/Capital-Markets`).
4. Vercel will detect Next.js. Leave the defaults unless you use a different root:
   - **Framework Preset:** Next.js
   - **Root Directory:** `./` (or the folder that contains `package.json` if different)
   - **Build Command:** `npm run build` (default)
   - **Output Directory:** (leave default)
   - **Install Command:** `npm install` (default)

5. **Do not** click Deploy yet — add environment variables first (Step 4).

---

## 3. Production database and migrations

Your app needs the production schema before the first deploy.

1. In Supabase (or your DB host), get the **connection string** for the database you want to use in production. Use the **Session mode** pooler (port 5432) if Supabase offers it.
2. **Run migrations** against that database once (from your machine or CI):

   ```bash
   DATABASE_URL="postgresql://postgres.[ref]:[password]@[region].pooler.supabase.com:5432/postgres" npx prisma migrate deploy
   ```

   Replace the URL with your real production `DATABASE_URL`. After this, your production DB has the correct tables.

---

## 4. Environment variables on Vercel

In the Vercel project: **Settings** → **Environment Variables**.

Add these for **Production** (and optionally **Preview** if you want branch deploys to work the same way).

| Name | Value | Notes |
|------|--------|--------|
| `DATABASE_URL` | `postgresql://postgres.[ref]:[password]@[region].pooler.supabase.com:5432/postgres` | Your production DB URL (from Supabase). Use **Session** pooler. |
| `NEXTAUTH_URL` | `https://your-project.vercel.app` | Replace with your actual Vercel URL after first deploy, or use a custom domain later. |
| `NEXTAUTH_SECRET` | *(long random string)* | Run `openssl rand -base64 32` and paste the result. |
| `RESEND_API_KEY` | `re_...` | From [resend.com](https://resend.com) → API Keys. |

Optional (add if you use them):

| Name | Value |
|------|--------|
| `FRED_API_KEY` | Your FRED API key |
| `ANTHROPIC_API_KEY` | Your Anthropic API key for chat/pitch |
| `EMAIL_FROM` | e.g. `noreply@yourdomain.com` (verified in Resend) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | If using Google OAuth |
| `GITHUB_ID` / `GITHUB_SECRET` | If using GitHub OAuth |

After adding variables, save. You can come back and add more later.

---

## 5. First deploy

1. In the Vercel import screen, click **Deploy** (or trigger a new deployment from the **Deployments** tab).
2. Wait for the build. It runs `npm install` and `npm run build`. If the build fails, check the logs (often a missing env var or Prisma issue).
3. When it finishes, Vercel gives you a URL like `https://your-project.vercel.app`.

---

## 6. Set NEXTAUTH_URL to the real URL

1. Copy the deployed URL (e.g. `https://your-project.vercel.app`).
2. In Vercel: **Settings** → **Environment Variables**.
3. Edit `NEXTAUTH_URL` and set it to that URL (no trailing slash). Save.
4. **Redeploy** (Deployments → … on latest deployment → Redeploy) so the new value is used.

From now on, sign-in and email verification links will use this URL.

---

## 7. (Optional) Custom domain

1. **Settings** → **Domains** → add your domain (e.g. `app.yourdomain.com`).
2. Follow Vercel’s DNS instructions (add the CNAME or A record they show).
3. After the domain is verified, set `NEXTAUTH_URL` to `https://app.yourdomain.com` (or whatever you added) and redeploy.

---

## 8. OAuth (Google / GitHub) on Vercel

If you use Google or GitHub sign-in:

1. In the provider’s console (Google Cloud / GitHub OAuth App), add the **Authorized redirect URI**:
   - `https://your-project.vercel.app/api/auth/callback/google` (Google)
   - `https://your-project.vercel.app/api/auth/callback/github` (GitHub)
2. If you use a custom domain, add the same URIs with that domain (e.g. `https://app.yourdomain.com/api/auth/callback/google`).
3. Ensure the matching `GOOGLE_*` or `GITHUB_*` env vars are set in Vercel.

---

## Quick checklist

- [ ] Repo connected to Vercel, build command is `npm run build`
- [ ] Production DB exists, `prisma migrate deploy` run once with production `DATABASE_URL`
- [ ] All required env vars set in Vercel (Production): `DATABASE_URL`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`, `RESEND_API_KEY`
- [ ] First deploy succeeded
- [ ] `NEXTAUTH_URL` updated to the real Vercel (or custom) URL and redeployed
- [ ] (Optional) Custom domain added and `NEXTAUTH_URL` updated
- [ ] (Optional) OAuth redirect URIs and env vars configured

After this, your app is live and auth/email/DB should work. Use [PRE_LAUNCH_WALKTHROUGH.md](./PRE_LAUNCH_WALKTHROUGH.md) for the full pre-launch checklist.
