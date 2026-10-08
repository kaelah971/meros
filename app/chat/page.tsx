import { notFound } from "next/navigation";
import { SupportChat } from "@/components/support-chat";
import { isLegacyDevIdentityEnabled } from "@/lib/env";

/**
 * Development diagnostic console only. Requires the explicit local dev
 * flag and never renders in production — the real product route is
 * /support/[workspaceSlug] with authenticated customer identity.
 */
export default function ChatPage() {
  if (!isLegacyDevIdentityEnabled()) notFound();
  return <SupportChat />;
}
