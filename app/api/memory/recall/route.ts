import { NextResponse } from "next/server";
import { isLegacyDevIdentityEnabled } from "@/lib/env";
import { identityFromAccessCode, previewUserId } from "@/lib/identity";
import { WalrusNotConfiguredError, recallPrivate } from "@/lib/walrus";

export async function POST(req: Request) {
  // DEV-ONLY legacy endpoint: raw accessCode in, v1 Walrus namespace out.
  // Never available in production, regardless of client input.
  if (!isLegacyDevIdentityEnabled()) {
    return NextResponse.json(
      { ok: false, error: "legacy dev identity is disabled" },
      { status: 403 },
    );
  }
  let body: { accessCode?: unknown; query?: unknown; topK?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  let identity: ReturnType<typeof identityFromAccessCode>;
  try {
    identity = identityFromAccessCode(body.accessCode);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "bad accessCode" },
      { status: 400 },
    );
  }

  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query)
    return NextResponse.json({ ok: false, error: "query must not be empty" }, { status: 400 });

  const topK =
    typeof body.topK === "number" && Number.isFinite(body.topK)
      ? Math.min(Math.max(Math.round(body.topK), 1), 20)
      : 5;

  try {
    const { results, total } = await recallPrivate(identity.namespace, query, { topK });
    return NextResponse.json({
      ok: true,
      namespace: identity.namespace,
      userPreview: previewUserId(identity.userId),
      query,
      total,
      results: results.map((r) => ({
        text: r.text,
        distance: r.distance,
        blobId: r.blobId,
        ...(r.createdAt ? { createdAt: r.createdAt } : {}),
      })),
    });
  } catch (e) {
    if (e instanceof WalrusNotConfiguredError) {
      return NextResponse.json(
        {
          ok: false,
          error: e.message,
          needed: e.needed,
          setup: "Add MEMWAL_PRIVATE_KEY (delegate key) + MEMWAL_ACCOUNT_ID to .env.local. See .env.example.",
        },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "recall failed" },
      { status: 502 },
    );
  }
}
