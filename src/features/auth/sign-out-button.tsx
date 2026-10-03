"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signOut } from "./actions";
import { FormMessage } from "@/components/ui/form-message";

function Button() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full md:w-auto min-h-11 px-4 py-2.5 text-sm font-medium rounded-[10px] text-coral-600 bg-coral-50 border border-coral-100 active:bg-coral-100 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? "Signing out..." : "Sign out everywhere"}
    </button>
  );
}

// Ends every session for this account, and says so if that did not work.
export function SignOutButton() {
  const [state, action] = useActionState(signOut, null);
  return (
    <form action={action} className="space-y-3">
      <FormMessage error={state?.error} />
      <Button />
    </form>
  );
}
