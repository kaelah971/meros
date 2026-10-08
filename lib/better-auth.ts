import { betterAuth } from "better-auth";
import { Pool } from "pg";

// Sole runtime owner-auth system. Email/password only (no OAuth, magic
// links, 2FA, passkeys). Meros product data (organizations, members,
// workspaces, customers) stays in Meros tables queried via the existing
// Neon HTTP client; Better Auth owns ONLY authentication/session identity
// (user/session/account tables) through this pg Pool.
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  // Neon requires TLS; pooler URLs carry sslmode=require.
  ssl: { rejectUnauthorized: false },
});

// Trimmed origin of this deployment (local :3002, or the production Meros
// origin). Used for baseURL + trustedOrigins so origin validation passes
// for the configured deployment without ever being disabled.
function getBaseURL(): string | undefined {
  const v = process.env.BETTER_AUTH_URL?.trim();
  return v || undefined;
}

// Explicit persistent secret. Production refuses to boot without one;
// development also fails fast with a clear message instead of silently
// falling back to an ephemeral/default secret that would invalidate
// every session on restart.
function getSecret(): string | undefined {
  const v = process.env.BETTER_AUTH_SECRET?.trim();
  if (!v) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "BETTER_AUTH_SECRET is not configured. Refusing to boot in production " +
          "without an explicit persistent secret (rotating/ephemeral secrets would " +
          "invalidate every session).",
      );
    }
    console.warn(
      "[auth] BETTER_AUTH_SECRET is not set — set it in .env.local " +
        "(generate once with `openssl rand -base64 32`). Sessions will not survive restarts.",
    );
    return undefined;
  }
  return v;
}

export const auth = betterAuth({
  database: pool,
  baseURL: getBaseURL(),
  secret: getSecret(),
  trustedOrigins: getBaseURL() ? [getBaseURL() as string] : [],
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 10,
    maxPasswordLength: 256,
    autoSignIn: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: false },
  },
  advanced: {
    cookiePrefix: "meros",
    // Secure cookies are enabled automatically in production by Better Auth.
  },
  user: {
    changeEmail: { enabled: false },
    deleteUser: { enabled: false },
  },
});

export type AuthSession = typeof auth.$Infer.Session;
