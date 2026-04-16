"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { signIn, type SignInResponse } from "next-auth/react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

const INPUT_CLS =
  "w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-[16px] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all duration-200";

const BTN_PRIMARY =
  "w-full rounded-xl bg-accent px-4 py-3.5 text-sm font-semibold text-white hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 min-h-[52px] cursor-pointer hover:shadow-[0_0_24px_rgba(201,162,39,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]";

const BTN_SECONDARY =
  "flex items-center justify-center gap-2.5 rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:bg-card-hover hover:border-border/80 transition-all duration-200 min-h-[52px] cursor-pointer active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-red/10 border border-red/25 px-3.5 py-3 text-sm text-red leading-snug">
      <span className="shrink-0 mt-px">⚠</span>
      <span>{message}</span>
    </div>
  );
}

function SuccessBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-xl bg-green/10 border border-green/25 px-3.5 py-3 text-sm text-green leading-snug">
      <span className="shrink-0 mt-px">✓</span>
      <span>{message}</span>
    </div>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const verified = searchParams.get("verified") === "1";
  const deleted = searchParams.get("deleted") === "1";
  const errorParam = searchParams.get("error");
  const codeParam = searchParams.get("code");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(null);
  const [unverifiedSignIn, setUnverifiedSignIn] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendFeedback, setResendFeedback] = useState("");

  const errorMessage =
    error ||
    (codeParam === "email_not_verified" &&
      "Please verify your email before signing in.") ||
    (errorParam === "OAuthAccountNotLinked" &&
      "An account with this email already exists. Sign in with email and password.") ||
    (errorParam === "expired_or_invalid" &&
      "Verification link expired or invalid. Please sign up again or request a new link.") ||
    (errorParam === "invalid_token" && "Invalid verification link.") ||
    (errorParam === "verification_failed" && "Verification failed. Please try again.");

  const showResend = unverifiedSignIn || (codeParam === "email_not_verified" && !error);

  async function handleResend() {
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
      setResendFeedback(data.message ?? "Check your email for a verification link.");
    } catch {
      setResendFeedback("Something went wrong. Please try again.");
    }
    setResendLoading(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setUnverifiedSignIn(false);
    setResendFeedback("");
    setLoading(true);
    try {
      const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
      const result = res as SignInResponse | undefined;
      if (result && !result.ok) {
        if (result.code === "email_not_verified") {
          setUnverifiedSignIn(true);
          setError("Please verify your email before signing in.");
          setLoading(false);
          return;
        }
        setError("Invalid email or password");
        setLoading(false);
        return;
      }
      window.location.href = result?.url || callbackUrl;
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  function handleOAuth(provider: "google" | "github") {
    setOauthLoading(provider);
    signIn(provider, { callbackUrl });
  }

  return (
    <div className="w-full space-y-5">
      {/* Status banners */}
      {deleted && <ErrorBanner message="Your account has been deleted." />}
      {verified && <SuccessBanner message="Email verified — you can sign in now." />}

      {/* Card */}
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-2xl shadow-black/40">
        {errorMessage && <ErrorBanner message={errorMessage as string} />}

        {showResend && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={resendLoading || !email.trim()}
              className={BTN_SECONDARY + " w-full"}
            >
              {resendLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {resendLoading ? "Sending…" : "Resend verification email"}
            </button>
            {resendFeedback && (
              <p className="text-sm text-muted px-1">{resendFeedback}</p>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => { setEmail(e.target.value); setUnverifiedSignIn(false); }}
              className={INPUT_CLS}
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs text-accent hover:underline cursor-pointer">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={INPUT_CLS + " pr-12"}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors p-1 cursor-pointer"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className={BTN_PRIMARY}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
              </span>
            ) : "Sign in"}
          </button>
        </form>

        <p className="text-xs text-muted">
          Signed up but can&apos;t sign in? Check your email for the verification link.
        </p>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs text-muted">
            <span className="bg-card px-3">Or continue with</span>
          </div>
        </div>

        {/* OAuth */}
        <div className="grid grid-cols-2 gap-2.5">
          <button type="button" onClick={() => handleOAuth("google")} disabled={!!oauthLoading} className={BTN_SECONDARY}>
            {oauthLoading === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleIcon />}
            Google
          </button>
          <button type="button" onClick={() => handleOAuth("github")} disabled={!!oauthLoading} className={BTN_SECONDARY}>
            {oauthLoading === "github" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GitHubIcon />}
            GitHub
          </button>
        </div>
      </div>

      <p className="text-center text-sm text-muted">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="text-accent font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-muted text-sm text-center">Loading…</div>}>
      <LoginForm />
    </Suspense>
  );
}
