import { requireReady } from "@/features/auth/require-ready";
import { listGrants, nameLookup } from "@/features/cover/queries";
import { listClients } from "@/features/clients/queries";
import { displayName } from "@/features/clients/display-name";
import { GrantList } from "@/features/cover/grant-list";

export default async function CoverPage() {
  const me = await requireReady();
  const [grants, clients, names] = await Promise.all([listGrants(), listClients(), nameLookup()]);
  const clientNames = new Map(clients.map((c) => [c.id, displayName(c)]));
  return <GrantList grants={grants} me={me} names={names} clientNames={clientNames} />;
}
