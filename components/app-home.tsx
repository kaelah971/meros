"use client";

import { authClient } from "@/lib/better-auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type Org = { organization_id: string; slug: string; name: string; role: string };
type Ws = { slug: string; name: string; productName: string | null; role: string; supportUrl: string };

function OrgCard({ org, origin }: { org: Org; origin: string }) {
  const [workspaces, setWorkspaces] = useState<Ws[] | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [product, setProduct] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/workspaces?organizationId=${encodeURIComponent(org.organization_id)}`);
    const data = await res.json();
    if (data.ok) setWorkspaces(data.workspaces);
  }, [org.organization_id]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async () => {
    setError("");
    setBusy(true);
    try {
      const res = await fetch("/api/workspaces", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          organizationId: org.organization_id,
          name,
          slug: slug || undefined,
          productName: product || undefined,
        }),
      });
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Could not create workspace.");
        return;
      }
      setName("");
      setSlug("");
      setProduct("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  const copyUrl = async (supportUrl: string) => {
    try {
      await navigator.clipboard.writeText(`${origin}${supportUrl}`);
      setCopied(supportUrl);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  };

  return (
    <li className="rounded-md border border-[rgba(119,255,117,0.14)] bg-[rgba(10,27,18,0.72)] px-4 py-3">
      <p className="text-sm font-medium text-neutral-100">{org.name}</p>
      <p className="mt-0.5 text-xs text-neutral-500">
        {org.slug} · your role: {org.role}
      </p>

      {workspaces !== null && workspaces.length > 0 && (
        <ul className="mt-3 space-y-2">
          {workspaces.map((w) => (
            <li key={w.slug} className="rounded-md border border-[rgba(119,255,117,0.14)] bg-[#06100B] px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-neutral-100">{w.name}</p>
                  <p className="font-mono text-[11px] text-neutral-500">
                    slug: {w.slug}
                    {w.productName ? ` · ${w.productName}` : ""}
                  </p>
                </div>
                <Link
                  href={`/app/workspaces/${w.slug}`}
                  className="shrink-0 rounded-md border border-[rgba(119,255,117,0.25)] px-3 py-1.5 text-xs text-neutral-300 hover:border-[rgba(119,255,117,0.5)]"
                >
                  Open
                </Link>
              </div>
              <div className="mt-2 flex items-center gap-2">
                <code className="flex-1 truncate rounded bg-[rgba(10,27,18,0.72)] px-2 py-1 font-mono text-[11px] text-[#9AFF8D]">
                  {origin}{w.supportUrl}
                </code>
                <button
                  onClick={() => void copyUrl(w.supportUrl)}
                  className="shrink-0 rounded-md border border-[rgba(119,255,117,0.25)] px-2 py-1 text-[11px] text-neutral-300 hover:border-[rgba(119,255,117,0.5)]"
                >
                  {copied === w.supportUrl ? "Copied!" : "Copy URL"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 border-t border-[rgba(119,255,117,0.14)] pt-3">
        <p className="text-xs text-neutral-400">New workspace in {org.name}</p>
        <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label="Workspace name"
            placeholder="Workspace name"
            className="rounded-md border border-[rgba(119,255,117,0.25)] bg-[#06100B] px-2 py-1.5 text-xs outline-none placeholder:text-neutral-600 focus:border-[#77FF75]"
          />
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            aria-label="Workspace URL slug (optional)"
            placeholder="slug (optional)"
            className="rounded-md border border-[rgba(119,255,117,0.25)] bg-[#06100B] px-2 py-1.5 text-xs outline-none placeholder:text-neutral-600 focus:border-[#77FF75]"
          />
          <input
            value={product}
            onChange={(e) => setProduct(e.target.value)}
            aria-label="Product name (optional)"
            placeholder="Product name (optional)"
            className="rounded-md border border-[rgba(119,255,117,0.25)] bg-[#06100B] px-2 py-1.5 text-xs outline-none placeholder:text-neutral-600 focus:border-[#77FF75]"
          />
        </div>
        <button
          onClick={() => void create()}
          disabled={busy || name.trim().length < 2}
          className="mt-1.5 rounded-md bg-[#77FF75] px-4 py-1.5 text-xs font-medium text-neutral-950 disabled:opacity-40 hover:bg-[#9AFF8D]"
        >
          {busy ? "Creating…" : "Create workspace"}
        </button>
        {error && <p className="mt-1.5 text-xs text-red-300">{error}</p>}
      </div>
    </li>
  );
}

export function AppHomeClient({ email }: { email: string }) {
  const router = useRouter();
  const [orgs, setOrgs] = useState<Org[] | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
    (async () => {
      const res = await fetch("/api/organizations");
      const data = await res.json();
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!data.ok) {
        setError(data.error ?? "Could not load organizations.");
        return;
      }
      setOrgs(data.organizations);
    })().catch((e) => setError(e instanceof Error ? e.message : "Network error."));
  }, [router]);

  const createOrg = async () => {
    setCreateError("");
    setBusy(true);
    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!data.ok) {
        setCreateError(data.error ?? "Could not create organization.");
        return;
      }
      setName("");
      setOrgs((prev) => [
        ...(prev ?? []),
        {
          organization_id: data.organization.id,
          slug: data.organization.slug,
          name: data.organization.name,
          role: "owner",
        },
      ]);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : "Network error.");
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-6">
      <header className="flex items-center justify-between border-b border-[rgba(119,255,117,0.14)] pb-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-neutral-500">Meros</p>
          <p className="text-sm text-neutral-300">Your organizations</p>
          <p className="text-[11px] text-neutral-500">{email}</p>
        </div>
        <button
          onClick={() => void logout()}
          className="rounded-md border border-[rgba(119,255,117,0.25)] px-3 py-1.5 text-xs text-neutral-300 hover:border-[rgba(119,255,117,0.5)]"
        >
          Sign out
        </button>
      </header>

      {error && <p className="mt-4 text-xs text-red-300">{error}</p>}

      {orgs === null ? (
        <p className="mt-6 text-xs text-neutral-500">Loading…</p>
      ) : orgs.length === 0 ? (
        <div className="mt-6 rounded-md border border-[rgba(119,255,117,0.14)] bg-[rgba(10,27,18,0.72)] px-4 py-3">
          <p className="text-sm font-medium text-neutral-100">Welcome — let&apos;s set up your support workspace</p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-xs leading-5 text-neutral-400">
            <li>Create your organization below, or take the guided setup.</li>
            <li>Inside it, create your first workspace (name, product, URL slug).</li>
            <li>Copy the customer support URL and share it — no demo data needed.</li>
          </ol>
          <Link
            href="/app/onboarding"
            className="mt-3 inline-block rounded-md bg-[#77FF75] px-4 py-2 text-xs font-medium text-neutral-950 hover:bg-emerald-400"
          >
            Start guided setup →
          </Link>
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {orgs.map((o) => (
            <OrgCard key={o.organization_id} org={o} origin={origin} />
          ))}
        </ul>
      )}

      <h2 className="mt-8 text-sm font-medium text-neutral-200">
        {orgs !== null && orgs.length === 0 ? "Step 1 — Create your organization" : "Create organization"}
      </h2>
      <div className="mt-2 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label="Organization name"
          placeholder="e.g. Acme Inc"
          className="flex-1 rounded-md border border-[rgba(119,255,117,0.25)] bg-[rgba(10,27,18,0.72)] px-3 py-2.5 text-sm outline-none placeholder:text-neutral-600 focus:border-[#77FF75]"
        />
        <button
          onClick={() => void createOrg()}
          disabled={busy || name.trim().length < 2}
          className="rounded-md bg-[#77FF75] px-5 py-2.5 text-sm font-medium text-neutral-950 disabled:opacity-40 hover:bg-[#9AFF8D]"
        >
          Create
        </button>
      </div>
      {createError && <p className="mt-2 text-xs text-red-300">{createError}</p>}
    </main>
  );
}
