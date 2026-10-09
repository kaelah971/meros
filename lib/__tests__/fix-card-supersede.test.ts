import { describe, expect, it, afterAll, vi } from "vitest";
import { dropSupersededSharedHits } from "../chat-memory";
import { formatSharedFix } from "../support-memory";
import {
  addOrganizationMember,
  ensureOrganization,
  ensureWorkspace,
} from "../db";
import { organizationIdForSlug, workspaceIdForSlug } from "../tenant";
import { resolveAuthenticatedCustomer } from "../tenant-store";
import {
  createPendingFixCard,
  getFixCardForWorkspace,
  listSupersededSharedBlobs,
} from "../support-ops";
import { POST as reviewPOST } from "@/app/api/fix-cards/[id]/review/route";

// next/headers has no request scope in tests: control the cookie jar here.
let cookieJar = "";
vi.mock("next/headers", () => ({
  headers: async () => new Headers(cookieJar ? { cookie: cookieJar } : {}),
}));

// Distinct blob per write so old vs new versions are distinguishable.
vi.mock("@/lib/walrus", () => {
  let n = 0;
  return {
    WalrusNotConfiguredError: class WalrusNotConfiguredError extends Error {},
    rememberInNamespace: vi.fn(async () => {
      n += 1;
      return {
        blobId: `test-blob-sup-${n}`,
        jobId: `test-job-sup-${n}`,
        namespace: "test-ns",
        owner: "test-owner",
      };
    }),
  };
});

const hit = (blobId: string, text: string) => ({ text, distance: 0.3, blobId });

describe("superseded shared-hit filter (pure)", () => {
  it("drops superseded blob ids, keeps active ones", () => {
    const hits = [hit("old-blob", "tainted fix"), hit("new-blob", "corrected fix")];
    expect(dropSupersededSharedHits(hits, ["old-blob"]).map((h) => h.blobId)).toEqual(["new-blob"]);
  });

  it("empty deny-list passes everything through", () => {
    const hits = [hit("a", "x"), hit("b", "y")];
    expect(dropSupersededSharedHits(hits, [])).toEqual(hits);
  });

  it("unknown deny-list entries change nothing", () => {
    const hits = [hit("a", "x")];
    expect(dropSupersededSharedHits(hits, ["zzz"]).map((h) => h.blobId)).toEqual(["a"]);
  });
});

const stamp = Date.now().toString(36);
const PW = "correct-horse-123";
const createdEmails: string[] = [];
const createdOrgIds: string[] = [];
const SLUG = `ops-sup-${stamp}`;
const OTHER_SLUG = `ops-sup-other-${stamp}`;
const STAFF_EMAIL = `sup-staff-${stamp}@example.test`;
const CUST_EMAIL = `sup-cust-${stamp}@example.test`;

const TAINTED = {
  symptom:
    "Importing a CSV file into Northstar Data fails with HTTP 422 and says a semicolon delimiter was detected instead of comma-delimited columns.",
  cause:
    "The CSV file used semicolons instead of standard commas as delimiters due to regional locale settings.",
  resolution: "Re-exported the CSV as UTF-8 with comma delimiters.",
};
const CORRECTED_CAUSE = "The CSV file used semicolons instead of standard commas as delimiters.";

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

async function walrusMock() {
  const { rememberInNamespace } = await import("@/lib/walrus");
  return rememberInNamespace as unknown as { mock: { calls: unknown[][] }; mockClear: () => void };
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
  for (const email of createdEmails) {
    await sql`delete from "user" where email = ${email}`;
  }
});

