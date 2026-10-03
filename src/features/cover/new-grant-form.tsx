"use client";

import { useActionState } from "react";
import { giveCover } from "./actions";
import { ColleagueSearch } from "./colleague-search";
import { FormField } from "@/components/ui/form-field";
import { FormMessage } from "@/components/ui/form-message";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Colleague } from "./types";

type Props = {
  search: (query: string) => Promise<Colleague[]>;
  clients: { id: string; name: string }[];
};

export function NewGrantForm({ search, clients }: Props) {
  const [state, action] = useActionState(giveCover, null);
  const select = "w-full px-3 py-2 text-base md:text-sm border border-warm-200 rounded-[10px] bg-warm-50 text-warm-800";
  return (
    <form action={action} className="bg-white rounded-[14px] border border-warm-200 p-6 space-y-4 md:max-w-lg">
      <ColleagueSearch search={search} />
      <div>
        <label htmlFor="client_id" className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">Which clients</label>
        <select id="client_id" name="client_id" className={select} defaultValue="">
          <option value="">My whole caseload</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="level" className="block text-xs font-medium text-warm-400 uppercase tracking-[0.05em] mb-1.5">Access</label>
        <select id="level" name="level" className={select} defaultValue="cover">
          <option value="cover">Cover: read and write clinical records</option>
          <option value="view">View only</option>
        </select>
      </div>
      <FormField id="ends_at" label="Ends on (optional)" type="date" />
      <FormField id="reason" label="Reason (optional)" placeholder="Annual leave 12 to 19 October" />
      <FormMessage error={state?.error} />
      <SubmitButton pendingText="Saving...">Give cover</SubmitButton>
    </form>
  );
}
