import { describe, expect, it, afterAll, vi } from "vitest";
import {
  addAssistantMessage,
  addUserMessage,
  createConversation,
  createPendingFixCard,
  getConversationForCustomer,
  getFixCardForWorkspace,
  getWorkspaceConversation,
  listCustomerConversations,
  listMessages,
  listRecentTurns,
  listWorkspaceCustomers,
  markFixCardKeptPrivate,
  requireStaff,
  resolveConversation,
  titleFromMessage,
} from "../support-ops";
import {
  addOrganizationMember,
  ensureAuthCustomer,
  ensureOrganization,
  ensureWorkspace,
} from "../db";
import { customerIdForAuth, organizationIdForSlug, workspaceIdForSlug } from "../tenant";

// next/headers has no request scope in tests: control the cookie jar here.
let cookieJar = "";
vi.mock("next/headers", () => ({
  headers: async () => new Headers(cookieJar ? { cookie: cookieJar } : {}),
}));

const stamp = Date.now().toString(36);
const PW = "correct-horse-123";
const createdOrgIds: string[] = [];
const createdEmails: string[] = [];
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
  return { orgId, wsId: workspaceIdForSlug(slug) };
}

async function tempCustomer(wsId: string, authUserId: string) {
  const { customerIdForAuth: cid } = await import("../tenant");
  return ensureAuthCustomer({
    id: cid(wsId, authUserId),
    workspaceId: wsId,
    authUserId,
    displayName: null,
  });
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

describe("conversation ownership (live Neon)", () => {
  it("setup: fixtures", async () => {
    LIVE_A = await authUserFixture(`ops-alice-${stamp}@example.test`);
    LIVE_B = await authUserFixture(`ops-bob-${stamp}@example.test`);
    await tempWorkspace(`ops-ws-${stamp}`);
    await tempWorkspace(`ops-nova-${stamp}`);
    expect(LIVE_A).toBeTruthy();
  }, 120_000);

  it("A. conversation belongs to exactly one workspace/customer", async () => {
    const wsId = workspaceIdForSlug(`ops-ws-${stamp}`);
    const cu = await tempCustomer(wsId, LIVE_A);
    const { conversation, issue } = await createConversation({
      workspaceId: wsId,
      customerId: cu.id,
      title: "CSV import 422",
    });
    expect(conversation.workspace_id).toBe(wsId);
    expect(conversation.customer_id).toBe(cu.id);
    expect(conversation.status).toBe("open");
    expect(issue.status).toBe("open");
    expect(issue.conversation_id).toBe(conversation.id);
    const found = await getConversationForCustomer(conversation.id, wsId, cu.id);
    expect(found?.id).toBe(conversation.id);
  }, 60_000);

  it("B. Alice cannot load Bob's conversation", async () => {
    const wsId = workspaceIdForSlug(`ops-ws-${stamp}`);
    const bob = await tempCustomer(wsId, LIVE_B);
    const { conversation } = await createConversation({
      workspaceId: wsId,
      customerId: bob.id,
      title: "Bob private",
    });
    const alice = await tempCustomer(wsId, LIVE_A);
    expect(await getConversationForCustomer(conversation.id, wsId, alice.id)).toBeNull();
  }, 60_000);

  it("C. Acme staff cannot load Nova conversation", async () => {
    const wsA = workspaceIdForSlug(`ops-ws-${stamp}`);
    const wsN = workspaceIdForSlug(`ops-nova-${stamp}`);
    const cu = await tempCustomer(wsA, LIVE_A);
    const { conversation } = await createConversation({
      workspaceId: wsA,
      customerId: cu.id,
      title: "Acme thread",
    });
    // Wrong workspace scope: invisible.
    expect(await getConversationForCustomer(conversation.id, wsN, cu.id)).toBeNull();
    // Workspace-scoped staff read sees it (used by the console).
    expect((await getWorkspaceConversation(wsA, conversation.id))?.id).toBe(conversation.id);
    expect(await getWorkspaceConversation(wsN, conversation.id)).toBeNull();
  }, 60_000);
});

describe("message durability (live Neon)", () => {
  it("D. user message persists standalone; retries dedupe on client_id", async () => {
    const wsId = workspaceIdForSlug(`ops-ws-${stamp}`);
    const cu = await tempCustomer(wsId, LIVE_A);
    const { conversation } = await createConversation({
      workspaceId: wsId,
      customerId: cu.id,
      title: "durability",
    });
    const first = await addUserMessage({
      conversationId: conversation.id,
      content: "My CSV import fails with 422",
      clientId: `c1-${stamp}`,
    });
    expect(first.deduped).toBe(false);
    // No assistant message exists yet — the complaint survives on its own.
    expect((await listMessages(conversation.id)).map((m) => m.role)).toEqual(["user"]);
    const retry = await addUserMessage({
      conversationId: conversation.id,
      content: "My CSV import fails with 422",
      clientId: `c1-${stamp}`,
    });
    expect(retry.deduped).toBe(true);
    expect(retry.id).toBe(first.id);
    expect(await listMessages(conversation.id)).toHaveLength(1);
  }, 60_000);

  it("E. assistant answer + provenance persist and round-trip", async () => {
    const wsId = workspaceIdForSlug(`ops-ws-${stamp}`);
    const cu = await tempCustomer(wsId, LIVE_A);
    const { conversation } = await createConversation({
      workspaceId: wsId,
      customerId: cu.id,
      title: "provenance",
    });
    await addUserMessage({ conversationId: conversation.id, content: "q", clientId: `c2-${stamp}` });
    const prov = [{ plane: "shared" as const, text: "fix", blobId: "blob-1", distance: 0.2 }];
    await addAssistantMessage({
      conversationId: conversation.id,
      content: "a",
      model: "gemini-3.5-flash-lite",
      privateUsed: false,
      sharedUsed: true,
      provenance: prov,
    });
    const turns = await listRecentTurns(conversation.id, 12);
    expect(turns).toEqual([
      { role: "user", text: "q" },
      { role: "assistant", text: "a" },
    ]);
    const rows = await listMessages(conversation.id);
    const asst = rows.find((m) => m.role === "assistant")!;
    expect(asst.memory_shared_used).toBe(true);
    expect(asst.memory_private_used).toBe(false);
    expect(asst.memory_provenance).toEqual(prov);
  }, 60_000);

  it("F. returning customer sees previous conversations, scoped to workspace", async () => {
    const wsId = workspaceIdForSlug(`ops-ws-${stamp}`);
    const wsN = workspaceIdForSlug(`ops-nova-${stamp}`);
    const cu = await tempCustomer(wsId, LIVE_A);
    await createConversation({ workspaceId: wsId, customerId: cu.id, title: "t1" });
    await createConversation({ workspaceId: wsId, customerId: cu.id, title: "t2" });
    const mine = await listCustomerConversations(wsId, cu.id);
    expect(mine.length).toBeGreaterThanOrEqual(2);
    expect(mine.every((c) => c.customer_id === cu.id && c.workspace_id === wsId)).toBe(true);
    const other = await listCustomerConversations(wsN, cu.id);
    expect(other).toEqual([]);
  }, 60_000);

  it("D2. multiple assistant messages coexist; NULL client_ids never collide", async () => {
    const wsId = workspaceIdForSlug(`ops-ws-${stamp}`);
    const cu = await tempCustomer(wsId, LIVE_A);
    const { conversation } = await createConversation({
      workspaceId: wsId,
      customerId: cu.id,
      title: "two answers",
    });
    await addUserMessage({ conversationId: conversation.id, content: "q1", clientId: `c3-${stamp}` });
    await addAssistantMessage({
      conversationId: conversation.id,
      content: "a1",
      model: null,
      privateUsed: false,
      sharedUsed: false,
      provenance: [],
    });
    await addUserMessage({ conversationId: conversation.id, content: "q2", clientId: `c4-${stamp}` });
    // Second assistant message (NULL client_id) must NOT violate uniqueness.
    await addAssistantMessage({
      conversationId: conversation.id,
      content: "a2",
      model: null,
      privateUsed: false,
      sharedUsed: false,
      provenance: [],
    });
    expect(await listMessages(conversation.id)).toHaveLength(4);
  }, 60_000);

  it("titleFromMessage truncates sanely", () => {
    expect(titleFromMessage("  hi  ")).toBe("hi");
    expect(titleFromMessage("x".repeat(200)).length).toBeLessThanOrEqual(80);
  });
});

describe("issue lifecycle + pending cards (live Neon)", () => {
  it("G+H. explicit resolution resolves both and creates a pending card", async () => {
    const wsId = workspaceIdForSlug(`ops-ws-${stamp}`);
    const cu = await tempCustomer(wsId, LIVE_A);
    const { conversation } = await createConversation({
      workspaceId: wsId,
      customerId: cu.id,
      title: "resolve me",
    });
    const issue = await resolveConversation(conversation.id, "Re-exported as CSV UTF-8.");
    expect(issue.status).toBe("resolved");
    expect(issue.resolution_summary).toBe("Re-exported as CSV UTF-8.");
    expect(issue.resolved_at).toBeTruthy();
    const card = await createPendingFixCard({
      workspaceId: wsId,
      customerId: cu.id,
      conversationId: conversation.id,
      issueId: issue.id,
      candidateText: "[SHARED_FIX]\nSymptom: 422\nCause: semis\nResolution: re-export",
    });
    expect(card.status).toBe("pending_review");
    expect(card.walrus_blob_id).toBeNull();
    const fetched = await getFixCardForWorkspace(card.id, wsId);
    expect(fetched?.id).toBe(card.id);
    // Cross-workspace card lookup misses.
    expect(await getFixCardForWorkspace(card.id, workspaceIdForSlug(`ops-nova-${stamp}`))).toBeNull();
  }, 60_000);
});

describe("staff authorization (live Neon)", () => {
  it("M. owner/admin/support pass; strangers get 403", async () => {
    const wsId = workspaceIdForSlug(`ops-ws-${stamp}`);
    const orgId = (await import("../tenant")).organizationIdForSlug(`ops-ws-${stamp}`);
    for (const role of ["owner", "admin", "support"]) {
      const email = `ops-${role}-${stamp}@example.test`;
      const { auth } = await import("../better-auth");
      const res = (await auth.api.signUpEmail({
        body: { email, password: PW, name: role },
        headers: new Headers(),
      })) as unknown as { user: { id: string } };
      createdEmails.push(email);
      await addOrganizationMember({ organizationId: orgId, userId: res.user.id, role });
      const got = await requireStaff(res.user.id, wsId);
      expect(got.role).toBe(role);
    }
    await expect(requireStaff(LIVE_B, wsId)).rejects.toMatchObject({ status: 403 });
    await expect(
      requireStaff(LIVE_A, "00000000-0000-0000-0000-000000000000"),
    ).rejects.toMatchObject({ status: 404 });
  }, 120_000);

  it("N. customer sees workspace customers only via staff path denial", async () => {
    const { getOwnedWorkspace } = await import("../db");
    // LIVE_B has no membership anywhere: owner console reads deny.
    expect(await getOwnedWorkspace(LIVE_B, `ops-ws-${stamp}`)).toBeNull();
  }, 60_000);
});
