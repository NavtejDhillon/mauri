import { redirect } from "next/navigation";
import { Sidebar } from "@/components/ui/sidebar";
import { createClient } from "@/lib/supabase/server";
import { getAuthState } from "@/features/auth/state";
import { nextStepFor } from "@/features/auth/next-step";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const step = nextStepFor(await getAuthState(supabase));
  if (step) redirect(step);
  return (
    <div className="min-h-screen bg-warm-50">
      <Sidebar />
      <main className="px-4 pt-4 pb-24 md:ml-60 md:p-6">{children}</main>
    </div>
  );
}
