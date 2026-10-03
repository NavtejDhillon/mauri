import Link from "next/link";
import { displayName } from "./display-name";
import type { ClientSummary } from "./types";

export function ClientCard({ client }: { client: ClientSummary }) {
  return (
    <Link
      href={`/clients/${client.id}`}
      className="flex items-center justify-between bg-white border border-warm-200 rounded-[14px] px-4 py-3 active:bg-warm-50"
    >
      <div>
        <p className="text-[15px] font-medium text-sage-900">{displayName(client)}</p>
        <p className="text-xs text-warm-400">{client.nhi ?? "No NHI recorded"}</p>
      </div>
      <span className="text-warm-300" aria-hidden>
        &rsaquo;
      </span>
    </Link>
  );
}
