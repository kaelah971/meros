import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getOwnedWorkspace } from "@/lib/db";
import { listWorkspaceCustomers } from "@/lib/support-ops";

/**
 * Staff customers view: per-customer counts only. Private Walrus memory is
 * NEVER bulk-read or reconstructed here — it stays AI-use only.
 */
export default async function CustomersPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { slug } = await params;
  const ws = await getOwnedWorkspace(user.id, slug);
  if (!ws) redirect("/app");

  const rows = await listWorkspaceCustomers(ws.id);

  return (
    <div>
      <p className="text-sm font-medium text-neutral-100">Customers ({rows.length})</p>
      {rows.length === 0 && (
        <p className="mt-2 text-xs text-neutral-500">No customers yet.</p>
      )}
      <ul className="mt-2 space-y-2">
        {rows.map((c) => (
          <li
            key={c.id}
            className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2"
          >
            <span className="text-xs font-medium text-neutral-100">
              {c.display_name ?? `customer ${c.id.slice(0, 8)}`}
            </span>
            <span className="mt-0.5 block font-mono text-[11px] text-neutral-500">
              {c.conversations} conversations · {c.open_issues} open issues
              {c.last_activity ? ` · active ${new Date(c.last_activity).toLocaleString()}` : ""}
            </span>
            <Link
              href={`/app/workspaces/${slug}/conversations?customer=${c.id}`}
              className="mt-1 inline-block text-[11px] text-emerald-300 hover:underline"
            >
              View conversations →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
