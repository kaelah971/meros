import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getOwnedWorkspace } from "@/lib/db";

const NAV = ["Overview", "Customers", "Conversations", "Shared memory", "Fix Cards", "Settings"];

/**
 * Owner workspace view. Every datum here passed the membership check:
 * session user → organization_members → workspace. A slug alone grants
 * nothing — getOwnedWorkspace joins on the caller's user id.
 */
export default async function WorkspacePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { slug } = await params;
  const ws = await getOwnedWorkspace(user.id, slug);
  if (!ws) redirect("/app"); // identical for missing vs. foreign: no org enumeration.

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <p className="text-xs uppercase tracking-widest text-neutral-500">Meros</p>
      <h1 className="mt-1 text-xl font-semibold">Organization: {ws.organization_name}</h1>
      <div className="mt-4 rounded-md border border-neutral-800 bg-neutral-900 px-4 py-3">
        <p className="text-xs uppercase tracking-widest text-neutral-500">Workspace</p>
        <p className="mt-1 text-sm font-medium text-neutral-100">{ws.name}</p>
        <dl className="mt-2 space-y-1 font-mono text-[11px] text-neutral-400">
          <div className="flex gap-2"><dt>slug:</dt><dd className="text-neutral-300">{ws.slug}</dd></div>
          {ws.product_name && (
            <div className="flex gap-2"><dt>product:</dt><dd className="text-neutral-300">{ws.product_name}</dd></div>
          )}
          <div className="flex gap-2"><dt>your role:</dt><dd className="text-neutral-300">{ws.role}</dd></div>
        </dl>
        <div className="mt-3 border-t border-neutral-800 pt-3">
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

      <nav className="mt-4 flex flex-wrap gap-2">
        {NAV.map((item, i) => (
          <span
            key={item}
            className={`rounded-md border px-3 py-1.5 text-xs ${
              i === 0
                ? "border-neutral-600 text-neutral-200"
                : "border-neutral-800 text-neutral-500"
            }`}
            title={i === 0 ? "Current section" : "Coming in a later slice"}
          >
            {item}
            {i > 0 && <span className="ml-1 text-[10px]">· soon</span>}
          </span>
        ))}
      </nav>

      <p className="mt-4 text-xs text-neutral-500">
        <Link href="/app" className="text-emerald-300 hover:underline">← All organizations</Link>
      </p>
    </main>
  );
}