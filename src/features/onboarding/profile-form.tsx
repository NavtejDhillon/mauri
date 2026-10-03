"use client";

import { useActionState } from "react";
import { completeProfile } from "./complete-profile";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { submissionKey } from "@/components/ui/submission-key";

export function ProfileForm() {
  const [state, action] = useActionState(completeProfile, null);
  const values = state?.values ?? {};
  const errorFor = (id: string) => (state?.field === id ? state.error : undefined);
  return (
    <form action={action} className="bg-white rounded-[14px] border border-warm-200 p-6 space-y-4">
      {/* Keyed per submission so what she entered comes back after an error. */}
      <div key={submissionKey(state)} className="space-y-4">
        <FormField id="full_name" label="Full name" autoComplete="name" required defaultValue={values.full_name} error={errorFor("full_name")} />
        <FormField id="phone" label="Mobile" type="tel" autoComplete="tel" inputMode="tel" defaultValue={values.phone} />
        <FormField id="midwifery_council_number" label="Midwifery Council number" autoComplete="off" spellCheck={false} defaultValue={values.midwifery_council_number} />
        <FormField id="hpi_cpn" label="HPI number (CPN)" autoComplete="off" spellCheck={false} defaultValue={values.hpi_cpn} />
        <FormMessage error={state?.field ? null : state?.error} />
      </div>
      <SubmitButton pendingText="Saving...">Finish setup</SubmitButton>
    </form>
  );
}
