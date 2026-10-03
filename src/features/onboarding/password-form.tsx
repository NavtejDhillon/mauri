"use client";

import { useActionState } from "react";
import { setPassword } from "./set-password";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { submissionKey } from "@/components/ui/submission-key";

// Passwords are never sent back, so both fields are empty again after an error.
export function PasswordForm() {
  const [state, action] = useActionState(setPassword, null);
  const errorFor = (id: string) => (state?.field === id ? state.error : undefined);
  return (
    <form action={action} className="bg-white rounded-[14px] border border-warm-200 p-6 space-y-4">
      <div key={submissionKey(state)} className="space-y-4">
        <FormField id="password" label="New password" type="password" autoComplete="new-password" required hint="At least 12 characters. A short sentence works well." error={errorFor("password")} />
        <FormField id="confirm" label="Confirm password" type="password" autoComplete="new-password" required error={errorFor("confirm")} />
        <FormMessage error={state?.field ? null : state?.error} />
      </div>
      <SubmitButton pendingText="Saving...">Save password</SubmitButton>
    </form>
  );
}
