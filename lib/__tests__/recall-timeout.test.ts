import { describe, expect, it } from "vitest";
import { settleWithTimeout } from "../retry";
import { normalizeMemories } from "../chat-memory";

const hang = () => new Promise<string>(() => {});
const fail = async (): Promise<string> => {
  throw new Error("relayer unreachable");
};
const ok = async (v: string) => v;

describe("settleWithTimeout", () => {
  it("a hanging promise becomes a timeout verdict in bounded time", async () => {
    const t0 = Date.now();
    const out = await settleWithTimeout(hang(), 120);
    expect(out.status).toBe("timeout");
    expect(Date.now() - t0).toBeLessThan(5000);
  });

  it("a rejecting promise becomes an error verdict with the cause", async () => {
    const out = await settleWithTimeout(fail(), 1000);
    expect(out.status).toBe("error");
    if (out.status === "error") {
      expect(String(out.error)).toMatch(/relayer unreachable/);
    }
  });

  it("a resolving promise passes its value through", async () => {
    const out = await settleWithTimeout(ok("memory"), 1000);
    expect(out).toEqual({ status: "ok", value: "memory" });
  });

  it("one hung plane does not block the healthy plane", async () => {
    const [p, s] = await Promise.all([
      settleWithTimeout(hang(), 120),
      settleWithTimeout(ok("shared-fix"), 1000),
    ]);
    expect(p.status).toBe("timeout");
    expect(s).toEqual({ status: "ok", value: "shared-fix" });
    // Route equivalent: degrade with whatever actually returned.
    const used = normalizeMemories(
      [],
      s.status === "ok" ? [{ text: "[SHARED_FIX] x", distance: 0.2, blobId: "b1" }] : [],
    );
    expect(used).toHaveLength(1);
    expect(used[0].plane).toBe("shared");
  });

  it("both planes failed still yields a valid zero-memory baseline", async () => {
    const [p, s] = await Promise.all([
      settleWithTimeout(hang(), 50),
      settleWithTimeout(fail(), 1000),
    ]);
    expect(p.status).toBe("timeout");
    expect(s.status).toBe("error");
    expect(normalizeMemories([], [])).toEqual([]);
  });
});
