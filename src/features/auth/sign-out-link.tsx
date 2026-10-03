"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signOutHere } from "./actions";
import { FormMessage } from "@/components/ui/form-message";

function LinkButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="text-sm text-warm-600 underline underline-offset-2 py-2 disabled:opacity-50">
      {pending ? "Signing out..." : "Not you? Sign out"}
    </button>
  );
}

// A way out of the MFA and welcome steps: signs out on this device only.
export function SignOutLink() {
  const [state, action] = useActionState(signOutHere, null);
  return (
    <form action={action} className="mt-6 text-center space-y-2">
      <FormMessage error={state?.error} />
      <LinkButton />
    </form>
  );
}
