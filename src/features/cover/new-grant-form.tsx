"use client";

import { useActionState } from "react";
import { giveCover } from "./actions";
import { ColleagueSearch } from "./colleague-search";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import { submissionKey } from "@/components/ui/submission-key";
import type { Colleague } from "./types";

type Props = {
  search: (query: string) => Promise<Colleague[]>;
  clients: { id: string; name: string }[];
};

export function NewGrantForm({ search, clients }: Props) {
  const [state, action] = useActionState(giveCover, null);
  const values = state?.values ?? {};
  const errorFor = (id: string) => (state?.field === id ? state.error : undefined);
  const label = "block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5";
  const select = "w-full min-h-11 px-3 py-2 text-base border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800 focus:outline-none focus:border-sage-600 focus:ring-1 focus:ring-sage-600";
  return (
    <form action={action} className="bg-white rounded-[14px] border border-warm-200 p-6 space-y-4 md:max-w-lg">
      {/* Controlled, so it keeps the chosen colleague by itself; outside the keyed block below. */}
      <ColleagueSearch search={search} />
      {/* Keyed per submission so the scope, access level, end date and reason she chose come back
          after an error, instead of falling back to the widest choices. */}
      <div key={submissionKey(state)} className="space-y-4">
        <div>
          <label htmlFor="client_id" className={label}>Which clients</label>
          <select id="client_id" name="client_id" className={select} defaultValue={values.client_id ?? ""}>
            <option value="">My whole caseload</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="level" className={label}>Access</label>
          <select id="level" name="level" className={select} defaultValue={values.level ?? "cover"}>
            <option value="cover">Cover: read and write clinical records</option>
            <option value="view">View only</option>
          </select>
        </div>
        <FormField id="ends_at" label="Ends on (optional)" type="date" defaultValue={values.ends_at} error={errorFor("ends_at")} />
        <FormField id="reason" label="Reason (optional)" placeholder="Annual leave 12 to 19 October" defaultValue={values.reason} />
        <FormMessage error={state?.field ? null : state?.error} />
      </div>
      <SubmitButton pendingText="Saving...">Give cover</SubmitButton>
    </form>
  );
}
