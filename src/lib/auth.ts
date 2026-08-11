import NextAuth, { type NextAuthConfig } from "next-auth";
import { redirect } from "next/navigation";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import { db, schema } from "./db";
import type { SessionUser } from "./session-user";

declare module "next-auth" {
  interface Session {
    user: SessionUser & { image?: string | null };
  }
  interface User {
    roles?: string[];
  }
}

const providers: NextAuthConfig["providers"] = [];

// Production: any OIDC identity provider (Okta, Entra ID, ...). Enabled by
// setting OIDC_ISSUER / OIDC_CLIENT_ID / OIDC_CLIENT_SECRET — no code change.
if (process.env.OIDC_ISSUER) {
  providers.push({
    id: "oidc",
    name: "SSO",
    type: "oidc",
    issuer: process.env.OIDC_ISSUER,
    clientId: process.env.OIDC_CLIENT_ID,
    clientSecret: process.env.OIDC_CLIENT_SECRET,
    authorization: { params: { scope: "openid profile email" } },
    profile(profile: Record<string, unknown>) {
      return {
        id: String(profile.sub),
        email: String(profile.email ?? ""),
        name: String(profile.name ?? profile.email ?? ""),
        // Okta sends `groups`, Entra sends `roles`, depending on configuration.
        roles: (profile.roles ?? profile.groups ?? []) as string[],
      };
    },
  });
}

// Local development: "sign in as" a seeded user by email. No external
// identity provider required.
if (process.env.AUTH_DEV_LOGIN === "true") {
  if (process.env.NODE_ENV === "production" && process.env.OIDC_ISSUER) {
    throw new Error("AUTH_DEV_LOGIN must not be enabled alongside production OIDC");
  }
  providers.push(
    Credentials({
      id: "dev-login",
      name: "Dev login",
      credentials: { email: { label: "Email" } },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "");
        const user = await db.query.users.findFirst({
          where: eq(schema.users.email, email),
        });
        if (!user) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name,
          roles: user.roles,
        };
      },
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.roles = (user as { roles?: string[] }).roles ?? [];
      }
      return token;
    },
    session({ session, token }) {
      session.user.userId = String(token.userId ?? "");
      session.user.roles = (token.roles as string[]) ?? [];
      return session;
    },
  },
});

/**
 * Returns the current SessionUser or redirects to /login.
 * Every server component and server action should get the user through this.
 */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }
  const { userId, email, name, roles } = session.user;
  return { userId, email, name: name ?? email, roles: roles ?? [] };
}
