"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, createRegistration } from "@/hooks/use-clients";
import { MobileHeader } from "@/components/ui/mobile-header";

export default function NewClientPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const get = (key: string) => (form.get(key) as string) || null;

    const client = await createClient({
      practitioner_id: "pending",
      nhi: get("nhi"),
      first_name: get("first_name") || "",
      last_name: get("last_name") || "",
      preferred_name: get("preferred_name"),
      date_of_birth: get("date_of_birth"),
      address_line_1: get("address_line_1"),
      address_line_2: get("address_line_2"),
      city: get("city"),
      postcode: get("postcode"),
      lat: null,
      lng: null,
      phone: get("phone"),
      email: get("email"),
      ethnicity: get("ethnicity") ? [get("ethnicity")!] : null,
      iwi_affiliation: get("iwi_affiliation"),
      language: get("language") || "English",
      interpreter_required: form.get("interpreter_required") === "on",
      gp_name: get("gp_name"),
      gp_practice: get("gp_practice"),
      gp_phone: get("gp_phone"),
      emergency_contact_name: get("emergency_contact_name"),
      emergency_contact_phone: get("emergency_contact_phone"),
      emergency_contact_relationship: get("emergency_contact_relationship"),
      notes: get("notes"),
    });

    const edd = get("agreed_edd");
    if (edd) {
      await createRegistration({
        client_id: client.id,
        practitioner_id: "pending",
        registration_date: new Date().toISOString().split("T")[0],
        agreed_edd: edd,
        edd_method: (get("edd_method") as "lmp" | "ultrasound" | "clinical") || null,
        registration_gestation_weeks: null,
        registration_gestation_days: null,
        gravida: get("gravida") ? parseInt(get("gravida")!) : null,
        parity: get("parity") ? parseInt(get("parity")!) : null,
        transfer_in_from: null,
        transfer_in_date: null,
        transfer_out_to: null,
        transfer_out_date: null,
        status: "active",
        discharge_date: null,
      });
    }

    router.push(`/clients/${client.id}`);
  }

  const inputClass = "w-full px-3 py-3 md:py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150";

  return (
    <div className="md:max-w-2xl">
      <MobileHeader title="New client" showBack />

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Personal details */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">Personal details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="First name" name="first_name" required inputClass={inputClass} />
            <Field label="Last name" name="last_name" required inputClass={inputClass} />
            <Field label="Preferred name" name="preferred_name" inputClass={inputClass} />
            <Field label="NHI" name="nhi" placeholder="ABC1234" inputClass={inputClass} extraInputClass="font-mono" />
            <Field label="Date of birth" name="date_of_birth" type="date" inputClass={inputClass} />
            <Field label="Phone" name="phone" type="tel" inputClass={inputClass} />
            <div className="md:col-span-2">
              <Field label="Email" name="email" type="email" inputClass={inputClass} />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">Address</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Address line 1" name="address_line_1" inputClass={inputClass} />
            </div>
            <div className="md:col-span-2">
              <Field label="Address line 2" name="address_line_2" inputClass={inputClass} />
            </div>
            <Field label="City/Town" name="city" inputClass={inputClass} />
            <Field label="Postcode" name="postcode" inputClass={inputClass} />
          </div>
        </section>

        {/* Demographics */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">Demographics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Ethnicity" name="ethnicity" inputClass={inputClass} />
            <Field label="Iwi affiliation" name="iwi_affiliation" inputClass={inputClass} />
            <Field label="Language" name="language" defaultValue="English" inputClass={inputClass} />
            <div className="flex items-center gap-3 self-end pb-1 min-h-[44px]">
              <input type="checkbox" id="interpreter_required" name="interpreter_required" className="w-5 h-5 rounded" />
              <label htmlFor="interpreter_required" className="text-sm text-warm-600">Interpreter required</label>
            </div>
          </div>
        </section>

        {/* GP details */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">GP details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="GP name" name="gp_name" inputClass={inputClass} />
            <Field label="GP practice" name="gp_practice" inputClass={inputClass} />
            <Field label="GP phone" name="gp_phone" type="tel" inputClass={inputClass} />
          </div>
        </section>

        {/* Emergency contact */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">Emergency contact</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Name" name="emergency_contact_name" inputClass={inputClass} />
            <Field label="Phone" name="emergency_contact_phone" type="tel" inputClass={inputClass} />
            <Field label="Relationship" name="emergency_contact_relationship" inputClass={inputClass} />
          </div>
        </section>

        {/* Registration / Pregnancy */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">Pregnancy registration</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Agreed EDD" name="agreed_edd" type="date" inputClass={inputClass} />
            <div>
              <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">
                EDD method
              </label>
              <select name="edd_method" className={inputClass}>
                <option value="">Select...</option>
                <option value="ultrasound">Ultrasound</option>
                <option value="lmp">LMP</option>
                <option value="clinical">Clinical</option>
              </select>
            </div>
            <Field label="Gravida" name="gravida" type="number" inputClass={inputClass} />
            <Field label="Parity" name="parity" type="number" inputClass={inputClass} />
          </div>
        </section>

        {/* Notes */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-4 md:p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">Notes</h2>
          <textarea
            name="notes"
            rows={3}
            className={inputClass}
            placeholder="Any additional notes..."
          />
        </section>

        {/* Sticky save bar on mobile */}
        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:static bg-warm-50 md:bg-transparent py-3 md:py-0 -mx-4 px-4 md:mx-0 md:px-0 border-t border-warm-200 md:border-0">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 md:flex-none px-4 py-3 md:py-2 text-sm font-medium text-warm-600 bg-white border border-warm-200 rounded-[10px] active:bg-warm-50 transition-colors duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 md:flex-none px-6 py-3 md:py-2 text-sm font-medium text-white bg-sage-600 rounded-[10px] active:bg-sage-700 disabled:opacity-50 transition-colors duration-150"
            >
              {saving ? "Saving..." : "Save client"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  required = false,
  placeholder,
  defaultValue,
  inputClass,
  extraInputClass = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  inputClass: string;
  extraInputClass?: string;
}) {
  return (
    <div>
      <label htmlFor={name} className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        className={`${inputClass} ${extraInputClass}`}
      />
    </div>
  );
}
