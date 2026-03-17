import Dexie, { type Table } from "dexie";
import type {
  Client,
  Registration,
  MaternalHistory,
  AntenatalVisit,
  PostnatalVisit,
  LabourBirth,
  Appointment,
  Claim,
  Attachment,
} from "@/lib/supabase/types";

export interface SyncableRecord {
  id: string;
  sync_version: number;
  updated_at: string;
  deleted_at?: string | null;
  _pending_sync?: boolean;
  _sync_action?: "create" | "update" | "delete";
}

export interface SyncQueueEntry {
  seq?: number;
  table: string;
  record_id: string;
  action: "create" | "update" | "delete";
  created_at: string;
}

export interface SyncState {
  table: string;
  last_sync_version: number;
  last_synced_at: string;
}

export class MauriDB extends Dexie {
  clients!: Table<Client & SyncableRecord>;
  registrations!: Table<Registration & SyncableRecord>;
  maternalHistories!: Table<MaternalHistory & SyncableRecord>;
  antenatalVisits!: Table<AntenatalVisit & SyncableRecord>;
  postnatalVisits!: Table<PostnatalVisit & SyncableRecord>;
  labourBirths!: Table<LabourBirth & SyncableRecord>;
  appointments!: Table<Appointment & SyncableRecord>;
  claims!: Table<Claim & SyncableRecord>;
  attachments!: Table<Attachment & SyncableRecord>;
  syncQueue!: Table<SyncQueueEntry>;
  syncState!: Table<SyncState>;

  constructor() {
    super("mauri");
    this.version(1).stores({
      clients: "id, nhi, last_name, updated_at, _pending_sync",
      registrations: "id, client_id, status, updated_at, _pending_sync",
      maternalHistories: "id, client_id, updated_at",
      antenatalVisits:
        "id, registration_id, visit_date, updated_at, _pending_sync",
      postnatalVisits:
        "id, registration_id, visit_date, updated_at, _pending_sync",
      labourBirths: "id, registration_id, updated_at",
      appointments:
        "id, appointment_datetime, client_id, status, _pending_sync",
      claims: "id, registration_id, status, updated_at, _pending_sync",
      syncQueue: "++seq, table, record_id, action, created_at",
      syncState: "table",
    });

    this.version(2).stores({
      clients: "id, nhi, last_name, updated_at, _pending_sync",
      registrations: "id, client_id, status, updated_at, _pending_sync",
      maternalHistories: "id, client_id, updated_at",
      antenatalVisits:
        "id, registration_id, visit_date, updated_at, _pending_sync",
      postnatalVisits:
        "id, registration_id, visit_date, updated_at, _pending_sync",
      labourBirths: "id, registration_id, updated_at",
      appointments:
        "id, appointment_datetime, client_id, status, _pending_sync",
      claims: "id, registration_id, status, updated_at, _pending_sync",
      attachments: "id, client_id, registration_id, attachment_type, _pending_sync",
      syncQueue: "++seq, table, record_id, action, created_at",
      syncState: "table",
    });
  }
}

export const db = new MauriDB();
