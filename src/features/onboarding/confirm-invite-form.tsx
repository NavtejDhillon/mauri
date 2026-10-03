"use client";

import { useActionState } from "react";
import { confirmInvite } from "./confirm-invite";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function ConfirmInviteForm({ tokenHash }: { tokenHash: string }) {
  const [state, action] = useActionState(confirmInvite, null);
  return (
    <form action={action} className="bg-white rounded-[14px] border border-warm-200 p-6 space-y-4">
      <input type="hidden" name="token_hash" value={tokenHash} />
      <input type="hidden" name="type" value="invite" />
      <p className="text-sm text-warm-600">You have been invited to Mauri. Continue to choose your password and set up your account.</p>
      <FormMessage error={state?.error} />
      <SubmitButton pendingText="Checking your invitation...">Continue</SubmitButton>
    </form>
  );
}
