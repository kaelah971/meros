import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getOwnedWorkspace } from "@/lib/db";
import { getWorkspaceStats } from "@/lib/support-ops";

/** Console overview: real Neon-derived counts + entry points. */
export default async function WorkspaceOverview({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { slug } = await params;
  const ws = await getOwnedWorkspace(user.id, slug);
  if (!ws) redirect("/app");

  const stats = await getWorkspaceStats(ws.id);
  const cards = [
    { label: "Open issues", value: stats.openIssues, href: `/app/workspaces/${ws.slug}/conversations` },
    { label: "Customers", value: stats.customers, href: `/app/workspaces/${ws.slug}/customers` },
    { label: "Conversations", value: stats.conversations, href: `/app/workspaces/${ws.slug}/conversations` },
    { label: "Pending Fix Cards", value: stats.pendingFixCards, href: `/app/workspaces/${ws.slug}/fix-cards` },
    { label: "Shared fixes", value: stats.sharedFixes, href: `/app/workspaces/${ws.slug}/shared` },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {cards.map((c) => (
          <Link
            key={c.label}
            href={c.href}
            className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2.5 hover:border-neutral-600"
          >
            <p className="text-xl font-semibold text-neutral-100">{c.value}</p>
            <p className="text-[11px] text-neutral-400">{c.label}</p>
          </Link>
        ))}
      </div>
      {ws.product_name && (
        <p className="mt-3 text-xs text-neutral-400">Product: {ws.product_name}</p>
      )}
      <div className="mt-3 rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2.5">
        <p className="text-xs text-neutral-400">Customer support URL</p>
        <div className="mt-1 flex items-center gap-2">
          <code className="flex-1 truncate rounded bg-neutral-950 px-2 py-1.5 font-mono text-[11px] text-emerald-300">
            /support/{ws.slug}
          </code>
          <Link
            href={`/support/${ws.slug}`}
            className="shrink-0 rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-neutral-950 hover:bg-emerald-400"
          >
            Open
          </Link>
        </div>
      </div>
    </div>
  );
}
