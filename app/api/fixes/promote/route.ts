import { NextResponse } from "next/server";
import { previewUserId } from "@/lib/identity";
import { validateSharedCandidate } from "@/lib/support-memory";
import { identityError, resolveProductIdentity } from "@/lib/product-identity";
import type { AuthenticatedCustomer } from "@/lib/tenant-store";
import { requireUser } from "@/lib/auth";
import { requireStaff } from "@/lib/support-ops";
import { WalrusNotConfiguredError, rememberInNamespace } from "@/lib/walrus";

/**
 * STAFF-ONLY shared-memory write. Customers must use the Fix Card review
 * queue (staff approve via /api/fix-cards/[id]/review); direct customer
 * promotion returns 403. The shared namespace is derived server-side —
 * the client can never supply it.
 */
export async function POST(req: Request) {
  // NOTE: P7 product flow uses session auth (legacy access-code path is dev-only).
  let body: { workspaceSlug?: unknown; candidate?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  // The CURRENT workspace is resolved server-side: the client can never
  // choose which workspace receives the Fix Card. Product identity still
  // resolves the workspace, but only org staff may write shared memory.
  let tenant: AuthenticatedCustomer;
  try {
    tenant = await resolveProductIdentity(body);
    const user = await requireUser();
    // requireStaff throws 403 for non-members; identityError passes it through.
    await requireStaff(user.id, tenant.workspaceId);
  } catch (e) {
    const err = identityError(e);
    return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
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
