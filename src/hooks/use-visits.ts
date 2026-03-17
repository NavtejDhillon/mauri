"use client";

import { db, type SyncableRecord } from "@/lib/db/schema";
import { localCreate, localUpdate } from "@/lib/db/offline-queue";
import type { AntenatalVisit, PostnatalVisit, LabourBirth } from "@/lib/supabase/types";

export async function createAntenatalVisit(
  data: Omit<AntenatalVisit, "id" | "created_at" | "updated_at" | "deleted_at" | "sync_version">
): Promise<AntenatalVisit> {
  const id = crypto.randomUUID();
  const record = {
    ...data,
    id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    sync_version: 0,
  } as AntenatalVisit & SyncableRecord;
  return localCreate("antenatalVisits", record);
}

export async function updateAntenatalVisit(
  id: string,
  changes: Partial<AntenatalVisit>
): Promise<void> {
  return localUpdate("antenatalVisits", id, changes);
}

export async function createPostnatalVisit(
  data: Omit<PostnatalVisit, "id" | "created_at" | "updated_at" | "deleted_at" | "sync_version">
): Promise<PostnatalVisit> {
  const id = crypto.randomUUID();
  const record = {
    ...data,
    id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    sync_version: 0,
  } as PostnatalVisit & SyncableRecord;
  return localCreate("postnatalVisits", record);
}

export async function createLabourBirth(
  data: Omit<LabourBirth, "id" | "created_at" | "updated_at" | "sync_version">
): Promise<LabourBirth> {
  const id = crypto.randomUUID();
  const record = {
    ...data,
    id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sync_version: 0,
  } as LabourBirth & SyncableRecord;
  return localCreate("labourBirths", record);
}

export async function getVisitsForRegistration(registrationId: string) {
  const an = await db.antenatalVisits
    .where("registration_id").equals(registrationId)
    .filter((v) => !v.deleted_at)
    .toArray();
  const pn = await db.postnatalVisits
    .where("registration_id").equals(registrationId)
    .filter((v) => !v.deleted_at)
    .toArray();
  const lb = await db.labourBirths
    .where("registration_id").equals(registrationId)
    .toArray();
  return { antenatal: an, postnatal: pn, labourBirth: lb[0] ?? null };
}
