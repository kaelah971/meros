import { NextResponse } from "next/server";
import { NO_MEMORY_SYSTEM_INSTRUCTION } from "@/lib/chat-memory";
import {
  GeminiNotConfiguredError,
  generateSupportAnswer,
  getPrimaryModel,
  type ChatTurn,
} from "@/lib/gemini";
import { identityError, resolveProductIdentity } from "@/lib/product-identity";

const MAX_HISTORY_TURNS = 12;
const MAX_TEXT_CHARS = 2000;

function cleanTurns(raw: unknown): ChatTurn[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (t): t is { role: string; text: string } =>
        !!t && typeof t === "object" && (t.role === "user" || t.role === "assistant") &&
        typeof t.text === "string" && t.text.trim().length > 0,
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => ({
      role: t.role as "user" | "assistant",
      text: t.text.trim().slice(0, MAX_TEXT_CHARS),
    }));
}

/**
 * Controlled no-memory rerun. Tenant bootstrap is validated to keep the
 * same gate as /api/chat, but this path performs ZERO Walrus calls and
 * derives nothing — a real new Gemini generation with an explicit
 * no-memory system instruction, never a redacted original.
 */
export async function POST(req: Request) {
  let body: { workspaceSlug?: unknown; message?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  // Gate-only check: validates session + workspace without touching Walrus.
  // Anonymous callers get 401; accessCode (if any) is never consulted.
  try {
    await resolveProductIdentity(body);
  } catch (e) {
    const err = identityError(e);
    return NextResponse.json({ ok: false, error: err.message }, { status: err.status });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message)
    return NextResponse.json({ ok: false, error: "message must not be empty" }, { status: 400 });
  if (message.length > 4000)
    return NextResponse.json({ ok: false, error: "message too long (max 4000)" }, { status: 400 });

  const history = cleanTurns(body.history);

  let answer: string;
  try {
    console.log("[compare] baseline start (zero Walrus calls)");
    const t0 = Date.now();
    answer = await generateSupportAnswer({
      systemInstruction: NO_MEMORY_SYSTEM_INSTRUCTION,
      history,
      message,
    });
    console.log(`[compare] baseline ok in ${Date.now() - t0}ms`);
  } catch (e) {
    if (e instanceof GeminiNotConfiguredError) {
      return NextResponse.json(
        { ok: false, error: e.message, needed: ["GEMINI_API_KEY"] },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "baseline generation failed" },
      { status: 502 },
    );
  }

  // Deliberately NO per-memory source list: the baseline consulted nothing.
  return NextResponse.json({
    ok: true,
    answer,
    model: getPrimaryModel(),
    memoryUsed: { private: false, shared: false },
    historyTurns: history.length,
  });
}
