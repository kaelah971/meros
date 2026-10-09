import { describe, expect, it, afterAll, vi } from "vitest";
import { captureNoteForResult } from "../capture-status";
import {
  derivePrivateNamespaceV2,
  workspaceIdForSlug,
  organizationIdForSlug,
  customerIdForAuth,
} from "../tenant";
import { dropKnownFacts, validateExtractedFacts } from "../support-memory";
import { ensureOrganization, ensureWorkspace } from "../db";
import { uniqueSlug, uniqueEmail, FixtureTracker } from "./fixtures";

// Route + dependency mocks must be declared before imports that use them.
let cookieJar = "";
vi.mock("next/headers", () => ({
  headers: async () => new Headers(cookieJar ? { cookie: cookieJar } : {}),
}));

vi.mock("@/lib/gemini", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/gemini")>();
  return { ...orig, generateJson: vi.fn() };
});

vi.mock("@/lib/walrus", async (importOriginal) => {
  const orig = await importOriginal<typeof import("@/lib/walrus")>();
  return {
    ...orig,
    rememberPrivate: vi.fn(
      (...args: Parameters<typeof orig.rememberPrivate>) => orig.rememberPrivate(...args),
    ),
  };
});

import { POST as capturePOST } from "@/app/api/memory/capture/route";

const tracker = new FixtureTracker();
const SLUG = uniqueSlug("priv-cap");
const EMAIL_A = uniqueEmail("priv-cap-a");
const EMAIL_B = uniqueEmail("priv-cap-b");
const PW = "correct-horse-123";

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
  tracker.trackEmail(email);
  return sessionCookie.split(";")[0];
}

async function loginAs(email: string) {
  const { auth } = await import("../better-auth");
  const res = (await auth.api.signInEmail({
    body: { email, password: PW },
    headers: new Headers(),
    asResponse: true,
  })) as unknown as Response;
  cookieJar = res.headers.getSetCookie().find((c) => c.startsWith("meros.session_token="))!.split(";")[0];
}

