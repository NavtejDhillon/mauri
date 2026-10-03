"use client";

import { useActionState } from "react";
import { verifyMfa } from "./verify-mfa";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { submissionKey } from "@/components/ui/submission-key";

// The code is not kept after a failed attempt: each code is used once.
export function MfaChallengeForm() {
  const [state, action] = useActionState(verifyMfa, null);
  return (
    <form action={action} className="bg-white rounded-[14px] border border-warm-200 p-6 space-y-4">
      <FormField id="code" label="Authenticator code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required placeholder="000000" />
      {/* Keyed so a repeated message (a second wrong code) is announced again. */}
      <FormMessage key={submissionKey(state)} error={state?.error} />
      <SubmitButton pendingText="Checking...">Continue</SubmitButton>
    </form>
  );
}
