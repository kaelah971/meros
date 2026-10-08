import { NextResponse } from "next/server";
import { identityFromAccessCode, previewUserId } from "@/lib/identity";
import { validateSharedCandidate } from "@/lib/support-memory";
import { WalrusNotConfiguredError, rememberShared } from "@/lib/walrus";

/**
 * Human promotion gate exit. Writes the REVIEWED candidate to the shared
 * fixes namespace ONLY after explicit Save shared. The shared namespace is
 * derived server-side — the client can never supply it.
 */
export async function POST(req: Request) {
  let body: { accessCode?: unknown; candidate?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  let identity: ReturnType<typeof identityFromAccessCode>;
  try {
    identity = identityFromAccessCode(body.accessCode);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "bad accessCode" },
      { status: 400 },
    );
  }

  if (typeof body.candidate !== "string") {
    return NextResponse.json({ ok: false, error: "candidate text is required" }, { status: 400 });
  }

  // Re-validate server-side: client-echoed text is untrusted.
  const gate = validateSharedCandidate(body.candidate);
  if (!gate.ok) {
    return NextResponse.json(
      { ok: false, status: "rejected", error: gate.error },
      { status: 400 },
    );
  }

  try {
    const done = await rememberShared(body.candidate.trim());
    return NextResponse.json({
      ok: true,
      status: "stored",
      blobId: done.blobId,
      walrusJobId: done.jobId,
      sharedNamespace: done.namespace,
      candidate: body.candidate.trim(),
      userPreview: previewUserId(identity.userId),
    });
  } catch (e) {
    if (e instanceof WalrusNotConfiguredError) {
      return NextResponse.json(
        { ok: false, status: "blocked", error: e.message, needed: e.needed },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { ok: false, status: "failed", error: e instanceof Error ? e.message : "shared write failed" },
      { status: 502 },
    );
  }
}
