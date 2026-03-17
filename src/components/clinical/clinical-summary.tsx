"use client";

import type { Registration, AntenatalVisit, PostnatalVisit, LabourBirth } from "@/lib/supabase/types";
import { calculateGestation } from "@/lib/clinical/gestation";
import { checkAntenatalAlerts, checkPostnatalAlerts, checkOverdueVisit, type ClinicalAlert } from "@/lib/clinical/alerts";
import { GestationBadge } from "./gestation-badge";

interface ClinicalSummaryProps {
  registration: Registration;
  anVisits: AntenatalVisit[];
  pnVisits: PostnatalVisit[];
  labourBirth: LabourBirth | null;
}

export function ClinicalSummary({ registration, anVisits, pnVisits, labourBirth }: ClinicalSummaryProps) {
  const latestAN = anVisits[0] ?? null;
  const latestPN = pnVisits[0] ?? null;
  const lastVisitDate = latestPN?.visit_date ?? latestAN?.visit_date ?? null;

  const alerts: ClinicalAlert[] = [];
  if (latestAN) alerts.push(...checkAntenatalAlerts(latestAN));
  if (latestPN) alerts.push(...checkPostnatalAlerts(latestPN));
  const overdueAlert = checkOverdueVisit(registration, lastVisitDate);
  if (overdueAlert) alerts.push(overdueAlert);

  const gestation = registration.agreed_edd && registration.status === "active"
    ? calculateGestation(new Date(registration.agreed_edd))
    : null;

  return (
    <div className="space-y-4">
      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, i) => (
            <div
              key={i}
              className={`px-4 py-2.5 rounded-[10px] text-sm font-medium flex items-center gap-2 ${
                alert.level === "urgent"
                  ? "bg-coral-50 text-coral-700 border border-coral-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                alert.level === "urgent" ? "bg-coral-500" : "bg-amber-500"
              }`} />
              {alert.category}: {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {/* Gestation / birth */}
        <div className="bg-white rounded-[14px] border border-warm-200 p-4">
          <h4 className="text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-2">
            {labourBirth ? "Birth" : "Gestation"}
          </h4>
          {labourBirth ? (
            <div>
              <p className="text-lg font-semibold text-sage-900">
                {new Date(labourBirth.birth_datetime).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}
              </p>
              <p className="text-xs text-warm-400 mt-1">
                {labourBirth.birth_type.replace(/_/g, " ")} · {labourBirth.baby_weight_g}g
              </p>
            </div>
          ) : gestation ? (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold font-mono text-sage-900">{gestation.display}</span>
                <GestationBadge edd={registration.agreed_edd} />
              </div>
              <p className="text-xs text-warm-400 mt-1">
                EDD {new Date(registration.agreed_edd).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
          ) : (
            <p className="text-sm text-warm-400">No EDD set</p>
          )}
        </div>

        {/* Latest vitals */}
        <div className="bg-white rounded-[14px] border border-warm-200 p-4">
          <h4 className="text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-2">Latest vitals</h4>
          {latestAN || latestPN ? (
            <div className="space-y-1">
              {latestAN?.bp_systolic && (
                <p className="text-sm">
                  <span className="text-warm-400">BP</span>{" "}
                  <span className="font-mono font-medium text-warm-800">{latestAN.bp_systolic}/{latestAN.bp_diastolic}</span>
                </p>
              )}
              {latestPN?.maternal_bp_systolic && (
                <p className="text-sm">
                  <span className="text-warm-400">BP</span>{" "}
                  <span className="font-mono font-medium text-warm-800">{latestPN.maternal_bp_systolic}/{latestPN.maternal_bp_diastolic}</span>
                </p>
              )}
              {latestAN?.fetal_heart_rate && (
                <p className="text-sm">
                  <span className="text-warm-400">FHR</span>{" "}
                  <span className="font-mono font-medium text-warm-800">{latestAN.fetal_heart_rate} bpm</span>
                </p>
              )}
              {latestAN?.weight_kg && (
                <p className="text-sm">
                  <span className="text-warm-400">Weight</span>{" "}
                  <span className="font-mono font-medium text-warm-800">{latestAN.weight_kg} kg</span>
                </p>
              )}
              {latestPN?.baby_weight_g && (
                <p className="text-sm">
                  <span className="text-warm-400">Baby</span>{" "}
                  <span className="font-mono font-medium text-warm-800">{latestPN.baby_weight_g}g</span>
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-warm-400">No visits yet</p>
          )}
        </div>

        {/* Visit count */}
        <div className="bg-white rounded-[14px] border border-warm-200 p-4">
          <h4 className="text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-2">Visits</h4>
          <div className="space-y-1">
            <p className="text-sm">
              <span className="text-lg font-semibold text-sage-900">{anVisits.length}</span>{" "}
              <span className="text-warm-400">antenatal</span>
            </p>
            <p className="text-sm">
              <span className="text-lg font-semibold text-sage-900">{pnVisits.length}</span>{" "}
              <span className="text-warm-400">postnatal</span>
            </p>
            {lastVisitDate && (
              <p className="text-xs text-warm-400 mt-2">
                Last visit {new Date(lastVisitDate).toLocaleDateString("en-NZ", { day: "numeric", month: "short" })}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
