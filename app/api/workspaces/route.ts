import { NextResponse } from "next/server";
import { requireDb, requireUser } from "@/lib/auth";
import { createWorkspaceRecord, getMembership, getOwnedWorkspaces, getWorkspaceBySlug } from "@/lib/db";
import { normalizeSlug, workspaceIdForSlug } from "@/lib/tenant";

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  if (!t) return null;
  return t.slice(0, max);
}

/** List workspaces of an organization the caller belongs to. */
export async function GET(req: Request) {
  try {
    await requireDb();
    const user = await requireUser();
    const organizationId = new URL(req.url).searchParams.get("organizationId");
    if (!organizationId) {
      return NextResponse.json({ ok: false, error: "organizationId is required" }, { status: 400 });
    }
    const rows = await getOwnedWorkspaces(user.id, organizationId);
    if (!rows) {
      return NextResponse.json({ ok: false, error: "no access to this organization" }, { status: 403 });
    }
    return NextResponse.json({
      ok: true,
      workspaces: rows.map((w) => ({
        slug: w.slug,
        name: w.name,
        productName: w.product_name,
        role: w.role,
        supportUrl: `/support/${w.slug}`,
      })),
    });
  } catch (e) {
    const status =
      e instanceof Error && typeof (e as Error & { status?: unknown }).status === "number"
        ? ((e as Error & { status?: number }).status as number)
        : 500;
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "request failed" },
      { status },
    );
  }
}

/** Create a workspace inside an organization the caller owns membership in. */
export async function POST(req: Request) {
  let body: {
    organizationId?: unknown;
    name?: unknown;
    slug?: unknown;
    productName?: unknown;
    productDescription?: unknown;
    supportContext?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }
  try {
    await requireDb();
    const user = await requireUser();

    if (typeof body.organizationId !== "string" || !body.organizationId) {
      return NextResponse.json({ ok: false, error: "organizationId is required" }, { status: 400 });
    }
    // Ownership check FIRST: slug/IDs from the client are never trusted.
    const membership = await getMembership(user.id, body.organizationId);
    if (!membership) {
      return NextResponse.json(
        { ok: false, error: "no access to this organization" },
        { status: 403 },
      );
    }
    const name = str(body.name, 80);
    if (!name || name.length < 2) {
      return NextResponse.json({ ok: false, error: "workspace name too short" }, { status: 400 });
    }
    let slug: string;
    try {
      slug = normalizeSlug(typeof body.slug === "string" && body.slug.trim() ? body.slug : name);
    } catch (e) {
      return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : "bad workspace slug" },
        { status: 400 },
      );
    }
    if (await getWorkspaceBySlug(slug)) {
      return NextResponse.json({ ok: false, error: `workspace slug "${slug}" is taken` }, { status: 409 });
    }
    // Immutable v2 ID from the final slug — same derivation as P5, so every
    // created workspace is namespace-compatible. No Walrus calls here.
    const id = workspaceIdForSlug(slug);
    const productName = str(body.productName, 80) ?? name;
    await createWorkspaceRecord({
      id,
      organizationId: body.organizationId,
      slug,
      name,
      productName,
      productDescription: str(body.productDescription, 500),
      supportContext: str(body.supportContext, 2000),
    });
    return NextResponse.json(
      {
        ok: true,
        workspace: { id, slug, name, productName, supportUrl: `/support/${slug}` },
      },
      { status: 201 },
    );
  } catch (e) {
    const status =
      e instanceof Error && typeof (e as Error & { status?: unknown }).status === "number"
        ? ((e as Error & { status?: number }).status as number)
        : 500;
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "request failed" },
      { status },
    );
  }
}
