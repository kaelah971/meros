import "server-only";
import { GeminiNotConfiguredError, generateJson, type ChatTurn } from "./gemini";
import {
  formatSharedFix,
  parseSharedFix,
  validateSharedCandidate,
} from "./support-memory";

const CANDIDATE_SYSTEM = `You EXTRACT one reusable shared fix from a resolved support conversation. Extract — do not invent, improve, expand, or substitute. Return a JSON object {"symptom","cause","resolution"}.
Rules:
- Symptom: the observable problem the user reported (one line).
- Cause: the diagnosed cause in one line. If it was inferred rather than explicitly proven, express the uncertainty inline (e.g. "The CSV likely uses …") — never prefix with "Likely cause:".
- Resolution: ONLY the specific action the user explicitly confirmed as successful, described in their terms. Describe what THEY did — never substitute an alternative technique (no find-and-replace, no text-editor workflows, no alternate troubleshooting paths) unless the user confirmed THAT action worked. Do not "improve" the fix with extra steps.
- Each field 10-400 chars, plain language, no markdown.
- Reusable knowledge ONLY. NEVER include: user names, access codes, namespaces, emails, phones, wallet/account/object IDs, device identifiers, secrets, or unrelated transcript content. Omit private profile details unless strictly necessary for the fix.
- When the user plainly states an action worked (e.g. "I re-exported … and it works now"), that IS an explicitly confirmed successful action even if the wording is casual — extract it, do not return none.
- Only when no concrete user-confirmed successful action actually exists, return {"none": true} — never promote a guess or an unconfirmed assistant suggestion.`;

export type FixCandidateResult =
  | { status: "ready"; text: string }
  | { status: "none" }
  | { status: "error"; error: string };

/**
 * Generate + validate a sanitized shared-fix candidate from a resolved
 * transcript. Writes NOTHING anywhere. Callers decide persistence.
 * Failures are returned, never thrown (except Gemini config errors, which
 * propagate so callers can surface 503 honestly).
 */
export async function generateFixCandidate(transcript: ChatTurn[]): Promise<FixCandidateResult> {
  const history = transcript.filter((t) => t && typeof t.text === "string").slice(-12);
  if (history.length === 0) return { status: "error", error: "no conversation to summarize" };
  let raw: unknown;
  try {
    raw = await generateJson({
      systemInstruction: CANDIDATE_SYSTEM,
      userText: history
        .map((h) => `${h.role === "assistant" ? "ASSISTANT" : "USER"}: ${h.text.slice(0, 1500)}`)
        .join("\n\n"),
    });
  } catch (e) {
    // Config errors (missing key) propagate for honest 503s; model/runtime
    // failures become a non-fatal error result.
    if (e instanceof GeminiNotConfiguredError) throw e;
    return { status: "error", error: e instanceof Error ? e.message : "candidate generation failed" };
  }

  if (raw && typeof raw === "object" && (raw as { none?: unknown }).none === true) {
    return { status: "none" };
  }
  if (!raw || typeof raw !== "object") {
    return { status: "error", error: "model returned no candidate" };
  }
  const { symptom, cause, resolution } = raw as Record<string, unknown>;
  if (
    typeof symptom !== "string" || typeof cause !== "string" || typeof resolution !== "string" ||
    !symptom.trim() || !cause.trim() || !resolution.trim()
  ) {
    return { status: "error", error: "model returned an incomplete candidate" };
  }

  // Defensive cleanup: the old prompt asked for a "Likely cause:" prefix, which
  // renders as the duplicated "Cause: Likely cause: …". Strip it; inline
  // hedging ("The CSV likely uses …") passes through untouched.
  const cleanCause = cause.replace(/^likely\s+cause\s*:\s*/i, "");
  const text = formatSharedFix({ symptom, cause: cleanCause, resolution });
  if (!parseSharedFix(text)) {
    return { status: "error", error: "candidate failed shape check" };
  }
  const userTexts = history.filter((h) => h.role === "user").map((h) => h.text);
  const allTexts = history.map((h) => h.text);
  const gate = validateSharedCandidate(text, {
    confirmation: userTexts.join("\n"),
    context: allTexts.join("\n"),
  });
  if (!gate.ok) return { status: "error", error: gate.error ?? "candidate rejected" };
  return { status: "ready", text };
}
