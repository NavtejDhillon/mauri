"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient, createRegistration } from "@/hooks/use-clients";

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

    // Create registration if EDD provided
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

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-warm-400 hover:text-warm-600 transition-colors duration-150 mb-2"
        >
          &larr; Back
        </button>
        <h1 className="text-[26px] font-semibold text-sage-900">New client</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal details */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">Personal details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" name="first_name" required />
            <Field label="Last name" name="last_name" required />
            <Field label="Preferred name" name="preferred_name" />
            <Field label="NHI" name="nhi" placeholder="ABC1234" className="font-mono" />
            <Field label="Date of birth" name="date_of_birth" type="date" />
            <Field label="Phone" name="phone" type="tel" />
            <Field label="Email" name="email" type="email" className="col-span-2" />
          </div>
        </section>

        {/* Address */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">Address</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Address line 1" name="address_line_1" className="col-span-2" />
            <Field label="Address line 2" name="address_line_2" className="col-span-2" />
            <Field label="City/Town" name="city" />
            <Field label="Postcode" name="postcode" />
          </div>
        </section>

        {/* Demographics */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">Demographics</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ethnicity" name="ethnicity" />
            <Field label="Iwi affiliation" name="iwi_affiliation" />
            <Field label="Language" name="language" defaultValue="English" />
            <div className="flex items-center gap-2 self-end pb-1">
              <input type="checkbox" id="interpreter_required" name="interpreter_required" className="rounded" />
              <label htmlFor="interpreter_required" className="text-sm text-warm-600">Interpreter required</label>
            </div>
          </div>
        </section>

        {/* GP details */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">GP details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="GP name" name="gp_name" />
            <Field label="GP practice" name="gp_practice" />
            <Field label="GP phone" name="gp_phone" type="tel" />
          </div>
        </section>

        {/* Emergency contact */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">Emergency contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" name="emergency_contact_name" />
            <Field label="Phone" name="emergency_contact_phone" type="tel" />
            <Field label="Relationship" name="emergency_contact_relationship" />
          </div>
        </section>

        {/* Registration / Pregnancy */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">Pregnancy registration</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Agreed EDD" name="agreed_edd" type="date" />
            <div>
              <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">
                EDD method
              </label>
              <select
                name="edd_method"
                className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
              >
                <option value="">Select...</option>
                <option value="ultrasound">Ultrasound</option>
                <option value="lmp">LMP</option>
                <option value="clinical">Clinical</option>
              </select>
            </div>
            <Field label="Gravida" name="gravida" type="number" />
            <Field label="Parity" name="parity" type="number" />
          </div>
        </section>

        {/* Notes */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">Notes</h2>
          <textarea
            name="notes"
            rows={3}
            className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
            placeholder="Any additional notes..."
          />
        </section>

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
            {saving ? "Saving..." : "Save client"}
          </button>
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
  className = "",
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}) {
  return (
    <div className={className}>
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
        className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
      />
    </div>
  );
}
