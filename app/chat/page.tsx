"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ProvenanceItem = {
  plane: "private" | "shared";
  text: string;
  blobId: string;
  distance: number;
};

type Msg =
  | { kind: "user"; text: string }
  | {
      kind: "assistant";
      text: string;
      provenance: ProvenanceItem[];
      memoryUsed: { private: boolean; shared: boolean };
      historyTurns: number;
      captureNote?: string;
      degradedMemory?: boolean;
    };

type FixState =
  | { status: "preparing" }
  | { status: "ready"; candidate: string }
  | { status: "none" }
  | { status: "saving"; candidate: string }
  | { status: "stored"; candidate: string; blobId: string }
  | { status: "kept-private" }
  | { status: "failed"; error: string };

function shortBlob(b: string): string {
  return b.length > 18 ? `${b.slice(0, 10)}…${b.slice(-6)}` : b;
}

function MemoryLens({
  msg,
  historyTurns,
}: {
  msg: Extract<Msg, { kind: "assistant" }>;
  historyTurns: number;
}) {
  const [open, setOpen] = useState(false);
  const priv = msg.provenance.filter((p) => p.plane === "private");
  const shared = msg.provenance.filter((p) => p.plane === "shared");
  const noneUsed = priv.length === 0 && shared.length === 0;
  return (
    <div className="mt-2 rounded-md border border-neutral-800 bg-neutral-950/60">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-neutral-400 hover:text-neutral-200"
      >
        <span>
          <span className="font-medium text-neutral-300">Why this answer?</span>
          <span className="ml-2">
            {noneUsed
              ? "No relevant memory found"
              : `${priv.length > 0 ? "Your private memory" : ""}${priv.length > 0 && shared.length > 0 ? " · " : ""}${shared.length > 0 ? "Shared support memory" : ""}`}
          </span>
        </span>
        <span aria-hidden>{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t border-neutral-800 px-3 py-3 text-xs">
          <div>
            <p className="font-medium text-emerald-400">Your private memory</p>
            {priv.length === 0 ? (
              <p className="mt-1 text-neutral-500">Not used for this answer.</p>
            ) : (
              <ul className="mt-1 space-y-1.5">
                {priv.map((p) => (
                  <li key={p.blobId} className="text-neutral-300">
                    <span className="text-neutral-100">{p.text}</span>
                    <span className="mt-0.5 block font-mono text-[11px] text-neutral-500">
                      blob {shortBlob(p.blobId)} · relevance {p.distance.toFixed(3)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="font-medium text-sky-400">Shared support memory</p>
            {shared.length === 0 ? (
              <p className="mt-1 text-neutral-500">Not used for this answer.</p>
            ) : (
              <ul className="mt-1 space-y-1.5">
                {shared.map((p) => (
                  <li key={p.blobId} className="text-neutral-300">
                    <span className="text-neutral-100">{p.text}</span>
                    <span className="mt-0.5 block font-mono text-[11px] text-neutral-500">
                      blob {shortBlob(p.blobId)} · relevance {p.distance.toFixed(3)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="font-medium text-neutral-300">Current conversation</p>
            <p className="mt-1 text-neutral-500">
              {historyTurns > 0
                ? `This session's recent context (${historyTurns} turn${historyTurns === 1 ? "" : "s"}) shaped this answer alongside any memory above.`
                : "No earlier turns this session — answered from your message alone."}
            </p>
          </div>
          {noneUsed && (
            <p className="text-neutral-400">
              No relevant memory found. Meros is starting with the current conversation.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/** Explicit capture after the answer renders. Returns a short UI note. */
async function captureTurn(
  accessCode: string,
  message: string,
  answer: string,
  history: { role: "user" | "assistant"; text: string }[],
  knownTexts: string[],
): Promise<string | null> {
  try {
    const res = await fetch("/api/memory/capture", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ accessCode, message, answer, history, knownTexts }),
    });
    const data = await res.json();
    if (!data.ok) return "Private memory save unavailable right now.";
    const facts = (data.facts ?? []) as { status: string }[];
    if (facts.length === 0) return null;
    const stored = facts.filter((f) => f.status === "stored").length;
    const failed = facts.filter((f) => f.status === "failed").length;
    if (stored > 0 && failed === 0) return `Remembered ${stored} private memor${stored === 1 ? "y" : "ies"} for next time.`;
    if (stored > 0) return `Remembered ${stored}, failed to save ${failed} — retry later.`;
    return "Could not save private memory — nothing was stored.";
  } catch {
    return null;
  }
}

function FixCard({
  accessCode,
  history,
  onClose,
}: {
  accessCode: string;
  history: { role: "user" | "assistant"; text: string }[];
  onClose: () => void;
}) {
  const [state, setState] = useState<FixState>({ status: "preparing" });

  const load = useCallback(async () => {
    setState({ status: "preparing" });
    try {
      const res = await fetch("/api/fixes/candidate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessCode, history }),
      });
      const data = await res.json();
      if (data.ok && data.candidate) {
        setState({ status: "ready", candidate: data.candidate });
      } else if (data.ok) {
        setState({ status: "none" });
      } else {
        setState({ status: "failed", error: data.blocked ?? data.error ?? "Could not prepare a fix." });
      }
    } catch (e) {
      setState({ status: "failed", error: e instanceof Error ? e.message : "Network error." });
    }
  }, [accessCode, history]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveShared = async (candidate: string) => {
    setState({ status: "saving", candidate });
    try {
      const res = await fetch("/api/fixes/promote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessCode, candidate }),
      });
      const data = await res.json();
      if (data.ok && data.status === "stored") {
        setState({ status: "stored", candidate, blobId: data.blobId });
      } else {
        setState({ status: "failed", error: data.error ?? "Shared save failed." });
      }
    } catch (e) {
      setState({ status: "failed", error: e instanceof Error ? e.message : "Network error." });
    }
  };

  return (
    <div className="rounded-lg border border-emerald-900 bg-neutral-900 px-4 py-3">
      <p className="text-sm font-medium text-neutral-100">Turn this resolution into shared support memory?</p>
      <p className="mt-1 text-xs text-neutral-400">
        Only the reusable fix will be shared. Your private context stays private.
      </p>
      {state.status === "preparing" && (
        <p className="mt-3 text-xs text-neutral-500">Preparing sanitized preview…</p>
      )}
      {(state.status === "ready" || state.status === "saving") && (
        <div className="mt-3">
          <pre className="whitespace-pre-wrap rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs leading-5 text-neutral-200">
            {state.candidate}
          </pre>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => void saveShared(state.candidate)}
              disabled={state.status === "saving"}
              className="rounded-md bg-emerald-500 px-4 py-2 text-xs font-medium text-neutral-950 disabled:opacity-40 hover:bg-emerald-400"
            >
              {state.status === "saving" ? "Saving to shared memory…" : "Save shared"}
            </button>
            <button
              onClick={() => setState({ status: "kept-private" })}
              disabled={state.status === "saving"}
              className="rounded-md border border-neutral-700 px-4 py-2 text-xs text-neutral-300 hover:border-neutral-500"
            >
              Keep private
            </button>
          </div>
        </div>
      )}
      {state.status === "stored" && (
        <div className="mt-3">
          <p className="text-xs font-medium text-emerald-400">Stored in shared support memory.</p>
          <p className="mt-1 break-all font-mono text-[11px] text-neutral-400">blob {state.blobId}</p>
          <button onClick={onClose} className="mt-3 rounded-md border border-neutral-700 px-4 py-2 text-xs text-neutral-300 hover:border-neutral-500">
            Back to chat
          </button>
        </div>
      )}
      {state.status === "kept-private" && (
        <div className="mt-3">
          <p className="text-xs text-neutral-300">Kept private — nothing was written to shared memory.</p>
          <button onClick={onClose} className="mt-3 rounded-md border border-neutral-700 px-4 py-2 text-xs text-neutral-300 hover:border-neutral-500">
            Back to chat
          </button>
        </div>
      )}
      {state.status === "none" && (
        <div className="mt-3">
          <p className="text-xs text-neutral-300">No reusable fix found in this conversation — nothing to share.</p>
          <button onClick={onClose} className="mt-3 rounded-md border border-neutral-700 px-4 py-2 text-xs text-neutral-300 hover:border-neutral-500">
            Back to chat
          </button>
        </div>
      )}
      {state.status === "failed" && (
        <div className="mt-3">
          <p className="text-xs text-red-300">{state.error}</p>
          <div className="mt-3 flex gap-2">
            <button onClick={() => void load()} className="rounded-md border border-neutral-700 px-4 py-2 text-xs text-neutral-300 hover:border-neutral-500">
              Retry
            </button>
            <button onClick={onClose} className="rounded-md border border-neutral-700 px-4 py-2 text-xs text-neutral-300 hover:border-neutral-500">
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const [accessCode, setAccessCode] = useState("");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [fixOpen, setFixOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollDown = () => {
    requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
    );
  };

  const transcriptForFix = useCallback(() =>
    messages.flatMap((m): { role: "user" | "assistant"; text: string }[] =>
      m.kind === "user"
        ? [{ role: "user", text: m.text }]
        : [{ role: "assistant", text: m.text }],
    ), [messages]);

  const [fixHistory, setFixHistory] = useState<{ role: "user" | "assistant"; text: string }[]>([]);

  // Accepts an explicit snapshot: the auto-open path in send() must pass the
  // fresh transcript (user confirmation + latest answer), because the
  // `messages` closure there predates this turn's setMessages calls. Without
  // this, the candidate endpoint never sees the confirmation turn and
  // correctly-but-uselessly reports "no reusable fix found".
  const openFixCard = useCallback((snapshot?: { role: "user" | "assistant"; text: string }[]) => {
    setFixHistory(snapshot ?? transcriptForFix());
    setFixOpen(true);
    scrollDown();
  }, [transcriptForFix]);

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending || !accessCode.trim()) return;
    setSending(true);
    setError("");
    const history = messages.flatMap((m): { role: "user" | "assistant"; text: string }[] =>
      m.kind === "user"
        ? [{ role: "user", text: m.text }]
        : [{ role: "assistant", text: m.text }],
    );
    setMessages((prev) => [...prev, { kind: "user", text }]);
    setDraft("");
    scrollDown();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ accessCode, message: text, history }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Something went wrong. Try again.");
        return;
      }
      const assistantIdx = messages.length + 1;
      const knownTexts: string[] = (data.provenance ?? []).map((p: ProvenanceItem) => p.text);
      setMessages((prev) => [
        ...prev,
        {
          kind: "assistant",
          text: data.answer,
          provenance: data.provenance ?? [],
          memoryUsed: data.memoryUsed ?? { private: false, shared: false },
          historyTurns: data.historyTurns ?? history.length,
          degradedMemory: data.degradedMemory === true,
        },
      ]);
      scrollDown();
      if (data.resolutionDetected === true) {
        openFixCard([
          ...history,
          { role: "user", text },
          { role: "assistant", text: data.answer },
        ]);
      }
      // Explicit capture runs AFTER the answer renders (non-blocking for
      // chat latency). The capture endpoint still awaits real Walrus
      // completion per fact and reports honest per-fact status.
      void captureTurn(accessCode, text, data.answer, history, knownTexts).then((note) => {
        if (!note) return;
        setMessages((prev) =>
          prev.map((m, idx) =>
            idx === assistantIdx && m.kind === "assistant" ? { ...m, captureNote: note } : m,
          ),
        );
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error. Try again.");
    } finally {
      setSending(false);
    }
  }, [draft, sending, accessCode, messages, openFixCard]);

  const newConversation = useCallback(() => {
    // Clears the visible session transcript only. Long-term memory stays in
    // Walrus under the same server-derived namespace — cross-session proof
    // must come from recall, never from this local transcript.
    setMessages([]);
    setError("");
    setDraft("");
    setFixOpen(false);
  }, []);

  if (!started) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <p className="text-xs uppercase tracking-widest text-neutral-400">
          Meros · Support memory that compounds
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Solve it once. Remember it for everyone.</h1>
        <p className="mt-4 text-sm leading-6 text-neutral-300">
          Enter your access code to pick up your private support memory. Meros
          remembers your setup across sessions — and learns reusable fixes the
          whole team benefits from.
        </p>
        <div className="mt-6 flex gap-2">
          <input
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && accessCode.trim().length >= 4) setStarted(true);
            }}
            placeholder="e.g. P0-ALICE-01"
            autoComplete="off"
            className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm outline-none placeholder:text-neutral-600 focus:border-emerald-500"
          />
          <button
            onClick={() => accessCode.trim().length >= 4 && setStarted(true)}
            disabled={accessCode.trim().length < 4}
            className="rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-medium text-neutral-950 disabled:opacity-40 hover:bg-emerald-400"
          >
            Start chatting
          </button>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          New here? Any code of 4+ characters works — a brand-new code simply
          starts with no memory yet.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6">
      <header className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500">Meros</p>
          <p className="text-sm text-neutral-300">Support chat with memory</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openFixCard()}
            disabled={messages.length === 0}
            className="rounded-md border border-emerald-800 px-3 py-1.5 text-xs text-emerald-300 disabled:opacity-40 hover:border-emerald-600"
          >
            Mark resolved
          </button>
          <button
            onClick={newConversation}
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-500"
          >
            New conversation
          </button>
        </div>
      </header>

      <div className="flex-1 space-y-4 py-6">
        {messages.length === 0 && (
          <p className="rounded-md border border-neutral-800 bg-neutral-900 px-4 py-3 text-sm text-neutral-400">
            Ask a support question. If Meros remembers relevant context from
            your private memory, it will use it — and show you exactly what it
            used below each answer.
          </p>
        )}
        {messages.map((m, i) =>
          m.kind === "user" ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] whitespace-pre-wrap rounded-lg bg-emerald-600 px-4 py-2.5 text-sm text-white">
                {m.text}
              </p>
            </div>
          ) : (
            <div key={i} className="max-w-[95%]">
              <p className="whitespace-pre-wrap rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm leading-6 text-neutral-100">
                {m.text}
              </p>
              <MemoryLens msg={m} historyTurns={m.historyTurns} />
              {m.degradedMemory === true && (
                <p className="mt-1 text-[11px] text-amber-400/80">Some memory sources were temporarily unavailable. Meros answered from the context it could retrieve.</p>
              )}
              {m.captureNote && (
                <p className="mt-1 text-[11px] text-neutral-500">{m.captureNote}</p>
              )}
            </div>
          ),
        )}
        {fixOpen && (
          <FixCard
            accessCode={accessCode}
            history={fixHistory}
            onClose={() => setFixOpen(false)}
          />
        )}
        {sending && (
          <p className="text-sm text-neutral-500">Meros is recalling memory and answering…</p>
        )}
        {error && (
          <p className="rounded-md border border-red-900 bg-red-950/40 px-4 py-2.5 text-sm text-red-300">
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 border-t border-neutral-800 bg-neutral-950 py-3">
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder="Describe your issue…"
            className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm outline-none placeholder:text-neutral-600 focus:border-emerald-500"
          />
          <button
            onClick={send}
            disabled={sending || !draft.trim()}
            className="rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-medium text-neutral-950 disabled:opacity-40 hover:bg-emerald-400"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