function captureReq(body: unknown) {
  return new Request("http://test/api/memory/capture", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

async function mockedGemini() {
  const { generateJson } = await import("@/lib/gemini");
  return generateJson as unknown as { mockReset: () => void; mockResolvedValue: (v: unknown) => void; mockRejectedValue: (e: unknown) => void };
}

async function mockedRemember() {
  const { rememberPrivate } = await import("@/lib/walrus");
  return rememberPrivate as unknown as {
    mockReset: () => void;
    mockRejectedValueOnce: (e: unknown) => void;
    mock: { calls: unknown[][] };
  };
}

afterAll(async () => {
  await tracker.cleanup();
});

describe("private capture status semantics (pure)", () => {
  it("A. no durable fact → no write, no failure warning", () => {
    const facts = validateExtractedFacts([]);
    expect(facts).toEqual([]);
    expect(captureNoteForResult({ ok: true, facts: [] })).toBeNull();
  });

  it("endpoint-level ok:false (no write attempted) stays silent", () => {
    expect(captureNoteForResult({ ok: false })).toBeNull();
    expect(captureNoteForResult(null)).toBeNull();
    expect(captureNoteForResult(undefined)).toBeNull();
  });

  it("C. per-fact write failure surfaces a readable warning", () => {
    const note = captureNoteForResult({
      ok: true,
      facts: [{ status: "failed", text: "[ISSUE] import fails" }],
    });
    expect(note).toMatch(/Could not save private memory/);
  });

  it("successful stores report remembered memories", () => {
    expect(
      captureNoteForResult({ ok: true, facts: [{ status: "stored", blobId: "b1" }] }),
    ).toMatch(/Remembered 1 private memory/);
  });

  it("duplicate of known memory is dropped before any write", () => {
    const facts = dropKnownFacts(
      [{ type: "PROFILE" as const, text: "[PROFILE] Uses Excel 2021 on Windows" }],
      ["[PROFILE] Uses Excel 2021 on Windows"],
    );
    expect(facts).toEqual([]);
    expect(captureNoteForResult({ ok: true, facts: [] })).toBeNull();
  });
});

describe("private namespace derivation + isolation (pure)", () => {
  it("namespace shape is meros:v2:workspace:<ws>:customer:<cu>", () => {
    const ws = workspaceIdForSlug(SLUG);
    const cu = customerIdForAuth(ws, "auth-user-123");
    expect(derivePrivateNamespaceV2(ws, cu)).toBe(`meros:v2:workspace:${ws}:customer:${cu}`);
  });

  it("returning customer derives the identical namespace", () => {
    const ws = workspaceIdForSlug(SLUG);
    expect(customerIdForAuth(ws, "auth-user-123")).toBe(customerIdForAuth(ws, "auth-user-123"));
    expect(derivePrivateNamespaceV2(ws, customerIdForAuth(ws, "auth-user-123"))).toBe(
      derivePrivateNamespaceV2(ws, customerIdForAuth(ws, "auth-user-123")),
    );
  });

  it("different customers in one workspace are isolated by namespace", () => {
    const ws = workspaceIdForSlug(SLUG);
    const a = derivePrivateNamespaceV2(ws, customerIdForAuth(ws, "auth-user-a"));
    const b = derivePrivateNamespaceV2(ws, customerIdForAuth(ws, "auth-user-b"));
    expect(a).not.toBe(b);
  });
});

describe("private capture route (bounded fixtures, mocked extraction)", () => {
  it("setup: workspace + two customers", async () => {
    const orgId = organizationIdForSlug(SLUG);
    await ensureOrganization({ id: orgId, slug: SLUG, name: `Temp ${SLUG}` });
    await ensureWorkspace({
      id: workspaceIdForSlug(SLUG),
      organizationId: orgId,
      slug: SLUG,
      name: `Temp ${SLUG}`,
    });
    tracker.trackOrg(orgId);
    await signupSession(EMAIL_A);
    await signupSession(EMAIL_B);
  }, 120_000);

  it("A. message with no durable fact → no write, no warning", async () => {
    const gen = await mockedGemini();
    gen.mockReset();
    gen.mockResolvedValue([]);
    await loginAs(EMAIL_A);
    const res = await capturePOST(
      captureReq({
        workspaceSlug: SLUG,
        message: "Thanks, that is helpful and clear now.",
        answer: "Glad that helped!",
        history: [],
        knownTexts: [],
      }),
    );
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.facts).toEqual([]);
    expect(captureNoteForResult(data)).toBeNull();
  }, 60_000);

  it("extraction failure → skipped, not a failed save", async () => {
    const gen = await mockedGemini();
    gen.mockReset();
    gen.mockRejectedValue(new Error("Gemini request failed: overloaded"));
    await loginAs(EMAIL_A);
    const res = await capturePOST(
      captureReq({
        workspaceSlug: SLUG,
        message: "My import keeps failing with HTTP 422 and I use Excel on Windows daily.",
        answer: "Check the delimiter and re-export as UTF-8.",
        history: [],
        knownTexts: [],
      }),
    );
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.facts).toEqual([]);
    expect(data.skipped).toBe("extraction");
    expect(captureNoteForResult(data)).toBeNull();
  }, 60_000);

  it("C. simulated write failure → answer intact + readable warning", async () => {
    const gen = await mockedGemini();
    gen.mockReset();
    gen.mockResolvedValue([
      { type: "ISSUE", text: "CSV import returns HTTP 422 for this workspace customer" },
    ]);
    const rem = await mockedRemember();
    rem.mockReset();
    rem.mockRejectedValueOnce(new Error("simulated Walrus outage"));
    await loginAs(EMAIL_A);
    const answer = "Re-export as comma-delimited UTF-8 and retry.";
    const res = await capturePOST(
      captureReq({
        workspaceSlug: SLUG,
        message: "My CSV import returns HTTP 422 every time I upload from Excel.",
        answer,
        history: [],
        knownTexts: [],
      }),
    );
    const data = await res.json();
    // Honest degradation: capture reports failure, but the answer itself exists.
    expect(answer.length).toBeGreaterThan(0);
    expect(data.ok).toBe(true);
    expect(data.facts).toHaveLength(1);
    expect(data.facts[0].status).toBe("failed");
    expect(captureNoteForResult(data)).toMatch(/Could not save private memory/);
  }, 60_000);

  it("B+D+E. durable fact → real private write, recallable by same customer only", async () => {
    const gen = await mockedGemini();
    gen.mockReset();
    const marker = `prefers oat-milk flat white ${Date.now().toString(36)}`;
    const factText = `Customer ${marker} during morning support triage`;
    gen.mockResolvedValue([{ type: "PROFILE", text: factText }]);
    const rem = await mockedRemember();
    rem.mockReset();
    await loginAs(EMAIL_A);
    const res = await capturePOST(
      captureReq({
        workspaceSlug: SLUG,
        message: `Just noting for next time: I ${marker} when testing imports in this workspace.`,
        answer: "Noted — I will remember that preference.",
        history: [],
        knownTexts: [],
      }),
    );
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.facts).toHaveLength(1);
    expect(data.facts[0].status).toBe("stored");
    expect(typeof data.facts[0].blobId).toBe("string");
    expect(captureNoteForResult(data)).toMatch(/Remembered 1 private memory/);

    const { resolveAuthenticatedCustomer } = await import("../tenant-store");
    const { recallPrivate } = await import("@/lib/walrus");
    const { neon } = await import("@neondatabase/serverless");
    const { readFileSync } = await import("node:fs");
    const key = readFileSync(".env.local", "utf8")
      .split("\n").map((l) => l.trim()).find((l) => l.startsWith("DATABASE_URL="))!
      .slice("DATABASE_URL=".length);
    const sql = neon(key);
    const rowsA = (await sql`select id from "user" where email = ${EMAIL_A} limit 1`) as unknown as { id: string }[];
    const rowsB = (await sql`select id from "user" where email = ${EMAIL_B} limit 1`) as unknown as { id: string }[];
    const tenantA = await resolveAuthenticatedCustomer(SLUG, {
      id: rowsA[0].id,
      email: EMAIL_A,
      displayName: null,
    });
    const tenantB = await resolveAuthenticatedCustomer(SLUG, {
      id: rowsB[0].id,
      email: EMAIL_B,
      displayName: null,
    });
    expect(tenantA.privateNamespace).not.toBe(tenantB.privateNamespace);

    const recalledA = await recallPrivate(tenantA.privateNamespace, marker, { topK: 5 });
    expect(recalledA.results.some((r) => r.blobId === data.facts[0].blobId)).toBe(true);

    const recalledB = await recallPrivate(tenantB.privateNamespace, marker, { topK: 5 });
    expect(recalledB.results.some((r) => r.blobId === data.facts[0].blobId)).toBe(false);
  }, 180_000);
});
