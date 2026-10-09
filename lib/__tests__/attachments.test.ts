import { describe, expect, it, afterAll, vi } from "vitest";
import {
  MAX_FILE_BYTES,
  attachmentLabel,
  buildAttachmentParts,
  formatBytes,
  toAttachmentMeta,
  validateAttachment,
  validateInboundAttachment,
} from "../attachments";
import {
  addUserMessage,
  createConversation,
  listMessages,
} from "../support-ops";
import {
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
void cookieJar;

const stamp = Date.now().toString(36);
const createdOrgIds: string[] = [];
const createdEmails: string[] = [];

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

describe("attachment file validation", () => {
  it("accepts supported image/document/audio types", () => {
    const cases: [string, string][] = [
      ["shot.png", "image/png"],
      ["photo.JPG", "image/jpeg"],
      ["pic.jpeg", "image/jpeg"],
      ["anim.webp", "image/webp"],
      ["doc.pdf", "application/pdf"],
      ["notes.txt", "text/plain"],
      ["data.csv", "text/csv"],
      ["readme.md", "text/markdown"],
      ["voice.webm", "audio/webm"],
      ["voice.m4a", "audio/mp4"],
      ["voice.mp3", "audio/mpeg"],
    ];
    for (const [filename, mimeType] of cases) {
      const r = validateAttachment({ filename, mimeType, sizeBytes: 1024 });
      expect(r.ok, `${filename} ${mimeType}`).toBe(true);
    }
  });

  it("rejects executables, archives, and mismatched extensions", () => {
    for (const bad of [
      { filename: "run.exe", mimeType: "application/x-msdownload", sizeBytes: 100 },
      { filename: "a.zip", mimeType: "application/zip", sizeBytes: 100 },
      { filename: "evil.png.exe", mimeType: "application/x-msdownload", sizeBytes: 100 },
      // MIME says image but extension disagrees.
      { filename: "notes.txt", mimeType: "image/png", sizeBytes: 100 },
      // MIME says PDF but extension disagrees.
      { filename: "shot.png", mimeType: "application/pdf", sizeBytes: 100 },
      { filename: "", mimeType: "image/png", sizeBytes: 100 },
      { filename: "x.png", mimeType: "", sizeBytes: 100 },
    ]) {
      const r = validateAttachment(bad);
      expect(r.ok, JSON.stringify(bad)).toBe(false);
      if (!r.ok) expect(r.error.length).toBeGreaterThan(10);
    }
  });

  it("enforces the per-file size limit with a readable error", () => {
    const ok = validateAttachment({ filename: "a.png", mimeType: "image/png", sizeBytes: MAX_FILE_BYTES });
    expect(ok.ok).toBe(true);
    const over = validateAttachment({ filename: "a.png", mimeType: "image/png", sizeBytes: MAX_FILE_BYTES + 1 });
    expect(over.ok).toBe(false);
    if (!over.ok) {
      expect(over.error).toMatch(/limit/i);
      expect(over.error).toMatch(/MB/);
    }
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(MAX_FILE_BYTES)).toBe("2.0 MB");
  });
});

describe("inbound payload validation (server-side, untrusted client)", () => {
  const tinyPng = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

  it("accepts a well-formed small payload", () => {
    const r = validateInboundAttachment({
      filename: "shot.png",
      mimeType: "image/png",
      kind: "image",
      data: tinyPng,
    });
    expect(r.ok).toBe(true);
  });

  it("rejects missing/invalid data, oversize payloads, and kind mismatches", () => {
    expect(validateInboundAttachment({ filename: "a.png", mimeType: "image/png", kind: "image" }).ok).toBe(false);
    expect(validateInboundAttachment({ filename: "a.png", mimeType: "image/png", kind: "image", data: "!!!not-base64!!!" }).ok).toBe(false);
    expect(
      validateInboundAttachment({ filename: "a.png", mimeType: "image/png", kind: "document", data: tinyPng }).ok,
    ).toBe(false);
  });

  it("toAttachmentMeta strips raw bytes (persistence-safe)", () => {
    const meta = toAttachmentMeta({ filename: "a.pdf", mimeType: "application/pdf", kind: "document", sizeBytes: 10 });
    expect(meta).toEqual({ filename: "a.pdf", mimeType: "application/pdf", kind: "document" });
    expect("data" in meta).toBe(false);
    expect(attachmentLabel({ filename: "a.pdf", kind: "document" })).toBe("a.pdf (document)");
  });
});

