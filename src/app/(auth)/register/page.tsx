"use client";

import { useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

const INPUT_CLS =
  "w-full rounded-xl border border-border bg-background/60 px-4 py-3 text-[16px] text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all duration-200";

const BTN_PRIMARY =
  "w-full rounded-xl bg-accent px-4 py-3.5 text-sm font-semibold text-white hover:bg-accent-hover transition-all duration-200 disabled:opacity-50 min-h-[52px] cursor-pointer hover:shadow-[0_0_24px_rgba(201,162,39,0.3)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.98]";

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { label: "8+ characters", ok: password.length >= 8 },
    { label: "Uppercase", ok: /[A-Z]/.test(password) },
    { label: "Number", ok: /\d/.test(password) },
  ];
  return (
    <div className="flex items-center gap-3 mt-2">
      {checks.map(({ label, ok }) => (
        <span
          key={label}
          className={`flex items-center gap-1 text-[11px] transition-colors duration-200 ${ok ? "text-green" : "text-muted"}`}
        >
          <span className={`inline-block h-1.5 w-1.5 rounded-full transition-colors duration-200 ${ok ? "bg-green" : "bg-border"}`} />
          {label}
        </span>
      ))}
    </div>
  );
}

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong");
    }
    setLoading(false);
  }

  if (success) {
    return (
      <div className="w-full space-y-5">
        <div className="rounded-2xl border border-border bg-card p-6 space-y-5 shadow-2xl shadow-black/40 text-center">
          <div className="flex flex-col items-center gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green/10 border border-green/25">
              <CheckCircle2 className="h-7 w-7 text-green" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Check your inbox</h2>
              <p className="text-sm text-muted mt-1 leading-relaxed">
                We sent a verification link to <span className="text-foreground font-medium">{email}</span>. Click it to activate your account.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className={BTN_PRIMARY.replace("w-full", "block w-full text-center")}
          >
            Go to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5">
      <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4 shadow-2xl shadow-black/40">
        {error && (
          <div className="flex items-start gap-2.5 rounded-xl bg-red/10 border border-red/25 px-3.5 py-3 text-sm text-red leading-snug">
            <span className="shrink-0 mt-px">⚠</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="block text-sm font-medium text-foreground">
              Name <span className="text-muted font-normal">(optional)</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={INPUT_CLS}
              placeholder="Your name"
            />
            <p className="text-[11px] text-muted">Used as your display name across the app</p>
          </div>

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
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_CLS}
              placeholder="you@example.com"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-medium text-foreground">
              Password
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
            <PasswordStrength password={password} />
          </div>

          <button type="submit" disabled={loading} className={BTN_PRIMARY}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
              </span>
            ) : "Create account"}
          </button>
        </form>
      </div>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-accent font-medium hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
