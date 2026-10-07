import { NextResponse } from "next/server";
import { getIdSalt, isNeonConfigured } from "@/lib/env";
import {
  identityFromAccessCode,
  previewUserId,
} from "@/lib/identity";
import {
  ensureUser,
  hashAccessCodeForDb,
  recordMemoryJob,
  updateMemoryJob,
} from "@/lib/db";
import { WalrusNotConfiguredError, rememberPrivate } from "@/lib/walrus";

const P0_TYPES = new Set(["PROFILE", "ISSUE", "ATTEMPT", "RESOLUTION", "NOTE"]);

export async function POST(req: Request) {
  let body: { accessCode?: unknown; text?: unknown; type?: unknown };
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

  const text = typeof body.text === "string" ? body.text.trim() : "";
  if (!text)
    return NextResponse.json({ ok: false, error: "text must not be empty" }, { status: 400 });
  if (text.length > 8000)
    return NextResponse.json({ ok: false, error: "text too long (max 8000)" }, { status: 400 });

  const type =
    typeof body.type === "string" && P0_TYPES.has(body.type.toUpperCase())
      ? body.type.toUpperCase()
      : "PROFILE";
  const tagged = `[${type}] ${text}`;

  // Operational metadata (best-effort when Neon is configured).
  const salt = getIdSalt();
  let jobId: string | null = null;
  if (isNeonConfigured()) {
    try {
      await ensureUser({
        userId: identity.userId,
        accessCodeHash: hashAccessCodeForDb(identity.normalized, salt),
        namespace: identity.namespace,
      });
      jobId = await recordMemoryJob({
        userId: identity.userId,
        namespace: identity.namespace,
        type,
        text: tagged,
        status: "saving",
      });
    } catch (e) {
      // Neon problems must never fake or block the Walrus proof path silently.
      console.error("neon recordMemoryJob failed (non-fatal):", e instanceof Error ? e.message : e);
    }
  }

  try {
    const done = await rememberPrivate(identity.namespace, tagged);
    if (jobId) {
      try {
        await updateMemoryJob(jobId, { status: "stored", blobId: done.blobId });
      } catch (e) {
        console.error("neon updateMemoryJob failed (non-fatal):", e instanceof Error ? e.message : e);
      }
    }
    return NextResponse.json({
      ok: true,
      status: "stored",
      blobId: done.blobId,
      walrusJobId: done.jobId,
      namespace: identity.namespace,
      userPreview: previewUserId(identity.userId),
      persisted: jobId !== null,
      jobId,
    });
  } catch (e) {
    if (e instanceof WalrusNotConfiguredError) {
      if (jobId) {
        try {
          await updateMemoryJob(jobId, { status: "failed", error: "walrus not configured" });
        } catch { /* ignore */ }
      }
      return NextResponse.json(
        {
          ok: false,
          status: "blocked",
          error: e.message,
          needed: e.needed,
          setup: "Add MEMWAL_PRIVATE_KEY (delegate key) + MEMWAL_ACCOUNT_ID to .env.local. See .env.example.",
        },
        { status: 503 },
      );
    }
    const message = e instanceof Error ? e.message : "walrus write failed";
    if (jobId) {
      try {
        await updateMemoryJob(jobId, { status: "failed", error: message.slice(0, 500) });
      } catch { /* ignore */ }
    }
    return NextResponse.json({ ok: false, status: "failed", error: message }, { status: 502 });
  }
}
