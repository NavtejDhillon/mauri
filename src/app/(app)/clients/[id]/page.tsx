import { requireReady } from "@/features/auth/require-ready";
import { notFound } from "next/navigation";
import { openClient } from "@/features/clients/queries";
import { displayName } from "@/features/clients/display-name";
import { formatDate } from "@/lib/format-date";

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requireReady();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const client = await openClient(id);
  if (!client) notFound();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-sage-900">{displayName(client)}</h1>
      <dl className="bg-white border border-warm-200 rounded-[14px] p-4 space-y-2 text-sm md:max-w-lg">
        <Row label="NHI" value={client.nhi} />
        <Row label="Date of birth" value={client.date_of_birth && formatDate(client.date_of_birth)} />
      </dl>
      <p className="text-xs text-warm-400">The clinical record for this client is built in stage 2.</p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-warm-400">{label}</dt>
      <dd className="text-warm-800 font-medium">{value ?? "-"}</dd>
    </div>
  );
}
