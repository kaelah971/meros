import { NextResponse } from "next/server";
import { requireDb, requireUser } from "@/lib/auth";
import {
  createKnowledgeSource,
  deleteKnowledgeSource,
  getKnowledgeSource,
  getOwnedWorkspace,
  listKnowledgeSources,
  replaceKnowledgeChunks,
  updateKnowledgeSource,
} from "@/lib/db";
import { deriveKnowledgeNamespaceV2 } from "@/lib/tenant";
import {
  KNOWLEDGE_TYPES,
  capCanonical,
  chunkText,
  importWebsite,
  validatePublicUrl,
  type KnowledgeType,
} from "@/lib/knowledge";
import { WalrusNotConfiguredError, rememberPrivate } from "@/lib/walrus";

function err(e: unknown, fallback: string, status = 500) {
  const s =
    e instanceof Error && typeof (e as Error & { status?: unknown }).status === "number"
      ? ((e as Error & { status?: number }).status as number)
      : status;
  return NextResponse.json(
    { ok: false, error: e instanceof Error ? e.message : fallback },
    { status: s },
  );
}

async function ownedWorkspace(userId: string, slug: string) {
  const ws = await getOwnedWorkspace(userId, slug);
  return ws;
}

/** List knowledge sources (metadata only — canonical text stays queryable per source). */
export async function GET(_req: Request, ctx: { params: Promise<{ slug: string }> }) {
  try {
    await requireDb();
    const user = await requireUser();
    const { slug } = await ctx.params;
    const ws = await ownedWorkspace(user.id, slug);
    if (!ws) return NextResponse.json({ ok: false, error: "workspace not found" }, { status: 404 });
    const rows = await listKnowledgeSources(ws.id);
    return NextResponse.json({
      ok: true,
      sources: rows.map((r) => ({
        id: r.id,
        type: r.type,
        title: r.title,
        sourceUrl: r.source_url,
        status: r.status,
        updatedAt: r.updated_at,
        contentChars: r.canonical_content.length,
      })),
    });
  } catch (e) {
    return err(e, "request failed");
  }
}

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().replace(/\s+/g, " ");
  if (!t) return null;
  return t.slice(0, max);
}

/**
 * Index canonical text into the workspace knowledge namespace, chunk by
 * chunk, awaiting real Walrus completion per chunk. Returns only after
 * every chunk resolves: status is ready iff ALL chunks stored, failed
 * otherwise. Never reports ready early.
 */
async function indexSource(
  namespace: string,
  knowledgeId: string,
  workspaceId: string,
  canonical: string,
): Promise<{ ok: boolean; blobs: (string | null)[]; error?: string }> {
  const chunks = chunkText(canonical).slice(0, 20);
  const blobs: (string | null)[] = [];
  for (let i = 0; i < chunks.length; i++) {
    try {
      const done = await rememberPrivate(namespace, `[KNOWLEDGE] ${chunks[i]}`, {
        timeoutMs: 120_000,
      });
      blobs.push(done.blobId);
    } catch (e) {
      return {
        ok: false,
        blobs,
        error: e instanceof Error ? e.message : "walrus write failed",
      };
    }
  }
  await replaceKnowledgeChunks({
    knowledgeId,
    workspaceId,
    chunks: chunks.map((content, i) => ({ content, position: i, blobId: blobs[i] ?? null })),
  });
  return { ok: true, blobs };
}

/**
 * Create a knowledge source. Manual: {type, title, content}.
 * Website/documentation: {type, title?, url} — imports, then indexes.
 * URL failures return 502 with the source left failed (onboarding continues
 * with manual knowledge). No invented facts: only imported/manual text.
 */
