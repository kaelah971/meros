import { notFound } from "next/navigation";
import { isLegacyDevIdentityEnabled } from "@/lib/env";
import DevClient from "./dev-client";

/**
 * P0 raw-memory diagnostic console. Local development only: requires the
 * explicit dev flag and never renders in production. Writes/reads here hit
 * the legacy v1 namespaces directly with a raw access code.
 */
export default function DevPage() {
  if (!isLegacyDevIdentityEnabled()) notFound();
  return (
    <div>
      <p className="mx-auto max-w-3xl px-6 pt-6 text-[11px] text-amber-400/80">
        Development diagnostic — local only, disabled in production.
      </p>
      <DevClient />
    </div>
  );
}
