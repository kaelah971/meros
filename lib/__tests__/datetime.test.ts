import { describe, expect, it } from "vitest";
import { formatUtc } from "../datetime";

describe("formatUtc (hydration-safe timestamps)", () => {
  it("renders the reported fix-card timestamp deterministically", () => {
    // Server rendered "09/10/2026, 02:50:25", browser "10/9/2026, 2:50:25 AM"
    // for the same instant. The fixed format is identical everywhere.
    expect(formatUtc("2026-10-09T02:50:25.000Z")).toBe("09 Oct 2026, 02:50:25 UTC");
  });

  it("is independent of the runtime timezone", () => {
    const prev = process.env.TZ;
    try {
      process.env.TZ = "Pacific/Auckland";
      expect(formatUtc("2026-10-09T02:50:25.000Z")).toBe("09 Oct 2026, 02:50:25 UTC");
      expect(formatUtc(new Date("2026-01-01T00:00:00.000Z"))).toBe("01 Jan 2026, 00:00:00 UTC");
      process.env.TZ = "America/New_York";
      expect(formatUtc("2026-10-09T02:50:25.000Z")).toBe("09 Oct 2026, 02:50:25 UTC");
    } finally {
      if (prev === undefined) delete process.env.TZ;
      else process.env.TZ = prev;
    }
  });

  it("handles epoch numbers, Date objects, and invalid input", () => {
    expect(formatUtc(0)).toBe("01 Jan 1970, 00:00:00 UTC");
    expect(formatUtc(new Date("2026-12-31T23:59:59.000Z"))).toBe("31 Dec 2026, 23:59:59 UTC");
    expect(formatUtc("not-a-date")).toBe("—");
  });

  it("SSR-rendered timestamps use formatUtc, not locale formatting (static)", async () => {
    const { readFileSync } = await import("node:fs");
    const fixed = [
      "components/fix-card-review.tsx",
      "app/app/workspaces/[slug]/conversations/page.tsx",
      "app/app/workspaces/[slug]/conversations/[id]/page.tsx",
      "app/app/workspaces/[slug]/customers/page.tsx",
      "app/app/workspaces/[slug]/shared/page.tsx",
    ];
    for (const f of fixed) {
      const src = readFileSync(f, "utf8");
      expect(src, `${f}: locale date formatting reintroduces hydration mismatch`).not.toMatch(
        /toLocale(String|DateString|TimeString)\(\)/,
      );
      expect(src, `${f}: must use the shared deterministic formatter`).toContain("formatUtc(");
    }
  });
});
