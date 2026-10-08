import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { PageBackdrop, PageHeader } from "@/components/meros-ui";

/** Owner onboarding: org → workspace → knowledge → ready. No seed needed. */
export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <main className="relative min-h-screen bg-[#030806] text-[#F5F7F5]">
      <PageBackdrop />
      <div className="relative mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[220px_1fr]">
        <div className="hidden md:block">
          <p className="font-display text-[10px] tracking-[0.25em] text-[#4CA862]">SETUP TERMINAL</p>
          <ol className="mt-3 space-y-2 text-[13px] text-[#8E9B93]">
            {["01 Organization", "02 Product", "03 Knowledge", "04 Ready"].map((s) => (
              <li key={s} className="font-display text-[11px] tracking-[0.15em]">{s}</li>
            ))}
          </ol>
        </div>
        <div className="min-w-0">
          <PageHeader
            eyebrow="SET UP YOUR SUPPORT MEMORY"
            title="Get your workspace answering"
            lede="Four steps from account to live support workspace."
          />
          <div className="mt-4">
            <OnboardingWizard />
          </div>
        </div>
      </div>
    </main>
  );
}
