"use client";

import { useActionState } from "react";
import { signIn } from "./actions";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";

export function LoginForm() {
  const [state, action] = useActionState(signIn, null);
  return (
    <form action={action} className="bg-white rounded-[14px] border border-warm-200 p-6 space-y-4">
      <FormField id="email" label="Email" type="email" autoComplete="email" required placeholder="midwife@example.co.nz" />
      <FormField id="password" label="Password" type="password" autoComplete="current-password" required />
      <FormMessage error={state?.error} />
      <SubmitButton pendingText="Signing in...">Sign in</SubmitButton>
    </form>
  );
}
