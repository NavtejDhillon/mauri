"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/db/schema";
import { updateClient, updateRegistration } from "@/hooks/use-clients";
import { MobileHeader } from "@/components/ui/mobile-header";
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
    <div className="md:max-w-2xl">
      <MobileHeader title={`Edit ${client.preferred_name || client.first_name} ${client.last_name}`} showBack />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal details */}
        <Section title="Personal details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="First name" name="first_name" defaultValue={client.first_name} required />
            <Field label="Last name" name="last_name" defaultValue={client.last_name} required />
            <Field label="Preferred name" name="preferred_name" defaultValue={client.preferred_name ?? ""} />
            <Field label="NHI" name="nhi" defaultValue={client.nhi ?? ""} placeholder="ABC1234" className="font-mono" />
            <Field label="Date of birth" name="date_of_birth" type="date" defaultValue={client.date_of_birth ?? ""} />
            <Field label="Phone" name="phone" type="tel" defaultValue={client.phone ?? ""} />
            <Field label="Email" name="email" type="email" defaultValue={client.email ?? ""} className="md:col-span-2" />
          </div>
        </Section>

        {/* Address */}
        <Section title="Address">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Address line 1" name="address_line_1" defaultValue={client.address_line_1 ?? ""} className="md:col-span-2" />
            <Field label="Address line 2" name="address_line_2" defaultValue={client.address_line_2 ?? ""} className="md:col-span-2" />
            <Field label="City/Town" name="city" defaultValue={client.city ?? ""} />
            <Field label="Postcode" name="postcode" defaultValue={client.postcode ?? ""} />
          </div>
        </Section>

        {/* Demographics */}
        <Section title="Demographics">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Ethnicity" name="ethnicity" defaultValue={client.ethnicity?.[0] ?? ""} />
            <Field label="Iwi affiliation" name="iwi_affiliation" defaultValue={client.iwi_affiliation ?? ""} />
            <Field label="Language" name="language" defaultValue={client.language} />
            <div className="flex items-center gap-3 min-h-[44px]">
              <input type="checkbox" id="interpreter_required" name="interpreter_required" className="w-5 h-5 rounded" defaultChecked={client.interpreter_required} />
              <label htmlFor="interpreter_required" className="text-sm text-warm-600">Interpreter required</label>
            </div>
          </div>
        </Section>

        {/* GP details */}
        <Section title="GP details">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="GP name" name="gp_name" defaultValue={client.gp_name ?? ""} />
            <Field label="GP practice" name="gp_practice" defaultValue={client.gp_practice ?? ""} />
            <Field label="GP phone" name="gp_phone" type="tel" defaultValue={client.gp_phone ?? ""} />
          </div>
        </Section>

        {/* Emergency contact */}
        <Section title="Emergency contact">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Name" name="emergency_contact_name" defaultValue={client.emergency_contact_name ?? ""} />
            <Field label="Phone" name="emergency_contact_phone" type="tel" defaultValue={client.emergency_contact_phone ?? ""} />
            <Field label="Relationship" name="emergency_contact_relationship" defaultValue={client.emergency_contact_relationship ?? ""} />
          </div>
        </Section>

        {/* Registration / Pregnancy */}
        {registration && (
          <Section title="Pregnancy registration">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Agreed EDD" name="agreed_edd" type="date" defaultValue={registration.agreed_edd} />
              <div>
                <label className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">
                  EDD method
                </label>
                <select
                  name="edd_method"
                  defaultValue={registration.edd_method ?? ""}
                  className="w-full px-3 py-3 md:py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
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
          </Section>
        )}

        {/* Notes */}
        <Section title="Notes">
          <textarea
            name="notes"
            rows={3}
            defaultValue={client.notes ?? ""}
            className="w-full px-3 py-3 md:py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
            placeholder="Any additional notes..."
          />
        </Section>

        <div className="sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:static bg-warm-50 md:bg-transparent py-3 md:py-0 -mx-4 px-4 md:mx-0 md:px-0 border-t border-warm-200 md:border-0">
          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="flex-1 md:flex-none px-4 py-3 md:py-2 text-sm font-medium text-warm-600 bg-white border border-warm-200 rounded-[10px] active:bg-warm-50 transition-colors duration-150">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 md:flex-none px-6 py-3 md:py-2 text-sm font-medium text-white bg-sage-600 rounded-[10px] active:bg-sage-700 disabled:opacity-50 transition-colors duration-150">
              {saving ? "Saving..." : "Save changes"}
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
        className="w-full px-3 py-3 md:py-2 text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 placeholder:text-warm-400 focus:outline-none focus:border-sage-400 focus:ring-1 focus:ring-sage-400 transition-colors duration-150"
      />
    </div>
  );
}
