import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth.config";
import { checkRateLimit, type LimitTier } from "@/lib/rate-limit";

/** Apply security headers to a response. */
function withSecurityHeaders(res: NextResponse): NextResponse {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

const AI_ROUTES = [
  "/api/chat",
  "/api/pitch/generate",
];

/** When true, skip login redirect and allow protected APIs without a session (local dev only). */
const AUTH_DISABLED =
  process.env.DISABLE_AUTH === "true" || process.env.DISABLE_AUTH === "1";

// Public APIs: no auth required (dashboard data, ticker, news, etc.)
const PUBLIC_API_ROUTES = [
  "/api/health",
  "/api/news",
  "/api/stocks",
  "/api/fmp",
  "/api/sec-financials",
  "/api/sec-filings",
  "/api/vc-daily",
  "/api/currencies",
  "/api/yield-curve",
  "/api/fixed-income",
  "/api/fixed-income/treasury-curve",
  "/api/alternatives",
  "/api/macro-indicators",
  "/api/macro-indicators/global",
];

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "0.0.0.0";
  }
  return request.headers.get("x-real-ip") ?? "0.0.0.0";
}

function getRateLimitTier(pathname: string): LimitTier {
  if (AI_ROUTES.some((r) => pathname.startsWith(r))) {
    return "ai";
  }
  return "default";
}

const authHandler = auth(async (req) => {
  const pathname = req.nextUrl.pathname;

  // Auth, register, and verify-email: no session required
  if (pathname.startsWith("/api/auth") || pathname === "/api/register" || pathname === "/api/verify-email") {
    return withSecurityHeaders(NextResponse.next());
  }

  // API routes: public ones skip auth, rest require session, then rate limit
  if (pathname.startsWith("/api/")) {
    const isPublic = PUBLIC_API_ROUTES.some((r) => pathname.startsWith(r));
    if (!isPublic && !req.auth && !AUTH_DISABLED) {
      const res = NextResponse.json(
        { error: "Unauthorized" },
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
      return withSecurityHeaders(res);
    }

    // FMP routes enforce auth + rate limit in the route handler (avoid double counting).
    if (pathname.startsWith("/api/fmp")) {
      return withSecurityHeaders(NextResponse.next());
    }

    const ip = getClientIp(req);
    const tier = getRateLimitTier(pathname);
    const { allowed, remaining, resetAt } = await checkRateLimit(ip, tier);

    if (!allowed) {
      const res = NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
            "X-RateLimit-Remaining": "0",
          },
        }
      );
      return withSecurityHeaders(res);
    }

    const response = withSecurityHeaders(NextResponse.next());
    response.headers.set("X-RateLimit-Remaining", String(remaining));
    response.headers.set("X-RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
    return response;
  }

  // Login and register: allow unauthenticated
  if (pathname === "/login" || pathname === "/register") {
    return withSecurityHeaders(NextResponse.next());
  }

  // All other pages: require session and redirect to login if missing
  if (!AUTH_DISABLED && !req.auth) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return withSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  return withSecurityHeaders(NextResponse.next());
});

/** Context shape Next.js passes as second argument to proxy (matches AppRouteHandlerFnContext). */
type ProxyContext = { params?: Promise<Record<string, string | string[] | undefined>> };

export function proxy(request: NextRequest, context?: ProxyContext) {
  return authHandler(request, context as Parameters<typeof authHandler>[1]);
}

export const config = {
  matcher: [
    "/api/:path*",
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
