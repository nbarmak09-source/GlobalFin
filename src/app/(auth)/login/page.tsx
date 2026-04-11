"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, type SignInResponse } from "next-auth/react";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const verified = searchParams.get("verified") === "1";
  const deleted = searchParams.get("deleted") === "1";
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
    <div className="w-full space-y-6 sm:space-y-8">
      <p className="text-sm text-muted text-center">
        Sign in to your dashboard
      </p>

      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        {deleted && (
          <p className="text-sm text-muted bg-card-hover border border-border rounded-lg px-3 py-2">
            Your account has been deleted.
          </p>
        )}
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
            className="flex items-center justify-center rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-card-hover transition-colors min-h-[44px]"
          >
            <span className="flex items-center justify-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                className="h-4 w-4 flex-shrink-0"
              >
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </span>
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("github")}
            className="flex items-center justify-center rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-card-hover transition-colors min-h-[44px]"
          >
            <span className="flex items-center justify-center gap-2">
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="#e8e6e1"
                className="h-4 w-4 flex-shrink-0"
              >
                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
              </svg>
              GitHub
            </span>
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
