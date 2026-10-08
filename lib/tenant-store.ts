import "server-only";
import { getIdSalt, isNeonConfigured } from "./env";
import {
  dbAvailable,
  ensureCustomer,
  ensureOrganization,
  ensureWorkspace,
  getWorkspaceBySlug,
} from "./db";
import {
  displayNameForSlug,
  organizationIdForSlug,
  resolveTenantIds,
  workspaceIdForSlug,
  type TenantRequest,
} from "./tenant";

export type ResolvedTenant = TenantRequest & {
  workspace: {
    slug: string;
    name: string;
    productName: string | null;
  };
  /** True only when relational rows were actually persisted in Neon. */
  persisted: boolean;
};

export class UnknownWorkspaceError extends Error {
  constructor(slug: string) {
    super(
      `Unknown workspace "${slug}". Ask your workspace admin for the correct workspace name, or seed it first.`,
    );
    this.name = "UnknownWorkspaceError";
  }
}

/**
 * Server-side tenant resolution from temporary bootstrap input.
 * Client supplies ONLY (workspaceSlug, accessCode). Everything else —
 * IDs, hashes, namespaces — is derived here and never exposed beyond
 * safe presentation fields.
 *
 * With Neon: workspace slug is registry-checked (unknown → 404-style
 * error) and org/workspace/customer rows are upserted idempotently.
 * Without Neon: fully deterministic fallback — same inputs still yield
 * the same isolated namespaces; relational persistence is reported as
 * blocked via `persisted: false`.
 */
export async function resolveTenant(
  rawSlug: unknown,
  rawCode: unknown,
): Promise<ResolvedTenant> {
  const salt = getIdSalt();
  // Deterministic pass first (also validates both inputs).
  // Default org = workspace slug; replaced by the DB row's org when known.
  const provisional = resolveTenantIds(rawSlug, rawCode, salt, "__pending__");

  if (!(await dbAvailable())) {
    const ids = resolveTenantIds(rawSlug, rawCode, salt, provisional.workspaceSlug);
    return {
      ...ids,
      workspace: {
        slug: ids.workspaceSlug,
        name: displayNameForSlug(ids.workspaceSlug),
        productName: null,
      },
      persisted: false,
    };
  }

  const row = await getWorkspaceBySlug(provisional.workspaceSlug);
  if (!row) throw new UnknownWorkspaceError(provisional.workspaceSlug);

  const ids = resolveTenantIds(rawSlug, rawCode, salt, row.slug);
  // Belt-and-braces: the row ID must equal the deterministic ID. If an
  // operator ever hand-inserts a row with a mismatched ID, refuse rather
  // than silently forking namespaces.
  if (row.id !== ids.workspaceId) {
    throw new Error(`Workspace registry mismatch for "${row.slug}" — refusing to derive namespaces.`);
  }
  // Organization always comes from the registry row, never the fallback.
  const organizationId = row.organization_id;
  await ensureOrganization({
    id: organizationId,
    slug: row.slug,
    name: displayNameForSlug(row.slug),
  });
  await ensureWorkspace({
    id: ids.workspaceId,
    organizationId,
    slug: row.slug,
    name: row.name,
  });
  await ensureCustomer({
    id: ids.customerId,
    workspaceId: ids.workspaceId,
    bootstrapHash: ids.bootstrapHash,
  });

  return {
    ...ids,
    organizationId,
    workspace: {
      slug: row.slug,
      name: row.name,
      productName: row.product_name,
    },
    persisted: true,
  };
}

export type SeedResult = {
  ok: boolean;
  persisted: boolean;
  workspaces?: { slug: string; workspaceId: string; organizationId: string }[];
  error?: string;
  needed?: string[];
};

const DEMO_ORGS: { orgSlug: string; orgName: string; slug: string; name: string }[] = [
  { orgSlug: "acme", orgName: "Acme", slug: "acme", name: "Acme Support" },
  { orgSlug: "nova", orgName: "Nova", slug: "nova", name: "Nova Support" },
];

/**
 * DEV-ONLY idempotent seed: organization + workspace RECORDS only.
 * Creates zero Walrus memories — those must always come from real flows.
 */
export async function seedDemoTenants(): Promise<SeedResult> {
  if (!isNeonConfigured()) {
    return {
      ok: false,
      persisted: false,
      error: "DATABASE_URL is not configured — relational seed cannot persist.",
      needed: ["DATABASE_URL"],
    };
  }
  const out: { slug: string; workspaceId: string; organizationId: string }[] = [];
  for (const d of DEMO_ORGS) {
    const organizationId = organizationIdForSlug(d.orgSlug);
    const workspaceId = workspaceIdForSlug(d.slug);
    await ensureOrganization({ id: organizationId, slug: d.orgSlug, name: d.orgName });
    await ensureWorkspace({
      id: workspaceId,
      organizationId,
      slug: d.slug,
      name: d.name,
    });
    out.push({ slug: d.slug, workspaceId, organizationId });
  }
  return { ok: true, persisted: true, workspaces: out };
}
