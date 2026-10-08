"use client";

import { useCallback, useRef, useState } from "react";

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
    };

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

export default function ChatPage() {
  const [accessCode, setAccessCode] = useState("");
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollDown = () => {
    requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
    );
  };

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
      setMessages((prev) => [
        ...prev,
        {
          kind: "assistant",
          text: data.answer,
          provenance: data.provenance ?? [],
          memoryUsed: data.memoryUsed ?? { private: false, shared: false },
          historyTurns: data.historyTurns ?? history.length,
        },
      ]);
      scrollDown();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error. Try again.");
    } finally {
      setSending(false);
    }
  }, [draft, sending, accessCode, messages]);

  const newConversation = useCallback(() => {
    // Clears the visible session transcript only. Long-term memory stays in
    // Walrus under the same server-derived namespace — cross-session proof
    // must come from recall, never from this local transcript.
    setMessages([]);
    setError("");
    setDraft("");
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
        <button
          onClick={newConversation}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-500"
        >
          New conversation
        </button>
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
            </div>
          ),
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
