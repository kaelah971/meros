import { NextResponse } from "next/server";
import { previewUserId } from "@/lib/identity";
import { UnknownWorkspaceError, resolveTenant } from "@/lib/tenant-store";

/**
 * Minimal tenant bootstrap: {workspaceSlug, accessCode} -> safe
 * workspace/customer presentation data. NEVER returns IDs, hashes,
 * namespaces, or anything the client could replay as identity.
 */
export async function POST(req: Request) {
  let body: { workspaceSlug?: unknown; accessCode?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  try {
    const t = await resolveTenant(body.workspaceSlug, body.accessCode);
    return NextResponse.json({
      ok: true,
      workspace: t.workspace,
      customerPreview: previewUserId(t.customerId),
      persisted: t.persisted,
      persistenceNote: t.persisted
        ? "Identity persisted in Neon."
        : "Neon unavailable — deterministic session identity (relational persistence blocked).",
    });
  } catch (e) {
    if (e instanceof UnknownWorkspaceError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 404 });
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "tenant resolution failed" },
      { status: 400 },
    );
  }
}
