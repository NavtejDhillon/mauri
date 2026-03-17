"use client";

import { useState, useEffect, useCallback } from "react";
import { db } from "@/lib/db/schema";
import { localCreate, localUpdate, localDelete } from "@/lib/db/offline-queue";
import type { Client, Registration } from "@/lib/supabase/types";
import type { SyncableRecord } from "@/lib/db/schema";

export function useClients(filters?: { status?: string; search?: string }) {
  const [clients, setClients] = useState<(Client & SyncableRecord)[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    let results = await db.clients
      .filter((c) => !c.deleted_at)
      .toArray();

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (c) =>
          c.first_name.toLowerCase().includes(q) ||
          c.last_name.toLowerCase().includes(q) ||
          c.nhi?.toLowerCase().includes(q) ||
          c.preferred_name?.toLowerCase().includes(q)
      );
    }

    // If status filter, join with registrations
    if (filters?.status) {
      const registrations = await db.registrations.toArray();
      const clientIdsWithStatus = new Set(
        registrations
          .filter((r) => r.status === filters.status && !r.deleted_at)
          .map((r) => r.client_id)
      );
      results = results.filter((c) => clientIdsWithStatus.has(c.id));
    }

    results.sort((a, b) => a.last_name.localeCompare(b.last_name));
    setClients(results);
    setLoading(false);
  }, [filters?.search, filters?.status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { clients, loading, refresh };
}

export function useClient(id: string) {
  const [client, setClient] = useState<(Client & SyncableRecord) | null>(null);
  const [registration, setRegistration] = useState<(Registration & SyncableRecord) | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const c = await db.clients.get(id);
    setClient(c ?? null);

    if (c) {
      const regs = await db.registrations
        .where("client_id")
        .equals(id)
        .filter((r) => !r.deleted_at)
        .toArray();
      // Get the most recent active registration
      const active = regs.find((r) => r.status === "active" || r.status === "postnatal")
        ?? regs[0] ?? null;
      setRegistration(active);
    }

    setLoading(false);
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { client, registration, loading, refresh };
}

export async function createClient(
  data: Omit<Client, "id" | "created_at" | "updated_at" | "deleted_at" | "sync_version">
): Promise<Client> {
  const id = crypto.randomUUID();
  const record = {
    ...data,
    id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    sync_version: 0,
  } as Client & SyncableRecord;

  return localCreate("clients", record);
}

export async function updateClient(
  id: string,
  changes: Partial<Client>
): Promise<void> {
  return localUpdate("clients", id, changes);
}

export async function deleteClient(id: string): Promise<void> {
  return localDelete("clients", id);
}

export async function createRegistration(
  data: Omit<Registration, "id" | "created_at" | "updated_at" | "deleted_at" | "sync_version">
): Promise<Registration> {
  const id = crypto.randomUUID();
  const record = {
    ...data,
    id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    sync_version: 0,
  } as Registration & SyncableRecord;

  return localCreate("registrations", record);
}
