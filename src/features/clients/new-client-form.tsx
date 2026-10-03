"use client";

import { useActionState } from "react";
import { createClientRecord } from "./actions";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { submissionKey } from "@/components/ui/submission-key";

export function NewClientForm() {
  const [state, action] = useActionState(createClientRecord, null);
  const key = submissionKey(state);
  const values = state?.values ?? {};
  const errorFor = (id: string) => (state?.field === id ? state.error : undefined);
  // Names are left as typed: no autocorrect or capitalisation changes to te reo Māori names.
  const name = { autoComplete: "off", autoCapitalize: "words", spellCheck: false } as const;
  return (
    <form action={action} className="bg-white rounded-[14px] border border-warm-200 p-6 space-y-4 md:max-w-lg">
      {/* Keyed per submission so the values she entered come back after an error. */}
      <div key={key} className="space-y-4">
        <FormField id="first_name" label="First name" required {...name} defaultValue={values.first_name} error={errorFor("first_name")} />
        <FormField id="last_name" label="Surname" required {...name} defaultValue={values.last_name} error={errorFor("last_name")} />
        <FormField id="preferred_name" label="Preferred name" {...name} defaultValue={values.preferred_name} />
        <FormField id="nhi" label="NHI number" autoComplete="off" autoCapitalize="characters" spellCheck={false} placeholder="ABC1234" maxLength={7} defaultValue={values.nhi} error={errorFor("nhi")} />
        <FormField id="date_of_birth" label="Date of birth" type="date" autoComplete="off" defaultValue={values.date_of_birth} />
        <FormMessage error={state?.field ? null : state?.error} />
      </div>
      <SubmitButton pendingText="Saving...">Save client</SubmitButton>
    </form>
  );
}
