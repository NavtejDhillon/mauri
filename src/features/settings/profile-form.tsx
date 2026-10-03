"use client";

import { useActionState } from "react";
import { saveProfile } from "./actions";
import type { Profile } from "./queries";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(saveProfile, null);
  return (
    <form action={action} className="space-y-4">
      <FormField id="full_name" label="Full name" defaultValue={profile.full_name} required />
      <FormField id="phone" label="Mobile" type="tel" inputMode="tel" defaultValue={profile.phone ?? ""} />
      <FormField id="midwifery_council_number" label="Midwifery Council number" defaultValue={profile.midwifery_council_number ?? ""} />
      <FormField id="hpi_cpn" label="HPI number (CPN)" defaultValue={profile.hpi_cpn ?? ""} />
      <p className="text-xs text-warm-400">Signed in as {profile.email}</p>
      <FormMessage error={state && "error" in state ? state.error : null} />
      {state && "saved" in state && <p className="text-sm text-sage-700">Saved.</p>}
      <SubmitButton pendingText="Saving...">Save</SubmitButton>
    </form>
  );
}
