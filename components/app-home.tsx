"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { OwnerShell, PageHeader } from "@/components/meros-ui";

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

  return (
    <OwnerShell
      email={email}
      nav={[{ label: "Organizations", href: "/app" }]}
    >
      <PageHeader
        eyebrow="YOUR ORGANIZATIONS"
        title={orgs !== null && orgs.length === 0 ? "Build your support memory." : `Good to see you, ${email.split("@")[0]}.`}
        lede={
          orgs !== null && orgs.length === 0
            ? "Set up your organization, teach Meros about your product, then share your support workspace."
            : "Each organization below holds its own isolated support workspaces and memory."
        }
      />

      {error && (
        <p role="alert" className="mt-4 text-xs text-red-300">
          {error}
        </p>
      )}

      {orgs === null ? (
        <p className="mt-6 text-xs text-neutral-500">Loading…</p>
      ) : orgs.length === 0 ? (
        <>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "ORGANIZATION", "Tell Meros who you are."],
              ["02", "WORKSPACE", "Create the support destination for your product."],
              ["03", "KNOWLEDGE", "Teach Meros how your product works."],
              ["04", "GO LIVE", "Share your customer support URL."],
            ].map(([n, title, body]) => (
              <div
                key={n}
                className="rounded-xl border border-[rgba(119,255,117,0.16)] bg-[rgba(10,27,18,0.72)] p-4 backdrop-blur-[6px]"
              >
                <p className="font-display text-lg font-bold text-[#4CA862]">{n}</p>
                <p className="font-display mt-1 text-[11px] font-bold tracking-[0.15em] text-[#9AFF8D]">
                  {title}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#8E9B93]">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/app/onboarding"
              className="rounded-md bg-[#77FF75] px-5 py-2.5 text-sm font-semibold text-[#030806] transition-colors hover:bg-[#9AFF8D]"
            >
              Start guided setup →
            </Link>
          </div>
          <div className="meros-card mt-6 rounded-xl p-4 sm:p-5">
            <p className="text-sm font-medium text-neutral-100">Step 1 — Create your organization</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Organization name"
                placeholder="e.g. Acme Inc"
                className="flex-1 rounded-md border border-[rgba(119,255,117,0.25)] bg-[#06100B] px-3 py-2.5 text-sm outline-none placeholder:text-neutral-600 focus:border-[#77FF75]"
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
          </div>
        </>
      ) : (
        <>
          <ul className="mt-4 grid gap-3 lg:grid-cols-2">
            {orgs.map((o) => (
              <OrgCard key={o.organization_id} org={o} origin={origin} />
            ))}
          </ul>
          <div className="meros-card mt-4 rounded-xl p-4 sm:p-5">
            <p className="text-sm font-medium text-neutral-100">+ New organization</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                aria-label="Organization name"
                placeholder="e.g. Acme Inc"
                className="flex-1 rounded-md border border-[rgba(119,255,117,0.25)] bg-[#06100B] px-3 py-2.5 text-sm outline-none placeholder:text-neutral-600 focus:border-[#77FF75]"
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
          </div>
        </>
      )}
    </OwnerShell>
  );
}
