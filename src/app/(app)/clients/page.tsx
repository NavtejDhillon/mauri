import type { Metadata } from "next";
import { requireReady } from "@/features/auth/require-ready";
import { listClients } from "@/features/clients/queries";
import { ClientList } from "@/features/clients/client-list";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  await requireReady();
  const clients = await listClients();
  return <ClientList clients={clients} />;
}
