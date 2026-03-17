"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { db } from "@/lib/db/schema";
import { createClaim, updateClaim, MODULE_AMOUNTS, getModuleLabel, getStatusColor } from "@/hooks/use-claims";
import type { Claim, ClaimModuleType, ClaimPartialType, ClaimStatus, Client, Registration } from "@/lib/supabase/types";
import type { SyncableRecord } from "@/lib/db/schema";

type StatusFilter = "all" | ClaimStatus;

export default function ClaimsPage() {
  const [claims, setClaims] = useState<(Claim & SyncableRecord)[]>([]);
  const [registrations, setRegistrations] = useState<Map<string, Registration & SyncableRecord>>(new Map());
  const [clients, setClients] = useState<Map<string, Client & SyncableRecord>>(new Map());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const allClaims = await db.claims.toArray();
    setClaims(allClaims.sort((a, b) => (b.claim_date || b.created_at).localeCompare(a.claim_date || a.created_at)));

    const allRegs = await db.registrations.filter((r) => !r.deleted_at).toArray();
    setRegistrations(new Map(allRegs.map((r) => [r.id, r])));

    const allClients = await db.clients.filter((c) => !c.deleted_at).toArray();
    setClients(new Map(allClients.map((c) => [c.id, c])));

    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const filtered = claims.filter((c) => statusFilter === "all" || c.status === statusFilter);

  const totalDraft = claims.filter((c) => c.status === "draft").reduce((s, c) => s + c.amount, 0);
  const totalReady = claims.filter((c) => c.status === "ready").reduce((s, c) => s + c.amount, 0);
  const totalSubmitted = claims.filter((c) => c.status === "submitted").reduce((s, c) => s + c.amount, 0);
  const totalPaid = claims.filter((c) => c.status === "paid").reduce((s, c) => s + c.amount, 0);

  const statusOptions: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    { value: "draft", label: "Draft" },
    { value: "ready", label: "Ready" },
    { value: "submitted", label: "Submitted" },
    { value: "paid", label: "Paid" },
    { value: "rejected", label: "Rejected" },
  ];

  async function handleStatusChange(claimId: string, newStatus: ClaimStatus) {
    const changes: Partial<Claim> = { status: newStatus };
    if (newStatus === "submitted") changes.submission_date = new Date().toISOString().split("T")[0];
    if (newStatus === "paid") changes.payment_date = new Date().toISOString().split("T")[0];
    await updateClaim(claimId, changes);
    await loadData();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-[26px] font-semibold text-sage-900">Claims</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-sage-600 rounded-[10px] hover:bg-sage-700 transition-colors duration-150"
        >
          New claim
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <SummaryCard label="Draft" amount={totalDraft} />
        <SummaryCard label="Ready to submit" amount={totalReady} />
        <SummaryCard label="Submitted" amount={totalSubmitted} />
        <SummaryCard label="Paid" amount={totalPaid} />
      </div>

      {/* Filter pills */}
      <div className="flex gap-1 mb-4">
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

      {/* Claims list */}
      <div className="bg-white rounded-[14px] border border-warm-200 overflow-hidden">
        {loading ? (
          <div className="p-6 text-sm text-warm-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-6 text-sm text-warm-400">
            {claims.length === 0
              ? "No claims yet. Create your first claim to start tracking Section 94 payments."
              : "No claims match this filter."}
          </div>
        ) : (
          filtered.map((claim) => {
            const reg = registrations.get(claim.registration_id);
            const client = reg ? clients.get(reg.client_id) : undefined;
            return (
              <div key={claim.id} className="flex items-center justify-between px-4 py-3 border-b border-warm-200 last:border-b-0">
                <div className="flex items-center gap-3">
                  {client && (
                    <Link href={`/clients/${client.id}`} className="text-sm font-medium text-sage-900 hover:text-sage-700">
                      {client.preferred_name || client.first_name} {client.last_name}
                    </Link>
                  )}
                  <span className="text-xs text-warm-400">{getModuleLabel(claim.module_type)}</span>
                  {claim.partial_type !== "full" && (
                    <span className="text-xs text-warm-400">({claim.partial_type})</span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-sm font-medium text-warm-800">
                    ${claim.amount.toFixed(2)}
                  </span>
                  <span className={`px-2 py-0.5 text-[11px] font-medium rounded-full border ${getStatusColor(claim.status)}`}>
                    {claim.status}
                  </span>
                  {claim.status === "draft" && (
                    <button
                      onClick={() => handleStatusChange(claim.id, "ready")}
                      className="text-xs text-sage-600 hover:text-sage-800"
                    >
                      Mark ready
                    </button>
                  )}
                  {claim.status === "ready" && (
                    <button
                      onClick={() => handleStatusChange(claim.id, "submitted")}
                      className="text-xs text-sage-600 hover:text-sage-800"
                    >
                      Mark submitted
                    </button>
                  )}
                  {claim.status === "submitted" && (
                    <button
                      onClick={() => handleStatusChange(claim.id, "paid")}
                      className="text-xs text-sage-600 hover:text-sage-800"
                    >
                      Mark paid
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showForm && (
        <ClaimForm
          registrations={registrations}
          clients={clients}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadData(); }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, amount }: { label: string; amount: number }) {
  return (
    <div className="bg-warm-50 rounded-[14px] p-4">
      <p className="text-xs font-medium text-warm-400 uppercase tracking-[0.05em]">{label}</p>
      <p className="text-2xl font-semibold font-mono text-sage-900 mt-1">${amount.toFixed(2)}</p>
    </div>
  );
}

function ClaimForm({
  registrations,
  clients,
  onClose,
  onSaved,
}: {
  registrations: Map<string, Registration & SyncableRecord>;
  clients: Map<string, Client & SyncableRecord>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [selectedModule, setSelectedModule] = useState<ClaimModuleType>("first_second_trimester");

  const activeRegs = Array.from(registrations.values())
    .filter((r) => r.status === "active" || r.status === "postnatal")
    .map((r) => {
      const client = clients.get(r.client_id);
      return { reg: r, client };
    })
    .sort((a, b) => (a.client?.last_name || "").localeCompare(b.client?.last_name || ""));

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    const str = (k: string) => (fd.get(k) as string) || null;

    const moduleType = str("module_type") as ClaimModuleType;
    const amount = MODULE_AMOUNTS[moduleType] || 0;
    const partialType = (str("partial_type") as ClaimPartialType) || "full";
    const finalAmount = partialType === "full" ? amount : amount / 2;

    await createClaim({
      registration_id: str("registration_id") || "",
      practitioner_id: "pending",
      module_type: moduleType,
      partial_type: partialType,
      amount: finalAmount,
      claim_date: new Date().toISOString().split("T")[0],
      status: "draft",
      submission_date: null,
      payment_date: null,
      payment_reference: null,
      rejection_reason: null,
      auto_calculated: true,
      notes: str("notes"),
    });

    setSaving(false);
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-[14px] border border-warm-200 p-6 w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-[15px] font-medium text-sage-900 mb-4">New claim</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">Client</label>
            <select
              name="registration_id"
              required
              className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
            >
              <option value="">Select client...</option>
              {activeRegs.map(({ reg, client }) => (
                <option key={reg.id} value={reg.id}>
                  {client ? `${client.first_name} ${client.last_name}` : "Unknown"} - {reg.status}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">Module</label>
            <select
              name="module_type"
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value as ClaimModuleType)}
              className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
            >
              <option value="first_second_trimester">First/second trimester - ${MODULE_AMOUNTS.first_second_trimester}</option>
              <option value="third_trimester">Third trimester - ${MODULE_AMOUNTS.third_trimester}</option>
              <option value="labour_birth">Labour and birth - ${MODULE_AMOUNTS.labour_birth}</option>
              <option value="postnatal">Postnatal - ${MODULE_AMOUNTS.postnatal}</option>
              <option value="acs_complex_social">ACS: complex social - ${MODULE_AMOUNTS.acs_complex_social}</option>
              <option value="acs_complex_clinical">ACS: complex clinical - ${MODULE_AMOUNTS.acs_complex_clinical}</option>
              <option value="acs_additional_care">ACS: additional care - ${MODULE_AMOUNTS.acs_additional_care}</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">Claim type</label>
            <select
              name="partial_type"
              className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
            >
              <option value="full">Full claim</option>
              <option value="first">First LMC (partial)</option>
              <option value="last">Last LMC (partial)</option>
            </select>
          </div>

          <div className="bg-warm-50 rounded-[10px] p-3">
            <p className="text-xs text-warm-400">Amount</p>
            <p className="text-lg font-semibold font-mono text-sage-900">
              ${(MODULE_AMOUNTS[selectedModule] || 0).toFixed(2)}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">Notes</label>
            <textarea
              name="notes"
              rows={2}
              className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-warm-600 bg-white border border-warm-200 rounded-[10px] hover:bg-warm-50 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 text-sm font-medium text-white bg-sage-600 rounded-[10px] hover:bg-sage-700 disabled:opacity-50 transition-colors duration-150"
            >
              {saving ? "Saving..." : "Create claim"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
