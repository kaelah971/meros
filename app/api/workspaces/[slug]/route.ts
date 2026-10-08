import { NextResponse } from "next/server";
import { requireDb, requireUser } from "@/lib/auth";
import { getOwnedWorkspace } from "@/lib/db";

/** Read ONE workspace — only if the caller is a member of its organization. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    await requireDb();
    const user = await requireUser();
    const { slug } = await ctx.params;
    const ws = await getOwnedWorkspace(user.id, slug);
    if (!ws) {
      // Deliberately identical for missing vs. foreign: no org enumeration.
      return NextResponse.json({ ok: false, error: "workspace not found" }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      workspace: {
        slug: ws.slug,
        name: ws.name,
        productName: ws.product_name,
        productDescription: ws.product_description,
        supportContext: ws.support_context,
        role: ws.role,
        supportUrl: `/support/${ws.slug}`,
      },
    });
  } catch (e) {
    const status =
      e instanceof Error && typeof (e as Error & { status?: number }).status === "number"
        ? ((e as Error & { status?: number }).status as number)
        : 500;
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "request failed" },
      { status },
    );
  }
}
