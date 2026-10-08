import Link from "next/link";

export default function SupportNotFound() {
  return (
    <main className="mx-auto max-w-md px-6 py-16 text-center">
      <p className="font-display text-[11px] tracking-[0.3em] text-[#4CA862]">
        WORKSPACE NOT FOUND
      </p>
      <h1 className="mt-3 text-xl font-semibold text-[#F5F7F5]">
        We couldn&apos;t find that support workspace.
      </h1>
      <p className="mt-2 text-sm leading-6 text-[#8E9B93]">
        Check the name with your organization — workspace names are lowercase,
        like <span className="font-mono text-[#9AFF8D]">acme</span>.
      </p>
      <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
        <Link
          href="/#find"
          className="rounded-md bg-[#77FF75] px-5 py-2.5 text-sm font-semibold text-[#030806] hover:bg-[#9AFF8D]"
        >
          Try another workspace
        </Link>
        <Link
          href="/"
          className="rounded-md border border-[rgba(119,255,117,0.3)] px-5 py-2.5 text-sm text-[#9AFF8D] hover:border-[rgba(119,255,117,0.6)]"
        >
          Back home
        </Link>
      </div>
    </main>
  );
}
