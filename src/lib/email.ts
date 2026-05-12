import { Resend } from "resend";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const FROM_EMAIL = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
const APP_NAME = "GlobalFin";

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
