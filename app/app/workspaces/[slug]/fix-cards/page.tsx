import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getOwnedWorkspace } from "@/lib/db";
import { listFixCards } from "@/lib/support-ops";
import FixCardsView from "@/components/fix-cards-view";

/** Staff Fix Cards queue. Exact sanitized candidate + review actions. */
export default async function FixCardsPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { slug } = await params;
  const ws = await getOwnedWorkspace(user.id, slug);
  if (!ws) redirect("/app");

  const cards = await listFixCards(ws.id);
  return (
    <FixCardsView
      workspaceSlug={ws.slug}
      initial={cards.map((c) => ({
        id: c.id,
        candidateText: c.candidate_text,
        status: c.status,
        blobId: c.walrus_blob_id,
        createdAt: c.created_at,
      }))}
    />
  );
}
