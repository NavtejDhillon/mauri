import Link from "next/link";
import { ClientCard } from "./client-card";
import type { ClientSummary } from "./types";

export function ClientList({ clients }: { clients: ClientSummary[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-sage-900">Clients</h1>
        <Link href="/clients/new" className="inline-flex items-center min-h-11 px-4 py-2 text-sm font-medium text-white bg-sage-600 rounded-[10px] hover:bg-sage-700">
          New client
        </Link>
      </div>
      {clients.length === 0 ? (
        <p className="text-sm text-warm-400 bg-white border border-warm-200 rounded-[14px] p-6 text-center">No clients yet. Add your first client to get started.</p>
      ) : (
        <ul className="space-y-2">
          {clients.map((c) => (
            <li key={c.id}>
              <ClientCard client={c} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
