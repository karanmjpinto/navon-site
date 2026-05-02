import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { users, accounts, sessions, verificationTokens } from "@/db/schema";
import { verifyPassword } from "@/lib/password";
import { verifyTotp } from "@/lib/totp";

const credentialsSchema = z.object({
  email: z.string().email().toLowerCase().trim(),
  password: z.string().min(1).max(200),
  totp: z.string().optional(),
});

const MAX_FAILED = 5;
const LOCKOUT_MINUTES = 15;

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: users,
    accountsTable: accounts,
    sessionsTable: sessions,
    verificationTokensTable: verificationTokens,
  }),
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
        totp: {},
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password, totp } = parsed.data;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);
        if (!user) return null;

        if (user.lockedUntil && user.lockedUntil > new Date()) return null;

        const passwordOk = await verifyPassword(password, user.passwordHash);
        const totpOk = user.totpEnabled
          ? !!user.totpSecret &&
            !!totp &&
            verifyTotp(user.totpSecret, totp.trim())
          : true;

        if (!passwordOk || !totpOk) {
          const next = user.failedLoginCount + 1;
          await db
            .update(users)
            .set({
              failedLoginCount: next,
              lockedUntil:
                next >= MAX_FAILED
                  ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
                  : user.lockedUntil,
            })
            .where(eq(users.id, user.id));
          return null;
        }

        await db
          .update(users)
          .set({ failedLoginCount: 0, lockedUntil: null })
          .where(eq(users.id, user.id));

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          image: user.image ?? undefined,
        };
      },
    }),
    Resend({
      from: process.env.EMAIL_FROM!,
      apiKey: process.env.AUTH_RESEND_KEY!,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.uid && session.user) {
        session.user.id = token.uid as string;
      }
      return session;
    },
  },
});

// Surfaced for the login page so it can show the TOTP field conditionally
// without exposing the password to the client.
export async function userMfaStatus(email: string): Promise<{
  exists: boolean;
  totpEnabled: boolean;
}> {
  const [u] = await db
    .select({ totpEnabled: users.totpEnabled })
    .from(users)
    .where(eq(users.email, email.toLowerCase().trim()))
    .limit(1);
  return { exists: !!u, totpEnabled: !!u?.totpEnabled };
}