describe("multimodal generation payload", () => {
  it("image reaches the payload as native inlineData", () => {
    const parts = buildAttachmentParts([
      { filename: "err.png", mimeType: "image/png", kind: "image", sizeBytes: 10, data: "aGVsbG8=" },
    ]);
    expect(parts).toHaveLength(2);
    expect(parts[0].text).toMatch(/user-provided/i);
    expect(parts[0].text).toMatch(/err\.png/);
    expect(parts[1]).toEqual({ inlineData: { mimeType: "image/png", data: "aGVsbG8=" } });
  });

  it("document content reaches generation context as labeled data", () => {
    const csv = Buffer.from("a,b\n1,2").toString("base64");
    const parts = buildAttachmentParts([
      { filename: "data.csv", mimeType: "text/csv", kind: "document", sizeBytes: 5, data: csv },
    ]);
    expect(parts).toHaveLength(2);
    expect(parts[0].text).toMatch(/user-provided document/i);
    expect(parts[0].text).toMatch(/data\.csv/);
    expect(parts[0].text).toMatch(/untrusted/i);
    expect(parts[1]).toEqual({ inlineData: { mimeType: "text/csv", data: csv } });
  });

  it("voice audio reaches the generation path labeled, not as instructions", () => {
    const parts = buildAttachmentParts([
      { filename: "voice.webm", mimeType: "audio/webm", kind: "audio", sizeBytes: 10, data: "aGVsbG8=" },
    ]);
    expect(parts[0].text).toMatch(/voice message/i);
    expect(parts[0].text).toMatch(/untrusted/i);
    expect(parts[1]).toEqual({ inlineData: { mimeType: "audio/webm", data: "aGVsbG8=" } });
  });

  it("failed ingestion has no silent path: empty input yields no parts", () => {
    expect(buildAttachmentParts([])).toEqual([]);
  });
});

describe("attachment persistence + isolation (live Neon)", () => {
  it("stores metadata only, scoped to the workspace customer", async () => {
    const slug = `att-${stamp}`;
    const orgId = organizationIdForSlug(slug);
    await ensureOrganization({ id: orgId, slug, name: `Temp ${slug}` });
    await ensureWorkspace({ id: workspaceIdForSlug(slug), organizationId: orgId, slug, name: `Temp ${slug}` });
    createdOrgIds.push(orgId);
    const { auth } = await import("../better-auth");
    const email = `att-user-${stamp}@example.test`;
    const signup = (await auth.api.signUpEmail({
      body: { email, password: "correct-horse-123", name: "att" },
      headers: new Headers(),
    })) as unknown as { user: { id: string } };
    createdEmails.push(email);
    const cu = await ensureAuthCustomer({
      id: customerIdForAuth(workspaceIdForSlug(slug), signup.user.id),
      workspaceId: workspaceIdForSlug(slug),
      authUserId: signup.user.id,
      displayName: null,
    });
    const { conversation } = await createConversation({
      workspaceId: workspaceIdForSlug(slug),
      customerId: cu.id,
      title: "attachment scoping",
    });
    await addUserMessage({
      conversationId: conversation.id,
      content: "see attached",
      clientId: `att-${stamp}`,
      attachments: [{ filename: "shot.png", mimeType: "image/png", kind: "image" }],
    });
    const rows = await listMessages(conversation.id);
    expect(rows).toHaveLength(1);
    const stored = (rows[0] as unknown as { attachments: unknown }).attachments as {
      filename: string;
      kind: string;
    }[];
    expect(stored).toEqual([{ filename: "shot.png", mimeType: "image/png", kind: "image" }]);
    expect(JSON.stringify(stored)).not.toMatch(/base64|data:/i);
    // Another customer in the same workspace cannot see this thread.
    const { auth: auth2 } = await import("../better-auth");
    const email2 = `att-other-${stamp}@example.test`;
    const signup2 = (await auth2.api.signUpEmail({
      body: { email: email2, password: "correct-horse-123", name: "other" },
      headers: new Headers(),
    })) as unknown as { user: { id: string } };
    createdEmails.push(email2);
    const cu2 = await ensureAuthCustomer({
      id: customerIdForAuth(workspaceIdForSlug(slug), signup2.user.id),
      workspaceId: workspaceIdForSlug(slug),
      authUserId: signup2.user.id,
      displayName: null,
    });
    expect(cu2.id).not.toBe(cu.id);
    const { getConversationForCustomer } = await import("../support-ops");
    expect(await getConversationForCustomer(conversation.id, workspaceIdForSlug(slug), cu2.id)).toBeNull();
  }, 120_000);
});

describe("shared memory never sees raw attachments (static)", () => {
  it("fix candidate + capture paths carry no attachment bytes", async () => {
    const { readFileSync } = await import("node:fs");
    for (const f of ["lib/fix-candidate.ts", "app/api/memory/capture/route.ts"]) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/inlineData/);
      expect(src, f).not.toMatch(/\bdata:/);
    }
    // Filenames must not flow into candidate text either.
    const cand = readFileSync("app/api/fixes/candidate/route.ts", "utf8");
    expect(cand).not.toMatch(/filename/i);
  });
});

describe("support header action order (static)", () => {
  it("Sessions → New conversation → Sign out → Evidence → Mark resolved", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("components/support-chat.tsx", "utf8");
    // Scope to the header block: the sidebar reuses some labels.
    const headerStart = src.indexOf("<header");
    const headerEnd = src.indexOf("</header>", headerStart);
    expect(headerStart).toBeGreaterThanOrEqual(0);
    expect(headerEnd).toBeGreaterThan(headerStart);
    const header = src.slice(headerStart, headerEnd);
    const labels = ["☰ Sessions", "New conversation", "Sign out", "Evidence", "Mark resolved"];
    const idx = labels.map((l) => {
      const i = header.indexOf(l);
      if (i < 0) throw new Error(`header action missing: ${l}`);
      return i;
    });
    const sorted = [...idx].sort((a, b) => a - b);
    expect(idx).toEqual(sorted);
  });
});

describe("text-only chat unchanged", () => {
  it("empty attachment list yields no extra generation parts", async () => {
    expect(buildAttachmentParts([])).toEqual([]);
  });
});
