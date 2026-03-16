# Fix Vercel "DEPLOYMENT_NOT_FOUND" – do these in order

## Step 1: Trigger a brand‑new deployment from Git

Vercel will create a new deployment and set it as Production.

1. In your project folder, open `README.md` (or any file).
2. Add one line anywhere (e.g. a space or a line like `# Deployed on Vercel`), then save.
3. In Terminal run:

```bash
cd "/Users/barm/Downloads/Capital Markets"
git add README.md
git commit -m "Trigger Vercel redeploy"
git push origin main
```

4. Go to **Vercel** → your project **global_capital_markets** → **Deployments**.
5. Wait until a **new** deployment appears and shows **Ready** (and gets the **Current** badge). This may take 1–2 minutes.

---

## Step 2: Get your real project URL

1. In the same Vercel project, click **Settings** (top or left).
2. In the left sidebar, click **Domains**.
3. Under **Domains** you’ll see at least one row. The **Production** domain might look like:
   - `global-capital-markets.vercel.app`
   - or `global-capital-markets-XXXX.vercel.app` (with a team slug)
4. **Copy that domain exactly** (no `https://` yet).

---

## Step 3: Open the app with that URL only

1. Open a **new incognito/private** browser window.
2. In the address bar type: `https://` then paste the domain you copied.  
   Example: `https://global-capital-markets.vercel.app`
3. Press Enter.  
   Use **only** this URL. Do not add `/something` or any path, and do not use a link from an email or from the deployment detail page.

---

## Step 4: If Domains is empty or still 404

1. **Settings** → **Domains**.
2. Click **Add**.
3. Enter: `global-capital-markets.vercel.app` (or whatever name Vercel suggests).
4. Click **Add** and wait until it shows **Valid**.
5. Try again in incognito: `https://global-capital-markets.vercel.app`.

---

## Step 5: If you're in a Vercel Team

Your production URL might include the team name, e.g.  
`https://global-capital-markets-nbarmak09-7864.vercel.app`

Use **exactly** what is listed under **Settings** → **Domains** for Production.
