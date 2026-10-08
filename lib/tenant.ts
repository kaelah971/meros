import { createHash } from "node:crypto";
import { normalizeAccessCode, validateAccessCode } from "./identity";

// P5 multi-tenant namespace derivation. Pure + deterministic: the SAME
// (workspaceSlug, accessCode) ALWAYS yields the SAME IDs and namespaces,
// with or without a database. Neon persists the relational records when
// available; it NEVER participates in namespace derivation.
//
// No function here accepts a client-supplied ID or namespace.

function sha32Hex(input: string): string {
  return createHash("sha256").update(input, "utf8").digest("hex").slice(0, 32);
}

/** Workspace slugs are public routing keys: lowercase, short, URL-safe. */
export function normalizeSlug(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("workspaceSlug must be a string");
  const slug = raw.trim().toLowerCase();
  if (!/^[a-z0-9-]{2,32}$/.test(slug))
    throw new Error("workspaceSlug must be 2–32 chars of a–z, 0–9, hyphen");
  return slug;
}

/** Immutable workspace ID, derived from the slug. Stable forever. */
export function workspaceIdForSlug(slug: string): string {
  return sha32Hex(`meros:v1:ws:${slug}`);
}

/** Immutable organization ID, derived from the org slug. */
export function organizationIdForSlug(orgSlug: string): string {
  return sha32Hex(`meros:v1:org:${orgSlug}`);
}

/**
 * Server-side bootstrap hash for an access code. Raw codes are NEVER
 * persisted; this hash is what (optionally) lands in the customers table.
 */
export function bootstrapHashForCode(normalizedCode: string, salt: string): string {
  return createHash("sha256")
    .update(`meros:v1:bootstrap:${salt}:${normalizedCode}`, "utf8")
    .digest("hex");
}

/**
 * Immutable customer ID, scoped to ONE workspace. The same access code in
 * two workspaces yields two different customers — tenant isolation is
 * structural, not a query filter.
 * LEGACY (P5 access-code bootstrap). Product flow uses customerIdForAuth.
 */
export function customerIdFor(workspaceId: string, bootstrapHash: string): string {
  return sha32Hex(`meros:v1:cu:${workspaceId}:${bootstrapHash}`);
}

/**
 * Immutable customer ID for a Better Auth user inside ONE workspace.
 * Deterministic in (workspaceId, authUserId): no DB read is needed to
 * derive it, so returning customers always land on the same ID and the
 * same v2 private namespace. The same auth user in two workspaces yields
 * two different customers. Never derived from email, name, or tokens.
 */
export function customerIdForAuth(workspaceId: string, authUserId: string): string {
  if (!authUserId || authUserId.length > 128) throw new Error("invalid auth user id");
  return sha32Hex(`meros:v2:cu:${workspaceId}:auth:${authUserId}`);
}

/** Workspace-scoped private namespace. Never global, never client-supplied. */
export function derivePrivateNamespaceV2(workspaceId: string, customerId: string): string {
  return `meros:v2:workspace:${workspaceId}:customer:${customerId}`;
}

/** Workspace-scoped shared namespace. One per workspace, never global. */
export function deriveSharedNamespaceV2(workspaceId: string): string {
  return `meros:v2:workspace:${workspaceId}:shared:fixes`;
}

/** Workspace-scoped product-knowledge namespace. Semantic index of the
 * organization's own product material — tagged distinctly from support
 * fixes, isolated per workspace like everything else. */
export function deriveKnowledgeNamespaceV2(workspaceId: string): string {
  return `meros:v2:workspace:${workspaceId}:knowledge`;
}

/** Display name fallback when no DB record exists. Presentation only. */
export function displayNameForSlug(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export type TenantRequest = {
  workspaceSlug: string;
  normalizedCode: string;
  workspaceId: string;
  organizationId: string;
  bootstrapHash: string;
  customerId: string;
  privateNamespace: string;
  sharedNamespace: string;
};

/**
 * Full server-side tenant resolution from untrusted client bootstrap input.
 * Takes ONLY (workspaceSlug, accessCode, salt, orgSlug). Returns IDs +
 * namespaces; raw codes and namespaces never cross this boundary.
 */
export function resolveTenantIds(
  rawSlug: unknown,
  rawCode: unknown,
  salt: string,
  orgSlugForWorkspace: string,
): TenantRequest {
  const workspaceSlug = normalizeSlug(rawSlug);
  const normalizedCode = validateAccessCode(rawCode);
  const workspaceId = workspaceIdForSlug(workspaceSlug);
  const organizationId = organizationIdForSlug(orgSlugForWorkspace);
  const bootstrapHash = bootstrapHashForCode(normalizedCode, salt);
  const customerId = customerIdFor(workspaceId, bootstrapHash);
  return {
    workspaceSlug,
    normalizedCode,
    workspaceId,
    organizationId,
    bootstrapHash,
    customerId,
    privateNamespace: derivePrivateNamespaceV2(workspaceId, customerId),
    sharedNamespace: deriveSharedNamespaceV2(workspaceId),
  };
}
