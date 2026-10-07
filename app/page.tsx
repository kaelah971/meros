import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-neutral-400">
        Meros · P0 — Real Memory Spine
      </p>
      <h1 className="mt-3 text-3xl font-semibold">
        Prove Walrus remembers before the chatbot talks.
      </h1>
      <p className="mt-4 text-sm leading-6 text-neutral-300">
        This slice does one thing: access code → server-derived private
        namespace → real Walrus Memory Mainnet write → fresh-session semantic
        recall. No chat loop, no shared memory, no marketing UI.
      </p>
      <ol className="mt-6 list-decimal space-y-2 pl-5 text-sm text-neutral-300">
        <li>Enter an access code.</li>
        <li>Write a harmless fictional fact.</li>
        <li>Wait for Stored on Walrus + blob reference.</li>
        <li>Start a fresh session (clear) and recall with the same code.</li>
      </ol>
      <Link
        href="/dev"
        className="mt-8 inline-block rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-medium text-neutral-950 hover:bg-emerald-400"
      >
        Open the P0 diagnostic →
      </Link>
      <p className="mt-6 text-xs text-neutral-500">
        Fictional demo data only. Raw access codes never leave the request body
        as a namespace — the server derives meros:user:&lt;hash&gt; internally.
      </p>
    </main>
  );
}
