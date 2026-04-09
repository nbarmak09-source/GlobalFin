"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Globe2 } from "lucide-react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
      <div className="rounded-xl border border-border bg-card p-6 space-y-4">
        <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
          Invalid or missing reset token. Please request a new password reset link.
        </p>
        <Link
          href="/forgot-password"
          className="block w-full text-center rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent/90 transition-colors min-h-[44px]"
        >
          Request new link
        </Link>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      {success ? (
        <div className="space-y-4">
          <p className="text-sm text-foreground">
            Your password has been reset. You can now sign in with your new password.
          </p>
          <Link
            href="/login"
            className="block w-full text-center rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent/90 transition-colors min-h-[44px]"
          >
            Sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1">
              New password (min 8 characters)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-1">
              Confirm new password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white hover:bg-accent/90 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {loading ? "Resetting…" : "Reset password"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
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
        <p className="text-sm text-muted">Set a new password</p>
      </div>

      <Suspense fallback={<div className="text-muted text-sm">Loading…</div>}>
        <ResetPasswordForm />
      </Suspense>

      <p className="text-center text-sm text-muted">
        Remember your password?{" "}
        <Link href="/login" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
