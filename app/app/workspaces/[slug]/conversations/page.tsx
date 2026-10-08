import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getOwnedWorkspace } from "@/lib/db";
import { listWorkspaceConversations } from "@/lib/support-ops";

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
        <p className="mt-2 text-xs text-neutral-500">No conversations yet.</p>
      )}
      <ul className="mt-2 space-y-2">
        {rows.map((c) => (
          <li key={c.id}>
            <Link
              href={`/app/workspaces/${slug}/conversations/${c.id}`}
              className="block rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 hover:border-neutral-600"
            >
              <span className="text-xs font-medium text-neutral-100">{c.title}</span>
              <span className="mt-0.5 block font-mono text-[11px] text-neutral-500">
                {c.customer_display} · {c.status}
                {c.last_message_at ? ` · ${new Date(c.last_message_at).toLocaleString()}` : ""}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
