import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getOwnedWorkspace } from "@/lib/db";
import { listFixCards } from "@/lib/support-ops";
import { shortBlob } from "@/lib/evidence";
import { formatUtc } from "@/lib/datetime";
import { EmptyState } from "@/components/meros-ui";

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
  const superseded = await listFixCards(ws.id, "superseded");

  return (
    <div>
      <p className="text-sm font-medium text-neutral-100">Shared fixes ({shared.length})</p>
      {shared.length === 0 ? (
        <div className="mt-2">
          <EmptyState
            title="No shared fixes yet"
            body="Approved Fix Cards will appear here as reusable organizational memory."
          />
        </div>
      ) : (
        <ul className="mt-2 space-y-2">
          {shared.map((c) => (
            <li key={c.id} className="rounded-md border border-[rgba(119,255,117,0.14)] bg-[rgba(10,27,18,0.72)] px-3 py-2">
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
                      className="text-[#9AFF8D] hover:underline"
                    >
                      source conversation
                    </a>
                  </>
                ) : null}
                {c.reviewed_at ? ` · reviewed ${formatUtc(c.reviewed_at)}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      {superseded.length > 0 && (
        <details className="mt-4 text-xs text-neutral-500">
          <summary className="cursor-pointer hover:text-neutral-300">
            Superseded versions ({superseded.length}) — kept for audit, never recalled
          </summary>
          <ul className="mt-2 space-y-2">
            {superseded.map((c) => (
              <li key={c.id} className="rounded-md border border-neutral-800 bg-[#06100B] px-3 py-2">
                <pre className="whitespace-pre-wrap font-mono text-[11px] leading-5 text-neutral-500">
                  {c.reviewed_text || c.candidate_text}
                </pre>
                <p className="mt-1 font-mono text-[10px] text-neutral-600">
                  {c.walrus_blob_id ? `old blob ${shortBlob(c.walrus_blob_id)}` : "no blob"}
                </p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
