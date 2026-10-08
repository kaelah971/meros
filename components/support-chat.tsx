"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { parseBlocks, type BlockNode, type InlineNode } from "@/lib/markdown";
import { recordEvidence, shortBlob } from "@/lib/evidence";
import { authClient } from "@/lib/better-auth-client";

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
      historySnapshot: { role: "user" | "assistant"; text: string }[];
      compare?:
        | { status: "loading" }
        | { status: "done"; baseline: string }
        | { status: "failed"; error: string };
    };

function Inline({ nodes }: { nodes: InlineNode[] }) {
  return (
    <>
      {nodes.map((n, i) =>
        n.t === "bold" ? (
          <strong key={i} className="font-semibold text-neutral-50">{n.v}</strong>
        ) : n.t === "italic" ? (
          <em key={i}>{n.v}</em>
        ) : n.t === "code" ? (
          <code key={i} className="rounded bg-neutral-800 px-1 py-0.5 font-mono text-[12px] text-emerald-300">{n.v}</code>
        ) : (
          <span key={i}>{n.v}</span>
        ),
      )}
    </>
  );
}

/** Safe minimal Markdown: headings, bold, italic, code, lists, paragraphs.
 *  All text renders as React nodes (auto-escaped) — raw HTML can never run. */
function Markdown({ text }: { text: string }) {
  const blocks: BlockNode[] = parseBlocks(text);
  return (
    <div className="space-y-2">
      {blocks.map((b, i) =>
        b.t === "heading" ? (
          b.level === 1 ? (
            <p key={i} className="text-base font-semibold text-neutral-50"><Inline nodes={b.inline} /></p>
          ) : b.level === 2 ? (
            <p key={i} className="text-sm font-semibold text-neutral-50"><Inline nodes={b.inline} /></p>
          ) : (
            <p key={i} className="text-sm font-medium text-neutral-100"><Inline nodes={b.inline} /></p>
          )
        ) : b.t === "ul" ? (
          <ul key={i} className="list-disc space-y-1 pl-5">
            {b.items.map((it, j) => (<li key={j}><Inline nodes={it} /></li>))}
          </ul>
        ) : b.t === "ol" ? (
          <ol key={i} className="list-decimal space-y-1 pl-5">
            {b.items.map((it, j) => (<li key={j}><Inline nodes={it} /></li>))}
          </ol>
        ) : (
          <p key={i}><Inline nodes={b.inline} /></p>
        ),
      )}
    </div>
  );
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

/** Side-by-side proof: original memory-influenced answer vs a fresh
 *  baseline generated with long-term memory deliberately disabled.
 *  The summary is built deterministically from the ORIGINAL provenance —
 *  Gemini is never asked to explain the difference. */
function CompareCard({
  original,
  baseline,
}: {
  original: Extract<Msg, { kind: "assistant" }>;
  baseline: string;
}) {
  const priv = original.provenance.filter((p) => p.plane === "private");
  const shared = original.provenance.filter((p) => p.plane === "shared");
  const used: string[] = [];
  if (priv.length > 0) used.push("private memory");
  if (shared.length > 0) used.push("shared support memory");
  return (
    <div className="mt-2 overflow-hidden rounded-md border border-neutral-700">
      <p className="bg-neutral-800/60 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-neutral-300">
        Memory on vs off — same question, same conversation context
      </p>
      <div className="grid gap-px bg-neutral-800 sm:grid-cols-2">
        <div className="bg-neutral-950 p-3">
          <p className="text-[11px] font-semibold text-emerald-400">WITH MEROS MEMORY</p>
          <div className="mt-1.5 text-xs leading-5 text-neutral-200">
            <Markdown text={original.text} />
          </div>
        </div>
        <div className="bg-neutral-950 p-3">
          <p className="text-[11px] font-semibold text-neutral-400">WITHOUT MEMORY</p>
          <p className="mt-1 text-[11px] text-neutral-500">Fresh generation · no long-term memory consulted</p>
          <div className="mt-1.5 text-xs leading-5 text-neutral-200">
            <Markdown text={baseline} />
          </div>
        </div>
      </div>
      <div className="border-t border-neutral-800 bg-neutral-950 px-3 py-2 text-[11px] text-neutral-400">
        <p className="font-medium text-neutral-300">Why this mattered</p>
        <p className="mt-0.5">
          Private memory: {priv.length > 0 ? `used (${priv.length})` : "not used"} · Shared memory:{" "}
          {shared.length > 0 ? `used (${shared.length})` : "not used"} · Baseline: no long-term memory.
        </p>
        {shared.length > 0 && (
          <ul className="mt-1 space-y-0.5">
            {shared.map((p) => (
              <li key={p.blobId}>
                Shared pattern “{p.text.length > 120 ? `${p.text.slice(0, 120)}…` : p.text}”
                <span className="font-mono text-neutral-500"> · blob {shortBlob(p.blobId)} · relevance {p.distance.toFixed(3)}</span>
              </li>
            ))}
          </ul>
        )}
        {priv.length > 0 && shared.length === 0 && (
          <p className="mt-0.5">Your private context shaped the answer above; the baseline started cold.</p>
        )}
        <p className="mt-0.5 text-neutral-500">
          Built from actual recall provenance ({used.length > 0 ? used.join(" + ") : "none"} influenced the original).
        </p>
      </div>
    </div>
  );
}

/** Explicit capture after the answer renders. Returns a short UI note. */
async function captureTurn(
  workspaceSlug: string,
  message: string,
  answer: string,
  history: { role: "user" | "assistant"; text: string }[],
  knownTexts: string[],
): Promise<string | null> {
  try {
    const res = await fetch("/api/memory/capture", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ workspaceSlug, message, answer, history, knownTexts }),
    });
    const data = await res.json();
    if (!data.ok) return "Private memory save unavailable right now.";
    const facts = (data.facts ?? []) as { status: string; text?: string; blobId?: string }[];
    for (const f of facts) {
      if (f.status === "stored" && f.blobId) {
        recordEvidence({ kind: "private-write", workspace: workspaceSlug, text: f.text ?? "", blobId: f.blobId, status: "stored" });
      }
    }
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

