import { requireReady } from "@/features/auth/require-ready";
import { readyForAction } from "@/features/auth/ready-for-action";
import { listClients } from "@/features/clients/queries";
import { searchColleagues } from "@/features/cover/queries";
import { displayName } from "@/features/clients/client-card";
import { NewGrantForm } from "@/features/cover/new-grant-form";

export default async function NewCoverPage() {
  await requireReady();
  const clients = (await listClients()).map((c) => ({ id: c.id, name: displayName(c) }));
  async function search(query: string) {
    "use server";
    const ready = await readyForAction();
    if ("error" in ready) throw new Error(ready.error);
    return searchColleagues(query);
  }
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-sage-900">Give cover</h1>
      <p className="text-sm text-warm-400 md:max-w-lg">The colleague can see, and with cover can write to, the clients you choose, under her own name. Every access is recorded. You can revoke it at any time.</p>
      <NewGrantForm search={search} clients={clients} />
    </div>
  );
}
