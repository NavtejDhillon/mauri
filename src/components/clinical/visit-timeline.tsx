"use client";

import Link from "next/link";
import type { AntenatalVisit, PostnatalVisit, LabourBirth } from "@/lib/supabase/types";
import { checkAntenatalAlerts, checkPostnatalAlerts, type ClinicalAlert } from "@/lib/clinical/alerts";

type TimelineEntry =
  | { type: "antenatal"; visit: AntenatalVisit }
  | { type: "postnatal"; visit: PostnatalVisit }
  | { type: "labour_birth"; record: LabourBirth };

interface VisitTimelineProps {
  anVisits: AntenatalVisit[];
  pnVisits: PostnatalVisit[];
  labourBirth: LabourBirth | null;
  clientId: string;
}

export function VisitTimeline({ anVisits, pnVisits, labourBirth, clientId }: VisitTimelineProps) {
  const entries: TimelineEntry[] = [
    ...anVisits.map((v) => ({ type: "antenatal" as const, visit: v })),
    ...pnVisits.map((v) => ({ type: "postnatal" as const, visit: v })),
    ...(labourBirth ? [{ type: "labour_birth" as const, record: labourBirth }] : []),
  ].sort((a, b) => {
    const dateA = a.type === "labour_birth" ? a.record.birth_datetime : a.visit.visit_date;
    const dateB = b.type === "labour_birth" ? b.record.birth_datetime : b.visit.visit_date;
    return dateB.localeCompare(dateA);
  });

  if (entries.length === 0) {
    return <p className="text-sm text-warm-400 py-4">No visits recorded yet.</p>;
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-warm-200" />
      <div className="space-y-0">
        {entries.map((entry, i) => (
          <TimelineItem key={i} entry={entry} clientId={clientId} />
        ))}
      </div>
    </div>
  );
}

function TimelineItem({ entry, clientId }: { entry: TimelineEntry; clientId: string }) {
  if (entry.type === "labour_birth") {
    const r = entry.record;
    return (
      <div className="relative pl-10 py-3">
        <div className="absolute left-2.5 top-4.5 w-3 h-3 rounded-full bg-plum-500 border-2 border-white" />
        <Link
          href={`/clients/${clientId}/labour-birth`}
          className="block bg-white rounded-[14px] border border-warm-200 p-4 hover:bg-warm-50 transition-colors duration-150"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-sage-900">Labour and birth</p>
              <p className="text-xs text-warm-400">
                {new Date(r.birth_datetime).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
                {r.birth_gestation_weeks != null && (
                  <> · <span className="font-mono">{r.birth_gestation_weeks}+{r.birth_gestation_days ?? 0}</span></>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-warm-600">{r.baby_weight_g}g</span>
              <span className="px-2 py-0.5 rounded-full border bg-plum-50 text-plum-800 border-plum-100">
                {r.birth_type.replace(/_/g, " ")}
              </span>
            </div>
          </div>
        </Link>
      </div>
    );
  }

  const visit = entry.visit;
  const isAN = entry.type === "antenatal";
  const alerts: ClinicalAlert[] = isAN
    ? checkAntenatalAlerts(visit as AntenatalVisit)
    : checkPostnatalAlerts(visit as PostnatalVisit);
  const hasUrgent = alerts.some((a) => a.level === "urgent");

  return (
    <div className="relative pl-10 py-3">
      <div className={`absolute left-2.5 top-4.5 w-3 h-3 rounded-full border-2 border-white ${
        hasUrgent ? "bg-coral-500" : isAN ? "bg-sage-500" : "bg-sky-500"
      }`} />
      <div className="bg-white rounded-[14px] border border-warm-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-sage-900">
              {isAN ? "Antenatal" : "Postnatal"} visit
            </p>
            <p className="text-xs text-warm-400">
              {new Date(visit.visit_date).toLocaleDateString("en-NZ", { day: "numeric", month: "short", year: "numeric" })}
              {isAN && "gestation_weeks" in visit && (visit as AntenatalVisit).gestation_weeks != null && (
                <> · <span className="font-mono">{(visit as AntenatalVisit).gestation_weeks}+{(visit as AntenatalVisit).gestation_days ?? 0}</span></>
              )}
              {!isAN && "baby_age_days" in visit && (visit as PostnatalVisit).baby_age_days != null && (
                <> · Day {(visit as PostnatalVisit).baby_age_days}</>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            {isAN && (visit as AntenatalVisit).bp_systolic && (
              <span className="font-mono text-warm-600">
                {(visit as AntenatalVisit).bp_systolic}/{(visit as AntenatalVisit).bp_diastolic}
              </span>
            )}
            {!isAN && (visit as PostnatalVisit).maternal_bp_systolic && (
              <span className="font-mono text-warm-600">
                {(visit as PostnatalVisit).maternal_bp_systolic}/{(visit as PostnatalVisit).maternal_bp_diastolic}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-full border ${
              isAN ? "bg-sage-50 text-sage-800 border-sage-100" : "bg-sky-50 text-sky-800 border-sky-100"
            }`}>
              {visit.visit_type}
            </span>
          </div>
        </div>

        {alerts.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {alerts.map((alert, i) => (
              <span
                key={i}
                className={`inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full ${
                  alert.level === "urgent"
                    ? "bg-coral-50 text-coral-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {alert.category}: {alert.message}
              </span>
            ))}
          </div>
        )}

        {visit.plan && (
          <p className="mt-2 text-xs text-warm-500 line-clamp-2">{visit.plan}</p>
        )}
      </div>
    </div>
  );
}
