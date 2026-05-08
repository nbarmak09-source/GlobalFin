import { prisma } from "@/lib/prisma";

/**
 * Local development only: when DISABLE_AUTH is set, server-side `auth()` can
 * return a synthetic session backed by a real User row so portfolio/watchlist
 * APIs keep working without signing in.
 *
 * Never enable outside NODE_ENV=development.
 */
export function isDevAuthBypassEnabled(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  return (
    process.env.DISABLE_AUTH === "true" || process.env.DISABLE_AUTH === "1"
  );
}

/** Prefer DEV_IMPERSONATE_USER_ID; otherwise first user in the database. */
export async function resolveDevImpersonateUserId(): Promise<string | null> {
  const explicit = process.env.DEV_IMPERSONATE_USER_ID?.trim();
  if (explicit) return explicit;
  try {
    const first = await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    return first?.id ?? null;
  } catch {
    return null;
  }
}
