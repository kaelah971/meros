import { NextResponse } from "next/server";
import { identityError, resolveProductIdentity } from "@/lib/product-identity";
import { listCustomerConversations } from "@/lib/support-ops";

/** Customer's own conversation history for one workspace. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const workspaceSlug = url.searchParams.get("workspaceSlug") ?? undefined;
  let tenant: Awaited<ReturnType<typeof resolveProductIdentity>>;
  try {
    tenant = await resolveProductIdentity({ workspaceSlug });
  } catch (e) {
    const err = identityError(e);
    return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
  }
  try {
    const conversations = await listCustomerConversations(tenant.workspaceId, tenant.customerId);
    return NextResponse.json({
      ok: true,
      conversations: conversations.map((c) => ({
        id: c.id,
        title: c.title,
        status: c.status,
        lastMessageAt: c.last_message_at,
        createdAt: c.created_at,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "history unavailable" },
      { status: 503 },
    );
  }
}
