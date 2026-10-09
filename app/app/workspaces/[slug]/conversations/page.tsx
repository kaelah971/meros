import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getOwnedWorkspace } from "@/lib/db";
import { listWorkspaceConversations } from "@/lib/support-ops";
import { formatUtc } from "@/lib/datetime";
import { EmptyState, StatusPill } from "@/components/meros-ui";

/** Staff conversations view: workspace-scoped thread list. */
export default async function ConversationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ customer?: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { slug } = await params;
  const ws = await getOwnedWorkspace(user.id, slug);
  if (!ws) redirect("/app");

  const filterCustomer = (await searchParams)?.customer ?? null;
  const all = await listWorkspaceConversations(ws.id);
  const rows = filterCustomer ? all.filter((c) => c.customer_id === filterCustomer) : all;

  return (
    <div>
      <p className="text-sm font-medium text-neutral-100">
        Conversations{filterCustomer ? " · filtered customer" : ""} ({rows.length})
      </p>
      {rows.length === 0 && (
        <div className="mt-2">
          <EmptyState
            title="No conversations yet"
            body="Share your support link to start helping customers. New threads appear here in real time."
          />
        </div>
      )}
      <ul className="mt-2 space-y-2">
        {rows.map((c) => (
          <li key={c.id}>
            <Link
              href={`/app/workspaces/${slug}/conversations/${c.id}`}
              className="block rounded-md border border-[rgba(119,255,117,0.14)] bg-[rgba(10,27,18,0.72)] px-3 py-2 hover:border-[rgba(119,255,117,0.5)]"
            >
              <span className="text-xs font-medium text-neutral-100">{c.title}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-neutral-500">
                <span>{c.customer_display}</span>
                <StatusPill status={c.status} />
                {c.last_message_at ? <span>{formatUtc(c.last_message_at)}</span> : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
