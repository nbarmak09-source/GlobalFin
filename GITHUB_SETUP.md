# Push your project to GitHub

So Vercel (or anyone) can clone and deploy your app.

---

## 1. Create a repo on GitHub

1. Go to [github.com](https://github.com) and sign in.
2. Click the **+** (top right) → **New repository**.
3. Fill in:
   - **Repository name:** e.g. `globalfin` (no spaces).
   - **Description:** optional (e.g. "Personal finance / GlobalFin dashboard").
   - **Public** (so Vercel can access it).
   - **Do not** check "Add a README" or "Add .gitignore" — you already have a project.
4. Click **Create repository**.

GitHub will show you a page with a URL like:
`https://github.com/YOUR_USERNAME/globalfin.git`

Copy that URL — you’ll use it in the next step.

---

## 2. Add GitHub as the remote and push

In your project folder (Terminal), run these one at a time. **Replace `YOUR_USERNAME` and `REPO_NAME`** with your GitHub username and repo name.

```bash
# Add GitHub as "origin" (use the URL from step 1)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Stage everything (respects .gitignore, so .env won’t be added)
git add .

# Commit
git commit -m "Initial commit: GlobalFin"

# Push to GitHub (first time: set upstream for main)
git push -u origin main
```

If GitHub asks for a password, use a **Personal Access Token** (see below), not your account password.

---

## 3. If you use two-factor auth or HTTPS and it asks for a password

GitHub no longer accepts account passwords over HTTPS. Use a **Personal Access Token**:

1. GitHub → **Settings** (your profile) → **Developer settings** → **Personal access tokens** → **Tokens (classic)**.
2. **Generate new token (classic)**. Name it e.g. "Vercel / GlobalFin".
3. Set an expiration (e.g. 90 days or No expiration).
4. Under **Scopes**, check **repo** (full control of private repositories).
5. **Generate token** and copy it once (GitHub won’t show it again).
6. When you run `git push`, use the **token** as the password when prompted.

Or use **SSH** instead of HTTPS so you don’t need a token each time:

- Add an SSH key in GitHub: **Settings** → **SSH and GPG keys** → **New SSH key**.
- Then use the SSH remote URL when adding origin:
  ```bash
  git remote add origin git@github.com:YOUR_USERNAME/REPO_NAME.git
  ```

---

## 4. Check

- Open `https://github.com/YOUR_USERNAME/REPO_NAME` in your browser. You should see your code.
- Make sure **.env** does **not** appear (it’s in .gitignore). If it does, remove it from the repo and add it to .gitignore, then change any secrets that were exposed.

After this, you can connect this repo to Vercel (see [VERCEL_SETUP.md](./VERCEL_SETUP.md)).
