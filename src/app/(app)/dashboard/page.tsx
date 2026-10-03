import Link from "next/link";
import { requireReady } from "@/features/auth/require-ready";
import { getProfile } from "@/features/settings/queries";
import { listClients } from "@/features/clients/queries";
import { listGrants } from "@/features/cover/queries";
import { activeCoverGiven } from "@/features/cover/active-cover-given";

export default async function DashboardPage() {
  const me = await requireReady();
  const [profile, clients, grants] = await Promise.all([getProfile(), listClients(), listGrants()]);
  const activeGiven = activeCoverGiven(grants, me, new Date());
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold text-sage-900">Kia ora, {profile.full_name.split(" ")[0]}</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Tile href="/clients" label="Clients" value={clients.length} />
        <Tile href="/cover" label="Active cover given" value={activeGiven} />
      </div>
    </div>
  );
}

function Tile({ href, label, value }: { href: string; label: string; value: number }) {
  return (
    <Link href={href} className="bg-white border border-warm-200 rounded-[14px] p-4 block active:bg-warm-50">
      <p className="text-xs text-warm-400 uppercase tracking-[0.05em]">{label}</p>
      <p className="text-3xl font-semibold text-sage-900 mt-1">{value}</p>
    </Link>
  );
}
