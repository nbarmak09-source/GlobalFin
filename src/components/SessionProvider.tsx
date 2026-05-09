"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import type { Session } from "next-auth";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** From server `auth()` — required for dev bypass so client matches server without a session cookie. */
  session?: Session | null;
  /**
   * When using DISABLE_AUTH dev bypass, keep false so a client refetch does not replace the
   * server-provided session with null (NextAuth session endpoint is cookie-only).
   */
  refetchOnWindowFocus?: boolean;
};

export default function SessionProvider({
  children,
  session,
  refetchOnWindowFocus = true,
}: Props) {
  return (
    <NextAuthSessionProvider
      session={session ?? undefined}
      refetchOnWindowFocus={refetchOnWindowFocus}
    >
      {children}
    </NextAuthSessionProvider>
  );
}
