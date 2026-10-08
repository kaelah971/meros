"use client";

import { authClient } from "@/lib/better-auth-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

/**
 * Customer auth gate for /support/[slug]. Same Better Auth email/password
 * system as owners — no separate customer credentials. Workspace comes from
 * the route (prop), never from user input. On success the page refreshes and
 * the server renders the chat for the signed-in customer.
 */
export function CustomerGate({
  workspaceName,
}: {
  workspaceName: string;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      const result =
        tab === "signup"
          ? await authClient.signUp.email({
              email: email.trim(),
              password,
              name: name.trim() || email.trim().split("@")[0],
            })
          : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        setError(friendlyError(result.error.message) ?? "Something went wrong.");
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-neutral-400">
        Meros · {workspaceName} Support
      </p>
      <h1 className="mt-3 text-2xl font-semibold">Get help, pick up where you left off</h1>
      <p className="mt-2 text-sm leading-6 text-neutral-300">
        Sign in so Meros remembers your private context across sessions.
      </p>
      <div className="mt-5 flex gap-1 rounded-md border border-neutral-800 bg-neutral-900 p-1 text-xs">
        {(["signin", "signup"] as const).map((t) => (
          <button
            key={t}
            onClick={() => {
              setTab(t);
              setError("");
            }}
            className={`flex-1 rounded px-3 py-1.5 font-medium ${
              tab === t ? "bg-neutral-700 text-neutral-100" : "text-neutral-400 hover:text-neutral-200"
            }`}
          >
            {t === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-2">
        <label className="block text-xs text-neutral-400">
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm outline-none placeholder:text-neutral-600 focus:border-emerald-500"
          />
        </label>
        {tab === "signup" && (
          <label className="block text-xs text-neutral-400">
            Name (optional)
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm outline-none placeholder:text-neutral-600 focus:border-emerald-500"
            />
          </label>
        )}
        <label className="block text-xs text-neutral-400">
          Password {tab === "signup" ? "(10+ characters)" : ""}
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete={tab === "signup" ? "new-password" : "current-password"}
            onKeyDown={(e) => {
              if (e.key === "Enter") void submit();
            }}
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm outline-none placeholder:text-neutral-600 focus:border-emerald-500"
          />
        </label>
        {error && <p className="text-xs text-red-300">{error}</p>}
        <button
          onClick={() => void submit()}
          disabled={busy || !email.trim() || !password}
          className="w-full rounded-md bg-emerald-500 px-5 py-2.5 text-sm font-medium text-neutral-950 disabled:opacity-40 hover:bg-emerald-400"
        >
          {busy ? "Please wait…" : tab === "signin" ? "Sign in" : "Create account"}
        </button>
      </div>
    </main>
  );
}

function friendlyError(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("password")) return "Invalid email or password.";
  if (m.includes("not found") || m.includes("invalid email")) return "Invalid email or password.";
  if (m.includes("already exists") || m.includes("already registered"))
    return "An account with this email already exists — sign in instead.";
  return "Something went wrong.";
}
