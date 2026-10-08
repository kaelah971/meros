import { beforeEach, describe, expect, it, vi } from "vitest";
import { isLegacyDevIdentityEnabled } from "../env";
import { identityError, resolveProductIdentity } from "../product-identity";

// next/headers has no request scope in tests: control the cookie jar here.
// Better Auth reads the session cookie from these headers.
let cookieJar = "";
vi.mock("next/headers", () => ({
  headers: async () => new Headers(cookieJar ? { cookie: cookieJar } : {}),
}));

const ORIG_ENV = { ...process.env };

beforeEach(() => {
  cookieJar = "";
  process.env = { ...ORIG_ENV };
  delete process.env.MEROS_ENABLE_LEGACY_DEV_IDENTITY;
});

describe("legacy dev flag", () => {
  it("D. disabled by default (unset, empty, or non-true)", () => {
    expect(isLegacyDevIdentityEnabled()).toBe(false);
    process.env.MEROS_ENABLE_LEGACY_DEV_IDENTITY = "";
    expect(isLegacyDevIdentityEnabled()).toBe(false);
    process.env.MEROS_ENABLE_LEGACY_DEV_IDENTITY = "1";
    expect(isLegacyDevIdentityEnabled()).toBe(false);
  });

  it("D. enabled only when explicitly true outside production", () => {
    process.env.MEROS_ENABLE_LEGACY_DEV_IDENTITY = "true";
    expect(isLegacyDevIdentityEnabled()).toBe(true);
  });

  it("E. production refuses legacy identity even if the flag is set", () => {
    const env = process.env as Record<string, string | undefined>;
    const prev = env.NODE_ENV;
    process.env.MEROS_ENABLE_LEGACY_DEV_IDENTITY = "true";
    env.NODE_ENV = "production";
    try {
      expect(isLegacyDevIdentityEnabled()).toBe(false);
    } finally {
      if (prev === undefined) delete env.NODE_ENV;
      else env.NODE_ENV = prev;
    }
  });
});

describe("product identity gate", () => {
  it("A/B. anonymous callers get 401 even with a valid-looking accessCode", async () => {
    await expect(
      resolveProductIdentity({ workspaceSlug: "acme", accessCode: "P0-ALICE-01" }),
    ).rejects.toMatchObject({ status: 401 });
    await expect(
      resolveProductIdentity({
        workspaceSlug: "acme",
        accessCode: "P0-ALICE-01",
        message: "hi",
        history: [],
      }),
    ).rejects.toMatchObject({ status: 401 });
    // And the shared error mapper preserves it.
    try {
      await resolveProductIdentity({ workspaceSlug: "acme" });
      expect.unreachable();
    } catch (e) {
      expect(identityError(e)).toMatchObject({ status: 401 });
    }
  });

  it("C. an authenticated session resolves auth identity; accessCode is ignored", async () => {
    const { auth } = await import("../better-auth");
    const email = `route-gate-${Date.now().toString(36)}@example.test`;
    await auth.api.signUpEmail({
      body: { email, password: "correct-horse-123", name: "gate" },
      headers: new Headers(),
    });
    const signin = (await auth.api.signInEmail({
      body: { email, password: "correct-horse-123" },
      headers: new Headers(),
      asResponse: true,
    })) as unknown as Response;
    const setCookie = signin.headers.getSetCookie().find((c) => c.startsWith("meros.session_token="))!;
    expect(setCookie, "session cookie issued").toBeTruthy();
    cookieJar = setCookie.split(";")[0];

    // Need a workspace row for the tenant lookup.
    const { neon } = await import("@neondatabase/serverless");
    const { readFileSync } = await import("node:fs");
    const key = readFileSync(".env.local", "utf8")
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.startsWith("DATABASE_URL="))!
      .slice("DATABASE_URL=".length);
    const sql = neon(key);
    const { organizationIdForSlug, workspaceIdForSlug } = await import("../tenant");
    const orgId = organizationIdForSlug("gate-ws");
    const wsId = workspaceIdForSlug("gate-ws");
    await sql`insert into organizations (id, slug, name) values (${orgId}, 'gate-ws', 'Gate') on conflict (id) do nothing`;
    await sql`insert into workspaces (id, organization_id, slug, name) values (${wsId}, ${orgId}, 'gate-ws', 'Gate') on conflict (id) do nothing`;
    try {
      const withSpoof = await resolveProductIdentity({
        workspaceSlug: "gate-ws",
        accessCode: "SPOOFED-CODE-99",
      });
      const withoutSpoof = await resolveProductIdentity({ workspaceSlug: "gate-ws" });
      // Identical auth-derived identity regardless of the spoofed code.
      expect(withSpoof.customerId).toBe(withoutSpoof.customerId);
      expect(withSpoof.privateNamespace).toBe(withoutSpoof.privateNamespace);
      expect(withSpoof.privateNamespace).toContain(withoutSpoof.workspaceId);
    } finally {
      await sql`delete from organizations where id = ${orgId}`;
      const { user } = (await auth.api.getSession({ headers: new Headers({ cookie: cookieJar }) }))!;
      await sql`delete from "user" where id = ${user.id}`;
    }
  }, 60_000);
});
