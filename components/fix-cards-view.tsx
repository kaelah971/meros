"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { EmptyState, StatusPill } from "@/components/meros-ui";
import { FixCardItem, type FixCardView } from "@/components/fix-card-review";

/** Staff Fix Cards view: client wrapper so review buttons update in place. */
export default function FixCardsView({
  workspaceSlug,
  initial,
}: {
  workspaceSlug: string;
  initial: FixCardView[];
}) {
  const [cards, setCards] = useState<FixCardView[]>(initial);
  // Pick up refetched server data (e.g. after a correction adds a row).
  useEffect(() => setCards(initial), [initial]);
  const router = useRouter();
  const onDone = (id: string, status: string, blobId?: string) => {
    // A correction creates a NEW active row server-side: mark the old card
    // superseded locally, then re-fetch so the corrected version (with its
    // new blob proof) appears without navigation.
    if (status === "corrected") {
      setCards((prev) => prev.map((c) => (c.id === id ? { ...c, status } : c)));
      router.refresh();
      return;
    }
    setCards((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status, blobId: blobId ?? c.blobId } : c)),
    );
  };

  const pending = cards.filter((c) => c.status === "pending_review");
  const rest = cards.filter((c) => c.status !== "pending_review");

  return (
    <div>
      <p className="text-sm font-medium text-neutral-100">Pending review ({pending.length})</p>
      {pending.length === 0 ? (
        <div className="mt-2">
          <EmptyState
            title="No Fix Cards waiting for review"
            body="Resolved issues with a grounded, reusable fix will appear here for approval."
          />
        </div>
      ) : (
        <ul className="mt-2 space-y-2">
          {pending.map((c) => (
            <FixCardItem key={c.id} workspaceSlug={workspaceSlug} card={c} onDone={onDone} />
          ))}
        </ul>
      )}
      <p className="mt-5 text-sm font-medium text-neutral-100">Reviewed ({rest.length})</p>
      {rest.length === 0 ? (
        <p className="mt-1 text-xs text-neutral-500">No reviewed cards yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {rest.map((c) => (
            <FixCardItem key={c.id} workspaceSlug={workspaceSlug} card={c} onDone={onDone} />
          ))}
        </ul>
      )}
    </div>
  );
}