// NOTE: the customer-facing FixCard approval UI (Save shared / Keep
// private) was removed in P8. Customers only ever see the pending-review
// receipt rendered inline above; organization staff review in the console.

export function SupportChat({
  initialWorkspaceSlug = "",
  initialWorkspaceName = "",
  lockWorkspace = false,
  sessionEmail = null,
}: {
  initialWorkspaceSlug?: string;
  initialWorkspaceName?: string;
  lockWorkspace?: boolean;
  /** Present on the real product route: Better Auth session identity. */
  sessionEmail?: string | null;
} = {}) {
  // Product identity is the Better Auth session. No access codes anywhere:
  // the dev console additionally requires the server-side dev flag.
  const isAuth = sessionEmail != null && sessionEmail !== "";
  const [workspaceSlug, setWorkspaceSlug] = useState(initialWorkspaceSlug);
  const [workspaceName, setWorkspaceName] = useState(initialWorkspaceName);
  const [started, setStarted] = useState(isAuth);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [resolvedCard, setResolvedCard] = useState<{ candidateText?: string } | null>(null);
  const [resolving, setResolving] = useState(false);
  const [historyList, setHistoryList] = useState<
    { id: string; title: string; status: string; lastMessageAt: string | null }[] | null
  >(null);
  const [showHistory, setShowHistory] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollDown = () => {
    requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({ behavior: "smooth" }),
    );
  };


  const canStart = workspaceSlug.trim().length >= 2;

  // Identity envelope: workspace route context only. Access codes are never
  // sent — session auth (product) or nothing (dev console, server-gated).
  const identityBody = (extra: Record<string, unknown>) => ({ workspaceSlug, ...extra });

  const send = useCallback(async () => {
    const text = draft.trim();
    if (!text || sending || !workspaceSlug.trim()) return;
    setSending(true);
    setError("");
    setResolvedCard(null);
    const history = messages.flatMap((m): { role: "user" | "assistant"; text: string }[] =>
      m.kind === "user"
        ? [{ role: "user", text: m.text }]
        : [{ role: "assistant", text: m.text }],
    );
    // Idempotency key for this turn: a retried send resumes the same
    // persisted user message instead of duplicating it.
    const clientMessageId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setMessages((prev) => [...prev, { kind: "user", text }]);
    setDraft("");
    scrollDown();
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          identityBody({ message: text, history, conversationId, clientMessageId }),
        ),
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
          historySnapshot: history,
        },
      ]);
      scrollDown();
      if (data.conversation?.id) setConversationId(data.conversation.id);
      // Resolution confirmed: the fix (if any) is already pending staff
      // review server-side. The customer only gets this receipt — never
      // shared-memory controls.
      if (data.resolutionDetected === true) {
        setResolvedCard({
          candidateText: data.fixCard?.candidateText,
        });
      }
      // Explicit capture runs AFTER the answer renders (non-blocking for
      // chat latency). The capture endpoint still awaits real Walrus
      // completion per fact and reports honest per-fact status.
      if (data.workspace?.name) setWorkspaceName(data.workspace.name);
      void captureTurn(workspaceSlug, text, data.answer, history, knownTexts).then((note) => {
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
  }, [draft, sending, workspaceSlug, messages, conversationId, identityBody]);

  const runCompare = useCallback(async (idx: number) => {
    // Controlled rerun: same user message + same conversation context, but
    // the server deliberately skips ALL Walrus recall. Never a new chat
    // turn (original proof untouched), never captured, never promoted.
    const current = messages[idx];
    const prev = messages[idx - 1];
    if (!current || current.kind !== "assistant" || !prev || prev.kind !== "user") return;
    setMessages((p) =>
      p.map((m, i) => (i === idx && m.kind === "assistant" ? { ...m, compare: { status: "loading" } } : m)),
    );
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(identityBody({ message: prev.text, history: current.historySnapshot })),
      });
      const data = await res.json();
      if (!data.ok) {
        setMessages((p) =>
          p.map((m, i) =>
            i === idx && m.kind === "assistant"
              ? { ...m, compare: { status: "failed", error: data.error ?? "Baseline failed." } }
              : m,
          ),
        );
        return;
      }
      recordEvidence({
        kind: "compare",
        workspace: workspaceSlug,
        question: prev.text.length > 140 ? `${prev.text.slice(0, 140)}…` : prev.text,
        privateUsed: current.memoryUsed.private,
        sharedUsed: current.memoryUsed.shared,
        snippets: current.provenance.map((p) => ({
          plane: p.plane,
          text: p.text,
          blobId: p.blobId,
          distance: p.distance,
        })),
        baselineChars: (data.answer as string).length,
      });
      setMessages((p) =>
        p.map((m, i) =>
          i === idx && m.kind === "assistant" ? { ...m, compare: { status: "done", baseline: data.answer } } : m,
        ),
      );
      scrollDown();
    } catch (e) {
      setMessages((p) =>
        p.map((m, i) =>
          i === idx && m.kind === "assistant"
            ? { ...m, compare: { status: "failed", error: e instanceof Error ? e.message : "Network error." } }
            : m,
        ),
      );
    }
  }, [messages, workspaceSlug, identityBody]);

  const newConversation = useCallback(() => {
    // Same user, fresh persistent thread (created server-side on next
    // send). Long-term memory stays in Walrus under the same
    // server-derived namespace — cross-session proof must come from
    // recall, never from this local transcript.
    setMessages([]);
    setError("");
    setDraft("");
    setConversationId(null);
    setResolvedCard(null);
  }, []);

  // Explicit customer resolution for the CURRENT persistent thread.
  const markResolved = useCallback(async () => {
    if (!conversationId || resolving) return;
    setResolving(true);
    setError("");
    try {
      const res = await fetch(`/api/conversations/${conversationId}/resolve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(identityBody({})),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Could not mark resolved.");
        return;
      }
      setResolvedCard({ candidateText: data.fixCard?.candidateText });
      scrollDown();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setResolving(false);
    }
  }, [conversationId, resolving, identityBody]);

  const loadHistoryList = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/conversations?workspaceSlug=${encodeURIComponent(workspaceSlug)}`,
      );
      const data = await res.json();
      if (data.ok) setHistoryList(data.conversations ?? []);
    } catch {
      // History is a convenience; chat works without it.
    }
  }, [workspaceSlug]);

  const openConversation = useCallback(
    async (id: string) => {
      setError("");
      try {
        const res = await fetch(
          `/api/conversations/${id}?workspaceSlug=${encodeURIComponent(workspaceSlug)}`,
        );
        const data = await res.json();
        if (!data.ok) {
          setError(data.error ?? "Could not load conversation.");
          return;
        }
        const turns: { role: "user" | "assistant"; text: string }[] = [];
        const loaded: Msg[] = (data.messages ?? []).map(
          (m: {
            role: string;
            text: string;
            memoryUsed?: { private: boolean; shared: boolean };
            provenance?: ProvenanceItem[];
          }) => {
            const prior = turns.map((t) => ({ ...t }));
            turns.push({
              role: m.role === "assistant" ? "assistant" : "user",
              text: m.text,
            });
            if (m.role !== "assistant") return { kind: "user", text: m.text } as Msg;
            return {
              kind: "assistant",
              text: m.text,
              provenance: m.provenance ?? [],
              memoryUsed: m.memoryUsed ?? { private: false, shared: false },
              historyTurns: prior.length,
              historySnapshot: prior,
            } as Msg;
          },
        );
        setConversationId(data.conversation.id);
        setMessages(loaded);
        setResolvedCard(
          data.conversation.status === "resolved" ? {} : null,
        );
        setShowHistory(false);
        scrollDown();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Network error.");
      }
    },
    [workspaceSlug],
  );

  // Product sign-out: Better Auth clears the session server-side, then a
  // full reload lets the server route render the customer gate again.
  const signOutHere = useCallback(async () => {
    try {
      await authClient.signOut();
    } finally {
      window.location.reload();
    }
  }, []);

  const switchWorkspace = useCallback(() => {
    // Full reset: drop thread, identity, AND workspace. Back to the full
    // temporary gate. Walrus memories are untouched (server-side).
    // Locked (product-route) mode has no workspace to switch: keep the slug.
    setMessages([]);
    setError("");
    setDraft("");
    if (!lockWorkspace) {
      setWorkspaceSlug("");
      setWorkspaceName("");
    }
    setStarted(false);
  }, [lockWorkspace]);

  if (!started) {
    return (
      <main className="mx-auto max-w-xl px-6 py-16">
        <p className="text-xs uppercase tracking-widest text-neutral-400">
          Meros · Support memory that compounds
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Solve it once. Remember it for everyone.</h1>
        <p className="mt-4 text-sm leading-6 text-neutral-300">
          Enter your workspace to pick up your private support memory.
          Memory never crosses workspace boundaries.
        </p>
        <p className="mt-2 inline-block rounded border border-amber-800 bg-amber-950/40 px-2 py-1 text-[11px] text-amber-300">
          Development diagnostic console — disabled in production. Sign-in is still required.
        </p>
        <div className="mt-6 space-y-2">
          {lockWorkspace ? (
            <p className="rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2.5 text-sm text-neutral-200">
              {workspaceName ? `${workspaceName} Support` : workspaceSlug}
            </p>
          ) : (
            <label className="block text-xs text-neutral-400">
              Workspace
              <input
                value={workspaceSlug}
                onChange={(e) => setWorkspaceSlug(e.target.value)}
                placeholder="e.g. acme"
                autoComplete="off"
                className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm outline-none placeholder:text-neutral-600 focus:border-emerald-500"
              />
            </label>
          )}
          <button
            onClick={() => canStart && setStarted(true)}
            disabled={!canStart}
            className="w-full rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-medium text-neutral-950 disabled:opacity-40 hover:bg-emerald-400"
          >
            Continue
          </button>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          New workspaces pick up no memory yet — memory accrues from real conversations.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col px-4 py-6">
      <header className="flex items-center justify-between border-b border-neutral-800 pb-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500">Meros</p>
          <p className="text-sm text-neutral-300">{workspaceName ? `${workspaceName} Support` : "Support chat with memory"}</p>
          <p className="text-[11px] text-neutral-500">
            {isAuth && sessionEmail ? `Signed in as ${sessionEmail}` : "Customer session"} · {workspaceSlug}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => void markResolved()}
            disabled={messages.length === 0 || !conversationId || resolving}
            title="Confirm this issue is resolved"
            className="rounded-md border border-emerald-800 px-3 py-1.5 text-xs text-emerald-300 disabled:opacity-40 hover:border-emerald-600"
          >
            {resolving ? "Resolving…" : "Mark resolved"}
          </button>
          <button
            onClick={() => {
              setShowHistory((v) => !v);
              if (historyList === null) void loadHistoryList();
            }}
            title="Your previous support conversations"
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-500"
          >
            History
          </button>
          <button
            onClick={newConversation}
            title="Same user, fresh thread (your memories stay)"
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-500"
          >
            New conversation
          </button>
          {isAuth ? (
            <button
              onClick={() => void signOutHere()}
              title="Sign out of this support session"
              className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-500"
            >
              Sign out
            </button>
          ) : null}
          {!lockWorkspace && (
            <button
              onClick={switchWorkspace}
              title="Full reset: choose a different workspace"
              className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-500"
            >
              Switch workspace
            </button>
          )}
          <Link
            href="/evidence"
            title="Session-only proof: writes, comparisons, demo card"
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-500"
          >
            Evidence
          </Link>
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
              <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2.5 text-sm leading-6 text-neutral-100">
                <Markdown text={m.text} />
              </div>
              <MemoryLens msg={m} historyTurns={m.historyTurns} />
              {(m.memoryUsed.private || m.memoryUsed.shared) && !m.compare && (
                <button
                  onClick={() => void runCompare(i)}
                  className="mt-1.5 rounded-md border border-neutral-700 px-3 py-1.5 text-[11px] text-neutral-300 hover:border-emerald-700 hover:text-emerald-300"
                >
                  Compare without memory
                </button>
              )}
              {m.compare?.status === "loading" && (
                <p className="mt-1.5 text-[11px] text-neutral-500">Generating no-memory baseline — no Walrus recall, nothing stored…</p>
              )}
              {m.compare?.status === "failed" && (
                <p className="mt-1.5 text-[11px] text-red-300">Baseline failed: {m.compare.error}</p>
              )}
              {m.compare?.status === "done" && (
                <CompareCard original={m} baseline={m.compare.baseline} />
              )}
              {m.degradedMemory === true && (
                <p className="mt-1 text-[11px] text-amber-400/80">Some memory sources were temporarily unavailable. Meros answered from the context it could retrieve.</p>
              )}
              {m.captureNote && (
                <p className="mt-1 text-[11px] text-neutral-500">{m.captureNote}</p>
              )}
            </div>
          ),
        )}
        {showHistory && (
          <div className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-3">
            <p className="text-xs font-medium text-neutral-200">Previous conversations</p>
            {historyList === null ? (
              <p className="mt-1 text-[11px] text-neutral-500">Loading…</p>
            ) : historyList.length === 0 ? (
              <p className="mt-1 text-[11px] text-neutral-500">No previous conversations yet.</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {historyList.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => void openConversation(c.id)}
                      className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 text-left hover:border-neutral-600"
                    >
                      <span className="block truncate text-xs text-neutral-100">{c.title}</span>
                      <span className="mt-0.5 block font-mono text-[10px] text-neutral-500">
                        {c.status}{c.lastMessageAt ? ` · ${new Date(c.lastMessageAt).toLocaleString()}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {resolvedCard && (
          <div className="rounded-lg border border-emerald-900 bg-neutral-900 px-4 py-3">
            <p className="text-sm font-medium text-emerald-300">Resolved. This solution has been sent to the support team for review.</p>
            {resolvedCard.candidateText && (
              <pre className="mt-2 whitespace-pre-wrap rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 font-mono text-xs leading-5 text-neutral-200">
                {resolvedCard.candidateText}
              </pre>
            )}
            <button
              onClick={() => setResolvedCard(null)}
              className="mt-3 rounded-md border border-neutral-700 px-4 py-2 text-xs text-neutral-300 hover:border-neutral-500"
            >
              Dismiss
            </button>
          </div>
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