export async function POST(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  let body: { type?: unknown; title?: unknown; content?: unknown; url?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }
  try {
    await requireDb();
    const user = await requireUser();
    const { slug } = await ctx.params;
    const ws = await ownedWorkspace(user.id, slug);
    if (!ws) return NextResponse.json({ ok: false, error: "workspace not found" }, { status: 404 });

    const type = typeof body.type === "string" ? body.type : "manual";
    if (!(KNOWLEDGE_TYPES as readonly string[]).includes(type)) {
      return NextResponse.json({ ok: false, error: "unknown knowledge type" }, { status: 400 });
    }
    const namespace = deriveKnowledgeNamespaceV2(ws.id);

    let title = str(body.title, 160);
    let canonical: string;
    let sourceUrl: string | null = null;

    if (type === "manual" || type === "faq" || type === "policy") {
      const content = str(body.content, 100_000);
      if (!content || content.length < 20) {
        return NextResponse.json(
          { ok: false, error: "content must be at least 20 characters" },
          { status: 400 },
        );
      }
      canonical = capCanonical(content).text;
      title = title ?? `${type[0].toUpperCase()}${type.slice(1)} notes`;
    } else {
      // website | documentation: import first, fail honestly on walls.
      const rawUrl = typeof body.url === "string" ? body.url : "";
      try {
        validatePublicUrl(rawUrl);
      } catch (e) {
        return NextResponse.json(
          { ok: false, error: e instanceof Error ? e.message : "invalid URL" },
          { status: 400 },
        );
      }
      sourceUrl = rawUrl.trim();
      let pages;
      try {
        pages = await importWebsite(sourceUrl);
      } catch (e) {
        const failed = await createKnowledgeSource({
          workspaceId: ws.id,
          type: type as KnowledgeType,
          title: title ?? sourceUrl,
          sourceUrl,
          canonicalContent: "",
        });
        await updateKnowledgeSource(failed.id, ws.id, { status: "failed" });
        return NextResponse.json(
          { ok: false, error: e instanceof Error ? e.message : "import failed", sourceId: failed.id },
          { status: 502 },
        );
      }
      const combined = pages.pages.map((p) => `Source: ${p.url}\n\n${p.text}`).join("\n\n---\n\n");
      canonical = capCanonical(combined).text;
      title = title ?? pages.pages[0].url;
    }

    const row = await createKnowledgeSource({
      workspaceId: ws.id,
      type: type as KnowledgeType,
      title: title!,
      sourceUrl,
      canonicalContent: canonical,
    });
    try {
      const indexed = await indexSource(namespace, row.id, ws.id, canonical);
      await updateKnowledgeSource(row.id, ws.id, { status: indexed.ok ? "ready" : "failed" });
      if (!indexed.ok) {
        return NextResponse.json(
          { ok: false, error: indexed.error ?? "indexing failed", sourceId: row.id },
          { status: 502 },
        );
      }
    } catch (e) {
      if (e instanceof WalrusNotConfiguredError) {
        await updateKnowledgeSource(row.id, ws.id, { status: "failed" });
        return NextResponse.json({ ok: false, error: e.message, sourceId: row.id }, { status: 503 });
      }
      await updateKnowledgeSource(row.id, ws.id, { status: "failed" });
      return NextResponse.json(
        { ok: false, error: e instanceof Error ? e.message : "indexing failed", sourceId: row.id },
        { status: 502 },
      );
    }
    return NextResponse.json(
      { ok: true, source: { id: row.id, type, title, sourceUrl, status: "ready" } },
      { status: 201 },
    );
  } catch (e) {
    return err(e, "request failed");
  }
}

/** Update canonical text (re-indexes) or delete a source. Metadata only. */
export async function PATCH(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  let body: { id?: unknown; title?: unknown; content?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }
  try {
    await requireDb();
    const user = await requireUser();
    const { slug } = await ctx.params;
    const ws = await ownedWorkspace(user.id, slug);
    if (!ws) return NextResponse.json({ ok: false, error: "workspace not found" }, { status: 404 });
    if (typeof body.id !== "string") {
      return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    }
    const existing = await getKnowledgeSource(body.id, ws.id);
    if (!existing) return NextResponse.json({ ok: false, error: "source not found" }, { status: 404 });
    const content = str(body.content, 100_000);
    const title = str(body.title, 160);
    if ((content && content.length < 20) || (!content && !title)) {
      return NextResponse.json({ ok: false, error: "nothing valid to update" }, { status: 400 });
    }
    const canonical = content ? capCanonical(content).text : existing.canonical_content;
    await updateKnowledgeSource(existing.id, ws.id, {
      ...(title ? { title } : {}),
      ...(content ? { canonicalContent: canonical, status: "pending" as const } : {}),
    });
    if (content) {
      const namespace = deriveKnowledgeNamespaceV2(ws.id);
      try {
        const indexed = await indexSource(namespace, existing.id, ws.id, canonical);
        await updateKnowledgeSource(existing.id, ws.id, { status: indexed.ok ? "ready" : "failed" });
        if (!indexed.ok) {
          return NextResponse.json(
            { ok: false, error: indexed.error ?? "indexing failed", sourceId: existing.id },
            { status: 502 },
          );
        }
      } catch (e) {
        await updateKnowledgeSource(existing.id, ws.id, { status: "failed" });
        return NextResponse.json(
          { ok: false, error: e instanceof Error ? e.message : "indexing failed", sourceId: existing.id },
          { status: 502 },
        );
      }
    }
    const row = await getKnowledgeSource(existing.id, ws.id);
    return NextResponse.json({ ok: true, source: { id: row!.id, status: row!.status } });
  } catch (e) {
    return err(e, "request failed");
  }
}

export async function DELETE(req: Request, ctx: { params: Promise<{ slug: string }> }) {
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  try {
    await requireDb();
    const user = await requireUser();
    const { slug } = await ctx.params;
    const ws = await ownedWorkspace(user.id, slug);
    if (!ws) return NextResponse.json({ ok: false, error: "workspace not found" }, { status: 404 });
    if (!id) return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    const gone = await deleteKnowledgeSource(id, ws.id);
    if (!gone) return NextResponse.json({ ok: false, error: "source not found" }, { status: 404 });
    return NextResponse.json({ ok: true, deleted: id });
  } catch (e) {
    return err(e, "request failed");
  }
}
