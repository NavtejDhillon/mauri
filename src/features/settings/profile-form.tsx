"use client";

import { useActionState } from "react";
import { saveProfile } from "./save-profile";
import type { Profile } from "./queries";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { submissionKey } from "@/components/ui/submission-key";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [state, action] = useActionState(saveProfile, null);
  // After a submission, show what she submitted (saved or not); before it, what is on record.
  const values = state?.values ?? {
    full_name: profile.full_name,
    phone: profile.phone ?? "",
    midwifery_council_number: profile.midwifery_council_number ?? "",
    hpi_cpn: profile.hpi_cpn ?? "",
  };
  const error = state && "error" in state ? state : null;
  return (
    <form action={action} className="space-y-4">
      {/* Keyed per submission so React's reset after the action shows these values. */}
      <div key={submissionKey(state)} className="space-y-4">
        <FormField id="full_name" label="Full name" autoComplete="name" required defaultValue={values.full_name} error={error?.field === "full_name" ? error.error : undefined} />
        <FormField id="phone" label="Mobile" type="tel" inputMode="tel" autoComplete="tel" defaultValue={values.phone} />
        <FormField id="midwifery_council_number" label="Midwifery Council number" autoComplete="off" spellCheck={false} defaultValue={values.midwifery_council_number} />
        <FormField id="hpi_cpn" label="HPI number (CPN)" autoComplete="off" spellCheck={false} defaultValue={values.hpi_cpn} />
        <p className="text-xs text-warm-400">Signed in as {profile.email}</p>
        <FormMessage error={error && !error.field ? error.error : null} />
        {state && "saved" in state && (
          <p role="status" className="text-sm text-sage-700">
            Saved.
          </p>
        )}
      </div>
      <SubmitButton pendingText="Saving...">Save</SubmitButton>
    </form>
  );
}