describe("shared-fix correction/supersession (live Neon, mocked Walrus)", () => {
  it("setup: workspaces, staffer, customer", async () => {
    for (const slug of [SLUG, OTHER_SLUG]) {
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
    await signupSession(STAFF_EMAIL);
    await addOrganizationMember({
      organizationId: organizationIdForSlug(SLUG),
      userId: await userIdFor(STAFF_EMAIL),
      role: "owner",
    });
    await signupSession(CUST_EMAIL);
  }, 120_000);

  async function sharedCard(): Promise<{ id: string; blob: string }> {
    const tenant = await resolveAuthenticatedCustomer(SLUG, {
      id: await userIdFor(CUST_EMAIL),
      email: CUST_EMAIL,
      displayName: null,
    });
    const { createConversation } = await import("../support-ops");
    const { conversation } = await createConversation({
      workspaceId: tenant.workspaceId,
      customerId: tenant.customerId,
      title: "supersession fixture",
    });
    const card = await createPendingFixCard({
      workspaceId: tenant.workspaceId,
      customerId: tenant.customerId,
      conversationId: conversation.id,
      issueId: null,
      candidateText: formatSharedFix(TAINTED),
    });
    await loginAs(STAFF_EMAIL);
    const res = await reviewPOST(
      reviewReq(card.id, { workspaceSlug: SLUG, decision: "shared" }),
      ctxFor(card.id),
    );
    expect(res.status).toBe(200);
    const row = await getFixCardForWorkspace(card.id, workspaceIdForSlug(SLUG));
    expect(row?.status).toBe("shared");
    return { id: card.id, blob: row!.walrus_blob_id! };
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

  it("correction writes a NEW blob; old blob becomes superseded, never deleted", async () => {
    const mocked = await walrusMock();
    const { id: oldId, blob: oldBlob } = await sharedCard();
    mocked.mockClear();
    await loginAs(STAFF_EMAIL);
    const corrected = formatSharedFix({ ...TAINTED, cause: CORRECTED_CAUSE });
    const res = await reviewPOST(
      reviewReq(oldId, {
        workspaceSlug: SLUG,
        decision: "correct_shared",
        edited: { ...TAINTED, cause: CORRECTED_CAUSE },
      }),
      ctxFor(oldId),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { status?: string; blobId?: string; id?: string; supersedes?: string };
    expect(body.status).toBe("corrected");
    expect(body.supersedes).toBe(oldId);
    // New real blob with exactly the corrected text.
    expect(mocked.mock.calls).toHaveLength(1);
    expect(mocked.mock.calls[0][1]).toBe(corrected);
    const newBlob = body.blobId!;
    expect(newBlob).toBeTruthy();
    expect(newBlob).not.toBe(oldBlob);
    // New row is the active fix with new blob proof.
    const revision = await getFixCardForWorkspace(body.id!, workspaceIdForSlug(SLUG));
    expect(revision?.status).toBe("shared");
    expect(revision?.reviewed_text).toBe(corrected);
    expect(revision?.walrus_blob_id).toBe(newBlob);
    // Old row superseded: old blob preserved for audit, pointer to revision.
    const old = await getFixCardForWorkspace(oldId, workspaceIdForSlug(SLUG));
    expect(old?.status).toBe("superseded");
    expect(old?.walrus_blob_id).toBe(oldBlob);
    expect(old?.superseded_by_fix_card_id).toBe(body.id);
  }, 60_000);

  it("shared recall excludes the superseded blob but keeps the corrected one", async () => {
    const { id: oldId, blob: oldBlob } = await sharedCard();
    await loginAs(STAFF_EMAIL);
    const res = await reviewPOST(
      reviewReq(oldId, {
        workspaceSlug: SLUG,
        decision: "correct_shared",
        edited: { ...TAINTED, cause: CORRECTED_CAUSE },
      }),
      ctxFor(oldId),
    );
    const { blobId: newBlob } = (await res.json()) as { blobId: string };
    const dead = await listSupersededSharedBlobs(workspaceIdForSlug(SLUG));
    expect(dead).toContain(oldBlob);
    expect(dead).not.toContain(newBlob);
    // Simulated Walrus recall returning both blobs: only the active one survives.
    const recalled = [
      hit(oldBlob, "tainted fix text"),
      hit(newBlob, "corrected fix text"),
    ];
    expect(dropSupersededSharedHits(recalled, dead).map((h) => h.blobId)).toEqual([newBlob]);
  }, 60_000);

  it("supersession is workspace-scoped (cross-workspace isolation)", async () => {
    await sharedCard();
    const deadHere = await listSupersededSharedBlobs(workspaceIdForSlug(SLUG));
    const deadOther = await listSupersededSharedBlobs(workspaceIdForSlug(OTHER_SLUG));
    expect(deadOther).toEqual([]);
    expect(deadHere.length).toBeGreaterThan(0);
  }, 60_000);

  it("unauthorized customer cannot correct shared fixes (403)", async () => {
    const mocked = await walrusMock();
    const { id } = await sharedCard();
    mocked.mockClear();
    await loginAs(CUST_EMAIL);
    const res = await reviewPOST(
      reviewReq(id, {
        workspaceSlug: SLUG,
        decision: "correct_shared",
        edited: { ...TAINTED, cause: CORRECTED_CAUSE },
      }),
      ctxFor(id),
    );
    expect(res.status).toBe(403);
    expect(mocked.mock.calls).toHaveLength(0);
    const row = await getFixCardForWorkspace(id, workspaceIdForSlug(SLUG));
    expect(row?.status).toBe("shared");
  }, 60_000);

  it("correction requires edited text; pending cards cannot be corrected", async () => {
    const mocked = await walrusMock();
    const { id } = await sharedCard();
    mocked.mockClear();
    await loginAs(STAFF_EMAIL);
    const noEdit = await reviewPOST(
      reviewReq(id, { workspaceSlug: SLUG, decision: "correct_shared" }),
      ctxFor(id),
    );
    expect(noEdit.status).toBe(400);
    // A pending card is corrected via Save shared, not correct_shared.
    const tenant = await resolveAuthenticatedCustomer(SLUG, {
      id: await userIdFor(CUST_EMAIL),
      email: CUST_EMAIL,
      displayName: null,
    });
    const { createConversation } = await import("../support-ops");
    const { conversation } = await createConversation({
      workspaceId: tenant.workspaceId,
      customerId: tenant.customerId,
      title: "pending correction guard",
    });
    const pending = await createPendingFixCard({
      workspaceId: tenant.workspaceId,
      customerId: tenant.customerId,
      conversationId: conversation.id,
      issueId: null,
      candidateText: formatSharedFix(TAINTED),
    });
    const pendingRes = await reviewPOST(
      reviewReq(pending.id, {
        workspaceSlug: SLUG,
        decision: "correct_shared",
        edited: { ...TAINTED, cause: CORRECTED_CAUSE },
      }),
      ctxFor(pending.id),
    );
    expect(pendingRes.status).toBe(409);
    expect(mocked.mock.calls).toHaveLength(0);
    // Initial Save shared still works after all of the above.
    const shareRes = await reviewPOST(
      reviewReq(pending.id, { workspaceSlug: SLUG, decision: "shared" }),
      ctxFor(pending.id),
    );
    expect(shareRes.status).toBe(200);
    const row = await getFixCardForWorkspace(pending.id, workspaceIdForSlug(SLUG));
    expect(row?.status).toBe("shared");
  }, 120_000);
});
