/**
 * In-memory IP-based rate limiter for API routes.
 * For production at scale, use a shared store (e.g. Upstash Redis).
 */

const store = new Map<
  string,
  { count: number; resetAt: number }
>();

const WINDOW_MS = 60 * 1000; // 1 minute

export const LIMITS = {
  /** Expensive AI routes: 10 requests per minute per IP */
  ai: { max: 10, windowMs: WINDOW_MS },
  /** General API routes: 60 requests per minute per IP */
  default: { max: 60, windowMs: WINDOW_MS },
} as const;

export type LimitTier = keyof typeof LIMITS;

function getKey(identifier: string, tier: LimitTier): string {
  return `${tier}:${identifier}`;
}

/**
 * Returns true if the request is within the rate limit, false if exceeded.
 * Call this with the client IP and the appropriate tier.
 */
export function checkRateLimit(
  identifier: string,
  tier: LimitTier = "default"
): { allowed: boolean; remaining: number; resetAt: number } {
  const { max, windowMs } = LIMITS[tier];
  const key = getKey(identifier, tier);
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    entry = {
      count: 1,
      resetAt: now + windowMs,
    };
    store.set(key, entry);
    return {
      allowed: true,
      remaining: max - 1,
      resetAt: entry.resetAt,
    };
  }

  entry.count += 1;

  if (entry.count > max) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
    };
  }

  return {
    allowed: true,
    remaining: max - entry.count,
    resetAt: entry.resetAt,
  };
}

/**
 * Prune old entries periodically to avoid unbounded memory growth.
 * Call from middleware or a timer; entries are cleared after their window.
 */
export function pruneStore(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now >= entry.resetAt) {
      store.delete(key);
    }
  }
}
