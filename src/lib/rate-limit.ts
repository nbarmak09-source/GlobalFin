/**
 * IP-based rate limiter for API routes.
 * Uses Upstash Redis sliding window when UPSTASH_REDIS_REST_URL and
 * UPSTASH_REDIS_REST_TOKEN are set; falls back to an in-memory implementation
 * for local development when those variables are absent.
 */

export const LIMITS = {
  /** Expensive AI routes: 10 requests per minute per IP */
  ai: { max: 10, windowMs: 60 * 1000 },
  /** General API routes: 60 requests per minute per IP */
  default: { max: 60, windowMs: 60 * 1000 },
} as const;

export type LimitTier = keyof typeof LIMITS;

// ---------------------------------------------------------------------------
// Upstash path
// ---------------------------------------------------------------------------

function isUpstashConfigured(): boolean {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN
  );
}

let _upstashLimiters: Map<LimitTier, import("@upstash/ratelimit").Ratelimit> | null = null;

async function getUpstashLimiters(): Promise<Map<LimitTier, import("@upstash/ratelimit").Ratelimit>> {
  if (_upstashLimiters) return _upstashLimiters;

  const { Ratelimit } = await import("@upstash/ratelimit");
  const { Redis } = await import("@upstash/redis");

  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  _upstashLimiters = new Map([
    [
      "ai",
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(LIMITS.ai.max, "1 m"),
        prefix: "rl:ai",
      }),
    ],
    [
      "default",
      new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(LIMITS.default.max, "1 m"),
        prefix: "rl:default",
      }),
    ],
  ]);

  return _upstashLimiters;
}

async function checkUpstash(
  identifier: string,
  tier: LimitTier
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const limiters = await getUpstashLimiters();
  const limiter = limiters.get(tier)!;
  const { success, remaining, reset } = await limiter.limit(identifier);
  return { allowed: success, remaining, resetAt: reset };
}

// ---------------------------------------------------------------------------
// In-memory fallback
// ---------------------------------------------------------------------------

const store = new Map<string, { count: number; resetAt: number }>();

function checkInMemory(
  identifier: string,
  tier: LimitTier
): { allowed: boolean; remaining: number; resetAt: number } {
  const { max, windowMs } = LIMITS[tier];
  const key = `${tier}:${identifier}`;
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || now >= entry.resetAt) {
    entry = { count: 1, resetAt: now + windowMs };
    store.set(key, entry);
    return { allowed: true, remaining: max - 1, resetAt: entry.resetAt };
  }

  entry.count += 1;

  if (entry.count > max) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  return { allowed: true, remaining: max - entry.count, resetAt: entry.resetAt };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check whether the given identifier is within its rate limit for the tier.
 * Returns { allowed, remaining, resetAt } — resetAt is a Unix ms timestamp.
 */
export async function checkRateLimit(
  identifier: string,
  tier: LimitTier = "default"
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  if (isUpstashConfigured()) {
    return checkUpstash(identifier, tier);
  }

  console.warn(
    "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set; " +
      "using in-memory fallback (not suitable for multi-instance deployments)"
  );
  return checkInMemory(identifier, tier);
}
