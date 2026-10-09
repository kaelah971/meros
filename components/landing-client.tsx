"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  return (
    <div className="md:hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Toggle navigation menu"
        className="rounded-md border border-[rgba(119,255,117,0.25)] px-3 py-2 text-sm text-[#F5F7F5]"
      >
        {open ? "✕" : "☰"}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full border-b border-[rgba(119,255,117,0.12)] bg-[#030806]/95 backdrop-blur-md">
          <nav className="flex flex-col gap-1 px-4 py-3 text-sm" aria-label="Mobile">
            {[
              ["How it works", "#how-it-works"],
              ["For organizations", "#organizations"],
              ["For customers", "#customers"],
            ].map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded px-2 py-2 text-[#8E9B93] hover:bg-[rgba(119,255,117,0.06)] hover:text-[#F5F7F5]"
              >
                {label}
              </Link>
            ))}
            <div className="mt-1 flex gap-2 border-t border-[rgba(119,255,117,0.12)] pt-3">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-md border border-[rgba(119,255,117,0.25)] px-4 py-2 text-center text-[13px] text-[#F5F7F5]"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                onClick={() => setOpen(false)}
                className="flex-1 rounded-md bg-[#77FF75] px-4 py-2 text-center text-[13px] font-semibold text-[#030806]"
              >
                Create workspace
              </Link>
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}

export function WorkspaceFinder() {
  const router = useRouter();
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");

  const go = () => {
    const clean = slug.trim().toLowerCase();
    if (!/^[a-z0-9-]{2,32}$/.test(clean)) {
      setError("Use 2–32 characters: lowercase letters, numbers, hyphens.");
      return;
    }
    setError("");
    router.push(`/support/${clean}`);
  };

  return (
    <div className="mt-4">
      <label
        htmlFor="workspace-finder"
        className="text-xs font-medium text-[#8E9B93]"
      >
        Organization or workspace
      </label>
      <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
        <input
          id="workspace-finder"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") go();
          }}
          placeholder="acme"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className="meros-glass-input flex-1 border border-transparent px-3.5 py-2.5 font-mono text-sm text-[#F5F7F5] outline-none placeholder:text-neutral-600 focus:border-[#77FF75]"
        />
        <button
          onClick={go}
          disabled={!slug.trim()}
          className="rounded-xl bg-[#77FF75] px-5 py-2.5 text-sm font-semibold text-[#030806] disabled:opacity-40 hover:bg-[#9AFF8D]"
        >
          Continue
        </button>
      </div>
      {error ? (
        <p className="mt-2 text-xs text-red-300">{error}</p>
      ) : (
        <p className="mt-2 text-xs text-[#8E9B93]">
          Your organization shares this name, or a link like /support/acme.
        </p>
      )}
    </div>
  );
}
