import NextAuth, { CredentialsSignin } from "next-auth";
import type { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { authConfig } from "@/lib/auth.config";
import {
  isDevAuthBypassEnabled,
  resolveDevImpersonateUserId,
} from "@/lib/dev-auth";

class EmailNotVerifiedError extends CredentialsSignin {
  code = "email_not_verified";
}

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      emailVerified?: Date | null;
    };
  }
}

const nextAuth = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  providers: [
    ...authConfig.providers,
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = String(credentials.email).trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email },
        });
        if (!user?.hashedPassword) return null;
        const ok = await bcrypt.compare(
          String(credentials.password),
          user.hashedPassword
        );
        if (!ok) return null;
        // In production, require verified email before allowing sign-in.
        // In local development, allow sign-in even if email is not yet verified.
        if (!user.emailVerified && process.env.NODE_ENV === "production") {
          throw new EmailNotVerifiedError();
        }
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          emailVerified: user.emailVerified,
        };
      },
    }),
  ],
  callbacks: authConfig.callbacks,
});

export const handlers = nextAuth.handlers;
export const signIn = nextAuth.signIn;
export const signOut = nextAuth.signOut;

/** Server-side session; in development with DISABLE_AUTH, may impersonate a DB user. */
export async function auth(): Promise<Session | null> {
  const session = await (nextAuth.auth as () => Promise<Session | null>)();
  if (session?.user?.id) return session;
  if (!isDevAuthBypassEnabled()) return session;

  const userId = await resolveDevImpersonateUserId();
  if (!userId) {
    console.warn(
      "[DISABLE_AUTH] Set DEV_IMPERSONATE_USER_ID or seed a User row — bypass found no user id."
    );
    return session;
  }

  let row: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
    emailVerified: Date | null;
  } | null = null;
  try {
    row = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        emailVerified: true,
      },
    });
  } catch {
    row = null;
  }

  if (!row) {
    console.warn(
      `[DISABLE_AUTH] No User row for id "${userId}" — check DEV_IMPERSONATE_USER_ID or seed the database.`
    );
    return session;
  }

  const expires = new Date(
    Date.now() + 30 * 24 * 60 * 60 * 1000
  ).toISOString();

  return {
    expires,
    user: {
      id: row.id,
      name: row.name ?? "Dev bypass",
      email: row.email ?? "dev-bypass@local.invalid",
      image: row.image ?? null,
      emailVerified: row.emailVerified ?? null,
    },
  };
}
