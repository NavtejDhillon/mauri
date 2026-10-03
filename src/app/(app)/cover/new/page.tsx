import type { Metadata } from "next";
import { requireReady } from "@/features/auth/require-ready";
import { readyForAction } from "@/features/auth/ready-for-action";
import { listClients } from "@/features/clients/queries";
import { searchColleagues } from "@/features/cover/queries";
import { displayName } from "@/features/clients/display-name";
import { NewGrantForm } from "@/features/cover/new-grant-form";
import type { ColleagueSearchResult } from "@/features/cover/types";
import { nzToday } from "@/lib/nz-today";

export const metadata: Metadata = { title: "Give cover" };

export default async function NewCoverPage() {
  const me = await requireReady();
  // Only her own clients: the database refuses cover for a client she can see only through
  // someone else's cover.
  const clients = (await listClients()).filter((c) => c.owner_practitioner_id === me).map((c) => ({ id: c.id, name: displayName(c) }));
  async function search(query: string): Promise<ColleagueSearchResult> {
    "use server";
    const ready = await readyForAction();
    if ("error" in ready) return { error: ready.error };
    try {
      return { colleagues: await searchColleagues(query) };
    } catch (e) {
      console.error("search colleagues failed", e);
      return { error: "Search is not working just now. Try again shortly." };
    }
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-sage-900">Give cover</h1>
      <p className="text-sm text-warm-400 md:max-w-lg">The colleague can see, and with cover can write to, the clients you choose, under her own name. Every access is recorded. You can revoke it at any time.</p>
      <NewGrantForm search={search} clients={clients} today={nzToday()} />
    </div>
  );
}
