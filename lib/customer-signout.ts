type BetterAuthSignOutResult =
  | { data?: { success?: boolean } | null; error?: unknown | null }
  | { success?: boolean; error?: unknown | null }
  | null
  | undefined;

export const CUSTOMER_SIGN_OUT_ERROR = "Could not sign you out. Please try again.";

function hasReturnedError(result: BetterAuthSignOutResult): boolean {
  if (!result || typeof result !== "object") return false;
  if ("error" in result && result.error) return true;
  if ("data" in result && result.data && typeof result.data === "object" && "success" in result.data) {
    return result.data.success === false;
  }
  if ("success" in result) return result.success === false;
  return false;
}

/**
 * Better Auth's client returns a better-fetch envelope by default:
 * `{ data, error }`. Older/alternate call paths may throw instead. Treat any
 * returned `error` or explicit `success: false` as failure, and only refresh
 * the current route after a confirmed successful sign-out.
 */
export async function signOutCustomerSession({
  signOut,
  refreshCurrentRoute,
}: {
  signOut: () => Promise<BetterAuthSignOutResult>;
  refreshCurrentRoute: () => void;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const result = await signOut();
    if (hasReturnedError(result)) {
      return { ok: false, message: CUSTOMER_SIGN_OUT_ERROR };
    }
    refreshCurrentRoute();
    return { ok: true };
  } catch {
    return { ok: false, message: CUSTOMER_SIGN_OUT_ERROR };
  }
}
