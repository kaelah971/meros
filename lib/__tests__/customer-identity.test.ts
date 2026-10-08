import { describe, expect, it, afterAll } from "vitest";
import {
  customerIdForAuth,
  derivePrivateNamespaceV2,
  deriveSharedNamespaceV2,
  workspaceIdForSlug,
} from "../tenant";
import {
  UnknownWorkspaceError,
  resolveAuthenticatedCustomer,
} from "../tenant-store";
import {
  ensureOrganization,
  ensureWorkspace,
  getOwnedWorkspace,
} from "../db";
import { organizationIdForSlug } from "../tenant";

const stamp = Date.now().toString(36);
const createdOrgIds: string[] = [];
const createdEmails: string[] = [];
const PW = "correct-horse-123";
// Placeholder ids for pure-derivation tests (no DB involved).
const AUTH_A = `auth-user-aaa-${stamp}`;
const AUTH_B = `auth-user-bbb-${stamp}`;
// Real Better Auth ids for live-Neon tests (FK requires genuine rows).
let LIVE_A = "";
let LIVE_B = "";

async function authUserFixture(email: string): Promise<string> {
  const { auth } = await import("../better-auth");
  const res = (await auth.api.signUpEmail({
    body: { email, password: PW, name: email.split("@")[0] },
    headers: new Headers(),
  })) as unknown as { user: { id: string } };
  createdEmails.push(email);
  return res.user.id;
}

async function tempWorkspace(slug: string) {
  const orgId = organizationIdForSlug(slug);
  await ensureOrganization({ id: orgId, slug, name: `Temp ${slug}` });
  await ensureWorkspace({
    id: workspaceIdForSlug(slug),
    organizationId: orgId,
    slug,
    name: `Temp ${slug}`,
  });
  createdOrgIds.push(orgId);
}

afterAll(async () => {
  const { neon } = await import("@neondatabase/serverless");
  const { readFileSync } = await import("node:fs");
  const key = readFileSync(".env.local", "utf8")
    .split("\n").map((l) => l.trim()).find((l) => l.startsWith("DATABASE_URL="))!
    .slice("DATABASE_URL=".length);
  const sql = neon(key);
  for (const id of createdOrgIds) {
    await sql`delete from organizations where id = ${id}`;
  }
  // Auth-user customer rows cascade with their workspace's org deletion.
  for (const email of createdEmails) {
    await sql`delete from "user" where email = ${email}`;
  }
});

describe("customerIdForAuth derivation (pure)", () => {
  it("is stable for the same workspace + auth user", () => {
    const ws = workspaceIdForSlug("acme");
    expect(customerIdForAuth(ws, AUTH_A)).toBe(customerIdForAuth(ws, AUTH_A));
    expect(customerIdForAuth(ws, AUTH_A)).toMatch(/^[0-9a-f]{32}$/);
  });

  it("isolates workspaces and users structurally", () => {
    const acme = workspaceIdForSlug("acme");
    const nova = workspaceIdForSlug("nova");
    // Same auth user, different workspaces → different customers/namespaces.
    expect(customerIdForAuth(acme, AUTH_A)).not.toBe(customerIdForAuth(nova, AUTH_A));
    expect(
      derivePrivateNamespaceV2(acme, customerIdForAuth(acme, AUTH_A)),
    ).not.toBe(
      derivePrivateNamespaceV2(nova, customerIdForAuth(nova, AUTH_A)),
    );
    expect(deriveSharedNamespaceV2(acme)).not.toBe(deriveSharedNamespaceV2(nova));
    // Different users, same workspace → different customers, same shared ns.
    expect(customerIdForAuth(acme, AUTH_A)).not.toBe(customerIdForAuth(acme, AUTH_B));
    expect(deriveSharedNamespaceV2(acme)).toBe(deriveSharedNamespaceV2(acme));
  });

  it("keeps the v2 namespace shape; never embeds email or tokens", () => {
    const ns = derivePrivateNamespaceV2(
      workspaceIdForSlug("acme"),
      customerIdForAuth(workspaceIdForSlug("acme"), "user_abc123"),
    );
    expect(ns).toMatch(/^meros:v2:workspace:[0-9a-f]{32}:customer:[0-9a-f]{32}$/);
    expect(ns).not.toContain("user_abc123");
    expect(() => customerIdForAuth(workspaceIdForSlug("acme"), "")).toThrow();
  });
});

describe("resolveAuthenticatedCustomer (live Neon)", () => {
  it("setup: two real Better Auth users", async () => {
    LIVE_A = await authUserFixture(`cu-alice-${stamp}@example.test`);
    LIVE_B = await authUserFixture(`cu-bob-${stamp}@example.test`);
    expect(LIVE_A).toBeTruthy();
    expect(LIVE_B).not.toBe(LIVE_A);
  }, 120_000);
  it("creates the customer row once, idempotently, with zero Walrus writes", async () => {
    const slug = `cu-a-${stamp}`;
    await tempWorkspace(slug);
    const user = { id: LIVE_A, email: "alice@example.test", displayName: "Alice" };
    const first = await resolveAuthenticatedCustomer(slug, user);
    expect(first.persisted).toBe(true);
    expect(first.created).toBe(true);
    expect(first.customerId).toBe(customerIdForAuth(first.workspaceId, LIVE_A));
    expect(first.privateNamespace).toBe(
      derivePrivateNamespaceV2(first.workspaceId, first.customerId),
    );
    const second = await resolveAuthenticatedCustomer(slug, user);
    expect(second.customerId).toBe(first.customerId);
    expect(second.created).toBe(false);
    expect(second.privateNamespace).toBe(first.privateNamespace);
  }, 60_000);

  it("same auth user gets isolated customers per workspace", async () => {
    const slugA = `cu-b-${stamp}`;
    const slugB = `cu-c-${stamp}`;
    await tempWorkspace(slugA);
    await tempWorkspace(slugB);
    const user = { id: LIVE_A, email: "alice@example.test", displayName: null };
    const a = await resolveAuthenticatedCustomer(slugA, user);
    const b = await resolveAuthenticatedCustomer(slugB, user);
    expect(a.customerId).not.toBe(b.customerId);
    expect(a.privateNamespace).not.toBe(b.privateNamespace);
    expect(a.sharedNamespace).not.toBe(b.sharedNamespace);
  }, 60_000);

  it("unknown workspace slugs are rejected, never defaulted", async () => {
    await expect(
      resolveAuthenticatedCustomer(`nope-${stamp}`, {
        id: LIVE_A,
        email: "a@b.c",
        displayName: null,
      }),
    ).rejects.toBeInstanceOf(UnknownWorkspaceError);
  }, 60_000);
});

describe("owner/customer permission separation (live Neon)", () => {
  it("authenticated customer without membership cannot reach owner admin", async () => {
    const slug = `cu-d-${stamp}`;
    await tempWorkspace(slug);
    // No organization_members row for LIVE_B anywhere: all owner reads deny.
    expect(await getOwnedWorkspace(LIVE_B, slug)).toBeNull();
  }, 60_000);
});

describe("no memory side effects (static)", () => {
  it("customer identity path performs zero Walrus calls", async () => {
    const { readFileSync } = await import("node:fs");
    for (const f of ["lib/tenant-store.ts", "lib/db.ts"]) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/from ["']@\/lib\/walrus["']/);
      expect(src, f).not.toMatch(/\bmemwal\b/i);
      expect(src, f).not.toMatch(/\bremember\w*\(/);
      expect(src, f).not.toMatch(/\brecall\w*\(/);
    }
  });
});
