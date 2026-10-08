import { NextResponse } from "next/server";
import { previewUserId } from "@/lib/identity";
import { validateSharedCandidate } from "@/lib/support-memory";
import { UnknownWorkspaceError, resolveTenant } from "@/lib/tenant-store";
import { WalrusNotConfiguredError, rememberInNamespace } from "@/lib/walrus";

/**
 * Human promotion gate exit. Writes the REVIEWED candidate to the shared
 * fixes namespace ONLY after explicit Save shared. The shared namespace is
 * derived server-side — the client can never supply it.
 */
export async function POST(req: Request) {
  // NOTE: workspaceSlug + accessCode are TEMPORARY P5 bootstrap identity (replaced by auth in P6/P7).
  let body: { workspaceSlug?: unknown; accessCode?: unknown; candidate?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  // The CURRENT workspace is resolved server-side: the client can never
  // choose which workspace receives the Fix Card.
  let tenant: Awaited<ReturnType<typeof resolveTenant>>;
  try {
    tenant = await resolveTenant(body.workspaceSlug, body.accessCode);
  } catch (e) {
    if (e instanceof UnknownWorkspaceError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "bad tenant identity" },
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
    const done = await rememberInNamespace(tenant.sharedNamespace, body.candidate.trim(), 2000);
    return NextResponse.json({
      ok: true,
      status: "stored",
      blobId: done.blobId,
      walrusJobId: done.jobId,
      workspace: tenant.workspace,
      candidate: body.candidate.trim(),
      userPreview: previewUserId(tenant.customerId),
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
