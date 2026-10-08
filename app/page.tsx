import Link from "next/link";
import { MobileMenu, WorkspaceFinder } from "@/components/landing-client";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "For organizations", href: "#organizations" },
  { label: "For customers", href: "#customers" },
];

function Wordmark({ size = "text-sm" }: { size?: string }) {
  return (
    <span className={`font-display font-bold tracking-[0.18em] text-[#9AFF8D] ${size}`}>
      MEROS
    </span>
  );
}

/** The Memory Core — glossy dark orb, twin emerald nodes, halo, floor grid. */
function MemoryCore() {
  return (
    <div className="relative mx-auto w-full max-w-[560px]" aria-hidden="true">
      <div className="meros-halo absolute inset-x-0 -top-10 bottom-0" />
      {/* halo ring */}
      <div className="absolute left-1/2 top-[46%] h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(119,255,117,0.12)] sm:h-[360px] sm:w-[360px]" />
      <div className="absolute left-1/2 top-[46%] h-[220px] w-[220px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(119,255,117,0.08)] sm:h-[260px] sm:w-[260px]" />
      {/* core body */}
      <svg viewBox="0 0 400 300" className="relative mx-auto w-full max-w-[420px] drop-shadow-[0_0_45px_rgba(119,255,117,0.18)]">
        <defs>
          <radialGradient id="core-shell" cx="42%" cy="34%" r="75%">
            <stop offset="0%" stopColor="#1c2b22" />
            <stop offset="45%" stopColor="#0b1410" />
            <stop offset="100%" stopColor="#030806" />
          </radialGradient>
          <radialGradient id="core-glow" cx="50%" cy="55%" r="55%">
            <stop offset="0%" stopColor="#77FF75" stopOpacity="0.85" />
            <stop offset="45%" stopColor="#4CA862" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4CA862" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="core-rim" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#9AFF8D" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#4CA862" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#9AFF8D" stopOpacity="0.05" />
          </linearGradient>
        </defs>
        {/* side struts */}
        <rect x="52" y="118" width="52" height="10" rx="5" fill="#0a140f" stroke="rgba(119,255,117,0.25)" />
        <rect x="296" y="118" width="52" height="10" rx="5" fill="#0a140f" stroke="rgba(119,255,117,0.25)" />
        <rect x="62" y="196" width="52" height="10" rx="5" fill="#0a140f" stroke="rgba(119,255,117,0.18)" />
        <rect x="286" y="196" width="52" height="10" rx="5" fill="#0a140f" stroke="rgba(119,255,117,0.18)" />
        {/* shell */}
        <ellipse cx="200" cy="162" rx="98" ry="86" fill="url(#core-shell)" stroke="url(#core-rim)" strokeWidth="1.5" />
        {/* glass highlight */}
        <ellipse cx="168" cy="118" rx="42" ry="24" fill="#F5F7F5" opacity="0.07" transform="rotate(-18 168 118)" />
        {/* inner glow */}
        <ellipse cx="200" cy="168" rx="58" ry="50" fill="url(#core-glow)" />
        {/* twin light nodes */}
        <circle cx="176" cy="162" r="9" fill="#06100B" stroke="#77FF75" strokeWidth="2" />
        <circle cx="176" cy="162" r="3.5" fill="#9AFF8D" />
        <circle cx="224" cy="162" r="9" fill="#06100B" stroke="#77FF75" strokeWidth="2" />
        <circle cx="224" cy="162" r="3.5" fill="#9AFF8D" />
        {/* circuit ticks */}
        {[150, 200, 250].map((x) => (
          <g key={x}>
            <line x1={x} y1="86" x2={x} y2="98" stroke="rgba(119,255,117,0.4)" strokeWidth="1.5" />
            <circle cx={x} cy="83" r="2" fill="none" stroke="rgba(119,255,117,0.4)" />
          </g>
        ))}
        {/* base */}
        <rect x="150" y="244" width="100" height="12" rx="6" fill="#0a140f" stroke="rgba(119,255,117,0.25)" />
      </svg>
      {/* perspective floor */}
      <div className="meros-floor mx-auto -mt-6 h-[130px] w-[130%] max-w-none -translate-x-[11%] sm:h-[150px]" />
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-display text-[11px] tracking-[0.3em] text-[#4CA862]">{children}</p>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#030806] text-[#F5F7F5]">
      {/* backdrop texture */}
      <div className="meros-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[560px]"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(ellipse 55% 45% at 50% 0%, rgba(119,255,117,0.09) 0%, transparent 70%)",
        }}
      />
      {/* crosshair accents */}
      <span aria-hidden="true" className="absolute left-[8%] top-[180px] hidden select-none font-mono text-[#4CA862]/40 md:block">+</span>
      <span aria-hidden="true" className="absolute right-[10%] top-[320px] hidden select-none font-mono text-[#4CA862]/40 md:block">+</span>
      <span aria-hidden="true" className="absolute left-[12%] top-[640px] hidden select-none font-mono text-[#4CA862]/30 lg:block">+</span>

      {/* nav */}
      <header className="sticky top-0 z-20 border-b border-[rgba(119,255,117,0.12)] bg-[#030806]/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="Meros home">
            <Wordmark />
          </Link>
          <nav className="hidden items-center gap-6 text-[13px] text-[#8E9B93] md:flex" aria-label="Primary">
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href} className="transition-colors hover:text-[#F5F7F5]">
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            <Link
              href="/login"
              className="rounded-md border border-[rgba(119,255,117,0.25)] px-4 py-2 text-[13px] text-[#F5F7F5] transition-colors hover:border-[rgba(119,255,117,0.5)]"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-[#77FF75] px-4 py-2 text-[13px] font-semibold text-[#030806] transition-colors hover:bg-[#9AFF8D]"
            >
              Create workspace
            </Link>
          </div>
          <MobileMenu />
        </div>
      </header>

      <main className="relative">
        {/* hero */}
        <section className="mx-auto max-w-5xl px-4 pb-10 pt-14 text-center sm:px-6 sm:pt-20">
          <Eyebrow>MEMORY-NATIVE SUPPORT</Eyebrow>
          <h1 className="font-display mt-5 text-[52px] font-bold leading-none tracking-[0.08em] text-[#F5F7F5] sm:text-[88px]">
            MER<span className="text-[#77FF75]">O</span>S
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-xl font-medium leading-snug text-[#F5F7F5] sm:text-2xl">
            Solve it once.
            <br />
            Remember it for everyone.
          </p>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[#8E9B93]">
            AI support that remembers every customer privately and turns
            approved resolutions into reusable organizational memory.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="font-display w-full rounded-md bg-[#77FF75] px-6 py-3 text-[13px] font-bold tracking-wider text-[#030806] transition-colors hover:bg-[#9AFF8D] sm:w-auto"
            >
              ▸ I RUN A SUPPORT TEAM
            </Link>
            <a
              href="#find"
              className="font-display w-full rounded-md border border-[rgba(119,255,117,0.3)] px-6 py-3 text-[13px] font-bold tracking-wider text-[#9AFF8D] transition-colors hover:border-[rgba(119,255,117,0.6)] sm:w-auto"
            >
              ▸ I NEED SUPPORT
            </a>
          </div>
          <p className="mt-4 text-xs text-[#8E9B93]">
            Organization owner? <Link href="/login" className="text-[#9AFF8D] hover:underline">Sign in</Link>
          </p>
          <div className="mt-6">
            <MemoryCore />
          </div>
        </section>

        {/* customer finder */}
        <section id="find" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-14 sm:px-6">
          <div className="meros-card mx-auto max-w-xl rounded-xl p-6 sm:p-8">
            <Eyebrow>FIND YOUR SUPPORT WORKSPACE</Eyebrow>
            <h2 className="font-display mt-3 text-xl font-bold tracking-wide">I need support</h2>
            <p className="mt-2 text-sm leading-6 text-[#8E9B93]">
              Enter your organization&apos;s workspace name to open its support chat.
              No codes, no namespaces — just sign in.
            </p>
            <WorkspaceFinder />
          </div>
        </section>

        {/* why meros */}
        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold tracking-wide sm:text-3xl">
            Why <span className="text-[#77FF75]">Meros</span>
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["REMEMBERS THE CUSTOMER", "Private customer memory carries useful context across conversations."],
              ["LEARNS FROM RESOLUTIONS", "Solved issues become reviewable Fix Cards instead of disappearing inside old chats."],
              ["HELPS THE NEXT CUSTOMER", "Approved fixes become shared organizational support memory."],
            ].map(([title, body]) => (
              <div key={title} className="meros-card rounded-xl p-5">
                <p className="font-display text-[13px] font-bold leading-6 tracking-wider text-[#9AFF8D]">{title}</p>
                <p className="mt-2 text-[13px] leading-6 text-[#8E9B93]">{body}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-[#8E9B93]">
            Share the fix. <span className="text-[#F5F7F5]">Keep the customer private.</span>
          </p>
        </section>

        {/* how it works */}
        <section id="how-it-works" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-14 sm:px-6">
          <Eyebrow>HOW MEROS LEARNS</Eyebrow>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "Customer asks for help", "A support conversation opens with full private context."],
              ["02", "Meros recalls context", "Private customer memory plus approved organization memory."],
              ["03", "Issue is resolved", "The confirmed fix is captured with the customer's approval."],
              ["04", "Team approves reusable fix", "Staff review a sanitized Fix Card — nothing auto-shares."],
            ].map(([n, title, body]) => (
              <div key={n} className="meros-card relative rounded-xl p-5">
                <p className="font-display text-2xl font-bold text-[#4CA862]">{n}</p>
                <p className="mt-2 text-sm font-medium text-[#F5F7F5]">{title}</p>
                <p className="mt-1 text-xs leading-5 text-[#8E9B93]">{body}</p>
              </div>
            ))}
          </div>
          <div className="meros-card mx-auto mt-4 max-w-2xl rounded-xl p-5 text-center">
            <p className="font-display text-[13px] font-bold tracking-[0.2em] text-[#77FF75]">NEXT CUSTOMER</p>
            <p className="mt-1 text-sm text-[#F5F7F5]">gets the proven pattern first.</p>
          </div>
        </section>

        {/* two sides */}
        <section id="organizations" className="mx-auto max-w-5xl scroll-mt-20 px-4 py-14 sm:px-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="meros-card rounded-xl p-6 sm:p-8">
              <Eyebrow>FOR ORGANIZATIONS</Eyebrow>
              <p className="mt-2 text-sm leading-6 text-[#8E9B93]">
                One support workspace for customers, conversations, issues,
                Fix Cards, and shared memory.
              </p>
              <Link
                href="/signup"
                className="mt-5 inline-block rounded-md bg-[#77FF75] px-5 py-2.5 text-sm font-semibold text-[#030806] transition-colors hover:bg-[#9AFF8D]"
              >
                Create workspace
              </Link>
            </div>
            <div id="customers" className="meros-card scroll-mt-20 rounded-xl p-6 sm:p-8" >
              <Eyebrow>FOR CUSTOMERS</Eyebrow>
              <p className="mt-2 text-lg font-medium text-[#F5F7F5]">Come back without starting over.</p>
              <p className="mt-2 text-sm leading-6 text-[#8E9B93]">
                Meros remembers relevant context privately across support conversations.
              </p>
              <a
                href="#find"
                className="mt-5 inline-block rounded-md border border-[rgba(119,255,117,0.3)] px-5 py-2.5 text-sm font-semibold text-[#9AFF8D] transition-colors hover:border-[rgba(119,255,117,0.6)]"
              >
                Find support
              </a>
            </div>
          </div>
        </section>

        {/* memory proof */}
        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold tracking-wide sm:text-3xl">
            Memory, <span className="text-[#77FF75]">proven</span>
          </h2>
          <div className="mx-auto mt-8 max-w-2xl">
            {[
              ["Alice solves an issue", "A support conversation resolves with a confirmed fix."],
              ["Reusable resolution approved", "Staff review and approve a sanitized Fix Card."],
              ["Shared support memory", "The fix becomes reusable organizational memory."],
              ["Bob gets a better answer", "The next customer with the same symptom skips the long path."],
            ].map(([title, body], i, arr) => (
              <div key={title} className="relative pl-8 pb-6 last:pb-0">
                {i < arr.length - 1 && (
                  <span aria-hidden="true" className="absolute left-[7px] top-5 h-full w-px bg-[rgba(119,255,117,0.25)]" />
                )}
                <span aria-hidden="true" className="absolute left-0 top-1 h-[15px] w-[15px] rounded-full border-2 border-[#77FF75] bg-[#030806]" />
                <p className="text-sm font-medium text-[#F5F7F5]">{title}</p>
                <p className="mt-0.5 text-xs leading-5 text-[#8E9B93]">{body}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-neutral-800 bg-[#06100B] p-4 text-center">
              <p className="font-display text-xs font-bold tracking-[0.2em] text-[#8E9B93]">ALICE PRIVATE CONTEXT</p>
              <p className="font-display mt-2 text-sm font-bold tracking-widest text-neutral-500">🔒 LOCKED</p>
            </div>
            <div className="rounded-xl border border-[rgba(119,255,117,0.3)] bg-[#06100B] p-4 text-center">
              <p className="font-display text-xs font-bold tracking-[0.2em] text-[#9AFF8D]">REUSABLE FIX</p>
              <p className="font-display mt-2 text-sm font-bold tracking-widest text-[#77FF75]">◈ SHARED WITH WORKSPACE</p>
            </div>
          </div>
        </section>

        {/* final CTA */}
        <section className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6">
          <h2 className="font-display text-2xl font-bold tracking-wide sm:text-4xl">
            Support memory that <span className="text-[#77FF75]">compounds</span>.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#8E9B93]">
            Every resolved conversation can make the next one easier.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-md bg-[#77FF75] px-6 py-3 text-sm font-semibold text-[#030806] transition-colors hover:bg-[#9AFF8D] sm:w-auto"
            >
              Create your workspace
            </Link>
            <a
              href="#find"
              className="w-full rounded-md border border-[rgba(119,255,117,0.3)] px-6 py-3 text-sm font-semibold text-[#9AFF8D] transition-colors hover:border-[rgba(119,255,117,0.6)] sm:w-auto"
            >
              Find support
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-[rgba(119,255,117,0.12)]">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6">
          <Wordmark />
          <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-[#8E9B93]" aria-label="Footer">
            <Link href="#how-it-works" className="hover:text-[#F5F7F5]">Product</Link>
            <Link href="#organizations" className="hover:text-[#F5F7F5]">Organizations</Link>
            <Link href="#customers" className="hover:text-[#F5F7F5]">Customers</Link>
            <Link href="/login" className="hover:text-[#F5F7F5]">Sign in</Link>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-[#F5F7F5]">GitHub</a>
          </nav>
        </div>
        <p className="pb-6 text-center text-xs text-[#8E9B93]">
          Solve it once. Remember it for everyone.
        </p>
      </footer>
    </div>
  );
}
