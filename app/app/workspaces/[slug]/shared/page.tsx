import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getOwnedWorkspace } from "@/lib/db";
import { listFixCards } from "@/lib/support-ops";
import { shortBlob } from "@/lib/evidence";

/**
 * Shared memory registry: Neon fix_cards(status=shared) is the index of
 * approved reusable fixes. Walrus remains the memory storage — blob refs
 * below point at it, nothing is mirrored here.
 */
export default async function SharedMemoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { slug } = await params;
  const ws = await getOwnedWorkspace(user.id, slug);
  if (!ws) redirect("/app");

  const shared = await listFixCards(ws.id, "shared");

  return (
    <div>
      <p className="text-sm font-medium text-neutral-100">Shared fixes ({shared.length})</p>
      {shared.length === 0 ? (
        <p className="mt-2 text-xs text-neutral-500">
          No approved shared fixes yet. Resolved customer issues produce Fix Cards for review.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {shared.map((c) => (
            <li key={c.id} className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-5 text-neutral-200">
                {c.candidate_text}
              </pre>
              <p className="mt-1 font-mono text-[11px] text-neutral-500">
                {c.walrus_blob_id ? `blob ${shortBlob(c.walrus_blob_id)}` : "blob pending"}
                {c.conversation_id ? (
                  <>
                    {" · "}
                    <a
                      href={`/app/workspaces/${slug}/conversations/${c.conversation_id}`}
                      className="text-emerald-300 hover:underline"
                    >
                      source conversation
                    </a>
                  </>
                ) : null}
                {c.reviewed_at ? ` · reviewed ${new Date(c.reviewed_at).toLocaleString()}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
