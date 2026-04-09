"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, type SignInResponse } from "next-auth/react";
import { Globe2 } from "lucide-react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const verified = searchParams.get("verified") === "1";
  const errorParam = searchParams.get("error");
  const codeParam = searchParams.get("code");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [unverifiedSignIn, setUnverifiedSignIn] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendFeedback, setResendFeedback] = useState("");

  const errorMessage =
    error ||
    (codeParam === "email_not_verified" &&
      "Please verify your email before signing in. Check your inbox or use the button below.") ||
    (errorParam === "OAuthAccountNotLinked" &&
      "An account with this email already exists. Please sign in with your email and password.") ||
    (errorParam === "expired_or_invalid" && "Verification link expired or invalid. Please sign up again or request a new link.") ||
    (errorParam === "invalid_token" && "Invalid verification link.") ||
    (errorParam === "verification_failed" && "Verification failed. Please try again.");

  const showResendVerification =
    unverifiedSignIn ||
    (codeParam === "email_not_verified" && !error);

  async function handleResendVerification() {
    if (!email.trim()) return;
    setResendLoading(true);
    setResendFeedback("");
    try {
      const res = await fetch("/api/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      setResendFeedback(
        data.message ??
          "If an account needs verification, check your email for a link."
      );
    } catch {
      setResendFeedback("Something went wrong. Please try again.");
    }
    setResendLoading(false);
  }

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setUnverifiedSignIn(false);
    setResendFeedback("");
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });
      const result = res as SignInResponse | undefined;
      if (result && !result.ok) {
        if (result.code === "email_not_verified") {
          setUnverifiedSignIn(true);
          setError(
            "Please verify your email before signing in. Check your inbox or use the button below."
          );
          setLoading(false);
          return;
        }
        setError("Invalid email or password");
        setLoading(false);
        return;
      }
      const url = result?.url ?? undefined;
      window.location.href = url || callbackUrl;
      return;
    } catch {
      setError("Something went wrong");
    }
    setLoading(false);
  }

  function handleOAuth(provider: "google" | "github") {
    signIn(provider, { callbackUrl });
  }

  return (
    <div className="w-full max-w-sm space-y-6 sm:space-y-8">
      <div className="flex flex-col items-center gap-2">
        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-bold font-serif text-accent"
        >
          <Globe2 className="h-6 w-6" />
          Global Capital Markets HQ
        </Link>
        <p className="text-sm text-muted">Sign in to your dashboard</p>
      </div>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        {verified && (
          <p className="text-sm text-green-600 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2">
            Email verified. You can sign in now.
          </p>
        )}
        <form onSubmit={handleCredentialsSubmit} className="space-y-4">
          {errorMessage && (
            <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {errorMessage}
            </p>
          )}
          {showResendVerification && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendLoading || !email.trim()}
                className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-card-hover transition-colors disabled:opacity-50 min-h-[44px]"
              >
                {resendLoading ? "Sending…" : "Resend verification email"}
              </button>
              {resendFeedback && (
                <p className="text-sm text-muted">{resendFeedback}</p>
              )}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setUnverifiedSignIn(false);
              }}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-accent hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        <p className="text-xs text-muted">
          Signed up but can&apos;t sign in? Check your email for the verification link.
        </p>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs text-muted">
            <span className="bg-card px-2">Or continue with</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-card-hover transition-colors min-h-[44px]"
          >
            Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("github")}
            className="flex items-center justify-center gap-2 rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-card-hover transition-colors min-h-[44px]"
          >
            GitHub
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-accent hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-muted text-sm">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
