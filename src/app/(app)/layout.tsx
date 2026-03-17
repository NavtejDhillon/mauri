import { Sidebar } from "@/components/ui/sidebar";
import { TautokoProvider } from "@/components/ai/agent-context";
import { TautokoPanel } from "@/components/ai/tautoko-panel";
import { TautokoFAB } from "@/components/ai/tautoko-fab";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <TautokoProvider>
      <div className="min-h-screen bg-warm-50">
        <Sidebar />
        {/* Mobile: full width with bottom tab padding. Desktop: offset for sidebar */}
        <main className="px-4 pt-4 pb-24 md:ml-60 md:p-6">
          {children}
        </main>
        <TautokoFAB />
        <TautokoPanel />
      </div>
    </TautokoProvider>
  );
}
