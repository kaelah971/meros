import { NextResponse } from "next/server";
import { identityError, resolveProductIdentity } from "@/lib/product-identity";
import { generateFixCandidate } from "@/lib/fix-candidate";
import {
  createPendingFixCard,
  getConversationForCustomer,
  listRecentTurns,
  resolveConversation,
  type FixCardRow,
} from "@/lib/support-ops";

/**
 * Explicit customer resolution ("Mark resolved"). Verifies the conversation
 * belongs to the caller's exact workspace/customer, marks conversation +
 * issue resolved, then attempts a grounded pending Fix Card for staff
 * review. Card generation failure never blocks the resolution itself.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  let body: { workspaceSlug?: unknown; resolutionNote?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  let tenant: Awaited<ReturnType<typeof resolveProductIdentity>>;
  try {
    tenant = await resolveProductIdentity(body);
  } catch (e) {
    const err = identityError(e);
    return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
  }

  const { id } = await ctx.params;
  let conversation: Awaited<ReturnType<typeof getConversationForCustomer>>;
  try {
    conversation = await getConversationForCustomer(id, tenant.workspaceId, tenant.customerId);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "conversation unavailable" },
      { status: 503 },
    );
  }
  if (!conversation) {
    return NextResponse.json({ ok: false, error: "conversation not found" }, { status: 404 });
  }

  const note =
    typeof body.resolutionNote === "string" && body.resolutionNote.trim()
      ? body.resolutionNote.trim().slice(0, 500)
      : "Customer confirmed resolution.";
  let issue;
  try {
    issue = await resolveConversation(conversation.id, note);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "resolution failed" },
      { status: 503 },
    );
  }

  let fixCard: { id: string; status: FixCardRow["status"]; candidateText?: string } | null = null;
  try {
    const transcript = await listRecentTurns(conversation.id, 12);
    const generated = await generateFixCandidate(transcript);
    if (generated.status === "ready") {
      const card = await createPendingFixCard({
        workspaceId: tenant.workspaceId,
        customerId: tenant.customerId,
        conversationId: conversation.id,
        issueId: issue.id,
        candidateText: generated.text,
      });
      fixCard = { id: card.id, status: card.status, candidateText: generated.text };
    }
  } catch (e) {
    console.log(`[resolve] fix card generation skipped: ${e instanceof Error ? e.message : e}`);
  }

  return NextResponse.json({
    ok: true,
    conversation: { id: conversation.id, status: "resolved" as const },
    issue: { id: issue.id, status: issue.status },
    fixCard,
  });
}
