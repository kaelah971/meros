import { describe, expect, it, afterAll } from "vitest";
// Env (.env.local) is loaded by vitest globalSetup before imports, so the
// Better Auth pg Pool below connects to live Neon.
import { auth } from "../better-auth";
import {
  slugifyOrgName,
  validateEmail,
  validateOrgName,
  validatePassword,
} from "../auth-crypto";
import {
  addOrganizationMember,
  createOrganizationWithOwner,
  createWorkspaceRecord,
  getMembership,
  getOwnedWorkspace,
  getOwnedWorkspaces,
  getUserMemberships,
} from "../db";
import { organizationIdForSlug, workspaceIdForSlug } from "../tenant";

const stamp = Date.now().toString(36);
const PW = "correct-horse-123";
const createdEmails: string[] = [];
const createdOrgIds: string[] = [];

// Full session cookie comes from the signup response's Set-Cookie header
// (value = token.signature, HttpOnly/SameSite managed by Better Auth).
async function signupSession(email: string) {
  const res = (await auth.api.signUpEmail({
    body: { email, password: PW, name: email.split("@")[0] },
    headers: new Headers(),
    asResponse: true,
  })) as unknown as Response;
  const setCookies = res.headers.getSetCookie();
  const sessionCookie = setCookies.find((c) => c.startsWith("meros.session_token="))!;
  expect(sessionCookie, "session set-cookie present").toBeTruthy();
  createdEmails.push(email);
  return sessionCookie.split(";")[0];
}
const withCookie = (cookie: string) => new Headers({ cookie });

async function signupFixture(email: string) {
  const res = await auth.api.signUpEmail({
    body: { email, password: PW, name: email.split("@")[0] },
    headers: new Headers(),
  });
  createdEmails.push(email);
  return res as unknown as { token: string; user: { id: string; email: string } };
}

async function orgFixture(slug: string, name: string, userId: string) {
  const orgId = organizationIdForSlug(slug);
  await createOrganizationWithOwner({ orgId, orgSlug: slug, orgName: name, userId });
  createdOrgIds.push(orgId);
  return orgId;
}

function apiStatus(e: unknown): number | undefined {
  const o = e as { status?: unknown; statusCode?: unknown };
  return typeof o.status === "number" ? o.status : typeof o.statusCode === "number" ? o.statusCode : undefined;
}

afterAll(async () => {
  // Best-effort cleanup (cascades to session/account/members).
  const { neon } = await import("@neondatabase/serverless");
  const { readFileSync } = await import("node:fs");
  const key = readFileSync(".env.local", "utf8")
    .split("\n").map((l) => l.trim()).find((l) => l.startsWith("DATABASE_URL="))!
    .slice("DATABASE_URL=".length);
  const sql = neon(key);
  for (const id of createdOrgIds) {
    await sql`delete from organizations where id = ${id}`;
  }
  for (const email of createdEmails) {
    await sql`delete from "user" where email = ${email}`;
  }
}, 60_000);

describe("auth origin configuration", () => {
  it("baseURL and trustedOrigins follow BETTER_AUTH_URL (origin check stays on)", () => {
    const expected = (process.env.BETTER_AUTH_URL ?? "").trim();
    expect(expected.length, "BETTER_AUTH_URL must be configured for tests").toBeGreaterThan(0);
    const opts = auth.options as unknown as {
      baseURL?: string;
      trustedOrigins?: string[];
    };
    expect(opts.baseURL).toBe(expected);
    expect(opts.trustedOrigins ?? []).toContain(expected);
  });
});

describe("auth input validators (pure)", () => {
  it("accepts and normalizes email", () => {
    expect(validateEmail("  Owner@Example.Test ")).toBe("owner@example.test");
  });
  it("rejects bad email and short passwords", () => {
    expect(() => validateEmail("not-an-email")).toThrow();
    expect(() => validatePassword("short")).toThrow();
    expect(validatePassword("long-enough-123")).toBe("long-enough-123");
  });
  it("org names validate; slugs slugify", () => {
    expect(validateOrgName("  Acme Inc  ")).toBe("Acme Inc");
    expect(() => validateOrgName("x")).toThrow();
    expect(slugifyOrgName("Acme Inc!")).toBe("acme-inc");
  });
});

