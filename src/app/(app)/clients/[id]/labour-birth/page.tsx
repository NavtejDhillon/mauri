"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db/schema";
import { createLabourBirth } from "@/hooks/use-visits";
import { MobileHeader } from "@/components/ui/mobile-header";
import type {
  Registration, LabourOnsetType, MembranesRuptureType, LiquorColour,
  BirthType, BirthLocationType, PerineumOutcome, PlacentaDelivery,
  BloodLossType, BabyGender, VitaminK, CordClamping,
} from "@/lib/supabase/types";
import type { SyncableRecord } from "@/lib/db/schema";

export default function LabourBirthPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: clientId } = use(params);
  const router = useRouter();
  const [registration, setRegistration] = useState<(Registration & SyncableRecord) | null>(null);
  const [saving, setSaving] = useState(false);

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

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!registration) return;
    setSaving(true);

    const fd = new FormData(e.currentTarget);
    const str = (k: string) => (fd.get(k) as string) || null;
    const num = (k: string) => { const v = fd.get(k) as string; return v ? parseFloat(v) : null; };
    const bool = (k: string) => fd.get(k) === "on";
    const boolOrNull = (k: string) => { const v = fd.get(k); return v === "on" ? true : v === "off" ? false : null; };

    await createLabourBirth({
      registration_id: registration.id,
      practitioner_id: "pending",
      labour_onset_type: (str("labour_onset_type") as LabourOnsetType) || null,
      labour_onset_datetime: str("labour_onset_datetime"),
      induction_method: str("induction_method"),
      induction_indication: str("induction_indication"),
      membranes_ruptured_datetime: str("membranes_ruptured_datetime"),
      membranes_rupture_type: (str("membranes_rupture_type") as MembranesRuptureType) || null,
      liquor_colour: (str("liquor_colour") as LiquorColour) || null,
      pain_relief: str("pain_relief") ? str("pain_relief")!.split(",").map(s => s.trim()) : null,
      augmentation: bool("augmentation"),
      augmentation_method: str("augmentation_method"),
      complications_labour: str("complications_labour") ? str("complications_labour")!.split(",").map(s => s.trim()) : null,
      birth_datetime: str("birth_datetime") || new Date().toISOString(),
      birth_gestation_weeks: num("birth_gestation_weeks"),
      birth_gestation_days: num("birth_gestation_days"),
      birth_type: (str("birth_type") as BirthType) || "normal_vaginal",
      birth_position: str("birth_position"),
      birth_location: str("birth_location") || "",
      birth_location_type: (str("birth_location_type") as BirthLocationType) || null,
      perineum_outcome: (str("perineum_outcome") as PerineumOutcome) || null,
      episiotomy_type: str("episiotomy_type"),
      suturing: str("suturing"),
      placenta_delivery: (str("placenta_delivery") as PlacentaDelivery) || null,
      placenta_delivery_datetime: str("placenta_delivery_datetime"),
      placenta_complete: boolOrNull("placenta_complete"),
      blood_loss_ml: num("blood_loss_ml"),
      blood_loss_type: (str("blood_loss_type") as BloodLossType) || null,
      baby_gender: (str("baby_gender") as BabyGender) || null,
      baby_weight_g: num("baby_weight_g") || 0,
      baby_length_cm: num("baby_length_cm"),
      baby_head_circumference_cm: num("baby_head_circumference_cm"),
      apgar_1: num("apgar_1"),
      apgar_5: num("apgar_5"),
      apgar_10: num("apgar_10"),
      resuscitation: str("resuscitation") ? str("resuscitation")!.split(",").map(s => s.trim()) : null,
      baby_nhi: str("baby_nhi"),
      skin_to_skin: boolOrNull("skin_to_skin"),
      skin_to_skin_duration_minutes: num("skin_to_skin_duration_minutes"),
      breastfeeding_initiated: boolOrNull("breastfeeding_initiated"),
      first_breastfeed_minutes: num("breastfeeding_initiated_minutes"),
      abnormalities_noted: str("abnormalities_noted"),
      baby_admitted_nicu: bool("baby_admitted_nicu"),
      nicu_reason: str("nicu_reason"),
      backup_lmc: str("backup_lmc"),
      other_practitioners: str("other_practitioners") ? str("other_practitioners")!.split(",").map(s => s.trim()) : null,

      vitamin_k: (str("vitamin_k") as VitaminK) || null,
      cord_clamping: (str("cord_clamping") as CordClamping) || null,
      cord_blood_collected: bool("cord_blood_collected"),
      notes: str("notes"),
    });

    router.push(`/clients/${clientId}`);
  }

  if (!registration) {
    return <div className="text-sm text-warm-400">Loading registration...</div>;
  }

  return (
    <div className="md:max-w-2xl">
      <MobileHeader title="Labour and birth record" showBack />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Labour */}
        <Section title="Labour">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Onset type" name="labour_onset_type" options={[
              { value: "", label: "Select..." },
              { value: "spontaneous", label: "Spontaneous" },
              { value: "induced", label: "Induced" },
              { value: "no_labour", label: "No labour (elective CS)" },
            ]} />
            <Field label="Onset date/time" name="labour_onset_datetime" type="datetime-local" />
            <Field label="Induction method" name="induction_method" placeholder="Prostaglandin, ARM, etc." />
            <Field label="Induction indication" name="induction_indication" />
            <Field label="Membranes ruptured" name="membranes_ruptured_datetime" type="datetime-local" />
            <Select label="Membranes rupture type" name="membranes_rupture_type" options={[
              { value: "", label: "Select..." },
              { value: "spontaneous", label: "Spontaneous" },
              { value: "artificial", label: "Artificial" },
            ]} />
            <Select label="Liquor colour" name="liquor_colour" options={[
              { value: "", label: "Select..." },
              { value: "clear", label: "Clear" },
              { value: "meconium_light", label: "Meconium (light)" },
              { value: "meconium_heavy", label: "Meconium (heavy)" },
              { value: "blood_stained", label: "Blood stained" },
            ]} />
            <Field label="Pain relief" name="pain_relief" placeholder="Entonox, water, epidural, etc." />
            <div className="flex items-center gap-3 min-h-[44px]">
              <input type="checkbox" id="augmentation" name="augmentation" className="w-5 h-5 rounded" />
              <label htmlFor="augmentation" className="text-sm text-warm-600">Augmentation</label>
            </div>
            <Field label="Augmentation method" name="augmentation_method" />
            <Field label="Complications" name="complications_labour" placeholder="Comma-separated" className="md:col-span-2" />
          </div>
        </Section>

        {/* Birth */}
        <Section title="Birth">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Birth date/time" name="birth_datetime" type="datetime-local" required />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Gestation weeks" name="birth_gestation_weeks" type="number" />
              <Field label="Days" name="birth_gestation_days" type="number" />
            </div>
            <Select label="Birth type" name="birth_type" options={[
              { value: "normal_vaginal", label: "Normal vaginal" },
              { value: "assisted_vacuum", label: "Assisted (vacuum)" },
              { value: "assisted_forceps", label: "Assisted (forceps)" },
              { value: "elective_caesarean", label: "Elective caesarean" },
              { value: "emergency_caesarean", label: "Emergency caesarean" },
              { value: "breech_vaginal", label: "Breech vaginal" },
            ]} />
            <Field label="Birth position" name="birth_position" placeholder="Semi-recumbent, all fours, etc." />
            <Field label="Birth location" name="birth_location" placeholder="Home, Grey Base, etc." required />
            <Select label="Location type" name="birth_location_type" options={[
              { value: "", label: "Select..." },
              { value: "home", label: "Home" },
              { value: "primary_unit", label: "Primary unit" },
              { value: "secondary_hospital", label: "Secondary hospital" },
              { value: "tertiary_hospital", label: "Tertiary hospital" },
            ]} />
          </div>
        </Section>

        {/* Perineum and placenta */}
        <Section title="Perineum and placenta">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Perineum outcome" name="perineum_outcome" options={[
              { value: "", label: "Select..." },
              { value: "intact", label: "Intact" },
              { value: "graze", label: "Graze" },
              { value: "first_degree", label: "1st degree tear" },
              { value: "second_degree", label: "2nd degree tear" },
              { value: "third_degree", label: "3rd degree tear" },
              { value: "fourth_degree", label: "4th degree tear" },
              { value: "episiotomy", label: "Episiotomy" },
            ]} />
            <Field label="Episiotomy type" name="episiotomy_type" />
            <Field label="Suturing" name="suturing" placeholder="Continuous, interrupted, etc." />
            <Select label="Placenta delivery" name="placenta_delivery" options={[
              { value: "", label: "Select..." },
              { value: "physiological", label: "Physiological" },
              { value: "active_management", label: "Active management" },
              { value: "manual_removal", label: "Manual removal" },
            ]} />
            <Field label="Placenta delivery time" name="placenta_delivery_datetime" type="datetime-local" />
            <div className="flex items-center gap-3 min-h-[44px]">
              <input type="checkbox" id="placenta_complete" name="placenta_complete" className="w-5 h-5 rounded" defaultChecked />
              <label htmlFor="placenta_complete" className="text-sm text-warm-600">Placenta and membranes complete</label>
            </div>
            <Field label="Blood loss (ml)" name="blood_loss_ml" type="number" placeholder="300" />
            <Select label="Blood loss type" name="blood_loss_type" options={[
              { value: "", label: "Select..." },
              { value: "normal", label: "Normal" },
              { value: "pph_minor", label: "PPH minor (500-999ml)" },
              { value: "pph_major", label: "PPH major (1000ml+)" },
            ]} />
          </div>
        </Section>

        {/* Baby */}
        <Section title="Baby">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select label="Gender" name="baby_gender" options={[
              { value: "", label: "Select..." },
              { value: "male", label: "Male" },
              { value: "female", label: "Female" },
              { value: "indeterminate", label: "Indeterminate" },
            ]} />
            <Field label="Baby NHI" name="baby_nhi" placeholder="ABC1234" className="font-mono" />
            <Field label="Weight (g)" name="baby_weight_g" type="number" placeholder="3500" required />
            <Field label="Length (cm)" name="baby_length_cm" type="number" step="0.1" />
            <Field label="Head circumference (cm)" name="baby_head_circumference_cm" type="number" step="0.1" />
            <div className="grid grid-cols-3 gap-2">
              <Field label="Apgar 1min" name="apgar_1" type="number" />
              <Field label="Apgar 5min" name="apgar_5" type="number" />
              <Field label="Apgar 10min" name="apgar_10" type="number" />
            </div>
            <Field label="Resuscitation" name="resuscitation" placeholder="Stimulation, suction, etc." />
          </div>
        </Section>

        {/* Immediate postnatal */}
        <Section title="Immediate postnatal">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <Checkbox label="Skin to skin" name="skin_to_skin" defaultChecked />
              <Checkbox label="Breastfeeding initiated" name="breastfeeding_initiated" />
              <Checkbox label="Cord blood collected" name="cord_blood_collected" />

            </div>
            <div className="space-y-4">
              <Field label="Skin to skin duration (min)" name="skin_to_skin_duration_minutes" type="number" />
              <Field label="First feed at (min)" name="breastfeeding_initiated_minutes" type="number" />
              <Select label="Vitamin K" name="vitamin_k" options={[
                { value: "", label: "Select..." },
                { value: "im", label: "IM" },
                { value: "oral", label: "Oral" },
                { value: "declined", label: "Declined" },
              ]} />
              <Select label="Cord clamping" name="cord_clamping" options={[
                { value: "", label: "Select..." },
                { value: "delayed", label: "Delayed" },
                { value: "immediate", label: "Immediate" },
              ]} />
            </div>
          </div>
        </Section>

        {/* Other practitioners */}
        <Section title="Other details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Abnormalities noted" name="abnormalities_noted" />
            <div className="space-y-3">
              <Checkbox label="Baby admitted to NICU" name="baby_admitted_nicu" />
            </div>
            <Field label="NICU reason" name="nicu_reason" />
            <Field label="Backup LMC" name="backup_lmc" />
            <Field label="Other practitioners" name="other_practitioners" placeholder="Comma-separated" className="md:col-span-2" />
          </div>
        </Section>

        {/* Notes */}
        <Section title="Notes">
          <TextArea label="Notes" name="notes" placeholder="Birth narrative, additional details..." />
        </Section>

        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:static bg-warm-50 md:bg-transparent py-3 md:py-0 -mx-4 px-4 md:mx-0 md:px-0 border-t border-warm-200 md:border-0">
          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="flex-1 md:flex-none px-4 py-3 md:py-2 text-sm font-medium text-warm-600 bg-white border border-warm-200 rounded-[10px] active:bg-warm-50 transition-colors duration-150">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 md:flex-none px-6 py-3 md:py-2 text-sm font-medium text-white bg-sage-600 rounded-[10px] active:bg-sage-700 disabled:opacity-50 transition-colors duration-150">
              {saving ? "Saving..." : "Save record"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="bg-white rounded-[14px] border border-warm-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full p-4 md:p-6 text-left"
      >
        <h2 className="text-[15px] font-medium text-sage-900">{title}</h2>
        <svg className={`w-5 h-5 text-warm-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 md:px-6 md:pb-6 -mt-1">{children}</div>}
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
        className="w-full px-3 py-3 md:py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
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
        className="w-full px-3 py-3 md:py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
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
        id={name} name={name} rows={4} placeholder={placeholder}
        className="w-full px-3 py-3 md:py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
      />
    </div>
  );
}

function Checkbox({ label, name, defaultChecked = false }: { label: string; name: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center gap-3 min-h-[44px]">
      <input type="checkbox" id={name} name={name} defaultChecked={defaultChecked} className="w-5 h-5 rounded" />
      <label htmlFor={name} className="text-sm text-warm-600">{label}</label>
    </div>
  );
}
