import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";
import { sendVerificationEmail } from "@/lib/email";
import { checkRateLimit } from "@/lib/rate-limit";

const VERIFY_EXPIRY_HOURS = 24;

const GENERIC_MESSAGE =
  "If an account exists that needs verification, check your email for a link.";

function baseUrl(request: NextRequest): string {
  const fromEnv = process.env.NEXTAUTH_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXTAUTH_URL must be set in production. It is required to build trusted absolute URLs (e.g. email verification links)."
    );
  }
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (body == null || typeof body !== "object") {
      return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
    }

    const emailRaw = typeof (body as { email?: unknown }).email === "string"
      ? (body as { email: string }).email
      : "";
    const emailStr = emailRaw.trim().toLowerCase();
    if (!emailStr || !emailStr.includes("@")) {
      return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
    }

    const { allowed } = await checkRateLimit(
      emailStr,
      "resendVerification"
    );
    if (!allowed) {
      return NextResponse.json(
        {
          message:
            "Please wait a few minutes before requesting another verification email.",
        },
        { status: 429 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: emailStr },
    });

    if (!user?.hashedPassword || user.emailVerified) {
      return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
    }

    await prisma.verificationToken.deleteMany({
      where: { identifier: emailStr },
    });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + VERIFY_EXPIRY_HOURS * 60 * 60 * 1000);
    await prisma.verificationToken.create({
      data: {
        identifier: emailStr,
        token,
        expires,
      },
    });

    const verifyUrl = `${baseUrl(request)}/api/verify-email?token=${encodeURIComponent(token)}`;
    await sendVerificationEmail(emailStr, verifyUrl);

    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json({ message: GENERIC_MESSAGE }, { status: 200 });
  }
}
