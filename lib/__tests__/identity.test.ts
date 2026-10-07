import { describe, expect, it } from "vitest";
import {
  deriveNamespace,
  deriveUserId,
  identityFromAccessCode,
  normalizeAccessCode,
} from "../identity";

describe("P0 identity primitive", () => {
  it("same access code maps to same user id + namespace", () => {
    const a = identityFromAccessCode("P0-ALICE-01", "test-salt");
    const b = identityFromAccessCode("P0-ALICE-01", "test-salt");
    expect(a.userId).toBe(b.userId);
    expect(a.namespace).toBe(b.namespace);
  });

  it("normalizes case and whitespace", () => {
    expect(normalizeAccessCode("  p0-alice-01 ")).toBe("P0-ALICE-01");
    const a = identityFromAccessCode("p0-alice-01", "test-salt");
    const b = identityFromAccessCode("  P0-ALICE-01 ", "test-salt");
    expect(a.userId).toBe(b.userId);
  });

  it("different codes map to different namespaces", () => {
    const a = identityFromAccessCode("P0-ALICE-01", "test-salt");
    const b = identityFromAccessCode("P0-BOB-02", "test-salt");
    expect(a.userId).not.toBe(b.userId);
    expect(a.namespace).not.toBe(b.namespace);
  });

  it("never uses the raw code as the namespace", () => {
    const id = identityFromAccessCode("P0-ALICE-01", "test-salt");
    expect(id.namespace.startsWith("meros:user:")).toBe(true);
    expect(id.namespace).not.toContain("ALICE");
    expect(id.namespace).not.toContain("P0-");
    expect(deriveNamespace(deriveUserId("X", "s"))).toMatch(/^meros:user:[0-9a-f]{64}$/);
  });

  it("rejects empty/short codes", () => {
    expect(() => identityFromAccessCode("  ", "s")).toThrow();
    expect(() => identityFromAccessCode("abc", "s")).toThrow();
  });
});
