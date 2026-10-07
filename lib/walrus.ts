import "server-only";
import { MemWal } from "@mysten-incubation/memwal";
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
