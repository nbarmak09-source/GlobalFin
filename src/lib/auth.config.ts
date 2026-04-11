import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import type { NextAuthConfig } from "next-auth";

/**
 * Edge-safe auth config for middleware. Do not add adapter, Prisma, or
 * Credentials (bcrypt) here — they use Node.js crypto and break the Edge runtime.
 */
const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt" as const,
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      allowDangerousEmailAccountLinking: false,
    }),
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
      allowDangerousEmailAccountLinking: false,
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        (token as { id?: string }).id = user.id;
        (token as { emailVerified?: Date | null }).emailVerified =
          "emailVerified" in user && user.emailVerified !== undefined
            ? (user.emailVerified as Date | null)
            : null;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token as { id?: string }).id as string;
        session.user.emailVerified =
          (token as { emailVerified?: Date | null }).emailVerified ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export { authConfig };
export const { auth } = NextAuth(authConfig);
