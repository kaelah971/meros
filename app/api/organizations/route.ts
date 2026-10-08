import { NextResponse } from "next/server";
import { requireDb, requireUser } from "@/lib/auth";
import { slugifyOrgName, validateOrgName } from "@/lib/auth-crypto";
import { createOrganizationWithOwner, getUserMemberships } from "@/lib/db";
import { organizationIdForSlug } from "@/lib/tenant";

function httpError(e: unknown): { error: string; status: number } {
  const status =
    e instanceof Error && typeof (e as Error & { status?: unknown }).status === "number"
      ? ((e as Error & { status?: number }).status as number)
      : 500;
  return { error: e instanceof Error ? e.message : "request failed", status };
}

/** List organizations the current user belongs to. */
export async function GET() {
  try {
    await requireDb();
    const user = await requireUser();
    return NextResponse.json({ ok: true, organizations: await getUserMemberships(user.id) });
  } catch (e) {
    const { error, status } = httpError(e);
    return NextResponse.json({ ok: false, error }, { status });
  }
}

/** Create an organization; caller becomes its owner. */
export async function POST(req: Request) {
  let body: { name?: unknown; description?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }
  try {
    await requireDb();
    const user = await requireUser();
    const name = validateOrgName(body.name);
    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim().slice(0, 500)
        : null;
    // Unique slug: base, then base-2..5. IDs stay deterministic per final slug.
    for (let attempt = 0; attempt < 6; attempt++) {
      const slug = attempt === 0 ? slugifyOrgName(name) : `${slugifyOrgName(name)}-${attempt + 1}`;
      const orgId = organizationIdForSlug(slug);
      try {
        await createOrganizationWithOwner({ orgId, orgSlug: slug, orgName: name, userId: user.id, description });
        return NextResponse.json(
          { ok: true, organization: { id: orgId, slug, name, role: "owner" } },
          { status: 201 },
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : "";
        const conflict =
          msg.includes("duplicate key") || msg.includes("unique") || msg.includes("23505");
        if (conflict && attempt < 5) continue; // slug taken (or raced) → next suffix
        throw e;
      }
    }
    return NextResponse.json({ ok: false, error: "could not allocate an organization slug" }, { status: 409 });
  } catch (e) {
    const { error, status } = httpError(e);
    return NextResponse.json({ ok: false, error }, { status });
  }
}
