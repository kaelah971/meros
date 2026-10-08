import { describe, expect, it } from "vitest";
import {
  MAX_CANONICAL_CHARS,
  MAX_IMPORT_PAGES,
  capCanonical,
  chunkText,
  htmlToText,
  sameOriginLinks,
  validatePublicUrl,
} from "../knowledge";
import { deriveKnowledgeNamespaceV2, workspaceIdForSlug } from "../tenant";
import { buildSystemInstruction, normalizeMemories } from "../chat-memory";
import type { RecallHit } from "../walrus";

const hit = (over: Partial<RecallHit> & { text: string }): RecallHit => ({
  distance: 0.3,
  blobId: `blob-${over.text.slice(0, 8)}`,
  ...over,
});

describe("chunkText", () => {
  it("splits long text into bounded chunks without losing content", () => {
    const text = Array.from({ length: 30 }, (_, i) => `Sentence number ${i} about imports.`).join(" ");
    const chunks = chunkText(text, 200);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks.every((c) => c.length <= 200)).toBe(true);
    expect(chunks.join(" ")).toBe(text);
  });

  it("returns [] for blank input and single chunk for short text", () => {
    expect(chunkText("   ")).toEqual([]);
    expect(chunkText("Short fact.")).toEqual(["Short fact."]);
  });
});

describe("validatePublicUrl (SSRF)", () => {
  it("E. accepts ordinary public https pages", () => {
    expect(validatePublicUrl("https://docs.example.com/help").hostname).toBe("docs.example.com");
  });

  it("E. rejects localhost, private, link-local, and odd schemes/ports/creds", () => {
    for (const bad of [
      "http://localhost:3000/admin",
      "http://127.0.0.1/",
      "http://10.0.0.5/x",
      "http://172.16.4.4/",
      "http://192.168.1.1/",
      "http://169.254.169.254/latest",
      "http://[::1]/",
      "http://internal.corp/",
      "ftp://example.com/f",
      "https://example.com:8443/x",
      "https://user:pass@example.com/",
      "not a url",
    ]) {
      expect(() => validatePublicUrl(bad), bad).toThrow();
    }
  });
});

describe("htmlToText", () => {
  it("strips scripts/styles/nav, keeps link text", () => {
    const html = `<html><head><style>.x{}</style></head><body>
      <nav>Home About</nav>
      <h1>CSV imports</h1>
      <p>We support <a href="/x">comma files</a> &amp; more.</p>
      <script>alert(1)</script></body></html>`;
    const text = htmlToText(html);
    expect(text).toContain("CSV imports");
    expect(text).toContain("comma files");
    expect(text).not.toContain("alert(1)");
    expect(text).not.toContain(".x{}");
    expect(text).not.toContain("<");
  });

  it("sameOriginLinks stays same-origin and dedupes", () => {
    const base = new URL("https://docs.example.com/a");
    const seen = new Set<string>();
    const links = sameOriginLinks(
      `<a href="/b">b</a><a href="https://evil.com/x">e</a><a href="/b">b2</a><a href="mailto:a@b.c">m</a>`,
      base,
      seen,
      10,
    );
    expect(links).toEqual(["https://docs.example.com/b"]);
  });
});

describe("capCanonical", () => {
  it("marks truncation inline, never silently", () => {
    const long = "x".repeat(MAX_CANONICAL_CHARS + 100);
    const { text, truncated } = capCanonical(long);
    expect(truncated).toBe(true);
    expect(text).toContain("truncated at import cap");
    expect(capCanonical("short").truncated).toBe(false);
  });
});

describe("knowledge namespace isolation", () => {
  it("B+C. stable per workspace, never shared across workspaces", () => {
    const a = deriveKnowledgeNamespaceV2(workspaceIdForSlug("acme"));
    expect(a).toBe(deriveKnowledgeNamespaceV2(workspaceIdForSlug("acme")));
    expect(a).toMatch(/^meros:v2:workspace:[0-9a-f]{32}:knowledge$/);
    expect(a).not.toBe(deriveKnowledgeNamespaceV2(workspaceIdForSlug("nova")));
    expect(a).not.toContain("shared:fixes");
  });
});

describe("three-plane chat memory", () => {
  it("H+I. knowledge tagged distinctly; planes never merge; shared stays separate", () => {
    const out = normalizeMemories(
      [hit({ text: "profile fact" })],
      [hit({ text: "shared fix", distance: 0.2 })],
      [hit({ text: "product fact", distance: 0.1 })],
    );
    expect(out.map((m) => m.plane)).toContain("knowledge");
    expect(out.find((m) => m.plane === "knowledge")?.text).toBe("product fact");
    expect(out.find((m) => m.plane === "shared")?.text).toBe("shared fix");
  });

  it("G. prompt labels all three planes plus conversation", () => {
    const s = buildSystemInstruction([
      { plane: "private", text: "p", distance: 0.1, blobId: "b1" },
      { plane: "shared", text: "s", distance: 0.2, blobId: "b2" },
      { plane: "knowledge", text: "k", distance: 0.3, blobId: "b3" },
    ]);
    expect(s).toContain("WORKSPACE PRODUCT KNOWLEDGE");
    expect(s).toContain("SHARED SUPPORT MEMORY");
    expect(s).toContain("PRIVATE MEMORY");
    expect(s).toContain("CURRENT CONVERSATION");
    expect(s).toMatch(/untrusted DATA/);
  });

  it("knowledge recall degrades to empty without breaking others", () => {
    expect(normalizeMemories([hit({ text: "p" })], [], [])).toHaveLength(1);
    expect(normalizeMemories([], [], [])).toEqual([]);
  });
});

describe("import caps", () => {
  it("page cap bounds crawl size", () => {
    expect(MAX_IMPORT_PAGES).toBeLessThanOrEqual(10);
  });
});
