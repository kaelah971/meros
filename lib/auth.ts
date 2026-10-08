import "server-only";
import { headers } from "next/headers";
import { auth } from "./better-auth";
import { dbAvailable } from "./db";

export type SafeUser = { id: string; email: string; displayName: string | null };

/** Server-side session validation via Better Auth. Null when anonymous. */
export async function currentUser(): Promise<SafeUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;
  return {
    id: session.user.id,
    email: session.user.email,
    displayName: session.user.name ?? null,
  };
}

export async function requireUser(): Promise<SafeUser> {
  const user = await currentUser();
  if (!user) {
    const e = new Error("not signed in") as Error & { status?: number };
    e.status = 401;
    throw e;
  }
  return user;
}

export async function requireDb() {
  if (!(await dbAvailable())) {
    const e = new Error("database unavailable (DATABASE_URL not configured)") as Error & {
      status?: number;
    };
    e.status = 503;
    throw e;
  }
}
