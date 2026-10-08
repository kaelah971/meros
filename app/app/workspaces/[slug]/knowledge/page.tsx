import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getOwnedWorkspace } from "@/lib/db";
import { KnowledgeManager } from "@/components/knowledge-manager";

/** Owner knowledge console: profile + sources. Membership-gated. */
export default async function KnowledgePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { slug } = await params;
  const ws = await getOwnedWorkspace(user.id, slug);
  if (!ws) redirect("/app");

  return (
    <div>
      <p className="text-sm font-medium text-neutral-100">Product profile</p>
      <dl className="mt-2 space-y-1 rounded-md border border-[rgba(119,255,117,0.14)] bg-[rgba(10,27,18,0.72)] px-3 py-2.5 text-xs">
        <div className="flex gap-2"><dt className="text-neutral-500">Product:</dt><dd className="text-neutral-200">{ws.product_name ?? "—"}</dd></div>
        {ws.product_description && (
          <div className="flex gap-2"><dt className="text-neutral-500">Description:</dt><dd className="text-neutral-200">{ws.product_description}</dd></div>
        )}
        {ws.support_context && (
          <div className="flex gap-2"><dt className="text-neutral-500">Support context:</dt><dd className="text-neutral-200">{ws.support_context}</dd></div>
        )}
      </dl>
      <div className="mt-4">
        <KnowledgeManager workspaceSlug={ws.slug} />
      </div>
    </div>
  );
}
