import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { getOwnedWorkspace } from "@/lib/db";
import {
  getCustomerContact,
  getWorkspaceConversation,
  listFixCards,
  listMessages,
} from "@/lib/support-ops";
import { shortBlob } from "@/lib/evidence";
import { StatusPill } from "@/components/meros-ui";

/** Staff conversation detail: persisted thread + provenance + linked Fix Card. */
export default async function ConversationDetail({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const user = await currentUser();
  if (!user) redirect("/login");
  const { slug, id } = await params;
  const ws = await getOwnedWorkspace(user.id, slug);
  if (!ws) redirect("/app");

  // Workspace-scoped: staff see any conversation in THEIR workspace only.
  const summary = await getWorkspaceConversation(ws.id, id);
  if (!summary) redirect(`/app/workspaces/${slug}/conversations`);

  const messages = await listMessages(id);
  const contact = await getCustomerContact(summary.customer_id);
  const cards = (await listFixCards(ws.id)).filter((c) => c.conversation_id === id);

  return (
    <div>
      <p className="text-sm font-medium text-neutral-100">{summary.title}</p>
      <p className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
        <span>{contact.displayName ?? contact.email ?? "Customer"}</span>
        <StatusPill status={summary.status} />
        {summary.resolved_at ? <span>resolved {new Date(summary.resolved_at).toLocaleString()}</span> : ""}
      </p>
      <div className="mt-3 space-y-2">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[95%] rounded-lg border px-3 py-2 text-xs leading-5 ${
              m.role === "user"
                ? "ml-auto border-[rgba(119,255,117,0.3)] bg-[rgba(119,255,117,0.12)] text-white"
                : "border-[rgba(119,255,117,0.14)] bg-[rgba(10,27,18,0.72)] text-neutral-200"
            }`}
          >
            <p className="whitespace-pre-wrap">{m.content}</p>
            {m.role === "assistant" && (m.memory_private_used || m.memory_shared_used) && (
              <p className="mt-1 font-mono text-[10px] text-neutral-500">
                memory: {m.memory_private_used ? "private" : ""}
                {m.memory_private_used && m.memory_shared_used ? " + " : ""}
                {m.memory_shared_used ? "shared" : ""}
                {(m.memory_provenance ?? []).map((p) => ` · ${p.plane}:${shortBlob(p.blobId)}`).join("")}
              </p>
            )}
          </div>
        ))}
        {messages.length === 0 && (
          <p className="text-xs text-neutral-500">No messages yet.</p>
        )}
      </div>
      {cards.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-medium text-neutral-300">Linked Fix Card</p>
          {cards.map((c) => (
            <Link
              key={c.id}
              href={`/app/workspaces/${slug}/fix-cards`}
              className="mt-1 block rounded-md border border-[rgba(119,255,117,0.14)] bg-[rgba(10,27,18,0.72)] px-3 py-2 text-xs text-neutral-300 hover:border-[rgba(119,255,117,0.5)]"
            >
              <span className="font-mono text-[11px] text-neutral-500">{c.status}</span>
              <span className="mt-0.5 block whitespace-pre-wrap">{c.candidate_text.slice(0, 200)}{c.candidate_text.length > 200 ? "…" : ""}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
