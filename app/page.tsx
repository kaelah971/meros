import Link from "next/link";
import { MobileMenu, WorkspaceFinder } from "@/components/landing-client";
import { MASCOT_EYES, MerosMascot } from "@/components/meros-mascot";

const NAV_LINKS = [
  { label: "How it works", href: "#how-it-works" },
  { label: "For organizations", href: "#organizations" },
  { label: "For customers", href: "#customers" },
];

const FOOTER_COLUMNS = [
  { title: "PRODUCT", links: NAV_LINKS },
  {
    title: "ACCESS",
    links: [
      { label: "Sign in", href: "/login" },
      { label: "Create workspace", href: "/signup" },
    ],
  },
];

/** Blurred light fields under the footer glass: emerald-led, with teal/blue and a trace of warm/violet. */
const FOOTER_LIGHTS: React.CSSProperties[] = [
  { left: "-10%", top: "50%", width: "50%", height: "80%", background: "rgba(30, 110, 64, 0.34)" },
  { left: "30%", top: "18%", width: "30%", height: "112%", background: "rgba(60, 200, 118, 0.48)", rotate: "32deg" },
  { left: "50%", top: "-22%", width: "24%", height: "92%", background: "rgba(46, 180, 178, 0.4)", rotate: "32deg" },
  { left: "68%", top: "-6%", width: "30%", height: "100%", background: "rgba(70, 108, 214, 0.3)", rotate: "32deg" },
  { left: "45%", top: "42%", width: "9%", height: "70%", background: "rgba(222, 176, 112, 0.2)", rotate: "32deg" },
  { left: "61%", top: "30%", width: "10%", height: "60%", background: "rgba(156, 116, 220, 0.2)", rotate: "32deg" },
];

function Wordmark({ size = "text-sm" }: { size?: string }) {
  return (
    <span className={`font-display font-bold tracking-[0.18em] text-[#9AFF8D] ${size}`}>
      MEROS
    </span>
  );
}

const ICONS = {
  lock: (
    <>
      <rect x="3.5" y="7.25" width="9" height="6.25" rx="1.75" />
      <path d="M5.5 7.25V5.5a2.5 2.5 0 0 1 5 0v1.75" />
    </>
  ),
  book: (
    <path d="M8 4.75C6.9 3.9 5.2 3.5 3 3.5v8.75c2.2 0 3.9.4 5 1.25 1.1-.85 2.8-1.25 5-1.25V3.5c-2.2 0-3.9.4-5 1.25Zm0 0v8.75" />
  ),
  share: (
    <>
      <circle cx="4.25" cy="8" r="1.75" />
      <circle cx="11.75" cy="4.25" r="1.75" />
      <circle cx="11.75" cy="11.75" r="1.75" />
      <path d="M5.8 7.2 10.2 5M5.8 8.8l4.4 2.2" />
    </>
  ),
  check: (
    <>
      <rect x="2.75" y="3" width="10.5" height="10" rx="2.25" />
      <path d="m5.75 8.1 1.6 1.6 3-3.2" />
    </>
  ),
};

/** Glass memory cards orbiting the mascot. `side` = which side of the robot it sits on. */
const MEMORY_CARDS = [
  {
    label: "PRIVATE MEMORY",
    title: "Customer context",
    meta: "Kept private to each customer",
    icon: "lock",
    side: "left",
    place: "md:left-0 md:top-[5%] lg:left-[3%] lg:top-[7%] lg:scale-[0.96]",
    drift: { "--drift-duration": "9s", "--drift-delay": "-2s" },
  },
  {
    label: "SHARED MEMORY",
    title: "Approved team fixes",
    meta: "Reused for the next customer",
    icon: "share",
    side: "right",
    place: "md:right-0 md:top-[14%] lg:right-[4%] lg:top-[13%] lg:scale-[0.96]",
    drift: { "--drift-duration": "11s", "--drift-delay": "-6s" },
  },
  {
    label: "PRODUCT KNOWLEDGE",
    title: "Official workspace context",
    meta: "Written by your team",
    icon: "book",
    side: "left",
    place: "max-md:hidden md:left-0 md:top-[57%] lg:left-[9%] lg:top-[55%]",
    drift: { "--drift-duration": "12s", "--drift-delay": "-4s" },
  },
  {
    label: "FIX CARD",
    title: "Resolution captured",
    meta: "Reviewed before it\u2019s shared",
    icon: "check",
    side: "right",
    place: "max-md:hidden md:right-0 md:top-[62%] lg:right-[10%] lg:top-[60%]",
    drift: { "--drift-duration": "10s", "--drift-delay": "-8s" },
  },
] as const;

