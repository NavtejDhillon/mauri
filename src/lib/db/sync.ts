import { db, type SyncableRecord, type SyncQueueEntry } from "./schema";
import { TABLE_TO_SUPABASE, type SyncableTable } from "./offline-queue";
import { createClient } from "@/lib/supabase/client";
import type { Table } from "dexie";

function getTable(tableName: SyncableTable): Table<SyncableRecord> {
  return db[tableName] as unknown as Table<SyncableRecord>;
}

function stripSyncMeta<T extends SyncableRecord>(
  record: T
): Omit<T, "_pending_sync" | "_sync_action"> {
  const { _pending_sync, _sync_action, ...rest } = record;
  void _pending_sync;
  void _sync_action;
  return rest;
}

async function pushOne(entry: SyncQueueEntry): Promise<boolean> {
  const supabase = createClient();
  const supabaseTable = TABLE_TO_SUPABASE[entry.table as SyncableTable];
  if (!supabaseTable) return false;

  const table = getTable(entry.table as SyncableTable);
  const record = await table.get(entry.record_id);
  if (!record) {
    // Record was deleted locally before sync - remove queue entry
    return true;
  }

  const clean = stripSyncMeta(record);

  if (entry.action === "create" || entry.action === "update") {
    const { data, error } = await supabase
      .from(supabaseTable)
      .upsert(clean, { onConflict: "id" })
      .select("sync_version")
      .single();

    if (error) {
      console.error(`Sync push error (${entry.action} ${supabaseTable}):`, error);
      return false;
    }

    // Update local record with server sync_version, clear pending flag
    await table.update(entry.record_id, {
      sync_version: data.sync_version,
      _pending_sync: false,
      _sync_action: undefined,
    });
  } else if (entry.action === "delete") {
    // Soft delete: update deleted_at on server
    const { error } = await supabase
      .from(supabaseTable)
      .update({ deleted_at: record.deleted_at, updated_at: record.updated_at })
      .eq("id", entry.record_id);

    if (error) {
      console.error(`Sync push error (delete ${supabaseTable}):`, error);
      return false;
    }

    await table.update(entry.record_id, {
      _pending_sync: false,
      _sync_action: undefined,
    });
  }

  return true;
}

export async function drainSyncQueue(): Promise<{
  pushed: number;
  failed: number;
}> {
  let pushed = 0;
  let failed = 0;

  const entries = await db.syncQueue.orderBy("seq").toArray();

  for (const entry of entries) {
    const success = await pushOne(entry);
    if (success) {
      await db.syncQueue.delete(entry.seq!);
      pushed++;
    } else {
      failed++;
      // Stop on first failure to maintain order
      break;
    }
  }

  return { pushed, failed };
}

export async function pullSync(): Promise<number> {
  const supabase = createClient();
  let totalPulled = 0;

  const tables: SyncableTable[] = [
    "clients",
    "registrations",
    "maternalHistories",
    "antenatalVisits",
    "postnatalVisits",
    "labourBirths",
    "appointments",
    "claims",
  ];

  for (const tableName of tables) {
    const supabaseTable = TABLE_TO_SUPABASE[tableName];
    const table = getTable(tableName);

    // Get watermark
    const state = await db.syncState.get(tableName);
    const lastVersion = state?.last_sync_version ?? 0;

    // Pull records with higher sync_version
    const { data, error } = await supabase
      .from(supabaseTable)
      .select("*")
      .gt("sync_version", lastVersion)
      .order("sync_version", { ascending: true })
      .limit(1000);

    if (error) {
      console.error(`Pull sync error (${supabaseTable}):`, error);
      continue;
    }

    if (!data || data.length === 0) continue;

    let maxVersion = lastVersion;

    for (const serverRecord of data) {
      const localRecord = await table.get(serverRecord.id);

      if (localRecord?._pending_sync) {
        // Local has pending changes - skip (local wins for pending records)
        continue;
      }

      // Server wins for non-pending records
      await table.put({
        ...serverRecord,
        _pending_sync: false,
        _sync_action: undefined,
      });

      if (serverRecord.sync_version > maxVersion) {
        maxVersion = serverRecord.sync_version;
      }
    }

    // Update watermark
    await db.syncState.put({
      table: tableName,
      last_sync_version: maxVersion,
      last_synced_at: new Date().toISOString(),
    });

    totalPulled += data.length;
  }

  return totalPulled;
}

export async function fullSync(): Promise<{
  pulled: number;
  pushed: number;
  failed: number;
}> {
  // Pull first, then push
  const pulled = await pullSync();
  const { pushed, failed } = await drainSyncQueue();
  return { pulled, pushed, failed };
}
