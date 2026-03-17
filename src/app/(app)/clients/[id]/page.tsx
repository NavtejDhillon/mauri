"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db/schema";
import { GestationBadge } from "@/components/clinical/gestation-badge";
import { ClinicalSummary } from "@/components/clinical/clinical-summary";
import { VisitTimeline } from "@/components/clinical/visit-timeline";
import { DocumentsTab } from "@/components/clinical/documents-tab";
import { MobileHeader } from "@/components/ui/mobile-header";
import { SkeletonCard } from "@/components/ui/skeleton";
import type { Client, Registration, MaternalHistory, AntenatalVisit, PostnatalVisit, LabourBirth } from "@/lib/supabase/types";
import type { SyncableRecord } from "@/lib/db/schema";

type Tab = "overview" | "visits" | "history" | "claims" | "documents";

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<(Client & SyncableRecord) | null>(null);
  const [registration, setRegistration] = useState<(Registration & SyncableRecord) | null>(null);
  const [maternalHistory, setMaternalHistory] = useState<(MaternalHistory & SyncableRecord) | null>(null);
  const [anVisits, setAnVisits] = useState<(AntenatalVisit & SyncableRecord)[]>([]);
  const [pnVisits, setPnVisits] = useState<(PostnatalVisit & SyncableRecord)[]>([]);
  const [labourBirth, setLabourBirth] = useState<(LabourBirth & SyncableRecord) | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const c = await db.clients.get(id);
      setClient(c ?? null);

      if (c) {
        const regs = await db.registrations
          .where("client_id").equals(id)
          .filter((r) => !r.deleted_at)
          .toArray();
        const active = regs.find((r) => r.status === "active" || r.status === "postnatal") ?? regs[0] ?? null;
        setRegistration(active);

        const histories = await db.maternalHistories
          .where("client_id").equals(id)
          .toArray();
        setMaternalHistory(histories[0] ?? null);

        if (active) {
          const an = await db.antenatalVisits
            .where("registration_id").equals(active.id)
            .filter((v) => !v.deleted_at)
            .toArray();
          setAnVisits(an.sort((a, b) => b.visit_date.localeCompare(a.visit_date)));

          const pn = await db.postnatalVisits
            .where("registration_id").equals(active.id)
            .filter((v) => !v.deleted_at)
            .toArray();
          setPnVisits(pn.sort((a, b) => b.visit_date.localeCompare(a.visit_date)));

          const lb = await db.labourBirths
            .where("registration_id").equals(active.id)
            .toArray();
          setLabourBirth(lb[0] ?? null);
        }
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div>
        <MobileHeader title="" showBack backHref="/clients" />
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }
  if (!client) return <div className="text-sm text-coral-600 p-4">Client not found.</div>;

  const displayName = client.preferred_name
    ? `${client.preferred_name} ${client.last_name}`
    : `${client.first_name} ${client.last_name}`;

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "visits", label: "Visits" },
    { key: "history", label: "History" },
    { key: "claims", label: "Claims" },
    { key: "documents", label: "Documents" },
  ];

  return (
    <div>
      {/* Mobile back header */}
      <div className="md:hidden">
        <MobileHeader title="" showBack backHref="/clients" />
      </div>

      {/* Desktop back link */}
      <button
        onClick={() => router.push("/clients")}
        className="hidden md:block text-sm text-warm-400 hover:text-warm-600 transition-colors duration-150 mb-4"
      >
        &larr; Back to clients
      </button>

      {/* Client header */}
      <div className="flex items-start gap-3 md:gap-4 mb-5 md:mb-6">
        <div className="w-12 h-12 md:w-12 md:h-12 rounded-full bg-sage-100 flex items-center justify-center text-lg font-medium text-sage-700 flex-shrink-0">
          {client.first_name[0]}{client.last_name[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[20px] md:text-[26px] font-semibold text-sage-900 leading-tight">{displayName}</h1>
            <a
              href={`/clients/${id}/edit`}
              className="px-3 py-1 text-xs font-medium text-sage-600 bg-sage-50 border border-sage-100 rounded-full active:bg-sage-100 transition-colors duration-150"
            >
              Edit
            </a>
          </div>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {registration?.agreed_edd && registration.status === "active" && (
              <GestationBadge edd={registration.agreed_edd} />
            )}
            {registration && (
              <span className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full border ${
                registration.status === "active" ? "bg-sage-50 text-sage-800 border-sage-100" :
                registration.status === "postnatal" ? "bg-sky-50 text-sky-800 border-sky-100" :
                "bg-warm-50 text-warm-600 border-warm-200"
              }`}>
                {registration.status}
              </span>
            )}
          </div>
          <p className="text-xs text-warm-400 mt-1">
            {client.nhi && <span className="font-mono">{client.nhi}</span>}
            {client.nhi && registration?.agreed_edd && " · "}
            {registration?.agreed_edd && (
              <>EDD {new Date(registration.agreed_edd).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}</>
            )}
          </p>
        </div>
      </div>

      {/* Tabs — horizontally scrollable on mobile */}
      <div className="flex gap-0 mb-5 md:mb-6 border-b border-warm-200 overflow-x-auto scroll-pills -mx-4 px-4 md:mx-0 md:px-0">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-shrink-0 px-4 py-3 md:py-2 text-sm font-medium transition-colors duration-150 border-b-2 -mb-px ${
              activeTab === tab.key
                ? "text-sage-600 border-sage-600"
                : "text-warm-400 border-transparent active:text-warm-600"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <OverviewTab client={client} registration={registration} maternalHistory={maternalHistory} anVisits={anVisits} pnVisits={pnVisits} labourBirth={labourBirth} />
      )}
      {activeTab === "visits" && (
        <VisitsTab registration={registration} anVisits={anVisits} pnVisits={pnVisits} labourBirth={labourBirth} clientId={id} />
      )}
      {activeTab === "history" && (
        <HistoryTab maternalHistory={maternalHistory} clientId={id} />
      )}
      {activeTab === "claims" && (
        <div className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
          <p className="text-sm text-warm-400">Claims will be available after clinical records are added.</p>
        </div>
      )}
      {activeTab === "documents" && (
        <DocumentsTab clientId={id} registrationId={registration?.id} />
      )}
    </div>
  );
}

function OverviewTab({
  client,
  registration,
  maternalHistory,
  anVisits,
  pnVisits,
  labourBirth,
}: {
  client: Client;
  registration: (Registration & SyncableRecord) | null;
  maternalHistory: (MaternalHistory & SyncableRecord) | null;
  anVisits: AntenatalVisit[];
  pnVisits: PostnatalVisit[];
  labourBirth: LabourBirth | null;
}) {
  return (
    <div className="space-y-4">
      {registration && (
        <ClinicalSummary
          registration={registration}
          anVisits={anVisits}
          pnVisits={pnVisits}
          labourBirth={labourBirth}
        />
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
        <h3 className="text-[15px] font-medium text-sage-900 mb-3">Contact</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Phone" value={client.phone} />
          <InfoRow label="Email" value={client.email} />
          <InfoRow label="Address" value={[client.address_line_1, client.city, client.postcode].filter(Boolean).join(", ")} />
          <InfoRow label="Language" value={client.language} />
        </dl>
      </div>

      <div className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
        <h3 className="text-[15px] font-medium text-sage-900 mb-3">Pregnancy</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="EDD" value={registration?.agreed_edd ? new Date(registration.agreed_edd).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }) : null} />
          <InfoRow label="EDD method" value={registration?.edd_method} />
          <InfoRow label="Gravida" value={registration?.gravida?.toString()} />
          <InfoRow label="Parity" value={registration?.parity?.toString()} />
          <InfoRow label="Registered" value={registration?.registration_date ? new Date(registration.registration_date).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" }) : null} />
        </dl>
      </div>

      <div className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
        <h3 className="text-[15px] font-medium text-sage-900 mb-3">GP</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="GP" value={client.gp_name} />
          <InfoRow label="Practice" value={client.gp_practice} />
          <InfoRow label="Phone" value={client.gp_phone} />
        </dl>
      </div>

      <div className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
        <h3 className="text-[15px] font-medium text-sage-900 mb-3">Medical summary</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Blood group" value={maternalHistory?.blood_group} />
          <InfoRow label="Allergies" value={maternalHistory?.allergies?.join(", ")} />
          <InfoRow label="Conditions" value={maternalHistory?.medical_conditions?.join(", ")} />
          <InfoRow label="Medications" value={maternalHistory?.current_medications?.join(", ")} />
        </dl>
      </div>
    </div>
    </div>
  );
}

function VisitsTab({
  registration,
  anVisits,
  pnVisits,
  labourBirth,
  clientId,
}: {
  registration: (Registration & SyncableRecord) | null;
  anVisits: (AntenatalVisit & SyncableRecord)[];
  pnVisits: (PostnatalVisit & SyncableRecord)[];
  labourBirth: LabourBirth | null;
  clientId: string;
}) {
  return (
    <div>
      {registration && (
        <div className="flex flex-wrap gap-2 mb-4">
          <a
            href={`/clients/${clientId}/visits/new-antenatal`}
            className="flex-1 md:flex-none text-center px-4 py-2.5 md:py-2 text-sm font-medium text-white bg-sage-600 rounded-[10px] active:bg-sage-700 transition-colors duration-150"
          >
            New antenatal
          </a>
          <a
            href={`/clients/${clientId}/visits/new-postnatal`}
            className="flex-1 md:flex-none text-center px-4 py-2.5 md:py-2 text-sm font-medium text-sage-600 bg-sage-50 border border-sage-100 rounded-[10px] active:bg-sage-100 transition-colors duration-150"
          >
            New postnatal
          </a>
          {!labourBirth && (
            <a
              href={`/clients/${clientId}/labour-birth`}
              className="flex-1 md:flex-none text-center px-4 py-2.5 md:py-2 text-sm font-medium text-plum-600 bg-plum-50 border border-plum-100 rounded-[10px] active:bg-plum-100 transition-colors duration-150"
            >
              Record birth
            </a>
          )}
        </div>
      )}

      <VisitTimeline
        anVisits={anVisits}
        pnVisits={pnVisits}
        labourBirth={labourBirth}
        clientId={clientId}
      />
    </div>
  );
}

function HistoryTab({
  maternalHistory,
  clientId,
}: {
  maternalHistory: (MaternalHistory & SyncableRecord) | null;
  clientId: string;
}) {
  void clientId;

  if (!maternalHistory) {
    return (
      <div className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
        <p className="text-sm text-warm-400">No maternal history recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
        <h3 className="text-[15px] font-medium text-sage-900 mb-3">Medical</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Blood group" value={maternalHistory.blood_group} />
          <InfoRow label="Rhesus" value={maternalHistory.rhesus} />
          <InfoRow label="Height" value={maternalHistory.height_cm ? `${maternalHistory.height_cm} cm` : null} />
          <InfoRow label="Weight" value={maternalHistory.weight_kg ? `${maternalHistory.weight_kg} kg` : null} />
          <InfoRow label="BMI" value={maternalHistory.bmi?.toString()} />
          <InfoRow label="GBS status" value={maternalHistory.gbs_status} />
          <InfoRow label="Rubella immune" value={maternalHistory.rubella_immune != null ? (maternalHistory.rubella_immune ? "Yes" : "No") : null} />
        </dl>
      </div>

      <div className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
        <h3 className="text-[15px] font-medium text-sage-900 mb-3">Lifestyle</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Smoking" value={maternalHistory.smoking_status} />
          <InfoRow label="Alcohol" value={maternalHistory.alcohol_use} />
          <InfoRow label="Substance use" value={maternalHistory.substance_use} />
        </dl>
      </div>

      <div className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6 md:col-span-2">
        <h3 className="text-[15px] font-medium text-sage-900 mb-3">Conditions and medications</h3>
        <dl className="space-y-2 text-sm">
          <InfoRow label="Medical conditions" value={maternalHistory.medical_conditions?.join(", ")} />
          <InfoRow label="Surgical history" value={maternalHistory.surgical_history?.join(", ")} />
          <InfoRow label="Current medications" value={maternalHistory.current_medications?.join(", ")} />
          <InfoRow label="Allergies" value={maternalHistory.allergies?.join(", ")} />
          <InfoRow label="Mental health history" value={maternalHistory.mental_health_history} />
          <InfoRow label="Family history" value={maternalHistory.family_history} />
        </dl>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-warm-400 flex-shrink-0">{label}</dt>
      <dd className="text-warm-800 font-medium text-right truncate">{value || "-"}</dd>
    </div>
  );
}
