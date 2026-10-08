import { describe, expect, it } from "vitest";
import { withRetry as withGeminiRetry } from "../retry";

const transient = () => {
  throw new Error('{"error":{"code":503,"message":"high demand","status":"UNAVAILABLE"}}');
};

describe("withGeminiRetry", () => {
  it("retries transient 503s then returns success", async () => {
    let calls = 0;
    const out = await withGeminiRetry(async () => {
      calls++;
      if (calls < 3) transient();
      return "ok";
    });
    expect(out).toBe("ok");
    expect(calls).toBe(3);
  });
  it("throws non-retryable errors immediately without looping", async () => {
    let calls = 0;
    await expect(
      withGeminiRetry(async () => {
        calls++;
        throw new Error("candidate must be [SHARED_FIX] with Symptom/Cause/Resolution lines");
      }),
    ).rejects.toThrow(/SHARED_FIX/);
    expect(calls).toBe(1);
  });
  it("gives up after a bounded number of attempts", async () => {
    let calls = 0;
    await expect(
      withGeminiRetry(async () => {
        calls++;
        transient();
        return "never";
      }),
    ).rejects.toThrow(/503/);
    expect(calls).toBe(3);
  });
});