describe("Better Auth owner signup/login (live Neon)", () => {
  it("A. signup creates the canonical Better Auth user", async () => {
    const email = `ba-a-${stamp}@example.test`;
    const res = await signupFixture(email);
    expect(res.user.email).toBe(email);
    expect(typeof res.user.id).toBe("string");
    expect(res.token).toBeTruthy();
  }, 60_000);

  it("B. correct password logs in; C. wrong password fails", async () => {
    const email = `ba-b-${stamp}@example.test`;
    await signupFixture(email);
    const ok = await auth.api.signInEmail({
      body: { email, password: PW },
      headers: new Headers(),
    });
    expect(ok.user.email).toBe(email);
    await expect(
      auth.api.signInEmail({ body: { email, password: "wrong-password-1" }, headers: new Headers() }),
    ).rejects.toSatisfy((e: unknown) => apiStatus(e) === 401);
  }, 60_000);

  it("D. session persists across requests; E. logout invalidates it", async () => {
    const email = `ba-c-${stamp}@example.test`;
    const cookie = await signupSession(email);
    const before = await auth.api.getSession({ headers: withCookie(cookie) });
    expect(before?.user.email).toBe(email);
    await auth.api.signOut({ headers: withCookie(cookie) });
    const after = await auth.api.getSession({ headers: withCookie(cookie) });
    expect(after).toBeNull();
  }, 60_000);
});

describe("organization membership + tenant authorization (live Neon)", () => {
  it("G+I. owner accesses own org/workspace; membership ties to the Better Auth user", async () => {
    const email = `ba-d-${stamp}@example.test`;
    const { user } = await signupFixture(email);
    const orgId = await orgFixture(`ba-acme-${stamp}`, "Acme Test", user.id);
    const wsId = workspaceIdForSlug(`ba-acme-${stamp}`);
    await createWorkspaceRecord({
      id: wsId,
      organizationId: orgId,
      slug: `ba-acme-${stamp}`,
      name: "Acme Support",
      productName: "Acme Product",
      productDescription: null,
      supportContext: null,
    });
    const ws = await getOwnedWorkspace(user.id, `ba-acme-${stamp}`);
    expect(ws?.id).toBe(wsId);
    expect(ws?.role).toBe("owner");
    const list = await getOwnedWorkspaces(user.id, orgId);
    expect(list?.map((w) => w.slug)).toContain(`ba-acme-${stamp}`);
    const members = await getUserMemberships(user.id);
    expect(members.map((m) => m.organization_id)).toContain(orgId);
  }, 60_000);

  it("H. Acme owner cannot access Nova workspace", async () => {
    const { user: userA } = await signupFixture(`ba-e-${stamp}@example.test`);
    const { user: userB } = await signupFixture(`ba-f-${stamp}@example.test`);
    const orgA = await orgFixture(`ba-orga-${stamp}`, "Org A", userA.id);
    const orgB = await orgFixture(`ba-orgb-${stamp}`, "Org B", userB.id);
    await createWorkspaceRecord({
      id: workspaceIdForSlug(`ba-orgb-${stamp}`),
      organizationId: orgB,
      slug: `ba-orgb-${stamp}`,
      name: "B Support",
      productName: null,
      productDescription: null,
      supportContext: null,
    });
    expect(await getMembership(userA.id, orgB)).toBeNull();
    expect(await getOwnedWorkspace(userA.id, `ba-orgb-${stamp}`)).toBeNull();
    expect(await getOwnedWorkspaces(userA.id, orgB)).toBeNull();
    expect(await getOwnedWorkspace(userB.id, `ba-orgb-${stamp}`)).not.toBeNull();
    expect(orgA).not.toBe(orgB);
  }, 60_000);

  it("I2. membership can extend to a second organization", async () => {
    const { user } = await signupFixture(`ba-g-${stamp}@example.test`);
    const org1 = await orgFixture(`ba-one-${stamp}`, "One", user.id);
    const org2 = await orgFixture(`ba-two-${stamp}`, "Two", user.id);
    await addOrganizationMember({ organizationId: org2, userId: user.id, role: "owner" });
    const members = await getUserMemberships(user.id);
    expect(members.map((m) => m.organization_id)).toEqual(
      expect.arrayContaining([org1, org2]),
    );
  }, 60_000);
});

describe("server route protection (static)", () => {
  it("F. /app redirects anonymous users server-side before owner UI renders", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("app/app/page.tsx", "utf8");
    expect(src).not.toMatch(/"use client"/);
    expect(src).toMatch(/redirect\("\/login"\)/);
    expect(src).toMatch(/currentUser\(\)/);
  });
});

describe("no memory side effects (static)", () => {
  it("J. org/workspace/auth paths contain zero Walrus calls", async () => {
    const { readFileSync } = await import("node:fs");
    const files = [
      "app/api/organizations/route.ts",
      "app/api/workspaces/route.ts",
      "app/api/workspaces/[slug]/route.ts",
      "app/api/auth/[...all]/route.ts",
      "lib/auth.ts",
      "lib/auth-crypto.ts",
      "lib/better-auth.ts",
    ];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/from ["']@\/lib\/walrus["']/);
      expect(src, f).not.toMatch(/\bmemwal\b/i);
      expect(src, f).not.toMatch(/\bremember\w*\(/);
      expect(src, f).not.toMatch(/\brecall\w*\(/);
    }
  });
});
