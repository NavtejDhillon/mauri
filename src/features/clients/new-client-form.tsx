"use client";

import { useActionState } from "react";
import { createClientRecord } from "./actions";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function NewClientForm() {
  const [state, action] = useActionState(createClientRecord, null);
  return (
    <form action={action} className="bg-white rounded-[14px] border border-warm-200 p-6 space-y-4 md:max-w-lg">
      <FormField id="first_name" label="First name" required autoComplete="off" />
      <FormField id="last_name" label="Surname" required autoComplete="off" />
      <FormField id="preferred_name" label="Preferred name" autoComplete="off" />
      <FormField id="nhi" label="NHI number" autoComplete="off" placeholder="ABC1234" maxLength={7} />
      <FormField id="date_of_birth" label="Date of birth" type="date" autoComplete="off" />
      <FormMessage error={state?.error} />
      <SubmitButton pendingText="Saving...">Save client</SubmitButton>
    </form>
  );
}
