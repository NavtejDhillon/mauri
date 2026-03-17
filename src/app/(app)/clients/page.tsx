"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db/schema";
import { ClientRow } from "@/components/clinical/client-row";
import { MobileHeader } from "@/components/ui/mobile-header";
import { FAB } from "@/components/ui/fab";
import { SkeletonList } from "@/components/ui/skeleton";
import { PullToRefresh } from "@/components/ui/pull-to-refresh";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import { IconSearch, IconPhone, IconEdit } from "@/components/ui/icons";
import type { Client, Registration } from "@/lib/supabase/types";
import type { SyncableRecord } from "@/lib/db/schema";

type StatusFilter = "all" | "active" | "postnatal" | "discharged" | "transferred";

export default function ClientsPage() {
  const router = useRouter();
  const [clients, setClients] = useState<(Client & SyncableRecord)[]>([]);
  const [registrations, setRegistrations] = useState<Map<string, Registration & SyncableRecord>>(new Map());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const allClients = await db.clients.filter((c) => !c.deleted_at).toArray();
    const allRegs = await db.registrations.filter((r) => !r.deleted_at).toArray();

    const regMap = new Map<string, Registration & SyncableRecord>();
    for (const reg of allRegs) {
      const existing = regMap.get(reg.client_id);
      if (!existing || reg.status === "active" || reg.status === "postnatal") {
        regMap.set(reg.client_id, reg);
      }
    }

    setClients(allClients);
    setRegistrations(regMap);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = clients.filter((c) => {
    if (search) {
      const q = search.toLowerCase();
      const matches =
        c.first_name.toLowerCase().includes(q) ||
        c.last_name.toLowerCase().includes(q) ||
        c.nhi?.toLowerCase().includes(q) ||
        c.preferred_name?.toLowerCase().includes(q);
      if (!matches) return false;
    }
    if (statusFilter !== "all") {
      const reg = registrations.get(c.id);
      if (!reg || reg.status !== statusFilter) return false;
    }
    return true;
  }).sort((a, b) => a.last_name.localeCompare(b.last_name));

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "active", label: "Active" },
    { value: "postnatal", label: "Postnatal" },
    { value: "discharged", label: "Discharged" },
    { value: "transferred", label: "Transferred" },
  ];

  return (
    <PullToRefresh onRefresh={loadData}>
    <div>
      <MobileHeader
        title="Clients"
        rightAction={
          <Link
            href="/clients/new"
            className="hidden md:inline-flex px-4 py-2 text-sm font-medium text-white bg-sage-600 rounded-[10px] hover:bg-sage-700 transition-colors duration-150"
          >
            Add client
          </Link>
        }
      />

      {/* Search bar */}
      <div className="relative mb-3">
        <IconSearch size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400" />
        <input
          type="text"
          placeholder="Search by name or NHI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 md:py-2 text-sm border border-warm-200 rounded-[10px] bg-white text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
        />
      </div>

      {/* Status filter pills — horizontally scrollable on mobile */}
      <div className="flex gap-1.5 mb-4 overflow-x-auto scroll-pills pb-1">
        {statusOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => setStatusFilter(opt.value)}
            className={`flex-shrink-0 px-3.5 py-2 md:py-1.5 text-xs font-medium rounded-full border transition-colors duration-150 active:scale-95 ${
              statusFilter === opt.value
                ? "bg-sage-600 text-white border-sage-600"
                : "bg-white text-warm-600 border-warm-200"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Client list */}
      {loading ? (
        <SkeletonList count={6} />
      ) : (
        <div className="bg-white rounded-[14px] border border-warm-200 overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-6 text-sm text-warm-400 text-center">
              {clients.length === 0
                ? "No clients yet. Tap + to add your first client."
                : "No clients match your search."}
            </div>
          ) : (
            filtered.map((client) => (
              <SwipeableRow
                key={client.id}
                rightActions={[
                  ...(client.phone ? [{
                    label: "Call",
                    icon: <IconPhone size={18} />,
                    color: "bg-sage-600",
                    onAction: () => window.open(`tel:${client.phone}`),
                  }] : []),
                  {
                    label: "Edit",
                    icon: <IconEdit size={18} />,
                    color: "bg-sky-600",
                    onAction: () => router.push(`/clients/${client.id}/edit`),
                  },
                ]}
              >
                <ClientRow
                  client={client}
                  registration={registrations.get(client.id)}
                />
              </SwipeableRow>
            ))
          )}
        </div>
      )}

      {/* FAB for mobile — add client */}
      <div className="md:hidden">
        <FAB onClick={() => router.push("/clients/new")} label="Add client" />
      </div>
    </div>
    </PullToRefresh>
  );
}
