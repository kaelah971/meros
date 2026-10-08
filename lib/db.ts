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

// NOTE: legacy custom-auth tables platform_users / owner_sessions are RETAINED
// in the database but are NOT runtime auth sources. Owner authentication is
// Better Auth (user/session/account tables); the functions below that read
// the legacy tables were removed with that migration.

export type MemberRow = { organization_id: string; user_id: string; role: string };

export async function addOrganizationMember(input: {
  organizationId: string;
  userId: string;
  role?: string;
}): Promise<void> {
  const sql = await getSql();
  if (!sql) throw new Error("database unavailable");
  await sql`
    insert into organization_members (organization_id, user_id, role)
    values (${input.organizationId}, ${input.userId}, ${input.role ?? "owner"})
    on conflict (organization_id, user_id) do nothing
  `;
}

export async function getUserMemberships(userId: string): Promise<
  { organization_id: string; slug: string; name: string; role: string }[]
> {
  const sql = await getSql();
  if (!sql) return [];
  return (await sql`
    select m.organization_id, o.slug, o.name, m.role
    from organization_members m join organizations o on o.id = m.organization_id
    where m.user_id = ${userId} order by o.created_at
  `) as unknown as { organization_id: string; slug: string; name: string; role: string }[];
}

export async function getMembership(
  userId: string,
  organizationId: string,
): Promise<MemberRow | null> {
  const sql = await getSql();
  if (!sql) return null;
  const rows = (await sql`
    select organization_id, user_id, role from organization_members
    where user_id = ${userId} and organization_id = ${organizationId} limit 1
  `) as unknown as MemberRow[];
  return rows[0] ?? null;
}

export type OwnedWorkspaceRow = WorkspaceRow & { role: string; organization_name: string };

/** Workspaces of an org, ONLY when userId is a member (ownership enforced in SQL). */
export async function getOwnedWorkspaces(
  userId: string,
  organizationId: string,
): Promise<OwnedWorkspaceRow[] | null> {
  const sql = await getSql();
  if (!sql) return null;
  const rows = (await sql`
    select w.id, w.organization_id, w.slug, w.name, w.product_name,
           w.product_description, w.support_context, m.role, o.name as organization_name
    from workspaces w
    join organization_members m on m.organization_id = w.organization_id
    join organizations o on o.id = w.organization_id
    where m.user_id = ${userId} and w.organization_id = ${organizationId}
    order by w.created_at
  `) as unknown as OwnedWorkspaceRow[];
  return rows.length > 0 ? rows : null; // null = no membership (not "empty org")
}

export async function getOwnedWorkspace(
  userId: string,
  slug: string,
): Promise<OwnedWorkspaceRow | null> {
  const sql = await getSql();
  if (!sql) return null;
  const rows = (await sql`
    select w.id, w.organization_id, w.slug, w.name, w.product_name,
           w.product_description, w.support_context, m.role, o.name as organization_name
    from workspaces w
    join organization_members m on m.organization_id = w.organization_id
    join organizations o on o.id = w.organization_id
    where m.user_id = ${userId} and w.slug = ${slug} limit 1
  `) as unknown as OwnedWorkspaceRow[];
  return rows[0] ?? null;
}

export async function createOrganizationWithOwner(input: {
  orgId: string;
  orgSlug: string;
  orgName: string;
  userId: string;
}): Promise<void> {
  const sql = await getSql();
  if (!sql) throw new Error("database unavailable");
  // Best-effort sequential (neon-http has no multi-statement transactions);
  // every step is idempotent so a retry after a partial failure is safe.
  await sql`
    insert into organizations (id, slug, name)
    values (${input.orgId}, ${input.orgSlug}, ${input.orgName})
    on conflict (id) do nothing
  `;
  await sql`
    insert into organization_members (organization_id, user_id, role)
    values (${input.orgId}, ${input.userId}, 'owner')
    on conflict (organization_id, user_id) do nothing
  `;
}

export async function createWorkspaceRecord(input: {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
  productName: string | null;
  productDescription: string | null;
  supportContext: string | null;
}): Promise<void> {
  const sql = await getSql();
  if (!sql) throw new Error("database unavailable");
  await sql`
    insert into workspaces (id, organization_id, slug, name, product_name, product_description, support_context)
    values (${input.id}, ${input.organizationId}, ${input.slug}, ${input.name},
            ${input.productName}, ${input.productDescription}, ${input.supportContext})
    on conflict (id) do nothing
  `;
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

export type WorkspaceRow = {
  id: string;
  organization_id: string;
  slug: string;
  name: string;
  product_name: string | null;
  product_description: string | null;
  support_context: string | null;
};

export async function getWorkspaceBySlug(slug: string): Promise<WorkspaceRow | null> {
  const sql = await getSql();
  if (!sql) return null;
  const rows = (await sql`
    select id, organization_id, slug, name, product_name, product_description, support_context
    from workspaces where slug = ${slug} limit 1
  `) as unknown as WorkspaceRow[];
  return rows[0] ?? null;
}

export async function ensureOrganization(input: {
  id: string;
  slug: string;
  name: string;
}): Promise<void> {
  const sql = await getSql();
  if (!sql) return;
  await sql`
    insert into organizations (id, slug, name)
    values (${input.id}, ${input.slug}, ${input.name})
    on conflict (id) do nothing
  `;
}

export async function ensureWorkspace(input: {
  id: string;
  organizationId: string;
  slug: string;
  name: string;
}): Promise<void> {
  const sql = await getSql();
  if (!sql) return;
  await sql`
    insert into workspaces (id, organization_id, slug, name)
    values (${input.id}, ${input.organizationId}, ${input.slug}, ${input.name})
    on conflict (id) do nothing
  `;
}

export async function ensureCustomer(input: {
  id: string;
  workspaceId: string;
  bootstrapHash: string;
}): Promise<void> {
  const sql = await getSql();
  if (!sql) return;
  await sql`
    insert into customers (id, workspace_id, bootstrap_identity_hash)
    values (${input.id}, ${input.workspaceId}, ${input.bootstrapHash})
    on conflict (id) do update set updated_at = now()
  `;
}

export function hashAccessCodeForDb(normalizedCode: string, salt: string): string {
  // Separate DB-level hash; the raw code is never stored.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash } = require("node:crypto") as typeof import("node:crypto");
  return createHash("sha256").update(`db:${salt}:${normalizedCode}`, "utf8").digest("hex");
}
