"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  createAttachment,
  deleteAttachment,
  getAttachmentsForClient,
  fileToDataUrl,
  formatFileSize,
  getAttachmentTypeLabel,
  getAttachmentTypeIcon,
} from "@/hooks/use-attachments";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { FAB } from "@/components/ui/fab";
import { SwipeableRow } from "@/components/ui/swipeable-row";
import { IconTrash } from "@/components/ui/icons";
import type { Attachment, AttachmentType } from "@/lib/supabase/types";
import type { SyncableRecord } from "@/lib/db/schema";

interface DocumentsTabProps {
  clientId: string;
  registrationId?: string | null;
}

export function DocumentsTab({ clientId, registrationId }: DocumentsTabProps) {
  const [attachments, setAttachments] = useState<(Attachment & SyncableRecord)[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const docs = await getAttachmentsForClient(clientId);
    setAttachments(
      (docs as (Attachment & SyncableRecord)[]).sort((a, b) =>
        b.created_at.localeCompare(a.created_at)
      )
    );
    setLoading(false);
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this document?")) return;
    await deleteAttachment(id);
    await loadData();
  }

  return (
    <div>
      {/* Desktop upload button */}
      <div className="hidden md:flex justify-end mb-4">
        <button
          onClick={() => setShowUpload(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-sage-600 rounded-[10px] hover:bg-sage-700 transition-colors duration-150"
        >
          Upload document
        </button>
      </div>

      {loading ? (
        <div className="bg-white rounded-[14px] border border-warm-200 p-6">
          <p className="text-sm text-warm-400">Loading...</p>
        </div>
      ) : attachments.length === 0 ? (
        <div className="bg-white rounded-[14px] border border-warm-200 p-6 text-center">
          <div className="text-3xl mb-2">📂</div>
          <p className="text-sm text-warm-400">No documents uploaded yet.</p>
          <p className="text-xs text-warm-300 mt-1">Tap + to upload scan results, consent forms, or other documents.</p>
        </div>
      ) : (
        <div className="bg-white rounded-[14px] border border-warm-200 overflow-hidden">
          {attachments.map((doc) => (
            <SwipeableRow
              key={doc.id}
              rightActions={[
                {
                  label: "Delete",
                  icon: <IconTrash size={18} />,
                  color: "bg-coral-600",
                  onAction: () => handleDelete(doc.id),
                },
              ]}
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-warm-200 last:border-b-0">
                <div className="w-10 h-10 rounded-[10px] bg-warm-50 flex items-center justify-center text-lg flex-shrink-0">
                  {getAttachmentTypeIcon(doc.attachment_type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-sage-900 truncate">{doc.filename}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-warm-400">
                      {getAttachmentTypeLabel(doc.attachment_type)}
                    </span>
                    {doc.file_size_bytes && (
                      <>
                        <span className="text-warm-200">·</span>
                        <span className="text-[11px] text-warm-400 font-mono">
                          {formatFileSize(doc.file_size_bytes)}
                        </span>
                      </>
                    )}
                    <span className="text-warm-200">·</span>
                    <span className="text-[11px] text-warm-400">
                      {new Date(doc.created_at).toLocaleDateString("en-NZ", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {doc.description && (
                    <p className="text-xs text-warm-400 mt-1 truncate">{doc.description}</p>
                  )}
                </div>
              </div>
            </SwipeableRow>
          ))}
        </div>
      )}

      {/* Mobile FAB */}
      <div className="md:hidden">
        <FAB onClick={() => setShowUpload(true)} label="Upload document" />
      </div>

      {/* Upload form as bottom sheet */}
      <BottomSheet
        open={showUpload}
        onClose={() => setShowUpload(false)}
        title="Upload document"
      >
        <UploadForm
          clientId={clientId}
          registrationId={registrationId}
          onClose={() => setShowUpload(false)}
          onUploaded={() => {
            setShowUpload(false);
            loadData();
          }}
        />
      </BottomSheet>
    </div>
  );
}

function UploadForm({
  clientId,
  registrationId,
  onClose,
  onUploaded,
}: {
  clientId: string;
  registrationId?: string | null;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputClass =
    "w-full px-3 py-3 md:py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedFile) return;
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    const attachmentType = (fd.get("attachment_type") as AttachmentType) || "other";
    const description = (fd.get("description") as string) || null;

    // Store file as data URL in storage_path for offline access
    const dataUrl = await fileToDataUrl(selectedFile);

    await createAttachment({
      registration_id: registrationId || null,
      client_id: clientId,
      attachment_type: attachmentType,
      filename: selectedFile.name,
      storage_path: dataUrl,
      mime_type: selectedFile.type || null,
      file_size_bytes: selectedFile.size,
      description,
      uploaded_by: null,
    });

    setSaving(false);
    onUploaded();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* File picker area */}
      <div>
        <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">
          File
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          capture="environment"
          onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
          className="hidden"
        />
        {selectedFile ? (
          <div className="flex items-center gap-3 p-3 bg-sage-50 rounded-[10px] border border-sage-100">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-sage-900 truncate">{selectedFile.name}</p>
              <p className="text-xs text-warm-400 font-mono">{formatFileSize(selectedFile.size)}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="text-xs text-warm-400 active:text-warm-600 p-2"
            >
              Remove
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 px-4 py-4 text-sm font-medium text-sage-600 bg-sage-50 border-2 border-dashed border-sage-200 rounded-[10px] active:bg-sage-100 transition-colors duration-150"
            >
              Choose file or take photo
            </button>
          </div>
        )}
      </div>

      {/* Document type */}
      <div>
        <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">
          Type
        </label>
        <select name="attachment_type" className={inputClass}>
          <option value="lab_result">Lab result</option>
          <option value="ultrasound">Ultrasound</option>
          <option value="referral">Referral</option>
          <option value="letter">Letter</option>
          <option value="photo">Photo</option>
          <option value="consent_form">Consent form</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">
          Description (optional)
        </label>
        <input
          name="description"
          type="text"
          placeholder="e.g. 20-week anatomy scan"
          className={inputClass}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 px-4 py-3 md:py-2 text-sm font-medium text-warm-600 bg-white border border-warm-200 rounded-[10px] active:bg-warm-50 transition-colors duration-150"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving || !selectedFile}
          className="flex-1 px-4 py-3 md:py-2 text-sm font-medium text-white bg-sage-600 rounded-[10px] active:bg-sage-700 disabled:opacity-50 transition-colors duration-150"
        >
          {saving ? "Uploading..." : "Upload"}
        </button>
      </div>
    </form>
  );
}
