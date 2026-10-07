import "server-only";
import { isNeonConfigured } from "./env";

// Neon is operational metadata only (users, sessions, pending jobs, blob refs).
// It is NEVER the durable memory store — Walrus is.

type NeonClient = <T = Record<string, unknown>[]>(
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<T>;

let cached: NeonClient | null | undefined;

async function getSql(): Promise<NeonClient | null> {
  if (cached !== undefined) return cached;
  if (!isNeonConfigured()) {
    cached = null;
    return null;
  }
  const { neon } = await import("@neondatabase/serverless");
  cached = neon(process.env.DATABASE_URL!.trim()) as unknown as NeonClient;
  return cached;
}

export async function dbAvailable(): Promise<boolean> {
  return (await getSql()) !== null;
}

export type MemoryJobStatus = "pending" | "saving" | "stored" | "failed";

export async function recordMemoryJob(input: {
  userId: string;
  namespace: string;
  type: string;
  text: string;
  status: MemoryJobStatus;
}): Promise<string | null> {
  const sql = await getSql();
  if (!sql) return null;
  const rows = (await sql`
    insert into memory_jobs (user_id, namespace, type, text, status)
    values (${input.userId}, ${input.namespace}, ${input.type}, ${input.text}, ${input.status})
    returning id
  `) as unknown as { id: string }[];
  return rows[0]?.id ?? null;
}

export async function updateMemoryJob(
  id: string,
  patch: { status: MemoryJobStatus; blobId?: string | null; error?: string | null },
): Promise<void> {
  const sql = await getSql();
  if (!sql) return;
  await sql`
    update memory_jobs
    set status = ${patch.status},
        blob_id = coalesce(${patch.blobId ?? null}, blob_id),
        error = ${patch.error ?? null}
    where id = ${id}
  `;
}

export async function ensureUser(input: {
  userId: string;
  accessCodeHash: string;
  namespace: string;
}): Promise<void> {
  const sql = await getSql();
  if (!sql) return;
  await sql`
    insert into users (id, access_code_hash, namespace)
    values (${input.userId}, ${input.accessCodeHash}, ${input.namespace})
    on conflict (id) do update set namespace = excluded.namespace
  `;
}

export function hashAccessCodeForDb(normalizedCode: string, salt: string): string {
  // Separate DB-level hash; the raw code is never stored.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  return createHash("sha256").update(`db:${salt}:${normalizedCode}`, "utf8").digest("hex");
}
