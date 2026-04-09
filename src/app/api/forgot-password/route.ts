import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";

const RESET_EXPIRY_HOURS = 1;

function baseUrl(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (body == null || typeof body !== "object") {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const emailStr =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!emailStr || !emailStr.includes("@")) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const user = await prisma.user.findUnique({ where: { email: emailStr } });

    // Always return 200 to avoid leaking whether the email exists
    if (!user || !user.hashedPassword) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + RESET_EXPIRY_HOURS * 60 * 60 * 1000);
    const identifier = `reset:${emailStr}`;

    // Upsert: delete any existing reset token for this email, then create a new one
    await prisma.verificationToken.deleteMany({ where: { identifier } });
    await prisma.verificationToken.create({
      data: { identifier, token, expires },
    });

    const resetUrl = `${baseUrl(request)}/reset-password?token=${encodeURIComponent(token)}`;
    await sendPasswordResetEmail(emailStr, resetUrl);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("Forgot password error:", error);
    // Still return 200 to avoid leaking information
    return NextResponse.json({ ok: true }, { status: 200 });
  }
}
