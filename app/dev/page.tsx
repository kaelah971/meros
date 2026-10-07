"use client";

import { useCallback, useState } from "react";

type WriteState = "idle" | "saving" | "stored" | "failed" | "blocked";
type RecallHit = { text: string; distance: number; blobId: string; createdAt?: string };

export default function DevPage() {
  const [accessCode, setAccessCode] = useState("P0-ALICE-01");
  const [memoryText, setMemoryText] = useState("[PROFILE] Uses Excel 2021 on Windows");
  const [writeState, setWriteState] = useState<WriteState>("idle");
  const [writeInfo, setWriteInfo] = useState<string>("");
  const [blobId, setBlobId] = useState<string>("");
  const [namespace, setNamespace] = useState<string>("");

  const [query, setQuery] = useState("What spreadsheet app and OS does the user use?");
  const [recalling, setRecalling] = useState(false);
  const [recallInfo, setRecallInfo] = useState<string>("");
  const [hits, setHits] = useState<RecallHit[]>([]);

  const writeMemory = useCallback(async () => {
    setWriteState("saving");
    setWriteInfo("Saving to Walrus… (waiting for real completion, not optimistic)");
    setBlobId("");
    try {
      const res = await fetch("/api/memory/write", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessCode, text: memoryText, type: "PROFILE" }),
      });
      const data = await res.json();
      if (data.namespace) setNamespace(data.namespace);
      if (data.ok && data.status === "stored") {
        setWriteState("stored");
        setBlobId(data.blobId ?? "");
        setWriteInfo(
          `Stored on Walrus. blob/reference: ${data.blobId ?? "?"}${data.persisted ? "" : " (Neon metadata not configured — Walrus write is still real)"}`,
        );
      } else if (data.status === "blocked" || res.status === 503) {
        setWriteState("blocked");
        setWriteInfo(`BLOCKED: ${data.error ?? "missing credentials"} Needed: ${(data.needed ?? []).join(", ")}`);
      } else {
        setWriteState("failed");
        setWriteInfo(`FAILED: ${data.error ?? "unknown error"} — candidate retained, retry possible.`);
      }
    } catch (e) {
      setWriteState("failed");
      setWriteInfo(`FAILED: ${e instanceof Error ? e.message : "network error"}`);
    }
  }, [accessCode, memoryText]);

  const recall = useCallback(async () => {
    setRecalling(true);
    setRecallInfo("Querying Walrus Memory semantically…");
    try {
      const res = await fetch("/api/memory/recall", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessCode, query, topK: 5 }),
      });
      const data = await res.json();
      if (data.namespace) setNamespace(data.namespace);
      if (data.ok) {
        setHits(data.results ?? []);
        setRecallInfo(
          (data.results?.length ?? 0) > 0
            ? `Recalled ${data.results.length} hit(s) from Walrus namespace ${data.namespace}`
            : `Walrus returned 0 hits in ${data.namespace} (write may still be indexing, or no semantic match).`,
        );
      } else {
        setHits([]);
        setRecallInfo(`Recall failed: ${data.error ?? "unknown"}${data.needed ? ` Needed: ${data.needed.join(", ")}` : ""}`);
      }
    } catch (e) {
      setHits([]);
      setRecallInfo(`Recall failed: ${e instanceof Error ? e.message : "network error"}`);
    } finally {
      setRecalling(false);
    }
  }, [accessCode, query]);

  const freshSession = useCallback(() => {
    // Proof must not depend on retained transcript: drop all results/state,
    // keep only the access code so the user re-derives the same namespace.
    setHits([]);
    setRecallInfo("Session cleared. Same access code → same server-derived namespace. Recall now.");
    setWriteInfo(writeState === "stored" ? "Previous write state cleared from view. Blob reference above was captured at write time." : "");
    setWriteState("idle");
    setBlobId("");
  }, [writeState]);

  const stateColor =
    writeState === "stored"
      ? "text-emerald-400"
      : writeState === "saving"
        ? "text-amber-400"
        : writeState === "failed" || writeState === "blocked"
          ? "text-red-400"
          : "text-neutral-400";

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <p className="text-xs uppercase tracking-widest text-neutral-400">
        Meros · P0 diagnostic (internal, utilitarian)
      </p>
      <h1 className="mt-2 text-2xl font-semibold">Real Memory Spine: write → fresh recall</h1>

      <section className="mt-6 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <label className="text-xs font-medium text-neutral-300">
          Access code
          <input
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
            autoComplete="off"
          />
        </label>
        <p className="mt-2 break-all font-mono text-xs text-neutral-400">
          namespace (server-derived): {namespace || "— enter code + write/recall to derive —"}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Same code → same namespace. Raw code is never used as the namespace; the client cannot submit one.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="text-sm font-semibold">1 · Write memory</h2>
        <textarea
          value={memoryText}
          onChange={(e) => setMemoryText(e.target.value)}
          rows={2}
          className="mt-2 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
        />
        <div className="mt-3 flex gap-2">
          <button
            onClick={writeMemory}
            disabled={writeState === "saving" || !accessCode.trim() || !memoryText.trim()}
            className="rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-neutral-950 disabled:opacity-40 hover:bg-emerald-400"
          >
            {writeState === "saving" ? "Saving…" : "Write memory"}
          </button>
        </div>
        <p className={`mt-2 text-sm font-medium ${stateColor}`}>
          {writeState === "idle" ? "status: idle" : `status: ${writeState}`}
        </p>
        {writeInfo && <p className="mt-1 text-xs text-neutral-300">{writeInfo}</p>}
        {blobId && (
          <p className="mt-1 break-all font-mono text-xs text-emerald-300">blob/reference: {blobId}</p>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-neutral-800 bg-neutral-900 p-4">
        <h2 className="text-sm font-semibold">2 · Fresh session → recall</h2>
        <div className="mt-2 flex gap-2">
          <button
            onClick={freshSession}
            className="rounded-md border border-neutral-700 px-4 py-2 text-sm text-neutral-200 hover:border-neutral-500"
          >
            Clear / new session
          </button>
        </div>
        <label className="mt-3 block text-xs font-medium text-neutral-300">
          Recall query (semantically related, not identical)
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </label>
        <button
          onClick={recall}
          disabled={recalling || !accessCode.trim() || !query.trim()}
          className="mt-3 rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-neutral-950 disabled:opacity-40 hover:bg-sky-400"
        >
          {recalling ? "Recalling…" : "Recall"}
        </button>
        {recallInfo && <p className="mt-2 text-xs text-neutral-300">{recallInfo}</p>}
        {hits.length > 0 && (
          <ul className="mt-3 space-y-2">
            {hits.map((h) => (
              <li key={h.blobId} className="rounded-md border border-neutral-800 bg-neutral-950 p-3">
                <p className="text-sm">{h.text}</p>
                <p className="mt-1 break-all font-mono text-xs text-neutral-400">
                  distance: {h.distance} · blob: {h.blobId}
                  {h.createdAt ? ` · stored: ${h.createdAt}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-xs text-neutral-500">
        P0 proof order: A enter code → B write fact → C Stored + reference → D Clear/new session →
        E same code → F related query → G earlier Walrus memory returns. No LLM in this loop.
      </p>
    </main>
  );
}
