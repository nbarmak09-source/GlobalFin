"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";

const INPUT_CLS =
  "w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-[16px] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all duration-200";

const BTN_PRIMARY =
  "w-full rounded-xl bg-accent px-4 py-3.5 text-sm font-semibold text-white hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 min-h-[52px] cursor-pointer hover:shadow-[0_0_24px_rgba(201,162,39,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setError("Something went wrong");
    }
    setLoading(false);
  }

  return (
    <div className="w-full space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 shadow-2xl shadow-black/40">
        {submitted ? (
          <div className="space-y-5 text-center">
            <div className="flex flex-col items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/10 border border-accent/25">
                <Mail className="h-7 w-7 text-accent" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-foreground">Check your inbox</h2>
                <p className="text-sm text-muted mt-1 leading-relaxed">
                  If an account exists for{" "}
                  <span className="text-foreground font-medium">{email}</span>, you&apos;ll receive a reset link shortly.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className={BTN_PRIMARY.replace("w-full", "block w-full text-center")}
            >
              Back to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 rounded-xl bg-red/10 border border-red/25 px-3.5 py-3 text-sm text-red leading-snug">
                <span className="shrink-0 mt-px">⚠</span>
                <span>{error}</span>
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={INPUT_CLS}
                placeholder="you@example.com"
              />
              <p className="text-[11px] text-muted">
                We&apos;ll send a reset link if an account exists for this address.
              </p>
            </div>
            <button type="submit" disabled={loading} className={BTN_PRIMARY}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Sending…
                </span>
              ) : "Send reset link"}
            </button>
          </form>
        )}
      </div>

      <p className="text-center text-sm text-muted">
        Remember your password?{" "}
        <Link href="/login" className="text-accent font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
