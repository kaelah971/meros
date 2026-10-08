import { NextResponse } from "next/server";
import { GeminiNotConfiguredError, type ChatTurn } from "@/lib/gemini";
import { previewUserId } from "@/lib/identity";
import { identityError, resolveProductIdentity } from "@/lib/product-identity";
import type { AuthenticatedCustomer } from "@/lib/tenant-store";
import { generateFixCandidate } from "@/lib/fix-candidate";

/**
 * Proposes a sanitized Fix Card AFTER explicit resolution confirmation.
 * Writes NOTHING to Walrus — preview only. The human gate decides next.
 * (Dev/diagnostic path; the product flow auto-creates pending cards on
 * resolution inside /api/chat.)
 */
export async function POST(req: Request) {
  // NOTE: P7 product flow uses session auth (legacy access-code path is dev-only).
  let body: { workspaceSlug?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  let tenant: AuthenticatedCustomer;
  try {
    tenant = await resolveProductIdentity(body);
  } catch (e) {
    const err = identityError(e);
    return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
  }

  const history: ChatTurn[] = Array.isArray(body.history)
    ? (body.history as ChatTurn[]).filter((t) => t && typeof t.text === "string").slice(-12)
    : [];
  if (history.length === 0) {
    return NextResponse.json({ ok: false, error: "no conversation to summarize" }, { status: 400 });
  }

  let result: Awaited<ReturnType<typeof generateFixCandidate>>;
  try {
    result = await generateFixCandidate(history);
  } catch (e) {
    if (e instanceof GeminiNotConfiguredError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 503 });
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "candidate generation failed" },
      { status: 502 },
    );
  }
  if (result.status === "none") {
    return NextResponse.json({ ok: true, candidate: null, note: "no reusable fix found" });
  }
  if (result.status === "error") {
    return NextResponse.json({ ok: true, candidate: null, blocked: result.error });
  }
  return NextResponse.json({
    ok: true,
    candidate: result.text,
    userPreview: previewUserId(tenant.customerId),
  });
}
