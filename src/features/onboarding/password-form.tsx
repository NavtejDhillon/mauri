"use client";

import { useActionState } from "react";
import { setPassword } from "./actions";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function PasswordForm() {
  const [state, action] = useActionState(setPassword, null);
  return (
    <form action={action} className="bg-white rounded-[14px] border border-warm-200 p-6 space-y-4">
      <FormField id="password" label="New password" type="password" autoComplete="new-password" required />
      <FormField id="confirm" label="Confirm password" type="password" autoComplete="new-password" required />
      <p className="text-xs text-warm-400">At least 12 characters. A short sentence works well.</p>
      <FormMessage error={state?.error} />
      <SubmitButton pendingText="Saving...">Save password</SubmitButton>
    </form>
  );
}
