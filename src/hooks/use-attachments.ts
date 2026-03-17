"use client";

import { db } from "@/lib/db/schema";
import { localCreate, localDelete } from "@/lib/db/offline-queue";
import type { Attachment, AttachmentType } from "@/lib/supabase/types";

export async function createAttachment(
  data: Omit<Attachment, "id" | "created_at" | "deleted_at" | "sync_version">
): Promise<Attachment> {
  const id = crypto.randomUUID();
  const record = {
    ...data,
    id,
    created_at: new Date().toISOString(),
    deleted_at: null,
    sync_version: 0,
  } as Attachment;

  await localCreate("attachments", record as Attachment & { updated_at: string; _pending_sync?: boolean; _sync_action?: "create" | "update" | "delete" });
  return record;
}

export async function deleteAttachment(id: string): Promise<void> {
  await localDelete("attachments", id);
}

export async function getAttachmentsForClient(clientId: string): Promise<Attachment[]> {
  return db.attachments
    .where("client_id")
    .equals(clientId)
    .filter((a) => !a.deleted_at)
    .toArray();
}

/** Store file data as a base64 data URL in IndexedDB for offline access */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function getAttachmentTypeLabel(type: AttachmentType | null): string {
  switch (type) {
    case "lab_result": return "Lab result";
    case "ultrasound": return "Ultrasound";
    case "referral": return "Referral";
    case "letter": return "Letter";
    case "photo": return "Photo";
    case "consent_form": return "Consent form";
    case "other": return "Other";
    default: return "Document";
  }
}

export function getAttachmentTypeIcon(type: AttachmentType | null): string {
  switch (type) {
    case "lab_result": return "🧪";
    case "ultrasound": return "📷";
    case "referral": return "📋";
    case "letter": return "✉️";
    case "photo": return "📸";
    case "consent_form": return "📝";
    default: return "📄";
  }
}
