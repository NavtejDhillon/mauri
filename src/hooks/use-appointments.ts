"use client";

import { db, type SyncableRecord } from "@/lib/db/schema";
import { localCreate, localUpdate, localDelete } from "@/lib/db/offline-queue";
import type { Appointment } from "@/lib/supabase/types";

export async function createAppointment(
  data: Omit<Appointment, "id" | "created_at" | "updated_at" | "deleted_at" | "sync_version">
): Promise<Appointment> {
  const id = crypto.randomUUID();
  const record = {
    ...data,
    id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
    sync_version: 0,
  } as Appointment & SyncableRecord;
  return localCreate("appointments", record);
}

export async function updateAppointment(
  id: string,
  changes: Partial<Appointment>
): Promise<void> {
  return localUpdate("appointments", id, changes);
}

export async function deleteAppointment(id: string): Promise<void> {
  return localDelete("appointments", id);
}

export async function getAppointmentsForDate(date: string): Promise<(Appointment & SyncableRecord)[]> {
  const all = await db.appointments
    .filter((a) => !a.deleted_at && a.appointment_datetime.startsWith(date))
    .toArray();
  return all.sort((a, b) => a.appointment_datetime.localeCompare(b.appointment_datetime));
}

export async function getAppointmentsForMonth(year: number, month: number): Promise<(Appointment & SyncableRecord)[]> {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const all = await db.appointments
    .filter((a) => !a.deleted_at && a.appointment_datetime.startsWith(prefix))
    .toArray();
  return all.sort((a, b) => a.appointment_datetime.localeCompare(b.appointment_datetime));
}

export async function getUpcomingAppointments(limit = 10): Promise<(Appointment & SyncableRecord)[]> {
  const now = new Date().toISOString();
  const all = await db.appointments
    .filter((a) => !a.deleted_at && a.appointment_datetime >= now && a.status !== "cancelled")
    .toArray();
  return all
    .sort((a, b) => a.appointment_datetime.localeCompare(b.appointment_datetime))
    .slice(0, limit);
}
