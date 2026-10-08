"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { clearEvidence, readEvidence, shortBlob, type EvidenceEvent } from "@/lib/evidence";

function fmtTime(ts: number): string {
  try {
    return new Date(ts).toLocaleTimeString();
  } catch {
    return "";
  }
}

function CompareProof({ events }: { events: EvidenceEvent[] }) {
  const compares = events.filter((e) => e.kind === "compare");
  const lastShared = [...compares].reverse().find((e) => e.kind === "compare" && e.sharedUsed);
  if (!lastShared || lastShared.kind !== "compare") {
    return (
      <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3">
        <p className="text-sm font-medium text-neutral-100">Why this mattered</p>
        <p className="mt-1 text-xs leading-5 text-neutral-400">
          No memory-influenced comparison captured yet this session. Chat, then
          click “Compare without memory” on an answer that used memory — the
          proof will appear here, built only from actual recall provenance.
        </p>
      </div>
    );
  }
  const shared = lastShared.snippets.filter((s) => s.plane === "shared");
  const first = shared[0];
  return (
    <div className="rounded-lg border border-emerald-900 bg-neutral-900 px-4 py-3">
      <p className="text-sm font-medium text-neutral-100">Why this mattered</p>
      <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs leading-5 text-neutral-300">
        <li>Alice taught Meros — a confirmed resolution was stored as shared support memory.</li>
        <li>
          Bob arrived independently — no Alice private memory used
          {lastShared.privateUsed ? " (plus Bob's own private context)" : ""} — shared support
          memory recalled
          {first ? (
            <>
              {" "}· relevance {first.distance.toFixed(3)} · blob {shortBlob(first.blobId)}
            </>
          ) : null}
          , and the answer prioritized the known fix.
        </li>
        <li>
          Without memory — a fresh generation with long-term memory disabled
          ({lastShared.baselineChars} chars), no prior support pattern.
        </li>
      </ol>
      {first && (
        <p className="mt-2 border-t border-neutral-800 pt-2 font-mono text-[11px] leading-5 text-neutral-400">
          “{first.text.length > 160 ? `${first.text.slice(0, 160)}…` : first.text}”
        </p>
      )}
      <p className="mt-1 text-[11px] text-neutral-500">
        Question: “{lastShared.question}” — populated from this session's actual run data only.
      </p>
    </div>
  );
}

export default function EvidencePage() {
  const [events, setEvents] = useState<EvidenceEvent[]>([]);

  useEffect(() => {
    setEvents(readEvidence());
  }, []);

  const writes = events.filter((e) => e.kind === "private-write" || e.kind === "shared-write");
  const compares = events.filter((e) => e.kind === "compare");

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <p className="text-xs uppercase tracking-widest text-neutral-500">Meros · Evidence</p>
      <h1 className="mt-1 text-xl font-semibold">What memory changed</h1>
      <p className="mt-2 text-xs leading-5 text-neutral-400">
        Session-only evidence — ephemeral, clears when this browser session ends.
        Durable proof lives in Walrus (blob references below); cross-restart
        history needs Neon, which is not configured.
      </p>

      <div className="mt-4">
        <CompareProof events={events} />
      </div>

      <h2 className="mt-6 text-sm font-medium text-neutral-200">
        Walrus writes this session ({writes.length})
      </h2>
      {writes.length === 0 ? (
        <p className="mt-1 text-xs text-neutral-500">No stored writes captured yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {writes.map((w, i) => (
            <li key={i} className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs">
              <span
                className={
                  w.kind === "shared-write" ? "font-medium text-sky-400" : "font-medium text-emerald-400"
                }
              >
                {w.kind === "shared-write" ? "shared" : "private"}
              </span>
              <span className="ml-2 text-neutral-400">
                {w.kind === "private-write" && w.status === "failed" ? "failed" : "stored"} · {fmtTime(w.ts)}
              </span>
              <span className="mt-0.5 block text-neutral-300">
                {w.text.length > 160 ? `${w.text.slice(0, 160)}…` : w.text}
              </span>
              {"blobId" in w && w.blobId && (
                <span className="mt-0.5 block font-mono text-[11px] text-neutral-500">
                  blob {shortBlob(w.blobId)}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-6 text-sm font-medium text-neutral-200">
        Comparisons this session ({compares.length})
      </h2>
      {compares.length === 0 ? (
        <p className="mt-1 text-xs text-neutral-500">No comparisons run yet.</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {compares.map((c, i) =>
            c.kind === "compare" ? (
              <li key={i} className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-300">
                <span className="text-neutral-100">“{c.question}”</span>
                <span className="mt-0.5 block text-neutral-400">
                  private: {c.privateUsed ? "used" : "not used"} · shared:{" "}
                  {c.sharedUsed ? "used" : "not used"} · baseline {c.baselineChars} chars ·{" "}
                  {fmtTime(c.ts)}
                </span>
              </li>
            ) : null,
          )}
        </ul>
      )}

      <div className="mt-6 flex gap-2">
        <button
          onClick={() => {
            clearEvidence();
            setEvents([]);
          }}
          className="rounded-md border border-neutral-700 px-4 py-2 text-xs text-neutral-300 hover:border-neutral-500"
        >
          Clear session evidence
        </button>
        <Link
          href="/chat"
          className="rounded-md bg-emerald-500 px-4 py-2 text-xs font-medium text-neutral-950 hover:bg-emerald-400"
        >
          Back to chat
        </Link>
      </div>
    </main>
  );
}
