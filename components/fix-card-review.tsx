"use client";

import { useState } from "react";
import { shortBlob } from "@/lib/evidence";
import { formatUtc } from "@/lib/datetime";
import { parseSharedFix } from "@/lib/support-memory";
import { StatusPill } from "@/components/meros-ui";

export type FixCardView = {
  id: string;
  candidateText: string;
  /** Exact staff-reviewed text shared to memory (null when shared unedited). */
  reviewedText?: string | null;
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
  // Edit-before-share: prefilled from the generated candidate, held locally
  // until Save shared. Nothing is persisted until the staff decision posts.
  const initial = parseSharedFix(card.candidateText);
  const [symptom, setSymptom] = useState(initial?.symptom ?? "");
  const [cause, setCause] = useState(initial?.cause ?? "");
  const [resolution, setResolution] = useState(initial?.resolution ?? "");
  const dirty =
    initial !== null &&
    (symptom.trim() !== initial.symptom ||
      cause.trim() !== initial.cause ||
      resolution.trim() !== initial.resolution);

  const review = async (decision: "shared" | "kept_private") => {
    setError("");
    if (decision === "shared" && (!symptom.trim() || !cause.trim() || !resolution.trim())) {
      setError("Symptom, cause, and resolution must all be non-empty before sharing.");
      return;
    }
    setBusy(decision);
    try {
      const res = await fetch(`/api/fix-cards/${card.id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          decision,
          // Reviewed text rides along with Save shared only; Keep private
          // sends no edits and performs zero Walrus writes.
          ...(decision === "shared" && dirty
            ? { edited: { symptom: symptom.trim(), cause: cause.trim(), resolution: resolution.trim() } }
            : {}),
        }),
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

  const fieldClass =
    "mt-1 w-full rounded-md border border-[rgba(119,255,117,0.25)] bg-[#06100B] px-2 py-1.5 text-xs leading-5 text-neutral-200 placeholder:text-neutral-600 focus:border-[rgba(119,255,117,0.5)] focus:outline-none";

  return (
    <div className="mt-2">
      {initial && (
        <div className="mb-2 space-y-2">
          {(
            [
              ["Symptom", symptom, setSymptom],
              ["Cause", cause, setCause],
              ["Resolution", resolution, setResolution],
            ] as const
          ).map(([label, value, setValue]) => (
            <label key={label} className="block">
              <span className="text-[11px] font-medium text-neutral-300">
                {label}{dirty && <span className="ml-1 text-[#9AFF8D]">· edited</span>}
              </span>
              <textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={label === "Symptom" ? 2 : 3}
                maxLength={400}
                disabled={busy !== null}
                aria-label={`Edit fix card ${label.toLowerCase()}`}
                className={fieldClass}
              />
            </label>
          ))}
          <p className="text-[11px] leading-4 text-neutral-500">
            Review before sharing: Save shared stores exactly this text. Customer-private details are never added automatically.
          </p>
        </div>
      )}
      <div className="flex gap-2">
        <button
          onClick={() => void review("shared")}
          disabled={busy !== null}
          className="rounded-md bg-[#77FF75] px-3 py-1.5 text-xs font-medium text-neutral-950 disabled:opacity-40 hover:bg-[#9AFF8D]"
        >
          {busy === "shared" ? "Saving to shared memory…" : "Save shared"}
        </button>
        <button
          onClick={() => void review("kept_private")}
          disabled={busy !== null}
          className="rounded-md border border-[rgba(119,255,117,0.25)] px-3 py-1.5 text-xs text-neutral-300 disabled:opacity-40 hover:border-[rgba(119,255,117,0.5)]"
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

/** Correction for an already-shared card: edits post as a NEW shared blob;
 *  the old blob stays immutable and the old row becomes superseded. */
export function CorrectButtons({
  workspaceSlug,
  card,
  onDone,
}: {
  workspaceSlug: string;
  card: FixCardView;
  onDone: (id: string, status: string, blobId?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const initial = parseSharedFix(card.reviewedText || card.candidateText);
  const [symptom, setSymptom] = useState(initial?.symptom ?? "");
  const [cause, setCause] = useState(initial?.cause ?? "");
  const [resolution, setResolution] = useState(initial?.resolution ?? "");

  const save = async () => {
    setError("");
    if (!symptom.trim() || !cause.trim() || !resolution.trim()) {
      setError("Symptom, cause, and resolution must all be non-empty.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`/api/fix-cards/${card.id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          workspaceSlug,
          decision: "correct_shared",
          edited: { symptom: symptom.trim(), cause: cause.trim(), resolution: resolution.trim() },
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Correction failed.");
        return;
      }
      onDone(data.id, data.status, data.blobId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  if (!initial) return null;
  if (!open) {
    return (
      <div className="mt-2">
        <button
          onClick={() => setOpen(true)}
          className="rounded-md border border-[rgba(119,255,117,0.25)] px-3 py-1.5 text-xs text-neutral-300 hover:border-[rgba(119,255,117,0.5)]"
        >
          Correct shared fix
        </button>
      </div>
    );
  }
  const fieldClass =
    "mt-1 w-full rounded-md border border-[rgba(119,255,117,0.25)] bg-[#06100B] px-2 py-1.5 text-xs leading-5 text-neutral-200 placeholder:text-neutral-600 focus:border-[rgba(119,255,117,0.5)] focus:outline-none";
  return (
    <div className="mt-2 space-y-2">
      {(
        [
          ["Symptom", symptom, setSymptom],
          ["Cause", cause, setCause],
          ["Resolution", resolution, setResolution],
        ] as const
      ).map(([label, value, setValue]) => (
        <label key={label} className="block">
          <span className="text-[11px] font-medium text-neutral-300">{label}</span>
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            rows={label === "Symptom" ? 2 : 3}
            maxLength={400}
            disabled={busy}
            aria-label={`Correct fix card ${label.toLowerCase()}`}
            className={fieldClass}
          />
        </label>
      ))}
      <p className="text-[11px] leading-4 text-neutral-500">
        Saving writes a new shared blob; the old blob is kept for audit and stops being recalled.
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => void save()}
          disabled={busy}
          className="rounded-md bg-[#77FF75] px-3 py-1.5 text-xs font-medium text-neutral-950 disabled:opacity-40 hover:bg-[#9AFF8D]"
        >
          {busy ? "Saving correction…" : "Save correction"}
        </button>
        <button
          onClick={() => setOpen(false)}
          disabled={busy}
          className="rounded-md border border-[rgba(119,255,117,0.25)] px-3 py-1.5 text-xs text-neutral-300 disabled:opacity-40 hover:border-[rgba(119,255,117,0.5)]"
        >
          Cancel
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] text-red-300">{error}</p>}
    </div>
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
    <li className="rounded-md border border-[rgba(119,255,117,0.14)] bg-[rgba(10,27,18,0.72)] px-3 py-2">
      <p className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-neutral-500">
        <StatusPill status={card.status} />
        <span>
          {card.blobId ? `blob ${shortBlob(card.blobId)}` : "no blob yet"} ·{" "}
          {formatUtc(card.createdAt)}
        </span>
      </p>
      {card.status === "pending_review" ? null : (
        <FixCandidateBody text={card.reviewedText || card.candidateText} />
      )}
      <p className="mt-1.5 rounded border border-[rgba(119,255,117,0.14)] bg-[#06100B] px-2 py-1 text-[11px] leading-4 text-neutral-500">
        Only this reusable fix is shared. Customer-private memory stays private.
      </p>
      {card.status === "pending_review" && (
        <ReviewButtons workspaceSlug={workspaceSlug} card={card} onDone={onDone} />
      )}
      {card.status === "shared" && (
        <CorrectButtons workspaceSlug={workspaceSlug} card={card} onDone={onDone} />
      )}
    </li>
  );
}
