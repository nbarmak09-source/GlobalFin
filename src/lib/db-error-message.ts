/** Maps common Prisma / driver errors into a short user-facing hint (API responses). */

export function databaseUserMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;

  const e = error as { code?: unknown; message?: unknown };
  const code = typeof e.code === "string" ? e.code : "";
  const message =
    typeof e.message === "string" ? e.message : JSON.stringify(error);
  const lower = `${code} ${message}`.toLowerCase();

  if (
    code === "P1000" ||
    /authentication failed|password authentication failed/i.test(message)
  ) {
    return (
      "Database login failed. In Supabase: Project Settings → Database → reset the database password, " +
      "then paste the updated connection string into DATABASE_URL in .env (use Session pooler, port 5432). " +
      "Or sync from Vercel: vercel link && vercel env pull."
    );
  }

  if (code === "P1001" || /can't reach database server|ECONNREFUSED/i.test(lower)) {
    return (
      "Cannot reach the database. Check DATABASE_URL, that the project is not paused, and your network/VPN."
    );
  }

  if (
    code === "P2021" ||
    /relation .* does not exist|table .* does not exist/i.test(lower)
  ) {
    return (
      'Database tables are missing. From the repo root run: npx prisma migrate deploy (production: run the same command in your deploy pipeline or against the prod DB URL).'
    );
  }

  return null;
}
