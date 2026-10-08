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
import { WalrusNotConfiguredError, recallPrivate, recallShared } from "@/lib/walrus";

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

  // Dual-plane recall in parallel. Shared-empty is a normal success path.
  let privateHits: Awaited<ReturnType<typeof recallPrivate>>["results"] = [];
  let sharedHits: typeof privateHits = [];
  try {
    const [p, s] = await Promise.all([
      recallPrivate(identity.namespace, message, { topK: RECALL_TOP_K, maxDistance: MAX_DISTANCE }),
      recallShared(message, { topK: RECALL_TOP_K, maxDistance: MAX_DISTANCE }),
    ]);
    privateHits = p.results;
    sharedHits = s.results;
  } catch (e) {
    if (e instanceof WalrusNotConfiguredError) {
      return NextResponse.json(
        { ok: false, error: e.message, needed: e.needed },
        { status: 503 },
      );
    }
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "memory recall failed" },
      { status: 502 },
    );
  }

  const used: MemoryItem[] = normalizeMemories(privateHits, sharedHits);

  let answer: string;
  try {
    answer = await generateSupportAnswer({
      systemInstruction: buildSystemInstruction(used),
      history,
      message,
    });
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

  return NextResponse.json({
    ok: true,
    answer,
    userPreview: previewUserId(identity.userId),
    memoryUsed: {
      private: used.some((m) => m.plane === "private"),
      shared: used.some((m) => m.plane === "shared"),
    },
    provenance,
    historyTurns: history.length,
  });
}
