import bcrypt from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { pool } from "@/lib/db/client";
import type { User } from "@/lib/db/types";

function credentialString(
  credentials: Partial<Record<string, unknown>> | undefined,
  key: string,
): string {
  const value = credentials?.[key];
  return typeof value === "string" ? value : "";
}

const isProduction = process.env.NODE_ENV === "production";
const devSecret = "mantara-voice-inbox-dev-secret-change-before-production";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET || (!isProduction ? devSecret : undefined),
  trustHost: true,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        const email = credentialString(credentials, "email").trim().toLowerCase();
        const password = credentialString(credentials, "password");

        if (!email || !password) {
          return null;
        }

        const { rows } = await pool.query<User>(
          `SELECT id, email, name, password_hash
           FROM users
           WHERE lower(email) = lower($1)
           LIMIT 1`,
          [email],
        );
        const user = rows[0];
        if (!user?.password_hash) {
          return null;
        }

        const passwordOk = await bcrypt.compare(password, user.password_hash);
        if (!passwordOk) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }
      return session;
    },
  },
});