const PARTICLES = [
  ["17%", "24%", 3, 0.5],
  ["29%", "74%", 2, 0.4],
  ["37%", "11%", 2, 0.35],
  ["63%", "9%", 3, 0.45],
  ["72%", "34%", 2, 0.4],
  ["84%", "80%", 2, 0.3],
] as const;

/** Hero scene: Meros mascot on a lit memory floor, surrounded by curved glass memory cards. */
function HeroStage() {
  return (
    <div className="relative mx-auto mt-8 w-full max-w-6xl sm:mt-10">
      <div className="relative h-[330px] sm:h-[380px] md:h-[470px] lg:h-[540px]">
        {/* atmosphere */}
        <div aria-hidden="true" className="meros-stage-glow pointer-events-none absolute inset-0" />
        <div
          aria-hidden="true"
          className="meros-floor pointer-events-none absolute left-1/2 top-[80%] h-[34%] w-[160%] -translate-x-1/2 md:w-[110%]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[84%] -translate-x-1/2 -translate-y-1/2">
          <div className="relative h-[64px] w-[330px] rounded-[50%] border border-[rgba(119,255,117,0.22)] sm:h-[74px] sm:w-[400px] lg:h-[92px] lg:w-[500px]">
            <span className="absolute left-0 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#9AFF8D] shadow-[0_0_10px_2px_rgba(119,255,117,0.5)]" />
            <span className="absolute right-0 top-1/2 h-1.5 w-1.5 -translate-y-1/2 translate-x-1/2 rounded-full bg-[#9AFF8D] shadow-[0_0_10px_2px_rgba(119,255,117,0.5)]" />
          </div>
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[84%] hidden h-[150px] w-[820px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border border-[rgba(119,255,117,0.08)] md:block"
        />
        {PARTICLES.map(([left, top, size, opacity]) => (
          <span
            key={`${left}-${top}`}
            aria-hidden="true"
            className="pointer-events-none absolute hidden rounded-full bg-[#9AFF8D] sm:block"
            style={{ left, top, width: size, height: size, opacity, boxShadow: "0 0 8px rgba(119,255,117,0.6)" }}
          />
        ))}

        {/* mascot */}
        <div
          aria-hidden="true"
          className="meros-shadow pointer-events-none absolute left-1/2 top-[84%] h-6 w-[150px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(0,0,0,0.85),transparent)] sm:w-[180px] lg:h-8 lg:w-[230px]"
        />
        <div className="absolute bottom-[16%] left-1/2 w-[216px] -translate-x-1/2 sm:w-[240px] md:w-[280px] lg:w-[330px]">
          <div className="meros-float relative">
            <MerosMascot className="relative block h-auto w-full" />
            {MASCOT_EYES.map((pos) => (
              <span
                key={pos.left}
                aria-hidden="true"
                className="meros-eye-glow meros-breathe pointer-events-none absolute aspect-square w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={pos}
              />
            ))}
          </div>
        </div>
      </div>

      {/* glass memory cards: in flow beneath the mascot on mobile, orbiting it from md up */}
      <ul
        aria-label="What Meros remembers"
        className="relative z-10 -mt-12 grid grid-cols-2 gap-3 text-left sm:-mt-14 md:absolute md:inset-0 md:mt-0 md:block"
      >
        {MEMORY_CARDS.map((card) => (
          <li
            key={card.label}
            data-side={card.side}
            className={`meros-glass meros-drift md:absolute md:w-[228px] lg:w-[248px] ${card.place}`}
            style={card.drift as React.CSSProperties}
          >
            <div className="meros-glass-pane px-4 pb-4 pt-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="font-display whitespace-nowrap text-[10px] leading-none tracking-[0.14em] text-[#9AFF8D]">
                  {card.label}
                </p>
                <span aria-hidden="true" className="meros-glass-chip hidden sm:grid">
                  <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                    {ICONS[card.icon]}
                  </svg>
                </span>
              </div>
              <p className="mt-2.5 text-[14px] font-medium leading-snug text-[#F5F7F5] sm:mt-2 sm:text-[15px]">
                {card.title}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#8E9B93]">{card.meta}</p>
            </div>
          </li>
        ))}
      </ul>
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
        <section className="px-4 pb-10 pt-14 sm:px-6 sm:pt-20">
          <div className="mx-auto max-w-5xl text-center">
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
          </div>
          <HeroStage />
        </section>

        {/* customer finder */}
        <section id="find" className="meros-ambient mx-auto max-w-5xl scroll-mt-20 px-4 py-14 sm:px-6">
          <div className="meros-glass mx-auto max-w-xl">
            <div className="meros-glass-pane p-6 sm:p-8">
              <Eyebrow>FIND YOUR SUPPORT WORKSPACE</Eyebrow>
              <h2 className="font-display mt-3 text-xl font-bold tracking-wide">I need support</h2>
              <p className="mt-2 text-sm leading-6 text-[#8E9B93]">
                Enter your organization&apos;s workspace name to open its support chat.
                No codes, no namespaces — just sign in.
              </p>
              <WorkspaceFinder />
            </div>
          </div>
        </section>

        {/* why meros */}
        <section className="meros-ambient mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="text-center font-display text-2xl font-bold tracking-wide sm:text-3xl">
            Why <span className="text-[#77FF75]">Meros</span>
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              ["REMEMBERS THE CUSTOMER", "Private customer memory carries useful context across conversations."],
              ["LEARNS FROM RESOLUTIONS", "Solved issues become reviewable Fix Cards instead of disappearing inside old chats."],
              ["HELPS THE NEXT CUSTOMER", "Approved fixes become shared organizational support memory."],
            ].map(([title, body]) => (
              <div key={title} className="meros-surface p-6">
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
        <section id="how-it-works" className="meros-ambient mx-auto max-w-5xl scroll-mt-20 px-4 py-14 sm:px-6">
          <Eyebrow>HOW MEROS LEARNS</Eyebrow>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["01", "Customer asks for help", "A support conversation opens with full private context."],
              ["02", "Meros recalls context", "Private customer memory plus approved organization memory."],
              ["03", "Issue is resolved", "The confirmed fix is captured with the customer's approval."],
              ["04", "Team approves reusable fix", "Staff review a sanitized Fix Card — nothing auto-shares."],
            ].map(([n, title, body]) => (
              <div key={n} className="meros-surface meros-surface-sm p-5">
                <p className="font-display text-2xl font-bold text-[#4CA862]">{n}</p>
                <p className="mt-2 text-sm font-medium text-[#F5F7F5]">{title}</p>
                <p className="mt-1 text-xs leading-5 text-[#8E9B93]">{body}</p>
              </div>
            ))}
          </div>
          <div data-tone="accent" className="meros-surface mx-auto mt-4 max-w-2xl p-5 text-center">
            <p className="font-display text-[13px] font-bold tracking-[0.2em] text-[#77FF75]">NEXT CUSTOMER</p>
            <p className="mt-1 text-sm text-[#F5F7F5]">gets the proven pattern first.</p>
          </div>
        </section>

        {/* two sides */}
        <section id="organizations" className="meros-ambient mx-auto max-w-5xl scroll-mt-20 px-4 py-14 sm:px-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="meros-surface meros-surface-lg p-6 sm:p-8">
              <Eyebrow>FOR ORGANIZATIONS</Eyebrow>
              <p className="mt-2 text-sm leading-6 text-[#8E9B93]">
                One support workspace for customers, conversations, issues,
                Fix Cards, and shared memory.
              </p>
              <Link
                href="/signup"
                className="mt-5 inline-block rounded-xl bg-[#77FF75] px-5 py-2.5 text-sm font-semibold text-[#030806] transition-colors hover:bg-[#9AFF8D]"
              >
                Create workspace
              </Link>
            </div>
            <div id="customers" className="meros-surface meros-surface-lg scroll-mt-20 p-6 sm:p-8">
              <Eyebrow>FOR CUSTOMERS</Eyebrow>
              <p className="mt-2 text-lg font-medium text-[#F5F7F5]">Come back without starting over.</p>
              <p className="mt-2 text-sm leading-6 text-[#8E9B93]">
                Meros remembers relevant context privately across support conversations.
              </p>
              <a
                href="#find"
                className="mt-5 inline-block rounded-xl border border-[rgba(119,255,117,0.3)] px-5 py-2.5 text-sm font-semibold text-[#9AFF8D] transition-colors hover:border-[rgba(119,255,117,0.6)]"
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
            <div data-tone="muted" className="meros-surface meros-surface-sm p-4 text-center">
              <p className="font-display text-xs font-bold tracking-[0.2em] text-[#8E9B93]">ALICE PRIVATE CONTEXT</p>
              <p className="font-display mt-2 text-sm font-bold tracking-widest text-neutral-500">🔒 LOCKED</p>
            </div>
            <div data-tone="accent" className="meros-surface meros-surface-sm p-4 text-center">
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

      <div aria-hidden="true" className="meros-footer-approach pointer-events-none relative -mt-6 h-20 sm:h-24" />
      <footer className="meros-footer">
        {/* light fields glowing beneath the smoked glass */}
        {FOOTER_LIGHTS.map((style, i) => (
          <span key={i} aria-hidden="true" className="meros-footer-blob" style={style} />
        ))}
        <div aria-hidden="true" className="meros-footer-glass" />
        <div aria-hidden="true" className="meros-grain" />

        <div className="mx-auto max-w-5xl px-4 pb-8 pt-14 sm:px-6 sm:pt-20">
          <div className="grid gap-12 md:grid-cols-[1.5fr_1fr] lg:grid-cols-[1.8fr_1fr]">
            <div className="max-w-sm">
              <Link href="/" aria-label="Meros home" className="inline-block">
                <Wordmark size="text-base" />
              </Link>
              <p className="mt-4 text-balance text-sm leading-6 text-[#A3B0A8]">
                Memory-native support that learns from every resolved issue.
              </p>
              <p className="mt-8 text-lg font-medium leading-snug text-[#F5F7F5] sm:text-xl">
                Solve it once.
                <br />
                Remember it for everyone.
              </p>
            </div>
            <nav aria-label="Footer" className="grid grid-cols-2 gap-8">
              {FOOTER_COLUMNS.map((col) => (
                <div key={col.title}>
                  <p className="font-display text-[10px] tracking-[0.24em] text-[#86D993]">{col.title}</p>
                  <ul className="mt-4 space-y-1">
                    {col.links.map((l) => (
                      <li key={l.href}>
                        <Link
                          href={l.href}
                          className="-mx-1 inline-block rounded-md px-1 py-1.5 text-sm text-[#C3CEC7] transition-colors hover:text-[#9AFF8D]"
                        >
                          {l.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </div>
          <div className="mt-14 flex flex-col gap-2 border-t border-white/[0.08] pt-6 text-xs text-[#8E9B93] sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} Meros</p>
            <p>
              Share the fix. <span className="text-[#C3CEC7]">Keep the customer private.</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
