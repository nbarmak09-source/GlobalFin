import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";

const SALT_ROUNDS = 10;
const VERIFY_EXPIRY_HOURS = 24;

function baseUrl(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "localhost:3000";
  const proto = request.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    if (body == null || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const { email, password, name } = body;

    const emailStr =
      typeof email === "string" ? email.trim().toLowerCase() : "";
    if (!emailStr || !emailStr.includes("@")) {
      return NextResponse.json(
        { error: "Valid email is required" },
        { status: 400 }
      );
    }

    const passwordStr = typeof password === "string" ? password : "";
    if (passwordStr.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: emailStr },
    });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(passwordStr, SALT_ROUNDS);
    const displayName =
      typeof name === "string" && name.trim() ? name.trim() : emailStr;

    const user = await prisma.user.create({
      data: {
        email: emailStr,
        name: displayName,
        hashedPassword,
      },
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

    return NextResponse.json(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        message: "Account created. Please check your email to verify your account before signing in.",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
