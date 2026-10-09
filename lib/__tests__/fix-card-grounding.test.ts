import { describe, expect, it, afterAll, vi } from "vitest";
import {
  formatSharedFix,
  groundClaimField,
  validateSharedCandidate,
} from "../support-memory";
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
vi.mock("@/lib/walrus", () => ({
  WalrusNotConfiguredError: class WalrusNotConfiguredError extends Error {},
  rememberInNamespace: vi.fn(async () => ({
    blobId: "test-blob-edit-1",
    jobId: "test-job-edit-1",
    namespace: "test-ns",
    owner: "test-owner",
  })),
}));

// The exact reported conversation: customer error + confirmation, plus an
// assistant hypothesis ("regional locale settings") the customer never stated.
const USER_EVIDENCE = [
  "Importing a CSV file into Northstar Data fails with HTTP 422 and says a semicolon delimiter was detected instead of comma-delimited columns.",
  "I re-exported the CSV as UTF-8 with comma delimiters and it works now",
].join("\n");
const ASSISTANT_CONTEXT = `${USER_EVIDENCE}\nASSISTANT: This might be due to regional locale settings on your machine. Try re-exporting.`;

const TAINTED_CAUSE =
  "The CSV file used semicolons instead of standard commas as delimiters due to regional locale settings.";
const CLEAN_CAUSE =
  "The CSV file used semicolons instead of standard commas as delimiters.";
const SYMPTOM =
  "CSV import fails with HTTP 422 because a semicolon delimiter was detected instead of comma-delimited columns.";
const RESOLUTION = "Re-export the CSV as UTF-8 with comma delimiters.";

const EXPECTED_CARD = [
  "[SHARED_FIX]",
  `Symptom: ${SYMPTOM}`,
  `Cause: ${CLEAN_CAUSE}`,
  `Resolution: ${RESOLUTION}`,
].join("\n");

describe("fix card claim grounding (pure)", () => {
  it("assistant speculation is dropped from Cause, never promoted as fact", () => {
    const r = groundClaimField(TAINTED_CAUSE, USER_EVIDENCE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.text).toBe(CLEAN_CAUSE);
    expect(r.text).not.toMatch(/locale/i);
    expect(r.dropped.join(" ")).toMatch(/locale/i);
  });

  it("customer-supported Symptom passes through byte-identical", () => {
    const r = groundClaimField(SYMPTOM, USER_EVIDENCE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.text).toBe(SYMPTOM);
    expect(r.dropped).toEqual([]);
  });

  it("fully-supported fields pass through byte-identical", () => {
    const r = groundClaimField(CLEAN_CAUSE, USER_EVIDENCE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.text).toBe(CLEAN_CAUSE);
  });

  it("pure assistant speculation is rejected, not sanitized into a guess", () => {
    const r = groundClaimField(
      "Regional locale settings misconfigured the exporter.",
      USER_EVIDENCE,
    );
    expect(r.ok).toBe(false);
  });

  it("end-to-end gate yields exactly the corrected card", () => {
    const raw = formatSharedFix({ symptom: SYMPTOM, cause: TAINTED_CAUSE, resolution: RESOLUTION });
    const gate = validateSharedCandidate(raw, {
      confirmation: USER_EVIDENCE,
      context: ASSISTANT_CONTEXT,
      evidence: USER_EVIDENCE,
    });
    expect(gate.ok).toBe(true);
    expect(gate.sanitized).toBe(EXPECTED_CARD);
  });

  it("customer-confirmed resolution is preserved in meaning", () => {
    const raw = formatSharedFix({ symptom: SYMPTOM, cause: CLEAN_CAUSE, resolution: RESOLUTION });
    const gate = validateSharedCandidate(raw, {
      confirmation: USER_EVIDENCE,
      context: ASSISTANT_CONTEXT,
      evidence: USER_EVIDENCE,
    });
    expect(gate.ok).toBe(true);
    expect(gate.candidate?.resolution).toBe(RESOLUTION);
  });

  it("ungrounded cause rejects the whole candidate", () => {
    const raw = formatSharedFix({
      symptom: SYMPTOM,
      cause: "Regional locale settings misconfigured the exporter.",
      resolution: RESOLUTION,
    });
    const gate = validateSharedCandidate(raw, {
      confirmation: USER_EVIDENCE,
      context: ASSISTANT_CONTEXT,
      evidence: USER_EVIDENCE,
    });
    expect(gate.ok).toBe(false);
  });

  it("candidate prompt forbids promoting assistant hypotheses as fact (static)", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("lib/fix-candidate.ts", "utf8");
    expect(src).toMatch(/assistant hypothesis/i);
    expect(src).toMatch(/Customer confirmation outranks/i);
  });
});

