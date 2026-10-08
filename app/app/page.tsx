import { redirect } from "next/navigation";
import { currentUser } from "@/lib/auth";
import { AppHomeClient } from "@/components/app-home";

/** Server-protected: anonymous requests redirect before any owner UI renders. */
export default async function AppPage() {
  const user = await currentUser();
  if (!user) redirect("/login");
  return <AppHomeClient email={user.email} />;
}
