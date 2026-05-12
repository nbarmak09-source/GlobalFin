import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
const APP_NAME = "GlobalFin";

function appBaseUrl(): string {
  const nextAuth = process.env.NEXTAUTH_URL?.trim();
  if (nextAuth) return nextAuth.replace(/\/+$/, "");
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/^https?:\/\//i, "").replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}

export async function sendPasswordResetEmail(to: string, resetUrl: string): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set; skipping password reset email to", to);
    return { ok: false, error: "Email not configured" };
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Reset your ${APP_NAME} password`,
      html: `
        <p>You requested a password reset for your ${APP_NAME} account.</p>
        <p>Click the link below to set a new password:</p>
        <p><a href="${resetUrl}" style="color: #c9a227;">${resetUrl}</a></p>
        <p>This link expires in 1 hour. If you didn't request a password reset, you can ignore this email.</p>
      `,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send email";
    console.error("[email] sendPasswordResetEmail error:", message);
    return { ok: false, error: message };
  }
}

export async function sendVerificationEmail(to: string, verifyUrl: string): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set; skipping verification email to", to);
    return { ok: false, error: "Email not configured" };
  }
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Verify your ${APP_NAME} account`,
      html: `
        <p>Thanks for signing up for ${APP_NAME}.</p>
        <p>Click the link below to verify your email address:</p>
        <p><a href="${verifyUrl}" style="color: #c9a227;">${verifyUrl}</a></p>
        <p>This link expires in 24 hours. If you didn't create an account, you can ignore this email.</p>
      `,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send email";
    console.error("[email] sendVerificationEmail error:", message);
    return { ok: false, error: message };
  }
}

export async function sendPriceAlertTriggeredEmail(args: {
  to: string;
  symbol: string;
  companyName: string;
  direction: string;
  targetPrice: number;
  currentPrice: number;
  note: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not set; skipping price alert email to", args.to);
    return { ok: false, error: "Email not configured" };
  }

  const base = appBaseUrl();
  const alertsUrl = `${base}/alerts`;
  const directionLabel = args.direction === "below" ? "at or below" : "at or above";
  const fmt = (n: number) =>
    n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });

  const subject = `${APP_NAME} alert: ${args.symbol} crossed ${fmt(args.targetPrice)}`;
  const noteBlock =
    args.note && args.note.trim()
      ? `<p style="margin:12px 0 0;"><strong>Note:</strong> ${escapeHtml(args.note.trim())}</p>`
      : "";

  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: args.to,
      subject,
      html: `
        <p>Your price alert for <strong>${escapeHtml(args.symbol)}</strong>${
          args.companyName && args.companyName !== args.symbol
            ? ` (${escapeHtml(args.companyName)})`
            : ""
        } fired.</p>
        <p>The stock is ${directionLabel} your target of <strong>${fmt(args.targetPrice)}</strong> (last price we saw: <strong>${fmt(args.currentPrice)}</strong>).</p>
        ${noteBlock}
        <p style="margin:16px 0 0;"><a href="${alertsUrl}" style="color: #c9a227;">View your alerts</a> · <a href="${base}/account#security" style="color: #888;">Notification settings</a></p>
        <p style="margin-top:16px;font-size:12px;color:#888;">Prices are indicative. Turn off alert emails in Account → Security.</p>
      `,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed to send email";
    console.error("[email] sendPriceAlertTriggeredEmail error:", message);
    return { ok: false, error: message };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