const stamp = Date.now().toString(36);
const PW = "correct-horse-123";
const createdEmails: string[] = [];
const createdOrgIds: string[] = [];
const SLUG = `ops-fge-${stamp}`;
const STAFF_EMAIL = `fge-staff-${stamp}@example.test`;
const CUST_EMAIL = `fge-cust-${stamp}@example.test`;

const TAINTED_CARD = [
  "[SHARED_FIX]",
  "Symptom: Importing a CSV file into Northstar Data fails with HTTP 422 and says a semicolon delimiter was detected instead of comma-delimited columns.",
  "Cause: The CSV file used semicolons instead of standard commas as delimiters due to regional locale settings.",
  "Resolution: Re-exported the CSV as UTF-8 with comma delimiters.",
].join("\n");

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

describe("staff edit-before-share (live Neon, mocked Walrus)", () => {
  it("setup: workspace, staffer, customer, tainted pending card", async () => {
    const orgId = organizationIdForSlug(SLUG);
    await ensureOrganization({ id: orgId, slug: SLUG, name: `Temp ${SLUG}` });
    await ensureWorkspace({
      id: workspaceIdForSlug(SLUG),
      organizationId: orgId,
      slug: SLUG,
      name: `Temp ${SLUG}`,
    });
    createdOrgIds.push(orgId);
    await signupSession(STAFF_EMAIL);
    await addOrganizationMember({
      organizationId: orgId,
      userId: await userIdFor(STAFF_EMAIL),
      role: "owner",
    });
    await signupSession(CUST_EMAIL);
  }, 120_000);

  async function pendingCard(): Promise<string> {
    const tenant = await resolveAuthenticatedCustomer(SLUG, {
      id: await userIdFor(CUST_EMAIL),
      email: CUST_EMAIL,
      displayName: null,
    });
    const { createConversation } = await import("../support-ops");
    const { conversation } = await createConversation({
      workspaceId: tenant.workspaceId,
      customerId: tenant.customerId,
      title: "grounding fixture",
    });
    const card = await createPendingFixCard({
      workspaceId: tenant.workspaceId,
      customerId: tenant.customerId,
      conversationId: conversation.id,
      issueId: null,
      candidateText: TAINTED_CARD,
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

  it("staff edit + Save shared writes exactly the reviewed version", async () => {
    const mocked = await walrusMock();
    mocked.mockClear();
    const cardId = await pendingCard();
    await loginAs(STAFF_EMAIL);
    const edited = {
      symptom:
        "Importing a CSV file into Northstar Data fails with HTTP 422 and says a semicolon delimiter was detected instead of comma-delimited columns.",
      cause: CLEAN_CAUSE,
      resolution: "Re-exported the CSV as UTF-8 with comma delimiters.",
    };
    const expected = formatSharedFix(edited);
    const res = await reviewPOST(
      reviewReq(cardId, { workspaceSlug: SLUG, decision: "shared", edited }),
      ctxFor(cardId),
    );
    expect(res.status).toBe(200);
    // Shared Walrus payload is the reviewed version, not the tainted candidate.
    expect(mocked.mock.calls).toHaveLength(1);
    expect(mocked.mock.calls[0][1]).toBe(expected);
    expect(mocked.mock.calls[0][1]).not.toMatch(/locale/i);
    const row = await getFixCardForWorkspace(cardId, workspaceIdForSlug(SLUG));
    expect(row?.status).toBe("shared");
    expect(row?.reviewed_text).toBe(expected);
    expect(row?.walrus_blob_id).toBe("test-blob-edit-1");
  }, 60_000);

  it("unedited Save shared writes the stored candidate verbatim", async () => {
    const mocked = await walrusMock();
    mocked.mockClear();
    const cardId = await pendingCard();
    await loginAs(STAFF_EMAIL);
    const res = await reviewPOST(
      reviewReq(cardId, { workspaceSlug: SLUG, decision: "shared" }),
      ctxFor(cardId),
    );
    expect(res.status).toBe(200);
    expect(mocked.mock.calls).toHaveLength(1);
    expect(mocked.mock.calls[0][1]).toBe(TAINTED_CARD);
    const row = await getFixCardForWorkspace(cardId, workspaceIdForSlug(SLUG));
    expect(row?.reviewed_text).toBeNull();
  }, 60_000);

  it("edited customer-private data is rejected; zero shared bytes", async () => {
    const mocked = await walrusMock();
    mocked.mockClear();
    const cardId = await pendingCard();
    await loginAs(STAFF_EMAIL);
    const res = await reviewPOST(
      reviewReq(cardId, {
        workspaceSlug: SLUG,
        decision: "shared",
        edited: {
          symptom: "CSV import fails.",
          cause: "Contact alice@example.test; the file used semicolons.",
          resolution: "Re-export the CSV.",
        },
      }),
      ctxFor(cardId),
    );
    expect(res.status).toBe(400);
    expect(mocked.mock.calls).toHaveLength(0);
    const row = await getFixCardForWorkspace(cardId, workspaceIdForSlug(SLUG));
    expect(row?.status).toBe("pending_review");
    expect(row?.reviewed_text).toBeNull();
  }, 60_000);

  it("empty edited fields are rejected; card stays pending", async () => {
    const mocked = await walrusMock();
    mocked.mockClear();
    const cardId = await pendingCard();
    await loginAs(STAFF_EMAIL);
    const res = await reviewPOST(
      reviewReq(cardId, {
        workspaceSlug: SLUG,
        decision: "shared",
        edited: { symptom: "CSV import fails.", cause: "   ", resolution: "Re-export." },
      }),
      ctxFor(cardId),
    );
    expect(res.status).toBe(400);
    expect(mocked.mock.calls).toHaveLength(0);
    const row = await getFixCardForWorkspace(cardId, workspaceIdForSlug(SLUG));
    expect(row?.status).toBe("pending_review");
  }, 60_000);

  it("unauthorized customer cannot edit/share (403); card untouched", async () => {
    const mocked = await walrusMock();
    mocked.mockClear();
    const cardId = await pendingCard();
    await loginAs(CUST_EMAIL);
    const res = await reviewPOST(
      reviewReq(cardId, {
        workspaceSlug: SLUG,
        decision: "shared",
        edited: { symptom: "S", cause: CLEAN_CAUSE, resolution: "R" },
      }),
      ctxFor(cardId),
    );
    expect(res.status).toBe(403);
    expect(mocked.mock.calls).toHaveLength(0);
    const row = await getFixCardForWorkspace(cardId, workspaceIdForSlug(SLUG));
    expect(row?.status).toBe("pending_review");
    expect(row?.reviewed_text).toBeNull();
  }, 60_000);

  it("Keep private still writes zero shared bytes even with edits attached", async () => {
    const mocked = await walrusMock();
    mocked.mockClear();
    const cardId = await pendingCard();
    await loginAs(STAFF_EMAIL);
    const res = await reviewPOST(
      reviewReq(cardId, {
        workspaceSlug: SLUG,
        decision: "kept_private",
        edited: { symptom: "S", cause: CLEAN_CAUSE, resolution: "R" },
      }),
      ctxFor(cardId),
    );
    expect(res.status).toBe(200);
    expect(mocked.mock.calls).toHaveLength(0);
    const row = await getFixCardForWorkspace(cardId, workspaceIdForSlug(SLUG));
    expect(row?.status).toBe("kept_private");
    expect(row?.walrus_blob_id).toBeNull();
    expect(row?.reviewed_text).toBeNull();
  }, 60_000);
});
