"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db/schema";
import { updateClient, updateRegistration } from "@/hooks/use-clients";
import type { Client, Registration, EddMethod } from "@/lib/supabase/types";
import type { SyncableRecord } from "@/lib/db/schema";

export default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [client, setClient] = useState<(Client & SyncableRecord) | null>(null);
  const [registration, setRegistration] = useState<(Registration & SyncableRecord) | null>(null);
  const [saving, setSaving] = useState(false);
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
      }
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!client) return;
    setSaving(true);

    const form = new FormData(e.currentTarget);
    const get = (key: string) => (form.get(key) as string) || null;

    await updateClient(id, {
      nhi: get("nhi"),
      first_name: get("first_name") || client.first_name,
      last_name: get("last_name") || client.last_name,
      preferred_name: get("preferred_name"),
      date_of_birth: get("date_of_birth"),
      address_line_1: get("address_line_1"),
      address_line_2: get("address_line_2"),
      city: get("city"),
      postcode: get("postcode"),
      phone: get("phone"),
      email: get("email"),
      ethnicity: get("ethnicity") ? [get("ethnicity")!] : client.ethnicity,
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

    if (registration) {
      const edd = get("agreed_edd");
      await updateRegistration(registration.id, {
        agreed_edd: edd || registration.agreed_edd,
        edd_method: (get("edd_method") as EddMethod) || registration.edd_method,
        gravida: get("gravida") ? parseInt(get("gravida")!) : registration.gravida,
        parity: get("parity") ? parseInt(get("parity")!) : registration.parity,
      });
    }

    router.push(`/clients/${id}`);
  }

  if (loading) return <div className="text-sm text-warm-400">Loading...</div>;
  if (!client) return <div className="text-sm text-coral-600">Client not found.</div>;

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-warm-400 hover:text-warm-600 transition-colors duration-150 mb-2"
        >
          &larr; Back
        </button>
        <h1 className="text-[26px] font-semibold text-sage-900">
          Edit {client.preferred_name || client.first_name} {client.last_name}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal details */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">Personal details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name" name="first_name" defaultValue={client.first_name} required />
            <Field label="Last name" name="last_name" defaultValue={client.last_name} required />
            <Field label="Preferred name" name="preferred_name" defaultValue={client.preferred_name ?? ""} />
            <Field label="NHI" name="nhi" defaultValue={client.nhi ?? ""} placeholder="ABC1234" className="font-mono" />
            <Field label="Date of birth" name="date_of_birth" type="date" defaultValue={client.date_of_birth ?? ""} />
            <Field label="Phone" name="phone" type="tel" defaultValue={client.phone ?? ""} />
            <Field label="Email" name="email" type="email" defaultValue={client.email ?? ""} className="col-span-2" />
          </div>
        </section>

        {/* Address */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">Address</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Address line 1" name="address_line_1" defaultValue={client.address_line_1 ?? ""} className="col-span-2" />
            <Field label="Address line 2" name="address_line_2" defaultValue={client.address_line_2 ?? ""} className="col-span-2" />
            <Field label="City/Town" name="city" defaultValue={client.city ?? ""} />
            <Field label="Postcode" name="postcode" defaultValue={client.postcode ?? ""} />
          </div>
        </section>

        {/* Demographics */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">Demographics</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Ethnicity" name="ethnicity" defaultValue={client.ethnicity?.[0] ?? ""} />
            <Field label="Iwi affiliation" name="iwi_affiliation" defaultValue={client.iwi_affiliation ?? ""} />
            <Field label="Language" name="language" defaultValue={client.language} />
            <div className="flex items-center gap-2 self-end pb-1">
              <input type="checkbox" id="interpreter_required" name="interpreter_required" className="rounded" defaultChecked={client.interpreter_required} />
              <label htmlFor="interpreter_required" className="text-sm text-warm-600">Interpreter required</label>
            </div>
          </div>
        </section>

        {/* GP details */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">GP details</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="GP name" name="gp_name" defaultValue={client.gp_name ?? ""} />
            <Field label="GP practice" name="gp_practice" defaultValue={client.gp_practice ?? ""} />
            <Field label="GP phone" name="gp_phone" type="tel" defaultValue={client.gp_phone ?? ""} />
          </div>
        </section>

        {/* Emergency contact */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">Emergency contact</h2>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Name" name="emergency_contact_name" defaultValue={client.emergency_contact_name ?? ""} />
            <Field label="Phone" name="emergency_contact_phone" type="tel" defaultValue={client.emergency_contact_phone ?? ""} />
            <Field label="Relationship" name="emergency_contact_relationship" defaultValue={client.emergency_contact_relationship ?? ""} />
          </div>
        </section>

        {/* Registration / Pregnancy */}
        {registration && (
          <section className="bg-white rounded-[14px] border border-warm-200 p-6">
            <h2 className="text-[15px] font-medium text-sage-900 mb-4">Pregnancy registration</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Agreed EDD" name="agreed_edd" type="date" defaultValue={registration.agreed_edd} />
              <div>
                <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">
                  EDD method
                </label>
                <select
                  name="edd_method"
                  defaultValue={registration.edd_method ?? ""}
                  className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
                >
                  <option value="">Select...</option>
                  <option value="ultrasound">Ultrasound</option>
                  <option value="lmp">LMP</option>
                  <option value="clinical">Clinical</option>
                </select>
              </div>
              <Field label="Gravida" name="gravida" type="number" defaultValue={registration.gravida?.toString() ?? ""} />
              <Field label="Parity" name="parity" type="number" defaultValue={registration.parity?.toString() ?? ""} />
            </div>
          </section>
        )}

        {/* Notes */}
        <section className="bg-white rounded-[14px] border border-warm-200 p-6">
          <h2 className="text-[15px] font-medium text-sage-900 mb-4">Notes</h2>
          <textarea
            name="notes"
            rows={3}
            defaultValue={client.notes ?? ""}
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
            {saving ? "Saving..." : "Save changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label, name, type = "text", required = false, placeholder, defaultValue, className = "",
}: {
  label: string; name: string; type?: string; required?: boolean;
  placeholder?: string; defaultValue?: string; className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={name} className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">
        {label}
      </label>
      <input
        id={name} name={name} type={type} required={required}
        placeholder={placeholder} defaultValue={defaultValue}
        className="w-full px-3 py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
      />
    </div>
  );
}
