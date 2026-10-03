import { listGrants, nameLookup } from "@/features/cover/queries";
import { listClients, currentPractitionerId } from "@/features/clients/queries";
import { displayName } from "@/features/clients/client-card";
import { GrantList } from "@/features/cover/grant-list";

export default async function CoverPage() {
  const [grants, clients, me, names] = await Promise.all([listGrants(), listClients(), currentPractitionerId(), nameLookup()]);
  const clientNames = new Map(clients.map((c) => [c.id, displayName(c)]));
  return <GrantList grants={grants} me={me ?? ""} names={names} clientNames={clientNames} />;
}
