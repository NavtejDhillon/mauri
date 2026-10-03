import Link from "next/link";
import { formatLastDay } from "@/lib/format-last-day";
import { coverStatus } from "./cover-status";
import { RevokeCoverButton } from "./revoke-cover-button";
import type { GrantRow } from "./types";

type Props = { grants: GrantRow[]; me: string; names: Map<string, string>; clientNames: Map<string, string>; now: Date };

function who(id: string | null, names: Map<string, string>): string {
  return (id && names.get(id)) ?? "a colleague";
}

function scope(g: GrantRow, clientNames: Map<string, string>): string {
  return g.client_id ? (clientNames.get(g.client_id) ?? "one client") : "whole caseload";
}

// ends_at is an exclusive end (midnight after the last day), so "Until" names the last day itself.
function status(g: GrantRow, now: Date): string {
  const current = coverStatus(g, now);
  if (current === "revoked") return "Revoked";
  if (current === "ended") return "Ended";
  return g.ends_at ? `Until ${formatLastDay(g.ends_at)}` : "Until you revoke it";
}

export function GrantList({ grants, me, names, clientNames, now }: Props) {
  const given = grants.filter((g) => g.grantor_practitioner_id === me);
  const received = grants.filter((g) => g.grantor_practitioner_id !== me);
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-sage-900">Cover</h1>
        <Link href="/cover/new" className="inline-flex items-center min-h-11 px-4 py-2 text-sm font-medium text-white bg-sage-600 rounded-[10px] hover:bg-sage-700">Give cover</Link>
      </div>
      <Section title="Cover I have given" empty="You have not given anyone cover.">
        {given.map((g) => (
          <li key={g.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white border border-warm-200 rounded-[14px] px-4 py-3">
            <div>
              <p className="text-[15px] font-medium text-sage-900">{who(g.grantee_id, names)}: {g.level === "cover" ? "cover" : "view"}, {scope(g, clientNames)}</p>
              <p className="text-xs text-warm-400">{status(g, now)}{g.kind === "historical" ? " (previous LMC, cannot be revoked)" : ""}{g.reason ? ` · ${g.reason}` : ""}</p>
            </div>
            {coverStatus(g, now) === "active" && g.kind === "standard" && <RevokeCoverButton grantId={g.id} who={who(g.grantee_id, names)} />}
          </li>
        ))}
      </Section>
      <Section title="Cover I have received" empty="Nobody has given you cover.">
        {received.map((g) => (
          <li key={g.id} className="bg-white border border-warm-200 rounded-[14px] px-4 py-3">
            <p className="text-[15px] font-medium text-sage-900">From {who(g.grantor_practitioner_id, names)}: {g.level === "cover" ? "cover" : "view"}, {scope(g, clientNames)}</p>
            <p className="text-xs text-warm-400">{status(g, now)}</p>
          </li>
        ))}
      </Section>
    </div>
  );
}

function Section({ title, empty, children }: { title: string; empty: string; children: React.ReactNode[] }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[15px] font-medium text-sage-900">{title}</h2>
      {children.length === 0 ? <p className="text-sm text-warm-400">{empty}</p> : <ul className="space-y-2">{children}</ul>}
    </section>
  );
}
