"use client";

import { useActionState } from "react";
import { verifyMfa } from "./actions";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function MfaChallengeForm() {
  const [state, action] = useActionState(verifyMfa, null);
  return (
    <form action={action} className="bg-white rounded-[14px] border border-warm-200 p-6 space-y-4">
      <FormField id="code" label="Authenticator code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder="000000" />
      <FormMessage error={state?.error} />
      <SubmitButton pendingText="Checking...">Continue</SubmitButton>
    </form>
  );
}
