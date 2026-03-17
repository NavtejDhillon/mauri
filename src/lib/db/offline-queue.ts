import { db, type SyncableRecord } from "./schema";
import type { Table } from "dexie";

type SyncableTable =
  | "clients"
  | "registrations"
  | "maternalHistories"
  | "antenatalVisits"
  | "postnatalVisits"
  | "labourBirths"
  | "appointments"
  | "claims";

const TABLE_TO_SUPABASE: Record<SyncableTable, string> = {
  clients: "client",
  registrations: "registration",
  maternalHistories: "maternal_history",
  antenatalVisits: "antenatal_visit",
  postnatalVisits: "postnatal_visit",
  labourBirths: "labour_birth",
  appointments: "appointment",
  claims: "claim",
};

function getTable(tableName: SyncableTable): Table<SyncableRecord> {
  return db[tableName] as unknown as Table<SyncableRecord>;
}

export async function localCreate<T extends SyncableRecord & { created_at?: string }>(
  tableName: SyncableTable,
  record: T
): Promise<T> {
  const now = new Date().toISOString();
  const toSave = {
    ...record,
    created_at: record.created_at || now,
    updated_at: now,
    sync_version: 0,
    _pending_sync: true,
    _sync_action: "create" as const,
  };

  const table = getTable(tableName);
  await table.put(toSave);

  await db.syncQueue.add({
    table: tableName,
    record_id: record.id,
    action: "create",
    created_at: now,
  });

  return toSave as T;
}

export async function localUpdate<T extends SyncableRecord>(
  tableName: SyncableTable,
  id: string,
  changes: Partial<T>
): Promise<void> {
  const now = new Date().toISOString();
  const table = getTable(tableName);

  await table.update(id, {
    ...changes,
    updated_at: now,
    _pending_sync: true,
    _sync_action: "update",
  });

  await db.syncQueue.add({
    table: tableName,
    record_id: id,
    action: "update",
    created_at: now,
  });
}

export async function localDelete(
  tableName: SyncableTable,
  id: string
): Promise<void> {
  const now = new Date().toISOString();
  const table = getTable(tableName);

  await table.update(id, {
    deleted_at: now,
    updated_at: now,
    _pending_sync: true,
    _sync_action: "delete",
  });

  await db.syncQueue.add({
    table: tableName,
    record_id: id,
    action: "delete",
    created_at: now,
  });
}

export async function getPendingCount(): Promise<number> {
  return db.syncQueue.count();
}

export { TABLE_TO_SUPABASE, type SyncableTable };
