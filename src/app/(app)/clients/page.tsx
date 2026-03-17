"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { db } from "@/lib/db/schema";
import { ClientRow } from "@/components/clinical/client-row";
import type { Client, Registration } from "@/lib/supabase/types";
import type { SyncableRecord } from "@/lib/db/schema";

type StatusFilter = "all" | "active" | "postnatal" | "discharged" | "transferred";

export default function ClientsPage() {
  const [clients, setClients] = useState<(Client & SyncableRecord)[]>([]);
  const [registrations, setRegistrations] = useState<Map<string, Registration & SyncableRecord>>(new Map());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
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
    }
    load();
  }, []);

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
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-semibold text-sage-900">Clients</h1>
        <Link
          href="/clients/new"
          className="px-4 py-2 text-sm font-medium text-white bg-sage-600 rounded-[10px] hover:bg-sage-700 transition-colors duration-150"
        >
          Add client
        </Link>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or NHI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-white text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
        />
        <div className="flex gap-1">
          {statusOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors duration-150 ${
                statusFilter === opt.value
                  ? "bg-sage-600 text-white border-sage-600"
                  : "bg-white text-warm-600 border-warm-200 hover:border-warm-300"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-[14px] border border-warm-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-warm-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-warm-400">
            {clients.length === 0
              ? "No clients yet. Add your first client to get started."
              : "No clients match your search."}
          </div>
        ) : (
          filtered.map((client) => (
            <ClientRow
              key={client.id}
              client={client}
              registration={registrations.get(client.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}
