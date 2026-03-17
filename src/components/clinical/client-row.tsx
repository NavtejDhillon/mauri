"use client";

import Link from "next/link";
import { IconChevronRight } from "@/components/ui/icons";
import type { Client, Registration } from "@/lib/supabase/types";
import { GestationBadge } from "./gestation-badge";

interface ClientRowProps {
  client: Client;
  registration?: Registration | null;
}

function getStatusColor(status?: string) {
  switch (status) {
    case "active":
      return "bg-sage-50 text-sage-800 border-sage-100";
    case "postnatal":
      return "bg-sky-50 text-sky-800 border-sky-100";
    case "discharged":
      return "bg-warm-50 text-warm-600 border-warm-200";
    case "transferred":
      return "bg-warm-50 text-warm-600 border-warm-200";
    default:
      return "bg-warm-50 text-warm-400 border-warm-200";
  }
}

export function ClientRow({ client, registration }: ClientRowProps) {
  const displayName = client.preferred_name
    ? `${client.preferred_name} ${client.last_name}`
    : `${client.first_name} ${client.last_name}`;

  return (
    <Link
      href={`/clients/${client.id}`}
      className="flex items-center justify-between px-4 py-3.5 active:bg-warm-50 transition-colors duration-100 border-b border-warm-200 last:border-b-0"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-11 h-11 rounded-full bg-sage-100 flex items-center justify-center text-sm font-medium text-sage-700 flex-shrink-0">
          {client.first_name[0]}
          {client.last_name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-medium text-sage-900 truncate">{displayName}</p>
          <p className="text-xs text-warm-400 truncate">
            {client.nhi && <span className="font-mono">{client.nhi}</span>}
            {client.nhi && registration && " · "}
            {registration?.agreed_edd && (
              <>EDD {new Date(registration.agreed_edd).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}</>
            )}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
        {registration?.agreed_edd && registration.status === "active" && (
          <span className="hidden md:inline-flex">
            <GestationBadge edd={registration.agreed_edd} />
          </span>
        )}
        {registration && (
          <span
            className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${getStatusColor(registration.status)}`}
          >
            {registration.status}
          </span>
        )}
        <IconChevronRight size={18} className="text-warm-300 md:hidden" />
      </div>
    </Link>
  );
}
