export type CaptureFactStatus = {
  status: string;
  text?: string;
  blobId?: string;
};

export type CaptureResultBody = {
  ok: boolean;
  facts?: CaptureFactStatus[];
  skipped?: string;
  note?: string;
};

/**
 * Maps a /api/memory/capture response to a user-visible note.
 *
 * Status semantics (fixed):
 * - ok:false means NO private write was attempted (identity, extraction, or
 *   transport failure upstream of any Walrus call). Return null so the UI
 *   never implies a failed save.
 * - ok:true with zero facts means nothing durable was found or capture was
 *   intentionally skipped. Return null.
 * - ok:true with facts warns ONLY when a real write was attempted and failed.
 */
export function captureNoteForResult(data: CaptureResultBody | null | undefined): string | null {
  if (!data || typeof data !== "object") return null;
  if (!data.ok) return null;
  const facts = Array.isArray(data.facts) ? data.facts : [];
  if (facts.length === 0) return null;
  const stored = facts.filter((f) => f.status === "stored").length;
  const failed = facts.filter((f) => f.status === "failed").length;
  if (stored > 0 && failed === 0) {
    return `Remembered ${stored} private memor${stored === 1 ? "y" : "ies"} for next time.`;
  }
  if (stored > 0) return `Remembered ${stored}, failed to save ${failed} — retry later.`;
  if (failed > 0) return "Could not save private memory — nothing was stored.";
  return null;
}
