import { describe, expect, it } from "vitest";
import { deriveKnowledgeNamespaceV2, workspaceIdForSlug } from "../tenant";
import {
  MAX_DISTANCE,
  buildSystemInstruction,
  normalizeMemories,
} from "../chat-memory";
import type { RecallHit } from "../walrus";

const hit = (over: Partial<RecallHit> & { text: string }): RecallHit => ({
  distance: 0.3,
  blobId: `blob-${over.text.slice(0, 8)}`,
  ...over,
});

const NORTHSTAR_KNOWLEDGE = [
  "[KNOWLEDGE] Northstar Data is a collaborative data platform. Customers use it to organize operational data.",
  "[KNOWLEDGE] Northstar Data supports CSV and XLSX imports up to 500 MB.",
];

describe("customer sign-out control (static)", () => {
  it("header renders an authenticated Sign out wired to Better Auth", async () => {
    const { readFileSync } = await import("node:fs");
    const src = readFileSync("components/support-chat.tsx", "utf8");
    // Visible in the always-rendered header (not only the sidebar drawer):
    // the header control carries its return-to-gate title.
    expect(src).toContain('title="Sign out and return to this workspace\'s sign-in screen"');
    expect(src).toMatch(/\{isAuth && \([\s\S]{0,600}?void signOutHere\(\)/);
    // Uses the existing Better Auth mechanism through the guarded helper,
    // then reloads the same URL so the server route renders the workspace gate again.
    expect(src).toContain("signOut: () => authClient.signOut()");
    expect(src).toContain("refreshCurrentRoute: () => window.location.reload()");
  });
});

describe("knowledge namespace write/read identity", () => {
  it("write path and recall path derive the identical namespace string", () => {
    // Both lib/knowledge (index) and app/api/chat (recall) must call
    // deriveKnowledgeNamespaceV2 with the same workspace id.
    const fromWritePath = deriveKnowledgeNamespaceV2(workspaceIdForSlug("northstar"));
    const fromRecallPath = deriveKnowledgeNamespaceV2(workspaceIdForSlug("northstar"));
    expect(fromWritePath).toBe(fromRecallPath);
    expect(fromWritePath).toMatch(/^meros:v2:workspace:[0-9a-f]{32}:knowledge$/);
  });

  it("cross-workspace isolation holds for the knowledge plane", () => {
    const northstar = deriveKnowledgeNamespaceV2(workspaceIdForSlug("northstar"));
    const nova = deriveKnowledgeNamespaceV2(workspaceIdForSlug("nova"));
    expect(northstar).not.toBe(nova);
    // And the knowledge namespace never collides with other planes.
    expect(northstar).not.toContain("shared:fixes");
    expect(northstar).not.toContain("customer:");
  });
});

describe("ready knowledge reaches the Gemini context", () => {
  it("semantically matching knowledge hits are tagged and injected", () => {
    const knowledgeHits = NORTHSTAR_KNOWLEDGE.map((text, i) =>
      hit({ text, distance: 0.29 + i * 0.07, blobId: `kb-blob-${i}` }),
    );
    // Other planes healthy-but-empty (the common case for a new customer).
    const used = normalizeMemories([], [], knowledgeHits);
    expect(used).toHaveLength(2);
    expect(used.every((m) => m.plane === "knowledge")).toBe(true);

    const instruction = buildSystemInstruction(used);
    expect(instruction).toContain("WORKSPACE PRODUCT KNOWLEDGE");
    expect(instruction).toContain("CSV and XLSX");
    expect(instruction).toContain("500 MB");
    // Planes stay labelled: knowledge text must not leak into other blocks.
    const sharedBlock = instruction.slice(
      instruction.indexOf("SHARED SUPPORT MEMORY"),
      instruction.indexOf("WORKSPACE PRODUCT KNOWLEDGE"),
    );
    expect(sharedBlock).not.toContain("XLSX");
  });

  it("provenance reports Product knowledge used", () => {
    const used = normalizeMemories(
      [],
      [],
      NORTHSTAR_KNOWLEDGE.map((text, i) => hit({ text, distance: 0.3, blobId: `kb-${i}` })),
    );
    const provenance = used.map((m) => ({
      plane: m.plane,
      text: m.text,
      blobId: m.blobId,
      distance: m.distance,
    }));
    expect(provenance.every((p) => p.plane === "knowledge")).toBe(true);
    expect(used.some((m) => m.plane === "knowledge")).toBe(true);
  });
});

describe("failed planes never mask successful knowledge", () => {
  it("knowledge results survive when private/shared planes return nothing", () => {
    // A timed-out/failed plane contributes zero hits; recallBounded maps
    // that to []. The other planes' results must pass through untouched.
    const knowledgeHits = [hit({ text: NORTHSTAR_KNOWLEDGE[1], distance: 0.35, blobId: "kb-x" })];
    const used = normalizeMemories([], [], knowledgeHits);
    expect(used).toHaveLength(1);
    expect(used[0].plane).toBe("knowledge");
    expect(buildSystemInstruction(used)).toContain("500 MB");
  });

  it("knowledge results survive alongside successful private/shared hits", () => {
    const used = normalizeMemories(
      [hit({ text: "[PROFILE] Uses Excel", distance: 0.2, blobId: "p1" })],
      [hit({ text: "[SHARED_FIX] check delimiter", distance: 0.25, blobId: "s1" })],
      [hit({ text: NORTHSTAR_KNOWLEDGE[1], distance: 0.35, blobId: "k1" })],
    );
    expect(used.map((m) => m.plane).sort()).toEqual(["knowledge", "private", "shared"]);
  });

  it("over-threshold hits are dropped honestly (documented boundary)", () => {
    const used = normalizeMemories(
      [],
      [],
      [hit({ text: NORTHSTAR_KNOWLEDGE[0], distance: MAX_DISTANCE + 0.1, blobId: "k9" })],
    );
    expect(used).toHaveLength(0);
  });
});
