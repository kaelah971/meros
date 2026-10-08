"use client";

import { authClient } from "@/lib/better-auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

function AuthForm({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    setBusy(true);
    try {
      // Better Auth email/password (server at /api/auth/[...all]). Same UI,
      // same 10+ char password rule (enforced server-side by Better Auth).
      const result =
        mode === "signup"
          ? await authClient.signUp.email({
              email: email.trim(),
              password,
              name: displayName.trim() || email.trim().split("@")[0],
            })
          : await authClient.signIn.email({ email: email.trim(), password });
      if (result.error) {
        setError(friendlyAuthError(result.error.message) ?? "Something went wrong.");
        return;
      }
      router.push("/app");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-md px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-neutral-400">Meros · Owner {mode}</p>
      <h1 className="mt-3 text-2xl font-semibold">
        {mode === "signup" ? "Create your owner account" : "Sign in"}
      </h1>
      <div className="mt-6 space-y-2">
        <label className="block text-xs text-neutral-400">
          Work email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            autoComplete="email"
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm outline-none placeholder:text-neutral-600 focus:border-emerald-500"
          />
        </label>
        {mode === "signup" && (
          <label className="block text-xs text-neutral-400">
            Display name (optional)
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              autoComplete="name"
              className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2.5 text-sm outline-none placeholder:text-neutral-600 focus:border-emerald-500"
            />
          </label>
        )}
        <label className="block text-xs text-neutral-400">
          Password {mode === "signup" ? "(10+ characters)" : ""}
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
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
          {busy ? "Please wait…" : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </div>
      <p className="mt-4 text-xs text-neutral-500">
        {mode === "signup" ? (
          <>Already have an account? <Link href="/login" className="text-emerald-300 hover:underline">Sign in</Link></>
        ) : (
          <>New to Meros? <Link href="/signup" className="text-emerald-300 hover:underline">Create an account</Link></>
        )}
      </p>
    </main>
  );
}

/** Map Better Auth failures to safe, non-enumerating UI copy. */
function friendlyAuthError(message: string | undefined): string {
  const m = (message ?? "").toLowerCase();
  if (m.includes("password")) return "Invalid email or password.";
  if (m.includes("not found") || m.includes("invalid email")) return "Invalid email or password.";
  if (m.includes("already exists") || m.includes("already registered"))
    return "An account with this email already exists.";
  return "Something went wrong.";
}

export function SignupPage() {
  return <AuthForm mode="signup" />;
}

export function LoginPage() {
  return <AuthForm mode="login" />;
}
