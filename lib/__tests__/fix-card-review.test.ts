import { describe, expect, it, afterAll, vi } from "vitest";
import {
  addOrganizationMember,
  ensureOrganization,
  ensureWorkspace,
} from "../db";
import { organizationIdForSlug, workspaceIdForSlug } from "../tenant";
import { resolveAuthenticatedCustomer } from "../tenant-store";
import { createPendingFixCard, getFixCardForWorkspace } from "../support-ops";
import { POST as reviewPOST } from "@/app/api/fix-cards/[id]/review/route";

// next/headers has no request scope in tests: control the cookie jar here.
let cookieJar = "";
vi.mock("next/headers", () => ({
  headers: async () => new Headers(cookieJar ? { cookie: cookieJar } : {}),
}));

// Review writes are mocked: no real Walrus spend in automated tests.
// (Exactly one real shared write happens in live verification instead.)
vi.mock("@/lib/walrus", () => ({
  WalrusNotConfiguredError: class WalrusNotConfiguredError extends Error {},
  rememberInNamespace: vi.fn(async () => ({
    blobId: "test-blob-shared-1",
    jobId: "test-job-1",
    namespace: "test-ns",
    owner: "test-owner",
  })),
}));

const stamp = Date.now().toString(36);
const PW = "correct-horse-123";
const createdEmails: string[] = [];
const createdOrgIds: string[] = [];
const SLUG = `ops-rev-${stamp}`;

async function signupSession(email: string): Promise<string> {
  const { auth } = await import("../better-auth");
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

async function userIdFor(email: string): Promise<string> {
  const { neon } = await import("@neondatabase/serverless");
  const { readFileSync } = await import("node:fs");
  const key = readFileSync(".env.local", "utf8")
    .split("\n").map((l) => l.trim()).find((l) => l.startsWith("DATABASE_URL="))!
    .slice("DATABASE_URL=".length);
  const sql = neon(key);
  const rows = (await sql`select id from "user" where email = ${email} limit 1`) as unknown as {
    id: string;
  }[];
  return rows[0].id;
}

function reviewReq(cardId: string, body: unknown) {
  return new Request(`http://test/api/fix-cards/${cardId}/review`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}
const ctxFor = (id: string) => ({ params: Promise.resolve({ id }) });

const CANDIDATE = [
  "[SHARED_FIX]",
  "Symptom: CSV import returns HTTP 422.",
  "Cause: The CSV likely uses semicolon delimiters instead of comma delimiters expected by the importer.",
  "Resolution: Re-export the file as CSV UTF-8 with comma delimiters and retry the import.",
].join("\n");

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
  for (const email of createdEmails) {
    await sql`delete from "user" where email = ${email}`;
  }
});

describe("fix card review gate (live Neon, mocked Walrus)", () => {
  it("setup: workspace, customer, staffer, pending cards", async () => {
    const orgId = organizationIdForSlug(SLUG);
    await ensureOrganization({ id: orgId, slug: SLUG, name: `Temp ${SLUG}` });
    await ensureWorkspace({
      id: workspaceIdForSlug(SLUG),
      organizationId: orgId,
      slug: SLUG,
      name: `Temp ${SLUG}`,
    });
    createdOrgIds.push(orgId);
    // Staffer with owner membership.
    const staffCookie = await signupSession(`ops-staff-${stamp}@example.test`);
    const staffId = await userIdFor(`ops-staff-${stamp}@example.test`);
    await addOrganizationMember({ organizationId: orgId, userId: staffId, role: "owner" });
    // Plain customer, no membership anywhere.
    await signupSession(`ops-cust-${stamp}@example.test`);
    void staffCookie;
    expect(staffId).toBeTruthy();
  }, 120_000);

  async function pendingCard(): Promise<string> {
    const tenant = await resolveAuthenticatedCustomer(SLUG, {
      id: await userIdFor(`ops-cust-${stamp}@example.test`),
      email: `ops-cust-${stamp}@example.test`,
      displayName: null,
    });
    const { createConversation } = await import("../support-ops");
    const { conversation } = await createConversation({
      workspaceId: tenant.workspaceId,
      customerId: tenant.customerId,
      title: "review fixture",
    });
    const card = await createPendingFixCard({
      workspaceId: tenant.workspaceId,
      customerId: tenant.customerId,
      conversationId: conversation.id,
      issueId: null,
      candidateText: CANDIDATE,
    });
    return card.id;
  }

  async function loginAs(email: string) {
    const { auth } = await import("../better-auth");
    const res = (await auth.api.signInEmail({
      body: { email, password: PW },
      headers: new Headers(),
      asResponse: true,
    })) as unknown as Response;
    const setCookies = res.headers.getSetCookie();
    cookieJar = setCookies.find((c) => c.startsWith("meros.session_token="))!.split(";")[0];
  }

  it("I. customer session cannot Save shared (403), card stays pending", async () => {
    const cardId = await pendingCard();
    await loginAs(`ops-cust-${stamp}@example.test`);
    const res = await reviewPOST(reviewReq(cardId, { workspaceSlug: SLUG, decision: "shared" }), ctxFor(cardId));
    expect(res.status).toBe(403);
    const row = await getFixCardForWorkspace(cardId, workspaceIdForSlug(SLUG));
    expect(row?.status).toBe("pending_review");
    expect(row?.walrus_blob_id).toBeNull();
  }, 60_000);

  it("K. staff Keep private writes zero shared bytes, marks kept_private", async () => {
    const { rememberInNamespace } = await import("@/lib/walrus");
    const mocked = rememberInNamespace as unknown as { mock: { calls: unknown[] }; mockClear: () => void };
    mocked.mockClear();
    const cardId = await pendingCard();
    await loginAs(`ops-staff-${stamp}@example.test`);
    const res = await reviewPOST(
      reviewReq(cardId, { workspaceSlug: SLUG, decision: "kept_private" }),
      ctxFor(cardId),
    );
    expect(res.status).toBe(200);
    const row = await getFixCardForWorkspace(cardId, workspaceIdForSlug(SLUG));
    expect(row?.status).toBe("kept_private");
    expect(row?.walrus_blob_id).toBeNull();
    expect(row?.reviewed_by_user_id).toBeTruthy();
    expect(mocked.mock.calls).toHaveLength(0);
  }, 60_000);

  it("J+L. staff Save shared records real blob metadata", async () => {
    const cardId = await pendingCard();
    await loginAs(`ops-staff-${stamp}@example.test`);
    const res = await reviewPOST(
      reviewReq(cardId, { workspaceSlug: SLUG, decision: "shared" }),
      ctxFor(cardId),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { blobId?: string };
    expect(body.blobId).toBe("test-blob-shared-1");
    const row = await getFixCardForWorkspace(cardId, workspaceIdForSlug(SLUG));
    expect(row?.status).toBe("shared");
    expect(row?.walrus_blob_id).toBe("test-blob-shared-1");
    expect(row?.reviewed_by_user_id).toBeTruthy();
  }, 60_000);
});
