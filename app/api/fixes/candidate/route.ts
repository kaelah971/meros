import { NextResponse } from "next/server";
import { generateJson, GeminiNotConfiguredError, type ChatTurn } from "@/lib/gemini";
import { previewUserId } from "@/lib/identity";
import { identityError, resolveProductIdentity } from "@/lib/product-identity";
import type { AuthenticatedCustomer } from "@/lib/tenant-store";
import {
  formatSharedFix,
  parseSharedFix,
  validateSharedCandidate,
} from "@/lib/support-memory";

const CANDIDATE_SYSTEM = `You EXTRACT one reusable shared fix from a resolved support conversation. Extract — do not invent, improve, expand, or substitute. Return a JSON object {"symptom","cause","resolution"}.
Rules:
- Symptom: the observable problem the user reported (one line).
- Cause: the diagnosed cause in one line. If it was inferred rather than explicitly proven, express the uncertainty inline (e.g. "The CSV likely uses …") — never prefix with "Likely cause:".
- Resolution: ONLY the specific action the user explicitly confirmed as successful, described in their terms. Describe what THEY did — never substitute an alternative technique (no find-and-replace, no text-editor workflows, no alternate troubleshooting paths) unless the user confirmed THAT action worked. Do not "improve" the fix with extra steps.
- Each field 10-400 chars, plain language, no markdown.
- Reusable knowledge ONLY. NEVER include: user names, access codes, namespaces, emails, phones, wallet/account/object IDs, device identifiers, secrets, or unrelated transcript content. Omit private profile details unless strictly necessary for the fix.
- When the user plainly states an action worked (e.g. "I re-exported … and it works now"), that IS an explicitly confirmed successful action even if the wording is casual — extract it, do not return none.
- Only when no concrete user-confirmed successful action actually exists, return {"none": true} — never promote a guess or an unconfirmed assistant suggestion.`;

/**
 * Proposes a sanitized Fix Card AFTER explicit resolution confirmation.
 * Writes NOTHING to Walrus — preview only. The human gate decides next.
 */
export async function POST(req: Request) {
  // NOTE: P7 product flow uses session auth (legacy access-code path is dev-only).
  let body: { workspaceSlug?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  let tenant: AuthenticatedCustomer;
  try {
    tenant = await resolveProductIdentity(body);
  } catch (e) {
    const err = identityError(e);
    return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
  }

  const history: ChatTurn[] = Array.isArray(body.history)
    ? (body.history as ChatTurn[]).filter((t) => t && typeof t.text === "string").slice(-12)
    : [];
  if (history.length === 0) {
    return NextResponse.json({ ok: false, error: "no conversation to summarize" }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await generateJson({
      systemInstruction: CANDIDATE_SYSTEM,
      userText: history
        .map((h) => `${h.role === "assistant" ? "ASSISTANT" : "USER"}: ${h.text.slice(0, 1500)}`)
        .join("\n\n"),
    });
  } catch (e) {
    if (e instanceof GeminiNotConfiguredError) {
      return NextResponse.json({ ok: false, error: e.message }, { status: 503 });
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "candidate generation failed" },
      { status: 502 },
    );
  }

  if (raw && typeof raw === "object" && (raw as { none?: unknown }).none === true) {
    return NextResponse.json({ ok: true, candidate: null, note: "no reusable fix found" });
  }
  if (!raw || typeof raw !== "object") {
    return NextResponse.json({ ok: false, error: "model returned no candidate" }, { status: 502 });
  }
  const { symptom, cause, resolution } = raw as Record<string, unknown>;
  if (
    typeof symptom !== "string" || typeof cause !== "string" || typeof resolution !== "string" ||
    !symptom.trim() || !cause.trim() || !resolution.trim()
  ) {
    return NextResponse.json({ ok: false, error: "model returned an incomplete candidate" }, { status: 502 });
  }

  // Defensive cleanup: the old prompt asked for a "Likely cause:" prefix, which
  // renders as the duplicated "Cause: Likely cause: …". Strip it; inline
  // hedging ("The CSV likely uses …") passes through untouched.
  const cleanCause = cause.replace(/^likely\s+cause\s*:\s*/i, "");
  const text = formatSharedFix({ symptom, cause: cleanCause, resolution });
  // Enforce the same typed shape we will require at promote time.
  if (!parseSharedFix(text)) {
    return NextResponse.json({ ok: false, error: "candidate failed shape check" }, { status: 502 });
  }
  // Deterministic fidelity gate: the Resolution must be grounded in what the
  // USER explicitly confirmed (user turns), not in unconfirmed assistant
  // suggestions. Blocks substituted/alternate fixes before any human sees them.
  const userTexts = history.filter((h) => h.role === "user").map((h) => h.text);
  const allTexts = history.map((h) => h.text);
  const gate = validateSharedCandidate(text, {
    confirmation: userTexts.join("\n"),
    context: allTexts.join("\n"),
  });
  return NextResponse.json({
    ok: true,
    candidate: gate.ok ? text : null,
    blocked: gate.ok ? undefined : gate.error,
    redaction: gate.redaction,
    userPreview: previewUserId(tenant.customerId),
  });
}
