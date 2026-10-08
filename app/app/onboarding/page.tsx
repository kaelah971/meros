import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { OnboardingWizard } from "@/components/onboarding-wizard";

/** Owner onboarding: org → workspace → knowledge → ready. No seed needed. */
export default async function OnboardingPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <p className="font-display text-[11px] tracking-[0.3em] text-[#4CA862]">
        SET UP YOUR SUPPORT MEMORY
      </p>
      <h1 className="mt-2 text-2xl font-semibold text-neutral-100">
        Get your workspace answering
      </h1>
      <div className="mt-4">
        <OnboardingWizard />
      </div>
    </main>
  );
}
