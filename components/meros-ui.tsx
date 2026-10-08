"use client";

import { authClient } from "@/lib/better-auth-client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";

/**
 * Shared Meros visual primitives. Every user-facing route composes these so
 * the product reads as one family: deep forest-black surfaces, thin luminous
 * green borders, Silkscreen display accents, Inter body text. No backend or
 * routing semantics live here — pure presentation.
 */

export function Wordmark({ size = "text-sm" }: { size?: string }) {
  return (
    <span className={`font-display font-bold tracking-[0.18em] text-[#9AFF8D] ${size}`}>
      MEROS
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-display text-[11px] tracking-[0.3em] text-[#4CA862]">{children}</p>
  );
}

/** App page backdrop: forest-black + faint grid + ambient glow. */
export function PageBackdrop() {
  return (
    <>
      <div className="meros-grid pointer-events-none fixed inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-[420px]"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 0%, rgba(119,255,117,0.07) 0%, transparent 70%)",
        }}
      />
    </>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`meros-card rounded-xl p-4 sm:p-5 ${className}`}>{children}</div>
  );
}

export function PrimaryButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-md bg-[#77FF75] px-4 py-2 text-xs font-semibold text-[#030806] transition-colors hover:bg-[#9AFF8D] disabled:opacity-40 sm:text-sm sm:py-2.5 sm:px-5 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function GhostButton({
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`rounded-md border border-[rgba(119,255,117,0.25)] px-3 py-1.5 text-xs text-[#F5F7F5] transition-colors hover:border-[rgba(119,255,117,0.5)] disabled:opacity-40 ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block text-xs text-[#8E9B93]">
      {label}
      <span className="mt-1 block">{children}</span>
    </label>
  );
}

export const inputClass =
  "w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 py-2.5 text-sm text-[#F5F7F5] outline-none placeholder:text-neutral-600 focus:border-[#77FF75]";

const PILL_STYLES: Record<string, string> = {
  open: "border-[rgba(119,255,117,0.35)] text-[#9AFF8D]",
  resolved: "border-neutral-700 text-neutral-400",
  shared: "border-[rgba(119,255,117,0.35)] text-[#9AFF8D]",
  pending_review: "border-amber-800 text-amber-300",
  kept_private: "border-neutral-700 text-neutral-400",
  failed: "border-red-900 text-red-300",
  owner: "border-[rgba(119,255,117,0.35)] text-[#9AFF8D]",
  admin: "border-[rgba(119,255,117,0.35)] text-[#9AFF8D]",
  support: "border-neutral-700 text-neutral-300",
  default: "border-neutral-700 text-neutral-400",
};

/** Small status pill. Unknown statuses fall back to neutral — never invent. */
export function StatusPill({ status }: { status: string }) {
  const style = PILL_STYLES[status] ?? PILL_STYLES.default;
  return (
    <span
      className={`font-display inline-block rounded border px-2 py-0.5 text-[10px] tracking-[0.15em] uppercase ${style}`}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-dashed border-[rgba(119,255,117,0.2)] bg-[rgba(10,27,18,0.4)] px-4 py-6 text-center">
      <p className="text-sm font-medium text-[#F5F7F5]">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-[#8E9B93]">{body}</p>
    </div>
  );
}

/** Subtle memory-node pulse for loading states. */
export function LoadingDots({ label = "Working…" }: { label?: string }) {
  return (
    <p className="flex items-center gap-2 text-xs text-[#8E9B93]" role="status">
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#77FF75] opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-[#77FF75]" />
      </span>
      {label}
    </p>
  );
}

export type ConsoleNavItem = { label: string; href: string };

/** Branded page heading block: Silkscreen eyebrow + strong title + lede. */
export function PageHeader({
  eyebrow,
  title,
  lede,
}: {
  eyebrow: string;
  title: string;
  lede?: string;
}) {
  return (
    <div>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-2 text-xl font-semibold text-[#F5F7F5] sm:text-2xl">{title}</h1>
      {lede ? <p className="mt-1 max-w-xl text-[13px] leading-5 text-[#8E9B93]">{lede}</p> : null}
    </div>
  );
}

/** Metric card for operational counts. Value only — never invent. */
export function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href?: string;
}) {
  const inner = (
    <>
      <p className="font-display text-2xl font-bold text-[#F5F7F5]">{value}</p>
      <p className="mt-1 text-[11px] tracking-wide text-[#8E9B93]">{label}</p>
    </>
  );
  const cls =
    "block rounded-xl border border-[rgba(119,255,117,0.16)] bg-[rgba(10,27,18,0.72)] px-4 py-3 backdrop-blur-[6px] transition-colors hover:border-[rgba(119,255,117,0.4)]";
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  );
}

/**
 * Owner-level shell for /app routes: sidebar on desktop (wordmark,
 * account, section nav), compact collapsible top bar on mobile.
 * Auth is always verified by the wrapping page — presentation only.
 */
export function OwnerShell({
  email,
  nav,
  children,
}: {
  email: string;
  nav: ConsoleNavItem[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const signOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };
  return (
    <div className="relative min-h-screen bg-[#030806] text-[#F5F7F5]">
      <PageBackdrop />
      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 sm:px-6 md:flex-row md:gap-8">
        <aside className="mb-4 md:mb-0 md:w-60 md:shrink-0" aria-label="Meros owner navigation">
          <div className="flex items-center justify-between gap-2 md:block">
            <div>
              <Link href="/app" aria-label="Meros organizations home">
                <Wordmark />
              </Link>
              <p className="mt-1 truncate text-[11px] text-[#8E9B93]">{email}</p>
            </div>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-label="Toggle owner navigation"
              className="rounded-md border border-[rgba(119,255,117,0.25)] px-3 py-1.5 text-xs text-[#F5F7F5] md:hidden"
            >
              {open ? "✕ Close" : "☰ Menu"}
            </button>
          </div>
          <nav
            aria-label="Owner"
            className={`${open ? "mt-3 block" : "hidden"} md:mt-6 md:block`}
          >
            <p className="font-display hidden text-[10px] tracking-[0.25em] text-[#4CA862] md:mb-2 md:block">
              OWNER
            </p>
            <ul className="flex gap-2 overflow-x-auto md:flex-col md:gap-1 md:overflow-visible">
              {nav.map((item) => (
                <li key={item.href} className="shrink-0">
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-md px-3 py-2 text-[13px] text-[#8E9B93] transition-colors hover:bg-[rgba(119,255,117,0.06)] hover:text-[#F5F7F5]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 hidden border-t border-[rgba(119,255,117,0.12)] pt-3 md:block">
              <button
                onClick={() => void signOut()}
                className="w-full rounded-md border border-[rgba(119,255,117,0.25)] px-3 py-1.5 text-xs text-[#F5F7F5] transition-colors hover:border-[rgba(119,255,117,0.5)]"
              >
                Sign out
              </button>
            </div>
          </nav>
          <div className="mt-3 md:hidden">
            <button
              onClick={() => void signOut()}
              className={`w-full rounded-md border border-[rgba(119,255,117,0.25)] px-3 py-1.5 text-xs text-[#F5F7F5] ${open ? "block" : "hidden"}`}
            >
              Sign out
            </button>
          </div>
        </aside>
        <div className="min-w-0 flex-1 pb-10">{children}</div>
      </div>
    </div>
  );
}

