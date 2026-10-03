"use client";

import { useActionState } from "react";
import { completeProfile } from "./actions";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function ProfileForm() {
  const [state, action] = useActionState(completeProfile, null);
  return (
    <form action={action} className="bg-white rounded-[14px] border border-warm-200 p-6 space-y-4">
      <FormField id="full_name" label="Full name" autoComplete="name" required />
      <FormField id="phone" label="Mobile" type="tel" autoComplete="tel" inputMode="tel" />
      <FormField id="midwifery_council_number" label="Midwifery Council number" />
      <FormField id="hpi_cpn" label="HPI number (CPN)" />
      <FormMessage error={state?.error} />
      <SubmitButton pendingText="Saving...">Finish setup</SubmitButton>
    </form>
  );
}
