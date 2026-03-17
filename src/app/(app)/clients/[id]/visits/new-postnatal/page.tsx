"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db/schema";
import { createPostnatalVisit } from "@/hooks/use-visits";
import { checkPostnatalAlerts } from "@/lib/clinical/alerts";
import type {
  Registration, PostnatalVisit, VisitType, Lochia, PerineumWound,
  FeedingType, JaundiceAssessment, CordStatus, HearingTest, MetabolicScreen, RedEyeTest,
} from "@/lib/supabase/types";
import type { SyncableRecord } from "@/lib/db/schema";

export default function NewPostnatalVisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params);
  const router = useRouter();
  const [registration, setRegistration] = useState<(Registration & SyncableRecord) | null>(null);
  const [saving, setSaving] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState<ReturnType<typeof checkPostnatalAlerts>>([]);

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

  function handleFieldChange(form: HTMLFormElement) {
    const fd = new FormData(form);
    const num = (k: string) => { const v = fd.get(k) as string; return v ? parseFloat(v) : null; };
    const str = (k: string) => (fd.get(k) as string) || null;

    const partial = {
      maternal_bp_systolic: num("maternal_bp_systolic"),
      maternal_bp_diastolic: num("maternal_bp_diastolic"),
      edinburgh_pnd_score: num("edinburgh_pnd_score"),
      lochia: (str("lochia") || null) as Lochia | null,
      jaundice_assessment: (str("jaundice_assessment") || null) as JaundiceAssessment | null,
    } as PostnatalVisit;

    setLiveAlerts(checkPostnatalAlerts(partial));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!registration) return;
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    const str = (k: string) => (fd.get(k) as string) || null;
    const num = (k: string) => { const v = fd.get(k) as string; return v ? parseFloat(v) : null; };
    const bool = (k: string) => fd.get(k) === "on";

    await createPostnatalVisit({
      registration_id: registration.id,
      practitioner_id: "pending",
      visit_date: str("visit_date") || today,
      visit_time: str("visit_time"),
      baby_age_days: num("baby_age_days"),
      location: str("location"),
      visit_type: (str("visit_type") as VisitType) || "routine",
      maternal_bp_systolic: num("maternal_bp_systolic"),
      maternal_bp_diastolic: num("maternal_bp_diastolic"),
      maternal_pulse: num("maternal_pulse"),
      maternal_temperature: num("maternal_temperature"),
      lochia: (str("lochia") as Lochia) || null,
      uterus: str("uterus"),
      perineum: str("perineum"),
      perineum_wound: (str("perineum_wound") as PerineumWound) || null,
      breasts: str("breasts"),
      breastfeeding_assessment: str("breastfeeding_assessment"),
      maternal_mood: str("maternal_mood"),
      edinburgh_pnd_score: num("edinburgh_pnd_score"),
      maternal_concerns: str("maternal_concerns"),
      baby_weight_g: num("baby_weight_g"),
      baby_weight_change: str("baby_weight_change"),
      feeding_type: (str("feeding_type") as FeedingType) || null,
      feeding_frequency: str("feeding_frequency"),
      feeding_concerns: str("feeding_concerns"),
      baby_skin_colour: str("baby_skin_colour"),
      jaundice_assessment: (str("jaundice_assessment") as JaundiceAssessment) || null,
      cord: (str("cord") as CordStatus) || null,
      baby_bowels: str("baby_bowels"),
      baby_urine: str("baby_urine"),
      hearing_test: (str("hearing_test") as HearingTest) || null,
      hearing_test_date: str("hearing_test_date"),
      newborn_metabolic_screen: (str("newborn_metabolic_screen") as MetabolicScreen) || null,
      newborn_metabolic_screen_date: str("newborn_metabolic_screen_date"),
      baby_hips: str("baby_hips"),
      red_eye_test: (str("red_eye_test") as RedEyeTest) || null,
      immunisations_discussed: bool("immunisations_discussed"),
      safe_sleep_discussed: bool("safe_sleep_discussed"),
      car_seat_discussed: bool("car_seat_discussed"),
      well_child_referral: bool("well_child_referral"),
      well_child_provider: str("well_child_provider"),
      notes: str("notes"),
      plan: str("plan"),
      after_hours: bool("after_hours"),
      duration_minutes: num("duration_minutes"),
      interpreter_present: bool("interpreter_present"),
      next_visit_date: str("next_visit_date"),
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
        <h1 className="text-[26px] font-semibold text-sage-900">New postnatal visit</h1>
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
            <Field label="Baby age (days)" name="baby_age_days" type="number" />
          </div>
        </Section>

        {/* Maternal assessment */}
        <Section title="Maternal assessment">
          <div className="grid grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-2">
              <Field label="BP systolic" name="maternal_bp_systolic" type="number" placeholder="120" />
              <Field label="BP diastolic" name="maternal_bp_diastolic" type="number" placeholder="80" />
            </div>
            <Field label="Pulse (bpm)" name="maternal_pulse" type="number" />
            <Field label="Temperature (C)" name="maternal_temperature" type="number" step="0.1" />
            <Select label="Lochia" name="lochia" options={[
              { value: "", label: "Not assessed" },
              { value: "normal", label: "Normal" },
              { value: "heavy", label: "Heavy" },
              { value: "offensive", label: "Offensive" },
              { value: "absent", label: "Absent" },
            ]} />
            <Field label="Uterus" name="uterus" placeholder="Involuting, firm, etc." />
            <Field label="Perineum" name="perineum" placeholder="Intact, healing, etc." />
            <Select label="Perineum wound" name="perineum_wound" options={[
              { value: "", label: "N/A" },
              { value: "intact", label: "Intact" },
              { value: "healing", label: "Healing" },
              { value: "infected", label: "Infected" },
              { value: "dehisced", label: "Dehisced" },
            ]} />
            <Field label="Breasts" name="breasts" placeholder="Soft, engorged, etc." />
            <Field label="Breastfeeding assessment" name="breastfeeding_assessment" placeholder="Good latch, etc." />
          </div>
        </Section>

        {/* Mental health */}
        <Section title="Mental health">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Maternal mood" name="maternal_mood" placeholder="Well, anxious, tearful..." />
            <Field label="Edinburgh PND score" name="edinburgh_pnd_score" type="number" placeholder="0-30" />
            <TextArea label="Maternal concerns" name="maternal_concerns" className="col-span-2" />
          </div>
        </Section>

        {/* Baby assessment */}
        <Section title="Baby assessment">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Baby weight (g)" name="baby_weight_g" type="number" placeholder="3500" />
            <Field label="Weight change" name="baby_weight_change" placeholder="+50g, -3%, etc." />
            <Select label="Feeding type" name="feeding_type" options={[
              { value: "", label: "Not assessed" },
              { value: "exclusive_breast", label: "Exclusive breast" },
              { value: "predominantly_breast", label: "Predominantly breast" },
              { value: "mixed", label: "Mixed" },
              { value: "artificial", label: "Artificial" },
            ]} />
            <Field label="Feeding frequency" name="feeding_frequency" placeholder="8-12x per day" />
            <Field label="Feeding concerns" name="feeding_concerns" />
            <Field label="Skin colour" name="baby_skin_colour" placeholder="Pink, pale, etc." />
            <Select label="Jaundice" name="jaundice_assessment" options={[
              { value: "", label: "Not assessed" },
              { value: "none", label: "None" },
              { value: "mild", label: "Mild" },
              { value: "moderate", label: "Moderate" },
              { value: "severe", label: "Severe" },
            ]} />
            <Select label="Cord" name="cord" options={[
              { value: "", label: "Not assessed" },
              { value: "intact", label: "Intact" },
              { value: "separating", label: "Separating" },
              { value: "separated", label: "Separated" },
              { value: "infected", label: "Infected" },
            ]} />
            <Field label="Bowels" name="baby_bowels" placeholder="Normal, meconium, etc." />
            <Field label="Urine" name="baby_urine" placeholder="Adequate, etc." />
            <Field label="Hips" name="baby_hips" placeholder="Normal, click, etc." />
          </div>
        </Section>

        {/* Newborn screening */}
        <Section title="Newborn screening">
          <div className="grid grid-cols-2 gap-4">
            <Select label="Hearing test" name="hearing_test" options={[
              { value: "", label: "Not done" },
              { value: "pass", label: "Pass" },
              { value: "refer", label: "Refer" },
            ]} />
            <Field label="Hearing test date" name="hearing_test_date" type="date" />
            <Select label="Metabolic screen" name="newborn_metabolic_screen" options={[
              { value: "", label: "Not done" },
              { value: "done", label: "Done" },
              { value: "declined", label: "Declined" },
            ]} />
            <Field label="Metabolic screen date" name="newborn_metabolic_screen_date" type="date" />
            <Select label="Red eye test" name="red_eye_test" options={[
              { value: "", label: "Not done" },
              { value: "normal", label: "Normal" },
              { value: "abnormal", label: "Abnormal" },
            ]} />
          </div>
        </Section>

        {/* Education and referrals */}
        <Section title="Education and referrals">
          <div className="space-y-3">
            <Checkbox label="Immunisations discussed" name="immunisations_discussed" />
            <Checkbox label="Safe sleep discussed" name="safe_sleep_discussed" />
            <Checkbox label="Car seat discussed" name="car_seat_discussed" />
            <Checkbox label="Well Child referral made" name="well_child_referral" />
            <Field label="Well Child provider" name="well_child_provider" placeholder="Plunket, Tamariki Ora, etc." />
          </div>
        </Section>

        {/* Plan and notes */}
        <Section title="Plan and notes">
          <div className="space-y-4">
            <TextArea label="Plan" name="plan" placeholder="Follow-up actions..." />
            <TextArea label="Notes" name="notes" placeholder="Additional notes..." />
            <Field label="Next visit date" name="next_visit_date" type="date" />
          </div>
        </Section>

        {/* Admin */}
        <Section title="Administration">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Duration (minutes)" name="duration_minutes" type="number" defaultValue="45" />
            <div className="space-y-3 self-center">
              <Checkbox label="After hours" name="after_hours" />
              <Checkbox label="Interpreter present" name="interpreter_present" />
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

function TextArea({ label, name, placeholder, className = "" }: { label: string; name: string; placeholder?: string; className?: string }) {
  return (
    <div className={className}>
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
