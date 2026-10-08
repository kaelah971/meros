import { notFound } from "next/navigation";
import { SupportChat } from "@/components/support-chat";
import { getWorkspaceBySlug } from "@/lib/db";

/**
 * Public customer route. Workspace comes from the URL and is resolved
 * server-side — the customer only ever supplies the temporary access code.
 */
export default async function SupportPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const ws = await getWorkspaceBySlug(workspaceSlug);
  if (!ws) notFound();
  return (
    <SupportChat
      initialWorkspaceSlug={ws.slug}
      initialWorkspaceName={ws.name}
      lockWorkspace
    />
  );
}
