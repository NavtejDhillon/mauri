import { listClients } from "@/features/clients/queries";
import { ClientList } from "@/features/clients/client-list";

export default async function ClientsPage() {
  const clients = await listClients();
  return <ClientList clients={clients} />;
}
