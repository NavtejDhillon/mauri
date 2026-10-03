import { Sidebar } from "@/components/ui/sidebar";
import { requireReady } from "@/features/auth/require-ready";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The pages repeat this gate (cached, so it runs once per request); see requireReady.
  await requireReady();
  return (
    <div className="min-h-screen bg-warm-50">
      <Sidebar />
      <main className="px-4 pt-4 pb-24 md:ml-60 md:p-6">{children}</main>
    </div>
  );
}
