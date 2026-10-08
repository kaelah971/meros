import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  customerIdFor,
  derivePrivateNamespaceV2,
  deriveSharedNamespaceV2,
  normalizeSlug,
  resolveTenantIds,
  workspaceIdForSlug,
} from "../tenant";

const SALT = "test-salt-p5";

const tenant = (slug: string, code: string, org: string) =>
  resolveTenantIds(slug, code, SALT, org);

describe("P5 tenant namespaces", () => {
  it("A. same workspace + customer → stable namespace", () => {
    const a = tenant("acme", "ALICE-01", "acme");
    const b = tenant("acme", "ALICE-01", "acme");
    expect(a.privateNamespace).toBe(b.privateNamespace);
    expect(a.customerId).toBe(b.customerId);
    expect(a.sharedNamespace).toBe(b.sharedNamespace);
    expect(a.privateNamespace).toMatch(/^meros:v2:workspace:[0-9a-f]{32}:customer:[0-9a-f]{32}$/);
  });

  it("B. same workspace, different customers → different private namespaces", () => {
    const alice = tenant("acme", "ALICE-01", "acme");
    const bob = tenant("acme", "BOB-02", "acme");
    expect(alice.customerId).not.toBe(bob.customerId);
    expect(alice.privateNamespace).not.toBe(bob.privateNamespace);
  });

  it("C. same access code, different workspaces → different customers/namespaces", () => {
    const acme = tenant("acme", "ALICE-01", "acme");
    const nova = tenant("nova", "ALICE-01", "nova");
    expect(acme.customerId).not.toBe(nova.customerId);
    expect(acme.privateNamespace).not.toBe(nova.privateNamespace);
    expect(acme.workspaceId).not.toBe(nova.workspaceId);
  });

  it("D. shared namespace stable per workspace, differs across workspaces", () => {
    expect(deriveSharedNamespaceV2(workspaceIdForSlug("acme"))).toBe(
      deriveSharedNamespaceV2(workspaceIdForSlug("acme")),
    );
    expect(deriveSharedNamespaceV2(workspaceIdForSlug("acme"))).not.toBe(
      deriveSharedNamespaceV2(workspaceIdForSlug("nova")),
    );
    // Same access code must not affect the shared namespace.
    expect(tenant("acme", "ALICE-01", "acme").sharedNamespace).toBe(
      tenant("acme", "BOB-02", "acme").sharedNamespace,
    );
  });

  it("E. v2 namespaces never touch legacy v1 keys", () => {
    const t = tenant("acme", "ALICE-01", "acme");
    for (const ns of [t.privateNamespace, t.sharedNamespace]) {
      expect(ns).not.toContain("meros:shared:fixes");
      expect(ns).not.toContain("meros:user:");
    }
    // Workspace + customer IDs are opaque hashes, never raw slugs/codes.
    expect(t.workspaceId).not.toContain("acme");
    expect(t.customerId).not.toContain("ALICE");
    expect(t.bootstrapHash).not.toContain("ALICE");
  });

  it("E2. v2 chat path never queries the legacy global shared namespace", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const read = (p: string) => readFileSync(join(here, p), "utf8");
    const v2Paths = [
      "../../app/api/chat/route.ts",
      "../../app/api/compare/route.ts",
      "../../app/api/memory/capture/route.ts",
      "../../app/api/fixes/candidate/route.ts",
      "../../app/api/fixes/promote/route.ts",
      "../../app/api/tenant/resolve/route.ts",
    ];
    for (const p of v2Paths) {
      const src = read(p);
      expect(src, p).not.toContain("meros:shared:fixes");
      expect(src, p).not.toContain("SHARED_FIXES_NAMESPACE");
      expect(src, p).not.toContain("recallShared");
      expect(src, p).not.toContain("rememberShared(");
      expect(src, p).not.toContain("meros:user:");
      expect(src, p).not.toContain("identityFromAccessCode");
    }
  });

  it("G. no-memory compare touches zero Walrus code", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../../app/api/compare/route.ts"), "utf8");
    expect(src).not.toContain("lib/walrus");
    expect(src).not.toContain("recall");
    expect(src).not.toContain("remember");
    expect(src).not.toContain("namespace");
    expect(src).not.toContain("provenance");
  });

  it("F. promotion ownership follows the resolving workspace, not the client", () => {
    // resolveTenantIds takes no namespace input at all: same code under two
    // workspaces can only ever produce their own workspaces' namespaces.
    const acme = tenant("acme", "ALICE-01", "acme");
    const nova = tenant("nova", "ALICE-01", "nova");
    expect(acme.sharedNamespace).not.toBe(nova.sharedNamespace);
    expect(acme.sharedNamespace).toContain(acme.workspaceId);
    expect(nova.sharedNamespace).toContain(nova.workspaceId);
  });

  it("G. slugs are strict; raw codes never leak into IDs", () => {
    expect(() => normalizeSlug("ACME")).not.toThrow(); // normalized, not rejected
    expect(normalizeSlug("ACME")).toBe("acme");
    expect(() => normalizeSlug("a")).toThrow();
    expect(() => normalizeSlug("acme_corp!")).toThrow();
    expect(() => resolveTenantIds("acme", "x", SALT, "acme")).toThrow(); // short code
    const ids = resolveTenantIds("acme", "s3cr3t-code", SALT, "acme");
    const blob = JSON.stringify(ids);
    expect(blob).not.toContain("s3cr3t-code");
    expect(customerIdFor(ids.workspaceId, ids.bootstrapHash)).toBe(ids.customerId);
    expect(derivePrivateNamespaceV2(ids.workspaceId, ids.customerId)).toBe(ids.privateNamespace);
  });
});
