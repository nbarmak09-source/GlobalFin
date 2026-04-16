"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

const INPUT_CLS =
  "w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-[16px] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all duration-200";

const BTN_PRIMARY =
  "w-full rounded-xl bg-accent px-4 py-3.5 text-sm font-semibold text-white hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 min-h-[52px] cursor-pointer hover:shadow-[0_0_24px_rgba(201,162,39,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong");
    }
    setLoading(false);
  }

  if (!token) {
    return (
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-2xl shadow-black/40">
        <div className="flex items-start gap-2.5 rounded-xl bg-red/10 border border-red/25 px-3.5 py-3 text-sm text-red leading-snug">
          <span className="shrink-0 mt-px">⚠</span>
          <span>Invalid or missing reset token. Please request a new password reset link.</span>
        </div>
        <Link
          href="/forgot-password"
          className={BTN_PRIMARY.replace("w-full", "block w-full text-center")}
        >
          Request new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl shadow-black/40 text-center space-y-5">
        <div className="flex flex-col items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green/10 border border-green/25">
            <CheckCircle2 className="h-7 w-7 text-green" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">Password reset</h2>
            <p className="text-sm text-muted mt-1 leading-relaxed">
              Your password has been updated. You can now sign in with your new password.
            </p>
          </div>
        </div>
        <Link
          href="/login"
          className={BTN_PRIMARY.replace("w-full", "block w-full text-center")}
        >
          Sign in
        </Link>
      </div>
    );
  }

  const passwordsMatch = confirmPassword && password === confirmPassword;
  const passwordsMismatch = confirmPassword && password !== confirmPassword;

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-2xl shadow-black/40">
      {error && (
        <div className="flex items-start gap-2.5 rounded-xl bg-red/10 border border-red/25 px-3.5 py-3 text-sm text-red leading-snug">
          <span className="shrink-0 mt-px">⚠</span>
          <span>{error}</span>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* New password */}
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium text-foreground">
            New password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
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
          <p className="text-[11px] text-muted">Minimum 8 characters</p>
        </div>

        {/* Confirm password */}
        <div className="space-y-1.5">
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground">
            Confirm new password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              name="confirmPassword"
              type={showConfirm ? "text" : "password"}
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={
                INPUT_CLS +
                " pr-12 " +
                (passwordsMismatch ? "border-red focus:border-red focus:ring-red/30" : "") +
                (passwordsMatch ? "border-green focus:border-green focus:ring-green/30" : "")
              }
            />
            <button
              type="button"
              tabIndex={-1}
              onClick={() => setShowConfirm((v) => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors p-1 cursor-pointer"
              aria-label={showConfirm ? "Hide password" : "Show password"}
            >
              {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {passwordsMismatch && (
            <p className="text-[11px] text-red">Passwords do not match</p>
          )}
          {passwordsMatch && (
            <p className="text-[11px] text-green">Passwords match ✓</p>
          )}
        </div>

        <button type="submit" disabled={loading} className={BTN_PRIMARY}>
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Resetting…
            </span>
          ) : "Reset password"}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full space-y-5">
      <Suspense fallback={<div className="text-muted text-sm text-center">Loading…</div>}>
        <ResetPasswordForm />
      </Suspense>
      <p className="text-center text-sm text-muted">
        Remember your password?{" "}
        <Link href="/login" className="text-accent font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
