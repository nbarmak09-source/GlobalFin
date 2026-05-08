# Security

This document summarizes security measures in place and additional steps you can take to protect your data and your users’ data.

## Already in place

- **Authentication**: NextAuth with credentials (bcrypt) and optional OAuth (Google/GitHub). JWT sessions (30 days). Email verification required in production before sign-in.
- **Authorization**: Protected API routes call `auth()` and scope all data by `session.user.id` (portfolio, watchlist, pitches, alerts). No cross-user data access.
- **Proxy (middleware)**: Auth and rate limiting run in `src/proxy.ts`, wired from `src/middleware.ts`. Unauthenticated users are redirected to login; protected APIs return 401 without a session (unless dev bypass below).
- **Local dev bypass**: With `NODE_ENV=development` and `DISABLE_AUTH=true`, middleware skips the login redirect and server `auth()` can impersonate a real user (`DEV_IMPERSONATE_USER_ID` or the oldest user in the DB). **Never enable in production.**
- **Rate limiting**: In-memory, per-IP. AI routes (chat, pitch generate): 10 req/min. Other APIs: 60 req/min. 401/429 responses include rate-limit headers.
- **Security headers**: Set on responses from the proxy: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`.
- **Passwords**: bcrypt with 10 salt rounds. Min length 8 on registration. Never logged or returned in API responses.
- **Email verification**: One-time tokens (crypto.randomBytes(32)), 24h expiry, stored in DB and deleted after use.
- **Input validation**: Symbol/ID allowlists (e.g. portfolio symbol regex), message length caps on chat, JSON body checks. Prisma used for DB access (parameterized queries).
- **Secrets**: `.env*` in `.gitignore`. Use `.env` or `.env.local` for local dev; never commit real keys.

## Recommended additional measures

### 1. **NEXTAUTH_SECRET (critical in production)**

- Set a long, random value in production. If missing, NextAuth will warn.
- Generate one: `openssl rand -base64 32`.
- Set in your host’s env (Vercel, Railway, etc.), not in code.

### 2. **HTTPS only in production**

- Set `NEXTAUTH_URL` to `https://yourdomain.com`.
- Configure your host to redirect HTTP → HTTPS and use HSTS if possible.

### 3. **Stronger rate limiting in production**

- Current limiter is in-memory; it resets on restart and doesn’t share state across instances.
- For production at scale, use a shared store (e.g. [Upstash Redis](https://upstash.com)) and keep the same tiered limits (AI vs default).

### 4. **Password policy (optional)**

- Consider: max length (e.g. 128), and optional complexity (uppercase, number, symbol) if your threat model requires it. Balance with usability.

### 5. **OAuth account linking**

- `allowDangerousEmailAccountLinking: true` is set for Google/GitHub so the same email can sign in with both. This can allow account takeover if someone controls that email. If you don’t need linking, set it to `false` or implement a safer linking flow.

### 6. **CORS**

- If you add a separate frontend domain or mobile app, restrict API origins in Next.js (e.g. via middleware or API route checks) instead of allowing `*`.

### 7. **Sensitive data in logs and errors**

- Avoid logging request bodies, passwords, tokens, or full stack traces to production. Return generic error messages to clients (e.g. “Failed to create account”) and log details server-side only.

### 8. **Dependency hygiene**

- Run `npm audit` and fix high/critical issues.
- Enable Dependabot (or similar) for security updates.
- Keep Next.js, NextAuth, Prisma, and other deps up to date.

### 9. **Database**

- Use a connection string with least-privilege DB user (no DROP, etc.).
- Prefer connection pooling (e.g. Supabase pooler) and SSL in production.
- Back up the database regularly and test restore.

### 10. **Content Security Policy (CSP)**

- For stricter XSS protection, add a CSP header in the proxy or `next.config`. Start with a report-only policy and tighten gradually so you don’t break legitimate scripts (e.g. charts, analytics).

### 11. **Verification token lifetime**

- Email verification tokens expire in 24 hours. For higher security, consider shortening (e.g. 1 hour) and/or rate-limiting verification attempts per email.

### 12. **API input validation**

- Continue validating and sanitizing all inputs (symbols, IDs, pitch content, etc.). Reject oversized payloads and invalid types early.

---

If you deploy to a platform (Vercel, etc.), also follow their security and env best practices (e.g. env vars, serverless limits, and firewall rules).
