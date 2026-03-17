"use client";

import { db, type SyncableRecord } from "@/lib/db/schema";
import { localCreate, localUpdate } from "@/lib/db/offline-queue";
import type { Claim } from "@/lib/supabase/types";

// Section 94 module amounts (2024/25 rates)
export const MODULE_AMOUNTS: Record<string, number> = {
  first_second_trimester: 1723.86,
  third_trimester: 1035.56,
  labour_birth: 2382.80,
  postnatal: 1368.97,
  acs_complex_social: 300.00,
  acs_complex_clinical: 300.00,
  acs_additional_care: 150.00,
};

export async function createClaim(
  data: Omit<Claim, "id" | "created_at" | "updated_at" | "sync_version">
): Promise<Claim> {
  const id = crypto.randomUUID();
  const record = {
    ...data,
    id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    sync_version: 0,
  } as Claim & SyncableRecord;
  return localCreate("claims", record);
}

export async function updateClaim(
  id: string,
  changes: Partial<Claim>
): Promise<void> {
  return localUpdate("claims", id, changes);
}

export async function getClaimsForRegistration(registrationId: string): Promise<(Claim & SyncableRecord)[]> {
  return db.claims
    .where("registration_id").equals(registrationId)
    .toArray();
}

export async function getAllClaims(): Promise<(Claim & SyncableRecord)[]> {
  return db.claims.toArray();
}

export function getModuleLabel(moduleType: string): string {
  const labels: Record<string, string> = {
    first_second_trimester: "First/second trimester",
    third_trimester: "Third trimester",
    labour_birth: "Labour and birth",
    postnatal: "Postnatal",
    acs_complex_social: "ACS: complex social",
    acs_complex_clinical: "ACS: complex clinical",
    acs_additional_care: "ACS: additional care",
    rpats: "RPaTS",
  };
  return labels[moduleType] || moduleType;
}

export function getStatusColor(status: string): string {
  switch (status) {
    case "draft": return "bg-warm-50 text-warm-600 border-warm-200";
    case "ready": return "bg-sky-50 text-sky-800 border-sky-100";
    case "submitted": return "bg-sage-50 text-sage-800 border-sage-100";
    case "paid": return "bg-sage-100 text-sage-900 border-sage-200";
    case "rejected": return "bg-coral-50 text-coral-700 border-coral-200";
    case "queried": return "bg-amber-50 text-amber-700 border-amber-200";
    default: return "bg-warm-50 text-warm-400 border-warm-200";
  }
}
