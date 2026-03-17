"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db/schema";
import { createAntenatalVisit } from "@/hooks/use-visits";
import { calculateGestation } from "@/lib/clinical/gestation";
import { checkAntenatalAlerts } from "@/lib/clinical/alerts";
import type { Registration, AntenatalVisit, VisitType, Presentation, FetalMovements, UrineResult, Oedema } from "@/lib/supabase/types";
import type { SyncableRecord } from "@/lib/db/schema";

export default function NewAntenatalVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params);
  const router = useRouter();
  const [registration, setRegistration] = useState<(Registration & SyncableRecord) | null>(null);
  const [saving, setSaving] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState<ReturnType<typeof checkAntenatalAlerts>>([]);

  useEffect(() => {
    async function load() {
      const regs = await db.registrations
        .where("client_id").equals(clientId)
        .filter((r) => !r.deleted_at && (r.status === "active" || r.status === "postnatal"))
        .toArray();
      setRegistration(regs[0] ?? null);
    }
    load();
  }, [clientId]);

  const today = new Date().toISOString().split("T")[0];
  const gestation = registration?.agreed_edd
    ? calculateGestation(new Date(registration.agreed_edd))
    : null;

  function handleFieldChange(form: HTMLFormElement) {
    const fd = new FormData(form);
    const num = (k: string) => { const v = fd.get(k) as string; return v ? parseFloat(v) : null; };
    const str = (k: string) => (fd.get(k) as string) || null;

    const partial = {
      bp_systolic: num("bp_systolic"),
      bp_diastolic: num("bp_diastolic"),
      fetal_heart_rate: num("fetal_heart_rate"),
      fetal_movements: (str("fetal_movements") || null) as FetalMovements | null,
      fundal_height_cm: num("fundal_height_cm"),
      gestation_weeks: gestation?.weeks ?? null,
      urine_protein: (str("urine_protein") || null) as UrineResult | null,
    } as AntenatalVisit;

    setLiveAlerts(checkAntenatalAlerts(partial));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!registration) return;
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    const str = (k: string) => (fd.get(k) as string) || null;
    const num = (k: string) => { const v = fd.get(k) as string; return v ? parseFloat(v) : null; };
    const bool = (k: string) => fd.get(k) === "on";

    await createAntenatalVisit({
      registration_id: registration.id,
      practitioner_id: "pending",
      visit_date: str("visit_date") || today,
      visit_time: str("visit_time"),
      gestation_weeks: gestation?.weeks ?? null,
      gestation_days: gestation?.days ?? null,
      location: str("location"),
      visit_type: (str("visit_type") as VisitType) || "routine",
      bp_systolic: num("bp_systolic"),
      bp_diastolic: num("bp_diastolic"),
      pulse: num("pulse"),
      temperature: num("temperature"),
      weight_kg: num("weight_kg"),
      fundal_height_cm: num("fundal_height_cm"),
      presentation: (str("presentation") as Presentation) || null,
      position: str("position"),
      engagement: str("engagement"),
      fetal_heart_rate: num("fetal_heart_rate"),
      fetal_movements: (str("fetal_movements") as FetalMovements) || null,
      urine_protein: (str("urine_protein") as UrineResult) || null,
      urine_glucose: (str("urine_glucose") as UrineResult) || null,
      oedema: (str("oedema") as Oedema) || null,
      hb_result: num("hb_result"),
      blood_tests_ordered: str("blood_tests_ordered") ? str("blood_tests_ordered")!.split(",").map(s => s.trim()) : null,
      ultrasound_ordered: bool("ultrasound_ordered"),
      referrals_made: str("referrals_made") ? str("referrals_made")!.split(",").map(s => s.trim()) : null,
      topics_discussed: str("topics_discussed") ? str("topics_discussed")!.split(",").map(s => s.trim()) : null,
      plan: str("plan"),
      notes: str("notes"),
      after_hours: bool("after_hours"),
      duration_minutes: num("duration_minutes"),
      interpreter_present: bool("interpreter_present"),
      next_visit_date: str("next_visit_date"),
      next_visit_gestation: str("next_visit_gestation"),
      midwife_signature: bool("midwife_signature"),
    });

    router.push(`/clients/${clientId}`);
  }

  if (!registration) {
    return <div className="text-sm text-warm-400">Loading registration...</div>;
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-warm-400 hover:text-warm-600 transition-colors duration-150 mb-2"
        >
          &larr; Back
        </button>
        <h1 className="text-[26px] font-semibold text-sage-900">New antenatal visit</h1>
        {gestation && (
          <p className="text-sm text-warm-400 mt-1">
            Current gestation: <span className="font-mono font-medium text-sage-700">{gestation.display}</span>
          </p>
        )}
      </div>

      {liveAlerts.length > 0 && (
        <div className="mb-4 space-y-2">
          {liveAlerts.map((alert, i) => (
            <div
              key={i}
              className={`px-4 py-2 rounded-[10px] text-sm font-medium ${
                alert.level === "urgent"
                  ? "bg-coral-50 text-coral-700 border border-coral-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {alert.category}: {alert.message}
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        onChange={(e) => handleFieldChange(e.currentTarget)}
        className="space-y-6"
      >
        {/* Visit details */}
        <Section title="Visit details">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Date" name="visit_date" type="date" defaultValue={today} required />
            <Field label="Time" name="visit_time" type="time" />
            <Select label="Visit type" name="visit_type" defaultValue="routine" options={[
              { value: "routine", label: "Routine" },
              { value: "follow_up", label: "Follow-up" },
              { value: "urgent", label: "Urgent" },
              { value: "phone", label: "Phone" },
              { value: "video", label: "Video" },
            ]} />
            <Field label="Location" name="location" placeholder="Home, clinic, etc." />
          </div>
        </Section>

        {/* Vitals */}
        <Section title="Vitals">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-2">
              <Field label="BP systolic" name="bp_systolic" type="number" placeholder="120" />
              <Field label="BP diastolic" name="bp_diastolic" type="number" placeholder="80" />
            </div>
            <Field label="Pulse (bpm)" name="pulse" type="number" placeholder="72" />
            <Field label="Temperature (C)" name="temperature" type="number" step="0.1" placeholder="36.5" />
            <Field label="Weight (kg)" name="weight_kg" type="number" step="0.1" />
          </div>
        </Section>

        {/* Abdominal examination */}
        <Section title="Abdominal examination">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Fundal height (cm)" name="fundal_height_cm" type="number" />
            <Select label="Presentation" name="presentation" options={[
              { value: "", label: "Not assessed" },
              { value: "cephalic", label: "Cephalic" },
              { value: "breech", label: "Breech" },
              { value: "transverse", label: "Transverse" },
              { value: "oblique", label: "Oblique" },
              { value: "unstable", label: "Unstable" },
            ]} />
            <Field label="Position" name="position" placeholder="LOA, ROA, etc." />
            <Field label="Engagement" name="engagement" placeholder="Free, 3/5, etc." />
            <Field label="Fetal heart rate (bpm)" name="fetal_heart_rate" type="number" placeholder="140" />
            <Select label="Fetal movements" name="fetal_movements" options={[
              { value: "", label: "Not assessed" },
              { value: "normal", label: "Normal" },
              { value: "reduced", label: "Reduced" },
            ]} />
          </div>
        </Section>

        {/* Urinalysis */}
        <Section title="Urinalysis and oedema">
          <div className="grid grid-cols-3 gap-4">
            <Select label="Protein" name="urine_protein" options={[
              { value: "", label: "Not tested" },
              { value: "nil", label: "Nil" },
              { value: "trace", label: "Trace" },
              { value: "+", label: "+" },
              { value: "++", label: "++" },
              { value: "+++", label: "+++" },
            ]} />
            <Select label="Glucose" name="urine_glucose" options={[
              { value: "", label: "Not tested" },
              { value: "nil", label: "Nil" },
              { value: "trace", label: "Trace" },
              { value: "+", label: "+" },
              { value: "++", label: "++" },
              { value: "+++", label: "+++" },
            ]} />
            <Select label="Oedema" name="oedema" options={[
              { value: "", label: "Not assessed" },
              { value: "nil", label: "Nil" },
              { value: "mild", label: "Mild" },
              { value: "moderate", label: "Moderate" },
              { value: "severe", label: "Severe" },
            ]} />
          </div>
        </Section>

        {/* Investigations */}
        <Section title="Investigations">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Hb result (g/L)" name="hb_result" type="number" />
            <Field label="Blood tests ordered" name="blood_tests_ordered" placeholder="FBC, Ferritin, etc." />
            <div className="flex items-center gap-2 self-end pb-1">
              <input type="checkbox" id="ultrasound_ordered" name="ultrasound_ordered" className="rounded" />
              <label htmlFor="ultrasound_ordered" className="text-sm text-warm-600">Ultrasound ordered</label>
            </div>
            <Field label="Referrals made" name="referrals_made" placeholder="Obstetrician, physio, etc." />
          </div>
        </Section>

        {/* Discussion and plan */}
        <Section title="Discussion and plan">
          <div className="space-y-4">
            <Field label="Topics discussed" name="topics_discussed" placeholder="Nutrition, birth plan, etc." />
            <TextArea label="Plan" name="plan" placeholder="Follow-up actions, referrals..." />
            <TextArea label="Notes" name="notes" placeholder="Additional notes..." />
          </div>
        </Section>

        {/* Next visit */}
        <Section title="Next visit">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Next visit date" name="next_visit_date" type="date" />
            <Field label="Next visit gestation" name="next_visit_gestation" placeholder="34+0" className="font-mono" />
          </div>
        </Section>

        {/* Admin */}
        <Section title="Administration">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration (minutes)" name="duration_minutes" type="number" defaultValue="30" />
            <div className="space-y-3 self-center">
              <Checkbox label="After hours" name="after_hours" />
              <Checkbox label="Interpreter present" name="interpreter_present" />
              <Checkbox label="Midwife signature" name="midwife_signature" defaultChecked />
            </div>
          </div>
        </Section>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-warm-600 bg-white border border-warm-200 rounded-[10px] hover:bg-warm-50 transition-colors duration-150"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2 text-sm font-medium text-white bg-sage-600 rounded-[10px] hover:bg-sage-700 disabled:opacity-50 transition-colors duration-150"
          >
            {saving ? "Saving..." : "Save visit"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-[14px] border border-warm-200 p-6">
      <h2 className="text-[15px] font-medium text-sage-900 mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label, name, type = "text", required = false, placeholder, defaultValue, step, className = "",
}: {
  label: string; name: string; type?: string; required?: boolean;
  placeholder?: string; defaultValue?: string; step?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">
        {label}
      </label>
      <input
        id={name} name={name} type={type} required={required}
        placeholder={placeholder} defaultValue={defaultValue} step={step}
        className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
      />
    </div>
  );
}

function Select({ label, name, options, defaultValue }: {
  label: string; name: string; defaultValue?: string;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">
        {label}
      </label>
      <select
        id={name} name={name} defaultValue={defaultValue}
        className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

function TextArea({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">
        {label}
      </label>
      <textarea
        id={name} name={name} rows={3} placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
      />
    </div>
  );
}

function Checkbox({ label, name, defaultChecked = false }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <input type="checkbox" id={name} name={name} defaultChecked={defaultChecked} className="rounded" />
      <label htmlFor={name} className="text-sm text-warm-600">{label}</label>
    </div>
  );
}
