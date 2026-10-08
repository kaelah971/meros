import { NextResponse } from "next/server";
import { generateJson, GeminiNotConfiguredError } from "@/lib/gemini";
import { previewUserId } from "@/lib/identity";
import { identityError, resolveProductIdentity } from "@/lib/product-identity";
import type { AuthenticatedCustomer } from "@/lib/tenant-store";
import type { ChatTurn } from "@/lib/gemini";
import {
  dropKnownFacts,
  validateExtractedFacts,
  type ExtractedFact,
} from "@/lib/support-memory";
import { WalrusNotConfiguredError, rememberPrivate } from "@/lib/walrus";

const EXTRACTION_SYSTEM = `You extract durable support-memory facts from one support turn. Return a JSON array (max 3 items) of {"type","text"}.
Types: PROFILE (stable user environment/preference), ISSUE (problem symptom), ATTEMPT (troubleshooting step tried + outcome), RESOLUTION (confirmed fix), CORRECTION (new fact superseding older info).
Rules:
- Only high-confidence facts explicitly stated by the USER or clearly observed in the turn. Never assistant guesses, never generic advice.
- "text" is a compact standalone fact (10-500 chars), no [TYPE] prefix, no names/emails/secrets.
- Skip anything already listed under ALREADY KNOWN.
- If nothing durable, return [].`;

export type CaptureResult = {
  type: string;
  text: string;
  status: "stored" | "failed" | "skipped";
  blobId?: string;
  error?: string;
};

/**
 * Explicit, high-confidence capture only. The chat UI calls this AFTER
 * rendering the answer (non-blocking for chat latency); this endpoint still
 * awaits real Walrus completion per fact and reports honest per-fact status.
 */
export async function POST(req: Request) {
  let body: {
    workspaceSlug?: unknown;
    message?: unknown;
    answer?: unknown;
    history?: unknown;
    knownTexts?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  // Facts land in the CURRENT workspace/customer scope only.
  let tenant: AuthenticatedCustomer;
  try {
    tenant = await resolveProductIdentity(body);
  } catch (e) {
    const err = identityError(e);
    return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";
  if (!message || message.length < 12) {
    return NextResponse.json({ ok: true, facts: [], note: "turn too short to capture" });
  }
  const history: ChatTurn[] = Array.isArray(body.history)
    ? (body.history as ChatTurn[]).filter((t) => t && typeof t.text === "string").slice(-4)
    : [];
  const knownTexts = Array.isArray(body.knownTexts)
    ? (body.knownTexts as unknown[]).filter((t): t is string => typeof t === "string")
    : [];

  let raw: unknown;
  try {
    raw = await generateJson({
      systemInstruction: EXTRACTION_SYSTEM,
      userText: [
        `ALREADY KNOWN:\n${knownTexts.slice(0, 8).join("\n") || "(none)"}`,
        `USER: ${message.slice(0, 2000)}`,
        `ASSISTANT: ${answer.slice(0, 2000)}`,
        history.length > 0
          ? `RECENT: ${history.map((h) => `${h.role}: ${h.text.slice(0, 500)}`).join("\n")}`
          : "",
      ].join("\n\n"),
    });
  } catch (e) {
    if (e instanceof GeminiNotConfiguredError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 503 });
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "extraction failed" },
      { status: 502 },
    );
  }

  const facts: ExtractedFact[] = dropKnownFacts(validateExtractedFacts(raw), knownTexts);
  if (facts.length === 0) {
    return NextResponse.json({
      ok: true,
      facts: [],
      userPreview: previewUserId(tenant.customerId),
    });
  }

  const results: CaptureResult[] = [];
  try {
    for (const f of facts) {
      try {
        const done = await rememberPrivate(tenant.privateNamespace, f.text);
        results.push({ type: f.type, text: f.text, status: "stored", blobId: done.blobId });
      } catch (e) {
        results.push({
          type: f.type,
          text: f.text,
          status: "failed",
          error: e instanceof Error ? e.message : "walrus write failed",
        });
      }
    }
  } catch (e) {
    if (e instanceof WalrusNotConfiguredError) {
      return NextResponse.json(
        { ok: false, error: e.message, needed: e.needed },
        { status: 503 },
      );
    }
    throw e;
  }

  return NextResponse.json({
    ok: true,
    facts: results,
    userPreview: previewUserId(tenant.customerId),
    workspace: tenant.workspace,
  });
}
