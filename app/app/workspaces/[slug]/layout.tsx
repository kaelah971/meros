import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getOwnedWorkspace } from "@/lib/db";

const NAV = [
  { label: "Overview", href: "" },
  { label: "Conversations", href: "/conversations" },
  { label: "Customers", href: "/customers" },
  { label: "Fix Cards", href: "/fix-cards" },
  { label: "Shared memory", href: "/shared" },
];

/**
 * Staff console shell. Membership is verified on EVERY render: session
 * user → organization_members → workspace. Unknown vs. foreign slugs both
 * redirect to /app (no org enumeration).
 */
export default async function WorkspaceLayout({
  params,
  children,
}: {
  params: Promise<{ slug: string }>;
  children: React.ReactNode;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { slug } = await params;
  const ws = await getOwnedWorkspace(user.id, slug);
  if (!ws) redirect("/app");

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <p className="text-xs uppercase tracking-widest text-neutral-500">Meros · {ws.organization_name}</p>
      <h1 className="mt-1 text-xl font-semibold">{ws.name}</h1>
      <p className="mt-1 font-mono text-[11px] text-neutral-500">
        slug: {ws.slug} · your role: {ws.role} · support: /support/{ws.slug}
      </p>
      <nav className="mt-4 flex flex-wrap gap-2">
        {NAV.map((item) => (
          <Link
            key={item.label}
            href={`/app/workspaces/${ws.slug}${item.href}`}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-500"
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="mt-4">{children}</div>
      <p className="mt-6 text-xs text-neutral-500">
        <Link href="/app" className="text-emerald-300 hover:underline">← All organizations</Link>
      </p>
    </main>
  );
}
