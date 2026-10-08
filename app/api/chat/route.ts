import { NextResponse } from "next/server";
import {
  MAX_DISTANCE,
  RECALL_TOP_K,
  buildSystemInstruction,
  normalizeMemories,
  type MemoryItem,
} from "@/lib/chat-memory";
import { GeminiNotConfiguredError, generateSupportAnswer, type ChatTurn } from "@/lib/gemini";
import { identityFromAccessCode, previewUserId } from "@/lib/identity";
import { buildRecallQuery, detectResolution } from "@/lib/support-memory";
import { CHAT_RECALL_TIMEOUT_MS, SHARED_FIXES_NAMESPACE, recallBounded } from "@/lib/walrus";
import { isWalrusConfigured, walrusBlocker } from "@/lib/env";

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

export type ProvenanceItem = {
  plane: "private" | "shared";
  text: string;
  blobId: string;
  distance: number;
};

export async function POST(req: Request) {
  let body: { accessCode?: unknown; message?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid JSON body" }, { status: 400 });
  }

  // Server derives identity + both namespaces. Client supplies none of these.
  let identity: ReturnType<typeof identityFromAccessCode>;
  try {
    identity = identityFromAccessCode(body.accessCode);
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "bad accessCode" },
      { status: 400 },
    );
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message)
    return NextResponse.json({ ok: false, error: "message must not be empty" }, { status: 400 });
  if (message.length > 4000)
    return NextResponse.json({ ok: false, error: "message too long (max 4000)" }, { status: 400 });

  const history = cleanTurns(body.history);

  // Compact retrieval query: symptom/error/product substance, filler removed.
  const recallQuery = buildRecallQuery(message, history);

  // Dual-plane recall, each plane independently bounded. One stalled plane
  // can never hang the answer: we degrade with whatever actually returned.
  // (No namespaces, codes, or secrets are ever logged — plane + ms only.)
  if (!isWalrusConfigured()) {
    const blocker = walrusBlocker();
    return NextResponse.json(
      { ok: false, error: blocker.reason, needed: blocker.needed },
      { status: 503 },
    );
  }
  console.log(`[chat] recall start (timeout ${CHAT_RECALL_TIMEOUT_MS}ms/plane)`);
  const [p, s] = await Promise.all([
    recallBounded(identity.namespace, recallQuery, { topK: RECALL_TOP_K, maxDistance: MAX_DISTANCE })
      .then((r) => {
        console.log(`[chat] recall private ${r.status} in ${r.durationMs}ms (${r.total} hits)`);
        return r;
      }),
    recallBounded(SHARED_FIXES_NAMESPACE, recallQuery, { topK: RECALL_TOP_K, maxDistance: MAX_DISTANCE })
      .then((r) => {
        console.log(`[chat] recall shared ${r.status} in ${r.durationMs}ms (${r.total} hits)`);
        return r;
      }),
  ]);
  const privateHits = p.results;
  const sharedHits = s.results;
  const memoryStatus = { private: p.status, shared: s.status } as const;
  const degradedMemory = p.status !== "ok" || s.status !== "ok";
  if (degradedMemory) {
    console.log(`[chat] recall degraded (private=${p.status} shared=${s.status}) — answering with available context`);
  }

  const used: MemoryItem[] = normalizeMemories(privateHits, sharedHits);

  let answer: string;
  try {
    console.log(`[chat] gemini start (${used.length} memories injected)`);
    const tGemini = Date.now();
    answer = await generateSupportAnswer({
      systemInstruction: buildSystemInstruction(used),
      history,
      message,
    });
    console.log(`[chat] gemini ok in ${Date.now() - tGemini}ms`);
  } catch (e) {
    if (e instanceof GeminiNotConfiguredError) {
      return NextResponse.json(
        { ok: false, error: e.message, needed: ["GEMINI_API_KEY"] },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "answer generation failed" },
      { status: 502 },
    );
  }

  // Provenance comes ONLY from memories actually injected into the model.
  const provenance: ProvenanceItem[] = used.map((m) => ({
    plane: m.plane,
    text: m.text,
    blobId: m.blobId,
    distance: m.distance,
  }));

  console.log(`[chat] done (private=${p.status} shared=${s.status} provenance=${provenance.length})`);
  return NextResponse.json({
    ok: true,
    answer,
    resolutionDetected: detectResolution(message),
    memoryStatus,
    degradedMemory,
    userPreview: previewUserId(identity.userId),
    memoryUsed: {
      private: used.some((m) => m.plane === "private"),
      shared: used.some((m) => m.plane === "shared"),
    },
    provenance,
    historyTurns: history.length,
  });
}
