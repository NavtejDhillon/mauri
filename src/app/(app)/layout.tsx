import { Sidebar } from "@/components/ui/sidebar";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-warm-50">
      <Sidebar />
      <main className="ml-60 p-6">
        {children}
      </main>
    </div>
  );
}
