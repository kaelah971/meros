import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getMembership, getWorkspaceBySlug } from "@/lib/db";
import { validateSharedCandidate } from "@/lib/support-memory";
import { deriveSharedNamespaceV2 } from "@/lib/tenant";
import {
  getFixCardForWorkspace,
  markFixCardFailed,
  markFixCardKeptPrivate,
  markFixCardShared,
} from "@/lib/support-ops";
import { WalrusNotConfiguredError, rememberInNamespace } from "@/lib/walrus";

const STAFF_ROLES = new Set(["owner", "admin", "support"]);

/**
 * Staff Fix Card review. BOTH decisions require organization membership
 * (owner/admin/support) in the Fix Card's workspace organization:
 * - shared: revalidate → rememberAndWait into the workspace shared
 *   namespace → record blob metadata. Real Walrus completion required.
 * - kept_private: ZERO Walrus writes; status row only.
 * Customer sessions (no membership) get 403 here — the support UI never
 * calls this endpoint.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  let body: { workspaceSlug?: unknown; decision?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  let user: Awaited<ReturnType<typeof requireUser>>;
  try {
    user = await requireUser();
  } catch (e) {
    const status =
      typeof (e as { status?: unknown })?.status === "number"
        ? (e as { status: number }).status
        : 401;
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "not signed in" },
      { status },
    );
  }

  const { id } = await ctx.params;
  const decision = body.decision;
  if (decision !== "shared" && decision !== "kept_private") {
    return NextResponse.json(
      { ok: false, error: "decision must be 'shared' or 'kept_private'" },
      { status: 400 },
    );
  }

  try {
    // Scope by workspace slug, then verify staff membership in that
    // workspace's organization. Neither slug nor card id alone authorizes.
    const slug = typeof body.workspaceSlug === "string" ? body.workspaceSlug.trim() : "";
    const ws = slug ? await getWorkspaceBySlug(slug) : null;
    if (!ws) {
      return NextResponse.json({ ok: false, error: "workspace not found" }, { status: 404 });
    }
    const membership = await getMembership(user.id, ws.organization_id);
    if (!membership || !STAFF_ROLES.has(membership.role)) {
      return NextResponse.json({ ok: false, error: "staff access required" }, { status: 403 });
    }

    const card = await getFixCardForWorkspace(id, ws.id);
    if (!card) {
      return NextResponse.json({ ok: false, error: "fix card not found" }, { status: 404 });
    }
    if (card.status !== "pending_review") {
      return NextResponse.json(
        { ok: false, error: `fix card already ${card.status}`, status: card.status },
        { status: 409 },
      );
    }

    if (decision === "kept_private") {
      await markFixCardKeptPrivate(card.id, user.id);
      return NextResponse.json({ ok: true, status: "kept_private", id: card.id });
    }

    // Shared path: re-validate the stored candidate, then write to the
    // workspace-scoped shared namespace derived from the workspace id.
    const gate = validateSharedCandidate(card.candidate_text);
    if (!gate.ok) {
      await markFixCardFailed(card.id);
      return NextResponse.json(
        { ok: false, status: "failed", error: gate.error },
        { status: 400 },
      );
    }
    try {
      const done = await rememberInNamespace(
        deriveSharedNamespaceV2(ws.id),
        card.candidate_text,
        2000,
      );
      await markFixCardShared(card.id, done.blobId, user.id);
      return NextResponse.json({
        ok: true,
        status: "shared",
        id: card.id,
        blobId: done.blobId,
        walrusJobId: done.jobId,
      });
    } catch (e) {
      if (e instanceof WalrusNotConfiguredError) {
        return NextResponse.json(
          { ok: false, status: "blocked", error: e.message, needed: e.needed },
          { status: 503 },
        );
      }
      await markFixCardFailed(card.id);
      return NextResponse.json(
        { ok: false, status: "failed", error: e instanceof Error ? e.message : "shared write failed" },
        { status: 502 },
      );
    }
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "review failed" },
      { status: 503 },
    );
  }
}