/**
 * Owner console shell: sidebar on desktop, compact top bar + collapsible
 * nav on mobile. Membership is always verified by the wrapping layout —
 * this component is presentation only.
 */
export function ConsoleShell({
  orgName,
  workspaceName,
  workspaceSlug,
  role,
  email,
  nav,
  children,
}: {
  orgName: string;
  workspaceName: string;
  workspaceSlug: string;
  role: string;
  email: string;
  nav: ConsoleNavItem[];
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const signOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col md:flex-row">
      <aside className="border-b border-[rgba(119,255,117,0.12)] bg-[#06100B]/80 md:flex md:w-60 md:shrink-0 md:flex-col md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:block md:px-5 md:py-6">
          <div>
            <Wordmark />
            <p className="mt-1 truncate text-xs text-[#8E9B93]">{orgName}</p>
            <p className="truncate text-[11px] text-[#8E9B93]">{workspaceName}</p>
          </div>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label="Toggle console navigation"
            className="rounded-md border border-[rgba(119,255,117,0.25)] px-3 py-1.5 text-xs text-[#F5F7F5] md:hidden"
          >
            {open ? "✕ Close" : "☰ Menu"}
          </button>
        </div>
        <nav
          aria-label="Workspace console"
          className={`${open ? "block" : "hidden"} px-4 pb-3 md:block md:px-5`}
        >
          <p className="font-display hidden text-[10px] tracking-[0.25em] text-[#4CA862] md:mb-2 md:block">
            CONSOLE
          </p>
          <ul className="space-y-1">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-md px-3 py-2 text-[13px] text-[#8E9B93] transition-colors hover:bg-[rgba(119,255,117,0.06)] hover:text-[#F5F7F5]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t border-[rgba(119,255,117,0.12)] pt-3">
            <p className="truncate px-3 text-[11px] text-[#8E9B93]">{email}</p>
            <p className="px-3 text-[11px] text-[#8E9B93]">
              role: <span className="text-[#9AFF8D]">{role}</span>
            </p>
            <button
              onClick={() => void signOut()}
              className="mt-2 w-full rounded-md border border-[rgba(119,255,117,0.25)] px-3 py-1.5 text-xs text-[#F5F7F5] transition-colors hover:border-[rgba(119,255,117,0.5)]"
            >
              Sign out
            </button>
          </div>
        </nav>
      </aside>
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-6">{children}</div>
    </div>
  );
}
