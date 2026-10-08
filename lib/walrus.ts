import "server-only";
import { MemWal } from "@mysten-incubation/memwal";
import { settleWithTimeout } from "./retry";
import {
  getMemwalAccountId,
  getMemwalPrivateKey,
  getMemwalServerUrl,
  isWalrusConfigured,
  walrusBlocker,
} from "./env";

export class WalrusNotConfiguredError extends Error {
  needed: string[];
  constructor() {
    const b = walrusBlocker();
    super(b.reason);
    this.name = "WalrusNotConfiguredError";
    this.needed = b.needed;
  }
}

let singleton: MemWal | null = null;

function getClient(): MemWal {
  if (singleton) return singleton;
  if (!isWalrusConfigured()) throw new WalrusNotConfiguredError();
  singleton = MemWal.create({
    key: getMemwalPrivateKey()!,
    accountId: getMemwalAccountId()!,
    serverUrl: getMemwalServerUrl(),
  });
  return singleton;
}

export type RememberDone = {
  blobId: string;
  jobId: string;
  namespace: string;
  owner: string;
};

export type RecallHit = {
  text: string;
  distance: number;
  blobId: string;
  createdAt?: string;
};

/**
 * Write one memory into the caller's private namespace and WAIT for Walrus
 * completion. Never fire-and-forget. Throws honestly on failure.
 */
export async function rememberPrivate(
  namespace: string,
  text: string,
  opts?: { timeoutMs?: number },
): Promise<RememberDone> {
  const client = getClient();
  const clean = text.trim();
  if (!clean) throw new Error("memory text must not be empty");
  if (clean.length > 8000) throw new Error("memory text too long (max 8000 chars)");
  const result = await client.rememberAndWait(clean, namespace, {
    timeoutMs: opts?.timeoutMs ?? 120_000,
    pollIntervalMs: 1_500,
  });
  if (!result.blob_id) throw new Error("Walrus write completed without a blob_id");
  return {
    blobId: result.blob_id,
    jobId: result.job_id ?? result.id,
    namespace: result.namespace || namespace,
    owner: result.owner,
  };
}

/**
 * V1 LEGACY global shared namespace (`meros:shared:fixes`).
 * Used ONLY by the /dev diagnostic + legacy memory/* routes (P0 proof).
 * V2 workspace chat MUST NEVER import this — one org's fix leaking into
 * another's would be a tenant breach. See lib/tenant.ts for v2.
 */
export const SHARED_FIXES_NAMESPACE = "meros:shared:fixes";

/**
 * Semantic recall scoped to the caller's private namespace only.
 * No LLM involved — this proves Walrus itself works.
 */
export async function recallPrivate(
  namespace: string,
  query: string,
  opts?: { topK?: number; maxDistance?: number },
): Promise<{ results: RecallHit[]; total: number }> {
  const client = getClient();
  const clean = query.trim();
  if (!clean) throw new Error("query must not be empty");
  const topK = Math.min(Math.max(opts?.topK ?? 5, 1), 20);
  const result = await client.recall({
    query: clean,
    topK,
    namespace,
    ...(opts?.maxDistance !== undefined ? { maxDistance: opts.maxDistance } : {}),
  });
  return {
    total: result.total,
    results: result.results.map((r) => ({
      text: r.text,
      distance: r.distance,
      blobId: r.blob_id,
      ...(r.created_at ? { createdAt: r.created_at } : {}),
    })),
  };
}

/**
 * V1 LEGACY global shared recall. /dev + legacy memory/* routes only.
 * V2 chat uses recallBounded() with a tenant-derived namespace instead.
 */
export async function recallShared(
  query: string,
  opts?: { topK?: number; maxDistance?: number },
): Promise<{ results: RecallHit[]; total: number }> {
  return recallPrivate(SHARED_FIXES_NAMESPACE, query, opts);
}

/** Per-plane wall-clock budget for chat UX. The P0 write path is untouched. */
export const CHAT_RECALL_TIMEOUT_MS = 10_000;

export type PlaneStatus = "ok" | "timeout" | "error";

export type BoundedRecall = {
  status: PlaneStatus;
  results: RecallHit[];
  total: number;
  durationMs: number;
};

/**
 * Bounded recall for the chat loop: one plane, one deadline. A stalled
 * Walrus/SDK operation (e.g. a hung SEAL session build or Sui RPC inside
 * the SDK) becomes a "timeout" verdict instead of hanging /api/chat.
 * Never throws — callers degrade with whatever planes succeeded.
 */
export async function recallBounded(
  namespace: string,
  query: string,
  opts?: { topK?: number; maxDistance?: number; timeoutMs?: number },
): Promise<BoundedRecall> {
  const started = Date.now();
  const settled = await settleWithTimeout(
    recallPrivate(namespace, query, opts),
    opts?.timeoutMs ?? CHAT_RECALL_TIMEOUT_MS,
  );
  const durationMs = Date.now() - started;
  if (settled.status === "ok") {
    return { status: "ok", results: settled.value.results, total: settled.value.total, durationMs };
  }
  return { status: settled.status, results: [], total: 0, durationMs };
}

/**
 * Write text into an EXPLICIT server-derived namespace and wait for Walrus
 * completion. All v2 tenant writes go through here; callers pass the
 * namespace from resolveTenant() — never from the client.
 */
export async function rememberInNamespace(
  namespace: string,
  text: string,
  maxChars = 8000,
): Promise<RememberDone> {
  const client = getClient();
  const clean = text.trim();
  if (!clean) throw new Error("memory text must not be empty");
  if (clean.length > maxChars) throw new Error(`memory text too long (max ${maxChars})`);
  const result = await client.rememberAndWait(clean, namespace, {
    timeoutMs: 120_000,
    pollIntervalMs: 1_500,
  });
  if (!result.blob_id) throw new Error("Walrus write completed without a blob_id");
  return {
    blobId: result.blob_id,
    jobId: result.job_id ?? result.id,
    namespace: result.namespace || namespace,
    owner: result.owner,
  };
}

/**
 * V1 LEGACY global shared write. Legacy promote path only — v2 promotion
 * calls rememberInNamespace() with the CURRENT workspace's shared namespace.
 */
export async function rememberShared(text: string): Promise<RememberDone> {
  if (!text.trim()) throw new Error("shared fix text must not be empty");
  return rememberInNamespace(SHARED_FIXES_NAMESPACE, text, 2000);
}
