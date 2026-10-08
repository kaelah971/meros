import "server-only";
import { requireUser } from "./auth";
import {
  UnknownWorkspaceError,
  resolveAuthenticatedCustomer,
  type AuthenticatedCustomer,
} from "./tenant-store";

/**
 * Single product-identity entry point for ALL real support APIs
 * (/api/chat, /api/compare, /api/memory/capture, /api/fixes/*).
 *
 * Better Auth session is REQUIRED. The client supplies only workspaceSlug
 * (route context). A client-supplied accessCode — present or not, valid or
 * spoofed — is NEVER consulted and cannot alter the resolved identity.
 * Anonymous callers get a 401 before any recall, write, or derivation.
 */
export async function resolveProductIdentity(body: {
  workspaceSlug?: unknown;
  accessCode?: unknown;
  [key: string]: unknown;
}): Promise<AuthenticatedCustomer> {
  const user = await requireUser();
  return resolveAuthenticatedCustomer(body.workspaceSlug, user);
}

/** Maps identity failures to HTTP semantics shared by all product routes. */
export function identityError(e: unknown): { status: number; message: string } {
  if (e instanceof UnknownWorkspaceError) {
    return { status: 404, message: e.message };
  }
  const status =
    typeof (e as { status?: unknown })?.status === "number"
      ? (e as { status: number }).status
      : 400;
  return {
    status,
    message: e instanceof Error ? e.message : "bad tenant identity",
  };
}
