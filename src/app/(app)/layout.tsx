import { Sidebar } from "@/components/ui/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-warm-50">
      <Sidebar />
      {/* Mobile: full width with bottom tab padding. Desktop: offset for sidebar */}
      <main className="px-4 pt-4 pb-24 md:ml-60 md:p-6">
        {children}
      </main>
    </div>
  );
}
