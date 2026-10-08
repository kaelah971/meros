"use client";

import { useState } from "react";
import { shortBlob } from "@/lib/evidence";
import { parseSharedFix } from "@/lib/support-memory";

export type FixCardView = {
  id: string;
  candidateText: string;
  status: string;
  blobId: string | null;
  createdAt: string;
};

/** Staff review actions. Kept private performs ZERO Walrus writes. */
export function ReviewButtons({
  workspaceSlug,
  card,
  onDone,
}: {
  workspaceSlug: string;
  card: FixCardView;
  onDone: (id: string, status: string, blobId?: string) => void;
}) {
  const [busy, setBusy] = useState<null | "shared" | "kept_private">(null);
  const [error, setError] = useState("");

  const review = async (decision: "shared" | "kept_private") => {
    setError("");
    setBusy(decision);
    try {
      const res = await fetch(`/api/fix-cards/${card.id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceSlug, decision }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Review failed.");
        return;
      }
      onDone(card.id, data.status, data.blobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-2">
      <div className="flex gap-2">
        <button
          onClick={() => void review("shared")}
          disabled={busy !== null}
          className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-neutral-950 disabled:opacity-40 hover:bg-emerald-400"
        >
          {busy === "shared" ? "Saving to shared memory…" : "Save shared"}
        </button>
        <button
          onClick={() => void review("kept_private")}
          disabled={busy !== null}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 disabled:opacity-40 hover:border-neutral-500"
        >
          {busy === "kept_private" ? "Saving…" : "Keep private"}
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] text-red-300">{error}</p>}
    </div>
  );
}

/** Structured Symptom/Cause/Resolution rendering; falls back to raw text. */
function FixCandidateBody({ text }: { text: string }) {
  const parsed = parseSharedFix(text);
  if (!parsed) {
    return (
      <pre className="mt-1 whitespace-pre-wrap font-mono text-xs leading-5 text-neutral-200">
        {text}
      </pre>
    );
  }
  return (
    <dl className="mt-1 space-y-1.5 text-xs leading-5">
      {(
        [
          ["Symptom", parsed.symptom],
          ["Cause", parsed.cause],
          ["Resolution", parsed.resolution],
        ] as const
      ).map(([label, value]) => (
        <div key={label}>
          <dt className="font-medium text-neutral-300">{label}</dt>
          <dd className="text-neutral-400">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FixCardItem({
  workspaceSlug,
  card,
  onDone,
}: {
  workspaceSlug: string;
  card: FixCardView;
  onDone: (id: string, status: string, blobId?: string) => void;
}) {
  return (
    <li className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2">
      <p className="font-mono text-[11px] text-neutral-500">
        {card.status}
        {card.blobId ? ` · blob ${shortBlob(card.blobId)}` : ""} ·{" "}
        {new Date(card.createdAt).toLocaleString()}
      </p>
      <FixCandidateBody text={card.candidateText} />
      <p className="mt-1.5 rounded border border-neutral-800 bg-neutral-950 px-2 py-1 text-[11px] leading-4 text-neutral-500">
        Only this reusable fix is shared. Customer-private memory stays private.
      </p>
      {card.status === "pending_review" && (
        <ReviewButtons workspaceSlug={workspaceSlug} card={card} onDone={onDone} />
      )}
    </li>
  );
}
